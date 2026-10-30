/* cubo-de-orientacao.js — o cubo de orientação do tema Foco, no lugar das nove vistas em botão: gira com a câmera e cada face leva à vista dela.
 *
 * As faces são botões com `data-vista`, que a barra das vistas liga à câmera como liga os botões da fileira, e marca
 * a vista em vigor; aqui fica só o giro. A cada quadro o cubo recebe a rotação da câmera, para a face que se vê na tela
 * ser a face da peça que a câmera olha. A conta é `matrizDoCubo`, pura. */

/**
 * A transformação CSS do cubo para a matriz de vista da câmera (`camera.matrixWorldInverse.elements`, por colunas).
 * O cubo é desenhado em coordenadas da página, com y para baixo, e o mundo da cena tem y para cima: a rotação da
 * câmera R vira S·R·S, com S a troca do sinal de y.
 */
export function matrizDoCubo(vista) {
  const r = (linha, coluna) => vista[coluna * 4 + linha];
  const sinal = [1, -1, 1];
  const valores = [];
  for (let coluna = 0; coluna < 4; coluna += 1) {
    for (let linha = 0; linha < 4; linha += 1) {
      if (linha === 3 || coluna === 3) valores.push(linha === coluna ? 1 : 0);
      else valores.push(sinal[linha] * r(linha, coluna) * sinal[coluna]);
    }
  }
  return `matrix3d(${valores.map((valor) => (Math.abs(valor) < 1e-9 ? 0 : Number(valor.toFixed(6)))).join(', ')})`;
}

export function montarCuboDeOrientacao({ elementos, orientacao, janela = globalThis }) {
  const { corpo } = elementos;
  if (!corpo) return { parar() {} };
  let quadro = 0;
  let ultima = '';

  function girar() {
    const vista = orientacao();
    if (vista) {
      const transformacao = matrizDoCubo(vista);
      if (transformacao !== ultima) {
        corpo.style.transform = transformacao;
        ultima = transformacao;
      }
    }
    quadro = janela.requestAnimationFrame(girar);
  }
  girar();

  return { parar: () => janela.cancelAnimationFrame(quadro) };
}
