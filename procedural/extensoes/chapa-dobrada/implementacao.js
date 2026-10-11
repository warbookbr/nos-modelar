/* implementacao.js — extrusa o contorno da chapa dobrada numa largura e, com `origemId`, publica a origem estrutural dela; recebe
   somente emissor transacional e resolução numérica. */
import { construirChapa } from './chapa.js';

/* Vértices: n do anel em z = -largura/2 (ids 0..n-1) e n do anel em z = +largura/2 (ids n..2n-1), na ordem do contorno
   anti-horário visto de +z. Faces: 0 é a tampa em -z, 1 a tampa em +z e 2 + i o lado que sai da aresta i do contorno (do
   vértice i ao i + 1), todos com a normal para fora. As tampas são faces côncavas inteiras. */
export function implementar(contexto, argumentos = {}) {
  const { contorno, largura, arestas } = construirChapa(argumentos, contexto.numero), n = contorno.length, meia = largura / 2;
  for (const z of [-meia, meia]) contorno.forEach(([x, y], i) => contexto.emitirVertice(i + (z > 0 ? n : 0), [x, y, z]));
  contexto.emitirFace(0, contorno.map((_, i) => n - 1 - i));
  contexto.emitirFace(1, contorno.map((_, i) => n + i));
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; contexto.emitirFace(2 + i, [i, j, n + j, n + i]); }
  if (argumentos.origemId !== undefined) contexto.declararOrigem(argumentos.origemId, gruposDaOrigem(arestas));
}

/* Os grupos da origem, cada um uma lista de ids locais de face. `faces` é a peça toda. Os demais têm nome de significado
   fixo, nunca posição na malha: `tampa.menos` e `tampa.mais` (as faces de z = -largura/2 e +largura/2), `borda.inicio` e
   `borda.fim` (a espessura cortada nas pontas), e os lados da chapa, as faces que correm ao longo dela: `aba.<i>.esquerda`
   e `aba.<i>.direita`, `dobra.<k>.esquerda`, `.direita`, `.dentro` e `.fora`, e os agregados `abas`, `dobras`, `esquerda`,
   `direita`, `dentro` e `fora`. Esquerda e direita contam no sentido da linha média (a primeira aba segue +x e a esquerda
   dela é +y); dentro é o lado para onde a dobra gira. A resolução da seleção fica em CONTRATOS_ORIGEM.chapaDobrada. */
function gruposDaOrigem(arestas) {
  const grupos = { faces: [0, 1, ...arestas.map((_, i) => 2 + i)], 'tampa.menos': [0], 'tampa.mais': [1], 'borda.inicio': [], 'borda.fim': [], abas: [], dobras: [], esquerda: [], direita: [], dentro: [], fora: [] };
  const em = (nome, face) => { (grupos[nome] ??= []).push(face); };
  arestas.forEach((a, i) => {
    const face = 2 + i;
    if (a.borda) { em(`borda.${a.borda}`, face); return; }
    const quem = a.aba !== undefined ? `aba.${a.aba}` : `dobra.${a.dobra}`;
    em('aba' in a ? 'abas' : 'dobras', face);
    em(a.lado, face);
    em(`${quem}.${a.lado}`, face);
    if (a.dobra !== undefined) { em(a.dentro ? 'dentro' : 'fora', face); em(`${quem}.${a.dentro ? 'dentro' : 'fora'}`, face); }
  });
  return grupos;
}
