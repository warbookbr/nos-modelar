/* Importador de STL para `.esboco.json`.

   Um projeto de impressão 3D traz cada peça num STL, e o nome do arquivo costuma dizer o que a peça é. Cada arquivo é uma peça (e, num STL
   com vários componentes conexos desconectados, cada componente é uma peça, com sufixo `_1`, `_2`...), com o id tirado do nome do
   arquivo (sem extensão, sem acento, minúsculo, `driveSmall_rotor` vira `drive_small_rotor`), e é traduzida pelo mesmo classificador do
   importador de STEP (`malha-para-esboco.mjs`): revolução, extrusão com furos passantes, aproximadas e caixa.

   O que o STL tira. Não traz B-rep: um cilindro é um prisma de muitos lados. O reconhecimento de revolução e de furo redondo tolera o
   polígono (os vértices do STL ficam na superfície verdadeira, e o raio é o das quinas) e o relato diz o número de lados quando é baixo
   (menos de 24); com menos de 12 lados o polígono é prisma e sai como extrusão exata. Não traz unidade: assume mm e aceita `escala`.
   Não traz o nome da peça nem a montagem: as peças de impressão vêm deitadas na mesa, espalhadas, e ficam onde o arquivo as pôs
   (ou, com `ladoALado`, numa fileira ao longo de x sem sobreposição, apoiadas em y = 0). A montagem fica para o esbocista.

   Leitor. STL binário (84 bytes de cabeçalho e 50 por triângulo) e ASCII; o binário é reconhecido pelo tamanho, e não pela palavra
   `solid`. Os vértices que coincidem a menos de 1 µm são soldados; as arestas que não fecham aparecem no relato.

   Quadro. O de impressão tem z para cima, como o CAD: o mesmo quadro do importador de STEP (z vira y, a frente +y vira -z).

   Núcleo: recebe os arquivos `[{ nome, bytes }]` e devolve `{ esboco, texto, relatorio }`. A linha de comando fica em `importar-stl.mjs`. */
import { quadroDoEsboco } from './esboco-importar-csg.mjs';
import { aabbDe, classificarMalha, conferirMalhas, montarEsboco, RecusaDeImportacao, serializar, sha256 } from './malha-para-esboco.mjs';

export { RecusaDeImportacao, serializar };

const SOLDA = 1e3; // os vértices que coincidem a menos de 1 µm são o mesmo
const FOLGA_LADO_A_LADO = 10; // mm entre as peças da fileira

/* ---------- leitura ---------- */

/** Os triângulos de um STL (binário ou ASCII) como `Float64Array` de 9 números por triângulo. */
export function lerStl(bytes, nome = 'arquivo.stl') {
  const buf = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (buf.length >= 84) {
    const n = buf.readUInt32LE(80);
    if (84 + 50 * n === buf.length) {
      const v = new Float64Array(n * 9);
      for (let t = 0; t < n; t++) for (let k = 0; k < 9; k++) v[t * 9 + k] = buf.readFloatLE(84 + t * 50 + 12 + k * 4);
      if (n === 0) throw new RecusaDeImportacao(`${nome} não tem nenhum triângulo`);
      return { vertices: v, formato: 'binário' };
    }
  }
  const texto = buf.toString('latin1');
  if (!/^\s*solid\b/i.test(texto) || !/\bfacet\b/i.test(texto)) throw new RecusaDeImportacao(`${nome} não é um STL: nem o tamanho de um binário (84 + 50 por triângulo) nem o texto de um ASCII ("solid ... facet")`);
  const nums = [];
  for (const m of texto.matchAll(/\bvertex\s+(\S+)\s+(\S+)\s+(\S+)/gi)) nums.push(Number(m[1]), Number(m[2]), Number(m[3]));
  if (nums.length === 0 || nums.length % 9 !== 0 || nums.some((x) => !Number.isFinite(x))) throw new RecusaDeImportacao(`${nome}: o STL ASCII tem vértices que não fecham triângulos (ou números inválidos)`);
  return { vertices: Float64Array.from(nums), formato: 'ASCII' };
}

const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** O id de uma peça a partir do nome do arquivo: sem pasta, extensão nem acento, minúsculo, camelCase separado, só `a-z0-9_`. */
export function idDoArquivo(nome) {
  const base = nome.replace(/^.*[\\/]/, '').replace(/\.gz$/i, '').replace(/\.stl$/i, '');
  const id = semAcento(base).replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return /^[0-9]/.test(id) ? `peca_${id}` : id;
}

/* ---------- da lista de triângulos às peças ---------- */

/* Solda os vértices, separa os componentes conexos e dá a cada um a malha, o volume, o centro de massa e a inércia no quadro do esboço. */
function componentes(vertices, R, escala, nomeDoArquivo) {
  const nTriBruto = vertices.length / 9;
  const ids = new Map();
  const P = [];
  const I = [];
  for (let t = 0; t < nTriBruto; t++) {
    const tri = [0, 1, 2].map((k) => {
      const x = vertices[t * 9 + k * 3] * escala; const y = vertices[t * 9 + k * 3 + 1] * escala; const z = vertices[t * 9 + k * 3 + 2] * escala;
      const chave = `${Math.round(x * SOLDA)},${Math.round(y * SOLDA)},${Math.round(z * SOLDA)}`;
      let id = ids.get(chave);
      if (id === undefined) { id = P.length / 3; ids.set(chave, id); P.push(R[0][0] * x + R[0][1] * y + R[0][2] * z, R[1][0] * x + R[1][1] * y + R[1][2] * z, R[2][0] * x + R[2][1] * y + R[2][2] * z); }
      return id;
    });
    if (tri[0] === tri[1] || tri[1] === tri[2] || tri[0] === tri[2]) continue;
    I.push(...tri);
  }
  ids.clear();
  const nV = P.length / 3;
  const nT = I.length / 3;
  if (nT === 0) throw new RecusaDeImportacao(`${nomeDoArquivo} só tem triângulos degenerados`);
  // componentes conexos pelos vértices compartilhados
  const pai = new Int32Array(nV).map((_, i) => i);
  const raiz = (x) => { while (pai[x] !== x) { pai[x] = pai[pai[x]]; x = pai[x]; } return x; };
  const unir = (x, y) => { const rx = raiz(x); const ry = raiz(y); if (rx !== ry) pai[Math.max(rx, ry)] = Math.min(rx, ry); };
  for (let t = 0; t < nT; t++) { unir(I[t * 3], I[t * 3 + 1]); unir(I[t * 3 + 1], I[t * 3 + 2]); }
  const ordemDaRaiz = new Map();
  const triDoComp = [];
  for (let t = 0; t < nT; t++) {
    const r = raiz(I[t * 3]);
    if (!ordemDaRaiz.has(r)) { ordemDaRaiz.set(r, triDoComp.length); triDoComp.push([]); }
    triDoComp[ordemDaRaiz.get(r)].push(t);
  }
  const saida = [];
  const ignorados = [];
  for (const tris of triDoComp) {
    const mapa = new Map();
    const p = [];
    const idx = new Uint32Array(tris.length * 3);
    tris.forEach((t, i) => {
      for (let k = 0; k < 3; k++) {
        const v = I[t * 3 + k];
        let l = mapa.get(v);
        if (l === undefined) { l = p.length / 3; mapa.set(v, l); p.push(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]); }
        idx[i * 3 + k] = l;
      }
    });
    const m = montarComponente(Float64Array.from(p), idx);
    if (m === null) { ignorados.push({ triangulos: tris.length, motivo: 'sem volume (superfície aberta ou plana)' }); continue; }
    saida.push(m);
  }
  return { componentes: saida, ignorados, triangulosLidos: nTriBruto };
}

/* Volume com sinal, centro de massa e inércia de uma malha fechada, por tetraedros a partir do centro da caixa (estável para peças longe da origem). */
function montarComponente(P, I) {
  const nV = P.length / 3; const nT = I.length / 3;
  const min = [Infinity, Infinity, Infinity]; const max = [-Infinity, -Infinity, -Infinity];
  for (let v = 0; v < nV; v++) for (let c = 0; c < 3; c++) { min[c] = Math.min(min[c], P[v * 3 + c]); max[c] = Math.max(max[c], P[v * 3 + c]); }
  const o = [0, 1, 2].map((c) => (min[c] + max[c]) / 2);
  const diag = Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
  let vol = 0;
  const cm = [0, 0, 0];
  const M2 = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const NT = new Float64Array(nT * 9);
  const normais = new Float64Array(nT * 3);
  const arestas = new Map();
  for (let t = 0; t < nT; t++) {
    const [a, b, c] = [0, 1, 2].map((k) => { const v = I[t * 3 + k]; return [P[v * 3] - o[0], P[v * 3 + 1] - o[1], P[v * 3 + 2] - o[2]]; });
    const g = [(b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])];
    const gl = Math.hypot(...g);
    for (let k = 0; k < 3; k++) normais[t * 3 + k] = gl > 0 ? g[k] / gl : 0;
    const vt = (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
    vol += vt;
    const s = [a[0] + b[0] + c[0], a[1] + b[1] + c[1], a[2] + b[2] + c[2]];
    for (let k = 0; k < 3; k++) cm[k] += (vt * s[k]) / 4;
    for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) M2[r][q] += (vt / 20) * (a[r] * a[q] + b[r] * b[q] + c[r] * c[q] + s[r] * s[q]);
    for (let k = 0; k < 3; k++) {
      const x = I[t * 3 + k]; const y = I[t * 3 + ((k + 1) % 3)];
      const ch = Math.min(x, y) * nV + Math.max(x, y);
      arestas.set(ch, (arestas.get(ch) ?? 0) + 1);
    }
  }
  if (!(Math.abs(vol) > 1e-9 * diag ** 3) || nT < 4) return null;
  const sentido = vol >= 0 ? 1 : -1;
  const volume = Math.abs(vol);
  const c0 = cm.map((x) => x / vol);
  const C2 = M2.map((l, r) => l.map((x, q) => x / vol * volume - volume * c0[r] * c0[q]));
  // sentido: a normal de fora é a do enrolamento quando o volume com sinal é positivo
  for (let t = 0; t < nT; t++) for (let k = 0; k < 3; k++) for (let c = 0; c < 3; c++) NT[t * 9 + k * 3 + c] = normais[t * 3 + c] * sentido;
  const tr = C2[0][0] + C2[1][1] + C2[2][2];
  const inercia = C2.map((l, r) => l.map((x, q) => (r === q ? tr : 0) - x));
  let abertas = 0;
  for (const n of arestas.values()) if (n !== 2) abertas++;
  return { P, I, NT, N: new Float64Array(0), nTri: nT, volume, centroDeMassa: [c0[0] + o[0], c0[1] + o[1], c0[2] + o[2]], inercia, sentido, diag, facetada: true, arestasAbertas: abertas };
}

/* Põe as peças numa fileira ao longo de x, na ordem dada, apoiadas em y = 0 e centradas em z = 0. */
function dispoLadoALado(ds) {
  let cursor = 0;
  for (const d of ds) {
    const { min, max } = aabbDe(d);
    const t = [cursor - min[0], -min[1], -(min[2] + max[2]) / 2];
    for (let v = 0; v < d.P.length / 3; v++) for (let c = 0; c < 3; c++) d.P[v * 3 + c] += t[c];
    d.centroDeMassa = d.centroDeMassa.map((x, c) => x + t[c]);
    cursor += max[0] - min[0] + FOLGA_LADO_A_LADO;
  }
}

/**
 * @param {Array<{ nome: string, bytes: Uint8Array }>} arquivos os STL, na ordem em que as peças saem
 * @param {{ frente?: string, girar?: number[], escala?: number, ladoALado?: boolean, toleranciaDeContato?: number, nomes?: Record<string,string>, conferir?: boolean, nome?: string }} [opcoes]
 */
export async function importarStl(arquivos, { frente = '+y', girar = [0, 0, 0], escala = 1, ladoALado = false, toleranciaDeContato = 0.1, nomes = {}, conferir = false, nome = null } = {}) {
  if (arquivos.length === 0) throw new RecusaDeImportacao('nenhum arquivo STL');
  if (!(escala > 0) || !Number.isFinite(escala)) throw new RecusaDeImportacao('--escala pede um número maior que zero (o STL é lido em mm; 25.4 para polegadas)');
  const M = quadroDoEsboco({ frente, girar });
  const R = M.slice(0, 3).map((l) => l.slice(0, 3));
  const ocupados = new Set();
  const itens = [];
  const lidos = [];
  const ignorados = [];
  let ordem = 0;
  for (const arq of arquivos) {
    const { vertices, formato } = lerStl(arq.bytes, arq.nome);
    const { componentes: comps, ignorados: ign, triangulosLidos } = componentes(vertices, R, escala, arq.nome);
    for (const i of ign) ignorados.push({ arquivo: arq.nome, ...i });
    if (comps.length === 0) throw new RecusaDeImportacao(`${arq.nome} não tem nenhum sólido fechado (só superfície aberta ou plana)`);
    lidos.push({ arquivo: arq.nome, sha256: sha256(arq.bytes), formato, triangulos: triangulosLidos, componentes: comps.length, ...(ign.length > 0 ? { componentesIgnorados: ign.length } : {}) });
    const baseArq = arq.nome.replace(/^.*[\\/]/, '').replace(/\.gz$/i, '').replace(/\.stl$/i, '');
    comps.forEach((d, k) => {
      ordem++;
      d.ordem = ordem;
      const baseId = nomes[baseArq] ?? idDoArquivo(arq.nome);
      let id = baseId === '' ? `peca_${String(ordem).padStart(2, '0')}` : baseId;
      if (comps.length > 1) id = `${id}_${k + 1}`;
      for (let n = 2; ocupados.has(id); n++) id = `${baseId === '' ? 'peca' : baseId}${comps.length > 1 ? `_${k + 1}` : ''}_${n}`;
      ocupados.add(id);
      itens.push({ d, id, nomeGenerico: baseId === '', extra: { arquivo: arq.nome.replace(/^.*[\\/]/, ''), ...(comps.length > 1 ? { componente: `${k + 1}/${comps.length}` } : {}), triangulos: d.nTri, ...(d.arestasAbertas > 0 ? { arestasAbertas: d.arestasAbertas } : {}) } });
    });
  }
  if (ladoALado) dispoLadoALado(itens.map((i) => i.d));
  for (const it of itens) it.c = classificarMalha(it.d);
  const sha = sha256(lidos.map((l) => l.sha256).join('\n'));
  const giro = girar.some((g) => g !== 0);
  const rotulo = nome ?? (arquivos.length === 1 ? idDoArquivo(arquivos[0].nome) || 'pecas' : 'pecas');
  const montado = montarEsboco({
    itens,
    toleranciaDeContato,
    nome: rotulo,
    formato: 'STL',
    cabecalho: `Importado de ${lidos.length} arquivo(s) STL (sha256 ${sha.slice(0, 16)}) por importar-stl, sem desenhar à mão: cada arquivo é uma peça (e cada componente conexo de um STL com vários é uma peça, com sufixo), com o id tirado do nome do arquivo. O STL não traz B-rep, unidade nem montagem: o cilindro é um prisma de muitos lados, as medidas são lidas como mm${escala === 1 ? '' : ` vezes ${escala}`}, e ${ladoALado ? `as peças foram dispostas numa fileira ao longo de x, ${FOLGA_LADO_A_LADO} mm entre elas, apoiadas em y = 0` : 'cada peça fica onde o arquivo a pôs (leiaute de impressão: deitadas na mesa, espalhadas)'}; a montagem não vem do STL e cabe ao esbocista. Quadro: o z do STL é o y do esboço (para cima), e a direção ${frente} é a frente do esboço, em -z; rotação própria, sem espelhar.${giro ? ` Antes disso o objeto foi girado [${girar.join(', ')}] graus.` : ''}`,
    origemDaDistancia: 'da distância entre as malhas',
    comContatos: !ladoALado,
    fraseSemContatos: 'Os contatos não se medem com as peças dispostas lado a lado.',
    comMalhas: conferir,
    fonte: { arquivos: lidos, ...(ignorados.length > 0 ? { ignorados } : {}) },
    quadro: { frente, girar, escala, ladoALado, regra: '(x, y, z)_stl -> (x, z, -y), girado em torno de y para a frente escolhida ficar em -z; o giro de `girar` vem antes; a escala multiplica as coordenadas (mm)' },
    leitor: 'STL binário ou ASCII, vértices soldados a 1 µm',
  });
  const { resumo, ...resto } = montado;
  void resumo;
  return resto;
}

/* A conferência numérica, a mesma do STEP: cada peça contra a malha do próprio arquivo. Pede `conferir: true` na importação. */
export const conferirStl = conferirMalhas;
