/* index.js — o pacote registrável da extensão chapa dobrada: manifesto, implementação e a conta das medidas. */
import { implementar } from './implementacao.js';
import { MANIFESTO } from './manifesto.js';

export { construirChapa, medidasDaChapa } from './chapa.js';
export { PASSOS } from './fixture.js';
export { MANIFESTO, implementar };
/* Entrada de `criarRegistroComExtensoes({ registroBase, extensoes: [EXTENSAO] })`. */
export const EXTENSAO = Object.freeze({ manifesto: MANIFESTO, implementacao: implementar });
