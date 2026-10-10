/* implementacao.js — a articulação não emite vértice nem face. Recebe somente a
   resolução numérica do contexto e lê a declaração; declaração inválida
   descarta o passo inteiro, como em qualquer extensão. A conferência do curso
   contra as malhas das duas peças acontece depois, na montagem, porque a
   extensão nativa não vê malha. */
import { lerArticulacao } from './declaracao.js';

export function implementar(contexto, argumentos = {}) {
  const lido = lerArticulacao({ ...argumentos, passos: contexto.numero(argumentos.passos) }, 'articulacao');
  return lido.articulacao;
}
