# iou_regioes.py — razão interseção/união contra a união das partes da referência (sem as fora do modelo), rasterizada a 2 mm
# por pixel; usada na prova da carcaça porque a razão da ferramenta mede só o anel de fora da silhueta.
# Uso: python3 -I iou_regioes.py <referencia.contornos.json> <desenho.contornos.json>...
import json,sys
from PIL import Image, ImageDraw, ImageChops
ref=json.load(open(sys.argv[1])); esc=2.0  # mm por pixel
def mascara(c):
    im=Image.new('1',(int(2400/esc),int(1000/esc)),0); g=ImageDraw.Draw(im)
    for n,r in c['regioes'].items():
        if r.get('foraDoModelo'): continue
        for p in (r.get('pedacos') or [{'contornoMm':r['contornoMm']}]):
            g.polygon([(x/esc+20, im.size[1]-20-y/esc) for x,y in p['contornoMm']],fill=1)
    return im
a=mascara(ref)
for arq in sys.argv[2:]:
    b=mascara(json.load(open(arq)))
    i=sum(1 for p in ImageChops.logical_and(a,b).getdata() if p)
    u=sum(1 for p in ImageChops.logical_or(a,b).getdata() if p)
    print(arq.split('/')[-2], round(i/u,4))
