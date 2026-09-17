/* peca-de-prova/receita.js — a peça que as guardas de navegador usam.
 *
 * POR QUE ELA EXISTE. As cinco guardas de navegador foram escritas contra
 * `bicicleta-quadro` e passaram a depender de propriedades que aquela receita
 * tem por acaso: várias partes, vértices que se sobrepõem na tela, ilha grande
 * o bastante para `L` pegar, e juntas para arrastar. Nada disso estava
 * declarado, então mexer na bicicleta quebrava a bateria de gates ou, pior, a
 * deixava verde provando menos do que o texto promete.
 *
 * Aqui as propriedades são o PROJETO da peça, e não herança. Cada número da
 * `TABELA` existe para satisfazer um requisito de
 * `tools/fixtures/requisitos-da-peca-de-prova.js`, e o teste ao lado reprova
 * quando a peça deixa de servir.
 *
 * ELA NÃO É CONTEÚDO. Mora em `tools/fixtures/acervo/` junto das outras
 * receitas de ensaio, fora do acervo publicado, justamente para que trabalho de
 * peça não mexa no que a suíte mede. `guarda:acervo` não a varre.
 *
 * FORMA. Quatro tubos que se encontram em dois cantos, mais um cubo central:
 * é o mínimo que produz três partes, juntas de verdade e ilhas densas, sem
 * carregar a complexidade de um quadro de bicicleta inteiro.
 */

const m = (mm) => mm / 1000;

/* A TABELA EXISTE PARA AS GUARDAS, e cada linha diz qual requisito ela atende.
   Mudar um destes números é mudar o que as guardas conseguem provar, e o teste
   de requisitos reprova antes de a guarda ficar verde por engano. */
export const TABELA = {
  /* Lados de cada tubo. Dezoito põe os vértices próximos o bastante para a
     prova de precisão de clique ter o que disputar na tela. */
  ladosDoTubo: 18,
  /* Comprimento e raio dão à peça tamanho comparável ao de uma peça real, e
     isso é requisito e não estética: o estúdio amplia peça pequena para
     enquadrá-la, e com 400 mm o avanço de 0,2 que as guardas digitam movia a
     seleção 1,16 na cena e a jogava para fora do quadro. Com um metro, a escala
     da cena fica perto de um e as constantes de pixel e de avanço das guardas
     mantêm o significado que tinham. */
  comprimentoDoTubo: 1000,
  /* O raio fica na faixa de um tubo de quadro porque `detectarJuntas` declara
     raio de junta de 20 mm, dimensionado para a solda de um tubo desses. Com
     45 mm o mesmo canto passava a render três juntas fragmentadas, e a guarda
     de junta deixava de ter um punho por canto. */
  raioDoTubo: 22,
  /* O cubo onde três tubos se encontram: é o que cria junta com mais de duas
     partes, que a guarda de junta usa para conferir que só quem passa pelo
     canto se move. */
  raioDoCubo: 28,
  larguraDoCubo: 90,
  /* O tubo deitado tem comprimento PRÓPRIO, e não uma fração do que sobe. Com
     um número só governando os dois, puxar os topos deixava de equivaler a
     alongar os tubos: a ponta do deitado andava junto e o alvo ficava 19,3 mm
     fora. Parâmetro que move mais de uma coisa não serve para provar que um
     gesto cabe numa receita. */
  comprimentoDoDeitado: 950,
  /* Abertura entre os dois tubos que sobem, em grau. Diferente de zero para as
     partes não ficarem coincidentes na projeção lateral. */
  aberturaEmGrau: 28,
};

export function derivar(t = TABELA) {
  const meia = m(t.larguraDoCubo) / 2;
  const comprimento = m(t.comprimentoDoTubo);
  const radianos = (t.aberturaEmGrau * Math.PI) / 180;
  return {
    centro: [0, 0, 0],
    meia,
    /* Os dois tubos que sobem partem do cubo e se afastam em z. */
    topoEsq: [-meia, comprimento * Math.cos(radianos), comprimento * Math.sin(radianos)],
    topoDir: [meia, comprimento * Math.cos(radianos), -comprimento * Math.sin(radianos)],
    /* O tubo que deita, para dar terceira e quarta parte e um segundo canto. */
    frente: [0, m(t.comprimentoDoDeitado) * 0.37, m(t.comprimentoDoDeitado) * 0.93],
  };
}

const ID = { cubo: 10, sobeEsq: 20, sobeDir: 30, deita: 40, travessa: 50 };

/* Um tubo entre dois pontos, com as pontas em raio zero para a costura fechar:
   é a mesma forma que a bicicleta usa, e mantém a peça de prova dentro do
   vocabulário que o motor já aceita. */
function tubo(origemId, de, ate, raio, lados) {
  const direcao = [0, 1, 2].map((i) => ate[i] - de[i]);
  const comprimento = Math.hypot(...direcao);
  const unitario = direcao.map((v) => v / comprimento);
  const alem = (p, k) => p.map((v, i) => v + unitario[i] * m(1) * k);
  return ['loft', {
    origemId,
    secoes: [
      { pos: alem(de, -1), raio: 0 },
      { pos: de, raio: m(raio) },
      { pos: ate, raio: m(raio) },
      { pos: alem(ate, 1), raio: 0 },
    ],
    lados,
  }];
}

export function gerarPassos(t = TABELA) {
  const P = derivar(t);
  const passos = [];
  const parte = (nome, op, id) => passos.push(['parte', { nome, sel: { origem: { op, id } } }]);

  passos.push(['cilindro', {
    origemId: ID.cubo,
    raio: m(t.raioDoCubo),
    altura: m(t.larguraDoCubo),
    lados: t.ladosDoTubo,
    eixo: 'x',
    em: [-P.meia, 0, 0],
  }]);
  passos.push(['parte', { nome: 'cuboCentral', sel: { alias: 'cuboInteiro' } }]);

  passos.push(tubo(ID.sobeEsq, P.centro, P.topoEsq, t.raioDoTubo, t.ladosDoTubo));
  parte('tuboEsquerdo', 'loft', ID.sobeEsq);

  passos.push(tubo(ID.sobeDir, P.centro, P.topoDir, t.raioDoTubo, t.ladosDoTubo));
  parte('tuboDireito', 'loft', ID.sobeDir);

  passos.push(tubo(ID.deita, P.centro, P.frente, t.raioDoTubo, t.ladosDoTubo));
  parte('tuboDeitado', 'loft', ID.deita);

  /* A travessa liga os dois topos e cria o SEGUNDO canto, para a guarda de
     junta ter mais de um punho e poder conferir que arrastar um não move o
     outro. */
  passos.push(tubo(ID.travessa, P.topoEsq, P.topoDir, t.raioDoTubo * 0.8, t.ladosDoTubo));
  parte('travessa', 'loft', ID.travessa);

  return passos;
}

export const ALIASES = [
  ['cuboInteiro', { unir: [
    { origem: { op: 'cilindro', id: ID.cubo } },
    { origem: { op: 'cilindro', id: ID.cubo, tampa: 'fundo' } },
    { origem: { op: 'cilindro', id: ID.cubo, tampa: 'topo' } },
  ] }],
];

export const receitaPecaDeProva = {
  meta: {
    nome: 'Peça de prova das guardas',
    versao: '1.0.0',
    autor: 'Mecanifica',
    desc: 'fixture das guardas de navegador; não é conteúdo do acervo',
  },
  PARAMS: TABELA,
  ALIASES,
  ORIGENS: {
    ladosDoTubo: 'requisito das guardas: põe vértices próximos na tela para a prova de precisão de clique',
    comprimentoDoTubo: 'requisito das guardas: tamanho comparável ao de peça real, para o enquadramento não virar caso especial',
    comprimentoDoDeitado: 'requisito das guardas: cada número move uma coisa só, para um gesto de junta poder equivaler a um parâmetro',
    raioDoTubo: 'requisito das guardas: secção que mantém os vértices do anel disputando o mesmo lugar na projeção',
    raioDoCubo: 'requisito das guardas: encontro de três tubos, para haver junta com mais de duas partes',
    larguraDoCubo: 'requisito das guardas: largura que separa os tubos em x sem desfazer o encontro',
    aberturaEmGrau: 'requisito das guardas: separa as partes na projeção lateral, senão elas coincidem na tela',
  },
  PLANO: {
    objeto: 'peça de prova das guardas de navegador',
    referencias: [
      'referencias/prova.png',
      /* A silhueta desenhada a partir da própria malha, e as âncoras dela: é o
         objeto da régua de conferência contra referência, que sem isto teria de
         medir uma foto de peça do acervo. */
      'referencias/silhueta-lateral.png',
      'referencias/ancoras-silhueta.json',
    ],
    escala: { medida: 'comprimento do tubo que sobe', milimetros: 1000 },
    partes: [
      { nome: 'cuboCentral', forma: 'cilindro curto transversal onde três tubos se encontram', tecnica: 'cilindro com tampas' },
      { nome: 'tuboEsquerdo', forma: 'tubo que sobe do cubo e se afasta em z', tecnica: 'loft' },
      { nome: 'tuboDireito', forma: 'tubo que sobe do cubo e se afasta em z para o outro lado', tecnica: 'loft' },
      { nome: 'tuboDeitado', forma: 'tubo que sai do cubo para a frente', tecnica: 'loft' },
      { nome: 'travessa', forma: 'tubo mais fino ligando os dois topos', tecnica: 'loft' },
    ],
    /* O que reprova esta peça é ela deixar de servir às guardas, e não
       proporção ou caráter: ela não tem referência visual a imitar. */
    criteriosDeReprovacao: [
      'menos de tres partes, porque a guarda afirma que as OUTRAS ficam paradas',
      'sem vertices disputando o mesmo lugar na tela, e a prova de clique deixa de valer',
      'ilha conectada pequena demais para o L ter o que pegar',
      'sem junta entre partes, e a guarda de junta fica sem canto para arrastar',
      'sem referencia visual declarada, e a guarda de referencia fica sem objeto',
    ],
  },

  /* OS CONTATOS FICAM FORA DO PLANO, e não dentro dele: o esquema do plano de
     modelagem recusa a chave ali, porque `contatos-da-peca` já lê e cobra esta
     lista na raiz da receita, e duas listas em dois lugares divergem. */
  contatos: [
    { par: ['cuboCentral', 'tuboEsquerdo'], motivo: 'o tubo nasce na superficie do cubo' },
    { par: ['cuboCentral', 'tuboDireito'], motivo: 'o tubo nasce na superficie do cubo' },
    { par: ['cuboCentral', 'tuboDeitado'], motivo: 'o tubo nasce na superficie do cubo' },
    { par: ['tuboEsquerdo', 'travessa'], motivo: 'a travessa encosta no topo do tubo' },
    { par: ['tuboDireito', 'travessa'], motivo: 'a travessa encosta no topo do tubo' },
  ],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receitaPecaDeProva;
