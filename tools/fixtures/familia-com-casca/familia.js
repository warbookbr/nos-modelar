/* Fixture de teste: a família `caixa-oca-de-prova`, uma caixa feita pela casca nativa. Com
   `comEntalhe: false` (a família que a aprovação mecânica aprova) só há a caixa de seis faces, de parede uniforme. Com
   `comEntalhe: true` o parâmetro `entalhe` (0 ou 1) escolhe uma caixa com um entalhe em V de 60 graus, e no ponto
   máximo a quina reentrante engrossa a parede da casca até cerca de duas vezes a pedida, acima do limite da aprovação.
   Quem a usa é `tools/modelar/aprovacao-da-familia.test.mjs`; mudar qualquer arquivo desta pasta muda o que ele prova. */
import { readFileSync } from 'node:fs';
import { FORMATO_COMPOSICAO_PROCEDURAL } from '../../../procedural/nucleo/entrada.js';
import { definirFamilia } from '../../../src/autoria/chamar-familia.js';

const MALHA = 'mecanifica.malha-poligonal@1';
const PARTE = 'mecanifica.parte@1';
const MM = 0.001;
const parametro = (nome) => ({ parametro: nome });

export const ID_CAIXA = 'prova.caixa-oca';
export const ID_CAIXA_ENTALHADA = 'prova.caixa-entalhada';

const PARAMETROS_DA_CASCA = {
  origem: { tipo: 'inteiro' },
  casca: { tipo: 'inteiro' },
  parede: { tipo: 'numero' },
  parte: { tipo: 'texto' },
};

/* A caixa de seis faces fica aberta em cima; a caixa entalhada é uma casca fechada, porque a tampa de um perfil com
   entalhe sai partida em peças convexas e o que se mede nela é a parede da quina. */
const nosDaCasca = (op, { aberta }) => [
  {
    id: 'casca',
    operacao: 'casca',
    argumentos: {
      origemId: parametro('casca'),
      solido: { origem: { op, id: parametro('origem') }, tudo: true },
      ...(aberta ? { abertas: { origem: { op, id: parametro('origem'), face: 'topo' } } } : {}),
      espessura: parametro('parede'),
    },
  },
  { id: 'identidade', operacao: 'parte', argumentos: { nome: parametro('parte'), sel: { origem: { op: 'casca', id: parametro('casca') } } } },
];

export const COMPOSICOES = Object.freeze([
  Object.freeze({
    formato: FORMATO_COMPOSICAO_PROCEDURAL,
    id: ID_CAIXA,
    versao: '1.0.0',
    parametros: { ...PARAMETROS_DA_CASCA, largura: { tipo: 'numero' }, altura: { tipo: 'numero' }, profundidade: { tipo: 'numero' } },
    artefatos: { entra: [], sai: [MALHA, PARTE] },
    nos: [
      { id: 'volume', operacao: 'cubo', argumentos: { origemId: parametro('origem'), larg: parametro('largura'), alt: parametro('altura'), prof: parametro('profundidade') } },
      ...nosDaCasca('cubo', { aberta: true }),
    ],
  }),
  Object.freeze({
    formato: FORMATO_COMPOSICAO_PROCEDURAL,
    id: ID_CAIXA_ENTALHADA,
    versao: '1.0.0',
    parametros: {
      ...PARAMETROS_DA_CASCA,
      largura: { tipo: 'numero' },
      altura: { tipo: 'numero' },
      profundidade: { tipo: 'numero' },
      xEsquerda: { tipo: 'numero' },
      xMeio: { tipo: 'numero' },
      xDireita: { tipo: 'numero' },
      yPonta: { tipo: 'numero' },
    },
    artefatos: { entra: [], sai: [MALHA, PARTE] },
    nos: [
      {
        id: 'volume',
        operacao: 'extrusao',
        argumentos: {
          origemId: parametro('origem'),
          perfil: [
            [0, 0], [parametro('largura'), 0], [parametro('largura'), parametro('altura')],
            [parametro('xDireita'), parametro('altura')], [parametro('xMeio'), parametro('yPonta')], [parametro('xEsquerda'), parametro('altura')],
            [0, parametro('altura')],
          ],
          altura: parametro('profundidade'),
        },
      },
      ...nosDaCasca('extrusao', { aberta: false }),
    ],
  }),
]);

/** O contrato da família, com ou sem o parâmetro `entalhe`. */
function contratoDaCaixa(comEntalhe) {
  const contrato = JSON.parse(readFileSync(new URL('./familia.json', import.meta.url), 'utf8'));
  if (!comEntalhe) {
    delete contrato.parametros.entalhe;
    contrato.restricoes = contrato.restricoes.filter(({ id }) => id !== 'entalhe-cabe-na-largura');
  }
  return contrato;
}

export function criarCaixaOca({ comEntalhe = false } = {}) {
  const derivar = ({ largura, altura, profundidade, parede, entalhe = 0 }) => {
    const base = { origem: 1, casca: 2, parede: parede * MM, parte: 'caixa', largura: largura * MM, altura: altura * MM, profundidade: profundidade * MM };
    if (entalhe === 0) return { composicao: ID_CAIXA, argumentos: base };
    const profundidadeDoEntalhe = 0.6 * altura;
    const meiaAbertura = profundidadeDoEntalhe * Math.tan(Math.PI / 6);
    return {
      composicao: ID_CAIXA_ENTALHADA,
      argumentos: {
        ...base,
        xEsquerda: (largura / 2 - meiaAbertura) * MM,
        xMeio: (largura / 2) * MM,
        xDireita: (largura / 2 + meiaAbertura) * MM,
        yPonta: (altura - profundidadeDoEntalhe) * MM,
      },
    };
  };
  return definirFamilia({ contrato: contratoDaCaixa(comEntalhe), composicoes: COMPOSICOES, derivar });
}
