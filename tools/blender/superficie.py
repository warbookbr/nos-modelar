# superficie.py — as contas das duas vistas de análise de superfície (luz-rasante.py e curvatura-da-lataria.py), só com numpy e
# sem o Blender: a direção da luz rasante, a curvatura média de uma malha, a escala e a cor dela, e o contraste de uma região de
# imagem. imagens.py (Python do sistema) e os scripts que rodam no Blender o importam; o teste o roda no python3 do sistema.
import math
import numpy as np

CINZA_DA_BORDA = 0.45     # peça de borda (friso, calha, aba): sem cor e mais escuro que o branco de curvatura zero
CINZA_SEM_DADO = 0.25     # a lataria perto da própria borda e das dobras vivas, onde a curvatura não se mede
COR_CONVEXA = np.array([0.85, 0.10, 0.10])     # curvatura média positiva: a superfície abaulada para o lado de fora
COR_CONCAVA = np.array([0.10, 0.25, 0.85])     # curvatura média negativa: o afundamento


def direcao_da_luz(vista, rasante_graus, azimute_graus):
    """O vetor unitário, no quadro da peça, pelo qual a luz do sol viaja. A câmera é ortográfica e olha ao longo de -z_cam; a
    superfície que a câmera enfrenta está no plano da imagem. A luz tem a componente `sin(rasante)` ao longo do olhar (vai para a
    superfície, nunca vem de trás dela) e `cos(rasante)` dentro do plano da imagem, na direção `azimute` medida de x_cam para
    y_cam. Com rasante pequeno a luz quase não sobe da superfície, e uma inclinação de 1 grau muda o brilho em dezenas por
    cento."""
    g, az = math.radians(rasante_graus), math.radians(azimute_graus)
    x, y, z = (np.array(vista[k], float) for k in ('x_cam', 'y_cam', 'z_cam'))
    no_plano = math.cos(az) * x + math.sin(az) * y
    d = math.cos(g) * no_plano - math.sin(g) * z       # -z_cam é o sentido do olhar, para dentro da cena
    return d / np.linalg.norm(d)


def luminancia(rgb):
    rgb = np.asarray(rgb, float)
    return 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]


def regiao_em_pixels(caixa, vista):
    """O retângulo (x0, y0, x1, y1), em pixels da imagem, que cobre a projeção da caixa 3x2 (metro) na câmera da vista."""
    caixa = np.asarray(caixa, float).reshape(3, 2)
    cantos = np.array([[caixa[0, i], caixa[1, j], caixa[2, k]] for i in (0, 1) for j in (0, 1) for k in (0, 1)])
    c = np.array(vista['centro'], float)
    xc, yc = np.array(vista['x_cam'], float), np.array(vista['y_cam'], float)
    s, W, H = vista['escala'], vista['W'], vista['H']
    px = W / 2 + ((cantos - c) @ xc) / s * W
    py = H / 2 - ((cantos - c) @ yc) / s * W
    x0, x1 = int(max(0, math.floor(px.min()))), int(min(W, math.ceil(px.max())))
    y0, y1 = int(max(0, math.floor(py.min()))), int(min(H, math.ceil(py.max())))
    return x0, y0, x1, y1


def contraste_na_regiao(imagem, retangulo):
    """O contraste de uma região da imagem (H, W, 3 ou H, W, em 0 a 1): o desvio padrão da luminância depois de tirar o plano
    que melhor a ajusta (o brilho que a lataria tem por ser curva ou por estar inclinada, que varia devagar), dividido pela
    média da luminância. Uma região lisa dá perto de zero; um amassado raso sob luz rasante dá alguns por cento ou mais. Devolve
    também a média e o desvio sem tirar o plano."""
    x0, y0, x1, y1 = retangulo
    L = np.asarray(imagem, float)
    L = luminancia(L) if L.ndim == 3 else L
    L = L[y0:y1, x0:x1]
    if L.size < 16:
        raise ValueError(f'a região {retangulo} tem menos de 16 pixels dentro da imagem')
    yy, xx = np.mgrid[0:L.shape[0], 0:L.shape[1]]
    A = np.stack([np.ones(L.size), xx.ravel() / L.shape[1], yy.ravel() / L.shape[0]], 1)
    coef, *_ = np.linalg.lstsq(A, L.ravel(), rcond=None)
    residuo = L.ravel() - A @ coef
    media = float(L.mean())
    return {'pixels': int(L.size), 'media': round(media, 5), 'desvio': round(float(L.std()), 5),
            'desvio_do_residuo': round(float(residuo.std()), 5),
            'contraste': round(float(residuo.std() / media), 5) if media > 1e-9 else 0.0}


# ---------- curvatura média ----------

def _arestas_e_faces(F):
    """As arestas únicas (a, b) com a < b e, para cada uma, as faces que a usam: (arestas, faces_a, faces_b), com -1 onde só há
    uma face; uma aresta em três faces ou mais guarda as duas primeiras e conta como não-variedade em `n_faces`."""
    tri = np.arange(len(F))
    pares = np.concatenate([F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]])
    dono = np.concatenate([tri, tri, tri])
    pares.sort(axis=1)
    chave = pares[:, 0].astype(np.int64) * (int(F.max()) + 1) + pares[:, 1]
    ordem = np.argsort(chave, kind='stable')
    chave, pares, dono = chave[ordem], pares[ordem], dono[ordem]
    inicio = np.concatenate([[0], np.nonzero(np.diff(chave))[0] + 1])
    n = np.diff(np.concatenate([inicio, [len(chave)]]))
    fa = dono[inicio]
    fb = np.where(n > 1, dono[np.minimum(inicio + 1, len(dono) - 1)], -1)
    return pares[inicio], fa, fb, n


def normais_dos_vertices(V, F):
    n = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]])      # o dobro da área, na direção da normal
    area = np.linalg.norm(n, axis=1)
    N = np.zeros_like(V)
    for k in range(3):
        np.add.at(N, F[:, k], n)
    nv = np.linalg.norm(N, axis=1)
    return N / np.maximum(nv, 1e-30)[:, None], n, area / 2


def curvatura_media(V, F, raio, angulo_borda=60.0, cotangente_maxima=20.0):
    """A curvatura média, em 1/m, de cada vértice da malha (triângulos F, enrolados para fora), com sinal: positiva onde a
    superfície abaula para o lado de fora, negativa onde afunda. Vem do operador de Laplace-Beltrami por cotangentes, H = -(Δx · n) / 2
    (uma esfera de raio r dá 1/r), e é média pesada pela área dos vértices a até `raio` (m) que olham para o mesmo lado (normais
    com produto interno acima de 0,5, para as duas peles de uma chapa grossa não se misturarem), de modo que não depende de como
    a malha foi triangulada nem de uma faceta torta. Devolve (H, valido): `valido` é falso nos vértices a menos de `raio` de uma
    borda livre da malha, de uma aresta com diedro acima de `angulo_borda` (a quina da chapa, a dobra viva) ou de uma aresta em
    mais de duas faces, onde a média tem só um lado e a curvatura não é a da superfície; esses ficam com NaN."""
    V, F = np.asarray(V, float), np.asarray(F, int)
    n = len(V)
    N, n_tri, area = normais_dos_vertices(V, F)
    # cotangentes de cada canto do triângulo e o laplaciano por vértice
    lap = np.zeros_like(V)
    area_v = np.zeros(n)
    for k in range(3):
        i, j, l = F[:, k], F[:, (k + 1) % 3], F[:, (k + 2) % 3]
        u, v = V[j] - V[i], V[l] - V[i]
        cot = np.einsum('ij,ij->i', u, v) / np.maximum(np.linalg.norm(np.cross(u, v), axis=1), 1e-30)
        cot = np.clip(cot, -cotangente_maxima, cotangente_maxima)
        # o canto em i enxerga a aresta (j, l): ela leva peso cot / 2 nos dois extremos
        np.add.at(lap, j, 0.5 * cot[:, None] * (V[l] - V[j]))
        np.add.at(lap, l, 0.5 * cot[:, None] * (V[j] - V[l]))
        np.add.at(area_v, i, area / 3)
    lap /= np.maximum(area_v, 1e-30)[:, None]
    H_bruta = -0.5 * np.einsum('ij,ij->i', lap, N)

    # onde a média não vale: perto de borda livre, de quina e de aresta fora de variedade
    arestas, fa, fb, contagem = _arestas_e_faces(F)
    ruim = (contagem == 1) | (contagem > 2)
    dois = (contagem == 2)
    if dois.any():
        nu = n_tri / np.maximum(np.linalg.norm(n_tri, axis=1), 1e-30)[:, None]
        cos = np.einsum('ij,ij->i', nu[fa[dois]], nu[fb[dois]])
        quina = np.zeros(len(arestas), bool)
        quina[dois] = cos < math.cos(math.radians(angulo_borda))
        ruim |= quina
    vertices_ruins = np.unique(arestas[ruim].ravel()) if ruim.any() else np.zeros(0, int)

    valido = np.ones(n, bool)
    if len(vertices_ruins):
        valido = _distancia_minima(V, V[vertices_ruins], raio) > raio
    H = _media_pesada(V, H_bruta, area_v, N, raio)
    H[~valido] = np.nan
    return H, valido


def _celulas(P, passo):
    ids, inv = np.unique(np.floor(P / passo).astype(np.int64), axis=0, return_inverse=True)
    inv = inv.ravel()
    ordem = np.argsort(inv, kind='stable')
    corte = np.searchsorted(inv[ordem], np.arange(len(ids) + 1))
    return ids, [ordem[corte[k]:corte[k + 1]] for k in range(len(ids))]


_DESLOC = [(i, j, k) for i in (-1, 0, 1) for j in (-1, 0, 1) for k in (-1, 0, 1)]


def _media_pesada(P, valor, peso, N, raio):
    """A média de `valor` dos pontos a até `raio` de cada ponto, pesada por `peso` e só entre os que olham para o mesmo lado
    (produto interno das normais acima de 0,5)."""
    ids, grupos = _celulas(P, raio)
    indice = {tuple(c): k for k, c in enumerate(ids)}
    out = np.full(len(P), np.nan)
    for k, c in enumerate(ids):
        viz = [grupos[indice[t]] for t in ((c[0] + a, c[1] + b, c[2] + d) for a, b, d in _DESLOC) if t in indice]
        cand = np.concatenate(viz)
        q = grupos[k]
        perto = ((P[q][:, None, :] - P[cand][None, :, :]) ** 2).sum(2) <= raio * raio
        w = perto * ((N[q] @ N[cand].T) > 0.5) * peso[cand][None, :]
        out[q] = (w @ valor[cand]) / np.maximum(w.sum(1), 1e-30)
    return out


def _distancia_minima(P, Q, alcance):
    """A distância de cada ponto de P ao ponto de Q mais perto, até `alcance`; acima disso, o dobro dele."""
    ids_q, grupos_q = _celulas(Q, alcance)
    indice = {tuple(c): k for k, c in enumerate(ids_q)}
    ids_p, grupos_p = _celulas(P, alcance)
    out = np.full(len(P), alcance * 2.0)
    for c, q in zip(ids_p, grupos_p):
        viz = [grupos_q[indice[t]] for t in ((c[0] + a, c[1] + b, c[2] + d) for a, b, d in _DESLOC) if t in indice]
        if not viz:
            continue
        cand = np.concatenate(viz)
        out[q] = np.minimum(out[q], np.sqrt(((P[q][:, None, :] - Q[cand][None, :, :]) ** 2).sum(2)).min(1))
    return out


def escala_da_curvatura(H, percentil=99.0, piso=0.1):
    """A curvatura (1/m) que satura a cor: o percentil de |H| dos vértices com valor, nunca abaixo do `piso`, para que uma
    lataria lisa não tenha o ruído dela esticado até a cor cheia."""
    h = np.abs(H[np.isfinite(H)])
    if not len(h):
        return piso
    return float(max(np.percentile(h, percentil), piso))


def cor_divergente(H, escala):
    """Branco em zero, vermelho para a curvatura positiva (abaulada) e azul para a negativa (afundada), saturando em ±escala.
    NaN sai como NaN nos três canais."""
    t = np.clip(np.asarray(H, float) / escala, -1.0, 1.0)
    cor = np.ones((len(t), 3))
    pos, neg = t > 0, t < 0
    cor[pos] = (1 - t[pos])[:, None] * 1.0 + t[pos][:, None] * COR_CONVEXA
    cor[neg] = (1 + t[neg])[:, None] * 1.0 - t[neg][:, None] * COR_CONCAVA
    cor[~np.isfinite(t)] = np.nan
    return cor
