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
  /* Alvo de 3,05 mm; a faixa aceitável vem da fabricação, não do epsilon. */
  folgaRadial: { nominal: 0.00305, toleranciaFabricacao: { menos: 0.00005, mais: 0.00005 } },
  toleranciaNumerica: 0.000001,
  /* Os centros dos eixos congelam a pose já revisada, sem escolher profundidade implícita. */
  poseCanonica: { referenciaAxial: 'centro', movelAxial: 'centro', giro: 0 },
};

export const RELACAO_ARO_NO_PNEU = {
  id: 'aroNoPneu',
  tipo: 'assentaAnular',
  referencia: 'roda.assentoDoAroNoPneu',
  movel: 'roda.assentoDoPneuNoAro',
  /* Na escala 1,60, as faixas comuns são 40 mm radial e 233,6 mm axial. */
  sobreposicaoRadial: { nominal: 0.0400, toleranciaFabricacao: { menos: 0.0001, mais: 0.0001 } },
  sobreposicaoAxial: { nominal: 0.2336, toleranciaFabricacao: { menos: 0.0001, mais: 0.0001 } },
  toleranciaNumerica: 0.000001,
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

export function montarAroNoPneu() {
  return {
    instancias: [
      { id: 'roda', neutro: resolver(roda), escala: 1.60, deslocamento: [0, 0, 0] },
    ],
    relacao: RELACAO_ARO_NO_PNEU,
  };
}
