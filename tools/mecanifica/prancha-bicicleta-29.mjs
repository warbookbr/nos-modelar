#!/usr/bin/env node
/* prancha-bicicleta-29.mjs — imprime a tabela e o derivado da bicicleta 29".
 *
 * A FONTE MORA NA RECEITA, `pecas/bicicleta-quadro.js`, e este arquivo só lê e
 * imprime. Este arquivo já teve a tabela dentro dele; ao nascer a receita, as
 * duas cópias passariam a envelhecer em velocidades diferentes.
 *
 * POR QUE A TABELA MANDA, E NÃO A FOTO. As referências desta rodada chegaram
 * como foto de produto pela conversa, e `prancha-referencia.mjs` lê PNG do
 * disco. Sem arquivo não há comparação por número, e estimar proporção olhando
 * a foto é exatamente o que a skill proíbe no passo 1. Geometria de bicicleta,
 * porém, é publicada como TABELA — entre-eixos, ângulos, balanço traseiro,
 * diâmetro de roda — e tabela não depende do meu olho. Então o alvo dimensional
 * é a tabela, e a foto informa só CARÁTER: quais peças existem e que forma têm.
 *
 * TODA POSIÇÃO É DERIVADA, NENHUMA É DIGITADA. Os pontos do quadro saem de
 * trigonometria sobre a tabela. Um número digitado à mão deixaria de
 * corresponder à tabela assim que ela mudasse, que é o defeito medido hoje em
 * `barricada-de-sucata`.
 *
 * A PRANCHA SVG FOI RETIRADA. O motor de prancha existe para objeto com casca:
 * `contorno: true` encadeia trechos num anel, e é o anel que mede fechamento,
 * ponto fora e coerência entre vistas. Bicicleta é esqueleto, não tem silhueta
 * fechada, e sem anel o motor pula as três verificações sem alertar. Sobrou um
 * desenho para olhar, que é julgar de olho com passos a mais. O caráter vem das
 * vistas recortadas em `docs/mecanifica/referencias/bicicleta-29/`.
 */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TABELA, derivar } from '../../prototipos/procedural/v3/pecas/bicicleta-quadro.js';




const P = derivar();

const zMin = P.eixoTraseiro[0] - P.raioRoda - 60;
const zMax = P.eixoDianteiro[0] + P.raioRoda + 60;
const yMax = P.selim[1] + 120;
const xMax = TABELA.meiaLarguraGuidao + 60;

/* SEM DESENHO, DE PROPÓSITO. Este arquivo já desenhou uma prancha SVG e ela foi
   retirada. O motor de prancha existe para objeto com casca: `contorno: true`
   encadeia trechos num anel e é isso que mede fechamento, ponto fora e
   coerência entre vistas. Bicicleta é esqueleto — quadro, garfo e rodas — e sem
   anel o motor pula as três verificações SEM alertar, então o desenho custava
   uma rodada e devolvia só um SVG para olhar. Julgar de olho com passos a mais
   é pior que julgar de olho.
   O que sobrou é o que valia: a TABELA e `derivar()`, que são os números que
   viram PARAMS da receita. O caráter — que peças existem e que forma têm — vem
   das vistas recortadas em `docs/mecanifica/referencias/bicicleta-29/`. */

const executado = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (executado) {
  const largura = 22;
  console.log('TABELA declarada');
  for (const [k, v] of Object.entries(TABELA)) console.log(`  ${k.padEnd(largura)} ${v}`);
  console.log('\nDERIVADO (mm, origem no movimento central projetado no solo)');
  for (const [k, v] of Object.entries(P)) {
    console.log(`  ${k.padEnd(largura)} ${Array.isArray(v) ? `[${v.map((n) => Math.round(n)).join(', ')}]` : Math.round(v)}`);
  }
}
