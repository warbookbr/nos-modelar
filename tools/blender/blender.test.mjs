/* blender.test.mjs — as ferramentas opcionais do Blender em tools/blender: o oráculo da subdivisão regera a fixture, a
   régua dá zero na identidade e acusa a versão decimada, e o pacote cego de uma forma com painel interno e lasca sai com a
   borda limpa, o avesso marcado e a barra de escala fora dos rótulos.

   Só roda com MECANIFICA_BLENDER apontando o executável do Blender (e python3 com Pillow e numpy); sem a variável, o bloco
   inteiro se ignora, e o Blender fica fora do CI e do `--completo`. A forma medida é a forma de prova da gaiola por
   estações, desenhada por código em procedural/nucleo/fixtures/gaiola-por-estacoes-prova.js. */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { gaiolaPorEstacoes } from '../../procedural/nucleo/gaiola-por-estacoes.js';
import { definicaoAdensada } from '../../procedural/nucleo/fixtures/gaiola-por-estacoes-prova.js';
import { nucleo } from '../../procedural/nucleo/entrada.js';
import { FIXTURE, compararFixtures, gerarFixture } from './oraculo-subdivisao.mjs';

const BLENDER = process.env.MECANIFICA_BLENDER;
const AQUI = fileURLToPath(new URL('.', import.meta.url));
const CAIXA = '0,0.9,0,1.1,0.2,2.0';

function blender(script, args) {
  const r = spawnSync(BLENDER, ['-b', '--factory-startup', '--python', script.startsWith('/') ? script : join(AQUI, script), '--', ...args],
    { encoding: 'utf8', maxBuffer: 256 << 20 });
  if (r.status !== 0) throw new Error(`${script} saiu com ${r.status}:\n${r.stdout.slice(-3000)}\n${r.stderr.slice(-3000)}`);
  return r.stdout;
}

/** A forma de prova em nível 2 com a simetria, como OBJ, mais quads e triângulos extras dados por pontos. */
function obj(extras = []) {
  const g = gaiolaPorEstacoes(definicaoAdensada());
  const n = nucleo([['subdivisao', { origemId: 1, ...g.passo, borda: 'cantos', niveis: 2 }]], g.pontos);
  const ids = [...n.V.keys()];
  const k = new Map(ids.map((id, i) => [id, i + 1]));
  const L = ids.map((id) => `v ${n.V.get(id).join(' ')}`);
  const F = [...n.F.values()].map((f) => `f ${f.vs.map((v) => k.get(v)).join(' ')}`);
  let base = ids.length;
  for (const poligono of extras) {
    for (const p of poligono) L.push(`v ${p.join(' ')}`);
    F.push(`f ${poligono.map((_, i) => base + i + 1).join(' ')}`);
    base += poligono.length;
  }
  return [...L, ...F].join('\n') + '\n';
}

/** Painel interno: uma grade de quads 3 cm abaixo do teto, que não toca a chapa nem se vê de cima. */
function painelInterno() {
  const quads = [];
  const xs = [-0.25, 0, 0.25];
  const zs = [0.5, 0.75, 1.0];
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    quads.push([[xs[i], 0.8, zs[j]], [xs[i], 0.8, zs[j + 1]], [xs[i + 1], 0.8, zs[j + 1]], [xs[i + 1], 0.8, zs[j]]]);
  }
  return quads;
}

const LASCA = [[0.3, 1.0, 1.0], [0.32, 1.0, 1.003], [0.32, 1.0, 1.0]];

const sem = (m) => { const { segundos_medida, segundos_total, ...resto } = m; return resto; };
const metricas = (saida) => JSON.parse(readFileSync(join(saida, 'metricas.json'), 'utf8'));
const cruza = (a, b) => !(a[2] <= b[0] || b[2] <= a[0] || a[3] <= b[1] || b[3] <= a[1]);

describe.skipIf(!BLENDER)('ferramentas do Blender', () => {
  let dir;
  const p = (nome) => join(dir, nome);

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'ferramentas-blender-'));
    writeFileSync(p('forma.obj'), obj());
    writeFileSync(p('forma-suja.obj'), obj([...painelInterno(), LASCA]));
    writeFileSync(p('rotulos.json'), JSON.stringify({ sementes: { lateral: [[0.8, 0.4, 1.0]], teto: [[0, 0.9, 1.0]] } }));
    writeFileSync(p('cfg.json'), JSON.stringify({ visibilidade: { elevacao_minima: 0.3 }, resolucao: [480, 360], amostras_render: 4 }));
    writeFileSync(p('decimar.py'), [
      'import bpy, sys',
      "ent, sai = sys.argv[sys.argv.index('--') + 1:][:2]",
      "bpy.ops.wm.obj_import(filepath=ent, forward_axis='NEGATIVE_Z', up_axis='Y')",
      'o = bpy.context.selected_objects[0]',
      'bpy.context.view_layer.objects.active = o',
      "m = o.modifiers.new('d', 'DECIMATE')",
      'm.ratio = 0.1',
      "bpy.ops.object.modifier_apply(modifier='d')",
      "bpy.ops.wm.obj_export(filepath=sai, export_selected_objects=True, forward_axis='NEGATIVE_Z', up_axis='Y', export_materials=False, export_uv=False, export_normals=False)",
    ].join('\n'));
    blender(p('decimar.py'), [p('forma.obj'), p('decimada.obj')]);
  });
  // MECANIFICA_BLENDER_GUARDAR=1 guarda a pasta com as malhas, as medidas e as imagens para olhar depois
  afterAll(() => {
    if (!dir) return;
    if (process.env.MECANIFICA_BLENDER_GUARDAR) console.log(`saídas em ${dir}`);
    else rmSync(dir, { recursive: true, force: true });
  });

  it('o oráculo regera a fixture da subdivisão a 1e-7', () => {
    const { erros, pior } = compararFixtures(gerarFixture(BLENDER), JSON.parse(readFileSync(FIXTURE, 'utf8')));
    expect(erros).toEqual([]);
    expect(pior).toBeLessThanOrEqual(1e-7);
  });

  it('a régua dá zero na identidade, acusa a decimada e repete a medida', () => {
    const regua = (cand, nome, extra = []) => blender('regua.py', ['--referencia', p('forma.obj'), '--candidata', cand, '--caixa', CAIXA,
      '--simetria-x', '--saida', p(nome), '--nome', nome, '--sem-imagens', ...extra]);
    regua(p('forma.obj'), 'identidade');
    const id = metricas(p('identidade'));
    for (const lado of ['ref_para_cand_mm', 'cand_para_ref_mm']) {
      expect(id[lado].n).toBeGreaterThan(10000);
      expect(id[lado].p99).toBeLessThanOrEqual(0.001);
    }
    expect(id.normal_ref_para_cand_graus.p90).toBeLessThan(0.1);
    expect(id.vincos.ref_comprimento_mm).toBeGreaterThan(1000);
    expect([id.vincos.f1_5mm, id.vincos.f1_10mm, id.vincos.cobertura_5mm, id.vincos.precisao_5mm]).toEqual([1, 1, 1, 1]);
    expect(id.vincos.desvio_mediana_mm).toBe(0);

    regua(p('decimada.obj'), 'decimada');
    regua(p('decimada.obj'), 'decimada-de-novo');
    const dec = metricas(p('decimada'));
    expect(sem({ ...metricas(p('decimada-de-novo')), nome: 'decimada' })).toEqual(sem(dec));
    expect(dec.ref_para_cand_mm.p90).toBeGreaterThan(0.05);
    expect(dec.cand_para_ref_mm.p90).toBeGreaterThan(0.05);
    expect(dec.normal_ref_para_cand_graus.p90).toBeGreaterThan(0.3);
    expect(dec.vincos.cobertura_5mm).toBeLessThan(1);
    expect(dec.vincos.f1_5mm).toBeLessThan(1);
    expect(dec.vertices_na_caixa * 5).toBeLessThan(id.vertices_na_caixa);
    // o recorte da candidata pega o triângulo comprido que atravessa a caixa com o centro fora dela: a decimada recortada
    // tem a área da referência recortada (o recorte só pelos centros perdia 0,5% em dentes na borda)
    expect(Math.abs(dec.area_recorte_candidata_m2 / dec.referencia.area_mantida_m2 - 1)).toBeLessThan(0.001);
    expect(Math.abs(id.area_recorte_candidata_m2 / id.referencia.area_mantida_m2 - 1)).toBeLessThan(1e-6);
  });

  it('a régua desenha a folha e separa a distância por rótulo', () => {
    blender('regua.py', ['--referencia', p('forma.obj'), '--candidata', p('decimada.obj'), '--caixa', CAIXA, '--simetria-x',
      '--saida', p('folha'), '--nome', 'folha', '--rotulos', p('rotulos.json')]);
    const m = metricas(p('folha'));
    expect(Object.keys(m.por_rotulo)).toEqual(['lateral', 'teto']);
    expect(m.por_rotulo.lateral.fracao + m.por_rotulo.teto.fracao).toBeCloseTo(1, 2);
    expect(existsSync(p('folha/folha.png'))).toBe(true);
    for (const l of ['ref_cinza', 'cand_cinza', 'ref_zebra', 'cand_zebra', 'mapa']) expect(existsSync(p(`folha/${l}-frente.png`))).toBe(true);
  });

  it('o pacote cego tira o painel interno e a lasca, deixa a borda limpa e marca o avesso', () => {
    const pacote = (ref, saida) => {
      blender('pacote-cego.py', ['--referencia', ref, '--caixa', CAIXA, '--simetria-x', '--config', p('cfg.json'), '--saida', p(saida)]);
      return JSON.parse(readFileSync(p(`${saida}/pacote.json`), 'utf8'));
    };
    const limpo = pacote(p('forma.obj'), 'pacote-limpo');
    const sujo = pacote(p('forma-suja.obj'), 'pacote-sujo');
    const c = sujo.contagens;
    expect(c.triangulos_recorte).toBeGreaterThan(limpo.contagens.triangulos_recorte);
    expect(c.paineis_removidos).toBeGreaterThanOrEqual(1);
    expect(c.componentes_removidos).toBeGreaterThanOrEqual(1);
    expect(c.triangulos_mantidos).toBe(limpo.contagens.triangulos_mantidos);
    expect(c.bordas).toEqual(limpo.contagens.bordas);
    expect(c.bordas.corte).toBeGreaterThan(0);
    expect(c.bordas.outra).toBe(0);
    expect(c.bordas.nao_variedade).toBe(0);
    expect(c.fora_da_caixa_m).toBeLessThanOrEqual(1e-6);
    // a frente olha a chapa pelo corte e vê o lado de dentro; o topo e o lado só veem a face de fora
    expect(sujo.avesso.frente.fracao).toBeGreaterThan(0.05);
    expect(sujo.avesso.topo.fracao).toBeLessThan(0.001);
    expect(sujo.avesso.lado.fracao).toBeLessThan(0.001);
    const grade = JSON.parse(readFileSync(p('pacote-sujo/vistas/grade.json'), 'utf8'));
    for (const [img, g] of Object.entries(grade)) {
      expect(g.barra_cobre_rotulo, img).toBe(false);
      for (const r of [...g.rotulos, g.titulo]) expect(cruza(g.barra, r), img).toBe(false);
      if (!img.startsWith('tresquartos')) expect(g.rotulos.length, img).toBeGreaterThan(2);
    }

    // a candidata igual à forma limpa, olhada nas câmeras do pacote, dá as mesmas imagens
    blender('olhar-candidata.py', ['--candidata', p('forma.obj'), '--pacote', p('pacote-limpo'), '--saida', p('olhar-')]);
    const olhar = JSON.parse(readFileSync(p('olhar-olhar.json'), 'utf8'));
    expect(Math.abs(olhar.area_m2 / limpo.contagens.area_mantida_m2 - 1)).toBeLessThan(1e-6);
    for (const [v, a] of Object.entries(limpo.avesso)) {
      expect(Math.abs(olhar.avesso[v].pixels_objeto - a.pixels_objeto), v).toBeLessThanOrEqual(0.005 * a.pixels_objeto);
      expect(Math.abs(olhar.avesso[v].pixels_avesso - a.pixels_avesso), v).toBeLessThanOrEqual(0.005 * a.pixels_objeto);
    }
  });
});
