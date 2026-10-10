/* implementacao.js — extrusa o contorno da chapa dobrada numa largura; recebe somente emissor transacional e resolução numérica. */
import { construirChapa } from './chapa.js';

/* Vértices: n do anel em z = -largura/2 (ids 0..n-1) e n do anel em z = +largura/2 (ids n..2n-1), na ordem do contorno
   anti-horário visto de +z. Faces: 0 é a tampa em -z, 1 a tampa em +z e 2 + i o lado que sai da aresta i do contorno (do
   vértice i ao i + 1), todos com a normal para fora. As tampas são faces côncavas inteiras. */
export function implementar(contexto, argumentos = {}) {
  const { contorno, largura } = construirChapa(argumentos, contexto.numero), n = contorno.length, meia = largura / 2;
  for (const z of [-meia, meia]) contorno.forEach(([x, y], i) => contexto.emitirVertice(i + (z > 0 ? n : 0), [x, y, z]));
  contexto.emitirFace(0, contorno.map((_, i) => n - 1 - i));
  contexto.emitirFace(1, contorno.map((_, i) => n + i));
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; contexto.emitirFace(2 + i, [i, j, n + j, n + i]); }
}
