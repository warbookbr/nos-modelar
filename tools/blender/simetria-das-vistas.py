# simetria-das-vistas.py — confere se as vistas de linhas de um pacote cego feito com simetria em x saem simétricas: em cada
# vista cujo eixo horizontal é x (frente, traseira e topo), o traço preto espelhado na horizontal cai sobre ele mesmo. Sem
# malha e sem Blender (Python do sistema com Pillow e numpy).
#
# Uso:
#   python3 tools/blender/simetria-das-vistas.py --pacote <pasta do pacote ou vistas/> [--vista frente,traseira] [--saida <arq.json>]
#
# O traço preto sai da imagem como em ler-linhas, com a grade, o título e a barra tirados por redesenho (leitura.bases_da_vista);
# o que a letra e a barra cobrem fica desconhecido e sai da conta nas duas imagens. Para cada pixel de traço, mede-se a
# distância, em pixel, ao traço mais perto na imagem espelhada pelo centro da câmera, e o resultado traz, por vista, a
# distância máxima e o p99, a fração de pixels de traço a mais de 1 px e o desvio do centro da câmera em x, em pixel.
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import leitura as L


def distancia_ao_traco(B, alcance=8):
    """Distância de cada pixel ao pixel de B mais perto, por varredura de deslocamentos até alcance px (acima dele, alcance + 1)."""
    D = np.full(B.shape, float(alcance + 1))
    for dy in range(-alcance, alcance + 1):
        for dx in range(-alcance, alcance + 1):
            d = (dy * dy + dx * dx) ** 0.5
            if d > alcance:
                continue
            D = np.where(L.desloca(B, dy, dx), np.minimum(D, d), D)
    return D


a = L.argumentos()
if 'pacote' not in a:
    L.erro('falta --pacote <pasta do pacote ou vistas/>')
pasta, _ = L.pastas_do_pacote(a['pacote'])
cameras = json.load(open(os.path.join(pasta, 'camera.json')))
nomes = [s for s in a['vista'].split(',') if s] if isinstance(a.get('vista'), str) else \
    [v for v, mt in cameras.items() if abs(abs(mt['x_cam'][0]) - 1) < 1e-9 and not mt.get('meia')]
out = {}
for v in nomes:
    mt = cameras[v]
    if abs(abs(mt['x_cam'][0]) - 1) > 1e-9:
        L.erro(f'a vista {v} não tem x na horizontal')
    rgb = np.asarray(Image.open(os.path.join(pasta, f'{v}-linhas.png')).convert('RGB'))
    preto, _, desc, _ = L.bases_da_vista(rgb, v, mt)
    # o espelho em x pelo centro da câmera: o pixel de coluna i cobre [i, i + 1) e vai a [W - 1 - i, W - i) quando o centro
    # está em x = 0; o desvio do centro em pixel desloca o espelho
    desvio_px = mt['centro'][0] / mt['escala'] * mt['W'] * (1 if mt['x_cam'][0] > 0 else -1)
    fora = desc | desc[:, ::-1]
    B = preto & ~fora
    Bm = B[:, ::-1]
    d1 = distancia_ao_traco(Bm)[B]
    d2 = distancia_ao_traco(B)[Bm]
    d = np.concatenate([d1, d2])
    out[v] = {'pixels_traco': int(B.sum()), 'desvio_centro_px': round(float(desvio_px), 4) + 0.0,
              'maxima_px': round(float(d.max()), 3) if len(d) else None,
              'p99_px': round(float(np.percentile(d, 99)), 3) if len(d) else None,
              'fracao_acima_1px': round(float((d > 1.0 + 1e-9).mean()), 5) if len(d) else None}
L.gravar_json({'ferramenta': 'simetria-das-vistas', 'unidade': 'px', 'vistas': out}, a.get('saida'))
