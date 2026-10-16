/* Importador de STEP para `.esboco.json`.

   Cada sólido do STEP é uma peça, e a peça vira a forma exata mais simples que o esboço tem para ela, nesta ordem:
   1. revolução (cilindro, cone ou tronco, anel, ou a revolução de um perfil) quando o sólido é de revolução em torno de um eixo;
   2. extrusão do contorno da maior face plana quando o sólido é um prisma (a face oposta paralela e congruente, as laterais
      perpendiculares), com os furos passantes do contorno como cortadores (cilindro quando o furo é redondo, extrusão quando não);
   3. caixa orientada, o último recurso, marcada no relato com a ocupação (volume do sólido sobre o da caixa).
   A decisão se faz pela malha que o OpenCascade gera do B-rep (as normais exatas de cada vértice e as faces separadas), e não pelo
   tipo de superfície do B-rep: um sólido é de revolução quando a normal de todo vértice fica no plano que contém o eixo e o vértice,
   e é prisma quando todo triângulo é tampa (normal igual a ±n, em duas alturas só) ou lateral (normal perpendicular a n). O contorno
   do perfil de uma revolução vem da seção do próprio sólido por um semiplano que contém o eixo.

   Leitor. `occt-wasm` (OpenCascade 7.x compilado para WASM, MIT OR Apache-2.0, 22 MB de .wasm), que o repositório já usa no
   exportador de STEP e por isso não acrescenta dependência. Lê o STEP, separa os sólidos, entrega malha com normais exatas, volume,
   inércia e distância exata entre sólidos.

   Nomes. O STEP guarda o nome do sólido no rótulo do XCAF (o produto) ou no `MANIFOLD_SOLID_BREP`. O id da forma é esse nome em
   minúsculas, sem acento nem espaço. Nome genérico ("Körper7", "Solid3", vazio) ou repetido vira `peca_<ordem>_<forma>`, em que a
   ordem é a posição do sólido no arquivo.

   Quadro. O de CAD tem z para cima, e o esboço tem y para cima e a frente em -z: o mesmo quadro do importador de `.csg`
   (`quadroDoEsboco`, rotação própria, sem espelhar), em milímetro.

   Relações. Dois sólidos a menos de `toleranciaDeContato` um do outro (distância exata do B-rep) entram em `plano.contrato.tocam`.

   Núcleo: recebe o texto do STEP e devolve `{ esboco, texto, relatorio }`. A linha de comando fica em `importar-step.mjs`. A classificação
   da malha, o contorno, os contatos, a montagem do esboço e a conferência são de `malha-para-esboco.mjs`, que o importador de STL usa também. */
import { OcctKernel } from 'occt-wasm';
import { quadroDoEsboco } from './esboco-importar-csg.mjs';
import { classificarMalha, conferirMalhas, cruz, dot, lacos, montarEsboco, RecusaDeImportacao, serializar, sha256, sub, unit } from './malha-para-esboco.mjs';

export { RecusaDeImportacao };

const GENERICO = /^(?:k[oö]rper|solid|body|corpo|part|peca|peça|brep|manifold_solid_brep|shape|component|componente|unnamed|sem[ _-]?nome|none|nauo|product|node|object|objeto)?[\s_.:-]*\d*$/i;



/* ---------- leitura do STEP ---------- */

/* O texto de uma cadeia do STEP, com as escapadas \X\HH, \X2\...\X0\, \X4\...\X0\ e a aspa dobrada. */
export function decodificarTextoStep(s) {
  return s
    .replace(/\\X2\\((?:[0-9A-Fa-f]{4})+)\\X0\\/g, (_, h) => String.fromCharCode(...(h.match(/.{4}/g) ?? []).map((x) => parseInt(x, 16))))
    .replace(/\\X4\\((?:[0-9A-Fa-f]{8})+)\\X0\\/g, (_, h) => String.fromCodePoint(...(h.match(/.{8}/g) ?? []).map((x) => parseInt(x, 16))))
    .replace(/\\X\\([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/''/g, "'");
}

/* Os nomes dos `MANIFOLD_SOLID_BREP` na ordem do arquivo. */
export function nomesDosSolidosNoTexto(texto) {
  const nomes = [];
  for (const m of texto.matchAll(/(?:MANIFOLD_SOLID_BREP|BREP_WITH_VOIDS)\s*\(\s*'((?:[^']|'')*)'/g)) nomes.push(decodificarTextoStep(m[1]).trim());
  return nomes;
}

const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
export function idDoNome(nome) {
  return semAcento(nome).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

/* Os sólidos do documento XCAF na ordem das folhas, cada um com o nome do rótulo quando o rótulo tem um só. */
function solidosDoXcaf(kernel, doc) {
  const lista = [];
  const visita = (tag) => {
    const info = doc.getLabelInfo(tag);
    const filhos = doc.getChildren(tag);
    if (filhos.length > 0) { for (const c of filhos) visita(c); return; }
    const h = info.shapeHandle;
    if (h === undefined || h === null) return;
    const dentro = kernel.getShapeType(h) === 'solid' ? [h] : kernel.getSubShapes(h, 'solid');
    for (const s of dentro) lista.push({ forma: s, nome: dentro.length === 1 ? (info.name ?? '').trim() : '' });
  };
  for (const r of doc.getRoots()) visita(r);
  return lista;
}

/* Extrai de cada sólido a malha no quadro do esboço e as grandezas exatas do B-rep. */
async function lerSolidos(texto, quadro, { deflexao = 1 / 50 } = {}) {
  const kernel = await OcctKernel.init();
  const R = quadro.map((l) => l.slice(0, 3)).slice(0, 3);
  const rot = (p) => [0, 1, 2].map((i) => R[i][0] * p[0] + R[i][1] * p[1] + R[i][2] * p[2]);
  let achados = [];
  try { achados = solidosDoXcaf(kernel, kernel.importXCAFFromSTEP(texto)); } catch { achados = []; }
  if (achados.length === 0) {
    let forma;
    try { forma = kernel.importStep(texto); } catch (e) { throw new RecusaDeImportacao(`o STEP não pôde ser lido: ${e.message ?? e}`); }
    achados = (kernel.getShapeType(forma) === 'solid' ? [forma] : kernel.getSubShapes(forma, 'solid')).map((s) => ({ forma: s, nome: '' }));
  }
  if (achados.length === 0) throw new RecusaDeImportacao('o STEP não tem nenhum sólido (só superfícies ou curvas): a importação trata cada sólido como uma peça');
  const solidos = achados.map((a) => a.forma);
  const nomesRotulo = achados.map((a) => a.nome);
  const nomesBrep = nomesDosSolidosNoTexto(texto);
  const brepCasa = nomesBrep.length === solidos.length;
  const dados = solidos.map((s, i) => {
    const bb = kernel.getBoundingBox(s);
    const diag = Math.hypot(bb.xmax - bb.xmin, bb.ymax - bb.ymin, bb.zmax - bb.zmin);
    const malha = kernel.meshShape(s, { linearDeflection: Math.max(diag * deflexao, 1e-3), angularDeflection: 0.08 });
    const n = malha.vertexCount;
    const P = new Float64Array(n * 3); const N = new Float64Array(n * 3);
    for (let v = 0; v < n; v++) {
      const p = rot([malha.positions[v * 3], malha.positions[v * 3 + 1], malha.positions[v * 3 + 2]]);
      const q = unit(rot([malha.normals[v * 3], malha.normals[v * 3 + 1], malha.normals[v * 3 + 2]]));
      for (let c = 0; c < 3; c++) { P[v * 3 + c] = p[c]; N[v * 3 + c] = q[c]; }
    }
    // a normal do vértice vem da superfície, sem o sentido da face: o sentido de fora é o do enrolamento do triângulo, que o OpenCascade
    // gera para fora do sólido (conferido pelo volume com sinal da malha)
    const NT = new Float64Array(malha.triangleCount * 9);
    const giros = new Int8Array(malha.triangleCount);
    let volumeComSinal = 0;
    for (let t = 0; t < malha.triangleCount; t++) {
      const [a, b, c] = [0, 1, 2].map((k) => { const v = malha.indices[t * 3 + k]; return [P[v * 3], P[v * 3 + 1], P[v * 3 + 2]]; });
      const g = cruz(sub(b, a), sub(c, a));
      volumeComSinal += dot(a, cruz(b, c)) / 6;
      const v0 = malha.indices[t * 3];
      giros[t] = dot(g, [N[v0 * 3], N[v0 * 3 + 1], N[v0 * 3 + 2]]) >= 0 ? 1 : -1;
    }
    const global = volumeComSinal >= 0 ? 1 : -1;
    for (let t = 0; t < malha.triangleCount; t++) for (let k = 0; k < 3; k++) { const v = malha.indices[t * 3 + k]; for (let c = 0; c < 3; c++) NT[t * 9 + k * 3 + c] = N[v * 3 + c] * giros[t] * global; }
    const I = kernel.getInertia(s);
    const Ie = [0, 1, 2].map((r) => [0, 1, 2].map((c) => I[r * 3 + c]));
    const Ir = [0, 1, 2].map((r) => [0, 1, 2].map((c) => { let t = 0; for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) t += R[r][a] * Ie[a][b] * R[c][b]; return t; }));
    const com = kernel.getCenterOfMass(s);
    return {
      ordem: i + 1,
      handle: s,
      nome: nomesRotulo[i] || (brepCasa ? nomesBrep[i] : ''),
      diag,
      volume: kernel.getVolume(s),
      centroDeMassa: rot([com.x, com.y, com.z]),
      inercia: Ir,
      sentido: global,
      P, N, NT, I: malha.indices, nTri: malha.triangleCount,
    };
  });
  for (const d of dados) d.secaoExata = (eixo, centro) => secaoExataDoSolido(kernel, R, d, eixo, centro);
  return { kernel, dados, R };
}

/* O perfil [raio, altura] da revolução: a seção exata do B-rep por um semiplano que contém o eixo, no quadro do CAD. */
function secaoExataDoSolido(kernel, R, d, eixo, centro) {
  // do esboço ao CAD: a inversa da rotação é a transposta
  const aCad = (v) => [0, 1, 2].map((i) => R[0][i] * v[0] + R[1][i] * v[1] + R[2][i] * v[2]);
  const a = aCad(eixo); const c = aCad(centro);
  const u = unit(cruz(a, Math.abs(a[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]));
  const w = cruz(u, a);
  const S = 4 * d.diag + 10;
  const caixa = kernel.transform(kernel.translate(kernel.makeBox(S, 2 * S, S), 0, -S, 0), [u[0], a[0], w[0], c[0], u[1], a[1], w[1], c[1], u[2], a[2], w[2], c[2]]);
  const metade = kernel.common(d.handle, caixa);
  const malha = kernel.meshShape(metade, { linearDeflection: 0.01, angularDeflection: 0.08 });
  const tris = [];
  for (let t = 0; t < malha.triangleCount; t++) {
    const ps = [0, 1, 2].map((k) => { const i = malha.indices[t * 3 + k]; return [malha.positions[i * 3], malha.positions[i * 3 + 1], malha.positions[i * 3 + 2]]; });
    if (ps.every((p) => Math.abs(dot(sub(p, c), w)) < 2e-3)) tris.push(ps);
  }
  return lacos(tris, (p) => { const r = sub(p, c); return [dot(r, u), dot(r, a)]; });
}


/* ---------- a importação ---------- */

/**
 * @param {string} texto o conteúdo do STEP
 * @param {{ frente?: string, girar?: number[], arquivo?: string, toleranciaDeContato?: number, nomes?: Record<string,string> }} [opcoes]
 */
export async function importarStep(texto, { frente = '+y', girar = [0, 0, 0], arquivo = 'objeto.step', toleranciaDeContato = 0.1, nomes = {} } = {}) {
  const quadro = quadroDoEsboco({ frente, girar });
  const { kernel, dados } = await lerSolidos(texto, quadro);
  try {
    const pecas = dados.map((d) => ({ d, c: classificarMalha(d) }));
    const ocupados = new Set();
    const pad = String(dados.length).length;
    const itens = pecas.map(({ d, c }) => {
      const forma = c.classe === 'revolucao' ? c.tipo : c.classe === 'extrusao' ? 'extrusao' : 'caixa';
      const base = d.nome && !GENERICO.test(d.nome) ? idDoNome(d.nome) : '';
      let id = nomes[d.nome] ?? (base || `peca_${String(d.ordem).padStart(pad, '0')}_${forma}`);
      if (ocupados.has(id)) id = `peca_${String(d.ordem).padStart(pad, '0')}_${forma}`;
      ocupados.add(id);
      return { d, c, id, nomeGenerico: !base, extra: { nomeNoStep: d.nome || null } };
    });
    const nome = arquivo.replace(/^.*[\\/]/, '').replace(/\.(?:step|stp)$/i, '');
    const sha = sha256(texto);
    const giro = girar.some((g) => g !== 0);
    const montado = montarEsboco({
      itens,
      toleranciaDeContato,
      nome,
      formato: 'STEP',
      cabecalho: `Importado de ${nome}.step (sha256 ${sha.slice(0, 16)}) por importar-step, sem desenhar à mão: cada um dos ${itens.length} sólidos é uma peça. Quadro: o z do CAD é o y do esboço (para cima), e a direção ${frente} do CAD é a frente do esboço, em -z; rotação própria, sem espelhar nem escalar, em milímetro.${giro ? ` Antes disso o objeto foi girado [${girar.join(', ')}] graus no quadro do CAD.` : ''}`,
      origemDaDistancia: 'da distância exata entre os sólidos',
      fonte: { arquivo: `${nome}.step`, sha256: sha },
      quadro: { frente, girar, regra: '(x, y, z)_cad -> (x, z, -y), girado em torno de y para a frente escolhida ficar em -z; o giro de `girar` vem antes, no quadro do CAD' },
      leitor: 'occt-wasm (OpenCascade)',
    });
    const { resumo, ...resto } = montado;
    void resumo;
    return resto;
  } finally {
    kernel.releaseAll();
  }
}

/* A conferência numérica de cada peça importada contra a malha do próprio sólido: a de `malha-para-esboco.mjs`. */
export const conferirStep = conferirMalhas;

export { serializar };
