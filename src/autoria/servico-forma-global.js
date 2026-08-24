/* Fachada pura da N2. Mantém contrato, compilação, medição, render e decisão
   atrás de uma porta única consumível sem conhecer a implementação. */

import {
  avaliarAlvoFormaGlobal, avaliarFormaGlobal, compilarBlocagemGlobal, decidirFormaGlobal,
  normalizarAlvoFormaGlobal, normalizarAndaimeGlobal,
} from './forma-global.js';
import { renderizarPainelFormaGlobalSvg, renderizarVistaFormaGlobalSvg } from './renderizar-forma-global-svg.js';

export const FORMATO_SERVICO_FORMA_GLOBAL = 'mecanifica.servico-forma-global@1';

export function criarServicoFormaGlobal() {
  return Object.freeze({
    formato: FORMATO_SERVICO_FORMA_GLOBAL,
    normalizarAlvo: (entrada) => normalizarAlvoFormaGlobal(entrada),
    normalizarAndaime: (entrada) => normalizarAndaimeGlobal(entrada),
    avaliarAlvo: (alvo, critica = null) => avaliarAlvoFormaGlobal({ alvo, critica }),
    compilar: (alvo, andaime) => compilarBlocagemGlobal({ alvo, andaime }),
    avaliar: (alvo, blocagem, avaliacaoAlvo) => avaliarFormaGlobal({ alvo, blocagem, avaliacaoAlvo }),
    decidir: (avaliacao, critica = null, decisaoUsuario = null) => decidirFormaGlobal({ avaliacao, critica, decisaoUsuario }),
    renderizarVista: (alvo, blocagem, vista, opcoes = {}) => renderizarVistaFormaGlobalSvg({ alvo, blocagem, vista, ...opcoes }),
    renderizarPainel: (alvo, blocagem, opcoes = {}) => renderizarPainelFormaGlobalSvg({ alvo, blocagem, ...opcoes }),
  });
}
