# luz-rasante.py — renderiza uma malha em material fosco sob uma luz de sol baixa, quase paralela ao plano da imagem, e sem luz
# de ambiente. É a vista que mostra o amassado largo e raso, que a zebra, a distância mediana, o mapa de distância e a curvatura
# de raio curto não mostram: uma inclinação de 1 grau na superfície muda o brilho em dezenas por cento quando a luz passa a 10
# graus dela, e o olho lê essa diferença como relevo.
#
# Uso:
#   blender -b --factory-startup --python tools/blender/luz-rasante.py -- \
#       --malha <obj|.glb|.gltf|.blend> [--objeto <nome>] [--z-cima] --saida <prefixo> \
#       [--referencia <obj|.glb|.gltf|.blend> [--objeto-referencia <nome>]] \
#       [--vista frente,lado,topo,tresquartos | --direcao x,y,z [--cima x,y,z]] [--rasante-graus 10] [--azimutes <a,b>] \
#       [--caixa xmin,xmax,ymin,ymax,zmin,zmax] [--regiao xmin,xmax,ymin,ymax,zmin,zmax] [--resolucao 1400x1050] [--config <cfg.json>]
#
# A câmera é ortográfica e olha a malha pela direção da vista (as de vistas_padrao, ou `--direcao` para olhar ao longo da normal
# do painel que se quer ver). O sol viaja com a inclinação `rasante-graus` sobre o plano da imagem, para dentro da cena, e no
# plano da imagem na direção `azimute` (graus, de x da câmera para y da câmera). Os dois azimutes de cada vista são escolhidos
# pelo que a câmera dela vê (superficie.escolher_azimutes): a malha é amostrada por raios numa grade de pixels, e cada azimute vale
# a fração das amostras que a luz alcança fora da sombra e a até 30 graus da superfície delas; fica o par a 90 graus um do outro
# (um relevo alongado na direção de uma luz aparece na outra) em que a pior das duas imagens tem mais luz rasante, e o de 30 e 120
# quando ele está a até 5 pontos do melhor. Com 30 e 120 em todas as vistas, a luz de 30 graus da vista de três quartos vinha de um lado que a câmera não vê, e a
# imagem saía quase toda preta. `--azimutes a,b` fixa os mesmos azimutes em todas as vistas. O material é difuso de albedo 0,8, o
# mundo é preto e a exposição é calculada para uma superfície que enfrenta a câmera sair com 0,2 de radiância linear, qualquer
# que seja o ângulo. Sem malha de referência o resultado é o mesmo; com ela, a referência sai sob a mesma câmera e a mesma luz, e
# as duas ficam lado a lado.
#
# Cada imagem sai do render com fundo transparente, e imagens.py mede nela a fração da peça que a luz alcança
# (superficie.fracao_iluminada) antes de regravá-la sobre fundo preto; o pacote do crítico recusa a imagem quase toda escura
# (tools/modelar/vistas-de-superficie.mjs).
#
# Grava <prefixo><vista>-rasante-az<azimute>.png, com a referência <prefixo><vista>-rasante-az<azimute>-referencia.png e
# <prefixo><vista>-rasante-az<azimute>-lado-a-lado.png, e <prefixo>rasante.json com a luz, a câmera e os azimutes de cada vista
# (com a fração que a amostragem estimou) e, para cada imagem, a fração iluminada medida no PNG (`iluminacao`, e
# `iluminacao_referencia`) e o contraste da região de --regiao (superficie.contraste_na_regiao) na malha e na referência.
import json, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
import comum as C
import superficie as S

ALVO_LINEAR = 0.2    # radiância linear de uma superfície que enfrenta a câmera: 0,48 no PNG, com folga até o branco
AMOSTRAS = (128, 96)  # a grade de pixels em que a malha é amostrada para escolher os azimutes
a = C.argumentos()
for k in ('malha', 'saida'):
    if k not in a:
        C.erro(f'falta --{k}')
cfg = C.configuracao(a, exige_caixa=False)
rasante = float(a.get('rasante_graus', 10))
if not 1 <= rasante <= 45:
    C.erro(f'--rasante-graus {rasante}: use de 1 a 45 (luz rasante é a que passa a poucos graus da superfície)')
azimutes_fixos = None
if 'azimutes' in a:
    azimutes_fixos = [float(s) for s in str(a['azimutes']).split(',') if s]
    if not azimutes_fixos:
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
sc.render.film_transparent = True       # o alfa diz quais pixels são da peça; imagens.py mede e regrava sobre fundo preto
sc.render.image_settings.color_mode = 'RGBA'
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

# ---------- os azimutes de cada vista, pelo que a câmera dela vê ----------

arvore = BVHTree.FromPolygons([tuple(map(float, p)) for p in V], [tuple(map(int, f)) for f in F])


def amostras_da_vista(v):
    """Os pontos e as normais (viradas para a câmera) da malha nos pixels de uma grade AMOSTRAS da imagem da vista."""
    c, x, y, z = (np.array(v[k], float) for k in ('centro', 'x_cam', 'y_cam', 'z_cam'))
    nx, ny = AMOSTRAS
    altura = v['escala'] * v['H'] / v['W']
    olhar = Vector((-z).tolist())
    P, N = [], []
    for j in range(ny):
        for i in range(nx):
            o = c + x * v['escala'] * ((i + 0.5) / nx - 0.5) + y * altura * (0.5 - (j + 0.5) / ny) + z * 50.0
            loc, nrm, _, _ = arvore.ray_cast(Vector(o.tolist()), olhar, 200.0)
            if loc is not None:
                n = np.array(nrm, float)
                P.append(np.array(loc, float))
                N.append(n if n @ z >= 0 else -n)
    return np.array(P).reshape(-1, 3), np.array(N).reshape(-1, 3)


def sombra_de(P, N):
    """A sombra das amostras: um raio de cada uma para o lado de onde a luz vem, que bate em outra parte da malha."""
    def sombra(d, quais):
        fora = np.zeros(len(P), bool)
        de_onde = Vector((-d).tolist())
        for k in np.nonzero(quais)[0]:
            loc, _, _, _ = arvore.ray_cast(Vector((P[k] + N[k] * 1e-4).tolist()), de_onde, 100.0)
            fora[k] = loc is not None
        return fora
    return sombra


azimutes_da_vista, estimativa = {}, {}
for v in vistas:
    if azimutes_fixos is not None:
        azimutes_da_vista[v['nome']] = azimutes_fixos
        continue
    P, N = amostras_da_vista(v)
    azimutes_da_vista[v['nome']], estimativa[v['nome']] = S.escolher_azimutes(N, v, rasante, sombra_de(P, N))

# ---------- as imagens ----------

imagens, pedido = [], []
for v in vistas:
    for az in azimutes_da_vista[v['nome']]:
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
        imagens.append((v, rotulo, item))


def medir_em_lote(comando, itens):
    """Chama imagens.py `comando` sobre os itens e devolve {chave: medida}."""
    entrada, saida = f"{a['saida']}{comando}-pedido.json", f"{a['saida']}{comando}-resultado.json"
    json.dump({'itens': itens}, open(entrada, 'w'))
    C.imagens(comando, entrada, saida)
    medidas = json.load(open(saida))
    os.unlink(entrada)
    os.unlink(saida)
    return medidas


# a fração iluminada de cada imagem, medida no PNG transparente, que sai dali sobre fundo preto
iluminacao = medir_em_lote('iluminacao', [{'chave': f'{rotulo}/{quem}', 'arquivo': arq} for _, rotulo, item in imagens for quem, arq in item['arquivos'].items()])
contrastes = medir_em_lote('contraste', pedido) if pedido else {}
for v, rotulo, item in imagens:
    for quem in list(item['arquivos']):
        item['iluminacao' if quem == 'malha' else 'iluminacao_referencia'] = iluminacao[f'{rotulo}/{quem}']
        if f'{rotulo}/{quem}' in contrastes:
            item['contraste' if quem == 'malha' else 'contraste_referencia'] = contrastes[f'{rotulo}/{quem}']
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
imagens = [item for _, _, item in imagens]

camera = {v['nome']: {k: v[k] for k in ('centro', 'escala', 'W', 'H', 'x_cam', 'y_cam', 'z_cam', 'direcao', 'cima')} for v in vistas}
json.dump({'rasante_graus': rasante, 'azimutes': azimutes_da_vista, 'escolha_dos_azimutes': 'fixos' if azimutes_fixos is not None else 'pela vista',
           'estimativa_dos_azimutes': {n: {f'{k:g}': f for k, f in e.items()} for n, e in estimativa.items()},
           'albedo': C.ALBEDO_FOSCO, 'energia_do_sol': round(sol.energy, 4),
           'regiao': caixa_da_regiao, 'camera': camera, 'imagens': imagens}, open(f"{a['saida']}rasante.json", 'w'), indent=1)
print('RASANTE', json.dumps({'imagens': len(imagens),
                             'iluminada': {f"{i['vista']}-az{i['azimute']:g}": i['iluminacao']['fracao'] for i in imagens},
                             'contraste': {f"{i['vista']}-az{i['azimute']:g}": i.get('contraste', {}).get('contraste') for i in imagens}}))
