/* Linha de comando do importador de `.csg` do OpenSCAD para `.esboco.json`.
   Uso: npm run importar-csg -- <arquivo.csg> [--saida <arquivo.esboco.json>] [--frente +y|-y|+x|-x] [--girar rx,ry,rz] [--nomes <mapa.json>] [--parcial] [--conferir <malha.stl>]

   Grava `<nome>.esboco.json` ao lado do `.csg` (ou em `--saida`) e `<nome>.importacao.json` ao lado dele, com a origem de cada
   forma (nó e linha do .csg), os avisos e as recusas. Se o esboço não expressa algum nó, nada é gravado e o comando sai com
   código 1 dizendo o nó e a linha; `--parcial` grava o resto e diz o que ficou de fora, no relato e no `plano` do esboço.
   `--conferir` mede o esboço importado contra a malha que o OpenSCAD exporta do mesmo objeto (`openscad -o x.stl x.scad`): o volume
   de cada lado e a razão interseção/união, gravados também em `<nome>.importacao.json`. A tradução é de `esboco-importar-csg.mjs` e a
   medida de `esboco-importar-csg-conferir.mjs`. */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { importarCsg, RecusaDeImportacao } from './esboco-importar-csg.mjs';

const resolverCaminho = (caminho) => resolve(process.env.INIT_CWD || process.cwd(), caminho);
const USO = 'uso: npm run importar-csg -- <arquivo.csg> [--saida <arquivo.esboco.json>] [--frente +y|-y|+x|-x] [--girar rx,ry,rz] [--nomes <mapa.json>] [--parcial] [--conferir <malha.stl>]\n';

export function ler(argv) {
  const args = { csg: null, saida: null, frente: '+y', girar: null, nomes: null, conferir: null, parcial: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--parcial') args.parcial = true;
    else if (['--saida', '--frente', '--girar', '--nomes', '--conferir'].includes(a)) {
      const v = argv[++i];
      if (v === undefined) throw new RecusaDeImportacao(`${a} pede um valor`);
      args[a.slice(2)] = v;
    } else if (a.startsWith('--')) throw new RecusaDeImportacao(`opção "${a}" desconhecida`);
    else if (args.csg === null) args.csg = a;
    else throw new RecusaDeImportacao(`argumento "${a}" a mais; o comando recebe um só .csg`);
  }
  if (args.csg === null) throw new RecusaDeImportacao('falta o arquivo .csg');
  return args;
}

export async function rodar(argv) {
  const args = ler(argv);
  const origem = resolverCaminho(args.csg);
  if (!existsSync(origem)) throw new RecusaDeImportacao(`${origem} não existe`);
  const girar = args.girar === null ? [0, 0, 0] : args.girar.split(',').map(Number);
  if (girar.length !== 3 || !girar.every(Number.isFinite)) throw new RecusaDeImportacao('--girar pede três ângulos em graus, como --girar -90,0,0');
  const nomes = args.nomes ? JSON.parse(readFileSync(resolverCaminho(args.nomes), 'utf8')) : {};
  const { texto, relatorio } = importarCsg(readFileSync(origem, 'utf8'), { frente: args.frente, girar, nomes, parcial: args.parcial, arquivo: basename(origem) });
  const destino = args.saida ? resolverCaminho(args.saida) : join(dirname(origem), `${basename(origem).replace(/\.csg$/i, '')}.esboco.json`);
  const sidecar = destino.replace(/\.esboco\.json$/i, '') + '.importacao.json';
  let conferencia = null;
  if (args.conferir) {
    const malha = resolverCaminho(args.conferir);
    if (!existsSync(malha)) throw new RecusaDeImportacao(`${malha} não existe`);
    const { conferirComMalha, lerStl } = await import('./esboco-importar-csg-conferir.mjs');
    const { quadroDoEsboco } = await import('./esboco-importar-csg.mjs');
    conferencia = await conferirComMalha(JSON.parse(texto), lerStl(readFileSync(malha)), quadroDoEsboco({ frente: args.frente, girar }));
    relatorio.conferencia = { malha: basename(malha), ...conferencia };
  }
  writeFileSync(destino, texto);
  writeFileSync(sidecar, `${JSON.stringify(relatorio, null, 2)}\n`);
  const tipos = Object.entries(relatorio.tipos).map(([t, n]) => `${n} ${t}`).join(', ');
  const linhas = [
    `gravado: ${destino}`,
    `origem de cada forma: ${sidecar}`,
    `${relatorio.formas.length} formas (${tipos}); ${relatorio.cortadoresSemEfeito} cortadores sem efeito descartados`,
  ];
  for (const a of relatorio.avisos) linhas.push(`aviso: ${a.no}${a.linha ? ` na linha ${a.linha}` : ''}: ${a.texto}`);
  if (conferencia) linhas.push(`conferência contra ${basename(args.conferir)}: volume do OpenSCAD ${conferencia.volumeDoOpenScad_mm3} mm3, do esboço ${conferencia.volumeDoEsboco_mm3} mm3, interseção/união ${conferencia.iou}`);
  for (const f of conferencia?.formasSemMedida ?? []) linhas.push(`sem medida na conferência: ${f.id ?? '(esboço)'}${f.tipo ? ` (${f.tipo})` : ''}: ${f.motivo}`);
  for (const r of relatorio.recusas) linhas.push(`FORA (parcial): ${r.no} na linha ${r.linha}: ${r.motivo}`);
  return `${linhas.join('\n')}\n`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.stdout.write(await rodar(process.argv.slice(2)));
  } catch (e) {
    if (!(e instanceof RecusaDeImportacao)) throw e;
    process.stderr.write(`importação recusada: ${e.message}\n${/falta o arquivo|desconhecida|a mais|pede um valor/.test(e.message) ? USO : ''}`);
    process.exitCode = 1;
  }
}
