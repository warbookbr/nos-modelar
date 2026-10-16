"""Sonda: STEP com peças separadas -> uma caixa ou cilindro orientado por peça, com contatos entre peças.
Uso: python sonda_step.py <arquivo.step> <saida> <pasta-dos-scripts>"""
import sys, json, numpy as np, gmsh
from collections import Counter
sys.path.insert(0, sys.argv[3]); from stl_vistas_lib import render
from PIL import Image
from scipy.spatial import cKDTree

step, saida = sys.argv[1], sys.argv[2]
gmsh.initialize(); gmsh.option.setNumber('General.Terminal', 0)
gmsh.model.occ.importShapes(step); gmsh.model.occ.synchronize()
vols = [t for _, t in gmsh.model.getEntities(3)]
diag = np.linalg.norm(np.subtract(*np.reshape(gmsh.model.getBoundingBox(-1, -1), (2, 3))[::-1]))
gmsh.option.setNumber('Mesh.MeshSizeMax', diag / 120); gmsh.option.setNumber('Mesh.MeshSizeMin', diag / 600)
gmsh.model.mesh.generate(2)

def tri_box(c, ax, h):
    s = np.array([[i, j, k] for i in (-1, 1) for j in (-1, 1) for k in (-1, 1)], float)
    P = c + (s * h) @ ax
    fs = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    return np.array([[P[a], P[b], P[d]] for q in fs for (a, b, d) in ((q[0], q[1], q[2]), (q[0], q[2], q[3]))])

def tri_cil(c, eixo, r, meia, lados=32):
    u = np.cross(eixo, [0, 0, 1] if abs(eixo[2]) < 0.9 else [1, 0, 0]); u /= np.linalg.norm(u); w = np.cross(eixo, u)
    ang = np.linspace(0, 2 * np.pi, lados, endpoint=False); anel = np.array([np.cos(t) * u + np.sin(t) * w for t in ang]) * r
    A = c - eixo * meia + anel; B = c + eixo * meia + anel; out = []
    for i in range(lados):
        j = (i + 1) % lados; out += [[A[i], A[j], B[j]], [A[i], B[j], B[i]], [c - eixo * meia, A[j], A[i]], [c + eixo * meia, B[i], B[j]]]
    return np.array(out)

pecas, T_orig, T_aprox = [], [], []
for v in vols:
    nome = gmsh.model.getEntityName(3, v) or f'volume{v}'
    vol = gmsh.model.occ.getMass(3, v)
    sups = [abs(t) for _, t in gmsh.model.getBoundary([(3, v)], oriented=False)]
    tipos = Counter(); pts = []; tris = []
    for s in sups:
        area = gmsh.model.occ.getMass(2, s); tipos[gmsh.model.getType(2, s)] += area
        tags, coords, _ = gmsh.model.mesh.getNodes(2, s, includeBoundary=True)
        X = coords.reshape(-1, 3); idx = {t: i for i, t in enumerate(tags)}; pts.append(X)
        et, _, en = gmsh.model.mesh.getElements(2, s)
        for e, nn in zip(et, en):
            if e == 2: tris += [X[[idx[a] for a in tri]] for tri in nn.reshape(-1, 3)]
    P = np.concatenate(pts); T = np.array(tris); T_orig.append(T)
    c0 = P.mean(0); _, _, Vt = np.linalg.svd(P - c0, full_matrices=False)
    L = (P - c0) @ Vt.T; lo, hi = L.min(0), L.max(0); h = (hi - lo) / 2; c = c0 + ((hi + lo) / 2) @ Vt
    vcaixa = float(np.prod(2 * h))
    melhor = None
    for k in range(3):  # cilindro ao longo de cada eixo principal
        e = Vt[k]; Q = P - c; r = float(np.max(np.linalg.norm(Q - np.outer(Q @ e, e), axis=1)))
        vc = np.pi * r * r * 2 * h[k]
        if melhor is None or vc < melhor[0]: melhor = (vc, k, r)
    vcil, k, r = melhor
    area_total = sum(tipos.values()); frac_cil = (tipos['Cylinder'] + tipos['Cone']) / area_total
    usa_cil = vol / vcil > vol / vcaixa or (frac_cil > 0.5 and vol / vcil > 0.6 * vol / vcaixa)
    if usa_cil:
        T_aprox.append(tri_cil(c, Vt[k], r, h[k])); forma = {'tipo': 'cilindro', 'diametro': round(2 * r, 2), 'comprimento': round(2 * h[k], 2), 'eixo': [round(x, 3) for x in Vt[k]]}
        ocup = vol / vcil
    else:
        T_aprox.append(tri_box(c, Vt, h)); forma = {'tipo': 'caixa', 'medidas': [round(2 * x, 2) for x in h], 'eixos': [[round(x, 3) for x in a] for a in Vt]}
        ocup = vol / vcaixa
    pecas.append({'nome': nome, 'volume_mm3': round(vol, 1), 'centro': [round(x, 2) for x in c], 'forma': forma, 'ocupacao': round(ocup, 3),
                  'faces': {t: round(a / area_total, 3) for t, a in tipos.most_common()}, '_P': P})

tol = diag / 400; contatos = []
arv = [cKDTree(p['_P']) for p in pecas]
for i in range(len(pecas)):
    for j in range(i + 1, len(pecas)):
        d, _ = arv[j].query(pecas[i]['_P'], k=1, distance_upper_bound=tol * 4)
        perto = int(np.sum(d <= tol))
        if perto: contatos.append({'a': pecas[i]['nome'], 'b': pecas[j]['nome'], 'pontos': perto, 'distancia_min': round(float(d.min()), 3)})
for p in pecas: del p['_P']
json.dump({'arquivo': step, 'pecas': pecas, 'contatos': contatos}, open(f'{saida}/relatorio.json', 'w'), indent=1, ensure_ascii=False)
print('pecas', len(pecas), Counter(p['forma']['tipo'] for p in pecas), 'contatos', len(contatos))
print('ocupacao media', round(float(np.mean([p['ocupacao'] for p in pecas])), 3), 'min', min(p['ocupacao'] for p in pecas))

T, A = np.concatenate(T_orig), np.concatenate(T_aprox); ref = np.concatenate([T.reshape(-1, 3), A.reshape(-1, 3)])
R = lambda M: np.array(M, float); c_ = np.sqrt(0.5)
vistas = {'lateral': R([[1, 0, 0], [0, 0, 1], [0, -1, 0]]), 'frontal': R([[0, -1, 0], [0, 0, 1], [1, 0, 0]]), 'superior': R([[1, 0, 0], [0, 1, 0], [0, 0, 1]]),
          'isometrica': R([[c_, -c_, 0], [-0.408, -0.408, 0.816], [0.577, 0.577, 0.577]])}
for nome, M in vistas.items():
    io, mo = render(T, M, ref=ref), render(A, M, ref=ref)
    a1 = np.array(io) < 230; a2 = np.array(mo) < 230
    W = Image.new('L', (io.width * 2, io.height), 255); W.paste(io, (0, 0)); W.paste(mo, (io.width, 0)); W.save(f'{saida}/lado-a-lado-{nome}.png')
    print(nome, round(float((a1 & a2).sum() / max((a1 | a2).sum(), 1)), 3))
gmsh.finalize()
