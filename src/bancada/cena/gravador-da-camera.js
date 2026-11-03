/* gravador-da-camera.js — grava a câmera livre no endereço só quando o giro ou o zoom terminam, e não a cada quadro.
 *
 * O controle de órbita avisa `change` a cada quadro do arrasto (e do amortecimento que vem depois), e cada gravação do
 * endereço é um `history.replaceState` com a consulta mudada: umas 60 por segundo, e o navegador passa a frear as trocas
 * de endereço (o cursor piscava ao girar). Aqui `aoMudar` (o `change`) e `aoTerminar` (o `end`, que a rodinha também dispara
 * a cada passo) só armam uma espera curta, e a gravação sai uma vez, depois do último aviso. A espera cobre o que o `end`
 * não cobre (as setas do teclado) e o amortecimento que continua mexendo a câmera depois do `end`.
 *
 * `descarregar` grava já o que estiver pendente, para quem lê o endereço (a cópia, a ponte da captura) ver a câmera certa.
 * O módulo não toca a página: o relógio vem de fora. */
export const ESPERA_DA_CAMERA_MS = 200;

export function criarGravadorDaCamera({
  gravar, esperaMs = ESPERA_DA_CAMERA_MS, agendar = (f, ms) => setTimeout(f, ms), cancelar = (id) => clearTimeout(id),
}) {
  let timer = null;
  let pendente = false;

  function gravarAgora() {
    if (timer !== null) { cancelar(timer); timer = null; }
    if (!pendente) return;
    pendente = false;
    gravar();
  }

  function armar() {
    pendente = true;
    if (timer !== null) cancelar(timer);
    timer = agendar(() => { timer = null; gravarAgora(); }, esperaMs);
  }

  return { aoMudar: armar, aoTerminar: armar, descarregar: gravarAgora, get pendente() { return pendente; } };
}
