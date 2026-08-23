/* Orquestração pura da N1: planeja, diagnostica e registra transições.
   Não compila, renderiza, persiste ou publica nada por conta própria. */

import {
  ETAPAS_AUTORIA, FORMATO_REGISTRO_PROVEDORES, normalizarObjetivoAutoria,
} from './contrato-autoria-3d.js';

export const FORMATO_PLANO_FLUXO_AUTORIA = 'mecanifica.plano-fluxo-autoria@1';
export const FORMATO_EXECUCAO_FLUXO_AUTORIA = 'mecanifica.execucao-fluxo-autoria@1';
export const FORMATO_PROTOCOLO_FLUXO_AUTORIA = 'mecanifica.protocolo-fluxo-autoria@1';

const PERFIS = Object.freeze({
  'peca-mecanica': ['briefing', 'alvo', 'decomposicao', 'integracao', 'superficie', 'revisao', 'promocao'],
  veiculo: [...ETAPAS_AUTORIA],
  humanoide: [...ETAPAS_AUTORIA],
  'sistema-articulado': ['briefing', 'alvo', 'decomposicao', 'integracao', 'estados', 'revisao', 'promocao'],
});

const CLASSE_ETAPA = Object.freeze({
  briefing: 'objetivo', alvo: 'referencia', andaime: 'forma-global', blocagem: 'forma-global',
  decomposicao: 'semantica', integracao: 'montagem', superficie: 'superficie',
  estados: 'estados', revisao: 'validacao', promocao: 'publicacao',
});

export function descreverProtocoloAutoria(familia) {
  const etapas = PERFIS[familia];
  if (!etapas) falhar('familia-invalida', `família '${familia}' não possui protocolo de autoria.`);
  return congelar({
    formato: FORMATO_PROTOCOLO_FLUXO_AUTORIA, familia,
    etapas: etapas.map((id) => ({ id, classe: CLASSE_ETAPA[id] })),
  });
}

export class ErroFluxoAutoria extends Error {
  constructor(codigo, mensagem) {
    super(`fluxo de autoria: ${mensagem}`);
    this.name = 'ErroFluxoAutoria';
    this.codigo = codigo;
  }
}

const comparar = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const simples = (valor) => valor !== null && typeof valor === 'object' && !Array.isArray(valor);
function congelar(valor) {
  if (valor && typeof valor === 'object' && !Object.isFrozen(valor)) {
    Object.values(valor).forEach(congelar); Object.freeze(valor);
  }
  return valor;
}
function falhar(codigo, mensagem) { throw new ErroFluxoAutoria(codigo, mensagem); }
function conferirSerializavel(valor, caminho = '$', vistos = new Set()) {
  if (valor === null || typeof valor === 'string' || typeof valor === 'boolean') return;
  if (typeof valor === 'number') {
    if (!Number.isFinite(valor)) falhar('nao-serializavel', `${caminho} contém número não finito.`);
    return;
  }
  if (typeof valor !== 'object') falhar('nao-serializavel', `${caminho} contém tipo '${typeof valor}'.`);
  if (vistos.has(valor)) falhar('nao-serializavel', `${caminho} contém ciclo.`);
  vistos.add(valor);
  if (!Array.isArray(valor) && Object.getPrototypeOf(valor) !== Object.prototype && Object.getPrototypeOf(valor) !== null) {
    falhar('nao-serializavel', `${caminho} precisa usar objeto simples.`);
  }
  Object.entries(valor).forEach(([chave, item]) => conferirSerializavel(item, `${caminho}.${chave}`, vistos));
  vistos.delete(valor);
}
function copia(valor) { conferirSerializavel(valor); return JSON.parse(JSON.stringify(valor)); }
function diagnostico(codigo, campo, causa, impacto, proximoPasso) {
  return congelar({ codigo, campo, causa, impacto, proximoPasso });
}
function conferirDiagnosticos(valor, provedor) {
  if (valor === undefined) return [];
  if (!Array.isArray(valor)) falhar('resposta-provedor-invalida', `provedor '${provedor}' retornou diagnósticos fora de uma lista.`);
  return valor.map((item, indice) => {
    if (!simples(item) || !['codigo', 'campo', 'causa', 'impacto', 'proximoPasso'].every((campo) => typeof item[campo] === 'string' && item[campo].trim())) {
      falhar('resposta-provedor-invalida', `diagnóstico ${indice} do provedor '${provedor}' está incompleto.`);
    }
    return { codigo: item.codigo.trim(), campo: item.campo.trim(), causa: item.causa.trim(), impacto: item.impacto.trim(), proximoPasso: item.proximoPasso.trim() };
  });
}
function conferirResposta(valor, provedor) {
  if (!simples(valor) || !['coberta', 'nao-coberta', 'bloqueada'].includes(valor.estado)) {
    falhar('resposta-provedor-invalida', `provedor '${provedor}' precisa retornar estado coberta, nao-coberta ou bloqueada.`);
  }
  const custo = valor.custo ?? 0;
  if (typeof custo !== 'number' || !Number.isFinite(custo) || custo < 0) falhar('resposta-provedor-invalida', `provedor '${provedor}' retornou custo inválido.`);
  if (valor.estado === 'coberta' && (!simples(valor.plano) || valor.plano === null)) falhar('resposta-provedor-invalida', `provedor '${provedor}' cobriu a necessidade sem plano serializável.`);
  return congelar({
    estado: valor.estado, custo, plano: valor.plano === undefined ? null : copia(valor.plano),
    lacuna: valor.lacuna === undefined ? null : copia(valor.lacuna),
    diagnosticos: conferirDiagnosticos(valor.diagnosticos, provedor),
  });
}

function necessidadesDoFluxo(objetivo) {
  const basicas = descreverProtocoloAutoria(objetivo.familia).etapas.map(({ id: etapa, classe }) => ({
    id: `etapa-${etapa}`, etapa, classe,
    artefatos: { entra: [], sai: [] }, interfaces: { entra: [], sai: [] },
    requisitos: [], obrigatoria: true, origem: 'fluxo',
  }));
  return [...basicas, ...objetivo.necessidades.map((item) => ({ ...item, origem: 'objetivo' }))]
    .sort((a, b) => ETAPAS_AUTORIA.indexOf(a.etapa) - ETAPAS_AUTORIA.indexOf(b.etapa) || comparar(a.id, b.id));
}

export function planejarFluxoAutoria({ objetivo: bruto, provedores }) {
  const objetivo = normalizarObjetivoAutoria(bruto);
  if (!provedores || provedores.formato !== FORMATO_REGISTRO_PROVEDORES
    || typeof provedores.candidatos !== 'function' || typeof provedores.planejar !== 'function') {
    falhar('registro-invalido', 'informe um registro de provedores de autoria válido.');
  }
  const bloqueiosReferencia = objetivo.incertezas.filter(({ efeito }) => efeito === 'bloqueia');
  if (bloqueiosReferencia.length) {
    return congelar({
      formato: FORMATO_PLANO_FLUXO_AUTORIA, estado: 'bloqueado', objetivo,
      etapas: [], escolhas: [],
      diagnosticos: bloqueiosReferencia.map(({ id, sobre, motivo }) => diagnostico(
        'referencia-bloqueada', `incertezas.${id}`, motivo,
        `não é seguro planejar precisão sobre ${sobre}.`, 'resolva a incerteza ou rebaixe explicitamente o objetivo para exploração.',
      )),
    });
  }

  const escolhas = [], diagnosticos = [];
  for (const necessidade of necessidadesDoFluxo(objetivo)) {
    const candidatos = provedores.candidatos({ familia: objetivo.familia, etapa: necessidade.etapa, classe: necessidade.classe });
    if (!candidatos.length) {
      if (necessidade.obrigatoria) diagnosticos.push(diagnostico(
        'provedor-ausente', `necessidades.${necessidade.id}`, `nenhum provedor declara classe '${necessidade.classe}' na etapa '${necessidade.etapa}'.`,
        'a etapa obrigatória não possui execução planejável.', 'registre a lacuna e prove um provedor interno antes de avançar.',
      ));
      escolhas.push({ necessidade: necessidade.id, etapa: necessidade.etapa, estado: necessidade.obrigatoria ? 'bloqueada' : 'omitida', provedor: null, custo: null, plano: null, lacuna: null });
      continue;
    }
    const respostas = [];
    for (const candidato of candidatos) {
      try {
        respostas.push({ provedor: candidato.id, ...conferirResposta(provedores.planejar(candidato.id, { objetivo, necessidade }), candidato.id) });
      } catch (erro) {
        diagnosticos.push(diagnostico(
          'falha-de-provedor', `provedores.${candidato.id}`, erro instanceof Error ? erro.message : String(erro),
          `o candidato não pode ser usado para '${necessidade.id}'.`, 'corrija o provedor ou selecione alternativa com contrato equivalente.',
        ));
      }
    }
    const cobertas = respostas.filter(({ estado }) => estado === 'coberta').sort((a, b) => a.custo - b.custo || comparar(a.provedor, b.provedor));
    const escolhida = cobertas[0] ?? null;
    if (escolhida) {
      escolhas.push({ necessidade: necessidade.id, etapa: necessidade.etapa, estado: 'planejada', provedor: escolhida.provedor, custo: escolhida.custo, plano: escolhida.plano, lacuna: null });
      diagnosticos.push(...escolhida.diagnosticos);
      continue;
    }
    const explicacao = respostas.find(({ estado }) => estado === 'bloqueada') ?? respostas[0] ?? null;
    if (necessidade.obrigatoria) diagnosticos.push(...(explicacao?.diagnosticos.length ? explicacao.diagnosticos : [diagnostico(
      'necessidade-nao-coberta', `necessidades.${necessidade.id}`, 'os provedores candidatos não encontraram cadeia compatível.',
      'o fluxo não pode presumir capacidade nem inventar operação.', 'preserve a classificação da lacuna e abra uma prova mínima.',
    )]));
    escolhas.push({
      necessidade: necessidade.id, etapa: necessidade.etapa,
      estado: necessidade.obrigatoria ? 'bloqueada' : 'omitida', provedor: null, custo: null,
      plano: null, lacuna: explicacao?.lacuna ?? null,
    });
  }

  const bloqueado = escolhas.some(({ estado }) => estado === 'bloqueada');
  const etapas = PERFIS[objetivo.familia].map((id) => ({
    id, estado: escolhas.some((item) => item.etapa === id && item.estado === 'bloqueada') ? 'bloqueada' : 'planejada',
    necessidades: escolhas.filter((item) => item.etapa === id).map(({ necessidade }) => necessidade),
  }));
  return congelar({
    formato: FORMATO_PLANO_FLUXO_AUTORIA, estado: bloqueado ? 'bloqueado' : 'pronto',
    objetivo, etapas, escolhas, diagnosticos,
  });
}

function conferirPlano(plano) {
  if (!plano || plano.formato !== FORMATO_PLANO_FLUXO_AUTORIA || !Array.isArray(plano.etapas)) falhar('plano-invalido', 'plano de fluxo inválido.');
  return plano;
}

export function criarExecucaoFluxoAutoria(plano) {
  conferirPlano(plano);
  if (plano.estado !== 'pronto') falhar('plano-bloqueado', 'não é permitido executar plano bloqueado.');
  if (!plano.etapas.length) falhar('plano-vazio', 'plano pronto precisa ter etapas.');
  return congelar({
    formato: FORMATO_EXECUCAO_FLUXO_AUTORIA, objetivo: plano.objetivo,
    estado: 'em-execucao', etapaAtual: plano.etapas[0].id,
    etapas: plano.etapas.map(({ id }) => ({ id, estado: 'pendente' })), historico: [],
  });
}

function decisaoObrigatoria(execucao, etapa) {
  return etapa === 'promocao' || (etapa === 'blocagem' && ['veiculo', 'humanoide'].includes(execucao.objetivo.familia));
}

export function registrarResultadoEtapa(execucao, resultado) {
  if (!execucao || execucao.formato !== FORMATO_EXECUCAO_FLUXO_AUTORIA || !Array.isArray(execucao.etapas)) falhar('execucao-invalida', 'execução de fluxo inválida.');
  if (execucao.estado !== 'em-execucao') falhar('execucao-encerrada', `execução está '${execucao.estado}' e não aceita novo resultado.`);
  if (!simples(resultado)) falhar('resultado-invalido', 'resultado precisa ser objeto.');
  const permitidas = ['etapa', 'estado', 'evidencias', 'diagnosticos', 'decisaoUsuario'];
  const extras = Object.keys(resultado).filter((campo) => !permitidas.includes(campo));
  if (extras.length || permitidas.some((campo) => !Object.hasOwn(resultado, campo))) falhar('resultado-invalido', 'resultado tem campos ausentes ou desconhecidos.');
  if (resultado.etapa !== execucao.etapaAtual) falhar('salto-de-etapa', `esperado '${execucao.etapaAtual}', recebido '${resultado.etapa}'.`);
  if (!['aprovada', 'reprovada', 'bloqueada'].includes(resultado.estado)) falhar('resultado-invalido', 'estado precisa ser aprovada, reprovada ou bloqueada.');
  if (!Array.isArray(resultado.evidencias) || resultado.evidencias.some((item) => typeof item !== 'string' || !item.trim())) falhar('evidencia-invalida', 'evidências precisam ser IDs semânticos não vazios.');
  if (resultado.estado === 'aprovada' && !resultado.evidencias.length) falhar('evidencia-ausente', 'aprovação sem evidência é proibida.');
  const diags = conferirDiagnosticos(resultado.diagnosticos, 'resultado-etapa');
  if (resultado.estado !== 'aprovada' && !diags.length) falhar('diagnostico-ausente', 'reprovação ou bloqueio exige diagnóstico acionável.');
  const decisao = resultado.decisaoUsuario;
  if (decisao !== null && !['aprovar', 'reprovar'].includes(decisao)) falhar('decisao-invalida', 'decisão do usuário precisa ser aprovar, reprovar ou null.');
  if (resultado.estado === 'aprovada' && decisaoObrigatoria(execucao, resultado.etapa) && decisao !== 'aprovar') {
    falhar('decisao-ausente', `etapa '${resultado.etapa}' exige aceite explícito do usuário.`);
  }
  if (decisao === 'reprovar' && resultado.estado === 'aprovada') falhar('decisao-contraditoria', 'resultado aprovado contradiz decisão de reprovar.');
  if (decisao === 'aprovar' && resultado.estado !== 'aprovada') falhar('decisao-contraditoria', `resultado '${resultado.estado}' contradiz decisão de aprovar.`);

  const etapas = execucao.etapas.map((item) => item.id === resultado.etapa ? { ...item, estado: resultado.estado } : { ...item });
  const historico = [...execucao.historico, {
    etapa: resultado.etapa, estado: resultado.estado,
    evidencias: [...resultado.evidencias].sort(comparar), diagnosticos: diags, decisaoUsuario: decisao,
  }];
  if (resultado.estado !== 'aprovada') return congelar({
    ...copia(execucao), estado: resultado.estado === 'reprovada' ? 'reprovado' : 'bloqueado',
    etapaAtual: resultado.etapa, etapas, historico,
  });
  const indice = etapas.findIndex(({ id }) => id === resultado.etapa);
  const proxima = etapas[indice + 1]?.id ?? null;
  return congelar({
    ...copia(execucao), estado: proxima === null ? 'concluido' : 'em-execucao',
    etapaAtual: proxima, etapas, historico,
  });
}
