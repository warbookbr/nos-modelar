/* medida.js — o contorno de cada parte contra as bordas da própria imagem.
   Para cada parte, a fração do perímetro que fica a até `distancia` pixels de
   uma borda que o Canny acha na imagem. Parte abaixo do mínimo volta ao
   desenhador sem passar pelo crítico: a divisa dela não segue nada que a
   imagem mostra. */
import { PNG } from 'pngjs';
import { carregarOpenCV } from './opencv.js';

export const MINIMO_NA_BORDA = 0.8;

export async function proximidadeDaBorda(pngBuffer, segmentacao, { distancia = 2, canny = [20, 60] } = {}) {
  const { cv } = await carregarOpenCV();
  const png = PNG.sync.read(pngBuffer);
  const mats = [];
  const novo = (m) => { mats.push(m); return m; };
  try {
    const src = novo(cv.matFromImageData({ data: png.data, width: png.width, height: png.height }));
    const cinza = novo(new cv.Mat()); cv.cvtColor(src, cinza, cv.COLOR_RGBA2GRAY);
    const suave = novo(new cv.Mat()); cv.GaussianBlur(cinza, suave, new cv.Size(3, 3), 0);
    const bordas = novo(new cv.Mat()); cv.Canny(suave, bordas, canny[0], canny[1]);
    const inverso = novo(new cv.Mat()); cv.bitwise_not(bordas, inverso);
    const dist = novo(new cv.Mat()); cv.distanceTransform(inverso, dist, cv.DIST_L2, 3);
    const perto = (x, y) => dist.floatAt(Math.min(png.height - 1, Math.max(0, y)), Math.min(png.width - 1, Math.max(0, x))) <= distancia;
    const resultado = {};
    for (const [nome, r] of Object.entries(segmentacao.regioes)) {
      const p = r.contornoPx; let total = 0; let dentro = 0;
      for (let i = 0; i < p.length; i += 1) {
        const [ax, ay] = p[i]; const [bx, by] = p[(i + 1) % p.length];
        const passos = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay)));
        for (let s = 0; s < passos; s += 1) {
          total += 1;
          if (perto(Math.round(ax + ((bx - ax) * s) / passos), Math.round(ay + ((by - ay) * s) / passos))) dentro += 1;
        }
      }
      resultado[nome] = Number((dentro / total).toFixed(3));
    }
    return resultado;
  } finally {
    mats.forEach((m) => m.delete());
  }
}
