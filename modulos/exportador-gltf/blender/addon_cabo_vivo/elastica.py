"""elastica.py - a curva do cabo: a elástica discreta entre duas pontas, a mesma conta de `procedural/familias/cabo/curva.js` e `caminho.js`, em numpy.

Sem `bpy`: roda em qualquer Python com numpy. O cabo é uma haste inextensível que sai de cada ponta na direção declarada e tem o comprimento
pedido; a forma é a que minimiza a soma dos quadrados da segunda diferença entre os nós (energia de dobra), com o comprimento de cada trecho fixo
e, com o caimento, a energia da gravidade. Cada iteração resolve o problema quadrático linearizado nas restrições (complemento de Schur) e uma
projeção de Newton leva os comprimentos ao zero de máquina. Nenhum sorteio nem relógio: a mesma entrada dá os mesmos números.

Unidade: a que vier (o addon passa metro e a conta trabalha em milímetro por dentro). Os nós são M pontos a trechos iguais; os dois primeiros e os
dois últimos ficam fixos (cada ponta sai reta, na direção dela, por um trecho). `partida` (os nós da solução anterior) acelera a conta quando as
pontas se mexeram pouco; sem ela a conta parte do palpite de Bézier, que é determinístico.
"""
import math

import numpy as np

NOS_MINIMOS = 17
NOS_MAXIMOS = 97
ITERACOES = 160
PRECISAO_DA_CURVA = 2e-4
SUBPASSOS = 32
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
    """K = SᵀS nos nós livres e a inversa dela, que só dependem do número de nós."""
    if M not in _CACHE_K:
        n = M - 4
        K = np.zeros((n, n))
        coef = (1.0, -2.0, 1.0)
        for i in range(1, M - 1):
            for a in range(3):
                for b in range(3):
                    ja = i - 1 + a - 2
                    jb = i - 1 + b - 2
                    if 0 <= ja < n and 0 <= jb < n:
                        K[ja, jb] += coef[a] * coef[b]
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
    n = M - 4
    m = M - 3
    if partida is None:
        achado = palpite(A, B, dA, dB, lado_do_arco(A, B, dA, dB, caimento, *(referencia or ())), L, M)
        if achado is None:
            raise ErroDaCurva('nenhum palpite de Bézier chega ao comprimento pedido')
        P = achado[0].copy()
    else:
        P = np.asarray(partida, dtype=float).copy() * ESCALA
    P[0] = A
    P[1] = A + dA * h
    P[M - 1] = B
    P[M - 2] = B + dB * h

    K, Kinv = _matrizes(M)
    gravidade = caimento * h ** 4 / L ** 3
    # o vetor linear: os nós fixos da segunda diferença e a gravidade
    linear = np.zeros((n, 3))
    coef = (1.0, -2.0, 1.0)
    for i in range(1, M - 1):
        for a in range(3):
            ja = i - 1 + a
            if ja < 2 or ja > M - 3:
                continue
            for b in range(3):
                jb = i - 1 + b
                if 2 <= jb <= M - 3:
                    continue
                linear[ja - 2] += coef[a] * coef[b] * P[jb]
    linear += gravidade * np.asarray(cima, dtype=float)
    y0 = -(Kinv @ linear)

    h2 = h * h
    k_pos = np.arange(1, n + 1)   # restrições que tocam o nó livre k - 1 (coeficiente −e)
    k_neg = np.arange(0, n)       # restrições que tocam o nó livre k (coeficiente +e)

    def restricoes():
        e = P[2:M - 1] - P[1:M - 2]  # m x 3: o trecho entre os nós i e i + 1, i = 1..M-3
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
        atual = P[2:M - 2]
        S = sum(G[q] @ Kinv @ G[q].T for q in range(3))
        rhs = g + sum(G[q] @ (y0[:, q] - atual[:, q]) for q in range(3))
        S[np.diag_indices(m)] += 1e-12 * np.trace(S) / m
        mu = np.linalg.solve(S, rhs)
        D = np.stack([Kinv @ (G[q].T @ mu) for q in range(3)], axis=1)
        novo = y0 - D
        passo = float(np.abs(novo - atual).max())
        limite = 0.25 * h
        escala = limite / passo if passo > limite else 1.0
        P[2:M - 2] = atual + escala * (novo - atual)
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
            P[2:M - 2, q] -= G[q].T @ mu
    return {'nos': P / ESCALA, 'h': h / ESCALA, 'iteracoes': feitas, 'violacao': maior_violacao()}


def tangentes_e_alcas(nos, dA, dB):
    """As alças do Bézier cúbico que reproduz a Hermite da família: tangente unitária em cada nó (a direção pedida nas pontas e no começo e fim do miolo,
    o vetor do nó anterior ao seguinte nos outros) e alça de um terço da corda de cada trecho. Devolve (esquerda, direita), M x 3 cada."""
    M = len(nos)
    T = np.empty_like(nos)
    T[1:-1] = nos[2:] - nos[:-2]
    T[1:-1] /= np.linalg.norm(T[1:-1], axis=1)[:, None]
    dA = _unitario(dA)
    dB = _unitario(dB)
    T[0] = dA
    T[1] = dA
    T[M - 1] = -dB
    T[M - 2] = -dB
    hh = np.linalg.norm(np.diff(nos, axis=0), axis=1)  # M - 1 cordas
    direita = nos.copy()
    esquerda = nos.copy()
    direita[:-1] += T[:-1] * hh[:, None] / 3.0
    esquerda[1:] -= T[1:] * hh[:, None] / 3.0
    return esquerda, direita


def comprimento_liso(nos, esquerda, direita):
    """O comprimento do Bézier por 32 subpassos por trecho (a tabela de arco da família)."""
    u = np.linspace(0.0, 1.0, SUBPASSOS + 1)[None, :, None]
    p0 = nos[:-1, None, :]
    p1 = direita[:-1, None, :]
    p2 = esquerda[1:, None, :]
    p3 = nos[1:, None, :]
    c = (1 - u) ** 3 * p0 + 3 * (1 - u) ** 2 * u * p1 + 3 * (1 - u) * u * u * p2 + u ** 3 * p3
    return float(np.linalg.norm(np.diff(c, axis=1), axis=2).sum())


def raio_minimo(nos):
    """O menor raio de dobra dos nós, pelo ângulo entre os dois trechos que cada nó une (a medida da família)."""
    a = nos[1:-1] - nos[:-2]
    b = nos[2:] - nos[1:-1]
    giro = np.arctan2(np.linalg.norm(np.cross(a, b), axis=1), (a * b).sum(axis=1))
    k = 2 * np.sin(giro / 2) / (0.5 * (np.linalg.norm(a, axis=1) + np.linalg.norm(b, axis=1)))
    kmax = float(k.max())
    return 1.0 / kmax if kmax > 0 else math.inf


def refazer(A, B, dA, dB, comprimento, nos, caimento=0.0, partida=None):
    """A curva do cabo com o comprimento liso acertado a 0,02%: refaz a haste com o comprimento escalado (a mesma iteração da família).
    Devolve { nos, esquerda, direita, comprimento, raio, estado }; estado é 'ok' ou 'estica' (as pontas longe demais para o comprimento)."""
    A = np.asarray(A, dtype=float)
    B = np.asarray(B, dtype=float)
    dA = _unitario(dA)
    dB = _unitario(dB)
    Lr = float(comprimento)
    chute = partida
    try:
        for _ in range(5):
            r = resolver(A, B, dA, dB, Lr, nos, caimento, chute)
            if r['violacao'] > 1e-8 and chute is not None:
                r = resolver(A, B, dA, dB, Lr, nos, caimento, None)
            if r['violacao'] > 1e-8:
                raise ErroDaCurva('a haste não converge')
            esq, dir_ = tangentes_e_alcas(r['nos'], dA, dB)
            liso = comprimento_liso(r['nos'], esq, dir_)
            if abs(liso / comprimento - 1) < PRECISAO_DA_CURVA:
                break
            Lr *= comprimento / liso
            chute = r['nos']
        return {'nos': r['nos'], 'esquerda': esq, 'direita': dir_, 'comprimento': liso, 'raio': raio_minimo(r['nos']), 'estado': 'ok', 'iteracoes': r['iteracoes']}
    except ErroDaCurva:
        reta = A[None, :] + (B - A)[None, :] * np.linspace(0.0, 1.0, nos)[:, None]
        return {'nos': reta, 'esquerda': reta.copy(), 'direita': reta.copy(), 'comprimento': float(np.linalg.norm(B - A)), 'raio': math.inf, 'estado': 'estica', 'iteracoes': 0}
