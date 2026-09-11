#!/usr/bin/env node
/* rodada-de-modelagem.mjs — registra uma rodada do laço e diz o que vem agora.
 *
 * Quem orquestra o laço é uma sessão, porque despachar agente não é coisa que
 * script faça. O que NÃO pode morar na sessão é a decisão de parar: memória de
 * quem conduz é exatamente onde "acho que está bom" se instala. Então a sessão
 * chama este comando a cada rodada, ele grava o que aconteceu e devolve a ação
 * seguinte já decidida pelos números.
 *
 * O registro é versionado de propósito. A pergunta "por que esta peça ficou
 * assim" precisa ter resposta depois que todo mundo esqueceu, e veredito que
 * vive só no diálogo some com a janela de contexto.
 *
 * Uso:
 *   node tools/mecanifica/rodada-de-modelagem.mjs <peça> --registrar rodada.json
 *   node tools/mecanifica/rodada-de-modelagem.mjs <peça> --acao
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defeitosAbertos, proximaAcao, registrarRodada } from '../../src/autoria/laco-de-modelagem.js';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';

const REPO = resolve(fileURLToPath(new URL('../..', import.meta.url)));

/* Onde as rodadas moravam antes da pasta da peça, e onde continuam morando
   enquanto existir peça em arquivo solto. Registro de peça migrada não é movido:
   ele é evidência do que aconteceu, e evidência não muda de lugar para caber
   numa arrumação nova. */
export const PASTA_RODADAS = join(REPO, 'docs/mecanifica/historico/rodadas');

const NOME_DE_PECA = /^[a-z0-9][a-z0-9-]*$/;

/* A rodada grava DENTRO da pasta da peça, ao lado da receita que ela julgou.
   Enquanto ficava em `docs/`, responder "por que esta peça está assim" exigia
   saber de cor um caminho em outra árvore — e quem abre a peça não descobre
   que o registro existe. Peça em arquivo solto não tem pasta, e aí a rodada cai
   no lugar antigo. */
function exigirNome(peca) {
  if (!NOME_DE_PECA.test(peca ?? '')) {
    throw new Error(`'${peca}' não é nome de peça; use letras minúsculas, dígitos e hífen.`);
  }
}

export function pastaDeRodadas(peca, { raiz = REPO } = {}) {
  exigirNome(peca);
  try {
    const receita = resolverCaminhoReceita(peca, { raiz });
    if (receita.endsWith(`${sep}receita.js`)) return join(dirname(receita), 'rodadas');
  } catch { /* peça que ainda não existe grava no lugar antigo */ }
  return join(raiz, 'docs/mecanifica/historico/rodadas', peca);
}

export function lerRodadas(peca, { pasta = pastaDeRodadas(peca) } = {}) {
  /* O nome é conferido mesmo quando a pasta vem por parâmetro. Sem isto, quem
     injeta a pasta — o teste, ou um comando futuro — passa a aceitar nome com
     `..` e a escrever fora da árvore pretendida. */
  exigirNome(peca);
  if (!existsSync(pasta)) return [];
  return readdirSync(pasta)
    .filter((nome) => /^rodada-\d{2}\.json$/.test(nome))
    .sort()
    .map((nome) => JSON.parse(readFileSync(join(pasta, nome), 'utf8')));
}

export function gravarRodada(peca, { veredito = null, medidas }, { pasta = pastaDeRodadas(peca) } = {}) {
  exigirNome(peca);
  const anteriores = lerRodadas(peca, { pasta });
  const rodada = registrarRodada({ peca, numero: anteriores.length + 1, veredito, medidas });
  mkdirSync(pasta, { recursive: true });
  const arquivo = join(pasta, `rodada-${String(rodada.numero).padStart(2, '0')}.json`);
  /* Rodada gravada não é reescrita. O registro é evidência do que aconteceu, e
     evidência que muda depois não serve para responder por que a peça ficou
     assim. */
  if (existsSync(arquivo)) throw new Error(`a rodada ${rodada.numero} de '${peca}' já foi gravada.`);
  writeFileSync(arquivo, `${JSON.stringify(rodada, null, 2)}\n`, 'utf8');
  return { rodada, arquivo };
}

function comoCLI(argv) {
  const peca = argv.find((a) => !a.startsWith('--'));
  const registrar = argv.indexOf('--registrar');
  if (!peca) return { codigo: 1, texto: 'diga a peça: rodada-de-modelagem.mjs <peça> --acao' };

  if (registrar >= 0) {
    const entrada = JSON.parse(readFileSync(argv[registrar + 1], 'utf8'));
    const { rodada, arquivo } = gravarRodada(peca, entrada);
    const decisao = proximaAcao(lerRodadas(peca));
    return {
      codigo: 0,
      texto: `rodada ${rodada.numero} gravada em ${arquivo.replace(`${REPO}/`, '')}\n`
        + `próxima ação: ${decisao.acao} — ${decisao.motivo}`,
    };
  }

  const rodadas = lerRodadas(peca);
  const decisao = proximaAcao(rodadas);
  const abertos = defeitosAbertos(rodadas);
  return {
    codigo: 0,
    texto: `${rodadas.length} rodada(s) registrada(s) para '${peca}'.\n`
      + `próxima ação: ${decisao.acao} — ${decisao.motivo}\n`
      + (abertos.length
        ? `defeitos em aberto:\n${abertos.map((d) => `  ${d.parte}: ${d.tipo} ${d.sentido} em ${d.onde}`).join('\n')}`
        : 'defeitos em aberto: nenhum.'),
  };
}

if (process.argv[1] && process.argv[1].endsWith('rodada-de-modelagem.mjs')) {
  try {
    const { codigo, texto } = comoCLI(process.argv.slice(2));
    (codigo === 0 ? console.log : console.error)(texto);
    process.exit(codigo);
  } catch (erro) {
    console.error(`rodada-de-modelagem: ${erro.message}`);
    process.exit(1);
  }
}
