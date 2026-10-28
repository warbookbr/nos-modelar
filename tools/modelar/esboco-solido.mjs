/* esboco-solido.mjs — o adaptador que liga o esboço ao sólido que a receita é conferida contra.
 *
 * O núcleo (`src/autoria/forma-do-esboco.js` e `solido-do-esboco.js`) recebe as formas já resolvidas (`formasResolvidas`) e não importa o
 * módulo do esboço, e o módulo não importa o núcleo. A ligação mora aqui, como a do andaime em `esboco-para-andaime.mjs`: lê a opção do
 * esboço pelo módulo, entrega a malha de cada forma de família pelo provedor de `esboco-familias.mjs` (a que o módulo já leu, e não o casco
 * convexo dela) e chama a conferência.
 *
 * Resolver uma opção do esboço é a parte cara (o avião inteiro leva 45 s, dos quais 40 s são a superfície das 15 formas de família, que o
 * provedor gera a frio, e 3 s os recortes do módulo), e a conferência de uma receita repete a mesma opção a cada execução do veredito.
 * O resultado de `formasResolvidas` fica guardado no processo pela impressão do esboço e pela opção, e o esboço que mudou uma letra
 * resolve de novo. */
import { createHash } from 'node:crypto';
import { formasResolvidas } from '../../modulos/esboco/src/formas-resolvidas.js';
import { malhaDaFamilia } from '../../modulos/esboco/src/familia.js';
import { conferirFormaDoEsboco } from '../../src/autoria/forma-do-esboco.js';
import './esboco-familias.mjs';

const LIMITE_DA_MEMORIA = 4;
const memoria = new Map();

const impressao = (bruto) => createHash('sha256').update(JSON.stringify(bruto)).digest('hex');

/** As formas resolvidas da opção `opcao` (número a partir de 1, ou título) de um esboço já lido, guardadas no processo. */
export function formasDoEsboco(bruto, opcao = 1) {
  const chave = `${impressao(bruto)}|${JSON.stringify(opcao)}`;
  if (memoria.has(chave)) return memoria.get(chave);
  const dados = formasResolvidas(bruto, opcao);
  if (memoria.size >= LIMITE_DA_MEMORIA) memoria.delete(memoria.keys().next().value);
  memoria.set(chave, dados);
  return dados;
}

/** A malha de uma forma de família, a que o módulo leu (recentrada, com as faces para fora): o provedor é o de `esboco-familias.mjs`. */
export function malhaDaFormaDeFamilia(forma) {
  const { familia, perfil, parametros } = forma.geometria;
  return malhaDaFamilia({ id: forma.id, tipo: 'familia', familia, ...(perfil === undefined ? {} : { perfil }), parametros });
}

/** `REFINA.esboco` (canônico) conferido contra o esboço `bruto` (o JSON lido) e a peça executada `neutro`. */
export function conferirFormaDoEsbocoDoJson({ esboco, bruto, neutro }) {
  return conferirFormaDoEsboco({ esboco, dados: formasDoEsboco(bruto, esboco.opcao), neutro, malhaDaFamilia: malhaDaFormaDeFamilia });
}
