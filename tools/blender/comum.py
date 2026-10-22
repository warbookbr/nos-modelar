# comum.py — o que regua.py, pacote-cego.py e olhar-candidata.py dividem: argumentos, leitura de malha, recorte exato pelos
# planos de uma caixa, visibilidade pelo lado de fora, painéis, componentes, bordas e render. Roda dentro do Blender.
#
# Quadro: o das peças da Mecanifica, em metro, y para cima e frente em +z. OBJ é lido cru; GLB volta ao quadro do glTF
# (y para cima), desfazendo a troca de eixos do importador; .blend é lido no quadro do arquivo, e --z-cima o converte como
# o exportador de glTF converteria.
import bpy, bmesh, json, math, os, subprocess, sys
import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

AQUI = os.path.dirname(os.path.abspath(__file__))
DESLOCAMENTO = 2e-4  # o raio de visibilidade sai 0,2 mm fora da face para não bater nela mesma
TOL_PLANO = 1e-6

PADRAO = {
    'margem': 0.08,               # m: faces até esta distância da caixa entram na medida e no recorte da candidata
    'simetria_x': False,          # a caixa declara a metade x >= 0; o recorte e as vistas pegam as duas metades
    'visibilidade': {             # direções de onde um observador pode olhar: d . cima >= elevacao_minima e d . lado >= lado_minimo
        'cima': [0, 1, 0], 'elevacao_minima': -1.0, 'lado': [1, 0, 0], 'lado_minimo': -1.0, 'direcoes': 96,
    },
    'angulo_painel': 40.0,        # graus: aresta com diedro abaixo disto liga duas faces no mesmo painel
    'fracao_painel_visivel': 0.5, # o painel entra inteiro se ao menos esta fração da área se vê de fora
    'fracao_componente': 0.10,    # componente com menos que esta fração da área do maior sai
    'excluir': [],                # rótulos da referência que não entram (com --rotulos)
    'resolucao': [1400, 1050],
    'amostras_render': 16,
    'vistas': None,               # lista de {nome, direcao, cima, escala?, meia?}; sem ela, vistas_padrao()
    'avesso': [0.85, 0.30, 0.80], # cor que multiplica o avesso (face vista por trás) nas vistas cinza e zebra
    'angulo_feicao': 25.0,        # graus: aresta com diedro acima disto entra nas vistas de linhas de feição
    'cortes': [],                 # lista de {nome, eixo: 'x'|'y'|'z', valor (m)}: cortes planos cotados do pacote
    'passo_corte_regua': 0.01,    # m: passo dos pontos do contorno de cada corte no JSON privado (só para a régua)
    'omitidas': [],               # rótulos que a régua relata à parte, como regiões que a candidata pode omitir
}


def erro(msg):
    print(f'ERRO: {msg}', file=sys.stderr)
    sys.exit(2)


def argumentos():
    """Os argumentos depois de '--': --chave valor, ou --chave sozinha como verdadeiro. Hífen vira sublinhado."""
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    a = {}
    i = 0
    while i < len(argv):
        t = argv[i]
        if not t.startswith('--'):
            erro(f'argumento solto: {t}')
        k = t[2:].replace('-', '_')
        if i + 1 < len(argv) and not argv[i + 1].startswith('--'):
            a[k] = argv[i + 1]
            i += 2
        else:
            a[k] = True
            i += 1
    return a


def _juntar(base, novo):
    for k, v in novo.items():
        if isinstance(v, dict) and isinstance(base.get(k), dict):
            _juntar(base[k], v)
        else:
            base[k] = v


def configuracao(a, exige_caixa=True):
    """PADRAO, depois o --config do usuário (JSON fora do repositório), depois os argumentos da linha de comando."""
    cfg = json.loads(json.dumps(PADRAO))
    if 'config' in a:
        _juntar(cfg, json.load(open(a['config'])))
    if 'caixa' in a:
        cfg['caixa'] = [float(s) for s in a['caixa'].split(',')]
    for k in ('margem', 'angulo_vinco', 'densidade', 'angulo_feicao'):
        if k in a:
            cfg[k] = float(a[k])
    if a.get('simetria_x'):
        cfg['simetria_x'] = True
    if 'excluir' in a:
        cfg['excluir'] = [s for s in a['excluir'].split(',') if s]
    if 'omitidas' in a:
        cfg['omitidas'] = [s for s in a['omitidas'].split(',') if s]
    if 'resolucao' in a:
        cfg['resolucao'] = [int(s) for s in a['resolucao'].split('x')]
    if 'caixa' in cfg:
        c = np.array(cfg['caixa'], float).reshape(3, 2)
        if np.any(c[:, 0] >= c[:, 1]):
            erro(f'caixa vazia: {c.tolist()}')
        cfg['caixa'] = c
    elif exige_caixa:
        erro('falta a caixa: --caixa xmin,xmax,ymin,ymax,zmin,zmax ou "caixa" no --config')
    return cfg


# ---------- leitura ----------

def soldar(V, F, tol=1e-6):
    """Funde vértices a menos de tol (a ordem sai pela posição) e devolve V, F e a máscara dos triângulos não degenerados."""
    q = np.round(V / tol).astype(np.int64)
    _, primeiro, inv = np.unique(q, axis=0, return_index=True, return_inverse=True)
    inv = inv.reshape(-1)
    Fw = inv[F] if len(F) else F
    ok = (Fw[:, 0] != Fw[:, 1]) & (Fw[:, 1] != Fw[:, 2]) & (Fw[:, 0] != Fw[:, 2]) if len(F) else np.zeros(0, bool)
    return V[primeiro], Fw, ok


def _ler_obj(caminho, objeto):
    V, F, P = [], [], []
    atual = None
    npoli = 0
    for linha in open(caminho, encoding='utf8', errors='replace'):
        if linha.startswith('v '):
            V.append([float(s) for s in linha.split()[1:4]])
        elif linha.startswith('o ') or linha.startswith('g '):
            atual = linha[2:].strip()
        elif linha.startswith('f '):
            if objeto is not None and atual != objeto:
                continue
            idx = [int(s.split('/')[0]) for s in linha.split()[1:]]
            idx = [i - 1 if i > 0 else len(V) + i for i in idx]
            for k in range(1, len(idx) - 1):
                F.append([idx[0], idx[k], idx[k + 1]])
                P.append(npoli)
            npoli += 1
    if objeto is not None and not F:
        erro(f'{caminho}: nenhum objeto ou grupo "{objeto}" com faces')
    return np.array(V, float).reshape(-1, 3), np.array(F, int).reshape(-1, 3), np.array(P, int)


def _malhas_de_objetos(objs, z_cima):
    """Triângulos dos objetos de malha, na ordem dos nomes, com os modificadores aplicados e em coordenadas do mundo."""
    dg = bpy.context.evaluated_depsgraph_get()
    V, F, P = [], [], []
    base_p = 0
    for o in sorted(objs, key=lambda o: o.name):
        ev = o.evaluated_get(dg)
        me = ev.to_mesh()
        me.calc_loop_triangles()
        M = ev.matrix_world
        base = len(V)
        for v in me.vertices:
            w = M @ v.co
            V.append([w.x, w.z, -w.y] if z_cima else [w.x, w.y, w.z])
        for t in me.loop_triangles:
            F.append([base + i for i in t.vertices])
            P.append(base_p + t.polygon_index)
        base_p += len(me.polygons)
        ev.to_mesh_clear()
    return np.array(V, float).reshape(-1, 3), np.array(F, int).reshape(-1, 3), np.array(P, int)


def _remover(objs):
    for o in objs:
        bpy.data.objects.remove(o, do_unlink=True)


def _ler_glb(caminho, objeto):
    antes = set(o.name for o in bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=caminho)
    novos = [o for o in bpy.data.objects if o.name not in antes]
    malhas = [o for o in novos if o.type == 'MESH' and (objeto is None or o.name == objeto)]
    if not malhas:
        erro(f'{caminho}: nenhuma malha{" " + objeto if objeto else ""}; há {sorted(o.name for o in novos if o.type == "MESH")}')
    r = _malhas_de_objetos(malhas, z_cima=True)
    _remover(novos)
    return r


def _com_blend(caminho, objeto, fn):
    """Carrega os objetos do .blend (só o de nome objeto, se dado), chama fn com as malhas e os tira da cena."""
    with bpy.data.libraries.load(caminho, link=False) as (src, dst):
        nomes = list(src.objects)
        dst.objects = [n for n in nomes if objeto is None or n == objeto]
    objs = [o for o in dst.objects if o is not None]
    malhas = [o for o in objs if o.type == 'MESH']
    if not malhas:
        erro(f'{caminho}: nenhuma malha{" " + objeto if objeto else ""}; há {sorted(nomes)}')
    for o in objs:
        bpy.context.scene.collection.objects.link(o)
    bpy.context.view_layer.update()
    r = fn(malhas)
    _remover(objs)
    return r


def _ler_blend(caminho, objeto, z_cima):
    return _com_blend(caminho, objeto, lambda malhas: _malhas_de_objetos(malhas, z_cima))


def _arestas_marcadas(objs, z_cima):
    """Segmentos (n, 2, 3) das arestas marcadas como vinco nos objetos de malha, com os modificadores aplicados: vinco de
    subdivisão (atributo crease_edge acima de zero) ou aresta viva (sharp_edge). A subdivisão do Blender propaga as duas
    marcas às arestas que gera."""
    dg = bpy.context.evaluated_depsgraph_get()
    segs = []
    for o in sorted(objs, key=lambda o: o.name):
        ev = o.evaluated_get(dg)
        me = ev.to_mesh()
        M = ev.matrix_world
        marca = np.zeros(len(me.edges), bool)
        for nome in ('crease_edge', 'sharp_edge'):
            at = me.attributes.get(nome)
            if at is not None and at.domain == 'EDGE':
                v = np.zeros(len(me.edges), float)
                at.data.foreach_get('value', v)
                marca |= v > 0
        for e in np.nonzero(marca)[0]:
            p = [M @ me.vertices[i].co for i in me.edges[int(e)].vertices]
            segs.append([[w.x, w.z, -w.y] if z_cima else [w.x, w.y, w.z] for w in p])
        ev.to_mesh_clear()
    return np.array(segs, float).reshape(-1, 2, 3)


def ler_vincos_declarados(caminho, objeto=None, z_cima=False):
    """Os vincos que a malha declara, como segmentos (n, 2, 3): no .blend, as arestas com vinco de subdivisão ou marcadas
    como vivas; OBJ, GLB e glTF não guardam essa marca, e saem sem nenhum."""
    if os.path.splitext(caminho)[1].lower() != '.blend':
        return np.zeros((0, 2, 3))
    return _com_blend(caminho, objeto, lambda malhas: _arestas_marcadas(malhas, z_cima))


def recortar_segmentos(S, caixa, tol=1e-9):
    """Os segmentos (n, 2, 3) recortados pela caixa 3x2 (Liang e Barsky); os que ficam fora saem."""
    out = []
    for p, q in S:
        d = q - p
        t0, t1 = 0.0, 1.0
        for e in range(3):
            for lim, sinal in ((caixa[e, 0], -1.0), (caixa[e, 1], 1.0)):
                num = sinal * (lim - p[e])
                den = sinal * d[e]
                if abs(den) < 1e-15:
                    if num < -tol:
                        t0, t1 = 1.0, 0.0
                else:
                    t = num / den
                    if den < 0:
                        t0 = max(t0, t)
                    else:
                        t1 = min(t1, t)
        if t1 - t0 > tol:
            out.append([p + t0 * d, p + t1 * d])
    return np.array(out, float).reshape(-1, 2, 3)


def ler_malha(caminho, objeto=None, z_cima=False):
    """(V, F, P): vértices soldados, triângulos e, para cada triângulo, o índice do polígono de origem na ordem de leitura."""
    ext = os.path.splitext(caminho)[1].lower()
    if ext == '.obj':
        V, F, P = _ler_obj(caminho, objeto)
        if z_cima:
            V = np.stack([V[:, 0], V[:, 2], -V[:, 1]], 1)
    elif ext in ('.glb', '.gltf'):
        V, F, P = _ler_glb(caminho, objeto)
    elif ext == '.blend':
        V, F, P = _ler_blend(caminho, objeto, z_cima)
    else:
        erro(f'{caminho}: formato não lido (OBJ, GLB, glTF ou .blend)')
    if not len(F):
        erro(f'{caminho}: malha sem faces')
    V, F, ok = soldar(V, F)
    return V, F[ok], P[ok]


def rotulos_dos_triangulos(arquivo, V, F, P):
    """Rótulo de cada triângulo, de um JSON do usuário: {"por_face": [rótulo por polígono, na ordem de leitura]} ou
    {"sementes": {"rótulo": [[x, y, z], ...]}}, em que cada triângulo leva o rótulo da semente mais perto do centro."""
    if not arquivo:
        return None
    d = json.load(open(arquivo))
    if 'por_face' in d:
        r = np.array([str(s) for s in d['por_face']], dtype=object)
        if P.max() >= len(r):
            erro(f'{arquivo}: {len(r)} rótulos para {P.max() + 1} polígonos')
        return r[P]
    if 'sementes' in d:
        nomes, pts = [], []
        for nome, lista in sorted(d['sementes'].items()):
            for p in lista:
                nomes.append(nome)
                pts.append(p)
        k = kd(np.array(pts, float))
        C = V[F].mean(1)
        return np.array([nomes[k.find(Vector(c))[1]] for c in C], dtype=object)
    erro(f'{arquivo}: rótulos sem "por_face" nem "sementes"')


# ---------- geometria ----------

def normais(V, F):
    n = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]])
    a = np.linalg.norm(n, axis=1)
    return n / np.maximum(a, 1e-30)[:, None], a / 2


def bvh(V, F, extra=None):
    if extra is not None and len(extra[1]):
        V, F = np.vstack([V, extra[0]]), np.vstack([F, extra[1] + len(V)])
    return BVHTree.FromPolygons([tuple(v) for v in V], [tuple(map(int, f)) for f in F], all_triangles=True, epsilon=0.0)


def kd(P):
    k = KDTree(len(P))
    for i, p in enumerate(P):
        k.insert(Vector(p), i)
    k.balance()
    return k


def na_caixa(P, caixa, m=0.0, espelho=False):
    x = np.abs(P[:, 0]) if espelho else P[:, 0]
    return ((x >= caixa[0, 0] - m) & (x <= caixa[0, 1] + m) & (P[:, 1] >= caixa[1, 0] - m) & (P[:, 1] <= caixa[1, 1] + m)
            & (P[:, 2] >= caixa[2, 0] - m) & (P[:, 2] <= caixa[2, 1] + m))


def toca_caixa(V, F, caixa, m=0.0):
    """Triângulos cuja caixa envolvente cruza a caixa expandida por m: inclui o triângulo comprido que atravessa a caixa
    com os três vértices e o centro fora dela, que o teste por vértice ou por centro perderia."""
    T = V[F]
    lo, hi = T.min(1), T.max(1)
    return np.all((lo <= caixa[:, 1] + m) & (hi >= caixa[:, 0] - m), axis=1)


def regiao_do_recorte(cfg):
    """A caixa que o recorte usa: a declarada, ou com simetria em x a metade declarada espelhada (|x| até xmax)."""
    c = cfg['caixa'].copy()
    if cfg['simetria_x']:
        c[0] = [-c[0, 1], c[0, 1]]
    return c


def planos(caixa):
    """Os seis planos (ponto, normal para fora) de uma caixa 3x2."""
    out = []
    for e in range(3):
        for lado, sinal in ((1, 1.0), (0, -1.0)):
            co = [0.0, 0.0, 0.0]
            no = [0.0, 0.0, 0.0]
            co[e] = float(caixa[e, lado])
            no[e] = sinal
            out.append((tuple(co), tuple(no), e, float(caixa[e, lado])))
    return out


def recortar(V, F, caixa):
    """Recorte exato pelos seis planos da caixa (bisect do bmesh, sem preenchimento): devolve V, F triangulados."""
    bm = bmesh.new()
    vs = [bm.verts.new(tuple(map(float, p))) for p in V]
    for f in F:
        try:
            bm.faces.new([vs[int(i)] for i in f])
        except ValueError:
            pass
    for co, no, _, _ in planos(caixa):
        bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=co, plane_no=no,
                               clear_outer=True, clear_inner=False, dist=1e-7)
    soltos = [v for v in bm.verts if not v.link_faces]
    bmesh.ops.delete(bm, geom=soltos, context='VERTS')
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    bm.verts.index_update()
    Vn = np.array([v.co[:] for v in bm.verts], float).reshape(-1, 3)
    Fn = np.array([[v.index for v in f.verts] for f in bm.faces], int).reshape(-1, 3)
    bm.free()
    return Vn, Fn


def arestas(F):
    """Arestas por par de vértices: (internas, bordas, nao_variedade). internas = (a, b, t1, t2, mesmo_sentido) das arestas
    com duas faces; bordas = (a, b, t) das arestas com uma; nao_variedade = número de arestas com três ou mais."""
    e = np.concatenate([F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]])
    t = np.tile(np.arange(len(F)), 3)
    sentido = e[:, 0] < e[:, 1]
    es = np.sort(e, axis=1)
    ordem = np.lexsort((es[:, 1], es[:, 0]))
    es, t, sentido = es[ordem], t[ordem], sentido[ordem]
    novo = np.concatenate([[True], np.any(es[1:] != es[:-1], axis=1)])
    inicio = np.nonzero(novo)[0]
    cont = np.diff(np.concatenate([inicio, [len(es)]]))
    par = inicio[cont == 2]
    um = inicio[cont == 1]
    internas = (es[par, 0], es[par, 1], t[par], t[par + 1], sentido[par] == sentido[par + 1])
    bordas = (es[um, 0], es[um, 1], t[um])
    return internas, bordas, int((cont > 2).sum())


def diedros(V, F, internas):
    """Ângulo em graus entre as normais das duas faces de cada aresta interna, com a orientação conferida."""
    N, _ = normais(V, F)
    _, _, t1, t2, mesmo = internas
    n2 = N[t2] * np.where(mesmo, -1.0, 1.0)[:, None]
    return np.degrees(np.arccos(np.clip(np.sum(N[t1] * n2, 1), -1, 1)))


def _uniao(n, pares):
    pai = np.arange(n)

    def raiz(i):
        while pai[i] != i:
            pai[i] = pai[pai[i]]
            i = pai[i]
        return i
    for a, b in pares:
        ra, rb = raiz(a), raiz(b)
        if ra != rb:
            pai[max(ra, rb)] = min(ra, rb)
    return np.array([raiz(i) for i in range(n)])


# ---------- visibilidade ----------

def direcoes_espelhadas(n):
    """Cerca de n direções da esfera de Fibonacci, simétricas em x: as da metade x >= 0 e a imagem espelhada de cada uma
    (a do plano x = 0 uma vez só). A esfera de Fibonacci sozinha não é simétrica em x, e a metade x < 0, que usa as
    direções pelo lado espelhado, veria a peça por outras direções que a metade x > 0."""
    g = math.pi * (3 - math.sqrt(5))
    metade = []
    for i in range(int(n)):
        y = 1 - 2 * (i + 0.5) / n
        r = math.sqrt(1 - y * y)
        th = g * i
        d = (r * math.cos(th), y, r * math.sin(th))
        if d[0] >= 0:
            metade.append(d)
    out = []
    for d in metade:
        out.append(d)
        if d[0] > 0:
            out.append((-d[0], d[1], d[2]))
    return np.array(out, float)


def direcoes(vis, espelhar=False):
    """Direções permitidas ao observador, de um conjunto simétrico em x; com espelhar, o lado e o cima são os da metade
    x < 0 (as imagens espelhadas), de modo que as direções da metade x < 0 são as imagens das da metade x >= 0."""
    cima = np.array(vis['cima'], float)
    cima /= np.linalg.norm(cima)
    lado = np.array(vis['lado'], float)
    lado /= np.linalg.norm(lado)
    if espelhar:
        lado = lado * np.array([-1.0, 1.0, 1.0])
        cima = cima * np.array([-1.0, 1.0, 1.0])
    ok = lambda d: d @ cima >= vis['elevacao_minima'] and d @ lado >= vis['lado_minimo']
    return [Vector(d) for d in direcoes_espelhadas(int(vis['direcoes'])) if ok(d)], ok


class Visibilidade:
    """Ponto visível de fora: algum raio, pela normal, contra ela ou por uma direção permitida, escapa sem bater no oclusor."""

    def __init__(self, arvore, cfg):
        self.arvore = arvore
        self.simetria = cfg['simetria_x']
        self.d = {1: direcoes(cfg['visibilidade']), -1: direcoes(cfg['visibilidade'], espelhar=True)}

    def pontos(self, P, N):
        ok = np.zeros(len(P), bool)
        for i, (p, n) in enumerate(zip(P, N)):
            lado = -1 if self.simetria and p[0] < 0 else 1
            dirs, permitida = self.d[lado]
            pv = Vector(p)
            candidatas = [Vector(s * n) for s in (1.0, -1.0) if permitida(s * n)] + dirs
            for d in candidatas:
                if self.arvore.ray_cast(pv + d * DESLOCAMENTO, d)[0] is None:
                    ok[i] = True
                    break
        return ok

    def triangulos(self, V, F, mascara=None):
        """Triângulo visível: o centro ou um dos três pontos a 2/3 do caminho do centro a cada vértice se vê de fora."""
        N, _ = normais(V, F)
        ids = np.nonzero(mascara if mascara is not None else np.ones(len(F), bool))[0]
        ok = np.zeros(len(F), bool)
        for w in ([1 / 3, 1 / 3, 1 / 3], [2 / 3, 1 / 6, 1 / 6], [1 / 6, 2 / 3, 1 / 6], [1 / 6, 1 / 6, 2 / 3]):
            falta = ids[~ok[ids]]
            if not len(falta):
                break
            pts = sum(wk * V[F[falta, k]] for k, wk in enumerate(w))
            ok[falta] = self.pontos(pts, N[falta])
        return ok


def ler_oclusores(caminho, z_cima=False):
    """Malha extra que só bloqueia a vista (por exemplo, tampas de vãos que o observador não atravessa). Ela vem no quadro de
    trabalho (y para cima), qualquer que seja o da referência; --z-cima-oclusores a converte como --z-cima."""
    if not caminho:
        return None
    V, F, _ = ler_malha(caminho, z_cima=z_cima)
    return V, F


# ---------- preparo da referência ----------

def preparar_referencia(V, F, rot, cfg, oclusores=None):
    """Recorta a referência pelos planos da caixa e guarda só a pele que se vê de fora: os triângulos visíveis, os rótulos
    excluídos fora, cada painel (faces ligadas por aresta com diedro abaixo de angulo_painel) inteiro ou fora pela fração
    visível, e os componentes pequenos fora. Devolve o recorte, a máscara do que fica e as contagens."""
    regiao = regiao_do_recorte(cfg)
    Vr, Fr = recortar(V, F, regiao)
    cont = {'triangulos_referencia': int(len(F)), 'triangulos_recorte': int(len(Fr))}
    if not len(Fr):
        erro('a caixa não corta nenhuma face da referência')
    arvore = bvh(V, F, oclusores)
    vis = Visibilidade(arvore, cfg).triangulos(Vr, Fr)
    cont['triangulos_visiveis'] = int(vis.sum())
    C = Vr[Fr].mean(1)
    rot_r = None
    excl = np.zeros(len(Fr), bool)
    if rot is not None:
        perto = bvh(V, F)
        rot_r = np.array([rot[perto.find_nearest(Vector(c))[2]] for c in C], dtype=object)
        excl = np.isin(rot_r.astype(str), [str(s) for s in cfg['excluir']])
    cont['triangulos_excluidos_por_rotulo'] = int(excl.sum())
    internas, bordas, nv = arestas(Fr)
    di = diedros(Vr, Fr, internas)
    liga = di < cfg['angulo_painel']
    painel = _uniao(len(Fr), zip(internas[2][liga], internas[3][liga]))
    _, area = normais(Vr, Fr)
    manter = np.zeros(len(Fr), bool)
    ids_p, inv_p = np.unique(painel, return_inverse=True)
    a_tot = np.bincount(inv_p, area)
    a_vis = np.bincount(inv_p, area * vis)
    a_exc = np.bincount(inv_p, area * excl)
    entra = (a_vis >= cfg['fracao_painel_visivel'] * a_tot) & (a_exc < 0.5 * a_tot)
    manter = entra[inv_p]
    cont['paineis'] = int(len(ids_p))
    cont['paineis_removidos'] = int((~entra).sum())
    espelhados = 0
    if cfg['simetria_x']:
        # a metade x < 0 leva a decisão da imagem espelhada: a mesma superfície triangulada de outro jeito (na referência
        # ou no bisect) dá outros pontos de visibilidade e outra fração visível do painel, e a decisão sairia de um lado só
        manter, espelhados = espelhar_decisao(Vr, Fr, manter)
    # componentes por aresta entre faces mantidas
    ambos = manter[internas[2]] & manter[internas[3]]
    comp = _uniao(len(Fr), zip(internas[2][ambos], internas[3][ambos]))
    ids_c, inv_c = np.unique(comp[manter], return_inverse=True)
    a_c = np.bincount(inv_c, area[manter])
    pequenos = ids_c[a_c < cfg['fracao_componente'] * a_c.max()] if len(a_c) else []
    cont['componentes'] = int(len(ids_c))
    cont['componentes_removidos'] = int(len(pequenos))
    manter &= ~np.isin(comp, pequenos)
    # o painel mantido pode levar triângulos de rótulo excluído (borda da região rotulada); eles recebem o rótulo do
    # triângulo mantido e não excluído mais perto, para que a medida por rótulo não relate região escondida
    if rot_r is not None and (manter & excl).any() and (manter & ~excl).any():
        bons = np.nonzero(manter & ~excl)[0]
        k = kd(C[bons])
        for t in np.nonzero(manter & excl)[0]:
            rot_r[t] = rot_r[bons[k.find(Vector(C[t]))[1]]]
        cont['triangulos_rotulo_herdado'] = int((manter & excl).sum())
    cont['triangulos_mantidos'] = int(manter.sum())
    cont['area_mantida_m2'] = round(float(area[manter].sum()), 6)
    if cfg['simetria_x']:
        cont['simetria'] = {'triangulos_decididos_pelo_espelho': espelhados, **simetria_do_recorte(Vr, Fr, manter)}
    cont['bordas'] = classificar_bordas(Vr, Fr, manter, regiao, cfg['angulo_painel'])
    fora = np.maximum(regiao[:, 0] - Vr[np.unique(Fr[manter])], Vr[np.unique(Fr[manter])] - regiao[:, 1]).max()
    cont['fora_da_caixa_m'] = float(max(0.0, fora))
    return {'V': Vr, 'F': Fr, 'manter': manter, 'visivel': vis, 'rotulo': rot_r, 'regiao': regiao, 'contagens': cont}


def espelhar_decisao(V, F, manter, tol=1e-3):
    """Com simetria em x: cada triângulo de centro em x < 0 fica ou sai como o triângulo onde cai a imagem espelhada do
    centro dele, a até tol metro; sem imagem na malha, fica a própria decisão. Devolve a decisão nova e quantos triângulos
    ela mudou."""
    arv = bvh(V, F)
    C_ = V[F].mean(1)
    novo = manter.copy()
    for t in np.nonzero(C_[:, 0] < 0)[0]:
        idx = arv.find_nearest(Vector(C_[t] * np.array([-1.0, 1.0, 1.0])), tol)[2]
        if idx is not None:
            novo[t] = manter[idx]
    return novo, int((novo != manter).sum())


def simetria_do_recorte(V, F, manter, tol=1e-3):
    """Com simetria em x, confere que o recorte é simétrico: a imagem espelhada do centro de cada triângulo mantido cai, a
    até tol metro, sobre um triângulo do recorte, e esse triângulo também fica. Devolve a área (e a contagem) dos mantidos
    cujo espelho caiu num triângulo tirado, que é a assimetria do próprio recorte, e a área dos que não têm espelho na malha,
    que é a assimetria da referência."""
    arv = bvh(V, F)
    _, area = normais(V, F)
    Cm = V[F].mean(1) * np.array([-1.0, 1.0, 1.0])
    tirado, n_tirado, sem = 0.0, 0, 0.0
    for t in np.nonzero(manter)[0]:
        idx = arv.find_nearest(Vector(Cm[t]), tol)[2]
        if idx is None:
            sem += area[t]
        elif not manter[idx]:
            tirado += area[t]
            n_tirado += 1
    return {'tolerancia_m': tol, 'triangulos_espelho_tirado': n_tirado, 'area_espelho_tirado_m2': round(float(tirado), 6),
            'area_sem_espelho_m2': round(float(sem), 6)}


def classificar_bordas(V, F, manter, regiao, angulo_painel):
    """As bordas do que fica: corte (sobre um plano da caixa), natural (borda livre da própria malha), dobra (entre face
    mantida e face tirada com diedro de painel) ou outra, que não deveria existir; e as arestas não variedade."""
    internas, bordas, nv = arestas(F)
    a, b, t1, t2, _ = internas
    di = diedros(V, F, internas)
    so_uma = manter[t1] != manter[t2]
    out = {'corte': 0, 'natural': 0, 'dobra': int((so_uma & (di >= angulo_painel)).sum()),
           'outra': int((so_uma & (di < angulo_painel)).sum()), 'nao_variedade': nv}
    ba, bb, bt = bordas
    m = manter[bt]
    no_plano = np.zeros(len(ba), bool)
    for e in range(3):
        for c in regiao[e]:
            no_plano |= (np.abs(V[ba, e] - c) < TOL_PLANO) & (np.abs(V[bb, e] - c) < TOL_PLANO)
    out['corte'] = int((m & no_plano).sum())
    out['natural'] = int((m & ~no_plano).sum())
    return out


# ---------- render ----------

def limpar_cena(amostras=4):
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = amostras
    sc.cycles.use_denoising = False
    sc.cycles.max_bounces = 0
    sc.cycles.use_adaptive_sampling = False
    sc.cycles.seed = 0
    sc.render.film_transparent = False
    sc.render.image_settings.file_format = 'PNG'
    w = bpy.data.worlds.get('W') or bpy.data.worlds.new('W')
    sc.world = w
    w.use_nodes = True
    bg = w.node_tree.nodes.get('Background')
    bg.inputs[0].default_value = (1, 1, 1, 1)
    bg.inputs[1].default_value = 1.0
    sc.view_settings.view_transform = 'Standard'
    sc.view_settings.look = 'None'
    return sc


def _material(nome, tipo, avesso, cor=(0.75, 0.75, 0.78), luz=(0.45, 0.7, 0.55), freq=40.0):
    """Emissão sem luz de cena, determinística. cinza: sombreamento por |n . luz|; zebra: listras do vetor refletido num
    ambiente de faixas horizontais; cor: o atributo 'cor' do vértice. Nas duas primeiras o avesso sai multiplicado pela cor
    de avesso, para que a face vista por trás não se confunda com a superfície."""
    m = bpy.data.materials.get(nome)
    if m:
        return m
    m = bpy.data.materials.new(nome)
    m.use_nodes = True
    nt = m.node_tree
    N, L = nt.nodes, nt.links
    for n in list(N):
        N.remove(n)
    out = N.new('ShaderNodeOutputMaterial')
    em = N.new('ShaderNodeEmission')
    L.new(em.outputs[0], out.inputs[0])
    geo = N.new('ShaderNodeNewGeometry')
    if tipo == 'cor':
        at = N.new('ShaderNodeAttribute')
        at.attribute_name = 'cor'
        at.attribute_type = 'GEOMETRY'
        L.new(at.outputs['Color'], em.inputs[0])
        return m
    if tipo == 'cinza':
        dot = N.new('ShaderNodeVectorMath')
        dot.operation = 'DOT_PRODUCT'
        dot.inputs[1].default_value = Vector(luz).normalized()
        L.new(geo.outputs['Normal'], dot.inputs[0])
        ab = N.new('ShaderNodeMath')
        ab.operation = 'ABSOLUTE'
        L.new(dot.outputs['Value'], ab.inputs[0])
        s = N.new('ShaderNodeMath')
        s.operation = 'MULTIPLY_ADD'
        s.inputs[1].default_value = 0.75
        s.inputs[2].default_value = 0.22
        L.new(ab.outputs[0], s.inputs[0])
        base = cor
    else:
        neg = N.new('ShaderNodeVectorMath')
        neg.operation = 'SCALE'
        neg.inputs['Scale'].default_value = -1.0
        L.new(geo.outputs['Incoming'], neg.inputs[0])
        refl = N.new('ShaderNodeVectorMath')
        refl.operation = 'REFLECT'
        L.new(neg.outputs[0], refl.inputs[0])
        L.new(geo.outputs['Normal'], refl.inputs[1])
        sep = N.new('ShaderNodeSeparateXYZ')
        L.new(refl.outputs[0], sep.inputs[0])
        mul = N.new('ShaderNodeMath')
        mul.operation = 'MULTIPLY'
        mul.inputs[1].default_value = freq
        L.new(sep.outputs[1], mul.inputs[0])
        sn = N.new('ShaderNodeMath')
        sn.operation = 'SINE'
        L.new(mul.outputs[0], sn.inputs[0])
        gt = N.new('ShaderNodeMath')
        gt.operation = 'GREATER_THAN'
        gt.inputs[1].default_value = 0.0
        L.new(sn.outputs[0], gt.inputs[0])
        s = N.new('ShaderNodeMath')
        s.operation = 'MULTIPLY_ADD'
        s.inputs[1].default_value = 0.85
        s.inputs[2].default_value = 0.08
        L.new(gt.outputs[0], s.inputs[0])
        base = (1.0, 1.0, 1.0)
    lado = N.new('ShaderNodeMix')
    lado.data_type = 'RGBA'
    lado.blend_type = 'MIX'
    lado.inputs[6].default_value = (*base, 1)
    lado.inputs[7].default_value = (base[0] * avesso[0], base[1] * avesso[1], base[2] * avesso[2], 1)
    L.new(geo.outputs['Backfacing'], lado.inputs['Factor'])
    cinza = N.new('ShaderNodeCombineColor')
    for k in range(3):
        L.new(s.outputs[0], cinza.inputs[k])
    mix = N.new('ShaderNodeMix')
    mix.data_type = 'RGBA'
    mix.blend_type = 'MULTIPLY'
    mix.inputs['Factor'].default_value = 1.0
    L.new(lado.outputs[2], mix.inputs[6])
    L.new(cinza.outputs[0], mix.inputs[7])
    L.new(mix.outputs[2], em.inputs[0])
    return m


def malha_de_arrays(nome, V, F, cores=None, suave_angulo=30.0):
    me = bpy.data.meshes.new(nome)
    me.from_pydata([tuple(map(float, v)) for v in V], [], [tuple(map(int, f)) for f in F])
    me.validate()
    me.update()
    if cores is not None:
        a = me.color_attributes.new('cor', 'FLOAT_COLOR', 'POINT')
        a.data.foreach_set('color', np.hstack([cores, np.ones((len(cores), 1))]).astype(np.float32).ravel())
    me.shade_smooth()
    if suave_angulo is not None:
        me.set_sharp_from_angle(angle=math.radians(suave_angulo))
    o = bpy.data.objects.new(nome, me)
    bpy.context.scene.collection.objects.link(o)
    return o


def vistas_padrao(cfg):
    """Frente de +z, traseira de -z, lado de +x, topo de +y com a frente embaixo e três-quartos de +x, +y e +z; com
    simetria em x, a três-quartos mostra só a metade x >= 0, que a outra apareceria em pedaços pelos vãos."""
    return [
        {'nome': 'frente', 'direcao': [0, 0, -1], 'cima': [0, 1, 0]},
        {'nome': 'traseira', 'direcao': [0, 0, 1], 'cima': [0, 1, 0]},
        {'nome': 'lado', 'direcao': [-1, 0, 0], 'cima': [0, 1, 0]},
        {'nome': 'topo', 'direcao': [0, -1, 0], 'cima': [0, 0, -1]},
        {'nome': 'tresquartos', 'direcao': [-0.55, -0.45, -0.70], 'cima': [0, 1, 0], 'meia': bool(cfg['simetria_x'])},
    ]


def eixos_da_camera(direcao, cima):
    d = Vector(direcao).normalized()
    z = -d
    x = Vector(cima).cross(z).normalized()
    y = z.cross(x)
    return x, y, z


def completar_vistas(cfg, regiao):
    """Cada vista com centro e escala (largura da imagem em metro): o centro da região do recorte e a escala que cabe a
    caixa projetada com 10% de folga, salvo quando a vista os declara."""
    W, H = cfg['resolucao']
    cantos = np.array([[regiao[0, i], regiao[1, j], regiao[2, k]] for i in (0, 1) for j in (0, 1) for k in (0, 1)])
    centro = regiao.mean(1)
    out = []
    for v in (cfg['vistas'] or vistas_padrao(cfg)):
        v = dict(v)
        x, y, z = eixos_da_camera(v['direcao'], v['cima'])
        v.setdefault('centro', centro.tolist())
        if 'escala' not in v:
            px = (cantos - centro) @ np.array(x)
            py = (cantos - centro) @ np.array(y)
            v['escala'] = float(1.1 * max(px.max() - px.min(), (py.max() - py.min()) * W / H))
        v['x_cam'], v['y_cam'], v['z_cam'] = list(x), list(y), list(z)
        v['W'], v['H'] = W, H
        out.append(v)
    return out


def camera():
    sc = bpy.context.scene
    cam = bpy.data.cameras.new('cam')
    cam.type = 'ORTHO'
    cam.sensor_fit = 'HORIZONTAL'
    co = bpy.data.objects.new('cam', cam)
    sc.collection.objects.link(co)
    sc.camera = co
    return co


def renderizar(objs, tipo, vista, arquivo, avesso, amostras=None):
    """Renderiza os objetos com o material do tipo na vista (com centro, escala, W e H) e grava o PNG."""
    sc = bpy.context.scene
    if amostras:
        sc.cycles.samples = amostras
    sc.render.resolution_x, sc.render.resolution_y = vista['W'], vista['H']
    sc.render.resolution_percentage = 100
    m = _material('m_' + tipo, tipo, avesso)
    for o in objs:
        o.data.materials.clear()
        o.data.materials.append(m)
    co = sc.camera
    x, y, z = Vector(vista['x_cam']), Vector(vista['y_cam']), Vector(vista['z_cam'])
    c = Vector(vista['centro'])
    co.location = c + z * 50.0
    co.rotation_euler = Matrix((x, y, z)).transposed().to_euler()
    co.data.ortho_scale = vista['escala']
    co.data.clip_end = 200.0
    sc.render.filepath = arquivo
    bpy.ops.render.render(write_still=True)


def fracao_de_avesso(arquivo, avesso):
    """Fração dos pixels do objeto (não brancos) com o matiz do avesso, lida do PNG renderizado antes da grade."""
    im = bpy.data.images.load(arquivo, check_existing=False)
    px = np.empty(im.size[0] * im.size[1] * 4, np.float32)
    im.pixels.foreach_get(px)
    bpy.data.images.remove(im)
    px = px.reshape(-1, 4)[:, :3]
    objeto = px.min(1) < 0.98
    a = np.array(avesso)
    # o avesso tem o verde bem abaixo do vermelho e do azul; o cinza tem os três canais juntos
    marcado = objeto & (px[:, 0] - px[:, 1] > 0.25 * (a[0] - a[1])) & (px[:, 2] - px[:, 1] > 0.25 * (a[2] - a[1]))
    return {'pixels_objeto': int(objeto.sum()), 'pixels_avesso': int(marcado.sum()),
            'fracao': round(float(marcado.sum() / max(1, objeto.sum())), 4)}


def python_do_sistema():
    return os.environ.get('MECANIFICA_PYTHON', 'python3')


def imagens(*args):
    """Chama imagens.py (Python do sistema com Pillow) para a grade, as linhas, os cortes e a folha."""
    subprocess.run([python_do_sistema(), '-I', os.path.join(AQUI, 'imagens.py'), *map(str, args)], check=True)


def so_metade_positiva(V, F):
    m = V[F].mean(1)[:, 0] >= 0
    return F[m]


def compactar(V, F):
    u = np.unique(F)
    mp = -np.ones(len(V), int)
    mp[u] = np.arange(len(u))
    return V[u], mp[F]


# ---------- linhas de feição ----------

def linhas_de_feicao(V, F, manter, regiao, angulo):
    """Segmentos (a, b) em 3D e o tipo de cada um, das faces mantidas: 'feicao' (aresta entre duas faces mantidas com diedro
    acima de angulo), 'dobra' (aresta entre face mantida e face tirada), 'natural' (borda livre da malha) e 'corte' (borda
    sobre um plano da caixa)."""
    internas, bordas, _ = arestas(F)
    a, b, t1, t2, _ = internas
    di = diedros(V, F, internas)
    m1, m2 = manter[t1], manter[t2]
    segs, tipos = [], []
    sel = m1 & m2 & (di > angulo)
    segs += list(zip(V[a[sel]], V[b[sel]]))
    tipos += ['feicao'] * int(sel.sum())
    sel = m1 != m2
    segs += list(zip(V[a[sel]], V[b[sel]]))
    tipos += ['dobra'] * int(sel.sum())
    ba, bb, bt = bordas
    m = manter[bt]
    no_plano = np.zeros(len(ba), bool)
    for e in range(3):
        for c in regiao[e]:
            no_plano |= (np.abs(V[ba, e] - c) < TOL_PLANO) & (np.abs(V[bb, e] - c) < TOL_PLANO)
    for sel, tipo in ((m & ~no_plano, 'natural'), (m & no_plano, 'corte')):
        segs += list(zip(V[ba[sel]], V[bb[sel]]))
        tipos += [tipo] * int(sel.sum())
    return segs, tipos


def pontos_dos_segmentos(segs, passo=0.002):
    """Os pontos de cada segmento a cada passo metros, com as duas pontas."""
    out = []
    for p, q in segs:
        k = max(1, int(np.ceil(np.linalg.norm(q - p) / passo)))
        ts = np.linspace(0, 1, k + 1)
        out.append(p[None] + ts[:, None] * (q - p)[None])
    return out


def _escapa(arvore, origem, d, rasante=1e-3, voltas=8):
    """Se o raio de origem na direção d sai sem bater na superfície. A face de perfil, com a normal a menos de rasante do
    perpendicular ao raio, não esconde nada (não tem área na vista), e o raio segue além dela: a aresta de silhueta tem uma
    face de perfil ao lado, e o raio que corre rente a ela batia ou não conforme o arredondamento das coordenadas."""
    o = origem
    for _ in range(voltas):
        loc, nrm, _, _ = arvore.ray_cast(o, d)
        if loc is None:
            return True
        if abs(nrm.dot(d)) > rasante:
            return False
        o = loc + d * 1e-6
    return False


def visiveis_na_vista(pontos, segs, arvore, vista, meia=False):
    """Para os pontos de cada segmento, se cada um se vê na vista ortográfica: o raio dele para a câmera não bate na
    superfície (_escapa). Na vista de meia peça, o segmento com uma ponta em x < 0 fica todo escondido."""
    zv = Vector(np.array(vista['z_cam'], float))
    out = []
    for pts, (p, q) in zip(pontos, segs):
        if meia and (p[0] < -1e-9 or q[0] < -1e-9):
            out.append(np.zeros(len(pts), bool))
            continue
        out.append(np.array([_escapa(arvore, Vector(pt) + zv * 1e-3, zv) for pt in pts]))
    return out


def trechos(pts, vis):
    """Os trechos de pontos visíveis seguidos, com dois pontos ou mais."""
    out, i = [], 0
    while i < len(pts):
        if not vis[i]:
            i += 1
            continue
        j = i
        while j < len(pts) and vis[j]:
            j += 1
        if j - i >= 2:
            out.append(pts[i:j])
        i = j
    return out


def para_pixels(P, vista):
    c = np.array(vista['centro'], float)
    xc, yc = np.array(vista['x_cam'], float), np.array(vista['y_cam'], float)
    s, W, H = vista['escala'], vista['W'], vista['H']
    return np.stack([W / 2 + ((P - c) @ xc) / s * W, H / 2 - ((P - c) @ yc) / s * W], 1)


def linhas_na_vista(segs, tipos, arvore, vista, passo=0.002, meia=False, pontos=None, vis=None):
    """Projeta os segmentos na vista ortográfica e tira o trecho escondido: cada ponto, a cada passo metros, é visível se o
    raio dele para a câmera não bate na superfície. Devolve {tipo: [polilinha em pixels, ...]}."""
    pontos = pontos if pontos is not None else pontos_dos_segmentos(segs, passo)
    vis = vis if vis is not None else visiveis_na_vista(pontos, segs, arvore, vista, meia)
    out = {}
    for pts, v, tipo in zip(pontos, vis, tipos):
        for T in trechos(pts, v):
            out.setdefault(tipo, []).append([[round(float(a), 2), round(float(b), 2)] for a, b in para_pixels(T, vista)])
    return out


# ---------- cortes ----------

EIXOS_DO_CORTE = {0: (2, 1), 1: (0, 2), 2: (0, 1)}   # plano x: (z, y); plano y: (x, z); plano z: (x, y)


def cortar_plano(V, F, mascara, eixo, valor, tol=1e-6):
    """Interseção das faces da máscara com o plano eixo = valor, encadeada em polilinhas 3D (listas de pontos)."""
    T = V[F[mascara]]
    d = T[:, :, eixo] - valor
    d = np.where(np.abs(d) < 1e-12, 1e-12, d)
    s = np.sign(d)
    cruza = (s.max(1) > 0) & (s.min(1) < 0)
    segs = []
    for tri, dd in zip(T[cruza], d[cruza]):
        pts = []
        for i in range(3):
            j = (i + 1) % 3
            if (dd[i] > 0) != (dd[j] > 0):
                u = dd[i] / (dd[i] - dd[j])
                pts.append(tri[i] + u * (tri[j] - tri[i]))
        if len(pts) == 2:
            segs.append(pts)
    # encadeia pelos extremos soldados; segmento de comprimento nulo (o plano passando por um vértice) sai
    chave = lambda p: tuple(np.round(np.asarray(p) / tol).astype(np.int64))
    arestas_c, pos, viz = [], {}, {}
    for p, q in segs:
        a_, b_ = chave(p), chave(q)
        if a_ == b_:
            continue
        pos[a_], pos[b_] = p, q
        k = len(arestas_c)
        arestas_c.append((a_, b_))
        viz.setdefault(a_, []).append(k)
        viz.setdefault(b_, []).append(k)
    usada = np.zeros(len(arestas_c), bool)
    cadeias = []
    ordem = sorted(viz, key=lambda n: len(viz[n]) == 2)   # começa pelas pontas e bifurcações; os laços ficam por último
    for ini in ordem:
        for k0 in viz[ini]:
            if usada[k0]:
                continue
            cadeia, cur, k = [ini], ini, k0
            while True:
                usada[k] = True
                a_, b_ = arestas_c[k]
                cur = b_ if a_ == cur else a_
                cadeia.append(cur)
                if len(viz[cur]) != 2:
                    break
                prox = [e for e in viz[cur] if not usada[e]]
                if not prox:
                    break
                k = prox[0]
            cadeias.append(np.array([pos[n] for n in cadeia]))
    return cadeias


def reamostrar_polilinha(P, passo):
    """Pontos a cada passo ao longo da polilinha (os extremos inclusos)."""
    seg = np.linalg.norm(np.diff(P, axis=0), axis=1)
    s = np.concatenate([[0], np.cumsum(seg)])
    if s[-1] <= 0:
        return P[:1]
    alvo = np.append(np.arange(0, s[-1], passo), s[-1])
    return np.stack([np.interp(alvo, s, P[:, j]) for j in range(P.shape[1])], 1)


TIPOS_PRETOS = ('feicao', 'dobra', 'natural', 'declarado')   # o traço preto das vistas de linhas; 'corte' sai em cinza


def desenhar_linhas(V, F, manter, regiao, angulo, vistas, prefixo, declarados=None, trechos_3d=None):
    """Grava <prefixo><vista>-linhas.png de cada vista: as linhas de feição e as bordas das faces mantidas, sem o trecho
    escondido, em traço preto sobre branco (o corte da caixa em cinza), no tamanho e na câmera da vista. declarados são
    segmentos (n, 2, 3) de vinco que a malha declara, desenhados em preto como a feição, menos os que repetem uma aresta já
    desenhada. Com trechos_3d (um dicionário), guarda nele, por vista, os trechos visíveis do traço preto em 3D, como
    [(tipo, pontos (k, 3))], e em '_qualquer' os trechos visíveis em ao menos uma das vistas."""
    import tempfile
    segs, tipos = linhas_de_feicao(V, F, manter, regiao, angulo)
    if declarados is not None and len(declarados):
        chave = lambda p, q: tuple(sorted((tuple(np.round(p / 1e-6).astype(np.int64)), tuple(np.round(q / 1e-6).astype(np.int64)))))
        ja = {chave(p, q) for (p, q), t in zip(segs, tipos) if t != 'corte'}
        novos = [(p, q) for p, q in declarados if chave(p, q) not in ja]
        segs += novos
        tipos += ['declarado'] * len(novos)
    Vk, Fk = compactar(V, F[manter])
    arv = bvh(Vk, Fk)
    contagem = {t: tipos.count(t) for t in ('feicao', 'dobra', 'natural', 'corte', 'declarado')}
    if not contagem['declarado']:
        del contagem['declarado']
    pontos = pontos_dos_segmentos(segs)
    algum = [np.zeros(len(p), bool) for p in pontos]
    for v in vistas:
        vis = visiveis_na_vista(pontos, segs, arv, v, bool(v.get('meia')))
        pl = linhas_na_vista(segs, tipos, arv, v, pontos=pontos, vis=vis)
        with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as t:
            json.dump({'W': v['W'], 'H': v['H'], 'linhas': pl}, t)
        imagens('linhas', t.name, f"{prefixo}{v['nome']}-linhas.png")
        os.unlink(t.name)
        if trechos_3d is not None:
            trechos_3d[v['nome']] = [(tp, T) for pts, vv, tp in zip(pontos, vis, tipos) if tp in TIPOS_PRETOS for T in trechos(pts, vv)]
            algum = [a | vv for a, vv in zip(algum, vis)]
    if trechos_3d is not None:
        trechos_3d['_qualquer'] = [(tp, T) for pts, a, tp in zip(pontos, algum, tipos) if tp in TIPOS_PRETOS for T in trechos(pts, a)]
    return contagem


def contornos_dos_cortes(V, F, mascara, cortes):
    """Para cada corte {nome, eixo, valor}: as cadeias do contorno em 3D e em (u, v) do plano, em metro."""
    out = []
    for c in cortes:
        e = 'xyz'.index(c['eixo'])
        u, w = EIXOS_DO_CORTE[e]
        cad = cortar_plano(V, F, mascara, e, float(c['valor']))
        out.append({'nome': c['nome'], 'eixo': c['eixo'], 'valor': float(c['valor']), 'eixos_uv': ['xyz'[u], 'xyz'[w]],
                    'cadeias_3d': cad, 'cadeias_uv': [P[:, [u, w]] for P in cad]})
    return out
