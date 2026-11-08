/* tubos-hoje-aceita — `tubos-hoje.js` (a técnica de hoje, com a aba torta e a aresta fina na frente do tubo em pé) com o PLANO declarando a aba como aceita, em
 * `PLANO.dobrasAceitas`, com a região e o motivo. É a peça de prova de que as réguas de superfície (`dobra-da-superficie.mjs` e `vinco-oculto.mjs`) e o
 * `descrever` separam o que foi aceito do que não foi: aqui as quatro dobras e o chanfro da aba saem como aceitos, e nada fica sem declarar. */
import hoje from './tubos-hoje.js';

export default {
  ...hoje,
  meta: { ...hoje.meta, nome: 'tubos-hoje-aceita' },
  PLANO: {
    ...hoje.PLANO,
    dobrasAceitas: [
      { parte: 'tuboEmPe', regiao: { min: [70, 0, -8], max: [80, 25, 8] }, motivo: 'aba da técnica de hoje, mantida como caso de calibração das réguas de superfície' },
    ],
  },
};
