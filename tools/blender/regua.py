# regua.py — mede uma malha candidata contra uma malha de referência dentro de uma caixa: distância nos dois sentidos só do
# que se vê de fora, erro de normais, vincos com cobertura, precisão, F1 a 5 e 10 mm e desvio, e a folha com as duas malhas
# em cinza, em listras de reflexo e o mapa de distância.
#
# Uso:
#   blender -b --factory-startup --python tools/blender/regua.py -- \
#       --referencia <ref.obj|.glb|.gltf|.blend> [--objeto-referencia <nome>] \
#       --candidata <cand.obj|.glb|.gltf|.blend> [--objeto-candidata <nome>] [--z-cima | --z-cima-referencia | --z-cima-candidata] \
#       --caixa xmin,xmax,ymin,ymax,zmin,zmax --saida <pasta> --nome <rótulo da medida> \
#       [--config <cfg.json>] [--simetria-x] [--rotulos <rotulos.json>] [--excluir a,b] [--oclusores <malha>] \
#       [--angulo-vinco 40] [--densidade 40000] [--omitidas a,b] [--sem-imagens]
#
# A referência passa pelo mesmo preparo do pacote cego (comum.preparar_referencia): recorte exato pela caixa, pele visível
# de fora, painéis inteiros, componentes pequenos fora. Mede-se só dentro da caixa declarada (com --simetria-x, a metade
# x >= xmin; o recorte, a oclusão e as imagens pegam as duas). Cada malha é amostrada por área (densidade amostras por m²,
# com semente fixa) e só entra o ponto que se vê de fora contra a própria malha mais os oclusores.
#   ref_para_cand_mm: de cada ponto da referência à superfície visível da candidata perto da caixa (o que a candidata deixa
#     de cobrir); cand_para_ref_mm: de cada ponto da candidata à referência inteira perto da caixa (o que ela põe a mais).
#   normal_*_graus: o ângulo entre a normal do ponto e a do triângulo mais perto do outro lado, sem sinal.
#   vincos: arestas com diedro acima de angulo_vinco (padrão 40 graus) entre faces visíveis, amostradas a cada 2 mm; a
#     cobertura é a fração do vinco da referência a até 5 ou 10 mm de um vinco da candidata, a precisão o contrário, o F1 a
#     média harmônica, e o desvio a distância do vinco da referência ao da candidata (mediana e p90).
#   por_rotulo: com --rotulos, a distância da referência para a candidata por rótulo; vincos_por_rotulo, os vincos por
#     rótulo (o ponto de vinco da referência leva o rótulo da face dele, e o da candidata o da face da referência mais perto);
#     com a chave `omitidas` da configuração (rótulos que a candidata pode omitir), cada rótulo traz omitida, e
#     ref_para_cand_sem_omitidas_mm e vincos_sem_omitidas repetem a medida sem eles.
# Grava em <saida>/: metricas.json e, sem --sem-imagens, as imagens de cada linha e vista e folha.png.
import json, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from mathutils import Vector
import comum as C

t0 = time.time()
a = C.argumentos()
for k in ('referencia', 'candidata', 'saida', 'nome'):
    if k not in a:
        C.erro(f'falta --{k}')
cfg = C.configuracao(a)
cfg.setdefault('angulo_vinco', 40.0)
cfg.setdefault('densidade', 40000.0)
cfg.setdefault('max_amostras', 250000)
cfg.setdefault('tolerancias_mm', [5.0, 10.0])
cfg.setdefault('mapa_max_mm', 20.0)
cfg.setdefault('resolucao_folha', [480, 360])
CX = cfg['caixa']
MARGEM = cfg['margem']
z_cima = bool(a.get('z_cima'))
# --z-cima vale para as duas malhas; --z-cima-referencia e --z-cima-candidata, para uma só (referência em .blend Z para
# cima e candidata em OBJ já no quadro Y para cima, por exemplo)
z_ref = z_cima or bool(a.get('z_cima_referencia'))
z_cand = z_cima or bool(a.get('z_cima_candidata'))
os.makedirs(a['saida'], exist_ok=True)


def amostrar(V, F, mask, semente):
    rng = np.random.default_rng(semente)
    idx = np.nonzero(mask)[0]
    _, area = C.normais(V, F[idx])
    n = int(min(cfg['max_amostras'], max(2000, area.sum() * cfg['densidade'])))
    esc = rng.choice(len(idx), size=n, p=area / area.sum())
    r1 = np.sqrt(rng.random(n))
    r2 = rng.random(n)
    A, B, Cc = (V[F[idx[esc], k]] for k in range(3))
    P = (1 - r1)[:, None] * A + (r1 * (1 - r2))[:, None] * B + (r1 * r2)[:, None] * Cc
    return P, idx[esc]


def distancias(arvore, P, Nfonte):
    D = np.empty(len(P))
    A = np.empty(len(P))
    for i, (p, n) in enumerate(zip(P, Nfonte)):
        loc, nrm, _, d = arvore.find_nearest(Vector(p))
        if loc is None:
            D[i], A[i] = np.inf, 90.0
            continue
        D[i] = d
        A[i] = np.degrees(np.arccos(min(1.0, abs(float(np.dot(n, nrm))))))
    return D * 1000.0, A


def vincos(V, F, elegivel, ambos):
    """Pontos a cada 2 mm nas arestas com diedro acima de angulo_vinco, com um dos dois triângulos elegível e os dois em
    ambos, só dentro da caixa de medida; e, para cada ponto, o triângulo elegível da aresta (para o rótulo)."""
    internas = C.arestas(F)[0]
    di = C.diedros(V, F, internas)
    a_, b_, t1, t2, _ = internas
    sel = (di > cfg['angulo_vinco']) & (elegivel[t1] | elegivel[t2]) & ambos[t1] & ambos[t2]
    A, B = V[a_[sel]], V[b_[sel]]
    tri = np.where(elegivel[t1[sel]], t1[sel], t2[sel])
    pts, tt = [], []
    for p, q, t in zip(A, B, tri):
        k = max(1, int(np.linalg.norm(q - p) / 0.002))
        s = (np.arange(k) + 0.5) / k
        pts.append(p[None] + s[:, None] * (q - p)[None])
        tt.append(np.full(k, t))
    if not pts:
        return np.zeros((0, 3)), np.zeros(0, int)
    P, T = np.concatenate(pts), np.concatenate(tt)
    m = C.na_caixa(P, CX)
    return P[m], T[m]


def casamento(drc, dcr):
    """Cobertura, precisão e F1 a cada tolerância e o desvio, das distâncias de cada ponto de vinco da referência ao vinco
    mais perto da candidata (drc) e o contrário (dcr), em mm."""
    out = {'ref_comprimento_mm': int(round(len(drc) * 2.0)), 'cand_comprimento_mm': int(round(len(dcr) * 2.0))}
    for tau in TAUS:
        c = round(float((drc <= tau).mean()), 3) if len(drc) else 0.0
        p = round(float((dcr <= tau).mean()), 3) if len(dcr) else 0.0
        out[f'cobertura_{tau:g}mm'], out[f'precisao_{tau:g}mm'] = c, p
        out[f'f1_{tau:g}mm'] = round(2 * c * p / (c + p), 3) if c + p > 0 else 0.0
    out['desvio_mediana_mm'] = round(float(np.median(drc)), 3) if len(drc) and np.isfinite(drc).any() else None
    out['desvio_p90_mm'] = round(float(np.percentile(drc, 90)), 3) if len(drc) and np.isfinite(drc).any() else None
    return out


def resumo(D):
    D = D[np.isfinite(D)]
    if not len(D):
        return {'mediana': None, 'p90': None, 'p99': None, 'dentro_2mm': 0.0, 'dentro_5mm': 0.0, 'n': 0}
    return {'mediana': round(float(np.median(D)), 3), 'p90': round(float(np.percentile(D, 90)), 3),
            'p99': round(float(np.percentile(D, 99)), 3), 'dentro_2mm': round(float((D <= 2).mean()), 3),
            'dentro_5mm': round(float((D <= 5).mean()), 3), 'n': int(len(D))}


# ---------- referência ----------
RV, RF, RP = C.ler_malha(a['referencia'], a.get('objeto_referencia'), z_ref)
rot = C.rotulos_dos_triangulos(a.get('rotulos'), RV, RF, RP)
ocl = C.ler_oclusores(a.get('oclusores'), bool(a.get('z_cima_oclusores')))
prep = C.preparar_referencia(RV, RF, rot, cfg, ocl)
SV, SF, manter = prep['V'], prep['F'], prep['manter']
SN, _ = C.normais(SV, SF)
vis_ref = C.Visibilidade(C.bvh(RV, RF, ocl), cfg)
fonte = manter & (SV[SF].mean(1)[:, 0] >= CX[0, 0] - 1e-9)
Pr, tr = amostrar(SV, SF, fonte, 1)
m = C.na_caixa(Pr, CX)
Pr, tr = Pr[m], tr[m]
m = vis_ref.pontos(Pr, SN[tr])
Pr, tr = Pr[m], tr[m]
Sc = SV[SF].mean(1)
ref_tri_vis = np.zeros(len(SF), bool)
ref_tri_vis[fonte] = vis_ref.pontos(Sc[fonte], SN[fonte])
alvo = C.toca_caixa(RV, RF, prep['regiao'], MARGEM)
arv_ref = C.bvh(RV, RF[alvo])

# ---------- candidata ----------
CV, CF, _ = C.ler_malha(a['candidata'], a.get('objeto_candidata'), z_cand)
CN, CA = C.normais(CV, CF)
CF = CF[CA > 1e-14]
CN, _ = C.normais(CV, CF)
perto = C.toca_caixa(CV, CF, CX, MARGEM)
vis_cand = C.Visibilidade(C.bvh(CV, CF, ocl), cfg)
Pc, tc = amostrar(CV, CF, perto, 2)
m = C.na_caixa(Pc, CX)
Pc, tc = Pc[m], tc[m]
vis = vis_cand.pontos(Pc, CN[tc])
fracao_visivel = float(vis.mean()) if len(vis) else 0.0
Pc, tc = Pc[vis], tc[vis]
cand_tri_vis = vis_cand.triangulos(CV, CF, perto)
arv_cand = C.bvh(CV, CF[perto & cand_tri_vis])
d_rc, a_rc = distancias(arv_cand, Pr, SN[tr])
d_cr, a_cr = distancias(arv_ref, Pc, CN[tc])

# ---------- vincos ----------
TAUS = [float(t) for t in cfg['tolerancias_mm']]
VR, TVR = vincos(SV, SF, ref_tri_vis, manter)
VCp, _ = vincos(CV, CF, cand_tri_vis & perto, perto)
if len(VCp) and len(VR):
    kc, kr = C.kd(VCp), C.kd(VR)
    drc = np.array([kc.find(Vector(p))[2] for p in VR]) * 1000
    dcr = np.array([kr.find(Vector(p))[2] for p in VCp]) * 1000
else:
    drc, dcr = np.full(len(VR), np.inf), np.full(len(VCp), np.inf)
vinc = {'angulo_graus': cfg['angulo_vinco']} | casamento(drc, dcr)
omitidas = [str(r) for r in cfg.get('omitidas', [])]
vinc_rot, vinc_sem = None, None
if prep['rotulo'] is not None and (len(VR) or len(VCp)):
    rot_vr = prep['rotulo'][TVR].astype(str) if len(VR) else np.zeros(0, str)
    kept = np.nonzero(manter)[0]
    arv_rot = C.bvh(SV, SF[manter])
    rot_vc = np.array([str(prep['rotulo'][kept[arv_rot.find_nearest(Vector(p))[2]]]) for p in VCp]) if len(VCp) else np.zeros(0, str)
    vinc_rot = {}
    for n in sorted(set(rot_vr) | set(rot_vc) | set(prep['rotulo'][manter].astype(str))):
        vinc_rot[n] = casamento(drc[rot_vr == n], dcr[rot_vc == n]) | {'omitida': n in omitidas}
    if omitidas:
        vinc_sem = casamento(drc[~np.isin(rot_vr, omitidas)], dcr[~np.isin(rot_vc, omitidas)]) | {'omitidas': omitidas}

met = {
    'nome': a['nome'], 'candidata': os.path.basename(a['candidata']), 'caixa': CX.tolist(), 'simetria_x': cfg['simetria_x'],
    'vincos': vinc, 'ref_para_cand_mm': resumo(d_rc), 'cand_para_ref_mm': resumo(d_cr),
    'normal_ref_para_cand_graus': {'mediana': round(float(np.median(a_rc)), 3), 'p90': round(float(np.percentile(a_rc, 90)), 3)},
    'normal_cand_para_ref_graus': {'mediana': round(float(np.median(a_cr)), 3), 'p90': round(float(np.percentile(a_cr, 90)), 3)},
    'vertices_total': int(len(CV)), 'triangulos_total': int(len(CF)),
    'vertices_na_caixa': int(C.na_caixa(CV[np.unique(CF[perto])], CX).sum()), 'triangulos_perto': int(perto.sum()),
    'fracao_cand_visivel': round(fracao_visivel, 3), 'referencia': prep['contagens'], 'mapa_max_mm': cfg['mapa_max_mm'],
}
if prep['rotulo'] is not None:
    rot_p = prep['rotulo'][tr].astype(str)
    met['por_rotulo'] = {str(n): {'fracao': round(float((rot_p == n).mean()), 3), 'mediana': round(float(np.median(d_rc[rot_p == n])), 2),
                                  'p90': round(float(np.percentile(d_rc[rot_p == n], 90)), 2), 'omitida': str(n) in omitidas}
                         for n in sorted(set(rot_p))}
    if vinc_rot is not None:
        met['vincos_por_rotulo'] = vinc_rot
    if omitidas:
        sem = ~np.isin(rot_p, omitidas)
        met['ref_para_cand_sem_omitidas_mm'] = resumo(d_rc[sem]) | {'omitidas': omitidas}
        met['vincos_sem_omitidas'] = vinc_sem
# a candidata recortada pelos mesmos planos, para as imagens; a área dela mostra se o recorte perdeu triângulo comprido
CVr, CFr = C.recortar(CV, CF[C.toca_caixa(CV, CF, prep['regiao'])], prep['regiao'])
met['area_recorte_candidata_m2'] = round(float(C.normais(CVr, CFr)[1].sum()), 6)
met['segundos_medida'] = round(time.time() - t0, 1)

# ---------- imagens ----------
if not a.get('sem_imagens'):
    W, H = cfg['resolucao_folha']
    cfg['resolucao'] = [W, H]
    C.limpar_cena(4)
    C.camera()
    Vk, Fk = C.compactar(SV, SF[manter])
    arv_toda = C.bvh(CV, CF)
    dv = np.array([(arv_toda.find_nearest(Vector(p))[3] or 1.0) for p in Vk]) * 1000

    def mapa_de_cor(d):
        s = np.clip(d / cfg['mapa_max_mm'], 0, 1)
        pts = np.array([[0.05, 0.15, 0.6], [0.0, 0.75, 0.85], [0.95, 0.9, 0.1], [0.85, 0.1, 0.05]])
        x = s * 3
        i = np.minimum(x.astype(int), 2)
        f = (x - i)[:, None]
        return pts[i] * (1 - f) + pts[i + 1] * f
    o_ref = C.malha_de_arrays('ref', Vk, Fk)
    o_map = C.malha_de_arrays('mapa', Vk, Fk, cores=mapa_de_cor(dv), suave_angulo=None)
    o_cand = C.malha_de_arrays('cand', CVr, CFr)
    vistas = C.completar_vistas(cfg, prep['regiao'])
    for linha, obj, tipo in [('ref_cinza', o_ref, 'cinza'), ('cand_cinza', o_cand, 'cinza'), ('ref_zebra', o_ref, 'zebra'),
                             ('cand_zebra', o_cand, 'zebra'), ('mapa', o_map, 'cor')]:
        for o in (o_ref, o_map, o_cand):
            o.hide_render = o is not obj
        for v in vistas:
            C.renderizar([obj], tipo, v, os.path.join(a['saida'], f"{linha}-{v['nome']}.png"), cfg['avesso'])
    json.dump(met, open(os.path.join(a['saida'], 'metricas.json'), 'w'), ensure_ascii=False, indent=1)
    C.imagens('folha', a['saida'], os.path.join(a['saida'], 'metricas.json'), ','.join(v['nome'] for v in vistas))

met['segundos_total'] = round(time.time() - t0, 1)
json.dump(met, open(os.path.join(a['saida'], 'metricas.json'), 'w'), ensure_ascii=False, indent=1)
print('METRICAS', json.dumps(met, ensure_ascii=False))
