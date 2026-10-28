# iou_sem_tapado.py — razão interseção/união entre a carcaça de uma foto e um desenho, sem a área que as partes fora do modelo
# tapam na foto (rodas, torre, cabine, banco, cilindro), rasterizada a 2 mm por pixel; o desenho não sabe o que fica atrás dessas
# partes, e a razão comum o puniria pelo pedaço de carcaça escondido. Uso: python3 -I iou_sem_tapado.py <foto.contornos.json>
# <desenho.contornos.json>... [--desloca=dh,dv] (desloca o desenho em mm antes de medir).
import json, sys
from PIL import Image, ImageDraw, ImageChops
esc = 2.0
args = [a for a in sys.argv[1:] if not a.startswith('--')]
desl = [0.0, 0.0]
for a in sys.argv[1:]:
    if a.startswith('--desloca='): desl = [float(x) for x in a.split('=')[1].split(',')]
def mascara(c, fora, d=(0, 0)):
    im = Image.new('1', (int(3200 / esc), int(1600 / esc)), 0); g = ImageDraw.Draw(im)
    for n, r in c['regioes'].items():
        if bool(r.get('foraDoModelo')) != fora: continue
        for p in (r.get('pedacos') or [{'contornoMm': r['contornoMm']}]):
            g.polygon([((x + d[0]) / esc + 200, im.size[1] - 200 - (y + d[1]) / esc) for x, y in p['contornoMm']], fill=1)
    return im
conta = lambda im: sum(1 for p in im.getdata() if p)
foto = json.load(open(args[0]))
a = mascara(foto, False); tapa = mascara(foto, True)
livre = ImageChops.invert(tapa)
for arq in args[1:]:
    b = ImageChops.logical_and(mascara(json.load(open(arq)), False, desl), livre)
    aa = ImageChops.logical_and(a, livre)
    i = conta(ImageChops.logical_and(aa, b)); u = conta(ImageChops.logical_or(aa, b))
    print(arq.split('/')[-2], round(i / u, 4))
