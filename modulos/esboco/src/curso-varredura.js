/* A varredura do curso de um mecanismo (`curso.js`): em cada posição o gate de contato roda no esboço com o parâmetro naquele
   valor, e os achados vêm juntos, cada um com as posições em que aparece. O trem do nariz do avião recolhe sem achado até 85
   graus e a partir de 90 a roda atravessa o capô, o duto e a fuselagem; saber disso pediu copiar o detalhe, tirar o `oculto`
   das três vizinhas e rodar `--editar parametros.tnCurso=<n>` quinze vezes, lendo as divergências de cada uma (atrito 38). Só
   o gate de contato entra: a medida do plano e a silhueta da referência valem na pose de repouso, e a 83 graus acusavam três
   divergências que não eram defeito. Um achado que já existe na primeira posição é do repouso, e não do curso. Puro. */
import { ErroDeEsboco, resolverOpcao } from './index.js';
import { descreverAchado, verificarContato } from './contato.js';
import { expandirEsboco } from './expandir.js';
import { aplicarPose, cursoPorNome, lerCurso, numeroDoCurso, posesDoBrief, posicoesDoCurso } from './curso.js';

const objeto = (v) => v && typeof v === 'object' && !Array.isArray(v);
const clone = (v) => JSON.parse(JSON.stringify(v));

/* O esboço bruto sem o `oculto: true` das formas (da raiz e das opções): o detalhe isolado esconde as formas das outras unidades
   para só servirem de referência de posição, e é com elas que o curso pode se cruzar. Devolve { esboco, trazidas }. */
export function semOcultas(bruto) {
  const esboco = clone(bruto);
  let trazidas = 0;
  for (const lista of [esboco.formas, ...(Array.isArray(esboco.opcoes) ? esboco.opcoes.map((o) => o?.formas) : [])]) {
    if (!Array.isArray(lista)) continue;
    for (const f of lista) if (objeto(f) && f.oculto === true) { delete f.oculto; trazidas += 1; }
  }
  return { esboco, trazidas };
}

/* Os achados do gate de contato de cada posição do curso: [{ valor, achados, usar }], na ordem do curso. */
export function achadosPorPosicao(bruto, c, { unidades = {} } = {}) {
  return posicoesDoCurso(c).map((valor) => {
    const gate = verificarContato(aplicarPose(bruto, c, valor), { unidades });
    return { valor, usar: gate.usar, achados: gate.achados };
  });
}

const chaveDoAchado = (a) => `${a.opcao}\u0000${a.tipo}\u0000${[...a.pecas].sort().join('+')}`;

/* Junta os achados das posições: um por (opção, tipo, peças), com as posições em que aparece e o texto e a medida de cada uma.
   `noInicio` marca o que já existe na primeira posição, que é do repouso. */
export function juntarAchados(porPosicao) {
  const juntos = new Map();
  for (const { valor, achados } of porPosicao) {
    for (const a of achados) {
      const chave = chaveDoAchado(a);
      if (!juntos.has(chave)) juntos.set(chave, { chave, opcao: a.opcao, tipo: a.tipo, pecas: a.pecas, posicoes: [], noInicio: false });
      juntos.get(chave).posicoes.push({ valor, mm: a.mm ?? null, texto: descreverAchado(a), achado: a });
    }
  }
  const primeira = porPosicao[0]?.valor;
  for (const j of juntos.values()) j.noInicio = j.posicoes[0].valor === primeira;
  return [...juntos.values()];
}

/* A varredura de um mecanismo (`nome`) ou de todos: { cursos: [{ nome, parametro, de, ate, passos, rotulo, posicoes, achados,
   gateLigado, trazidas }] }. `desocultar` traz à vista as formas ocultas (o detalhe isolado), e por padrão vale para o esboço
   que o `--detalhar` gravou (`baseDoMestre`). Sem `curso` declarado é erro. */
export function varrerCurso(bruto, { nome = null, unidades = {}, desocultar } = {}) {
  const todos = lerCurso(bruto);
  if (todos.length === 0) throw new ErroDeEsboco('--curso: o esboço não declara "curso" (por mecanismo: { "parametro": "tnCurso", "de": 0, "ate": 95, "passos": 10 })');
  const escolhidos = nome === null ? todos : [cursoPorNome(todos, nome)];
  const trazer = desocultar ?? bruto.baseDoMestre !== undefined;
  const { esboco, trazidas } = trazer ? semOcultas(bruto) : { esboco: bruto, trazidas: 0 };
  return {
    cursos: escolhidos.map((c) => {
      const porPosicao = achadosPorPosicao(esboco, c, { unidades });
      return {
        nome: c.nome, parametro: c.parametro, de: c.de, ate: c.ate, passos: c.passos, ...(c.rotulo ? { rotulo: c.rotulo } : {}),
        posicoes: porPosicao.map((p) => p.valor), gateLigado: porPosicao.every((p) => p.usar), trazidas,
        achados: juntarAchados(porPosicao),
        porPosicao: porPosicao.map((p) => ({ valor: p.valor, achados: p.achados.length })),
      };
    }),
  };
}

const lista = (valores) => valores.map(numeroDoCurso).join(', ');

/* O relato da varredura em texto, e o código de saída: 1 se algum curso tem achado que não é do repouso. */
export function formatarCurso(resultado) {
  const L = [];
  let codigo = 0;
  for (const c of resultado.cursos) {
    L.push(`curso ${c.nome}${c.rotulo ? ` (${c.rotulo})` : ''}: ${c.parametro} de ${numeroDoCurso(c.de)} a ${numeroDoCurso(c.ate)} em ${c.passos} ${c.passos === 1 ? 'passo' : 'passos'}, ${c.posicoes.length} posições, o gate de contato em cada uma`);
    if (c.trazidas > 0) L.push(`  ${c.trazidas} ${c.trazidas === 1 ? 'forma oculta trazida' : 'formas ocultas trazidas'} à vista para a varredura (o detalhe isolado as esconde, e o curso pode cruzá-las)`);
    if (!c.gateLigado) { L.push('  o gate de contato está desligado (contato.usar): ligue-o para o curso ter o que varrer'); continue; }
    const doCurso = c.achados.filter((a) => !a.noInicio);
    const doRepouso = c.achados.filter((a) => a.noInicio);
    if (doCurso.length === 0) L.push(`  nenhum achado novo em nenhuma das ${c.posicoes.length} posições (${lista(c.posicoes)})`);
    else {
      codigo = 1;
      L.push(`  ${doCurso.length} ${doCurso.length === 1 ? 'achado aparece' : 'achados aparecem'} ao longo do curso, com a posição em que cada um aparece:`);
      for (const a of doCurso) {
        const maior = a.posicoes.filter((p) => p.mm !== null).reduce((m, p) => (m === null || p.mm > m.mm ? p : m), null);
        L.push(`    ${a.posicoes[0].texto}`);
        L.push(`      em ${c.parametro} ${a.posicoes.map((p) => `${numeroDoCurso(p.valor)}${p.mm === null ? '' : ` (${numeroDoCurso(p.mm)} mm)`}`).join(', ')}${maior && a.posicoes.length > 1 ? `; o pior, ${numeroDoCurso(maior.mm)} mm em ${numeroDoCurso(maior.valor)}` : ''}`);
      }
      const limpas = c.porPosicao.filter((p) => !doCurso.some((a) => a.posicoes.some((q) => q.valor === p.valor))).map((p) => p.valor);
      L.push(`  posições sem achado novo: ${limpas.length ? lista(limpas) : 'nenhuma'}`);
    }
    if (doRepouso.length > 0) L.push(`  ${doRepouso.length} ${doRepouso.length === 1 ? 'achado já existe' : 'achados já existem'} na primeira posição (${c.parametro} ${numeroDoCurso(c.de)}) e não são do curso: ${doRepouso.slice(0, 4).map((a) => a.posicoes[0].texto.replace(/^\[[^\]]*\] /, '')).join('; ')}${doRepouso.length > 4 ? `; e mais ${doRepouso.length - 4}` : ''}`);
  }
  return { texto: `${L.join('\n')}\n`, codigo };
}

/* As formas que se movem no curso: as que mudam de lugar entre a primeira posição e qualquer outra (centro ou caixa além de
   `limite` mm), nos ids do esboço expandido. O brief do crítico diz com isso a que unidade o curso pertence. */
export function formasQueSeMovem(bruto, c, { posicoes = posicoesDoCurso(c), limite = 0.5 } = {}) {
  const lidas = posicoes.map((valor) => {
    const esboco = expandirEsboco(aplicarPose(bruto, c, valor));
    const o = esboco.opcoes[0];
    return new Map(resolverOpcao(o, 'opção 1', esboco.pontos).map((r) => [r.id, [...r.centro, ...r.min, ...r.max]]));
  });
  const moveu = new Set();
  const [base, ...resto] = lidas;
  for (const pose of resto) for (const [id, v] of pose) {
    const b = base.get(id);
    if (!b || v.some((x, i) => Math.abs(x - b[i]) > limite)) moveu.add(id);
  }
  return moveu;
}

/* Os mecanismos do esboço que movem alguma forma da unidade (`membros`: os ids dela): [{ curso, formas }], com as formas da
   unidade que se movem. */
export function cursosDaUnidade(bruto, membros) {
  const dela = new Set(membros);
  return lerCurso(bruto).flatMap((c) => {
    const movem = [...formasQueSeMovem(bruto, c, { posicoes: posesDoBrief(c) })].filter((id) => dela.has(id));
    return movem.length > 0 ? [{ curso: c, formas: movem }] : [];
  });
}

/* Os achados do curso que atingem a unidade (alguma peça é dela) e não existem na primeira posição, para o Portão que decide
   se a unidade vira feita: cada um é um achado do gate, com `posicoes` (os valores do parâmetro) e `curso`. */
export function achadosDoCursoNaUnidade(bruto, membros, { unidades = {} } = {}) {
  const dela = new Set(membros);
  if (!objeto(bruto?.curso)) return [];
  return varrerCurso(bruto, { unidades, desocultar: false }).cursos.flatMap((c) => c.achados
    .filter((a) => !a.noInicio && a.pecas.some((p) => dela.has(p)))
    .map((a) => ({ ...a.posicoes[0].achado, curso: c.nome, parametro: c.parametro, posicoes: a.posicoes.map((p) => p.valor) })));
}

/* O quadro que todas as poses de um curso compartilham: os 8 cantos da caixa que une as formas da unidade (`membros`) em todas as
   posições (`valores`), para `enquadrar.pontos`. Sem isso o quadro da unidade isolada acompanha a unidade, e a imagem da última
   pose sairia numa escala e num lugar diferentes das outras. */
export function quadroDoCurso(bruto, c, membros, valores) {
  const dela = new Set(membros);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const valor of valores) {
    const esboco = expandirEsboco(aplicarPose(bruto, c, valor));
    for (const r of resolverOpcao(esboco.opcoes[0], 'opção 1', esboco.pontos)) {
      if (!dela.has(r.id) || r.forma.oculto === true) continue;
      for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], r.min[i]); max[i] = Math.max(max[i], r.max[i]); }
    }
  }
  if (!min.every(Number.isFinite)) return null;
  return [0, 1, 2, 3, 4, 5, 6, 7].map((k) => [k & 1 ? max[0] : min[0], k & 2 ? max[1] : min[1], k & 4 ? max[2] : min[2]]);
}
