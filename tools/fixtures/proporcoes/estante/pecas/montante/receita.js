/* montante da estante de prova: fixture neutra da conferência de proporções. */
export const TABELA = {
  altura: 1800, // @proporcao alturaDaEstante
  espessura: 18, // @proporcao espessuraDaTabua
  vao: 350, // @proporcao alturaDoVao
  "profundidade": 300 // @proporcao profundidade
};

export default { meta: { nome: 'estante/montante' }, PARAMS: TABELA, PASSOS: [] };
