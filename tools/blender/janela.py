# janela.py — o corte de uma polilinha 2D por um retângulo, só com numpy. imagens.py (que roda no Python do sistema) e comum.py (que
# roda no Blender) o usam para os cortes de detalhe ampliados do pacote cego: o contorno do corte que cabe na janela.
import numpy as np


def cortar_na_janela(P, janela):
    """A polilinha P (n, 2) cortada pelo retângulo (u0, u1, v0, v1): a lista das partes de dentro, cada uma uma polilinha, com os
    pontos de entrada e saída exatos na borda. A polilinha fechada inteira dentro volta como veio."""
    u0, u1, v0, v1 = janela
    P = np.asarray(P, float)
    partes, atual = [], []
    for a, b in zip(P[:-1], P[1:]):
        d = b - a
        t0, t1, ok = 0.0, 1.0, True
        for p, q_ in ((-d[0], a[0] - u0), (d[0], u1 - a[0]), (-d[1], a[1] - v0), (d[1], v1 - a[1])):
            if abs(p) < 1e-15:
                if q_ < 0:
                    ok = False
                    break
                continue
            r = q_ / p
            if p < 0:
                t0 = max(t0, r)
            else:
                t1 = min(t1, r)
            if t0 > t1:
                ok = False
                break
        if not ok:
            if len(atual) >= 2:
                partes.append(np.array(atual))
            atual = []
            continue
        A, B = a + t0 * d, a + t1 * d
        if atual and np.linalg.norm(atual[-1] - A) > 1e-12:
            partes.append(np.array(atual))
            atual = []
        if not atual:
            atual.append(A)
        atual.append(B)
    if len(atual) >= 2:
        partes.append(np.array(atual))
    return partes
