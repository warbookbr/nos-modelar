/* ciclo-da-pagina.js — o relógio de quadros da bancada e a saída da página: o que acompanha a câmera a cada quadro e o que se desmonta quando a página sai. */

/** Roda `funcao` agora e de novo a cada quadro do navegador; devolve a função que para. */
export function aCadaQuadro(funcao, janela = globalThis) {
  let quadro = 0;
  (function proximo() {
    funcao();
    quadro = janela.requestAnimationFrame(proximo);
  }());
  return () => janela.cancelAnimationFrame(quadro);
}

/** Roda `funcao` uma vez, quando a página sai. */
export function aoSairDaPagina(funcao, janela = globalThis) {
  janela.addEventListener('pagehide', funcao, { once: true });
}
