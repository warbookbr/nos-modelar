/* cabo-vivo.test.mjs — o script do Blender do cabo vivo (`modulos/exportador-gltf/blender/cabo-vivo.py`): exporta o glTF da junta com cabo (arranjo que passa), importa no Blender sem janela, roda o script e
   gira o nó da junta A em vários ângulos. Em cada um, a ponta do cabo vivo (o fim da curva com espessura, os hooks presos ao vazio da ponta) tem de estar onde a nossa montagem põe a ponta naquele ângulo (a conta do
   `refazerNoCurso`, no referencial do Blender: x, −z, y), a outra ponta tem de ficar parada, a curva tem de ter o comprimento de corte no repouso e a malha estática tem de ficar escondida.

   Só roda com um Blender: MODELAR_BLENDER com o executável (blender -b), ou MODELAR_BPY_PYTHON com um python que tenha o módulo `bpy` (pip install bpy). Sem nenhum dos dois o bloco se ignora, e o Blender fica fora do CI. */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { doAmbiente } from '../ambiente.mjs';
import { portasDaResolvida, pedidoNaPose, cursoDaJunta, resolvidaNoValor } from '../../procedural/familias/cabo/montagem.js';
import { ARRANJOS } from '../fixtures/cabo/junta-com-cabo.mjs';
import { exportarJuntaComCabo } from '../fixtures/cabo/junta-com-cabo-gltf.mjs';

const BLENDER = doAmbiente('BLENDER');
const BPY = doAmbiente('BPY_PYTHON');
const lancador = BLENDER ? 'blender' : BPY ? 'bpy' : null;
const ANGULOS = [-90, -45, 0, 30, 90];

const PROVA = `
import json, math, sys
import bpy
from mathutils import Vector
args = sys.argv[sys.argv.index('--') + 1:]
glb, script, angulos = args[0], args[1], json.loads(args[2])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=glb)
sys.argv = ['cabo-vivo', '--']
exec(compile(open(script).read(), script, 'exec'), {'__name__': '__main__'})
curva = bpy.data.objects['cabo-vivo']
malha = bpy.data.objects['cabo']
junta = bpy.data.objects['junta-juntaA']
bevel = curva.data.bevel_depth
curva.data.bevel_depth = 0.0
def pontas():
    bpy.context.view_layer.update()
    m = curva.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh()
    pts = [curva.matrix_world @ v.co for v in m.vertices]
    comp = sum((pts[i + 1] - pts[i]).length for i in range(len(pts) - 1))
    return [list(pts[0]), list(pts[-1]), comp, len(pts)]
saida = {'escondida': bool(malha.hide_viewport and malha.hide_render and malha.hide_get()), 'bevel': bevel, 'bevelResolucao': curva.data.bevel_resolution, 'modificadores': [m.type for m in curva.modifiers], 'passos': []}
junta.rotation_mode = 'XYZ'
for a in angulos:
    junta.rotation_euler = (0.0, 0.0, math.radians(a))
    saida['passos'].append({'angulo': a, 'pontas': pontas()})
print('RESULTADO ' + json.dumps(saida))
`;

function rodar(pasta, glb, script) {
  const prova = join(pasta, 'prova-cabo-vivo.py');
  writeFileSync(prova, PROVA);
  const args = [prova, '--', glb, script, JSON.stringify(ANGULOS)];
  const r = lancador === 'blender'
    ? spawnSync(BLENDER, ['-b', '--factory-startup', '--python', prova, '--', glb, script, JSON.stringify(ANGULOS)], { encoding: 'utf8', maxBuffer: 64 << 20 })
    : spawnSync(BPY, args, { encoding: 'utf8', maxBuffer: 64 << 20 });
  const linha = (r.stdout ?? '').split('\n').find((l) => l.startsWith('RESULTADO '));
  if (r.status !== 0 || !linha) throw new Error(`o Blender saiu com ${r.status}:\n${(r.stdout ?? '').slice(-2500)}\n${(r.stderr ?? '').slice(-2500)}`);
  return JSON.parse(linha.slice('RESULTADO '.length));
}

describe.skipIf(!lancador)(`o cabo vivo no Blender${lancador ? '' : ' (pulado: nem MODELAR_BLENDER nem MODELAR_BPY_PYTHON aponta um Blender)'}`, () => {
  const pasta = mkdtempSync(join(tmpdir(), 'cabo-vivo-'));
  afterAll(() => rmSync(pasta, { recursive: true, force: true }));

  it('girar o nó da junta leva a ponta do cabo para onde a montagem a põe, e a outra ponta fica parada', async () => {
    const { prova, arquivo, script } = await exportarJuntaComCabo({ arranjo: 'passa', saida: join(pasta, 'junta.glb') });
    const resultado = rodar(pasta, arquivo, script);
    expect(resultado.escondida).toBe(true);
    expect(resultado.modificadores).toEqual(['HOOK', 'HOOK']);
    expect(resultado.bevel).toBeCloseTo(0.0015, 9);
    expect(resultado.bevelResolucao).toBe(1);

    const curso = cursoDaJunta(prova.resolvida, prova.declaracao);
    const noBlender = ([x, y, z]) => [x, -z, y];
    const distanciaMm = (a, b) => 1000 * Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    const noAngulo = (graus) => {
      const pose = resolvidaNoValor(prova.resolvida, curso, (graus * Math.PI) / 180);
      return pedidoNaPose(ARRANJOS.passa.pedido, portasDaResolvida(pose));
    };
    const repouso = noAngulo(0);
    for (const passo of resultado.passos) {
      const esperado = noAngulo(passo.angulo);
      const [inicio, fim] = passo.pontas;
      expect(distanciaMm(fim, noBlender(esperado.para.ponto.map((c) => c / 1000))), `ponta B a ${passo.angulo}°`).toBeLessThan(0.01);
      expect(distanciaMm(inicio, noBlender(esperado.de.ponto.map((c) => c / 1000))), `ponta A a ${passo.angulo}°`).toBeLessThan(0.01);
      expect(distanciaMm(inicio, noBlender(repouso.de.ponto.map((c) => c / 1000)))).toBeLessThan(0.01);
    }
    const emRepouso = resultado.passos.find((p) => p.angulo === 0);
    expect(Math.abs(emRepouso.pontas[2] * 1000 / 150 - 1), 'o comprimento da curva no repouso contra o de corte').toBeLessThan(0.005);
    const movido = resultado.passos.find((p) => p.angulo === 90);
    expect(distanciaMm(movido.pontas[1], emRepouso.pontas[1])).toBeGreaterThan(20);
  }, 120000);
});
