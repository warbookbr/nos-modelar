"""Prova no Blender do OBJ com material e textura exportado pelo exportador.

Importa o .obj com o .mtl ao lado e a imagem que o .mtl referencia (map_Kd), confere que cada material tem uma imagem
ligada ao Base Color do Principled BSDF, mede o alcance das coordenadas de textura e renderiza uma imagem da caixa.
Sai com código 1 se algum material não tiver a imagem ligada ao Base Color.

Uso, com o bpy instalado (pip install bpy==4.2.0, Python 3.11):
    python provar_blender.py <caminho-do-obj> <imagem-de-saida.png>

Os .obj, .mtl e .png de entrada não são versionados (o .gitignore cobre .obj e .mtl): são gerados pela linha de comando
tools/modelar/exportar-obj.mjs com --com-textura e ficam numa pasta temporária.
"""
import json
import os
import sys

import bpy
from mathutils import Vector


def imagem_no_base_color(material):
    if material is None or not material.use_nodes:
        return None
    bsdf = next((n for n in material.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if bsdf is None:
        return None
    entrada = bsdf.inputs['Base Color']
    if not entrada.is_linked:
        return None
    no = entrada.links[0].from_node
    if no.type != 'TEX_IMAGE' or no.image is None:
        return None
    imagem = no.image
    return {
        'no': no.name,
        'imagem': imagem.name,
        'arquivo': imagem.filepath,
        'tamanho_px': list(imagem.size),
    }


def alcance_uv(objeto):
    uv = objeto.data.uv_layers.active
    if uv is None:
        return None
    us = [d.uv[0] for d in uv.data]
    vs = [d.uv[1] for d in uv.data]
    return {'u': [round(min(us), 4), round(max(us), 4)], 'v': [round(min(vs), 4), round(max(vs), 4)]}


def faces_por_material(objeto):
    contagem = {}
    for poly in objeto.data.polygons:
        nome = objeto.material_slots[poly.material_index].material.name if objeto.material_slots else None
        contagem[nome] = contagem.get(nome, 0) + 1
    return contagem


def renderizar(objetos, saida):
    minimo = Vector((1e9, 1e9, 1e9))
    maximo = Vector((-1e9, -1e9, -1e9))
    for ob in objetos:
        for canto in ob.bound_box:
            p = ob.matrix_world @ Vector(canto)
            minimo = Vector((min(minimo.x, p.x), min(minimo.y, p.y), min(minimo.z, p.z)))
            maximo = Vector((max(maximo.x, p.x), max(maximo.y, p.y), max(maximo.z, p.z)))
    centro = (minimo + maximo) / 2
    tamanho = (maximo - minimo).length

    cena = bpy.context.scene
    cena.render.engine = 'CYCLES'
    cena.cycles.device = 'CPU'
    cena.cycles.samples = 24
    cena.render.resolution_x = 480
    cena.render.resolution_y = 360
    cena.render.filepath = saida

    mundo = bpy.data.worlds.new('mundo')
    mundo.use_nodes = True
    mundo.node_tree.nodes['Background'].inputs['Color'].default_value = (0.6, 0.6, 0.6, 1.0)
    cena.world = mundo

    luz = bpy.data.lights.new(name='sol', type='SUN')
    luz.energy = 3.0
    luz_ob = bpy.data.objects.new('sol', luz)
    cena.collection.objects.link(luz_ob)
    luz_ob.rotation_euler = (0.9, 0.0, 0.6)

    camera = bpy.data.cameras.new('camera')
    camera_ob = bpy.data.objects.new('camera', camera)
    cena.collection.objects.link(camera_ob)
    cena.camera = camera_ob
    posicao = centro + Vector((1.0, -1.0, 0.8)) * tamanho
    camera_ob.location = posicao
    camera_ob.rotation_mode = 'QUATERNION'
    camera_ob.rotation_quaternion = (centro - posicao).to_track_quat('-Z', 'Y')

    bpy.ops.render.render(write_still=True)
    if not os.path.exists(saida):
        return {'gravada': False}
    imagem = bpy.data.images.load(saida)
    pixels = list(imagem.pixels)
    canais = [pixels[i] for i in range(0, len(pixels), 4)]
    brilho = sum(canais) / len(canais)
    return {
        'gravada': True,
        'tamanho_px': list(imagem.size),
        'brilho_medio_0_a_1': round(brilho, 4),
        'centro_da_caixa': [round(c, 4) for c in centro],
        'tamanho_da_caixa': round(tamanho, 4),
    }


def main():
    obj_path = os.path.abspath(sys.argv[1])
    saida_png = os.path.abspath(sys.argv[2])
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.wm.obj_import(filepath=obj_path)

    objetos = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    relatorio = {'obj': obj_path, 'objetos': [], 'materiais': []}
    falhas = []

    for ob in objetos:
        relatorio['objetos'].append({
            'nome': ob.name,
            'faces_por_material': faces_por_material(ob),
            'alcance_uv': alcance_uv(ob),
        })
        for slot in ob.material_slots:
            mat = slot.material
            ligacao = imagem_no_base_color(mat)
            relatorio['materiais'].append({'material': mat.name if mat else None, 'base_color': ligacao})
            if ligacao is None:
                falhas.append(mat.name if mat else '(sem material)')

    relatorio['render'] = renderizar(objetos, saida_png)
    relatorio['falhas'] = falhas
    print(json.dumps(relatorio, indent=2, ensure_ascii=False))

    if falhas or not relatorio['render']['gravada'] or relatorio['render']['brilho_medio_0_a_1'] <= 0.01:
        sys.exit(1)


if __name__ == '__main__':
    main()
