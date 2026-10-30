/* popover-da-cena.js — o botão da cena na barra flutuante do tema Foco e a caixa que ele abre, com a grade, o chão e a explosão da montagem.
 *
 * Os controles dentro da caixa são os do painel da direita (`painel-inspecao.js`), trazidos pelo tema: o botão só abre
 * e fecha a caixa. Ela fecha pelo botão, por clique fora e por Esc, ouvido na captura para não limpar a seleção. O tema
 * Bancada monta uma segunda caixa com este mesmo componente, a da câmera, com as vistas que o tema traz da fileira. */

export function montarPopoverDaCena({ elementos, janela = globalThis }) {
  const { botao, caixa } = elementos;
  if (!botao || !caixa) return { fechar() {} };

  function definir(aberta) {
    caixa.hidden = !aberta;
    botao.setAttribute('aria-expanded', String(aberta));
  }

  botao.addEventListener('click', () => definir(caixa.hidden));
  janela.addEventListener('pointerdown', (evento) => {
    if (caixa.hidden) return;
    if (evento.target?.closest?.('.popover-ancora')) return;
    definir(false);
  });
  janela.addEventListener('keydown', (evento) => {
    if (evento.key !== 'Escape' || caixa.hidden) return;
    evento.stopImmediatePropagation();
    definir(false);
    botao.focus();
  }, true);

  return { fechar: () => definir(false) };
}
