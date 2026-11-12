/* furgao-realista, receita/nomes.js — os nomes das partes, que o PLANO, os PASSOS e os contatos citam: as listas por
 * grupo (rodas, forros, abas, plástico, cristais, borrachas, luzes, interior) e os nomes derivados das abas, dos cristais e das borrachas.
 */

export const nomeDaAbaDoArco = (a) => `abaArco${a.arco === 'arcoD' ? 'Dianteiro' : 'Traseiro'}${a.lado === 'e' ? 'Esquerdo' : 'Direito'}`;

export const nomeDoCristal = (nome) => (nome === 'paraBrisa' ? 'vidroParaBrisa' : nome);
export const nomeDaBorracha = (nome) => `borracha${nome === 'paraBrisa' ? 'ParaBrisa' : nome.replace(/^vidro/, '')}`;

export const PARTES_DA_RODA = ['pneu', 'aro', 'cubo', 'disco'];
export const SUFIXOS_DAS_RODAS = ['DianteiroEsquerdo', 'DianteiroDireito', 'TraseiroEsquerdo', 'TraseiroDireito'];
export const RODAS = SUFIXOS_DAS_RODAS.map((sufixo) => PARTES_DA_RODA.map((parte) => `${parte}${sufixo}`));
export const FORROS = SUFIXOS_DAS_RODAS.map((sufixo) => `forroArco${sufixo}`);
export const ABAS_DOS_VAOS = ['abaVaoParaBrisa', 'abaVaoPortaCabineEsquerda', 'abaVaoPortaCabineDireita', 'abaVaoPortaTraseiraEsquerda', 'abaVaoPortaTraseiraDireita'];
export const ABAS_DOS_ARCOS = ['abaArcoDianteiroEsquerdo', 'abaArcoDianteiroDireito', 'abaArcoTraseiroEsquerdo', 'abaArcoTraseiroDireito'];
export const SAIAS = ['saiaPresaEsquerda', 'saiaPresaDireita', 'saiaPortaCabineEsquerda', 'saiaPortaCabineDireita', 'saiaPortaCorrer'];
export const MOLDURAS = ['molduraArcoDianteiroEsquerdo', 'molduraArcoDianteiroDireito', 'molduraArcoTraseiroEsquerdo', 'molduraArcoTraseiroDireito'];
export const PARACHOQUES = ['parachoqueDianteiro', 'parachoqueTraseiro'];
export const PLASTICOS = [...SAIAS, ...MOLDURAS, ...PARACHOQUES];
export const CRISTAIS = ['vidroParaBrisa', 'vidroPortaCabineEsquerda', 'vidroPortaCabineDireita', 'vidroPortaTraseiraEsquerda', 'vidroPortaTraseiraDireita'];
export const BORRACHAS = ['borrachaParaBrisa', 'borrachaPortaCabineEsquerda', 'borrachaPortaCabineDireita', 'borrachaPortaTraseiraEsquerda', 'borrachaPortaTraseiraDireita'];
/** Os quatro vidros da janela da cabine (o vidro grande da porta e o triângulo fixo, de cada lado), que são vãos pelo contorno, e não da gaiola. */
export const JANELAS_DA_CABINE = ['vidroPortaCabineEsquerda', 'vidroPortaCabineDireita'];
/** A barra preta da coluninha, de cada lado: uma placa de borracha sobre o vidro, parte da moldura. */
export const COLUNAS_DA_JANELA = ['colunaJanelaEsquerda', 'colunaJanelaDireita'];
/** A peça preta da frente do triângulo, a base do retrovisor, de cada lado: um vão de lente preta no tamanho dele, e não vidro. */
export const BASES_DO_RETROVISOR = ['baseRetrovisorEsquerda', 'baseRetrovisorDireita'];
/** As quatro faixas da lente da lanterna de trás, de cima para baixo (freio, ré, pisca e neblina), e a lanterna de cada lado como a lista das suas partes de lente. */
export const FAIXAS_DA_LANTERNA = ['Freio', 'Re', 'Pisca', 'Neblina'];
export const LANTERNAS = ['Esquerda', 'Direita'].flatMap((lado) => FAIXAS_DA_LANTERNA.map((faixa) => `lanterna${faixa}${lado}`));
export const LUZES = [...LANTERNAS, 'luzDeFreio'];
export const FAROIS = ['farolEsquerdo', 'farolDireito'];
/** Os piscas da ponta do farol, que saíram na etapa 8; ficam só porque as cópias das rodadas 18 a 20 importam este módulo vivo. */
export const PISCAS = ['piscaEsquerdo', 'piscaDireito'];
export const AROS =['aroFarolEsquerdo', 'aroFarolDireito'];
export const LUZES_DE_CANTO = ['luzDeCantoEsquerda', 'luzDeCantoDireita'];
export const PISCAS_LATERAIS = ['piscaLateralEsquerdo', 'piscaLateralDireito'];
/** Cada luz da frente com o seu refletor e a sua lâmpada: [luz, refletor, lâmpadas]. */
export const LUZES_POR_DENTRO = [
  ...['Esquerdo', 'Direito'].map((l) => [`farol${l}`, `refletorFarol${l}`, [`lampadaFarol${l}`, `lampadaPosicaoFarol${l}`]]),
  ...['Esquerda', 'Direita'].map((l) => [`luzDeCanto${l}`, `refletorLuzDeCanto${l}`, [`lampadaLuzDeCanto${l}`]]),
  ...['Esquerdo', 'Direito'].map((l) => [`piscaLateral${l}`, `refletorPiscaLateral${l}`, [`lampadaPiscaLateral${l}`]]),
];
/** Cada lanterna com o seu refletor (as quatro conchas numa capa só) e as suas quatro lâmpadas: [lentes, refletor, lâmpadas]. */
export const LANTERNAS_POR_DENTRO = ['Esquerda', 'Direita'].map((l) => [
  FAIXAS_DA_LANTERNA.map((faixa) => `lanterna${faixa}${l}`), `refletorLanterna${l}`, FAIXAS_DA_LANTERNA.map((faixa) => `lampadaLanterna${faixa}${l}`),
]);
export const REFLETORES = LUZES_POR_DENTRO.map(([, r]) => r);
export const LAMPADAS = LUZES_POR_DENTRO.flatMap(([, , l]) => l);
export const BANCOS = ['bancoMotorista', 'bancoPassageiro'];
export const INTERIOR = ['pisoInterior', 'divisoria', ...BANCOS, 'painel'];
/** Os detalhes pequenos da etapa 8 (2026-11-09): a antena do teto (o pé em gota e a haste), as cinco maçanetas (a alça e a placa rasa em anel de cada uma) e a ponteira do escapamento. */
export const ANTENA = ['antenaPe', 'antenaHaste'];
const LOCAIS_DAS_MACANETAS = ['CabineEsquerda', 'CabineDireita', 'Correr', 'TraseiraEsquerda', 'TraseiraDireita'];
export const MACANETAS = LOCAIS_DAS_MACANETAS.map((l) => `macaneta${l}`);
export const PLACAS_DAS_MACANETAS = LOCAIS_DAS_MACANETAS.map((l) => `placaMacaneta${l}`);
export const PONTEIRA = 'ponteiraEscapamento';
export const DETALHES = [...ANTENA, ...MACANETAS, ...PLACAS_DAS_MACANETAS, PONTEIRA];
