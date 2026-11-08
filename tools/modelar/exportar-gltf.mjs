/* exportar-gltf.mjs — CLI que grava uma receita procedural como glTF 2.0 binário (.glb), com os materiais dela.
   Uso: npm run exportar:gltf -- <peça> [--saida <arquivo>] [--ambiente estudio|ceu] */
import { existsSync, mkdirSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AMBIENTES, exportarGltf } from '../../modulos/exportador-gltf/src/index.js';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { carregarReceita, conferirSemOrfaos } from './exportar-obj.mjs';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
export const REPO = resolve(AQUI, '../..');

const USO = 'Uso: npm run exportar:gltf -- <peça> [--saida <arquivo>] [--ambiente estudio|ceu]\n'
  + '  <peça>               nome ou caminho da receita (o mesmo que a bancada aceita)\n'
  + '  --saida <arquivo>    destino do .glb (padrão: exportacoes/gltf/<peça>.glb); sobrescreve o que houver\n'
  + `  --ambiente <nome>    ${AMBIENTES.join(' ou ')} (padrão estudio); vai como metadado (extras), porque o glTF não leva ambiente\n`;

export function parseArgs(args = process.argv.slice(2)) {
  const opcoes = { peca: null, saida: null, ambiente: 'estudio' };
  const valor = (i, nome) => {
    const v = args[i + 1];
    if (v === undefined || v.startsWith('--')) throw new Error(`${nome} pede um valor.\n${USO}`);
    return v;
  };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--saida') { opcoes.saida = valor(i, arg); i += 1; } else if (arg.startsWith('--saida=')) opcoes.saida = arg.slice('--saida='.length);
    else if (arg === '--ambiente') { opcoes.ambiente = valor(i, arg); i += 1; } else if (arg.startsWith('--ambiente=')) opcoes.ambiente = arg.slice('--ambiente='.length);
    else if (arg.startsWith('--')) throw new Error(`opção desconhecida '${arg}'.\n${USO}`);
    else if (!opcoes.peca) opcoes.peca = arg;
    else throw new Error(`argumento a mais '${arg}'.\n${USO}`);
  }
  if (!AMBIENTES.includes(opcoes.ambiente)) throw new Error(`ambiente '${opcoes.ambiente}' desconhecido. Aceitos: ${AMBIENTES.join(', ')}.`);
  return opcoes;
}

function gravarAtomico(caminho, bytes) {
  const temporario = `${caminho}.tmp`;
  try {
    writeFileSync(temporario, bytes);
    renameSync(temporario, caminho);
  } catch (err) {
    if (existsSync(temporario)) unlinkSync(temporario);
    throw err;
  }
}

/* o nome do arquivo de saída: o nome da pasta da peça quando a entrada é `receita.js`, senão o do arquivo */
function nomeDoArquivo(caminhoReceita) {
  const base = basename(caminhoReceita, extname(caminhoReceita));
  return (base === 'receita' || base === 'index' ? basename(dirname(caminhoReceita)) : base).replace(/[^a-zA-Z0-9_-]/g, '_');
}

export async function exportarArquivoGltf({ peca, saida = null, ambiente = 'estudio' }) {
  if (!peca) throw new Error(`Informe a peça.\n${USO}`);
  const caminhoReceita = resolverCaminhoReceita(peca, { raiz: REPO });
  const { receita, nome } = await carregarReceita(caminhoReceita);
  const { neutro } = executarReceita(receita);
  conferirSemOrfaos(nome, neutro.orfaos);
  const resultado = exportarGltf({ nome, neutro, materiais: receita.MATERIAIS ?? {}, ambiente });
  const destino = saida
    ? (isAbsolute(saida) ? resolve(saida) : resolve(process.cwd(), saida))
    : resolve(REPO, 'exportacoes/gltf', `${nomeDoArquivo(caminhoReceita)}.glb`);
  mkdirSync(dirname(destino), { recursive: true });
  gravarAtomico(destino, resultado.bytes);
  return { caminhoSaida: destino, tamanhoBytes: statSync(destino).size, diagnostico: resultado.diagnostico };
}

async function main() {
  try {
    const opcoes = parseArgs();
    if (!opcoes.peca) { process.stderr.write(USO); process.exit(1); }
    const res = await exportarArquivoGltf(opcoes);
    const d = res.diagnostico;
    process.stdout.write('Exportação glTF 2.0 binário concluída.\n');
    process.stdout.write(`Destino:    ${relative(REPO, res.caminhoSaida).startsWith('..') ? res.caminhoSaida : relative(REPO, res.caminhoSaida)} (${(res.tamanhoBytes / 1024).toFixed(1)} KB)\n`);
    process.stdout.write(`Ambiente:   ${d.ambiente} (metadado em scenes[0].extras)\n`);
    process.stdout.write(`Partes:     ${d.partes} | primitivas ${d.primitivas} | materiais ${d.materiais} | texturas ${d.texturas}\n`);
    process.stdout.write(`Geometria:  ${d.vertices} vértices, ${d.triangulos} triângulos (metro, y para cima)\n`);
    if (d.extensoes.length) process.stdout.write(`Extensões:  ${d.extensoes.join(', ')}\n`);
  } catch (err) {
    process.stderr.write(`Erro: ${err.message}\n`);
    process.exit(1);
  }
}

const executadoDireto = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (executadoDireto) main();
