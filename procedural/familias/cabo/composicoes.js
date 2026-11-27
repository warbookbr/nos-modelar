/* composicoes.js — as composições da família `cabo`: o tubo de seção circular ao longo do caminho, pelo `friso` de polilinha com
   uma normal por estação (o quadro sem torção que `caminho.js` calcula), uma composição para cada número de estações da escada
   (`ESCADA_DE_ESTACOES`), porque a composição tem um número fixo de pontos. A parte é `cabo`. As portas são `ponta-a` e `ponta-b`,
   cilindros externos do diâmetro do cabo, no plano da tampa de cada ponta e com o eixo na direção em que o cabo sai dela. */
import { FORMATO_COMPOSICAO_PROCEDURAL } from '../../nucleo/entrada.js';
import { ESCADA_DE_ESTACOES } from './caminho.js';

export const ID_DO_CABO = (estacoes) => `cabo.${estacoes}-estacoes`;
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

export const COMPOSICOES = Object.freeze(ESCADA_DE_ESTACOES.map(composicao));
