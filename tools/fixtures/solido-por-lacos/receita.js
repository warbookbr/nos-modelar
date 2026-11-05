/* solido-por-lacos — a peça de teste neutra do plano do sólido por laços: um L de ponta-cabeça de 190 por 220 mm fechado numa
 * malha só pela subdivisão da gaiola que `gaiolaPorLacos` monta a partir de um laço por plano x, com as paredes de lado tampadas
 * em escada e vincos vivos na borda de baixo e na borda da saída (a forma e os laços estão em `forma.js`). As medidas estão em
 * `docs/modelar/banco-de-provas/solido-por-lacos-2026-11-05/README.md`. Nenhum dado vem de referência externa. */
import { PLANO, TABELA, derivar } from './forma.js';

export { TABELA };

export function gerarPassos(T = TABELA) {
  const { passo } = derivar(T);
  return [
    ['subdivisao', { origemId: 1, ...passo, niveis: T.niveis }],
    ['parte', { nome: 'corpo', sel: { origem: { op: 'subdivisao', id: 1 } } }],
  ];
}

export default {
  meta: { nome: 'solido-por-lacos', desc: 'L de ponta-cabeça fechado numa malha só por subdivisão de uma gaiola de laços, um por plano x' },
  TABELA,
  PARAMS: TABELA,
  get TOPO() { return { origem: 'centro do pé no chão; y para cima, a saída para +z', ...derivar(this.PARAMS).pontos }; },
  get PASSOS() { return gerarPassos(this.PARAMS); },
  PLANO,
};
