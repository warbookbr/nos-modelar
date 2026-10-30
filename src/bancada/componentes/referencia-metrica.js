/* referencia-metrica.js — a régua de baixo da cena: os eixos da vista e um traço de comprimento redondo com a escala em pixels por metro, atualizados a cada quadro.
 *
 * Começa a medir quando a subida termina (o estado central `inicializando` vira falso), como o corpo único de `main.js`
 * fazia depois de restaurar a câmera da URL. */

const MEDIDAS = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1];

/** O comprimento redondo cujo traço fica mais perto de 88 pixels, a largura do traço e o texto da régua. */
export function medirRegua({ pixelsPorMetro, aproximada }) {
  const metros = MEDIDAS.reduce((melhor, candidata) => (
    Math.abs(candidata * pixelsPorMetro - 88)
      < Math.abs(melhor * pixelsPorMetro - 88) ? candidata : melhor
  ), MEDIDAS[0]);
  const pixels = Math.round(metros * pixelsPorMetro);
  return {
    largura: `${Math.min(128, Math.max(42, pixels))}px`,
    texto: `${aproximada ? '≈ ' : ''}${metros < 1 ? `${metros * 100} cm` : '1 m'} · ${Math.round(pixelsPorMetro)} px/m`,
  };
}

export function montarReferenciaMetrica({ elementos, estado, referenciaMetrica, janela = globalThis }) {
  const { eixos, barra, valor } = elementos;
  let quadro = 0;

  function atualizarReferenciaMetrica() {
    const referencia = referenciaMetrica();
    const { largura, texto } = medirRegua(referencia);
    eixos.textContent = referencia.eixos;
    barra.style.width = largura;
    valor.textContent = texto;
    quadro = janela.requestAnimationFrame(atualizarReferenciaMetrica);
  }

  estado.assinar(['inicializando'], ({ inicializando }) => {
    if (!inicializando) atualizarReferenciaMetrica();
  });

  return {
    parar: () => janela.cancelAnimationFrame(quadro),
  };
}
