/* Corpus sintético da R00. Cada caso dá uma entrada mínima e independente a
   uma capacidade do núcleo; ele congela o resultado observável, não a sua
   implementação. Casos diagnósticos são intencionais e também têm hash. */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { neutroCanonico, nucleo, OPS, REGISTRO_OPERACOES } from '../../prototipos/procedural/v3/motor/oficina.js';

/* Os exemplos executáveis do registro são a fonte única do corpus. A ordem
   histórica de OPS é preservada para que a baseline continue comparável. */
export const casosMotorR00 = Object.keys(OPS).map((operacao) => {
  const exemplo = REGISTRO_OPERACOES.resolver(operacao)?.uso?.exemplo;
  if (!exemplo) throw new Error(`operação '${operacao}' não publica exemplo executável`);
  return {
    id: `r00/${operacao}`, operacoes: [operacao], passos: exemplo.PASSOS,
    parametros: exemplo.PARAMS, topologia: exemplo.TOPO,
    materiais: exemplo.MATERIAIS, esqueleto: exemplo.ESQUELETO,
  };
});

export function executarCorpusMotorR00() {
  return casosMotorR00.map((caso) => {
    const neutro = nucleo(caso.passos, caso.parametros, caso.topologia, caso.materiais, caso.esqueleto);
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
