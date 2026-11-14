import { readFileSync } from 'node:fs';
import {
  TOLERANCIA_DE_ENCOSTO_DA_PECA,
  auditarParDeSolidos,
  caixasSeparadas,
  prepararSolido,
  profundidadeDeInvasao,
} from './contato-de-solidos.js';

/* invasao-de-contato — quanto uma parte invade a outra, medido CORPO A CORPO.
 *
 * O DEFEITO. O contato que a receita declara só dizia "estas partes se tocam", e `encostam` e `interpenetram` passavam igual: as alças da armação de um abajur
 * atravessaram o soquete e o contato declarado passou. A declaração autoriza o toque, não a invasão: encostar (inclusive face coplanar, e aresta sobre a face) passa,
 * e invadir além de `TOLERANCIA_DE_INVASAO` reprova, dizendo o par de corpos e a profundidade.
 *
 * POR CORPO, NÃO POR PARTE. Um corpo é um componente conexo da parte (faces ligadas por vértice compartilhado). A contenção de ponto de `pontoDentroMalha` conta
 * cruzamentos de raio com a malha INTEIRA da parte: dois corpos da mesma parte que se sobrepõem entre si somam duas passagens, e o ponto de um corpo da outra
 * parte, dentro dos dois, sai "fora". Medir corpo contra corpo evita isso, e o par de corpos é o que a mensagem pode apontar para quem for corrigir.
 *
 * A profundidade é um piso (amostra pontos, ver `profundidadeDeInvasao`). O par de corpos que se cruzam sem nenhum ponto estritamente dentro (arestas que se
 * cruzam no limite da tolerância) fica sem profundidade e não reprova: não há o que medir, e reprovar sem número ensina a ignorar a reprovação.
 */

/** O quanto uma parte pode afundar na outra, num contato declarado, sem reprovar: um décimo de milímetro numa peça em metro. A receita pede mais com `invasaoMaxima` no contato. */
export const TOLERANCIA_DE_INVASAO = 1e-4;

/** Os corpos de uma lista de faces: componentes conexos por vértice compartilhado, na ordem em que aparecem. */
export function corposDasFaces(faces) {
  const pai = faces.map((_, i) => i);
  const raiz = (i) => { let a = i; while (pai[a] !== a) { pai[a] = pai[pai[a]]; a = pai[a]; } return a; };
  const primeira = new Map();
  faces.forEach((face, i) => {
    for (const id of face.vs ?? []) {
      if (!primeira.has(id)) { primeira.set(id, i); continue; }
      const a = raiz(i); const b = raiz(primeira.get(id));
      if (a !== b) { if (a < b) pai[b] = a; else pai[a] = b; }
    }
  });
  const porRaiz = new Map();
  faces.forEach((face, i) => {
    const r = raiz(i);
    if (!porRaiz.has(r)) porRaiz.set(r, []);
    porRaiz.get(r).push(face);
  });
  return [...porRaiz.values()];
}

/** O sólido de cada corpo da parte, com `{ indice, faces, solido }`; `facesDaParte` são as faces dela e `V` os vértices do `neutro`; `pose` (`{ rotacao, deslocamento }`) leva o corpo à posição de um movimento. */
export function solidosDosCorpos(nome, facesDaParte, V, pose = undefined) {
  return corposDasFaces(facesDaParte).map((faces, indice) => {
    const vs = new Map();
    const fs = new Map();
    for (const face of faces) { fs.set(face.id, face); for (const id of face.vs ?? []) if (!vs.has(id)) vs.set(id, V.get(id)); }
    return { indice, faces: faces.length, solido: prepararSolido({ V: vs, F: fs }, pose, `${nome}#${indice}`) };
  });
}

const arredondar = (n) => (n === null ? null : Number(n.toPrecision(6)));

/**
 * Mede a invasão entre duas partes, dadas como os sólidos dos seus corpos. Devolve `{ estado, profundidade, corpos, paresInconclusivos }`, com `estado` entre `interpenetram` (afunda mais que `TOLERANCIA_DE_INVASAO`), `inconclusivo`, `encostam` e `separadas`, e: `profundidade` é a maior entre os
 * pares de corpos (0 quando nenhum se invade) e `corpos` o par que a dá, com o índice, a quantidade de faces e a caixa de cada um. Corpo inconclusivo (malha
 * aberta) não decide, e entra em `paresInconclusivos`: ele não vira invasão nem vira livre.
 */
export function invasaoEntreCorpos(corposA, corposB, tolerancia = TOLERANCIA_DE_ENCOSTO_DA_PECA) {
  let melhor = { profundidade: 0, corpos: null };
  let paresInconclusivos = 0;
  let encostou = false;
  for (const a of corposA) for (const b of corposB) {
    if (a.solido.caixa && b.solido.caixa && caixasSeparadas(a.solido.caixa, b.solido.caixa, tolerancia)) continue;
    const resultado = auditarParDeSolidos(a.solido, b.solido, tolerancia);
    if (resultado.estado === 'inconclusivo') { paresInconclusivos += 1; continue; }
    if (resultado.estado === 'encostam') encostou = true;
    if (resultado.estado !== 'interpenetram') continue;
    encostou = true;
    const profundidade = profundidadeDeInvasao(a.solido, b.solido, tolerancia);
    if (profundidade === null || profundidade <= melhor.profundidade) continue;
    const dado = (c) => ({ indice: c.indice, faces: c.faces, caixa: { min: c.solido.caixa.min.map(arredondar), max: c.solido.caixa.max.map(arredondar) } });
    melhor = { profundidade, corpos: [dado(a), dado(b)] };
  }
  const estado = melhor.profundidade > TOLERANCIA_DE_INVASAO ? 'interpenetram' : paresInconclusivos ? 'inconclusivo' : encostou ? 'encostam' : 'separadas';
  return { estado, profundidade: melhor.profundidade, corpos: melhor.corpos, paresInconclusivos };
}

/* AS PEÇAS ANTIGAS TOLERADAS. A régua nasceu com 31 peças do acervo que já afundavam em contatos declarados (solda, pino, perna dentro de caixa). Elas ficam numa lista
   versionada e explícita, invasao-tolerada.json, e a invasão delas sai como AVISO; a peça fora da lista reprova. A lista só encolhe. */
export const CAMINHO_DA_LISTA_TOLERADA = new URL('./invasao-tolerada.json', import.meta.url);
export function pecasToleradas() {
  const lista = JSON.parse(readFileSync(CAMINHO_DA_LISTA_TOLERADA, 'utf8'));
  return new Map(lista.pecas.map((p) => [p.peca, p.desde]));
}
