#!/usr/bin/env node
/* origens-check.mjs — quem declara de onde vieram os números, declara todos.
 *
 * O risco que o plano "Ajuste da bancada volta como receita" declara como
 * motivo de parada é a deriva de parâmetro: a rodada de absorção acerta o que a
 * pessoa desenhou na bancada inventando termos até a conta fechar, e depois de
 * algumas rodadas a tabela medida virou uma lista de números sem correspondência
 * com o objeto. `ORIGENS` é a declaração que segura isso, e esta régua a cobra.
 *
 * ADESÃO É OPCIONAL, COMPLETUDE NÃO. O acervo é anterior a esta regra e
 * obrigar todas as peças de uma vez é outro trabalho, então receita sem
 * `ORIGENS` passa. Mas declarar pela metade é pior que não declarar: dá a
 * impressão de lista conferida quando ela só cobre o que era fácil. Quem
 * declara, declara tudo — e não deixa frase explicando parâmetro que já saiu.
 *
 *   npm run origens:check
 */
import { pathToFileURL } from 'node:url';
import { conferirOrigens } from '../../src/autoria/origem-de-parametro.js';
import { DECLARACAO_DE_VAZIO, pecasDoAcervo, vazioDeclarado } from './guardas/guarda-acervo.mjs';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';

const problemas = [];
let declarantes = 0;
const pecas = pecasDoAcervo();

/* Varredura vazia aprovava calada, dizendo "0 de 0 peça(s)", que é a mesma
   frase para acervo sem peça e para listagem quebrada. */
if (pecas.length === 0 && !vazioDeclarado()) {
  console.error('origens:check FALHOU — o acervo está vazio e nada foi conferido.\n'
    + `  Declare em '${DECLARACAO_DE_VAZIO}' se ficar sem peça é o estado pretendido.`);
  process.exit(1);
}

for (const nome of pecas) {
  let receita;
  try {
    const modulo = await import(pathToFileURL(resolverCaminhoReceita(nome)).href);
    receita = modulo.default ?? modulo;
  } catch (erro) {
    problemas.push(`${nome}: não abriu — ${erro?.message ?? erro}`);
    continue;
  }
  const veredito = conferirOrigens(receita);
  if (!veredito.declara) continue;
  declarantes += 1;
  for (const id of veredito.semOrigem) problemas.push(`${nome}: '${id}' não diz de onde veio`);
  for (const chave of veredito.sobrando) {
    problemas.push(`${nome}: ORIGENS explica '${chave}', que não existe mais em PARAMS`);
  }
}

if (problemas.length) {
  console.error('origens:check FALHOU');
  for (const linha of problemas) console.error(`  ${linha}`);
  process.exit(1);
}
console.log(`origens:check ok — ${declarantes} de ${pecas.length} peça(s) declaram origem, e as declarações estão completas.`);
