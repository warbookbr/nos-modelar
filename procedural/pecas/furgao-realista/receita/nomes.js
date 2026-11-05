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
export const LUZES = ['lanternaEsquerda', 'lanternaDireita', 'luzDeFreio'];
export const FAROIS = ['farolEsquerdo', 'farolDireito'];
export const PISCAS = ['piscaEsquerdo', 'piscaDireito'];
export const BANCOS = ['bancoMotorista', 'bancoPassageiro'];
export const INTERIOR = ['pisoInterior', 'divisoria', ...BANCOS, 'painel'];
