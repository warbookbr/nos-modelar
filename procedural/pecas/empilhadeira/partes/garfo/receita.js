/* empilhadeira/garfo — um garfo da empilhadeira, em L: a haste de pé, que pendura na face da frente das barras do carro, o calcanhar
 * e a lâmina de 1.070 x 100 x 40, que afina na ponta, numa peça rígida. Uma receita, duas instâncias na montagem (a esquerda e a
 * direita, a 280 mm do centro).
 *
 * Etapa da montagem `../../montagem.json` depois do carro (fatia 4 do plano `docs/modelar/planos/encerrados/2026-11-09-empilhadeira.md`, item 4
 * das partes do `../../ALINHAMENTO.md`, segunda metade da torre). A forma é a do rascunho que a pessoa aprovou por imagem em
 * 2026-11-10 (`../../referencias/torre-garfos.esboco.mjs`), levada para cá sem mudança de medida; o rascunho passou a chamar
 * `montarGarfo` daqui, uma vez de cada lado. Mudou só a construção: o garfo de cada lado é a mesma peça transladada, no lugar do
 * espelho do esquerdo, porque ele é simétrico na própria largura.
 *
 * DE ONDE VEM CADA MEDIDA (do rascunho). A lâmina de 1.070 x 100 x 40 é a da TABELA do alinhamento (a ficha; a lateral dá 947 e 55
 * de espessura, a vista de cima 830). A haste tem a espessura da lâmina e sobe a 600 mm do pé da lâmina, 10 mm acima da barra de
 * cima do carro (lateral: o carro e a haste até 1.236 com a grade). A ponta afina: de lado, nos últimos 200 mm, de 40 a 12 mm; de
 * cima, nos últimos 60, de 100 a 70 (lateral: a lâmina afina na ponta). Na pose de transporte a face de baixo da lâmina fica a 50 mm
 * do chão (os garfos abaixados do ALINHAMENTO), e é essa altura que dá o ponto do gancho na barra de cima.
 *
 * A TÉCNICA. A vista de lado (o L com a ponta afinada) extrudada na largura e cruzada com a vista de cima (o retângulo com a ponta
 * estreita) extrudada na altura, por `intersectar`. A vista de cima passa 1 mm do L atrás e na ponta, e 50 mm acima e abaixo dele,
 * para o corte não ter faces coincidentes.
 *
 * O ENCAIXE. A origem é o meio da face de trás da haste, no pé (a face de baixo da lâmina); y para cima, +x à esquerda de quem dirige
 * e a ponta em +z. A montagem pendura o garfo no carro pela porta `gancho` (a face de trás da haste, na altura do meio da barra de cima
 * do carro) sobre a porta `apoioDoGarfoEsquerdo` ou `apoioDoGarfoDireito` do carro (a face da frente da barra de cima, no centro do
 * garfo).
 *
 * A JUNTA QUE A MONTAGEM AINDA NÃO TEM. O garfo desliza ao longo da barra para mudar a distância entre os dois, e sobe com o carro; a
 * montagem v5 não mede plano sobre plano (ela mede encaixe cilíndrico e assento anular), e a posição sai das duas faces planas, sem
 * relação medida.
 *
 * A cadeia: a TABELA em mm; `derivar` calcula os perfis e a porta em mm; `montarGarfo` escreve os passos em mm num estado
 * { passos, topo, origem }, com `em` levando a origem ao lugar dela (o rascunho da máquina a põe no carro); `gerarPassos` converte para
 * metro com `m()`, campo de medida a campo de medida, num lugar só. */
import { ferramentas } from '../carcaca/receita/ferramentas.js';
import { TABELA as CARRO } from '../carro/receita.js';

export const TABELA = {
  /* A cor do rascunho: o quase preto do carro. */
  cores: { preto: CARRO.cores.preto },
  /* A lâmina: 100 de largura, 40 de espessura e 1.070 da face da haste à ponta; a haste tem a espessura da lâmina e sobe a 600. */
  largura: 100,
  espessura: 40,
  comprimento: 1070,
  altura: 600,
  /* A ponta afinada: de lado, nos últimos 200 mm, até 12 mm; de cima, nos últimos 60, até 70 de largura. */
  ponta: { deLado: 200, espessura: 12, deCima: 60, largura: 70 },
  /* A face de baixo da lâmina na pose de transporte, do chão, para a altura do gancho na barra de cima do carro. */
  chao: 50,
  /* Quanto a vista de cima passa do L: 1 mm atrás e na ponta, 50 acima e abaixo. */
  alem: { z: 1, y: 50 },
};

const m = (mm) => mm / 1000;

/** Os perfis e a porta, em mm, no referencial do garfo. */
export function derivar(T = TABELA) {
  const L = T.espessura + T.comprimento;
  const P = T.ponta; const a = T.largura / 2; const b = P.largura / 2;
  /* o L de lado, em [z, y]: a lâmina com a ponta afinada e a haste de pé atrás */
  const lado = [[0, 0], [L, 0], [L, P.espessura], [L - P.deLado, T.espessura], [T.espessura, T.espessura], [T.espessura, T.altura], [0, T.altura]];
  /* a planta, em [x, z]: o retângulo com a ponta estreita */
  const planta = [[-a, -T.alem.z], [a, -T.alem.z], [a, L - P.deCima], [b, L + T.alem.z], [-b, L + T.alem.z], [-a, L - P.deCima]];
  /* o gancho: a face de trás da haste, na altura do meio da barra de cima do carro com o pé da lâmina a `chao` do chão */
  const yDoGancho = (CARRO.barraCima[0] + CARRO.barraCima[1]) / 2 - T.chao;
  const portas = {
    gancho: { forma: 'plano', papel: 'apoia', ponto: [0, yDoGancho, 0], normal: [0, 0, -1], extensao: [T.largura, T.altura], referencia: [0, 1, 0] },
  };
  return { L, lado, planta, portas };
}

/** Monta um garfo no estado { passos, topo, origem }, em mm, com a origem levada a `em`, e devolve a origem da porta. `nomes` troca o
 *  nome da parte (o rascunho da máquina mantém o dele). */
export function montarGarfo(estado, T = TABELA, em = [0, 0, 0], nomes = {}) {
  const D = derivar(T);
  const { extX, extY, booleana, parte } = ferramentas(estado);
  const [ex, ey, ez] = em;
  const lado = D.lado.map(([z, y]) => [z + ez, y + ey]);
  const planta = D.planta.map(([x, z]) => [x + ex, z + ez]);
  const garfo = booleana('intersectar', [extX(lado, ex - T.largura / 2, ex + T.largura / 2), extY(planta, ey - T.alem.y, ey + T.altura + T.alem.y)]);
  parte(nomes.garfo ?? 'garfo', garfo, T.cores.preto);
  return { garfo };
}

const MEDIDAS = { extrusao: ['perfil', 'em', 'altura'] };
const MEDIDAS_DA_PORTA = ['ponto', 'extensao'];
const emMetro = (v) => (typeof v === 'number' ? m(v) : Array.isArray(v) ? v.map(emMetro) : v);

/** Os PASSOS, em metro: a forma e, no fim, a porta do gancho. */
export function gerarPassos(T = TABELA) {
  const estado = { passos: [], topo: {}, origem: 0 };
  const { garfo } = montarGarfo(estado, T);
  const forma = estado.passos.map(([op, args]) => [op, Object.fromEntries(Object.entries(args).map(([k, v]) => [k, (MEDIDAS[op] ?? []).includes(k) ? emMetro(v) : v]))]);
  const { portas } = derivar(T);
  const porta = (id, de) => ['publicarPorta', { id, de: de.origem, interface: Object.fromEntries(Object.entries(portas[id]).map(([k, v]) => [k, MEDIDAS_DA_PORTA.includes(k) ? emMetro(v) : v])) }];
  return [...forma, porta('gancho', garfo)];
}

/* Uma parte só: a haste, o calcanhar e a lâmina são um corpo. */
export const CONTATOS = [];

const receita = {
  meta: { nome: 'empilhadeira/garfo', desc: 'garfo da empilhadeira em L: a haste que pendura no carro, o calcanhar e a lâmina de 1.070 x 100 x 40 com a ponta afinada' },
  PARAMS: TABELA,
  TOPO: { origem: 'meio da face de trás da haste, no pé da lâmina; y para cima, +x à esquerda de quem dirige e a ponta em +z' },
  PLANO: {
    objeto: 'um garfo de uma empilhadeira de 2,5 t, pendurado no carro porta-garfos, abaixado na pose de transporte: a haste de pé, o calcanhar e a lâmina com a ponta afinada',
    referencias: ['../../referencias/frente.ia.png', '../../referencias/cima.ia.png', '../../referencias/lateral.contornos.json'],
    escala: { medida: 'comprimento da lâmina, da face da haste à ponta (TABELA do alinhamento, a ficha)', milimetros: 1070 },
    partes: [
      { nome: 'garfo', forma: 'L quase preto de 100 mm de largura: haste de 40 mm de pé até 600 mm, calcanhar em canto vivo e lâmina de 1.070 x 40 que afina na ponta, de lado de 40 a 12 mm nos últimos 200 e de cima de 100 a 70 nos últimos 60', tecnica: 'o L de lado extrudado em x cruzado com a planta extrudada em y, por intersectar' },
    ],
    criteriosDeReprovacao: [
      'o garfo fora do carro, solto da face da frente das barras',
      'a lâmina atravessando o chão, ou alta demais para a pose de transporte (a face de baixo a 50 mm do chão)',
      'a lâmina curta ou fina demais para 2,5 t, ou sem afinar na ponta',
      'o garfo cruzando o pneu dianteiro',
      'cor trocada: o garfo laranja ou cinza claro',
    ],
  },
  contatos: CONTATOS,
  /* Os extremos que a TABELA fixa, em mm. */
  get PONTOS() {
    const T = this.PARAMS; const L = T.espessura + T.comprimento;
    return [
      { nome: 'topo da haste e ponta da lâmina', parte: 'garfo', medida: 'maximo', em: [T.largura / 2, T.altura, L], toleranciaMm: 0.5 },
      { nome: 'pé de trás do garfo', parte: 'garfo', medida: 'minimo', em: [-T.largura / 2, 0, 0], toleranciaMm: 0.5 },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
