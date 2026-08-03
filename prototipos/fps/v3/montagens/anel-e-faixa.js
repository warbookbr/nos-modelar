/* anel-e-faixa.js — fixture neutra de assentamento anular. Dois corpos de
   revolução declaram zonas concêntricas, sem conhecer roda, pneu, freio ou
   Three.js; ela prova que o contrato AUT-2026-11 não é automotivo. */
import { nucleo } from '../motor/oficina.js';

const PASSOS_FAIXA = [
  ['lathe', { origemId: 9201, lados: 16, perfil: [[0.02, -0.02], [0.04, -0.02], [0.04, 0.02], [0.02, 0.02], [0.02, -0.02]] }],
  ['parte', { nome: 'faixa', sel: { origem: { op: 'lathe', id: 9201 } } }],
  ['publicarPorta', {
    nome: 'recebeAnel', de: { op: 'lathe', id: 9201, faixa: 1 },
    interface: { forma: 'anel', papel: 'recebe', parte: 'faixa', eixo: [0, 1, 0], centro: [0, 0, 0], raioInterno: 0.025, raioExterno: 0.040, inicio: -0.02, fim: 0.02 },
  }],
];

const PASSOS_ANEL = [
  ['lathe', { origemId: 9202, lados: 16, perfil: [[0.03, -0.015], [0.05, -0.015], [0.05, 0.015], [0.03, 0.015], [0.03, -0.015]] }],
  ['parte', { nome: 'anel', sel: { origem: { op: 'lathe', id: 9202 } } }],
  ['publicarPorta', {
    nome: 'ocupaFaixa', de: { op: 'lathe', id: 9202, faixa: 1 },
    interface: { forma: 'anel', papel: 'ocupa', parte: 'anel', eixo: [0, 1, 0], centro: [0, 0, 0], raioInterno: 0.030, raioExterno: 0.050, inicio: -0.015, fim: 0.015 },
  }],
];

export const RELACAO_ANEL_NA_FAIXA = {
  id: 'anelNaFaixa', tipo: 'assentaAnular', referencia: 'faixa.recebeAnel', movel: 'anel.ocupaFaixa',
  sobreposicaoRadial: { nominal: 0.0100, toleranciaFabricacao: { menos: 0.0001, mais: 0.0001 } },
  sobreposicaoAxial: { nominal: 0.0300, toleranciaFabricacao: { menos: 0.0001, mais: 0.0001 } },
  toleranciaNumerica: 0.000001,
};

export function montarAnelEFaixa() {
  return {
    instancias: [
      { id: 'faixa', neutro: nucleo(PASSOS_FAIXA) },
      { id: 'anel', neutro: nucleo(PASSOS_ANEL) },
    ],
    relacao: RELACAO_ANEL_NA_FAIXA,
  };
}
