/* sedan-chassi-e-lataria/vidros — os oito vidros do sedã: o para-brisa e o vidro traseiro, que vão de um lado ao outro, e o vidro da porta
 * dianteira, o da porta traseira e a vigia de cada lado, cada um uma chapa de 4 mm que passa 12 mm da borda do vão por baixo da chapa do teto.
 *
 * Etapa 2 de 5 da montagem `../../montagem.json` (item 2 das partes do `../../ALINHAMENTO.md`). A forma é a do esboço do carro inteiro
 * (`../../alta-definicao/andar-de-cima.esboco.mjs`, ciclo 3, com a simetria do ciclo 5): os passos são os do esboço, recortados por
 * `../_comum/recorte.mjs`, de modo que a malha de cada vidro é a que ele tem no carro inteiro, e a conversão para metro é a do esboço 2.0.
 *
 * O ENCAIXE. Os vidros assentam no plano da quina do ombro (a porta `naCarroceria` normal para baixo, a `paraOsVidros` da carroceria normal
 * para cima), no mesmo ponto: a pose sai identidade, porque o esboço escreve o carro inteiro num referencial só. O ponto vem do alvo, e o
 * vidro que cruza o teto (o contato com o vão) é medido na montagem, onde o teto está.
 *
 * A cadeia: a TABELA em mm (o ponto do encaixe); `derivar` calcula a interface da porta; `gerarPassos` põe os passos do recorte, em metro, e a
 * porta. */
import { ETAPAS, ENCAIXES, interfaceDoEncaixe, parteDoPlano, portasEmMetro, recorteDaEtapa } from '../../_comum/sedan.mjs';
import { C, zDoParaBrisa, zDoVidroTraseiro } from '../../../alta-definicao/alvo.mjs';

const ETAPA = 'vidros';

export const TABELA = {
  /* o plano de encaixe na carroceria: o ponto vem do alvo (a quina do ombro) */
  encaixe: { ponto: ENCAIXES[ETAPA].ponto },
};

/** A interface da porta, em mm. */
export function derivar(Tab = TABELA) {
  const i = interfaceDoEncaixe(ETAPA, 'filha');
  return { portas: { [ENCAIXES[ETAPA].filha]: { ...i, ponto: Tab.encaixe.ponto } } };
}

/** Os PASSOS, em metro: o recorte do esboço e a porta do encaixe. */
export function gerarPassos(Tab = TABELA) {
  const { passos } = recorteDaEtapa(ETAPA);
  const { portas } = derivar(Tab);
  return [...passos, ...portasEmMetro(passos, Object.fromEntries(Object.entries(portas).map(([id, interface_]) => [id, { parte: ETAPAS[ETAPA][0], interface: interface_ }])))];
}

/** Os pontos nomeados das gaiolas, em metro. */
export function gerarTopo() { return recorteDaEtapa(ETAPA).topo; }

const receita = {
  meta: { nome: 'sedan-chassi-e-lataria/vidros', desc: 'os oito vidros do sedã: para-brisa, vidro traseiro, e o vidro da porta dianteira, o da traseira e a vigia de cada lado' },
  PARAMS: TABELA,
  get TOPO() { return { origem: 'o centro do carro no chão: x lateral com a direita em +x, y para cima, a frente em +z', ...gerarTopo() }; },
  PLANO: {
    objeto: 'os oito vidros de um sedã de 4,4 m, chapas de 4 mm por dentro da borda dos vãos; o anel escuro em volta de cada um é a moldura de borracha da carroceria (14 por 3 mm), e não parte do vidro',
    referencias: ['../../referencias/sedan-chassi-e-lataria.contornos.json'],
    escala: { medida: 'comprimento total do sedã, de z -2200 a 2200', milimetros: 4400 },
    partes: ETAPAS[ETAPA].map(parteDoPlano),
    criteriosDeReprovacao: [
      'um vidro que não passa por dentro da chapa, 12 mm além da borda do vão, ou que a atravessa para fora; o encosto na face de dentro da borda é o esperado',
      'o vidro do lado esquerdo que não é a imagem do direito',
      'o para-brisa ou o vidro traseiro com costura no eixo do carro',
    ],
    lataria: { partes: ETAPAS[ETAPA] },
  },
  contatos: [],
  /* cada vidro se prende no teto, outra peça da montagem (a moldura e a chapa do vão o tocam por cima), e nesta peça fica solto de propósito */
  ilhas: ETAPAS[ETAPA].filter((n) => n !== 'paraBrisa').map((contem) => ({ contem, motivo: 'o vidro passa por dentro da chapa, 12 mm além da borda do vão do teto, e é colado nele, que é da peça carroceria; nesta peça ele fica solto' })),
  /* O centro do para-brisa e o do vidro traseiro, de um lado ao outro (x 0 pela simetria), na altura e no z que a TABELA do alvo dá ao meio de cada um:
     a caixa deles passa até a sobra de 12 mm da borda do vão, e a tolerância é essa sobra com 3 mm de margem. */
  /* as partes soltas de propósito, para `vao:partes --soltas=recusar`: cada vidro se prende no teto, da peça carroceria */
  APOIA: Object.fromEntries(ETAPAS[ETAPA].map((n) => [n, 'o vidro passa por dentro da chapa, 12 mm além da borda do vão do teto, e é colado nele, que é da peça carroceria; nesta peça ele fica solto'])),
  get PONTOS() {
    const S = C.vidro.sobra + 3;
    const meio = (v, z) => [0, (v.y0 + v.y1) / 2, (z(v.y0) + z(v.y1)) / 2];
    return [
      { nome: 'centro do para-brisa', parte: 'paraBrisa', medida: 'centro', em: meio(C.paraBrisa, zDoParaBrisa), toleranciaMm: S },
      { nome: 'centro do vidro traseiro', parte: 'vidroTraseiro', medida: 'centro', em: meio(C.vidroTraseiro, zDoVidroTraseiro), toleranciaMm: S },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
