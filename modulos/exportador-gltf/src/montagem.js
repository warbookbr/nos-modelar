/* montagem.js — junta as instâncias posicionadas de uma montagem num glTF só: um nó por instância, com o nome dela, a malha da
   peça no referencial da própria peça e a pose da montagem na matriz do nó. O módulo não conhece o resolvedor da montagem: recebe
   a lista que ele devolve (nome, malha neutra, materiais e pose de cada instância). Uma pose só, a que a lista traz.
   As faces e os vértices de cada peça ganham ids deslocados para não colidirem; a parte de cada face vira o nome da instância,
   e o material que duas peças declaram com o mesmo nome e definição diferente ganha o nome da instância entre parênteses.

   COM ARTICULAÇÃO (`juntas`): cada junta vira um nó vazio `junta-<id>` no pivô dela (a pose de repouso, em metro), com o eixo dela como o +Y local; a peça
   que ela move vira filha do nó, com a pose local (a do mundo vista do nó), de modo que girar o nó em torno do +Y local gira a peça e o que ela carrega. As juntas
   aninhadas (a de B dentro das peças que a de A move) saem uma dentro da outra, a peça debaixo da menor junta que a move; o que nenhuma junta move fica na raiz.
   COM CABOS (`cabos`): cada cabo é uma malha na pose de repouso, na raiz, com um nó vazio em cada ponta, filho do nó da peça em que a ponta prende (a posição e a
   direção da porta, a direção como o +Y local), e os dados do cabo em `extras` do nó do cabo. Sem `juntas` nem `cabos` a saída é a de sempre. */
import { gerarGltf, ErroExportacaoGltf } from './gerar-gltf.js';
import { arvoreDasJuntas, compor, inverter, rotacaoDeYPara, trsDaPose } from './arvore.js';

const mapa = (x) => (x instanceof Map ? x : new Map(Object.entries(x)));

/**
 * @param {{nome?: string, ambiente?: string, instancias: Array<{nome: string, neutro: {V: Map, F: Map}, materiais?: object, pose: {rotacao: number[][], deslocamento: number[]}}>}} opcoes
 */
export function gerarGltfDeMontagem({ nome = 'montagem', instancias, ambiente = 'estudio', juntas = [], cabos = [] }) {
  if (!Array.isArray(instancias) || !instancias.length) {
    throw new ErroExportacaoGltf('montagem-vazia', 'A montagem não tem instância para exportar.');
  }
  const todas = [...instancias];
  const nomesDosCabos = new Set();
  for (const c of cabos) {
    if (!c || typeof c.nome !== 'string' || !c.nome || !c.neutro) throw new ErroExportacaoGltf('cabo-invalido', 'Todo cabo precisa de nome e da malha neutra dele.', { cabo: c?.nome });
    if (nomesDosCabos.has(c.nome)) throw new ErroExportacaoGltf('cabo-invalido', `Dois cabos se chamam '${c.nome}'.`, { nome: c.nome });
    nomesDosCabos.add(c.nome);
    for (const lado of ['de', 'para']) {
      const p = c.pontas?.[lado];
      const ok3 = (v) => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);
      if (!p || typeof p.instancia !== 'string' || !ok3(p.ponto) || !ok3(p.direcao)) throw new ErroExportacaoGltf('cabo-invalido', `O cabo '${c.nome}' precisa de pontas.${lado} com { instancia, ponto, direcao } no mundo, em metro.`, { nome: c.nome, lado });
      if (!instancias.some((i) => i.nome === p.instancia)) throw new ErroExportacaoGltf('cabo-invalido', `A ponta '${lado}' do cabo '${c.nome}' prende na instância '${p.instancia}', que a montagem não tem.`, { nome: c.nome, lado, instancia: p.instancia });
    }
    todas.push({ nome: c.nome, neutro: c.neutro, materiais: c.materiais, pose: { rotacao: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], deslocamento: [0, 0, 0] } });
  }
  const articulada = juntas.length > 0 || cabos.length > 0;
  const arvore = juntas.length ? arvoreDasJuntas(juntas, instancias) : null;
  const V = new Map();
  const F = new Map();
  const catalogo = {};
  const definicoes = new Map();
  const poses = new Map();
  let deslocamentoV = 0;
  let deslocamentoF = 0;
  for (const inst of todas) {
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
  if (!articulada) return gerarGltf({ nome, neutro: { V, F, orfaos: [], merges: [], partes: {} }, materiais: catalogo, ambiente, poses });

  const pais = new Map(arvore?.pais ?? []);
  const vazios = [];
  const extras = new Map();
  const posesDoNo = new Map(poses);
  for (const [no, local] of arvore?.posesLocais ?? []) posesDoNo.set(no, local);
  for (const j of arvore?.juntas ?? []) {
    const { translation, rotation } = trsDaPose(arvore.posesLocais.get(j.no));
    vazios.push({
      name: j.no, translation, rotation,
      extras: { junta: { id: j.id, tipo: j.tipo, eixoLocal: [0, 1, 0], eixoNoMundo: j.eixo.map((c) => Math.round(c * 1e9) / 1e9 + 0), centroNoMundo: j.centro, fixo: j.fixo, moveis: [...j.moveis], ...(j.curso ? { curso: j.curso } : {}) } },
    });
  }
  const mundoDa = new Map(instancias.map((i) => [i.nome, i.pose]));
  for (const c of cabos) {
    const nos = {};
    const dados = {};
    for (const lado of ['de', 'para']) {
      const p = c.pontas[lado];
      const no = `${c.nome}.ponta-${lado}`;
      nos[lado] = no;
      const local = compor(inverter(mundoDa.get(p.instancia)), { rotacao: rotacaoDeYPara(p.direcao), deslocamento: p.ponto });
      vazios.push({ name: no, ...trsDaPose(local), extras: { cabo: c.nome, lado, instancia: p.instancia, ...(p.porta ? { porta: p.porta } : {}), direcaoLocal: [0, 1, 0] } });
      pais.set(no, p.instancia);
      dados[lado] = { no, instancia: p.instancia, ...(p.porta ? { porta: p.porta } : {}) };
    }
    extras.set(c.nome, { ...(c.extras ?? {}), AttachStartTo: nos.de, AttachEndTo: nos.para, pontas: dados });
  }
  const r = gerarGltf({ nome, neutro: { V, F, orfaos: [], merges: [], partes: {} }, materiais: catalogo, ambiente, poses: posesDoNo, arvore: { pais, vazios, extras } });
  return { ...r, diagnostico: { ...r.diagnostico, juntas: juntas.length, cabos: cabos.length } };
}
