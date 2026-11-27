/* cabo-vivo.test.mjs — o script do Blender do cabo vivo (`modulos/exportador-gltf/blender/cabo-vivo.py`): exporta o glTF da junta com cabo (arranjo que passa), importa no Blender sem janela, roda o script e
   gira o nó da junta A em vários ângulos. Em cada um, a ponta do cabo vivo (o fim da curva com espessura, os hooks presos ao vazio da ponta) tem de estar onde a nossa montagem põe a ponta naquele ângulo (a conta do
   `refazerNoCurso`, no referencial do Blender: x, −z, y), a outra ponta tem de ficar parada, a curva tem de ter o comprimento de corte no repouso e a malha estática tem de ficar escondida.

   Do addon (`modulos/exportador-gltf/blender/addon_cabo_vivo/`, o `.zip` que a exportação grava ao lado do .glb): instala o zip como extensão, importa o glb, monta os cabos e gira a junta de −90° a 90°; em cada ângulo
   o comprimento da curva fica no de corte a 0,5%, as pontas batem com a montagem a 0,1 mm e o raio mínimo é respeitado; a forma fica perto da que a família dá; mede o tempo por atualização com um e com cinco cabos;
   e o botão de gravar guarda a forma quadro a quadro de modo que o arquivo, aberto sem o addon, a reproduz.

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
import { parametrosDoCabo } from '../../procedural/familias/cabo/pedido.js';
import { planejar } from '../../procedural/familias/cabo/plano.js';
import familiaDoCabo from '../../procedural/familias/cabo/familia.json' with { type: 'json' };

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

const PRELUDIO = `
import os, sys, json, math, time, importlib
args = sys.argv[sys.argv.index('--') + 1:]
glb, zip_, pasta, entrada = args[0], args[1], args[2], json.loads(args[3])
os.environ['BLENDER_USER_RESOURCES'] = os.path.join(pasta, 'recursos')
import bpy
import numpy as np
MODULO = 'bl_ext.user_default.modelar_cabo_vivo'
def preparar():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    assert 'FINISHED' in bpy.ops.extensions.package_install_files(filepath=zip_, repo='user_default', enable_on_install=True)
    cabos = importlib.import_module(MODULO + '.cabos')
    bpy.ops.import_scene.gltf(filepath=glb)
    bpy.ops.modelar.cabos_montar()
    return cabos
def amostrar(curva):
    dg = bpy.context.evaluated_depsgraph_get()
    m = curva.evaluated_get(dg).to_mesh()
    pts = np.array([list(curva.matrix_world @ v.co) for v in m.vertices])
    curva.evaluated_get(dg).to_mesh_clear()
    return pts
def comprimento(pts):
    return float(np.linalg.norm(np.diff(pts, axis=0), axis=1).sum())
def raio_minimo(pts, passo=8):
    a, b, c = pts[:-2 * passo], pts[passo:-passo], pts[2 * passo:]
    cruz = np.linalg.norm(np.cross(b - a, c - b), axis=1)
    lados = np.linalg.norm(b - a, axis=1) * np.linalg.norm(c - b, axis=1) * np.linalg.norm(c - a, axis=1)
    ok = cruz > 1e-12
    return float((lados[ok] / (2 * cruz[ok])).min())
def medir_a_fio(curva):
    curva.data.bevel_depth = 0.0
    curva.data.resolution_u = 16
def girar(junta, graus):
    junta.rotation_euler = (0.0, 0.0, math.radians(graus))
    bpy.context.view_layer.update()
`;

const PROVA_DO_CURSO = PRELUDIO + `
cabos = preparar()
curva = bpy.data.objects['cabo-vivo']
malha = bpy.data.objects['cabo']
junta = bpy.data.objects['junta-juntaA']
junta.rotation_mode = 'XYZ'
saida = {'escondida': bool(malha.hide_viewport and malha.hide_render), 'bevel': curva.data.bevel_depth, 'bevelResolucao': curva.data.bevel_resolution, 'pontosDaCurva': len(curva.data.splines[0].bezier_points), 'modificadores': [m.type for m in curva.modifiers]}
medir_a_fio(curva)
chamadas0 = cabos.ULTIMA_MEDIDA['chamadas']
saida['passos'] = []
for a in entrada['angulos']:
    girar(junta, a)
    pts = amostrar(curva)
    saida['passos'].append({'angulo': a, 'pontas': [pts[0].tolist(), pts[-1].tolist()], 'comprimento': comprimento(pts), 'raio': raio_minimo(pts), 'raioDoAddonMm': curva['modelar_raio_minimo_mm'], 'estado': curva['modelar_estado'], 'pontos': pts[::4].tolist()})
saida['atualizacoesPeloHandler'] = cabos.ULTIMA_MEDIDA['chamadas'] - chamadas0
# a conta a quente (partindo da forma anterior) contra a conta a frio, em cada ângulo
dif = []
for a in entrada['angulos']:
    girar(junta, a)
    antes = cabos._ESTADO['cabo-vivo']['nos'].copy()
    cabos.atualizar_todos(None, forcar=True, a_frio=True)
    dif.append(float(np.abs(cabos._ESTADO['cabo-vivo']['nos'] - antes).max() * 1000.0))
saida['quenteContraFrioMm'] = dif
# o tempo por atualização: o curso em passos de 1 grau, com um e com cinco cabos
def tempo(nome):
    for c in cabos.curvas_vivas():
        c.data.bevel_depth = 0.0015
        c.data.resolution_u = 4
    junta.rotation_euler = (0.0, 0.0, math.radians(-90))
    bpy.context.view_layer.update()
    paredes, contas, iteracoes = [], [], []
    for a in range(-89, 91):
        t = time.perf_counter()
        junta.rotation_euler = (0.0, 0.0, math.radians(a))
        bpy.context.view_layer.update()
        paredes.append((time.perf_counter() - t) * 1000.0)
        contas.append(cabos.ULTIMA_MEDIDA['ms'])
        iteracoes.append(cabos.ULTIMA_MEDIDA['iteracoes'])
    return {'cabos': len(cabos.curvas_vivas()), 'paredeMediaMs': float(np.mean(paredes)), 'paredeMaximaMs': float(np.max(paredes)), 'contaMediaMs': float(np.mean(contas)), 'contaMaximaMs': float(np.max(contas)), 'iteracoesMedias': float(np.mean(iteracoes))}
saida['tempoComUm'] = tempo('um')
for k, extra in enumerate((155.0, 160.0, 165.0, 170.0)):
    copia = malha.copy()
    copia.name = 'cabo' + str(k + 2)
    bpy.context.scene.collection.objects.link(copia)
    copia['comprimentoDeCorteMm'] = extra
    copia['CableLength'] = extra / 10.0
    copia.hide_viewport = False
bpy.ops.modelar.cabos_montar()
saida['tempoComCinco'] = tempo('cinco')
print('RESULTADO ' + json.dumps(saida))
`;

const PROVA_DE_GRAVAR = PRELUDIO + `
cabos = preparar()
curva = bpy.data.objects['cabo-vivo']
junta = bpy.data.objects['junta-juntaA']
cena = bpy.context.scene
junta.rotation_mode = 'XYZ'
quadros = list(range(1, len(entrada['angulos']) + 1))
for q, a in zip(quadros, entrada['angulos']):
    junta.rotation_euler = (0.0, 0.0, math.radians(a))
    junta.keyframe_insert('rotation_euler', frame=q, index=2)
cena.frame_start, cena.frame_end = quadros[0], quadros[-1]
medir_a_fio(curva)
vivo = {}
for q in quadros:
    cena.frame_set(q)
    vivo[q] = amostrar(curva)
medir_a_fio_antes = (curva.data.bevel_depth, curva.data.resolution_u)
assert 'FINISHED' in bpy.ops.modelar.cabos_gravar()
saida = {'gravado': bool(curva['modelar_gravado']), 'fcurves': len(curva.data.animation_data.action.fcurves if hasattr(curva.data.animation_data.action, 'fcurves') else curva.data.animation_data.action.layers[0].strips[0].channelbags[0].fcurves), 'quadros': len(quadros)}
# com o addon ligado e o cabo gravado, mexer na junta não refaz mais a curva
chamadas = cabos.ULTIMA_MEDIDA['chamadas']
girar(junta, 33.0)
saida['refeitoDepoisDeGravado'] = cabos.ULTIMA_MEDIDA['chamadas'] - chamadas
curva.data.bevel_depth, curva.data.resolution_u = 0.0, 16
caminho = os.path.join(pasta, 'gravado.blend')
bpy.ops.wm.save_as_mainfile(filepath=caminho)
# sem o addon: desliga, confere que nenhum gancho dele sobrou, abre o arquivo e lê a forma de cada quadro
bpy.ops.preferences.addon_disable(module=MODULO)
ganchos = [f.__module__ for lista in (bpy.app.handlers.depsgraph_update_post, bpy.app.handlers.frame_change_post, bpy.app.handlers.load_post) for f in lista if 'modelar' in (f.__module__ or '')]
saida['ganchosDepoisDeDesligar'] = ganchos
bpy.ops.wm.open_mainfile(filepath=caminho)
saida['operadorSumiu'] = not hasattr(bpy.ops, 'modelar') or 'cabos_gravar' not in dir(bpy.ops.modelar)
curva = bpy.data.objects['cabo-vivo']
cena = bpy.context.scene
gravada = {}
for q in quadros:
    cena.frame_set(q)
    gravada[q] = amostrar(curva)
saida['diferencaMaximaMm'] = float(max(np.abs(gravada[q] - vivo[q]).max() for q in quadros) * 1000.0)
saida['comprimentoGravadoMm'] = [comprimento(gravada[q]) * 1000.0 for q in quadros]
saida['estadoDosQuadros'] = [curva.get('modelar_estado')]
print('RESULTADO ' + json.dumps(saida))
`;

function rodarAddon(pasta, prova, glb, zip, entrada) {
  const arquivo = join(pasta, `prova-${prova.nome}.py`);
  writeFileSync(arquivo, prova.codigo);
  const argumentos = ['--', glb, zip, pasta, JSON.stringify(entrada)];
  const r = lancador === 'blender'
    ? spawnSync(BLENDER, ['-b', '--factory-startup', '--python', arquivo, ...argumentos], { encoding: 'utf8', maxBuffer: 256 << 20 })
    : spawnSync(BPY, [arquivo, ...argumentos], { encoding: 'utf8', maxBuffer: 256 << 20 });
  const linha = (r.stdout ?? '').split('\n').find((l) => l.startsWith('RESULTADO '));
  if (r.status !== 0 || !linha) throw new Error(`o Blender saiu com ${r.status}:\n${(r.stdout ?? '').slice(-3000)}\n${(r.stderr ?? '').slice(-3000)}`);
  return JSON.parse(linha.slice('RESULTADO '.length));
}

const distanciaAoSegmento = (p, a, b) => {
  const ab = b.map((x, i) => x - a[i]); const ap = p.map((x, i) => x - a[i]);
  const t = Math.max(0, Math.min(1, (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / (ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2 || 1)));
  return Math.hypot(...ap.map((x, i) => x - t * ab[i]));
};
const distanciaAPolilinha = (p, linha) => { let m = Infinity; for (let i = 0; i < linha.length - 1; i += 1) m = Math.min(m, distanciaAoSegmento(p, linha[i], linha[i + 1])); return m; };
/** A distância máxima (nos dois sentidos) entre duas polilinhas, em milímetro. */
const distanciaMaxima = (a, b) => 1000 * Math.max(...a.map((p) => distanciaAPolilinha(p, b)), ...b.map((p) => distanciaAPolilinha(p, a)));

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

describe.skipIf(!lancador)(`o addon do cabo vivo no Blender${lancador ? '' : ' (pulado: nem MODELAR_BLENDER nem MODELAR_BPY_PYTHON aponta um Blender)'}`, () => {
  const pasta = mkdtempSync(join(tmpdir(), 'cabo-vivo-addon-'));
  afterAll(() => rmSync(pasta, { recursive: true, force: true }));
  const ANGULOS_DO_CURSO = [-90, -75, -60, -45, -30, -15, 0, 15, 30, 45, 60, 75, 90];
  let exportado; let medido;

  it('o curso inteiro: comprimento de corte, pontas, raio mínimo e a forma da família', async () => {
    exportado = await exportarJuntaComCabo({ arranjo: 'passa', saida: join(pasta, 'junta.glb') });
    const { prova } = exportado;
    medido = rodarAddon(pasta, { nome: 'curso', codigo: PROVA_DO_CURSO }, exportado.arquivo, exportado.addon, { angulos: ANGULOS_DO_CURSO });
    expect(medido.escondida).toBe(true);
    expect(medido.modificadores).toEqual([]);
    expect(medido.bevel).toBeCloseTo(0.0015, 9);
    expect(medido.bevelResolucao).toBe(1);
    expect(medido.atualizacoesPeloHandler, 'o gancho do addon refez a curva a cada giro da junta').toBeGreaterThanOrEqual(ANGULOS_DO_CURSO.length - 1);

    const curso = cursoDaJunta(prova.resolvida, prova.declaracao);
    const noBlender = ([x, y, z]) => [x, -z, y];
    const distanciaMm = (a, b) => 1000 * Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    const pedidoNo = (graus) => pedidoNaPose(ARRANJOS.passa.pedido, portasDaResolvida(resolvidaNoValor(prova.resolvida, curso, (graus * Math.PI) / 180)));
    const raioDeclaradoMm = ARRANJOS.passa.pedido.raioMinimo * ARRANJOS.passa.pedido.diametro;
    const relatorio = [];
    for (const passo of medido.passos) {
      const esperado = pedidoNo(passo.angulo);
      const [inicio, fim] = passo.pontas;
      expect(distanciaMm(inicio, noBlender(esperado.de.ponto.map((c) => c / 1000))), `ponta A a ${passo.angulo}°`).toBeLessThan(0.1);
      expect(distanciaMm(fim, noBlender(esperado.para.ponto.map((c) => c / 1000))), `ponta B a ${passo.angulo}°`).toBeLessThan(0.1);
      expect(Math.abs((passo.comprimento * 1000) / 150 - 1), `comprimento a ${passo.angulo}°`).toBeLessThan(0.005);
      expect(passo.raioDoAddonMm, `raio mínimo da haste a ${passo.angulo}°`).toBeGreaterThanOrEqual(raioDeclaradoMm);
      expect(passo.estado).toBe('ok');

      /* a forma da família naquele ângulo: as estações do tubo (a curva lisa pelos nós) contra a curva do Blender, em milímetro, no referencial do Blender */
      const completos = { ...Object.fromEntries(Object.entries(familiaDoCabo.parametros).map(([nome, def]) => [nome, def.padrao])), ...parametrosDoCabo(esperado) };
      const plano = planejar(completos);
      const familia = plano.pontos.map((q) => noBlender(q.map((c) => c / 1000)));
      /* a curva lisa (a spline cúbica engastada pelos nós, igual à da família) respeita o raio declarado, medido por três pontos na curva avaliada do Blender (a 0,5 mm de folga de medida) */
      expect(passo.raio * 1000, `raio da curva lisa a ${passo.angulo}°`).toBeGreaterThanOrEqual(raioDeclaradoMm - 0.5);
      expect(passo.raio * 1000, `raio da curva lisa a ${passo.angulo}°, perto do da haste`).toBeGreaterThan(passo.raioDoAddonMm * 0.85);
      relatorio.push({ angulo: passo.angulo, distanciaMm: distanciaMaxima(familia, passo.pontos), raioDaHasteMm: passo.raioDoAddonMm, raioLisoMm: passo.raio * 1000 });
    }
    medido.relatorio = relatorio;
    const meio = relatorio.find((r) => r.angulo === 0);
    console.info(`[addon] forma contra a da família: no meio do curso ${meio.distanciaMm.toFixed(3)} mm; maior no curso ${Math.max(...relatorio.map((r) => r.distanciaMm)).toFixed(3)} mm`);
    console.info(`[addon] conta a quente contra a frio: no máximo ${Math.max(...medido.quenteContraFrioMm).toExponential(2)} mm`);
    console.info(`[addon] raio mínimo (declarado ${raioDeclaradoMm} mm): da haste ${Math.min(...relatorio.map((r) => r.raioDaHasteMm)).toFixed(2)} mm; da curva lisa ${Math.min(...relatorio.map((r) => r.raioLisoMm)).toFixed(2)} mm`);
    console.info(`[addon] raio por ângulo (haste / curva lisa, mm): ${relatorio.map((r) => `${r.angulo}°: ${r.raioDaHasteMm.toFixed(2)} / ${r.raioLisoMm.toFixed(2)}`).join('; ')}`);
    expect(meio.distanciaMm, 'distância máxima entre a curva do Blender e a da família no meio do curso').toBeLessThan(0.5);
    expect(Math.max(...relatorio.map((r) => r.distanciaMm))).toBeLessThan(1);
    expect(Math.max(...medido.quenteContraFrioMm), 'a conta partindo da forma anterior dá a da conta a frio').toBeLessThan(0.01);
  }, 240000);

  it('o tempo por atualização, com um e com cinco cabos', () => {
    const { tempoComUm: um, tempoComCinco: cinco } = medido;
    console.info(`[addon] um cabo: conta ${um.contaMediaMs.toFixed(1)} ms em média (máx. ${um.contaMaximaMs.toFixed(1)}), atualização do quadro ${um.paredeMediaMs.toFixed(1)} ms (máx. ${um.paredeMaximaMs.toFixed(1)}), ${um.iteracoesMedias.toFixed(1)} iterações`);
    console.info(`[addon] cinco cabos: conta ${cinco.contaMediaMs.toFixed(1)} ms em média (máx. ${cinco.contaMaximaMs.toFixed(1)}), atualização do quadro ${cinco.paredeMediaMs.toFixed(1)} ms (máx. ${cinco.paredeMaximaMs.toFixed(1)}), ${cinco.iteracoesMedias.toFixed(1)} iterações`);
    expect(um.cabos).toBe(1);
    expect(cinco.cabos).toBe(5);
    expect(um.paredeMediaMs).toBeLessThan(250);
    expect(cinco.paredeMediaMs).toBeLessThan(1000);
  });

  it('o botão de gravar guarda a forma quadro a quadro, e o arquivo a reproduz sem o addon', () => {
    const angulos = [-90, -75, -60, -45, -30, -15, 0, 15, 30, 45, 60, 75, 90];
    const r = rodarAddon(pasta, { nome: 'gravar', codigo: PROVA_DE_GRAVAR }, exportado.arquivo, exportado.addon, { angulos });
    console.info(`[addon] gravar: ${r.quadros} quadros, ${r.fcurves} curvas de animação; a forma sem o addon difere da viva em no máximo ${r.diferencaMaximaMm.toExponential(2)} mm`);
    expect(r.gravado).toBe(true);
    expect(r.fcurves).toBeGreaterThan(0);
    expect(r.refeitoDepoisDeGravado, 'cabo gravado não é refeito pelo addon').toBe(0);
    expect(r.ganchosDepoisDeDesligar).toEqual([]);
    expect(r.diferencaMaximaMm).toBeLessThan(0.005);
    for (const c of r.comprimentoGravadoMm) expect(Math.abs(c / 150 - 1)).toBeLessThan(0.005);
  }, 240000);
});

describe('o zip do addon', () => {
  it('traz o manifesto de extensão na raiz e os módulos, e é o mesmo a cada vez', async () => {
    const { zipDoAddonDoCabo, arquivosDoAddonDoCabo } = await import('../../modulos/exportador-gltf/src/index.js');
    const a = zipDoAddonDoCabo(); const b = zipDoAddonDoCabo();
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
    expect(arquivosDoAddonDoCabo().map((f) => f.nome)).toEqual(['__init__.py', 'blender_manifest.toml', 'cabos.py', 'elastica.py']);
    expect(a.readUInt32LE(0)).toBe(0x04034b50);
  });
});
