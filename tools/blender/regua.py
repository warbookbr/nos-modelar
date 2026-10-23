# regua.py — mede uma malha candidata contra uma malha de referência dentro de uma caixa: distância nos dois sentidos só do
# que se vê de fora (e com sinal, pela normal da candidata), erro de normais, curvatura comparada por região, vincos com
# cobertura, precisão, F1 a 5 e 10 mm e desvio, os perfis dos cortes declarados, a contagem de falhas de ondulação da receita,
# e a folha e as imagens grandes por vista com as duas malhas em listras de reflexo e o mapa de distância com sinal.
#
# Uso:
#   blender -b --factory-startup --python tools/blender/regua.py -- \
#       --referencia <ref.obj|.glb|.gltf|.blend> [--objeto-referencia <nome>] \
#       --candidata <cand.obj|.glb|.gltf|.blend> [--objeto-candidata <nome>] [--z-cima | --z-cima-referencia | --z-cima-candidata] \
#       --caixa xmin,xmax,ymin,ymax,zmin,zmax --saida <pasta> --nome <rótulo da medida> \
#       [--config <cfg.json>] [--simetria-x] [--rotulos <rotulos.json>] [--excluir a,b] [--oclusores <malha>] \
#       [--angulo-vinco 40] [--densidade 40000] [--omitidas a,b] [--sem-imagens] \
#       [--cortes z=1.0,x=0.72] [--outras-candidatas b.obj,c.obj] [--receita <receita.js>] \
#       [--mapa-sinal-mm 4] [--resolucao-vista 1440x1080] [--curvatura-raio-mm 20]
#
# A referência passa pelo mesmo preparo do pacote cego (comum.preparar_referencia): recorte exato pela caixa, pele visível
# de fora, painéis inteiros, componentes pequenos fora. Mede-se só dentro da caixa declarada (com --simetria-x, a metade
# x >= xmin; o recorte, a oclusão e as imagens pegam as duas). Cada malha é amostrada por área (densidade amostras por m²,
# com semente fixa) e só entra o ponto que se vê de fora contra a própria malha mais os oclusores.
#   ref_para_cand_mm: de cada ponto da referência à superfície visível da candidata perto da caixa (o que a candidata deixa
#     de cobrir); cand_para_ref_mm: de cada ponto da candidata à referência inteira perto da caixa (o que ela põe a mais).
#   normal_*_graus: o ângulo entre a normal do ponto e a do triângulo mais perto do outro lado, sem sinal.
#   vincos: arestas com diedro acima de angulo_vinco (padrão 40 graus, o de limiares.py, que comparar-vincos e ler-linhas também usam) entre faces visíveis, amostradas a cada 2 mm; a
#     cobertura é a fração do vinco da referência a até 5 ou 10 mm de um vinco da candidata, a precisão o contrário, o F1 a
#     média harmônica, e o desvio a distância do vinco da referência ao da candidata (mediana e p90).
#   por_rotulo: com --rotulos, a distância da referência para a candidata por rótulo; vincos_por_rotulo, os vincos por
#     rótulo (o ponto de vinco da referência leva o rótulo da face dele, e o da candidata o da face da referência mais perto);
#     com a chave `omitidas` da configuração (rótulos que a candidata pode omitir), cada rótulo traz omitida, e
#     ref_para_cand_sem_omitidas_mm e vincos_sem_omitidas repetem a medida sem eles.
#   ref_para_cand_com_sinal_mm: a mesma distância com sinal, pela normal da candidata virada para o lado de fora (a normal
#     com o avesso desfeito: vale o lado por onde a maioria dos raios das direções permitidas escapa; a chapa vista pelos dois
#     lados fica com a normal que tem): negativo onde a candidata afunda em relação à referência, positivo onde sobra.
#     Dá a mediana, p5, p95, os extremos e a fração a mais de 1 mm para cada lado, no total e por rótulo.
#   curvatura: o quanto a curvatura da candidata difere da da referência, nos pontos da referência com a candidata a até
#     curvatura_pareamento_mm. Em cada ponto, e nas duas superfícies, mede-se o ângulo médio entre a normal de cada amostra
#     a até curvatura_raio_mm (20 mm) e o eixo dominante das normais da vizinhança, sem sinal, vezes 3π/(4 raio), em 1/m:
#     num cilindro dá o inverso do raio, e numa dobra dentro da vizinhança dá o ângulo da dobra pela fração da área do lado
#     menor. As amostras são uma retícula sem acaso sobre a superfície visível (curvatura_densidade), de modo que a forma
#     contra ela mesma dá exatamente zero e a medida não depende de como cada malha foi triangulada nem da normal de uma
#     faceta. diferenca_abs_1_m é o módulo da diferença; falta_1_m, a curvatura que a referência tem e a candidata não (a
#     dobra que falta); excesso_1_m, a que a candidata tem e a referência não (a ondulação de comprimento de onda curto);
#     cada um com mediana, p90, p99 e máxima. fracao_acima_limite é a fração dos pontos com diferença acima de
#     curvatura_limite_1_m, e dentro_do_limite vale quando ela é no máximo 10% (o p90 não passa do limite). No total, por
#     rótulo (curvatura_por_rotulo) e sem as omitidas (curvatura_sem_omitidas). A onda longa (centenas de mm) tem curvatura
#     abaixo do ruído das facetas da referência; para ela vale a contagem de falhas de --receita.
#   cortes: com --cortes z=1.0,x=0.72 (em metro) ou a chave `cortes` da configuração ({nome, eixo, valor}, a do pacote), a
#     referência (a pele mantida) e a candidata são cortadas pelos planos, e a distância de um perfil ao outro, nos dois
#     sentidos e exata (ponto a segmento), sai por corte com média, p95, máxima e o ponto da máxima, em mm. --outras-candidatas
#     traz mais candidatas só para os cortes. As imagens são cortes/corte-<nome>.png (o corte inteiro) e
#     corte-<nome>-ampliado.png (grade de 10 mm em volta de `ampliar` [u0, u1, v0, v1] em mm da configuração do corte, ou do
#     ponto de maior diferença, numa janela de ampliacao_mm de largura), com a referência em preto.
#   ondulacao_da_receita: com --receita <receita.js>, roda tools/mecanifica/ondulacao-da-superficie.mjs (MECANIFICA_NODE
#     escolhe o node) e grava as falhas abertas (fora dos vincos declarados) e a maior amplitude em mm.
# Grava em <saida>/: metricas.json e, sem --sem-imagens, as imagens de cada linha e vista, folha.png e, por vista,
# vista-<vista>.png: referência em listras, candidata em listras e mapa com sinal lado a lado, a resolucao_vista
# (1440x1080) cada painel, recortados ao conteúdo e com título.
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


def distancias(arvore, P, Nfonte, vis=None):
    """(D, A, S): a distância em mm de cada ponto à superfície da árvore, o ângulo entre a normal do ponto e a da face mais perto
    e, com vis (a visibilidade dos oclusores da árvore), o sinal da distância pela normal da face virada para fora: -1 onde
    o ponto está do lado de fora da face (a árvore afunda em relação a ele), +1 do lado de dentro, 0 sobre ela."""
    D = np.empty(len(P))
    A = np.empty(len(P))
    S = np.zeros(len(P))
    lados = {}
    for i, (p, n) in enumerate(zip(P, Nfonte)):
        loc, nrm, idx, d = arvore.find_nearest(Vector(p))
        if loc is None:
            D[i], A[i] = np.inf, 90.0
            continue
        D[i] = d
        A[i] = np.degrees(np.arccos(min(1.0, abs(float(np.dot(n, nrm))))))
        if vis is not None:
            S[i] = sinal_da_distancia(vis, lados, idx, Vector(p), loc, nrm)
    return D * 1000.0, A, S


def sinal_da_distancia(vis, lados, idx, p, loc, nrm):
    """-1 se o ponto p está do lado de fora da face (loc, nrm) da candidata, +1 do lado de dentro, 0 sobre ela. O lado de fora
    de cada face se decide uma vez (lados, por índice da face) pelos raios que escapam."""
    if idx not in lados:
        lados[idx] = vis.lado_externo(loc, nrm)
    c = (p - loc).dot(nrm) * lados[idx]
    return -1.0 if c > 1e-9 else (1.0 if c < -1e-9 else 0.0)


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
d_rc, a_rc, s_rc = distancias(arv_cand, Pr, SN[tr], vis_cand)
d_cr, a_cr, _ = distancias(arv_ref, Pc, CN[tc])
d_rc_sinal = s_rc * d_rc   # negativo onde a candidata afunda em relação à referência, positivo onde sobra

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

# ---------- curvatura comparada ----------
# Nos pontos Pr da referência, a curvatura da referência e a da candidata sobre a vizinhança fixa em volta do mesmo ponto,
# cada uma sobre amostras densas da superfície visível dela na caixa;
# a visibilidade é a do triângulo, e não a de cada amostra, porque as amostras são muitas.
RAIO = cfg['curvatura_raio_mm'] / 1000.0
dens, teto = cfg['curvatura_densidade'], 8 * cfg['max_amostras']
Qr, trq, wr = C.amostras_regulares(SV, SF, fonte & ref_tri_vis, dens, teto)
mq = C.na_caixa(Qr, CX)
Qr, trq, wr = Qr[mq], trq[mq], wr[mq]
Qc, tcq, wc = C.amostras_regulares(CV, CF, perto & cand_tri_vis, dens, teto)
mq = C.na_caixa(Qc, CX)
Qc, tcq, wc = Qc[mq], tcq[mq], wc[mq]
curv_r = C.curvatura_em(Pr, Qr, SN[trq], wr, RAIO)
curv_par = C.curvatura_em(Pr, Qc, CN[tcq], wc, RAIO)
casado = np.isfinite(curv_r) & np.isfinite(curv_par) & (d_rc <= cfg['curvatura_pareamento_mm'])


def quantis(x):
    if not len(x):
        return {'mediana': None, 'p90': None, 'p99': None, 'maxima': None}
    return {'mediana': round(float(np.median(x)), 3), 'p90': round(float(np.percentile(x, 90)), 3),
            'p99': round(float(np.percentile(x, 99)), 3), 'maxima': round(float(x.max()), 3)}


def curvatura_de(m):
    """A curvatura da referência e a da candidata nos pontos casados de m (máscara de Pr), a diferença sem sinal, a que falta
    (a referência curva e a candidata não) e a que sobra, em 1/m."""
    k = m & casado
    r, c = curv_r[k], curv_par[k]
    dif = c - r
    out = {'n': int(k.sum()), 'sem_par': int((m & ~casado).sum()),
           'referencia_1_m': quantis(r), 'candidata_1_m': quantis(c), 'diferenca_abs_1_m': quantis(np.abs(dif)),
           'falta_1_m': quantis(np.maximum(-dif, 0)), 'excesso_1_m': quantis(np.maximum(dif, 0))}
    out['fracao_acima_limite'] = round(float((np.abs(dif) > cfg['curvatura_limite_1_m']).mean()), 4) if len(dif) else 0.0
    out['dentro_do_limite'] = out['fracao_acima_limite'] <= 0.10   # o p90 da diferença não passa do limite
    return out


def sinal_de(m):
    x = d_rc_sinal[m]
    if not len(x):
        return {'n': 0}
    return {'n': int(len(x)), 'mediana': round(float(np.median(x)), 3), 'p5': round(float(np.percentile(x, 5)), 3),
            'p95': round(float(np.percentile(x, 95)), 3), 'minimo': round(float(x.min()), 3), 'maximo': round(float(x.max()), 3),
            'fracao_afunda_1mm': round(float((x < -1).mean()), 4), 'fracao_sobra_1mm': round(float((x > 1).mean()), 4)}


met = {
    'nome': a['nome'], 'candidata': os.path.basename(a['candidata']), 'caixa': CX.tolist(), 'simetria_x': cfg['simetria_x'],
    'vincos': vinc, 'ref_para_cand_mm': resumo(d_rc), 'cand_para_ref_mm': resumo(d_cr),
    'normal_ref_para_cand_graus': {'mediana': round(float(np.median(a_rc)), 3), 'p90': round(float(np.percentile(a_rc, 90)), 3)},
    'normal_cand_para_ref_graus': {'mediana': round(float(np.median(a_cr)), 3), 'p90': round(float(np.percentile(a_cr, 90)), 3)},
    'vertices_total': int(len(CV)), 'triangulos_total': int(len(CF)),
    'vertices_na_caixa': int(C.na_caixa(CV[np.unique(CF[perto])], CX).sum()), 'triangulos_perto': int(perto.sum()),
    'fracao_cand_visivel': round(fracao_visivel, 3), 'referencia': prep['contagens'], 'mapa_max_mm': cfg['mapa_max_mm'],
    'mapa_sinal_mm': cfg['mapa_sinal_mm'],
    'ref_para_cand_com_sinal_mm': sinal_de(np.ones(len(Pr), bool)),
    'curvatura': {'raio_mm': cfg['curvatura_raio_mm'], 'pareamento_mm': cfg['curvatura_pareamento_mm'], 'limite_1_m': cfg['curvatura_limite_1_m'],
                  'total': curvatura_de(np.ones(len(Pr), bool))},
}
if prep['rotulo'] is not None:
    rot_p = prep['rotulo'][tr].astype(str)
    met['por_rotulo'] = {str(n): {'fracao': round(float((rot_p == n).mean()), 3), 'mediana': round(float(np.median(d_rc[rot_p == n])), 2),
                                  'p90': round(float(np.percentile(d_rc[rot_p == n], 90)), 2), 'omitida': str(n) in omitidas}
                         for n in sorted(set(rot_p))}
    for n in met['por_rotulo']:
        met['por_rotulo'][n]['sinal'] = sinal_de(rot_p == n)
    met['curvatura_por_rotulo'] = {str(n): curvatura_de(rot_p == n) for n in sorted(set(rot_p))}
    if vinc_rot is not None:
        met['vincos_por_rotulo'] = vinc_rot
    if omitidas:
        sem = ~np.isin(rot_p, omitidas)
        met['ref_para_cand_sem_omitidas_mm'] = resumo(d_rc[sem]) | {'omitidas': omitidas}
        met['curvatura_sem_omitidas'] = curvatura_de(sem) | {'omitidas': omitidas}
        met['vincos_sem_omitidas'] = vinc_sem
# a candidata recortada pelos mesmos planos, para as imagens; a área dela mostra se o recorte perdeu triângulo comprido
CVr, CFr = C.recortar(CV, CF[C.toca_caixa(CV, CF, prep['regiao'])], prep['regiao'])
met['area_recorte_candidata_m2'] = round(float(C.normais(CVr, CFr)[1].sum()), 6)


# ---------- cortes declarados ----------
def uv_mm(cadeias, u, w):
    return [np.asarray(P)[:, [u, w]] * 1000.0 for P in cadeias if len(P) >= 2]


def candidata_recortada(caminho):
    V, F, _ = C.ler_malha(caminho, None, z_cand)
    return C.recortar(V, F[C.toca_caixa(V, F, prep['regiao'])], prep['regiao'])


def rotulo_de(caminho, usados):
    n = os.path.splitext(os.path.basename(caminho))[0]
    while n in usados:
        n += '+'
    usados.append(n)
    return n


def medir_corte(ref_uv, cand_uv):
    """A distância exata, em mm, de cada perfil ao outro nos dois sentidos, no plano do corte, e o ponto de cada máxima."""
    def sentido(de, para):
        pts = [C.reamostrar_polilinha(P, 0.5) for P in de]
        if not pts or not para:
            return {'media': None, 'p95': None, 'maxima': None, 'ponto_da_maxima_mm': None}, None
        Q = np.vstack(pts)
        d = C.distancia_a_polilinhas(Q, para)
        k = int(np.argmax(d))
        return {'media': round(float(d.mean()), 4), 'p95': round(float(np.percentile(d, 95)), 4), 'maxima': round(float(d[k]), 4),
                'ponto_da_maxima_mm': [round(float(Q[k, 0]), 2), round(float(Q[k, 1]), 2)]}, Q[k]
    rc, p_rc = sentido(ref_uv, cand_uv)
    cr, p_cr = sentido(cand_uv, ref_uv)
    return {'ref_para_cand_mm': rc, 'cand_para_ref_mm': cr}, (p_rc, p_cr)


cortes_json = []
if cfg['cortes']:
    usados = []
    todas = [(rotulo_de(a['candidata'], usados), CVr, CFr)]
    for caminho in [s_ for s_ in str(a.get('outras_candidatas', '')).split(',') if s_]:
        Vx, Fx = candidata_recortada(caminho)
        todas.append((rotulo_de(caminho, usados), Vx, Fx))
    met['cortes'] = {}
    for c in cfg['cortes']:
        e = 'xyz'.index(c['eixo'])
        u, w = C.EIXOS_DO_CORTE[e]
        ref_uv = uv_mm(C.cortar_plano(SV, SF, manter, e, float(c['valor'])), u, w)
        item = {'nome': c['nome'], 'eixo': c['eixo'], 'valor_mm': round(float(c['valor']) * 1000, 3), 'eixos_uv': ['xyz'[u], 'xyz'[w]],
                'referencia': [P.round(3).tolist() for P in ref_uv], 'candidatas': [], 'maximas': []}
        registro = {'eixo': c['eixo'], 'valor_mm': item['valor_mm'], 'referencia_cadeias': len(ref_uv), 'candidatas': {}}
        diferenca, onde = 0.0, None
        for nome_c, Vx, Fx in todas:
            cand_uv = uv_mm(C.cortar_plano(Vx, Fx, np.ones(len(Fx), bool), e, float(c['valor'])), u, w) if len(Fx) else []
            med, pontos = medir_corte(ref_uv, cand_uv)
            registro['candidatas'][nome_c] = med | {'cadeias': len(cand_uv)}
            for sentido_, ponto in zip(('ref_para_cand_mm', 'cand_para_ref_mm'), pontos):
                m_ = med[sentido_]['maxima']
                if m_ is not None and ponto is not None and m_ > diferenca:
                    diferenca, onde = m_, ponto
            rc, cr = med['ref_para_cand_mm'], med['cand_para_ref_mm']
            item['candidatas'].append({'nome': nome_c, 'cadeias': [P.round(3).tolist() for P in cand_uv],
                                       'resumo': f"ref→cand média {rc['media']} / p95 {rc['p95']} / máx {rc['maxima']} mm; "
                                                 f"cand→ref média {cr['media']} / p95 {cr['p95']} / máx {cr['maxima']} mm"})
            maior = rc if (rc['maxima'] or 0) >= (cr['maxima'] or 0) else cr
            item['maximas'].append(maior['ponto_da_maxima_mm'])
        if c.get('ampliar'):
            item['ampliacao'] = [float(x) for x in c['ampliar']]
            registro['ampliacao'] = 'declarada'
        else:
            if onde is None:
                tudo = np.vstack(ref_uv) if ref_uv else np.zeros((1, 2))
                onde = (tudo.min(0) + tudo.max(0)) / 2
            meia = cfg['ampliacao_mm'] / 2
            item['ampliacao'] = [float(onde[0] - meia), float(onde[0] + meia), float(onde[1] - meia * 0.75), float(onde[1] + meia * 0.75)]
            registro['ampliacao'] = 'maior diferença' if diferenca > 1e-3 else 'sem diferença'
        registro['ampliacao_mm'] = [round(x, 1) for x in item['ampliacao']]
        met['cortes'][c['nome']] = registro
        cortes_json.append(item)

# ---------- ondulação da receita ----------
if a.get('receita'):
    met['ondulacao_da_receita'] = C.ondulacao_da_receita(a['receita'])

met['segundos_medida'] = round(time.time() - t0, 1)

# ---------- imagens ----------
if not a.get('sem_imagens'):
    import shutil
    W, H = cfg['resolucao_folha']
    cfg['resolucao'] = [W, H]
    C.limpar_cena(4)
    C.camera()
    Vk, Fk = C.compactar(SV, SF[manter])
    arv_toda = C.bvh(CV, CF)
    lados_vertice = {}
    dv = np.zeros(len(Vk))       # distância sem sinal de cada vértice da referência à candidata inteira, em mm
    ds = np.zeros(len(Vk))       # a mesma com sinal pela normal da candidata virada para fora: negativo onde ela afunda
    for i, p_ in enumerate(Vk):
        loc, nrm, idx, d = arv_toda.find_nearest(Vector(p_))
        dv[i] = 1000.0 if loc is None else d * 1000.0
        if loc is not None:
            ds[i] = sinal_da_distancia(vis_cand, lados_vertice, idx, Vector(p_), loc, nrm) * d * 1000.0

    def mapa_de_cor(d):
        s = np.clip(d / cfg['mapa_max_mm'], 0, 1)
        pts = np.array([[0.05, 0.15, 0.6], [0.0, 0.75, 0.85], [0.95, 0.9, 0.1], [0.85, 0.1, 0.05]])
        x = s * 3
        i = np.minimum(x.astype(int), 2)
        f = (x - i)[:, None]
        return pts[i] * (1 - f) + pts[i + 1] * f

    def mapa_com_sinal(d):
        # azul onde a candidata afunda, branco em cima, vermelho onde sobra, saturando em ±mapa_sinal_mm
        t = np.clip(d / cfg['mapa_sinal_mm'], -1, 1)[:, None]
        azul, branco, verm = np.array([0.1, 0.25, 0.85]), np.array([0.97, 0.97, 0.97]), np.array([0.85, 0.12, 0.08])
        return np.where(t < 0, branco * (1 + t) - azul * t, branco * (1 - t) + verm * t)
    com_sinal = bool(cfg['mapa_sinal_mm'])
    o_ref = C.malha_de_arrays('ref', Vk, Fk)
    o_map = C.malha_de_arrays('mapa', Vk, Fk, cores=mapa_de_cor(dv), suave_angulo=None)
    o_sin = C.malha_de_arrays('mapa_sinal', Vk, Fk, cores=mapa_com_sinal(ds), suave_angulo=None) if com_sinal else None
    o_cand = C.malha_de_arrays('cand', CVr, CFr)
    objetos = [o for o in (o_ref, o_map, o_sin, o_cand) if o is not None]

    def so(obj):
        for o in objetos:
            o.hide_render = o is not obj
    vistas = C.completar_vistas(cfg, prep['regiao'])
    linhas = [('ref_cinza', o_ref, 'cinza'), ('cand_cinza', o_cand, 'cinza'), ('ref_zebra', o_ref, 'zebra'),
              ('cand_zebra', o_cand, 'zebra'), ('mapa', o_map, 'cor')] + ([('mapa_sinal', o_sin, 'cor')] if com_sinal else [])
    for linha, obj, tipo in linhas:
        so(obj)
        for v in vistas:
            C.renderizar([obj], tipo, v, os.path.join(a['saida'], f"{linha}-{v['nome']}.png"), cfg['avesso'])
    json.dump(met, open(os.path.join(a['saida'], 'metricas.json'), 'w'), ensure_ascii=False, indent=1)
    C.imagens('folha', a['saida'], os.path.join(a['saida'], 'metricas.json'), ','.join(v['nome'] for v in vistas))

    # uma imagem grande por vista: referência em listras, candidata em listras e o mapa com sinal, lado a lado
    if cfg['resolucao_vista'] and all(cfg['resolucao_vista']):
        cfg['resolucao'] = [int(x) for x in cfg['resolucao_vista']]
        tmp = os.path.join(a['saida'], 'paineis')
        os.makedirs(tmp, exist_ok=True)
        terceiro = ('mapa_sinal', o_sin, 'Candidata menos referência, com sinal') if com_sinal else ('mapa', o_map, 'Distância à candidata, sem sinal')
        for v in C.completar_vistas(cfg, prep['regiao']):
            paineis = []
            for chave, obj, titulo in [('ref_zebra', o_ref, 'Referência, listras de reflexo'),
                                       ('cand_zebra', o_cand, 'Candidata, listras de reflexo'), terceiro]:
                so(obj)
                arq = os.path.join(tmp, f"{chave}-{v['nome']}.png")
                C.renderizar([obj], 'zebra' if chave.endswith('zebra') else 'cor', v, arq, cfg['avesso'])
                paineis.append({'arquivo': arq, 'titulo': titulo, 'px_por_mm': v['W'] / (v['escala'] * 1000.0),
                                'subtitulo': f"vista {v['nome']}" + ('; azul: a candidata afunda; vermelho: sobra' if chave == 'mapa_sinal' else '')})
            if com_sinal:
                paineis[2]['legenda_mm'] = cfg['mapa_sinal_mm']
            import tempfile
            with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as t:
                json.dump({'saida': os.path.join(a['saida'], f"vista-{v['nome']}.png"), 'paineis': paineis}, t)
            C.imagens('vista', t.name)
            os.unlink(t.name)
        if not a.get('manter_paineis'):
            shutil.rmtree(tmp, ignore_errors=True)

    if cortes_json:
        import tempfile
        with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as t:
            json.dump({'cortes': cortes_json}, t)
        C.imagens('perfis', t.name, os.path.join(a['saida'], 'cortes'))
        os.unlink(t.name)

met['segundos_total'] = round(time.time() - t0, 1)
json.dump(met, open(os.path.join(a['saida'], 'metricas.json'), 'w'), ensure_ascii=False, indent=1)
print('METRICAS', json.dumps(met, ensure_ascii=False))
