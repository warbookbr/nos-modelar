/* Gera a fixture de malha densa do importador de STL: um anel de 32 mm de diâmetro externo, 31 mm de diâmetro interno e 9,5 mm de
   espessura, com o eixo em z, 252 lados e a parede dividida em faixas de altura igual, o que dá uns 28 mil triângulos, a ordem de grandeza
   de uma malha de impressão exportada de um CAD. Os vértices ficam compartilhados entre triângulos vizinhos (malha indexada que o STL
   expande), a diagonal de cada quadrado alterna com a paridade da faixa e da coluna, e o anel fica longe da origem
   (centro em x = 210, y = -85, base em z = 35), porque uma peça de impressão raramente está centrada no quadro.
   Uso: node tools/mecanifica/fixtures/importar-stl/gerar-denso.mjs [pasta-de-saida]
   Sem argumento grava em `denso/` ao lado deste arquivo. O arquivo sai em gzip (mtime zero) e determinístico, sem relógio nem
   sorteio, e o teste o lê com `gunzipSync`; o teste não o regera. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const pasta = process.argv[2] ?? fileURLToPath(new URL('./denso/', import.meta.url));

const LADOS = 252;
const FAIXAS = 27;
const RAIO_EXTERNO = 16;
const RAIO_INTERNO = 15.5;
const ESPESSURA = 9.5;
const CENTRO = [210, -85];
const BASE_Z = 35;

/* Os vértices de uma volta na altura dada: o ângulo i / LADOS de volta, com o vértice 0 sobre +x. */
const volta = (raio, z) => Array.from({ length: LADOS }, (_, i) => {
  const a = (2 * Math.PI * i) / LADOS;
  return [CENTRO[0] + raio * Math.cos(a), CENTRO[1] + raio * Math.sin(a), z];
});
const alturas = Array.from({ length: FAIXAS + 1 }, (_, j) => BASE_Z + (ESPESSURA * j) / FAIXAS);
const externas = alturas.map((z) => volta(RAIO_EXTERNO, z));
const internas = alturas.map((z) => volta(RAIO_INTERNO, z));

/* Triângulos como listas de 9 números, todos com a normal para fora do sólido. */
const tris = [];
const proximo = (i) => (i + 1) % LADOS;
for (let j = 0; j < FAIXAS; j++) {
  for (let i = 0; i < LADOS; i++) {
    const n = proximo(i);
    const [e00, e10, e11, e01] = [externas[j][i], externas[j][n], externas[j + 1][n], externas[j + 1][i]];
    const [d00, d10, d11, d01] = [internas[j][i], internas[j][n], internas[j + 1][n], internas[j + 1][i]];
    if ((i + j) % 2 === 0) {
      tris.push([e00, e10, e11], [e00, e11, e01], [d00, d11, d10], [d00, d01, d11]);
    } else {
      tris.push([e00, e10, e01], [e10, e11, e01], [d00, d01, d10], [d10, d01, d11]);
    }
  }
}
for (let i = 0; i < LADOS; i++) {
  const n = proximo(i);
  const base = [externas[0][i], externas[0][n], internas[0][n], internas[0][i]];
  const topo = [externas[FAIXAS][i], externas[FAIXAS][n], internas[FAIXAS][n], internas[FAIXAS][i]];
  tris.push([topo[0], topo[1], topo[2]], [topo[0], topo[2], topo[3]]);
  tris.push([base[0], base[2], base[1]], [base[0], base[3], base[2]]);
}
const t9 = tris.map((t) => t.flat());

/* O volume pelos tetraedros com a origem confere a orientação e o fechamento (a soma sai igual à da coroa do polígono). */
let volume = 0;
for (const t of t9) {
  volume += (t[0] * (t[4] * t[8] - t[5] * t[7]) - t[1] * (t[3] * t[8] - t[5] * t[6]) + t[2] * (t[3] * t[7] - t[4] * t[6])) / 6;
}
const areaDoPoligono = (r) => 0.5 * LADOS * r * r * Math.sin((2 * Math.PI) / LADOS);
const esperado = (areaDoPoligono(RAIO_EXTERNO) - areaDoPoligono(RAIO_INTERNO)) * ESPESSURA;
if (Math.abs(volume - esperado) > 1e-6 * esperado) throw new Error(`o volume da malha (${volume}) não bate com o do anel (${esperado})`);

const normal = (t) => {
  const u = [t[3] - t[0], t[4] - t[1], t[5] - t[2]]; const v = [t[6] - t[0], t[7] - t[1], t[8] - t[2]];
  const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const l = Math.hypot(...n) || 1;
  return n.map((x) => x / l);
};

const buf = Buffer.alloc(84 + 50 * t9.length);
buf.write('mecanifica denso', 0, 'latin1');
buf.writeUInt32LE(t9.length, 80);
t9.forEach((t, i) => {
  const o = 84 + i * 50;
  normal(t).forEach((x, c) => buf.writeFloatLE(x, o + c * 4));
  t.forEach((x, c) => buf.writeFloatLE(x, o + 12 + c * 4));
});

mkdirSync(pasta, { recursive: true });
writeFileSync(`${pasta}/anel_espacador.stl.gz`, gzipSync(buf, { level: 9 }));
console.log(`gravado anel_espacador.stl.gz (${t9.length} triângulos)`);
