/* roda-no-freio.js — declaração de montagem do piloto AUT-05. Ela reúne duas
   receitas já existentes numa pose manual conhecida e declara UMA relação de
   encaixe; não cria pai, não muda geometria nem resolve posição. */
import { nucleo } from '../motor/oficina.js';
import * as freio from '../pecas/freio-disco.js';
import * as roda from '../pecas/roda-dianteira.js';

const resolver = (peca) => nucleo(
  peca.PASSOS, peca.PARAMS, peca.TOPO, peca.MATERIAIS, peca.ESQUELETO ?? null, peca.ALIASES,
);

export const RELACAO_RODA_NO_FREIO = {
  id: 'rodaNoCubo',
  tipo: 'encaixaCilindrico',
  referencia: 'freio.pilotoDaRoda',
  movel: 'roda.cavidadeDoCubo',
  /* A folga é de projeto, não epsilon: 3,05 mm na pose/escalas declaradas. */
  folgaRadial: { min: 0.003, max: 0.0031 },
  tolerancia: 0.000001,
};

export function montarRodaNoFreio() {
  return {
    instancias: [
      { id: 'freio', neutro: resolver(freio), escala: 2.45, deslocamento: [0, 0, 0] },
      { id: 'roda', neutro: resolver(roda), escala: 1.60, deslocamento: [0, 0, 0] },
    ],
    relacao: RELACAO_RODA_NO_FREIO,
  };
}
