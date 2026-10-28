/* aviao/trens-principais — os dois trens principais do avião de pequeno porte baixados, na pose de pouso: em cada um a perna, o pino
 * do pivô, a coroa, o garfo de dois lados, o eixo, a roda, o compasso e o atuador.
 *
 * Oitava etapa do avião (`../../montagem.json`): o plano está em `../../ALINHAMENTO.md` e as formas vêm da unidade `trens-principais`
 * do esboço aprovado da segunda rodada (`docs/modelar/banco-de-provas/aviao-2026-10-11/esboco-r2/`, o mestre e
 * `aviao-detalhe-trens-principais.esboco.json`). A receita refina o andaime `../../andaime.json` (REFINA).
 *
 * Referencial do acervo e do esboço: Y para cima, chão em y = 0, x para a direita do piloto, a proa para -z e a cauda para +z. Cada
 * forma do lado direito (D) tem a do esquerdo (E) espelhada em x: a receita monta o lado D e o espelha com `espelha` antes de nomear as
 * partes, porque a cópia herda o nome da fonte. A TABELA está em milímetro, no quadro do esboço, e a conversão para metro acontece só
 * em `derivar`. As asas e a fuselagem não publicam porta, e por isso o pivô da perna (o ponto `tpP` do esboço) está na TABELA como o
 * parâmetro do esboço, e não sai de um vínculo de medida nem de um encaixe de porta da montagem v5. A altura do cubo da roda sai do
 * raio do pneu e da folga ao chão, que é zero. O esboço tem um curso de recolhimento (`tpCurso`, de 0 a 84 graus); a receita fica
 * só na pose baixada, em que o curso vale zero.
 *
 * Três pontos da receita se afastam do esboço por decisão da pessoa (2026-10-15, segunda rodada), e cada parte afetada declara o
 * deslocamento ou o alongamento no REFINA.esboco, com o motivo (veja `AFASTADAS`): a roda encosta no chão, em y 0, e o trem desce os 17 mm que o esboço deixa
 * entre o pneu e o chão (a perna fica 17 mm mais comprida e leva a coroa, o garfo, o eixo e a roda); o furo do cubo tem o diâmetro do
 * eixo, e a roda assenta nele; o pino de baixo do compasso desce até a junção da perna com a coroa e entra na face da frente da coroa.
 *
 * Na pose baixada o trem é vertical: a perna, a coroa e o garfo são caixas em y, o eixo e o pino do pivô são cilindros em x e em z, e
 * as quatro hastes inclinadas (os dois braços do compasso e as duas metades do atuador) ficam no plano x y de z constante, de modo que
 * cada uma é um cilindro em y girado em z em torno da ponta `de`. A perna, a coroa e a orelha do atuador são caixas de canto
 * arredondado, extrusões em y de um retângulo de cantos redondos.
 *
 * A roda é a chamada da família `roda-pneu` com o perfil `carro` e os parâmetros do esboço (o diâmetro do pneu, a largura em razão do
 * diâmetro e o desvio zero), menos o furo central do cubo, que tem o diâmetro do eixo (`diametroFuroCentral`), expandida aqui dentro dos PASSOS. A família a gera com o eixo em x e o centro na origem, e o esboço a
 * põe no centro da roda (`tpW`); a receita faz o mesmo com `transladar`. Da expansão ficam as quatro formas dela (o pneu, o aro, o
 * cubo furado e o disco), o material e o sólido; saem a parte, porque a receita nomeia as quatro formas como uma parte só, a roda, e as
 * três portas, que a família publica no quadro local da roda e que a pose deixaria longe da forma (`porta-fora-do-plano`).
 */
import { chamar, criarRegistroDeFamilias } from '../../../../familias/index.js';
import { expandirChamadasDeComposicao } from '../../../../nucleo/composicoes.js';

const ESBOCO = '../../../../../docs/modelar/banco-de-provas/aviao-2026-10-11/esboco-r2/aviao.esboco.json';
const slug = (id) => id.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

/* base do nome -> [forma prometida, técnica], sem o lado */
const BASES = {
  perna: ['perna do trem, do pivô sob a asa para baixo e para fora', 'caixa de canto arredondado do esboço'],
  pinoPivo: ['pino do pivô, onde a perna gira para recolher', 'cilindro entre os pontos do esboço'],
  coroa: ['coroa no pé da perna, onde o garfo se prende', 'caixa do esboço'],
  garfoExt: ['lado de fora do garfo, que segura o eixo da roda', 'caixa do esboço'],
  garfoInt: ['lado de dentro do garfo, que segura o eixo da roda', 'caixa do esboço'],
  eixoRoda: ['eixo da roda, atravessando os dois lados do garfo e o cubo', 'cilindro entre os pontos do esboço'],
  roda: ['roda principal com o pneu, de 593 mm de diâmetro, encostando no chão', 'a roda da família roda-pneu, perfil carro, com os parâmetros do esboço, expandida nos PASSOS'],
  compassoSup: ['braço de cima do compasso', 'cilindro entre os pontos do esboço'],
  compassoInf: ['braço de baixo do compasso', 'cilindro entre os pontos do esboço'],
  pinoCompasso: ['pino do meio do compasso', 'cilindro entre os pontos do esboço'],
  pinoCompassoAlto: ['pino de cima do compasso, na perna', 'cilindro entre os pontos do esboço'],
  pinoCompassoBaixo: ['pino de baixo do compasso, na coroa', 'cilindro entre os pontos do esboço'],
  atuadorCorpo: ['corpo do atuador, mais grosso que a haste', 'cilindro entre os pontos do esboço'],
  atuadorHaste: ['haste do atuador', 'cilindro entre os pontos do esboço'],
  pinoAtuador: ['pino que liga o atuador à perna', 'cilindro entre os pontos do esboço'],
  orelhaAtuador: ['orelha que prende o corpo do atuador à estrutura da asa, dentro dela', 'caixa do esboço'],
};
const LADOS = [['D', 'direito'], ['E', 'esquerdo']];
const NOMES = LADOS.flatMap(([L]) => Object.keys(BASES).map((b) => `${b}Principal${L}`));
const ladoDe = (nome) => (nome.endsWith('D') ? 'direito' : 'esquerdo');
const baseDe = (nome) => nome.replace(/Principal[DE]$/, '');

/* A TABELA, em milímetro e no quadro do esboço, com o lado direito (D). Os nomes entre parênteses são os parâmetros e os pontos da
   unidade `trens-principais` do esboço, na pose baixada (`tpCurso` zero, em que o seno vale 0 e o cosseno vale 1). */
export const TABELA = {
  /* O pivô da perna (`tpX`, `tpPy` e `tpZ`): o ponto em que o pino do pivô corta a perna, dentro do alojamento que a asa recorta. */
  pivo: [1920, 1115, 4522],
  /* A folga entre o pé do pneu e o chão. O esboço deixa 17 mm (o cubo, `tpHub`, a 313,5 do chão com o pneu de raio 296,5); a pessoa
     decidiu que a roda encosta, e a altura do cubo, o centro do eixo e da roda, passa a ser o raio do pneu mais esta folga. */
  folgaDoChao: 0,
  /* A roda, a da família `roda-pneu` no perfil `carro`: `raio` é o raio do pneu (`tpR`, 296,5, de modo que o diâmetro é o 593 do
     esboço), `largura` a do pneu (`tpLargRoda`) e `desvio` o da chapa do disco, zero. `lados` não está aqui: é o da família, 96. */
  roda: { perfil: 'carro', raio: 296.5, largura: 140, desvio: 0 },
  /* A perna é a cinta do esboço entre `tpTopo` e um ponto `sobreARoda` acima do topo do pneu: sobe `acimaDoPivo` além do pivô, desce
     até `sobreARoda` acima da roda, e tem `largura` em x (`tpBlE`) e `espessura` em z (`tpBlC`). `cantos` é o raio do canto
     arredondado, que o esboço não declara na perna e que o PLANO promete. */
  perna: { acimaDoPivo: 40, sobreARoda: 25, largura: 70, espessura: 340, cantos: 6 },
  /* O pino do pivô (`tpPinoA` a `tpPinoB`): cilindro em z de `diametro`, com `meioComprimento` para cada lado do pivô (`tpPinoMeio`). */
  pinoPivo: { diametro: 38, meioComprimento: 215 },
  /* A coroa: caixa de `largura` em x e de `profundidade` em z, fração da espessura da perna (0,58), com `altura` em y e o topo na
     face de baixo da perna; `cantos` é o raio do canto. */
  coroa: { largura: 206, fracaoDaProfundidade: 0.58, altura: 20, cantos: 6 },
  /* O garfo: duas cintas, uma de cada lado do pivô a `afastamento` do centro (`tpB`), de `largura` em x e `espessura` em z. Cada uma
     começa `sobreARoda` acima do topo do pneu, e passa por dentro da coroa, e termina `abaixoDoCubo` abaixo do centro do eixo. */
  garfo: { afastamento: 88, sobreARoda: 33, abaixoDoCubo: 50, largura: 22, espessura: 190 },
  /* O eixo (`tpAe` a `tpAi`): cilindro em x de `diametro`, com `meioComprimento` para cada lado do centro da roda (`tpBe`). */
  eixo: { diametro: 28, meioComprimento: 100 },
  /* O compasso fica na frente da perna, a 185 mm do pivô para -z (`z`, de `tpZLado`). Os pontos de cima e do joelho, como deslocamento
     [em x, em y] do pivô, são `tpCpA` (o alto) e `tpCpJ` (o joelho). O de baixo (`tpCpB`) o esboço põe a 470 mm abaixo do pivô, na quina
     da perna; a pessoa decidiu que o pino de baixo toca a coroa, e por isso o ponto de baixo fica em `baixo.dx` do pivô em x e
     `baixo.acimaDaJuncao` acima da junção da perna com a coroa (6: o pino, de raio 12, desce 6 mm abaixo da junção, dentro da altura da
     coroa, e o resto fica na altura da perna; com o centro na junção a razão com o pino do esboço seria zero). As duas
     hastes são cilindros de `haste` de diâmetro entre eles, e cada pino é um cilindro em z de `pino.diametro` e `pino.comprimento`,
     centrado no ponto. Os pinos de cima e do meio são os do esboço, e o de cima entra na face da frente da perna. O pino de baixo
     começa onde os outros começam e vai até a face da frente da coroa, `penetracaoNaCoroa` para dentro dela. */
  compasso: {
    z: -185, alto: [0, -150], joelho: [-80, -310], baixo: { dx: 0, acimaDaJuncao: 6 }, haste: 16,
    pino: { diametro: 24, comprimento: 56, penetracaoNaCoroa: 8 },
  },
  /* O atuador fica atrás da perna, a 185 mm do pivô para +z (`z`, de `tpZLado`): da orelha `tpJF` (presa à asa) à ponta `tpJA` (o pino na
     perna), como deslocamento [em x, em y] do pivô. O corpo vai da orelha ao ponto que divide o percurso na fração `divisao` (0,5) e
     a haste dali à ponta. A orelha é a caixa de `largura` em x, `altura` em y e `profundidade` em z, de canto `cantos`. */
  atuador: {
    z: 185, orelha: [130, 75], ponta: [0, -330], divisao: 0.5, corpo: 40, haste: 26,
    pino: { diametro: 30, comprimento: 56 },
    caixaDaOrelha: { largura: 44, altura: 50, profundidade: 50, cantos: 8 },
  },
  /* A discretização dos cilindros, em lados, e dos cantos arredondados, em segmentos por quarto de volta. */
  lados: 32,
  segmentosDoCanto: 6,
};

const m = (mm) => mm / 1000;
const mAll = (v) => v.map(m);
const GRAUS = Math.PI / 180;

let registro = null;
const registroDeFamilias = () => { registro ??= criarRegistroDeFamilias(); return registro; };

/* Uma haste entre duas pontas, em mm: o eixo a que ela se alinha e, no caso inclinado, o giro em z, em graus, que leva +y à direção de
   `de` a `para`. Uma extrusão em y gira em z por `atan2(-dx, dy)` (+90 leva +y a -x). A haste inclinada precisa ficar no plano x y. */
function haste(de, para, raio, quem) {
  const d = para.map((v, k) => v - de[k]);
  const comprimento = Math.hypot(...d);
  const alinhada = [0, 1, 2].filter((k) => Math.abs(d[k]) > 1e-9);
  if (alinhada.length === 1) {
    const k = alinhada[0];
    if (d[k] < 0) throw new Error(`${quem}: a haste vai de ${de} a ${para}, e o eixo ${'xyz'[k]} pede ponta inicial menor que a final`);
    return { eixo: 'xyz'[k], em: de, de, para, comprimento, raio };
  }
  if (Math.abs(d[2]) > 1e-9) throw new Error(`${quem}: a haste inclinada precisa ficar num plano de z constante, e vai de ${de} a ${para}`);
  return { eixo: 'y', em: de, de, para, comprimento, raio, giroEmZ: Math.atan2(-d[0], d[1]) / GRAUS };
}

/* O lado direito inteiro, em milímetro: a caixa ou a haste de cada parte, com a posição já resolvida, e o centro e as medidas da roda. */
function medidas(t) {
  const [px, py, pz] = t.pivo;
  const R = t.roda.raio;
  /* a altura do cubo: o pé do pneu fica a `folgaDoChao` do chão */
  const chao = R + t.folgaDoChao;
  const doPivo = ([dx, dy], z) => [px + dx, py + dy, pz + z];

  /* A perna vai de `acimaDoPivo` acima do pivô até `sobreARoda` acima do topo do pneu; a coroa fica sob ela. */
  const pernaTopo = py + t.perna.acimaDoPivo;
  const pernaBase = chao + R + t.perna.sobreARoda;
  const coroaBase = pernaBase - t.coroa.altura;
  const garfoTopo = chao + R + t.garfo.sobreARoda;
  const garfoBase = chao - t.garfo.abaixoDoCubo;
  const caixaDoGarfo = (lado) => ({
    tipo: 'caixa', largura: t.garfo.largura, altura: garfoTopo - garfoBase, profundidade: t.garfo.espessura, em: [px + lado * t.garfo.afastamento, garfoBase, pz],
  });

  const c = t.compasso;
  const alto = doPivo(c.alto, c.z);
  const joelho = doPivo(c.joelho, c.z);
  /* o ponto de baixo fica na junção da perna com a coroa (`pernaBase`), e não no deslocamento do esboço */
  const baixo = [px + c.baixo.dx, pernaBase + c.baixo.acimaDaJuncao, pz + c.z];
  const pinoDoCompasso = (centro) => haste([centro[0], centro[1], centro[2] - c.pino.comprimento / 2], [centro[0], centro[1], centro[2] + c.pino.comprimento / 2], c.pino.diametro / 2, 'pino do compasso');
  /* o pino de baixo vai da mesma ponta da frente dos outros até a face da frente da coroa, e entra nela */
  const faceDaCoroa = pz - (t.coroa.fracaoDaProfundidade * t.perna.espessura) / 2;
  const pinoDeBaixo = haste([baixo[0], baixo[1], baixo[2] - c.pino.comprimento / 2], [baixo[0], baixo[1], faceDaCoroa + c.pino.penetracaoNaCoroa], c.pino.diametro / 2, 'pino de baixo do compasso');

  const a = t.atuador;
  const orelha = doPivo(a.orelha, a.z);
  const ponta = doPivo(a.ponta, a.z);
  const divisao = orelha.map((v, k) => v + a.divisao * (ponta[k] - v));
  const o = a.caixaDaOrelha;

  return {
    roda: { tipo: 'roda', centro: [px, chao, pz], largura: t.roda.largura, raio: R },
    perna: { tipo: 'caixa', largura: t.perna.largura, altura: pernaTopo - pernaBase, profundidade: t.perna.espessura, cantos: t.perna.cantos, em: [px, pernaBase, pz] },
    pinoPivo: { tipo: 'haste', ...haste([px, py, pz - t.pinoPivo.meioComprimento], [px, py, pz + t.pinoPivo.meioComprimento], t.pinoPivo.diametro / 2, 'pino do pivô') },
    coroa: {
      tipo: 'caixa', largura: t.coroa.largura, altura: t.coroa.altura, profundidade: t.coroa.fracaoDaProfundidade * t.perna.espessura, cantos: t.coroa.cantos, em: [px, coroaBase, pz],
    },
    garfoExt: caixaDoGarfo(1),
    garfoInt: caixaDoGarfo(-1),
    eixoRoda: { tipo: 'haste', ...haste([px - t.eixo.meioComprimento, chao, pz], [px + t.eixo.meioComprimento, chao, pz], t.eixo.diametro / 2, 'eixo da roda') },
    compassoSup: { tipo: 'haste', ...haste(alto, joelho, c.haste / 2, 'braço de cima do compasso') },
    compassoInf: { tipo: 'haste', ...haste(joelho, baixo, c.haste / 2, 'braço de baixo do compasso') },
    pinoCompasso: { tipo: 'haste', ...pinoDoCompasso(joelho) },
    pinoCompassoAlto: { tipo: 'haste', ...pinoDoCompasso(alto) },
    pinoCompassoBaixo: { tipo: 'haste', ...pinoDeBaixo },
    atuadorCorpo: { tipo: 'haste', ...haste(orelha, divisao, a.corpo / 2, 'corpo do atuador') },
    atuadorHaste: { tipo: 'haste', ...haste(divisao, ponta, a.haste / 2, 'haste do atuador') },
    pinoAtuador: {
      tipo: 'haste', ...haste([ponta[0], ponta[1], ponta[2] - a.pino.comprimento / 2], [ponta[0], ponta[1], ponta[2] + a.pino.comprimento / 2], a.pino.diametro / 2, 'pino do atuador'),
    },
    orelhaAtuador: { tipo: 'caixa', largura: o.largura, altura: o.altura, profundidade: o.profundidade, cantos: o.cantos, em: [orelha[0], orelha[1] - o.altura / 2, orelha[2]] },
  };
}

export function derivar(t = TABELA) {
  const M = medidas(t);

  /* A roda: a chamada da família, com os parâmetros do esboço, e o centro dela. A largura entra como razão do diâmetro. */
  const diametro = 2 * t.roda.raio;
  const familia = registroDeFamilias().obter('roda-pneu');
  const chamada = chamar(familia, 'roda', {
    perfil: t.roda.perfil, diametroPneu: diametro, larguraPneu: t.roda.largura / diametro, desvio: t.roda.desvio,
    /* o furo central do cubo tem o diâmetro do eixo, e a roda assenta nele */
    diametroFuroCentral: t.eixo.diametro / diametro,
  });

  const partes = {};
  for (const [base, f] of Object.entries(M)) {
    if (f.tipo === 'caixa') {
      partes[base] = {
        tipo: 'caixa', largura: m(f.largura), altura: m(f.altura), profundidade: m(f.profundidade), em: mAll(f.em), ...(f.cantos ? { cantos: m(f.cantos) } : {}),
      };
    } else if (f.tipo === 'haste') {
      partes[base] = {
        tipo: 'haste', eixo: f.eixo, em: mAll(f.em), comprimento: m(f.comprimento), raio: m(f.raio), ...(f.giroEmZ === undefined ? {} : { giroEmZ: f.giroEmZ }),
      };
    }
  }
  return { roda: { chamada, centro: mAll(M.roda.centro) }, partes, segmentosDoCirculo: t.lados / 4, segmentosDoCanto: t.segmentosDoCanto };
}

/* Identidade estrutural dos passos, escolhida aqui. A roda da família leva as origens `lathe` 1, 2, 3, 4 e 11, `arranja` 5 e
   `subtrair` 6, e o resto fica acima delas. A cópia espelhada (`espelha`) leva a identidade da fonte mais `ESPELHO`. */
const ID = {
  perna: 100, pinoPivo: 101, coroa: 102, garfoExt: 103, garfoInt: 104, eixoRoda: 105,
  compassoSup: 110, compassoInf: 111, pinoCompasso: 112, pinoCompassoAlto: 113, pinoCompassoBaixo: 114,
  atuadorCorpo: 120, atuadorHaste: 121, pinoAtuador: 122, orelhaAtuador: 123,
};
const ESPELHO = 500;

/* As quatro formas da roda, as origens que a família publica: o pneu, o aro, o cubo furado e o disco. */
const FORMAS_DA_RODA = [{ op: 'lathe', id: 1 }, { op: 'lathe', id: 2 }, { op: 'subtrair', id: 6 }, { op: 'lathe', id: 11 }];

/* As partes que se afastam do esboço pela decisão da pessoa de 2026-10-15, cada uma com o afastamento declarado no REFINA.esboco e o
   motivo; as outras ficam no mínimo geral, 0,95. A parte que só translada declara `deslocamento` (em mm, no quadro do esboço), e a
   razão de volume e o envelope são medidos contra a forma e o volume do esboço transladados. A parte que muda de comprimento declara
   `alongamento`, o quanto passa do volume do andaime em cada lado, e fica com o `minimo` próprio quando a razão não volta a 0,95: o
   mínimo é a razão medida (`npm run forma:esboco`) truncada na segunda casa, e o que ele vigia é só o que a razão mede acima do
   alongamento. Os valores abaixo são os da TABELA (17 mm de folga ao chão, 21 mm de descida do pino de baixo do compasso). */
const DESCE = 17;
const AFASTADAS = {
  /* o trem desce com a perna: a roda encosta no chão (o esboço a deixa 17 mm acima), o furo do cubo passa a ter o diâmetro do eixo */
  roda: { deslocamento: [0, -DESCE, 0], motivo: 'a roda encosta no chão: o trem desce 17 mm; o furo do cubo tem o diâmetro do eixo (28 mm), e não os 62,9 do esboço' },
  garfoExt: { deslocamento: [0, -DESCE, 0], motivo: 'o garfo desce 17 mm com a roda, que encosta no chão' },
  garfoInt: { deslocamento: [0, -DESCE, 0], motivo: 'o garfo desce 17 mm com a roda, que encosta no chão' },
  eixoRoda: { deslocamento: [0, -DESCE, 0], motivo: 'o eixo desce 17 mm com a roda, que encosta no chão' },
  coroa: { deslocamento: [0, -DESCE, 0], motivo: 'a coroa desce 17 mm com o garfo, no pé da perna' },
  /* a perna é a que alonga: o topo fica no pivô e o pé desce os 17 mm */
  perna: { alongamento: { '-y': DESCE }, motivo: 'a perna ganha 17 mm de comprimento no pé: o trem desce 17 mm para a roda encostar no chão' },
  /* o pino de baixo desce 21 mm até a junção da perna com a coroa e ganha 66,4 mm em +z até entrar na face da frente da coroa */
  pinoCompassoBaixo: {
    deslocamento: [0, -21, 0], alongamento: { '+z': 66.4 }, minimo: 0.45,
    motivo: 'o pino de baixo do compasso desce 21 mm até a junção da perna com a coroa e vai 66,4 mm além da ponta de trás do esboço, até entrar na face da frente da coroa',
  },
  /* o braço de baixo mantém o joelho e acompanha o pino de baixo, que desce 21 mm */
  compassoInf: { alongamento: { '-y': 21 }, minimo: 0.46, motivo: 'o braço de baixo do compasso mantém o joelho e a ponta de baixo desce 21 mm com o pino de baixo' },
};

/* material de cada parte, pela chave de MATERIAIS; a roda leva os da família, `borracha` e `aco`. */
const MATERIAL = {
  perna: 'perna', coroa: 'perna', garfoExt: 'perna', garfoInt: 'perna', orelhaAtuador: 'perna',
  pinoPivo: 'pino', eixoRoda: 'pino', pinoCompasso: 'pino', pinoCompassoAlto: 'pino', pinoCompassoBaixo: 'pino', pinoAtuador: 'pino',
  compassoSup: 'haste', compassoInf: 'haste', atuadorCorpo: 'haste', atuadorHaste: 'haste',
};

export const MATERIAIS = {
  borracha: { cor: '#1f2328', metalicidade: 0, aspereza: 0.9 },
  aco: { cor: '#8b96a2', metalicidade: 0.6, aspereza: 0.4 },
  perna: { cor: '#5f6b78', metalicidade: 0.3, aspereza: 0.5 },
  pino: { cor: '#2b3138', metalicidade: 0.4, aspereza: 0.4 },
  haste: { cor: '#aeb9c4', metalicidade: 0.5, aspereza: 0.35 },
};

/* O ângulo, em graus, a partir do qual a quina fica nítida no sombreado liso: o canto arredondado e os lados dos cilindros e da roda
   viram menos de 15 graus por segmento e ficam lisos, e as tampas, as faces das caixas e as paredes do pneu ficam nítidas. */
const ANGULO_LISO = 30;

export function gerarPassos(t = TABELA) {
  const P = derivar(t);
  const passos = [];
  const doPasso = (op, id) => ({ origem: { op, id } });

  /* A roda: a expansão da família, sem as partes e sem as portas, no centro da roda. */
  const { passos: daFamilia } = expandirChamadasDeComposicao(registroDeFamilias().registroComposicoes, [P.roda.chamada]);
  passos.push(...daFamilia.filter(([operacao]) => operacao !== 'parte' && operacao !== 'publicarPorta'));
  for (const origem of FORMAS_DA_RODA) passos.push(['transladar', { d: P.roda.centro, sel: { origem } }]);

  /* As caixas de canto arredondado (ou reto) e as hastes do lado direito. */
  const caixa = (origemId, c) => passos.push(['extrusao', {
    origemId,
    eixo: 'y',
    altura: c.altura,
    perfil: { retangulo: { largura: c.largura, profundidade: c.profundidade, ...(c.cantos ? { cantos: c.cantos } : {}) } },
    ...(c.cantos ? { segmentosArco: P.segmentosDoCanto } : {}),
    em: c.em,
  }]);
  const hastes = (origemId, h) => {
    passos.push(['extrusao', { origemId, eixo: h.eixo, altura: h.comprimento, perfil: { circulo: { raio: h.raio } }, segmentosArco: P.segmentosDoCirculo, em: h.em }]);
    if (h.giroEmZ !== undefined) passos.push(['rotaciona', { eixo: 'z', graus: h.giroEmZ, pivo: h.em, sel: doPasso('extrusao', origemId) }]);
  };
  for (const [base, id] of Object.entries(ID)) {
    const f = P.partes[base];
    if (f.tipo === 'caixa') caixa(id, f);
    else hastes(id, f);
  }

  /* Cada forma do lado direito: a cópia espelhada em x, para o lado esquerdo. A roda espelha as quatro formas dela. */
  const formas = [
    ...Object.entries(ID).map(([base, id]) => [base, [{ op: 'extrusao', id }]]),
    ['roda', FORMAS_DA_RODA],
  ];
  for (const [, origens] of formas) {
    for (const origem of origens) {
      passos.push(['espelha', { eixo: 'x', pos: 0, origemId: origem.id + ESPELHO, derivaDe: origem, sel: { origem } }]);
    }
  }

  /* A parte de cada lado, com o material, o sólido e o liso. A roda já traz da família o material e o sólido, que a cópia herda. */
  for (const [base, origens] of formas) {
    for (const [sufixo, copia] of [['D', false], ['E', true]]) {
      const nome = `${base}Principal${sufixo}`;
      for (const origem of origens) {
        const sel = { origem: copia ? { op: 'espelha', id: origem.id + ESPELHO, de: origem } : origem };
        passos.push(['parte', { nome, sel }]);
        if (base !== 'roda') {
          passos.push(['material', { usa: MATERIAL[base], sel }]);
          passos.push(['solido', { sel }]);
        }
        passos.push(['liso', { angulo: ANGULO_LISO, sel }]);
      }
    }
  }

  return passos;
}

/* A caixa de cada parte do lado direito, em milímetro, calculada da TABELA sem passar pelos passos: a de uma caixa é a dela; a de uma
   haste alinhada a um eixo, a dos dois centros mais o raio nos outros dois; a de uma haste inclinada, a das duas pontas mais, em cada
   eixo, o raio vezes `sqrt(1 - d²)` (um disco de raio `r` perpendicular à reta tem essa extensão); a da roda, a largura em x e o
   raio do pneu em y e em z. */
function caixasDoLadoDireito(t) {
  const caixas = {};
  for (const [base, f] of Object.entries(medidas(t))) {
    if (f.tipo === 'caixa') {
      caixas[base] = {
        min: [f.em[0] - f.largura / 2, f.em[1], f.em[2] - f.profundidade / 2],
        max: [f.em[0] + f.largura / 2, f.em[1] + f.altura, f.em[2] + f.profundidade / 2],
      };
    } else if (f.tipo === 'roda') {
      caixas[base] = {
        min: [f.centro[0] - f.largura / 2, f.centro[1] - f.raio, f.centro[2] - f.raio],
        max: [f.centro[0] + f.largura / 2, f.centro[1] + f.raio, f.centro[2] + f.raio],
      };
    } else {
      const u = f.para.map((v, k) => (v - f.de[k]) / f.comprimento);
      const folga = u.map((c) => f.raio * Math.sqrt(1 - c * c));
      caixas[base] = {
        min: f.de.map((v, k) => Math.min(v, f.para[k]) - folga[k]),
        max: f.de.map((v, k) => Math.max(v, f.para[k]) + folga[k]),
      };
    }
  }
  return caixas;
}

/* Os pontos declarados, em milímetro: o mínimo e o máximo da caixa de cada parte, do lado direito e do esquerdo (o espelho em x). */
export function pontosDeclarados(t = TABELA) {
  const tolerancia = 1;
  return Object.entries(caixasDoLadoDireito(t)).flatMap(([base, { min, max }]) => [
    { nome: `${base}D, o mínimo da caixa`, parte: `${base}PrincipalD`, medida: 'minimo', em: min, toleranciaMm: tolerancia },
    { nome: `${base}D, o máximo da caixa`, parte: `${base}PrincipalD`, medida: 'maximo', em: max, toleranciaMm: tolerancia },
    { nome: `${base}E, o mínimo da caixa`, parte: `${base}PrincipalE`, medida: 'minimo', em: [-max[0], min[1], min[2]], toleranciaMm: tolerancia },
    { nome: `${base}E, o máximo da caixa`, parte: `${base}PrincipalE`, medida: 'maximo', em: [-min[0], max[1], max[2]], toleranciaMm: tolerancia },
  ]);
}

export default {
  meta: { nome: 'aviao/trens-principais', desc: 'trens principais do avião de pequeno porte, baixados: perna, pivô, coroa, garfo, eixo, roda, compasso e atuador de cada lado' },
  PARAMS: TABELA,
  MATERIAIS,
  TOPO: { origem: 'a proa do avião em z 0; y para cima com o chão em y 0; x para a direita do piloto; os trens sob as asas, em x de 1820 a 2072 de cada lado' },
  PLANO: {
    objeto: 'trens principais de um avião monomotor de pequeno porte, baixados: de cada lado, a perna presa ao pivô sob a asa, com a coroa, o garfo, o eixo, a roda no chão, o compasso e o atuador',
    referencias: [
      'docs/modelar/banco-de-provas/aviao-2026-10-11/referencias/lateral.prancha.png',
    ],
    escala: { medida: 'altura do trem principal no esboço, do pé da roda ao alto do pivô', milimetros: 1198 },
    partes: NOMES.map((nome) => ({ nome, forma: `${BASES[baseDe(nome)][0]}, do lado ${ladoDe(nome)}`, tecnica: BASES[baseDe(nome)][1] })),
    criteriosDeReprovacao: [
      'roda solta, fora do chão, ou atravessando o garfo',
      'perna, coroa, garfo ou eixo desalinhados entre si, ou soltos',
      'atuador ou compasso solto, que não liga as peças que o esboço liga',
      'os dois lados que não são espelho um do outro',
      'o REFINA acusando parte fora do envelope do volume dela ou abaixo do mínimo contra a forma do esboço',
    ],
  },
  /* Os contatos. A roda assenta no eixo: o furo central do cubo da família tem o diâmetro do eixo (28 mm), e não os 62,9 mm do
     esboço. O eixo atravessa as duas placas do garfo, e o garfo passa pela coroa até a perna. Os pinos de cima do compasso e o do
     atuador entram na face da frente e na de trás da perna (o do meio do compasso, no joelho, fica fora dela); o de baixo fica na
     junção da perna com a coroa e entra na face da frente da coroa. As hastes se encontram nos centros dos pinos e uma na outra. */
  ilhas: [{ contem: 'pernaPrincipalD', motivo: 'o trem direito se liga ao esquerdo pela fuselagem, que é outra parte da montagem do avião' }],
  contatos: LADOS.flatMap(([L, lado]) => [
    { par: [`pernaPrincipal${L}`, `pinoPivoPrincipal${L}`], motivo: `a perna do lado ${lado} gira no pino do pivô` },
    { par: [`coroaPrincipal${L}`, `pernaPrincipal${L}`], motivo: `a coroa fica no pé da perna do lado ${lado}` },
    { par: [`garfoExtPrincipal${L}`, `coroaPrincipal${L}`], motivo: `o lado de fora do garfo se prende na coroa (${lado})` },
    { par: [`garfoIntPrincipal${L}`, `coroaPrincipal${L}`], motivo: `o lado de dentro do garfo se prende na coroa (${lado})` },
    { par: [`eixoRodaPrincipal${L}`, `garfoExtPrincipal${L}`], motivo: `o eixo da roda atravessa o lado de fora do garfo (${lado})` },
    { par: [`eixoRodaPrincipal${L}`, `garfoIntPrincipal${L}`], motivo: `o eixo da roda atravessa o lado de dentro do garfo (${lado})` },
    { par: [`pinoCompassoAltoPrincipal${L}`, `pernaPrincipal${L}`], motivo: `o pino de cima do compasso entra na face da frente da perna (${lado})` },
    { par: [`pinoCompassoBaixoPrincipal${L}`, `pernaPrincipal${L}`], motivo: `o pino de baixo do compasso fica na junção e entra na face da frente da perna (${lado})` },
    { par: [`pinoCompassoBaixoPrincipal${L}`, `coroaPrincipal${L}`], motivo: `o pino de baixo do compasso entra na face da frente da coroa, como o PLANO promete (${lado})` },
    { par: [`rodaPrincipal${L}`, `eixoRodaPrincipal${L}`], motivo: `a roda assenta no eixo, pelo furo do cubo de mesmo diâmetro (${lado})` },
    { par: [`compassoSupPrincipal${L}`, `pinoCompassoAltoPrincipal${L}`], motivo: `o braço de cima do compasso parte do pino de cima (${lado})` },
    { par: [`compassoSupPrincipal${L}`, `pinoCompassoPrincipal${L}`], motivo: `o braço de cima do compasso chega ao pino do meio (${lado})` },
    { par: [`compassoInfPrincipal${L}`, `pinoCompassoPrincipal${L}`], motivo: `o braço de baixo do compasso parte do pino do meio (${lado})` },
    { par: [`compassoInfPrincipal${L}`, `pinoCompassoBaixoPrincipal${L}`], motivo: `o braço de baixo do compasso chega ao pino de baixo (${lado})` },
    { par: [`compassoSupPrincipal${L}`, `compassoInfPrincipal${L}`], motivo: `os dois braços do compasso se encontram no joelho (${lado})` },
    { par: [`pinoAtuadorPrincipal${L}`, `pernaPrincipal${L}`], motivo: `o pino do atuador entra na face de trás da perna (${lado})` },
    { par: [`atuadorHastePrincipal${L}`, `pinoAtuadorPrincipal${L}`], motivo: `a haste do atuador termina no pino da perna (${lado})` },
    { par: [`atuadorCorpoPrincipal${L}`, `atuadorHastePrincipal${L}`], motivo: `a haste sai do corpo do atuador (${lado})` },
    { par: [`atuadorCorpoPrincipal${L}`, `orelhaAtuadorPrincipal${L}`], motivo: `o corpo do atuador parte da orelha (${lado})` },
  ]),
  /* A roda tem quatro corpos, o pneu, o aro, o cubo e o disco, e nove furos passantes: um em cada um dos três que são anéis, o furo
     central do cubo e os cinco de fixação. As outras partes são sólidos sem furo. */
  formas: Object.fromEntries(NOMES.map((p) => [p, baseDe(p) === 'roda' ? { furos: 9, corpos: 4 } : 'solido'])),
  REFINA: {
    andaime: '../../andaime.json',
    partes: Object.fromEntries(NOMES.map((p) => [p, slug(p)])),
    tolerancia: { envelope: 5, porta: 0.5 },
    esboco: {
      arquivo: ESBOCO,
      opcao: 1,
      formas: Object.fromEntries(NOMES.map((p) => [p, baseDe(p) in AFASTADAS ? { formas: p, ...AFASTADAS[baseDe(p)] } : p])),
      minimo: 0.95,
    },
  },
  get PONTOS() { return pontosDeclarados(this.PARAMS); },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};
