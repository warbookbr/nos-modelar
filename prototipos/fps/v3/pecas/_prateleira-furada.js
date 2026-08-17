/* PEÇA DE EXEMPLO — NÃO HOMOLOGADA, NÃO É BASE DE PROJETO.
 *
 * Todas as peças de `prototipos/fps/v3/pecas/` são exemplos. Elas existem para
 * exercitar e provar capacidades do núcleo, e nada mais. Nenhuma é referência de
 * engenharia, componente aprovado ou ponto de partida de produto.
 *
 * Medidas e proporções foram escolhidas para fazer uma capacidade passar ou
 * falhar, não para descrever um componente real. Esta geometria pode mudar ou
 * ser removida a qualquer momento, sem aviso e sem migração.
 *
 * O que este repositório sustenta é o núcleo e as capacidades provadas — nunca
 * a geometria daqui. Ver "Peças são exemplos" no README.md.
 */
/* PEÇA DE EXERCÍCIO — a prova NÃO AUTOMOTIVA do ciclo "Corte e orientação de
   seção v1": uma prateleira de parede com furo de parafuso, encaixe de cavilha
   e um puxador redondo vazado. Nenhum eixo, nenhum prisioneiro, nenhum
   vocabulário mecânico: o assunto é marcenaria, de propósito.

   POR QUE ELA EXISTE. A op `furo` nasceu de uma falta automotiva (o cubo do
   freio sem furo de prisioneiro, a roda sem furo de fixação). Um contrato
   desenhado em volta do caso que o originou passa despercebido; só exercitando
   o mesmo contrato em outra família de objeto dá para dizer que ele é geral.
   Aqui os três furos são de móvel, e nenhum deles precisou de uma palavra nova.

   O QUE ELA EXERCITA:

   - furo PASSANTE numa placa (`saida`) — o parafuso que atravessa a tábua de
     cima a baixo, e o furo do puxador, que atravessa um CILINDRO de tampa a
     tampa. A mesma op serve face de cubo e tampa de cilindro;
   - furo CEGO (`profundidade`) — o encaixe de cavilha na testa da tábua, que
     entra e PARA;
   - `orientacao` no furo do parafuso: a fase do anel é declarada pelo autor, em
     vez de herdada do quadro interno. Dois furos com a mesma orientação têm os
     anéis em fase;
   - cada família do corte vira uma PARTE isolável: a borda pertence à TÁBUA (é
     a superfície dela), a parede e o fundo pertencem ao FURO. Nenhuma citação
     usa id de face.

   O ATRITO QUE ELA MEDIU, E NÃO CONTORNOU EM SILÊNCIO (ATRITOS-AUTORIA A-26):
   depois do primeiro furo, a face de entrada deixa de existir — então a citação
   `{op:'cubo', id}` ("a primitiva inteira") GRITA, com razão, e um SEGUNDO furo
   na MESMA face é impossível. Um círculo de parafusos numa placa só existe
   hoje se cada furo cair numa face diferente. O conserto que o próprio grito
   recomenda é o que esta peça usa: um ALIAS `unir` juntando as faces que
   sobraram com as origens que o corte publicou.

   Bancada e régua:
     npm run bancada -- _prateleira-furada --vistas=frontal,isometrica,superior
     npm run bancada -- _prateleira-furada --selecionadas=furoDoParafuso --modo=isolar --focar
     npm run descrever -- _prateleira-furada --estrito
*/
import { executar, colisaoDe } from '../motor/oficina.js';

/* Topológicos primeiro: são eles que a peça CONTA. */
export const TOPO = {
  furoLados: 12,
  puxadorLados: 16,
};

/* Medidas independentes, em metros. */
const MEDIDAS = {
  tabuaLargura: 0.600,
  tabuaEspessura: 0.024,      // a altura do cubo: a tábua é deitada
  tabuaProfundidade: 0.200,

  parafusoRaio: 0.0045,
  parafusoX: -0.240,          // perto da ponta esquerda, onde a bucha da parede fica

  cavilhaRaio: 0.0040,
  cavilhaFundura: 0.014,      // entra e PARA: é encaixe, não passagem
  cavilhaX: 0.120,

  puxadorRaio: 0.030,
  puxadorAltura: 0.018,
  puxadorX: 0.220,
  puxadorFuroRaio: 0.006,
};

/* Derivadas: a relação fica escrita, não o número já calculado fora. */
const DERIVADAS = {
  tabuaTestaZ: '= tabuaProfundidade / 2',        // a face da frente, onde a cavilha entra
  cavilhaY: '= tabuaEspessura / 2',              // no meio da espessura da testa
  puxadorBaseY: '= tabuaEspessura',              // apoiado no tampo
  puxadorTopoY: '= tabuaEspessura + puxadorAltura',
};

export const PARAMS = { ...MEDIDAS, ...DERIVADAS };

export const MATERIAIS = {
  madeiraDaTabua: { cor: '#c19a63', aspereza: 0.92 },
  paredeDoFuro: { cor: '#6b5334', aspereza: 0.98 },
  madeiraDoPuxador: { cor: '#8d6234', aspereza: 0.86 },
};

/* Identidades estruturais declaradas pelo autor. Não são posições de passo. */
const TABUA = 800;
const FURO_PARAFUSO = 801;
const FURO_CAVILHA = 802;
const PUXADOR = 810;
const FURO_PUXADOR = 811;

const ORIGEM_TABUA = { op: 'cubo', id: TABUA };
const ORIGEM_PARAFUSO = { op: 'furo', id: FURO_PARAFUSO };
const ORIGEM_CAVILHA = { op: 'furo', id: FURO_CAVILHA };
const ORIGEM_PUXADOR = { op: 'cilindro', id: PUXADOR };
const ORIGEM_FURO_PUXADOR = { op: 'furo', id: FURO_PUXADOR };

/* "TODOS os índices deste eixo". Um eixo AUSENTE (ou `null`) não diz isso: numa
   origem sem eixo nenhum ele significa "a primitiva inteira", e foi assim que a
   primeira versão desta peça pediu a borda e recebeu o furo todo — as partes se
   sobrepuseram e o núcleo gritou 106 vezes, como deve. O filtro de progressão de
   passo 1 é a identidade documentada do eixo, e é ele que diz "esta família
   inteira, e só ela". */
const TODOS = { passo: 1, fase: 0 };

/* Os aliases são a resposta ao atrito acima, e vêm do conserto que o próprio
   diagnóstico do núcleo recomenda: a tábua já não é `{op:'cubo', id}` — três
   faces dela foram consumidas pelos cortes —, então ela é a UNIÃO do que
   sobrou com as BORDAS que os cortes publicaram. A borda é superfície de
   tábua; a parede e o fundo são o furo. */
export const ALIASES = [
  ['tabuaInteira', {
    unir: [
      { origem: { ...ORIGEM_TABUA, face: 'tras' } },
      { origem: { ...ORIGEM_TABUA, face: 'direita' } },
      { origem: { ...ORIGEM_TABUA, face: 'esquerda' } },
      { origem: { ...ORIGEM_PARAFUSO, borda: TODOS } },
      { origem: { ...ORIGEM_PARAFUSO, saida: TODOS } },
      { origem: { ...ORIGEM_CAVILHA, borda: TODOS } },
    ],
  }],
  ['paredeDoParafuso', { origem: { ...ORIGEM_PARAFUSO, parede: TODOS } }],
  ['bolsaDaCavilha', {
    unir: [
      { origem: { ...ORIGEM_CAVILHA, parede: TODOS } },
      { origem: { ...ORIGEM_CAVILHA, tampa: 'fundo' } },
    ],
  }],
  ['puxadorInteiro', {
    unir: [
      { origem: ORIGEM_PUXADOR },                              // as laterais do cilindro
      { origem: { ...ORIGEM_FURO_PUXADOR, borda: TODOS } },
      { origem: { ...ORIGEM_FURO_PUXADOR, saida: TODOS } },
    ],
  }],
  ['paredeDoPuxador', { origem: { ...ORIGEM_FURO_PUXADOR, parede: TODOS } }],
];

export const PASSOS = [
  /* A tábua deitada: 60 cm de vão, 2,4 cm de espessura. */
  ['cubo', {
    origemId: TABUA,
    larg: 'tabuaLargura',
    alt: 'tabuaEspessura',
    prof: 'tabuaProfundidade',
  }],

  /* O furo do parafuso: entra pelo tampo e SAI por baixo. `orientacao` declara
     para onde aponta o vértice 0 do anel — a mesma chave e a mesma regra do
     `loft` deste ciclo. */
  ['furo', {
    origemId: FURO_PARAFUSO,
    de: { ...ORIGEM_TABUA, face: 'topo' },
    saida: { ...ORIGEM_TABUA, face: 'fundo' },
    centro: ['parafusoX', 0, 0],
    raio: 'parafusoRaio',
    lados: 'furoLados',
    orientacao: [1, 0, 0],
  }],

  /* O encaixe de cavilha na testa: entra e PARA. É a mesma op, outra palavra. */
  ['furo', {
    origemId: FURO_CAVILHA,
    de: { ...ORIGEM_TABUA, face: 'frente' },
    profundidade: 'cavilhaFundura',
    centro: ['cavilhaX', 'cavilhaY', 'tabuaTestaZ'],
    raio: 'cavilhaRaio',
    lados: 'furoLados',
  }],

  /* O puxador redondo, vazado de tampa a tampa: a MESMA op numa primitiva de
     topologia diferente. Aqui a face cortada é a tampa de um cilindro, não a
     face de um cubo, e a borda continua saindo com `furoLados` faces. */
  ['cilindro', {
    origemId: PUXADOR,
    raio: 'puxadorRaio',
    altura: 'puxadorAltura',
    lados: 'puxadorLados',
  }],
  ['transladar', { d: ['puxadorX', 'puxadorBaseY', 0], sel: { origem: { ...ORIGEM_PUXADOR, tampa: 'fundo' } } }],
  ['transladar', { d: ['puxadorX', 'puxadorBaseY', 0], sel: { origem: { ...ORIGEM_PUXADOR, tampa: 'topo' } } }],
  ['furo', {
    origemId: FURO_PUXADOR,
    de: { ...ORIGEM_PUXADOR, tampa: 'topo' },
    saida: { ...ORIGEM_PUXADOR, tampa: 'fundo' },
    centro: ['puxadorX', 'puxadorTopoY', 0],
    raio: 'puxadorFuroRaio',
    lados: 'furoLados',
    orientacao: [1, 0, 0],
  }],

  /* Cada parte é citada por identidade, nunca por id de face. */
  ['parte', { nome: 'tabuaDaPrateleira', sel: { alias: 'tabuaInteira' } }],
  ['parte', { nome: 'furoDoParafuso', sel: { alias: 'paredeDoParafuso' } }],
  ['parte', { nome: 'furoDaCavilha', sel: { alias: 'bolsaDaCavilha' } }],
  ['parte', { nome: 'puxadorRedondo', sel: { alias: 'puxadorInteiro' } }],
  ['parte', { nome: 'furoDoPuxador', sel: { alias: 'paredeDoPuxador' } }],

  /* As portas que esta peça publica para quem for montá-la num conjunto. */
  ['publicarPorta', { nome: 'bocaDoParafuso', de: { ...ORIGEM_PARAFUSO, borda: TODOS } }],
  ['publicarPorta', { nome: 'fundoDaCavilha', de: { ...ORIGEM_CAVILHA, tampa: 'fundo' } }],
  ['publicarPorta', { nome: 'vaoDoPuxador', de: { ...ORIGEM_FURO_PUXADOR, parede: TODOS } }],

  ['material', { sel: { grupo: 'tabuaDaPrateleira' }, usa: 'madeiraDaTabua' }],
  ['material', { sel: { grupo: 'furoDoParafuso' }, usa: 'paredeDoFuro' }],
  ['material', { sel: { grupo: 'furoDaCavilha' }, usa: 'paredeDoFuro' }],
  ['material', { sel: { grupo: 'puxadorRedondo' }, usa: 'madeiraDoPuxador' }],
  ['material', { sel: { grupo: 'furoDoPuxador' }, usa: 'paredeDoFuro' }],

  ['solido', { sel: { grupo: 'tabuaDaPrateleira' } }],
  ['solido', { sel: { grupo: 'puxadorRedondo' } }],
];

export const meta = {
  /* DECLARAÇÃO DE CASCA FECHADA. A peça afirma que a superfície dela não tem
     borda solta — toda aresta é dividida por exatamente duas faces. Quem
     declara é cobrado pelo gate do acervo; quem não declara não é. Casca
     aberta é escolha legítima (uma chapa, um anteparo), e 6 peças do acervo
     são assim de propósito. Buraco NÃO abre casca: furo passante tem parede. */
  fechada: true,
  nome: '_prateleira-furada',
  tipo: 'objeto',
  desc: 'peça de exercício — prateleira de parede com furo de parafuso passante, encaixe de cavilha cego e puxador redondo vazado, cada furo endereçável por família',
  colisao: colisaoDe(PASSOS, PARAMS, TOPO, MATERIAIS, ALIASES),
};

export function construir(ctx) {
  return executar(PASSOS, PARAMS, TOPO, ctx, MATERIAIS, {}, null, ALIASES);
}
