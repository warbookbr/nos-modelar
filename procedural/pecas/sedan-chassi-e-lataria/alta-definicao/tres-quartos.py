# tres-quartos.py: a vista sombreada de três quartos de cada OBJ, com a mesma câmera ortográfica e a mesma luz, lado a lado numa imagem.
# Uso: blender -b -P tres-quartos.py -- <saida.png> <titulo1>=<a.obj> <titulo2>=<b.obj> ... [--direcao=x,y,z] [--liso=graus] [--zoom=zc,yc,meia[,xc]]
#      [--cores=reais] [--tamanho=L,H]
# --cores=reais (ciclo 5) pinta pelo nome da parte: carroceria vermelha, vidro e moldura escuros, pneu preto, aro e roda cinza, lente do
# farol clara, lente da lanterna vermelho claro, para-choque e grade em plástico escuro, chassi cinza escuro.
import bpy, sys, math, re
from mathutils import Vector
args = sys.argv[sys.argv.index('--') + 1:]
saida = args[0]
pares = [a.split('=', 1) for a in args[1:] if not a.startswith('--')]
op = dict(a[2:].split('=', 1) for a in args[1:] if a.startswith('--'))
direcao = Vector([float(v) for v in op.get('direcao', '-0.55,-0.45,-0.70').split(',')]).normalized()
liso = float(op.get('liso', '30'))
L, H = [int(v) for v in op.get('tamanho', '1100,620').split(',')]

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
def material(nome, cor, aspereza=0.35, metal=0.0, transmissao=0.0):
    m = bpy.data.materials.new(nome); m.use_nodes = True; n = m.node_tree.nodes['Principled BSDF']
    n.inputs['Base Color'].default_value = cor; n.inputs['Roughness'].default_value = aspereza; n.inputs['Metallic'].default_value = metal
    if transmissao: n.inputs['Transmission Weight'].default_value = transmissao
    return m
REAIS = [
    (r'^(vidro|vigia|paraBrisa|moldura)', material('vidro', (0.02, 0.025, 0.03, 1), 0.08)),
    (r'^pneu', material('pneu', (0.015, 0.015, 0.016, 1), 0.7)),
    (r'^(aro|disco|cubo)', material('aro', (0.42, 0.44, 0.46, 1), 0.3, 0.6)),
    (r'^(lenteDoFarol|farol)', material('lente', (0.86, 0.87, 0.82, 1), 0.1)),
    (r'^lanterna', material('lanterna', (0.85, 0.32, 0.28, 1), 0.15)),
    (r'^(paraChoque|grade|laminaDaGrade)', material('plastico', (0.06, 0.065, 0.07, 1), 0.5)),
    (r'^(capo|tampa|painel|paraLama|soleira(Dir|Esq)$|porta|lateral|teto|tomada|retrovisor|labio|macaneta)', material('vermelho', (0.55, 0.06, 0.05, 1), 0.3)),
]
mat_chassi = material('chassi', (0.13, 0.14, 0.15, 1), 0.6)
def material_real(nome):
    base = nome.split('.')[0]
    for padrao, m in REAIS:
        if re.match(padrao, base): return m
    return mat_chassi
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
        o.data.materials.clear(); o.data.materials.append(material_real(o.name) if op.get('cores') == 'reais' else mat_esc if any(k in o.name for k in ('vidro', 'Vidro', 'vigia', 'Vigia', 'paraBrisa', 'ParaBrisa', 'moldura', 'lente', 'lanterna', 'Lanterna', 'grade', 'Grade', 'farol', 'paraChoque')) else mat)
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
    nums = [float(v) for v in op['zoom'].split(',')]
    zc, yc, meia = nums[:3]; xc = nums[3] if len(nums) > 3 else 0.86
    centro = conv(Vector((xc, yc, zc))); escala = 2 * meia
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
