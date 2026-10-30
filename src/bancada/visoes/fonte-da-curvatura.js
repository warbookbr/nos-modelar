/* fonte-da-curvatura.js — o que a curvatura da peça na bancada precisa da receita, tirado uma vez por receita, no quadro da cena:
 * as partes de lataria e os vincos declarados, como `tools/modelar/vistas-de-superficie.mjs` os passa ao Blender.
 *
 * As partes são as de `PLANO.lataria`, ou as que têm face nascida de passo `subdivisao` (`latariaDaReceita` e `partesDaLataria`);
 * os vincos são os nomeados dos passos `subdivisao` (`vincosDaMalha`), guardados pelos ids dos vértices nas pontas de cada aresta,
 * para a conta (`calculo-da-curvatura.js`, no trabalhador) tirá-los da malha editada sem subdividir a gaiola de novo. Achar os
 * vincos subdivide a gaiola da receita e puxa o núcleo, por isso corre aqui e não no trabalhador; na carenagem de prova leva perto
 * de 0,4 s, uma vez por receita aberta com a curvatura ligada. Nada aqui conhece o Three nem o DOM. */
import { entradaDaReceita } from '../../autoria/executar-receita.js';
import { latariaDaReceita, partesDaLataria } from '../../autoria/lataria.js';
import { normalizarPlanoDeModelagem } from '../../autoria/plano-de-modelagem.js';
import { vincosDaMalha } from '../../autoria/vincos-da-malha.js';

/**
 * `{ lataria, vincos, porque }`: as partes que são a chapa, ou null quando a peça não é de lataria; os vincos como
 * `{ pontas: [[idA, idB], ...], nomes }`; e de onde veio a decisão da lataria. `neutro` é o estado neutro da receita como ela saiu,
 * com a procedência dos passos. Sem receita, nem lataria nem vincos.
 */
export function fonteDaCurvatura(receita, neutro) {
  const vazios = { pontas: [], nomes: [] };
  if (!receita) return { lataria: null, vincos: vazios, porque: 'a peça chegou sem a receita' };
  let vincos = vazios;
  try {
    const lista = vincosDaMalha(receita, { entrada: entradaDaReceita(receita), neutro }, { comIds: true });
    vincos = { pontas: lista.flatMap((vinco) => vinco.ids), nomes: [...new Set(lista.map((vinco) => String(vinco.nome)))].sort() };
  } catch {
    /* a receita de composições pede o registro delas, que a bancada não passa: fica sem vincos */
    vincos = vazios;
  }
  let plano = null;
  try { plano = normalizarPlanoDeModelagem(receita.PLANO); } catch { plano = null; }
  const decidida = latariaDaReceita(receita, plano);
  const partes = decidida.lataria ? (decidida.partes ?? partesDaLataria(neutro)) : [];
  return { lataria: partes.length ? partes : null, vincos, porque: decidida.porque };
}
