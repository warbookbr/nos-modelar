/* contatos.js — o relato de contatos de uma opção do esboço 2.0: quem encosta, quem atravessa e com quanto, e a folga entre as
 * formas que ficam perto, com o que cada forma declarou esperar.
 *
 * A medida é a do `descrever` (`descreverPeca` de `src/autoria/descrever-partes.js`) sobre o neutro da opção, sem medida nova: a
 * relação de cada par de partes, medida corpo a corpo pela caixa e confirmada pelo sólido quando as caixas se sobrepõem. `encosta`
 * é o toque dentro da tolerância; `interpenetra` sai como "atravessa", com a profundidade que o `descrever` dá (a menor que separa
 * as caixas dos dois corpos, num eixo); e `folga` traz a distância entre as caixas, ou nenhuma quando as caixas se sobrepõem e o
 * sólido diz que as formas não se tocam. A tolerância padrão é de 0,001 mm, e a folga entra no relato até `perto` mm.
 *
 * O ESPERADO. Cada forma declara em `contato: { "<id>": "encosta" | "atravessa" | "folga" }` a relação que espera com outra, e o
 * `encosta: { id, lado }` declara a dele; a opção declara em `contatos: [{ par, relacao, motivo }]` a de qualquer par de partes,
 * inclusive as de passos crus, que não têm onde declarar, e o motivo sai no relato. Uma travessia que nenhuma das duas declarou é "não declarada", e uma relação declarada
 * que a malha não dá é "esperada e não dada": as duas listas são o que o modo estrito recusa. Núcleo puro. */
import { descreverPeca } from '../../../src/autoria/descrever-partes.js';
import { TOLERANCIA_DE_ENCOSTO_DA_PECA } from '../../../src/autoria/contato-de-solidos.js';
import { MM } from './milimetro.js';

/* a mesma tolerância de encosto do contato declarado que o `descrever` confirma (um micrômetro, com a razão em `contato-de-solidos.js`) */
export const TOLERANCIA_DO_RELATO_M = TOLERANCIA_DE_ENCOSTO_DA_PECA;
export const PERTO_MM = 20;
const NOME_DA_RELACAO = { encosta: 'encosta', interpenetra: 'atravessa', folga: 'folga' };
const fmt = (x) => (Math.round(x * 1000) / 1000).toFixed(3).replace('.', ',');

/**
 * O relato de contatos de uma opção montada.
 * @param {object} neutro   o neutro da opção (metro)
 * @param {Array<{id, contato}>} formas  as formas da opção, com o contato esperado
 * @param {{ perto?: number, tolerancia?: number, contatos?: Array<{par, relacao, motivo}> }} [o]  `perto` em mm; `tolerancia` em
 *   metro; `contatos`, os declarados na opção (o `contatos` que `receitaDaOpcao` devolve)
 * @returns {{ pares: Array, encostam: Array, atravessam: Array, folgas: Array, longe: number, naoDeclaradas: Array, faltam: Array, assimetricas: Array }}
 */
export function relatoDeContatos(neutro, formas = [], { perto = PERTO_MM, tolerancia = TOLERANCIA_DO_RELATO_M, contatos = [] } = {}) {
  const d = descreverPeca(neutro, { tolerancia });
  const esperado = new Map();
  const chave = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const declarar = (k, rel, por, motivo = null) => {
    const antes = esperado.get(k);
    if (antes && antes.rel !== rel) esperado.set(k, { rel: 'conflito', de: [antes, { rel, por }], motivo: antes.motivo ?? motivo });
    else esperado.set(k, { rel, por, motivo: antes?.motivo ?? motivo });
  };
  for (const f of formas) for (const [outra, rel] of Object.entries(f.contato ?? {})) declarar(chave(f.id, outra), rel, f.id);
  for (const c of contatos) declarar(chave(c.par[0], c.par[1]), c.relacao, 'a opção', c.motivo);
  const pares = d.relacoes.map((r) => {
    const tipo = NOME_DA_RELACAO[r.tipo];
    const e = esperado.get(chave(r.a, r.b)) ?? null;
    return {
      a: r.a, b: r.b, tipo, eixo: r.eixo,
      mm: r.distancia === null || r.distancia === undefined ? null : r.distancia * MM,
      solido: r.solido ?? null,
      ...(r.motivoDoSolido ? { motivoDoSolido: r.motivoDoSolido } : {}),
      esperado: e?.rel ?? null,
      confere: e ? e.rel === tipo : null,
      motivo: e?.motivo ?? null,
    };
  });
  const encostam = pares.filter((p) => p.tipo === 'encosta');
  const atravessam = pares.filter((p) => p.tipo === 'atravessa');
  const folgas = pares.filter((p) => p.tipo === 'folga' && (p.mm === null || p.mm <= perto));
  const longe = pares.filter((p) => p.tipo === 'folga' && p.mm !== null && p.mm > perto).length;
  const naoDeclaradas = atravessam.filter((p) => p.esperado !== 'atravessa');
  const nomes = new Set(d.partes.map((p) => p.nome));
  const faltam = [];
  for (const [k, e] of esperado) {
    const [a, b] = k.split('|');
    /* o motivo só entra quando a opção o declarou, e o objeto do `contato` da forma fica como era */
    const motivo = e.motivo ? { motivo: e.motivo } : {};
    if (!nomes.has(a) || !nomes.has(b)) { faltam.push({ a, b, esperado: e.rel, dado: 'a forma não está na opção', ...motivo }); continue; }
    const p = pares.find((q) => chave(q.a, q.b) === k);
    if (e.rel === 'conflito') faltam.push({ a, b, esperado: 'conflito', dado: `${e.de[0].por} declara ${e.de[0].rel} e ${e.de[1].por}, ${e.de[1].rel}`, ...motivo });
    else if (p && p.tipo !== e.rel) faltam.push({ a, b, esperado: e.rel, dado: p.tipo, ...motivo });
  }
  return { tolerancia, perto, pares, encostam, atravessam, folgas, longe, naoDeclaradas, faltam, assimetricas: paresEspelhadosQueDiferem(pares, chave) };
}

/* O ESPELHO. Parte que termina em Dir ou Esq é a imagem da outra: o par (a, b) e o par com cada lado trocado têm de medir igual. A medida do
   contato lê o neutro com um raio que não é simétrico em x, e dois lados que são imagem um do outro já saíram com vereditos diferentes (o relato
   dava travessia de 4,107 mm no esquerdo e folga no direito); com isto a diferença aparece como assimetria, e não como contato declarado errado
   de um lado só. Só compara o tipo da relação, o estado do sólido e, entre duas folgas medidas, a distância (0,5 mm). */
const DISTANCIA_DE_ESPELHO_MM = 0.5;
const doOutroLado = (nome) => (nome.endsWith('Dir') ? `${nome.slice(0, -3)}Esq` : nome.endsWith('Esq') ? `${nome.slice(0, -3)}Dir` : nome);
function paresEspelhadosQueDiferem(pares, chave) {
  const porChave = new Map(pares.map((p) => [chave(p.a, p.b), p]));
  const diferem = [];
  for (const p of pares) {
    const a = doOutroLado(p.a); const b = doOutroLado(p.b);
    if (a === p.a && b === p.b) continue;
    const k = chave(p.a, p.b); const k2 = chave(a, b);
    const q = porChave.get(k2);
    if (!q || k2 === k || k2 < k) continue;
    const diferenca = p.tipo !== q.tipo || (p.solido ?? null) !== (q.solido ?? null)
      || (p.tipo === 'folga' && p.mm !== null && q.mm !== null && Math.abs(p.mm - q.mm) > DISTANCIA_DE_ESPELHO_MM);
    if (diferenca) diferem.push({ a: p.a, b: p.b, tipo: p.tipo, solido: p.solido ?? null, mm: p.mm, espelho: { a: q.a, b: q.b, tipo: q.tipo, solido: q.solido ?? null, mm: q.mm } });
  }
  return diferem;
}

/** O relato em linhas de texto, uma por relação que importa. */
export function textoDoRelato(r, { recuo = '    ' } = {}) {
  const linhas = [];
  const porque = (p) => (p.motivo ? `: ${p.motivo}` : '');
  const marca = (p) => (p.esperado === null ? '' : p.confere ? ` (esperado: ${p.esperado}${porque(p)})` : ` (esperado: ${p.esperado}, NÃO CONFERE)`);
  for (const p of r.encostam) linhas.push(`encosta    ${p.a} e ${p.b}${marca(p)}`);
  for (const p of r.atravessam) {
    const quanto = p.mm === null ? 'sem profundidade medida' : `${fmt(p.mm)} mm pelo eixo ${p.eixo}`;
    const solido = p.solido && p.solido !== 'interpenetram' ? `, sólido ${p.solido}${p.motivoDoSolido ? ` (${p.motivoDoSolido.join('; ')})` : ''}` : '';
    linhas.push(`atravessa  ${p.a} e ${p.b}: ${quanto}${solido}${p.esperado === 'atravessa' ? ` (declarada${porque(p)})` : ' (NÃO DECLARADA)'}`);
  }
  for (const p of r.folgas) linhas.push(`folga      ${p.a} e ${p.b}: ${p.mm === null ? 'as caixas se sobrepõem e os sólidos não se tocam' : `${fmt(p.mm)} mm pelo eixo ${p.eixo}`}${marca(p)}`);
  for (const d of r.assimetricas ?? []) {
    const como = (x) => `${x.tipo}${x.solido ? ` (sólido ${x.solido})` : ''}${x.mm === null || x.mm === undefined ? '' : ` a ${fmt(x.mm)} mm`}`;
    linhas.push(`ASSIMÉTRICO ${d.a} e ${d.b}: ${como(d)}; o par espelhado, ${d.espelho.a} e ${d.espelho.b}: ${como(d.espelho)}`);
  }
  if (!r.atravessam.length) linhas.push('nenhuma travessia');
  if (r.longe) linhas.push(`${r.longe} par(es) a mais de ${r.perto} mm um do outro`);
  for (const f of r.faltam) {
    /* a folga dada vem com a distância, que o par longe demais para a lista de folgas não mostra em outro lugar */
    const p = r.pares.find((q) => (q.a === f.a && q.b === f.b) || (q.a === f.b && q.b === f.a));
    const dado = f.dado === 'folga' && p?.mm !== null && p?.mm !== undefined ? `folga de ${fmt(p.mm)} mm pelo eixo ${p.eixo}` : f.dado;
    linhas.push(`ESPERADO E NÃO DADO: ${f.a} e ${f.b}, esperado ${f.esperado}, dado ${dado}${f.motivo ? ` (declarado: ${f.motivo})` : ''}`);
  }
  return linhas.map((l) => `${recuo}${l}`).join('\n');
}
