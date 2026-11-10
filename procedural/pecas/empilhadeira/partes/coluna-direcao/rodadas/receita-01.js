/* empilhadeira/coluna-direcao — a coluna de direção da empilhadeira, que sai do painel inclinada para trás até o cubo do volante, com
 * os pedais na rampa do painel e as alavancas do sistema hidráulico na face de cima dele, numa peça rígida.
 *
 * Etapa da montagem `../../montagem.json` depois do banco (fatia 6 do plano `docs/modelar/planos/2026-11-09-empilhadeira.md`, item 6 das
 * partes do `../../ALINHAMENTO.md`). A forma é a do rascunho que a pessoa aprovou por imagem em 2026-11-10
 * (`../../referencias/protetor-posto.esboco.mjs`), levada para cá sem mudança de medida, com três exceções de encaixe: o pé da coluna,
 * que no rascunho descia a 880 mm e entrava no painel e no piso, é cortado 0,5 mm acima da face de cima do painel; a haste de cada
 * pedal, que entrava 6 mm na rampa, começa 0,5 mm acima dela; e a haste de cada alavanca, que nascia em 905, nasce 0,5 mm acima da face
 * de cima do painel medida na malha da carcaça. O eixo da coluna passou de 24 para 96 lados. O rascunho chama `montarColunaDirecao`.
 *
 * POR QUE OS PEDAIS E AS ALAVANCAS MORAM AQUI. A regra é a da peça rígida: o que não gira em relação ao vizinho entra na mesma receita. No
 * rascunho e no alinhamento, pedais e alavancas são corpos presos ao painel, como a coluna, sem junta entre eles: a única junta do posto
 * é a do volante na coluna. Uma peça `comandos` à parte dividiria um conjunto rígido sem junta nenhuma no meio.
 *
 * DE ONDE VEM CADA MEDIDA (do rascunho). A coluna: de lado (região `volante` da lateral) o centro do aro fica em z -473 e y 1.410; a
 * coluna sai da face de cima do painel (y 915, de z 0 a -181) em z -110 e vai ao cubo, 36 graus para trás da vertical, perpendicular ao
 * aro; é montada de pé no pivô [0, 905, -110] e girada em torno de x. Os pedais: na lateral, px 448 a 486 nas linhas 331 a 362 (z -228 a
 * -391), na rampa do painel, que desce de [z -181, y 915] a [-404, 763]. As alavancas: de cima, colunas 435 a 465 nas linhas 230 a 260.
 *
 * O ENCAIXE. A origem é a da máquina. A montagem põe a coluna pela porta `noPainel` (o plano do corte do pé, com a normal para baixo) na
 * porta `apoioDaColunaDeDirecao` da carcaça, com o afastamento de 0,5 mm da folga, e a pose sai identidade. A coluna publica
 * `eixoDoVolante`, o trecho do eixo dela que entra no cubo do volante (cilindro externo de raio 22, com o centro no topo do eixo, 10 mm
 * abaixo do meio do cubo, e 15 mm para baixo até o pé do cubo), onde o volante gira.
 *
 * A cadeia: a TABELA em mm; `derivar` calcula os perfis, o giro e as portas em mm; `montarColunaDirecao` escreve os passos em mm num
 * estado { passos, topo, origem }; `gerarPassos` converte para metro com `m()`, campo de medida a campo de medida, num lugar só. */
import { TABELA as CARCACA, apoiosDoPosto } from '../../carcaca/receita.js';
import { ferramentas } from '../../carcaca/receita/ferramentas.js';

export const TABELA = {
  /* A cor do rascunho: o escuro da carcaça. */
  cores: { escuro: CARCACA.cores.escuro },
  /* Lados dos círculos (o eixo). */
  lados: 96,

  /* A COLUNA: sai do painel em z -110 (y 915, a face de cima dele), gira no pivô 10 mm abaixo dela e vai ao cubo do volante em [z -473,
     y 1.410]. A capa de 110 por 110 mm, cantos de 20, de 880 a 380 mm acima da face do painel, e o eixo de raio 22 de 370 acima dela a
     10 mm abaixo do meio do cubo, que tem 25 mm de meia altura. O pé é cortado pelo plano do apoio da coluna na carcaça (a face de cima
     do painel em z -110, medida na malha, 914,6) mais a folga, que é também o afastamento da posição na montagem: o mais alto da face
     sob a pegada da capa é 914,7. O corte é um bloco de 30 mm além da capa em x e de 150 mm para cada lado em z, até y 700. */
  coluna: {
    saida: { z: -110 }, pivoAbaixo: 10, cubo: { z: -473, y: 1410 },
    capa: { meia: 55, canto: 20, de: 880, ateAcima: 380 },
    eixo: { raio: 22, deAcima: 370, abaixoDoCubo: 10 },
    meiaDoCubo: 25,
    corte: { alem: 30, emZ: 150, ate: 700, folga: 0.5 },
  },

  /* OS PEDAIS: sapatas de 140 mm ao longo da rampa (de 70 a 210 mm do alto dela) e 22 de espessura, 8 mm acima dela, com uma haste de
     20 mm de 130 a 150 mm da rampa, que vai de 0,5 mm acima dela (a face medida na malha fica na reta da rampa) a 1 mm dentro da sapata;
     o acelerador à direita (-x), o freio e a aproximação à esquerda. */
  pedais: {
    sapata: { s: [70, 210], t: [8, 30] },
    haste: { s: [130, 150], t: [0.5, 9], meia: 10 },
    x: [[-200, -120], [40, 130], [150, 230]],
  },

  /* AS ALAVANCAS: três hastes de 14 mm de lado em x -160, -205 e -250, z -167 a -153, até 1.130, com o manípulo de 36 mm, cantos de 8,
     de 1.110 a 1.165. O pé da haste: a face de cima do painel sob a pegada dela, medida na malha da carcaça (913,5), mais a folga. */
  alavancas: { x: [-160, -205, -250], meia: 7, z: [-167, -153], ate: 1130, manipulo: { meia: 18, canto: 8, y: [1110, 1165] }, faceDoPainel: 913.5, folga: 0.5 },
};

const m = (mm) => mm / 1000;
const circulo = (cu, cv, r, n) => Array.from({ length: n }, (_, k) => [cu + r * Math.cos(2 * Math.PI * k / n), cv + r * Math.sin(2 * Math.PI * k / n)]);
const retangulo = (u0, v0, u1, v1) => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
/* o retângulo de cantos redondos, de raio r, com 6 segmentos por canto */
function arredondado(u0, v0, u1, v1, r) {
  const pts = [];
  for (const [cu, cv, a0] of [[u1 - r, v0 + r, -90], [u1 - r, v1 - r, 0], [u0 + r, v1 - r, 90], [u0 + r, v0 + r, 180]]) {
    for (let k = 0; k <= 6; k += 1) { const a = (a0 + 15 * k) * Math.PI / 180; pts.push([cu + r * Math.cos(a), cv + r * Math.sin(a)]); }
  }
  return pts;
}

/** O giro da coluna, os perfis e as portas, em mm, no referencial da máquina. `girar` leva um ponto da coluna de pé ao lugar dela. */
export function derivar(T = TABELA) {
  const C = T.coluna;
  const yPainel = CARCACA.painel.lado[1][1];
  const pivo = [0, yPainel - C.pivoAbaixo, C.saida.z];
  const dz = C.cubo.z - C.saida.z; const dy = C.cubo.y - yPainel;
  const L = Math.hypot(dz, dy);
  const graus = Math.atan2(dz, dy) * 180 / Math.PI;          // em torno de x: o negativo leva +y para -z, para trás
  const yCubo = yPainel + L;                                   // o meio do cubo, com a coluna de pé
  const a = graus * Math.PI / 180;
  const girar = ([x, y, z]) => [x, pivo[1] + (y - pivo[1]) * Math.cos(a) - (z - pivo[2]) * Math.sin(a), pivo[2] + (y - pivo[1]) * Math.sin(a) + (z - pivo[2]) * Math.cos(a)];
  const eixoDaColuna = [0, Math.cos(a), Math.sin(a)];

  /* a rampa do painel e o ponto (s ao longo dela, t para cima e para trás) */
  const [, [zA, yA], [zB, yB]] = CARCACA.painel.lado.slice(1, 4).map(([z, y]) => [-z, y]);
  const lr = Math.hypot(zB - zA, yB - yA);
  const u = [(zB - zA) / lr, (yB - yA) / lr]; const n = [-u[1], u[0]].map((v) => -v);
  const naRampa = (s, t) => [zA + u[0] * s + n[0] * t, yA + u[1] * s + n[1] * t];

  const apoio = apoiosDoPosto(CARCACA).colunaDirecao;
  const yCorte = apoio.ponto[1] + C.corte.folga;
  /* o eixo do volante: o centro no topo do eixo da coluna, e o trecho dentro do cubo, do pé dele ao topo, para trás do centro */
  const topoDoEixo = yCubo - C.eixo.abaixoDoCubo;
  const portas = {
    noPainel: { forma: 'plano', papel: 'apoia', ponto: [apoio.ponto[0], yCorte, apoio.ponto[2]], normal: apoio.normal.map((v) => (v === 0 ? 0 : -v)), extensao: apoio.extensao, referencia: apoio.referencia },
    eixoDoVolante: { forma: 'cilindro', papel: 'externa', eixo: eixoDaColuna, centro: girar([0, topoDoEixo, C.saida.z]), raio: C.eixo.raio, inicio: -(C.meiaDoCubo - C.eixo.abaixoDoCubo), fim: 0, referencia: [1, 0, 0] },
  };
  return { yPainel, pivo, graus, yCubo, topoDoEixo, yCorte, girar, eixoDaColuna, naRampa, portas };
}

/** Monta a coluna, os pedais e as alavancas no estado { passos, topo, origem }, em mm, no referencial da máquina, e devolve as origens
 *  das portas. */
export function montarColunaDirecao(estado, T = TABELA) {
  const D = derivar(T);
  const { extX, extY, booleana, parte } = ferramentas(estado);
  const unir = (...s) => booleana('unir', s);
  const cortar = (a, ...s) => booleana('subtrair', [a, ...s]);
  const C = T.coluna; const zc = C.saida.z;

  /* COLUNA: a capa e o eixo de pé, girados no pivô, menos o que fica abaixo da face de cima do painel */
  const capa = extY(arredondado(-C.capa.meia, zc - C.capa.meia, C.capa.meia, zc + C.capa.meia, C.capa.canto), C.capa.de, D.yPainel + C.capa.ateAcima);
  const eixo = extY(circulo(0, zc, C.eixo.raio, T.lados), D.yPainel + C.eixo.deAcima, D.topoDoEixo);
  const deLado = unir(capa, eixo);
  estado.passos.push(['rotaciona', { eixo: 'x', graus: D.graus, pivo: D.pivo, sel: deLado }]);
  const K = C.corte; const xc = C.capa.meia + K.alem;
  const coluna = cortar(deLado, extY(retangulo(-xc, zc - K.emZ, xc, zc + K.emZ), K.ate, D.yCorte));
  parte('colunaDirecao', coluna, T.cores.escuro);

  /* PEDAIS: a sapata acima da rampa e a haste até ela, extrudadas em x */
  const P = T.pedais;
  const sapata = [D.naRampa(P.sapata.s[0], P.sapata.t[0]), D.naRampa(P.sapata.s[1], P.sapata.t[0]), D.naRampa(P.sapata.s[1], P.sapata.t[1]), D.naRampa(P.sapata.s[0], P.sapata.t[1])];
  const haste = [D.naRampa(P.haste.s[0], P.haste.t[0]), D.naRampa(P.haste.s[1], P.haste.t[0]), D.naRampa(P.haste.s[1], P.haste.t[1]), D.naRampa(P.haste.s[0], P.haste.t[1])];
  const pedal = ([x0, x1]) => unir(extX(sapata, x0, x1), extX(haste, (x0 + x1) / 2 - P.haste.meia, (x0 + x1) / 2 + P.haste.meia));
  parte('pedais', unir(...P.x.map(pedal)), T.cores.escuro);

  /* ALAVANCAS: a haste de pé na face de cima do painel e o manípulo */
  const AL = T.alavancas; const M = AL.manipulo; const zm = (AL.z[0] + AL.z[1]) / 2;
  const alavancas = AL.x.map((x) => unir(extY(retangulo(x - AL.meia, AL.z[0], x + AL.meia, AL.z[1]), AL.faceDoPainel + AL.folga, AL.ate),
    extY(arredondado(x - M.meia, zm - M.meia, x + M.meia, zm + M.meia, M.canto), M.y[0], M.y[1])));
  parte('alavancas', unir(...alavancas), T.cores.escuro);
  return { coluna, eixo };
}

/* Os campos de medida de cada operação e das portas: neles todo número é milímetro. */
const MEDIDAS = { extrusao: ['perfil', 'em', 'altura'], rotaciona: ['pivo'] };
const MEDIDAS_DA_PORTA = ['centro', 'ponto', 'raio', 'raioInterno', 'raioExterno', 'inicio', 'fim', 'extensao'];
const emMetro = (v) => (typeof v === 'number' ? m(v) : Array.isArray(v) ? v.map(emMetro) : v);

/** Os PASSOS, em metro: a forma e, no fim, as duas portas. */
export function gerarPassos(T = TABELA) {
  const estado = { passos: [], topo: {}, origem: 0 };
  const { coluna, eixo } = montarColunaDirecao(estado, T);
  const forma = estado.passos.map(([op, args]) => [op, Object.fromEntries(Object.entries(args).map(([k, v]) => [k, (MEDIDAS[op] ?? []).includes(k) ? emMetro(v) : v]))]);
  const { portas } = derivar(T);
  const porta = (id, de) => ['publicarPorta', { id, de, interface: Object.fromEntries(Object.entries(portas[id]).map(([k, v]) => [k, MEDIDAS_DA_PORTA.includes(k) ? emMetro(v) : v])) }];
  /* o eixo: as laterais da extrusão dele (a tampa de baixo some na capa) */
  return [...forma, porta('noPainel', coluna.origem), porta('eixoDoVolante', { ...eixo.origem, lado: { passo: 1, fase: 0 } })];
}

export const CONTATOS = [];

const receita = {
  meta: { nome: 'empilhadeira/coluna-direcao', desc: 'coluna de direção da empilhadeira, que sai do painel até o cubo do volante, com os pedais na rampa do painel e as alavancas hidráulicas' },
  PARAMS: TABELA,
  TOPO: { origem: 'a da máquina: o chão sob o centro do eixo dianteiro, no meio da largura; y para cima, +x à esquerda de quem dirige e a frente em +z' },
  PLANO: {
    objeto: 'a coluna de direção de uma empilhadeira de contrapeso de 2,5 t, inclinada 36 graus para trás desde o painel, com os três pedais na rampa do painel e as três alavancas do sistema hidráulico, numa peça rígida presa à carcaça',
    referencias: ['../../referencias/cima.ia.png', '../../referencias/frente.ia.png', '../../referencias/carcaca-lado.ia.png'],
    escala: { medida: 'comprimento da coluna, da face de cima do painel (y 915, z -110) ao meio do cubo do volante (y 1.410, z -473)', milimetros: 614 },
    partes: [
      { nome: 'colunaDirecao', forma: 'a capa escura de 110 por 110 mm, cantos de 20, que sai da face de cima do painel em z -110 inclinada 36 graus para trás, e o eixo de raio 22 até o cubo do volante', tecnica: 'contorno de cantos redondos e círculo de 96 lados extrudados em y, unidos, girados em torno de x no pivô, menos o bloco abaixo da face do painel' },
      { nome: 'pedais', forma: 'três pedais escuros na rampa do painel: sapatas de 140 mm ao longo dela e 22 de espessura, 8 mm acima dela, com a haste até ela; o acelerador à direita (-x), o freio e a aproximação à esquerda', tecnica: 'quadriláteros laterais na rampa extrudados em x, unidos' },
      { nome: 'alavancas', forma: 'três alavancas escuras à direita do volante, hastes de 14 mm de pé na face de cima do painel até 1.130 mm, com o manípulo de 36 mm', tecnica: 'quadrado e contorno de cantos redondos extrudados em y, unidos' },
    ],
    criteriosDeReprovacao: [
      'a coluna de pé na vertical, inclinada para a frente, ou fora do meio da largura',
      'a coluna entrando no painel ou solta dele',
      'os pedais fora da rampa do painel, entrando nela, ou o acelerador do lado esquerdo',
      'as alavancas à esquerda do volante, ou soltas da face de cima do painel',
      'cor trocada: a coluna, os pedais ou as alavancas laranja',
    ],
  },
  contatos: CONTATOS,
  /* a coluna, os pedais e as alavancas se ligam pelo painel da carcaça, que é outra peça da montagem */
  ilhas: [
    { contem: 'pedais', motivo: 'os pedais se ligam à coluna pela rampa do painel da carcaça, que é outra peça da montagem da empilhadeira' },
    { contem: 'alavancas', motivo: 'as alavancas se ligam à coluna pela face de cima do painel da carcaça, que é outra peça da montagem da empilhadeira' },
  ],
  /* Os extremos que a TABELA fixa, em mm: o topo das alavancas e o pedal da esquerda. A coluna girada fica com as vistas. */
  get PONTOS() {
    const T = this.PARAMS; const AL = T.alavancas; const P = T.pedais; const D = derivar(T);
    const zm = (AL.z[0] + AL.z[1]) / 2;
    const ys = D.naRampa(P.sapata.s[0], P.sapata.t[1])[1]; const zs = D.naRampa(P.sapata.s[0], P.sapata.t[0])[0];
    return [
      { nome: 'manípulo da alavanca de dentro, em cima e na frente', parte: 'alavancas', medida: 'maximo', em: [AL.x[0] + AL.manipulo.meia, AL.manipulo.y[1], zm + AL.manipulo.meia], toleranciaMm: 0.5 },
      { nome: 'pedal da esquerda, no alto da sapata', parte: 'pedais', medida: 'maximo', em: [P.x[2][1], ys, zs], toleranciaMm: 0.5 },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
