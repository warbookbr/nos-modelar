/* furo-passante.js — os passos de um furo redondo que atravessa um sólido qualquer, com a boca sem face fina
 *
 * FICHA furoPassante
 * serve: os passos (cilindro, subtrair e limparLascas) de um furo passante num sólido qualquer, por posição, direção e raio, com as faces
 *   finas que a booleana deixa na boca limpas até `tolerancia`; devolve também o alias do cilindro e a origem do sólido furado.
 * quando: furo de cordão, de pino ou de parafuso num corpo que não é uma face plana (o `furo` da operação só abre uma face), em especial
 *   em superfície curva ou subdividida, em que `subtrair` sozinho deixa dezenas de faces finas na boca. Para o furo cego numa face
 *   plana use a operação `furo`.
 * unidades: posicao, raio, comprimento e tolerancia em mm; os passos saem em metro, como a receita.
 * campos:
 *   solido: a seleção do sólido a furar, por exemplo { origem: { op: 'subdivisao', id: 2 } }.
 *   posicao: [x, y, z] o ponto do eixo do furo, em mm; o furo se estende comprimento/2 para cada lado dele.
 *   direcao: 'x', 'y' ou 'z', ou um vetor [dx, dy, dz] não nulo; o cilindro oblíquo é girado por duas rotações em torno da origem e depois levado ao ponto.
 *   raio: o raio do furo, em mm.
 *   comprimento: o comprimento do cilindro, em mm; tem de passar do sólido dos dois lados.
 *   lados: os lados do cilindro (padrão 16, de 3 para cima).
 *   ids: { cilindro, subtrair } os `origemId` dos dois passos; o do sólido furado, citável por `parte` e `material`, é o de subtrair.
 *   nome: o prefixo do alias do cilindro, `${nome}Inteiro` (padrão 'furo').
 *   tolerancia: quanto a limpeza das faces finas pode mover a superfície, em mm (padrão 0,01).
 * devolve: { passos, aliases, origem } com `passos` para espalhar na receita, `aliases` para juntar a ALIASES e `origem` { op: 'subtrair', id }.
 * exemplo:
 *   furoPassante({ solido: { origem: { op: 'cubo', id: 1 } }, posicao: [50, 50, 50], direcao: 'y', raio: 5, comprimento: 200, ids: { cilindro: 2, subtrair: 3 } })
 * peça: procedural/pecas/kukri/receita.js (o furo do cordão, em y, através do cabo de superfície subdividida).
 * FIM DA FICHA
 *
 * Função pura, sem Three.js e sem domínio: só monta passos que o registro já tem. O cilindro de eixo alinhado sai de `cilindro` com `eixo`
 * e `em` (a base fica em posicao menos metade do comprimento); o oblíquo nasce no eixo y na origem, gira em x e em z para a direção e
 * é transladado. O `alias` junta a lateral e as duas tampas, que é o que `subtrair` e `rotaciona` tiram e giram. A `limparLascas`
 * logo depois do `subtrair` troca diagonais, colapsa arestas curtas e junta lascas sem criar vértice, até `tolerancia` do que era: na
 * superfície curva, onde a boca do furo corta as faces da gaiola em triângulos de razão 1e-3 a 1e-4, ela os tira (12 no cabo de
 * 12 587 faces da peça do exemplo, 0 depois, com 10 µm). Fica de fora o que a tolerância não alcança: a recusa de `limparLascas` fica nos avisos do passo.
 *
 * AS RECUSAS. Seleção de sólido que não é objeto, posição ou direção que não são vetores finitos (a direção não nula), raio, comprimento ou tolerância não positivos,
 * lados abaixo de 3 e ids que faltam ou se repetem são recusados com o valor recebido e o limite. */
const falha = (texto) => { throw new RangeError(`furoPassante: ${texto}`); };
const numero = (x) => typeof x === 'number' && Number.isFinite(x);
const positivo = (x) => numero(x) && x > 0;
const vetor = (v) => Array.isArray(v) && v.length === 3 && v.every(numero);
const m = (mm) => mm / 1000;
const arredonda = (x) => Math.round(x * 1e9) / 1e9;

export function furoPassante(o = {}) {
  if (!o.solido || typeof o.solido !== 'object' || Array.isArray(o.solido)) falha(`solido é a seleção do sólido a furar, por exemplo { origem: { op: 'subdivisao', id: 2 } }, e veio ${JSON.stringify(o.solido)}`);
  if (!vetor(o.posicao)) falha(`posicao é [x, y, z] em mm, e veio ${JSON.stringify(o.posicao)}`);
  if (!positivo(o.raio)) falha(`raio é número positivo em mm, e veio ${JSON.stringify(o.raio)}`);
  if (!positivo(o.comprimento)) falha(`comprimento é número positivo em mm e passa do sólido dos dois lados, e veio ${JSON.stringify(o.comprimento)}`);
  const lados = o.lados ?? 16;
  if (!(Number.isInteger(lados) && lados >= 3)) falha(`lados é inteiro de 3 para cima, e veio ${JSON.stringify(o.lados)}`);
  const tolerancia = o.tolerancia ?? 0.01;
  if (!positivo(tolerancia)) falha(`tolerancia é número positivo em mm, e veio ${JSON.stringify(o.tolerancia)}`);
  const ids = o.ids;
  if (!ids || !Number.isInteger(ids.cilindro) || !Number.isInteger(ids.subtrair) || ids.cilindro === ids.subtrair) falha(`ids é { cilindro, subtrair } com dois inteiros diferentes, e veio ${JSON.stringify(ids)}`);
  const nome = o.nome ?? 'furo';
  if (typeof nome !== 'string' || !nome) falha(`nome é o prefixo do alias, texto não vazio, e veio ${JSON.stringify(o.nome)}`);
  const d = o.direcao;
  let eixo = typeof d === 'string' ? d : null;
  let unit = null;
  if (typeof d === 'string') {
    if (!['x', 'y', 'z'].includes(d)) falha(`direcao é 'x', 'y', 'z' ou um vetor [dx, dy, dz], e veio ${JSON.stringify(d)}`);
  } else {
    if (!vetor(d) || !(Math.hypot(...d) > 0)) falha(`direcao é 'x', 'y', 'z' ou um vetor [dx, dy, dz] não nulo, e veio ${JSON.stringify(d)}`);
    const n = Math.hypot(...d);
    unit = d.map((v) => v / n);
    const nulos = unit.filter((v) => Math.abs(v) < 1e-9).length;
    if (nulos === 2) eixo = ['x', 'y', 'z'][unit.findIndex((v) => Math.abs(v) >= 1e-9)];
  }
  const alias = `${nome}Inteiro`;
  const cil = { op: 'cilindro', id: ids.cilindro };
  const passos = [];
  if (eixo) {
    const k = ['x', 'y', 'z'].indexOf(eixo);
    const base = o.posicao.map((v, i) => (i === k ? v - o.comprimento / 2 : v));
    passos.push(['cilindro', { origemId: ids.cilindro, raio: m(o.raio), altura: m(o.comprimento), lados, eixo, em: base.map((v) => arredonda(m(v))) }]);
  } else {
    passos.push(['cilindro', { origemId: ids.cilindro, raio: m(o.raio), altura: m(o.comprimento), lados }]);
    const a = (Math.asin(Math.max(-1, Math.min(1, unit[2]))) * 180) / Math.PI;
    const b = (Math.atan2(-unit[0], unit[1]) * 180) / Math.PI;
    if (Math.abs(a) > 1e-9) passos.push(['rotaciona', { eixo: 'x', graus: arredonda(a), pivo: [0, 0, 0], sel: { alias } }]);
    if (Math.abs(b) > 1e-9) passos.push(['rotaciona', { eixo: 'z', graus: arredonda(b), pivo: [0, 0, 0], sel: { alias } }]);
    const base = o.posicao.map((v, k) => v - (unit[k] * o.comprimento) / 2);
    passos.push(['transladar', { d: base.map((v) => arredonda(m(v))), sel: { alias } }]);
  }
  passos.push(['subtrair', { origemId: ids.subtrair, solidos: [o.solido, { alias }] }]);
  passos.push(['limparLascas', { sel: { origem: { op: 'subtrair', id: ids.subtrair } }, tolerancia: arredonda(m(tolerancia)) }]);
  return {
    passos,
    aliases: [[alias, { unir: [{ origem: cil }, { origem: { ...cil, tampa: 'fundo' } }, { origem: { ...cil, tampa: 'topo' } }] }]],
    origem: { op: 'subtrair', id: ids.subtrair },
  };
}
