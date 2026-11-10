/* empilhadeira/escape — o tubo de escape da empilhadeira: o tubo de pé na tampa do capô, atrás da coluna de trás do lado direito do
 * protetor, com a ponta curva para trás, numa peça rígida.
 *
 * Etapa da montagem `../../montagem.json` depois do GLP (fatia 7 do plano `docs/modelar/planos/2026-11-09-empilhadeira.md`, item 7 das
 * partes do `../../ALINHAMENTO.md`). A forma é a do rascunho que a pessoa aprovou por imagem em 2026-11-10
 * (`../../referencias/protetor-posto.esboco.mjs`), levada para cá sem mudança de medida, com duas exceções: os círculos com 96 lados (no
 * rascunho, 32), e o pé, que no rascunho era reto em 1.146 e entrava 3,5 mm na tampa; aqui ele é cortado pela face de cima da tampa
 * como a malha da carcaça a tem, 0,5 mm acima dela. A tampa é curva nas duas direções sob o pé (a borda de fora dela desce 24 mm e a da
 * frente, 13), e o corte é o mais baixo de duas superfícies: a de frente, o mais alto da face em cada x, e a de lado, o mais alto em
 * cada z, cada uma acima da face. O rascunho chama `montarEscape` daqui. A alça de acesso, rígida com o protetor e sem tocar o escape,
 * é a peça `../alca/receita.js`.
 *
 * DE ONDE VEM CADA MEDIDA (do rascunho). Na lateral, px 742 a 766 (z -1.490 a -1.593) da linha 272 (y 1.135, a tampa do capô) à 98 (y
 * 1.882), e a ponta curva para trás até a linha 58 (y 2.055, px 750 a 772); de trás, colunas 623 a 640 (350 a 418 mm). Um tubo de 90 mm
 * até 1.990 e a ponta de 80 mm, de 1.950 a 2.070, inclinada 35 graus para trás no pivô em 1.960. O eixo fica em x -355 e z -1.567: em
 * -370 e -1.545 o pé saía 14 mm da tampa vista de cima.
 *
 * O ENCAIXE. A origem é a da máquina. A montagem põe o escape pela porta `naTampa` (o plano horizontal do corte do pé no ponto do apoio,
 * com a normal para baixo) na porta `apoioDoEscape` da carcaça, com o afastamento de 0,5 mm da folga, e a pose sai identidade.
 *
 * A cadeia: a TABELA em mm; `derivar` calcula os perfis e a porta em mm; `montarEscape` escreve os passos em mm num estado
 * { passos, topo, origem }; `gerarPassos` converte para metro com `m()`, campo de medida a campo de medida, num lugar só. */
import { TABELA as CARCACA, apoiosDoPosto } from '../../carcaca/receita.js';
import { ferramentas } from '../../carcaca/receita/ferramentas.js';
import { gaiolaVarrida } from '../../../../../nucleo/gaiola-varrida.js';

export const TABELA = {
  /* A cor do rascunho: o escuro da carcaça. */
  cores: { escuro: CARCACA.cores.escuro },
  /* Lados dos círculos. */
  lados: 96,

  /* O TUBO de raio 45, um trilho só: de pé com o eixo em x -355 e z -1.567, do corte do pé até o pivô em 1.960, onde vira 35 graus para
     trás numa curva de raio 100, e a ponta reta até 110 mm do pivô, ao longo dela (o fim da ponta do rascunho, que ia de 1.950 a 2.070
     girada no pivô). No rascunho a ponta era outro cilindro, de raio 40, nascendo dentro do topo reto do tubo, em degrau; a seção agora
     é a mesma do tubo, de 96 lados. Estações a cada 100 mm no tubo, 16 na curva e 4 na ponta. */
  tubo: { x: -355, z: -1567, raio: 45, pivoY: 1960, graus: 35, raioDaCurva: 100, ponta: 110, estacoes: { passo: 100, naCurva: 16, naPonta: 4 } },

  /* O PÉ: a face de cima da tampa do capô sob o tubo, medida na malha da carcaça por sonda vertical (2026-11-10), a cada 1 mm, na caixa
     do pé (x -405 a -305, z -1.617 a -1.517), simplificada a 0,3 mm (o desvio da reta para cima dela fica em 0,2 mm): `frente` é o mais
     alto da face em cada x, `lado` o mais alto em cada z; o corte tira o que fica abaixo das duas mais a folga, de y 1.050 para cima. */
  pe: {
    frente: [[-405, 1116.5], [-402, 1122], [-399, 1126], [-394, 1130.7], [-389, 1134.3], [-381, 1138.5], [-371, 1142.3], [-361, 1145.1],
      [-348, 1147.2], [-332, 1148.1], [-305, 1148.3]],
    lado: [[-1617, 1148.3], [-1587, 1147.5], [-1550, 1145.2], [-1529, 1142.1], [-1520, 1138.7], [-1517, 1135.3]],
    folga: 0.5,
    de: 1050,
  },
};

const m = (mm) => mm / 1000;

/** Os perfis do corte do pé e a porta, em mm, no referencial da máquina. */
export function derivar(T = TABELA) {
  const P = T.pe;
  const abaixo = (nos) => {
    const p = [...nos].sort((a, b) => a[0] - b[0]).map(([u, y]) => [u, y + P.folga]);
    return [[p[0][0], P.de], [p[p.length - 1][0], P.de], ...[...p].reverse()];
  };
  /* o trilho do tubo: a reta de pé, a curva que vira para trás (-z) e a reta da ponta */
  const TU = T.tubo; const a = TU.graus * Math.PI / 180; const R = TU.raioDaCurva;
  const t = R * Math.tan(a / 2);
  const dir = [0, Math.cos(a), -Math.sin(a)];
  const pivo = [TU.x, TU.pivoY, TU.z];
  const inicio = [TU.x, P.de + P.folga, TU.z];
  const a0 = [TU.x, TU.pivoY - t, TU.z]; const a1 = pivo.map((v, k) => v + dir[k] * t); const fim = pivo.map((v, k) => v + dir[k] * TU.ponta);
  const centro = [TU.x, TU.pivoY - t, TU.z - R];
  /* o sentido do giro em torno de x que leva a0 a a1 (a regra do arco do trilho) */
  const rad = [0, a0[1] - centro[1], a0[2] - centro[2]]; const kr = [0, -rad[2], rad[1]];
  const ponto = (th) => [TU.x, centro[1] + rad[1] * Math.cos(th) + kr[1] * Math.sin(th), centro[2] + rad[2] * Math.cos(th) + kr[2] * Math.sin(th)];
  const graus = Math.hypot(...ponto(a).map((v, k) => v - a1[k])) < 1e-6 ? TU.graus : -TU.graus;
  const L = [a0[1] - inicio[1], R * a];
  const caminho = { trilho: [{ reta: { de: inicio, ate: a0 } }, { arco: { centro, eixo: [1, 0, 0], de: a0, graus } }, { reta: { de: a1, ate: fim } }], marcos: [L[0], L[0] + L[1]], fim, dir };
  const secao = Array.from({ length: T.lados }, (_, k) => ({ u: TU.raio * Math.cos(2 * Math.PI * k / T.lados), v: TU.raio * Math.sin(2 * Math.PI * k / T.lados), nome: `l${k}` }));
  const apoio = apoiosDoPosto(CARCACA).escape;
  const portas = {
    naTampa: { forma: 'plano', papel: 'apoia', ponto: apoio.ponto.map((v, k) => v + apoio.normal[k] * P.folga), normal: apoio.normal.map((v) => (v === 0 ? 0 : -v)), extensao: apoio.extensao, referencia: apoio.referencia },
  };
  return { sobFrente: abaixo(P.frente), sobLado: abaixo(P.lado), caminho, secao, portas };
}

/** Monta o escape no estado { passos, topo, origem }, em mm, no referencial da máquina, e devolve a origem dele. */
export function montarEscape(estado, T = TABELA) {
  const D = derivar(T);
  const { extX, extZ, booleana, parte } = ferramentas(estado);
  const cortar = (a, ...s) => booleana('subtrair', [a, ...s]);
  const cruzar = (...s) => booleana('intersectar', s);
  const P = T.pe; const E = T.tubo.estacoes; const { trilho, marcos } = D.caminho;
  const xs = P.frente.map(([x]) => x); const zs = P.lado.map(([z]) => z);
  /* o tubo varrido, fechado e tampado, pelo passo `subdivisao` sem nível, menos o que fica abaixo das duas superfícies do pé ao mesmo
     tempo */
  const g = gaiolaVarrida({ nome: 'escape', trilho, quadro: { u: [1, 0, 0] }, secao: D.secao, fechada: true, tampas: true,
    estacoes: [{ fracao: 0 }, { passo: E.passo }, { em: marcos[0] }, { entre: E.naCurva }, { em: marcos[1] }, { entre: E.naPonta }, { fracao: 1 }] });
  Object.assign(estado.topo, Object.fromEntries(g.posicoes));
  estado.origem += 1;
  estado.passos.push(['subdivisao', { origemId: estado.origem, vertices: g.vertices, faces: g.faces, vincos: g.vincos, cantos: g.cantos, niveis: 0 }]);
  const tubo = { origem: { op: 'subdivisao', id: estado.origem } };
  const escape = cortar(tubo, cruzar(extZ(D.sobFrente, Math.min(...zs), Math.max(...zs)), extX(D.sobLado, Math.min(...xs), Math.max(...xs))));
  parte('escape', escape, T.cores.escuro);
  return { escape };
}

/* Os campos de medida de cada operação e das portas: neles todo número é milímetro. */
const MEDIDAS = { extrusao: ['perfil', 'em', 'altura'] };
const MEDIDAS_DA_PORTA = ['centro', 'ponto', 'raio', 'raioInterno', 'raioExterno', 'inicio', 'fim', 'extensao'];
const emMetro = (v) => (typeof v === 'number' ? m(v) : Array.isArray(v) ? v.map(emMetro) : v);

/** Os PASSOS, em metro: a forma e, no fim, a porta do apoio. */
export function gerarPassos(T = TABELA) {
  const estado = { passos: [], topo: {}, origem: 0 };
  const { escape } = montarEscape(estado, T);
  const forma = estado.passos.map(([op, args]) => [op, Object.fromEntries(Object.entries(args).map(([k, v]) => [k, (MEDIDAS[op] ?? []).includes(k) ? emMetro(v) : v]))]);
  const { portas } = derivar(T);
  return [...forma, ['publicarPorta', { id: 'naTampa', de: escape.origem, interface: Object.fromEntries(Object.entries(portas.naTampa).map(([k, v]) => [k, MEDIDAS_DA_PORTA.includes(k) ? emMetro(v) : v])) }]];
}

/** Os pontos nomeados da gaiola do tubo, em metro. */
export function gerarTopo(T = TABELA) {
  const estado = { passos: [], topo: {}, origem: 0 };
  montarEscape(estado, T);
  return Object.fromEntries(Object.entries(estado.topo).map(([nome, p]) => [nome, p.map(m)]));
}

export const CONTATOS = [];

const receita = {
  meta: { nome: 'empilhadeira/escape', desc: 'tubo de escape da empilhadeira, de pé na tampa do capô atrás da coluna de trás direita do protetor, com a ponta curva para trás' },
  PARAMS: TABELA,
  get TOPO() { return { origem: 'a da máquina: o chão sob o centro do eixo dianteiro, no meio da largura; y para cima, +x à esquerda de quem dirige e a frente em +z', ...gerarTopo(this.PARAMS) }; },
  PLANO: {
    objeto: 'o tubo de escape de uma empilhadeira de contrapeso de 2,5 t a GLP, de 90 mm, de pé na tampa do capô atrás da coluna de trás direita do protetor, com a ponta inclinada para trás até 2.070 mm',
    referencias: ['../../referencias/tras.ia.png', '../../referencias/cima.ia.png'],
    escala: { medida: 'topo do escape (TABELA do alinhamento, rascunho; lateral, linha 58)', milimetros: 2070 },
    partes: [
      { nome: 'escape', forma: 'o tubo escuro de 90 mm de pé em x -355 e z -1.567, do pé na tampa do capô ao pivô em 1.960, curva contínua de raio 100 que o vira 35 graus para trás e a ponta reta até 2.076', tecnica: 'gaiolaVarrida de seção redonda de 96 lados (reta, arco, reta), fechada e tampada; o pé cortado pelas duas superfícies da face da tampa (perfis de frente e de lado extrudados, cruzados)' },
    ],
    criteriosDeReprovacao: [
      'o escape solto da tampa do capô, ou entrando nela',
      'o cotovelo em degrau ou em corte reto, em vez da curva contínua do tubo',
      'o escape do lado esquerdo (+x), ou cruzando a coluna de trás do protetor',
      'a ponta inclinada para a frente, ou o escape abaixo de 2.000 mm',
      'cor trocada: o escape laranja ou cinza claro',
    ],
    lataria: { partes: ['escape'] },
  },
  contatos: CONTATOS,
  /* O extremo de cima, da frente e da esquerda, em mm: o tubo na largura e na frente, e o canto de cima da tampa da ponta. */
  get PONTOS() {
    const T = this.PARAMS; const TU = T.tubo; const { fim, dir } = derivar(T).caminho;
    return [{ nome: 'escape, em cima, na frente e à esquerda', parte: 'escape', medida: 'maximo', em: [TU.x + TU.raio, fim[1] + TU.raio * Math.abs(dir[2]), TU.z + TU.raio], toleranciaMm: 0.5 }];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
