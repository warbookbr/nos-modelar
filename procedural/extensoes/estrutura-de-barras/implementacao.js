/* implementacao.js — emite a malha unida da estrutura de barras pelo contexto limitado da extensão nativa. */
import { construirEstrutura } from './estrutura.js';

export function implementar(contexto, argumentos = {}) {
  const { malha } = construirEstrutura(argumentos, contexto);
  malha.vertices.forEach((ponto, id) => contexto.emitirVertice(id, ponto));
  malha.triangulos.forEach((vertices, id) => contexto.emitirFace(id, vertices));
}
