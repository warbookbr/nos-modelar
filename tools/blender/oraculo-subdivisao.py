# oraculo-subdivisao.py — aplica o modificador Subdivision Surface do Blender a cada gaiola da entrada e grava os vértices.
#
# Uso (normalmente chamado por oraculo-subdivisao.mjs, que monta a entrada):
#   blender -b --factory-startup --python tools/blender/oraculo-subdivisao.py -- <entrada.json> <saida.json>
#
# A entrada é uma lista de gaiolas por índice: {nome, vertices, faces, vincos: [[a, b, vinco de 0 a 1]], cantos: [índices],
# borda: 'cantos' ou ausente, niveis, limiteEm: níveis gerados também com use_limit_surface, casas: arredondamento}.
# A saída é {'nome@n': vértices, 'nome@n@limite': vértices}, com Catmull-Clark, use_creases ligado, boundary_smooth
# PRESERVE_CORNERS com borda 'cantos' e ALL sem ela, e qualidade 10 na superfície limite.
import bpy, json, sys

args = sys.argv[sys.argv.index('--') + 1:]
gaiolas = json.load(open(args[0]))
saida = {}
for c in gaiolas:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    me = bpy.data.meshes.new('g')
    me.from_pydata([tuple(v) for v in c['vertices']], [], [tuple(f) for f in c['faces']])
    me.update()
    vinco = me.attributes.new('crease_edge', 'FLOAT', 'EDGE')
    aresta = {}
    for e in me.edges:
        a, b = e.vertices
        aresta[(min(a, b), max(a, b))] = e.index
    for a, b, x in c.get('vincos', []):
        vinco.data[aresta[(min(a, b), max(a, b))]].value = x
    if c.get('cantos'):
        canto = me.attributes.new('crease_vert', 'FLOAT', 'POINT')
        for k in c['cantos']:
            canto.data[k].value = 1.0
    ob = bpy.data.objects.new('g', me)
    bpy.context.scene.collection.objects.link(ob)
    limite_em = c.get('limiteEm', [])
    for n in c['niveis']:
        for limite in ([False, True] if n in limite_em else [False]):
            ob.modifiers.clear()
            m = ob.modifiers.new('s', 'SUBSURF')
            m.subdivision_type = 'CATMULL_CLARK'
            m.levels = n
            m.render_levels = n
            m.use_creases = True
            m.use_limit_surface = limite
            if limite:
                m.quality = 10
            m.boundary_smooth = 'PRESERVE_CORNERS' if c.get('borda') == 'cantos' else 'ALL'
            dg = bpy.context.evaluated_depsgraph_get()
            ev = ob.evaluated_get(dg)
            mm = ev.to_mesh()
            chave = f"{c['nome']}@{n}" + ('@limite' if limite else '')
            casas = c.get('casas', 6)
            saida[chave] = [[round(x, casas) + 0.0 for x in v.co] for v in mm.vertices]
            ev.to_mesh_clear()
json.dump(saida, open(args[1], 'w'))
print('oraculo', len(saida))
