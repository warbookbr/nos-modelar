/* index.js — a porta do módulo contorno-da-imagem: segmentação, desenho, medida e rodadas. */
export { tracosDaSemente, segmentar, contornoDaSilhueta, REALCE_PADRAO } from './regioes.js';
export { sobreposicao, matizesPorVizinhanca, svgDoMapa, FONTE_DA_ETIQUETA, etiquetasFora, divisas, recortesDasDivisas, folhasDasDivisas, roteiroDoCritico, recortesPorFolha } from './desenho.js';
export { proximidadeDaBorda, MINIMO_NA_BORDA } from './medida.js';
export { validarRodada, proximaAcao, NOTA_MINIMA, LIMITE_DE_RODADAS } from './rodadas.js';
export { empilharColuna, segmentosSeCruzam } from './colunas.js';
