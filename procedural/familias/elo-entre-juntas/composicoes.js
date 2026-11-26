/* composicoes.js — a composição da família `elo-entre-juntas`: a carenagem oca do elo (o `loft` de fora menos o `loft` da cavidade,
   os dois calculados no `derivar` pela casca pela receita e escritos ponto a ponto como parâmetros), unida ao anel de fixação de
   cada boca e menos os furos de fixação (um `lathe` repetido por `arranja` radial em volta do eixo y).

   A parte é `elo`. As portas são o padrão dos furos de cada boca (`boca-a`, em y = 0 com a normal para −y, e `boca-b`, em y =
   comprimento com a normal para +y), com a referência em +x e o ângulo no quadro de cada plano, como as do atuador de junta. */
import { FORMATO_COMPOSICAO_PROCEDURAL } from '../../nucleo/entrada.js';
import { INTERVALOS, LADOS } from './geometria.js';

export const ID_DO_ELO = 'elo-entre-juntas.reto';
const p = (nome) => ({ parametro: nome });
const o = (op, id) => ({ origem: { op, id } });
const REFERENCIA = [1, 0, 0];
const SAI = ['mecanifica.malha-poligonal@1', 'mecanifica.parte@1', 'mecanifica.porta@1'];
/* as seções do `loft` de fora (polo, o corpo, polo) e da cavidade (polo, a seção passada, o corpo recuado, a passada, polo) */
const SECOES_DO_CORPO = INTERVALOS + 3;
const CONTAGEM = { fo: SECOES_DO_CORPO + 2, de: SECOES_DO_CORPO + 4 };

export const nomeDaSecao = (grupo, k, tipo, j) => (j === undefined ? `${grupo}${k}${tipo}` : `${grupo}${k}${tipo}${j}`);
const ehPolo = (grupo, k) => k === 0 || k === CONTAGEM[grupo] - 1;

function secoesDoLoft(grupo) {
  return Array.from({ length: CONTAGEM[grupo] }, (_, k) => (ehPolo(grupo, k)
    ? { pos: p(nomeDaSecao(grupo, k, 'p')), raio: 0 }
    : { pos: p(nomeDaSecao(grupo, k, 'p')), contorno: Array.from({ length: LADOS }, (__, j) => [p(nomeDaSecao(grupo, k, 'u', j)), p(nomeDaSecao(grupo, k, 'w', j))]) }));
}
function parametrosDasSecoes(grupo) {
  const r = {};
  for (let k = 0; k < CONTAGEM[grupo]; k += 1) {
    r[nomeDaSecao(grupo, k, 'p')] = { tipo: 'vetor3' };
    if (!ehPolo(grupo, k)) for (let j = 0; j < LADOS; j += 1) { r[nomeDaSecao(grupo, k, 'u', j)] = { tipo: 'numero' }; r[nomeDaSecao(grupo, k, 'w', j)] = { tipo: 'numero' }; }
  }
  return r;
}

const nosDaBoca = (lado, origem) => [
  { id: `anel-${lado.toLowerCase()}`, operacao: 'lathe', argumentos: { origemId: origem, lados: 96, perfil: [[p(`anelDentro${lado}`), 0], [p(`anelFora${lado}`), 0], [p(`anelFora${lado}`), p(`anelEspessura${lado}`)], [p(`anelDentro${lado}`), p(`anelEspessura${lado}`)], [p(`anelDentro${lado}`), 0]], em: p(`anelEm${lado}`) } },
  { id: `furo-${lado.toLowerCase()}`, operacao: 'lathe', argumentos: { origemId: origem + 1, lados: 24, perfil: [[0, 0], [p(`furoRaio${lado}`), 0], [p(`furoRaio${lado}`), p(`furoAltura${lado}`)], [0, p(`furoAltura${lado}`)]], em: p(`furoEm${lado}`) } },
  { id: `furos-${lado.toLowerCase()}`, operacao: 'arranja', argumentos: { modo: 'radial', total: p(`furos${lado}`), graus: p(`graus${lado}`), eixo: 'y', pivo: [0, 0, 0], origemId: origem + 2, derivaDe: { op: 'lathe', id: origem + 1 }, sel: { origem: { op: 'lathe', id: origem + 1 } } } },
];
const porta = (lado, ponto, normal) => ({
  id: `porta-boca-${lado.toLowerCase()}`, operacao: 'publicarPorta',
  argumentos: { id: `boca-${lado.toLowerCase()}`, de: { op: 'subtrair', id: 30 }, interface: { forma: 'padraoFuros', papel: 'recebe', plano: { ponto, normal }, referencia: REFERENCIA, diametro: p(`diametro${lado}`), padrao: { tipo: 'circular', centro: ponto, raio: p(`raio${lado}`), quantidade: p(`furos${lado}`), anguloInicial: p(`angulo${lado}`) } } },
});

const parametros = {
  comprimento: { tipo: 'numero' }, planoB: { tipo: 'vetor3' },
  ...parametrosDasSecoes('fo'), ...parametrosDasSecoes('de'),
  ...Object.fromEntries(['A', 'B'].flatMap((l) => [
    [`anelDentro${l}`, { tipo: 'numero' }], [`anelFora${l}`, { tipo: 'numero' }], [`anelEspessura${l}`, { tipo: 'numero' }], [`anelEm${l}`, { tipo: 'vetor3' }],
    [`furoRaio${l}`, { tipo: 'numero' }], [`furoAltura${l}`, { tipo: 'numero' }], [`furoEm${l}`, { tipo: 'vetor3' }],
    [`furos${l}`, { tipo: 'inteiro' }], [`graus${l}`, { tipo: 'numero' }], [`angulo${l}`, { tipo: 'numero' }], [`diametro${l}`, { tipo: 'numero' }], [`raio${l}`, { tipo: 'numero' }],
  ])),
};
const FURO_A = { op: 'lathe', id: 21 }; const FURO_B = { op: 'lathe', id: 24 };
const nos = [
  { id: 'loft-de-fora', operacao: 'loft', argumentos: { origemId: 1, lados: LADOS, orientacao: [1, 0, 0], secoes: secoesDoLoft('fo') } },
  { id: 'loft-da-cavidade', operacao: 'loft', argumentos: { origemId: 2, lados: LADOS, orientacao: [1, 0, 0], secoes: secoesDoLoft('de') } },
  { id: 'casca', operacao: 'subtrair', argumentos: { origemId: 3, solidos: [o('loft', 1), o('loft', 2)] } },
  ...nosDaBoca('A', 20), ...nosDaBoca('B', 23),
  { id: 'carenagem-com-aneis', operacao: 'unir', argumentos: { origemId: 29, solidos: [o('subtrair', 3), o('lathe', 20), o('lathe', 23)] } },
  { id: 'elo-furado', operacao: 'subtrair', argumentos: { origemId: 30, solidos: [o('unir', 29), { origem: FURO_A }, { origem: { op: 'arranja', id: 22, de: FURO_A } }, { origem: FURO_B }, { origem: { op: 'arranja', id: 25, de: FURO_B } }] } },
  { id: 'parte-elo', operacao: 'parte', argumentos: { nome: 'elo', sel: o('subtrair', 30) } },
  porta('A', [0, 0, 0], [0, -1, 0]), porta('B', p('planoB'), [0, 1, 0]),
];

export const COMPOSICOES = Object.freeze([Object.freeze({ formato: FORMATO_COMPOSICAO_PROCEDURAL, id: ID_DO_ELO, versao: '1.0.0', parametros, artefatos: { entra: [], sai: SAI }, nos })]);
