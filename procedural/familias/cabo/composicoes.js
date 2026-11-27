/* composicoes.js — as composições da família `cabo`: o tubo de seção circular ao longo do caminho, pelo `friso` de polilinha com
   uma normal por estação (o quadro sem torção que `caminho.js` calcula), uma composição para cada número de estações da escada
   (`ESCADA_DE_ESTACOES`), porque a composição tem um número fixo de pontos. A parte é `cabo`. As portas são `ponta-a` e `ponta-b`,
   cilindros externos do diâmetro do cabo, no plano da tampa de cada ponta e com o eixo na direção em que o cabo sai dela.

   Os acessórios (a capa cilíndrica, o anel do olhal e o anel da braçadeira) são duas composições próprias, `cabo.capa` e `cabo.anel`, que `cabo()` (`pedido.js`) chama junto
   com o cabo, e não nós do cabo: uma composição por combinação de acessórios multiplicava o registro por 27. O id de origem e o nome da parte de cada uma são parâmetros, porque
   a receita pode ter vários (dois terminais e duas braçadeiras). Elas não publicam porta. */
import { FORMATO_COMPOSICAO_PROCEDURAL } from '../../nucleo/entrada.js';
import { ESCADA_DE_ESTACOES } from './caminho.js';
import { LADOS_DO_ACESSORIO, LADOS_DO_FIO, PONTOS_DO_ANEL } from './acessorios.js';

export const ID_DO_CABO = (estacoes) => `cabo.${estacoes}-estacoes`;
export const ID_DA_CAPA = 'cabo.capa';
export const ID_DO_ANEL = 'cabo.anel';
const p = (nome) => ({ parametro: nome });
const SAI = ['mecanifica.malha-poligonal@1', 'mecanifica.parte@1', 'mecanifica.porta@1'];

const porta = (lado, nome, referencia) => ({
  id: `porta-${nome}`, operacao: 'publicarPorta',
  argumentos: { id: nome, de: { op: 'friso', id: 10, parte: 'pontas' }, interface: { forma: 'cilindro', papel: 'externa', eixo: p(`${lado}Eixo`), referencia: p(referencia), centro: p(`${lado}Centro`), raio: p('raio'), inicio: 0, fim: p(`${lado}Fim`) } },
});

function composicao(estacoes) {
  const indices = Array.from({ length: estacoes }, (_, k) => k);
  return Object.freeze({
    formato: FORMATO_COMPOSICAO_PROCEDURAL, id: ID_DO_CABO(estacoes), versao: '1.0.0',
    parametros: {
      raio: { tipo: 'numero' }, segmentosArco: { tipo: 'inteiro' },
      ...Object.fromEntries(indices.flatMap((k) => [[`p${k}`, { tipo: 'vetor3' }], [`n${k}`, { tipo: 'vetor3' }]])),
      aCentro: { tipo: 'vetor3' }, aEixo: { tipo: 'vetor3' }, aFim: { tipo: 'numero' }, bCentro: { tipo: 'vetor3' }, bEixo: { tipo: 'vetor3' }, bFim: { tipo: 'numero' },
    },
    artefatos: { entra: [], sai: SAI },
    nos: [
      { id: 'cabo', operacao: 'friso', argumentos: { origemId: 10, linha: { nome: 'cabo', pontos: indices.map((k) => p(`p${k}`)) }, normais: indices.map((k) => p(`n${k}`)), perfil: { circulo: { raio: p('raio') } }, segmentosArco: p('segmentosArco') } },
      { id: 'parte', operacao: 'parte', argumentos: { nome: 'cabo', sel: { origem: { op: 'friso', id: 10 } } } },
      porta('a', 'ponta-a', 'n0'),
      porta('b', 'ponta-b', `n${estacoes - 1}`),
    ],
  });
}

const SAI_SEM_PORTA = ['mecanifica.malha-poligonal@1', 'mecanifica.parte@1'];
/* a capa: um cilindro entre dois pontos, o friso reto de perfil circular */
const capa = Object.freeze({
  formato: FORMATO_COMPOSICAO_PROCEDURAL, id: ID_DA_CAPA, versao: '1.0.0',
  parametros: { origem: { tipo: 'inteiro' }, nome: { tipo: 'texto' }, p0: { tipo: 'vetor3' }, p1: { tipo: 'vetor3' }, normal: { tipo: 'vetor3' }, raio: { tipo: 'numero' } },
  artefatos: { entra: [], sai: SAI_SEM_PORTA },
  nos: [
    { id: 'capa', operacao: 'friso', argumentos: { origemId: p('origem'), linha: { nome: p('nome'), pontos: [p('p0'), p('p1')] }, normal: p('normal'), perfil: { circulo: { raio: p('raio') } }, segmentosArco: LADOS_DO_ACESSORIO / 4 } },
    { id: 'parte', operacao: 'parte', argumentos: { nome: p('nome'), sel: { origem: { op: 'friso', id: p('origem') } } } },
  ],
});

/* o anel de fio redondo: uma volta fechada de PONTOS_DO_ANEL pontos (o último repete o primeiro), com a normal do eixo do anel e o círculo do fio como perfil */
const anel = Object.freeze({
  formato: FORMATO_COMPOSICAO_PROCEDURAL, id: ID_DO_ANEL, versao: '1.0.0',
  parametros: {
    origem: { tipo: 'inteiro' }, nome: { tipo: 'texto' }, normal: { tipo: 'vetor3' }, fio: { tipo: 'numero' },
    ...Object.fromEntries(Array.from({ length: PONTOS_DO_ANEL + 1 }, (_, k) => [`q${k}`, { tipo: 'vetor3' }])),
  },
  artefatos: { entra: [], sai: SAI_SEM_PORTA },
  nos: [
    { id: 'anel', operacao: 'friso', argumentos: { origemId: p('origem'), linha: { nome: p('nome'), pontos: Array.from({ length: PONTOS_DO_ANEL + 1 }, (_, k) => p(`q${k}`)) }, normal: p('normal'), perfil: { circulo: { raio: p('fio') } }, segmentosArco: LADOS_DO_FIO / 4 } },
    { id: 'parte', operacao: 'parte', argumentos: { nome: p('nome'), sel: { origem: { op: 'friso', id: p('origem') } } } },
  ],
});

export const COMPOSICOES = Object.freeze([...ESCADA_DE_ESTACOES.map(composicao), capa, anel]);
