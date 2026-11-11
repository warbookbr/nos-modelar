# tres-quartos.py: a vista sombreada de três quartos de cada OBJ, com a mesma câmera ortográfica e a mesma luz, lado a lado numa imagem.
# Uso: blender -b -P tres-quartos.py -- <saida.png> <titulo1>=<a.obj> <titulo2>=<b.obj> ... [--direcao=x,y,z] [--liso=graus] [--zoom=zc,yc,meia]
import bpy, sys, math
from mathutils import Vector
args = sys.argv[sys.argv.index('--') + 1:]
saida = args[0]
pares = [a.split('=', 1) for a in args[1:] if not a.startswith('--')]
op = dict(a[2:].split('=', 1) for a in args[1:] if a.startswith('--'))
direcao = Vector([float(v) for v in op.get('direcao', '-0.55,-0.45,-0.70').split(',')]).normalized()
liso = float(op.get('liso', '30'))
L, H = 1100, 620

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'; sc.cycles.samples = 24; sc.cycles.device = 'CPU'
sc.render.resolution_x = L; sc.render.resolution_y = H; sc.render.film_transparent = False
mundo = bpy.data.worlds.new('m'); sc.world = mundo; mundo.use_nodes = True
mundo.node_tree.nodes['Background'].inputs[0].default_value = (0.82, 0.84, 0.86, 1); mundo.node_tree.nodes['Background'].inputs[1].default_value = 0.55
mat = bpy.data.materials.new('pintura'); mat.use_nodes = True
b = mat.node_tree.nodes['Principled BSDF']; b.inputs['Base Color'].default_value = (0.55, 0.08, 0.06, 1)
# o vidro e a moldura escuros, pelo nome do objeto
mat_esc = bpy.data.materials.new('escuro'); mat_esc.use_nodes = True; be = mat_esc.node_tree.nodes['Principled BSDF']; be.inputs['Base Color'].default_value = (0.03, 0.035, 0.04, 1); be.inputs['Roughness'].default_value = 0.12; b.inputs['Roughness'].default_value = 0.28; b.inputs['Metallic'].default_value = 0.0
sol = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN')); sol.data.energy = 3.2; sol.data.angle = math.radians(8)
sc.collection.objects.link(sol); sol.rotation_euler = Vector((0.45, -0.75, 0.30)).normalized().to_track_quat('Z', 'Y').to_euler()
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); cam.data.type = 'ORTHO'; sc.collection.objects.link(cam); sc.camera = cam
# os eixos do rascunho (y para cima) vão para o Blender (z para cima) por (x, y, z) -> (x, -z, y)
conv = lambda v: Vector((v[0], -v[2], v[1]))
caixas = []; grupos = []
for titulo, obj in pares:
    antes = set(bpy.data.objects)
    bpy.ops.wm.obj_import(filepath=obj, forward_axis='NEGATIVE_Z', up_axis='Y')
    novos = [o for o in bpy.data.objects if o not in antes]
    for o in novos:
        o.data.materials.clear(); o.data.materials.append(mat_esc if any(k in o.name for k in ('vidro', 'Vidro', 'vigia', 'Vigia', 'paraBrisa', 'ParaBrisa', 'moldura')) else mat)
        bpy.context.view_layer.objects.active = o
        o.select_set(True)
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.remove_doubles(threshold=1e-6); bpy.ops.object.mode_set(mode='OBJECT')
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(liso)) if liso > 0 else bpy.ops.object.shade_flat()
        o.select_set(False)
    grupos.append((titulo, novos))
    for o in novos:
        for c in o.bound_box: caixas.append(o.matrix_world @ Vector(c))
centro = sum(caixas, Vector()) / len(caixas)
d = conv(direcao)
if 'zoom' in op:
    zc, yc, meia = [float(v) for v in op['zoom'].split(',')]
    centro = conv(Vector((0.86, yc, zc))); escala = 2 * meia
else:
    lado = d.cross(Vector((0, 0, 1))).normalized(); cima = lado.cross(d).normalized()
    escala = max(max(abs((p - centro).dot(lado)) for p in caixas) * 2, max(abs((p - centro).dot(cima)) for p in caixas) * 2 * L / H) * 1.06
cam.location = centro - d * 20; cam.rotation_euler = (-d).to_track_quat('Z', 'Y').to_euler(); cam.data.ortho_scale = escala; cam.data.clip_end = 100
imagens = []
for titulo, novos in grupos:
    for _, outros in grupos:
        for o in outros: o.hide_render = o not in novos
    sc.render.filepath = saida.replace('.png', f'-{len(imagens)}.png'); bpy.ops.render.render(write_still=True); imagens.append((titulo, sc.render.filepath))
print('IMAGENS', imagens)
