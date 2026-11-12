/* caixas.js — a conferência do glTF de montagem: a caixa de cada nó lida do ARQUIVO (bytes, com a matriz do nó aplicada) e a da mesma
   instância posicionada pelo resolvedor da montagem. Usado pelo teste da montagem de fixture e pelo do braço. */
import { lerGlb } from '../src/index.js';

const vazia = () => ({ min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] });
const alarga = (caixa, p) => p.forEach((v, i) => { caixa.min[i] = Math.min(caixa.min[i], v); caixa.max[i] = Math.max(caixa.max[i], v); });

/* o ponto no mundo: R·p + d, com a pose da montagem ({ rotacao, deslocamento }) */
export const noMundo = (pose, p) => [0, 1, 2].map((i) => pose.rotacao[i][0] * p[0] + pose.rotacao[i][1] * p[1] + pose.rotacao[i][2] * p[2] + pose.deslocamento[i]);

/* nome do nó -> caixa em metro, lida dos bytes do .glb: todas as posições de todas as primitivas da malha do nó, pela matriz dele */
export function caixasDoArquivo(bytes) {
  const { json, bin } = lerGlb(bytes);
  const saida = new Map();
  for (const no of json.nodes) {
    const m = no.matrix ?? [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    const caixa = vazia();
    for (const prim of json.meshes[no.mesh].primitives) {
      const acessor = json.accessors[prim.attributes.POSITION];
      const vista = json.bufferViews[acessor.bufferView];
      const pos = new Float32Array(bin.buffer.slice(bin.byteOffset + vista.byteOffset, bin.byteOffset + vista.byteOffset + acessor.count * 12));
      for (let i = 0; i < acessor.count; i += 1) {
        const [x, y, z] = [pos[3 * i], pos[3 * i + 1], pos[3 * i + 2]];
        alarga(caixa, [0, 1, 2].map((r) => m[r] * x + m[4 + r] * y + m[8 + r] * z + m[12 + r]));
      }
    }
    saida.set(no.name, caixa);
  }
  return saida;
}

/* nome da instância -> caixa em metro dos vértices que as faces da peça usam, levados à pose de montagem pelo resolvedor */
export function caixasDoResolvedor(instancias) {
  const saida = new Map();
  for (const { nome, neutro, pose } of instancias) {
    const caixa = vazia();
    const usados = new Set([...neutro.F.values()].flatMap((f) => f.vs));
    for (const id of usados) alarga(caixa, noMundo(pose, neutro.V.get(id)));
    saida.set(nome, caixa);
  }
  return saida;
}

/* o maior desvio, em milímetro, entre as seis arestas das duas caixas */
export const desvioMm = (a, b) => 1000 * Math.max(...[0, 1, 2].flatMap((i) => [Math.abs(a.min[i] - b.min[i]), Math.abs(a.max[i] - b.max[i])]));
