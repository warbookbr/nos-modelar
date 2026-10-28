/* blender.test.mjs — as ferramentas opcionais do Blender em tools/blender: o oráculo da subdivisão regera a fixture, a
   régua dá zero na identidade, acusa a versão decimada e separa distância e vincos por rótulo (com as omitidas à parte), e o
   pacote cego de uma forma com painel interno e lasca sai com a borda limpa, o avesso marcado, a barra de escala fora dos
   rótulos, as vistas de linhas de feição e os cortes cotados (os pontos do contorno só na pasta privada); e o pacote de uma
   forma simétrica em x (caixa-de-prova.mjs) sai com o recorte simétrico e as vistas de frente, traseira e topo iguais ao
   próprio espelho a até 1 px, também com a triangulação que não é espelhada.

   Só roda com MODELAR_BLENDER apontando o executável do Blender (e python3 com Pillow e numpy); sem a variável, o bloco
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
import { CAIXA as CAIXA_CAIXA, obj as caixaObj } from './caixa-de-prova.mjs';
import { doAmbiente } from '../ambiente.mjs';

const BLENDER = doAmbiente('BLENDER');
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

describe('a variável que aponta o Blender', () => {
  const oraculo = (env) => spawnSync(process.execPath, [join(AQUI, 'oraculo-subdivisao.mjs')], { encoding: 'utf8', env: { PATH: process.env.PATH, ...env } });

  it('sem ela o oráculo pede MODELAR_BLENDER, e o nome antigo MECANIFICA_BLENDER ainda vale, com aviso do novo', () => {
    const sem = oraculo({});
    expect(sem.status).toBe(2);
    expect(sem.stderr).toContain('defina MODELAR_BLENDER');
    const antigo = oraculo({ MECANIFICA_BLENDER: join(AQUI, 'nao-existe-blender') });
    expect(antigo.stderr).toContain('use MODELAR_BLENDER');
    expect(antigo.stderr).not.toContain('defina MODELAR_BLENDER');
  });
});

describe.skipIf(!BLENDER)('ferramentas do Blender', () => {
  let dir;
  const p = (nome) => join(dir, nome);

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'ferramentas-blender-'));
    writeFileSync(p('forma.obj'), obj());
    writeFileSync(p('forma-suja.obj'), obj([...painelInterno(), LASCA]));
    writeFileSync(p('rotulos.json'), JSON.stringify({ sementes: { lateral: [[0.8, 0.4, 1.0]], teto: [[0, 0.9, 1.0]] } }));
    writeFileSync(p('cfg.json'), JSON.stringify({ visibilidade: { elevacao_minima: 0.3 }, resolucao: [480, 360], amostras_render: 4,
      cortes: [{ nome: 'meio', eixo: 'z', valor: 1.1 }, { nome: 'lateral', eixo: 'x', valor: 0.3 }] }));
    writeFileSync(p('cfg-omitidas.json'), JSON.stringify({ omitidas: ['teto'] }));
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
  }, 180000);
  // MODELAR_BLENDER_GUARDAR=1 guarda a pasta com as malhas, as medidas e as imagens para olhar depois
  afterAll(() => {
    if (!dir) return;
    if (doAmbiente('BLENDER_GUARDAR')) console.log(`saídas em ${dir}`);
    else rmSync(dir, { recursive: true, force: true });
  });

  it('o oráculo regera a fixture da subdivisão a 1e-7', { timeout: 120000 }, () => {
    const { erros, pior } = compararFixtures(gerarFixture(BLENDER), JSON.parse(readFileSync(FIXTURE, 'utf8')));
    expect(erros).toEqual([]);
    expect(pior).toBeLessThanOrEqual(1e-7);
  });

  it('a régua dá zero na identidade, acusa a decimada e repete a medida', { timeout: 600000 }, () => {
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

  it('a régua desenha a folha e separa a distância e os vincos por rótulo, com as omitidas à parte', { timeout: 600000 }, () => {
    blender('regua.py', ['--referencia', p('forma.obj'), '--candidata', p('decimada.obj'), '--caixa', CAIXA, '--simetria-x',
      '--saida', p('folha'), '--nome', 'folha', '--rotulos', p('rotulos.json'), '--config', p('cfg-omitidas.json')]);
    const m = metricas(p('folha'));
    expect(Object.keys(m.por_rotulo)).toEqual(['lateral', 'teto']);
    expect(m.por_rotulo.lateral.fracao + m.por_rotulo.teto.fracao).toBeCloseTo(1, 2);
    expect(m.por_rotulo.teto.omitida).toBe(true);
    expect(m.por_rotulo.lateral.omitida).toBe(false);
    // os vincos por rótulo somam o comprimento total, e sem a omitida a medida é a do rótulo que sobra
    const vr = m.vincos_por_rotulo;
    expect(Object.values(vr).reduce((s, v) => s + v.ref_comprimento_mm, 0)).toBeCloseTo(m.vincos.ref_comprimento_mm, -1);
    expect(Object.values(vr).reduce((s, v) => s + v.cand_comprimento_mm, 0)).toBeCloseTo(m.vincos.cand_comprimento_mm, -1);
    expect(m.vincos_sem_omitidas.omitidas).toEqual(['teto']);
    const resto = Object.entries(vr).filter(([n]) => n !== 'teto').map(([, v]) => v.ref_comprimento_mm).reduce((s, x) => s + x, 0);
    expect(m.vincos_sem_omitidas.ref_comprimento_mm).toBeCloseTo(resto, -1);
    expect(m.ref_para_cand_sem_omitidas_mm.n).toBeLessThan(m.ref_para_cand_mm.n);
    expect(existsSync(p('folha/folha.png'))).toBe(true);
    for (const l of ['ref_cinza', 'cand_cinza', 'ref_zebra', 'cand_zebra', 'mapa']) expect(existsSync(p(`folha/${l}-frente.png`))).toBe(true);
  });

  it('o pacote cego tira o painel interno e a lasca, deixa a borda limpa e marca o avesso', () => {
    const pacote = (ref, saida) => {
      blender('pacote-cego.py', ['--referencia', ref, '--caixa', CAIXA, '--simetria-x', '--config', p('cfg.json'), '--saida', p(saida),
        '--privado', p(`${saida}-privado`)]);
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

    // linhas de feição: uma imagem por vista, com traço; a lasca e o painel interno saíram, então as contagens são as da limpa
    expect(sujo.linhas).toEqual(limpo.linhas);
    expect(sujo.linhas.feicao + sujo.linhas.natural).toBeGreaterThan(0);
    for (const v of sujo.vistas) expect(existsSync(p(`pacote-sujo/vistas/${v}-linhas.png`)), v).toBe(true);
    for (const [img, g] of Object.entries(grade)) if (img.endsWith('-linhas')) expect(g.barra_cobre_rotulo, img).toBe(false);
    expect(Object.keys(grade).filter((k) => k.endsWith('-linhas')).length).toBe(sujo.vistas.length);
    // cortes: a imagem e a tabela no pacote, o quadro sem contorno, e os pontos a cada 10 mm só na pasta privada
    expect(sujo.cortes.map((c) => c.nome)).toEqual(['meio', 'lateral']);
    for (const c of sujo.cortes) expect(c.cadeias, c.nome).toBeGreaterThan(0);
    for (const n of ['meio', 'lateral']) expect(existsSync(p(`pacote-sujo/cortes/${n}.png`)), n).toBe(true);
    const cotas = readFileSync(p('pacote-sujo/cortes/cotas.md'), 'utf8').trim().split('\n').slice(2);
    for (const n of ['meio', 'lateral']) {
      const k = cotas.filter((l) => l.startsWith(`| ${n} `)).length;
      expect(k, n).toBeGreaterThanOrEqual(4);
      expect(k, n).toBeLessThanOrEqual(6);
    }
    // nenhuma caixa de rótulo de cota cobre o traço do contorno (a forma desenhada por código tem a prova própria em cotas-dos-cortes.test.mjs)
    const rotulos = JSON.parse(readFileSync(p('pacote-sujo/cortes/rotulos.json'), 'utf8'));
    for (const n of ['meio', 'lateral']) for (const r of rotulos[n]) expect(r.cruza_contorno, `${n}: ${r.texto}`).toBe(false);
    const quadro = JSON.parse(readFileSync(p('pacote-sujo/cortes/quadro.json'), 'utf8'));
    expect(JSON.stringify(quadro)).not.toContain('cadeias');
    const privado = JSON.parse(readFileSync(p('pacote-sujo-privado/cortes.json'), 'utf8'));
    for (const c of privado.cortes) for (const cad of c.cadeias) {
      const passos = cad.slice(1).map((q, i) => Math.hypot(...q.map((x, j) => x - cad[i][j])));
      expect(Math.max(...passos.slice(0, -1), 0.01), c.nome).toBeLessThanOrEqual(0.0101);
    }
    expect(existsSync(p('pacote-sujo/cortes.json'))).toBe(false);

    // a candidata igual à forma limpa, olhada nas câmeras do pacote, dá as mesmas imagens
    blender('olhar-candidata.py', ['--candidata', p('forma.obj'), '--pacote', p('pacote-limpo'), '--saida', p('olhar-')]);
    const olhar = JSON.parse(readFileSync(p('olhar-olhar.json'), 'utf8'));
    expect(Math.abs(olhar.area_m2 / limpo.contagens.area_mantida_m2 - 1)).toBeLessThan(1e-6);
    for (const [v, a] of Object.entries(limpo.avesso)) {
      expect(Math.abs(olhar.avesso[v].pixels_objeto - a.pixels_objeto), v).toBeLessThanOrEqual(0.005 * a.pixels_objeto);
      expect(Math.abs(olhar.avesso[v].pixels_avesso - a.pixels_avesso), v).toBeLessThanOrEqual(0.005 * a.pixels_objeto);
    }
    // e desenha as linhas e os cortes dela no mesmo quadro: as cotas da forma limpa olhada são as do pacote dela
    for (const v of limpo.vistas) expect(existsSync(p(`olhar-${v}-linhas.png`)), v).toBe(true);
    expect(readFileSync(p('olhar-cortes/cotas.md'), 'utf8')).toBe(readFileSync(p('pacote-limpo/cortes/cotas.md'), 'utf8'));
  }, 600000);

  it('o pacote de uma forma simétrica sai com o recorte e as vistas simétricos', { timeout: 600000 }, () => {
    // a caixa com janelas: as placas atrás das janelas se veem de fora só por um cone estreito de direções, e o recorte as
    // decide pelas direções do observador que caem nele; com as direções da esfera de Fibonacci sem espelho, o observador
    // acima do horizonte deixava 4 triângulos (0,0015 m²) de um lado só e a vista de frente com traço a 9 px do espelho
    writeFileSync(p('caixa.obj'), caixaObj());
    writeFileSync(p('caixa-diagonal.obj'), caixaObj({ diagonalTrocada: true }));
    writeFileSync(p('cfg-caixa.json'), JSON.stringify({ fracao_componente: 0, resolucao: [700, 525], amostras_render: 1 }));
    writeFileSync(p('cfg-caixa-alto.json'), JSON.stringify({ fracao_componente: 0, resolucao: [700, 525], amostras_render: 1,
      visibilidade: { elevacao_minima: 0.3 } }));
    const pacote = (ref, cfg, saida) => {
      blender('pacote-cego.py', ['--referencia', p(ref), '--caixa', CAIXA_CAIXA.join(','), '--simetria-x', '--config', p(cfg), '--saida', p(saida)]);
      const r = spawnSync('python3', ['-I', join(AQUI, 'simetria-das-vistas.py'), '--pacote', p(saida), '--vista', 'frente,traseira,topo'],
        { encoding: 'utf8' });
      if (r.status !== 0) throw new Error(r.stderr);
      return { contagens: JSON.parse(readFileSync(p(`${saida}/pacote.json`), 'utf8')).contagens, vistas: JSON.parse(r.stdout).vistas };
    };
    const casos = [
      // a triangulação espelhada: as direções simétricas bastam, e o espelho não muda decisão nenhuma
      ['caixa.obj', 'cfg-caixa.json', 'simetrica-todas', 0],
      ['caixa.obj', 'cfg-caixa-alto.json', 'simetrica-alto', 0],
      // a mesma superfície com as placas espelhadas trianguladas pela outra diagonal: a fração visível de duas placas muda
      // com os triângulos, e a metade x < 0 leva a decisão do espelho
      ['caixa-diagonal.obj', 'cfg-caixa-alto.json', 'diagonal-alto', 1],
    ];
    for (const [ref, cfg, saida, espelhados] of casos) {
      const { contagens: c, vistas } = pacote(ref, cfg, saida);
      expect(c.simetria.area_sem_espelho_m2, saida).toBe(0);
      expect(c.simetria.triangulos_espelho_tirado, saida).toBe(0);
      if (espelhados) expect(c.simetria.triangulos_decididos_pelo_espelho, saida).toBeGreaterThan(0);
      else expect(c.simetria.triangulos_decididos_pelo_espelho, saida).toBe(0);
      // o teste não é vazio: há placas tiradas e mantidas
      expect(c.paineis_removidos, saida).toBeGreaterThan(0);
      expect(c.paineis_removidos, saida).toBeLessThan(c.paineis - 6);
      for (const v of ['frente', 'traseira', 'topo']) {
        expect(vistas[v].pixels_traco, `${saida} ${v}`).toBeGreaterThan(1000);
        expect(vistas[v].desvio_centro_px, `${saida} ${v}`).toBe(0);
        expect(vistas[v].maxima_px, `${saida} ${v}`).toBeLessThanOrEqual(1);
      }
    }
  });
});
