/* esboco-silhueta.mjs — a silhueta de um desenho medida na camada, sem navegador.
 *
 * `mascaraDaCamada(camada)` pinta, numa grade de um pixel do quadro, o pixel cujo centro cai dentro de alguma face da camada
 * (`desenharEsboco(..., { camada: true }).camada` ou `desenharBlocagem(..., { camada: true }).camada`): o contorno de cada face
 * menos os furos, regra par-ímpar, e a união de todas as faces. É a área que as formas cobrem, a mesma que o WebGL cobre antes
 * dos traços e do título, e não depende da profundidade nem da cor. `iou(a, b)` é a razão entre a interseção e a união de duas
 * máscaras do mesmo tamanho (1 quando as duas são vazias). */

/* As opções de desenho para quem mede a silhueta: a camada, sem o perfil das fitas dos traços (`perfilDosTracos: false`, ver
   `formasDoPainel` em `modulos/esboco/src/camada.js`). A máscara só lê as faces, e o perfil é a maior parte do custo da camada de
   um esboço grande, sem mudar uma face (a bateria de `esboco-blocagem.test.mjs` passou de 517 s para 173 s). */
export const CAMADA_DA_SILHUETA = { camada: true, perfilDosTracos: false };

/** @returns {{ largura: number, altura: number, dados: Uint8Array, area: number }} */
export function mascaraDaCamada(camada) {
  const largura = Math.ceil(camada.largura);
  const altura = Math.ceil(camada.altura);
  const dados = new Uint8Array(largura * altura);
  for (const forma of camada.formas) {
    for (const face of forma.faces) preencher(dados, largura, altura, [face.c, ...(face.h ?? [])]);
  }
  let area = 0;
  for (let i = 0; i < dados.length; i++) area += dados[i];
  return { largura, altura, dados, area };
}

/* Preenche as linhas de pixels cujo centro está dentro dos contornos (par-ímpar). */
function preencher(dados, largura, altura, aneis) {
  let ymin = Infinity;
  let ymax = -Infinity;
  for (const anel of aneis) for (const p of anel) { if (p[1] < ymin) ymin = p[1]; if (p[1] > ymax) ymax = p[1]; }
  const xs = [];
  for (let y = Math.max(0, Math.ceil(ymin - 0.5)); y <= Math.min(altura - 1, Math.floor(ymax - 0.5)); y++) {
    const yc = y + 0.5;
    xs.length = 0;
    for (const anel of aneis) {
      for (let i = 0, n = anel.length, j = n - 1; i < n; j = i++) {
        const a = anel[i];
        const b = anel[j];
        if ((a[1] > yc) !== (b[1] > yc)) xs.push(a[0] + ((yc - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
      }
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = Math.max(0, Math.ceil(xs[k] - 0.5)); x <= Math.min(largura - 1, Math.floor(xs[k + 1] - 0.5)); x++) dados[y * largura + x] = 1;
    }
  }
}

/** A interseção sobre a união de duas máscaras do mesmo tamanho, e as áreas (pixels). */
export function iou(a, b) {
  if (a.largura !== b.largura || a.altura !== b.altura) throw new Error(`as máscaras têm tamanhos diferentes (${a.largura}x${a.altura} e ${b.largura}x${b.altura})`);
  let inter = 0;
  let uniao = 0;
  for (let i = 0; i < a.dados.length; i++) {
    if (a.dados[i] && b.dados[i]) inter++;
    if (a.dados[i] || b.dados[i]) uniao++;
  }
  return { iou: uniao === 0 ? 1 : inter / uniao, interseccao: inter, uniao, areaA: a.area, areaB: b.area };
}
