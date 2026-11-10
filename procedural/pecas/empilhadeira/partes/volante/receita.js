/* empilhadeira/volante — o volante da empilhadeira: o aro, o cubo e os três raios, que giram em torno da coluna de direção.
 *
 * Etapa da montagem `../../montagem.json` depois da coluna de direção (fatia 6 do plano `docs/modelar/planos/2026-11-09-empilhadeira.md`,
 * item 6 das partes do `../../ALINHAMENTO.md`, onde "o volante gira em torno da coluna"). A forma é a do rascunho que a pessoa aprovou
 * por imagem em 2026-11-10 (`../../referencias/protetor-posto.esboco.mjs`), levada para cá sem mudança de medida, com duas exceções: os
 * círculos com 96 lados (no rascunho, 64 no aro e 32 no cubo), e o furo do cubo, que o rascunho não tinha (o eixo da coluna entrava no
 * cubo maciço) e que aqui recebe o eixo com folga. O rascunho chama `montarVolante` daqui.
 *
 * DE ONDE VEM CADA MEDIDA (do rascunho). De lado (região `volante` da lateral) o aro é uma barra inclinada 35 graus sobre a horizontal,
 * com o centro em z -473 e y 1.410 e 330 mm de corda; a TABELA do alinhamento não traz o diâmetro do volante, e o rascunho adotou 340.
 * O volante é montado de pé, no plano perpendicular à coluna de pé, e girado como ela (`derivar` da coluna de direção).
 *
 * A JUNTA. O volante gira em torno do eixo da coluna: o furo do cubo (`cubo`, cilindro interno) abraça o trecho do eixo que a coluna
 * publica (`eixoDoVolante`, cilindro externo de raio 22). O raio do furo vem da porta da coluna pelo vínculo da montagem, com 0,5 mm de
 * folga radial; o fundo do furo fica 0,5 mm acima do topo do eixo. As duas portas têm o centro no fim do trecho (o fundo do furo e o
 * topo do eixo) e o trecho para trás dele. A montagem põe o volante pela porta `cubo` na `eixoDoVolante`, no mesmo eixo, com o
 * afastamento de 0,5 mm da folga do fundo, e a relação `encaixaCilindrico` mede o encaixe.
 *
 * A cadeia: a TABELA em mm; `derivar` calcula os perfis e a porta em mm; `montarVolante` escreve os passos em mm num estado
 * { passos, topo, origem }; `gerarPassos` converte para metro com `m()`, campo de medida a campo de medida, num lugar só. */
import { TABELA as CARCACA } from '../carcaca/receita.js';
import { ferramentas } from '../carcaca/receita/ferramentas.js';
import { TABELA as COLUNA, derivar as derivarColuna } from '../coluna-direcao/receita.js';

export const TABELA = {
  /* O raio do furo do cubo: o do eixo da coluna (22) mais 0,5 mm de folga, pelo vínculo `volanteNoEixoDaColuna` da montagem. */
  raioDoFuro: 22.5,
  /* A cor do rascunho: o escuro da carcaça. */
  cores: { escuro: CARCACA.cores.escuro },
  /* Lados dos círculos. */
  lados: 96,
  /* O aro de 340 mm, de raio 145 a 170 e 30 mm de altura; o cubo de raio 45 e 50 mm de altura; três raios de 24 mm de largura e 16 de
     altura, de 40 a 155 mm do centro, a 90, 210 e 330 graus. Tudo em torno do meio do cubo, na coluna de pé. */
  aro: { raio: [145, 170], meia: 15, alemNoCorte: 5 },
  cubo: { raio: 45, meia: 25 },
  raios: { angulos: [90, 210, 330], meiaLargura: 12, de: 40, ate: 155, meia: 8 },
  /* O furo do cubo: do pé do cubo até 0,5 mm acima do topo do eixo, que acaba 10 mm abaixo do meio do cubo; o cortador sai 5 mm abaixo
     do pé. */
  furo: { folgaNoTopo: 0.5, abaixoDoPe: 5 },
};

const m = (mm) => mm / 1000;
const circulo = (cu, cv, r, n) => Array.from({ length: n }, (_, k) => [cu + r * Math.cos(2 * Math.PI * k / n), cv + r * Math.sin(2 * Math.PI * k / n)]);

/** O giro (o da coluna), o topo do furo e a porta, em mm, no referencial da máquina. */
export function derivar(T = TABELA) {
  const DC = derivarColuna();
  const C = COLUNA.coluna;
  const zc = C.saida.z; const yCubo = DC.yCubo;
  const pe = yCubo - T.cubo.meia;
  const topoDoFuro = yCubo - C.eixo.abaixoDoCubo + T.furo.folgaNoTopo;
  /* o furo: o centro no fundo dele, e o trecho do pé do cubo ao fundo, para trás do centro, como a porta do eixo da coluna */
  const portas = {
    cubo: { forma: 'cilindro', papel: 'interna', eixo: DC.eixoDaColuna, centro: DC.girar([0, topoDoFuro, zc]), raio: T.raioDoFuro, inicio: -(topoDoFuro - pe), fim: 0, referencia: [1, 0, 0] },
  };
  return { DC, zc, yCubo, pe, topoDoFuro, portas };
}

/** Monta o volante no estado { passos, topo, origem }, em mm, no referencial da máquina, e devolve a origem do furo. */
export function montarVolante(estado, T = TABELA) {
  const D = derivar(T);
  const { extY, booleana, parte } = ferramentas(estado);
  const unir = (...s) => booleana('unir', s);
  const cortar = (a, ...s) => booleana('subtrair', [a, ...s]);
  const { zc, yCubo } = D; const n = T.lados;
  /* o aro (o anel), o cubo e os raios, de pé no meio do cubo; o furo; e o giro da coluna */
  const AR = T.aro;
  const aro = cortar(extY(circulo(0, zc, AR.raio[1], n), yCubo - AR.meia, yCubo + AR.meia), extY(circulo(0, zc, AR.raio[0], n), yCubo - AR.meia - AR.alemNoCorte, yCubo + AR.meia + AR.alemNoCorte));
  const cubo = extY(circulo(0, zc, T.cubo.raio, n), D.pe, yCubo + T.cubo.meia);
  const R = T.raios;
  const raios = R.angulos.map((a) => {
    const c = Math.cos(a * Math.PI / 180); const s = Math.sin(a * Math.PI / 180);
    return extY([[-R.meiaLargura, R.de], [R.meiaLargura, R.de], [R.meiaLargura, R.ate], [-R.meiaLargura, R.ate]].map(([u, v]) => [u * c - v * s, zc + u * s + v * c]), yCubo - R.meia, yCubo + R.meia);
  });
  const furo = extY(circulo(0, zc, T.raioDoFuro, n), D.pe - T.furo.abaixoDoPe, D.topoDoFuro);
  const volante = cortar(unir(aro, cubo, ...raios), furo);
  estado.passos.push(['rotaciona', { eixo: 'x', graus: D.DC.graus, pivo: D.DC.pivo, sel: volante }]);
  parte('volante', volante, T.cores.escuro);
  return { furo };
}

/* Os campos de medida de cada operação e das portas: neles todo número é milímetro. */
const MEDIDAS = { extrusao: ['perfil', 'em', 'altura'], rotaciona: ['pivo'] };
const MEDIDAS_DA_PORTA = ['centro', 'ponto', 'raio', 'raioInterno', 'raioExterno', 'inicio', 'fim', 'extensao'];
const emMetro = (v) => (typeof v === 'number' ? m(v) : Array.isArray(v) ? v.map(emMetro) : v);

/** Os PASSOS, em metro: a forma e, no fim, a porta do furo. */
export function gerarPassos(T = TABELA) {
  const estado = { passos: [], topo: {}, origem: 0 };
  const { furo } = montarVolante(estado, T);
  const forma = estado.passos.map(([op, args]) => [op, Object.fromEntries(Object.entries(args).map(([k, v]) => [k, (MEDIDAS[op] ?? []).includes(k) ? emMetro(v) : v]))]);
  const { portas } = derivar(T);
  /* a parede do furo: as laterais do cortador (as tampas dele foram consumidas pelo corte) */
  return [...forma, ['publicarPorta', { id: 'cubo', de: { ...furo.origem, lado: { passo: 1, fase: 0 } },
    interface: Object.fromEntries(Object.entries(portas.cubo).map(([k, v]) => [k, MEDIDAS_DA_PORTA.includes(k) ? emMetro(v) : v])) }]];
}

export const CONTATOS = [];

const receita = {
  meta: { nome: 'empilhadeira/volante', desc: 'volante da empilhadeira: o aro, o cubo e os três raios, que giram em torno do eixo da coluna de direção' },
  PARAMS: TABELA,
  TOPO: { origem: 'a da máquina: o chão sob o centro do eixo dianteiro, no meio da largura; y para cima, +x à esquerda de quem dirige e a frente em +z' },
  PLANO: {
    objeto: 'o volante de uma empilhadeira de contrapeso de 2,5 t, de 340 mm, no alto da coluna de direção e perpendicular a ela, que gira em torno do eixo dela',
    referencias: ['../../referencias/cima.ia.png', '../../referencias/tras.ia.png', '../../referencias/frente.ia.png'],
    escala: { medida: 'diâmetro do aro do volante (rascunho; a lateral dá 330 de corda)', milimetros: 340 },
    partes: [
      { nome: 'volante', forma: 'o volante escuro de 340 mm: o aro de 25 mm de largura e 30 de altura, o cubo de 90 mm com o furo do eixo, e três raios de 24 mm a 90, 210 e 330 graus, perpendicular à coluna, com o centro em z -479 e y 1.408', tecnica: 'anel e círculos de 96 lados e retângulos extrudados em y, unidos, menos o furo, girados em torno de x como a coluna' },
    ],
    criteriosDeReprovacao: [
      'o volante fora do eixo da coluna, ou não perpendicular a ela',
      'o eixo da coluna cruzando o cubo, ou o volante solto do eixo',
      'o volante do tamanho errado: o aro com menos de 300 mm ou mais de 400',
      'cor trocada: o volante laranja ou cinza claro',
    ],
  },
  contatos: CONTATOS,
  /* O extremo de cima, de trás e da esquerda do aro girado: o raio de fora e a meia altura dele, no plano da coluna, em mm. */
  get PONTOS() {
    const T = this.PARAMS; const D = derivar(T); const [, ay, az] = D.DC.eixoDaColuna;
    const [cx, cy, cz] = D.DC.girar([0, D.yCubo, D.zc]); const r = T.aro.raio[1]; const h = T.aro.meia;
    return [{ nome: 'aro, em cima, na frente e à esquerda', parte: 'volante', medida: 'maximo', em: [cx + r, cy + r * Math.abs(az) + h * Math.abs(ay), cz + r * Math.abs(ay) + h * Math.abs(az)], toleranciaMm: 0.5 }];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
