# marcar-vincos-de-prova.py — para os testes de comparar-vincos: importa um OBJ (y para cima), marca como vinco de
# subdivisão (crease_edge = 1) as arestas cujas duas pontas caem em algum dos pontos (x, y) dados, a menos de 1e-6 m, e
# grava um .blend, no quadro do Blender (z para cima; lê-se de volta com --z-cima).
#
# Uso:
#   blender -b --factory-startup --python tools/blender/marcar-vincos-de-prova.py -- <entrada.obj> <saida.blend> x,y [x,y ...]
import sys
import bpy

args = sys.argv[sys.argv.index('--') + 1:]
ent, sai, pontos = args[0], args[1], [tuple(map(float, s.split(','))) for s in args[2:]]
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.wm.obj_import(filepath=ent, forward_axis='NEGATIVE_Z', up_axis='Y')
o = bpy.context.selected_objects[0]
me = o.data
# o importador guarda os vértices como estão no OBJ e gira o objeto para z para cima
no_ponto = lambda v: any(abs(v.co.x - x) < 1e-6 and abs(v.co.y - y) < 1e-6 for x, y in pontos)
at = me.attributes.get('crease_edge') or me.attributes.new('crease_edge', 'FLOAT', 'EDGE')
n = 0
for e in me.edges:
    if all(no_ponto(me.vertices[i]) for i in e.vertices):
        at.data[e.index].value = 1.0
        n += 1
print('MARCADAS', n)
bpy.ops.wm.save_as_mainfile(filepath=sai)
