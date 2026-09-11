#!/usr/bin/env node
/* reguas-nos-gates.mjs — régua que existe precisa ser rodada por alguém.
 *
 * O `gates-espelham-ci` já garante que o comando local e o CI executam o mesmo
 * conjunto. O buraco que sobrava é anterior a isso: um comando de verificação
 * pode existir, sair com código de erro na divergência, e não estar em NENHUM
 * dos dois. Aí ele não protege nada, e pior, dá a impressão de proteger.
 *
 * Medido em 2026-09-11, em três casos do mesmo dia. `guarda:acervo` não existia
 * porque a régua de contato era chamada à mão, e um quadro de bicicleta saiu com
 * os balanços soltos no ar sem nada acusar. `autoria:n2:evidencias:check` estava
 * VERMELHO desde agosto, acusando dezessete arquivos divergentes, e ninguém viu.
 * `arquitetura:motor:check` e `autoria:schemas:check` estavam verdes, mas nada
 * impedia que envelhecessem calados.
 *
 * A regra é por NOME, de propósito: quem batiza um comando de `:check` ou de
 * `guarda:` está dizendo que ele afirma algo sobre o repositório. Exceção custa
 * uma linha escrita à mão na lista abaixo, com motivo — do mesmo jeito que as
 * allowlists de links e de estrutura fazem. Exceção barata vira regra, e regra
 * que não custa nada não segura nada.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GATES } from '../gates.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/* Comando cujo nome promete verificação. */
export function ehRegua(nome) {
  return nome.endsWith(':check') || nome.startsWith('guarda:');
}

/* Fechada por par comando→motivo. Uma régua só fica fora do caminho de todo
   mundo quando alguém escreve por quê. */
export const FORA_DOS_GATES = new Map([
  [
    'procedencia:check',
    'não confere o repositório: recebe um arquivo de procedência por argumento e '
    + 'sai com código 2 sem ele. É ferramenta de inspeção com nome de régua, e '
    + 'renomear custaria quebrar as citações que já existem',
  ],
]);

export function comandosDoCI(raiz = REPO) {
  const ci = readFileSync(join(raiz, '.github/workflows/ci.yml'), 'utf8');
  return new Set([...ci.matchAll(/^\s+run:\s*(.+)$/gm)]
    .map((m) => m[1].trim())
    .filter((c) => c.startsWith('npm run '))
    .map((c) => c.slice('npm run '.length).trim()));
}

export function conferirReguas({ raiz = REPO, gates = GATES, excecoes = FORA_DOS_GATES } = {}) {
  const scripts = Object.keys(JSON.parse(readFileSync(join(raiz, 'package.json'), 'utf8')).scripts ?? {});
  const noCI = comandosDoCI(raiz);
  const rodadas = new Set([...gates, ...noCI]);
  const problemas = [];

  for (const nome of scripts.filter(ehRegua)) {
    if (rodadas.has(nome)) {
      if (excecoes.has(nome)) {
        problemas.push(`'${nome}' está nos gates E na lista de exceções; tire da lista, a exceção acabou`);
      }
      continue;
    }
    const motivo = excecoes.get(nome);
    if (!motivo) {
      problemas.push(
        `'${nome}' promete verificação pelo nome e não é rodado por gate nem pelo CI. `
        + 'Ponha em `tools/gates.mjs` e no `ci.yml`, ou declare a exceção com motivo em FORA_DOS_GATES.',
      );
    }
  }

  /* O caminho inverso: gate que aponta para script inexistente reprova a suíte
     inteira com erro de npm, e o motivo real fica escondido no ruído. */
  for (const gate of gates) {
    if (!scripts.includes(gate)) problemas.push(`gate '${gate}' não existe como script do package.json`);
  }

  for (const nome of excecoes.keys()) {
    if (!scripts.includes(nome)) problemas.push(`exceção '${nome}' não existe mais; tire da lista`);
  }

  return { problemas, reguas: scripts.filter(ehRegua) };
}

if (process.argv[1] && process.argv[1].endsWith('reguas-nos-gates.mjs')) {
  const { problemas, reguas } = conferirReguas();
  if (problemas.length) {
    console.error(`reguas:check FALHOU — ${problemas.length} problema(s):`);
    for (const p of problemas) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log(`reguas:check ok — ${reguas.length} régua(s) conferida(s); ${FORA_DOS_GATES.size} exceção(ões) declarada(s).`);
}
