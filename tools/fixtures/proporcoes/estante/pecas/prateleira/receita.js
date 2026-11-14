/* prateleira da estante de prova: fixture neutra da conferência de proporções. */
export const TABELA = {
  largura: 800, // @proporcao larguraDaEstante
  espessura: 18, // @proporcao espessuraDaTabua — proposta
  profundidade: 300, // @proporcao profundidade
  folgaDeMontagem: 2, // fora das proporções: nenhuma marca
};

export default { meta: { nome: 'estante/prateleira' }, PARAMS: TABELA, PASSOS: [] };
