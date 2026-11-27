"""cabos.py - o cabo vivo no Blender: para cada cabo importado do .glb do Modelar, uma curva de Bézier com espessura que se refaz, com o comprimento de corte,
cada vez que as pontas (os nós vazios filhos das peças) se movem; e a gravação da forma quadro a quadro.

Quem lê o cabo são os `extras` do nó dele, que o importador deixa como propriedades personalizadas do objeto: CableLength (cm), AttachStartTo e AttachEndTo (os
nomes dos vazios), e os nossos em milímetro: comprimentoDeCorteMm, diametroMm, lados, raioMinimoDiametros e caimento. A direção de saída de cada ponta é o +Z do
vazio no Blender (o +Y do nó no glTF)."""
import time

import bpy
import numpy as np
from bpy.app.handlers import persistent
from mathutils import Vector

from . import elastica

SUFIXO = '-vivo'
CHAVE_DA_MALHA = 'modelar_malha'
CHAVE_GRAVADO = 'modelar_gravado'
CHAVE_ESTADO = 'modelar_estado'
CHAVE_RAIO = 'modelar_raio_minimo_mm'
CHAVE_COMPRIMENTO = 'modelar_comprimento_mm'

_ESTADO = {}        # nome da curva -> { 'chave': ..., 'nos': ... } (a última solução, para partir dela)
_EM_ATUALIZACAO = [False]
ULTIMA_MEDIDA = {'ms': 0.0, 'cabos': 0, 'iteracoes': 0, 'chamadas': 0}


def _ler(objeto, chave, padrao=None):
    return objeto[chave] if chave in objeto.keys() else padrao


def malhas_de_cabo():
    return [o for o in bpy.data.objects if o.type == 'MESH' and 'CableLength' in o.keys()]


def curvas_vivas():
    return [o for o in bpy.data.objects if o.type == 'CURVE' and CHAVE_DA_MALHA in o.keys()]


def _parametros(malha):
    comprimento = float(_ler(malha, 'comprimentoDeCorteMm', float(malha['CableLength']) * 10.0)) / 1000.0
    diametro = float(_ler(malha, 'diametroMm', float(malha['CableWidth']) * 10.0)) / 1000.0
    return {
        'comprimento': comprimento,
        'diametro': diametro,
        'lados': int(_ler(malha, 'lados', _ler(malha, 'NumSides', 12))),
        'raio_minimo': float(_ler(malha, 'raioMinimoDiametros', 0.0)) * diametro,
        'caimento': float(_ler(malha, 'caimento', 0.0)),
    }


def _pontas(depsgraph, malha):
    """Posição e direção de saída de cada ponta, no mundo, lidas do vazio já avaliado (a pose do quadro). None se faltar um vazio."""
    nos = []
    for chave in ('AttachStartTo', 'AttachEndTo'):
        vazio = bpy.data.objects.get(_ler(malha, chave, ''))
        if vazio is None:
            return None
        m = vazio.evaluated_get(depsgraph).matrix_world if depsgraph is not None else vazio.matrix_world
        nos.append((np.array(m.translation, dtype=float), np.array(m.to_3x3() @ Vector((0.0, 0.0, 1.0)), dtype=float)))
    return nos


def _escrever(curva, r):
    pontos = curva.data.splines[0].bezier_points
    n = len(pontos)
    pontos.foreach_set('co', r['nos'].reshape(-1))
    pontos.foreach_set('handle_left', r['esquerda'].reshape(-1))
    pontos.foreach_set('handle_right', r['direita'].reshape(-1))
    curva.data.update_tag()
    return n


def montar_cabo(malha):
    """Cria a curva viva do cabo `malha` (idempotente: refaz a que já existe). Devolve o objeto da curva."""
    nome = malha.name + SUFIXO
    p = _parametros(malha)
    nos = elastica.nos_da_haste(p['comprimento'], p['diametro'])
    curva = bpy.data.objects.get(nome)
    if curva is not None:
        bpy.data.objects.remove(curva, do_unlink=True)
    dados = bpy.data.curves.new(nome, 'CURVE')
    dados.dimensions = '3D'
    dados.resolution_u = 4
    dados.bevel_mode = 'ROUND'
    dados.bevel_depth = p['diametro'] / 2.0
    dados.bevel_resolution = max(0, max(p['lados'], 8) // 4 - 1)
    dados.use_fill_caps = True
    spline = dados.splines.new('BEZIER')
    spline.bezier_points.add(nos - 1)
    for ponto in spline.bezier_points:
        ponto.handle_left_type = 'FREE'
        ponto.handle_right_type = 'FREE'
    curva = bpy.data.objects.new(nome, dados)
    bpy.context.scene.collection.objects.link(curva)
    curva[CHAVE_DA_MALHA] = malha.name
    if malha.data and malha.data.materials:
        for material in malha.data.materials:
            dados.materials.append(material)
    malha.hide_viewport = True
    malha.hide_render = True
    malha.hide_set(True)
    _ESTADO.pop(nome, None)
    return curva


def atualizar_cabo(depsgraph, curva, forcar=False, a_frio=False):
    """Refaz a curva de `curva` para as pontas desta pose. Devolve True se refez. Pula quando as pontas e os parâmetros são os da última vez."""
    malha = bpy.data.objects.get(_ler(curva, CHAVE_DA_MALHA, ''))
    if malha is None or _ler(curva, CHAVE_GRAVADO, False):
        return False
    pontas = _pontas(depsgraph, malha)
    if pontas is None:
        return False
    p = _parametros(malha)
    (A, dA), (B, dB) = pontas
    chave = (tuple(A), tuple(dA), tuple(B), tuple(dB), p['comprimento'], p['diametro'], p['caimento'])
    anterior = _ESTADO.get(curva.name)
    if not forcar and anterior is not None and anterior['chave'] == chave:
        return False
    partida = None
    if anterior is not None and not a_frio:
        h = anterior['h']
        deslocou = max(np.linalg.norm(A - anterior['A']), np.linalg.norm(B - anterior['B']))
        virou = max(np.linalg.norm(dA - anterior['dA']), np.linalg.norm(dB - anterior['dB']))
        if deslocou < 3 * h and virou < 0.3:
            partida = anterior['nos']
    nos = len(curva.data.splines[0].bezier_points)
    r = elastica.refazer(A, B, dA, dB, p['comprimento'], nos, p['caimento'], partida)
    _escrever(curva, r)
    curva[CHAVE_ESTADO] = 'ok' if r['estado'] == 'ok' and (p['raio_minimo'] <= 0 or r['raio'] >= p['raio_minimo'] * (1 - 1e-9)) else ('estica' if r['estado'] != 'ok' else 'dobra')
    curva[CHAVE_RAIO] = r['raio'] * 1000.0 if np.isfinite(r['raio']) else 0.0
    curva[CHAVE_COMPRIMENTO] = r['comprimento'] * 1000.0
    _ESTADO[curva.name] = {'chave': chave, 'nos': r['nos'], 'A': A, 'B': B, 'dA': dA, 'dB': dB, 'h': p['comprimento'] / (nos - 1)}
    ULTIMA_MEDIDA['iteracoes'] += r['iteracoes']
    return True


def atualizar_todos(depsgraph=None, forcar=False, a_frio=False):
    """Refaz todos os cabos vivos que não estão gravados. Devolve quantos refez."""
    if _EM_ATUALIZACAO[0]:
        return 0
    _EM_ATUALIZACAO[0] = True
    try:
        if depsgraph is None:
            depsgraph = bpy.context.evaluated_depsgraph_get()
        inicio = time.perf_counter()
        ULTIMA_MEDIDA['iteracoes'] = 0
        feitos = sum(1 for c in curvas_vivas() if atualizar_cabo(depsgraph, c, forcar, a_frio))
        if feitos:
            ULTIMA_MEDIDA['ms'] = (time.perf_counter() - inicio) * 1000.0
            ULTIMA_MEDIDA['cabos'] = feitos
            ULTIMA_MEDIDA['chamadas'] += 1
        return feitos
    finally:
        _EM_ATUALIZACAO[0] = False


@persistent
def ao_atualizar(scene, depsgraph=None):
    atualizar_todos(depsgraph)


@persistent
def ao_mudar_o_quadro(scene, depsgraph=None):
    atualizar_todos(depsgraph)


def ligar():
    for lista, funcao in ((bpy.app.handlers.depsgraph_update_post, ao_atualizar), (bpy.app.handlers.frame_change_post, ao_mudar_o_quadro)):
        if funcao not in lista:
            lista.append(funcao)


def desligar():
    for lista, funcao in ((bpy.app.handlers.depsgraph_update_post, ao_atualizar), (bpy.app.handlers.frame_change_post, ao_mudar_o_quadro)):
        while funcao in lista:
            lista.remove(funcao)


def montar_todos():
    curvas = [montar_cabo(m) for m in malhas_de_cabo()]
    atualizar_todos(None, forcar=True, a_frio=True)
    return curvas


def _fcurves_da_acao(acao, dados):
    """As curvas de animação da ação, no Blender de ação em camadas (4.4 em diante: espaço, camada, faixa e canais) e no de ação plana (4.2 e 4.3)."""
    if hasattr(acao, 'fcurves'):
        return acao.fcurves
    slot = acao.slots.new(id_type='CURVE', name=dados.name)
    dados.animation_data.action_slot = slot
    camada = acao.layers.new('cabo')
    faixa = camada.strips.new(type='KEYFRAME')
    return faixa.channelbag(slot, ensure=True).fcurves


def gravar(cena, quadro_inicial=None, quadro_final=None):
    """Grava a forma de cada cabo vivo quadro a quadro, de `quadro_inicial` a `quadro_final` (padrão: o intervalo da animação da cena), como keyframes
    nos pontos e nas alças da curva (a frio em cada quadro, para a forma só depender da pose). Depois o cabo fica gravado: o addon não o refaz mais, e
    o arquivo reproduz a forma sem o addon. Devolve o número de quadros gravados."""
    inicio = cena.frame_start if quadro_inicial is None else quadro_inicial
    fim = cena.frame_end if quadro_final is None else quadro_final
    curvas = [c for c in curvas_vivas() if not _ler(c, CHAVE_GRAVADO, False)]
    atual = cena.frame_current
    quadros = list(range(inicio, fim + 1))
    amostras = {c.name: [] for c in curvas}
    for q in quadros:
        cena.frame_set(q)
        depsgraph = bpy.context.evaluated_depsgraph_get()
        for c in curvas:
            atualizar_cabo(depsgraph, c, forcar=True, a_frio=True)
            pontos = c.data.splines[0].bezier_points
            n = len(pontos)
            lido = np.empty((3, n * 3))
            pontos.foreach_get('co', lido[0])
            pontos.foreach_get('handle_left', lido[1])
            pontos.foreach_get('handle_right', lido[2])
            amostras[c.name].append(lido.copy())
    for c in curvas:
        dados = c.data
        if dados.animation_data is None:
            dados.animation_data_create()
        acao = bpy.data.actions.new(f'{c.name}-gravado')
        dados.animation_data.action = acao
        fcurves = _fcurves_da_acao(acao, dados)
        pontos = dados.splines[0].bezier_points
        todas = np.stack(amostras[c.name])  # quadros x 3 (co, esq, dir) x (n*3)
        nomes = ('co', 'handle_left', 'handle_right')
        for i in range(len(pontos)):
            for k, nome in enumerate(nomes):
                for eixo in range(3):
                    fc = fcurves.new(f'splines[0].bezier_points[{i}].{nome}', index=eixo)
                    fc.keyframe_points.add(len(quadros))
                    ys = todas[:, k, i * 3 + eixo]
                    fc.keyframe_points.foreach_set('co', np.stack([np.array(quadros, dtype=float), ys], axis=1).reshape(-1))
                    for kp in fc.keyframe_points:
                        kp.interpolation = 'LINEAR'
                    fc.update()
        c[CHAVE_GRAVADO] = True
    cena.frame_set(atual)
    return len(quadros)


def desgravar():
    """Tira a animação gravada dos cabos e os devolve ao modo vivo."""
    n = 0
    for c in curvas_vivas():
        if _ler(c, CHAVE_GRAVADO, False):
            if c.data.animation_data and c.data.animation_data.action:
                acao = c.data.animation_data.action
                c.data.animation_data.action = None
                bpy.data.actions.remove(acao)
            c[CHAVE_GRAVADO] = False
            _ESTADO.pop(c.name, None)
            n += 1
    return n
