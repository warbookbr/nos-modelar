/* sessao-ativa.js — o que a tela mostra da sessão ativa: a oferta da entrega que chegou enquanto a pessoa olhava outra peça, a tela de espera sem peça e o botão de demonstração.
 *
 * Lê do estado central `ofertaDaSessao` e `catalogoVazio`. Aceitar a oferta e carregar a demonstração são ações da
 * sessão da bancada (`sessao/sessao-da-bancada.js`), que este componente só chama. */

export function textoDaOferta(nome) {
  return `A sessão da IA trouxe ${nome}. Carregar.`;
}

export function montarSessaoAtiva({ elementos, estado, aceitarEntrega, carregarDemonstracao }) {
  const { oferta, btnDemonstracao, catalogoVazio } = elementos;

  estado.assinar(['ofertaDaSessao', 'catalogoVazio'], (valores, mudadas) => {
    if (mudadas.includes('ofertaDaSessao') && oferta && valores.ofertaDaSessao) {
      oferta.hidden = !valores.ofertaDaSessao.emEspera;
      oferta.textContent = textoDaOferta(valores.ofertaDaSessao.nome);
    }
    if (mudadas.includes('catalogoVazio') && catalogoVazio) catalogoVazio.hidden = !valores.catalogoVazio;
  });

  oferta?.addEventListener('click', () => aceitarEntrega());
  btnDemonstracao?.addEventListener('click', () => carregarDemonstracao());
}
