/* index.js — a porta do módulo contorno-da-imagem: segmentação, desenho, medida e rodadas. */
export { tracosDaSemente, segmentar } from './regioes.js';
export { sobreposicao, divisas, recortesDasDivisas, folhasDasDivisas, roteiroDoCritico, recortesPorFolha } from './desenho.js';
export { proximidadeDaBorda, MINIMO_NA_BORDA } from './medida.js';
export { validarRodada, proximaAcao, NOTA_MINIMA, LIMITE_DE_RODADAS } from './rodadas.js';
