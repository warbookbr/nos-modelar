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
 *   tolerancia: quanto a limpeza das faces finas pode mover a superfície, em mm (padrão 0,01; no máximo 0,5 e um quinto do raio).
 * devolve: { passos, aliases, origem, geometria } com `passos` para espalhar na receita, `aliases` para juntar a ALIASES, `origem` { op: 'subtrair', id } e
 *   `geometria` (posicao, direcao unitária, raio e comprimento). `conferirFuroPassante(neutro, furo)` confere depois de executar: bocas (2 atravessa), corpos e avisos.
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
 * lados abaixo de 3 e ids que faltam ou se repetem são recusados com o valor recebido e o limite. O que só a malha executada sabe (o cilindro que não
 * atravessa, a ferramenta toda dentro, o sólido partido em dois) fica a cargo de `conferirFuroPassante`, que devolve avisos. */
const falha = (texto) => { throw new RangeError(`furoPassante: ${texto}`); };
const numero = (x) => typeof x === 'number' && Number.isFinite(x);
const positivo = (x) => numero(x) && x > 0;
const vetor = (v) => Array.isArray(v) && v.length === 3 && v.every(numero);
const m = (mm) => mm / 1000;
const br = (x) => String(Number(Number(x).toFixed(3))).replace('.', ',');
/* a limpeza de lascas move a superfície até a tolerância: acima disso ela deixa de ser limpeza e passa a ser forma */
export const TOLERANCIA_MAXIMA_MM = 0.5;
const arredonda = (x) => Math.round(x * 1e9) / 1e9;

export function furoPassante(o = {}) {
  if (!o.solido || typeof o.solido !== 'object' || Array.isArray(o.solido)) falha(`solido é a seleção do sólido a furar, por exemplo { origem: { op: 'subdivisao', id: 2 } }, e veio ${JSON.stringify(o.solido)}`);
  if (!vetor(o.posicao)) falha(`posicao é [x, y, z] em mm, e veio ${JSON.stringify(o.posicao)}`);
  if (!positivo(o.raio)) falha(`raio é número positivo em mm, e veio ${JSON.stringify(o.raio)}`);
  if (!positivo(o.comprimento)) falha(`comprimento é número positivo em mm e passa do sólido dos dois lados, e veio ${JSON.stringify(o.comprimento)}`);
  const lados = o.lados ?? 16;
  if (!(Number.isInteger(lados) && lados >= 3)) falha(`lados é inteiro de 3 para cima, e veio ${JSON.stringify(o.lados)}`);
  const tolerancia = o.tolerancia ?? 0.01;
  const maxima = Math.min(TOLERANCIA_MAXIMA_MM, o.raio / 5);
  if (!positivo(tolerancia) || tolerancia > maxima) falha(`tolerancia é número positivo em mm, de no máximo ${br(maxima)} (o menor entre ${TOLERANCIA_MAXIMA_MM} mm e um quinto do raio), e veio ${JSON.stringify(o.tolerancia)}`);
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
  const direcaoUnitaria = unit ?? ['x', 'y', 'z'].map((k) => (k === eixo ? 1 : 0));
  return {
    passos,
    geometria: { posicao: [...o.posicao], direcao: direcaoUnitaria, raio: o.raio, comprimento: o.comprimento, lados },
    aliases: [[alias, { unir: [{ origem: cil }, { origem: { ...cil, tampa: 'fundo' } }, { origem: { ...cil, tampa: 'topo' } }] }]],
    origem: { op: 'subtrair', id: ids.subtrair },
  };
}

/**
 * Confere, no estado executado, o que a composição não sabe antes de rodar: se o cilindro atravessou o sólido, e se a boca do furo partiu o sólido.
 * `neutro` é o estado de `executarReceita` (V em metro, F com `vs` e `parte`), `furo` o devolvido por furoPassante e `parte` (opcional) restringe às faces dela.
 * Devolve { paredes, bocas, componentes, avisos }: `paredes` é o número de faces da parede do furo (todos os vértices a `raio` do eixo), `bocas` o
 * número de bordas fechadas em que a parede encontra o resto da superfície (2 num furo passante, 1 num cego, 0 numa cavidade fechada ou ferramenta toda dentro),
 * `componentes` o número de corpos conexos e `avisos` os textos do que não bate: sem parede, furo que não atravessa, mais corpos que `componentesAntes` (padrão 1).
 */
export function conferirFuroPassante(neutro, furo, { parte = null, componentesAntes = 1 } = {}) {
  const { posicao, direcao, raio, lados, comprimento } = furo.geometria;
  /* os vértices da parede estão na circunferência ou, onde a malha corta a faceta, entre ela e a corda: de raio·cos(π/lados) a raio */
  const interno = raio * Math.cos(Math.PI / lados) - 1e-3;
  const faces = [...neutro.F.values()].filter((f) => parte == null || f.parte === parte);
  if (parte != null && !faces.length) return { paredes: 0, bocas: 0, componentes: 0, avisos: [`furoPassante: a parte ${JSON.stringify(parte)} não tem face nenhuma no estado executado; confira o nome em \`parte\``] };
  const aoEixo = (id) => {
    const p = neutro.V.get(id).map((x, k) => x * 1000 - posicao[k]);
    const t = p[0] * direcao[0] + p[1] * direcao[1] + p[2] * direcao[2];
    return Math.hypot(...p.map((x, k) => x - t * direcao[k]));
  };
  const naParede = new Map();
  const noEixo = (id) => { if (!naParede.has(id)) naParede.set(id, aoEixo(id) >= interno && aoEixo(id) <= raio + 1e-3); return naParede.get(id); };
  const parede = faces.filter((f) => f.vs.every(noEixo));
  const axial = (id) => { const p = neutro.V.get(id).map((x, k) => x * 1000 - posicao[k]); return p[0] * direcao[0] + p[1] * direcao[1] + p[2] * direcao[2]; };
  /* o fundo do cilindro, uma face inteira num dos planos das pontas dele, sobrevive no resultado quando a ponta ficou dentro do sólido */
  const fundos = faces.filter((f) => [-comprimento / 2, comprimento / 2].some((a) => f.vs.every((id) => Math.abs(axial(id) - a) <= 1e-3 && aoEixo(id) <= raio + 1e-3))).length;
  const ehParede = new Set(parede);
  /* as bordas entre uma face da parede e uma que não é dela */
  const arestas = new Map();
  for (const f of faces) {
    for (let i = 0; i < f.vs.length; i++) {
      const a = f.vs[i]; const b = f.vs[(i + 1) % f.vs.length];
      const chave = a < b ? `${a}|${b}` : `${b}|${a}`;
      if (!arestas.has(chave)) arestas.set(chave, []);
      arestas.get(chave).push({ f, a, b });
    }
  }
  const raiz = new Map();
  const achar = (x) => { while (raiz.get(x) !== x) { raiz.set(x, raiz.get(raiz.get(x))); x = raiz.get(x); } return x; };
  const unir = (a, b) => { for (const x of [a, b]) if (!raiz.has(x)) raiz.set(x, x); raiz.set(achar(a), achar(b)); };
  for (const usos of arestas.values()) {
    if (usos.length === 2 && ehParede.has(usos[0].f) !== ehParede.has(usos[1].f)) unir(usos[0].a, usos[0].b);
  }
  const bocas = new Set([...raiz.keys()].map(achar)).size;
  raiz.clear();
  for (const f of faces) for (let i = 1; i < f.vs.length; i++) unir(f.vs[0], f.vs[i]);
  const componentes = new Set([...raiz.keys()].map(achar)).size;
  const avisos = [];
  const cavidade = parede.length > 0 && bocas === 0;
  if (!parede.length) avisos.push('furoPassante: o cilindro não deixou parede no sólido (fora dele, ou tangente): confira posicao, direcao, raio e comprimento');
  else if (cavidade) avisos.push('furoPassante: o furo tem 0 boca(s): cavidade fechada, a ferramenta ficou toda dentro; aumente o comprimento ou mova a posicao para o cilindro passar dos dois lados');
  else if (bocas === 1) avisos.push(fundos > 0
    ? 'furoPassante: o furo tem 1 boca e não atravessa o sólido (furo cego: a ponta do cilindro ficou dentro); aumente o comprimento ou mova a posicao para o cilindro passar dos dois lados'
    : 'furoPassante: o cilindro só raspa o sólido: uma ranhura aberta na lateral, com 1 boca e sem fundo, em vez de um furo; mova a posicao para o eixo ficar dentro do sólido');
  if (componentes > componentesAntes && !cavidade) avisos.push(`furoPassante: o sólido ficou com ${componentes} corpos e tinha ${componentesAntes}: o furo o partiu ou soltou um pedaço; reduza o raio ou mova a posicao`);
  return { paredes: parede.length, bocas, componentes, avisos };
}
