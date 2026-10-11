/* Fixture de teste: receita que compõe por `CHAMADAS_COMPOSICOES` e deriva as
   chamadas de `PARAMS`. Uma base e um pilar com `folga` entre eles; `largura` e
   `altura` movem as caixas, `folga` move a relação, e `inerte` não entra na
   geometria. Usada por `tools/mecanifica/composicao-na-varredura.test.mjs`. */
import { ID_BLOCO } from './composicoes.js';

export const receita = {
  meta: { nome: 'composicao-parametrica', tipo: 'peca', desc: 'base e pilar compostos por parâmetros' },
  PARAMS: { largura: 0.10, altura: 0.06, folga: 0.01, inerte: 0.5 },
  MATERIAIS: { aco: { cor: '#888888' } },
  get CHAMADAS_COMPOSICOES() {
    const p = this.PARAMS;
    const espessura = 0.02;
    return [
      {
        id: 'base', composicao: ID_BLOCO,
        argumentos: { origem: 1, largura: p.largura, altura: espessura, profundidade: 0.05, centro: [0, 0, 0], parte: 'base', material: 'aco' },
      },
      {
        id: 'pilar', composicao: ID_BLOCO,
        argumentos: { origem: 2, largura: 0.02, altura: p.altura, profundidade: 0.02, centro: [0, espessura + p.folga, 0], parte: 'pilar', material: 'aco' },
      },
    ];
  },
};
export default receita;
