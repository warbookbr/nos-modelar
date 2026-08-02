/* pino-e-luva.js — fixture neutra do encaixe cilíndrico. Não conhece roda,
   freio ou Three.js: dois corpos rígidos simples publicam as mesmas interfaces
   que o piloto do AUT-05 precisa, para provar que o contrato não é automotivo. */
import { nucleo } from '../motor/oficina.js';

const PASSOS_PINO = [
  ['cilindro', { origemId: 9101, raio: 'raioPino', altura: 'comprimentoPino', lados: 16 }],
  ['parte', { nome: 'pino', sel: { origem: { op: 'cilindro', id: 9101 } } }],
  ['publicarPorta', {
    nome: 'piloto', de: { op: 'cilindro', id: 9101 },
    interface: {
      forma: 'cilindro', papel: 'externa', eixo: [0, 1, 0], centro: [0, 0, 0],
      raio: 'raioPino', inicio: 0, fim: 'comprimentoPino',
    },
  }],
];

const PASSOS_LUVA = [
  ['lathe', { origemId: 9102, lados: 16, perfil: [
    ['raioInterno', 0], ['raioExterno', 0], ['raioExterno', 'comprimentoLuva'],
    ['raioInterno', 'comprimentoLuva'], ['raioInterno', 0],
  ] }],
  ['parte', { nome: 'luva', sel: { origem: { op: 'lathe', id: 9102 } } }],
  ['publicarPorta', {
    nome: 'cavidade', de: { op: 'lathe', id: 9102, faixa: 3 },
    interface: {
      forma: 'cilindro', papel: 'interna', eixo: [0, 1, 0], centro: [0, 0, 0],
      raio: 'raioInterno', inicio: 0, fim: 'comprimentoLuva',
    },
  }],
];

export const RELACAO_PINO_NA_LUVA = {
  id: 'pinoNaLuva', tipo: 'encaixaCilindrico', referencia: 'pino.piloto', movel: 'luva.cavidade',
  folgaRadial: { min: 0.0019, max: 0.0021 }, tolerancia: 0.000001,
};

export function montarPinoELuva() {
  return {
    instancias: [
      { id: 'pino', neutro: nucleo(PASSOS_PINO, { raioPino: 0.010, comprimentoPino: 0.040 }) },
      { id: 'luva', neutro: nucleo(PASSOS_LUVA, { raioInterno: 0.012, raioExterno: 0.018, comprimentoLuva: 0.060 }) },
    ],
    relacao: RELACAO_PINO_NA_LUVA,
  };
}
