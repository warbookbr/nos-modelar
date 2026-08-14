/* separacao-direcional.js — mede intervalos projetados sem alegar colisão geral. */

function normalizar(vetor) {
  const norma = Math.hypot(...vetor);
  return vetor.map((valor) => valor / norma);
}

function transformarDirecao(vetor, pose) {
  return pose.rotacao.map((linha) => linha.reduce((soma, valor, indice) => soma + valor * vetor[indice], 0));
}

function transformarPonto(ponto, pose) {
  return pose.rotacao.map((linha, eixo) => linha.reduce(
    (soma, valor, indice) => soma + valor * ponto[indice],
    pose.deslocamento[eixo],
  ));
}

function projetar(ponto, eixo) {
  return ponto.reduce((soma, valor, indice) => soma + valor * eixo[indice], 0);
}

export function validarSeparacaoDirecional({
  pontosReferencia,
  poseReferencia,
  pontosMovel,
  poseMovel,
  eixoLocal,
  poseMontagem,
  separacaoMinima,
  toleranciaNumerica,
}) {
  const eixoMundo = normalizar(transformarDirecao(normalizar(eixoLocal), poseMontagem));
  const projecoesReferencia = pontosReferencia.map((ponto) => projetar(transformarPonto(ponto, poseReferencia), eixoMundo));
  const projecoesMovel = pontosMovel.map((ponto) => projetar(transformarPonto(ponto, poseMovel), eixoMundo));
  const maxReferencia = Math.max(...projecoesReferencia);
  const minMovel = Math.min(...projecoesMovel);
  const separacaoDirecional = minMovel - maxReferencia;
  const satisfeita = separacaoDirecional + toleranciaNumerica >= separacaoMinima;
  return {
    satisfeita,
    medidas: {
      disponiveis: true,
      eixoMundo,
      maxReferencia,
      minMovel,
      separacaoDirecional,
      separacaoMinima,
    },
    diagnosticos: satisfeita ? [] : [{
      codigo: 'separacao-direcional-insuficiente',
      mensagem: `separação ${separacaoDirecional} abaixo do mínimo ${separacaoMinima}.`,
      separacaoDirecional,
      separacaoMinima,
    }],
  };
}
