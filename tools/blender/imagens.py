# imagens.py — grade em milímetro nas vistas ortográficas e folha da régua. Roda no Python do sistema, com Pillow e
# numpy, fora do Blender (o Python do Blender não traz Pillow); regua.py, pacote-cego.py e olhar-candidata.py o chamam.
#
#   python3 -I imagens.py grade <camera.json> <prefixo>
#       Desenha a grade nas imagens <prefixo><vista>-cinza.png e <prefixo><vista>-zebra.png de cada vista alinhada a dois
#       eixos, com rótulo a cada duas linhas, a barra de escala num canto que não cobre rótulo nem título, e grava em
#       <prefixo>grade.json o passo, as caixas dos rótulos e a da barra de cada imagem.
#   python3 -I imagens.py folha <pasta> <metricas.json> <vista,vista,...>
#       Compõe <pasta>/folha.png: linhas referência e candidata em cinza e em listras de reflexo e o mapa de distância,
#       colunas as vistas, e o resumo das medidas no alto.
import json, math, sys
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
        for tipo in ('cinza', 'zebra'):
            arq = f'{prefixo}{v}-{tipo}.png'
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
    elif len(sys.argv) >= 5 and sys.argv[1] == 'folha':
        folha(sys.argv[2], sys.argv[3], sys.argv[4])
    else:
        sys.exit('uso: imagens.py grade <camera.json> <prefixo> | imagens.py folha <pasta> <metricas.json> <vistas>')
