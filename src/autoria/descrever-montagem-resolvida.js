/* descrever-montagem-resolvida.js — projeta a árvore interna em contexto JSON para IA. */

export const FORMATO_CONTEXTO_MONTAGEM = 'mecanifica.contexto-montagem';
export const VERSAO_CONTEXTO_MONTAGEM = 1;

export class ErroConsultaContextoMontagem extends Error {
  constructor(codigo, campo, mensagem, acao) {
    super(`${campo}: ${mensagem}`);
    this.name = 'ErroConsultaContextoMontagem';
    this.codigo = codigo;
    this.campo = campo;
    this.acao = acao;
  }
}

const copiar = (valor) => valor === undefined ? undefined : JSON.parse(JSON.stringify(valor));
const compararTexto = (a, b) => a < b ? -1 : a > b ? 1 : 0;
function compararCaminho(a, b) {
  for (let indice = 0; indice < Math.min(a.length, b.length); indice += 1) {
    const ordem = compararTexto(a[indice], b[indice]);
    if (ordem !== 0) return ordem;
  }
  return a.length - b.length;
}

function ehPrefixo(prefixo, caminho) {
  return prefixo.length <= caminho.length && prefixo.every((segmento, indice) => segmento === caminho[indice]);
}

function recalcularTotais(instancias, relacoes) {
  return {
    pecas: instancias.filter((item) => item.alvo.tipo === 'peca').length,
    montagens: instancias.filter((item) => item.alvo.tipo === 'montagem').length,
    relacoesDeclaradas: relacoes.length,
    satisfeitas: relacoes.filter((item) => item.satisfeita === true).length,
    reprovadas: relacoes.filter((item) => item.satisfeita === false).length,
  };
}

function transformarPonto(ponto, pose) {
  return pose.rotacao.map((linha, eixo) => linha.reduce(
    (soma, coeficiente, indice) => soma + coeficiente * ponto[indice],
    pose.deslocamento[eixo],
  ));
}

function caixaDosPontos(pontos) {
  if (pontos.length === 0) return null;
  return {
    min: [0, 1, 2].map((eixo) => Math.min(...pontos.map((ponto) => ponto[eixo]))),
    max: [0, 1, 2].map((eixo) => Math.max(...pontos.map((ponto) => ponto[eixo]))),
  };
}

function unirCaixas(caixas) {
  const presentes = caixas.filter(Boolean);
  if (presentes.length === 0) return null;
  return {
    min: [0, 1, 2].map((eixo) => Math.min(...presentes.map((caixa) => caixa.min[eixo]))),
    max: [0, 1, 2].map((eixo) => Math.max(...presentes.map((caixa) => caixa.max[eixo]))),
  };
}

function descreverPorta(porta) {
  const id = porta.id ?? porta.nome;
  return {
    id,
    rotulo: porta.rotulo ?? id,
    interfaceDisponivel: porta.interface !== undefined,
  };
}

function descreverPeca(instancia) {
  const neutro = instancia.definicao.neutro;
  const partes = [...new Set([...neutro.F.values()].map((face) => face.parte).filter(Boolean))].sort();
  const portas = [...neutro.portas.values()].map(descreverPorta)
    .sort((a, b) => compararTexto(a.id, b.id));
  const pontosMundo = [...neutro.V.values()].map((ponto) => transformarPonto(ponto, instancia.poseMundo));
  return {
    caixaMundo: caixaDosPontos(pontosMundo),
    geometria: { vertices: neutro.V.size, faces: neutro.F.size, partes },
    portas,
  };
}

function descreverRelacao(relacao, caminhoMontagem) {
  const endpoint = (valor) => ({
    caminho: [...caminhoMontagem, ...valor.caminho],
    porta: valor.porta,
  });
  return {
    montagem: caminhoMontagem.slice(),
    id: relacao.id,
    tipo: relacao.tipo,
    referencia: endpoint(relacao.referencia),
    movel: endpoint(relacao.movel),
    especificacao: copiar(relacao.especificacao),
    satisfeita: relacao.satisfeita,
    medidas: copiar(relacao.medidas),
    diagnosticos: copiar(relacao.diagnosticos),
  };
}

function validarConsulta(opcoes, instancias) {
  if (!opcoes || typeof opcoes !== 'object' || Array.isArray(opcoes)) {
    throw new ErroConsultaContextoMontagem(
      'opcoes-invalidas', '$opcoes', 'precisa ser objeto simples.',
      'Informe um objeto com caminho, profundidade e/ou incluirRelacionados.',
    );
  }
  const chaves = Object.keys(opcoes);
  const extras = chaves.filter((chave) => !['caminho', 'profundidade', 'incluirRelacionados'].includes(chave));
  if (extras.length > 0) {
    throw new ErroConsultaContextoMontagem(
      'opcao-desconhecida', extras[0], `opção desconhecida '${extras[0]}'.`,
      'Use somente caminho, profundidade e incluirRelacionados.',
    );
  }
  const caminho = opcoes.caminho ?? [];
  if (!Array.isArray(caminho) || caminho.some((segmento) => typeof segmento !== 'string' || !segmento)) {
    throw new ErroConsultaContextoMontagem(
      'caminho-invalido', 'caminho', 'precisa ser uma lista de IDs semânticos não vazios.',
      'Informe o caminho como array, por exemplo ["freio", "disco"].',
    );
  }
  if (opcoes.profundidade !== undefined && (!Number.isSafeInteger(opcoes.profundidade) || opcoes.profundidade < 0)) {
    throw new ErroConsultaContextoMontagem(
      'profundidade-invalida', 'profundidade', 'precisa ser inteiro não negativo.',
      'Remova profundidade ou informe um inteiro maior ou igual a zero.',
    );
  }
  if (opcoes.incluirRelacionados !== undefined && typeof opcoes.incluirRelacionados !== 'boolean') {
    throw new ErroConsultaContextoMontagem(
      'incluir-relacionados-invalido', 'incluirRelacionados', 'precisa ser booleano.',
      'Informe true ou false.',
    );
  }
  if (caminho.length > 0 && !instancias.some((item) => compararCaminho(item.caminho, caminho) === 0)) {
    throw new ErroConsultaContextoMontagem(
      'caminho-ausente', 'caminho', `instância '${caminho.join('/')}' não existe.`,
      'Consulte instancias[].caminho no contexto completo e escolha um caminho existente.',
    );
  }
  return {
    caminho: caminho.slice(),
    profundidade: opcoes.profundidade ?? null,
    incluirRelacionados: opcoes.incluirRelacionados ?? false,
  };
}

function consultarContexto(contexto, opcoes) {
  const consulta = validarConsulta(opcoes, contexto.instancias);
  if (Object.keys(opcoes).length === 0) return contexto;
  const limite = consulta.profundidade ?? Infinity;
  const foco = contexto.instancias.filter((item) => (
    ehPrefixo(consulta.caminho, item.caminho)
    && item.caminho.length - consulta.caminho.length <= limite
  ));
  const ancestrais = contexto.instancias.filter((item) => (
    item.caminho.length < consulta.caminho.length && ehPrefixo(item.caminho, consulta.caminho)
  ));
  const caminhosFoco = new Set(foco.map((item) => JSON.stringify(item.caminho)));
  const escoposMontagem = new Set([
    ...(consulta.caminho.length === 0 ? [JSON.stringify([])] : []),
    ...foco.filter((item) => item.alvo.tipo === 'montagem').map((item) => JSON.stringify(item.caminho)),
  ]);
  const relacoes = contexto.relacoes.filter((relacao) => (
    escoposMontagem.has(JSON.stringify(relacao.montagem))
    || caminhosFoco.has(JSON.stringify(relacao.referencia.caminho))
    || caminhosFoco.has(JSON.stringify(relacao.movel.caminho))
  ));
  const selecionadas = new Map([...ancestrais, ...foco].map((item) => [JSON.stringify(item.caminho), item]));
  const incluidasPorRelacao = [];
  if (consulta.incluirRelacionados) {
    for (const relacao of relacoes) {
      for (const endpoint of [relacao.referencia, relacao.movel]) {
        for (const instancia of contexto.instancias) {
          const ancestralOuEndpoint = ehPrefixo(instancia.caminho, endpoint.caminho);
          const chave = JSON.stringify(instancia.caminho);
          if (ancestralOuEndpoint && !selecionadas.has(chave)) {
            selecionadas.set(chave, instancia);
            if (compararCaminho(instancia.caminho, endpoint.caminho) === 0) incluidasPorRelacao.push(instancia.caminho.slice());
          }
        }
      }
    }
  }
  const instancias = [...selecionadas.values()].sort((a, b) => compararCaminho(a.caminho, b.caminho));
  incluidasPorRelacao.sort(compararCaminho);
  return {
    ...contexto,
    totais: recalcularTotais(instancias, relacoes),
    instancias,
    relacoes,
    consulta: {
      ...consulta,
      instanciasOmitidas: contexto.instancias.length - instancias.length,
      relacoesOmitidas: contexto.relacoes.length - relacoes.length,
      incluidasPorRelacao,
    },
  };
}

export function descreverMontagemResolvida(montagemResolvida, opcoes = {}) {
  if (!montagemResolvida || typeof montagemResolvida !== 'object' || !Array.isArray(montagemResolvida.instancias)) {
    throw new TypeError('descreverMontagemResolvida: informe uma montagem resolvida.');
  }

  const instancias = [];
  const relacoes = [];

  function percorrer(montagem, caminhoMontagem = []) {
    const caixasFilhas = [];
    for (const instancia of montagem.instancias) {
      let detalhes;
      if (instancia.alvo.tipo === 'peca') {
        detalhes = descreverPeca(instancia);
      } else {
        const caixaMundo = percorrer(instancia.montagem, instancia.caminho);
        detalhes = { caixaMundo, geometria: null, portas: [] };
      }
      caixasFilhas.push(detalhes.caixaMundo);
      instancias.push({
        caminho: instancia.caminho.slice(),
        id: instancia.id,
        alvo: copiar(instancia.alvo),
        poseLocal: copiar(instancia.poseLocal),
        poseMundo: copiar(instancia.poseMundo),
        ...detalhes,
      });
    }
    for (const relacao of montagem.relacoes ?? []) relacoes.push(descreverRelacao(relacao, caminhoMontagem));
    return unirCaixas(caixasFilhas);
  }

  percorrer(montagemResolvida);
  instancias.sort((a, b) => compararCaminho(a.caminho, b.caminho));
  relacoes.sort((a, b) => compararCaminho(a.montagem, b.montagem) || compararTexto(a.id, b.id));

  const contexto = {
    formato: FORMATO_CONTEXTO_MONTAGEM,
    versao: VERSAO_CONTEXTO_MONTAGEM,
    raiz: { id: montagemResolvida.id },
    totais: recalcularTotais(instancias, relacoes),
    instancias,
    relacoes,
    cobertura: {
      relacoesLocaisExecutadas: true,
      colisaoGlobalVerificada: false,
      dependenciasIndiretasVerificadas: false,
      limitacoes: [
        'caixas-mundo-nao-provam-colisao-distancia-ou-folga',
        'hierarquia-de-partes-nao-transportada',
        'dependencias-indiretas-nao-verificadas',
      ],
    },
  };
  return consultarContexto(contexto, opcoes);
}
