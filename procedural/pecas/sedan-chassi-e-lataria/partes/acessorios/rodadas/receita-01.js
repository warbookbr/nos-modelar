/* sedan-chassi-e-lataria/acessorios — os dois retrovisores e as quatro maçanetas do sedã, os acessórios simples que o ciclo 5 pôs sobre as portas.
 *
 * Etapa 5 de 5 da montagem `../../montagem.json` (item 5 das partes do `../../ALINHAMENTO.md`). A forma é a do esboço do carro inteiro
 * (`../../alta-definicao/carro-inteiro.esboco.mjs`): o retrovisor é uma barra de laços ao longo de x, com raio de 6 mm nas quatro quinas e 5
 * mm na ponta de fora, o pé 11 mm dentro da porta dianteira; a maçaneta é uma caixa de 110 por 22 mm que sai 11 mm da porta e entra 3 mm nela, sem o
 * rebaixo de fundo fechado atrás dela (que fica para a operação de rebaixo por contorno). Os passos são os do esboço, recortados por
 * `../_comum/recorte.mjs`.
 *
 * O ENCAIXE. Os acessórios assentam no plano da quina do ombro (a porta `naLinhaDoOmbro`, normal para baixo, e a `paraOsAcessorios` da carroceria,
 * normal para cima), no mesmo ponto: a pose sai identidade. A entrada do pé do retrovisor e da maçaneta na chapa da porta é medida na montagem.
 *
 * A cadeia: a TABELA em mm (o ponto do encaixe); `derivar` calcula a interface; `gerarPassos` põe o recorte, em metro, e a porta. */
import { ETAPAS, ENCAIXES, RETROVISOR, interfaceDoEncaixe, parteDoPlano, portasEmMetro, recorteDaEtapa } from '../../_comum/sedan.mjs';

const ETAPA = 'acessorios';

export const TABELA = {
  encaixe: { ponto: ENCAIXES[ETAPA].ponto },
  /* a tolerância dos PONTOS: os extremos do retrovisor são pontos de controle em quina viva da gaiola, onde a superfície passa por eles (medido: desvio 0) */
  folgaDaSubdivisao: 0.5,
};

/** A interface da porta, em mm. */
export function derivar(Tab = TABELA) {
  return { portas: { [ENCAIXES[ETAPA].filha]: { ...interfaceDoEncaixe(ETAPA, 'filha'), ponto: Tab.encaixe.ponto } } };
}

/** Os PASSOS, em metro: o recorte do esboço e a porta do encaixe. */
export function gerarPassos(Tab = TABELA) {
  const { passos } = recorteDaEtapa(ETAPA);
  const { portas } = derivar(Tab);
  return [...passos, ...portasEmMetro(passos, Object.fromEntries(Object.entries(portas).map(([id, i]) => [id, { parte: ETAPAS[ETAPA][0], interface: i }])))];
}

/** Os pontos nomeados das gaiolas do retrovisor, em metro. */
export function gerarTopo() { return recorteDaEtapa(ETAPA).topo; }

const receita = {
  meta: { nome: 'sedan-chassi-e-lataria/acessorios', desc: 'os dois retrovisores de laços e as quatro maçanetas do sedã' },
  PARAMS: TABELA,
  get TOPO() { return { origem: 'o centro do carro no chão: x lateral com a direita em +x, y para cima, a frente em +z', ...gerarTopo() }; },
  PLANO: {
    objeto: 'os acessórios de um sedã de quatro portas de 4,4 m: um retrovisor de cada lado, na porta dianteira, e uma maçaneta em cada uma das quatro portas',
    referencias: ['../../referencias/sedan-chassi-e-lataria.contornos.json'],
    escala: { medida: 'comprimento total do sedã, de z -2200 a 2200', milimetros: 4400 },
    partes: ETAPAS[ETAPA].map(parteDoPlano),
    criteriosDeReprovacao: [
      'o retrovisor que não é a imagem do outro, ou com quina viva no lugar do raio de 6 mm',
      'a maçaneta solta da porta, ou saindo mais de 11 mm dela',
    ],
    lataria: { partes: ['retrovisorDir', 'retrovisorEsq'] },
  },
  contatos: [],
  /* o pé do retrovisor e a maçaneta entram na chapa da porta, que é da peça carroceria; aqui cada um é um grupo solto */
  ilhas: ETAPAS[ETAPA].filter((n) => n !== 'retrovisorDir').map((contem) => ({ contem, motivo: 'o pé do retrovisor e a maçaneta entram na chapa da porta, que é da peça carroceria; nesta peça cada acessório é um grupo solto' })),
  /* Os extremos do retrovisor da direita são os dos pontos de controle da gaiola, e os do esquerdo são a imagem deles. */
  /* as partes soltas de propósito, para `vao:partes --soltas=recusar` */
  APOIA: Object.fromEntries(ETAPAS[ETAPA].map((n) => [n, 'o pé do retrovisor e a maçaneta entram na chapa da porta, que é da peça carroceria; nesta peça cada acessório fica solto'])),
  get PONTOS() {
    const pts = Object.values(RETROVISOR.pontosMm);
    const ext = (k, f) => f(...pts.map((p) => p[k]));
    const tol = this.PARAMS.folgaDaSubdivisao;
    return [
      { nome: 'retrovisor direito, o canto de fora, de cima e da frente', parte: 'retrovisorDir', medida: 'maximo', em: [ext(0, Math.max), ext(1, Math.max), ext(2, Math.max)], toleranciaMm: tol },
      { nome: 'retrovisor esquerdo, o canto de fora, de baixo e de trás', parte: 'retrovisorEsq', medida: 'minimo', em: [-ext(0, Math.max), ext(1, Math.min), ext(2, Math.min)], toleranciaMm: tol },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
