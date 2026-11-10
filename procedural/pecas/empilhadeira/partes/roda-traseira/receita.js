/* empilhadeira/roda-traseira — a roda traseira direcional da empilhadeira pela família `roda-pneu`: o pneu pneumático industrial de
 * Ø 568 e banda de 208 mm no aro de 9 polegadas (talão em Ø 240), com a roda de chapa de aço de seis furos. Uma receita, duas
 * instâncias na montagem (a esquerda e a direita, esta girada meia volta), como a dianteira.
 *
 * Etapa da montagem `../../montagem.json` depois do eixo traseiro (fatia 3 do plano `docs/modelar/planos/2026-11-09-empilhadeira.md`,
 * item 2 das partes do `../../ALINHAMENTO.md`). O rascunho aprovado pela pessoa em 2026-11-10 (`../../referencias/eixos-rodas.esboco.mjs`)
 * desenhava a roda à mão, com a mesma seção de pneu da dianteira levada ao raio dela; ela passa a sair da família pela mesma cadeia da
 * roda dianteira (`../roda-dianteira/receita.js`: `derivar`, `gerarPassos` e `montarRodaDianteira`, que recebem a TABELA), e o
 * rascunho chama `montarRodaTraseira` daqui.
 *
 * DE ONDE VEM CADA MEDIDA. O diâmetro e a banda do pneu são os de `rodas.traseira` da carcaça, que corta os poços por eles (Ø 568,
 * de 445 a 653 mm do centro da máquina). O aro de 9 polegadas (raio do talão de 120 mm) e o barril de 18 mm são os do rascunho; o
 * barril tem 192 mm de largura, 8 mm de cada lado para dentro da banda, como na dianteira. O cubo da roda assenta, pela face de dentro,
 * na face de fora do flange do cubo do eixo traseiro (Ø 170, a 550 mm); ele tem Ø 140, o maior que a família aceita num aro de Ø 240
 * com 18 mm de parede (`cubo-cabe-no-aro`), e o furo de Ø 106 por onde passa a tampa de Ø 100 do eixo, que vai até 625 mm e fica dentro
 * do aro. Os seis furos de Ø 6 no círculo de 115,5 são de caráter, no que cabe entre o furo central e a borda de dentro da chapa do
 * disco: a chapa entra até o meio da parede do cubo, no raio de 61,5 mm, e com os furos de Ø 10 no círculo de 124 (rodada 1) ela tapava
 * de 61,5 a 67 mm de cada furo; agora o furo vai de 54,75 a 60,75 mm e passa livre, a 0,75 mm da chapa e a 1,75 mm do furo central. O assento da roda
 * (a distância da face de dentro do cubo ao plano do meio do pneu, para dentro) é 445 + 208/2 - 550 = -1 mm: a face do flange fica
 * 1 mm por fora do meio do pneu, e o disco de 15 mm sai do meio do cubo, de 8,5 a 23,5 mm por fora do meio do pneu (o rascunho o punha de
 * 1 a 16). O ombro é o da dianteira, a curva do ombro largo da família com 62 mm na largura (a até 3,0 mm da seção do rascunho
 * levada a este raio), que é também quase o máximo que a banda de 208 aceita (30%, 62,4 mm: `ombro-cabe-na-banda`), e o pneu tem 192
 * lados, como o da dianteira.
 *
 * A cadeia: a TABELA em mm; `derivar` da dianteira leva as medidas aos parâmetros da família e a chama com o id desta roda;
 * `gerarPassos` expande a chamada, que já sai em metro, e acrescenta o sombreamento de cada parte. `montarRodaTraseira` escreve a mesma
 * roda em mm no estado da máquina inteira, para o rascunho. */
import { TABELA as CARCACA } from '../carcaca/receita.js';
import { TABELA as EIXO } from '../eixo-traseiro/receita.js';
import { MATERIAIS, PARTES, derivar as derivarDaRoda, gerarPassos as gerarPassosDaRoda, montarRodaDianteira } from '../roda-dianteira/receita.js';

const RODA = CARCACA.rodas.traseira;
const ID = 'roda-traseira';

export const TABELA = {
  /* o pneu: o diâmetro e a banda da carcaça */
  diametroDoPneu: 2 * RODA.raio,
  banda: RODA.banda,
  /* o aro de 9 polegadas: o talão em Ø 240, o barril de 18 mm de parede e 192 mm de largura (8 mm de cada lado para dentro da banda) */
  diametroDoAro: 240,
  larguraDoAro: RODA.banda - 16,
  paredeDoAro: 18,
  /* a roda de chapa: o disco de 15 mm, o cubo de Ø 140 e 30 mm com o furo de Ø 106 e seis furos de Ø 6 no círculo de 115,5, por
     dentro da borda de dentro da chapa (61,5 mm), para os furos passarem de lado a lado à vista */
  disco: 15,
  diametroDoCubo: 140,
  larguraDoCubo: 30,
  furoCentral: 106,
  furos: 6,
  circuloDosFuros: 115.5,
  diametroDoFuro: 6,
  /* o assento da roda: a face de dentro do cubo fica a esta distância do plano do meio do pneu, para dentro (negativo: por fora) */
  assento: RODA.xDentro + RODA.banda / 2 - EIXO.cubo.face,
  /* a forma do pneu: o ombro largo em curva, de 62 mm na largura (o do rascunho, o mesmo da dianteira), e 192 lados */
  ombroRedondo: 1,
  ombro: 62,
  ladosDoPneu: 192,
  /* o sombreamento suave, com a quina acima deste ângulo nítida (o do eixo e da carcaça) */
  anguloDoLiso: 35,
};

export { MATERIAIS, PARTES };

/** A chamada da família `roda-pneu` com as medidas da TABELA. */
export const derivar = (T = TABELA) => derivarDaRoda(T, ID);

/** Os PASSOS, em metro: a roda da família e o sombreamento de cada parte. */
export const gerarPassos = (T = TABELA) => gerarPassosDaRoda(T, ID);

/** Monta uma roda traseira no estado { passos, topo, origem } da máquina inteira, em mm (ver `montarRodaDianteira`). */
export const montarRodaTraseira = (estado, opcoes, T = TABELA) => montarRodaDianteira(estado, opcoes, T, ID);

/* Os pares que a família põe em contato por desenho. */
export const CONTATOS = [
  { par: ['aro', 'pneu'], motivo: 'o talão do pneu assenta no barril do aro, no raio de 120 mm' },
  { par: ['aro', 'disco'], motivo: 'a borda de fora do disco entra até o meio da parede do aro' },
  { par: ['cubo', 'disco'], motivo: 'a borda de dentro do disco entra até o meio da parede do cubo' },
];

const receita = {
  meta: { nome: 'empilhadeira/roda-traseira', desc: 'roda traseira da empilhadeira pela família roda-pneu: pneu pneumático de Ø 568 e banda de 208 no aro de 9 polegadas, roda de chapa de seis furos' },
  PARAMS: TABELA,
  MATERIAIS,
  TOPO: { origem: 'centro do pneu; y para cima, o eixo da roda em x, o lado de fora em +x e a frente em +z' },
  PLANO: {
    objeto: 'roda traseira direcional de empilhadeira de contrapeso de 2,5 t: pneu pneumático industrial alto e largo num aro pequeno de aço, presa ao cubo da manga do eixo traseiro, onde gira',
    referencias: ['../../referencias/tras.ia.png', '../../referencias/cima.ia.png', '../../referencias/carcaca-tras.ia.png'],
    escala: { medida: 'diâmetro do pneu traseiro (o raio é a altura do cubo traseiro da carcaça)', milimetros: 568 },
    familiaProcedural: 'roda-pneu',
    partes: [
      { nome: 'pneu', forma: 'pneu preto de Ø 568 e 208 mm de banda, banda lisa, flanco em curva até o bojo e ombro largo em curva de 62 mm até a banda, sem quina, do talão de Ø 240 à banda', tecnica: 'família roda-pneu, banda 0 com ombro redondo e ombro largo: revolução em torno de x, 192 lados' },
      { nome: 'aro', forma: 'barril cinza do aro de 9 polegadas, de 18 mm de parede e 192 mm de largura, que o talão do pneu abraça', tecnica: 'família roda-pneu: revolução em torno de x de um tubo' },
      { nome: 'cubo', forma: 'anel cinza de Ø 140 e 30 mm, com o furo de Ø 106 e seis furos de Ø 6 livres da chapa, cuja face de dentro fica 1 mm por fora do meio do pneu', tecnica: 'família roda-pneu: revolução do anel menos o furo central e os seis furos repetidos em volta do eixo' },
      { nome: 'disco', forma: 'chapa cinza de 15 mm do cubo ao aro, perto do meio do pneu', tecnica: 'família roda-pneu, tipo 0: revolução em torno de x de um anel' },
    ],
    criteriosDeReprovacao: [
      'o pneu fora de Ø 568 por 208 mm de banda, ou o aro grande demais para um pneu industrial alto',
      'a roda fora do chão, ou cruzando o poço do contrapeso ou a lateral da carcaça',
      'a roda fora do eixo do cubo, ou com o cubo dela sem assentar na face do flange do cubo traseiro',
      'a tampa do cubo do eixo sem passar pelo furo do cubo da roda, ou saindo do aro',
      'o ombro do pneu em canto vivo, de bloco, no lugar do arco largo do rascunho',
    ],
  },
  contatos: CONTATOS,
  /* o pneu, o aro e o disco são anéis; o cubo tem o furo central e os seis de fixação */
  formas: { pneu: 'anel', aro: 'anel', disco: 'anel', cubo: { furos: 1 + TABELA.furos } },
  /* Os extremos que a TABELA fixa, em mm: o pneu inteiro e a face de dentro do cubo, onde a roda assenta no flange do eixo. */
  get PONTOS() {
    const T = this.PARAMS; const R = T.diametroDoPneu / 2; const C = T.diametroDoCubo / 2;
    return [
      { nome: 'borda de fora e topo do pneu', parte: 'pneu', medida: 'maximo', em: [T.banda / 2, R, R], toleranciaMm: 0.5 },
      { nome: 'borda de dentro e fundo do pneu', parte: 'pneu', medida: 'minimo', em: [-T.banda / 2, -R, -R], toleranciaMm: 0.5 },
      { nome: 'face de dentro do cubo da roda', parte: 'cubo', medida: 'minimo', em: [-T.assento, -C, -C], toleranciaMm: 0.5 },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
