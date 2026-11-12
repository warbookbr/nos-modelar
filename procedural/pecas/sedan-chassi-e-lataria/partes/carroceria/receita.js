/* sedan-chassi-e-lataria/carroceria — a carroceria do sedã sem frente, traseira, vidros, rodas e acessórios: os painéis da lataria de baixo cortados
 * da chapa (capô, para-lamas, portas, laterais traseiras, soleiras, tampa do porta-malas e os lábios dos arcos), o teto com as colunas e as molduras
 * dos vãos, e o chassi aparado por essas duas chapas (34 membros e os dois eixos).
 *
 * Etapa 1 de 5 da montagem `../../montagem.json` (item 1 das partes do `../../ALINHAMENTO.md`). A forma é a do esboço do carro inteiro com o chassi
 * aparado (`../../alta-definicao/chassi-aparado.esboco.mjs`, que encadeia `caminho-a-gaiola-da-casca`, `andar-de-cima` e o chassi do rascunho
 * facetado): os passos são os do esboço, recortados por `../_comum/recorte.mjs`, de modo que a malha de cada parte é a que ela tem no carro inteiro, e a
 * conversão para metro é a do esboço 2.0. A chapa de baixo e a do teto são gaiolas por estações com simetria em x, e o corte em painéis é um
 * `paineisPorVaos` com as linhas de vão tiradas da própria gaiola, em modo superfície, a 4 mm.
 *
 * POR QUE O CHASSI NÃO É UMA ETAPA À PARTE. O `aparar` corta cada membro pelo lado de dentro de uma chapa de `subdivisao` e lê a chapa que a própria
 * peça executou. A chapa fica na peça com as faces dela: se não for uma parte, são 141.704 faces sem identidade, e o núcleo não tem como pôr um
 * passo de ferramenta que não deixa faces. Na lataria de baixo e no teto a chapa já é parte (os painéis cortados dela e o teto), e por isso os membros
 * do chassi, que são aparados por essas duas chapas, moram na mesma peça.
 *
 * OS ENCAIXES. A carroceria é a base e a montagem a põe sem pose. Ela publica um plano para cada etapa filha, no referencial do carro: a quina do
 * ombro (y 890) para os vidros e para os acessórios, a borda da frente da chapa de baixo (z 2118) para a frente e a traseira, e a altura do centro das
 * rodas (y 364) para as rodas; cada filha publica o mesmo plano com a normal oposta, e a pose sai identidade.
 *
 * A cadeia: a TABELA em mm (os pontos dos encaixes); `derivar` calcula as interfaces das portas; `gerarPassos` põe o recorte, em metro, e as portas. */
import { ETAPAS, ENCAIXES, FACETADO, contatosDaEtapa, apoiaDaEtapa, folgasDaEtapa, interfaceDoEncaixe, parteDoPlano, portasEmMetro, recorteDaEtapa } from '../_comum/sedan.mjs';
import { C, T, topoY, yQuina, yTopoDaCabine } from '../../alta-definicao/alvo.mjs';

const ETAPA = 'carroceria';
const FILHAS = ['vidros', 'frente-e-traseira', 'rodas', 'acessorios'];

export const TABELA = {
  /* os pontos dos encaixes das etapas filhas, do alvo */
  encaixes: Object.fromEntries(FILHAS.map((f) => [f, ENCAIXES[f].ponto])),
};

/** As interfaces das quatro portas que a carroceria publica, em mm. */
export function derivar(Tab = TABELA) {
  return { portas: Object.fromEntries(FILHAS.map((f) => [ENCAIXES[f].pai, { ...interfaceDoEncaixe(f, 'pai'), ponto: Tab.encaixes[f] }])) };
}

/** Os PASSOS, em metro: o recorte do esboço e as portas dos encaixes. */
export function gerarPassos(Tab = TABELA) {
  const { passos } = recorteDaEtapa(ETAPA);
  const { portas } = derivar(Tab);
  return [...passos, ...portasEmMetro(passos, Object.fromEntries(Object.entries(portas).map(([id, i]) => [id, { parte: 'capo', interface: i }])))];
}

/** Os pontos nomeados das gaiolas, em metro. */
export function gerarTopo() { return recorteDaEtapa(ETAPA).topo; }

const receita = {
  meta: { nome: 'sedan-chassi-e-lataria/carroceria', desc: 'a carroceria do sedã: lataria de baixo em painéis, teto com molduras e o chassi aparado por essas duas chapas' },
  PARAMS: TABELA,
  get TOPO() { return { origem: 'o centro do carro no chão: x lateral com a direita em +x, y para cima, a frente em +z', ...gerarTopo() }; },
  PLANO: {
    objeto: 'a carroceria de um sedã de 4,4 m sem frente, traseira, vidros e rodas: painéis de chapa de 1 mm a 4 mm de vão, teto com colunas e molduras, e o chassi de plataforma aparado pela lataria',
    referencias: ['../../referencias/sedan-chassi-e-lataria.contornos.json'],
    escala: { medida: 'comprimento total do sedã, de z -2200 a 2200', milimetros: 4400 },
    partes: ETAPAS[ETAPA].map(parteDoPlano),
    criteriosDeReprovacao: [
      'um vão entre painéis fora de 4,0 a 4,2 mm, ou os dois lados do carro com vãos diferentes',
      'o capô, a tampa ou o teto com costura ou degrau no eixo do carro',
      'um membro do chassi atravessando a pele de dentro da lataria, ou solto dela por mais de 0,5 mm onde o plano o apoia',
      'a quina do ombro, da cintura ou do teto em quina viva no lugar do raio pedido',
      'um vão entre painéis que deixa ver o outro lado do carro por trás dele',
    ],
    lataria: { partes: ['capo', 'paraLamaDir', 'paraLamaEsq', 'portaDianteiraDir', 'portaDianteiraEsq', 'portaTraseiraDir', 'portaTraseiraEsq', 'lateralTraseiraDir', 'lateralTraseiraEsq', 'soleiraDir', 'soleiraEsq', 'tampaDoPortaMalas', 'teto'] },
  },
  contatos: contatosDaEtapa(ETAPA),
  FOLGAS: folgasDaEtapa(ETAPA),
  APOIA: apoiaDaEtapa(ETAPA),
  ilhas: [],
  /* Os extremos que a tabela do alvo e a do rascunho fixam: o eixo da frente (de x -870 a 870, raio 30, centro em y 364 e z 1249), o de trás, e o alto e o pé do teto. */
  get PONTOS() {
    const E = FACETADO.eixoRaio; const R = FACETADO.roda;
    const zs = Array.from({ length: 401 }, (_, k) => C.zTras + ((C.zFrente - C.zTras) * k) / 400);
    return [
      { nome: 'eixo dianteiro, a ponta de fora, de cima e da frente', parte: 'eixoDianteiro', medida: 'maximo', em: [FACETADO.eixoMeia, R.raio + E, R.zFrente + E], toleranciaMm: 1 },
      { nome: 'eixo traseiro, a ponta de fora, de baixo e de trás', parte: 'eixoTraseiro', medida: 'minimo', em: [-FACETADO.eixoMeia, R.raio - E, R.zTras - E], toleranciaMm: 1 },
      { nome: 'teto, a quina do pé do para-brisa e o alto', parte: 'teto', medida: 'maximo', em: [C.xPe, Math.max(...zs.map((z) => yTopoDaCabine(0, z))), C.zFrente], toleranciaMm: 3 },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};
void topoY; void yQuina; void T;

export default receita;
