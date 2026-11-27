# cabo-vivo.py — monta no Blender o cabo vivo de um .glb exportado pelo Modelar: para cada cabo, uma curva com espessura cujas pontas
# ficam presas (hooks) aos nós vazios das pontas, que são filhos das peças. Girar o nó da junta no Blender leva a peça, o vazio e a ponta
# da curva junto, e o cabo se curva entre as duas pontas. A malha estática do cabo (a da pose de repouso) fica escondida.
#
# Como usar: importe o .glb (File > Import > glTF 2.0), abra este arquivo na aba Scripting e rode (Run Script); ou, sem janela:
#   blender -b --python cabo-vivo.py -- montagem.glb [saida.blend]
# Quem lê o cabo são os `extras` do nó dele, que o importador deixa como propriedades personalizadas do objeto: CableLength e CableWidth (em cm,
# como o componente de cabo da Unreal), NumSegments, NumSides, AttachStartTo e AttachEndTo (os nomes dos vazios das pontas), e os nossos em milímetro
# (comprimentoDeCorteMm, diametroMm, lados). A curva é um Bézier de dois pontos: a tangente de cada ponta segue a direção da porta (o +Z do vazio no
# Blender, o +Y do nó no glTF), e o tamanho das alças é o que dá à curva o comprimento de corte na pose de repouso. Não é física de corda: o comprimento
# fica o de repouso só enquanto a distância entre as pontas é a de repouso; fora dela o Bézier estica ou afrouxa, e o cabo de verdade vem da família.
import math
import sys

import bpy
from mathutils import Vector

LADOS_MINIMO = 8


def _ler(objeto, chave, padrao=None):
    return objeto[chave] if chave in objeto.keys() else padrao


def _comprimento_do_bezier(p0, h0, h1, p1, amostras=96):
    anterior = p0
    total = 0.0
    for i in range(1, amostras + 1):
        t = i / amostras
        u = 1 - t
        ponto = (u ** 3) * p0 + 3 * u * u * t * h0 + 3 * u * t * t * h1 + (t ** 3) * p1
        total += (ponto - anterior).length
        anterior = ponto
    return total


def _alca_para_comprimento(p0, d0, p1, d1, comprimento):
    """O tamanho da alça (igual nas duas pontas) que dá ao Bézier o comprimento pedido; zero se o cabo está esticado."""
    def medir(h):
        return _comprimento_do_bezier(p0, p0 + d0 * h, p1 + d1 * h, p1)
    if medir(0.0) >= comprimento:
        return 0.0
    alto = max(comprimento, 1e-6)
    while medir(alto) < comprimento and alto < comprimento * 64:
        alto *= 2
    baixo = 0.0
    for _ in range(48):
        meio = (baixo + alto) / 2
        if medir(meio) < comprimento:
            baixo = meio
        else:
            alto = meio
    return (baixo + alto) / 2


def _direcao_do_vazio(vazio):
    return (vazio.matrix_world.to_3x3() @ Vector((0.0, 0.0, 1.0))).normalized()


def montar_cabo(malha):
    inicio = bpy.data.objects.get(_ler(malha, 'AttachStartTo'))
    fim = bpy.data.objects.get(_ler(malha, 'AttachEndTo'))
    if inicio is None or fim is None:
        raise RuntimeError(f"cabo '{malha.name}': faltam os nós das pontas ({_ler(malha, 'AttachStartTo')}, {_ler(malha, 'AttachEndTo')}) na cena")
    bpy.context.view_layer.update()
    comprimento = float(_ler(malha, 'comprimentoDeCorteMm', float(malha['CableLength']) * 10.0)) / 1000.0
    diametro = float(_ler(malha, 'diametroMm', float(malha['CableWidth']) * 10.0)) / 1000.0
    lados = int(_ler(malha, 'lados', _ler(malha, 'NumSides', 12)))
    trechos = int(_ler(malha, 'NumSegments', 16))

    p0 = inicio.matrix_world.translation.copy()
    p1 = fim.matrix_world.translation.copy()
    d0 = _direcao_do_vazio(inicio)
    d1 = _direcao_do_vazio(fim)
    alca = _alca_para_comprimento(p0, d0, p1, d1, comprimento)

    dados = bpy.data.curves.new(f'{malha.name}-vivo', 'CURVE')
    dados.dimensions = '3D'
    dados.resolution_u = max(4, trechos)
    dados.bevel_mode = 'ROUND'
    dados.bevel_depth = diametro / 2.0
    dados.bevel_resolution = max(0, max(lados, LADOS_MINIMO) // 4 - 1)
    dados.use_fill_caps = True
    spline = dados.splines.new('BEZIER')
    spline.bezier_points.add(1)
    a, b = spline.bezier_points
    a.co, b.co = p0, p1
    for ponto in (a, b):
        ponto.handle_left_type = 'FREE'
        ponto.handle_right_type = 'FREE'
    a.handle_left = p0 - d0 * alca
    a.handle_right = p0 + d0 * alca
    b.handle_left = p1 + d1 * alca
    b.handle_right = p1 - d1 * alca

    curva = bpy.data.objects.new(f'{malha.name}-vivo', dados)
    bpy.context.scene.collection.objects.link(curva)
    curva.matrix_world.identity()
    if malha.data and malha.data.materials:
        for material in malha.data.materials:
            dados.materials.append(material)
    # No hook de curva, cada ponto de Bézier conta três índices: a alça de entrada, o ponto e a alça de saída.
    for nome, vazio, indices in (('ponta-de', inicio, [0, 1, 2]), ('ponta-para', fim, [3, 4, 5])):
        hook = curva.modifiers.new(nome, 'HOOK')
        hook.object = vazio
        hook.vertex_indices_set(indices)
        hook.matrix_inverse = vazio.matrix_world.inverted() @ curva.matrix_world
        hook.center = vazio.matrix_world.translation
    malha.hide_viewport = True
    malha.hide_render = True
    malha.hide_set(True)
    return curva


def montar_todos():
    cabos = [o for o in bpy.data.objects if o.type == 'MESH' and 'CableLength' in o.keys()]
    return [montar_cabo(o) for o in cabos]


def principal():
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    if args:
        bpy.ops.import_scene.gltf(filepath=args[0])
    curvas = montar_todos()
    print(f'cabo-vivo: {len(curvas)} cabo(s) montado(s)')
    if len(args) > 1:
        bpy.ops.wm.save_as_mainfile(filepath=args[1])
    return curvas


if __name__ == '__main__':
    principal()
