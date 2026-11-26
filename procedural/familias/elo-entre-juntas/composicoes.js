/* composicoes.js — a composição da família `elo-entre-juntas`: a carenagem oca do elo (o `loft` de fora menos o `loft` da cavidade,
   os dois calculados no `derivar` pela casca pela receita e escritos ponto a ponto como parâmetros), unida ao anel de fixação de
   cada boca e menos os furos de fixação (um `lathe` repetido por `arranja` radial em volta do eixo y).

   A parte é `elo`. As portas são o padrão dos furos de cada boca (`boca-a`, em y = 0 com a normal para −y, e `boca-b`, em y =
   comprimento com a normal para +y), com a referência em +x e o ângulo no quadro de cada plano, como as do atuador de junta. */
import { FORMATO_COMPOSICAO_PROCEDURAL } from '../../nucleo/entrada.js';
import { INTERVALOS, LADOS, SECOES_A_MAIS_DO_DESVIO } from './geometria.js';

export const ID_DO_ELO = 'elo-entre-juntas.reto';
export const ID_DO_ELO_DESVIADO = 'elo-entre-juntas.desviado';
const p = (nome) => ({ parametro: nome });
const o = (op, id) => ({ origem: { op, id } });
const REFERENCIA = [1, 0, 0];
const SAI = ['mecanifica.malha-poligonal@1', 'mecanifica.parte@1', 'mecanifica.porta@1'];
/* as seções do `loft` de fora (polo, o corpo, polo) e da cavidade (polo, a seção passada, o corpo recuado, a passada, polo) */
const SECOES_DO_CORPO = INTERVALOS + 3;
const contagemDe = (desviada) => { const corpo = SECOES_DO_CORPO + (desviada ? SECOES_A_MAIS_DO_DESVIO : 0); return { fo: corpo + 2, de: corpo + 4 }; };

export const nomeDaSecao = (grupo, k, tipo, j) => (j === undefined ? `${grupo}${k}${tipo}` : `${grupo}${k}${tipo}${j}`);
const ehPolo = (contagem, grupo, k) => k === 0 || k === contagem[grupo] - 1;

function secoesDoLoft(contagem, grupo) {
  return Array.from({ length: contagem[grupo] }, (_, k) => (ehPolo(contagem, grupo, k)
    ? { pos: p(nomeDaSecao(grupo, k, 'p')), raio: 0 }
    : { pos: p(nomeDaSecao(grupo, k, 'p')), contorno: Array.from({ length: LADOS }, (__, j) => [p(nomeDaSecao(grupo, k, 'u', j)), p(nomeDaSecao(grupo, k, 'w', j))]) }));
}
function parametrosDasSecoes(contagem, grupo) {
  const r = {};
  for (let k = 0; k < contagem[grupo]; k += 1) {
    r[nomeDaSecao(grupo, k, 'p')] = { tipo: 'vetor3' };
    if (!ehPolo(contagem, grupo, k)) for (let j = 0; j < LADOS; j += 1) { r[nomeDaSecao(grupo, k, 'u', j)] = { tipo: 'numero' }; r[nomeDaSecao(grupo, k, 'w', j)] = { tipo: 'numero' }; }
  }
  return r;
}

const nosDaBoca = (lado, origem) => [
  { id: `anel-${lado.toLowerCase()}`, operacao: 'lathe', argumentos: { origemId: origem, lados: 96, perfil: [[p(`anelDentro${lado}`), 0], [p(`anelFora${lado}`), 0], [p(`anelFora${lado}`), p(`anelEspessura${lado}`)], [p(`anelDentro${lado}`), p(`anelEspessura${lado}`)], [p(`anelDentro${lado}`), 0]], em: p(`anelEm${lado}`) } },
  { id: `furo-${lado.toLowerCase()}`, operacao: 'lathe', argumentos: { origemId: origem + 1, lados: 24, perfil: [[0, 0], [p(`furoRaio${lado}`), 0], [p(`furoRaio${lado}`), p(`furoAltura${lado}`)], [0, p(`furoAltura${lado}`)]], em: p(`furoEm${lado}`) } },
  { id: `furos-${lado.toLowerCase()}`, operacao: 'arranja', argumentos: { modo: 'radial', total: p(`furos${lado}`), graus: p(`graus${lado}`), eixo: 'y', pivo: [0, 0, 0], origemId: origem + 2, derivaDe: { op: 'lathe', id: origem + 1 }, sel: { origem: { op: 'lathe', id: origem + 1 } } } },
];
const porta = (lado, ponto, normal, referencia) => ({
  id: `porta-boca-${lado.toLowerCase()}`, operacao: 'publicarPorta',
  argumentos: { id: `boca-${lado.toLowerCase()}`, de: { op: 'subtrair', id: 30 }, interface: { forma: 'padraoFuros', papel: 'recebe', plano: { ponto, normal }, referencia, diametro: p(`diametro${lado}`), padrao: { tipo: 'circular', centro: ponto, raio: p(`raio${lado}`), quantidade: p(`furos${lado}`), anguloInicial: p(`angulo${lado}`) } } },
});

const parametrosDoDesvio = { normalB: { tipo: 'vetor3' }, referenciaB: { tipo: 'vetor3' }, eixoDoGiro: { tipo: 'vetor3' }, giroDoAzimute: { tipo: 'numero' }, giroDoAzimuteInverso: { tipo: 'numero' }, giroDoDesvio: { tipo: 'numero' }, pivoDaBocaB: { tipo: 'vetor3' }, idaDaBocaB: { tipo: 'vetor3' } };
const parametrosDoEixo = (desviada) => ({ ...parametrosDasSecoes(contagemDe(desviada), 'fo'), ...parametrosDasSecoes(contagemDe(desviada), 'de') });
const parametros = {
  comprimento: { tipo: 'numero' }, planoB: { tipo: 'vetor3' },
  ...Object.fromEntries(['A', 'B'].flatMap((l) => [
    [`anelDentro${l}`, { tipo: 'numero' }], [`anelFora${l}`, { tipo: 'numero' }], [`anelEspessura${l}`, { tipo: 'numero' }], [`anelEm${l}`, { tipo: 'vetor3' }],
    [`furoRaio${l}`, { tipo: 'numero' }], [`furoAltura${l}`, { tipo: 'numero' }], [`furoEm${l}`, { tipo: 'vetor3' }],
    [`furos${l}`, { tipo: 'inteiro' }], [`graus${l}`, { tipo: 'numero' }], [`angulo${l}`, { tipo: 'numero' }], [`diametro${l}`, { tipo: 'numero' }], [`raio${l}`, { tipo: 'numero' }],
  ])),
};
const FURO_A = { op: 'lathe', id: 21 };
/* a boca B nasce reta, em y = comprimento, e vai ao lugar dela antes de existir qualquer outra malha: o anel, o furo e as cópias do furo
   (com os polos dos furos) giram em torno do eixo do giro até a tangente da boca B (o `rotaciona` em y, x e y, da malha inteira) e
   vão ao ponto da boca B (o `transladar`) */
const FURO_B = { op: 'lathe', id: 24 };
const IDA_DA_BOCA_B = [
  { id: 'girar-boca-b-no-azimute', operacao: 'rotaciona', argumentos: { eixo: 'y', graus: p('giroDoAzimuteInverso'), pivo: p('pivoDaBocaB') } },
  { id: 'girar-boca-b-no-desvio', operacao: 'rotaciona', argumentos: { eixo: 'x', graus: p('giroDoDesvio'), pivo: p('pivoDaBocaB') } },
  { id: 'girar-boca-b-de-volta', operacao: 'rotaciona', argumentos: { eixo: 'y', graus: p('giroDoAzimute'), pivo: p('pivoDaBocaB') } },
  { id: 'levar-boca-b', operacao: 'transladar', argumentos: { d: p('idaDaBocaB') } },
];
/* a composição do elo reto (o eixo é o y) e a do elo desviado (o caminho com `desvio` ou `deslocamentoLateral`): a reta não tem
   os giros e a ida da boca B, e por isso a malha dela é a de antes, com os mesmos ids; a desviada cria a boca B primeiro, para girar
   e levar só ela, e leva a orientação do `loft` e a normal e a referência da porta B como parâmetros */
const compor = (id, desviada) => {
  const orientacao = desviada ? p('eixoDoGiro') : [1, 0, 0];
  const nos = [
    ...(desviada ? [...nosDaBoca('B', 23), ...IDA_DA_BOCA_B] : []),
    { id: 'loft-de-fora', operacao: 'loft', argumentos: { origemId: 1, lados: LADOS, orientacao, secoes: secoesDoLoft(contagemDe(desviada), 'fo') } },
    { id: 'loft-da-cavidade', operacao: 'loft', argumentos: { origemId: 2, lados: LADOS, orientacao, secoes: secoesDoLoft(contagemDe(desviada), 'de') } },
    { id: 'casca', operacao: 'subtrair', argumentos: { origemId: 3, solidos: [o('loft', 1), o('loft', 2)] } },
    ...nosDaBoca('A', 20), ...(desviada ? [] : nosDaBoca('B', 23)),
    { id: 'carenagem-com-aneis', operacao: 'unir', argumentos: { origemId: 29, solidos: [o('subtrair', 3), o('lathe', 20), o('lathe', 23)] } },
    { id: 'elo-furado', operacao: 'subtrair', argumentos: { origemId: 30, solidos: [o('unir', 29), { origem: FURO_A }, { origem: { op: 'arranja', id: 22, de: FURO_A } }, { origem: FURO_B }, { origem: { op: 'arranja', id: 25, de: FURO_B } }] } },
    { id: 'parte-elo', operacao: 'parte', argumentos: { nome: 'elo', sel: o('subtrair', 30) } },
    porta('A', [0, 0, 0], [0, -1, 0], REFERENCIA),
    desviada ? porta('B', p('planoB'), p('normalB'), p('referenciaB')) : porta('B', p('planoB'), [0, 1, 0], REFERENCIA),
  ];
  return Object.freeze({ formato: FORMATO_COMPOSICAO_PROCEDURAL, id, versao: '1.0.0', parametros: { ...parametros, ...parametrosDoEixo(desviada), ...(desviada ? parametrosDoDesvio : {}) }, artefatos: { entra: [], sai: SAI }, nos });
};

export const COMPOSICOES = Object.freeze([compor(ID_DO_ELO, false), compor(ID_DO_ELO_DESVIADO, true)]);
