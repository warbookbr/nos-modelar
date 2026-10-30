/* avisos.js — o aviso passageiro de baixo da cena e a faixa de erro da bancada. */

/* O aviso some sozinho depois deste tempo; aviso novo reinicia a contagem. */
export const DURACAO_DO_AVISO_MS = 2200;

export function montarAvisos({ aviso, erro }) {
  let temporizador = null;
  return {
    avisar(texto) {
      if (!aviso) return;
      aviso.textContent = texto;
      aviso.hidden = false;
      clearTimeout(temporizador);
      temporizador = setTimeout(() => { aviso.hidden = true; }, DURACAO_DO_AVISO_MS);
    },
    mostrarErro(motivo) {
      if (!erro) return;
      erro.hidden = false;
      erro.textContent = String(motivo?.stack || motivo?.message || motivo);
    },
  };
}
