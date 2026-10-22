# olhar-candidata.py — renderiza uma malha candidata nas mesmas câmeras, escala, recorte e grade das vistas de um pacote
# cego, para quem modelou comparar lado a lado com as vistas que recebeu.
#
# Uso:
#   blender -b --factory-startup --python tools/blender/olhar-candidata.py -- \
#       --candidata <cand.obj|.glb|.gltf|.blend> [--objeto <nome>] [--z-cima] --pacote <pasta do pacote> --saida <prefixo>
#
# Lê <pacote>/pacote.json (caixa, simetria e configuração) e <pacote>/vistas/camera.json, recorta a candidata pelos mesmos
# seis planos (bisect, sem preenchimento, sem filtro de visibilidade: a candidata aparece inteira dentro da caixa) e grava
# <prefixo><vista>-cinza.png, <prefixo><vista>-zebra.png, <prefixo><vista>-linhas.png (as linhas de feição e as bordas da
# candidata, com o mesmo angulo_feicao do pacote), <prefixo>grade.json, <prefixo>olhar.json com a fração de avesso de cada
# vista cinza e, se o pacote tem cortes, <prefixo>cortes/<nome>.png e <prefixo>cortes/cotas.md, os cortes da candidata nos
# mesmos planos e no mesmo quadro dos desenhos do pacote, e <prefixo>cortes/contornos.json, o contorno exato da candidata
# em cada corte, em mm no plano dele, que comparar-cortes.py mede contra o contorno lido do pacote. Grava também
# <prefixo>vincos.json, o traço preto da candidata em 3D (vincos com diedro acima de angulo_feicao, bordas livres e os vincos
# que a malha declara, que só o .blend guarda), trecho a trecho, visível em cada vista e em alguma delas, que
# comparar-vincos.py mede contra as linhas de feição lidas do pacote; os vincos declarados saem em preto também nas linhas.
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
todas = np.ones(len(Fr), bool)
declarados = C.recortar_segmentos(C.ler_vincos_declarados(a['candidata'], a.get('objeto'), bool(a.get('z_cima'))), regiao)
angulo = cfg.get('angulo_feicao', 25.0)
trechos = {}
contagem = C.desenhar_linhas(Vr, Fr, todas, regiao, angulo, [v | {'nome': n} for n, v in camera.items()], a['saida'],
                             declarados=declarados, trechos_3d=trechos)
# o traço preto da candidata em 3D, visível em cada vista e em alguma delas, para comparar-vincos.py medir contra as linhas
# lidas do pacote
lista = lambda ts: [{'tipo': t, 'pontos_m': np.round(T, 6).tolist()} for t, T in ts]
json.dump({'origem': 'candidata, recortada pela caixa do pacote', 'unidade': 'm', 'angulo_feicao': angulo, 'passo_m': 0.002,
           'segmentos': contagem, 'vistas': {n: lista(trechos[n]) for n in camera}, 'qualquer_vista': lista(trechos['_qualquer'])},
          open(f"{a['saida']}vincos.json", 'w'))
C.imagens('grade', arq_camera, a['saida'])
quadro = os.path.join(a['pacote'], 'cortes', 'quadro.json')
if cfg.get('cortes') and os.path.exists(quadro):
    import tempfile
    pc = f"{a['saida']}cortes"
    os.makedirs(pc, exist_ok=True)
    cs = C.contornos_dos_cortes(Vr, Fr, todas, cfg['cortes'])
    with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as t:
        json.dump({'simetria_x': pacote['simetria_x'], 'cortes': [{k: c[k] for k in ('nome', 'eixo', 'valor', 'eixos_uv')} |
                   {'cadeias': [P.round(6).tolist() for P in c['cadeias_uv']]} for c in cs]}, t)
    C.imagens('cortes', t.name, pc, quadro)
    os.unlink(t.name)
    # o contorno exato da candidata em mm, para comparar-cortes.py medir contra o contorno lido do pacote
    contornos = []
    for c in cs:
        polis = []
        for P in c['cadeias_uv']:
            fechada = len(P) > 2 and float(np.linalg.norm(P[0] - P[-1])) < 1e-6
            Q = P[:-1] if fechada else P
            polis.append({'fechada': fechada, 'pontos_mm': np.round(Q * 1000, 3).tolist()})
        contornos.append({'corte': c['nome'], 'eixo': c['eixo'], 'valor_mm': round(c['valor'] * 1000, 3), 'eixos_uv': c['eixos_uv'],
                          'polilinhas': polis})
    json.dump({'origem': 'candidata, recortada pela caixa do pacote', 'unidade': 'mm', 'cortes': contornos},
              open(os.path.join(pc, 'contornos.json'), 'w'), indent=1)
json.dump({'triangulos_recorte': int(len(Fr)), 'area_m2': round(float(C.normais(Vr, Fr)[1].sum()), 6), 'avesso': avesso}, open(f"{a['saida']}olhar.json", 'w'), indent=1)
print('OLHAR', json.dumps(avesso))
