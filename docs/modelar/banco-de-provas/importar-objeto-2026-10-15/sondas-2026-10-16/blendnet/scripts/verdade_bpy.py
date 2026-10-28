"""Roda UM script do BlendNet no bpy (cena vazia) e grava os objetos mesh com a transformação aplicada.
Uso: python -I verdade_bpy.py <script.py> <saida_prefixo>   (grava <prefixo>.json e <prefixo>.npz)"""
import sys, json, time, io, contextlib
import numpy as np
import bpy

src = open(sys.argv[1]).read()
pref = sys.argv[2]
PRE = "import math, random\nfrom mathutils import Vector, Euler, Matrix, Color\n"

def limpar():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def rodar(texto):
    limpar()
    g = {'__name__': '__main__', '__builtins__': __builtins__}
    t = time.time()
    erro = None
    try:
        with contextlib.redirect_stdout(io.StringIO()):
            exec(compile(texto, 'script_blendnet', 'exec'), g)
    except BaseException as e:
        erro = f'{type(e).__name__}: {e}'
    return erro, time.time() - t

erro, dt = rodar(src)
preambulo = False
erro_original = erro
if erro and erro.startswith('NameError'):
    e2, dt2 = rodar(PRE + src)
    if e2 is None or not e2.startswith('NameError'):
        erro, dt, preambulo = e2, dt2, True

dg = bpy.context.evaluated_depsgraph_get()
objs = []; arrs = {}
for o in bpy.data.objects:
    if o.type != 'MESH': continue
    oculto = bool(o.hide_viewport or o.hide_render or o.hide_get() or o.display_type in ('WIRE', 'BOUNDS'))
    ev = o.evaluated_get(dg)
    me = ev.to_mesh()
    n = len(me.vertices)
    v = np.empty(n * 3, dtype=np.float64); me.vertices.foreach_get('co', v); v = v.reshape(-1, 3)
    M = np.array(ev.matrix_world)
    w = v @ M[:3, :3].T + M[:3, 3] if n else v
    me.calc_loop_triangles()
    nt = len(me.loop_triangles)
    tri = np.empty(nt * 3, dtype=np.int64); me.loop_triangles.foreach_get('vertices', tri); tri = tri.reshape(-1, 3)
    if n and np.linalg.det(M[:3, :3]) < 0: tri = tri[:, [0, 2, 1]]
    k = f'o{len(objs)}'
    arrs[k + '_v'] = w; arrs[k + '_t'] = tri
    d = {'nome': o.name, 'oculto': oculto, 'chave': k, 'n_vertices': n, 'pai': o.parent.name if o.parent else None}
    if n: d['min'] = w.min(0).tolist(); d['max'] = w.max(0).tolist()
    objs.append(d)
    ev.to_mesh_clear()
json.dump({'erro': erro, 'erro_original': erro_original, 'preambulo': preambulo, 'tempo_exec_s': round(dt, 4), 'objetos': objs}, open(pref + '.json', 'w'), ensure_ascii=False)
np.savez(pref + '.npz', **arrs)
