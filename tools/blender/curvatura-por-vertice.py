# curvatura-por-vertice.py — roda curvatura-da-lataria.py no python3 do sistema, sem o Blender e sem render, e grava a curvatura
# de cada vértice que o script pintaria: é a régua contra a qual o módulo da bancada (src/autoria/curvatura-da-lataria.js) se mede.
# O Blender (bpy, bmesh, mathutils) entra como módulo de mentira, e as funções de comum.py que montam a cena e renderizam viram
# nada: as vistas saem vazias, e malha_de_arrays guarda a malha soldada e a cor de cada vértice. superficie.curvatura_media e
# superficie.faixa_dos_vincos são as do script, só observadas, de modo que a conta e a escolha da lataria são as dele, linha a linha.
#
# Uso:
#   python3 tools/blender/curvatura-por-vertice.py <saida.json> -- <os argumentos de curvatura-da-lataria.py, sem --vista>
#
# Grava em <saida.json> {V, cores, lataria, H, valido, faixa, resumo}: V (vértices soldados, m), cores (RGB de cada um), lataria
# (o índice em V de cada vértice da lataria), H (1/m, null sem dado), valido e faixa (0 ou 1, por vértice da lataria) e resumo (o
# curvatura.json que o script grava, com a escala e a faixa).
import json, math, os, runpy, sys
from unittest.mock import MagicMock

AQUI = os.path.dirname(os.path.abspath(__file__))
for m in ('bpy', 'bmesh', 'mathutils', 'mathutils.bvhtree', 'mathutils.kdtree'):
    sys.modules[m] = MagicMock()
sys.path.insert(0, AQUI)
import comum as C  # noqa: E402
import superficie as S  # noqa: E402

if len(sys.argv) < 3 or sys.argv[2] != '--':
    print('uso: python3 curvatura-por-vertice.py <saida.json> -- <argumentos de curvatura-da-lataria.py>', file=sys.stderr)
    sys.exit(2)
saida = sys.argv[1]
visto = {}

curvatura_media = S.curvatura_media
faixa_dos_vincos = S.faixa_dos_vincos


def observa_curvatura(V, F, raio, angulo_borda=60.0, **k):
    H, valido = curvatura_media(V, F, raio, angulo_borda, **k)
    visto.update(Vl=V, H=H, valido=valido)
    return H, valido


def observa_faixa(V, segmentos, largura):
    faixa = faixa_dos_vincos(V, segmentos, largura)
    visto['faixa'] = faixa
    return faixa


def guarda_malha(nome, V, F, cores=None, **k):
    visto.update(V=V, cores=cores)
    return MagicMock()


S.curvatura_media = observa_curvatura
S.faixa_dos_vincos = observa_faixa
C.malha_de_arrays = guarda_malha
C.vistas_da_linha = lambda a, cfg, regiao: []
for f in ('limpar_cena', 'fundo_escuro', 'camera', 'renderizar', 'imagens'):
    setattr(C, f, lambda *a, **k: None)

script = os.path.join(AQUI, 'curvatura-da-lataria.py')
sys.argv = [script, '--'] + sys.argv[3:]
runpy.run_path(script, run_name='__main__')

import numpy as np  # noqa: E402
V, Vl = visto['V'], visto['Vl']
# o índice em V de cada vértice da lataria: o script os tira de V pela lista ordenada dos usados, e a solda não repete posição
indice = {tuple(p): i for i, p in enumerate(V.tolist())}
lataria = [indice[tuple(p)] for p in Vl.tolist()]
args = C.argumentos()
resumo = json.load(open(f"{args['saida']}curvatura.json"))
faixa = visto.get('faixa', np.zeros(len(Vl), bool))
json.dump({
    'V': V.tolist(),
    'cores': [[None if math.isnan(c) else c for c in cor] for cor in visto['cores'].tolist()],
    'lataria': lataria,
    'H': [None if math.isnan(h) else h for h in visto['H'].tolist()],
    'valido': [int(b) for b in visto['valido']],
    'faixa': [int(b) for b in faixa],
    'resumo': resumo,
}, open(saida, 'w'))
