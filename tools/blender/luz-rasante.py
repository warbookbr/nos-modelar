# luz-rasante.py — renderiza uma malha em material fosco sob uma luz de sol baixa, quase paralela à superfície que a câmera
# enfrenta, e sem luz de ambiente. É a vista que mostra o amassado largo e raso, que a zebra, a distância mediana, o mapa de
# distância e a curvatura de raio curto não mostram: uma inclinação de 1 grau na superfície muda o brilho em dezenas por cento
# quando a luz passa a 10 graus dela, e o olho lê essa diferença como relevo.
#
# Uso:
#   blender -b --factory-startup --python tools/blender/luz-rasante.py -- \
#       --malha <obj|.glb|.gltf|.blend> [--objeto <nome>] [--z-cima] --saida <prefixo> \
#       [--referencia <obj|.glb|.gltf|.blend> [--objeto-referencia <nome>]] \
#       [--vista frente,lado,topo,tresquartos | --direcao x,y,z [--cima x,y,z]] [--rasante-graus 10] [--azimutes 30,120] \
#       [--caixa xmin,xmax,ymin,ymax,zmin,zmax] [--regiao xmin,xmax,ymin,ymax,zmin,zmax] [--resolucao 1400x1050] [--config <cfg.json>]
#
# A câmera é ortográfica e olha a malha pela direção da vista (as de vistas_padrao, ou `--direcao` para olhar ao longo da normal
# do painel que se quer ver, que é o que a vista rasante pede: a luz só é rasante para a superfície que a câmera enfrenta). O sol
# viaja no plano da imagem, na direção `azimute` (graus, de x da câmera para y da câmera), com a inclinação `rasante-graus` para
# dentro da cena; com dois azimutes (padrão 30 e 120, quase perpendiculares) um relevo alongado na direção de uma luz aparece na
# outra. O material é difuso de albedo 0,8, o mundo é preto e a exposição é calculada para uma superfície que enfrenta a câmera
# sair com 0,2 de radiância linear, qualquer que seja o ângulo. Sem malha de referência o resultado é o mesmo; com ela, a
# referência sai sob a mesma câmera e a mesma luz, e as duas ficam lado a lado.
#
# Grava <prefixo><vista>-rasante-az<azimute>.png, com a referência <prefixo><vista>-rasante-az<azimute>-referencia.png e
# <prefixo><vista>-rasante-az<azimute>-lado-a-lado.png, e <prefixo>rasante.json com a luz, a câmera de cada vista e, para cada
# imagem, o contraste da região de --regiao (superficie.contraste_na_regiao) na malha e na referência.
import json, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import bpy
from mathutils import Vector
import comum as C
import superficie as S

ALVO_LINEAR = 0.2    # radiância linear de uma superfície que enfrenta a câmera: 0,48 no PNG, com folga até o branco
a = C.argumentos()
for k in ('malha', 'saida'):
    if k not in a:
        C.erro(f'falta --{k}')
cfg = C.configuracao(a, exige_caixa=False)
rasante = float(a.get('rasante_graus', 10))
if not 1 <= rasante <= 45:
    C.erro(f'--rasante-graus {rasante}: use de 1 a 45 (luz rasante é a que passa a poucos graus da superfície)')
azimutes = [float(s) for s in str(a.get('azimutes', '30,120')).split(',') if s]
if not azimutes:
    C.erro('--azimutes vazio')
z_cima = bool(a.get('z_cima'))
V, F, _ = C.ler_malha(a['malha'], a.get('objeto'), z_cima)
Vr = Fr = None
if 'referencia' in a:
    Vr, Fr, _ = C.ler_malha(a['referencia'], a.get('objeto_referencia'), z_cima)
if 'caixa' in cfg:
    regiao = cfg['caixa']
else:
    todos = V if Vr is None else np.vstack([V, Vr])
    regiao = np.stack([todos.min(0), todos.max(0)], 1)
caixa_da_regiao = None
if 'regiao' in a:
    caixa_da_regiao = [float(s) for s in str(a['regiao']).split(',')]
    if len(caixa_da_regiao) != 6:
        C.erro('--regiao pede seis números: xmin,xmax,ymin,ymax,zmin,zmax (m)')

vistas = C.vistas_da_linha(a, cfg, regiao)

pasta = os.path.dirname(os.path.abspath(a['saida'] + 'x'))
os.makedirs(pasta, exist_ok=True)
sc = C.limpar_cena(cfg['amostras_render'])
C.fundo_escuro(0.0)
C.camera()
objetos = {'malha': C.malha_de_arrays('malha', V, F)}
if Vr is not None:
    objetos['referencia'] = C.malha_de_arrays('referencia', Vr, Fr)
sol = bpy.data.lights.new('sol', 'SUN')
sol.angle = math.radians(0.5)
# o brilho de uma superfície difusa de albedo r sob um sol de força E que incide a theta da normal é r E cos(theta) / pi, e a
# superfície que a câmera enfrenta tem a luz a `rasante` graus dela, ou seja cos(theta) = sin(rasante)
sol.energy = math.pi * ALVO_LINEAR / (C.ALBEDO_FOSCO * math.sin(math.radians(rasante)))
objeto_sol = bpy.data.objects.new('sol', sol)
sc.collection.objects.link(objeto_sol)

imagens, pedido = [], []
for v in vistas:
    for az in azimutes:
        d = S.direcao_da_luz(v, rasante, az)
        objeto_sol.rotation_euler = Vector(d.tolist()).to_track_quat('-Z', 'Y').to_euler()
        rotulo = f"{v['nome']}-rasante-az{az:g}"
        item = {'vista': v['nome'], 'azimute': az, 'direcao_da_luz': [round(float(x), 5) for x in d], 'arquivos': {}}
        for quem, obj in objetos.items():
            for o in objetos.values():
                o.hide_render = o is not obj
            arq = f"{a['saida']}{rotulo}{'' if quem == 'malha' else '-referencia'}.png"
            C.renderizar([obj], 'fosco', v, arq, cfg['avesso'])
            item['arquivos'][quem] = arq
            if caixa_da_regiao:
                pedido.append({'chave': f"{rotulo}/{quem}", 'arquivo': arq, 'retangulo': list(S.regiao_em_pixels(caixa_da_regiao, v))})
        if 'referencia' in objetos:
            arq = f"{a['saida']}{rotulo}-lado-a-lado.png"
            pj = f"{a['saida']}{rotulo}-lado-a-lado.json"
            json.dump({'saida': arq, 'px_por_mm': v['W'] / (v['escala'] * 1000), 'fundo': 0,
                       'paineis': [{'arquivo': item['arquivos']['malha'], 'titulo': 'malha', 'subtitulo': os.path.basename(a['malha'])},
                                   {'arquivo': item['arquivos']['referencia'], 'titulo': 'referência', 'subtitulo': os.path.basename(a['referencia'])}]},
                      open(pj, 'w'))
            C.imagens('lado_a_lado', pj)
            os.unlink(pj)
            item['arquivos']['lado_a_lado'] = arq
        imagens.append(item)

contrastes = {}
if pedido:
    entrada = f"{a['saida']}contraste-pedido.json"
    saida = f"{a['saida']}contraste-resultado.json"
    json.dump({'itens': pedido}, open(entrada, 'w'))
    C.imagens('contraste', entrada, saida)
    contrastes = json.load(open(saida))
    os.unlink(entrada)
    os.unlink(saida)
for item in imagens:
    rotulo = f"{item['vista']}-rasante-az{item['azimute']:g}"
    for quem in item['arquivos']:
        if f'{rotulo}/{quem}' in contrastes:
            item['contraste' if quem == 'malha' else 'contraste_referencia'] = contrastes[f'{rotulo}/{quem}']
camera = {v['nome']: {k: v[k] for k in ('centro', 'escala', 'W', 'H', 'x_cam', 'y_cam', 'z_cam', 'direcao', 'cima')} for v in vistas}
json.dump({'rasante_graus': rasante, 'azimutes': azimutes, 'albedo': C.ALBEDO_FOSCO, 'energia_do_sol': round(sol.energy, 4),
           'regiao': caixa_da_regiao, 'camera': camera, 'imagens': imagens}, open(f"{a['saida']}rasante.json", 'w'), indent=1)
print('RASANTE', json.dumps({'imagens': len(imagens), 'contraste': {f"{i['vista']}-az{i['azimute']:g}": i.get('contraste', {}).get('contraste')
                                                                    for i in imagens}}))
