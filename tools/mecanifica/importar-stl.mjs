/* Linha de comando do importador de STL para `.esboco.json`.
   Uso: npm run importar-stl -- <pasta-ou-arquivos.stl...> [--saida <arquivo.esboco.json>] [--escala <k>] [--lado-a-lado] [--frente +y|-y|+x|-x] [--girar rx,ry,rz] [--contato <mm>] [--nomes <mapa.json>] [--conferir]

   Cada arquivo STL (binário ou ASCII, também `.stl.gz`) é uma peça, e cada componente conexo de um STL com vários é uma peça, com sufixo;
   o id vem do nome do arquivo. Uma pasta vale pelos `.stl` dela, em ordem alfabética. A forma de cada peça é a do importador de STEP
   (revolução, extrusão com furos passantes, aproximadas, caixa). O STL não traz unidade (mm; `--escala 25.4` para polegadas) nem
   montagem: cada peça fica na posição do arquivo, ou numa fileira com `--lado-a-lado`. Grava `<nome>.esboco.json` e
   `<nome>.importacao.json` (tipo, medidas, número de lados e ocupação de cada peça). `--conferir` mede cada peça contra a malha do
   próprio arquivo (volume e razão interseção/união). A tradução é de `esboco-importar-stl.mjs`. */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { conferirStl, idDoArquivo, importarStl, RecusaDeImportacao } from './esboco-importar-stl.mjs';

const resolverCaminho = (caminho) => resolve(process.env.INIT_CWD || process.cwd(), caminho);
const USO = 'uso: npm run importar-stl -- <pasta-ou-arquivos.stl...> [--saida <arquivo.esboco.json>] [--escala <k>] [--lado-a-lado] [--frente +y|-y|+x|-x] [--girar rx,ry,rz] [--contato <mm>] [--nomes <mapa.json>] [--conferir]\n';
const ehStl = (nome) => /\.stl(?:\.gz)?$/i.test(nome);

export function ler(argv) {
  const args = { entradas: [], saida: null, frente: '+y', girar: null, nomes: null, contato: null, escala: null, conferir: false, ladoALado: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--conferir') args.conferir = true;
    else if (a === '--lado-a-lado') args.ladoALado = true;
    else if (['--saida', '--frente', '--girar', '--nomes', '--contato', '--escala'].includes(a)) {
      const v = argv[++i];
      if (v === undefined) throw new RecusaDeImportacao(`${a} pede um valor`);
      args[a.slice(2)] = v;
    } else if (a.startsWith('--')) throw new RecusaDeImportacao(`opção "${a}" desconhecida`);
    else args.entradas.push(a);
  }
  if (args.entradas.length === 0) throw new RecusaDeImportacao('falta a pasta ou os arquivos STL');
  return args;
}

/* As entradas viram a lista de arquivos STL: uma pasta vale pelos `.stl` dela (ordem alfabética), um arquivo vale por ele. */
export function arquivosDasEntradas(entradas) {
  const lista = [];
  let destinoPadrao = null;
  for (const e of entradas) {
    const caminho = resolverCaminho(e);
    if (!existsSync(caminho)) throw new RecusaDeImportacao(`${caminho} não existe`);
    if (statSync(caminho).isDirectory()) {
      const nomes = readdirSync(caminho).filter(ehStl).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
      if (nomes.length === 0) throw new RecusaDeImportacao(`${caminho} não tem nenhum .stl`);
      for (const n of nomes) lista.push(join(caminho, n));
      destinoPadrao ??= join(caminho, `${idDoArquivo(basename(caminho) + '.stl') || 'pecas'}.esboco.json`);
    } else {
      if (!ehStl(caminho)) throw new RecusaDeImportacao(`${caminho} não é um .stl`);
      lista.push(caminho);
    }
  }
  if (destinoPadrao === null) {
    const primeiro = lista[0];
    destinoPadrao = lista.length === 1 ? join(dirname(primeiro), `${basename(primeiro).replace(/\.stl(?:\.gz)?$/i, '')}.esboco.json`) : join(dirname(primeiro), 'pecas.esboco.json');
  }
  return { lista, destinoPadrao };
}

export async function rodar(argv) {
  const args = ler(argv);
  const { lista, destinoPadrao } = arquivosDasEntradas(args.entradas);
  const girar = args.girar === null ? [0, 0, 0] : args.girar.split(',').map(Number);
  if (girar.length !== 3 || !girar.every(Number.isFinite)) throw new RecusaDeImportacao('--girar pede três ângulos em graus, como --girar -90,0,0');
  const toleranciaDeContato = args.contato === null ? 0.1 : Number(args.contato);
  if (!(toleranciaDeContato >= 0)) throw new RecusaDeImportacao('--contato pede uma distância em mm, como --contato 0.1');
  const escala = args.escala === null ? 1 : Number(args.escala);
  if (!(escala > 0) || !Number.isFinite(escala)) throw new RecusaDeImportacao('--escala pede um número maior que zero, como --escala 25.4');
  const nomes = args.nomes ? JSON.parse(readFileSync(resolverCaminho(args.nomes), 'utf8')) : {};
  const t0 = Date.now();
  const arquivos = lista.map((caminho) => {
    const bruto = readFileSync(caminho);
    return { nome: basename(caminho), bytes: /\.gz$/i.test(caminho) ? gunzipSync(bruto) : bruto };
  });
  const resultado = await importarStl(arquivos, { frente: args.frente, girar, escala, ladoALado: args.ladoALado, toleranciaDeContato, nomes, conferir: args.conferir });
  const { texto, relatorio } = resultado;
  const t1 = Date.now();
  let conferencia = null;
  if (args.conferir) {
    conferencia = await conferirStl(resultado);
    relatorio.conferencia = conferencia;
  }
  const t2 = Date.now();
  const destino = args.saida ? resolverCaminho(args.saida) : destinoPadrao;
  const sidecar = destino.replace(/\.esboco\.json$/i, '') + '.importacao.json';
  writeFileSync(destino, texto);
  writeFileSync(sidecar, `${JSON.stringify(relatorio, null, 2)}\n`);
  const tipos = Object.entries(relatorio.tipos).map(([t, n]) => `${n} ${t}`).join(', ');
  const classes = Object.entries(relatorio.classes).map(([t, n]) => `${n} ${t}`).join(', ');
  const linhas = [
    `gravado: ${destino}`,
    `tipo e medidas de cada peça: ${sidecar}`,
    `${relatorio.pecas.length} peças de ${relatorio.fonte.arquivos.length} arquivo(s) (${classes}; ${relatorio.exatas} exatas, ${relatorio.aproximadas} aproximadas, ${relatorio.caixasUltimoRecurso} em caixa); formas: ${tipos}; ${relatorio.contatos.length} contatos; ocupação média ${relatorio.ocupacaoMedia}; importação em ${((t1 - t0) / 1000).toFixed(1)} s`,
    `a montagem não vem do STL: ${args.ladoALado ? 'as peças estão numa fileira ao longo de x, sem se tocar' : 'cada peça está na posição do arquivo'}`,
  ];
  const iou = new Map((conferencia?.porPeca ?? []).map((p) => [p.id, p.iou]));
  for (const p of relatorio.pecas) {
    linhas.push(`  ${p.id}: ${p.tipo} (${p.classe === 'caixa' ? (p.marcada ? 'caixa' : 'exata') : p.aproximada ? 'aproximada' : 'exata'}), ocupação ${p.ocupacao}${p.lados ? `, ${p.lados} lados${p.poucosLados ? ' (poucos)' : ''}` : ''}${p.furosComPoucosLados ? `, furos com poucos lados: ${p.furosComPoucosLados.length}` : ''}${iou.has(p.id) ? `, interseção/união ${iou.get(p.id)}` : ''}`);
  }
  if (conferencia) linhas.push(`conferência contra a malha de cada arquivo: interseção/união do conjunto ${conferencia.iouDoConjunto}, média por peça ${conferencia.iouMedioPorPeca} (${conferencia.pecasMedidas} peças medidas, ${conferencia.pecasSemMedida} sem medida) em ${((t2 - t1) / 1000).toFixed(1)} s`);
  return `${linhas.join('\n')}\n`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.stdout.write(await rodar(process.argv.slice(2)));
  } catch (e) {
    if (!(e instanceof RecusaDeImportacao)) throw e;
    process.stderr.write(`importação recusada: ${e.message}\n${/falta a pasta|desconhecida|pede /.test(e.message) ? USO : ''}`);
    process.exitCode = 1;
  }
}
