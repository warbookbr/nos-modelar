/* montagem.js — junta as instâncias posicionadas de uma montagem num glTF só: um nó por instância, com o nome dela, a malha da
   peça no referencial da própria peça e a pose da montagem na matriz do nó. O módulo não conhece o resolvedor da montagem: recebe
   a lista que ele devolve (nome, malha neutra, materiais e pose de cada instância). Uma pose só, a que a lista traz.
   As faces e os vértices de cada peça ganham ids deslocados para não colidirem; a parte de cada face vira o nome da instância,
   e o material que duas peças declaram com o mesmo nome e definição diferente ganha o nome da instância entre parênteses. */
import { gerarGltf, ErroExportacaoGltf } from './gerar-gltf.js';

const mapa = (x) => (x instanceof Map ? x : new Map(Object.entries(x)));

/**
 * @param {{nome?: string, ambiente?: string, instancias: Array<{nome: string, neutro: {V: Map, F: Map}, materiais?: object, pose: {rotacao: number[][], deslocamento: number[]}}>}} opcoes
 */
export function gerarGltfDeMontagem({ nome = 'montagem', instancias, ambiente = 'estudio' }) {
  if (!Array.isArray(instancias) || !instancias.length) {
    throw new ErroExportacaoGltf('montagem-vazia', 'A montagem não tem instância para exportar.');
  }
  const V = new Map();
  const F = new Map();
  const catalogo = {};
  const definicoes = new Map();
  const poses = new Map();
  let deslocamentoV = 0;
  let deslocamentoF = 0;
  for (const inst of instancias) {
    if (poses.has(inst.nome)) throw new ErroExportacaoGltf('instancia-duplicada', `Duas instâncias se chamam '${inst.nome}'.`, { nome: inst.nome });
    poses.set(inst.nome, inst.pose);
    const proprios = inst.materiais ?? {};
    const apelido = (material) => {
      if (material === null || material === undefined) return null;
      const declarado = Object.hasOwn(proprios, material);
      const texto = declarado ? JSON.stringify(proprios[material]) : null;
      const existente = definicoes.get(material);
      if (declarado && existente === undefined) { definicoes.set(material, texto); catalogo[material] = proprios[material]; return material; }
      if (declarado && existente === texto) return material;
      if (!declarado && existente === undefined) return material;
      const novo = `${material} (${inst.nome})`;
      if (declarado) { definicoes.set(novo, texto); catalogo[novo] = proprios[material]; }
      return novo;
    };
    let maiorV = -1;
    for (const [id, p] of mapa(inst.neutro.V)) { V.set(id + deslocamentoV, p); maiorV = Math.max(maiorV, id); }
    let maiorF = -1;
    for (const [mapId, f] of mapa(inst.neutro.F)) {
      const id = f?.id ?? mapId;
      F.set(id + deslocamentoF, {
        ...f,
        id: id + deslocamentoF,
        vs: f.vs.map((v) => v + deslocamentoV),
        ...(f.quebras ? { quebras: f.quebras.map(([a, b]) => [a + deslocamentoV, b + deslocamentoV]) } : {}),
        material: apelido(f.material ?? null),
        parte: inst.nome,
      });
      maiorF = Math.max(maiorF, id);
    }
    deslocamentoV += maiorV + 1;
    deslocamentoF += maiorF + 1;
  }
  return gerarGltf({ nome, neutro: { V, F, orfaos: [], merges: [], partes: {} }, materiais: catalogo, ambiente, poses });
}
