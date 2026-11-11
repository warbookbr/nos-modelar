/* carrinho-de-mao/chassi — o chassi do carrinho de mão de obra: o tubo de aço redondo único, dobrado, com os punhos de borracha nas
 * manoplas, os dois mancais sob o laço e o eixo da roda, fixo neles; a base em que as outras três peças se prendem.
 *
 * Etapa 1 de 4 da montagem `../../montagem.json` (item 1 das partes do `../../ALINHAMENTO.md`). A forma é a do rascunho que a pessoa
 * aprovou por imagem em 2026-11-11 (`../../referencias/carrinho-de-mao.esboco.mjs`, "Sim a forma esta boa"), na escala do pneu de 340
 * mm, levada para cá sem mudança de medida, com três mudanças de construção: o trilho do tubo é o `{ pontos, raios }` da `gaiolaVarrida`
 * (no rascunho, uma função própria fazia os arcos) com os raios do lado espelhado na ordem certa (o rascunho passava 11 raios para os
 * 10 cantos, e do lado -x os quatro cantos de trás do laço saíam com o raio do canto vizinho); o quadro do tubo acompanha o trilho, que
 * deixa a seção redonda na subida da manopla e na rampa do laço (com o quadro fixo do rascunho ela media 28 mm no lugar de 32); e as
 * estações são as do trilho (passo de 40 mm nas retas e a cada 7,5 graus nas curvas). O eixo, que o rascunho punha com a roda, é deste
 * chassi, porque não gira em relação a ele. O rascunho chama `montarChassi` daqui.
 *
 * DE ONDE VEM CADA MEDIDA: a TABELA do `../../ALINHAMENTO.md` (linhas "tubo do chassi", "laço", "altura do laço", "braço sob a
 * caçamba", "subida e manopla", "manoplas", "mancais", "eixo"), pelos contornos de `../../referencias/carrinho-de-mao.contornos.json`.
 *
 * AS PORTAS. A origem é a do carrinho, e o chassi é a base: a montagem o põe sem pose. `eixo` é o cilindro do assento da roda no
 * meio do eixo, por onde a roda entra (os vínculos levam o raio dele ao furo do cubo e o comprimento à largura do cubo, e a posição põe o furo no
 * mesmo eixo). `apoioDosPes` é
 * o plano da face de baixo dos braços, com a normal para baixo, onde as travessas dos pés assentam; `apoioDaCacamba`, o da face de
 * cima, com a normal para cima, onde o fundo da caçamba assenta. Os dois planos ficam no meio do braço reto, e a peça que se põe
 * neles publica a porta no mesmo x e z, com a normal oposta: a pose sai identidade.
 *
 * A cadeia: a TABELA em mm; `derivar` calcula o trilho, os raios e as portas em mm; `montarChassi` escreve os passos em mm num estado
 * { passos, topo, origem }; `gerarPassos` converte para metro com `m()`, campo de medida a campo de medida, num lugar só. */
import { ferramentas, esc, lerp, passosEmMetro, portaEmMetro, soma, sub, topoEmMetro, unit } from '.././receita/ferramentas.js';

export const TABELA = {
  /* As cores do rascunho, uma por parte para a conferência; no objeto real o tubo é azul como a caçamba. */
  cores: { azul: '#2f6fd1', escuro: '#2a2d30', preto: '#151617' },
  /* TUBO DO CHASSI (linha "tubo do chassi"): Ø 32, 24 lados, estações a cada 40 mm nas retas. */
  tubo: { raio: 16, lados: 24, passo: 40 },
  /* A polilinha do eixo do tubo, do lado +x, da ponta da manopla ao canto da frente do laço (o outro lado é o espelho): a manopla até
     z -1.300 (y 515), a dobra de cima da subida (y 475, z -1.080), o braço sob a caçamba (y 266, de z -770 a -170), a rampa, o laço
     reto (y 195, x 95) e o canto da frente em z 210 (a ponta de fora do laço em z 226). O x dos quatro primeiros pontos é `null`: vem
     da reta da planta (`abertura`), e não de um número digitado em cada ponto. O raio de cada canto, na mesma ordem; o da frente é
     quase a meia largura do laço, que fica com 2 mm de reta. */
  chassi: {
    pontos: [[null, 515, -1300], [null, 475, -1080], [null, 266, -770], [null, 266, -170], [95, 195, -45], [95, 195, 210]],
    raios: [120, 150, 120, 100, 94],
    /* A PLANTA DOS BRAÇOS (linha "abertura dos braços"): no desenho de linha do chassi em planta, a meia largura do eixo do tubo
       cresce em reta do fim da rampa à manopla (44,5 px em 180 e 69 px em 380 no desenho, de 400 px para os 1.532 mm do chassi,
       3,83 mm/px; a reta lida dá 143,8 mm em z -170 e 282,3 mm em z -1.300). Os pontos do braço, a subida e a manopla ficam todos
       nessa reta, e os pés, as travessas e o apoio da caçamba seguem o x dela. */
    abertura: { z: [-170, -1300], x: [143.8, 282.3] },
  },
  /* MANOPLA (linha "manoplas"): punho de borracha de Ø 38 nos últimos 110 mm do tubo, passando 6 mm da ponta dele; estações a cada 30. */
  manopla: { raio: 19, comprimento: 110, alem: 6, lados: 24, passo: 30 },
  /* MANCAIS (linha "mancais"): um bloco sob cada lado do laço, no z do eixo, da face de baixo do eixo ao meio do tubo. */
  mancais: { x: [79, 111], y: [158, 195], meioComprimento: 18 },
  /* EIXO (linha "eixo"): Ø 16, de x -120 a 120, em y 170 (a roda de Ø 340 no chão) e z 0, fixo nos mancais. O assento é o trecho do
     meio em que o cubo da roda gira, centrado, que a porta `eixo` declara e o vínculo da montagem leva à largura do cubo: 102 mm, o
     cubo mais largo que a família da roda faz no pneu de 340 (o rascunho tinha 110), com 28 mm de folga de cada lado até os mancais. */
  eixo: { raio: 8, meio: 120, y: 170, z: 0, lados: 24, assento: 102 },
};

/** O x do eixo do braço, do lado +x, em z: a reta da planta dos braços, da `abertura` da TABELA. */
export function xDoBraco(T, z) {
  const { z: [z0, z1], x: [x0, x1] } = T.chassi.abertura;
  return x0 + (x1 - x0) * (z - z0) / (z1 - z0);
}

/** Os pontos da polilinha do chassi, do lado +x, com o x dos que estão na reta da planta dos braços (os de x `null`) calculado. */
export function pontosDoChassi(T) {
  return T.chassi.pontos.map(([x, y, z]) => [x ?? xDoBraco(T, z), y, z]);
}

/** O x, o y e o z do eixo do braço reto (do terceiro ao quarto ponto da polilinha) em z, do lado +x. */
export function noBraco(T, z) {
  const [a, b] = [pontosDoChassi(T)[2], pontosDoChassi(T)[3]];
  return lerp(a, b, (z - a[2]) / (b[2] - a[2]));
}

/** O trilho do tubo inteiro, as manoplas, os mancais, o eixo e as portas, em mm. */
export function derivar(T = TABELA) {
  const CH = { ...T.chassi, pontos: pontosDoChassi(T) };
  /* o tubo vai da ponta de uma manopla à da outra pelo laço: o lado +x e o espelho dele, de trás para a frente; os raios são os dez
     cantos de dentro, os do lado +x e os mesmos na ordem inversa */
  const outro = [...CH.pontos].reverse().map(([x, y, z]) => [-x, y, z]);
  const trilho = { pontos: [...CH.pontos, ...outro], raios: [...CH.raios, ...[...CH.raios].reverse()] };
  /* cada manopla: o punho na reta da manopla, da ponta para dentro */
  const manoplas = [1, -1].map((s) => {
    const [a, b] = [CH.pontos[0], CH.pontos[1]].map(([x, y, z]) => [s * x, y, z]);
    const d = unit(sub(a, b));
    return { s, de: sub(a, esc(d, T.manopla.comprimento)), ate: soma(a, esc(d, T.manopla.alem)) };
  });
  const E = T.eixo; const MA = T.mancais;
  const mancais = [MA.x, [-MA.x[1], -MA.x[0]]].map((x) => ({ x, y: MA.y, z: [E.z - MA.meioComprimento, E.z + MA.meioComprimento] }));
  /* os planos do braço, no meio do trecho reto */
  const zApoio = (CH.pontos[2][2] + CH.pontos[3][2]) / 2;
  const meio = noBraco(T, zApoio);
  const extensao = [2 * meio[0], Math.abs(CH.pontos[3][2] - CH.pontos[2][2])];
  const portas = {
    eixo: { forma: 'cilindro', papel: 'externa', eixo: [1, 0, 0], centro: [-E.assento / 2, E.y, E.z], raio: E.raio, inicio: 0, fim: E.assento, referencia: [0, 1, 0] },
    apoioDosPes: { forma: 'plano', papel: 'recebe', ponto: [0, meio[1] - T.tubo.raio, zApoio], normal: [0, -1, 0], extensao, referencia: [1, 0, 0] },
    apoioDaCacamba: { forma: 'plano', papel: 'recebe', ponto: [0, meio[1] + T.tubo.raio, zApoio], normal: [0, 1, 0], extensao, referencia: [1, 0, 0] },
  };
  return { trilho, manoplas, mancais, portas };
}

/** O chassi no estado { passos, topo, origem }, em mm: o tubo só, da ponta de uma manopla à da outra pelo laço da frente, os punhos,
 *  os mancais e o eixo. Devolve as origens de onde saem as portas. */
export function montarChassi(estado, T = TABELA) {
  const D = derivar(T);
  const { tubo, reta, bloco, lathe, parte } = ferramentas(estado);
  const chassi = tubo('chassi', D.trilho, T.tubo.raio, { lados: T.tubo.lados, estacoes: { passo: T.tubo.passo }, u: [0, 1, 0] });
  parte('chassi', chassi, T.cores.azul);
  const M = T.manopla;
  D.manoplas.forEach((mp, k) => {
    parte('manoplas', tubo(`manopla${mp.s > 0 ? 'E' : 'D'}`, reta(mp.de, mp.ate), M.raio, { lados: M.lados, estacoes: { passo: M.passo } }), T.cores.preto);
    const MA = D.mancais[k];
    parte('mancais', bloco(MA.x, MA.y, MA.z), T.cores.escuro);
  });
  const E = T.eixo;
  /* a barra, com uma volta de vértices em cada ponta do assento, onde a porta do eixo começa e acaba */
  const eixo = lathe([[0, -E.meio], [E.raio, -E.meio], [E.raio, -E.assento / 2], [E.raio, E.assento / 2], [E.raio, E.meio], [0, E.meio]], [0, E.y, E.z], E.lados);
  parte('eixo', eixo, T.cores.escuro);
  return { chassi, eixo };
}

/** Os PASSOS, em metro: a forma e, no fim, as portas. */
export function gerarPassos(T = TABELA) {
  const estado = { passos: [], topo: {}, origem: 0 };
  const { chassi, eixo } = montarChassi(estado, T);
  const { portas } = derivar(T);
  return [...passosEmMetro(estado.passos),
    portaEmMetro('eixo', eixo.origem, portas.eixo),
    portaEmMetro('apoioDosPes', chassi.origem, portas.apoioDosPes),
    portaEmMetro('apoioDaCacamba', chassi.origem, portas.apoioDaCacamba)];
}

/** Os pontos nomeados das gaiolas dos tubos, em metro. */
export function gerarTopo(T = TABELA) {
  const estado = { passos: [], topo: {}, origem: 0 };
  montarChassi(estado, T);
  return topoEmMetro(estado.topo);
}

export const CONTATOS = [
  { par: ['chassi', 'manoplas'], motivo: 'o punho de borracha veste a ponta do tubo nos últimos 110 mm de cada manopla' },
  { par: ['chassi', 'mancais'], motivo: 'os mancais são presos sob o tubo do laço, do meio do tubo para baixo' },
  { par: ['eixo', 'mancais'], motivo: 'o eixo atravessa os dois mancais e fica fixo neles' },
];

const receita = {
  meta: { nome: 'carrinho-de-mao/chassi', desc: 'chassi do carrinho de mão de obra: tubo redondo único dobrado com o laço da roda, as manoplas com punho, os mancais e o eixo' },
  PARAMS: TABELA,
  get TOPO() { return { origem: 'o chão sob o centro do eixo da roda, no meio da largura; y para cima, x lateral e a frente (a roda) em +z', ...gerarTopo(this.PARAMS) }; },
  PLANO: {
    objeto: 'chassi de carrinho de mão de obra de 60 L: tubo de aço redondo de Ø 32 dobrado, com laço em U em volta da roda, braços sob a caçamba e manoplas com punho, mancais e eixo; as travessas entre os braços são a parte `travessas` da peça `pes`',
    referencias: ['../../referencias/carrinho-de-mao.contornos.json'],
    escala: { medida: 'diâmetro do pneu 3.25-8, que fixa a escala das referências (TABELA do alinhamento)', milimetros: 340 },
    partes: [
      { nome: 'chassi', forma: 'um tubo redondo azul de Ø 32, de uma manopla à outra: laço em U em volta da roda (ponta em z 226), rampas, braços em y 266 sob a caçamba, subida e manoplas; em planta os braços abrem em reta, de 144 em z -170 a 282 em z -1.300', tecnica: 'gaiolaVarrida de seção redonda de 24 lados num trilho de pontos com raio por canto, quadro que acompanha o trilho, fechada e tampada, passo subdivisao sem nível' },
      { nome: 'manoplas', forma: 'punho preto de borracha de Ø 38 nos últimos 110 mm de cada manopla, passando 6 mm da ponta do tubo', tecnica: 'gaiolaVarrida de seção redonda de 24 lados numa reta, fechada e tampada, um de cada lado' },
      { nome: 'mancais', forma: 'bloco escuro sob cada lado do laço, de x 79 a 111, y 158 a 195 e 36 mm no comprimento, centrado no eixo da roda', tecnica: 'extrusão em y de um retângulo, um de cada lado' },
      { nome: 'eixo', forma: 'barra escura de Ø 16 de x -120 a 120, em y 170 e z 0, atravessando os dois mancais', tecnica: 'revolução em torno de x de 24 lados' },
    ],
    criteriosDeReprovacao: [
      'o tubo de seção quadrada, achatada ou com dobra em quina',
      'o chassi em mais de um tubo, ou com garfo no lugar do laço em U em volta da roda',
      'o laço estreito demais para a roda de 85 mm de banda, ou os mancais e o eixo fora do laço',
      'as manoplas sem punho, ou o punho solto da ponta do tubo',
      'um lado do tubo diferente do espelho do outro',
    ],
    lataria: { dispensa: 'a peça é tubo redondo de aço com punhos, e não chapa de lataria: a luz rasante e a curvatura de superfície de lataria não se aplicam' },
  },
  contatos: CONTATOS,
  /* Os extremos que a TABELA fixa nos três eixos, em mm: o eixo e o mancal do lado +x. */
  get PONTOS() {
    const T = this.PARAMS; const E = T.eixo; const MA = T.mancais;
    return [
      { nome: 'ponta +x do eixo, em cima', parte: 'eixo', medida: 'maximo', em: [E.meio, E.y + E.raio, E.z + E.raio], toleranciaMm: 0.5 },
      { nome: 'ponta -x do eixo, embaixo', parte: 'eixo', medida: 'minimo', em: [-E.meio, E.y - E.raio, E.z - E.raio], toleranciaMm: 0.5 },
      { nome: 'mancal +x, em cima e na frente', parte: 'mancais', medida: 'maximo', em: [MA.x[1], MA.y[1], E.z + MA.meioComprimento], toleranciaMm: 0.5 },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
