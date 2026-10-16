/* Gera a fixture sintética do importador de STL a partir da do importador de STEP: cada sólido de `../importar-step/sintetico.step` vira um
   STL, tesselado pelo OpenCascade WASM do repositório (`occt-wasm`) com no máximo 0,2 rad por segmento (cilindro de uns 31 lados).
   Uso: node tools/mecanifica/fixtures/importar-stl/gerar-sintetico.mjs [pasta-de-saida]
   Sem argumento grava em `sintetico/` ao lado deste arquivo. O que cada arquivo exercita:
   - placa, garfo, cantoneira, ponteira, escareada, pontaFenda: um sólido binário;
   - pino_e_bucha: um STL com dois componentes desconectados (o pino encosta na bucha sem dividir vértice);
   - blocoFuroCego: o sólido de nome genérico no STEP, aqui com o nome do arquivo;
   - sapata: STL ASCII.
   Os arquivos saem em gzip (mtime zero), deterministas, e o teste os lê com `gunzipSync`; o teste não os regera. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { OcctKernel } from 'occt-wasm';

const pasta = process.argv[2] ?? fileURLToPath(new URL('./sintetico/', import.meta.url));
const stepFonte = fileURLToPath(new URL('../importar-step/sintetico.step', import.meta.url));
const NOMES_DE_ARQUIVO = { placa: 'placa', garfo: 'garfo', cantoneira: 'cantoneira', ponteira: 'ponteira', Solid7: 'blocoFuroCego', sapata: 'sapata', escareada: 'escareada', ponta_fenda: 'pontaFenda' };

const k = await OcctKernel.init();
const doc = k.importXCAFFromSTEP(readFileSync(stepFonte, 'utf8'));
const solidos = [];
const visita = (tag) => {
  const filhos = doc.getChildren(tag);
  if (filhos.length > 0) { for (const c of filhos) visita(c); return; }
  const info = doc.getLabelInfo(tag);
  if (info.shapeHandle === undefined || info.shapeHandle === null) return;
  const dentro = k.getShapeType(info.shapeHandle) === 'solid' ? [info.shapeHandle] : k.getSubShapes(info.shapeHandle, 'solid');
  for (const s of dentro) solidos.push({ nome: (info.name ?? '').trim(), forma: s });
};
for (const r of doc.getRoots()) visita(r);

/* Os triângulos de um sólido como lista de 9 números (a malha do OpenCascade já sai para fora do sólido; confere pelo volume). */
function triangulos(forma) {
  const m = k.meshShape(forma, { linearDeflection: 0.05, angularDeflection: 0.2 });
  const t = [];
  let volume = 0;
  for (let i = 0; i < m.triangleCount; i++) {
    const p = [0, 1, 2].map((c) => { const v = m.indices[i * 3 + c]; return [m.positions[v * 3], m.positions[v * 3 + 1], m.positions[v * 3 + 2]]; });
    volume += (p[0][0] * (p[1][1] * p[2][2] - p[1][2] * p[2][1]) - p[0][1] * (p[1][0] * p[2][2] - p[1][2] * p[2][0]) + p[0][2] * (p[1][0] * p[2][1] - p[1][1] * p[2][0])) / 6;
    t.push(p.flat());
  }
  if (!(volume > 0)) throw new Error('a malha saiu para dentro do sólido');
  return t;
}

const normal = (t) => {
  const u = [t[3] - t[0], t[4] - t[1], t[5] - t[2]]; const v = [t[6] - t[0], t[7] - t[1], t[8] - t[2]];
  const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const l = Math.hypot(...n) || 1;
  return n.map((x) => x / l);
};

function binario(tris) {
  const buf = Buffer.alloc(84 + 50 * tris.length);
  buf.write('mecanifica sintetico', 0, 'latin1');
  buf.writeUInt32LE(tris.length, 80);
  tris.forEach((t, i) => {
    const o = 84 + i * 50;
    normal(t).forEach((x, c) => buf.writeFloatLE(x, o + c * 4));
    t.forEach((x, c) => buf.writeFloatLE(x, o + 12 + c * 4));
  });
  return buf;
}

function ascii(nome, tris) {
  const linhas = [`solid ${nome}`];
  for (const t of tris) {
    linhas.push(`  facet normal ${normal(t).map((x) => x.toExponential(6)).join(' ')}`, '    outer loop');
    for (let c = 0; c < 3; c++) linhas.push(`      vertex ${t.slice(c * 3, c * 3 + 3).map((x) => x.toExponential(6)).join(' ')}`);
    linhas.push('    endloop', '  endfacet');
  }
  linhas.push(`endsolid ${nome}`, '');
  return Buffer.from(linhas.join('\n'), 'latin1');
}

mkdirSync(pasta, { recursive: true });
const grava = (arquivo, conteudo) => { writeFileSync(`${pasta}/${arquivo}.stl.gz`, gzipSync(conteudo, { level: 9 })); console.log(`gravado ${arquivo}.stl.gz`); };
const porNome = Object.fromEntries(solidos.map((s) => [s.nome, triangulos(s.forma)]));
for (const [nomeStep, arquivo] of Object.entries(NOMES_DE_ARQUIVO)) {
  if (!porNome[nomeStep]) throw new Error(`o STEP não tem o sólido ${nomeStep}`);
  grava(arquivo, arquivo === 'sapata' ? ascii(arquivo, porNome[nomeStep]) : binario(porNome[nomeStep]));
}
grava('pino_e_bucha', binario([...porNome.pino, ...porNome.bucha]));
k.releaseAll?.();
