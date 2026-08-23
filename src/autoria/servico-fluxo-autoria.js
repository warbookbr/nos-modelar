/* Fachada pura e serializável da N1 para clientes internos caixa-preta. */

import {
  ErroContratoAutoria3D, criarRegistroProvedoresAutoria,
  normalizarObjetivoAutoria, normalizarReceitaAutoral,
} from './contrato-autoria-3d.js';
import {
  criarExecucaoFluxoAutoria, descreverProtocoloAutoria, planejarFluxoAutoria,
  registrarResultadoEtapa,
} from './orquestrar-fluxo-autoria.js';
import {
  FORMATO_COBERTURA_FLUXO_AUTORIA, FORMATO_RESULTADO_PLANEJAMENTO_AUTORIA,
  indiceSchemasAutoria3D,
} from './schemas-autoria-3d.js';

export const FORMATO_SERVICO_FLUXO_AUTORIA = 'mecanifica.servico-fluxo-autoria@1';

function congelar(valor) {
  if (valor && typeof valor === 'object' && !Object.isFrozen(valor)) {
    Object.values(valor).forEach(congelar); Object.freeze(valor);
  }
  return valor;
}

function diagnosticoDeContrato(erro) {
  if (erro instanceof ErroContratoAutoria3D) return {
    codigo: erro.codigo, campo: erro.caminho, causa: erro.message,
    impacto: 'o objetivo não pode entrar no planejamento com contrato ambíguo ou incompleto.',
    proximoPasso: `corrija o campo '${erro.caminho}' e valide novamente.`,
  };
  return {
    codigo: 'objetivo-invalido', campo: '$', causa: erro instanceof Error ? erro.message : String(erro),
    impacto: 'o objetivo não pode ser interpretado com segurança.',
    proximoPasso: 'compare a entrada com o schema público do objetivo e tente novamente.',
  };
}

export function criarServicoFluxoAutoria({ provedores = [] } = {}) {
  const registro = criarRegistroProvedoresAutoria(provedores);
  return Object.freeze({
    formato: FORMATO_SERVICO_FLUXO_AUTORIA,
    schemas: () => indiceSchemasAutoria3D(),
    provedores: () => registro.listar(),
    protocolo: (familia) => descreverProtocoloAutoria(familia),
    cobertura(familia) {
      const protocolo = descreverProtocoloAutoria(familia);
      const etapas = protocolo.etapas.map(({ id, classe }) => {
        const candidatos = registro.candidatos({ familia, etapa: id, classe }).map(({ id: provedor }) => provedor);
        return { id, classe, estado: candidatos.length ? 'coberta' : 'lacuna', provedores: candidatos };
      });
      return congelar({
        formato: FORMATO_COBERTURA_FLUXO_AUTORIA, familia, protocolo: protocolo.formato,
        provedores: registro.listar().map(({ id, versao }) => ({ id, versao })), etapas,
        totais: {
          etapas: etapas.length, cobertas: etapas.filter(({ estado }) => estado === 'coberta').length,
          lacunas: etapas.filter(({ estado }) => estado === 'lacuna').length,
        },
      });
    },
    planejar(entrada) {
      let objetivo;
      try { objetivo = normalizarObjetivoAutoria(entrada); } catch (erro) {
        const diagnosticos = [diagnosticoDeContrato(erro)];
        return congelar({
          formato: FORMATO_RESULTADO_PLANEJAMENTO_AUTORIA, estado: 'invalido',
          plano: null, diagnosticos,
        });
      }
      const plano = planejarFluxoAutoria({ objetivo, provedores: registro });
      return congelar({
        formato: FORMATO_RESULTADO_PLANEJAMENTO_AUTORIA, estado: plano.estado,
        plano, diagnosticos: plano.diagnosticos,
      });
    },
    normalizarReceita: (entrada) => normalizarReceitaAutoral(entrada),
    iniciar: (plano) => criarExecucaoFluxoAutoria(plano),
    registrar: (execucao, resultado) => registrarResultadoEtapa(execucao, resultado),
  });
}
