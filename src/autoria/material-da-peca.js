/* material-da-peca.js — tudo que pertence a uma peça, e onde está hoje.
 *
 * A pergunta que este módulo responde é a que ninguém conseguia responder sem
 * procurar: se eu vou mexer nesta peça, quais arquivos são dela? Para a
 * bicicleta a resposta são seis caminhos em quatro árvores do repositório —
 * receita, recortes de referência, folha de origem, sobreposição da bancada,
 * atritos medidos e rodadas do laço —, e nenhum documento diz que eles
 * pertencem à mesma coisa. Quem chega descobre de novo a cada sessão.
 *
 * O módulo NÃO arruma nada. Ele mede, e a medida é o que a arrumação vai
 * derrubar: hoje seis caminhos, no fim um. Sem o número de antes, "ficou mais
 * organizado" seria opinião.
 *
 * A BUSCA É POR DECLARAÇÃO, e não por adivinhação de nome. A receita declara as
 * referências no `PLANO`, e é isso que se lê. Procurar arquivo cujo nome parece
 * com o da peça acharia `bicicleta-29-vistas-geradas.png` e também qualquer
 * coisa que alguém batizasse parecido, sem saber se pertence. Declaração é
 * contrato; semelhança de nome é palpite. O que este módulo procura por nome é
 * apenas o que a peça ainda NÃO declara, e isso sai marcado como tal. */

import { normalizarPlanoDeModelagem } from './plano-de-modelagem.js';

export const FORMATO_MATERIAL = 'mecanifica.material-da-peca';
export const VERSAO_MATERIAL = 1;

/* Os papéis que um arquivo pode ter na vida de uma peça. Fechado: papel novo
   entra nomeado, não como texto livre. */
export const PAPEIS = Object.freeze([
  'receita', 'referencia', 'sobreposicao', 'rodada', 'atrito', 'ferramenta',
]);

function arvoreDe(caminho) {
  const [primeira, segunda] = caminho.split('/');
  return primeira === 'docs' || primeira === 'prototipos' ? `${primeira}/${segunda}` : primeira;
}

/**
 * Monta o material de uma peça a partir do que ela declara e do que os
 * catálogos externos informam. Nada aqui toca disco: quem lê arquivo é o
 * comando, para que a medida possa ser escrita em teste sem repositório.
 */
export function materialDaPeca({ peca, caminhoReceita, receita, extras = [] } = {}) {
  if (typeof peca !== 'string' || peca.trim() === '') {
    throw new TypeError('material da peça: diga de que peça é.');
  }
  if (typeof caminhoReceita !== 'string' || caminhoReceita.trim() === '') {
    throw new TypeError('material da peça: o caminho da receita é obrigatório.');
  }

  const itens = [{ papel: 'receita', caminho: caminhoReceita.trim(), declarado: true }];

  const plano = normalizarPlanoDeModelagem(receita?.PLANO);
  for (const referencia of plano?.referencias ?? []) {
    itens.push({ papel: 'referencia', caminho: referencia, declarado: true });
  }

  for (const extra of extras) {
    if (!PAPEIS.includes(extra?.papel)) {
      throw new Error(`material da peça: papel '${extra?.papel}' não existe; use ${PAPEIS.join(', ')}.`);
    }
    if (typeof extra.caminho !== 'string' || extra.caminho.trim() === '') {
      throw new Error(`material da peça: item de papel '${extra.papel}' sem caminho.`);
    }
    itens.push({ papel: extra.papel, caminho: extra.caminho.trim(), declarado: Boolean(extra.declarado) });
  }

  const vistos = new Set();
  const material = itens.filter(({ caminho }) => !vistos.has(caminho) && vistos.add(caminho));
  const arvores = [...new Set(material.map(({ caminho }) => arvoreDe(caminho)))].sort();

  return {
    formato: FORMATO_MATERIAL,
    versao: VERSAO_MATERIAL,
    peca: peca.trim(),
    material: material.sort((a, b) => a.papel.localeCompare(b.papel) || a.caminho.localeCompare(b.caminho)),
    arvores,
    /* O número que a arrumação precisa derrubar. Espalhamento é a contagem de
       ÁRVORES, e não de arquivos: dez arquivos na mesma pasta não custam nada a
       quem abre a peça; dois arquivos em duas árvores já custam. */
    espalhamento: arvores.length,
    naoDeclarados: material.filter(({ declarado }) => !declarado).length,
  };
}
