/* gravador-da-camera.test.js — um arrasto de muitos `change` seguido de um `end` escreve o endereço uma vez só. */
import { describe, expect, it, vi } from 'vitest';
import { montarEndereco } from '../componentes/endereco.js';
import { criarGravadorDaCamera, ESPERA_DA_CAMERA_MS } from './gravador-da-camera.js';

function montar() {
  vi.useFakeTimers();
  const historico = { replaceState: vi.fn() };
  const local = { search: '', pathname: '/bancada.html', href: 'http://x/bancada.html' };
  const endereco = montarEndereco({ local, historico, navegador: {} });
  let quadro = 0;
  /* a câmera muda a cada quadro, então a consulta também muda a cada quadro */
  const gravador = criarGravadorDaCamera({ gravar: () => endereco.escrever(`camera=${quadro}`) });
  return { historico, gravador, avancarQuadro: () => { quadro += 1; } };
}

describe('gravador da câmera', () => {
  it('um arrasto de muitos change e um end escreve o endereço uma vez só, com a câmera do fim', () => {
    const { historico, gravador, avancarQuadro } = montar();
    for (let i = 0; i < 90; i += 1) {
      avancarQuadro();
      gravador.aoMudar();
      vi.advanceTimersByTime(16);
    }
    expect(historico.replaceState).not.toHaveBeenCalled();
    gravador.aoTerminar();
    vi.advanceTimersByTime(ESPERA_DA_CAMERA_MS + 1);
    expect(historico.replaceState).toHaveBeenCalledTimes(1);
    expect(historico.replaceState).toHaveBeenCalledWith(null, '', '/bancada.html?camera=90');
    vi.useRealTimers();
  });

  it('o amortecimento depois do end não vira uma segunda escrita, e as setas, que não têm end, também gravam', () => {
    const { historico, gravador, avancarQuadro } = montar();
    avancarQuadro(); gravador.aoMudar();
    gravador.aoTerminar();
    for (let i = 0; i < 10; i += 1) { avancarQuadro(); gravador.aoMudar(); vi.advanceTimersByTime(16); }
    vi.advanceTimersByTime(ESPERA_DA_CAMERA_MS + 1);
    expect(historico.replaceState).toHaveBeenCalledTimes(1);
    avancarQuadro(); gravador.aoMudar();
    vi.advanceTimersByTime(ESPERA_DA_CAMERA_MS + 1);
    expect(historico.replaceState).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('descarregar grava já o pendente, uma vez, para a cópia e a ponte lerem o endereço certo', () => {
    const { historico, gravador, avancarQuadro } = montar();
    avancarQuadro(); gravador.aoMudar();
    gravador.descarregar();
    gravador.descarregar();
    expect(historico.replaceState).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(ESPERA_DA_CAMERA_MS + 1);
    expect(historico.replaceState).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
