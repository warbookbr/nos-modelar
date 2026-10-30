/* rodape-juntas.js — o rodapé sobre a cena com o resumo do que a pessoa mexeu na peça e o botão que salva o ajuste como arquivo.
 *
 * Lê do estado central `juntas`, que a edição da peça escreve: se o modo está ligado, quantas juntas se moveram, se a malha
 * mudou desde o arquivo e se o rodapé aparece. Salvar entrega à edição o `baixar` deste componente, que é quem sabe pôr um
 * arquivo na pasta de downloads da pessoa. */

/** O texto do rodapé, pela contagem de juntas e por a malha ter mudado ou não. */
export function resumoDasJuntas({ quantas, mudou }) {
  return quantas > 0
    ? `${quantas} ${quantas === 1 ? 'junta movida' : 'juntas movidas'}`
    : (mudou ? 'malha editada' : 'nenhuma junta movida');
}

export function montarRodapeJuntas({ elementos, estado, salvar, baixar }) {
  const { rodape, resumo, btnSalvar } = elementos;

  estado.assinar(['juntas'], ({ juntas }) => {
    if (rodape) {
      rodape.hidden = !juntas.rodapeVisivel;
      rodape.classList.toggle('tem-pendencia', juntas.quantas > 0);
    }
    if (resumo) resumo.textContent = resumoDasJuntas(juntas);
    if (btnSalvar) btnSalvar.disabled = !juntas.mudou;
  });

  btnSalvar?.addEventListener('click', () => salvar(baixar));
}
