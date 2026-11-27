"""elastica.py - a curva do cabo: a elástica discreta entre duas pontas, a mesma conta de `procedural/familias/cabo/curva.js` e `caminho.js`, em numpy.

Sem `bpy`: roda em qualquer Python com numpy. O cabo é uma haste inextensível que sai de cada ponta na direção declarada e tem o comprimento
pedido; a forma é a que minimiza a soma dos quadrados da segunda diferença entre os nós (energia de dobra), com o comprimento de cada trecho fixo
e, com o caimento, a energia da gravidade. Cada iteração resolve o problema quadrático linearizado nas restrições (complemento de Schur) e uma
projeção de Newton leva os comprimentos ao zero de máquina. Nenhum sorteio nem relógio: a mesma entrada dá os mesmos números.

Unidade: a que vier (o addon passa metro e a conta trabalha em milímetro por dentro). Os nós são M pontos a trechos iguais; só as duas pontas da haste
ficam fixas, e a direção de saída é um engaste (um nó fantasma, como na família). O cabo tem um trecho reto de um diâmetro em cada ponta, e a curva lisa
pelos nós é a Hermite quíntica da família, que o Bézier do Blender segue por subtrechos. `partida` (os nós da solução anterior) acelera a conta quando as
pontas se mexeram pouco; sem ela a conta parte do palpite de Bézier, que é determinístico.
"""
import math

import numpy as np

NOS_MINIMOS = 25
NOS_MAXIMOS = 97
ITERACOES = 160
PRECISAO_DA_CURVA = 2e-4
SUBPASSOS = 32
SUBPASSOS_DA_CURVATURA = 24
SUBTRECHOS_DO_BEZIER = 2  # pontos do Bézier por trecho da haste
TRECHO_DA_PONTA_EM_DIAMETROS = 1.0
FRACAO_DO_TRECHO_DA_PONTA = 0.2
FRACOES_DA_ALCA = (0.04, 0.07, 0.1, 0.15, 0.22, 0.3, 0.4, 0.5)
ESCALA = 1000.0  # a conta trabalha em milímetro


class ErroDaCurva(Exception):
    pass


def nos_da_haste(comprimento, diametro):
    """Quantos nós a haste tem: um trecho de 2,5 diâmetros, entre o mínimo e o máximo (a mesma regra da família)."""
    return int(max(NOS_MINIMOS, min(NOS_MAXIMOS, round(comprimento / (2.5 * diametro)) + 1)))


def _unitario(v):
    v = np.asarray(v, dtype=float)
    return v / np.linalg.norm(v)


_CACHE_K = {}


def _matrizes(M):
    """K nos M − 2 nós livres (a segunda diferença dos nós interiores e a das pontas com o fantasma, a meio peso) e a inversa dela, que só dependem do número de nós."""
    if M not in _CACHE_K:
        n = M - 2
        K = np.zeros((n, n))
        coef = (1.0, -2.0, 1.0)
        for i in range(1, M - 1):
            for a in range(3):
                for b in range(3):
                    ja = i - 1 + a - 1
                    jb = i - 1 + b - 1
                    if 0 <= ja < n and 0 <= jb < n:
                        K[ja, jb] += coef[a] * coef[b]
        K[0, 0] += 2.0
        K[n - 1, n - 1] += 2.0
        _CACHE_K[M] = (K, np.linalg.inv(K))
    return _CACHE_K[M]


def lado_do_arco(A, B, dA, dB, caimento, baixo=(0.0, 0.0, -1.0), reservas=((0.0, -1.0, 0.0), (1.0, 0.0, 0.0))):
    """O lado do arco: a direção, perpendicular à corda, para onde a flecha do palpite aponta (a regra fixa da família, no referencial do Blender)."""
    corda = _unitario(B - A)

    def lateral(v):
        v = np.asarray(v, dtype=float)
        p = v - corda * np.dot(v, corda)
        n = np.linalg.norm(p)
        return p / n if n > 1e-3 else None

    for candidato in ((lateral(baixo) if caimento > 0 else None), lateral(dA + dB), lateral(baixo), lateral(reservas[0]), lateral(reservas[1])):
        if candidato is not None:
            return candidato
    return None


_T = np.linspace(0.0, 1.0, 201)


def _bezier4(Q, t):
    u = 1 - t
    w = np.stack([u ** 4, 4 * u ** 3 * t, 6 * u * u * t * t, 4 * u * t ** 3, t ** 4])  # 5 x len(t)
    return (Q.T @ w).T


def _comprimento_do_polinomio(Q):
    p = _bezier4(Q, _T)
    return float(np.linalg.norm(np.diff(p, axis=0), axis=1).sum())


def _controle(A, B, dA, dB, lado, L, rho, flecha):
    return np.array([A, A + dA * rho * L, (A + B) * 0.5 + lado * flecha, B + dB * rho * L, B])


def _nos_da_bezier(Q, M):
    p = _bezier4(Q, np.linspace(0.0, 1.0, 601))
    passos = np.linalg.norm(np.diff(p, axis=0), axis=1)
    acumulado = np.concatenate([[0.0], np.cumsum(passos)])
    alvo = acumulado[-1] * np.arange(M) / (M - 1)
    return np.stack([np.interp(alvo, acumulado, p[:, q]) for q in range(3)], axis=1)


def _flexao(nos):
    d = nos[:-2] + nos[2:] - 2 * nos[1:-1]
    return float((d * d).sum())


def palpite(A, B, dA, dB, lado, L, M):
    """Para cada fração de alça e cada sinal do lado, a flecha que dá o comprimento pedido (bisseção); vale o de menor flexão."""
    melhor = None
    for sinal in (1.0, -1.0):
        for rho in FRACOES_DA_ALCA:
            alvo = lado * sinal
            if _comprimento_do_polinomio(_controle(A, B, dA, dB, alvo, L, rho, 0.0)) > L:
                continue
            inferior, superior = 0.0, 1.5 * L
            if _comprimento_do_polinomio(_controle(A, B, dA, dB, alvo, L, rho, superior)) < L:
                continue
            for _ in range(36):
                meio = 0.5 * (inferior + superior)
                if _comprimento_do_polinomio(_controle(A, B, dA, dB, alvo, L, rho, meio)) < L:
                    inferior = meio
                else:
                    superior = meio
            nos = _nos_da_bezier(_controle(A, B, dA, dB, alvo, L, rho, 0.5 * (inferior + superior)), M)
            e = _flexao(nos)
            if melhor is None or e < melhor[1] * (1 - 1e-9):
                melhor = (nos, e)
    return melhor


def resolver(A, B, dA, dB, L, M, caimento=0.0, partida=None, cima=(0.0, 0.0, 1.0), referencia=None):
    """Resolve a haste. A, B em unidades de comprimento; dA, dB as direções em que o cabo sai de cada ponta; L o comprimento; M os nós.
    `referencia`, se vier, é (baixo, reservas) do lado do arco no referencial de quem chama (o padrão é o do Blender: baixo −Z). Devolve { nos (M x 3 no mesmo sistema de unidades), h, iteracoes, violacao }, ou levanta ErroDaCurva se nenhum palpite chega ao comprimento."""
    A = np.asarray(A, dtype=float) * ESCALA
    B = np.asarray(B, dtype=float) * ESCALA
    dA = _unitario(dA)
    dB = _unitario(dB)
    L = float(L) * ESCALA
    h = L / (M - 1)
    n = M - 2
    m = M - 1
    if partida is None:
        achado = palpite(A, B, dA, dB, lado_do_arco(A, B, dA, dB, caimento, *(referencia or ())), L, M)
        if achado is None:
            raise ErroDaCurva('nenhum palpite de Bézier chega ao comprimento pedido')
        P = achado[0].copy()
    else:
        P = np.asarray(partida, dtype=float).copy() * ESCALA
    P[0] = A
    P[M - 1] = B

    K, Kinv = _matrizes(M)
    gravidade = caimento * h ** 4 / L ** 3
    # o vetor linear: as pontas fixas na segunda diferença dos nós 1 e M − 2, o fantasma de cada ponta e a gravidade
    linear = np.zeros((n, 3))
    linear[0] += -2.0 * A
    linear[1] += A
    linear[n - 1] += -2.0 * B
    linear[n - 2] += B
    linear[0] += -2.0 * A - 2.0 * h * dA
    linear[n - 1] += -2.0 * B - 2.0 * h * dB
    linear += gravidade * np.asarray(cima, dtype=float)
    y0 = -(Kinv @ linear)

    h2 = h * h
    k_pos = np.arange(1, n + 1)   # o trecho k toca o nó livre k − 1 (coeficiente −e), k = 1..M − 2
    k_neg = np.arange(0, n)       # o trecho k toca o nó livre k (coeficiente +e), k = 0..M − 3

    def restricoes():
        e = P[1:M] - P[0:M - 1]  # m x 3: o trecho entre os nós k e k + 1
        return e, 0.5 * ((e * e).sum(axis=1) - h2)

    def jacobiana(e):
        G = np.zeros((3, m, n))
        for q in range(3):
            G[q, k_pos, k_pos - 1] = -e[k_pos, q]
            G[q, k_neg, k_neg] = e[k_neg, q]
        return G

    def maior_violacao():
        return float(np.abs(restricoes()[1]).max() / h2)

    feitas = 0
    for it in range(ITERACOES):
        e, g = restricoes()
        G = jacobiana(e)
        atual = P[1:M - 1]
        S = sum(G[q] @ Kinv @ G[q].T for q in range(3))
        rhs = g + sum(G[q] @ (y0[:, q] - atual[:, q]) for q in range(3))
        S[np.diag_indices(m)] += 1e-12 * np.trace(S) / m
        mu = np.linalg.solve(S, rhs)
        D = np.stack([Kinv @ (G[q].T @ mu) for q in range(3)], axis=1)
        novo = y0 - D
        passo = float(np.abs(novo - atual).max())
        limite = 0.25 * h
        escala = limite / passo if passo > limite else 1.0
        P[1:M - 1] = atual + escala * (novo - atual)
        feitas = it + 1
        if passo * escala < 1e-7 * h and maior_violacao() < 1e-9:
            break
    for _ in range(8):
        e, g = restricoes()
        if (np.abs(g) / h2 < 1e-13).all():
            break
        G = jacobiana(e)
        S = sum(G[q] @ G[q].T for q in range(3))
        S[np.diag_indices(m)] += 1e-14 * np.trace(S) / m
        mu = np.linalg.solve(S, g)
        for q in range(3):
            P[1:M - 1, q] -= G[q].T @ mu
    return {'nos': P / ESCALA, 'h': h / ESCALA, 'iteracoes': feitas, 'violacao': maior_violacao()}


def _perpendicular(c, t):
    return c - t * (c * t).sum(axis=-1, keepdims=True)


def _dados_dos_nos(nos, dA, dB):
    """Os dados da Hermite quíntica da família em cada nó: tangente unitária (a direção pedida nas pontas, o vetor do nó anterior ao seguinte nos outros), a corda de cada trecho
    e o vetor de curvatura de cada lado do nó (o do nó interior é a diferença dos dois trechos unitários sobre a média deles; o da ponta é o do engaste, o desvio do trecho para a tangente, em dobro)."""
    M = len(nos)
    T = np.empty_like(nos)
    T[1:-1] = nos[2:] - nos[:-2]
    T[1:-1] /= np.linalg.norm(T[1:-1], axis=1)[:, None]
    T[0] = _unitario(dA)
    T[M - 1] = -_unitario(dB)
    e = np.diff(nos, axis=0)
    hh = np.linalg.norm(e, axis=1)
    u = e / hh[:, None]
    antes = np.zeros_like(nos)   # a curvatura de cada nó vista do trecho anterior
    antes[1:M - 1] = _perpendicular(2.0 * (u[1:] - u[:-1]) / (hh[1:] + hh[:-1])[:, None], T[1:M - 1])
    antes[M - 1] = _perpendicular(2.0 * (T[M - 1] * hh[M - 2] - e[M - 2]) / hh[M - 2] ** 2, T[M - 1])
    depois = antes.copy()        # e do trecho seguinte
    depois[0] = _perpendicular(2.0 * (e[0] - T[0] * hh[0]) / hh[0] ** 2, T[0])
    return T, hh, depois, antes


def _avaliar(nos, T, hh, C0, C1, i, u):
    """Posição, primeira e segunda derivada (em relação ao arco aproximado) da quíntica no trecho i, nos u (vetor) de 0 a 1."""
    h = hh[i]
    u = np.asarray(u, dtype=float)
    u2, u3, u4, u5 = u ** 2, u ** 3, u ** 4, u ** 5
    B = np.stack([1 - 10 * u3 + 15 * u4 - 6 * u5, u - 6 * u3 + 8 * u4 - 3 * u5, 0.5 * u2 - 1.5 * u3 + 1.5 * u4 - 0.5 * u5, 10 * u3 - 15 * u4 + 6 * u5, -4 * u3 + 7 * u4 - 3 * u5, 0.5 * u3 - u4 + 0.5 * u5], axis=1)
    D = np.stack([-30 * u2 + 60 * u3 - 30 * u4, 1 - 18 * u2 + 32 * u3 - 15 * u4, u - 4.5 * u2 + 6 * u3 - 2.5 * u4, 30 * u2 - 60 * u3 + 30 * u4, -12 * u2 + 28 * u3 - 15 * u4, 1.5 * u2 - 4 * u3 + 2.5 * u4], axis=1)
    E = np.stack([-60 * u + 180 * u2 - 120 * u3, -36 * u + 96 * u2 - 60 * u3, 1 - 9 * u + 18 * u2 - 10 * u3, 60 * u - 180 * u2 + 120 * u3, -24 * u + 84 * u2 - 60 * u3, 3 * u - 12 * u2 + 10 * u3], axis=1)
    dados = np.stack([nos[i], T[i] * h, C0[i] * h * h, nos[i + 1], T[i + 1] * h, C1[i + 1] * h * h])  # 6 x 3
    return B @ dados, (D @ dados) / h, (E @ dados) / (h * h)


def curva_lisa(nos, dA, dB, trecho_a=0.0, trecho_b=0.0):
    """A curva lisa da família (a quíntica pelos nós, com o trecho reto de cada ponta): o comprimento, o raio de dobra dela (`raio`, o que vale) e o da haste (`raio_haste`),
    e os `subtrechos` pontos por trecho da haste, com a tangente unitária de cada um, para o Bézier."""
    T, hh, C0, C1 = _dados_dos_nos(nos, dA, dB)
    n = len(hh)
    arco = 0.0
    kmax = 0.0
    u32 = np.linspace(0.0, 1.0, SUBPASSOS + 1)
    u24 = np.linspace(0.0, 1.0, SUBPASSOS_DA_CURVATURA + 1)
    for i in range(n):
        p, _, _ = _avaliar(nos, T, hh, C0, C1, i, u32)
        arco += float(np.linalg.norm(np.diff(p, axis=0), axis=1).sum())
        _, d1, d2 = _avaliar(nos, T, hh, C0, C1, i, u24)
        k = np.linalg.norm(np.cross(d1, d2), axis=1) / np.linalg.norm(d1, axis=1) ** 3
        kmax = max(kmax, float(k.max()))
    kh = max(float(np.linalg.norm(C0, axis=1).max()), float(np.linalg.norm(C1, axis=1).max()))
    return {
        'comprimento': trecho_a + trecho_b + arco,
        'raio': 1.0 / kmax if kmax > 0 else math.inf,
        'raio_haste': 1.0 / kh if kh > 0 else math.inf,
        'dados': (T, hh, C0, C1),
    }


def pontos_do_bezier(nos, dA, dB, A, B, dados, subtrechos=SUBTRECHOS_DO_BEZIER):
    """Os pontos do Bézier: a ponta A, os pontos da quíntica (`subtrechos` por trecho da haste, o primeiro e o último são os nós das pontas) e a ponta B, com a alça de cada
    ponto na tangente dele e um terço da corda ao vizinho (a Hermite cúbica por esses pontos, de erro desprezível contra a quíntica). Devolve (pontos, esquerda, direita)."""
    T, hh, C0, C1 = dados
    n = len(hh)
    pts = [np.asarray(A, dtype=float)]
    tan = [_unitario(dA)]
    for i in range(n):
        u = np.arange(0, subtrechos, dtype=float) / subtrechos
        p, d1, _ = _avaliar(nos, T, hh, C0, C1, i, u)
        pts.extend(p)
        tan.extend(d1 / np.linalg.norm(d1, axis=1)[:, None])
    pts.append(nos[-1])
    tan.append(T[-1])
    pts.append(np.asarray(B, dtype=float))
    tan.append(-_unitario(dB))
    pts = np.array(pts)
    tan = np.array(tan)
    corda = np.linalg.norm(np.diff(pts, axis=0), axis=1)
    direita = pts.copy()
    esquerda = pts.copy()
    direita[:-1] += tan[:-1] * corda[:, None] / 3.0
    esquerda[1:] -= tan[1:] * corda[:, None] / 3.0
    return pts, esquerda, direita


def pontos_da_curva(nos):
    """Quantos pontos tem o Bézier de um cabo de `nos` nós de haste: as duas pontas e `SUBTRECHOS_DO_BEZIER` por trecho da haste mais o último nó."""
    return (nos - 1) * SUBTRECHOS_DO_BEZIER + 1 + 2


def refazer(A, B, dA, dB, comprimento, nos, caimento=0.0, partida=None, diametro=0.0):
    """A curva do cabo com o comprimento liso acertado a 0,02%: refaz a haste com o comprimento escalado (a mesma iteração da família). O cabo sai reto de cada ponta por
    `diametro` (no máximo um quinto da distância entre as pontas), e a haste engasta aí. Devolve { nos (da haste), pontos, esquerda, direita (do Bézier), comprimento, raio (da curva lisa),
    raio_haste, estado }; estado é 'ok' ou 'estica' (as pontas longe demais para o comprimento)."""
    A = np.asarray(A, dtype=float)
    B = np.asarray(B, dtype=float)
    dA = _unitario(dA)
    dB = _unitario(dB)
    D = float(np.linalg.norm(B - A))
    ta = min(TRECHO_DA_PONTA_EM_DIAMETROS * diametro, FRACAO_DO_TRECHO_DA_PONTA * D)
    tb = ta
    Qa = A + dA * ta
    Qb = B + dB * tb
    Lc = float(comprimento) - ta - tb
    Lr = Lc
    chute = partida
    try:
        for _ in range(5):
            r = resolver(Qa, Qb, dA, dB, Lr, nos, caimento, chute)
            if r['violacao'] > 1e-8 and chute is not None:
                r = resolver(Qa, Qb, dA, dB, Lr, nos, caimento, None)
            if r['violacao'] > 1e-8:
                raise ErroDaCurva('a haste não converge')
            lisa = curva_lisa(r['nos'], dA, dB, ta, tb)
            if abs(lisa['comprimento'] / comprimento - 1) < PRECISAO_DA_CURVA:
                break
            Lr *= Lc / (lisa['comprimento'] - ta - tb)
            chute = r['nos']
        pts, esq, dir_ = pontos_do_bezier(r['nos'], dA, dB, A, B, lisa['dados'])
        return {'nos': r['nos'], 'pontos': pts, 'esquerda': esq, 'direita': dir_, 'comprimento': lisa['comprimento'], 'raio': lisa['raio'], 'raio_haste': lisa['raio_haste'], 'estado': 'ok', 'iteracoes': r['iteracoes']}
    except ErroDaCurva:
        k = pontos_da_curva(nos)
        reta = A[None, :] + (B - A)[None, :] * np.linspace(0.0, 1.0, k)[:, None]
        return {'nos': A[None, :] + (B - A)[None, :] * np.linspace(0.0, 1.0, nos)[:, None], 'pontos': reta, 'esquerda': reta.copy(), 'direita': reta.copy(), 'comprimento': D, 'raio': math.inf, 'raio_haste': math.inf, 'estado': 'estica', 'iteracoes': 0}
