/* cabo-de-pa-bambu.js — cabo de pá em colmo de bambu.
 *
 * POR QUE ESTA PEÇA EXISTE, e a razão não é geométrica. Ela é o primeiro objeto
 * modelado aqui a serviço de um ESTUDO: o piloto do laboratório concluiu que o
 * colmo de bambu bate o eucalipto em massa, custo, rigidez e tempo de secagem, e
 * a conclusão precisava virar forma para alguém julgar com os olhos. É a
 * Mecanifica como instrumento do laboratório — o papel que o dossiê descreve e
 * que até aqui nenhuma peça tinha exercido.
 *
 * O QUE A GEOMETRIA PRECISA DIZER, e cada item veio do estudo:
 *
 *   - O COLMO É OCO. Não é detalhe de acabamento: é a razão de o cabo ser mais
 *     leve E mais rígido que o maciço, porque o tubo põe material longe do
 *     centro, onde ele trabalha. Uma maquete sólida mentiria sobre o resultado.
 *   - OS NÓS SÃO ANÉIS SALIENTES, e não enfeite. É neles que o corte deve cair:
 *     o nó é um diafragma que fecha o tubo e trava as fibras, e extremidade
 *     livre sem nó é onde a rachadura começa. A peça põe um nó em cada ponta de
 *     propósito.
 *   - O DIÂMETRO É UMA FAIXA. O estudo achou 43 combinações entre 35 e 45 mm que
 *     servem; `PARAMS` traz a recomendada e as vizinhas existem trocando dois
 *     números, porque o projeto se ajusta ao que o fornecedor tem.
 *
 * COMO O OCO É CONSTRUÍDO, e o que isso custa. Duas superfícies de `loft`: a
 * externa e a do furo. O motor não tem operação de casca nem tampa de anel, e
 * inventar uma para uma peça só seria maquinaria fora de hora.
 *
 * A CONSEQUÊNCIA, dita porque ela aparece em qualquer vista de corte: as duas
 * superfícies NÃO são costuradas nas extremidades, então isto não é um sólido
 * fechado — é a pele externa mais o furo. Serve para julgar forma, proporção e
 * espessura de parede, que é para o que a peça existe. NÃO serve para volume,
 * massa nem exportação para fabricação. Quando servir, a costura entra como
 * operação do motor, e não como remendo nesta receita.
 */

/* Recomendação do estudo: 37 mm externo, parede de 3 mm. A faixa aceita vai de
   35 a 45 mm com parede a partir de 3 mm — trocar estes dois números percorre
   toda a janela do fornecedor. */
const P = {
  colmo: {
    comprimento: 1.200,
    diametroExterno: 0.037,
    parede: 0.003,
    lados: 24,
  },
  /* Entrenó de 40 a 50 cm é o de Bambusa tuldoides, que é a espécie da faixa de
     diâmetro deste cabo. Quatro nós em 1,2 m dão entrenó de 40 cm, e há um em
     cada extremidade de propósito: é onde o corte deve cair. */
  nos: { quantidade: 4, saliencia: 0.0018, largura: 0.013 },
};

const C = P.colmo;
const Re = C.diametroExterno / 2;
const Ri = Re - C.parede;

/* Perfil do colmo: raio constante, com um anel um pouco mais gordo em cada nó.
   O nó real também é mais espesso por dentro; aqui a parede é mantida constante
   porque a diferença não muda nada do que o estudo mediu, e fingir precisão que
   não foi medida seria pior que a simplificação declarada. */
function perfil(raioBase) {
  const pontos = [];
  const passo = C.comprimento / (P.nos.quantidade - 1);
  for (let i = 0; i < P.nos.quantidade; i += 1) {
    const y = Math.min(C.comprimento, Math.max(0, passo * i));
    const meia = P.nos.largura / 2;
    if (i > 0) pontos.push({ y: y - meia * 2.2, r: raioBase });
    pontos.push({ y: Math.max(0, y - meia), r: raioBase + P.nos.saliencia * 0.55 });
    pontos.push({ y, r: raioBase + P.nos.saliencia });
    pontos.push({ y: Math.min(C.comprimento, y + meia), r: raioBase + P.nos.saliencia * 0.55 });
    if (i < P.nos.quantidade - 1) pontos.push({ y: y + meia * 2.2, r: raioBase });
  }
  return pontos
    .filter((p) => p.y >= 0 && p.y <= C.comprimento)
    .sort((a, b) => a.y - b.y)
    .filter((p, i, todos) => i === 0 || p.y - todos[i - 1].y > 1e-6)
    .map((p) => ({ pos: [0, p.y, 0], raio: p.r }));
}

export const receitaCaboDePaBambu = {
  meta: { nome: 'Cabo de Pá em Bambu', versao: '1.0.0', autor: 'Mecanifica Procedural AI' },

  PARAMS: P,

  TOPO: {
    ocoNaoEAcabamento: 'o vazio é a razão de o cabo ser mais leve e mais rígido que o maciço',
    noNaPonta: 'cada extremidade cai num nó, que é o diafragma que trava as fibras',
    diametroEFaixa: '35 a 45 mm servem; 37 é a recomendação, não o requisito',
  },

  MATERIAIS: {
    bambu: { cor: '#c9b177', metalicidade: 0.02, aspereza: 0.62 },
    bambuInterno: { cor: '#e6dcc0', metalicidade: 0.02, aspereza: 0.78 },
  },

  PASSOS: [
    ['loft', { origemId: 1, lados: C.lados, orientacao: [1, 0, 0], secoes: perfil(Re) }],
    ['loft', { origemId: 2, lados: C.lados, orientacao: [1, 0, 0], secoes: perfil(Ri) }],
    ['parte', { nome: 'colmo', sel: { origem: { op: 'loft', id: 1 } } }],
    ['parte', { nome: 'furo', sel: { origem: { op: 'loft', id: 2 } } }],
    ['material', { usa: 'bambu', sel: { grupo: 'colmo' } }],
    ['material', { usa: 'bambuInterno', sel: { grupo: 'furo' } }],
  ],
};

export default receitaCaboDePaBambu;
