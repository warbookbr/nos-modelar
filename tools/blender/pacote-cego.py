# pacote-cego.py — prepara o pacote cego de uma malha de referência: o recorte exato pelos seis planos de uma caixa, só a
# pele que se vê de fora, e as vistas ortográficas em cinza e em listras de reflexo, com grade em milímetro, barra de escala
# e o avesso marcado em outra cor. Quem modela recebe só as vistas, sem a malha.
#
# Uso:
#   blender -b --factory-startup --python tools/blender/pacote-cego.py -- \
#       --referencia <ref.obj|.glb|.gltf|.blend> [--objeto <nome>] [--z-cima] \
#       --caixa xmin,xmax,ymin,ymax,zmin,zmax --saida <pasta> \
#       [--config <cfg.json>] [--simetria-x] [--rotulos <rotulos.json>] [--excluir a,b] [--oclusores <malha>] \
#       [--resolucao 1400x1050]
#
# O preparo, em comum.preparar_referencia: (1) bisect pelos seis planos, sem preenchimento, de modo que nenhum triângulo
# atravessa a borda da caixa; (2) visibilidade de cada triângulo por quatro pontos e raios pela normal, contra ela e pelas
# direções permitidas ao observador, contra a referência inteira mais os oclusores; (3) rótulos excluídos fora; (4) painéis,
# faces ligadas por aresta com diedro abaixo de angulo_painel, entram inteiros quando a maior parte da área se vê de fora,
# de modo que a borda do que fica é corte, borda livre ou dobra; (5) componentes com menos de fracao_componente da área do
# maior saem. A configuração, as vistas e o padrão de cada chave estão em comum.PADRAO.
#
# Grava em <saida>/: vistas/<vista>-cinza.png e vistas/<vista>-zebra.png, vistas/camera.json (centro, escala, tamanho e eixos
# de cada câmera, para olhar-candidata.py), vistas/grade.json (passo, rótulos e barra de cada imagem) e pacote.json (caixa,
# simetria, contagens do recorte, bordas por tipo e a fração de avesso de cada vista cinza). Nenhuma malha é gravada.
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import comum as C

a = C.argumentos()
for k in ('referencia', 'saida'):
    if k not in a:
        C.erro(f'falta --{k}')
cfg = C.configuracao(a)
z_cima = bool(a.get('z_cima'))
V, F, P = C.ler_malha(a['referencia'], a.get('objeto'), z_cima)
rot = C.rotulos_dos_triangulos(a.get('rotulos'), V, F, P)
prep = C.preparar_referencia(V, F, rot, cfg, C.ler_oclusores(a.get('oclusores'), z_cima))

pasta = os.path.join(a['saida'], 'vistas')
os.makedirs(pasta, exist_ok=True)
Vk, Fk = C.compactar(prep['V'], prep['F'][prep['manter']])
C.limpar_cena(cfg['amostras_render'])
C.camera()
inteira = C.malha_de_arrays('referencia', Vk, Fk)
Fm = C.so_metade_positiva(Vk, Fk)
meia = C.malha_de_arrays('metade', *C.compactar(Vk, Fm)) if len(Fm) else inteira
vistas = C.completar_vistas(cfg, prep['regiao'])
avesso = {}
for v in vistas:
    obj = meia if v.get('meia') else inteira
    for o in (inteira, meia):
        o.hide_render = o is not obj
    for tipo in ('cinza', 'zebra'):
        arq = os.path.join(pasta, f"{v['nome']}-{tipo}.png")
        C.renderizar([obj], tipo, v, arq, cfg['avesso'])
        if tipo == 'cinza':
            avesso[v['nome']] = C.fracao_de_avesso(arq, cfg['avesso'])
camera = {v['nome']: {k: v[k] for k in ('centro', 'escala', 'W', 'H', 'x_cam', 'y_cam', 'z_cam', 'direcao', 'cima')} | {'meia': bool(v.get('meia'))}
          for v in vistas}
json.dump(camera, open(os.path.join(pasta, 'camera.json'), 'w'), indent=1)
C.imagens('grade', os.path.join(pasta, 'camera.json'), pasta + os.sep)

pacote = {
    'caixa': cfg['caixa'].tolist(), 'simetria_x': cfg['simetria_x'], 'regiao_do_recorte': prep['regiao'].tolist(),
    'contagens': prep['contagens'], 'avesso': avesso, 'vistas': [v['nome'] for v in vistas],
    'configuracao': {k: cfg[k] for k in ('margem', 'visibilidade', 'angulo_painel', 'fracao_painel_visivel', 'fracao_componente',
                                         'excluir', 'resolucao', 'amostras_render', 'avesso')},
}
json.dump(pacote, open(os.path.join(a['saida'], 'pacote.json'), 'w'), ensure_ascii=False, indent=1)
print('PACOTE', json.dumps({'contagens': prep['contagens'], 'avesso': avesso}, ensure_ascii=False))
