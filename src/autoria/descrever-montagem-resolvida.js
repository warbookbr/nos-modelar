/* descrever-montagem-resolvida.js — projeta a árvore interna em contexto JSON para IA. */

export const FORMATO_CONTEXTO_MONTAGEM = 'mecanifica.contexto-montagem';
export const VERSAO_CONTEXTO_MONTAGEM = 1;

const copiar = (valor) => valor === undefined ? undefined : JSON.parse(JSON.stringify(valor));
const compararTexto = (a, b) => a < b ? -1 : a > b ? 1 : 0;
function compararCaminho(a, b) {
  for (let indice = 0; indice < Math.min(a.length, b.length); indice += 1) {
    const ordem = compararTexto(a[indice], b[indice]);
    if (ordem !== 0) return ordem;
  }
  return a.length - b.length;
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

export function descreverMontagemResolvida(montagemResolvida) {
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

  return {
    formato: FORMATO_CONTEXTO_MONTAGEM,
    versao: VERSAO_CONTEXTO_MONTAGEM,
    raiz: { id: montagemResolvida.id },
    totais: {
      pecas: instancias.filter((item) => item.alvo.tipo === 'peca').length,
      montagens: instancias.filter((item) => item.alvo.tipo === 'montagem').length,
      relacoesDeclaradas: relacoes.length,
      satisfeitas: relacoes.filter((item) => item.satisfeita === true).length,
      reprovadas: relacoes.filter((item) => item.satisfeita === false).length,
    },
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
}
