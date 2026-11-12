/* sedan-chassi-e-lataria/rodas — as quatro rodas do sedã, cada uma de pneu, aro, disco e cubo, pela família roda-pneu: pneu de 728 mm de diâmetro e 205 de banda.
 *
 * Etapa 4 de 5 da montagem `../../montagem.json` (item 4 das partes do `../../ALINHAMENTO.md`). A forma é a do rascunho facetado no modo
 * `chassi` (`../../referencias/sedan-chassi-e-lataria.esboco.mjs`, a chamada de `instanciaDeFamilia` com as quatro poses), como o esboço do carro
 * inteiro a carrega, recortada por `../_comum/recorte.mjs`; a conversão para metro é a do esboço 2.0.
 *
 * O ENCAIXE. As rodas assentam no plano da altura do centro delas (a porta `noEixo`, normal para baixo, e a `paraAsRodas` da carroceria, normal
 * para cima), no mesmo ponto: a pose sai identidade, porque o esboço escreve o carro inteiro num referencial só. As portas de giro (o furo do
 * cubo no eixo) não são publicadas: a roda do sedã é parada, o eixo é do chassi na peça carroceria, e o cubo se prende nele sem junta modelada.
 *
 * A cadeia: a TABELA em mm (o ponto do encaixe); `derivar` calcula a interface; `gerarPassos` põe o recorte, em metro, e a porta. */
import { ETAPAS, ENCAIXES, FACETADO, contatosDaEtapa, folgasDaEtapa, interfaceDoEncaixe, parteDoPlano, portasEmMetro, recorteDaEtapa } from '../_comum/sedan.mjs';

const ETAPA = 'rodas';

export const TABELA = {
  encaixe: { ponto: ENCAIXES[ETAPA].ponto },
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

/** Os pontos nomeados, em metro: as rodas não têm gaiola. */
export function gerarTopo() { return recorteDaEtapa(ETAPA).topo; }

const receita = {
  meta: { nome: 'sedan-chassi-e-lataria/rodas', desc: 'as quatro rodas do sedã pela família roda-pneu: pneu de 728 mm e 205 de banda, aro, disco e cubo' },
  PARAMS: TABELA,
  get TOPO() { return { origem: 'o centro do carro no chão: x lateral com a direita em +x, y para cima, a frente em +z', ...gerarTopo() }; },
  PLANO: {
    objeto: 'as quatro rodas de um sedã de quatro portas de 4,4 m: pneu de 728 mm de diâmetro e 205 de banda, aro, disco e cubo, com os centros em x ±807,5 e z 1249 e -1181',
    referencias: ['../../referencias/sedan-chassi-e-lataria.contornos.json'],
    escala: { medida: 'comprimento total do sedã, de z -2200 a 2200', milimetros: 4400 },
    familiaProcedural: 'roda-pneu',
    partes: ETAPAS[ETAPA].map(parteDoPlano),
    criteriosDeReprovacao: [
      'o pneu fora de 728 mm de diâmetro por 205 de banda, ou fora do chão em y 0',
      'a roda fora do centro do arco, ou o par de um eixo com um dos lados diferente do outro',
      'o pneu tocando a lataria ou a caixa de roda',
    ],
    lataria: { dispensa: 'as rodas são pneu e aro de revolução da família roda-pneu, e não chapa de lataria' },
  },
  contatos: contatosDaEtapa(ETAPA),
  FOLGAS: folgasDaEtapa(ETAPA),
  /* cada roda toca só as próprias partes: as quatro rodas são grupos separados, presos no eixo do chassi, que é da peça carroceria */
  ilhas: ETAPAS[ETAPA].filter((n) => /^pneu/.test(n) && n !== 'pneuDianteiraDir').map((contem) => ({ contem, motivo: 'a roda gira no eixo do chassi, que é da peça carroceria; nesta peça cada roda é um grupo separado das outras três' })),
  /* Os extremos que a tabela do rascunho fixa: o pneu da frente à direita (centro em x 807,5, banda de 205, raio de 364) e o de trás à esquerda. */
  get PONTOS() {
    const R = FACETADO.roda;
    return [
      { nome: 'pneu dianteiro direito, o canto de fora e de cima', parte: 'pneuDianteiraDir', medida: 'maximo', em: [R.xCentro + R.largura / 2, 2 * R.raio, R.zFrente + R.raio], toleranciaMm: 1 },
      { nome: 'pneu traseiro esquerdo, o canto de fora e de baixo', parte: 'pneuTraseiraEsq', medida: 'minimo', em: [-(R.xCentro + R.largura / 2), 0, R.zTras - R.raio], toleranciaMm: 1 },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
