/* index.js — a porta do módulo contorno-da-imagem: segmentação, desenho, medida e rodadas. */
export { tracosDaSemente, segmentar, contornoDaSilhueta, silhuetaEmPedacos, fecharBuracos, suavizarMascara, anexarSemDono, REALCE_PADRAO, MINIMO_DO_PEDACO_PX2, MAXIMO_DO_BURACO_PX2, MAXIMO_DO_DENTE_PX2, ALCANCE_DO_SEM_DONO_PX } from './regioes.js';
export { SUBAMOSTRAS_DA_BORDA, TOLERANCIA_DO_TRACO_PX, MINIMO_DO_PEDACO_SUBPIXEL_PX2, FAIXA_DA_BORDA_PX } from './borda-subpixel.js';
export { aplicarFormas, validarFormas, TOLERANCIA_DA_FORMA_PX, FORMAS_DECLARAVEIS } from './forma-declarada.js';
export { sobreposicao, matizesPorVizinhanca, svgDoMapa, FONTE_DA_ETIQUETA, etiquetasFora, divisas, recortesDasDivisas, folhasDasDivisas, roteiroDoCritico, recortesPorFolha } from './desenho.js';
export { proximidadeDaBorda, MINIMO_NA_BORDA } from './medida.js';
export { validarRodada, proximaAcao, NOTA_MINIMA, LIMITE_DE_RODADAS } from './rodadas.js';
export { empilharColuna, segmentosSeCruzam } from './colunas.js';
