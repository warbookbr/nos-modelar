/* composicoes.js — as composições da família `cabo`: o tubo de seção circular ao longo do caminho, pelo `friso` de polilinha com
   uma normal por estação (o quadro sem torção que `caminho.js` calcula), uma composição para cada número de estações da escada
   (`ESCADA_DE_ESTACOES`), porque a composição tem um número fixo de pontos. A parte é `cabo`. As portas são `ponta-a` e `ponta-b`,
   cilindros externos do diâmetro do cabo, no plano da tampa de cada ponta e com o eixo na direção em que o cabo sai dela.

   Os acessórios (o terminal de cada ponta, capa ou olhal, e a braçadeira de cada passagem) são nós a mais da mesma composição, uma composição para cada combinação deles
   (o sufixo do id: terminal A, terminal B e quantas braçadeiras). */
import { FORMATO_COMPOSICAO_PROCEDURAL } from '../../nucleo/entrada.js';
import { ESCADA_DE_ESTACOES } from './caminho.js';
import { LADOS_DO_ACESSORIO, LADOS_DO_FIO, PONTOS_DO_ANEL } from './acessorios.js';

/** O id da composição: o do tubo puro, ou com o sufixo dos acessórios (terminal A, terminal B e quantas braçadeiras: um algarismo cada). */
export const ID_DO_CABO = (estacoes, ta = 0, tb = 0, nb = 0) => (ta || tb || nb ? `cabo.${estacoes}-estacoes-${ta}${tb}${nb}` : `cabo.${estacoes}-estacoes`);
const p = (nome) => ({ parametro: nome });
const SAI = ['mecanifica.malha-poligonal@1', 'mecanifica.parte@1', 'mecanifica.porta@1'];


const SEGMENTOS_DO_ACESSORIO = LADOS_DO_ACESSORIO / 4;
const vetores = (pre, nomes) => nomes.map((n) => [`${pre}${n}`, { tipo: 'vetor3' }]);
const numeros = (pre, nomes) => nomes.map((n) => [`${pre}${n}`, { tipo: 'numero' }]);

/* Os ids de origem e os nomes dos acessórios são fixos; duas chamadas na mesma receita (o feixe) passam por `instanciaDeFamilia`, que soma a base aos ids e renomeia as partes e as portas. */

/* O anel de fio redondo: uma volta fechada de PONTOS_DO_ANEL pontos (o último repete o primeiro), com a normal do eixo do anel e o círculo do fio como perfil. */
const noDoAnel = (nome, origemId, nomeDaLinha, pre, perfilRaio) => ({
  id: nome, operacao: 'friso',
  argumentos: { origemId, linha: { nome: nomeDaLinha, pontos: Array.from({ length: PONTOS_DO_ANEL + 1 }, (_, k) => p(`${pre}Q${k}`)) }, normal: p(`${pre}QN`), perfil: { circulo: { raio: p(perfilRaio) } }, segmentosArco: LADOS_DO_FIO / 4 },
});
const parametrosDoAnel = (pre) => [...Array.from({ length: PONTOS_DO_ANEL + 1 }, (_, k) => [`${pre}Q${k}`, { tipo: 'vetor3' }]), [`${pre}QN`, { tipo: 'vetor3' }], [`${pre}QFio`, { tipo: 'numero' }]];

function terminal(lado, tipo, base) {
  const pre = `t${lado}`;
  const nomeDoTerminal = `terminal-${lado}`;
  const oTerminal = base;
  const nos = [
    { id: `terminal-${lado}`, operacao: 'friso', argumentos: { origemId: oTerminal, linha: { nome: nomeDoTerminal, pontos: [p(`${pre}P0`), p(`${pre}P1`)] }, normal: p(`${pre}N`), perfil: { circulo: { raio: p(`${pre}Raio`) } }, segmentosArco: SEGMENTOS_DO_ACESSORIO } },
    { id: `parte-terminal-${lado}`, operacao: 'parte', argumentos: { nome: nomeDoTerminal, sel: { origem: { op: 'friso', id: oTerminal } } } },
  ];
  const parametros = [...vetores(pre, ['P0', 'P1', 'N']), ...numeros(pre, ['Raio'])];
  if (tipo === 2) {
    const nomeDoOlhal = `olhal-${lado}`; const oOlhal = base + 1;
    nos.push(noDoAnel(`olhal-${lado}`, oOlhal, nomeDoOlhal, pre, `${pre}QFio`), { id: `parte-olhal-${lado}`, operacao: 'parte', argumentos: { nome: nomeDoOlhal, sel: { origem: { op: 'friso', id: oOlhal } } } });
    parametros.push(...parametrosDoAnel(pre));
  }
  return { nos, parametros };
}

function bracadeira(k, base) {
  const pre = `b${k}`;
  const nome = `bracadeira-${k}`; const o = base;
  return {
    nos: [noDoAnel(`bracadeira-${k}`, o, nome, pre, `${pre}QFio`), { id: `parte-bracadeira-${k}`, operacao: 'parte', argumentos: { nome, sel: { origem: { op: 'friso', id: o } } } }],
    parametros: parametrosDoAnel(pre),
  };
}

function composicao(estacoes, ta = 0, tb = 0, nb = 0) {
  const indices = Array.from({ length: estacoes }, (_, k) => k);
  const oCabo = 10; const nCabo = 'cabo'; const nLinha = 'cabo';
  const extras = [];
  if (ta) extras.push(terminal('a', ta, 100));
  if (tb) extras.push(terminal('b', tb, 120));
  for (let k = 1; k <= nb; k += 1) extras.push(bracadeira(k, 140 + 20 * k));
  const porta = (lado, id, referencia) => ({
    id: `porta-ponta-${lado}`, operacao: 'publicarPorta',
    argumentos: { id, de: { op: 'friso', id: oCabo, parte: 'pontas' }, interface: { forma: 'cilindro', papel: 'externa', eixo: p(`${lado}Eixo`), referencia: p(referencia), centro: p(`${lado}Centro`), raio: p('raio'), inicio: 0, fim: p(`${lado}Fim`) } },
  });
  const id = ID_DO_CABO(estacoes, ta, tb, nb);
  return Object.freeze({
    formato: FORMATO_COMPOSICAO_PROCEDURAL, id, versao: '1.0.0',
    parametros: {
      ...Object.fromEntries(extras.flatMap((e) => e.parametros)),
      raio: { tipo: 'numero' }, segmentosArco: { tipo: 'inteiro' },
      ...Object.fromEntries(indices.flatMap((k) => [[`p${k}`, { tipo: 'vetor3' }], [`n${k}`, { tipo: 'vetor3' }]])),
      aCentro: { tipo: 'vetor3' }, aEixo: { tipo: 'vetor3' }, aFim: { tipo: 'numero' }, bCentro: { tipo: 'vetor3' }, bEixo: { tipo: 'vetor3' }, bFim: { tipo: 'numero' },
    },
    artefatos: { entra: [], sai: SAI },
    nos: [
      { id: 'cabo', operacao: 'friso', argumentos: { origemId: oCabo, linha: { nome: nLinha, pontos: indices.map((k) => p(`p${k}`)) }, normais: indices.map((k) => p(`n${k}`)), perfil: { circulo: { raio: p('raio') } }, segmentosArco: p('segmentosArco') } },
      { id: 'parte', operacao: 'parte', argumentos: { nome: nCabo, sel: { origem: { op: 'friso', id: oCabo } } } },
      porta('a', 'ponta-a', 'n0'),
      porta('b', 'ponta-b', `n${estacoes - 1}`),
      ...extras.flatMap((e) => e.nos),
    ],
  });
}

/* uma composição por degrau da escada e por combinação de acessórios: terminal A e B (nenhum, capa, olhal) e 0 a 2 braçadeiras */
export const COMPOSICOES = Object.freeze(ESCADA_DE_ESTACOES.flatMap((e) => [0, 1, 2].flatMap((ta) => [0, 1, 2].flatMap((tb) => [0, 1, 2].map((nb) => composicao(e, ta, tb, nb))))));
