# imagens.py — grade em milímetro nas vistas ortográficas e folha da régua. Roda no Python do sistema, com Pillow e
# numpy, fora do Blender (o Python do Blender não traz Pillow); regua.py, pacote-cego.py e olhar-candidata.py o chamam.
#
#   python3 -I imagens.py grade <camera.json> <prefixo>
#       Desenha a grade nas imagens <prefixo><vista>-cinza.png e <prefixo><vista>-zebra.png de cada vista alinhada a dois
#       eixos, com rótulo a cada duas linhas, a barra de escala num canto que não cobre rótulo nem título, e grava em
#       <prefixo>grade.json o passo, as caixas dos rótulos e a da barra de cada imagem.
#   python3 -I imagens.py linhas <linhas.json> <saida.png>
#       Desenha as polilinhas de linhas.json ({W, H, linhas: {tipo: [[[u, v], ...], ...]}}) em traço preto sobre branco (os
#       tipos feicao, dobra, natural e declarado); o tipo 'corte' (a borda sobre um plano da caixa) sai em cinza fino.
#   python3 -I imagens.py cortes <cortes.json> <pasta> [<quadro.json>]
#       Desenha cada corte de cortes.json ({simetria_x, cortes: [{nome, eixo, valor, eixos_uv, cadeias: [[[u, v], ...]]}]}, em
#       metro) como contorno 2D em mm com grade e as cotas dos extremos e da maior saliência, em <pasta>/<nome>.png; grava a
#       tabela curta <pasta>/cotas.md e o quadro de cada desenho em <pasta>/quadro.json. Com <quadro.json>, usa o quadro dado
#       (para desenhar outra malha na mesma escala e posição) e não o regrava.
#   python3 -I imagens.py folha <pasta> <metricas.json> <vista,vista,...>
#       Compõe <pasta>/folha.png: linhas referência e candidata em cinza e em listras de reflexo, o mapa de distância e o
#       mapa com sinal (se há), colunas as vistas, e o resumo das medidas no alto.
#   python3 -I imagens.py vista <vista.json>
#       Compõe uma imagem grande de uma vista ({saida, paineis: [{arquivo, titulo, subtitulo, px_por_mm, legenda_mm?}]}): os
#       painéis lado a lado, recortados pelo mesmo retângulo ao conteúdo de todos (o fundo é branco), cada um com título,
#       subtítulo e barra de escala em milímetro, e com legenda de cor (azul, branco, vermelho) onde legenda_mm é dado.
#   python3 -I imagens.py perfis <perfis.json> <pasta>
#       Desenha, de cada corte de perfis.json, os perfis sobrepostos em milímetro: <pasta>/corte-<nome>.png com o corte inteiro
#       e <pasta>/corte-<nome>-ampliado.png em grade de 10 mm em volta do trecho declarado ou do de maior diferença, com a
#       referência em preto e cada candidata numa cor.
import json, math, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

FONTE = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
EIXO = {0: 'x', 1: 'y', 2: 'z'}
COR_X = (0, 90, 200)
COR_Y = (40, 140, 40)


def fonte(tam):
    try:
        return ImageFont.truetype(FONTE, tam)
    except OSError:
        return ImageFont.load_default(tam)


def passo_redondo(alvo_mm):
    """O menor de 1, 2 e 5 vezes potência de dez que não fica abaixo de alvo_mm."""
    e = 10 ** math.floor(math.log10(max(alvo_mm, 1e-9)))
    for m in (1, 2, 5, 10):
        if m * e >= alvo_mm:
            return int(round(m * e)) if m * e >= 1 else m * e
    return 10 * e


def cruza(a, b, folga=2):
    return not (a[2] + folga <= b[0] or b[2] + folga <= a[0] or a[3] + folga <= b[1] or b[3] + folga <= a[1])


def desenhar_grade(im, v, mt, f):
    """Desenha na imagem RGB im, da vista v com a câmera mt de camera.json, a grade em milímetro (só na vista alinhada a dois
    eixos), o título e a barra de escala, e devolve o registro de grade.json. A posição de tudo depende só da câmera, de modo
    que leitura.py redesenha a mesma grade sobre fundos lisos para separá-la do traço."""
    c = np.array(mt['centro'], float)
    s = mt['escala']
    W, H = mt['W'], mt['H']
    xc = np.array(mt['x_cam'], float)
    yc = np.array(mt['y_cam'], float)
    px = lambda p: (W / 2 + ((p - c) @ xc) / s * W, H / 2 - ((p - c) @ yc) / s * W)
    alinhada = abs(xc).max() > 0.999 and abs(yc).max() > 0.999
    passo = passo_redondo(s * 1000 / 20)
    d = ImageDraw.Draw(im, 'RGBA')
    rotulos = []
    titulo = f'vista {v}' + (f' (ortográfica), grade de {passo} mm' if alinhada else ' (ortográfica)')
    caixa_titulo = d.textbbox((10, 8), titulo, font=f)
    d.rectangle(caixa_titulo, fill=(255, 255, 255, 200))
    d.text((10, 8), titulo, fill='black', font=f)
    if alinhada:
        ah = int(np.argmax(np.abs(xc)))
        av = int(np.argmax(np.abs(yc)))
        for eixo, horiz in ((ah, True), (av, False)):
            ini = math.floor((c[eixo] - s) * 1000 / passo)
            fim = math.ceil((c[eixo] + s) * 1000 / passo)
            for k in range(ini, fim + 1):
                mm = k * passo
                p = c.copy()
                p[eixo] = mm / 1000
                x, y = px(p)
                forte = k % 2 == 0
                if horiz and 0 <= x < W:
                    d.line([(x, 0), (x, H)], fill=(*COR_X, 120 if forte else 50), width=1)
                    if forte:
                        t = f'{EIXO[eixo]}={mm:g}'
                        bb = d.textbbox((x + 2, H - 20), t, font=f)
                        if bb[2] < W and not cruza(bb, caixa_titulo):
                            d.text((x + 2, H - 20), t, fill=(0, 60, 160), font=f)
                            rotulos.append(list(bb))
                if not horiz and 0 <= y < H:
                    d.line([(0, y), (W, y)], fill=(*COR_Y, 120 if forte else 50), width=1)
                    if forte:
                        t = f'{EIXO[eixo]}={mm:g}'
                        bb = d.textbbox((4, y - 18), t, font=f)
                        if bb[1] > 0 and not cruza(bb, caixa_titulo) and not any(cruza(bb, r) for r in rotulos):
                            d.text((4, y - 18), t, fill=(20, 100, 20), font=f)
                            rotulos.append(list(bb))
    # barra de escala de cerca de um quarto da largura, no primeiro canto livre de rótulo e de título
    comp_mm = passo_redondo(s * 1000 / 4)
    L = comp_mm / 1000 / s * W
    texto = f'{comp_mm:g} mm'
    tb = d.textbbox((0, 0), texto, font=f)
    alt = 12 + (tb[3] - tb[1]) + 6
    cantos = [(W - 30 - L, H - 30 - alt), (W - 30 - L, 40), (30, H - 30 - alt), (30, 40),
              (W - 30 - L, H / 2 - alt / 2), (W / 2 - L / 2, H - 30 - alt), (W / 2 - L / 2, 40)]
    barra = None
    for x0, y0 in cantos:
        bb = [x0 - 4, y0 - 4, x0 + max(L, tb[2]) + 4, y0 + alt + 4]
        if not cruza(bb, caixa_titulo) and not any(cruza(bb, r) for r in rotulos):
            barra = bb
            break
    cobre = barra is None
    if cobre:
        x0, y0 = cantos[0]
        barra = [x0 - 4, y0 - 4, x0 + max(L, tb[2]) + 4, y0 + alt + 4]
    x0, y0 = barra[0] + 4, barra[1] + 4
    d.rectangle(barra, fill=(255, 255, 255, 220))
    d.rectangle([x0, y0, x0 + L, y0 + 10], fill=(0, 0, 0))
    d.text((x0, y0 + 12), texto, fill='black', font=f)
    return {'passo_mm': passo if alinhada else None, 'rotulos': rotulos, 'titulo': list(caixa_titulo),
            'barra': [round(b, 1) for b in barra], 'barra_mm': comp_mm, 'barra_cobre_rotulo': cobre}


def grade(arq_camera, prefixo):
    meta = json.load(open(arq_camera))
    f = fonte(16)
    registro = {}
    for v, mt in meta.items():
        for tipo in ('cinza', 'zebra', 'linhas'):
            arq = f'{prefixo}{v}-{tipo}.png'
            if tipo == 'linhas' and not os.path.exists(arq):
                continue
            im = Image.open(arq).convert('RGB')
            registro[f'{v}-{tipo}'] = desenhar_grade(im, v, mt, f)
            im.save(arq)
    json.dump(registro, open(f'{prefixo}grade.json', 'w'), indent=1)


def linhas(arq_json, saida):
    d = json.load(open(arq_json))
    im = Image.new('RGB', (d['W'], d['H']), 'white')
    dr = ImageDraw.Draw(im)
    # Traço de feição com largura ímpar: com 2 px o Pillow põe o pixel a mais de um lado que a imagem não guarda, e a
    # leitura do meio do traço erra meio pixel a mais.
    for tipo in ('corte', 'feicao', 'dobra', 'natural', 'declarado'):
        cor, larg = ((150, 150, 150), 1) if tipo == 'corte' else ((0, 0, 0), 3)
        for pl in d['linhas'].get(tipo, []):
            dr.line([tuple(p) for p in pl], fill=cor, width=larg, joint='curve')
    im.save(saida)


def _mm(v):
    """Metro para milímetro inteiro, sem o sinal do zero negativo."""
    return str(int(round(v * 1000)))


def _cotas_do_corte(cadeias, meia, U='u', Vn='v'):
    """De quatro a seis cotas (rótulo, ponto em m), na metade u >= 0 quando meia: extremos de u e v, a maior saliência das
    duas linhas mais longas e, se faltar, as pontas das linhas, sem repetir ponto a menos de 20 mm."""
    cad = [np.asarray(c, float) for c in cadeias]
    if meia:
        cad = [c[c[:, 0] >= -1e-9] for c in cad]
    cad = [c for c in cad if len(c) >= 2]
    if not cad:
        return []
    P = np.vstack(cad)
    alto, baixo = ('mais alto', 'mais baixo') if Vn == 'y' else (f'{Vn} máximo', f'{Vn} mínimo')
    largo, estreito = ('mais largo', 'mais perto do meio') if U == 'x' else (f'{U} máximo', f'{U} mínimo')
    cotas = [(alto, P[np.argmax(P[:, 1])]), (largo, P[np.argmax(P[:, 0])]), (baixo, P[np.argmin(P[:, 1])])]
    comprimento = lambda c: np.linalg.norm(np.diff(c, axis=0), axis=1).sum()
    por_tamanho = sorted(cad, key=comprimento, reverse=True)
    for ordem, linha in enumerate(por_tamanho[:2]):
        a, b = linha[0], linha[-1]
        corda = b - a
        if np.linalg.norm(corda) > 1e-9:
            n = np.array([-corda[1], corda[0]]) / np.linalg.norm(corda)
            dist = (linha - a) @ n
            k = int(np.argmax(np.abs(dist)))
            qual = 'maior saliência' if ordem == 0 else 'saliência da 2ª linha'
            cotas.append((f'{qual} (flecha {abs(dist[k]) * 1000:.0f} mm sobre a corda)', linha[k]))
    cotas.append((estreito, P[np.argmin(P[:, 0])]))
    # se faltar, as pontas das linhas mais longas completam até quatro cotas
    for linha in por_tamanho:
        cotas += [('ponta de linha', linha[0]), ('ponta de linha', linha[-1])]
    for linha in por_tamanho:
        s_ = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(linha, axis=0), axis=1))])
        for f in (0.5, 0.25, 0.75):
            k = int(np.argmin(np.abs(s_ - f * s_[-1])))
            cotas.append((f'a {round(f * 100)}% do comprimento da linha', linha[k]))
    out = []
    for r, p in cotas:
        if (r == 'ponta de linha' or r.startswith('a ')) and len(out) >= 4:
            break
        if all(np.linalg.norm(p - q) > 0.02 for _, q in out):
            out.append((r, p))
    return out[:6]


def _segmentos_cruzam_caixa(A, B, caixa):
    """Para cada segmento A[i]-B[i] (px), se ele toca a caixa (x0, y0, x1, y1): corte de Liang-Barsky, vetorizado."""
    x0, y0, x1, y1 = caixa
    d = B - A
    t0 = np.zeros(len(A))
    t1 = np.ones(len(A))
    ok = np.ones(len(A), bool)
    for p, q in ((-d[:, 0], A[:, 0] - x0), (d[:, 0], x1 - A[:, 0]), (-d[:, 1], A[:, 1] - y0), (d[:, 1], y1 - A[:, 1])):
        paralelo = np.abs(p) < 1e-12
        ok &= ~(paralelo & (q < 0))
        with np.errstate(divide='ignore', invalid='ignore'):
            r = np.where(paralelo, 0.0, q / np.where(paralelo, 1.0, p))
        t0 = np.where(~paralelo & (p < 0), np.maximum(t0, r), t0)
        t1 = np.where(~paralelo & (p > 0), np.minimum(t1, r), t1)
    return ok & (t0 <= t1)


def _expande(bb, m):
    return (bb[0] - m, bb[1] - m, bb[2] + m, bb[3] + m)


def _cruza_contorno(bb, A, B, folga=4):
    """Se a caixa, engordada de folga px (meia largura do traço mais respiro), toca algum segmento do contorno."""
    if len(A) == 0:
        return False
    return bool(_segmentos_cruzam_caixa(A, B, _expande(bb, folga)).any())


def posicionar_rotulo(ancora, tam, A, B, ocupadas, limites, padrao=(9, 6)):
    """Caixa (x0, y0, x1, y1) de um rótulo de tam = (largura, altura) px para a âncora, longe do contorno (segmentos A-B em px) e
    das caixas e âncoras ocupadas. Tenta primeiro o lugar colado de sempre (âncora + padrao) e depois anéis cada vez mais
    afastados em 16 direções; devolve (caixa, afastado, cruzava_no_padrao). Sem lugar livre, a caixa com menos cruzamentos."""
    ax, ay = ancora
    w, h = tam
    xmin, ymin, xmax, ymax = limites
    pontos, caixas = ocupadas

    def livre(bb):
        if bb[0] < xmin or bb[1] < ymin or bb[2] > xmax or bb[3] > ymax:
            return False
        if any(cruza(bb, o) for o in caixas):
            return False
        return not any(bb[0] - 10 < px_ < bb[2] + 10 and bb[1] - 10 < py_ < bb[3] + 10 for px_, py_ in pontos)

    padrao_bb = (ax + padrao[0], ay + padrao[1], ax + padrao[0] + w, ay + padrao[1] + h)
    cruzava = _cruza_contorno(padrao_bb, A, B)
    if livre(padrao_bb) and not cruzava:
        return padrao_bb, False, False
    melhor = None
    for d in (22, 34, 48, 64, 84, 110, 140, 180, 230, 300):
        for k in range(16):
            ang = (k * 22.5 + 45) * math.pi / 180   # começa em cima à direita
            c, s_ = math.cos(ang), -math.sin(ang)
            cx = ax + c * d + (w / 2 if c > 0.3 else -w / 2 if c < -0.3 else 0)
            cy = ay + s_ * d + (h / 2 if s_ > 0.3 else -h / 2 if s_ < -0.3 else 0)
            bb = (cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2)
            if not livre(bb):
                continue
            if not _cruza_contorno(bb, A, B):
                return bb, True, cruzava
            n = int(_segmentos_cruzam_caixa(A, B, _expande(bb, 4)).sum())
            if melhor is None or n < melhor[0]:
                melhor = (n, bb)
    if melhor is None:
        melhor = (0, padrao_bb)
    return melhor[1], True, cruzava


def _ligacao(ancora, bb):
    """O ponto da caixa mais perto da âncora, onde a linha fina de ligação termina."""
    return (min(max(ancora[0], bb[0]), bb[2]), min(max(ancora[1], bb[1]), bb[3]))


CORTE_W, CORTE_H, CORTE_M = 1200, 900, 70   # tamanho e margem do desenho de cada corte, em px


def passo_do_corte(q):
    """O passo da grade do desenho de um corte, em mm, pelo quadro dele."""
    return passo_redondo((q['W'] - 2 * CORTE_M) / q['escala_px_m'] * 1000 / 12)


def titulo_do_corte(nome, eixo, valor, U, Vn, passo):
    return f"corte {nome}: plano {eixo} = {_mm(valor)} mm; {U} na horizontal, {Vn} na vertical, grade de {passo:g} mm"


def cortes(arq_json, pasta, arq_quadro=None):
    d = json.load(open(arq_json))
    quadros = json.load(open(arq_quadro)) if arq_quadro else {}
    W, H, M = CORTE_W, CORTE_H, CORTE_M
    f, fp = fonte(16), fonte(14)
    tabela = ['| corte | cota | posição (mm) |', '|---|---|---|']
    novo_quadro, registro = {}, {}
    for c in d['cortes']:
        U, Vn = c['eixos_uv']
        cad = [np.asarray(x, float) for x in c['cadeias'] if len(x) >= 2]
        meia = bool(d.get('simetria_x')) and U == 'x'
        if c['nome'] in quadros:
            q = quadros[c['nome']]
        else:
            P = np.vstack(cad) if cad else np.zeros((1, 2))
            lo, hi = P.min(0), P.max(0)
            folga = 0.08 * max(hi - lo)
            lo, hi = lo - folga, hi + folga
            esc = min((W - 2 * M) / max(hi[0] - lo[0], 1e-6), (H - 2 * M) / max(hi[1] - lo[1], 1e-6))
            meio = (lo + hi) / 2   # o contorno fica centrado no desenho
            lo = meio - np.array([(W - 2 * M) / esc / 2, (H - 2 * M) / esc / 2])
            q = {'u0': float(lo[0]), 'v0': float(lo[1]), 'escala_px_m': float(esc), 'W': W, 'H': H, 'eixos_uv': [U, Vn],
                 'eixo': c['eixo'], 'valor': c['valor']}
        novo_quadro[c['nome']] = q
        px = lambda p: (M + (p[0] - q['u0']) * q['escala_px_m'], H - M - (p[1] - q['v0']) * q['escala_px_m'])
        im = Image.new('RGB', (W, H), 'white')
        dr = ImageDraw.Draw(im, 'RGBA')
        passo = passo_do_corte(q)
        u0, u1 = q['u0'], q['u0'] + (W - M) / q['escala_px_m']
        v0, v1 = q['v0'], q['v0'] + (H - M) / q['escala_px_m']
        for k in range(math.floor(u0 * 1000 / passo), math.ceil(u1 * 1000 / passo) + 1):
            x, _ = px((k * passo / 1000, 0))
            if M <= x <= W:
                dr.line([(x, 0), (x, H - M)], fill=(*COR_X, 110 if k % 2 == 0 else 45))
                rot_u = f'{U}={k * passo:g}'
                if k % 2 == 0 and dr.textbbox((x - 14, H - M + 6), rot_u, font=fp)[2] < W - 2:
                    dr.text((x - 14, H - M + 6), rot_u, fill=(0, 60, 160), font=fp)
        for k in range(math.floor(v0 * 1000 / passo), math.ceil(v1 * 1000 / passo) + 1):
            _, y = px((0, k * passo / 1000))
            if 0 <= y <= H - M:
                dr.line([(M, y), (W, y)], fill=(*COR_Y, 110 if k % 2 == 0 else 45))
                if k % 2 == 0:
                    dr.text((4, y - 8), f'{Vn}={k * passo:g}', fill=(20, 100, 20), font=fp)
        for x in cad:
            dr.line([px(p) for p in x], fill=(0, 0, 0), width=3, joint='curve')
        titulo = titulo_do_corte(c['nome'], c['eixo'], c['valor'], U, Vn, passo)
        dr.rectangle(dr.textbbox((10, 8), titulo, font=f), fill=(255, 255, 255, 220))
        dr.text((10, 8), titulo, fill='black', font=f)
        caixas = [dr.textbbox((10, 8), titulo, font=f)]
        pts = [np.array([px(p) for p in x]) for x in cad]
        A = np.vstack([q[:-1] for q in pts]) if pts else np.zeros((0, 2))
        B = np.vstack([q[1:] for q in pts]) if pts else np.zeros((0, 2))
        cotas = _cotas_do_corte(cad, meia, U, Vn)
        ancoras = [px(p) for _, p in cotas]
        rotulos, ligacoes, deslocs = [], [], []
        for i, (rot, p) in enumerate(cotas):
            texto = f'{U}={_mm(p[0])}, {Vn}={_mm(p[1])} ({rot})'
            bb0 = dr.textbbox((0, 0), texto, font=fp)
            outras = [a for j, a in enumerate(ancoras) if j != i]
            bb, afastado, cruzava = posicionar_rotulo(ancoras[i], (bb0[2] - bb0[0], bb0[3] - bb0[1]), A, B, (outras, caixas),
                                                      (M, 4, W - 4, H - M))
            caixas.append(bb)
            deslocs.append((bb0[0], bb0[1]))
            rotulos.append({'texto': texto, 'ancora': [round(ancoras[i][0], 1), round(ancoras[i][1], 1)],'caixa': [round(b, 1) for b in bb], 'afastado': afastado, 'cruzava_no_lugar_padrao': cruzava,
                            'cruza_contorno': _cruza_contorno(bb, A, B, 0)})
            ligacoes.append((ancoras[i], _ligacao(ancoras[i], bb), afastado))
            tabela.append(f"| {c['nome']} ({c['eixo']} = {_mm(c['valor'])}) | {rot} | {U} = {_mm(p[0])}, {Vn} = {_mm(p[1])} |")
        for a, b, afastado in ligacoes:
            if afastado:
                dr.line([a, b], fill=(170, 0, 0, 200), width=1)
        for a, bb, r, off in zip(ancoras, caixas[1:], rotulos, deslocs):
            dr.ellipse([a[0] - 5, a[1] - 5, a[0] + 5, a[1] + 5], outline=(200, 0, 0), width=2)
            dr.rectangle(bb, fill=(255, 255, 255, 210))
            dr.text((bb[0] - off[0], bb[1] - off[1]), r['texto'], fill=(170, 0, 0), font=fp)
        registro[c['nome']] = rotulos
        im.save(os.path.join(pasta, f"{c['nome']}.png"))
    open(os.path.join(pasta, 'cotas.md'), 'w').write('\n'.join(tabela) + '\n')
    json.dump(registro, open(os.path.join(pasta, 'rotulos.json'), 'w'), indent=1)
    if not arq_quadro:
        json.dump(novo_quadro, open(os.path.join(pasta, 'quadro.json'), 'w'), indent=1)

COR_AZUL, COR_BRANCO, COR_VERMELHO = (26, 64, 217), (247, 247, 247), (217, 31, 20)   # as do mapa com sinal da régua
CORES_CANDIDATAS = [(230, 110, 0), (0, 110, 230), (30, 150, 60), (170, 40, 160)]


def _conteudo(im, folga=252):
    """Caixa (x0, y0, x1, y1) dos pixels que não são fundo branco, ou None."""
    a = np.asarray(im.convert('RGB'))
    m = (a < folga).any(2)
    if not m.any():
        return None
    ys, xs = np.nonzero(m)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def _barra_de_escala(d, f, x0, y1, px_por_mm):
    """Barra de escala de cerca de 120 px, em milímetro redondo, com o canto inferior esquerdo em (x0, y1)."""
    mm = passo_redondo(120 / px_por_mm)
    L = mm * px_por_mm
    texto = f'{mm:g} mm'
    tb = d.textbbox((0, 0), texto, font=f)
    d.rectangle([x0 - 4, y1 - 38, x0 + max(L, tb[2]) + 4, y1 - 4], fill=(255, 255, 255))
    d.rectangle([x0, y1 - 34, x0 + L, y1 - 24], fill=(0, 0, 0))
    d.text((x0, y1 - 22), texto, fill='black', font=f)


def vista(arq_json):
    d = json.load(open(arq_json))
    imgs = [Image.open(p['arquivo']).convert('RGB') for p in d['paineis']]
    caixas = [c for c in map(_conteudo, imgs) if c]
    W, H = imgs[0].size
    folga = 18
    if caixas:
        x0, y0 = max(0, min(c[0] for c in caixas) - folga), max(0, min(c[1] for c in caixas) - folga)
        x1, y1 = min(W, max(c[2] for c in caixas) + folga), min(H, max(c[3] for c in caixas) + folga)
    else:
        x0, y0, x1, y1 = 0, 0, W, H
    cw, ch = x1 - x0, y1 - y0
    TH, GAP = 84, 14
    BH = 44   # a faixa da barra de escala, abaixo do conteúdo
    out = Image.new('RGB', (len(imgs) * cw + (len(imgs) - 1) * GAP, TH + ch + BH), 'white')
    dr = ImageDraw.Draw(out)
    ft, fs = fonte(22), fonte(16)
    for i, (im, p) in enumerate(zip(imgs, d['paineis'])):
        ox = i * (cw + GAP)
        out.paste(im.crop((x0, y0, x1, y1)), (ox, TH))
        dr.text((ox + 8, 6), p['titulo'], fill='black', font=ft)
        if p.get('subtitulo'):
            dr.text((ox + 8, 36), p['subtitulo'], fill=(50, 50, 50), font=fs)
        lg = p.get('legenda_mm')
        if lg:
            bx, by, bl = ox + 8, 62, max(40, min(cw - 190, 260))
            for k in range(int(bl)):
                t = 2 * k / max(bl - 1, 1) - 1
                a, b = (COR_AZUL, COR_BRANCO) if t < 0 else (COR_BRANCO, COR_VERMELHO)
                u = t + 1 if t < 0 else t
                cor = tuple(int(round(a[j] * (1 - u) + b[j] * u)) for j in range(3))
                dr.line([(bx + k, by), (bx + k, by + 12)], fill=cor)
            dr.rectangle([bx, by, bx + bl, by + 12], outline=(120, 120, 120))
            dr.text((bx + bl + 8, by - 3), f'-{lg:g} / 0 / +{lg:g} mm', fill='black', font=fs)
        if p.get('px_por_mm'):
            _barra_de_escala(dr, fs, ox + 10, TH + ch + BH, p['px_por_mm'])
        if i:
            dr.line([(ox - GAP // 2, 0), (ox - GAP // 2, TH + ch + BH)], fill=(200, 200, 200))
    out.save(d['saida'])


def _desenhar_perfis(c, janela, passo, titulo, legenda, arquivo, marcas=(), W=1400, H=1050):
    u0, u1, v0, v1 = janela
    esc = min(W / (u1 - u0), H / (v1 - v0))
    cu, cv = (u0 + u1) / 2, (v0 + v1) / 2
    px = lambda p: (W / 2 + (p[0] - cu) * esc, H / 2 - (p[1] - cv) * esc)
    im = Image.new('RGB', (W, H), 'white')
    dr = ImageDraw.Draw(im, 'RGBA')
    f, fp = fonte(17), fonte(14)
    U, Vn = c['eixos_uv']
    umin, umax, vmin, vmax = cu - W / 2 / esc, cu + W / 2 / esc, cv - H / 2 / esc, cv + H / 2 / esc
    rotulo_a_cada = max(1, int(math.ceil(46 / (passo * esc))))
    for k in range(math.floor(umin / passo), math.ceil(umax / passo) + 1):
        x, _ = px((k * passo, 0))
        forte = k % rotulo_a_cada == 0
        dr.line([(x, 0), (x, H)], fill=(*COR_X, 100 if forte else 40))
        if forte:
            dr.text((x + 3, H - 20), f'{U}={k * passo:g}', fill=(0, 60, 160), font=fp)
    for k in range(math.floor(vmin / passo), math.ceil(vmax / passo) + 1):
        _, y = px((0, k * passo))
        forte = k % rotulo_a_cada == 0
        dr.line([(0, y), (W, y)], fill=(*COR_Y, 100 if forte else 40))
        if forte:
            dr.text((4, y - 17), f'{Vn}={k * passo:g}', fill=(20, 100, 20), font=fp)
    for k, cand in enumerate(c['candidatas']):
        cor = CORES_CANDIDATAS[k % len(CORES_CANDIDATAS)]
        for cad in cand['cadeias']:
            if len(cad) >= 2:
                dr.line([px(p) for p in cad], fill=cor, width=3, joint='curve')
    for cad in c['referencia']:
        if len(cad) >= 2:
            dr.line([px(p) for p in cad], fill=(0, 0, 0), width=3, joint='curve')
    for (u, v), cor in marcas:
        x, y = px((u, v))
        dr.ellipse([x - 11, y - 11, x + 11, y + 11], outline=cor, width=2)
    linhas = [(titulo, (0, 0, 0))] + legenda
    for i, (t, cor) in enumerate(linhas):
        bb = dr.textbbox((10, 8 + 22 * i), t, font=f)
        dr.rectangle(bb, fill=(255, 255, 255, 225))
        dr.text((10, 8 + 22 * i), t, fill=cor, font=f)
    im.save(arquivo)


def _janela_4x3(c0, c1, d0, d1):
    """A janela (u0, u1, v0, v1) de proporção 4 por 3 que contém o retângulo dado, com o mesmo centro."""
    w, h = c1 - c0, d1 - d0
    if w * 3 < h * 4:
        w = h * 4 / 3
    else:
        h = w * 3 / 4
    cu, cv = (c0 + c1) / 2, (d0 + d1) / 2
    return cu - w / 2, cu + w / 2, cv - h / 2, cv + h / 2


def perfis(arq_json, pasta):
    d = json.load(open(arq_json))
    os.makedirs(pasta, exist_ok=True)
    for c in d['cortes']:
        todas = [np.asarray(x, float) for x in c['referencia'] + [y for cd in c['candidatas'] for y in cd['cadeias']] if len(x) >= 2]
        P = np.vstack(todas) if todas else np.zeros((2, 2)) + np.array([[0.0, 0.0], [1.0, 1.0]])
        lo, hi = P.min(0), P.max(0)
        folga = 0.06 * float(max(hi - lo)) + 1e-3
        janela = _janela_4x3(lo[0] - folga, hi[0] + folga, lo[1] - folga, hi[1] + folga)
        passo = passo_redondo((janela[1] - janela[0]) / 14)
        legenda = [('referência em preto', (0, 0, 0))]
        for k, cand in enumerate(c['candidatas']):
            legenda.append((f"{cand['nome']}: {cand['resumo']}", CORES_CANDIDATAS[k % len(CORES_CANDIDATAS)]))
        marcas = [(tuple(m), CORES_CANDIDATAS[k % len(CORES_CANDIDATAS)]) for k, m in enumerate(c.get('maximas', [])) if m]
        t = f"corte {c['nome']}: plano {c['eixo']} = {c['valor_mm']:g} mm; {c['eixos_uv'][0]} na horizontal, {c['eixos_uv'][1]} na vertical, grade de {passo:g} mm"
        _desenhar_perfis(c, janela, passo, t, legenda, os.path.join(pasta, f"corte-{c['nome']}.png"), marcas)
        z = c.get('ampliacao')
        if z:
            zj = _janela_4x3(*z)
            tz = (f"corte {c['nome']} ampliado: plano {c['eixo']} = {c['valor_mm']:g} mm; {c['eixos_uv'][0]} de {zj[0]:.0f} a {zj[1]:.0f}, "
                  f"{c['eixos_uv'][1]} de {zj[2]:.0f} a {zj[3]:.0f} mm; grade de 10 mm")
            _desenhar_perfis(c, zj, 10, tz, legenda, os.path.join(pasta, f"corte-{c['nome']}-ampliado.png"), marcas)


def folha(pasta, arq_metricas, vistas):
    met = json.load(open(arq_metricas))
    linhas = [('ref_cinza', 'referência'), ('cand_cinza', 'candidata'), ('ref_zebra', 'ref. listras'),
              ('cand_zebra', 'cand. listras'), ('mapa', 'distância'), ('mapa_sinal', 'com sinal')]
    cols = vistas.split(',')
    linhas = [(l, r) for l, r in linhas if os.path.exists(f'{pasta}/{l}-{cols[0]}.png')]
    amostra = Image.open(f'{pasta}/ref_cinza-{cols[0]}.png')
    W, H = amostra.size
    ML, MT = 140, 124
    img = Image.new('RGB', (ML + W * len(cols), MT + H * len(linhas) + 40), 'white')
    dr = ImageDraw.Draw(img)
    f = fonte(17)
    rc, cr, vc = met['ref_para_cand_mm'], met['cand_para_ref_mm'], met['vincos']
    dr.text((10, 8), f"{met['nome']}: vincos F1 5/10 mm {vc['f1_5mm']}/{vc['f1_10mm']} (cobertura {vc['cobertura_5mm']}/{vc['cobertura_10mm']}, "
            f"precisão {vc['precisao_5mm']}/{vc['precisao_10mm']}, desvio mediano {vc['desvio_mediana_mm']} mm)", fill='black', font=f)
    dr.text((10, 32), f"ref→cand mediana {rc['mediana']} / p90 {rc['p90']} mm; cand→ref mediana {cr['mediana']} / p90 {cr['p90']} mm; "
            f"normal p90 {met['normal_ref_para_cand_graus']['p90']}°; vértices na caixa {met['vertices_na_caixa']}", fill='black', font=f)
    cv = met.get('curvatura')
    if cv:
        t = cv['total']
        dr.text((10, 56), f"curvatura (raio {cv['raio_mm']:g} mm, 1/m): diferença mediana {t['diferenca_abs_1_m']['mediana']} / p90 {t['diferenca_abs_1_m']['p90']} / "
                f"p99 {t['diferenca_abs_1_m']['p99']}; falta (dobra a menos) p99 {t['falta_1_m']['p99']}; excesso (ondulação) p99 {t['excesso_1_m']['p99']}",
                fill='black', font=f)
    ond = met.get('ondulacao_da_receita')
    if ond:
        dr.text((10, 80), f"ondulação da receita: {ond['falhas_abertas']} falhas abertas, a maior de {ond['maior_amplitude_mm']} mm", fill='black', font=f)
    for j, c in enumerate(cols):
        dr.text((ML + j * W + 10, MT - 26), c, fill='black', font=f)
    for i, (l, rot) in enumerate(linhas):
        dr.text((8, MT + i * H + H // 2), rot, fill='black', font=f)
        for j, c in enumerate(cols):
            img.paste(Image.open(f'{pasta}/{l}-{c}.png').convert('RGB'), (ML + j * W, MT + i * H))
    m = met['mapa_max_mm']
    texto = f'distância: azul 0 mm, ciano {m / 3:.0f} mm, amarelo {2 * m / 3:.0f} mm, vermelho {m:.0f} mm ou mais; avesso em magenta'
    if any(l == 'mapa_sinal' for l, _ in linhas):
        texto += f"; com sinal: azul onde a candidata afunda, branco em cima, vermelho onde sobra, a ±{met['mapa_sinal_mm']:g} mm"
    dr.text((10, MT + H * len(linhas) + 10), texto, fill='black', font=f)
    img.save(f'{pasta}/folha.png')


if __name__ == '__main__':
    if len(sys.argv) >= 4 and sys.argv[1] == 'grade':
        grade(sys.argv[2], sys.argv[3])
    elif len(sys.argv) >= 4 and sys.argv[1] == 'linhas':
        linhas(sys.argv[2], sys.argv[3])
    elif len(sys.argv) >= 4 and sys.argv[1] == 'cortes':
        cortes(sys.argv[2], sys.argv[3], sys.argv[4] if len(sys.argv) > 4 else None)
    elif len(sys.argv) >= 5 and sys.argv[1] == 'folha':
        folha(sys.argv[2], sys.argv[3], sys.argv[4])
    elif len(sys.argv) >= 3 and sys.argv[1] == 'vista':
        vista(sys.argv[2])
    elif len(sys.argv) >= 4 and sys.argv[1] == 'perfis':
        perfis(sys.argv[2], sys.argv[3])
    else:
        sys.exit('uso: imagens.py grade <camera.json> <prefixo> | linhas <linhas.json> <saida.png> | cortes <cortes.json> <pasta> [<quadro.json>] | folha <pasta> <metricas.json> <vistas> | vista <vista.json> | perfis <perfis.json> <pasta>')
