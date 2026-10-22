# imagens.py — grade em milímetro nas vistas ortográficas e folha da régua. Roda no Python do sistema, com Pillow e
# numpy, fora do Blender (o Python do Blender não traz Pillow); regua.py, pacote-cego.py e olhar-candidata.py o chamam.
#
#   python3 -I imagens.py grade <camera.json> <prefixo>
#       Desenha a grade nas imagens <prefixo><vista>-cinza.png e <prefixo><vista>-zebra.png de cada vista alinhada a dois
#       eixos, com rótulo a cada duas linhas, a barra de escala num canto que não cobre rótulo nem título, e grava em
#       <prefixo>grade.json o passo, as caixas dos rótulos e a da barra de cada imagem.
#   python3 -I imagens.py linhas <linhas.json> <saida.png>
#       Desenha as polilinhas de linhas.json ({W, H, linhas: {tipo: [[[u, v], ...], ...]}}) em traço preto sobre branco; o
#       tipo 'corte' (a borda sobre um plano da caixa) sai em cinza fino.
#   python3 -I imagens.py cortes <cortes.json> <pasta> [<quadro.json>]
#       Desenha cada corte de cortes.json ({simetria_x, cortes: [{nome, eixo, valor, eixos_uv, cadeias: [[[u, v], ...]]}]}, em
#       metro) como contorno 2D em mm com grade e as cotas dos extremos e da maior saliência, em <pasta>/<nome>.png; grava a
#       tabela curta <pasta>/cotas.md e o quadro de cada desenho em <pasta>/quadro.json. Com <quadro.json>, usa o quadro dado
#       (para desenhar outra malha na mesma escala e posição) e não o regrava.
#   python3 -I imagens.py folha <pasta> <metricas.json> <vista,vista,...>
#       Compõe <pasta>/folha.png: linhas referência e candidata em cinza e em listras de reflexo e o mapa de distância,
#       colunas as vistas, e o resumo das medidas no alto.
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


def grade(arq_camera, prefixo):
    meta = json.load(open(arq_camera))
    f = fonte(16)
    registro = {}
    for v, mt in meta.items():
        c = np.array(mt['centro'], float)
        s = mt['escala']
        W, H = mt['W'], mt['H']
        xc = np.array(mt['x_cam'], float)
        yc = np.array(mt['y_cam'], float)
        px = lambda p: (W / 2 + ((p - c) @ xc) / s * W, H / 2 - ((p - c) @ yc) / s * W)
        alinhada = abs(xc).max() > 0.999 and abs(yc).max() > 0.999
        passo = passo_redondo(s * 1000 / 20)
        for tipo in ('cinza', 'zebra', 'linhas'):
            arq = f'{prefixo}{v}-{tipo}.png'
            if tipo == 'linhas' and not os.path.exists(arq):
                continue
            im = Image.open(arq).convert('RGB')
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
            im.save(arq)
            registro[f'{v}-{tipo}'] = {'passo_mm': passo if alinhada else None, 'rotulos': rotulos, 'titulo': list(caixa_titulo),
                                       'barra': [round(b, 1) for b in barra], 'barra_mm': comp_mm, 'barra_cobre_rotulo': cobre}
    json.dump(registro, open(f'{prefixo}grade.json', 'w'), indent=1)


def linhas(arq_json, saida):
    d = json.load(open(arq_json))
    im = Image.new('RGB', (d['W'], d['H']), 'white')
    dr = ImageDraw.Draw(im)
    for tipo in ('corte', 'feicao', 'dobra', 'natural'):
        cor, larg = ((150, 150, 150), 1) if tipo == 'corte' else ((0, 0, 0), 2)
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


def cortes(arq_json, pasta, arq_quadro=None):
    d = json.load(open(arq_json))
    quadros = json.load(open(arq_quadro)) if arq_quadro else {}
    W, H, M = 1200, 900, 70
    f, fp = fonte(16), fonte(14)
    tabela = ['| corte | cota | posição (mm) |', '|---|---|---|']
    novo_quadro = {}
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
        larg_m = (W - 2 * M) / q['escala_px_m']
        passo = passo_redondo(larg_m * 1000 / 12)
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
        titulo = f"corte {c['nome']}: plano {c['eixo']} = {_mm(c['valor'])} mm; {U} na horizontal, {Vn} na vertical, grade de {passo:g} mm"
        dr.rectangle(dr.textbbox((10, 8), titulo, font=f), fill=(255, 255, 255, 220))
        dr.text((10, 8), titulo, fill='black', font=f)
        caixas = [dr.textbbox((10, 8), titulo, font=f)]
        for rot, p in _cotas_do_corte(cad, meia, U, Vn):
            x, y = px(p)
            dr.ellipse([x - 5, y - 5, x + 5, y + 5], outline=(200, 0, 0), width=2)
            texto = f'{U}={_mm(p[0])}, {Vn}={_mm(p[1])} ({rot})'
            tx, ty = x + 9, y + 6
            for _ in range(12):
                bb = dr.textbbox((tx, ty), texto, font=fp)
                if bb[2] > W - 4:
                    tx = x - 9 - (bb[2] - bb[0]); bb = dr.textbbox((tx, ty), texto, font=fp)
                if not any(cruza(bb, o) for o in caixas) and bb[3] < H - M:
                    break
                ty += 18
            dr.rectangle(bb, fill=(255, 255, 255, 210))
            dr.text((tx, ty), texto, fill=(170, 0, 0), font=fp)
            caixas.append(bb)
            tabela.append(f"| {c['nome']} ({c['eixo']} = {_mm(c['valor'])}) | {rot} | {U} = {_mm(p[0])}, {Vn} = {_mm(p[1])} |")
        im.save(os.path.join(pasta, f"{c['nome']}.png"))
    open(os.path.join(pasta, 'cotas.md'), 'w').write('\n'.join(tabela) + '\n')
    if not arq_quadro:
        json.dump(novo_quadro, open(os.path.join(pasta, 'quadro.json'), 'w'), indent=1)


def folha(pasta, arq_metricas, vistas):
    met = json.load(open(arq_metricas))
    linhas = [('ref_cinza', 'referência'), ('cand_cinza', 'candidata'), ('ref_zebra', 'ref. listras'),
              ('cand_zebra', 'cand. listras'), ('mapa', 'distância')]
    cols = vistas.split(',')
    amostra = Image.open(f'{pasta}/ref_cinza-{cols[0]}.png')
    W, H = amostra.size
    ML, MT = 140, 96
    img = Image.new('RGB', (ML + W * len(cols), MT + H * len(linhas) + 40), 'white')
    dr = ImageDraw.Draw(img)
    f = fonte(17)
    rc, cr, vc = met['ref_para_cand_mm'], met['cand_para_ref_mm'], met['vincos']
    dr.text((10, 8), f"{met['nome']}: vincos F1 5/10 mm {vc['f1_5mm']}/{vc['f1_10mm']} (cobertura {vc['cobertura_5mm']}/{vc['cobertura_10mm']}, "
            f"precisão {vc['precisao_5mm']}/{vc['precisao_10mm']}, desvio mediano {vc['desvio_mediana_mm']} mm)", fill='black', font=f)
    dr.text((10, 32), f"ref→cand mediana {rc['mediana']} / p90 {rc['p90']} mm; cand→ref mediana {cr['mediana']} / p90 {cr['p90']} mm; "
            f"normal p90 {met['normal_ref_para_cand_graus']['p90']}°; vértices na caixa {met['vertices_na_caixa']}", fill='black', font=f)
    for j, c in enumerate(cols):
        dr.text((ML + j * W + 10, MT - 26), c, fill='black', font=f)
    for i, (l, rot) in enumerate(linhas):
        dr.text((8, MT + i * H + H // 2), rot, fill='black', font=f)
        for j, c in enumerate(cols):
            img.paste(Image.open(f'{pasta}/{l}-{c}.png').convert('RGB'), (ML + j * W, MT + i * H))
    m = met['mapa_max_mm']
    dr.text((10, MT + H * len(linhas) + 10),
            f'distância: azul 0 mm, ciano {m / 3:.0f} mm, amarelo {2 * m / 3:.0f} mm, vermelho {m:.0f} mm ou mais; avesso em magenta', fill='black', font=f)
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
    else:
        sys.exit('uso: imagens.py grade <camera.json> <prefixo> | linhas <linhas.json> <saida.png> | cortes <cortes.json> <pasta> [<quadro.json>] | folha <pasta> <metricas.json> <vistas>')
