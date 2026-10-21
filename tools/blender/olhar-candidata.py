# olhar-candidata.py — renderiza uma malha candidata nas mesmas câmeras, escala, recorte e grade das vistas de um pacote
# cego, para quem modelou comparar lado a lado com as vistas que recebeu.
#
# Uso:
#   blender -b --factory-startup --python tools/blender/olhar-candidata.py -- \
#       --candidata <cand.obj|.glb|.gltf|.blend> [--objeto <nome>] [--z-cima] --pacote <pasta do pacote> --saida <prefixo>
#
# Lê <pacote>/pacote.json (caixa, simetria e configuração) e <pacote>/vistas/camera.json, recorta a candidata pelos mesmos
# seis planos (bisect, sem preenchimento, sem filtro de visibilidade: a candidata aparece inteira dentro da caixa) e grava
# <prefixo><vista>-cinza.png, <prefixo><vista>-zebra.png, <prefixo>grade.json e <prefixo>olhar.json com a fração de avesso
# de cada vista cinza.
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import comum as C

a = C.argumentos()
for k in ('candidata', 'pacote', 'saida'):
    if k not in a:
        C.erro(f'falta --{k}')
pacote = json.load(open(os.path.join(a['pacote'], 'pacote.json')))
camera = json.load(open(os.path.join(a['pacote'], 'vistas', 'camera.json')))
regiao = np.array(pacote['regiao_do_recorte'], float)
cfg = pacote['configuracao']
V, F, _ = C.ler_malha(a['candidata'], a.get('objeto'), bool(a.get('z_cima')))
Vr, Fr = C.recortar(V, F[C.toca_caixa(V, F, regiao)], regiao)
if not len(Fr):
    C.erro('a caixa do pacote não corta nenhuma face da candidata')
os.makedirs(os.path.dirname(os.path.abspath(a['saida'] + 'x')), exist_ok=True)
C.limpar_cena(cfg['amostras_render'])
C.camera()
inteira = C.malha_de_arrays('candidata', Vr, Fr)
Fm = C.so_metade_positiva(Vr, Fr)
meia = C.malha_de_arrays('metade', *C.compactar(Vr, Fm)) if len(Fm) else inteira
avesso = {}
for nome, v in camera.items():
    obj = meia if v.get('meia') else inteira
    for o in (inteira, meia):
        o.hide_render = o is not obj
    for tipo in ('cinza', 'zebra'):
        arq = f"{a['saida']}{nome}-{tipo}.png"
        C.renderizar([obj], tipo, v, arq, cfg['avesso'])
        if tipo == 'cinza':
            avesso[nome] = C.fracao_de_avesso(arq, cfg['avesso'])
arq_camera = f"{a['saida']}camera.json"
json.dump(camera, open(arq_camera, 'w'), indent=1)
C.imagens('grade', arq_camera, a['saida'])
json.dump({'triangulos_recorte': int(len(Fr)), 'area_m2': round(float(C.normais(Vr, Fr)[1].sum()), 6), 'avesso': avesso}, open(f"{a['saida']}olhar.json", 'w'), indent=1)
print('OLHAR', json.dumps(avesso))
