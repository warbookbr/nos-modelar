# pacote-cego.py — prepara o pacote cego de uma malha de referência: o recorte exato pelos seis planos de uma caixa, só a
# pele que se vê de fora, e as vistas ortográficas em cinza e em listras de reflexo, com grade em milímetro, barra de escala
# e o avesso marcado em outra cor. Quem modela recebe só as vistas, sem a malha.
#
# Uso:
#   blender -b --factory-startup --python tools/blender/pacote-cego.py -- \
#       --referencia <ref.obj|.glb|.gltf|.blend> [--objeto <nome>] [--z-cima] \
#       --caixa xmin,xmax,ymin,ymax,zmin,zmax --saida <pasta> \
#       [--config <cfg.json>] [--simetria-x] [--rotulos <rotulos.json>] [--excluir a,b] [--oclusores <malha>] \
#       [--resolucao 1400x1050] [--angulo-feicao 25] [--privado <pasta fora do pacote>]
#
# O preparo, em comum.preparar_referencia: (1) bisect pelos seis planos, sem preenchimento, de modo que nenhum triângulo
# atravessa a borda da caixa; (2) visibilidade de cada triângulo por quatro pontos e raios pela normal, contra ela e pelas
# direções permitidas ao observador, contra a referência inteira mais os oclusores; (3) rótulos excluídos fora; (4) painéis,
# faces ligadas por aresta com diedro abaixo de angulo_painel, entram inteiros quando a maior parte da área se vê de fora,
# de modo que a borda do que fica é corte, borda livre ou dobra; (5) componentes com menos de fracao_componente da área do
# maior saem. A configuração, as vistas e o padrão de cada chave estão em comum.PADRAO. Com --simetria-x, as direções do
# observador formam um conjunto simétrico em x, a metade x < 0 leva a decisão da imagem espelhada de cada triângulo, e
# pacote.json traz em contagens.simetria quantos triângulos o espelho decidiu e a área mantida cujo espelho saiu (zero
# quando o recorte é simétrico; acima de zero, o pacote avisa).
#
# Além das vistas sombreadas, desenha as linhas de feição (arestas com diedro acima de angulo_feicao, padrão 25 graus) e as
# bordas do recorte, em traço preto sobre branco na mesma câmera e grade (vistas/<vista>-linhas.png), e os cortes planos da
# chave `cortes` da configuração ({nome, eixo, valor}), cada um como contorno 2D em mm com grade e cotas dos extremos e da maior
# saliência (cortes/<nome>.png), a tabela curta de cotas (cortes/cotas.md) e o quadro de cada desenho (cortes/quadro.json,
# sem contorno, para olhar-candidata.py desenhar a candidata no mesmo quadro). Os pontos do contorno, a cada
# passo_corte_regua, vão só para <privado>/cortes.json, fora do pacote, para a régua; sem --privado, não são gravados.
#
# Os cortes de detalhe: a chave `detalhes` da configuração declara regiões de detalhe, cada uma com os cortes a ampliar e a janela
# do plano (em mm, ou a projeção de uma caixa 3D), e o pacote grava, ao lado dos cortes do trecho inteiro, um corte ampliado de
# cada um, com 3 a 8 pixels por milímetro (padrão 4), a mesma calibração, grade, cotas, recorte e visibilidade, e o contorno
# cortado pela janela: cortes/<corte>-<região>.png, o quadro deles em cortes/quadro-detalhe.json, as cotas em
# cortes/cotas-detalhe.md e, em pacote.json, a lista `detalhes`. O formato da declaração está em comum.planejar_detalhes, e o
# uso, em docs/mecanifica/blender/REGUA-E-PACOTE-CEGO.md. ler-corte.py e ler-perfil.py leem esses cortes.
#
# Grava em <saida>/: vistas/<vista>-cinza.png e vistas/<vista>-zebra.png, vistas/camera.json (centro, escala, tamanho e eixos
# de cada câmera, para olhar-candidata.py), vistas/grade.json (passo, rótulos e barra de cada imagem) e pacote.json (caixa,
# simetria, contagens do recorte, bordas por tipo e a fração de avesso de cada vista cinza). Nenhuma malha é gravada.
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import comum as C
from janela import cortar_na_janela

a = C.argumentos()
for k in ('referencia', 'saida'):
    if k not in a:
        C.erro(f'falta --{k}')
cfg = C.configuracao(a)
plano_detalhes = C.planejar_detalhes(cfg)
z_cima = bool(a.get('z_cima'))
V, F, P = C.ler_malha(a['referencia'], a.get('objeto'), z_cima)
rot = C.rotulos_dos_triangulos(a.get('rotulos'), V, F, P)
prep = C.preparar_referencia(V, F, rot, cfg, C.ler_oclusores(a.get('oclusores'), bool(a.get('z_cima_oclusores'))))

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
linhas = C.desenhar_linhas(prep['V'], prep['F'], prep['manter'], prep['regiao'], cfg['angulo_feicao'], vistas, pasta + os.sep)
C.imagens('grade', os.path.join(pasta, 'camera.json'), pasta + os.sep)

cortes = []
detalhes = []
if cfg['cortes'] or cfg['detalhes']:
    import tempfile
    pc = os.path.join(a['saida'], 'cortes')
    os.makedirs(pc, exist_ok=True)
    cs = C.contornos_dos_cortes(prep['V'], prep['F'], prep['manter'], cfg['cortes'])
    if cfg['cortes']:
        with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as t:
            json.dump({'simetria_x': cfg['simetria_x'], 'cortes': [{k: c[k] for k in ('nome', 'eixo', 'valor', 'eixos_uv')} |
                       {'cadeias': [P.round(6).tolist() for P in c['cadeias_uv']]} for c in cs]}, t)
        C.imagens('cortes', t.name, pc)
        os.unlink(t.name)
    cortes = [{'nome': c['nome'], 'eixo': c['eixo'], 'valor': c['valor'], 'cadeias': len(c['cadeias_3d'])} for c in cs]
    if plano_detalhes:
        # o contorno de cada plano de detalhe: o do corte do trecho inteiro quando o plano é o mesmo, ou o calculado agora
        por_plano = {(c['eixo'], round(c['valor'], 9)): c for c in cs}
        novos = [{'nome': d['corte_base'], 'eixo': d['eixo'], 'valor': d['valor']} for d in plano_detalhes
                 if (d['eixo'], round(d['valor'], 9)) not in por_plano]
        for c in C.contornos_dos_cortes(prep['V'], prep['F'], prep['manter'], novos):
            por_plano[(c['eixo'], round(c['valor'], 9))] = c
        lista = []
        for d in plano_detalhes:
            c = por_plano[(d['eixo'], round(d['valor'], 9))]
            dentro = [x for P in c['cadeias_uv'] for x in cortar_na_janela(P, d['janela'])]
            if not dentro:
                C.erro(f"detalhes {d['regiao']}: o contorno do corte {d['corte_base']} não passa pela janela {[round(x * 1000, 1) for x in d['janela']]} mm")
            lista.append({'nome': d['nome'], 'eixo': d['eixo'], 'valor': d['valor'], 'eixos_uv': c['eixos_uv'], 'janela': d['janela'],
                          'px_por_mm': d['px_por_mm'], 'corte_base': d['corte_base'], 'regiao': d['regiao'],
                          'cadeias': [P.round(6).tolist() for P in c['cadeias_uv']]})
            detalhes.append({'nome': d['nome'], 'regiao': d['regiao'], 'corte': d['corte_base'], 'eixo': d['eixo'], 'valor': d['valor'],
                             'janela_mm': [round(x * 1000, 3) for x in d['janela']], 'px_por_mm': d['px_por_mm'], 'cadeias_na_janela': len(dentro)})
        with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as t:
            json.dump({'detalhe': True, 'simetria_x': cfg['simetria_x'], 'cortes': lista}, t)
        C.imagens('cortes', t.name, pc)
        os.unlink(t.name)
    if a.get('privado'):
        os.makedirs(a['privado'], exist_ok=True)
        json.dump({'aviso': 'pontos do contorno de cada corte; só para a régua, não vai para quem modela',
                   'passo_m': cfg['passo_corte_regua'], 'cortes': [{'nome': c['nome'], 'eixo': c['eixo'], 'valor': c['valor'],
                   'cadeias': [C.reamostrar_polilinha(P, cfg['passo_corte_regua']).round(5).tolist() for P in c['cadeias_3d']]} for c in cs]},
                  open(os.path.join(a['privado'], 'cortes.json'), 'w'), indent=1)

pacote = {
    'caixa': cfg['caixa'].tolist(), 'simetria_x': cfg['simetria_x'], 'regiao_do_recorte': prep['regiao'].tolist(),
    'contagens': prep['contagens'], 'avesso': avesso, 'vistas': [v['nome'] for v in vistas], 'linhas': linhas, 'cortes': cortes, 'detalhes': detalhes,
    'configuracao': {k: cfg[k] for k in ('margem', 'visibilidade', 'angulo_painel', 'fracao_painel_visivel', 'fracao_componente',
                                         'excluir', 'resolucao', 'amostras_render', 'avesso', 'angulo_feicao', 'cortes', 'detalhes')},
}
json.dump(pacote, open(os.path.join(a['saida'], 'pacote.json'), 'w'), ensure_ascii=False, indent=1)
sim = prep['contagens'].get('simetria')
if sim and sim['area_espelho_tirado_m2'] > 0:
    print(f"AVISO: o recorte não saiu simétrico em x: {sim['triangulos_espelho_tirado']} triângulos mantidos "
          f"({sim['area_espelho_tirado_m2']} m²) têm o espelho tirado", file=sys.stderr)
print('PACOTE', json.dumps({'contagens': prep['contagens'], 'avesso': avesso}, ensure_ascii=False))
