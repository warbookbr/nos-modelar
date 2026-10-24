# perfil.py — o perfil de um detalhe de borda (cordão, moldura, calha, lábio) lido do contorno de um corte do pacote cego, em
# milímetro e no formato do `perfil` do `friso`. Sem malha e sem Blender (Python do sistema com Pillow e numpy); ler-perfil.py o
# chama, e leitura.py dá o contorno do corte (ler_corte).
#
# O contorno de um corte é a pele cortada por um plano. O detalhe é um relevo que corre ao longo de uma linha de feição, e o que
# o friso quer é a seção dele no plano NORMAL à linha. A leitura faz três coisas:
#
# 1. A base. A chapa sem o detalhe se ajusta a duas faixas do contorno, uma de cada lado do trecho do detalhe (um polinômio de
#    grau 1 a 3 no quadro da corda dos flancos), e atravessa o trecho por interpolação. O ajuste dá o erro previsto da base no
#    meio do trecho, que soma ao erro de leitura do corte.
# 2. O trecho. Com uma caixa no plano do corte ele é dado; com um ponto (a travessia da linha de feição com o plano) a janela
#    cresce em cada lado, em passos de 1,4, até o contorno voltar à base a menos do erro de leitura nas duas pontas, e o detalhe
#    é o que passa desse erro.
# 3. O plano. O detalhe é invariante ao longo da linha (tangente t), de modo que cada ponto do corte vai à seção normal por
#    projeção ao longo de t, que é exata: u = (p - p0) . (n x t) e v = (p - p0) . n, com n a normal da chapa (t x tangente da
#    base no plano, para fora) e p0 o ponto da base sob a âncora. A convenção é a do friso (u = normal x tangente, v pela normal,
#    v = 0 na linha), em metro no `perfil` e em mm nos campos `_mm`. O corte oblíquo mostra o detalhe maior que ele é (a largura
#    por 1 / fator_largura e a altura por 1 / fator_altura), e o erro da direção de t entra como erro da projeção.
#
# O perfil sai aberto (o contorno do detalhe, de base a base) e fechado (o polígono simples que o friso aceita, com o fundo
# `fundo_mm` abaixo da menor altura da base). O friso só acrescenta à chapa: o que desce abaixo da base sai medido em
# `abaixo_da_chapa_mm` e avisado.
import math, os, sys
import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
if AQUI not in sys.path:
    sys.path.insert(0, AQUI)
import leitura as L  # noqa: E402

EIXOS = 'xyz'
FLANCO_MINIMO_MM = 8.0      # uma faixa de chapa com menos que isto não ajusta a base
JANELA_INICIAL_MM = 15.0    # meia janela com que a busca do trecho começa
JANELA_MAXIMA_MM = 250.0    # a busca não passa daqui de cada lado do ponto
CRESCIMENTO_DA_JANELA = 1.4
FAIXA_DAS_PONTAS_MM = 6.0   # o contorno tem de voltar à base nesta faixa de cada ponta da janela
DOBRA_MAXIMA_DA_BASE_GRAUS = 25.0  # acima disto os flancos da base não são a mesma chapa
OBLIQUIDADE_MAXIMA_GRAUS = 60.0  # acima disto o plano quase contém a linha, e o perfil se estica demais


class ErroDoPerfil(Exception):
    pass


def _unitario(v):
    v = np.asarray(v, float)
    n = float(np.linalg.norm(v))
    if n < 1e-12:
        raise ErroDoPerfil('vetor nulo')
    return v / n


def _arco(P):
    return np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))])


def _indices(c):
    return EIXOS.index(c['eixo']), *(EIXOS.index(x) for x in c['eixos_uv'])


def embutir(c, Q):
    """Pontos (u, w) do plano do corte, em mm, como pontos 3D em mm."""
    e, u, w = _indices(c)
    Q = np.atleast_2d(np.asarray(Q, float))
    P = np.zeros((len(Q), 3))
    P[:, e] = c['valor_mm']
    P[:, u], P[:, w] = Q[:, 0], Q[:, 1]
    return P


def vetor_no_plano(c, d):
    """O vetor (du, dw) do plano do corte como vetor 3D."""
    _, u, w = _indices(c)
    V = np.zeros(3)
    V[u], V[w] = d[0], d[1]
    return V


def normal_do_corte(c):
    V = np.zeros(3)
    V[EIXOS.index(c['eixo'])] = 1.0
    return V


# ---------- o contorno do corte e o trecho ----------

def _saida(Q, fim, k=4):
    """A direção unitária com que o contorno Q sai por uma ponta (fim = 0 é o começo, 1 o fim), pelos k pontos mais perto dela."""
    d = Q[0] - Q[min(k, len(Q) - 1)] if fim == 0 else Q[-1] - Q[max(len(Q) - 1 - k, 0)]
    n = float(np.linalg.norm(d))
    return d / n if n > 1e-9 else np.zeros(2)


def _sem_recuo(R, ponta, te, limite=8):
    """R (que começa perto de `ponta`) sem os primeiros pontos que ficam atrás dela no sentido te, até `limite` pontos."""
    ok = np.nonzero((R[:limite] - ponta) @ te > 0)[0]
    return R[int(ok[0]):] if len(ok) else R


def estender_cadeia(Q, outros, tol, cos_minimo=0.5):
    """O contorno Q com as peças de `outros` que o continuam: a leitura quebra o traço onde ele cruza a si mesmo (a calha enrolada) e
    onde se encontram três ramos, e a peça que começa a até `tol` mm da ponta de Q e segue na mesma direção (cosseno da
    direção de saída pelo de entrada acima de cos_minimo) entra na cadeia, a de menor distância e giro primeiro. Devolve (Q, usadas)."""
    usadas = set()
    for _ in range(8):
        melhor = None
        for ei in (0, 1):
            pe, te = (Q[0], _saida(Q, 0)) if ei == 0 else (Q[-1], _saida(Q, 1))
            for k, R in enumerate(outros):
                if k in usadas or len(R) < 2:
                    continue
                for er in (0, 1):
                    pr = R[0] if er == 0 else R[-1]
                    d = float(np.linalg.norm(pe - pr))
                    if d > tol:
                        continue
                    # R deixa o encontro andando para dentro dela: o oposto de sua saída pela ponta do encontro
                    tr = -_saida(R, er)
                    cos = float(te @ tr)
                    if cos < cos_minimo:
                        continue
                    custo = d / tol + (1.0 - cos)
                    if melhor is None or custo < melhor[0]:
                        melhor = (custo, ei, k, er)
        if melhor is None:
            break
        _, ei, k, er = melhor
        R = outros[k]
        te = _saida(Q, ei)
        # a peça começa no encontro, a até tol da ponta de Q, e pode recuar antes de seguir: os pontos que ficam atrás da ponta
        # de Q, no sentido de saída dela, saem, para o encontro não fazer um gancho
        if ei == 1:
            Rn = R if er == 0 else R[::-1]
            Q = np.vstack([Q, _sem_recuo(Rn, Q[-1], te)])
        else:
            Rn = R if er == 1 else R[::-1]
            Q = np.vstack([_sem_recuo(Rn[::-1], Q[0], te)[::-1], Q])
        usadas.add(k)
    return Q, usadas


def escolher_polilinha(c, alvo=None, caixa=None, perto_mm=12.0, unir=True):
    """A polilinha do corte que carrega o detalhe: entre as que passam a até perto_mm do ponto `alvo` (u, w em mm) ou têm pelo
    menos três pontos dentro da `caixa` (u0, u1, w0, w1), a mais longa, porque a leitura quebra o traço onde ele cruza a si mesmo e
    as peças curtas do laço não são a chapa. Devolve (índice, pontos Q, fechada, comprimento acumulado s, s do alvo, peças que
    sobram). A cadeia ganha as peças que a continuam (estender_cadeia). A fechada se abre no lado oposto ao alvo, para o detalhe
    ficar no meio."""
    cand, mais_perto = [], None
    for i, p in enumerate(c['polilinhas']):
        Q = np.asarray(p['pontos_mm'], float)
        if len(Q) < 4:
            continue
        if caixa is not None:
            ok = int(((Q[:, 0] >= caixa[0]) & (Q[:, 0] <= caixa[1]) & (Q[:, 1] >= caixa[2]) & (Q[:, 1] <= caixa[3])).sum()) >= 3
            dist = 0.0 if ok else float('inf')
        else:
            dist = float(np.linalg.norm(Q - alvo, axis=1).min())
            ok = dist <= perto_mm
        if mais_perto is None or dist < mais_perto:
            mais_perto = dist
        if ok:
            cand.append((-float(p.get('comprimento_mm') or L.comprimento(Q)), dist, i))
    centro = np.asarray(alvo if alvo is not None else [(caixa[0] + caixa[1]) / 2, (caixa[2] + caixa[3]) / 2], float)
    if not cand:
        if caixa is not None:
            raise ErroDoPerfil(f'o corte {c["corte"]}: nenhum contorno tem três pontos dentro da caixa {list(caixa)}')
        if mais_perto is None:
            raise ErroDoPerfil(f'o corte {c["corte"]} não tem contorno com pontos suficientes')
        raise ErroDoPerfil(f'o corte {c["corte"]}: o contorno mais perto do ponto {np.round(centro, 1).tolist()} fica a {mais_perto:.1f} mm, '
                           f'mais que os {perto_mm:g} mm que a leitura da linha explica (--perto-mm)')
    i = sorted(cand)[0][2]
    p = c['polilinhas'][i]
    Q = np.asarray(p['pontos_mm'], float)
    fechada = bool(p.get('fechada'))
    if fechada:
        k = int(np.argmin(np.linalg.norm(Q - centro, axis=1)))
        Q = np.roll(Q, len(Q) // 2 - k, axis=0)
    outros = [np.asarray(q['pontos_mm'], float) for j, q in enumerate(c['polilinhas']) if j != i and len(q['pontos_mm']) >= 2]
    usadas = set()
    if not fechada and unir:
        Q, usadas = estender_cadeia(Q, outros, max(3.0 * float(c.get('erro_mm') or 0.0), 3.0))
    sobras = [R for k, R in enumerate(outros) if k not in usadas]
    s = _arco(Q)
    k = int(np.argmin(np.linalg.norm(Q - centro, axis=1)))
    return i, Q, fechada, s, float(s[k]), sobras


# ---------- a base ----------

class Base:
    """A chapa sem o detalhe, ajustada às faixas de contorno dos dois lados do trecho, no quadro da corda dos flancos: x é a
    posição ao longo da corda em unidades de 100 mm e y é a distância a ela, em mm."""

    def __init__(self, origem, ex, coef, cov, sigma, rms, grau, n, flancos_mm, de_um_lado):
        self.origem, self.ex, self.ey = origem, ex, np.array([-ex[1], ex[0]])
        self.coef, self.cov, self.sigma, self.rms, self.grau, self.n = coef, cov, sigma, rms, grau, n
        self.flancos_mm, self.de_um_lado = flancos_mm, de_um_lado

    def coordenadas(self, Q):
        R = np.asarray(Q, float) - self.origem
        return (R @ self.ex) / 100.0, R @ self.ey

    def y(self, x):
        return np.polyval(self.coef, x)

    def inclinacao(self, x):
        """dy/dX com X em mm."""
        return np.polyval(np.polyder(self.coef), x) / 100.0

    def ponto(self, x):
        x = np.asarray(x, float)
        return self.origem + (x * 100.0)[..., None] * self.ex + self.y(x)[..., None] * self.ey

    def erro_previsto(self, x):
        """2 sigma da base em x (mm): o desvio do ajuste vezes a raiz da alavanca de x."""
        x = np.atleast_1d(np.asarray(x, float))
        A = np.vander(x, self.grau + 1)
        return 2.0 * self.sigma * np.sqrt(np.maximum(np.einsum('ij,jk,ik->i', A, self.cov, A), 0.0))


def ajustar_base(Q, s, sa, sb, flanco, folga, grau, erro):
    """A base do contorno Q (comprimento acumulado s) para o trecho [sa, sb], com faixas de `flanco` mm que começam `folga` mm
    fora dele. `grau` é 1, 2, 3 ou 'auto' (o menor grau que o seguinte não melhora de forma significativa)."""
    esq = (s >= sa - folga - flanco) & (s <= sa - folga)
    dire = (s >= sb + folga) & (s <= sb + folga + flanco)
    comp = lambda m: float(s[m][-1] - s[m][0]) if m.sum() >= 3 else 0.0
    ok_e, ok_d = comp(esq) >= FLANCO_MINIMO_MM, comp(dire) >= FLANCO_MINIMO_MM
    if not ok_e and not ok_d:
        raise ErroDoPerfil('o contorno não tem chapa em volta do trecho (nenhuma das duas faixas chega a '
                           f'{FLANCO_MINIMO_MM:g} mm); dê um trecho menor ou outro corte')
    m = (esq if ok_e else np.zeros_like(esq)) | (dire if ok_d else np.zeros_like(dire))
    P = Q[m]
    if ok_e and ok_d:
        ex = _unitario(Q[dire].mean(0) - Q[esq].mean(0))
    else:
        ex = _unitario(P[-1] - P[0]) if comp(m) > 0 else np.array([1.0, 0.0])
        _, _, vt = np.linalg.svd(P - P.mean(0), full_matrices=False)
        ex = vt[0] if vt[0] @ ex > 0 else -vt[0]
    origem = P.mean(0)
    ey = np.array([-ex[1], ex[0]])
    x, y = ((P - origem) @ ex) / 100.0, (P - origem) @ ey
    n = len(x)
    pares = len(np.unique(np.round(x, 4)))

    def ajuste(k):
        k = min(k, max(pares - 1, 0))
        coef = np.polyfit(x, y, k)
        return k, coef, float(np.sum((y - np.polyval(coef, x)) ** 2))
    de_um_lado = not (ok_e and ok_d)
    if grau != 'auto':
        k, coef, rss = ajuste(int(grau) if not de_um_lado else min(int(grau), 2))
    else:
        # o menor grau que o seguinte não melhora de forma significativa (teste F, com limiar alto porque os pontos vizinhos se
        # parecem); a base atravessa o trecho entre as faixas, e uma reta numa chapa abaulada erra a flecha no meio dele
        k, coef, rss = ajuste(1)
        # numa faixa só, a base se estende pelo trecho e um grau a mais erra muito: no máximo o 2, e só com 40 mm de chapa
        maximo = 3 if not de_um_lado else (2 if comp(m) >= 40.0 else 1)
        for limiar, kk in ((10.0, 2), (25.0, 3)):
            if k != kk - 1 or n <= kk + 2 or kk > maximo:
                break
            k2, coef2, rss2 = ajuste(kk)
            if rss2 > 0 and (rss - rss2) / (rss2 / max(n - kk - 1, 1)) > limiar:
                k, coef, rss = k2, coef2, rss2
    rms = math.sqrt(rss / n)
    A = np.vander(x, k + 1)
    cov = np.linalg.pinv(A.T @ A)
    sigma = max(rms * math.sqrt(n / max(n - k - 1, 1)), erro / 3.0)
    return Base(origem, ex, coef, cov, sigma, rms, k, n, [round(comp(esq), 1), round(comp(dire), 1)], de_um_lado)


def _pe(x, dev, s, i, sentido, alcance_mm=6.0, janela_mm=3.0):
    """A posição x em que o contorno encontra a base ao pé do detalhe, a partir do primeiro (sentido -1) ou do último (sentido
    +1) ponto que passa do erro de leitura: a reta ajustada aos pontos a até janela_mm dele para dentro do detalhe, levada ao
    desvio nulo, a no máximo alcance_mm para fora. O pé que sobe devagar passa do erro longe da base, e a reta o traz de volta;
    num degrau a reta é vertical e o pé fica no ponto."""
    k = np.arange(len(s))
    ks = k[((k - i) * -sentido >= 0) & (np.abs(s - s[i]) <= janela_mm)]
    if len(ks) < 3 or float(np.ptp(x[ks])) < 1e-9:
        return float(x[i])
    b, a = np.polyfit(x[ks], dev[ks], 1)
    if abs(b) < 1e-9:
        return float(x[i])
    fora = (-a / b - x[i]) * sentido
    return float(x[i] + sentido * min(max(fora, 0.0), alcance_mm / 100.0))


def _corridas(dev, s, limite, lacuna_mm=4.0, minimo_mm=3.0):
    """Os índices do primeiro e do último ponto do detalhe: as corridas de pontos com |desvio| acima do limite, unidas quando a
    lacuna é de até lacuna_mm, e só as que têm minimo_mm de comprimento ou um pico de duas vezes o limite contam, de modo que o
    ruído de leitura no limite do erro não alarga o detalhe. Devolve [primeiro, último] ou vazio."""
    corridas = []
    for i in np.nonzero(np.abs(dev) > limite)[0]:
        if corridas and s[i] - s[corridas[-1][1]] <= lacuna_mm:
            corridas[-1][1] = int(i)
        else:
            corridas.append([int(i), int(i)])
    boas = [c for c in corridas if s[c[1]] - s[c[0]] >= minimo_mm or float(np.abs(dev[c[0]:c[1] + 1]).max()) >= 2 * limite]
    return np.array([boas[0][0], boas[-1][1]]) if boas else np.array([], int)


# ---------- o quadro do perfil ----------

def quadro_do_perfil(c, b2, t3, fora3):
    """(n, u) em 3D: a normal da chapa, perpendicular à tangente t3 e à direção b2 da base no plano do corte, virada para fora
    (n . fora3 > 0), e u = n x t, o eixo do perfil do friso. Devolve também o produto que mede o quão perto a linha corre do
    plano (|t x b|: 1 é a linha normal à base no plano)."""
    b3 = vetor_no_plano(c, b2)
    n = np.cross(t3, b3)
    q = float(np.linalg.norm(n))
    if q < 0.3:
        raise ErroDoPerfil(f'o corte {c["corte"]} é quase paralelo à linha de feição (|t x b| = {q:.2f}); use outro corte')
    n /= q
    if n @ fora3 < 0:
        n = -n
    return n, np.cross(n, t3), q


def projetar(P, p0, n, u):
    R = np.asarray(P, float) - p0
    return np.stack([R @ u, R @ n], 1)


def _simples(P):
    """Se o polígono P (n x 2) não se cruza: nenhum par de arestas não vizinhas se corta."""
    n = len(P)
    A, B = P, np.roll(P, -1, axis=0)

    def cruza(i, j):
        d1, d2 = B[i] - A[i], B[j] - A[j]
        den = d1[0] * d2[1] - d1[1] * d2[0]
        if abs(den) < 1e-12:
            return False
        r = A[j] - A[i]
        t = (r[0] * d2[1] - r[1] * d2[0]) / den
        u = (r[0] * d1[1] - r[1] * d1[0]) / den
        return 1e-9 < t < 1 - 1e-9 and 1e-9 < u < 1 - 1e-9
    return not any(cruza(i, j) for i in range(n) for j in range(i + 2, n) if not (i == 0 and j == n - 1))


def _cruzamento(a, b, c, d):
    """O ponto em que o segmento a-b cruza o c-d por dentro dos dois, ou None."""
    r, s = b - a, d - c
    den = r[0] * s[1] - r[1] * s[0]
    if abs(den) < 1e-12:
        return None
    q = c - a
    t, u = (q[0] * s[1] - q[1] * s[0]) / den, (q[0] * r[1] - q[1] * r[0]) / den
    return a + t * r if 1e-9 < t < 1 - 1e-9 and 1e-9 < u < 1 - 1e-9 else None


def _circulo(P):
    """O círculo que melhor segue os pontos P (mínimos quadrados algébricos): (centro, raio, desvio rms em mm)."""
    A = np.c_[2 * P, np.ones(len(P))]
    sol = np.linalg.lstsq(A, (P ** 2).sum(1), rcond=None)[0]
    c = sol[:2]
    r = math.sqrt(max(sol[2] + c @ c, 0.0))
    return c, r, float(np.sqrt(np.mean((np.linalg.norm(P - c, axis=1) - r) ** 2)))


def tirar_lacos(P, erro):
    """O contorno aberto P (n x 2) sem os laços em que ele cruza a si mesmo (a calha ou o lábio que a pele enrola): devolve o
    contorno sem eles e, de cada laço que passa do ruído (largura e altura de mais de 2 vezes o erro de leitura), o polígono, o
    círculo ajustado e o desvio dele. O friso toma um polígono simples, e o laço enrolado se faz com um friso de perfil circular."""
    P = np.asarray(P, float)
    lacos, descartados = [], 0
    for _ in range(12):
        achou = None
        for i in range(len(P) - 1):
            for j in range(i + 2, len(P) - 1):
                X = _cruzamento(P[i], P[i + 1], P[j], P[j + 1])
                if X is not None:
                    achou = (i, j, X)
                    break
            if achou:
                break
        if not achou:
            break
        i, j, X = achou
        laco = np.vstack([[X], P[i + 1:j + 1], [X]])
        P = np.vstack([P[:i + 1], [X], P[j + 1:]])
        if np.ptp(laco, axis=0).max() < 2 * max(erro, 0.1) or abs(_area(laco[:-1])) < (2 * max(erro, 0.1)) ** 2:
            descartados += 1
            continue
        c, r, d = _circulo(laco[:-1])
        lacos.append({'poligono_mm': np.round(laco, 3).tolist(), 'centro_mm': np.round(c, 3).tolist(), 'raio_mm': round(r, 3),
                      'desvio_do_circulo_mm': round(d, 3), 'largura_mm': round(float(np.ptp(laco[:, 0])), 2), 'altura_mm': round(float(np.ptp(laco[:, 1])), 2),
                      'perfil': {'circulo': {'raio': round(r / 1000.0, 6), 'centro': np.round(c / 1000.0, 6).tolist()}}})
    return P, lacos, descartados


def _area(P):
    return 0.5 * float(np.sum(P[:, 0] * np.roll(P[:, 1], -1) - np.roll(P[:, 0], -1) * P[:, 1]))


def _fechar(aberto, piso):
    """O polígono do friso: o contorno aberto de base a base e o fundo em v = piso, no sentido anti-horário."""
    P = np.vstack([aberto, [aberto[-1][0], piso], [aberto[0][0], piso]])
    return P if _area(P) > 0 else P[::-1]


def _cruzamentos_da_linha(P, e, valor):
    """As travessias da curva 3D P (mm) com o plano eixo e = valor: [(ponto, tangente unitária)], a tangente com 10 mm de braço."""
    s = _arco(P)
    d = P[:, e] - valor
    d = np.where(d == 0, 1e-9, d)
    out = []
    for i in np.nonzero(d[:-1] * d[1:] < 0)[0]:
        f = d[i] / (d[i] - d[i + 1])
        X = P[i] + f * (P[i + 1] - P[i])
        sx = s[i] + f * (s[i + 1] - s[i])
        q = lambda t: np.array([np.interp(t, s, P[:, k]) for k in range(3)])
        t = q(min(sx + 10.0, s[-1])) - q(max(sx - 10.0, 0.0))
        if np.linalg.norm(t) > 1e-9:
            out.append((X, t / np.linalg.norm(t)))
    return out


def travessias_da_linha(c, curva, perto=None):
    """Onde a curva 3D `curva` (mm) atravessa o plano do corte c: [(ponto 3D, tangente)], as mais perto de `perto` (ponto 3D)
    primeiro. Sem `perto`, na ordem da curva."""
    e = EIXOS.index(c['eixo'])
    t = _cruzamentos_da_linha(np.asarray(curva, float), e, c['valor_mm'])
    if perto is not None:
        t.sort(key=lambda x: float(np.linalg.norm(x[0] - np.asarray(perto, float))))
    return t


# ---------- o perfil de um corte ----------

def perfil_do_corte(c, alvo=None, caixa=None, tangente=None, fora=None, ancora=None, janela_mm=None, flanco_mm=30.0, folga_mm=3.0,
                    grau='auto', fundo_mm=5.0, perto_mm=12.0, erro_tangente_graus=None, simplificar_mm=None, unir=True):
    """O perfil do detalhe de borda que o corte `c` (de ler_corte) mostra.

    alvo: (u, w) em mm, o ponto do contorno onde a linha de feição atravessa o plano; a janela do detalhe cresce em volta dele.
    caixa: (u0, u1, w0, w1) em mm no plano do corte; o detalhe é o trecho do contorno dentro dela (a janela não cresce).
    tangente: a direção 3D da linha de feição (o sentido em que o friso a percorre); sem ela, a normal do corte.
    fora: um vetor 3D que aponta para fora da chapa; sem ele, o lado oposto ao centro dos contornos do corte.
    ancora: 'linha' (o ponto sob `alvo`, o padrão com alvo), 'centro' (o meio do detalhe, o padrão com caixa), 'inicio' ou 'fim'.
    janela_mm: a meia janela fixa em volta de `alvo`; sem ela, a busca cresce até o contorno voltar à base."""
    if alvo is None and caixa is None:
        raise ErroDoPerfil('dê o ponto do detalhe no corte (alvo) ou a caixa dele')
    erro = float(c.get('erro_mm') or 0.0)
    avisos = []
    i_pol, Q, fechada, s, s0, sobras = escolher_polilinha(c, None if alvo is None else np.asarray(alvo, float),
                                                          None if caixa is None else np.asarray(caixa, float), perto_mm, unir)
    ancora = ancora or ('linha' if alvo is not None else 'centro')
    if ancora == 'linha' and alvo is None:
        raise ErroDoPerfil('a âncora `linha` precisa do ponto da linha no corte (alvo); com caixa use centro, inicio ou fim')

    # o trecho
    if caixa is not None:
        dentro = np.nonzero((Q[:, 0] >= caixa[0]) & (Q[:, 0] <= caixa[1]) & (Q[:, 1] >= caixa[2]) & (Q[:, 1] <= caixa[3]))[0]
        if len(dentro) < 3:
            raise ErroDoPerfil(f'a caixa {list(caixa)} pega só {len(dentro)} pontos do contorno de {c["corte"]}')
        if dentro[-1] - dentro[0] + 1 != len(dentro):
            avisos.append('o contorno sai da caixa e volta: o trecho vai do primeiro ao último ponto dentro dela')
        janelas = [(float(s[dentro[0]]), float(s[dentro[-1]]))]
    elif janela_mm is not None:
        janelas = [(s0 - float(janela_mm), s0 + float(janela_mm))]
    else:
        janelas = None

    def avaliar(sa, sb):
        base = ajustar_base(Q, s, sa, sb, flanco_mm, folga_mm, grau, erro)
        idx = np.nonzero((s >= sa) & (s <= sb))[0]
        x, y = base.coordenadas(Q[idx])
        return base, idx, x, y - base.y(x)

    def pontas(sa, sb, idx, dev):
        faixa = lambda m: float(np.abs(dev[m]).max()) if m.any() else 0.0
        return faixa(s[idx] <= sa + FAIXA_DAS_PONTAS_MM), faixa(s[idx] >= sb - FAIXA_DAS_PONTAS_MM)

    if janelas is None:
        wl = wr = JANELA_INICIAL_MM
        for _ in range(80):
            sa, sb = s0 - wl, s0 + wr
            base, idx, x, dev = avaliar(sa, sb)
            de, dd = pontas(sa, sb, idx, dev)
            volta_e, volta_d = de <= erro, dd <= erro
            # cresce um lado por vez, o que mais se afasta da base: uma ponta dentro do detalhe entorta a base e faz a outra
            # ponta parecer fora dela, e crescer as duas alargaria a janela sem necessidade
            candidatos = []
            if not volta_e and wl < JANELA_MAXIMA_MM and sa - folga_mm - FLANCO_MINIMO_MM > s[0]:
                candidatos.append((de, 'e'))
            if not volta_d and wr < JANELA_MAXIMA_MM and sb + folga_mm + FLANCO_MINIMO_MM < s[-1]:
                candidatos.append((dd, 'd'))
            if not candidatos:
                break
            if max(candidatos)[1] == 'e':
                wl = min(wl * CRESCIMENTO_DA_JANELA, JANELA_MAXIMA_MM)
            else:
                wr = min(wr * CRESCIMENTO_DA_JANELA, JANELA_MAXIMA_MM)
    else:
        sa, sb = janelas[0]
        base, idx, x, dev = avaliar(sa, sb)
        de, dd = pontas(sa, sb, idx, dev)
        volta_e, volta_d = de <= erro, dd <= erro
    # o contorno que acaba dentro do detalhe (a borda livre da chapa, como o lábio de um vão) não volta à base daquele lado
    livre_e = bool(idx[0] == 0 and abs(dev[0]) > erro)
    livre_d = bool(idx[-1] == len(Q) - 1 and abs(dev[-1]) > erro)
    if livre_e or livre_d:
        avisos.append('o contorno acaba dentro do detalhe (borda livre da chapa): o perfil termina ali, sem voltar à base')
    volta_e, volta_d = volta_e or livre_e, volta_d or livre_d
    if not volta_e:
        avisos.append(f'o contorno não volta à base na ponta de entrada do trecho (desvio de {de:.1f} mm, erro de leitura de {erro:.1f} mm): '
                      'o detalhe é mais largo que a janela ou a base não o acompanha; alargue o trecho')
    if not volta_d:
        avisos.append(f'o contorno não volta à base na ponta de saída do trecho (desvio de {dd:.1f} mm, erro de leitura de {erro:.1f} mm): '
                      'o detalhe é mais largo que a janela ou a base não o acompanha; alargue o trecho')
    if base.de_um_lado:
        avisos.append('a base saiu de um lado só da chapa (o contorno acaba perto do detalhe) e foi estendida em reta: confira a altura')
    erro_base = float(base.erro_previsto(x[len(x) // 2:len(x) // 2 + 1])[0]) if len(x) else 0.0
    dobra = math.degrees(abs(math.atan(base.inclinacao(x[-1])) - math.atan(base.inclinacao(x[0])))) if len(x) else 0.0
    if dobra > DOBRA_MAXIMA_DA_BASE_GRAUS:
        avisos.append(f'os dois flancos da base formam um canto de {dobra:.0f} graus: o trecho é uma dobra da chapa, e o perfil sai relativo à '
                      'corda e inclui a dobra inteira; leia o detalhe de uma caixa que não a contenha')
    fora_do_erro = _corridas(dev, s[idx], erro)
    if not len(fora_do_erro):
        return {'corte': c['corte'], 'detalhe': False, 'desvio_maximo_mm': round(float(np.abs(dev).max()), 3),
                'erro_leitura_mm': round(erro, 3), 'avisos': avisos + ['nenhum ponto do trecho passa do erro de leitura: o detalhe não aparece neste corte']}
    i1, i2 = int(fora_do_erro[0]), int(fora_do_erro[1])
    sj = s[idx]
    # a janela e o alcance do pé crescem com o erro de leitura: com 2 mm de erro valem os 3 e os 6 mm de sempre, e num corte ampliado,
    # com 0,2 mm de erro, uma janela de 3 mm pegaria a rampa inteira de um cordão de 10 mm e levaria o pé a mais de 1 mm de onde está
    janela_pe, alcance_pe = min(3.0, max(0.75, 1.5 * erro)), min(6.0, max(1.5, 3.0 * erro))
    xs = np.array([float(x[i1]) if livre_e else _pe(x, dev, sj, i1, -1, alcance_pe, janela_pe),
                   float(x[i2]) if livre_d else _pe(x, dev, sj, i2, 1, alcance_pe, janela_pe)])

    # o quadro do perfil
    t_dado = tangente is not None
    t3 = _unitario(tangente) if t_dado else normal_do_corte(c)
    e_k = normal_do_corte(c)
    obliquidade = math.degrees(math.acos(min(1.0, abs(float(t3 @ e_k)))))
    if obliquidade > OBLIQUIDADE_MAXIMA_GRAUS:
        raise ErroDoPerfil(f'o corte {c["corte"]} corta a linha a {obliquidade:.0f} graus da normal dele, acima de '
                           f'{OBLIQUIDADE_MAXIMA_GRAUS:g}: o plano quase contém a linha; use um corte mais perto da normal')
    todos = np.vstack([np.asarray(p['pontos_mm'], float) for p in c['polilinhas'] if len(p['pontos_mm'])])

    def quadro_em(x_a):
        """(p0 2D, b2, n, u, fora, de onde veio o fora) com a âncora em x_a ao longo da base."""
        p0 = base.ponto(np.array([x_a]))[0]
        b2 = _unitario(base.ex + base.inclinacao(x_a) * base.ey)
        if fora is not None:
            f3, por = _unitario(fora), 'declarada'
        else:
            d = p0 - todos.mean(0)
            f3, por = (_unitario(vetor_no_plano(c, d)), 'oposta ao centro dos contornos do corte') if np.linalg.norm(d) > 1e-6 else (np.array([0.0, 1.0, 0.0]), 'y')
        n, u, _ = quadro_do_perfil(c, b2, t3, f3)
        return p0, b2, n, u, f3, por
    if ancora == 'linha':
        xb = np.linspace(x[0], x[-1], max(int((x[-1] - x[0]) * 400), 8))
        Pb = base.ponto(xb)
        x_a = float(xb[int(np.argmin(np.linalg.norm(Pb - np.asarray(alvo, float), axis=1)))])
    else:
        x_a = (xs[0] + xs[-1]) / 2
        if ancora in ('inicio', 'fim'):
            # o começo e o fim são os de u (o eixo do friso), e não os do contorno, que depende do sentido em que o corte é lido
            p0_, _, n_, u_, _, _ = quadro_em(x_a)
            us = [float((embutir(c, base.ponto(np.array([xe])))[0] - embutir(c, p0_[None])[0]) @ u_) for xe in (xs[0], xs[-1])]
            x_a = float((xs[0], xs[-1])[int(np.argmin(us) if ancora == 'inicio' else np.argmax(us))])
    p0_2d, b2, n3, u3, fora3, fora_por = quadro_em(x_a)
    if abs(float(n3 @ fora3)) < 0.2:
        avisos.append(f'o lado de fora da chapa é incerto aqui (a normal fica a {math.degrees(math.acos(min(1.0, abs(float(n3 @ fora3))))):.0f} graus de perpendicular '
                      'ao palpite); declare `fora`')
    p0_3 = embutir(c, p0_2d[None])[0]
    contorno3 = embutir(c, np.vstack(([] if livre_e else [base.ponto(xs[:1])]) + [Q[idx[i1:i2 + 1]]] + ([] if livre_d else [base.ponto(xs[1:])])))
    base_x = np.linspace(xs.min(), xs.max(), max(int((xs.max() - xs.min()) * 400), 8))
    base3 = embutir(c, base.ponto(base_x))

    # a projeção: fatores (o que o corte mostra a mais) e erro da direção de t
    b3 = vetor_no_plano(c, b2)
    c3 = np.cross(e_k, b3)
    fator_largura = abs(float(b3 @ u3))
    fator_altura = abs(float(c3 @ n3))
    delta = erro_tangente_graus if erro_tangente_graus is not None else 0.0
    erro_proj = 0.0
    if delta > 0 and t_dado:
        d = math.radians(delta)
        ref = projetar(contorno3, p0_3, n3, u3)
        for eixo in (u3, n3):
            for sg in (1, -1):
                t_ = t3 * math.cos(d) + sg * np.cross(eixo, t3) * math.sin(d)
                try:
                    n_, u_, _ = quadro_do_perfil(c, b2, t_, fora3)
                except ErroDoPerfil:
                    continue
                erro_proj = max(erro_proj, float(np.abs(projetar(contorno3, p0_3, n_, u_) - ref).max()))

    # o perfil aberto: do ponto da base antes do primeiro ao ponto da base depois do último
    aberto = projetar(contorno3, p0_3, n3, u3)
    pb = projetar(base3, p0_3, n3, u3)
    ordem = np.argsort(pb[:, 0])
    ub, vb = pb[ordem, 0], pb[ordem, 1]
    base_em = lambda u: np.interp(u, ub, vb)
    if aberto[0, 0] > aberto[-1, 0]:
        aberto = aberto[::-1]   # o perfil anda no sentido de u crescente, qualquer que seja o sentido em que o corte é lido
    alt = aberto[:, 1] - base_em(aberto[:, 0])
    passo = simplificar_mm if simplificar_mm is not None else min(max(0.25 * erro, 0.1), 0.5)
    leve = L.simplificar(aberto, passo)
    leve, lacos, nos = tirar_lacos(leve, erro)
    # os laços que a leitura quebrou do traço: peças curtas que encostam no contorno ao pé do detalhe
    caixa_do_detalhe = np.array([Q[idx[i1:i2 + 1]].min(0) - 10.0, Q[idx[i1:i2 + 1]].max(0) + 10.0])
    tol_anexo = max(3.0 * erro, 3.0)
    for R in sobras:
        if len(R) < 4 or L.comprimento(R) > 250.0 or L.comprimento(R) < 3.0 * max(erro, 0.1):
            continue
        if not (np.all(R.mean(0) >= caixa_do_detalhe[0]) and np.all(R.mean(0) <= caixa_do_detalhe[1])):
            continue
        if float(np.linalg.norm(Q[idx[i1:i2 + 1]][:, None] - R[[0, -1]][None], axis=2).min()) > tol_anexo:
            continue
        Pl = projetar(embutir(c, R), p0_3, n3, u3)
        if np.ptp(Pl, axis=0).max() < 2 * max(erro, 0.1):
            continue
        cc, rr, dd = _circulo(Pl)
        poli = np.vstack([Pl, Pl[:1]])
        lacos.append({'poligono_mm': np.round(poli, 3).tolist(), 'centro_mm': np.round(cc, 3).tolist(), 'raio_mm': round(rr, 3),
                      'desvio_do_circulo_mm': round(dd, 3), 'largura_mm': round(float(np.ptp(Pl[:, 0])), 2), 'altura_mm': round(float(np.ptp(Pl[:, 1])), 2),
                      'anexo': True, 'perfil': {'circulo': {'raio': round(rr / 1000.0, 6), 'centro': np.round(cc / 1000.0, 6).tolist()}}})
    if lacos:
        avisos.append(f'o contorno enrola {len(lacos)} vez(es) sobre si mesmo (calha ou lábio enrolado): o friso toma um polígono simples, e o '
                      'polígono sai sem o laço, que vai em `lacos` com o círculo ajustado, para um segundo friso de perfil circular')
    piso = float(min(aberto[:, 1].min(), vb.min())) - float(fundo_mm)
    fechado = _fechar(leve, piso)
    valido = _simples(fechado)
    if not valido:
        avisos.append('o polígono fechado se cruza (o contorno lido tem uma volta ou um laço): redesenhe o perfil à mão a partir do aberto, ou '
                      'dê uma caixa mais justa')
    abaixo = float(max(0.0, -alt.min()))
    if abaixo > erro:
        avisos.append(f'o detalhe desce até {abaixo:.1f} mm abaixo da chapa: o friso só acrescenta à chapa e não o refaz; a depressão fica por conta '
                      'da própria chapa')
    if obliquidade > 30.0:
        avisos.append(f'o corte atravessa a linha a {obliquidade:.0f} graus da normal dele: a largura lida no corte é {1 / fator_largura:.2f} vezes a do perfil '
                      f'e a altura, {1 / fator_altura:.2f} vezes; a projeção já corrigiu isto, e um corte mais normal à linha dá menos erro')
    erro_total = erro + erro_base + erro_proj
    metro = lambda P: np.round(P / 1000.0, 6).tolist()
    return {
        'corte': c['corte'], 'detalhe': True, 'polilinha': i_pol, 'ancora': ancora,
        'ponto_da_ancora_mm': np.round(p0_3, 2).tolist(),
        'tangente': np.round(t3, 4).tolist(), 'tangente_dada': t_dado, 'normal': np.round(n3, 4).tolist(),
        'direcao_u': np.round(u3, 4).tolist(), 'fora_por': fora_por,
        'trecho_s_mm': [round(float(s[idx[i1]]), 1), round(float(s[idx[i2]]), 1)],
        'janela_mm': [round(float(s0 - sa), 1), round(float(sb - s0), 1)] if alvo is not None else None,
        'projecao': {'obliquidade_graus': round(obliquidade, 1), 'fator_largura': round(fator_largura, 4), 'fator_altura': round(fator_altura, 4),
                     'erro_da_tangente_mm': round(erro_proj, 3), 'incerteza_da_tangente_graus': round(delta, 2)},
        'base': {'grau': base.grau, 'residuo_rms_mm': round(base.rms, 3), 'erro_previsto_mm': round(erro_base, 3), 'faixas_mm': base.flancos_mm,
                 'de_um_lado': base.de_um_lado, 'dobra_entre_flancos_graus': round(dobra, 1),
                 'queda_nas_pontas_mm': round(float(abs(vb[0] - vb[-1])), 3)},
        'largura_mm': round(float(aberto[:, 0].max() - aberto[:, 0].min()), 2),
        'altura_mm': round(float(alt.max()), 2), 'abaixo_da_chapa_mm': round(abaixo, 2),
        'u_min_mm': round(float(aberto[:, 0].min()), 2), 'u_max_mm': round(float(aberto[:, 0].max()), 2),
        'u_da_linha_mm': 0.0 if ancora == 'linha' else None,
        'erro_mm': {'leitura': round(erro, 3), 'base': round(erro_base, 3), 'projecao': round(erro_proj, 3), 'total': round(erro_total, 3)},
        'ponta_livre': bool(livre_e or livre_d),
        'perfil_aberto_mm': np.round(leve, 3).tolist(), 'perfil_mm': np.round(fechado, 3).tolist(), 'perfil': metro(fechado),
        'perfil_valido': bool(valido), 'fundo_mm': float(fundo_mm), 'lacos': lacos, 'nos_descartados': nos,
        'perfil_se_a_linha_for_percorrida_ao_contrario': metro(_fechar(leve * np.array([-1.0, 1.0]), piso)),
        'base_no_quadro_mm': np.round(np.stack([ub, vb], 1)[::max(len(ub) // 40, 1)], 3).tolist(),
        'lido_mm': np.round(Q[idx[max(i1 - 40, 0):i2 + 41]], 2).tolist(),
        'avisos': avisos,
        '_interno': {'aberto': aberto, 'ub': ub, 'vb': vb},
    }


# ---------- vários cortes do mesmo detalhe ----------

def _hausdorff(A, B, passo=0.5):
    RA, RB = L.reamostrar(A, passo), L.reamostrar(B, passo)
    sa, sb = L.segmentos([{'pontos': RA.tolist(), 'fechada': False}]), L.segmentos([{'pontos': RB.tolist(), 'fechada': False}])
    d_ab, d_ba = L.distancia_a_segmentos(RA, *sb), L.distancia_a_segmentos(RB, *sa)
    return float(max(d_ab.max(), d_ba.max())), float(np.sqrt((np.concatenate([d_ab, d_ba]) ** 2).mean()))


def combinar(perfis, fundo_mm=5.0):
    """O que os perfis dos cortes dizem em conjunto: a variação entre eles (largura, altura, e a maior distância entre os
    contornos, que é o quanto um perfil sozinho erra os outros), o representante (o contorno cujo pior desvio para os demais é o
    menor) e, quando todos são função de u, o perfil médio sobre a base de cada um."""
    ok = [p for p in perfis if p.get('detalhe')]
    if not ok:
        return None
    ab = [np.asarray(p['_interno']['aberto'], float) for p in ok]
    esp = lambda a: (float(a.min()), float(a.max()))
    larg = [p['largura_mm'] for p in ok]
    alt = [p['altura_mm'] for p in ok]
    n = len(ok)
    H = np.zeros((n, n))
    R = np.zeros((n, n))
    for i in range(n):
        for j in range(i + 1, n):
            H[i, j], R[i, j] = _hausdorff(ab[i], ab[j])
            H[j, i], R[j, i] = H[i, j], R[i, j]
    k = int(np.argmin(H.max(1))) if n > 1 else 0
    saida = {'cortes': [p['corte'] for p in ok], 'representante': ok[k]['corte'],
             'largura_mm': {'min': min(larg), 'max': max(larg), 'variacao': round(max(larg) - min(larg), 2)},
             'altura_mm': {'min': min(alt), 'max': max(alt), 'variacao': round(max(alt) - min(alt), 2)},
             'distancia_maxima_entre_perfis_mm': round(float(H.max()), 2) if n > 1 else 0.0,
             'distancia_rms_entre_perfis_mm': round(float(R.max()), 2) if n > 1 else 0.0,
             'erro_de_leitura_mm': round(max(p['erro_mm']['total'] for p in ok), 2),
             'por_corte': {p['corte']: {'distancia_maxima_ao_representante_mm': round(float(H[i, k]), 2)} for i, p in enumerate(ok)},
             'perfil': ok[k]['perfil'], 'perfil_mm': ok[k]['perfil_mm']}
    saida['variacao_acima_do_erro'] = bool(n > 1 and H.max() > saida['erro_de_leitura_mm'])
    # a média só vale se cada contorno é função de u (u cresce, a menos de 0,3 mm)
    if n > 1 and all(np.all(np.diff(a[:, 0]) > -1.5 * max(p['erro_mm']['leitura'], 0.2)) for a, p in zip(ab, ok)):
        lo, hi = min(esp(a[:, 0])[0] for a in ab), max(esp(a[:, 0])[1] for a in ab)
        grade = np.arange(lo, hi + 0.25, 0.5)
        alturas = []
        for a, p in zip(ab, ok):
            u = np.maximum.accumulate(a[:, 0])
            v = np.interp(grade, u, a[:, 1])
            fora = (grade < u[0]) | (grade > u[-1])
            base = np.interp(grade, p['_interno']['ub'], p['_interno']['vb'])
            alturas.append(np.where(fora, base, v))
        media = np.stack([grade, np.mean(alturas, 0)], 1)
        piso = float(media[:, 1].min() - fundo_mm)
        saida['perfil_medio_mm'] = np.round(media, 3).tolist()
        saida['perfil_medio'] = np.round(_fechar(media, piso) / 1000.0, 6).tolist()
    return saida


# ---------- a imagem ----------

def desenhar(res, c, saida):
    """Uma imagem por corte: o contorno lido em volta do trecho com a base e as pontas do detalhe, e o perfil no quadro do
    friso, com a base e o polígono fechado."""
    from PIL import Image, ImageDraw
    import imagens as IM
    if not res.get('detalhe'):
        return False
    W, H = 1500, 640
    im = Image.new('RGB', (W, H), 'white')
    dr = ImageDraw.Draw(im)
    f = IM.fonte(14)

    def painel(x0, pts_por_cor, titulo, grade_mm=10):
        todos = np.vstack([p for p, _, _ in pts_por_cor])
        lo, hi = todos.min(0), todos.max(0)
        m = 0.12 * float(max(hi - lo))
        lo, hi = lo - m, hi + m
        esc = min(700.0 / (hi[0] - lo[0]), 540.0 / (hi[1] - lo[1]))
        px = lambda p: (x0 + 25 + (p[0] - lo[0]) * esc, 590 - (p[1] - lo[1]) * esc)
        for g in range(int(math.floor(lo[0] / grade_mm)), int(math.ceil(hi[0] / grade_mm)) + 1):
            X = px((g * grade_mm, 0))[0]
            dr.line([(X, 50), (X, 590)], fill=(205, 210, 250) if g % 5 else (140, 150, 240))
            if g % 5 == 0:
                dr.text((X - 12, 596), f'{g * grade_mm:g}', fill=(0, 40, 140), font=f)
        for g in range(int(math.floor(lo[1] / grade_mm)), int(math.ceil(hi[1] / grade_mm)) + 1):
            Y = px((0, g * grade_mm))[1]
            dr.line([(x0 + 25, Y), (x0 + 725, Y)], fill=(205, 235, 205) if g % 5 else (130, 200, 130))
            if g % 5 == 0:
                dr.text((x0 - 2, Y - 8), f'{g * grade_mm:g}', fill=(20, 100, 20), font=f)
        for P, cor, larg in pts_por_cor:
            dr.line([px(p) for p in P], fill=cor, width=larg)
        dr.text((x0 + 25, 20), titulo, fill='black', font=f)
    lido = np.asarray(res['lido_mm'], float)
    base = np.asarray(res['base_no_quadro_mm'], float)
    painel(0, [(lido, (0, 0, 0), 2)], f"corte {res['corte']}: contorno lido em mm (u, w do plano), grade de 10 mm")
    painel(750, [(np.asarray(res['perfil_mm'] + [res['perfil_mm'][0]], float), (230, 120, 0), 1),
                 (base, (0, 90, 220), 2),
                 (np.asarray(res['perfil_aberto_mm'], float), (0, 0, 0), 2)],
           f"perfil no quadro do friso (u, v) em mm: {res['largura_mm']} de largura, {res['altura_mm']} de altura; azul, a base")
    os.makedirs(os.path.dirname(os.path.abspath(saida)), exist_ok=True)
    im.save(saida)
    return True


def sem_interno(d):
    """Copia sem os campos que só o cálculo usa."""
    if isinstance(d, dict):
        return {k: sem_interno(v) for k, v in d.items() if k != '_interno'}
    if isinstance(d, list):
        return [sem_interno(v) for v in d]
    return d
