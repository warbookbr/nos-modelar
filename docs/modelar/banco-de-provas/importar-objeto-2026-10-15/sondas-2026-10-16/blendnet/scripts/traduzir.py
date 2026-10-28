"""Tradutor BlendNet -> .esboco.json do Mecanifica, sem rodar o Blender e sem exec do script.

Lê o script pela AST, interpreta um subconjunto (aritmética, math, range, laços, if, funções do próprio script, listas,
f-strings) e acumula uma cena simulada: uma lista de objetos com primitiva, location, rotation_euler, scale, nome e
modificadores. Tudo o que não reconhece vira uma recusa com tipo, linha e texto; a tradução continua para listar todas.

Quadro: Blender é Z para cima; o esboço é Y para cima com a frente em -z. (x, y, z)_blender -> (x, z, -y), rotação
própria, a mesma do importador de .csg (frente +y do Blender em -z). Unidade: 1 unidade do Blender = 1000 mm.
"""
import ast, math, json, re, sys, builtins, random as _random

MM = 1000.0
F = [[1, 0, 0], [0, 0, 1], [0, -1, 0]]
FT = [[F[j][i] for j in range(3)] for i in range(3)]
PADRAO_NOME = re.compile(r'^(Cube|Cylinder|Cone|Sphere|Icosphere|Torus|Plane|Circle|Empty|Camera|Light|Text|Suzanne)(\.\d+)?$')
NOMES_PADRAO = {'cube': 'Cube', 'cylinder': 'Cylinder', 'cone': 'Cone', 'uv_sphere': 'Sphere', 'ico_sphere': 'Icosphere',
                'torus': 'Torus', 'plane': 'Plane', 'circle': 'Circle', 'monkey': 'Suzanne'}


class Recusa(Exception):
    def __init__(self, tipo, texto, linha=None):
        self.tipo, self.texto, self.linha = tipo, texto, linha


class Inerte:
    """Material, nó, cena, mundo: nada que mude a geometria. Qualquer acesso devolve outro Inerte."""
    def __getattr__(self, n): return Inerte()
    def __call__(self, *a, **k): return Inerte()
    def __getitem__(self, k): return Inerte()
    def __bool__(self): return False


class Desconhecido:
    def __init__(self, porque): self.porque = porque


class Vec(tuple):
    def _o(self, o, f):
        if isinstance(o, (tuple, list)): return Vec(f(a, b) for a, b in zip(self, o))
        return Vec(f(a, o) for a in self)
    def __add__(s, o): return s._o(o, lambda a, b: a + b)
    def __radd__(s, o): return s._o(o, lambda a, b: b + a)
    def __sub__(s, o): return s._o(o, lambda a, b: a - b)
    def __rsub__(s, o): return s._o(o, lambda a, b: b - a)
    def __mul__(s, o): return s._o(o, lambda a, b: a * b)
    def __rmul__(s, o): return s._o(o, lambda a, b: b * a)
    def __truediv__(s, o): return s._o(o, lambda a, b: a / b)
    def __neg__(s): return Vec(-a for a in s)
    @property
    def x(s): return s[0]
    @property
    def y(s): return s[1]
    @property
    def z(s): return s[2]
    @property
    def length(s): return math.sqrt(sum(a * a for a in s))


# ---------- álgebra 3x3 ----------
def mm_(A, B): return [[sum(A[i][k] * B[k][j] for k in range(3)) for j in range(3)] for i in range(3)]
def euler_mat(r):
    rx, ry, rz = r
    cx, sx, cy, sy, cz, sz = math.cos(rx), math.sin(rx), math.cos(ry), math.sin(ry), math.cos(rz), math.sin(rz)
    Rx = [[1, 0, 0], [0, cx, -sx], [0, sx, cx]]; Ry = [[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]]; Rz = [[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]]
    return mm_(Rz, mm_(Ry, Rx))   # XYZ de Blender: R = Rz·Ry·Rx
def mat_euler(R):
    sy = -R[2][0]; ry = math.asin(max(-1, min(1, sy)))
    if abs(sy) < 1 - 1e-9: rx = math.atan2(R[2][1], R[2][2]); rz = math.atan2(R[1][0], R[0][0])
    else: rz = 0.0; rx = math.atan2(-R[1][2], R[1][1])
    return (rx, ry, rz)
def eixo_mat(ax, a):
    c, s = math.cos(a), math.sin(a)
    return {'X': [[1, 0, 0], [0, c, -s], [0, s, c]], 'Y': [[c, 0, s], [0, 1, 0], [-s, 0, c]], 'Z': [[c, -s, 0], [s, c, 0], [0, 0, 1]]}[ax]
def arred(v, n=3):
    r = round(v, n)
    return 0.0 if r == 0 else r


class Obj:
    def __init__(self, tipo, nome, **p):
        self.tipo = tipo            # cube, cylinder, cone, uv_sphere, ico_sphere, torus, plane, ou 'naomalha'
        self.nome = nome
        self.p = p                  # parâmetros nativos da primitiva
        self.loc = [0.0, 0.0, 0.0]
        self.rot = [0.0, 0.0, 0.0]
        self.scale = [1.0, 1.0, 1.0]
        self.bake = [1.0, 1.0, 1.0]
        self.mods = []              # modificadores ainda não aplicados
        self.recortes = []          # moldes já aplicados (Obj congelados)
        self.oculto = False
        self.vivo = True
        self.cortador = False
        self.linha = None
    def nativo(self):
        t, p = self.tipo, self.p
        if t == 'cube': return [p['size']] * 3
        if t in ('cylinder',): return [2 * p['radius'], 2 * p['radius'], p['depth']]
        if t == 'cone': m = 2 * max(p['radius1'], p['radius2']); return [m, m, p['depth']]
        if t in ('uv_sphere', 'ico_sphere'): return [2 * p['radius']] * 3
        if t == 'torus': d = 2 * (p['major_radius'] + p['minor_radius']); return [d, d, 2 * p['minor_radius']]
        if t == 'plane': return [p['size'], p['size'], 0.0]
        return [0, 0, 0]
    def S(self): return [self.bake[i] * self.scale[i] for i in range(3)]
    def dims(self): return [abs(self.nativo()[i] * self.S()[i]) for i in range(3)]
    def clone(self):
        o = Obj(self.tipo, self.nome, **dict(self.p))
        o.loc, o.rot, o.scale, o.bake = list(self.loc), list(self.rot), list(self.scale), list(self.bake)
        o.mods, o.recortes, o.oculto, o.linha = [], list(self.recortes), self.oculto, self.linha
        return o


class Mod:
    def __init__(self, dono, tipo, nome): self.dono, self.tipo, self.nome, self.p = dono, tipo, nome, {}


class Ns:
    """Espaço de nomes bpy.* / mathutils.* / math.* / random.*"""
    def __init__(self, caminho): self.caminho = caminho
    def __repr__(self): return self.caminho


class Colecao:
    """bpy.data.objects"""


class Retorno(Exception):
    def __init__(self, v): self.v = v


PADRAO_NOME_BLENDER = re.compile(r'^(.*)\.(\d{3})$')
ARGS_ADD = {'location', 'rotation', 'scale', 'align', 'enter_editmode', 'calc_uvs', 'end_fill_type', 'generate_uvs', 'view_align',
            'change', 'rotation_mode', 'size', 'radius', 'depth', 'vertices', 'radius1', 'radius2', 'segments', 'ring_count',
            'subdivisions', 'major_radius', 'minor_radius', 'major_segments', 'minor_segments', 'mode', 'abso_major_rad',
            'abso_minor_rad', 'fill_type', 'calc_uvs', 'enter_editmode'}
MATH = {n: getattr(math, n) for n in dir(math) if not n.startswith('_')}


class Interp:
    def __init__(self, fonte):
        self.fonte = fonte.splitlines()
        self.cena = []              # objetos vivos, em ordem de criação
        self.todos = []
        self.ativo = None
        self.sel = []
        self.recusas = []
        self.env = {'bpy': Ns('bpy'), 'math': Ns('math'), 'mathutils': Ns('mathutils'), 'random': Ns('random'), '__name__': '__main__'}
        self.funcs = {}
        self.passos = 0
        self.edicao = False
        self.semeado = False
        self.linha = 0
        self.prof = 0
        self.ignorados = {}

    # ----- util
    def recusar(self, tipo, texto, linha=None):
        linha = linha or self.linha
        chave = (tipo, texto, linha)
        if chave not in {(r['tipo'], r['texto'], r['linha']) for r in self.recusas}:
            fonte = self.fonte[linha - 1].strip() if linha and 0 < linha <= len(self.fonte) else ''
            self.recusas.append({'tipo': tipo, 'texto': texto, 'linha': linha, 'codigo': fonte[:140]})

    def nome_unico(self, base, ignorar=None):
        base = base.encode('utf-8')[:63].decode('utf-8', 'ignore')
        usados = {o.nome for o in self.cena if o is not ignorar}
        if base not in usados: return base
        m = PADRAO_NOME_BLENDER.match(base)
        raiz = m.group(1) if m else base
        n = 1
        while f'{raiz}.{n:03d}' in usados: n += 1
        return f'{raiz}.{n:03d}'

    def tick(self):
        self.passos += 1
        if self.passos > 400000: raise Recusa('limite', 'mais de 400000 passos de interpretação')

    # ----- avaliação de expressões
    def num(self, v, quem=''):
        if isinstance(v, bool): return float(v)
        if isinstance(v, (int, float)): return float(v)
        raise Recusa('expressao', f'valor não numérico em {quem}: {v.porque if isinstance(v, Desconhecido) else type(v).__name__}')

    def vec3(self, v, quem=''):
        if isinstance(v, Desconhecido): raise Recusa('expressao', f'{quem} não avaliável: {v.porque}')
        if isinstance(v, (int, float)): return [float(v)] * 3
        if isinstance(v, (tuple, list)) and len(v) >= 3: return [self.num(v[i], quem) for i in range(3)]
        raise Recusa('expressao', f'{quem} não é vetor de 3 números')

    def ev(self, n):
        self.tick()
        t = type(n)
        if t is ast.Constant: return n.value
        if t is ast.Name:
            if n.id in self.env: return self.env[n.id]
            if n.id in MATH: return MATH[n.id]
            if n.id in ('True', 'False', 'None'): return {'True': True, 'False': False, 'None': None}[n.id]
            if n.id in ('range', 'len', 'abs', 'min', 'max', 'round', 'int', 'float', 'str', 'sum', 'enumerate', 'zip', 'list', 'tuple', 'pow', 'bool', 'sorted', 'reversed', 'print', 'isinstance', 'dict', 'set'):
                return getattr(builtins, n.id)
            if n.id in ('Vector', 'Euler', 'Matrix', 'Color'): return Ns('mathutils.' + n.id)
            return Desconhecido(f'nome "{n.id}" sem valor')
        if t in (ast.Tuple, ast.List):
            vs = [self.ev(e) for e in n.elts]
            return Vec(vs) if t is ast.Tuple else vs
        if t is ast.Dict:
            return {self.ev(k): self.ev(v) for k, v in zip(n.keys, n.values) if k is not None}
        if t is ast.BinOp:
            a, b = self.ev(n.left), self.ev(n.right)
            if isinstance(a, Desconhecido) or isinstance(b, Desconhecido): return a if isinstance(a, Desconhecido) else b
            if isinstance(a, Inerte) or isinstance(b, Inerte): return Inerte()
            try:
                op = n.op
                if isinstance(op, ast.Add): return a + b
                if isinstance(op, ast.Sub): return a - b
                if isinstance(op, ast.Mult): return a * b
                if isinstance(op, ast.Div): return a / b
                if isinstance(op, ast.FloorDiv): return a // b
                if isinstance(op, ast.Mod): return a % b
                if isinstance(op, ast.Pow): return a ** b
            except Exception as e:
                return Desconhecido(f'operação inválida ({e})')
            return Desconhecido('operador binário sem suporte')
        if t is ast.UnaryOp:
            a = self.ev(n.operand)
            if isinstance(a, Desconhecido): return a
            if isinstance(n.op, ast.USub): return -a
            if isinstance(n.op, ast.UAdd): return a
            if isinstance(n.op, ast.Not): return not a
            return Desconhecido('operador unário')
        if t is ast.BoolOp:
            vs = [self.ev(v) for v in n.values]
            if any(isinstance(v, Desconhecido) for v in vs): return Desconhecido('bool com valor desconhecido')
            return all(vs) if isinstance(n.op, ast.And) else any(vs)
        if t is ast.Compare:
            a = self.ev(n.left)
            for op, c in zip(n.ops, n.comparators):
                b = self.ev(c)
                if isinstance(a, Desconhecido) or isinstance(b, Desconhecido): return Desconhecido('comparação com valor desconhecido')
                import operator as _op
                _tab = {ast.Lt: _op.lt, ast.Gt: _op.gt, ast.LtE: _op.le, ast.GtE: _op.ge, ast.Eq: _op.eq, ast.NotEq: _op.ne,
                        ast.In: lambda x, y: x in y, ast.NotIn: lambda x, y: x not in y, ast.Is: _op.is_, ast.IsNot: _op.is_not}
                try: r = _tab[type(op)](a, b)
                except Exception: return Desconhecido('comparação inválida')
                if not r: return False
                a = b
            return True
        if t is ast.IfExp:
            c = self.ev(n.test)
            if isinstance(c, Desconhecido): return c
            return self.ev(n.body if c else n.orelse)
        if t is ast.JoinedStr:
            out = ''
            for v in n.values:
                if isinstance(v, ast.Constant): out += str(v.value)
                else:
                    x = self.ev(v.value)
                    if isinstance(x, Desconhecido): return x
                    if v.format_spec is not None:
                        spec = self.ev(v.format_spec)
                        try: out += format(x, spec)
                        except Exception: return Desconhecido('f-string inválida')
                    else: out += str(x)
            return out
        if t is ast.FormattedValue: return self.ev(n.value)
        if t is ast.Subscript:
            a = self.ev(n.value)
            if isinstance(a, Desconhecido): return a
            if isinstance(a, Colecao):
                k = self.ev(n.slice)
                for o in self.cena:
                    if o.nome == k: return o
                return Desconhecido(f'objeto "{k}" não existe')
            if isinstance(a, Mods):
                k = self.ev(n.slice)
                if isinstance(k, int): return a.lista[k] if -len(a.lista) <= k < len(a.lista) else Desconhecido('índice de modificador')
                for m in a.lista:
                    if m.nome == k: return m
                return Desconhecido('modificador inexistente')
            if isinstance(a, Inerte): return Inerte()
            if isinstance(n.slice, ast.Slice):
                lo = self.ev(n.slice.lower) if n.slice.lower else None
                hi = self.ev(n.slice.upper) if n.slice.upper else None
                try: return a[lo:hi]
                except Exception: return Desconhecido('fatia')
            k = self.ev(n.slice)
            if isinstance(k, Desconhecido): return k
            try: return a[k]
            except Exception: return Desconhecido('índice fora do alcance')
        if t in (ast.ListComp, ast.GeneratorExp):
            return self.compreensao(n)
        if t is ast.Attribute: return self.atributo(n)
        if t is ast.Call: return self.chamada(n)
        if t is ast.Lambda: return Desconhecido('lambda')
        return Desconhecido(f'expressão {t.__name__}')

    def compreensao(self, n):
        saida = []
        def rec(gs, i):
            if i == len(gs): saida.append(self.ev(n.elt)); return
            g = gs[i]
            it = self.ev(g.iter)
            if isinstance(it, Desconhecido) or isinstance(it, Inerte): raise Recusa('expressao', 'compreensão sobre valor desconhecido')
            for v in list(it):
                self.atribuir_alvo(g.target, v)
                if all(self.ev(c) for c in g.ifs): rec(gs, i + 1)
        rec(n.generators, 0)
        return saida

    def atributo(self, n):
        a = self.ev(n.value)
        at = n.attr
        if isinstance(a, Ns):
            c = a.caminho + '.' + at
            if c == 'bpy.context.object' or c == 'bpy.context.active_object': return self.ativo if self.ativo else Desconhecido('sem objeto ativo')
            if c == 'bpy.context.selected_objects': return list(self.sel)
            if c == 'bpy.context.view_layer.objects.active': return self.ativo
            if c == 'bpy.data.objects': return Colecao()
            if c in ('bpy.context.scene.objects', 'bpy.context.collection.objects', 'bpy.context.view_layer.objects'): return list(self.cena)
            if a.caminho == 'math':
                if at in MATH: return MATH[at]
                return Desconhecido(f'math.{at}')
            if c.startswith('bpy.data.') and at in ('materials', 'meshes', 'collections', 'worlds', 'lights', 'cameras', 'textures', 'images', 'curves', 'node_groups'): return Inerte()
            return Ns(c)
        if isinstance(a, Obj):
            if at == 'location': return Vec(a.loc)
            if at == 'rotation_euler': return Vec(a.rot)
            if at == 'scale': return Vec(a.scale)
            if at == 'dimensions': return Vec(a.dims())
            if at == 'name': return a.nome
            if at == 'type': return 'MESH' if a.tipo != 'naomalha' else 'OTHER'
            if at in ('data', 'material_slots', 'active_material', 'users_collection', 'matrix_world', 'animation_data', 'constraints', 'id_data', 'children', 'bound_box', 'rotation_quaternion'):
                if at == 'matrix_world' or at == 'bound_box' or at == 'rotation_quaternion': return Desconhecido(f'leitura de {at}')
                return Inerte()
            if at == 'modifiers': return Mods(a)
            if at == 'parent': return None
            return Desconhecido(f'atributo {at} de objeto')
        if isinstance(a, Mod):
            if at == 'name': return a.nome
            return a.p.get(at, Desconhecido(f'atributo {at} de modificador'))
        if isinstance(a, Vec) and at in ('x', 'y', 'z', 'length'): return getattr(a, at)
        if isinstance(a, Inerte): return Inerte()
        if isinstance(a, Desconhecido): return a
        if isinstance(a, (list, tuple, dict, str)): return Desconhecido(f'método {at} como valor')
        return Desconhecido(f'atributo {at}')

    # ----- chamadas
    def chamada(self, n):
        f = n.func
        if isinstance(f, ast.Name) and f.id in self.funcs:
            return self.chamar_usuario(self.funcs[f.id], n)
        if isinstance(f, ast.Attribute):
            base = self.ev(f.value)
            at = f.attr
            if isinstance(base, Ns): return self.chamar_ns(base.caminho + '.' + at, n)
            if isinstance(base, Obj): return self.metodo_obj(base, at, n)
            if isinstance(base, Mods):
                if at == 'new':
                    kw = {k.arg: self.ev(k.value) for k in n.keywords}
                    args = [self.ev(a) for a in n.args]
                    return self.novo_mod(base.dono, kw.get('name', args[0] if args else 'Modifier'), kw.get('type', args[1] if len(args) > 1 else None))
                return Inerte()
            if isinstance(base, Colecao):
                if at == 'remove':
                    o = self.ev(n.args[0]) if n.args else None
                    if isinstance(o, Obj): self.remover(o)
                    return None
                if at == 'get':
                    k = self.ev(n.args[0])
                    for o in self.cena:
                        if o.nome == k: return o
                    return None
                if at == 'new':
                    self.recusar('malha-propria', 'bpy.data.objects.new: objeto com malha própria', n.lineno); return Desconhecido('objects.new')
                return Inerte()
            if isinstance(base, Inerte):
                for a in n.args: self.ev(a)
                return Inerte()
            if isinstance(base, list):
                args = [self.ev(a) for a in n.args]
                if at == 'append': base.append(args[0]); return None
                if at == 'extend': base.extend(args[0]); return None
                if at == 'index': return base.index(args[0])
                if at == 'copy': return list(base)
                if at == 'pop': return base.pop(*args)
                return Desconhecido(f'list.{at}')
            if isinstance(base, str):
                args = [self.ev(a) for a in n.args]
                if any(isinstance(x, Desconhecido) for x in args): return Desconhecido('str.method com arg desconhecido')
                try: return getattr(base, at)(*args)
                except Exception: return Desconhecido(f'str.{at}')
            if isinstance(base, dict):
                args = [self.ev(a) for a in n.args]
                try: return getattr(base, at)(*args)
                except Exception: return Desconhecido(f'dict.{at}')
            if isinstance(base, Vec):
                if at == 'copy': return Vec(base)
                if at == 'normalized':
                    l = base.length; return Vec(a / l for a in base) if l else Vec(base)
                return Desconhecido(f'Vector.{at}')
            if isinstance(base, Desconhecido): return base
            return Desconhecido(f'método {at}')
        if isinstance(f, ast.Name):
            fn = self.ev(f)
            args = [self.ev(a) for a in n.args]
            if f.id == 'print': return None
            if isinstance(fn, Ns):  # Vector/Euler
                if any(isinstance(a, Desconhecido) for a in args): return Desconhecido('Vector com arg desconhecido')
                if fn.caminho.endswith('Vector') or fn.caminho.endswith('Euler') or fn.caminho.endswith('Color'):
                    return Vec(list(args[0])) if args and isinstance(args[0], (tuple, list)) else Vec(args)
                return Desconhecido(fn.caminho)
            if isinstance(fn, Desconhecido):
                self.recusar('chamada-desconhecida', f'chamada a "{f.id}" sem definição visível', n.lineno)
                return fn
            if callable(fn):
                if any(isinstance(a, Desconhecido) for a in args): return Desconhecido(f'{f.id}() com argumento desconhecido')
                kw = {k.arg: self.ev(k.value) for k in n.keywords if k.arg}
                try: return fn(*args, **kw)
                except Exception as e: return Desconhecido(f'{f.id}() falhou: {e}')
            return Desconhecido('chamada')
        return Desconhecido('chamada de expressão')

    def chamar_usuario(self, fd, n):
        if self.prof > 40: raise Recusa('limite', 'recursão profunda')
        args = [self.ev(a) for a in n.args]
        kw = {k.arg: self.ev(k.value) for k in n.keywords if k.arg}
        a = fd.args
        nomes = [x.arg for x in a.args]
        padroes = [None] * (len(nomes) - len(a.defaults)) + list(a.defaults)
        local = {}
        for i, nm in enumerate(nomes):
            if i < len(args): local[nm] = args[i]
            elif nm in kw: local[nm] = kw[nm]
            elif padroes[i] is not None: local[nm] = self.ev(padroes[i])
            else: local[nm] = Desconhecido(f'argumento {nm} ausente')
        for i, nm in enumerate([x.arg for x in a.kwonlyargs]):
            local[nm] = kw[nm] if nm in kw else (self.ev(a.kw_defaults[i]) if a.kw_defaults[i] is not None else Desconhecido('kwonly'))
        antigo = self.env
        self.env = dict(antigo); self.env.update(local)
        self.prof += 1
        try:
            self.bloco(fd.body)
            r = None
        except Retorno as e:
            r = e.v
        finally:
            self.prof -= 1
            # variáveis globais atribuídas via `global` não são modeladas; só o escopo local some
            self.env = antigo
        return r

    def chamar_ns(self, c, n):
        self.linha = n.lineno
        kw = {}
        for k in n.keywords:
            if k.arg: kw[k.arg] = self.ev(k.value)
            else: kw['**'] = Desconhecido('**kwargs')
        args = [self.ev(a) for a in n.args]
        if c.startswith('math.'):
            fn = MATH.get(c[5:])
            if fn is None or any(isinstance(a, Desconhecido) for a in args): return Desconhecido(c)
            try: return fn(*args)
            except Exception as e: return Desconhecido(f'{c}: {e}')
        if c.startswith('random.'):
            nome = c[7:]
            if nome == 'seed':
                _random.seed(*args); self.semeado = True; return None
            if not self.semeado:
                self.recusar('aleatorio', f'{c} sem random.seed: não determinístico', n.lineno)
                return Desconhecido('random sem semente')
            try: return getattr(_random, nome)(*args)
            except Exception as e: return Desconhecido(f'{c}: {e}')
        if c.startswith('mathutils.'):
            if any(isinstance(a, Desconhecido) for a in args): return Desconhecido(c)
            if c.split('.')[-1] in ('Vector', 'Euler', 'Color'): return Vec(list(args[0])) if args and isinstance(args[0], (tuple, list)) else Vec(args)
            return Desconhecido(c)
        if c.startswith('bpy.ops.'):
            return self.operador(c[8:], kw, args, n)
        if c.startswith('bpy.'):
            if c == 'bpy.context.view_layer.update' or c.startswith('bpy.data') or c.startswith('bpy.context') or c.startswith('bpy.utils') or c.startswith('bpy.app'):
                return Inerte()
            return Inerte()
        return Desconhecido(c)

    # ----- operadores bpy.ops
    def novo_obj(self, tipo, kw, n):
        p = {}
        if tipo == 'cube': p = {'size': kw.get('size', 2.0)}
        elif tipo == 'cylinder': p = {'radius': kw.get('radius', 1.0), 'depth': kw.get('depth', 2.0), 'vertices': kw.get('vertices', 32)}
        elif tipo == 'cone': p = {'radius1': kw.get('radius1', 1.0), 'radius2': kw.get('radius2', 0.0), 'depth': kw.get('depth', 2.0), 'vertices': kw.get('vertices', 32)}
        elif tipo == 'uv_sphere': p = {'radius': kw.get('radius', 1.0)}
        elif tipo == 'ico_sphere': p = {'radius': kw.get('radius', 1.0)}
        elif tipo == 'torus': p = {'major_radius': kw.get('major_radius', 1.0), 'minor_radius': kw.get('minor_radius', 0.25)}
        elif tipo == 'plane': p = {'size': kw.get('size', 2.0)}
        for k in list(p):
            if k != 'vertices': p[k] = self.num(p[k], k)
        o = Obj(tipo, self.nome_unico(NOMES_PADRAO.get(tipo, tipo)), **p)
        o.linha = n.lineno
        o.loc = self.vec3(kw['location'], 'location') if 'location' in kw else [0.0, 0.0, 0.0]
        o.rot = self.vec3(kw['rotation'], 'rotation') if 'rotation' in kw else [0.0, 0.0, 0.0]
        o.scale = self.vec3(kw['scale'], 'scale') if 'scale' in kw else [1.0, 1.0, 1.0]
        return o

    def adicionar(self, o):
        self.cena.append(o); self.todos.append(o)
        self.ativo = o; self.sel = [o]

    def remover(self, o):
        o.vivo = False
        self.cena = [x for x in self.cena if x is not o]
        self.sel = [x for x in self.sel if x is not o]
        if self.ativo is o: self.ativo = None

    def operador(self, op, kw, args, n):
        L = n.lineno
        if op.startswith('mesh.primitive_') and op.endswith('_add'):
            tipo = op[len('mesh.primitive_'):-4]
            if self.edicao:
                self.recusar('modo-de-edicao', f'bpy.ops.{op} em modo de edição', L); return None
            if tipo in ('cube', 'cylinder', 'cone', 'uv_sphere', 'ico_sphere', 'torus', 'plane'):
                extras = set(kw) - ARGS_ADD
                if extras: self.recusar('argumento-desconhecido', f'bpy.ops.{op}: argumento {sorted(extras)}', L)
                try:
                    o = self.novo_obj(tipo, kw, n)
                except Recusa as r:
                    self.recusar(r.tipo, f'bpy.ops.{op}: {r.texto}', L); o = Obj('naomalha', 'Falha')
                self.adicionar(o); return None
            if tipo in ('circle', 'monkey', 'grid', 'cone_add', 'round_cube', 'ico', 'torus_knot'):
                self.recusar('primitiva-sem-equivalente', f'primitive_{tipo}_add', L)
            else:
                self.recusar('primitiva-sem-equivalente', f'primitive_{tipo}_add', L)
            o = Obj('naomalha', NOMES_PADRAO.get(tipo, tipo)); o.nome = self.nome_unico(o.nome); self.adicionar(o); return None
        if op in ('object.empty_add', 'object.camera_add', 'object.light_add', 'object.text_add', 'curve.primitive_bezier_curve_add',
                  'curve.primitive_nurbs_curve_add', 'curve.primitive_bezier_circle_add', 'curve.primitive_nurbs_circle_add', 'object.armature_add'):
            o = Obj('naomalha', self.nome_unico(op.split('.')[-1].replace('_add', '').title())); self.adicionar(o); return None
        if op == 'object.select_all':
            a = kw.get('action', 'TOGGLE')
            if a == 'DESELECT': self.sel = []
            elif a == 'SELECT': self.sel = list(self.cena)
            return None
        if op == 'object.select_by_type':
            if kw.get('type') == 'MESH': self.sel = [o for o in self.cena if o.tipo != 'naomalha']
            else: self.sel = [o for o in self.cena if o.tipo == 'naomalha']
            return None
        if op == 'object.delete':
            for o in list(self.sel): self.remover(o)
            return None
        if op in ('object.mode_set', 'object.editmode_toggle'):
            m = kw.get('mode', 'EDIT' if op.endswith('toggle') else None)
            if m == 'EDIT': self.edicao = True
            elif m == 'OBJECT' or op.endswith('toggle'): self.edicao = False
            return None
        if op in ('object.shade_smooth', 'object.shade_flat', 'object.origin_set', 'object.select_grouped', 'object.hide_view_set',
                  'object.select_pattern'):
            self.ignorados[op] = self.ignorados.get(op, 0) + 1; return None
        if op == 'object.modifier_add':
            if self.ativo and self.ativo.tipo != 'naomalha': self.novo_mod(self.ativo, None, kw.get('type'))
            return None
        if op == 'object.modifier_apply':
            if self.ativo is None: return None
            nome = kw.get('modifier')
            for m in list(self.ativo.mods):
                if nome is None or m.nome == nome:
                    self.aplicar_mod(m, L)
            return None
        if op == 'object.duplicate' or op == 'object.duplicate_move':
            if self.ativo is None or self.ativo.tipo == 'naomalha' or len(self.sel) != 1:
                self.recusar('operador-desconhecido', f'bpy.ops.{op} com {len(self.sel)} selecionados', L); return None
            o = self.ativo.clone(); o.nome = self.nome_unico(self.ativo.nome)
            self.adicionar(o)
            t = kw.get('TRANSFORM_OT_translate')
            if isinstance(t, dict) and 'value' in t: o.loc = [o.loc[i] + self.vec3(t['value'], 'translate')[i] for i in range(3)]
            return None
        if op in ('transform.resize', 'transform.translate', 'transform.rotate'):
            if self.edicao:
                self.recusar('modo-de-edicao', f'bpy.ops.{op} em modo de edição (muda a malha, não o objeto)', L); return None
            if len(self.sel) != 1:
                self.recusar('operador-desconhecido', f'bpy.ops.{op} com {len(self.sel)} objetos selecionados', L); return None
            o = self.sel[0]
            if o.tipo == 'naomalha': return None
            if op == 'transform.resize':
                v = self.vec3(kw.get('value'), 'resize'); o.scale = [o.scale[i] * v[i] for i in range(3)]
            elif op == 'transform.translate':
                v = self.vec3(kw.get('value'), 'translate'); o.loc = [o.loc[i] + v[i] for i in range(3)]
            else:
                a = self.num(kw.get('value'), 'rotate'); ax = kw.get('orient_axis', 'Z')
                R = mm_(eixo_mat(ax, a), euler_mat(o.rot)); o.rot = list(mat_euler(R))
            return None
        if op == 'object.transform_apply':
            o = self.ativo
            if o is None: return None
            if kw.get('location', True) and any(abs(x) > 1e-12 for x in o.loc) or kw.get('rotation', True) and any(abs(x) > 1e-12 for x in o.rot):
                self.recusar('operador-desconhecido', 'transform_apply de location/rotation (malha deslocada da origem)', L); return None
            if kw.get('scale', True): o.bake = o.S(); o.scale = [1.0, 1.0, 1.0]
            return None
        if op.startswith('mesh.') or op.startswith('curve.'):
            self.recusar('modo-de-edicao', f'bpy.ops.{op} (operador de malha/curva)', L); return None
        if op.startswith('object.') or op.startswith('transform.') or op.startswith('wm.') or op.startswith('render.') or op.startswith('scene.') or op.startswith('view3d.'):
            if op.startswith('wm.') or op.startswith('render.') or op.startswith('view3d.') or op.startswith('scene.'): return None
            self.recusar('operador-desconhecido', f'bpy.ops.{op}', L); return None
        self.recusar('operador-desconhecido', f'bpy.ops.{op}', L); return None

    def novo_mod(self, o, nome, tipo):
        if isinstance(tipo, Desconhecido): tipo = '?'
        if o.tipo == 'naomalha': return Inerte()
        nome = nome if isinstance(nome, str) and nome else str(tipo).title().replace('_', '')
        usados = {m.nome for m in o.mods}
        base, k = nome, 0
        while nome in usados: k += 1; nome = f'{base}.{k:03d}'
        m = Mod(o, str(tipo), nome); o.mods.append(m); m.p['tipo'] = tipo
        return m

    def aplicar_mod(self, m, L):
        o = m.dono
        o.mods = [x for x in o.mods if x is not m]
        mold = m.p.get('object')
        if m.tipo != 'BOOLEAN':
            self.recusar('modificador', f'modificador {m.tipo}', L); return
        op = m.p.get('operation', 'DIFFERENCE')
        if op != 'DIFFERENCE': self.recusar('modificador', f'boolean {op} (sem equivalente no esboço; só DIFFERENCE)', L); return
        if not isinstance(mold, Obj) or mold.tipo == 'naomalha':
            self.recusar('modificador', 'boolean sem objeto cortador avaliável', L); return
        o.recortes.append(mold.clone())

    def metodo_obj(self, o, at, n):
        kw = {k.arg: self.ev(k.value) for k in n.keywords if k.arg}
        args = [self.ev(a) for a in n.args]
        if at == 'select_set':
            v = args[0] if args else kw.get('state', True)
            if v and o not in self.sel: self.sel.append(o)
            if not v: self.sel = [x for x in self.sel if x is not o]
            return None
        if at == 'hide_set':
            o.oculto = bool(args[0]) if args else True; return None
        if at in ('copy',):
            c = o.clone(); c.nome = self.nome_unico(o.nome); self.cena.append(c); self.todos.append(c); return c
        if at in ('select_get', 'hide_get'): return False
        return Inerte()

    # ----- atribuições
    def atribuir_alvo(self, alvo, v):
        if isinstance(alvo, ast.Name): self.env[alvo.id] = v; return
        if isinstance(alvo, (ast.Tuple, ast.List)):
            try: vs = list(v)
            except Exception: vs = [Desconhecido('desempacotar')] * len(alvo.elts)
            for a, x in zip(alvo.elts, vs): self.atribuir_alvo(a, x)
            return
        if isinstance(alvo, ast.Subscript):
            base = self.ev(alvo.value)
            k = self.ev(alvo.slice)
            if isinstance(base, (list, dict)):
                try: base[k] = v
                except Exception: pass
                return
            # obj.location[i] = v
            if isinstance(alvo.value, ast.Attribute):
                dono = self.ev(alvo.value.value)
                if isinstance(dono, Obj) and isinstance(k, int):
                    nome = alvo.value.attr
                    vet = {'location': dono.loc, 'rotation_euler': dono.rot, 'scale': dono.scale}.get(nome)
                    if vet is not None: vet[k] = self.num(v, nome); return
                    if nome == 'dimensions': self.set_dims(dono, k, self.num(v, 'dimensions')); return
            return
        if isinstance(alvo, ast.Attribute):
            dono = self.ev(alvo.value)
            at = alvo.attr
            # obj.location.x = v
            if isinstance(alvo.value, ast.Attribute) and at in ('x', 'y', 'z'):
                d2 = self.ev(alvo.value.value)
                if isinstance(d2, Obj):
                    nome = alvo.value.attr; i = 'xyz'.index(at)
                    vet = {'location': d2.loc, 'rotation_euler': d2.rot, 'scale': d2.scale}.get(nome)
                    if vet is not None: vet[i] = self.num(v, f'{nome}.{at}'); return
                    if nome == 'dimensions': self.set_dims(d2, i, self.num(v, 'dimensions')); return
            if isinstance(dono, Obj):
                self.atrib_obj(dono, at, v, alvo.lineno)
            elif isinstance(dono, Mod):
                dono.p[at] = v
            elif isinstance(dono, Ns) and dono.caminho + '.' + at == 'bpy.context.view_layer.objects.active':
                self.ativo = v if isinstance(v, Obj) else None
                if isinstance(v, Obj) and v not in self.sel: pass
            return

    def set_dims(self, o, i, v):
        nat = o.nativo()[i]
        if nat == 0:
            return
        o.scale[i] = v / nat / o.bake[i]

    def atrib_obj(self, o, at, v, L):
        if o.tipo == 'naomalha' and at not in ('name',): return
        if at == 'name':
            if isinstance(v, str): o.nome = self.nome_unico(v, ignorar=o)
            else: self.recusar('expressao', 'nome do objeto não avaliável', L)
        elif at == 'location': o.loc = self.vec3(v, 'location')
        elif at == 'rotation_euler': o.rot = self.vec3(v, 'rotation_euler')
        elif at == 'scale': o.scale = self.vec3(v, 'scale')
        elif at == 'dimensions':
            d = self.vec3(v, 'dimensions')
            for i in range(3): self.set_dims(o, i, d[i])
        elif at == 'parent':
            if v is not None: self.recusar('hierarquia', 'obj.parent: transformação herdada do pai', L)
        elif at in ('hide_viewport', 'hide_render'):
            if v: o.oculto = True
        elif at == 'display_type':
            if v in ('WIRE', 'BOUNDS'): o.oculto = True
        elif at == 'rotation_mode':
            if v != 'XYZ': self.recusar('atributo-sem-equivalente', f'rotation_mode {v}', L)
        elif at in ('delta_location', 'delta_rotation_euler', 'delta_scale', 'rotation_quaternion', 'rotation_axis_angle', 'matrix_world',
                    'matrix_basis', 'matrix_parent_inverse'):
            self.recusar('atributo-sem-equivalente', f'obj.{at}', L)

    # ----- instruções
    def bloco(self, corpo):
        for s in corpo: self.instrucao(s)

    def instrucao(self, s):
        self.tick()
        self.linha = getattr(s, 'lineno', self.linha)
        t = type(s)
        try:
            if t is ast.Expr:
                self.ev(s.value)
            elif t is ast.Assign:
                v = self.ev(s.value)
                for a in s.targets: self.atribuir_alvo(a, v)
            elif t is ast.AnnAssign:
                if s.value is not None: self.atribuir_alvo(s.target, self.ev(s.value))
            elif t is ast.AugAssign:
                cur = self.ev(s.target)
                r = self.ev(ast.BinOp(left=s.target, op=s.op, right=s.value))
                self.atribuir_alvo(s.target, r)
            elif t is ast.For:
                it = self.ev(s.iter)
                if isinstance(it, (Desconhecido, Inerte)) or it is None:
                    self.recusar('expressao', f'laço for sobre valor não avaliável: {it.porque if isinstance(it, Desconhecido) else "?"}', s.lineno)
                    return
                n = 0
                for v in list(it):
                    n += 1
                    if n > 20000: raise Recusa('limite', 'laço com mais de 20000 iterações')
                    self.atribuir_alvo(s.target, v)
                    try: self.bloco(s.body)
                    except _Continue: continue
                    except _Break: break
                else:
                    self.bloco(s.orelse)
            elif t is ast.While:
                n = 0
                while True:
                    c = self.ev(s.test)
                    if isinstance(c, Desconhecido): self.recusar('expressao', 'condição do while não avaliável', s.lineno); break
                    if not c: break
                    n += 1
                    if n > 20000: raise Recusa('limite', 'while com mais de 20000 iterações')
                    try: self.bloco(s.body)
                    except _Continue: continue
                    except _Break: break
            elif t is ast.If:
                c = self.ev(s.test)
                if isinstance(c, Desconhecido):
                    self.recusar('expressao', f'condição do if não avaliável: {c.porque}', s.lineno)
                    return
                self.bloco(s.body if c else s.orelse)
            elif t is ast.FunctionDef:
                self.funcs[s.name] = s
            elif t is ast.Return:
                raise Retorno(self.ev(s.value) if s.value else None)
            elif t in (ast.Import, ast.ImportFrom, ast.Pass, ast.Global, ast.Nonlocal, ast.Assert):
                pass
            elif t is ast.Try:
                self.bloco(s.body); self.bloco(s.finalbody)
            elif t is ast.With:
                self.bloco(s.body)
            elif t is ast.Break: raise _Break()
            elif t is ast.Continue: raise _Continue()
            elif t is ast.Delete: pass
            elif t is ast.ClassDef:
                self.recusar('construcao-python', 'class no script', s.lineno)
            else:
                self.recusar('construcao-python', f'instrução {t.__name__}', s.lineno)
        except Recusa as r:
            if r.tipo == 'limite': raise
            self.recusar(r.tipo, r.texto, getattr(s, 'lineno', None))
        except (Retorno, _Break, _Continue):
            raise
        except RecursionError:
            raise Recusa('limite', 'recursão')


class _Break(Exception): pass
class _Continue(Exception): pass


class Mods:
    def __init__(self, dono): self.dono = dono
    @property
    def lista(self): return self.dono.mods


# ---------- emissão ----------
def slug(nome, usados):
    s = re.sub(r'[^A-Za-z0-9_]', '_', nome).strip('_') or 'forma'
    if not s[0].isalpha(): s = 'f_' + s
    base, k = s, 1
    while s in usados: k += 1; s = f'{base}_{k}'
    usados.add(s)
    return s


def quase(a, b): return abs(a - b) <= 1e-6 * max(1, abs(a), abs(b))


def forma_de(o, ident, recusar, avisar=lambda t, x: None):
    """Forma do esboço para um Obj; chama recusar(tipo, texto) quando não há equivalente. Devolve dict ou None."""
    S = o.S(); aS = [abs(x) for x in S]
    p = o.p
    R = euler_mat(o.rot)
    centro = [arred(c * MM) for c in (o.loc[0], o.loc[2], -o.loc[1])]
    f = {'id': ident, 'rotulo': o.nome, 'centro': centro}
    flip = False
    if o.tipo == 'cube':
        a = [p['size'] * s * MM for s in aS]
        f.update(tipo='caixa', largura=arred(a[0]), altura=arred(a[2]), profundidade=arred(a[1]))
    elif o.tipo == 'plane':
        a = [p['size'] * s * MM for s in aS]
        f.update(tipo='caixa', largura=arred(a[0]), altura=1.0, profundidade=arred(a[1]))
        f['_plano'] = True
    elif o.tipo == 'cylinder':
        if not quase(aS[0], aS[1]):
            recusar('escala-desigual', f'cilindro "{o.nome}" com escala x≠y ({S[0]:g}, {S[1]:g}): seção elíptica sem forma equivalente'); return None
        f.update(tipo='cilindro', diametro=arred(2 * p['radius'] * aS[0] * MM), comprimento=arred(p['depth'] * aS[2] * MM), eixo='y')
        if 3 <= p['vertices'] < 32: f['lados'] = int(p['vertices'])
        if p['vertices'] < 8: avisar('prisma-poligonal', f'cilindro "{o.nome}" com {p["vertices"]} lados: o esboço desenha, mas o sólido (N2) recusa lados abaixo de 8')
    elif o.tipo == 'cone':
        if not quase(aS[0], aS[1]):
            recusar('escala-desigual', f'cone "{o.nome}" com escala x≠y: seção elíptica sem forma equivalente'); return None
        r1, r2 = p['radius1'] * aS[0], p['radius2'] * aS[0]
        if S[2] < 0: r1, r2 = r2, r1
        L = p['depth'] * aS[2]
        if quase(r1, r2):
            f.update(tipo='cilindro', diametro=arred(2 * r1 * MM), comprimento=arred(L * MM), eixo='y')
            if 3 <= p['vertices'] < 32: f['lados'] = int(p['vertices'])
        else:
            if r1 == 0 and r2 > 0:
                R = mm_(R, [[1, 0, 0], [0, -1, 0], [0, 0, -1]]); r1, r2 = r2, r1   # ponta para baixo: gira 180° em x local
            if r1 <= 0:
                recusar('primitiva-sem-equivalente', f'cone "{o.nome}" sem raio'); return None
            f.update(tipo='cone', diametro=arred(2 * r1 * MM), diametroTopo=arred(2 * r2 * MM), comprimento=arred(L * MM), eixo='y')
            if p['vertices'] < 32: avisar('prisma-poligonal', f'cone "{o.nome}" com {p["vertices"]} lados: o cone do esboço é circular e ignora lados')
    elif o.tipo in ('uv_sphere', 'ico_sphere'):
        if not (quase(aS[0], aS[1]) and quase(aS[1], aS[2])):
            recusar('escala-desigual', f'esfera "{o.nome}" com escala desigual ({S[0]:g}, {S[1]:g}, {S[2]:g}): elipsoide sem forma equivalente'); return None
        f.update(tipo='esfera', diametro=arred(2 * p['radius'] * aS[0] * MM))
    elif o.tipo == 'torus':
        recusar('primitiva-sem-equivalente', f'torus "{o.nome}": o esboço não tem toro (anel tem seção retangular)'); return None
    else:
        return None
    rot = [math.degrees(a) for a in mat_euler(mm_(F, mm_(R, FT)))]
    rot = [arred(a, 4) for a in rot]
    if any(abs(a) > 1e-9 for a in rot) and f['tipo'] != 'esfera': f['rotacao'] = rot
    return f


def traduzir(fonte, titulo='objeto'):
    """-> dict(esboco, recusas, formas, nomes, nomes_padrao, ignorados)"""
    r = {'esboco': None, 'recusas': [], 'formas': 0, 'cortadores': 0, 'nomes': [], 'nomes_padrao': 0, 'ignorados': {}, 'nao_malha': 0, 'aproximacoes': []}
    try:
        arv = ast.parse(fonte)
    except SyntaxError as e:
        r['recusas'].append({'tipo': 'sintaxe', 'texto': f'SyntaxError: {e.msg}', 'linha': e.lineno, 'codigo': ''})
        return r
    it = Interp(fonte)
    try:
        it.bloco(arv.body)
    except Recusa as e:
        it.recusar(e.tipo, e.texto)
    except (Retorno, _Break, _Continue):
        pass
    except RecursionError:
        it.recusar('limite', 'recursão')
    recusas = it.recusas
    # modificadores que sobraram sem aplicar valem como aplicados (a cena avaliada)
    for o in it.cena:
        for m in list(o.mods): it.aplicar_mod(m, o.linha or 0)
    malhas = [o for o in it.cena if o.tipo != 'naomalha']
    r['nao_malha'] = len(it.cena) - len(malhas)
    usados = set(); formas = []; avisos = []
    ids = {}
    def recusar(tipo, texto):
        it.recusar(tipo, texto, None)
    # moldes: objetos que ainda existem e são alvo de boolean, ocultos ou removidos viram cortador
    moldes_vivos = {}
    for o in malhas:
        for c in o.recortes:
            pass
    for o in malhas:
        ids[id(o)] = slug(o.nome, usados)
    for o in malhas:
        it.linha = o.linha or 0
        f = forma_de(o, ids[id(o)], lambda t, x: it.recusar(t, x, o.linha), lambda t, x: avisos.append({'tipo': t, 'texto': x, 'linha': o.linha}))
        if f is None: continue
        moldes = []
        for k, c in enumerate(o.recortes):
            mid = slug(f'molde_{o.nome}_{k+1}', usados)
            fm = forma_de(c, mid, lambda t, x: it.recusar(t, x, o.linha))
            if fm is None: continue
            fm['cortador'] = True; fm['rotulo'] = f'molde de {o.nome}'
            moldes.append(fm); moldes.append(mid) if False else None
        if moldes: f['subtrai'] = [m['id'] for m in moldes]
        f['_moldes'] = moldes
        if o.oculto: f['oculto'] = True
        formas.append(f)
    saida = []
    for f in formas:
        moldes = f.pop('_moldes'); f.pop('_plano', None) if False else None
        f['cor'] = 'cinza'
        saida.append(f)
        for m in moldes:
            m['cor'] = 'cinza'; saida.append(m)
    recusas = it.recusas
    r['recusas'] = recusas
    r['formas'] = sum(1 for f in saida if not f.get('cortador'))
    r['cortadores'] = sum(1 for f in saida if f.get('cortador'))
    r['nomes'] = [f['rotulo'] for f in saida if not f.get('cortador')]
    r['nomes_padrao'] = sum(1 for n in r['nomes'] if PADRAO_NOME.match(n))
    r['ignorados'] = it.ignorados; r['avisos'] = avisos
    r['planos'] = sum(1 for o in malhas if o.tipo == 'plane')
    if saida:
        for f in saida: f.pop('_plano', None)
        r['esboco'] = {
            'plano': {'texto': 'Traduzido do script do BlendNet pela AST, sem rodar o Blender. Quadro (x,y,z)_blender -> (x,z,-y); 1 unidade = 1000 mm. O contato fica desligado porque as primitivas do Blender se sobrepõem de propósito.'},
            'contato': {'usar': False},
            'opcoes': [{'titulo': titulo, 'nota': f'{len(saida)} formas traduzidas do Blender', 'formas': saida}],
        }
    return r


if __name__ == '__main__':
    src = open(sys.argv[1]).read()
    out = traduzir(src, 'teste')
    print(json.dumps({k: v for k, v in out.items() if k != 'esboco'}, ensure_ascii=False, indent=1))
    if out['esboco'] and len(sys.argv) > 2: json.dump(out['esboco'], open(sys.argv[2], 'w'), indent=1, ensure_ascii=False)
