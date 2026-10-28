# gabarito-booleana.py — a booleana exata e o bevel do Blender sobre as mesmas entradas do núcleo, para dizer o que o núcleo
# deveria devolver: volume, área, quantidade de faces e faces finas. Roda dentro do Blender e só mede; nada volta ao núcleo.
#
# Uso (normalmente chamado por gabarito-booleana.mjs, que monta a entrada):
#   blender -b --factory-startup --python tools/blender/gabarito-booleana.py -- <entrada.json> <saida.json>
#
# A entrada é uma lista de casos. Cada caso é {nome, operandos: [{vertices, faces}, ...], operacao, bevel}:
#   - operacao 'subtrair' | 'unir' | 'intersectar' aplica a booleana EXACT do primeiro operando com cada um dos seguintes, na ordem;
#   - bevel {arestas: [[a, b], ...], largura, segmentos} (índices de vértice do primeiro operando) arredonda essas arestas
#     depois da booleana, se houver, pelo bevel de bmesh (offset, perfil 0,5);
#   - dissolver_coplanares (opcional, falso) junta as faces coplanares do resultado com `dissolve_limit` de 1e-5 rad.
# A saída é {nome: {volume, area, faces, vertices, facesFinas, razoesFinas}}, em metro, com a razão de face fina igual à do núcleo
# (área / maior aresta², abaixo de LIMITE_FINA).
import bpy, bmesh, json, sys

LIMITE_FINA = 3e-3  # LIMITE_DE_FACE_FINA de procedural/nucleo/topologia.js
OPERACOES = {'subtrair': 'DIFFERENCE', 'unir': 'UNION', 'intersectar': 'INTERSECT'}


def objeto_da_malha(nome, vertices, faces):
    me = bpy.data.meshes.new(nome)
    me.from_pydata([tuple(v) for v in vertices], [], [tuple(f) for f in faces])
    me.update()
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)  # a Manifold e o exato do Blender pedem sólido orientado para fora
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(nome, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def avaliada(ob):
    bpy.context.view_layer.update()
    return bpy.data.meshes.new_from_object(ob.evaluated_get(bpy.context.evaluated_depsgraph_get()))


def booleana(alvo, outro, operacao):
    m = alvo.modifiers.new('gabarito', 'BOOLEAN')
    m.operation = OPERACOES[operacao]
    m.solver = 'EXACT'
    m.object = outro
    resultado = avaliada(alvo)
    alvo.modifiers.clear()
    alvo.data = resultado


def arredondar(ob, arestas, largura, segmentos):
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bm.verts.ensure_lookup_table()
    pedidas = []
    for a, b in arestas:
        e = bm.edges.get((bm.verts[a], bm.verts[b]))
        if e is None:
            raise RuntimeError(f'a aresta {a}-{b} não existe depois da booleana')
        pedidas.append(e)
    bmesh.ops.bevel(bm, geom=pedidas, offset=largura, offset_type='OFFSET', segments=segmentos, profile=0.5, affect='EDGES')
    bm.to_mesh(ob.data)
    bm.free()


def dissolver(ob):
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.dissolve_limit(bm, angle_limit=1e-5, verts=bm.verts, edges=bm.edges)
    bm.to_mesh(ob.data)
    bm.free()


def medir(ob):
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    razoes = []
    area = 0.0
    for f in bm.faces:
        a = f.calc_area()
        area += a
        maior = max(e.calc_length() for e in f.edges)
        razao = a / (maior * maior) if maior > 0 else 0.0
        if razao < LIMITE_FINA:
            razoes.append(razao)
    saida = {
        'volume': bm.calc_volume(signed=False), 'area': area, 'faces': len(bm.faces), 'vertices': len(bm.verts),
        'facesFinas': len(razoes), 'razoesFinas': sorted(razoes),
    }
    bm.free()
    return saida


def main():
    args = sys.argv[sys.argv.index('--') + 1:]
    casos = json.load(open(args[0]))
    saida = {}
    for caso in casos:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        objetos = [objeto_da_malha(f"{caso['nome']}-{k}", o['vertices'], o['faces']) for k, o in enumerate(caso['operandos'])]
        alvo = objetos[0]
        for outro in objetos[1:]:
            booleana(alvo, outro, caso['operacao'])
        if caso.get('bevel'):
            b = caso['bevel']
            arredondar(alvo, b['arestas'], b['largura'], b['segmentos'])
        if caso.get('dissolver_coplanares'):
            dissolver(alvo)
        saida[caso['nome']] = medir(alvo)
    json.dump(saida, open(args[1], 'w'))
    print('gabarito', len(saida))


main()
