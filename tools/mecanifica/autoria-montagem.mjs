/* autoria-montagem.mjs — planejamento e aplicação interna de montagens v1/v2/v3. */
import { lerMontagemPersistida } from '../../src/autoria/ler-montagem-persistida.js';
import { resolverMontagemPersistida } from '../../src/autoria/resolver-montagem-persistida.js';
import { derivarImpactoMontagem } from '../../src/autoria/derivar-impacto-montagem.js';
import { derivarRoteiroRevalidacao } from '../../src/autoria/derivar-roteiro-revalidacao.js';
import { lerRevisaoAtivaAutoria, materializarRevisaoAutoria, planejarRevisaoAutoria } from './repositorio-autoria.mjs';

export const FORMATO_PLANO_AUTORIA_MONTAGEM = 'mecanifica.plano-autoria-montagem';
export const VERSAO_PLANO_AUTORIA_MONTAGEM = 1;
export const ARQUIVO_MONTAGEM = 'montagem.json';

export class ErroAutoriaMontagem extends Error {
  constructor(codigo, campo, mensagem, acao, causa) {
    super(`${campo}: ${mensagem}`);
    this.name = 'ErroAutoriaMontagem';
    this.codigo = codigo;
    this.campo = campo;
    this.acao = acao;
    if (causa !== undefined) this.causa = causa;
  }
}

const texto = (valor) => JSON.stringify(valor);
function canonico(valor) {
  if (Array.isArray(valor)) return `[${valor.map(canonico).join(',')}]`;
  if (valor && typeof valor === 'object') {
    return `{${Object.keys(valor).sort().map((chave) => `${JSON.stringify(chave)}:${canonico(valor[chave])}`).join(',')}}`;
  }
  return texto(valor);
}

function falhar(codigo, campo, mensagem, acao, causa) {
  throw new ErroAutoriaMontagem(codigo, campo, mensagem, acao, causa);
}

function bytesDaMontagem(montagem) {
  return `${canonico(montagem)}\n`;
}

function confirmarEsperado(plano) {
  return {
    formato: FORMATO_PLANO_AUTORIA_MONTAGEM,
    versao: VERSAO_PLANO_AUTORIA_MONTAGEM,
    entidade: plano.entidade,
    pai: plano.pai,
    objeto: plano.repositorio.objeto,
    commit: plano.repositorio.commit,
  };
}

function compararConfirmacao(observada, esperada) {
  return canonico(observada) === canonico(esperada);
}

function resumoDaAlteracao(pai, montagem) {
  return {
    operacao: pai === null ? 'criacao' : 'alteracao',
    montagem: montagem.id,
    versao: montagem.versao,
    relacoes: montagem.relacoes?.length ?? 0,
  };
}

function diagnosticarResolucao(erro) {
  return {
    codigo: erro?.codigo ?? 'candidato-invalido',
    campo: erro?.caminho ?? erro?.campo ?? '$montagem',
    mensagem: erro instanceof Error ? erro.message : String(erro),
    acao: 'Corrija a montagem e valide novamente antes de confirmar.',
  };
}

export function planejarAutoriaMontagem({ entidade, montagem, montagemBytes: bytesFornecidos, pai = null } = {}) {
  let validada;
  let montagemBytes;
  try {
    if (bytesFornecidos !== undefined) {
      if (typeof bytesFornecidos !== 'string' || bytesFornecidos.length === 0) {
        falhar('montagem-invalida', '$montagemBytes', 'precisa ser texto JSON não vazio.', 'Informe os bytes completos de uma montagem persistida.');
      }
      validada = lerMontagemPersistida(JSON.parse(bytesFornecidos));
      montagemBytes = bytesFornecidos;
    } else {
      validada = lerMontagemPersistida(montagem);
      montagemBytes = bytesDaMontagem(validada);
    }
  } catch (erro) {
    if (erro instanceof ErroAutoriaMontagem) throw erro;
    falhar('montagem-invalida', '$montagem', erro instanceof Error ? erro.message : String(erro), 'Corrija o documento v1/v2/v3 antes de planejar.', erro);
  }
  const repositorio = planejarRevisaoAutoria({ entidade, conteudo: { [ARQUIVO_MONTAGEM]: montagemBytes }, pai });
  return {
    formato: FORMATO_PLANO_AUTORIA_MONTAGEM,
    versao: VERSAO_PLANO_AUTORIA_MONTAGEM,
    entidade,
    pai,
    montagem: validada,
    montagemBytes,
    repositorio,
    resumo: resumoDaAlteracao(pai, validada),
  };
}

export function confirmarAutoriaMontagem(plano, confirmacao = confirmarEsperado(plano)) {
  const esperada = confirmarEsperado(plano);
  if (!compararConfirmacao(confirmacao, esperada)) {
    falhar('confirmacao-divergente', '$confirmacao', 'a confirmação não corresponde ao plano e aos bytes canônicos.', 'Releia o plano e confirme entidade, pai, objeto e commit sem alterações.');
  }
  return { ...plano, confirmacao: esperada };
}

function exigirConfirmacao(plano, confirmacao) {
  const observada = confirmacao ?? plano?.confirmacao;
  if (!observada) {
    falhar('confirmacao-ausente', '$confirmacao', 'a aplicação exige confirmação explícita do plano.', 'Confirme o plano com confirmarAutoriaMontagem antes de aplicar.');
  }
  return confirmarAutoriaMontagem(plano, observada);
}

export async function observarAutoriaMontagem({ raiz, entidade, fs } = {}) {
  const ativa = await lerRevisaoAtivaAutoria(raiz, entidade, { fs });
  if (!ativa) return { revisao: null, objeto: null, montagem: null };
  const bytes = ativa.conteudo?.[ARQUIVO_MONTAGEM];
  if (typeof bytes !== 'string') {
    falhar('snapshot-invalido', 'conteudo', `a revisão ativa não contém ${ARQUIVO_MONTAGEM}.`, 'Preserve a revisão e recupere um snapshot de montagem válido.');
  }
  let montagem;
  try { montagem = lerMontagemPersistida(JSON.parse(bytes)); } catch (erro) {
    falhar('snapshot-invalido', ARQUIVO_MONTAGEM, erro instanceof Error ? erro.message : String(erro), 'Preserve a revisão e recupere um snapshot de montagem válido.', erro);
  }
  return { revisao: ativa.commit, objeto: ativa.objeto, montagem };
}

export async function validarAutoriaMontagem(plano, { carregarPeca, carregarMontagem } = {}) {
  const recomputado = planejarAutoriaMontagem({ entidade: plano?.entidade, montagem: plano?.montagem, montagemBytes: plano?.montagemBytes, pai: plano?.pai });
  if (recomputado.repositorio.commit !== plano?.repositorio?.commit
    || recomputado.repositorio.objeto !== plano?.repositorio?.objeto
    || recomputado.montagemBytes !== plano?.montagemBytes) {
    falhar('plano-divergente', '$plano', 'o plano não corresponde aos bytes canônicos da montagem.', 'Planeje novamente e confirme o plano intacto.');
  }
  try {
    const resolvida = await resolverMontagemPersistida(plano.montagem, { carregarPeca, carregarMontagem });
    return { estado: 'validado', montagem: plano.montagem, resolvida, resumo: plano.resumo };
  } catch (erro) {
    const diagnostico = diagnosticarResolucao(erro);
    falhar('candidato-invalido', diagnostico.campo, diagnostico.mensagem, diagnostico.acao, erro);
  }
}

export async function materializarAutoriaMontagem({ raiz, plano, confirmacao, carregarPeca, carregarMontagem, falhaInjetada, fs, telemetria } = {}) {
  const confirmado = exigirConfirmacao(plano, confirmacao);
  const validacao = await validarAutoriaMontagem(confirmado, { carregarPeca, carregarMontagem });
  const resultado = await materializarRevisaoAutoria({
    raiz,
    plano: confirmado.repositorio,
    falhaInjetada,
    fs,
    telemetria,
  });
  return { ...resultado, validacao: { estado: validacao.estado, resumo: validacao.resumo } };
}

function chaveRelacao(montagem, id) {
  return `${JSON.stringify(montagem)}\0${id}`;
}

function relacoesDaArvore(montagem, caminho = [], resultado = new Map()) {
  for (const relacao of montagem.relacoes ?? []) resultado.set(chaveRelacao(caminho, relacao.id), relacao);
  for (const instancia of montagem.instancias ?? []) {
    if (instancia.alvo.tipo === 'montagem') relacoesDaArvore(instancia.montagem, instancia.caminho, resultado);
  }
  return resultado;
}

function capturasSemanticas(capturas) {
  return capturas
    .map((captura) => JSON.stringify((captura.instancias ?? []).map((caminho) => caminho.slice()).sort((a, b) => canonico(a).localeCompare(canonico(b), 'pt-BR'))))
    .filter(Boolean);
}

async function validarInspecaoVisual({ montagem, alvo, necessaria, capturarVistas, vistas }) {
  if (!necessaria) return { estado: 'nao-necessaria', vistas: [] };
  if (typeof capturarVistas !== 'function') {
    return { estado: 'pendente', codigo: 'inspecao-visual-ausente', acao: 'Forneça duas vistas reais antes de promover a montagem.' };
  }
  const fases = {};
  for (const fase of ['proposta', 'resultado']) {
    let captura;
    try {
      captura = await capturarVistas({ montagem, caminho: alvo.caminho.slice(), vistas: vistas.slice(), fase });
    } catch (erro) {
      return { estado: 'falhou', fase, codigo: 'inspecao-visual-falhou', mensagem: erro instanceof Error ? erro.message : String(erro), acao: 'Corrija a captura e repita a inspeção antes de promover.' };
    }
    const capturas = captura?.resultado?.capturas ?? captura?.capturas;
    if (captura?.ok === false || !Array.isArray(capturas) || capturas.length < 2) {
      return { estado: 'falhou', fase, codigo: 'inspecao-visual-incompleta', acao: 'Cada fase precisa de pelo menos duas vistas válidas.' };
    }
    const duas = capturas.slice(0, 2);
    const nomes = duas.map((item) => item.nome);
    const semanticas = capturasSemanticas(duas);
    if (new Set(nomes).size !== 2 || semanticas.length !== 2 || semanticas[0] !== semanticas[1]) {
      return { estado: 'falhou', fase, codigo: 'inspecao-visual-inconsistente', acao: 'Capture duas vistas distintas do mesmo conjunto semântico.' };
    }
    fases[fase] = { vistas: nomes, instancias: JSON.parse(semanticas[0]) };
  }
  return { estado: 'aprovada', vistas: fases.proposta.vistas, instancias: fases.proposta.instancias, proposta: fases.proposta, resultado: fases.resultado };
}

function construirRevalidacao({ impacto, roteiro, candidato, anterior }) {
  const atuais = relacoesDaArvore(candidato);
  const anteriores = anterior ? relacoesDaArvore(anterior) : new Map();
  const relacoes = [...impacto.relacoesDiretas, ...impacto.relacoesIndiretas].map((relacao) => {
    const chave = chaveRelacao(relacao.montagem.caminho, relacao.id);
    const atual = atuais.get(chave);
    const antes = anteriores.get(chave);
    return {
      montagem: relacao.montagem,
      id: relacao.id,
      alcance: impacto.relacoesDiretas.includes(relacao) ? 'direta' : 'indireta',
      antes: antes?.satisfeita ?? null,
      depois: atual?.satisfeita ?? relacao.satisfeita,
      estado: atual?.satisfeita === true ? 'aprovada' : atual?.satisfeita === false ? 'falhou' : 'pendente',
    };
  });
  const foraDeCobertura = roteiro.pendencias.map((pendencia) => ({
    codigo: pendencia.codigo,
    estado: 'fora-de-cobertura',
    acao: pendencia.acao,
  }));
  return {
    formato: 'mecanifica.revalidacao-montagem',
    versao: 1,
    relacoes,
    foraDeCobertura,
    aprovadas: relacoes.filter((item) => item.estado === 'aprovada').length,
    falhas: relacoes.filter((item) => item.estado === 'falhou').length,
    pendentes: relacoes.filter((item) => item.estado === 'pendente').length,
  };
}

export async function prepararPromocaoAutoriaMontagem({ plano, alvo, anterior, carregadores = {}, inspecaoVisual = {}, capturarVistas, vistas = ['isometrica', 'direita'] } = {}) {
  const confirmado = exigirConfirmacao(plano);
  const validacao = await validarAutoriaMontagem(confirmado, carregadores);
  let impacto;
  let roteiro;
  try {
    impacto = derivarImpactoMontagem(validacao.resolvida, alvo);
    roteiro = derivarRoteiroRevalidacao(validacao.resolvida, alvo);
  } catch (erro) {
    falhar('impacto-invalido', '$alvo', erro instanceof Error ? erro.message : String(erro), 'Informe um alvo semântico existente na montagem candidata.', erro);
  }
  const revalidacao = construirRevalidacao({ impacto, roteiro, candidato: validacao.resolvida, anterior });
  const visual = await validarInspecaoVisual({
    montagem: validacao.resolvida,
    alvo,
    necessaria: inspecaoVisual.necessaria !== false,
    capturarVistas: capturarVistas ?? inspecaoVisual.capturar,
    vistas: inspecaoVisual.vistas ?? vistas,
  });
  const bloqueios = [
    ...revalidacao.relacoes.filter((item) => item.estado === 'falhou' || item.estado === 'pendente').map((item) => ({ codigo: `relacao-${item.estado}`, id: item.id })),
    ...(visual.estado !== 'aprovada' && visual.estado !== 'nao-necessaria' ? [{ codigo: visual.codigo } ] : []),
  ];
  return {
    estado: bloqueios.length === 0 ? 'aprovado' : 'recusado',
    plano: confirmado,
    validacao: { estado: validacao.estado, resumo: validacao.resumo },
    impacto,
    roteiro,
    revalidacao,
    visual,
    bloqueios,
  };
}

export async function promoverAutoriaMontagem({ raiz, plano, alvo, anterior, carregadores = {}, inspecaoVisual = {}, capturarVistas, vistas, falhaInjetada, fs, telemetria } = {}) {
  const promocao = await prepararPromocaoAutoriaMontagem({ plano, alvo, anterior, carregadores, inspecaoVisual, capturarVistas, vistas });
  if (promocao.estado !== 'aprovado') {
    falhar('promocao-recusada', '$promocao', 'a montagem não passou todos os gates de impacto, revalidação e inspeção.', 'Consulte bloqueios, corrija a proposta e repita a promoção.');
  }
  const resultado = await materializarRevisaoAutoria({ raiz, plano: promocao.plano.repositorio, falhaInjetada, fs, telemetria });
  return { ...promocao, resultado };
}
