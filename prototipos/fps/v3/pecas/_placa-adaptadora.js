/* PEÇA DE EXEMPLO — NÃO HOMOLOGADA, NÃO É BASE DE PROJETO.
 *
 * Todas as peças de `prototipos/fps/v3/pecas/` são exemplos. Elas existem para
 * exercitar e provar capacidades do núcleo, e nada mais. Nenhuma é referência de
 * engenharia, componente aprovado ou ponto de partida de produto.
 *
 * Medidas e proporções foram escolhidas para fazer uma capacidade passar ou
 * falhar, não para descrever um componente real. Esta geometria pode mudar ou
 * ser removida a qualquer momento, sem aviso e sem migração.
 *
 * O que este repositório sustenta é o núcleo e as capacidades provadas — nunca
 * a geometria daqui. Ver "Peças são exemplos" no README.md.
 */
/* Placa adaptadora de exercício para o Caso 2 da homologação do fluxo de IA.
 * Uma única chapa recebe três famílias de furação passante: passagem central,
 * círculo de seis fixadores e fileira linear. A geometria não simula abertura
 * oblonga: a linguagem atual só declara cortes circulares editáveis. */
import { executar, colisaoDe } from '../motor/oficina.js';

export const PERFIL_AUTORIA = {
  visual: 'tecnicoDidatico',
  fidelidade: 'F2',
  precisao: 'dimensional',
  interacao: 'selecao',
  distanciaMinima: 0.24,
  orcamentoFaces: 1200,
};

export const TOPO = {
  ladosDosFuros: 16,
  fixadoresNoCirculo: 6,
};

export const PARAMS = {
  placaLargura: 0.240,
  placaEspessura: 0.018,
  placaProfundidade: 0.180,
  placaTopoY: '= placaEspessura',
  passagemRaio: 0.030,
  fixadorRaio: 0.005,
  circuloRaio: 0.065,
  fileiraRaio: 0.004,
  fileiraZ: 0.070,
  fileiraEsquerdaX: -0.040,
  fileiraCentroX: 0,
  fileiraDireitaX: 0.040,
};

export const MATERIAIS = {
  acoUsinado: { cor: '#7c8792', metalness: 0.72, aspereza: 0.38 },
};

const PLACA = 1300;
const FUROS = 1301;
const ORIGEM_PLACA = { op: 'cubo', id: PLACA };
const ORIGEM_FUROS = { op: 'furo', id: FUROS };
const TODOS = { passo: 1, fase: 0 };

export const PASSOS = [
  ['cubo', {
    origemId: PLACA,
    larg: 'placaLargura',
    alt: 'placaEspessura',
    prof: 'placaProfundidade',
  }],
  /* A parte vem antes do corte: faces preservadas, bordas e paredes dos furos
     continuam pertencendo à única identidade semântica da peça. */
  ['parte', { nome: 'placa', sel: { origem: ORIGEM_PLACA } }],
  ['furo', {
    origemId: FUROS,
    de: { ...ORIGEM_PLACA, face: 'topo' },
    saida: { ...ORIGEM_PLACA, face: 'fundo' },
    raio: 'fixadorRaio',
    lados: 'ladosDosFuros',
    orientacao: [1, 0, 0],
    centros: [
      { nome: 'passagemCentral', centro: [0, 'placaTopoY', 0], raio: 'passagemRaio' },
      {
        nome: 'circuloDeFixadores',
        pivo: [0, 'placaTopoY', 0],
        distancia: 'circuloRaio',
        total: 'fixadoresNoCirculo',
        volta: 360,
      },
      { nome: 'fileiraLinearEsquerda', centro: ['fileiraEsquerdaX', 'placaTopoY', 'fileiraZ'], raio: 'fileiraRaio' },
      { nome: 'fileiraLinearCentro', centro: ['fileiraCentroX', 'placaTopoY', 'fileiraZ'], raio: 'fileiraRaio' },
      { nome: 'fileiraLinearDireita', centro: ['fileiraDireitaX', 'placaTopoY', 'fileiraZ'], raio: 'fileiraRaio' },
    ],
  }],
  ['publicarPorta', { nome: 'passagemCentral', de: { ...ORIGEM_FUROS, grupo: 'passagemCentral', parede: TODOS } }],
  ['publicarPorta', { nome: 'circuloDeFixadores', de: { ...ORIGEM_FUROS, grupo: 'circuloDeFixadores', parede: TODOS } }],
  ['publicarPorta', { nome: 'fileiraLinearEsquerda', de: { ...ORIGEM_FUROS, grupo: 'fileiraLinearEsquerda', parede: TODOS } }],
  ['publicarPorta', { nome: 'fileiraLinearCentro', de: { ...ORIGEM_FUROS, grupo: 'fileiraLinearCentro', parede: TODOS } }],
  ['publicarPorta', { nome: 'fileiraLinearDireita', de: { ...ORIGEM_FUROS, grupo: 'fileiraLinearDireita', parede: TODOS } }],
  ['material', { sel: { grupo: 'placa' }, usa: 'acoUsinado' }],
  ['solido', { sel: { grupo: 'placa' } }],
];

export const meta = {
  fechada: true,
  nome: '_placa-adaptadora',
  tipo: 'objeto',
  desc: 'placa adaptadora de um corpo com passagem central, círculo de seis fixadores e fileira linear de três furos passantes',
  colisao: colisaoDe(PASSOS, PARAMS, TOPO, MATERIAIS),
};

export function construir(ctx) {
  return executar(PASSOS, PARAMS, TOPO, ctx, MATERIAIS);
}
