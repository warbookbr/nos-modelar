"""Gera o esboço da carcaça bruta por três vistas: contorno lateral (contornos.json) x planta x perfil de trás.

Eixos do modelo: x lateral, y altura, z comprimento (0 no eixo dianteiro, + para trás). mm.
"""
import json, math, sys

CONT = sys.argv[1]
SAIDA = sys.argv[2]
d = json.load(open(CONT))
R = d['regioes']


def rdp(pts, eps):
    if len(pts) < 3:
        return pts
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    dx, dy = x2 - x1, y2 - y1
    n = math.hypot(dx, dy) or 1e-9
    dmax, idx = 0, 0
    for i in range(1, len(pts) - 1):
        x, y = pts[i]
        dd = abs(dy * x - dx * y + x2 * y1 - y2 * x1) / n
        if dd > dmax:
            dmax, idx = dd, i
    if dmax > eps:
        return rdp(pts[: idx + 1], eps)[:-1] + rdp(pts[idx:], eps)
    return [pts[0], pts[-1]]


def simplifica(c, eps=6.0):
    # fecha, simplifica e tira o ponto final repetido
    c = [list(p) for p in c]
    # parte o anel no ponto mais distante do primeiro para o RDP não colapsar
    far = max(range(len(c)), key=lambda i: (c[i][0] - c[0][0]) ** 2 + (c[i][1] - c[0][1]) ** 2)
    a = rdp(c[: far + 1], eps)
    b = rdp(c[far:] + [c[0]], eps)
    s = a[:-1] + b[:-1]
    return [[round(x, 1), round(y, 1)] for x, y in s]


def area(p):
    return 0.5 * sum(p[i][0] * p[(i + 1) % len(p)][1] - p[(i + 1) % len(p)][0] * p[i][1] for i in range(len(p)))


# planta: meia largura por z ------------------------------------------------------------
# traseira arredondada medida na vista de cima (z a partir do fim, meia largura), escalada pela ficha
FIM = 2178.0
ARRED = [(233, 511), (221, 501), (205, 495), (189, 483), (173, 468), (157, 452), (141, 429), (125, 401),
         (109, 372), (93, 342), (77, 311), (61, 275), (45, 236), (29, 187), (13, 131), (0, 66)]


def planta_ret(meia, z0, z1):
    return [[-meia, z0], [meia, z0], [meia, z1], [-meia, z1]]


def planta_traseira(meia, z0):
    dir_ = [[meia, z0]] + [[min(meia, w), FIM - dz] for dz, w in ARRED]
    esq = [[-x, z] for x, z in reversed(dir_)]
    return dir_ + esq


def planta_arredondada(meia, z0, z1, r, seg=6):
    pts = []
    for cx, cz, a0 in [(meia - r, z1 - r, 0), (-meia + r, z1 - r, 90), (-meia + r, z0 + r, 180), (meia - r, z0 + r, 270)]:
        for i in range(seg + 1):
            a = math.radians(a0 + 90 * i / seg)
            pts.append([round(cx + r * math.cos(a), 1), round(cz + r * math.sin(a), 1)])
    return pts


def planta_faixas(dentro, fora, z0, z1):
    # duas faixas: devolve duas plantas
    return [[[dentro, z0], [fora, z0], [fora, z1], [dentro, z1]], [[-fora, z0], [-dentro, z0], [-dentro, z1], [-fora, z1]]]


def planta_piso():
    # centro estreito entre os paralamas na frente, largura dos degraus atrás
    m1, m2, zq = 328, 486, 390
    return [[-m1, -300], [m1, -300], [m1, zq], [m2, zq], [m2, 1500], [-m2, 1500], [-m2, zq], [-m1, zq]]


# perfil de trás: (altura, meia largura) medido na vista de trás, escalado pela ficha
TRAS = [(150, 492), (591, 496), (625, 510), (836, 510), (870, 503), (906, 499), (941, 489), (1012, 475), (1047, 472),
        (1082, 465), (1117, 441), (1165, 436)]


def perfil_tras():
    dir_ = [[w, y] for y, w in TRAS]
    esq = [[-w, y] for y, w in reversed(TRAS)]
    return dir_ + esq


LARANJA, CINZA, ESCURO = '#e2641e', '#5b6066', '#2c2f33'
POCO_D = dict(raio=392, y=352.5, z=0.0, de=355, ate=600)
POCO_T = dict(raio=312, y=284.0, z=1700.0, de=370, ate=600)

PARTES = [
    # nome, região lateral, plantas, perfil de trás?, poços, cor
    ('paralamas', 'paralama', planta_faixas(328, 518, -400, 500), False, [POCO_D], LARANJA),
    ('frenteLateral', 'frenteLateral', planta_faixas(328, 518, -400, 700), False, [POCO_D], LARANJA),
    ('lateral', 'lateral', [planta_ret(508, 300, 1700)], False, [POCO_D, POCO_T], LARANJA),
    ('furo', 'furo', [planta_ret(508, 1200, 1600)], False, [], ESCURO),
    ('chassi', 'chassi', [planta_ret(300, -400, 500)], False, [], CINZA),
    ('piso', 'piso', [planta_piso()], False, [], ESCURO),
    ('painel', 'painel', [planta_ret(420, -200, 600)], False, [], CINZA),
    ('tampaMotor', 'tampaMotor', [planta_arredondada(405, 600, 1400, 150)], False, [], CINZA),
    ('colunas', 'coluna', [planta_ret(465, 1150, 1600)], False, [POCO_T], CINZA),
    ('capo', 'capo', [planta_traseira(511, 1400)], True, [POCO_T], LARANJA),
    ('tampa', 'tampa', [planta_traseira(511, 1400)], True, [], CINZA),
    ('contrapeso', 'contrapeso', [planta_traseira(511, 1700)], True, [POCO_T], CINZA),
    ('pocoTraseiro', 'pocoTraseiro', [planta_ret(360, 1200, 1900)], False, [], ESCURO),
    ('aroTraseiro', 'aroTraseiro', [planta_ret(508, 1200, 2000)], False, [POCO_T], LARANJA),
]
PARTES = [p for p in PARTES if p[1] in R]

passos = []
resumo = {}
for k, (nome, reg, plantas, tras, pocos, cor) in enumerate(PARTES):
    base = 1000 * (k + 1)
    c = simplifica(R[reg]['contornoMm'])
    if area(c) < 0:
        c = c[::-1]
    perfil_lado = [[-y, z] for z, y in c]
    resumo[nome] = len(c)
    corpos = []
    for j, pl in enumerate(plantas):
        b = base + 10 * j
        meia = max(abs(x) for x, _ in pl)
        passos.append(['extrusao', {'origemId': b + 1, 'eixo': 'x', 'altura': 2 * meia + 40, 'perfil': perfil_lado, 'em': [-(meia + 20), 0, 0]}])
        passos.append(['extrusao', {'origemId': b + 2, 'eixo': 'y', 'altura': 1400, 'perfil': pl, 'em': [0, -50, 0]}])
        sol = [{'origem': {'op': 'extrusao', 'id': b + 1}}, {'origem': {'op': 'extrusao', 'id': b + 2}}]
        if tras:
            zs = [p[0] for p in c]
            z0, z1 = min(zs) - 20, max(zs) + 20
            passos.append(['extrusao', {'origemId': b + 3, 'eixo': 'z', 'altura': z1 - z0, 'perfil': [[x, -y] for x, y in perfil_tras()], 'em': [0, 0, z0]}])
            sol.append({'origem': {'op': 'extrusao', 'id': b + 3}})
        passos.append(['intersectar', {'origemId': b + 4, 'solidos': sol}])
        atual = {'op': 'intersectar', 'id': b + 4}
        if pocos:
            cil = []
            for i, p in enumerate(pocos):
                for s in (1, -1):
                    cid = b + 5 + len(cil)
                    x0 = p['de'] if s > 0 else -p['ate']
                    circ = [[round(-(p['y'] + p['raio'] * math.sin(2 * math.pi * t / 48)), 1), round(p['z'] + p['raio'] * math.cos(2 * math.pi * t / 48), 1)] for t in range(48)]
                    if area(circ) < 0:
                        circ = circ[::-1]
                    passos.append(['extrusao', {'origemId': cid, 'eixo': 'x', 'altura': p['ate'] - p['de'], 'perfil': circ, 'em': [x0, 0, 0]}])
                    cil.append({'origem': {'op': 'extrusao', 'id': cid}})
            sid = b + 9
            passos.append(['subtrair', {'origemId': sid, 'solidos': [{'origem': atual}] + cil}])
            atual = {'op': 'subtrair', 'id': sid}
        corpos.append(atual)
    for j, at in enumerate(corpos):
        passos.append(['parte', {'nome': nome if len(corpos) == 1 else f'{nome}{"Esq" if j else "Dir"}', 'sel': {'origem': at}}])
        passos.append(['pincel', {'modo': 'face', 'sel': {'origem': at}, 'cor': cor}])

# convenção do projeto: a frente do objeto aponta para +z; o lado é medido com z para trás, então espelha o comprimento
def espelhar(passo):
    op, a = passo
    if op == 'extrusao':
        a = dict(a)
        if a['eixo'] == 'x':
            a['perfil'] = [[u, -v] for u, v in a['perfil']][::-1]
        elif a['eixo'] == 'y':
            a['perfil'] = [[u, -v] for u, v in a['perfil']][::-1]
        elif a['eixo'] == 'z':
            a['em'] = [a['em'][0], a['em'][1], -(a['em'][2] + a['altura'])]
    return [op, a]


passos = [espelhar(p) for p in passos]

esboco = {
    'plano': 'Carcaça bruta da empilhadeira por três vistas: a silhueta lateral de cada parte (contorno da lateral da carcaça isolada), cruzada com a planta (largura da ficha, proporção da vista de cima) e, no capô, na tampa e no contrapeso, com o perfil de trás; poços das rodas tirados com 40 mm de folga.',
    'vista': 'isometrica',
    'opcoes': [{'titulo': 'carcaça bruta por três vistas', 'nota': ', '.join(n for n, *_ in PARTES), 'passos': passos}],
}
json.dump(esboco, open(SAIDA, 'w'), ensure_ascii=False, indent=1)
print(json.dumps(resumo))
