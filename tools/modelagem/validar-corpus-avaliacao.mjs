/* Contrato local do corpus P0; não chama modelo nem infere qualidade visual. */
const FORMATO = 'mecanifica.corpus-avaliacao-p0@1';
const SHA = /^sha256:[a-f0-9]{64}$/;
const TIPOS = new Set(['decisivo', 'empate', 'indeterminado']);
const RESPOSTAS = new Set(['A', 'B', 'empate', 'indeterminado']);
const iguais = (a, b) => Array.isArray(a) && a.length === b.length && a.every((valor, indice) => valor === b[indice]);
function falhar(mensagem) { throw new Error(`corpus-avaliacao-p0: ${mensagem}`); }
function objeto(valor, onde) { if (!valor || typeof valor !== 'object' || Array.isArray(valor)) falhar(`${onde} precisa ser objeto.`); return valor; }
function texto(valor, onde) { if (typeof valor !== 'string' || !valor.trim()) falhar(`${onde} precisa ser texto.`); return valor; }

function validarItem(item) {
  objeto(item, 'item');
  for (const chave of ['id', 'split', 'objeto', 'tipo', 'respostaConhecida', 'severidade', 'vista', 'pergunta', 'evidencias', 'apresentacoes']) {
    if (!(chave in item)) falhar(`item sem ${chave}.`);
  }
  texto(item.id, 'item.id'); texto(item.objeto, 'item.objeto'); texto(item.vista, 'item.vista'); texto(item.pergunta, 'item.pergunta');
  if (!['calibracao', 'holdout'].includes(item.split)) falhar('split inválido.');
  if (!TIPOS.has(item.tipo) || !RESPOSTAS.has(item.respostaConhecida)) falhar('tipo ou resposta conhecida inválidos.');
  if (!Array.isArray(item.evidencias) || item.evidencias.length !== 2) falhar('item precisa de duas evidências A/B.');
  const papeis = item.evidencias.map((evidencia) => {
    objeto(evidencia, 'evidencia');
    if (!['A', 'B'].includes(evidencia.papel) || typeof evidencia.arquivo !== 'string' || !SHA.test(evidencia.sha256)) falhar('evidência sem papel, arquivo ou hash válido.');
    return evidencia.papel;
  }).sort();
  if (!iguais(papeis, ['A', 'B'])) falhar('evidências precisam conter A e B uma vez.');
  if (!Array.isArray(item.apresentacoes) || item.apresentacoes.length !== 4) falhar('item precisa de quatro apresentações.');
  const ordens = item.apresentacoes.map(({ ordem }) => ordem);
  if (ordens.filter((ordem) => iguais(ordem, ['A', 'B'])).length !== 2 || ordens.filter((ordem) => iguais(ordem, ['B', 'A'])).length !== 2) falhar('A/B precisa aparecer duas vezes em cada ordem.');
}

export function validarCorpusAvaliacaoP0(manifesto) {
  objeto(manifesto, 'manifesto');
  if (manifesto.formato !== FORMATO) falhar('formato inválido.');
  if (manifesto.estado === 'pendente-de-coleta') {
    if (!Array.isArray(manifesto.itens) || manifesto.itens.length || !Array.isArray(manifesto.lacunas) || !manifesto.lacunas.length) falhar('manifesto pendente precisa declarar lacunas e nenhum item.');
    return Object.freeze({ estado: manifesto.estado, prontoParaCritico: false, lacunas: [...manifesto.lacunas] });
  }
  if (manifesto.estado !== 'congelado' || !Array.isArray(manifesto.itens)) falhar('estado inválido.');
  const ids = new Set(); const porObjeto = new Map();
  for (const item of manifesto.itens) {
    validarItem(item);
    if (ids.has(item.id)) falhar('id de item repetido.'); ids.add(item.id);
    const splits = porObjeto.get(item.objeto) ?? new Set(); splits.add(item.split); porObjeto.set(item.objeto, splits);
  }
  if (!manifesto.itens.some(({ split }) => split === 'calibracao')) falhar('corpus precisa conter itens de calibracao.');
  if ([...porObjeto.values()].some((splits) => splits.size > 1)) falhar('objeto não pode vazar entre calibracao e holdout.');
  const holdout = manifesto.itens.filter(({ split }) => split === 'holdout');
  if (holdout.length < 80) falhar('holdout precisa de ao menos 80 itens.');
  const objetosHoldout = new Map();
  for (const item of holdout) objetosHoldout.set(item.objeto, (objetosHoldout.get(item.objeto) ?? 0) + 1);
  if (objetosHoldout.size < 20 || [...objetosHoldout.values()].some((quantidade) => quantidade > 4)) falhar('holdout exige 20 objetos e no máximo quatro itens por objeto.');
  const contar = (tipo) => holdout.filter((item) => item.tipo === tipo).length;
  const grosseiros = holdout.filter((item) => item.tipo === 'decisivo' && item.severidade === 'grosseiro').length;
  if (contar('decisivo') < 40 || grosseiros < 20 || contar('empate') < 20 || contar('indeterminado') < 20) falhar('holdout sem balanço mínimo de decisivos, grosseiros, empates e indeterminados.');
  return Object.freeze({ estado: manifesto.estado, prontoParaCritico: true, itensHoldout: holdout.length, objetosHoldout: objetosHoldout.size, defeitosGrosseiros: grosseiros });
}
