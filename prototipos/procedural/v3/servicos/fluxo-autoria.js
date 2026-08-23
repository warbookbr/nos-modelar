/* Configuração nativa atual: fluxo N1 + capacidade medida de forma global N2. */

import { criarProvedorContratosAutoria } from '../../../../src/autoria/provedor-contratos-autoria.js';
import { criarProvedorFormaGlobal } from '../../../../src/autoria/provedor-forma-global.js';
import { criarServicoFormaGlobal } from '../../../../src/autoria/servico-forma-global.js';
import { criarServicoFluxoAutoria } from '../../../../src/autoria/servico-fluxo-autoria.js';
import { criarProvedorProceduralAutoria } from './provedor-autoria.js';

export function criarServicoAutoria3DNativa({ provedores = [] } = {}) {
  const fluxo = criarServicoFluxoAutoria({
    provedores: [criarProvedorContratosAutoria(), criarProvedorFormaGlobal(), criarProvedorProceduralAutoria(), ...provedores],
  });
  return Object.freeze({ ...fluxo, formaGlobal: criarServicoFormaGlobal() });
}
