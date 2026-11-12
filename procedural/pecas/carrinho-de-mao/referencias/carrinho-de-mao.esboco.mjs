/* carrinho-de-mao.esboco.mjs: o rascunho do carrinho de mão de obra inteiro, de uma roda, pelas referências da pessoa (2026-11-11):
 * o chassi num tubo só dobrado (o laço em U que contorna a roda por diante, as rampas, os braços sob a caçamba, a subida e as manoplas
 * com punho de borracha), os mancais e o eixo sob o laço, os pés em V de tubo mais fino com as duas travessas de chapa chata, a caçamba
 * de chapa estampada com a borda virada e os dois tirantes da frente, e a roda. A pessoa aprovou esta forma por imagem em 2026-11-11
 * ("Sim a forma esta boa"), na escala do pneu de 340 mm.
 *
 * TUDO MORA NAS RECEITAS DAS ETAPAS (2026-11-11): o chassi em `../partes/chassi/receita.js` (`montarChassi`), os pés em
 * `../partes/pes/receita.js` (`montarPes`), a caçamba em `../partes/cacamba/receita.js` (`montarCacamba`) e a roda em
 * `../partes/roda/receita.js` (`montarRoda`, pela família `roda-pneu`); este módulo só as chama sobre um estado só, em mm, e declara
 * os contatos do conjunto. As medidas e o de onde vem cada uma estão na TABELA de cada receita e no `../ALINHAMENTO.md`.
 *
 * Eixos: x lateral, y altura com o chão em 0, z comprimento com a frente (a roda) em +z; o eixo da roda em z 0. Tudo em mm. As cores
 * são uma por parte, para a conferência; no objeto real a caçamba, o chassi e os pés têm a mesma pintura.
 *
 * `npm run esboco:nucleo -- <este arquivo> --so-montar` dá a caixa e o relato de contatos. */
import { montarChassi } from '../partes/chassi/receita.js';
import { montarPes } from '../partes/pes/receita.js';
import { montarCacamba } from '../partes/cacamba/receita.js';
import { montarRoda } from '../partes/roda/receita.js';

const estado = { passos: [], topo: {}, origem: 0 };
montarCacamba(estado);
montarChassi(estado);
montarPes(estado);
montarRoda(estado);

const par = (a, b, relacao, motivo) => ({ par: [a, b], relacao, motivo });
export const CONTATOS = [
  par('borda', 'cacamba', 'atravessa', 'a borda virada é a mesma chapa: o tubo da borda abraça a beira da boca'),
  par('cacamba', 'tirantes', 'folga', 'a ponta de cima dos tirantes segue a face de fora da caçamba 0,3 mm abaixo dela (o parafuso fica fora do modelo)'),
  par('chassi', 'tirantes', 'atravessa', 'a ponta de baixo dos tirantes é presa no tubo do laço'),
  par('cacamba', 'chassi', 'folga', 'o fundo da caçamba assenta nos braços, 2,5 mm acima da face de cima deles (com 0,5 mm o relato dava travessia que a malha não tem; o parafuso fica fora do modelo)'),
  par('chassi', 'manoplas', 'atravessa', 'o punho veste a ponta do tubo'),
  par('chassi', 'mancais', 'atravessa', 'os mancais são presos sob o tubo do laço'),
  par('eixo', 'mancais', 'atravessa', 'o eixo passa pelos mancais'),
  par('chassi', 'pes', 'atravessa', 'as pontas de cima dos pés entram na braçadeira sob o braço (no eixo do tubo)'),
  par('pes', 'travessas', 'atravessa', 'as travessas de chapa são presas nas pernas, de lado a lado'),
  par('chassi', 'travessas', 'encosta', 'a face de cima das travessas assenta na de baixo dos braços (y 250)'),
  par('aro', 'pneu', 'encosta', 'o talão do pneu assenta no barril do aro'),
  par('aro', 'disco', 'atravessa', 'a borda de fora do disco entra até o meio da parede do aro'),
  par('cubo', 'disco', 'atravessa', 'a borda de dentro do disco entra até o meio da parede do cubo'),
  par('cubo', 'eixo', 'folga', 'o cubo gira no eixo, com 4 mm de folga no raio (o rolamento)'),
];

export default {
  plano: 'O carrinho de mão de obra inteiro em rascunho, pelas referências da pessoa: chassi num tubo só com o laço em volta da roda, pés em V com travessas, caçamba com borda virada e tirantes, roda e eixo.',
  vista: 'direita',
  opcoes: [{
    titulo: 'carrinho de mão de obra',
    nota: 'rascunho pelas referências da pessoa, na escala do pneu; as peças saem das receitas das etapas',
    passos: estado.passos,
    topo: estado.topo,
    contatos: CONTATOS,
  }],
};
