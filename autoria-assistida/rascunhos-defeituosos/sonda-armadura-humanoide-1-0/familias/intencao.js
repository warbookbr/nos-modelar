/* Vocabulário de intenção da sonda: comum nos eixos, específico na função. */
const EIXOS_HUMANOIDES = Object.freeze({
  x: 'lateral; negativo à esquerda e positivo à direita',
  y: 'vertical; positivo em direção à cabeça',
  z: 'profundidade; positivo em direção à frente',
});

export function criarIntencaoArmadura({
  funcao,
  familia,
  invariantes,
  criteriosVisuais,
  eixosLocais = EIXOS_HUMANOIDES,
}) {
  return Object.freeze({
    funcao,
    familia,
    eixosLocais,
    invariantes,
    criteriosVisuais,
  });
}
