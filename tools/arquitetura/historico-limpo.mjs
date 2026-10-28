/* historico-limpo.mjs — confere o histórico INTEIRO antes de o repositório ficar público.
 *
 * O gate de termos proibidos confere a pasta atual e as mensagens; o que saiu da pasta continua nos commits antigos, e quem
 * abre o histórico de um repositório público o recupera. Em 2026-10-21 o histórico foi reescrito para tirar material de
 * terceiros, e uma silhueta derivada de prancha de terceiro ficou nele até 2026-10-28, anotada numa lista fora do repositório
 * que nada conferia. Este comando lê cada versão de cada arquivo que algum ref alcança e recusa: termo proibido no conteúdo ou no
 * caminho, malha ou cena 3D fora das fixturas sintéticas declaradas, um caminho da lista de caminhos proibidos e termo proibido
 * numa mensagem de commit. Ele não entra na bateria, porque lê o histórico todo; roda antes de abrir o repositório e depois de
 * reescrevê-lo:
 *
 *   npm run historico:conferir
 *
 * A lista de caminhos proibidos guarda o sha256 de cada caminho, para não repetir o nome de material que não pode estar aqui.
 * Para acrescentar um: `node tools/arquitetura/historico-limpo.mjs --hash <caminho>` e a linha vai para
 * `caminhos-proibidos.hashes.json`. */
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  carregarLista, COMO_FORNECER_A_CHAVE, ehBinario, ehMalhaOuCena, lerChave, linhasProibidas, proibidosDaLista, varrerMensagens,
} from './termos-proibidos.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
export const ARQUIVO_DOS_CAMINHOS = join(AQUI, 'caminhos-proibidos.hashes.json');

/* Malhas que o próprio projeto gerou por código, como fixturas dos importadores que saíram em 2026-10-25: não são de terceiros. */
export const MALHAS_SINTETICAS = [/^tools\/mecanifica\/fixtures\/importar-(step|stl)\//];

export const hashDoCaminho = (caminho) => createHash('sha256').update(caminho).digest('hex');

/* Cada blob que algum ref alcança, com um caminho em que ele aparece. */
function blobsDoHistorico(raiz) {
  const linhas = execFileSync('git', ['rev-list', '--objects', '--all'], { cwd: raiz, maxBuffer: 1 << 30 }).toString().split('\n');
  const caminhos = new Map();
  for (const l of linhas) {
    const i = l.indexOf(' ');
    if (i > 0 && !caminhos.has(l.slice(0, i))) caminhos.set(l.slice(0, i), l.slice(i + 1));
  }
  return caminhos;
}

/* Lê os objetos de uma vez pelo `git cat-file --batch`, em vez de um processo por blob. */
function lerObjetos(raiz, shas) {
  const saida = spawnSync('git', ['cat-file', '--batch'], { cwd: raiz, input: `${shas.join('\n')}\n`, maxBuffer: 2 ** 32 }).stdout;
  const objetos = new Map();
  let p = 0;
  while (p < saida.length) {
    const fim = saida.indexOf(10, p);
    const [sha, tipo, tamanho] = saida.subarray(p, fim).toString().split(' ');
    const n = Number(tamanho);
    objetos.set(sha, { tipo, conteudo: saida.subarray(fim + 1, fim + 1 + n) });
    p = fim + 1 + n + 1;
  }
  return objetos;
}

export function varrerHistorico(raiz, { proibidos, caminhosProibidos = new Set() }) {
  const caminhos = blobsDoHistorico(raiz);
  const objetos = lerObjetos(raiz, [...caminhos.keys()]);
  const termos = []; const malhas = []; const proibidosAchados = [];
  let blobs = 0;
  for (const [sha, caminho] of caminhos) {
    const objeto = objetos.get(sha);
    if (objeto?.tipo !== 'blob') continue;
    blobs += 1;
    if (caminhosProibidos.has(hashDoCaminho(caminho))) proibidosAchados.push({ blob: sha.slice(0, 12) });
    const nomeProibido = linhasProibidas(caminho.replace(/\//g, '\n'), proibidos).length > 0;
    if (nomeProibido) termos.push({ blob: sha.slice(0, 12), linha: 0 });
    if (ehMalhaOuCena(caminho) && !MALHAS_SINTETICAS.some((re) => re.test(caminho))) malhas.push(nomeProibido ? `blob ${sha.slice(0, 12)}` : caminho);
    if (ehBinario(caminho, objeto.conteudo)) continue;
    for (const linha of linhasProibidas(objeto.conteudo.toString('utf8'), proibidos)) {
      termos.push({ caminho: nomeProibido ? `blob ${sha.slice(0, 12)}` : caminho, linha });
    }
  }
  const mensagens = varrerMensagens(raiz, proibidos);
  return { blobs, termos, malhas, caminhos: proibidosAchados, mensagens };
}

function executar() {
  const argumentos = process.argv.slice(2);
  if (argumentos[0] === '--hash') { console.log(hashDoCaminho(argumentos[1])); return; }
  const chave = lerChave(process.env);
  if (!chave) { console.error(`historico:conferir FALHOU — sem a chave dos termos.\n${COMO_FORNECER_A_CHAVE}`); process.exitCode = 1; return; }
  const proibidos = proibidosDaLista(carregarLista(), chave);
  const caminhosProibidos = new Set(JSON.parse(readFileSync(ARQUIVO_DOS_CAMINHOS, 'utf8')).hashes);
  const raiz = join(AQUI, '../..');
  const r = varrerHistorico(raiz, { proibidos, caminhosProibidos });
  const problemas = r.termos.length + r.malhas.length + r.caminhos.length + r.mensagens.achados.length;
  if (problemas) {
    console.error(`historico:conferir FALHOU — ${problemas} problema(s) em ${r.blobs} versões de arquivo e ${r.mensagens.lidos} mensagens:`);
    for (const t of r.termos) console.error(`  termo proibido: ${t.caminho ?? t.blob}${t.linha ? `, linha ${t.linha}` : ' (no caminho)'}`);
    for (const m of r.malhas) console.error(`  malha ou cena 3D: ${m}`);
    for (const c of r.caminhos) console.error(`  caminho proibido: blob ${c.blob}`);
    for (const m of r.mensagens.achados) console.error(`  termo proibido na mensagem do commit ${m.commit.slice(0, 12)}, linha ${m.linha}`);
    console.error('\nO comando lê todo ref local: um achado que só existe num ramo local antigo some apagando o ramo. O que está no remoto sai com\n`git filter-repo` numa cópia separada, conferida de novo antes de substituir o remoto.');
    process.exitCode = 1;
    return;
  }
  console.log(`historico:conferir ok — ${r.blobs} versões de arquivo e ${r.mensagens.lidos} mensagens sem termo proibido, malha ou caminho proibido.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) executar();
