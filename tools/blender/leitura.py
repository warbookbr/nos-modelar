# leitura.py — lê as imagens do pacote cego e devolve o traço em milímetro, sem malha e sem Blender. Roda no Python do
# sistema com Pillow e numpy; ler-corte.py, ler-linhas.py e comparar-cortes.py o chamam.
#
# O que se lê é só o que o pacote entrega: os desenhos dos cortes com cortes/quadro.json, as vistas de linhas de feição com
# vistas/camera.json e vistas/grade.json. O traço sai em nível exato: cada ponto do esqueleto do traço anda ao longo da normal
# até o meio das duas bordas, onde a tinta interpolada cruza a metade, e não por faixas de linha ou coluna. O desenho do
# pacote não tem antisserrilhado, de modo que a borda de um traço reto alinhado a um eixo só se sabe a meio pixel; o erro
# estimado de cada leitura parte desse meio pixel, soma metade da variação da espessura medida e vai a milímetro pela escala.
#
# Quadro de cada leitura: no corte, (u, v) do plano, com os eixos de quadro.json (plano x: z e y; plano y: x e z; plano z: x
# e y); na vista alinhada a dois eixos, as coordenadas do mundo dos dois eixos da imagem; na vista oblíqua, a projeção nos
# eixos da câmera. Tudo em milímetro.
import json, math, os, sys
import numpy as np
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
if AQUI not in sys.path:
    sys.path.insert(0, AQUI)
import imagens as IM  # noqa: E402

EIXOS = 'xyz'


def erro(msg):
    print(f'ERRO: {msg}', file=sys.stderr)
    sys.exit(2)


def argumentos(argv=None):
    """--chave valor, ou --chave sozinha como verdadeiro; hífen vira sublinhado."""
    argv = sys.argv[1:] if argv is None else argv
    a, i = {}, 0
    while i < len(argv):
        t = argv[i]
        if not t.startswith('--'):
            erro(f'argumento solto: {t}')
        k = t[2:].replace('-', '_')
        if i + 1 < len(argv) and not argv[i + 1].startswith('--'):
            a[k] = argv[i + 1]
            i += 2
        else:
            a[k] = True
            i += 1
    return a


def gravar_json(dados, saida):
    texto = json.dumps(dados, ensure_ascii=False, indent=1)
    if saida:
        os.makedirs(os.path.dirname(os.path.abspath(saida)), exist_ok=True)
        open(saida, 'w').write(texto + '\n')
    else:
        print(texto)


# ---------- máscaras ----------

def desloca(A, dy, dx):
    """A deslocada de (dy, dx) px, com zero no que entra pela borda."""
    out = np.zeros_like(A)
    H, W = A.shape
    out[max(dy, 0):H + min(dy, 0), max(dx, 0):W + min(dx, 0)] = A[max(-dy, 0):H + min(-dy, 0), max(-dx, 0):W + min(-dx, 0)]
    return out


def preencher(B, U, alcance=3):
    """Pixel desconhecido (U) vira tinta quando há tinta dos dois lados dele numa mesma direção, a até alcance px: fecha a
    falha que a marca da cota, a letra ou a linha de outra cor deixa ao passar por cima do traço, sem engordar o traço."""
    if not U.any():
        return B
    novo = np.zeros_like(B)
    for dy, dx in ((0, 1), (1, 0), (1, 1), (1, -1)):
        a = np.zeros_like(B)
        b = np.zeros_like(B)
        for k in range(1, alcance + 1):
            a |= desloca(B, k * dy, k * dx)
            b |= desloca(B, -k * dy, -k * dx)
        novo |= a & b
    return B | (U & novo)


def afinar(B):
    """Esqueleto de um pixel por Zhang e Suen, vetorizado, no recorte que contém a tinta."""
    if not B.any():
        return B.copy()
    ys, xs = np.nonzero(B)
    y0, y1, x0, x1 = max(ys.min() - 1, 0), ys.max() + 2, max(xs.min() - 1, 0), xs.max() + 2
    I = B[y0:y1, x0:x1].astype(np.uint8)
    while True:
        mudou = False
        for passo in (0, 1):
            P = np.pad(I, 1)
            p2, p3, p4, p5 = P[:-2, 1:-1], P[:-2, 2:], P[1:-1, 2:], P[2:, 2:]
            p6, p7, p8, p9 = P[2:, 1:-1], P[2:, :-2], P[1:-1, :-2], P[:-2, :-2]
            viz = [p2, p3, p4, p5, p6, p7, p8, p9]
            n = sum(v.astype(np.int16) for v in viz)
            seq = viz + [p2]
            trans = sum(((seq[i] == 0) & (seq[i + 1] == 1)).astype(np.int16) for i in range(8))
            if passo == 0:
                c = ((p2 & p4 & p6) == 0) & ((p4 & p6 & p8) == 0)
            else:
                c = ((p2 & p4 & p8) == 0) & ((p2 & p6 & p8) == 0)
            tira = (I == 1) & (n >= 2) & (n <= 6) & (trans == 1) & c
            if tira.any():
                I[tira] = 0
                mudou = True
        if not mudou:
            break
    S = np.zeros_like(B)
    S[y0:y1, x0:x1] = I.astype(bool)
    return S


# ---------- esqueleto em caminhos ----------

def _caminhos_do_esqueleto(S):
    """Caminhos do esqueleto entre pontas e junções, e os laços, pela vizinhança mista (a diagonal só conta quando os dois
    vizinhos de lado que ela pula estão vazios), que dá grau 2 a todo pixel de traço simples. Cada caminho é um dicionário com
    os pontos (centros de pixel, x = coluna + 0,5), o nó do começo e do fim (índice do pixel) e se é fechado."""
    ys, xs = np.nonzero(S)
    n = len(ys)
    if not n:
        return [], set()
    H, W = S.shape
    idx = -np.ones(S.shape, np.int64)
    idx[ys, xs] = np.arange(n)
    Sp = np.pad(S, 1)
    adj = [[] for _ in range(n)]
    for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)):
        tem = Sp[1 + ys + dy, 1 + xs + dx]
        if dy and dx:
            tem &= ~Sp[1 + ys + dy, 1 + xs] & ~Sp[1 + ys, 1 + xs + dx]
        for i in np.nonzero(tem)[0]:
            adj[i].append(int(idx[ys[i] + dy, xs[i] + dx]))
    for a in adj:
        a.sort()
    grau = np.array([len(a) for a in adj])
    e_no = grau != 2
    usado = set()
    caminhos = []
    pt = lambda k: (xs[k] + 0.5, ys[k] + 0.5)
    for i in np.nonzero(e_no)[0]:
        for j in adj[i]:
            if (min(i, j), max(i, j)) in usado:
                continue
            usado.add((min(i, j), max(i, j)))
            cam, ant, cur = [i, j], i, j
            while not e_no[cur]:
                prox = adj[cur][0] if adj[cur][0] != ant else adj[cur][1]
                e = (min(cur, prox), max(cur, prox))
                if e in usado:
                    break
                usado.add(e)
                cam.append(prox)
                ant, cur = cur, prox
            caminhos.append({'pts': np.array([pt(k) for k in cam], float), 'ini': int(cam[0]), 'fim': int(cam[-1]), 'fechado': False})
    visto = np.zeros(n, bool)
    for a, b in usado:
        visto[a] = visto[b] = True
    for i in range(n):
        if visto[i] or e_no[i]:
            continue
        cam, ant, cur = [i], -1, i
        visto[i] = True
        while True:
            prox = [q for q in adj[cur] if q != ant]
            if not prox or prox[0] == i or visto[prox[0]]:
                break
            cam.append(prox[0])
            visto[prox[0]] = True
            ant, cur = cur, prox[0]
        if len(cam) >= 3:
            caminhos.append({'pts': np.array([pt(k) for k in cam], float), 'ini': None, 'fim': None, 'fechado': True})
    soltas = {int(k) for k in np.nonzero(grau == 1)[0]}
    return caminhos, soltas


def comprimento(P, fechado=False):
    if len(P) < 2:
        return 0.0
    s = float(np.linalg.norm(np.diff(P, axis=0), axis=1).sum())
    return s + (float(np.linalg.norm(P[-1] - P[0])) if fechado else 0.0)


def _fundir_grau2(caminhos):
    """Junta os caminhos que se encontram num nó onde só eles chegam; o caminho que volta ao próprio começo fecha."""
    while True:
        pontas = {}
        for k, c in enumerate(caminhos):
            if not c['fechado']:
                pontas.setdefault(c['ini'], []).append((k, 0))
                pontas.setdefault(c['fim'], []).append((k, 1))
        alvo = next((lst for _, lst in sorted(pontas.items()) if len(lst) == 2), None)
        if alvo is None:
            return caminhos
        (k1, l1), (k2, l2) = alvo
        if k1 == k2:
            c = caminhos[k1]
            caminhos[k1] = {'pts': c['pts'][:-1], 'ini': None, 'fim': None, 'fechado': True}
            continue
        a, b = caminhos[k1], caminhos[k2]
        pa, ini = (a['pts'][::-1], a['fim']) if l1 == 0 else (a['pts'], a['ini'])
        pb, fim = (b['pts'][::-1], b['ini']) if l2 == 1 else (b['pts'], b['fim'])
        novo = {'pts': np.vstack([pa, pb[1:]]), 'ini': ini, 'fim': fim, 'fechado': False}
        caminhos = [c for i, c in enumerate(caminhos) if i not in (k1, k2)] + [novo]


def _podar(caminhos, minimo):
    """Tira o esporão do esqueleto (caminho curto de uma ponta solta até uma junção, que o afinamento deixa no canto do traço
    grosso) e junta o que sobra pelos nós de grau 2."""
    caminhos = _fundir_grau2(caminhos)
    for _ in range(4):
        grau = {}
        for c in caminhos:
            if not c['fechado']:
                grau[c['ini']] = grau.get(c['ini'], 0) + 1
                grau[c['fim']] = grau.get(c['fim'], 0) + 1
        tira = [i for i, c in enumerate(caminhos) if not c['fechado'] and comprimento(c['pts']) < minimo
                and sorted((grau[c['ini']], grau[c['fim']]))[0] == 1 and max(grau[c['ini']], grau[c['fim']]) >= 3]
        if not tira:
            break
        caminhos = _fundir_grau2([c for i, c in enumerate(caminhos) if i not in tira])
    return caminhos


# ---------- nível exato ----------

def _bilinear(T, X, Y):
    """T amostrada em (X, Y) em coordenadas de índice (o centro do pixel i em i), com zero fora da imagem."""
    H, W = T.shape
    x0 = np.floor(X).astype(np.int64)
    y0 = np.floor(Y).astype(np.int64)
    fx, fy = X - x0, Y - y0
    out = np.zeros(X.shape)
    for dy, dx, w in ((0, 0, (1 - fx) * (1 - fy)), (0, 1, fx * (1 - fy)), (1, 0, (1 - fx) * fy), (1, 1, fx * fy)):
        yy, xx = y0 + dy, x0 + dx
        ok = (yy >= 0) & (yy < H) & (xx >= 0) & (xx < W)
        out += np.where(ok, T[np.clip(yy, 0, H - 1), np.clip(xx, 0, W - 1)], 0.0) * w
    return out


def _tangentes(P, fechado, k=3):
    n = len(P)
    i = np.arange(n)
    if fechado:
        d = P[(i + k) % n] - P[(i - k) % n]
    else:
        d = P[np.minimum(i + k, n - 1)] - P[np.maximum(i - k, 0)]
    nd = np.linalg.norm(d, axis=1)
    d = np.where(nd[:, None] > 1e-9, d / np.maximum(nd, 1e-9)[:, None], np.array([1.0, 0.0]))
    return d


def nivel_exato(T, P, D, raio=4.0, passo=0.125):
    """Para cada ponto P (px) com tangente D: o perfil da tinta T ao longo da normal, de -raio a +raio, e as duas bordas onde
    ele cruza 0,5 por interpolação linear, na faixa contínua de tinta que contém o ponto. Devolve o meio das bordas como
    deslocamento pela normal, a espessura e se a leitura valeu (sem borda dentro do raio, o ponto fica onde estava)."""
    N = np.stack([-D[:, 1], D[:, 0]], 1)
    ts = np.arange(-raio, raio + 1e-9, passo)
    S = len(ts)
    c = S // 2
    X = P[:, 0:1] + ts[None, :] * N[:, 0:1] - 0.5
    Y = P[:, 1:2] + ts[None, :] * N[:, 1:2] - 0.5
    V = _bilinear(T, X, Y)
    acima = V >= 0.5
    k = np.arange(S)[None, :]
    kl = np.where(~acima & (k < c), k, -1).max(1)
    kr = np.where(~acima & (k > c), k, S).min(1)
    ok = acima[:, c] & (kl >= 0) & (kr < S)
    kl_ = np.clip(kl, 0, S - 2)
    kr_ = np.clip(kr, 1, S - 1)
    r = np.arange(len(P))
    va, vb = V[r, kl_], V[r, kl_ + 1]
    tl = ts[kl_] + (0.5 - va) / np.where(np.abs(vb - va) > 1e-12, vb - va, 1.0) * passo
    va, vb = V[r, kr_ - 1], V[r, kr_]
    tr = ts[kr_ - 1] + (va - 0.5) / np.where(np.abs(va - vb) > 1e-12, va - vb, 1.0) * passo
    desl = np.where(ok, (tl + tr) / 2, 0.0)
    esp = np.where(ok, tr - tl, np.nan)
    return desl, esp, ok, N


def alisar(P, fechado, wmax=8, ang_max=8.0):
    """Tira a escada do traço sem antisserrilhado: cada ponto vai à reta ajustada aos vizinhos a até w pontos de cada lado,
    com o maior w (até wmax) em que a linha não vira mais que ang_max graus entre o trecho de trás e o da frente, de modo que
    o canto não se arredonda (ali w cai a zero e o ponto fica)."""
    n = len(P)
    if n < 5:
        return P
    i = np.arange(n)
    out = P.copy()
    feito = np.zeros(n, bool)
    cos_max = math.cos(math.radians(ang_max))
    for w in range(wmax, 1, -1):
        if fechado:
            ia, ib = (i - w) % n, (i + w) % n
            ok = np.ones(n, bool) if n > 2 * w + 2 else np.zeros(n, bool)
        else:
            ia, ib = i - w, i + w
            ok = (ia >= 0) & (ib < n)
            ia, ib = np.clip(ia, 0, n - 1), np.clip(ib, 0, n - 1)
        d1, d2 = P - P[ia], P[ib] - P
        n1, n2 = np.linalg.norm(d1, axis=1), np.linalg.norm(d2, axis=1)
        cosang = (d1 * d2).sum(1) / np.maximum(n1 * n2, 1e-12)
        ok &= ~feito & (cosang >= cos_max) & (n1 > 0.5 * w) & (n2 > 0.5 * w)
        if not ok.any():
            continue
        k = np.nonzero(ok)[0]
        offs = np.arange(-w, w + 1)
        J = (k[:, None] + offs[None, :]) % n if fechado else np.clip(k[:, None] + offs[None, :], 0, n - 1)
        Q = P[J]
        m = Q.mean(1)
        R = Q - m[:, None, :]
        cxx, cyy, cxy = (R[..., 0] ** 2).sum(1), (R[..., 1] ** 2).sum(1), (R[..., 0] * R[..., 1]).sum(1)
        th = 0.5 * np.arctan2(2 * cxy, cxx - cyy)
        u = np.stack([np.cos(th), np.sin(th)], 1)
        out[k] = m + ((P[k] - m) * u).sum(1)[:, None] * u
        feito[k] = True
    return out


def _estender_ponta(T, P, ponta, alcance=3.0, passo=0.125):
    """A ponta solta do esqueleto fica dentro do traço, perto de meia espessura antes do fim; ela anda pela tangente até onde
    a tinta cruza 0,5, que é o fim do traço desenhado com ponta reta."""
    d = _direcao_da_ponta(P, ponta)
    if not d.any():
        return P
    E = P[0] if ponta == 0 else P[-1]
    ts = np.arange(0, alcance + 1e-9, passo)
    V = _bilinear(T, E[0] + ts * d[0] - 0.5, E[1] + ts * d[1] - 0.5)
    abaixo = np.nonzero(V < 0.5)[0]
    if not len(abaixo) or abaixo[0] == 0:
        return P
    k = abaixo[0]
    t = ts[k - 1] + (V[k - 1] - 0.5) / max(V[k - 1] - V[k], 1e-12) * passo
    if t < 0.05:
        return P
    novo = (E + t * d)[None]
    return np.vstack([novo, P]) if ponta == 0 else np.vstack([P, novo])


def refinar(T, caminhos, soltas=(), iteracoes=2, alisamento=True):
    """Leva cada ponto de cada caminho ao meio do traço pela normal; a tangente da segunda volta sai dos pontos já lidos. A
    ponta solta do esqueleto se estende até o fim do traço."""
    for c in caminhos:
        P0 = c['pts']
        P = P0.copy()
        for _ in range(iteracoes):
            D = _tangentes(P, c['fechado'])
            desl, esp, ok, N = nivel_exato(T, P0, D)
            P = P0 + desl[:, None] * N
        if alisamento:
            P = alisar(P, c['fechado'])
        if not c['fechado'] and len(P) >= 2:
            for ponta, no_ in ((0, c['ini']), (1, c['fim'])):
                if no_ in soltas:
                    antes = len(P)
                    P = _estender_ponta(T, P, ponta)
                    if len(P) > antes:
                        esp = np.insert(esp, 0 if ponta == 0 else len(esp), np.nan)
                        ok = np.insert(ok, 0 if ponta == 0 else len(ok), False)
        c['pts'] = P
        c['espessura'] = esp
        c['lido'] = ok
    return caminhos


# ---------- junção e ruído ----------

def _direcao_da_ponta(P, ponta, k=6):
    """Direção para fora na ponta (0 é o começo, 1 o fim), pelos k pontos mais perto dela."""
    if ponta == 0:
        a, b = P[min(k, len(P) - 1)], P[0]
    else:
        a, b = P[max(len(P) - 1 - k, 0)], P[-1]
    d = b - a
    n = np.linalg.norm(d)
    return d / n if n > 1e-9 else np.zeros(2)


def juntar(linhas, falha_max=10.0, reto_max=0.6):
    """Junta as pontas de linhas abertas a até falha_max px quando seguem uma à outra: a falha aponta para fora das duas pontas
    (ou é menor que 2 px) e as duas direções são quase opostas (1 + cos <= reto_max). Pares escolhidos do mais barato ao mais
    caro, cada ponta uma vez; a linha cujas pontas se juntam fecha. Na junção de três traços, junta os dois mais alinhados."""
    pontas = []
    for k, l in enumerate(linhas):
        if not l['fechado'] and len(l['pts']) >= 2:
            for q in (0, 1):
                pontas.append((k, q, l['pts'][0 if q == 0 else -1], _direcao_da_ponta(l['pts'], q)))
    pares = []
    for i in range(len(pontas)):
        for j in range(i + 1, len(pontas)):
            ki, qi, pi, di = pontas[i]
            kj, qj, pj, dj = pontas[j]
            g = pj - pi
            d = float(np.linalg.norm(g))
            if d > falha_max:
                continue
            if ki == kj and comprimento(linhas[ki]['pts']) < 3 * falha_max:
                continue
            reto = 1 + float(di @ dj)
            if reto > reto_max:
                continue
            if d > 2 and (float(g @ di) / d < 0.7 or float(-g @ dj) / d < 0.7):
                continue
            pares.append((d + 10 * reto, i, j))
    pares.sort()
    usada = set()
    escolhidos = []
    for _, i, j in pares:
        if i in usada or j in usada:
            continue
        usada |= {i, j}
        escolhidos.append((pontas[i][:2], pontas[j][:2]))
    # monta as cadeias: cada linha é um nó com duas pontas; as ligações escolhidas viram arestas
    liga = {}
    for a, b in escolhidos:
        liga[a] = b
        liga[b] = a
    feito = set()
    out = []
    for k, l in enumerate(linhas):
        if l['fechado']:
            out.append(l)
            feito.add(k)
    for k in range(len(linhas)):
        if k in feito:
            continue
        # anda até a ponta livre da cadeia, se houver
        atual, entrada = k, 0
        visitados = {k}
        while (atual, entrada) in liga:
            prox, q = liga[(atual, entrada)]
            if prox in visitados:
                break
            visitados.add(prox)
            atual, entrada = prox, 1 - q
        # percorre a cadeia a partir da ponta livre (atual, entrada), saindo pela outra ponta
        cadeia, esp, lido = [], [], []
        cur, ent = atual, entrada
        fechada = False
        while True:
            feito.add(cur)
            P = linhas[cur]['pts'] if ent == 0 else linhas[cur]['pts'][::-1]
            E = linhas[cur].get('espessura', np.full(len(P), np.nan))
            Ok = linhas[cur].get('lido', np.ones(len(P), bool))
            if ent == 1:
                E, Ok = E[::-1], Ok[::-1]
            cadeia.append(P)
            esp.append(E)
            lido.append(Ok)
            sai = (cur, 1 - ent)
            if sai not in liga:
                break
            prox, q = liga[sai]
            if prox in feito:
                fechada = prox == atual
                break
            cur, ent = prox, q
        P = np.vstack(cadeia)
        out.append({'pts': P, 'fechado': fechada, 'espessura': np.concatenate(esp), 'lido': np.concatenate(lido)})
    return out


def _reta(Q):
    """Reta ajustada aos pontos (ponto médio, direção) e o desvio quadrático médio deles a ela."""
    m = Q.mean(0)
    R = Q - m
    _, sv, vt = np.linalg.svd(R, full_matrices=False)
    return m, vt[0], float(sv[-1] / math.sqrt(len(Q))) if len(sv) > 1 else 0.0


def afiar_cantos(P, fechado, k=5, giro_min=20.0, m=10, desvio_max=2.0, reta_max=0.35):
    """O traço grosso corta o canto vivo: o meio lido passa por dentro da quina, mais quanto mais fechado o ângulo (1,5 px
    num canto de 63 graus com traço de 3 px). Onde a linha vira mais que giro_min graus entre os k pontos de trás e os k da
    frente, e os m pontos de cada lado fora dessa região são retos (desvio quadrático médio até reta_max px), a região vira o
    encontro das duas retas, se ele fica a até desvio_max px do ponto de maior giro; o arredondamento maior que isso fica."""
    n = len(P)
    if n < 2 * (k + m) + 2:
        return P
    i = np.arange(n)
    if fechado:
        ia, ib, ok = (i - k) % n, (i + k) % n, np.ones(n, bool)
    else:
        ok = (i - k >= 0) & (i + k < n)
        ia, ib = np.clip(i - k, 0, n - 1), np.clip(i + k, 0, n - 1)
    d1, d2 = P - P[ia], P[ib] - P
    cosang = (d1 * d2).sum(1) / np.maximum(np.linalg.norm(d1, axis=1) * np.linalg.norm(d2, axis=1), 1e-12)
    giro = np.degrees(np.arccos(np.clip(cosang, -1, 1)))
    canto = ok & (giro > giro_min)
    if not canto.any():
        return P
    if fechado:
        if canto.all():
            return P
        r = int(np.nonzero(~canto)[0][0])   # gira a lista para nenhuma região de canto atravessar o começo
        P, canto, giro = np.roll(P, -r, 0), np.roll(canto, -r), np.roll(giro, -r)
    trocas = []
    j = 0
    while j < n:
        if not canto[j]:
            j += 1
            continue
        i0 = j
        while j < n and canto[j]:
            j += 1
        i1 = j - 1
        antes = np.arange(i0 - m, i0)
        depois = np.arange(i1 + 1, i1 + 1 + m)
        if fechado:
            antes, depois = antes % n, depois % n
        elif antes[0] < 0 or depois[-1] >= n:
            continue
        ma, ua, ra = _reta(P[antes])
        mb, ub, rb = _reta(P[depois])
        if ra > reta_max or rb > reta_max:
            continue
        den = ua[0] * ub[1] - ua[1] * ub[0]
        if abs(den) < math.sin(math.radians(giro_min / 2)):
            continue
        t = ((mb[0] - ma[0]) * ub[1] - (mb[1] - ma[1]) * ub[0]) / den
        X = ma + t * ua
        c = i0 + int(np.argmax(giro[i0:i1 + 1]))
        if np.linalg.norm(X - P[c]) <= desvio_max:
            trocas.append((i0, i1, X))
    if not trocas:
        return P
    partes, ult = [], 0
    for i0, i1, X in trocas:
        partes += [P[ult:i0], X[None]]
        ult = i1 + 1
    partes.append(P[ult:])
    return np.vstack(partes)


def _dedup(P, fechado):
    """Tira pontos repetidos a menos de 0,05 px um do outro (a ponta comum de dois caminhos juntados)."""
    if len(P) < 2:
        return P, np.ones(len(P), bool)
    manter = np.concatenate([[True], np.linalg.norm(np.diff(P, axis=0), axis=1) > 0.05])
    P = P[manter]
    if fechado and len(P) > 2 and np.linalg.norm(P[-1] - P[0]) < 0.05:
        P = P[:-1]
    return P, manter


def tracos(T, U=None, falha_max=10.0, minimo_px=None):
    """Do mapa de tinta T (0 a 1) e dos pixels desconhecidos U: as linhas do traço em px, em nível exato, juntadas e sem
    ruído. Devolve (linhas, resumo), cada linha {pts, fechado, espessura, lido}."""
    B = T >= 0.5
    if U is not None:
        B = preencher(B, U)
        T = np.where(B & (T < 0.5), 1.0, T)
    S = afinar(B)
    cams, soltas = _caminhos_do_esqueleto(S)
    cams = _podar(cams, minimo=8.0)
    cams = refinar(T, cams, soltas)
    esp = np.concatenate([c['espessura'][c['lido']] for c in cams]) if cams else np.zeros(0)
    esp_med = float(np.median(esp)) if len(esp) else float('nan')
    largura = int(round(esp_med)) if esp_med == esp_med else 0
    linhas = juntar(cams, falha_max=falha_max)
    minimo = minimo_px if minimo_px is not None else max(8.0, 3 * (esp_med if esp_med == esp_med else 2.0))
    boas, ruido = [], []
    for l in linhas:
        P, manter = _dedup(l['pts'], l['fechado'])
        l = {**l, 'pts': afiar_cantos(P, l['fechado']), 'espessura': l['espessura'][manter][:len(P)], 'lido': l['lido'][manter][:len(P)]}
        P = l['pts']
        (boas if l['fechado'] or comprimento(P) >= minimo else ruido).append(l)
    resumo = {'espessura_px': round(esp_med, 3) if esp_med == esp_med else None, 'largura_px': largura,
              'espessura_desvio_px': round(float(np.std(esp)), 3) if len(esp) else None,
              'pontos_lidos': int(len(esp)), 'pontos': int(sum(len(c['pts']) for c in cams)),
              'descartadas': len(ruido), 'descartadas_px': round(sum(comprimento(l['pts']) for l in ruido), 1), 'minimo_px': round(minimo, 2)}
    return boas, resumo


def erro_px(resumo):
    """Meio pixel de quantização da borda, mais metade do desvio da espessura medida e, no traço de largura par, mais meio
    pixel: o Pillow desenha o traço par com o pixel a mais do lado direito de quem anda nele, e a imagem não guarda o sentido
    em que cada traço foi desenhado, de modo que o meio lido fica meio pixel para um lado ou para o outro."""
    d = resumo.get('espessura_desvio_px') or 0.0
    largura = resumo.get('largura_px') or 0
    par = largura >= 2 and largura % 2 == 0
    return 0.5 + 0.5 * d + (0.5 if par else 0.0)


def orientar(P, fechado):
    """Ordem determinística: a linha aberta começa na ponta de menor (u, v); a fechada gira no sentido anti-horário e começa
    no ponto de menor (u, v)."""
    if len(P) < 2:
        return P
    if fechado:
        area = 0.5 * float(np.sum(P[:, 0] * np.roll(P[:, 1], -1) - np.roll(P[:, 0], -1) * P[:, 1]))
        if area < 0:
            P = P[::-1]
        k = int(np.lexsort((P[:, 1], P[:, 0]))[0])
        return np.roll(P, -k, axis=0)
    return P if tuple(P[0]) <= tuple(P[-1]) else P[::-1]


def polilinhas_mm(linhas, para_mm, casas=2):
    """Converte as linhas de px para mm pelo mapeamento dado, orienta, ordena pelo comprimento e arredonda."""
    out = []
    for l in linhas:
        Q = orientar(para_mm(l['pts']), l['fechado'])
        out.append({'fechada': bool(l['fechado']), 'comprimento_mm': round(comprimento(Q, l['fechado']), 1),
                    'pontos_mm': np.round(Q, casas).tolist()})
    out.sort(key=lambda d: (-d['comprimento_mm'], d['pontos_mm'][0]))
    return out


# ---------- corte ----------

def tinta_do_corte(rgb, q, nome):
    """Mapa de tinta do desenho de um corte: só o preto neutro do traço conta; a grade, clara e colorida, fica fora pelo
    valor; o vermelho das cotas (anel, linha de ligação, texto) é desconhecido e se preenche onde corta o traço; a caixa do
    título e as faixas dos rótulos dos eixos, fora do quadro de desenho, ficam fora."""
    rgb = rgb.astype(np.int16)
    mx, mn = rgb.max(-1), rgb.min(-1)
    neutro = (mx - mn) < 48
    T = np.where(neutro, 1.0 - mx / 255.0, 0.0)
    U = (rgb[..., 0] - np.maximum(rgb[..., 1], rgb[..., 2])) > 60
    H, W = T.shape
    M = IM.CORTE_M
    fora = np.zeros_like(U)
    fora[:, :M] = True
    fora[H - M:, :] = True
    U_, Vn = q['eixos_uv']
    titulo = IM.titulo_do_corte(nome, q.get('eixo', '?'), q.get('valor', 0.0), U_, Vn, IM.passo_do_corte(q))
    from PIL import ImageDraw
    bb = ImageDraw.Draw(Image.new('RGB', (8, 8))).textbbox((10, 8), titulo, font=IM.fonte(16))
    fora[max(int(bb[1]) - 1, 0):int(math.ceil(bb[3])) + 2, max(int(bb[0]) - 1, 0):int(math.ceil(bb[2])) + 2] = True
    T[fora] = 0.0
    U &= ~fora
    return T, U


def ler_corte(imagem, q, nome, falha_max=10.0, minimo_px=None):
    """Contorno de um corte em mm no plano dele, com o erro estimado."""
    rgb = np.asarray(Image.open(imagem).convert('RGB'))
    if rgb.shape[1] != q['W'] or rgb.shape[0] != q['H']:
        erro(f'{imagem}: {rgb.shape[1]}x{rgb.shape[0]} px, o quadro diz {q["W"]}x{q["H"]}')
    T, U = tinta_do_corte(rgb, q, nome)
    linhas, resumo = tracos(T, U, falha_max=falha_max, minimo_px=minimo_px)
    M, H, esc = IM.CORTE_M, q['H'], q['escala_px_m']

    def para_mm(P):
        return np.stack([(q['u0'] + (P[:, 0] - M) / esc) * 1000, (q['v0'] + (H - M - P[:, 1]) / esc) * 1000], 1)
    px_mm = esc / 1000
    e = erro_px(resumo)
    # a moldura do desenho, fora das faixas dos rótulos: o que o corte mostra, em mm no plano dele
    moldura = [[round(q['u0'] * 1000, 2), round(q['v0'] * 1000, 2)],
               [round((q['u0'] + (q['W'] - M) / esc) * 1000, 2), round((q['v0'] + (H - M) / esc) * 1000, 2)]]
    return {'corte': nome, 'eixo': q.get('eixo'), 'valor_mm': round(1000 * float(q.get('valor', 0.0)), 3), 'eixos_uv': q['eixos_uv'],
            'moldura_mm': moldura,
            'escala_px_por_mm': round(px_mm, 5), 'espessura_traco_px': resumo['espessura_px'],
            'espessura_traco_mm': round(resumo['espessura_px'] / px_mm, 3) if resumo['espessura_px'] else None,
            'erro_px': round(e, 3), 'erro_mm': round(e / px_mm, 3), 'leitura': resumo,
            'polilinhas': polilinhas_mm(linhas, para_mm)}


# ---------- vistas de linhas ----------

FUNDOS = {'branco': (255, 255, 255), 'preto': (0, 0, 0), 'cinza': (150, 150, 150)}


def bases_da_vista(rgb, v, mt, tol=3):
    """Separa o traço da grade, do título e da barra: redesenha a grade da vista (imagens.desenhar_grade, que só depende da
    câmera) sobre um fundo branco, um preto e um cinza do traço de corte, e dá a cada pixel o fundo cuja previsão bate com o
    que se vê. Pixel que nenhuma previsão explica, ou que duas explicam (a letra e a barra, opacas), fica desconhecido.
    Devolve (preto, cinza, desconhecido, registro da grade redesenhada)."""
    H, W = rgb.shape[:2]
    f = IM.fonte(16)
    prev, reg = {}, None
    for nome, cor in FUNDOS.items():
        im = Image.new('RGB', (W, H), cor)
        reg = IM.desenhar_grade(im, v, mt, f)
        prev[nome] = np.asarray(im).astype(np.int16)
    o = rgb.astype(np.int16)
    d = np.stack([np.abs(o - prev[n]).max(-1) for n in FUNDOS], -1)
    ordem = np.sort(d, -1)
    melhor = np.argmin(d, -1)
    claro = (ordem[..., 0] <= tol) & (ordem[..., 1] > ordem[..., 0] + 2)
    nomes = list(FUNDOS)
    preto = claro & (melhor == nomes.index('preto'))
    cinza = claro & (melhor == nomes.index('cinza'))
    desconhecido = ~claro
    return preto, cinza, desconhecido, reg


def eixos_da_vista(mt):
    """(eixo da direção, eixo horizontal, sinal, eixo vertical, sinal) da vista alinhada a dois eixos, ou None."""
    xc, yc = np.array(mt['x_cam'], float), np.array(mt['y_cam'], float)
    if abs(xc).max() < 0.999 or abs(yc).max() < 0.999:
        return None
    ah, av = int(np.argmax(np.abs(xc))), int(np.argmax(np.abs(yc)))
    ad = 3 - ah - av
    return ad, ah, float(np.sign(xc[ah])), av, float(np.sign(yc[av]))


def mapa_da_vista(mt):
    """Função de px para mm no plano da vista e os nomes dos dois eixos."""
    c = np.array(mt['centro'], float)
    s, W, H = mt['escala'], mt['W'], mt['H']
    xc, yc = np.array(mt['x_cam'], float), np.array(mt['y_cam'], float)
    ex = eixos_da_vista(mt)

    def plano(P):
        X = (P[:, 0] - W / 2) * s / W
        Y = (H / 2 - P[:, 1]) * s / W
        return X, Y
    if ex:
        _, ah, sh, av, sv = ex

        def para_mm(P):
            X, Y = plano(P)
            return np.stack([(c[ah] + sh * X) * 1000, (c[av] + sv * Y) * 1000], 1)
        return para_mm, [EIXOS[ah], EIXOS[av]]

    def para_mm(P):
        X, Y = plano(P)
        return np.stack([(c @ xc + X) * 1000, (c @ yc + Y) * 1000], 1)
    return para_mm, ['x_camera', 'y_camera']


def projetar_na_vista(P, mt):
    """Pontos 3D em metro levados a mm no plano da vista, no quadro de mapa_da_vista: na vista alinhada, as coordenadas do
    mundo dos dois eixos da imagem; na oblíqua, a projeção nos eixos da câmera."""
    P = np.asarray(P, float).reshape(-1, 3)
    ex = eixos_da_vista(mt)
    if ex:
        return P[:, [ex[1], ex[3]]] * 1000
    return np.stack([P @ np.array(mt['x_cam'], float), P @ np.array(mt['y_cam'], float)], 1) * 1000


def mm_para_px(Q, mt):
    """O inverso de mapa_da_vista: pontos em mm no plano da vista levados a pixel da imagem dela."""
    Q = np.asarray(Q, float).reshape(-1, 2) / 1000
    c = np.array(mt['centro'], float)
    s, W, H = mt['escala'], mt['W'], mt['H']
    ex = eixos_da_vista(mt)
    if ex:
        _, ah, sh, av, sv = ex
        X, Y = sh * (Q[:, 0] - c[ah]), sv * (Q[:, 1] - c[av])
    else:
        X = Q[:, 0] - c @ np.array(mt['x_cam'], float)
        Y = Q[:, 1] - c @ np.array(mt['y_cam'], float)
    return np.stack([W / 2 + X * W / s, H / 2 - Y * W / s], 1)


def ler_vista_de_linhas(imagem, v, mt, grade=None, falha_max=10.0, minimo_px=None):
    """As linhas de feição (traço preto) e as bordas de corte da caixa (cinza fino) de uma vista, em mm no plano dela."""
    rgb = np.asarray(Image.open(imagem).convert('RGB'))
    if rgb.shape[1] != mt['W'] or rgb.shape[0] != mt['H']:
        erro(f'{imagem}: {rgb.shape[1]}x{rgb.shape[0]} px, a câmera diz {mt["W"]}x{mt["H"]}')
    preto, cinza, desc, reg = bases_da_vista(rgb, v, mt)
    aviso = None
    if grade is not None and (grade.get('rotulos') != reg['rotulos'] or grade.get('barra') != reg['barra']):
        aviso = 'a grade redesenhada não confere com grade.json (outra fonte?); a separação do traço pode falhar'
    para_mm, eixos = mapa_da_vista(mt)
    px_mm = mt['W'] / mt['escala'] / 1000
    out = {'vista': v, 'eixos_uv': eixos, 'alinhada': eixos_da_vista(mt) is not None, 'escala_px_por_mm': round(px_mm, 5),
           'pixels_desconhecidos': int(desc.sum())}
    if aviso:
        out['aviso'] = aviso
    for nome, B, U in (('feicao', preto, desc), ('corte', cinza, desc | preto)):
        linhas, resumo = tracos(B.astype(float), U, falha_max=falha_max, minimo_px=minimo_px)
        e = erro_px(resumo)
        out[nome] = {'espessura_traco_px': resumo['espessura_px'], 'erro_px': round(e, 3), 'erro_mm': round(e / px_mm, 3),
                     'leitura': resumo, 'polilinhas': polilinhas_mm(linhas, para_mm)}
    return out


# ---------- distâncias ----------

def reamostrar(P, passo, fechado=False):
    P = np.asarray(P, float)
    if fechado and len(P) > 2:
        P = np.vstack([P, P[:1]])
    if len(P) < 2:
        return P
    s = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))])
    if s[-1] <= 0:
        return P[:1]
    alvo = np.append(np.arange(0, s[-1], passo), s[-1])
    return np.stack([np.interp(alvo, s, P[:, j]) for j in range(P.shape[1])], 1)


def simplificar(P, eps):
    """Douglas e Peucker: os pontos da polilinha que bastam para ela não se afastar mais que eps da original."""
    n = len(P)
    if n < 3 or eps <= 0:
        return P
    manter = np.zeros(n, bool)
    manter[[0, n - 1]] = True
    pilha = [(0, n - 1)]
    while pilha:
        a, b = pilha.pop()
        if b - a < 2:
            continue
        seg = P[b] - P[a]
        L = np.linalg.norm(seg)
        R = P[a + 1:b] - P[a]
        if L < 1e-12:
            d = np.linalg.norm(R, axis=1)
        else:
            t = np.clip(R @ seg / L ** 2, 0, 1)
            d = np.linalg.norm(R - t[:, None] * seg, axis=1)
        k = int(np.argmax(d))
        if d[k] > eps:
            m = a + 1 + k
            manter[m] = True
            pilha += [(a, m), (m, b)]
    return P[manter]


def segmentos(polis, eps=0.0):
    """(A, B) de todos os segmentos das polilinhas [{pontos, fechada}], simplificadas a eps quando eps > 0."""
    A, B = [], []
    for p in polis:
        P = np.asarray(p['pontos'], float)
        if p.get('fechada') and len(P) > 2:
            P = np.vstack([P, P[:1]])
        P = simplificar(P, eps)
        if len(P) >= 2:
            A.append(P[:-1])
            B.append(P[1:])
        elif len(P) == 1:
            A.append(P)
            B.append(P)
    if not A:
        return np.zeros((0, 2)), np.zeros((0, 2))
    return np.vstack(A), np.vstack(B)


def distancia_a_segmentos(Q, A, B, bloco=2048):
    """Distância de cada ponto Q ao conjunto de segmentos A-B (qualquer dimensão)."""
    if not len(A):
        return np.full(len(Q), np.inf)
    out = np.empty(len(Q))
    D = B - A
    L2 = np.maximum((D * D).sum(1), 1e-18)
    for i in range(0, len(Q), bloco):
        q = Q[i:i + bloco]
        t = np.clip(((q[:, None, :] - A[None]) * D[None]).sum(-1) / L2[None], 0, 1)
        P = A[None] + t[..., None] * D[None]
        out[i:i + bloco] = np.sqrt(((q[:, None, :] - P) ** 2).sum(-1)).min(1)
    return out


def estatisticas(d):
    d = np.asarray(d, float)
    if not len(d):
        return {'n': 0}
    return {'n': int(len(d)), 'media': round(float(d.mean()), 3), 'p95': round(float(np.percentile(d, 95)), 3),
            'maxima': round(float(d.max()), 3)}


def comparar_contornos(lidas, candidatas, erro_mm=0.0, passo=0.5):
    """Distâncias nos dois sentidos entre o contorno lido do pacote e o da candidata, polilinhas [{pontos_mm, fechada}] em
    mm: de cada ponto do lido, a cada passo mm, até a candidata (o que a candidata deixa de seguir), e de cada ponto da
    candidata até o lido (o que ela põe a mais). Cada sentido traz média, p95, máxima, o ponto da máxima e a fração acima do
    erro de leitura, abaixo do qual a distância não se separa do erro de ler o pacote."""
    def pontos(polis):
        Q = [reamostrar(np.asarray(p['pontos_mm'], float), passo, p.get('fechada', False)) for p in polis if len(p['pontos_mm'])]
        return np.vstack(Q) if Q else np.zeros((0, 2))
    seg = lambda polis: segmentos([{'pontos': p['pontos_mm'], 'fechada': p.get('fechada', False)} for p in polis], eps=0.02)
    out = {}
    for nome, de, para in (('pacote_para_candidata_mm', lidas, candidatas), ('candidata_para_pacote_mm', candidatas, lidas)):
        Q = pontos(de)
        d = distancia_a_segmentos(Q, *seg(para)) if len(Q) else np.zeros(0)
        e = estatisticas(d)
        if len(d):
            e['ponto_da_maxima'] = np.round(Q[int(np.argmax(d))], 2).tolist()
            e['fracao_acima_do_erro'] = round(float((d > erro_mm).mean()), 4)
        out[nome] = e
    return out


def distancias_entre_linhas(de, para, passo=1.0):
    """Os pontos de cada polilinha de `de` ([{pontos_mm, fechada}], em qualquer dimensão), a cada passo mm, e a distância
    de cada um à polilinha de `para` mais perto (infinita quando `para` está vazio)."""
    Q = [reamostrar(np.asarray(p['pontos_mm'], float), passo, p.get('fechada', False)) for p in de if len(p['pontos_mm'])]
    Q = np.vstack(Q) if Q else np.zeros((0, 2))
    A, B = segmentos([{'pontos': p['pontos_mm'], 'fechada': p.get('fechada', False)} for p in para], eps=0.02)
    if not len(Q):
        return Q, np.zeros(0)
    return Q, distancia_a_segmentos(Q, A, B, bloco=max(16, 4_000_000 // max(1, len(A))))


def medidas_de_casamento(d_lc, d_cl, comp_lido, comp_cand, tolerancias=(2.0, 5.0), erro_mm=None):
    """Cobertura (fração dos pontos lidos do pacote a até tau de uma linha da candidata), precisão (o contrário) e F1 a cada
    tolerância, o desvio (mediana e p90 da distância do lido à candidata) e, com o erro de leitura, a fração do lido acima
    dele, que é o piso da medida."""
    out = {'comprimento_pacote_mm': round(float(comp_lido), 1), 'comprimento_candidata_mm': round(float(comp_cand), 1)}
    for tau in tolerancias:
        c = round(float((d_lc <= tau).mean()), 3) if len(d_lc) else 0.0
        p = round(float((d_cl <= tau).mean()), 3) if len(d_cl) else 0.0
        out[f'cobertura_{tau:g}mm'], out[f'precisao_{tau:g}mm'] = c, p
        out[f'f1_{tau:g}mm'] = round(2 * c * p / (c + p), 3) if c + p > 0 else 0.0
    fin = d_lc[np.isfinite(d_lc)]
    out['desvio_mediana_mm'] = round(float(np.median(fin)), 3) if len(fin) else None
    out['desvio_p90_mm'] = round(float(np.percentile(fin, 90)), 3) if len(fin) else None
    fin = d_cl[np.isfinite(d_cl)]
    out['excesso_mediana_mm'] = round(float(np.median(fin)), 3) if len(fin) else None
    if erro_mm is not None:
        out['erro_leitura_mm'] = erro_mm
        out['fracao_acima_do_erro'] = round(float((d_lc > erro_mm).mean()), 4) if len(d_lc) else None
    return out


# ---------- linhas 3D por vistas ortogonais ----------

def _pecas_monotonas(P, k, fechada=False, tol=1.0, plano=0.5, minimo=3.0):
    """Divide a polilinha nos trechos em que a coordenada k só cresce ou só decresce (com histerese de tol mm), tira de cada
    trecho a cabeça e a cauda em que k fica a até plano mm do valor da ponta (o trecho reto ao longo do outro eixo, que não é
    função de k) e devolve os trechos cuja extensão em k passa de minimo mm. A fechada começa no menor k."""
    if fechada and len(P) > 2:
        i0 = int(np.argmin(P[:, k]))
        P = np.vstack([P[i0:], P[:i0 + 1]])
    s = P[:, k]
    cortes = [0]
    ext, sentido = 0, 0
    for i in range(1, len(s)):
        if sentido == 0:
            if abs(s[i] - s[cortes[-1]]) > tol:
                sentido = 1 if s[i] > s[cortes[-1]] else -1
                ext = i
        elif (s[i] - s[ext]) * sentido >= 0:
            ext = i
        elif abs(s[i] - s[ext]) > tol:
            cortes.append(ext)
            sentido = -sentido
            ext = i
    cortes.append(len(s) - 1)
    out = []
    for a, b in zip(cortes[:-1], cortes[1:]):
        sg = 1.0 if s[b] >= s[a] else -1.0
        a2 = a
        while a2 + 1 < b and sg * (s[a2 + 1] - s[a]) <= plano:
            a2 += 1
        b2 = b
        while b2 - 1 > a2 and sg * (s[b] - s[b2 - 1]) <= plano:
            b2 -= 1
        Q = P[a2:b2 + 1]
        if len(Q) >= 2 and np.ptp(Q[:, k]) >= minimo:
            out.append(Q)
    return out


def _funcao(Q, k):
    """O trecho como função da coordenada k: (s ordenado, a outra coordenada)."""
    o = np.argsort(Q[:, k], kind='stable')
    return Q[o, k], Q[o, 1 - k]


def preparar_cortes(cortes):
    """Os cortes lidos (ler_corte) prontos para conferir curvas 3D: o plano, os eixos do contorno, a moldura que o desenho
    cobre e os segmentos do contorno, em mm. Corte sem contorno fica de fora."""
    out = []
    for c in cortes:
        pols = [p for p in c.get('polilinhas', []) if len(p['pontos_mm'])]
        if not pols:
            continue
        u, w = (EIXOS.index(x) for x in c['eixos_uv'])
        moldura = c.get('moldura_mm')
        if moldura is None:
            Q = np.vstack([np.asarray(p['pontos_mm'], float) for p in pols])
            folga = 0.15 * float(np.ptp(Q, axis=0).max())
            moldura = [(Q.min(0) - folga).tolist(), (Q.max(0) + folga).tolist()]
        out.append({'nome': c.get('corte'), 'e': EIXOS.index(c['eixo']), 'u': u, 'w': w, 'valor': float(c['valor_mm']),
                    'moldura': np.asarray(moldura, float), 'erro_mm': float(c.get('erro_mm') or 0.0),
                    'seg': segmentos([{'pontos': p['pontos_mm'], 'fechada': p.get('fechada', False)} for p in pols], eps=0.05)})
    return out


def travessias_dos_cortes(P, cortes, simetria_x=False, plano_min=0.25):
    """Onde a curva P (mm, n x 3) atravessa o plano de cada corte preparado, dentro da moldura do desenho, e a distância do
    ponto da travessia ao contorno do corte, no plano dele: [{corte, ponto_mm, distancia_mm, erro_corte_mm}]. O corte que não
    mostra o ponto (a moldura do desenho de meia forma) é conferido pela imagem espelhada do ponto, se a simetria em x vale, e
    com ela o plano x = v também vê a curva da metade x < 0. A curva que corre quase no plano do corte (a componente da
    tangente normal a ele abaixo de plano_min) não localiza a travessia e fica de fora."""
    P = np.asarray(P, float)
    espelho = np.array([-1.0, 1.0, 1.0])
    out = []
    for c in cortes:
        e, u, w = c['e'], c['u'], c['w']
        for Q, vira in ((P, False), (P * espelho, True)):
            if vira and not (simetria_x and e == 0):
                continue
            d = Q[:, e] - c['valor']
            d = np.where(d == 0, 1e-9, d)   # a amostra exatamente no plano conta como do lado positivo, e a travessia não some
            for i in np.nonzero(d[:-1] * d[1:] < 0)[0]:
                f = d[i] / (d[i] - d[i + 1])
                X = Q[i] + f * (Q[i + 1] - Q[i])
                t = Q[min(i + 10, len(Q) - 1)] - Q[max(i - 9, 0)]
                if abs(t[e]) < plano_min * max(np.linalg.norm(t), 1e-9):
                    continue
                q = X[[u, w]]
                dentro = lambda r: bool((r >= c['moldura'][0]).all() and (r <= c['moldura'][1]).all())
                if not dentro(q):
                    if not (simetria_x and 0 in (u, w)):
                        continue
                    q = q * np.array([-1.0 if k == 0 else 1.0 for k in (u, w)])
                    if not dentro(q):
                        continue
                dist = float(distancia_a_segmentos(q[None], *c['seg'])[0])
                out.append({'corte': c['nome'], 'ponto_mm': np.round(X * (espelho if vira else 1.0), 1).tolist(),
                            'distancia_mm': round(dist, 1), 'erro_corte_mm': c['erro_mm']})
    return out


def _conferir_pelos_cortes(P, cortes, erros, vistas, tol_corte_mm=None, simetria_x=False):
    """A conferência de uma curva contra os cortes: as travessias, a tolerância de cada uma e a pior. A tolerância é duas vezes
    o erro combinado das duas vistas que formaram a curva, mais o erro de leitura do corte, e no mínimo 2 mm; tol_corte_mm a
    fixa. Devolve {travessias, distancia_maxima_mm, falha}, em que falha é a travessia que passa da tolerância (a mais longe)
    ou None."""
    tr = travessias_dos_cortes(P, cortes, simetria_x)
    base = 2.0 * math.hypot(*(erros[v] for v in vistas[:2]))
    pior = None
    for t in tr:
        t['tolerancia_mm'] = round(tol_corte_mm if tol_corte_mm is not None else max(2.0, base + t['erro_corte_mm']), 2)
        if t['distancia_mm'] > t['tolerancia_mm'] and (pior is None or t['distancia_mm'] > pior['distancia_mm']):
            pior = t
    return {'travessias': tr, 'distancia_maxima_mm': max((t['distancia_mm'] for t in tr), default=None), 'falha': pior}


def _aceitar(validos, terceira, simetria_x, tol_mm, folga_iou, nA, nB, destino):
    """A regra de aceitação de linhas_3d sobre os pares válidos de um par de direções: acrescenta a destino as curvas cuja
    correspondência é inequívoca e devolve quantas ficaram ambíguas."""
    memo, ambiguas = {}, 0

    def unico(lado, idx, chave):
        """Se o par chave é o único parceiro do trecho idx: só contam os pares cuja faixa comum fica a até folga_iou
        da melhor do trecho, e com simetria em x a curva espelhada de outra conta como a mesma."""
        if (lado, idx) not in memo:
            chaves = [k for k in validos if k[lado] == idx]
            melhor = max(validos[k][2] for k in chaves)
            chaves = [k for k in chaves if validos[k][2] >= melhor - folga_iou]
            grupos = []
            for k in chaves:
                P = validos[k][0]
                Pm = P * np.array([-1.0, 1.0, 1.0])
                if not (simetria_x and any(np.median(distancia_a_segmentos(Q[::4], *sg)) <= tol_mm for G, sg in grupos for Q in (P, Pm))):
                    grupos.append((P, segmentos([{'pontos': P}], eps=0.1) if simetria_x else None))
            memo[(lado, idx)] = (set(chaves), len(grupos))
        chaves, n = memo[(lado, idx)]
        return chave in chaves and n == 1
    for (ia, ib), (P, confere, _) in sorted(validos.items()):
        ua = unico(0, ia, (ia, ib))
        ub = unico(1, ib, (ia, ib))
        if terceira and ua and ub:
            conf = 'alta'
        elif (terceira and (ua or ub)) or (not terceira and ua and ub):
            conf = 'media'
        else:
            ambiguas += 1
            continue
        destino.append({'pontos': P, 'confianca': conf, 'vistas': [nA, nB] + ([terceira[0]] if terceira else []),
                        'terceira_vista_confere': None if confere is None else round(confere, 3)})
    return ambiguas


def _sem_repeticoes(aceitas, tol_mm):
    """Tira as repetições: em ordem de confiança e comprimento, cada curva perde os trechos a até tol_mm das já aceitas."""
    ordem = sorted(aceitas, key=lambda c: (c['confianca'] != 'alta', -comprimento(c['pontos']), c['pontos'][0].tolist()))
    finais, seg_a, seg_b = [], [], []   # os segmentos de cada final se calculam uma vez, quando ele entra
    for c in ordem:
        P = c['pontos']
        if finais:
            livre = distancia_a_segmentos(P, np.vstack(seg_a), np.vstack(seg_b)) > tol_mm
        else:
            livre = np.ones(len(P), bool)
        i = 0
        while i < len(P):
            if not livre[i]:
                i += 1
                continue
            j = i
            while j < len(P) and livre[j]:
                j += 1
            Q = P[i:j]
            if comprimento(Q) >= max(5.0, 3 * tol_mm):
                finais.append({**c, 'pontos': Q})
                a, b = segmentos([{'pontos': Q}], eps=0.1)
                seg_a.append(a)
                seg_b.append(b)
            i = j
    return finais


def linhas_3d(leituras, cameras, tol_mm=None, simetria_x=False, passo=1.0, classe='feicao', folga_iou=0.15, cortes=None,
              tol_corte_mm=None, cortes_no_casamento=True):
    """Casa as linhas de duas vistas alinhadas de direções diferentes pelo eixo que elas dividem e devolve as polilinhas 3D
    cuja correspondência é inequívoca. Cada par de trechos (um por vista, monótonos no eixo comum, com sobreposição de pelo
    menos metade do menor) dá uma curva candidata; com uma terceira vista, a candidata só vale se a projeção dela cai sobre o
    traço dessa vista (90% das amostras a até tol_mm). A candidata entra quando um dos dois trechos tem só esse par válido
    (com simetria em x, o par espelhado conta como o mesmo, e só contam os pares cuja faixa comum no eixo, dividida pela
    união das duas faixas, fica a até folga_iou da melhor do trecho, de modo que o traço que acaba antes não empata), com a
    confiança 'alta' quando os dois lados são únicos e a terceira vista confere e 'media' quando só um lado é único com a
    terceira vista ou os dois são únicos sem ela. As demais são ambíguas e só se contam. Curvas repetidas por pares
    diferentes de vistas entram uma vez.

    Com os cortes lidos do pacote (ler_corte), cada curva é conferida onde atravessa o plano de um corte: o ponto da travessia
    tem de cair perto do contorno daquele corte (tolerância em _conferir_pelos_cortes, ou tol_corte_mm). A terceira vista não
    separa as curvas de um feixe de linhas paralelas mais juntas que tol_mm, nem a leitura separa as que o traço funde, e a
    curva que o par de vistas monta entre elas pode não estar sobre nenhuma; o corte, que mostra a pele no plano, as separa. O
    par cuja curva falha na conferência deixa de ser candidato antes da regra de unicidade (cortes_no_casamento), de modo que
    o parceiro verdadeiro, que a curva falsa tornava ambíguo, pode entrar. Sai em recusadas_pelos_cortes cada curva que o
    casamento sem os cortes devolveria e a conferência recusa, com a travessia que falhou, e cada curva que fica traz a
    conferência em `cortes`."""
    por_eixo = {}
    for nome, lt in leituras.items():
        ex = eixos_da_vista(cameras[nome])
        if ex and ex[0] not in por_eixo and lt.get(classe, {}).get('polilinhas'):
            por_eixo[ex[0]] = (nome, ex, lt)
    if tol_mm is None:
        erros = [lt[classe]['erro_mm'] for _, _, lt in por_eixo.values()]
        tol_mm = max(3.0, 3 * max(erros)) if erros else 3.0
    prep = preparar_cortes(cortes) if cortes else []
    erros_vista = {n: lt[classe]['erro_mm'] for n, lt in leituras.items() if classe in lt}
    segs = {}
    for ad, (nome, ex, lt) in por_eixo.items():
        segs[ad] = segmentos([{'pontos': p['pontos_mm'], 'fechada': p['fechada']} for p in lt[classe]['polilinhas']], eps=0.1)
    aceitas, aceitas_sem, ambiguas, pares_testados = [], [], 0, 0
    eixos_dir = sorted(por_eixo)
    for i, a_dir in enumerate(eixos_dir):
        for b_dir in eixos_dir[i + 1:]:
            g = 3 - a_dir - b_dir
            nA, exA, ltA = por_eixo[a_dir]
            nB, exB, ltB = por_eixo[b_dir]
            kA = [exA[1], exA[3]].index(g)
            kB = [exB[1], exB[3]].index(g)
            terceira = por_eixo.get(g)
            pecasA = [Q for p in ltA[classe]['polilinhas'] for Q in _pecas_monotonas(np.asarray(p['pontos_mm'], float), kA, p['fechada'])]
            pecasB = [Q for p in ltB[classe]['polilinhas'] for Q in _pecas_monotonas(np.asarray(p['pontos_mm'], float), kB, p['fechada'])]
            fa = [_funcao(Q, kA) for Q in pecasA]
            fb = [_funcao(Q, kB) for Q in pecasB]
            validos, falham = {}, set()
            for ia, (sa, ya) in enumerate(fa):
                for ib, (sb, yb) in enumerate(fb):
                    lo, hi = max(sa[0], sb[0]), min(sa[-1], sb[-1])
                    if hi - lo < max(5.0, 0.5 * min(sa[-1] - sa[0], sb[-1] - sb[0])):
                        continue
                    pares_testados += 1
                    s = np.append(np.arange(lo, hi, passo), hi)
                    P = np.zeros((len(s), 3))
                    P[:, g] = s
                    P[:, b_dir] = np.interp(s, sa, ya)   # a vista A mostra o eixo da direção de B
                    P[:, a_dir] = np.interp(s, sb, yb)
                    confere = None
                    if terceira:
                        nC, exC, _ = terceira
                        Q2 = np.stack([P[:, exC[1]], P[:, exC[3]]], 1)
                        dC = distancia_a_segmentos(Q2, *segs[g])
                        confere = float((dC <= tol_mm).mean())
                        if confere < 0.9:
                            continue
                    iou = (hi - lo) / (max(sa[-1], sb[-1]) - min(sa[0], sb[0]))
                    validos[(ia, ib)] = (P, confere, iou)
                    if prep and _conferir_pelos_cortes(P, prep, erros_vista, [nA, nB], tol_corte_mm, simetria_x)['falha']:
                        falham.add((ia, ib))
            if not validos:
                continue
            if prep:
                _aceitar(validos, terceira, simetria_x, tol_mm, folga_iou, nA, nB, aceitas_sem)
            usados = {k: v for k, v in validos.items() if k not in falham} if prep and cortes_no_casamento else validos
            if usados:
                ambiguas += _aceitar(usados, terceira, simetria_x, tol_mm, folga_iou, nA, nB, aceitas)
    finais = _sem_repeticoes(aceitas, tol_mm)
    recusadas = []
    if prep:
        # a conferência de cada trecho que fica, e o que o casamento sem os cortes devolveria e ela recusa
        for f in finais:
            f['cortes'] = _conferir_pelos_cortes(f['pontos'], prep, erros_vista, f['vistas'], tol_corte_mm, simetria_x)
        finais = [f for f in finais if not f['cortes']['falha']]
        for f in _sem_repeticoes(aceitas_sem, tol_mm):
            c = _conferir_pelos_cortes(f['pontos'], prep, erros_vista, f['vistas'], tol_corte_mm, simetria_x)
            if c['falha']:
                recusadas.append({**f, 'cortes': c})
    out = []
    for f in finais:
        o = {'confianca': f['confianca'], 'vistas': f['vistas'], 'terceira_vista_confere': f['terceira_vista_confere'],
             'comprimento_mm': round(comprimento(f['pontos']), 1), 'pontos_mm': np.round(f['pontos'], 2).tolist()}
        if prep:
            c = f['cortes']
            o['cortes'] = {'travessias': len(c['travessias']), 'distancia_maxima_mm': c['distancia_maxima_mm'],
                           'tolerancia_mm': max((t['tolerancia_mm'] for t in c['travessias']), default=None)}
        out.append(o)
    saida = {'classe': classe, 'tolerancia_mm': round(tol_mm, 3), 'simetria_x': bool(simetria_x),
             'vistas_por_eixo': {EIXOS[k]: v[0] for k, v in sorted(por_eixo.items())}, 'pares_testados': pares_testados,
             'ambiguas': ambiguas, 'polilinhas_3d': out}
    if prep:
        saida['conferencia_dos_cortes'] = {
            'conferida': True, 'cortes': [c['nome'] for c in prep], 'no_casamento': bool(cortes_no_casamento),
            'sem_corte': sum(1 for o in out if not o['cortes']['travessias']),
            'recusadas': {k: sum(1 for r in recusadas if r['confianca'] == k) for k in ('alta', 'media')}}
        saida['recusadas_pelos_cortes'] = [
            {'confianca': r['confianca'], 'vistas': r['vistas'], 'comprimento_mm': round(comprimento(r['pontos']), 1),
             'motivo': (f"atravessa o corte {r['cortes']['falha']['corte']} em {r['cortes']['falha']['ponto_mm']} a "
                        f"{r['cortes']['falha']['distancia_mm']} mm do contorno, e a tolerância é {r['cortes']['falha']['tolerancia_mm']} mm"),
             'corte': r['cortes']['falha']['corte'], 'ponto_mm': r['cortes']['falha']['ponto_mm'],
             'distancia_mm': r['cortes']['falha']['distancia_mm'], 'tolerancia_mm': r['cortes']['falha']['tolerancia_mm'],
             'pontos_mm': np.round(r['pontos'], 2).tolist()} for r in recusadas]
    return saida


# ---------- ângulo da dobra pelos cortes ----------

def _ao_longo(P, fechada=False):
    """O comprimento acumulado ao longo da polilinha."""
    if fechada:
        P = np.vstack([P, P[:1]])
    return np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))]), P


def _lado_do_canto(P, s, s0, sentido, a, b):
    """Os pontos da polilinha a uma distância entre a e b mm do canto (em s0), ao longo dela, no sentido dado."""
    d = (s - s0) * sentido
    return P[(d >= a) & (d <= b)]


def _direcao(Q, canto):
    """A direção da reta ajustada aos pontos, orientada para longe do canto, e o erro padrão do ângulo dela em radianos: o
    desvio quadrático médio dos pontos à reta sobre a raiz da soma dos quadrados das posições ao longo dela."""
    m, u, r = _reta(Q)
    if (m - canto) @ u < 0:
        u = -u
    t = (Q - m) @ u
    n = len(Q)
    return u, (r * math.sqrt(n / max(n - 2, 1))) / max(math.sqrt(float(t @ t)), 1e-9)


def _canto_no_corte(P, fechada, alvo, perto, janela=6.0, braco=5.0):
    """O canto do contorno perto de alvo: o ponto, a até janela mm (ao longo do traço) do ponto mais perto de alvo, onde o
    traço mais vira entre as cordas de braco mm para trás e para a frente. O contorno fechado se abre no lado oposto ao ponto
    mais perto, para que o canto fique no meio. Devolve ((s do canto, giro em graus) ou None, s, pontos)."""
    P = np.asarray(P, float)
    if fechada:
        P = np.roll(P, len(P) // 2 - int(np.argmin(np.linalg.norm(P - alvo, axis=1))), axis=0)
    s, Pf = _ao_longo(P)
    d = np.linalg.norm(Pf - alvo, axis=1)
    k = int(np.argmin(d))
    if d[k] > perto:
        return None, s, Pf
    melhor, s_melhor = -1.0, None
    for j in np.nonzero(np.abs(s - s[k]) <= janela)[0]:
        if s[j] - braco < s[0] or s[j] + braco > s[-1]:
            continue
        a = np.array([np.interp(s[j] - braco, s, Pf[:, 0]), np.interp(s[j] - braco, s, Pf[:, 1])])
        b = np.array([np.interp(s[j] + braco, s, Pf[:, 0]), np.interp(s[j] + braco, s, Pf[:, 1])])
        u, w = Pf[j] - a, b - Pf[j]
        g = math.degrees(math.acos(max(-1.0, min(1.0, float(u @ w) / max(np.linalg.norm(u) * np.linalg.norm(w), 1e-12)))))
        if g > melhor:
            melhor, s_melhor = g, s[j]
    return (s_melhor, melhor), s, Pf


def angulos_pelos_cortes(curvas, cortes, perto_mm=4.0, giro_min=8.0, a_mm=5.0, b_mm=20.0, b_curto_mm=12.0, minimo_lado_mm=4.0):
    """O ângulo da dobra de cada curva 3D (polilinhas em mm) onde ela atravessa um corte lido do pacote (ler_corte). No
    ponto em que a curva cruza o plano, o contorno do corte faz um canto; as retas ajustadas ao contorno dos dois lados do
    canto, entre a_mm e b_mm dele, dão uma direção de cada face no plano, e a dobra é 180 graus menos o ângulo entre as duas
    faces, medido no plano perpendicular à tangente da curva (as duas faces contêm a curva). A incerteza soma duas vezes o
    erro padrão do ângulo das duas retas, que sai do espalhamento dos pontos lidos em volta delas, metade da diferença para
    o ajuste mais curto (até b_curto_mm), que mostra quanto a face curva perto da dobra, e metade do ângulo que o erro de
    leitura do corte faz sobre o comprimento ajustado, que cobre o desvio sistemático da borda do traço lido. Começar a
    a_mm do canto deixa de fora o canto que o traço grosso arredonda. Devolve, para cada curva, a lista das travessias
    medidas."""
    out = []
    for C in curvas:
        P = np.asarray(C, float)
        s3, _ = _ao_longo(P)
        medidas = []
        for c in cortes:
            e = EIXOS.index(c['eixo'])
            u, w = (EIXOS.index(x) for x in c['eixos_uv'])
            v = float(c['valor_mm'])
            d = P[:, e] - v
            d = np.where(d == 0, 1e-9, d)   # a amostra exatamente no plano conta como do lado positivo, e a travessia não some
            for i in np.nonzero(d[:-1] * d[1:] < 0)[0]:
                f = d[i] / (d[i] - d[i + 1])
                X = P[i] + f * (P[i + 1] - P[i])
                sx = s3[i] + f * (s3[i + 1] - s3[i])
                if sx < 3.0 or s3[-1] - sx < 3.0:
                    continue
                q = lambda t: np.array([np.interp(t, s3, P[:, k]) for k in range(3)])
                t = q(min(sx + 10.0, s3[-1])) - q(max(sx - 10.0, 0.0))
                t /= np.linalg.norm(t)
                if abs(t[e]) < 0.2:
                    continue   # a curva corre quase no plano do corte, e a travessia não se localiza
                alvo = X[[u, w]]
                for pl in c['polilinhas']:
                    Q = np.asarray(pl['pontos_mm'], float)
                    if len(Q) < 3:
                        continue
                    canto, s, Qf = _canto_no_corte(Q, pl.get('fechada', False), alvo, perto_mm)
                    if canto is None or canto[0] is None or canto[1] < giro_min:
                        continue
                    s0 = canto[0]
                    cp = np.array([np.interp(s0, s, Qf[:, 0]), np.interp(s0, s, Qf[:, 1])])
                    dobras = []
                    for b in (b_mm, b_curto_mm):
                        lados = [_lado_do_canto(Qf, s, s0, sg, a_mm, b) for sg in (-1, 1)]
                        if any(len(L_) < 3 or comprimento(L_) < min(minimo_lado_mm, 0.6 * (b - a_mm)) for L_ in lados):
                            break
                        dirs = []
                        for L_ in lados:
                            d2, sig = _direcao(L_, cp)
                            D = np.zeros(3)
                            D[u], D[w] = d2
                            D -= (D @ t) * t
                            dirs.append((D / np.linalg.norm(D), sig, comprimento(L_)))
                        ang = math.degrees(math.acos(max(-1.0, min(1.0, float(dirs[0][0] @ dirs[1][0])))))
                        dobras.append((180.0 - ang, math.degrees(math.hypot(dirs[0][1], dirs[1][1])), min(dirs[0][2], dirs[1][2])))
                    if len(dobras) < 2:
                        continue
                    (dobra, sigma, comp), (dobra_curta, _, _) = dobras
                    leitura = math.degrees(math.atan(float(c.get('erro_mm') or 0.0) / max(comp, 1e-9))) / 2
                    medidas.append({'corte': c.get('corte'), 'ponto_mm': np.round(X, 1).tolist(), 'angulo_graus': round(dobra, 1),
                                    'incerteza_graus': round(2 * sigma + abs(dobra - dobra_curta) / 2 + leitura, 1)})
                    break
        out.append(medidas)
    return out


def com_angulos(linhas3d, cortes):
    """Acrescenta a cada curva de linhas_3d o ângulo da dobra pelos cortes que ela atravessa: angulo_graus (a mediana das
    travessias), angulo_incerteza_graus (a maior incerteza delas, ou metade da faixa entre elas, se maior) e
    angulo_travessias; a curva que não atravessa corte, ou cujo canto o corte não mostra, fica sem o campo."""
    curvas = [p['pontos_mm'] for p in linhas3d['polilinhas_3d']]
    for p, med in zip(linhas3d['polilinhas_3d'], angulos_pelos_cortes(curvas, cortes)):
        if not med:
            continue
        a = [m['angulo_graus'] for m in med]
        p['angulo_graus'] = round(float(np.median(a)), 1)
        p['angulo_incerteza_graus'] = round(max(max(m['incerteza_graus'] for m in med), (max(a) - min(a)) / 2), 1)
        p['angulo_travessias'] = med
    linhas3d['angulo_pelos_cortes'] = [c.get('corte') for c in cortes]
    return linhas3d


# ---------- pacote ----------

def pastas_do_pacote(pacote):
    """(pasta das vistas, pasta dos cortes) a partir da pasta do pacote, da pasta vistas/ ou da pasta cortes/."""
    p = os.path.abspath(pacote)
    vistas = p if os.path.exists(os.path.join(p, 'camera.json')) else os.path.join(p, 'vistas')
    cortes = p if os.path.exists(os.path.join(p, 'quadro.json')) else os.path.join(p, 'cortes')
    return vistas, cortes
