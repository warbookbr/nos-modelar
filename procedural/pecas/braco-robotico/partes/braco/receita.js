/* braco-robotico/braco — a coluna redonda e reta, à frente do ombro, numa malha única por subdivisão de uma gaiola.
 *
 * Quarta etapa da montagem `braco-robotico/montagem.json`. A decisão da pessoa
 * (2026-11-03, opção 3) está no fim de `../../ALINHAMENTO.md`: cilindro de 156
 * mm do pé ao topo, 477 mm do fundo do pé ao topo, pé redondo em volta do eixo
 * da junta do ombro, uma peça só. Em 2026-11-05 a pessoa pediu a peça numa
 * superfície só, sem união: antes eram dois `lathe` unidos com
 * `arredondarCostura` no encontro, e a emenda deixava malhas que não se casam.
 *
 * Referencial local: o eixo +Z é o eixo da junta do ombro e a origem é o
 * centro do disco do pé que encosta na face do anel da junta; Y para cima. O
 * pé é um cilindro de eixo Z (raio igual ao da coluna, espessura igual ao
 * diâmetro dela) e a coluna é um cilindro de eixo Y que sobe do eixo da junta,
 * centrado na espessura do pé, de modo que as duas faces do pé ficam
 * tangentes à coluna. O fundo do pé fica a `raio` abaixo do eixo e o topo a
 * `alturaTotal` acima do fundo.
 *
 * A gaiola, por `gaiolaPorLacos` (eixo Z). Cada laço é o contorno da peça
 * cortado por um plano z = constante, com u = x e v = y: o disco do pé (raio da
 * coluna, e esse raio menos o chanfro nos dois planos das faces) e, nele, a
 * faixa da coluna, que sobe até o topo com meia largura igual à corda do círculo
 * da coluna nesse plano. A volta do laço parte do fundo do disco, sobe pela
 * direita, passa pelo filete do encontro, pela parede da coluna, pelo chanfro e
 * pelo topo plano, e desce pela esquerda. Os planos ficam em torno do eixo da
 * coluna (z = raio - raio * cos, a cada 10 graus), então o círculo da coluna e o
 * arco do pé saem dos próprios pontos do laço, e as duas faces do pé são a
 * tampa da gaiola, planas. O filete do encontro é uma quádrica tangente à
 * parede e ao círculo do pé, posta nos pontos do laço, e a tangente dela é a de
 * um filete de `raioDoEncontro` entre as duas superfícies (raio * tg(metade da
 * dobra)); onde as duas ficam tangentes (z = 78) a dobra some e o trecho do filete
 * vira uns poucos milímetros quase retos. A parede da coluna tem trechos de
 * passo crescente a partir do filete, para a subdivisão não deixar calombo.
 * `compensar` vai nos trechos de curva dos planos de dentro, e fica de fora nos
 * dois planos de cada ponta, onde os pontos já estão no chanfro.
 *
 * Duas partes nomeadas, uma só malha: o pé é o que está de y = -raio ao eixo da
 * junta mais o raio (a metade de baixo do pé, escolhida por região), e a coluna é o resto.
 * A parede da coluna entre o eixo da junta e o topo do pé (y de 0 a 78 mm) fica
 * por isso na parte `pe`: a região do núcleo recorta por caixa, não pela superfície.
 *
 * Portas que a receita publica:
 *   juntaNoOmbro — cilindro interno, eixo +Z, centro no meio do disco do pé que
 *                  encosta, raio do pé. Senta na `juntaDoOmbro` do ombro.
 *   topo         — anel que recebe, eixo +Y, centro no meio da face plana de
 *                  cima, face inteira (raio da coluna). O anel do cotovelo,
 *                  de cerca de 160 mm, sai daqui.
 *
 * Curso. A rotação é em torno do eixo +Z da junta, e toda a peça fica em
 * z de 0 a 156 mm, à frente da face do anel: nenhum ponto cruza o plano do
 * anel nem entra no bloco do ombro, em nenhum ângulo. O limite é o chão: com o
 * eixo a 360 mm do chão, a coluna encosta nele a cerca de 141 graus da vertical
 * para cada lado.
 */
import { gaiolaPorLacos } from '../../../../nucleo/gaiola-por-lacos.js';

export const TABELA = {
  /* Vem do ombro pela montagem (porta `juntaDoOmbro`); o valor daqui só vale
     para ver a parte sozinha. Limita o raio do pé: o pé não passa do anel. */
  raioDaJunta: 95,
  diametroDaColuna: 156,
  /* Do fundo do pé ao topo. */
  alturaTotal: 477,
  /* Chanfro estreito: o do topo da coluna (2 por 2) e o das faces do pé (2 de raio por `fundoDoChanfroDoPe` de fundo, que é o
     primeiro passo entre planos e não pode ser menor que 2,5). */
  chanfro: 2,
  fundoDoChanfroDoPe: 2.6,
  /* Quão vivas ficam as arestas do chanfro (0 a 1). */
  nitidezDoChanfro: 0.8,
  /* Filete do encontro do pé com a coluna: o raio nominal. */
  raioDoEncontro: 12,
  /* Tangente mínima (mm) do trecho do filete, para ele existir em todo plano. */
  tangenteMinimaDoFilete: 3,
  /* Passo, em graus, dos planos em torno do eixo da coluna. */
  passoDosPlanos: 10,
  /* A face do pé é um disco e a coluna só a toca em linha: o laço da face leva a coluna cortada a essa distância dela
     (a faixa de coluna tem a corda dessa profundidade, 8 mm de largura), para o laço não ter duas paredes coincidentes. */
  recuoDaColunaNaFace: 0.1,
  /* Níveis da subdivisão. */
  niveis: 2,
};

const m = (mm) => mm / 1000;
const ID = { corpo: 100 };
const graus = (g) => (g * Math.PI) / 180;
/* Os trechos da parede da coluna, do filete ao chanfro do topo: a fração acumulada da altura em que cada um acaba e os pontos dele. */
const PAREDE = [['A', 0.03, 2], ['B', 0.08, 3], ['C', 0.17, 3], ['D', 0.32, 4], ['E', 0.55, 5], ['F', 0.78, 5], ['G', 0.92, 3], ['H', 1, 3]];
const FRACOES = PAREDE.map(([, f]) => f);

export function derivar(t = TABELA) {
  const rc = t.diametroDaColuna / 2;
  if (rc > t.raioDaJunta) throw new Error('a coluna não cabe no anel da junta: o pé passaria da borda dele.');
  const esp = 2 * rc;
  /* Eixo da junta em y = 0; o fundo do pé em -rc; o topo em alturaTotal - rc. */
  const yTopo = t.alturaTotal - rc;
  return { rc, esp, yTopo, c: t.chanfro, ...gaiola(t, rc, esp, yTopo) };
}

/* A gaiola, em milímetro até o fim. Cada laço é o contorno cortado por um plano z = constante (u = x, v = y): o disco do pé
   (raio rc, ou rc - chanfro nas duas faces) e, nele, a faixa da coluna, de meia largura b = corda do círculo da coluna nesse
   plano. O filete do encontro é uma quádrica tangente à parede da faixa e ao círculo do pé. */
function gaiola(t, rc, esp, yTopo) {
  const c = t.chanfro;
  const zs = [];
  /* o primeiro plano fica a `fundoDoChanfroDoPe` da face; depois, o passo declarado até o plano do eixo da coluna, e o espelho */
  const angulos = [0, Math.acos(1 - t.fundoDoChanfroDoPe / rc) * (180 / Math.PI)];
  while (angulos[angulos.length - 1] + t.passoDosPlanos < 90 - 1e-9) angulos.push(angulos[angulos.length - 1] + t.passoDosPlanos);
  angulos.push(90);
  for (const g of [...angulos].reverse().slice(1)) angulos.push(180 - g);
  for (const g of angulos) zs.push(rc - rc * Math.cos(graus(g)));
  const ultimaFatia = zs.length - 1;
  const lacos = zs.map((z, r) => {
    const ehTampa = r === 0 || r === ultimaFatia;
    const R = ehTampa ? rc - c : rc;
    /* a corda da coluna neste plano; na tampa, a do plano recuado */
    const zc = ehTampa ? (r === 0 ? t.recuoDaColunaNaFace : esp - t.recuoDaColunaNaFace) : z;
    const b = Math.sqrt(Math.max(0, rc * rc - (zc - rc) ** 2));
    const bt = Math.sqrt(Math.max(0, (rc - c) * (rc - c) - (zc - rc) ** 2));
    const yc = Math.sqrt(Math.max(0, R * R - b * b));
    const psi = Math.acos(Math.min(1, b / rc));
    /* a tangente do filete nominal cresce com a dobra; a mínima mantém o trecho do filete com o mesmo número de pontos e sem fundir nunca,
       e onde a dobra é de poucos graus ela é uma reta com a curva de uma quádrica de curvatura desprezível */
    const tl = Math.max(t.raioDoEncontro * Math.tan(psi / 2), t.tangenteMinimaDoFilete);
    const alfa = tl / R;
    const phiC = Math.atan2(yc, b);
    const phi2 = phiC - alfa;
    /* P2 no círculo; a tangente ali corta a parede x = b em C' (controle do filete); P1 fica a |C'P2| acima de C' */
    const p2 = [R * Math.cos(phi2), R * Math.sin(phi2)];
    const yl = (R - b * Math.cos(phi2)) / Math.sin(phi2);
    const dtan = Math.sqrt(Math.max(0, b * b + yl * yl - R * R));
    const ctrl = [b, yl];
    const p1 = [b, yl + dtan];
    const bez = (k, n) => {
      const s = k / (n - 1);
      return [(1 - s) ** 2 * p1[0] + 2 * (1 - s) * s * ctrl[0] + s * s * p2[0], (1 - s) ** 2 * p1[1] + 2 * (1 - s) * s * ctrl[1] + s * s * p2[1]];
    };
    const filD = Array.from({ length: 13 }, (_, k) => bez(k, 13)).reverse();
    /* baixo: do P2 da esquerda por baixo até o P2 da direita, partido ao meio por um trecho curto no fundo do disco */
    const inicio = Math.PI - phi2;
    const fim = 2 * Math.PI + phi2;
    const meio = (3 * Math.PI) / 2;
    const dFundo = 3 / R;
    const arcoDe = (de, ate, n) => Array.from({ length: n }, (_, k) => {
      const ang = de + (k / (n - 1)) * (ate - de);
      return [R * Math.cos(ang), R * Math.sin(ang)];
    });
    const baixoE = arcoDe(inicio, meio - dFundo, 40);
    const fundo = [[-R * Math.sin(dFundo), -R * Math.cos(dFundo)], [R * Math.sin(dFundo), -R * Math.cos(dFundo)]];
    const baixoD = arcoDe(meio + dFundo, fim, 40);
    const lado = (sx, y0, y1) => [[sx * b, y0], [sx * b, y1]];
    const tr = { baixoE, fundo, baixoD, filD };
    const y1 = Math.max(p1[1], 0);
    /* os níveis da faixa da coluna, em frações da altura que sobra, com passo crescente a partir do filete */
    const H = yTopo - c - y1;
    const L = FRACOES.map((f) => y1 + f * H);
    PAREDE.map(([n]) => n).forEach((n, k) => {
      tr[`lado${n}_D`] = lado(1, k ? L[k - 1] : y1, L[k]);
      tr[`lado${n}_E`] = lado(-1, L[k], k ? L[k - 1] : y1);
    });
    tr.chTopoD = [[b, yTopo - c], [bt, yTopo]];
    tr.topo = [[bt, yTopo], [-bt, yTopo]];
    tr.chTopoE = [[-bt, yTopo], [-b, yTopo - c]];
    tr.filE = filD.map(([x, y]) => [-x, y]).reverse();
    return { em: z, trechos: tr };
  });
  const T = [
    ['baixoE', 19], ['fundo', 2], ['baixoD', 19], ['filD', 5],
    ...PAREDE.map(([n, , p]) => [`lado${n}_D`, p]),
    ['chTopoD', 2], ['topo', 6], ['chTopoE', 2],
    ...[...PAREDE].reverse().map(([n, , p]) => [`lado${n}_E`, p]),
    ['filE', 5],
  ];
  const vincos = [
    { nome: 'topoD', entre: ['ladoH_D', 'chTopoD'], nitidez: t.nitidezDoChanfro },
    { nome: 'topoD2', entre: ['chTopoD', 'topo'], nitidez: t.nitidezDoChanfro },
    { nome: 'topoE', entre: ['topo', 'chTopoE'], nitidez: t.nitidezDoChanfro },
    { nome: 'topoE2', entre: ['chTopoE', 'ladoH_E'], nitidez: t.nitidezDoChanfro },
    { nome: 'facePrimeira', laco: 'primeiro', trechos: ['baixoD', 'fundo', 'baixoE'], nitidez: t.nitidezDoChanfro },
    { nome: 'faceUltima', laco: 'ultimo', trechos: ['baixoD', 'fundo', 'baixoE'], nitidez: t.nitidezDoChanfro },
  ];
  const curvas = ['baixoD', 'baixoE', ...PAREDE.flatMap(([n]) => [`lado${n}_D`, `lado${n}_E`])];
  const miolo = lacos.slice(2, -2).map((_, k) => `l${k + 2}`);
  const g = gaiolaPorLacos({
    nome: 'k', eixo: 'z', tampa: { de: 'fundo', ate: 'topo' },
    trechos: T.map(([nome, pontos]) => ({ nome, pontos })),
    lacos, vincos, compensar: { trechos: curvas, lacos: miolo },
  });
  return { gaiola: g, passo: g.passo, pontos: g.pontos };
}

export function gerarPassos(t = TABELA) {
  const { rc, esp, yTopo, passo } = derivar(t);
  const corpo = { origem: { op: 'subdivisao', id: ID.corpo } };
  const passos = [];
  passos.push(['subdivisao', { origemId: ID.corpo, ...passo, niveis: t.niveis }]);
  passos.push(['parte', { nome: 'coluna', sel: { tudo: true } }]);
  passos.push(['parte', { nome: 'pe', sel: { regiao: { min: [-1, -1, -1], max: [1, m(rc), 1] } }, substituir: true }]);
  passos.push(['publicarPorta', {
    nome: 'juntaNoOmbro', de: corpo.origem,
    interface: { forma: 'cilindro', papel: 'interna', eixo: [0, 0, 1], centro: [0, 0, 0], raio: m(rc), inicio: 0, fim: 0.005 },
  }]);
  passos.push(['publicarPorta', {
    nome: 'topo', de: corpo.origem,
    interface: { forma: 'anel', papel: 'recebe', eixo: [0, 1, 0], centro: [0, m(yTopo), m(esp / 2)], raioInterno: 0, raioExterno: m(rc), inicio: -0.005, fim: 0 },
  }]);
  return passos;
}

const receita = {
  meta: { nome: 'braco-robotico/braco', desc: 'coluna redonda e reta de 156 mm, com o pé redondo em volta do eixo da junta do ombro, numa malha só' },
  PARAMS: TABELA,
  get TOPO() { return { origem: 'centro do disco do pé que encosta no anel da junta; +Z é o eixo da junta, y para cima, a coluna à frente (z de 0 a 156)', ...derivar(this.PARAMS).pontos }; },
  PLANO: {
    objeto: 'coluna do braço robótico: cilindro redondo e reto à frente do ombro, que gira em volta do eixo da junta do ombro e leva o anel do cotovelo no topo',
    referencias: ['../../referencias/coluna-reta.png', '../../referencias/coluna-reta-lado.png'],
    escala: { medida: 'diâmetro da coluna, do pé ao topo', milimetros: 156 },
    partes: [
      { nome: 'pe', forma: 'disco redondo de eixo Z (o da junta do ombro), 156 mm de diâmetro (o da coluna) e 156 mm de espessura, encostado na face do anel da junta, fundido à coluna: uma peça só', tecnica: 'gaiolaPorLacos de eixo Z, uma malha única com a coluna: laço de disco de raio 78 mais a faixa da coluna, tampas planas com chanfro em vinco, filete do encontro nos próprios pontos do laço, compensar nas curvas' },
      { nome: 'coluna', forma: 'cilindro redondo e reto de 156 mm do pé ao topo, 477 mm do fundo do pé ao topo, de eixo vertical sobre o pé; topo plano onde assenta o anel do cotovelo; bordas suavizadas', tecnica: 'mesma malha única por gaiolaPorLacos: parede da coluna em trechos de passo crescente, chanfro do topo com vinco, planos em torno do eixo da coluna, compensar nos trechos de canto e de curva, sem unir' },
    ],
    criteriosDeReprovacao: [
      'coluna que afunila, engrossa ou tem diâmetro diferente de 156 mm em algum trecho',
      'altura do fundo do pé ao topo diferente de 477 mm',
      'pé que não é redondo em volta do eixo da junta, ou de diâmetro diferente do da coluna',
      'fresta, emenda, degrau ou parafuso entre o pé e a coluna: precisa ser uma peça só',
      'pé afastado da face do anel da junta ou entrando nele',
      'qualquer ponto da peça atrás do plano da face do anel (z menor que 0 no referencial da peça): atravessaria o bloco do ombro',
      'topo inclinado, abaulado ou sem a face plana de assento do anel do cotovelo',
      'bordas vivas, sem o acabamento suavizado das carcaças',
      'sombreado torcido ou rasgo no encontro do pé com a coluna',
      'sem a porta `topo` para o anel do cotovelo, de eixo vertical',
      'curso declarado além do que a geometria permite: nenhum toque com ombro, anel da cintura ou base em ângulo algum; cerca de 141 graus da vertical para cada lado até o chão (eixo a 360 mm)',
    ],
  },
  contatos: [],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
