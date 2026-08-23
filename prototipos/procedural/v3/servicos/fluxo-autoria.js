/* Configuração nativa atual do fluxo N1: contratos + descoberta procedural. */

import { criarProvedorContratosAutoria } from '../../../../src/autoria/provedor-contratos-autoria.js';
import { criarServicoFluxoAutoria } from '../../../../src/autoria/servico-fluxo-autoria.js';
import { criarProvedorProceduralAutoria } from './provedor-autoria.js';

export function criarServicoAutoria3DNativa({ provedores = [] } = {}) {
  return criarServicoFluxoAutoria({
    provedores: [criarProvedorContratosAutoria(), criarProvedorProceduralAutoria(), ...provedores],
  });
}
