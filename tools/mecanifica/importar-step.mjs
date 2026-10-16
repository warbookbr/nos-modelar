/* Linha de comando do importador de STEP para `.esboco.json`.
   Uso: npm run importar-step -- <arquivo.step> [--saida <arquivo.esboco.json>] [--frente +y|-y|+x|-x] [--girar rx,ry,rz] [--contato <mm>] [--nomes <mapa.json>] [--conferir]

   Cada sólido do STEP é uma peça, representada pela forma exata mais simples (revolução, extrusão com furos passantes como cortadores
   ou, em último caso, caixa orientada com a ocupação no relato). Grava `<nome>.esboco.json` ao lado do STEP (ou em `--saida`) e
   `<nome>.importacao.json` ao lado dele, com o tipo de cada peça, as caixas e as relações de contato por proximidade (`--contato`,
   em mm, padrão 0,1). `--conferir` mede cada peça importada contra a malha do próprio sólido (volume e razão interseção/união) e grava
   o resultado também no relato. A tradução é de `esboco-importar-step.mjs`. */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { conferirStep, importarStep, RecusaDeImportacao } from './esboco-importar-step.mjs';

const resolverCaminho = (caminho) => resolve(process.env.INIT_CWD || process.cwd(), caminho);
const USO = 'uso: npm run importar-step -- <arquivo.step> [--saida <arquivo.esboco.json>] [--frente +y|-y|+x|-x] [--girar rx,ry,rz] [--contato <mm>] [--nomes <mapa.json>] [--conferir]\n';

export function ler(argv) {
  const args = { step: null, saida: null, frente: '+y', girar: null, nomes: null, contato: null, conferir: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--conferir') args.conferir = true;
    else if (['--saida', '--frente', '--girar', '--nomes', '--contato'].includes(a)) {
      const v = argv[++i];
      if (v === undefined) throw new RecusaDeImportacao(`${a} pede um valor`);
      args[a.slice(2)] = v;
    } else if (a.startsWith('--')) throw new RecusaDeImportacao(`opção "${a}" desconhecida`);
    else if (args.step === null) args.step = a;
    else throw new RecusaDeImportacao(`argumento "${a}" a mais; o comando recebe um só STEP`);
  }
  if (args.step === null) throw new RecusaDeImportacao('falta o arquivo STEP');
  return args;
}

export async function rodar(argv) {
  const args = ler(argv);
  const origem = resolverCaminho(args.step);
  if (!existsSync(origem)) throw new RecusaDeImportacao(`${origem} não existe`);
  const girar = args.girar === null ? [0, 0, 0] : args.girar.split(',').map(Number);
  if (girar.length !== 3 || !girar.every(Number.isFinite)) throw new RecusaDeImportacao('--girar pede três ângulos em graus, como --girar -90,0,0');
  const toleranciaDeContato = args.contato === null ? 0.1 : Number(args.contato);
  if (!(toleranciaDeContato >= 0)) throw new RecusaDeImportacao('--contato pede uma distância em mm, como --contato 0.1');
  const nomes = args.nomes ? JSON.parse(readFileSync(resolverCaminho(args.nomes), 'utf8')) : {};
  const t0 = Date.now();
  const resultado = await importarStep(readFileSync(origem, 'utf8'), { frente: args.frente, girar, nomes, toleranciaDeContato, arquivo: basename(origem) });
  const { texto, relatorio } = resultado;
  const t1 = Date.now();
  let conferencia = null;
  if (args.conferir) {
    conferencia = await conferirStep(resultado);
    relatorio.conferencia = conferencia;
  }
  const destino = args.saida ? resolverCaminho(args.saida) : join(dirname(origem), `${basename(origem).replace(/\.(?:step|stp)$/i, '')}.esboco.json`);
  const sidecar = destino.replace(/\.esboco\.json$/i, '') + '.importacao.json';
  writeFileSync(destino, texto);
  writeFileSync(sidecar, `${JSON.stringify(relatorio, null, 2)}\n`);
  const tipos = Object.entries(relatorio.tipos).map(([t, n]) => `${n} ${t}`).join(', ');
  const classes = Object.entries(relatorio.classes).map(([t, n]) => `${n} ${t}`).join(', ');
  const linhas = [
    `gravado: ${destino}`,
    `tipo e medidas de cada peça: ${sidecar}`,
    `${relatorio.pecas.length} peças (${classes}; ${relatorio.exatas} exatas, ${relatorio.aproximadas} aproximadas, ${relatorio.caixasUltimoRecurso} em caixa); formas: ${tipos}; ${relatorio.contatos.length} contatos; ocupação média ${relatorio.ocupacaoMedia}; importação em ${((t1 - t0) / 1000).toFixed(1)} s`,
  ];
  for (const c of relatorio.caixas) linhas.push(`caixa (último recurso): ${c.id}, ocupação ${c.ocupacao}`);
  if (conferencia) linhas.push(`conferência contra a malha dos sólidos: interseção/união do conjunto ${conferencia.iouDoConjunto}, média por peça ${conferencia.iouMedioPorPeca} (${conferencia.pecasMedidas} peças medidas, ${conferencia.pecasSemMedida} sem malha fechada)`);
  return `${linhas.join('\n')}\n`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.stdout.write(await rodar(process.argv.slice(2)));
  } catch (e) {
    if (!(e instanceof RecusaDeImportacao)) throw e;
    process.stderr.write(`importação recusada: ${e.message}\n${/falta o arquivo|desconhecida|a mais|pede /.test(e.message) ? USO : ''}`);
    process.exitCode = 1;
  }
}
