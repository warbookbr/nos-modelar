/* sedan-chassi-e-lataria/frente-e-traseira — o painel da frente com a grade e os vãos de farol, o painel de trás com os vãos de lanterna, as lentes, os
 * dois para-choques de ponta a ponta, a tomada de ar sobre o capô e as cinco lâminas da grade.
 *
 * Etapa 3 de 5 da montagem `../../montagem.json` (item 3 das partes do `../../ALINHAMENTO.md`). A forma é a do esboço do carro inteiro
 * (`../../alta-definicao/frente-e-traseira.esboco.mjs`, ciclo 4, com a simetria e os para-choques do ciclo 5): os passos são os do esboço,
 * recortados por `../_comum/recorte.mjs`, de modo que a malha de cada parte é a que ela tem no carro inteiro. Cada painel é uma gaiola por estações
 * ao longo de x no plano da borda da chapa de baixo, a 4 mm do capô e da tampa por cima e dos para-lamas e das laterais dos lados; o farol e a
 * lanterna são rebaixos por relevo com a lente que o anel devolve; os para-choques são gaiolas por laços com o raio no laço da ponta.
 *
 * O ENCAIXE. A frente assenta no plano da borda da frente da chapa de baixo, z 2118 (a porta `naBordaDaFrente`, normal para -z, e a
 * `paraOPainelDianteiro` da carroceria, normal para +z), no mesmo ponto: a pose sai identidade. O vão de 4 mm do painel com o capô, os para-lamas e
 * as laterais, e a tomada de ar sobre o capô, são medidos na montagem, onde a carroceria está.
 *
 * A cadeia: a TABELA em mm (o ponto do encaixe); `derivar` calcula a interface; `gerarPassos` põe o recorte, em metro, e a porta. */
import { ETAPAS, ENCAIXES, F, PAINEL_DA_FRENTE, PAINEL_DE_TRAS, contatosDaEtapa, folgasDaEtapa, interfaceDoEncaixe, parteDoPlano, portasEmMetro, recorteDaEtapa } from '../_comum/sedan.mjs';
import { T } from '../../alta-definicao/alvo.mjs';

const ETAPA = 'frente-e-traseira';

export const TABELA = {
  encaixe: { ponto: ENCAIXES[ETAPA].ponto },
  /* a tolerância dos PONTOS dos para-choques: a subdivisão deixa o extremo da barra até 3 mm dentro dos laços (raio de 8 mm nas quinas) */
  folgaDaSubdivisao: 3,
};

/** A interface da porta, em mm. */
export function derivar(Tab = TABELA) {
  return { portas: { [ENCAIXES[ETAPA].filha]: { ...interfaceDoEncaixe(ETAPA, 'filha'), ponto: Tab.encaixe.ponto } } };
}

/** Os PASSOS, em metro: o recorte do esboço e a porta do encaixe. */
export function gerarPassos(Tab = TABELA) {
  const { passos } = recorteDaEtapa(ETAPA);
  const { portas } = derivar(Tab);
  return [...passos, ...portasEmMetro(passos, Object.fromEntries(Object.entries(portas).map(([id, i]) => [id, { parte: 'painelDianteiro', interface: i }])))];
}

/** Os pontos nomeados das gaiolas, em metro. */
export function gerarTopo() { return recorteDaEtapa(ETAPA).topo; }

const receita = {
  meta: { nome: 'sedan-chassi-e-lataria/frente-e-traseira', desc: 'a frente e a traseira do sedã: painéis com grade, faróis e lanternas em rebaixo, lentes, para-choques de ponta a ponta, tomada de ar e lâminas da grade' },
  PARAMS: TABELA,
  get TOPO() { return { origem: 'o centro do carro no chão: x lateral com a direita em +x, y para cima, a frente em +z', ...gerarTopo() }; },
  PLANO: {
    objeto: 'a frente e a traseira de um sedã de 4,4 m: painéis de 1 mm com grade e rebaixos de farol e lanterna, lentes, para-choques de ponta a ponta e tomada de ar do capô',
    referencias: ['../../referencias/sedan-chassi-e-lataria.contornos.json'],
    escala: { medida: 'comprimento total do sedã, de z -2200 a 2200', milimetros: 4400 },
    partes: ETAPAS[ETAPA].map(parteDoPlano),
    criteriosDeReprovacao: [
      'o para-choque que não vai de ponta a ponta, com costura no eixo, ou com a ponta em quina viva no lugar do raio de 6 mm',
      'a lente do farol ou da lanterna fora da abertura do rebaixo, ou atravessando a chapa do painel',
      'o painel da frente ou o de trás a mais de 4,2 mm do capô, da tampa, dos para-lamas ou das laterais',
      'a grade sem as cinco lâminas, ou com as lâminas soltas atrás do vão',
      'o lado esquerdo que não é a imagem do direito',
    ],
    lataria: { partes: ['painelDianteiro', 'painelTraseiro', 'paraChoqueDianteiro', 'paraChoqueTraseiro', 'tomadaDeAr'] },
  },
  contatos: contatosDaEtapa(ETAPA),
  FOLGAS: folgasDaEtapa(ETAPA),
  /* Os grupos soltos desta peça, que a carroceria prende: o painel de trás com as lanternas fica a 4 mm das laterais e da tampa, e cada para-choque a 4 mm do painel, preso
     pelos suportes do chassi, e a tomada de ar assenta no capô (os três ficam fora do grupo da frente). */
  ilhas: [
    { contem: 'painelTraseiro', motivo: 'o painel de trás com as lanternas fica a 4 mm das laterais e da tampa, que são da peça carroceria; nesta peça é um grupo à parte do da frente' },
    { contem: 'paraChoqueDianteiro', motivo: 'o para-choque da frente fica a 4 mm do painel e é preso pelos suportes do chassi, da peça carroceria; o parafuso fica fora do modelo' },
    { contem: 'paraChoqueTraseiro', motivo: 'o para-choque de trás fica a 4 mm do painel e é preso pelos suportes do chassi, da peça carroceria; o parafuso fica fora do modelo' },
    { contem: 'tomadaDeAr', motivo: 'a tomada de ar assenta no capô, da peça carroceria, com a borda 1 mm dentro da chapa dele' },
  ],
  /* As aberturas dos painéis: a grade, que vai até o eixo, e os rebaixos de farol e de lanterna, abertos para a lente que cada um leva. Nenhuma leva moldura. */
  get vaos() {
    return [
      { nome: 'grade', borda: PAINEL_DA_FRENTE.bordaDoVao('grade'), semMoldura: { motivo: 'a grade é o vão aberto até o eixo, com as cinco lâminas atrás dele; o desenho não tem moldura em volta' } },
      { nome: 'farol', borda: PAINEL_DA_FRENTE.bordaDoVao('farol'), semMoldura: { motivo: 'o farol é um rebaixo de 14 mm com a lente atrás da abertura; o desenho não tem moldura em volta' } },
      { nome: 'lanterna', borda: PAINEL_DE_TRAS.bordaDoVao('lanterna'), semMoldura: { motivo: 'a lanterna é um rebaixo de 14 mm com a lente atrás da abertura; o desenho não tem moldura em volta' } },
    ];
  },
  /* Os extremos que a tabela do desenho fixa: o para-choque da frente na ponta (x 860, topo y 745, fundo z 2118 + 4 mm de vão + 72) e o de trás. */
  get PONTOS() {
    const P = F.paraChoque; const tol = this.PARAMS.folgaDaSubdivisao;
    return [
      { nome: 'para-choque dianteiro, a ponta de cima e da frente', parte: 'paraChoqueDianteiro', medida: 'maximo', em: [P.frente.ponta, P.frente.y[1], T.zBico + T.vao + P.frente.fundo], toleranciaMm: tol },
      { nome: 'para-choque traseiro, a ponta de baixo e de trás', parte: 'paraChoqueTraseiro', medida: 'minimo', em: [-P.tras.ponta, P.tras.y[0], T.zTraseira - T.vao - P.tras.fundo], toleranciaMm: tol },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
