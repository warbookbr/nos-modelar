/* empilhadeira/cilindro-elevacao — o cilindro de elevação livre da torre da empilhadeira, no centro, entre os canais: a camisa de Ø 60
 * sentada na travessa de baixo da torre, a haste de Ø 36 e a cabeça de 160 mm, onde as correntes do carro se prendem, numa peça na
 * pose recolhida.
 *
 * Etapa da montagem `../../montagem.json` depois do canal interno (fatia 4 do plano `docs/modelar/planos/2026-11-09-empilhadeira.md`,
 * item 4 das partes do `../../ALINHAMENTO.md`). A forma é a do rascunho que a pessoa aprovou por imagem em 2026-11-10
 * (`../../referencias/torre-garfos.esboco.mjs`), levada para cá sem mudança de medida; o rascunho passou a chamar
 * `montarCilindroElevacao` daqui. Mudou só a construção: os círculos com 96 lados no lugar de 40.
 *
 * POR QUE NÃO A FAMÍLIA `cilindro-hidraulico`. A família faz o cilindro de dupla ação com olhal nas duas pontas (a camisa fechada atrás
 * por um pescoço e um olhal, a haste com o terminal e outro olhal), a camisa oca com a cabeça e o êmbolo dentro, o eixo em x e 32
 * lados fixos. O cilindro do rascunho não tem olhal: a camisa assenta pelo fundo plano na travessa e a haste acaba numa cabeça em
 * caixa, mais larga que a camisa, que leva as correntes. Faltam à família a fixação por fundo plano, o terminal em cabeça (travessa)
 * e o número de lados; com ela o cilindro teria dois olhais que a referência não mostra.
 *
 * DE ONDE VEM CADA MEDIDA (do rascunho). A vista de frente (`frente.ia.png`) mostra um cilindro só, no centro (colunas 535 a 550), que
 * acaba a uns 1.400 mm do chão com a cabeça e duas correntes de cada lado dela, e o vão aberto acima (é o cilindro de elevação livre,
 * que sobe o carro antes do canal interno: rodada 1 do rascunho, A2, A3 e B3). A vista de cima mostra dois cilindros lado a lado, e
 * vale a de frente. A camisa de Ø 60 vai do assento, a 210 mm do chão, a 1.050; a haste de Ø 36 até 1.400; a cabeça, de 1.400 a 1.440,
 * vai de x -80 a 80 e de 30 mm atrás a 60 mm à frente do eixo do cilindro.
 *
 * O ENCAIXE. A origem é o centro do fundo da camisa; y para cima, +x à esquerda de quem dirige e a frente em +z. A montagem põe o
 * cilindro na torre pela porta `assento` (o fundo da camisa) sobre a porta `assentoDoCilindro` da torre (o disco do assento, rente à
 * face de cima da travessa de baixo), e a relação mede o assento anular.
 *
 * A JUNTA QUE A MONTAGEM AINDA NÃO TEM. A haste e a cabeça sobem ao longo do eixo da camisa (o curso do rascunho é o do carro antes do
 * canal interno); a montagem v5 não tem articulação entre instâncias, e as três partes ficam numa peça, recolhidas.
 *
 * A cadeia: a TABELA em mm; `derivar` calcula os perfis e a porta em mm; `montarCilindroElevacao` escreve os passos em mm num estado
 * { passos, topo, origem }, com `em` levando a origem ao lugar dela (o rascunho da máquina a põe no assento da torre);
 * `gerarPassos` converte para metro com `m()`, campo de medida a campo de medida, num lugar só. */
import { TABELA as CARCACA } from '../carcaca/receita.js';
import { ferramentas } from '../carcaca/receita/ferramentas.js';

export const TABELA = {
  /* As cores do rascunho: a camisa escura, a haste cromada e a cabeça cinza. */
  cores: { camisa: CARCACA.cores.escuro, haste: '#b4b8bc', cabeca: CARCACA.cores.cinza },
  /* Lados dos círculos extrudados. */
  lados: 96,
  /* A camisa: Ø 60, do fundo a 840 mm. */
  camisa: { raio: 30, altura: 840 },
  /* A haste: Ø 36, do topo da camisa a 1.190 mm do fundo. */
  haste: { raio: 18, ate: 1190 },
  /* A cabeça: a caixa de 160 mm de largura e 40 de altura no topo da haste, de 30 mm atrás a 60 mm à frente do eixo. */
  cabeca: { meiaLargura: 80, z: [-30, 60], altura: 40 },
};

const m = (mm) => mm / 1000;

/** Os perfis e a porta, em mm, no referencial do cilindro. */
export function derivar(T = TABELA) {
  const circulo = (r) => Array.from({ length: T.lados }, (_, k) => [r * Math.cos(2 * Math.PI * k / T.lados), r * Math.sin(2 * Math.PI * k / T.lados)]);
  const portas = {
    assento: { forma: 'anel', papel: 'ocupa', eixo: [0, 1, 0], centro: [0, 0, 0], raioInterno: 0, raioExterno: T.camisa.raio, inicio: 0, fim: T.camisa.altura },
  };
  return { circulo, portas };
}

/** Monta o cilindro no estado { passos, topo, origem }, em mm, com a origem levada a `em`, e devolve a origem da porta. */
export function montarCilindroElevacao(estado, T = TABELA, em = [0, 0, 0]) {
  const D = derivar(T);
  const { extY, parte } = ferramentas(estado);
  const [ex, ey, ez] = em;
  const xz = (p) => p.map(([x, z]) => [x + ex, z + ez]);
  const C = T.camisa; const H = T.haste; const K = T.cabeca;
  const camisa = extY(xz(D.circulo(C.raio)), ey, C.altura + ey);
  parte('cilindroElevacao', camisa, T.cores.camisa);
  parte('hasteElevacao', extY(xz(D.circulo(H.raio)), C.altura + ey, H.ate + ey), T.cores.haste);
  const caixa = [[-K.meiaLargura, K.z[0]], [K.meiaLargura, K.z[0]], [K.meiaLargura, K.z[1]], [-K.meiaLargura, K.z[1]]];
  parte('cabecaElevacao', extY(xz(caixa), H.ate + ey, H.ate + K.altura + ey), T.cores.cabeca);
  return { camisa };
}

const MEDIDAS = { extrusao: ['perfil', 'em', 'altura'] };
const MEDIDAS_DA_PORTA = ['centro', 'raioInterno', 'raioExterno', 'inicio', 'fim'];
const emMetro = (v) => (typeof v === 'number' ? m(v) : Array.isArray(v) ? v.map(emMetro) : v);

/** Os PASSOS, em metro: a forma e, no fim, a porta do assento. */
export function gerarPassos(T = TABELA) {
  const estado = { passos: [], topo: {}, origem: 0 };
  const { camisa } = montarCilindroElevacao(estado, T);
  const forma = estado.passos.map(([op, args]) => [op, Object.fromEntries(Object.entries(args).map(([k, v]) => [k, (MEDIDAS[op] ?? []).includes(k) ? emMetro(v) : v]))]);
  const { portas } = derivar(T);
  const porta = (id, de) => ['publicarPorta', { id, de: de.origem, interface: Object.fromEntries(Object.entries(portas[id]).map(([k, v]) => [k, MEDIDAS_DA_PORTA.includes(k) ? emMetro(v) : v])) }];
  return [...forma, porta('assento', camisa)];
}

export const CONTATOS = [
  { par: ['cilindroElevacao', 'hasteElevacao'], motivo: 'a haste sai da face de cima da camisa, a 840 mm do fundo' },
  { par: ['cabecaElevacao', 'hasteElevacao'], motivo: 'a face de baixo da cabeça assenta na ponta da haste, a 1.190 mm do fundo' },
];

const receita = {
  meta: { nome: 'empilhadeira/cilindro-elevacao', desc: 'cilindro de elevação livre da torre da empilhadeira: camisa de Ø 60 sentada na travessa de baixo, haste de Ø 36 e a cabeça das correntes, recolhido' },
  PARAMS: TABELA,
  TOPO: { origem: 'centro do fundo da camisa; y para cima ao longo do eixo do cilindro, +x à esquerda de quem dirige e a frente em +z' },
  PLANO: {
    objeto: 'o cilindro de elevação livre, no centro da torre de uma empilhadeira de 2,5 t, entre os canais: camisa, haste e cabeça das correntes, recolhido',
    referencias: ['../../referencias/frente.ia.png', '../../referencias/cima.ia.png'],
    escala: { medida: 'altura do cilindro recolhido, do fundo da camisa ao topo da cabeça', milimetros: 1230 },
    partes: [
      { nome: 'cilindroElevacao', forma: 'a camisa escura de Ø 60, de pé, do fundo plano a 840 mm', tecnica: 'círculo de 96 lados extrudado em y' },
      { nome: 'hasteElevacao', forma: 'a haste cromada de Ø 36, do topo da camisa a 1.190 mm do fundo', tecnica: 'círculo de 96 lados extrudado em y' },
      { nome: 'cabecaElevacao', forma: 'a cabeça cinza em caixa de 160 mm de largura, 40 de altura e 90 de fundo (30 atrás e 60 à frente do eixo), sobre a ponta da haste', tecnica: 'retângulo extrudado em y' },
    ],
    criteriosDeReprovacao: [
      'o cilindro fora do centro da largura da torre, ou cruzando a travessa de baixo ou o bojo do diferencial',
      'a camisa sem assentar na travessa de baixo',
      'a haste tão grossa quanto a camisa, ou a cabeça mais estreita que ela',
      'cor trocada: a camisa clara ou a haste escura',
    ],
  },
  contatos: CONTATOS,
  /* Os extremos que a TABELA fixa, em mm. */
  get PONTOS() {
    const T = this.PARAMS; const K = T.cabeca; const C = T.camisa;
    return [
      { nome: 'fundo da camisa', parte: 'cilindroElevacao', medida: 'minimo', em: [-C.raio, 0, -C.raio], toleranciaMm: 0.5 },
      { nome: 'topo da cabeça', parte: 'cabecaElevacao', medida: 'maximo', em: [K.meiaLargura, T.haste.ate + K.altura, K.z[1]], toleranciaMm: 0.5 },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
