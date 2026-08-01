/* PEÇA DE EXERCÍCIO — a prova NÃO AUTOMOTIVA da segunda capacidade do ciclo
   "Corte e orientação de seção v1": `orientacao` no `loft`. Um corrimão de
   escada, de perfil chato, entre dois pilaretes. Nenhum eixo, nenhuma roda,
   nenhum vocabulário mecânico: o assunto é marcenaria de escada, de propósito.

   POR QUE ELA EXISTE. A chave `orientacao` nasceu de um atrito automotivo (o
   raio da roda experimental, que precisou DETECTAR a troca de largura por
   espessura e REMONTAR o contorno em código auxiliar — A-25). Um contrato
   desenhado em volta do caso que o originou passa despercebido; só exercitando
   o mesmo contrato em outra família de objeto dá para dizer que ele é geral.
   Aqui o assunto é a mão de quem sobe a escada, e a chave é a mesma.

   O QUE ELA EXERCITA, e o que se pode MEDIR nela:

   - o caminho tem TORÇÃO: ele começa seguindo +Z, dobra para +X e sobe, e os
     cinco pontos não estão num plano só. É essa torção que separa as duas
     regras — num caminho plano o transporte paralelo dá o mesmo resultado da
     orientação declarada, e um exercício plano provaria nada;
   - a seção é CHATA e não simétrica sob rotação: 60 mm de largura por 24 mm de
     espessura. Numa seção circular a orientação só muda a fase e nada do
     desenho; numa chata ela decide qual face a mão encontra;
   - `orientacao: [0,1,0]` (o prumo) faz o eixo `+u` de TODA seção apontar para
     cima, projetado no plano da própria seção. A consequência mensurável: o
     eixo `w` — o da largura — fica HORIZONTAL em todo o percurso, então as
     duas quinas de uma mesma seção têm o MESMO y. Sem a chave, o frame vem do
     histórico do caminho e o corrimão vai TORCENDO: perto do pilarete de cima
     a mão já não encontra a face plana.
     `tools/mecanifica/corrimao-orientacao.test.ts` afirma as duas coisas, e é
     a afirmação que morre quando a chave sai;
   - `lado` vira endereço estável por causa disso: `{op:'loft', id, lado:3}` é o
     apoio da mão do começo ao fim do corrimão, e é a PORTA que a peça publica.
     Sem orientação declarada, o mesmo `lado:3` passeia pelas quatro faces ao
     longo do caminho — o endereço continuaria resolvendo, e resolvendo para
     outra coisa, que é a classe de erro que este repositório persegue.

   O QUE ELA NÃO FAZ: as duas pontas do corrimão ficam ABERTAS. O `loft` só
   fecha ponta em POLO (`raio: 0`), que num perfil chato viraria bico, e o
   núcleo não tem operação de tampa para contorno. A saída aqui é a mesma da
   marcenaria: a ponta entra dentro do pilarete, e o vazio fica escondido no
   lugar onde ele estaria escondido também na escada de verdade.

   Bancada e régua:
     npm run bancada -- _corrimao --vistas=isometrica,superior,frontal
     npm run bancada -- _corrimao --selecionadas=corrimao --modo=isolar --focar
     npm run descrever -- _corrimao --estrito
*/
import { executar, colisaoDe } from '../motor/oficina.js';

/* Topológico: muda a CONTAGEM de faces, não a medida. `lados: 4` é o retângulo
   do perfil — o `contorno` de cada seção precisa ter exatamente este tanto de
   pontos. */
export const TOPO = {
  corrimaoLados: 4,
  pilareteLados: 16,
};

/* Medidas independentes, em metros. */
const MEDIDAS = {
  corrimaoMeiaEspessura: 0.012,   // metade da espessura, no eixo `u` (o prumo)
  corrimaoMeiaLargura: 0.030,     // metade da largura, no eixo `w` (onde a mão pousa)

  pilareteRaio: 0.048,
  pilareteBaixoAltura: 1.000,
  pilareteAltoAltura: 1.850,

  /* Os cinco pontos do caminho, um nome por coordenada: a linguagem de autoria
     sabe nomear ESCALAR, não PONTO (ATRITOS-AUTORIA A-8). O corrimão sai do
     pilarete de baixo seguindo +Z, dobra para +X subindo, e chega ao pilarete
     de cima. Os cinco NÃO são coplanares — é essa torção que a orientação
     declarada segura. */
  corrimaoP0X: 0.000, corrimaoP0Y: 0.950, corrimaoP0Z: 0.000,
  corrimaoP1X: 0.000, corrimaoP1Y: 0.950, corrimaoP1Z: 0.900,
  corrimaoP2X: 0.350, corrimaoP2Y: 1.100, corrimaoP2Z: 1.350,
  corrimaoP3X: 1.050, corrimaoP3Y: 1.450, corrimaoP3Z: 1.550,
  corrimaoP4X: 1.750, corrimaoP4Y: 1.800, corrimaoP4Z: 1.650,
};

/* Derivadas: a relação fica escrita, não o número já calculado fora. */
const DERIVADAS = {
  corrimaoMeiaEspessuraNeg: '= -corrimaoMeiaEspessura',
  corrimaoMeiaLarguraNeg: '= -corrimaoMeiaLargura',
  // os pilaretes ficam sob as pontas do corrimão, e engolem a seção aberta
  pilareteBaixoX: '= corrimaoP0X',
  pilareteBaixoZ: '= corrimaoP0Z',
  pilareteAltoX: '= corrimaoP4X',
  pilareteAltoZ: '= corrimaoP4Z',
};

export const PARAMS = { ...MEDIDAS, ...DERIVADAS };

export const MATERIAIS = {
  madeiraDoCorrimao: { cor: '#8a5a30', aspereza: 0.68 },
  madeiraDoPilarete: { cor: '#6b4522', aspereza: 0.84 },
};

/* Identidades estruturais declaradas pelo autor. Não são posições de passo. */
const CORRIMAO = 900;
const PILARETE_BAIXO = 901;
const PILARETE_ALTO = 902;

const ORIGEM_CORRIMAO = { op: 'loft', id: CORRIMAO };

/* O perfil chato, escrito UMA vez e usado nas cinco seções. A ordem é
   anti-horária em (u,w) — `+u` é o prumo, por causa da `orientacao` do passo:
     0  topo-direita   1  base-direita   2  base-esquerda   3  topo-esquerda
   e por isso a faixa `lado: 3` (entre o vértice 3 e o 0) é o TOPO, o apoio da
   mão, do começo ao fim do corrimão. */
const PERFIL = [
  ['corrimaoMeiaEspessura', 'corrimaoMeiaLargura'],
  ['corrimaoMeiaEspessuraNeg', 'corrimaoMeiaLargura'],
  ['corrimaoMeiaEspessuraNeg', 'corrimaoMeiaLarguraNeg'],
  ['corrimaoMeiaEspessura', 'corrimaoMeiaLarguraNeg'],
];
const LADO_DO_APOIO = 3;

const secao = (n) => ({ pos: [`corrimaoP${n}X`, `corrimaoP${n}Y`, `corrimaoP${n}Z`], contorno: PERFIL });

const cilindroInteiro = (id) => ({ unir: [
  { origem: { op: 'cilindro', id } },
  { origem: { op: 'cilindro', id, tampa: 'fundo' } },
  { origem: { op: 'cilindro', id, tampa: 'topo' } },
] });

export const ALIASES = [
  ['corrimaoInteiro', { origem: ORIGEM_CORRIMAO }],
  ['apoioDaMao', { origem: { ...ORIGEM_CORRIMAO, lado: LADO_DO_APOIO } }],
  ['pilareteBaixoInteiro', cilindroInteiro(PILARETE_BAIXO)],
  ['pilareteAltoInteiro', cilindroInteiro(PILARETE_ALTO)],
  ['pilaretesInteiros', { unir: [
    ...cilindroInteiro(PILARETE_BAIXO).unir,
    ...cilindroInteiro(PILARETE_ALTO).unir,
  ] }],
];

export const PASSOS = [
  /* O corrimão. `orientacao` é a chave do ciclo: ela declara para onde aponta o
     `+u` de toda seção — aqui o PRUMO —, em vez de deixar o frame vir do
     transporte paralelo, isto é, do histórico do caminho. A referência é
     projetada no plano de cada seção, e nada é propagado de uma para a
     seguinte: duas seções com a mesma tangente saem iguais, em qualquer ponto
     do percurso. */
  ['loft', {
    origemId: CORRIMAO,
    lados: 'corrimaoLados',
    orientacao: [0, 1, 0],
    secoes: [secao(0), secao(1), secao(2), secao(3), secao(4)],
  }],

  /* Os dois pilaretes. Cada um engole uma ponta do corrimão — é o que esconde
     a seção aberta, e é o que a escada de verdade faz. */
  ['cilindro', { origemId: PILARETE_BAIXO, raio: 'pilareteRaio', altura: 'pilareteBaixoAltura', lados: 'pilareteLados' }],
  ['transladar', { d: ['pilareteBaixoX', 0, 'pilareteBaixoZ'], sel: { alias: 'pilareteBaixoInteiro' } }],
  ['cilindro', { origemId: PILARETE_ALTO, raio: 'pilareteRaio', altura: 'pilareteAltoAltura', lados: 'pilareteLados' }],
  ['transladar', { d: ['pilareteAltoX', 0, 'pilareteAltoZ'], sel: { alias: 'pilareteAltoInteiro' } }],

  ['parte', { nome: 'corrimao', sel: { alias: 'corrimaoInteiro' } }],
  ['parte', { nome: 'pilaretes', sel: { alias: 'pilaretesInteiros' } }],

  /* A porta que esta peça publica: a faixa em que a mão pousa. Ela só é um
     endereço ESTÁVEL porque a orientação da seção é declarada — sem isso,
     `lado:3` passeia pelas quatro faces ao longo do caminho. */
  ['publicarPorta', { nome: 'apoioDaMao', de: { ...ORIGEM_CORRIMAO, lado: LADO_DO_APOIO } }],

  ['liso', { sel: { alias: 'pilaretesInteiros' } }],

  ['material', { sel: { grupo: 'corrimao' }, usa: 'madeiraDoCorrimao' }],
  ['material', { sel: { grupo: 'pilaretes' }, usa: 'madeiraDoPilarete' }],

  ['solido', { sel: { grupo: 'corrimao' } }],
  ['solido', { sel: { grupo: 'pilaretes' } }],
];

export const meta = {
  nome: '_corrimao',
  tipo: 'objeto',
  desc: 'peça de exercício — corrimão de escada de perfil chato num caminho com torção, com a orientação da seção declarada pelo autor, entre dois pilaretes',
  colisao: colisaoDe(PASSOS, PARAMS, TOPO, MATERIAIS, ALIASES),
};

export function construir(ctx) {
  return executar(PASSOS, PARAMS, TOPO, ctx, MATERIAIS, {}, null, ALIASES);
}
