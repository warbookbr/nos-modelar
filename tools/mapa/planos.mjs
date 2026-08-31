/* planos.mjs — impede que o planejamento volte a ter mais de um plano ativo
   ou que um plano executivo ultrapasse o limite curto acordado. */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '../..');
const ESTADOS = new Set(['rascunho', 'pronto', 'ativo', 'concluído', 'cancelado', 'congelado']);
const NOME_PLANO = /^\d{4}-\d{2}-\d{2}-.+\.md$/;

/* G4 — subpasta guarda plano, não o esconde do gate.
 *
 * A leitura era `readdirSync` sem recursão, então qualquer plano movido para
 * uma subpasta deixava de ter estado e limite de linhas conferidos: sumia do
 * gate em vez de ser guardado por ele. A pasta `congelados/` já vinha se
 * apoiando nisso sem que ninguém tivesse decidido isso.
 *
 * Agora todas as subpastas são varridas e conferidas. O que continua valendo
 * só para a raiz é QUEM PODE ESTAR EM JOGO: `ativo`, `pronto` e `rascunho`
 * moram na raiz; subpasta guarda o que saiu de cena. */
const ESTADOS_EM_JOGO = new Set(['ativo', 'pronto', 'rascunho']);

function planosDe(pasta, prefixo = '') {
  const encontrados = [];
  for (const entrada of readdirSync(pasta, { withFileTypes: true })) {
    const relativo = prefixo ? `${prefixo}/${entrada.name}` : entrada.name;
    if (entrada.isDirectory()) {
      encontrados.push(...planosDe(join(pasta, entrada.name), relativo));
    } else if (NOME_PLANO.test(entrada.name)) {
      encontrados.push({ nome: relativo, caminho: join(pasta, entrada.name), naRaiz: prefixo === '' });
    }
  }
  return encontrados.sort((a, b) => a.nome.localeCompare(b.nome));
}

function contarLinhas(texto) {
  const normal = texto.replace(/\r\n/g, '\n').replace(/\n$/, '');
  return normal ? normal.split('\n').length : 0;
}

export function conferirPlanos({
  pasta = join(RAIZ, 'docs/mecanifica/planos'),
  indice = join(pasta, 'README.md'),
} = {}) {
  const problemas = [];
  if (!existsSync(pasta)) return { problemas: [`pasta de planos ausente: ${pasta}`], planos: [], ativos: [] };
  if (!existsSync(indice)) return { problemas: [`índice de planos ausente: ${indice}`], planos: [], ativos: [] };

  const planos = planosDe(pasta).map(({ nome, caminho, naRaiz }) => {
    const texto = readFileSync(caminho, 'utf8');
    const linhas = contarLinhas(texto);
    const estado = texto.match(/^\*\*Estado:\*\*\s*(.+?)\s*$/mi)?.[1]?.toLowerCase();
    if (linhas > 200) problemas.push(`${nome}: ${linhas} linhas; o limite é 200`);
    if (!estado || !ESTADOS.has(estado)) problemas.push(`${nome}: estado ausente ou inválido`);
    if (!naRaiz && estado && ESTADOS_EM_JOGO.has(estado)) {
      problemas.push(
        `${nome}: está em subpasta com estado '${estado}'. Plano em jogo mora na raiz de planos/; ` +
        'subpasta guarda o que saiu de cena.',
      );
    }
    return { nome, estado, linhas, naRaiz };
  });

  const ativos = planos.filter((plano) => plano.estado === 'ativo');
  if (ativos.length > 1) problemas.push(`há ${ativos.length} planos ativos: ${ativos.map((p) => p.nome).join(', ')}`);

  const textoIndice = readFileSync(indice, 'utf8');
  const declaracao = textoIndice.match(/^\*\*Plano ativo:\*\*\s*(.+?)\s*$/mi)?.[1];
  if (!declaracao) problemas.push('README.md: declaração "Plano ativo" ausente');
  else if (ativos.length === 0 && !/^nenhum\.?$/i.test(declaracao)) {
    problemas.push(`README.md declara plano ativo, mas nenhum arquivo está ativo: ${declaracao}`);
  } else if (ativos.length === 1 && !declaracao.includes(`(${ativos[0].nome})`)) {
    problemas.push(`README.md não aponta para o plano ativo ${ativos[0].nome}`);
  }

  return { problemas, planos, ativos };
}

function executar() {
  const resultado = conferirPlanos();
  if (resultado.problemas.length > 0) {
    console.error(`planos:check FALHOU — ${resultado.problemas.length} problema(s):`);
    for (const problema of resultado.problemas) console.error(`  - ${problema}`);
    process.exitCode = 1;
    return;
  }
  console.log(`planos:check ok — ${resultado.planos.length} plano(s), ${resultado.ativos.length} ativo(s)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) executar();
