#!/usr/bin/env python3
"""Gera as formas da caçamba e as acrescenta ao esboço do chassi, sem tocar no que já existe."""
import json, math, sys, copy

PASTA = '/tmp/claude-0/-home-user-nos-mecanifica/e6caf1b1-b2a8-5dc1-b5a2-9766b8f683ea/scratchpad/chassi-carrinho/'
BASE = PASTA + 'chassi-aprovado.esboco.json'
SAIDA = PASTA + 'chassi.esboco.json'

# ---- parâmetros do chassi (cópia dos valores, só para calcular) ----
P = dict(tuboD=26, xMeio=215, xLaco=100, zFrente=760, zDobraTras=-256, zDegrau=270, yDegrau=290, yDobra=333,
         espTrav=14, zTravTras=-170, zEscBase=505, alturaEscF=215, recuoEscF=65, yFrente=190)
xTuboEscBase = P['xMeio'] - (P['xMeio'] - P['xLaco']) * (P['zEscBase'] - P['zDobraTras']) / (P['zFrente'] - P['zDobraTras'])
xEsc = xTuboEscBase - 19
yTip = P['yFrente'] + P['alturaEscF']
zTip = P['zEscBase'] - P['recuoEscF']
yTravTras = P['yDegrau'] + (P['yDobra'] - P['yDegrau']) * (P['zDegrau'] - P['zTravTras']) / (P['zDegrau'] - P['zDobraTras'])
yPisoBaixo = yTravTras + P['tuboD'] / 2 + P['espTrav']

# ---- parâmetros da caçamba ----
espCh = 6.0          # espessura do fundo
th = 7.0             # espessura horizontal da parede
yPisoTopo = yPisoBaixo + espCh
yBorda = 495.0       # topo da parede
espLabio = 5.0
largLabio = 16.0
y1 = 395.0           # fim da faixa de baixo (curva de transição)
t1 = 0.42            # fração do avanço horizontal já feita em y1

# contorno do fundo F e da boca R (externos)
F = dict(w=190.0, zr=-200.0, rc=45.0, zf=400.0, b=215.0)
R = dict(w=275.0, zr=-338.0, rc=75.0, zf=float(sys.argv[1]) if len(sys.argv) > 1 else 535.0, b=300.0)
NC = 3  # segmentos por canto traseiro
NA = 4  # segmentos do arco da frente


def meio(d):
    """pontos do lado direito, de A2 (início do canto traseiro) a A9 (centro da frente)."""
    w, zr, rc, zf, b = d['w'], d['zr'], d['rc'], d['zf'], d['b']
    pts = []
    for k in range(NC + 1):
        a = math.radians(90.0 * k / NC)
        pts.append((w - rc + rc * math.sin(a), zr + rc - rc * math.cos(a)))
    z0 = zf - b
    for k in range(1, NA + 1):
        a = math.radians(90.0 * k / NA)
        pts.append((w * math.cos(a), z0 + b * math.sin(a)))
    return pts


def contorno(d):
    """polígono completo, com o centro da frente (x=0) e sem o do fundo; ordem: direita de trás para a frente, depois esquerda."""
    r = meio(d)
    esq = [(-x, z) for (x, z) in reversed(r[:-1])]
    return r + esq  # r termina em x=0 (frente)


def nivel(t):
    return [tuple(f + t * (r - f) for f, r in zip(pf, pr)) for pf, pr in zip(contorno(F), contorno(R))]


def t_de_y(y):
    if y <= y1:
        return t1 * (y - yPisoTopo) / (y1 - yPisoTopo)
    return t1 + (1 - t1) * (y - y1) / (yBorda - y1)


def offset(poly, d):
    """deslocamento para dentro por quina (mitra), polígono convexo."""
    n = len(poly)
    cx = sum(p[0] for p in poly) / n
    cz = sum(p[1] for p in poly) / n
    out = []
    for i in range(n):
        p0, p1, p2 = poly[i - 1], poly[i], poly[(i + 1) % n]

        def nrm(a, b):
            dx, dz = b[0] - a[0], b[1] - a[1]
            L = math.hypot(dx, dz)
            nx, nz = -dz / L, dx / L
            mx, mz = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
            if (cx - mx) * nx + (cz - mz) * nz < 0:
                nx, nz = -nx, -nz
            return nx, nz
        n1, n2 = nrm(p0, p1), nrm(p1, p2)
        c = n1[0] * n2[0] + n1[1] * n2[1]
        mx, mz = (n1[0] + n2[0]) / (1 + c), (n1[1] + n2[1]) / (1 + c)
        out.append((p1[0] + mx * d, p1[1] + mz * d))
    return out


def z_externo(x, y):
    """z da superfície externa da frente em x, na altura y (para achar a parede que a escora toca)."""
    poly = nivel(t_de_y(y))
    nR = len(meio(F))
    r = poly[:nR]  # lado direito
    for i in range(NC, len(r) - 1):
        (xa, za), (xb, zb) = r[i], r[i + 1]
        lo, hi = min(xa, xb), max(xa, xb)
        if lo <= x <= hi and hi - lo > 1e-9:
            return za + (zb - za) * (x - xa) / (xb - xa)
    return None


def ajusta_frente():
    lo, hi = 480.0, 700.0
    for _ in range(60):
        R['zf'] = (lo + hi) / 2
        z = z_externo(xEsc, yTip)
        if z is None or z < zTip:
            lo = R['zf']
        else:
            hi = R['zf']
    return R['zf']


def arr(v):
    return round(v, 3)


def loft_facet(id_, niveis, i, j, estilo=None):
    """facetas i->j do contorno entre dois níveis [(y, P, Q)] vira um loft de seções quadriláteras."""
    secoes = []
    todos = []
    for (y, Pn, Qn) in niveis:
        quad = [Pn[i], Pn[j], Qn[j], Qn[i]]
        todos.append((y, quad))
    xs = [p[0] for _, q in todos for p in q]
    zs = [p[1] for _, q in todos for p in q]
    bx, bz = (min(xs) + max(xs)) / 2, (min(zs) + max(zs)) / 2
    return todos, (bx, bz)


def build():
    ajusta_frente()
    nR = len(meio(F))
    n = len(contorno(F))
    # níveis das faixas: [piso, y1] e [y1, borda]
    def niv(y):
        t = t_de_y(y)
        Pn = nivel(t)
        Qn = offset(Pn, th)
        return (y, Pn, Qn)
    n0, n1, n2 = niv(yPisoTopo), niv(y1), niv(yBorda)
    formas = []
    nomes_dir = []
    # arestas: direita 0..nR-2 (A2->A9), rear: do último esquerdo ao primeiro direito
    arestas = [(k, k + 1) for k in range(nR - 1)]
    rear = (n - 1, 0)
    for banda, (na, nb) in enumerate([(n0, n1), (n1, n2)], start=1):
        # traseira inteira
        todos, (bx, bz) = loft_facet('x', [na, nb], *rear)
        formas.append(forma_loft(f'paTras{banda}', todos, bx, bz, 'parede_de_tras_faixa_%d' % banda))
        for idx, (i, j) in enumerate(arestas, start=1):
            todos, (bx, bz) = loft_facet('x', [na, nb], i, j)
            idd = f'paD{idx}f{banda}'
            formas.append(forma_loft(idd, todos, bx, bz, 'parede_direita_%d_faixa_%d' % (idx, banda)))
            formas.append({'id': f'paE{idx}f{banda}', 'espelha': {'forma': idd, 'eixo': 'x'},
                           'rotulo': 'parede_esquerda_%d_faixa_%d' % (idx, banda)})
    # piso
    Fp = contorno(F)
    xs = [p[0] for p in Fp]; zs = [p[1] for p in Fp]
    bx, bz = (min(xs) + max(xs)) / 2, (min(zs) + max(zs)) / 2
    piso = {'id': 'pisoCac', 'tipo': 'extrusao', 'estilo': 'cacamba', 'rotulo': 'fundo_da_cacamba',
            'eixo': 'y', 'comprimento': 'espCh',
            'perfil': [[arr(x - bx), arr(z - bz)] for (x, z) in Fp],
            'centro': [arr(bx), '=yPisoBaixo+espCh/2', arr(bz)]}
    # lábio: metade direita em anel (U), espelhada para a esquerda
    Rp = nivel(1.0)
    Qi = offset(Rp, th)
    Lo = offset(Rp, -largLabio)
    zr_o = Lo[n - 1][1]  # traseira: aresta reta, mesmo z de Lo[0]
    zr_i = Qi[0][1]
    ext = [(0.0, Lo[0][1])] + Lo[:nR]
    inn = Qi[:nR][::-1] + [(0.0, Qi[0][1])]
    anel = ext + inn
    xs = [p[0] for p in anel]; zs = [p[1] for p in anel]
    bx2, bz2 = (min(xs) + max(xs)) / 2, (min(zs) + max(zs)) / 2
    labioD = {'id': 'labioD', 'tipo': 'extrusao', 'estilo': 'cacamba', 'rotulo': 'labio_da_borda_direito',
              'eixo': 'y', 'comprimento': 'espLabio',
              'perfil': [[arr(x - bx2), arr(z - bz2)] for (x, z) in anel],
              'centro': [arr(bx2), '=yBordaParede+espLabio/2', arr(bz2)]}
    labioE = {'id': 'labioE', 'espelha': {'forma': 'labioD', 'eixo': 'x'}, 'rotulo': 'labio_da_borda_esquerdo'}
    return formas, piso, labioD, labioE


def forma_loft(id_, todos, bx, bz, rotulo):
    secoes = []
    for k, (y, quad) in enumerate(todos):
        cx = sum(p[0] for p in quad) / 4
        cz = sum(p[1] for p in quad) / 4
        pos = 'yPisoTopo' if (k == 0 and abs(y - yPisoTopo) < 1e-6) else ('yBordaParede' if abs(y - yBorda) < 1e-6 else arr(y))
        secoes.append({'pos': pos, 'forma': 'poligono', 'centro': [arr(cx), arr(cz)],
                       'perfil': [[arr(p[0] - cx), arr(p[1] - cz)] for p in quad]})
    ym = (todos[0][0] + todos[1][0]) / 2
    return {'id': id_, 'tipo': 'loft', 'eixo': 'y', 'estilo': 'cacamba', 'rotulo': rotulo,
            'secoes': secoes, 'centro': [arr(bx), arr(ym), arr(bz)]}


if __name__ == '__main__':
    formas, piso, labioD, labioE = build()
    print('zf da boca', R['zf'], 'ponta', xEsc, yTip, zTip, 'z_ext', z_externo(xEsc, yTip), 'yPisoBaixo', yPisoBaixo)
    json.dump({'formas': formas, 'piso': piso, 'labioD': labioD, 'labioE': labioE}, open('/tmp/cac-formas.json', 'w'))
