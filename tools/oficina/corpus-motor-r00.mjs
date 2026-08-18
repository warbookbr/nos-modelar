/* Corpus sintético da R00. Cada caso dá uma entrada mínima e independente a
   uma capacidade do núcleo; ele congela o resultado observável, não a sua
   implementação. Casos diagnósticos são intencionais e também têm hash. */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { neutroCanonico, nucleo, OPS } from '../../prototipos/procedural/v3/motor/oficina.js';

const cubo = (extra = []) => [['cubo', { origemId: 1, larg: 1, alt: 1, prof: 1 }], ...extra];
const origemTopo = { op: 'cubo', id: 1, face: 'topo' };
const casos = [
  ['cubo', [['cubo', { lado: 1 }]]],
  ['cilindro', [['cilindro', { raio: .5, altura: 1, lados: 8 }]]],
  ['esfera', [['esfera', { raio: .5, aneis: 4, lados: 6 }]]],
  ['cone', [['cone', { raio: .5, altura: 1, lados: 8 }]]],
  ['plano', [['plano', { larg: 1, prof: 1 }]]],
  ['chamferBox', [['chamferBox', { larg: 1, alt: 1, prof: 1, chanfro: .1 }]]],
  ['lathe', [['lathe', { perfil: [[.3, 0], [.3, 1]], lados: 8 }]]],
  ['loft', [['loft', { secoes: [{ pos: [0, 0, 0], raio: .2 }, { pos: [0, 1, 0], raio: .2 }], lados: 8 }]]],
  ['inflate', [['inflate', { contornoLado: [[0, 0], [1, 0], [1, 1], [0, 1]], contornoTopo: [[0, 0], [1, 0], [1, 1], [0, 1]], divisoes: 2 }]]],
  ['publicarPorta', cubo([['publicarPorta', { id: 'topo', de: origemTopo }]])],
  ['moveV', cubo([['moveV', { v: 0, d: [0, .1, 0] }]])],
  ['extruda', cubo([['extruda', { face: 1, dist: .1 }]])],
  ['mescla', cubo([['mescla', { de: [1], para: 0 }]])],
  ['moveF', cubo([['moveF', { face: 1, d: [0, .1, 0] }]])],
  ['moveA', cubo([['moveA', { a: 0, b: 1, d: [0, .1, 0] }]])],
  ['vira', cubo([['vira', { face: 1 }]])],
  ['apagaFace', cubo([['apagaFace', { face: 1 }]])],
  ['displace', cubo([['displace', { amplitude: .01, frequencia: 1, semente: 7 }]])],
  ['encostar', [
    ['cubo', { origemId: 1, lado: 1 }], ['cubo', { origemId: 2, lado: 1, em: [0, .5, 0] }],
    ['encostar', { sel: { origem: { op: 'cubo', id: 2 } }, referencia: { origem: { op: 'cubo', id: 1 } }, direcao: [0, 1, 0] }],
  ]],
  ['transladar', cubo([['transladar', { d: [0, .1, 0] }]])],
  ['rotaciona', cubo([['rotaciona', { eixo: 'y', graus: 15 }]])],
  ['espelha', cubo([['espelha', { eixo: 'x', origemId: 9, derivaDe: { op: 'cubo', id: 1 }, sel: { origem: { op: 'cubo', id: 1 } } }]])],
  ['arranja', cubo([['arranja', { modo: 'linear', total: 2, d: [2, 0, 0], origemId: 9, derivaDe: { op: 'cubo', id: 1 }, sel: { origem: { op: 'cubo', id: 1 } }, nomes: ['copia'] }]])],
  ['furo', [
    ['cilindro', { origemId: 1, raio: 1, altura: .5, lados: 12 }],
    ['furo', { origemId: 9, de: { op: 'cilindro', id: 1, tampa: 'topo' }, saida: { op: 'cilindro', id: 1, tampa: 'fundo' }, centro: [0, .5, 0], raio: .15, lados: 8, orientacao: [1, 0, 0] }],
  ]],
  ['arredondarAresta', cubo([['arredondarAresta', { origemId: 9, de: origemTopo, aresta: 0, raio: .1, paineis: 2 }]])],
  ['filete', cubo([['filete', { origemId: 9, de: origemTopo, aresta: 0, raio: .1 }]])],
  ['pincel', cubo([['pincel', { faces: [1], cor: '#123456' }]])],
  ['solido', cubo([['solido', { faces: [1] }]])],
  ['liso', cubo([['liso', { faces: [1] }]])],
  ['material', cubo([['material', { faces: [1], usa: 'teste' }]])],
  ['parte', cubo([['parte', { faces: [1], nome: 'corpo' }]])],
  ['pesar', cubo([['pesar', { osso: 'raiz', vs: [0], peso: 1 }]])],
];

export const casosMotorR00 = casos.map(([operacao, passos]) => ({
  id: `r00/${operacao}`, operacoes: [operacao], passos,
  materiais: operacao === 'material' ? { teste: { cor: '#ffffff' } } : {},
  esqueleto: operacao === 'pesar' ? { ossos: [{ nome: 'raiz' }] } : null,
}));

export function executarCorpusMotorR00() {
  return casosMotorR00.map((caso) => {
    const neutro = nucleo(caso.passos, {}, {}, caso.materiais, caso.esqueleto);
    const canonico = neutroCanonico(neutro);
    const serializado = JSON.stringify(canonico);
    return {
      id: caso.id, operacoes: caso.operacoes, hashCanonico: createHash('sha256').update(serializado).digest('hex'),
      vertices: neutro.V.size, faces: neutro.F.size, diagnosticos: neutro.orfaos.length,
    };
  });
}

export function baselineMotorR00() {
  return { formato: 'mecanifica.baseline-motor-r00', versao: 1, operacoes: Object.keys(OPS), casos: executarCorpusMotorR00() };
}

const arquivoBaseline = resolve(import.meta.dirname, 'fixtures/motor-r00-baseline.json');
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const baseline = baselineMotorR00();
  if (process.argv.includes('--atualizar')) {
    mkdirSync(dirname(arquivoBaseline), { recursive: true });
    writeFileSync(arquivoBaseline, `${JSON.stringify(baseline, null, 2)}\n`);
  }
  if (process.argv.includes('--check')) {
    const esperado = JSON.parse(readFileSync(arquivoBaseline, 'utf8'));
    if (JSON.stringify(esperado) !== JSON.stringify(baseline)) {
      console.error('baseline R00 divergiu; revise a mudança antes de atualizá-lo.');
      process.exitCode = 1;
    }
  }
  if (process.argv.includes('--medir')) {
    const amostras = [];
    for (let i = 0; i < 7; i++) {
      const antes = process.memoryUsage();
      const inicio = performance.now();
      executarCorpusMotorR00();
      const depois = process.memoryUsage();
      amostras.push({ ms: performance.now() - inicio, heapBytes: depois.heapUsed, rssBytes: depois.rss - antes.rss });
    }
    const meio = (chave) => amostras.map((x) => x[chave]).sort((a, b) => a - b)[3];
    console.log(`mediana: ${meio('ms').toFixed(3)} ms; heap final ${meio('heapBytes')} bytes; variação RSS ${meio('rssBytes')} bytes.`);
  }
  console.log(`${baseline.casos.length} casos; ${baseline.casos.reduce((n, caso) => n + caso.diagnosticos, 0)} diagnósticos.`);
}
