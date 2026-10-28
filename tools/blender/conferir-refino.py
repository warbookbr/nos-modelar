# conferir-refino.py — confere uma rodada de refino: compara a candidata da rodada anterior com a da nova e diz quanto a
# superfície andou, no total e em cada zona que o veredito do crítico deu como certa, sem olhar para a referência. A lista do
# que está certo vem do veredito e era só texto; esta conferência a transforma em medida e acusa a zona certa que o refinador
# mexeu, para quem conduz o laço devolver a zona ao modelador antes de chamar o crítico de novo.
#
# Uso:
#   blender -b --factory-startup --python tools/blender/conferir-refino.py -- \
#       --anterior <cand.obj|.glb|.gltf|.blend|receita.js> [--objeto-anterior <nome>] \
#       --nova <cand.obj|.glb|.gltf|.blend|receita.js> [--objeto-nova <nome>] [--z-cima | --z-cima-anterior | --z-cima-nova] \
#       --zonas <zonas.json> --saida <pasta> [--caixa xmin,xmax,ymin,ymax,zmin,zmax] [--tolerancia-mm 3] \
#       [--criterio maximo|p95] [--partes nome,nome | --todas-as-partes] [--config <cfg.json>] [--simetria-x] \
#       [--oclusores <malha>] [--densidade 40000] [--mapa-sinal-mm 6] [--resolucao-vista 1440x1080] [--sem-imagens] [--nome <rótulo>]
#
# As zonas (JSON, em milímetro, no quadro do pacote: y para cima e a frente em +z) são caixas por faixa de x, y e z, as que o
# orquestrador tira das posições que o crítico leu na grade:
#   { "tolerancia_mm": 3, "criterio": "maximo",
#     "zonas": [ { "nome": "janela-lateral", "x": [300, 700], "y": [250, 450], "z": [-20, 20],
#                  "pedido": [ { "descricao": "arredondar a ponta esquerda da janela", "x": [295, 335], "y": [245, 285] } ] },
#                { "nome": "teto", "caixa": [0, 900, 560, 600, 0, 300], "tolerancia_mm": 2 } ] }
# O eixo que a zona não declara fica livre. Cada zona tem nome (é a identidade dela; sem índice) e pode trazer a própria
# tolerância. Uma lista de zonas sozinha, sem o objeto em volta, também vale.
#
# O pedido (também aceito como "ignorar") é o que o próprio crítico mandou mudar dentro da zona: uma caixa menor, ou uma lista
# delas, cada uma com "descricao" (a identidade, o texto do pedido no veredito) e os limites x, y, z ou "caixa" em milímetro; o
# eixo que o pedido não declara fica com os limites da zona, e o pedido tem de caber na zona sem cobri-la inteira. Os pontos
# dentro de um pedido não entram na conta da zona, e a saída diz, à parte, quanto a superfície andou nele.
#
# Com receita (.js) nas duas rodadas, a comparação é por parte nomeada: por padrão entram só as partes presentes nas duas
# (a lataria que o crítico julgou), e as partes novas e as que sumiram saem à parte, com a caixa e a zona em que caem, sem
# serem acusadas. --partes escolhe as partes por nome (todas precisam existir nas duas rodadas) e --todas-as-partes devolve a
# comparação de tudo. Um corpo de uma parte que a receita separa em vários (parte__2) conta como a parte. Com OBJ, GLB ou
# .blend, que não trazem partes, a comparação inclui tudo, e a saída diz isso.
#
# O que se mede: cada candidata passa pelo que a régua faz com a candidata: as faces que tocam a caixa, só o que se vê de fora
# (com os oclusores), amostras em retícula sem acaso dentro da caixa (densidade amostras por m²). Na comparação por parte, cada
# candidata é só as partes comparadas, de modo que o friso que cobre a chapa não esconde a chapa. De cada amostra da anterior
# mede-se a distância exata à superfície visível da nova (o que a nova deixou de cobrir ou moveu) e de cada amostra da nova a
# distância à anterior (o que a nova pôs a mais), com mediana, p95 e máximo em mm, no total, em cada zona e fora de todas as
# zonas. O sinal é o do deslocamento da nova em relação à anterior: positivo onde a nova sobra ou avança, negativo onde ela
# afunda ou recua. Vem da normal da face mais perto, virada para fora como a régua a vira; quando o ponto mais perto está numa
# borda e a distância corre ao longo da superfície (a abertura que andou, a quina que recuou), a normal não decide e vale a
# regra do que a nova tem a mais ou a menos. A zona fica `mexida` quando o critério (o máximo, ou o p95 com --criterio p95)
# passa da tolerância, e a saída diz onde (o ponto do máximo, o vetor que leva a nova à anterior, a caixa dos pontos acima da
# tolerância). O que se mede é a distância entre superfícies: uma faixa lisa que anda ao longo de si mesma não aparece, e as
# bordas e os contornos, que acabam, aparecem. Uma parte lataria que mudou de nome entre as rodadas aparece como nova e como
# sumida, fora da comparação; a nota diz isso e --todas-as-partes a traz de volta.
#
# Grava em <saida>/: conferencia.json, conferencia.md (o texto que se devolve ao modelador), conferencia-notas.md (as partes
# novas e sumidas, o modo da comparação e os pedidos, para quem conduz o laço) e, sem --sem-imagens, uma imagem por vista,
# conferencia-<vista>.png, com a anterior e a nova pintadas pelo deslocamento com sinal e as zonas desenhadas (verde: conferida;
# magenta: mexida). Escreve no fim a linha CONFERENCIA com o JSON; sai com 0 mesmo havendo zona mexida, e com 2 quando a entrada
# não serve.
import json, os, re, shutil, subprocess, sys, tempfile, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from mathutils import Vector
import comum as C

LATERAL = 0.5          # |componente pela normal| abaixo disto da distância: o deslocamento corre ao longo da superfície
SINAL_MIN_MM = 0.05    # abaixo disto o ponto não leva sinal: é ruído de triangulação
COR_CERTA, COR_MEXIDA = (0, 140, 60), (200, 0, 160)
LIVRE = 1e9

t0 = time.time()
a = C.argumentos()
for k in ('anterior', 'nova', 'zonas', 'saida'):
    if k not in a:
        C.erro(f'falta --{k}')
cfg = C.configuracao(a, exige_caixa=False)
cfg.setdefault('densidade', 40000.0)
cfg.setdefault('max_amostras', 250000)
MARGEM = cfg['margem']
os.makedirs(a['saida'], exist_ok=True)
RAIZ = os.path.dirname(os.path.dirname(C.AQUI))


# ---------- entrada ----------

def numero(texto, o):
    try:
        return float(texto)
    except (TypeError, ValueError):
        C.erro(f'{o}: "{texto}" não é número')


TOL_PADRAO = numero(a.get('tolerancia_mm', 3.0), '--tolerancia-mm')
CRITERIOS = ('maximo', 'p95')


def ler_caixa(z, rotulo, base):
    """Os limites [min, max] em mm dos três eixos de um objeto com "caixa" (seis números) e/ou "x", "y", "z"; o eixo que não
    declara fica com o de `base`."""
    caixa = base.copy()
    if 'caixa' in z:
        c = z['caixa']
        if not isinstance(c, list) or len(c) != 6:
            C.erro(f'{rotulo}: "caixa" são seis números xmin,xmax,ymin,ymax,zmin,zmax em mm')
        caixa = np.array([float(x) for x in c]).reshape(3, 2)
    for e, eixo in enumerate('xyz'):
        if eixo in z:
            if not isinstance(z[eixo], list) or len(z[eixo]) != 2:
                C.erro(f'{rotulo}: "{eixo}" é [min, max] em mm')
            caixa[e] = [float(z[eixo][0]), float(z[eixo][1])]
    if np.any(caixa[:, 0] >= caixa[:, 1]):
        C.erro(f'{rotulo}: faixa vazia {caixa.tolist()}')
    return caixa


def ler_pedidos(z, nome, caixa_da_zona):
    """Os pedidos da zona ("pedido" ou "ignorar", um objeto ou uma lista), cada um com descrição e uma caixa que cabe na zona
    sem cobri-la inteira."""
    brutos = []
    for chave in ('pedido', 'ignorar'):
        if chave in z:
            v = z[chave]
            brutos += v if isinstance(v, list) else [v]
    out, descricoes = [], set()
    for p in brutos:
        if not isinstance(p, dict):
            C.erro(f'zona "{nome}": cada pedido é um objeto com "descricao" e a caixa')
        d = p.get('descricao')
        if not d or not isinstance(d, str):
            C.erro(f'zona "{nome}": todo pedido precisa de "descricao" (o que o crítico mandou mudar; é a identidade dele)')
        if d in descricoes:
            C.erro(f'zona "{nome}": pedido "{d}" repetido')
        descricoes.add(d)
        caixa = ler_caixa(p, f'zona "{nome}", pedido "{d}"', caixa_da_zona)
        if np.any(caixa[:, 0] < caixa_da_zona[:, 0] - 1e-9) or np.any(caixa[:, 1] > caixa_da_zona[:, 1] + 1e-9):
            C.erro(f'zona "{nome}": o pedido "{d}" sai da zona')
        if np.allclose(caixa, caixa_da_zona):
            C.erro(f'zona "{nome}": o pedido "{d}" cobre a zona inteira; o pedido é uma caixa menor, só do que o crítico mandou mudar')
        out.append({'descricao': d, 'caixa': caixa})
    return out


def ler_zonas(caminho):
    """(zonas, tolerância, critério): cada zona com nome, os limites [min, max] em mm dos três eixos (LIVRE onde não declara),
    a própria tolerância, o critério e os pedidos."""
    try:
        d = json.load(open(caminho, encoding='utf8'))
    except (OSError, ValueError) as e:
        C.erro(f'--zonas {caminho}: {e}')
    lista = d if isinstance(d, list) else d.get('zonas')
    if not isinstance(lista, list) or not lista:
        C.erro(f'--zonas {caminho}: sem zonas; use {{"zonas": [{{"nome": ..., "x": [min, max], "y": [...], "z": [...]}}]}}')
    tol = numero(d.get('tolerancia_mm', TOL_PADRAO), 'tolerancia_mm') if isinstance(d, dict) else TOL_PADRAO
    crit = a.get('criterio') or (d.get('criterio') if isinstance(d, dict) else None) or 'maximo'
    if crit not in CRITERIOS:
        C.erro(f'critério "{crit}": use {" ou ".join(CRITERIOS)}')
    out, nomes = [], set()
    for z in lista:
        nome = z.get('nome') if isinstance(z, dict) else None
        if not nome or not isinstance(nome, str):
            C.erro('toda zona precisa de "nome" (a identidade dela; não use índice)')
        if nome in nomes:
            C.erro(f'zona "{nome}" repetida')
        nomes.add(nome)
        caixa = ler_caixa(z, f'zona "{nome}"', np.array([[-LIVRE, LIVRE]] * 3, float))
        zc = z.get('criterio', crit)
        if zc not in CRITERIOS:
            C.erro(f'zona "{nome}": critério "{zc}"')
        out.append({'nome': nome, 'caixa': caixa, 'tolerancia_mm': numero(z.get('tolerancia_mm', tol), f'zona "{nome}": tolerancia_mm'),
                    'criterio': zc, 'pedidos': ler_pedidos(z, nome, caixa)})
    return out, tol, crit


def receita_para_obj(caminho):
    """Exporta a receita (.js/.mjs) para um OBJ em metro, numa pasta temporária, com tools/modelar/exportar-obj.mjs."""
    destino = tempfile.mkdtemp(prefix='refino-')
    obj = os.path.join(destino, os.path.splitext(os.path.basename(caminho))[0] + '.obj')
    r = subprocess.run([C.do_ambiente('NODE', 'node'), os.path.join(RAIZ, 'tools', 'modelar', 'exportar-obj.mjs'),
                        f'--arquivo={os.path.abspath(caminho)}', f'--saida={obj}', '--sobrescrever'],
                       capture_output=True, text=True, cwd=RAIZ)
    if r.returncode != 0:
        C.erro(f'exportar-obj.mjs saiu com {r.returncode} para {caminho}:\n{(r.stderr or r.stdout)[-1500:]}')
    return obj, destino


def rotulos_da_receita(obj):
    """A parte de cada polígono do OBJ que a receita exportou, na ordem de leitura. O exportador nomeia cada corpo pela parte e
    põe __2, __3 nos outros corpos conexos dela; o sufixo sai, e o corpo volta a ser a parte."""
    rot, atual = [], None
    for linha in open(obj, encoding='utf8', errors='replace'):
        if linha.startswith('o ') or linha.startswith('g '):
            atual = re.sub(r'__\d+$', '', linha[2:].strip())
        elif linha.startswith('f '):
            rot.append(atual)
    return np.array(rot, dtype=object)


def ler(caminho, objeto, z_cima):
    """(V, F, partes): a malha e a parte de cada triângulo, quando a entrada é receita sem --objeto (senão, None)."""
    destino, poligonos = None, None
    if os.path.splitext(caminho)[1].lower() in ('.js', '.mjs'):
        caminho, destino = receita_para_obj(caminho)
        if objeto is None:
            poligonos = rotulos_da_receita(caminho)
    V, F, P = C.ler_malha(caminho, objeto, z_cima)
    if destino:
        shutil.rmtree(destino, ignore_errors=True)
    _, A = C.normais(V, F)
    ok = A > 1e-14
    return V, F[ok], (poligonos[P[ok]] if poligonos is not None else None)


ZONAS, TOL, CRITERIO = ler_zonas(a['zonas'])
z_cima = bool(a.get('z_cima'))
AV, AF, AR = ler(a['anterior'], a.get('objeto_anterior'), z_cima or bool(a.get('z_cima_anterior')))
NV, NF, NR = ler(a['nova'], a.get('objeto_nova'), z_cima or bool(a.get('z_cima_nova')))


def caixa_da_parte(V, F, rot, nome):
    """A caixa em mm, por eixo, dos triângulos da parte."""
    Q = V[np.unique(F[rot == nome])] * 1000.0
    return np.stack([Q.min(0), Q.max(0)], 1)


def zonas_que_a_caixa_toca(caixa):
    return [z['nome'] for z in ZONAS if np.all((caixa[:, 1] >= z['caixa'][:, 0]) & (caixa[:, 0] <= z['caixa'][:, 1]))]


def escolher_partes():
    """Decide o que se compara. Com receita nas duas rodadas, as partes presentes nas duas (ou as de --partes); senão, tudo.
    Devolve o relato (modo, motivo, partes comparadas, novas, sumidas e as que ficaram fora a pedido) e reduz as malhas às
    partes comparadas."""
    global AV, AF, NV, NF
    escolhidas = [s.strip() for s in str(a['partes']).split(',') if s.strip()] if a.get('partes') not in (None, True) else None
    if 'partes' in a and not escolhidas:
        C.erro('--partes pede os nomes das partes, separados por vírgula')
    if AR is None or NR is None:
        if escolhidas:
            C.erro('--partes só vale com receita (.js) nas duas rodadas, sem --objeto-anterior nem --objeto-nova; o OBJ não traz partes')
        quem = ('a entrada não traz partes (OBJ, GLB, glTF ou .blend, ou receita com --objeto)' if AR is None and NR is None
                else 'só uma das rodadas traz partes (receita sem --objeto), e a outra não')
        return {'comparacao': 'tudo', 'motivo': quem, 'comparadas': [], 'novas': [], 'sumidas': [], 'fora_a_pedido': []}
    antes, depois = set(AR.tolist()), set(NR.tolist())
    comuns = antes & depois
    novas, sumidas = sorted(depois - antes), sorted(antes - depois)
    if a.get('todas_as_partes'):
        return {'comparacao': 'tudo', 'motivo': 'a pedido (--todas-as-partes): entram também as partes novas e as que sumiram',
                'comparadas': sorted(antes | depois), 'novas': [], 'sumidas': [], 'fora_a_pedido': []}
    if escolhidas:
        falta = [n for n in escolhidas if n not in comuns]
        if falta:
            C.erro('--partes: ' + ', '.join(f'"{n}"' for n in falta) + ' não está nas duas rodadas; as partes comuns são ' +
                   (', '.join(f'"{n}"' for n in sorted(comuns)) or 'nenhuma'))
        comparadas = sorted(set(escolhidas))
    else:
        comparadas = sorted(comuns)
    if not comparadas:
        C.erro('nenhuma parte está nas duas rodadas; use --todas-as-partes ou confira os nomes das partes')
    relato = {'comparacao': 'por-parte',
              'motivo': 'as partes escolhidas em --partes' if escolhidas else 'as partes presentes nas duas rodadas',
              'comparadas': comparadas, 'fora_a_pedido': sorted(comuns - set(comparadas)),
              'novas': [{'nome': n, 'caixa_mm': caixa_da_parte(NV, NF, NR, n)} for n in novas],
              'sumidas': [{'nome': n, 'caixa_mm': caixa_da_parte(AV, AF, AR, n)} for n in sumidas]}
    for item in relato['novas'] + relato['sumidas']:
        item['zonas'] = zonas_que_a_caixa_toca(item['caixa_mm'])
    AV, AF = C.compactar(AV, AF[np.isin(AR, comparadas)])
    NV, NF = C.compactar(NV, NF[np.isin(NR, comparadas)])
    return relato


PARTES = escolher_partes()
if 'caixa' not in cfg:
    todos = np.vstack([AV, NV])
    cfg['caixa'] = np.stack([todos.min(0) - 1e-3, todos.max(0) + 1e-3], 1)
CX = cfg['caixa']
REGIAO = C.regiao_do_recorte(cfg)
ocl = C.ler_oclusores(a.get('oclusores'), bool(a.get('z_cima_oclusores')))
ESCALA_MM = numero(a['mapa_sinal_mm'], '--mapa-sinal-mm') if 'mapa_sinal_mm' in a else 2.0 * TOL


# ---------- cada candidata, como a régua trata a candidata ----------

class Lado:
    """Uma candidata: a visibilidade contra ela mesma e os oclusores, as amostras visíveis dentro da caixa, a árvore da pele
    visível perto da caixa (o alvo das distâncias da outra) e o recorte visível pela região (para as imagens)."""

    def __init__(self, nome, V, F):
        self.nome, self.V, self.F = nome, V, F
        self.N, _ = C.normais(V, F)
        self.perto = C.toca_caixa(V, F, CX, MARGEM)
        self.vis = C.Visibilidade(C.bvh(V, F, ocl), cfg)
        P, t, _ = C.amostras_regulares(V, F, self.perto, cfg['densidade'], cfg['max_amostras'])
        m = C.na_caixa(P, CX)
        P, t = P[m], t[m]
        ok = self.vis.pontos(P, self.N[t]) if len(P) else np.zeros(0, bool)
        self.P = P[ok]
        tri_vis = self.vis.triangulos(V, F, self.perto)
        if not (self.perto & tri_vis).any():
            C.erro(f'{nome}: nenhuma face visível de fora toca a caixa')
        self.arvore = C.bvh(V, F[self.perto & tri_vis])
        self.lados = {}

    def recorte(self):
        """O recorte pela região e a pele visível dele, compactada: o que as imagens pintam."""
        Vr, Fr = C.recortar(self.V, self.F[C.toca_caixa(self.V, self.F, REGIAO)], REGIAO)
        vis = self.vis.triangulos(Vr, Fr)
        return C.compactar(Vr, Fr[vis])


def deslocamento(P, alvo, p_e_nova):
    """(D, S, VEC) de cada ponto de P à superfície do alvo: a distância em mm, a distância com o sinal do deslocamento da
    nova em relação à anterior e o vetor em mm do ponto ao mais perto do alvo. p_e_nova diz se os pontos são da nova (o alvo é
    a anterior) ou da anterior (o alvo é a nova)."""
    D, S, VEC = np.zeros(len(P)), np.zeros(len(P)), np.zeros((len(P), 3))
    for i, p in enumerate(P):
        pv = Vector(p)
        loc, nrm, idx, d = alvo.arvore.find_nearest(pv)
        if loc is None:
            D[i] = np.inf
            continue
        D[i] = d * 1000.0
        VEC[i] = (np.array(loc[:]) - p) * 1000.0
        if D[i] < SINAL_MIN_MM:
            continue
        if idx not in alvo.lados:
            alvo.lados[idx] = alvo.vis.lado_externo(loc, nrm)
        c = (pv - loc).dot(nrm) * alvo.lados[idx]
        # c > 0: o ponto está do lado de fora do alvo, e a nova sobra se o ponto é dela (ou afunda, se é da anterior). Quando a
        # distância corre ao longo da superfície, a normal não decide: o ponto da nova sem superfície da anterior perto é a
        # nova a mais, e o da anterior sem superfície da nova perto, a nova a menos.
        fora = abs(c) * 1000.0 < LATERAL * D[i] or c > 0
        S[i] = D[i] if fora == p_e_nova else -D[i]
    return D, S, VEC


# ---------- resumos ----------

def r(x, n=3):
    return round(float(x), n)


def quantis_sinal(S):
    if not len(S):
        return {'n': 0}
    return {'mediana': r(np.median(S)), 'p5': r(np.percentile(S, 5)), 'p95': r(np.percentile(S, 95)),
            'minimo': r(S.min()), 'maximo': r(S.max())}


def resumo(dados, mask, tol, p_e_nova):
    """Mediana, p95 e máximo da distância dos pontos de `dados` em `mask`, o ponto do máximo, o movimento da nova nesse ponto, a
    fração e a caixa dos pontos acima de tol, e o resumo do sinal."""
    P, D, S, VEC = dados['P'][mask], dados['D'][mask], dados['S'][mask], dados['VEC'][mask]
    if not len(D):
        return {'n': 0}
    k = int(np.argmax(D))
    # o movimento da superfície nova em relação à anterior: o vetor de um ponto da anterior ao da nova, ou o inverso
    mov = VEC[k] if not p_e_nova else -VEC[k]
    acima = D > tol
    out = {'n': int(len(D)), 'mediana': r(np.median(D)), 'p95': r(np.percentile(D, 95)), 'maximo': r(D[k]),
           'ponto_do_maximo_mm': [r(x, 1) for x in P[k] * 1000.0], 'movimento_da_nova_mm': [r(x, 1) for x in mov],
           'fracao_acima_da_tolerancia': r(acima.mean(), 4), 'com_sinal_mm': quantis_sinal(S)}
    if acima.any():
        Q = P[acima] * 1000.0
        out['caixa_acima_da_tolerancia_mm'] = {e: [r(Q[:, i].min(), 1), r(Q[:, i].max(), 1)] for i, e in enumerate('xyz')}
    return out


def no_zona(P, caixa_mm):
    Q = P * 1000.0
    return np.all((Q >= caixa_mm[:, 0]) & (Q <= caixa_mm[:, 1]), axis=1)


def eixo_do_movimento(v):
    i = int(np.argmax(np.abs(v)))
    return ('+' if v[i] >= 0 else '-') + 'xyz'[i]


def virgula(x, n=1):
    return f'{x:.{n}f}'.replace('.', ',')


# ---------- medida ----------

ANT, NOV = Lado('anterior', AV, AF), Lado('nova', NV, NF)
if not len(ANT.P) or not len(NOV.P):
    C.erro('nenhuma amostra visível dentro da caixa em uma das candidatas')
D_an, S_an, V_an = deslocamento(ANT.P, NOV, False)    # de cada ponto da anterior à nova
D_na, S_na, V_na = deslocamento(NOV.P, ANT, True)     # de cada ponto da nova à anterior
DADOS = {'anterior_para_nova_mm': ({'P': ANT.P, 'D': D_an, 'S': S_an, 'VEC': V_an}, False),
         'nova_para_anterior_mm': ({'P': NOV.P, 'D': D_na, 'S': S_na, 'VEC': V_na}, True)}


def medir(mascaras, tol):
    """O resumo dos dois sentidos para as máscaras dadas, por sentido."""
    return {chave: resumo(dados, mascaras[chave], tol, p_e_nova) for chave, (dados, p_e_nova) in DADOS.items()}


todos = {c: np.ones(len(d['P']), bool) for c, (d, _) in DADOS.items()}
met = {'nome': a.get('nome', 'conferencia'), 'anterior': os.path.basename(a['anterior']), 'nova': os.path.basename(a['nova']),
       'caixa_mm': (CX * 1000.0).round(2).tolist(), 'simetria_x': cfg['simetria_x'], 'tolerancia_mm': TOL, 'criterio': CRITERIO,
       'amostras': {'anterior': int(len(ANT.P)), 'nova': int(len(NOV.P))}, 'total': medir(todos, TOL), 'zonas': {}}
dentro_de_alguma = {c: np.zeros(len(d['P']), bool) for c, (d, _) in DADOS.items()}
mexidas = []
for z in ZONAS:
    na_zona = {c: no_zona(d['P'], z['caixa']) for c, (d, _) in DADOS.items()}
    for c in na_zona:
        dentro_de_alguma[c] |= na_zona[c]
    # o que o crítico mandou mudar na zona sai da conta da zona e é medido à parte
    pedidos = []
    masc = {c: m.copy() for c, m in na_zona.items()}
    for ped in z['pedidos']:
        no_pedido = {c: na_zona[c] & no_zona(d['P'], ped['caixa']) for c, (d, _) in DADOS.items()}
        for c in masc:
            masc[c] &= ~no_pedido[c]
        pedidos.append({'descricao': ped['descricao'], 'caixa_mm': {e: [r(x, 2) for x in ped['caixa'][i]] for i, e in enumerate('xyz')},
                        **{c: ({'n': int(no_pedido[c].sum()), 'maximo': r(DADOS[c][0]['D'][no_pedido[c]].max())} if no_pedido[c].any()
                               else {'n': 0}) for c in no_pedido}})
    res = medir(masc, z['tolerancia_mm'])
    valores = {c: (v.get(z['criterio']) if v.get('n') else None) for c, v in res.items()}
    vistos = {c: x for c, x in valores.items() if x is not None}
    item = {'caixa_mm': {e: [None if abs(x) >= LIVRE else r(x, 2) for x in z['caixa'][i]] for i, e in enumerate('xyz')},
            'tolerancia_mm': z['tolerancia_mm'], 'criterio': z['criterio'], **({'pedidos': pedidos} if pedidos else {}), **res}
    if not vistos:
        item |= {'valor_mm': None, 'mexida': False, 'sem_pontos': True}
    else:
        pior = max(vistos, key=lambda c: vistos[c])
        item |= {'valor_mm': vistos[pior], 'mexida': bool(vistos[pior] > z['tolerancia_mm']), 'sentido_do_pior': pior, 'sem_pontos': False}
        if item['mexida']:
            w = res[pior]
            mexidas.append({'zona': z['nome'], 'mm': vistos[pior], 'criterio': z['criterio'], 'tolerancia_mm': z['tolerancia_mm'],
                            'sentido': pior, 'ponto_mm': w['ponto_do_maximo_mm'], 'movimento_da_nova_mm': w['movimento_da_nova_mm'],
                            'eixo': eixo_do_movimento(w['movimento_da_nova_mm']), 'maximo_mm': w['maximo'],
                            'fracao_acima_da_tolerancia': w['fracao_acima_da_tolerancia'],
                            'caixa_acima_da_tolerancia_mm': w.get('caixa_acima_da_tolerancia_mm')})
    met['zonas'][z['nome']] = item
met['fora_das_zonas'] = medir({c: ~m for c, m in dentro_de_alguma.items()}, TOL)
mexidas.sort(key=lambda m: -m['mm'])
met['mexidas'] = mexidas
met['sem_pontos'] = [n for n, z in met['zonas'].items() if z['sem_pontos']]

# o texto que se devolve ao modelador
linhas = []
for m in mexidas:
    mov = m['movimento_da_nova_mm']
    onde = m['caixa_acima_da_tolerancia_mm']
    trecho = ', '.join((f"{e} {virgula(onde[e][0], 0)}" if onde[e][1] - onde[e][0] < 1.0 else
                        f"{e} de {virgula(onde[e][0], 0)} a {virgula(onde[e][1], 0)}") for e in 'xyz') if onde else ''
    linhas.append(
        f"A zona \"{m['zona']}\", dada como certa, foi mexida: a superfície andou até {virgula(m['maximo_mm'])} mm (tolerância "
        f"{virgula(m['tolerancia_mm'], 0)} mm), mais no ponto x {virgula(m['ponto_mm'][0], 0)}, y {virgula(m['ponto_mm'][1], 0)}, "
        f"z {virgula(m['ponto_mm'][2], 0)} mm, onde a nova fica a ({', '.join(virgula(x) for x in mov)}) mm da anterior "
        f"(sentido {m['eixo'].replace('-', '−')}); {virgula(100 * m['fracao_acima_da_tolerancia'], 0)}% dos pontos da zona passam da "
        f"tolerância, no trecho {trecho}. Devolva a zona à posição anterior.")
if not linhas:
    linhas.append('Nenhuma zona dada como certa passou da tolerância.')
if met['sem_pontos']:
    linhas.append('Sem pontos medidos (a caixa não toca a superfície visível ou cai fora da caixa de medida): '
                  + ', '.join(f'"{n}"' for n in met['sem_pontos']) + '.')
met['texto'] = linhas
open(os.path.join(a['saida'], 'conferencia.md'), 'w', encoding='utf8').write('\n\n'.join(linhas) + '\n')


def trecho_da_caixa(c):
    return ', '.join(f'{e} {virgula(c[i][0], 0)} a {virgula(c[i][1], 0)}' for i, e in enumerate('xyz'))


def onde_cai(item):
    return ('cai na zona ' if len(item['zonas']) == 1 else 'cai nas zonas ') + ', '.join(f'"{n}"' for n in item['zonas']) \
        if item['zonas'] else 'não cai em nenhuma zona'


# as notas de quem conduz o laço: o modo da comparação, as partes que ficaram fora dela e os pedidos fora da conta
notas = []
if PARTES['comparacao'] == 'tudo':
    notas.append(f"A comparação inclui tudo: {PARTES['motivo']}.")
else:
    notas.append('A comparação é por parte, com ' + PARTES['motivo'] + ': ' + ', '.join(f'"{n}"' for n in PARTES['comparadas']) + '.')
    if PARTES['fora_a_pedido']:
        notas.append('Partes presentes nas duas rodadas, deixadas fora da comparação por --partes: '
                     + ', '.join(f'"{n}"' for n in PARTES['fora_a_pedido']) + '.')
    for p in PARTES['novas']:
        notas.append(f"Parte nova na rodada, fora da comparação e sem acusação: \"{p['nome']}\" ({trecho_da_caixa(p['caixa_mm'])} mm); "
                     f"{onde_cai(p)}.")
    for p in PARTES['sumidas']:
        notas.append(f"Parte que sumiu na rodada, fora da comparação e sem acusação: \"{p['nome']}\" ({trecho_da_caixa(p['caixa_mm'])} mm "
                     f"na anterior); {onde_cai(p)}. Se foi a lataria que mudou de nome, rode de novo com --todas-as-partes.")
for nome, z in met['zonas'].items():
    for ped in z.get('pedidos', []):
        n = max(ped['anterior_para_nova_mm']['n'], ped['nova_para_anterior_mm']['n'])
        andou = max(ped['anterior_para_nova_mm'].get('maximo', 0.0), ped['nova_para_anterior_mm'].get('maximo', 0.0))
        notas.append(f"Zona \"{nome}\": o pedido \"{ped['descricao']}\" ({trecho_da_caixa([ped['caixa_mm'][e] for e in 'xyz'])} mm) ficou "
                     f"fora da conta; nele a superfície andou até {virgula(andou)} mm" + ('' if n else ' (nenhum ponto medido)') + '.')
met['partes'] = {'comparacao': PARTES['comparacao'], 'motivo': PARTES['motivo'], 'comparadas': PARTES['comparadas'],
                 'fora_a_pedido': PARTES['fora_a_pedido'],
                 **{k: [{'nome': p['nome'], 'caixa_mm': {e: [r(x, 1) for x in p['caixa_mm'][i]] for i, e in enumerate('xyz')}, 'zonas': p['zonas']}
                        for p in PARTES[k]] for k in ('novas', 'sumidas')}}
met['notas'] = notas
open(os.path.join(a['saida'], 'conferencia-notas.md'), 'w', encoding='utf8').write('\n\n'.join(notas) + '\n')
met['segundos_medida'] = round(time.time() - t0, 1)


# ---------- imagens ----------

def caixa_finita(z):
    """A zona, com o eixo livre ou além da região trocado pelo limite da região, em metro."""
    lo = np.maximum(z['caixa'][:, 0] / 1000.0, REGIAO[:, 0])
    hi = np.minimum(z['caixa'][:, 1] / 1000.0, REGIAO[:, 1])
    return np.stack([lo, np.maximum(hi, lo + 1e-4)], 1)


def desenhos_da_vista(v):
    out = []
    for z in ZONAS:
        b = caixa_finita(z)
        cantos = np.array([[b[0, i], b[1, j], b[2, k]] for i in (0, 1) for j in (0, 1) for k in (0, 1)])
        px = C.para_pixels(cantos, v)
        arestas = [(i, j) for i in range(8) for j in range(i + 1, 8) if bin(i ^ j).count('1') == 1]
        mexida = met['zonas'][z['nome']]['mexida']
        w = met['zonas'][z['nome']]
        rotulo = f"{z['nome']}: mexida {virgula(w['valor_mm'])} mm" if mexida else f"{z['nome']}: conferida"
        out.append({'linhas': [[px[i].round(1).tolist(), px[j].round(1).tolist()] for i, j in arestas],
                    'cor': list(COR_MEXIDA if mexida else COR_CERTA), 'largura': 5 if mexida else 3, 'rotulo': rotulo,
                    'rotulo_em': [float(px[:, 0].min()), float(px[:, 1].min()) - 26]})
    return out


def pintar(S):
    # cinza claro onde nada andou, azul onde a nova afunda ou recua, vermelho onde ela sobra ou avança, saturando em ±ESCALA_MM
    t = np.clip(S / ESCALA_MM, -1, 1)[:, None]
    azul, zero, verm = np.array([0.1, 0.25, 0.85]), np.array([0.86, 0.86, 0.86]), np.array([0.85, 0.12, 0.08])
    return np.where(t < 0, zero * (1 + t) - azul * t, zero * (1 - t) + verm * t)


if not a.get('sem_imagens') and cfg['resolucao_vista'] and all(cfg['resolucao_vista']):
    cfg['resolucao'] = [int(x) for x in cfg['resolucao_vista']]
    C.limpar_cena(cfg['amostras_render'])
    C.camera()
    objetos, titulos = [], []
    for lado, S_vertice, titulo in ((ANT, False, 'Anterior: distância até a nova, com sinal'),
                                    (NOV, True, 'Nova: distância desde a anterior, com sinal')):
        Vk, Fk = lado.recorte()
        alvo = NOV if lado is ANT else ANT
        _, S, _ = deslocamento(Vk, alvo, S_vertice)
        objetos.append((C.malha_de_arrays(lado.nome, Vk, Fk, cores=pintar(S), suave_angulo=None), titulo))
    tmp = os.path.join(a['saida'], 'paineis')
    os.makedirs(tmp, exist_ok=True)
    for v in C.completar_vistas(cfg, REGIAO):
        paineis = []
        for obj, titulo in objetos:
            for o, _ in objetos:
                o.hide_render = o is not obj
            arq = os.path.join(tmp, f"{obj.name}-{v['nome']}.png")
            C.renderizar([obj], 'cor', v, arq, cfg['avesso'])
            paineis.append({'arquivo': arq, 'titulo': titulo, 'px_por_mm': v['W'] / (v['escala'] * 1000.0), 'legenda_mm': ESCALA_MM,
                            'legenda_zero': [219, 219, 219], 'desenhos': desenhos_da_vista(v),
                            'subtitulo': f"vista {v['nome']}; azul: nova afunda ou recua; vermelho: nova sobra ou avança"})
        with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as t:
            json.dump({'saida': os.path.join(a['saida'], f"conferencia-{v['nome']}.png"), 'paineis': paineis}, t)
        C.imagens('vista', t.name)
        os.unlink(t.name)
    if not a.get('manter_paineis'):
        shutil.rmtree(tmp, ignore_errors=True)

met['segundos_total'] = round(time.time() - t0, 1)
json.dump(met, open(os.path.join(a['saida'], 'conferencia.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print('\n'.join(linhas))
print('\n'.join(['Notas para quem conduz o laço (não vão ao modelador):'] + notas))
print('CONFERENCIA', json.dumps(met, ensure_ascii=False))
