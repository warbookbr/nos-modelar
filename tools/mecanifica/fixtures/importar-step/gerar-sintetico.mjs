/* Gera `sintetico.step`, a fixture do importador de STEP, com o próprio OpenCascade WASM do repositório (`occt-wasm`).
   Uso: node tools/mecanifica/fixtures/importar-step/gerar-sintetico.mjs [saida.step]
   Sem argumento grava `sintetico.step` ao lado deste arquivo. A geometria é toda em milímetro, com z para cima (o quadro de um CAD),
   e cada peça tem as medidas escritas no comentário, que o teste confere. O arquivo gerado é versionado: o teste não o regera. */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { OcctKernel } from 'occt-wasm';

const saida = process.argv[2] ?? fileURLToPath(new URL('./sintetico.step', import.meta.url));
const k = await OcctKernel.init();
const V = (x, y, z) => ({ x, y, z });

/* Prisma de um contorno no plano xy a partir de z0, de altura h. */
function prisma(pontos, z0, h) {
  const arestas = pontos.map((p, i) => {
    const q = pontos[(i + 1) % pontos.length];
    return k.makeLineEdge(V(p[0], p[1], z0), V(q[0], q[1], z0));
  });
  return k.extrude(k.makeFace(k.makeWire(arestas)), 0, 0, h);
}
const cilindroEm = (x, y, z0, raio, h) => k.translate(k.makeCylinder(raio, h), x, y, z0);

const pecas = [];

/* placa: 100 x 60 x 8, de (0,0,0) a (100,60,8); quatro furos de diâmetro 6 em (15,10), (85,10), (15,50), (85,50) e um furo
   quadrado de 12 x 12 centrado em (50,30). */
{
  let p = k.makeBox(100, 60, 8);
  for (const [x, y] of [[15, 10], [85, 10], [15, 50], [85, 50]]) p = k.cut(p, cilindroEm(x, y, -1, 3, 10));
  p = k.cut(p, k.translate(k.makeBox(12, 12, 10), 44, 24, -1));
  pecas.push({ nome: 'placa', forma: p });
}

/* garfo em U: contorno côncavo de 40 x 50 com o vão de 20 x 30 (x de 160 a 180, y de 20 a 50) aberto em +y, espessura 10, de (150,0,0) a (190,50,10). */
pecas.push({ nome: 'garfo', forma: prisma([[150, 0], [190, 0], [190, 50], [180, 50], [180, 20], [160, 20], [160, 50], [150, 50]], 0, 10) });

/* peça em L: braços de 60 x 15 e 15 x 45, espessura 12, de (250,0,0) a (310,60,12). */
pecas.push({ nome: 'cantoneira', forma: prisma([[250, 0], [310, 0], [310, 15], [265, 15], [265, 60], [250, 60]], 0, 12) });

/* pino: cilindro de diâmetro 8 e comprimento 60 com o eixo em x, de (350,20,4) a (410,20,4); encosta na bucha. */
{
  const c = k.makeCylinder(4, 60);
  pecas.push({ nome: 'pino', forma: k.translate(k.rotate(c, { point: V(0, 0, 0), direction: V(0, 1, 0) }, Math.PI / 2), 350, 20, 4) });
}

/* bucha: anel de diâmetros 20 e 10, comprimento 15, eixo em z, de z = 0 a 15, centrado em (420,20); a face lateral dela toca a ponta do pino em x = 410. */
pecas.push({ nome: 'bucha', forma: k.cut(cilindroEm(420, 20, 0, 10, 15), cilindroEm(420, 20, -1, 5, 17)) });

/* ponteira: tronco de cone de diâmetros 24 e 12, altura 20, eixo em z, centrado em (442,20), base em z = 0; toca a bucha em x = 430. */
pecas.push({ nome: 'ponteira', forma: k.translate(k.makeCone(12, 6, 20), 442, 20, 0) });

/* bloco: caixa de 30 x 20 x 10 com um furo cego de diâmetro 8 e 6 de fundo, de (520,0,0) a (550,20,10). Nome genérico, como os que um CAD dá a um corpo sem nome. */
pecas.push({ nome: 'Solid7', forma: k.cut(k.translate(k.makeBox(30, 20, 10), 520, 0, 0), cilindroEm(535, 10, 4, 4, 7)) });

/* sapata: caixa de 20 x 10 x 5, de (600,0,0) a (620,10,5), sem furo: o prisma de contorno retangular é uma caixa exata. */
pecas.push({ nome: 'sapata', forma: k.translate(k.makeBox(20, 10, 5), 600, 0, 0) });

/* escareada: caixa de 60 x 40 x 10, de (700,0,0) a (760,40,10), com dois furos de diâmetro 6 em (715,20) e (745,20), cada um com um
   escareado cônico de diâmetro 6 a 10 nos 2 mm de cima: não é um prisma exato (os cones), e é o prisma aproximado pela seção do meio. */
{
  let p = k.translate(k.makeBox(60, 40, 10), 700, 0, 0);
  for (const x of [715, 745]) {
    p = k.cut(p, cilindroEm(x, 20, -1, 3, 12));
    p = k.cut(p, k.translate(k.makeCone(3, 5, 2), x, 20, 8));
  }
  pecas.push({ nome: 'escareada', forma: p });
}

/* ponta_fenda: cilindro de diâmetro 10 e 40 de comprimento (z de 0 a 40) com uma ponta cônica de 10 (z de 40 a 50), centrado em (800,20), e uma
   fenda de 12 x 3 x 10 na base: não é de revolução exata (a fenda) nem prisma (a ponta), e é a revolução aproximada pelo contorno externo. */
{
  const corpo = k.fuse(cilindroEm(800, 20, 0, 5, 40), k.translate(k.makeCone(5, 0, 10), 800, 20, 40));
  pecas.push({ nome: 'ponta_fenda', forma: k.cut(corpo, k.translate(k.makeBox(12, 3, 10), 794, 18.5, -0.001)) });
}

const doc = k.createXCAFDocument();
for (const p of pecas) doc.addShape(p.forma, { name: p.nome });
writeFileSync(saida, doc.exportSTEP());
doc.close();
console.log(`gravado ${saida}: ${pecas.length} sólidos`);
