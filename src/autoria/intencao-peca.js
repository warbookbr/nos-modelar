/* intencao-peca.js — contrato opcional, semântico e neutro de uma receita.
 *
 * A intenção é orientação para outra IA, não metadado de produto nem parte da
 * malha. Por isso ela só aceita texto declarativo e eixos locais nomeados;
 * índices, UUIDs, caminhos e valores de runtime são recusados antes da receita
 * chegar ao núcleo. O objeto devolvido tem uma forma única, independente da
 * ordem de inserção da entrada.
 */

export const FORMATO_INTENCAO_PECA = 'mecanifica.intencao-peca';
export const VERSAO_INTENCAO_PECA = 1;
export const CAMPOS_INTENCAO_PECA = Object.freeze([
  'funcao', 'familia', 'eixosLocais', 'invariantes', 'criteriosVisuais',
]);
export const EIXOS_LOCAIS = Object.freeze(['x', 'y', 'z']);

const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i;
const CAMPO_RUNTIME = /^(uuid|indice|index|passo|timestamp|createdat|updatedat|host)$/i;
const LIMITE_TEXTO = 240;
const LIMITE_LISTA = 32;

function compararTexto(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function falhar(quem, mensagem) {
  throw new TypeError(`${quem}: ${mensagem}`);
}

function texto(valor, quem, campo) {
  if (typeof valor !== 'string' || valor.trim() === '') falhar(quem, `'${campo}' precisa ser texto não vazio.`);
  const resultado = valor.trim();
  if (resultado.length > LIMITE_TEXTO) falhar(quem, `'${campo}' excede ${LIMITE_TEXTO} caracteres.`);
  if (UUID.test(resultado) || /^(?:[a-z]:\\|\\\\|\/|data:)/i.test(resultado)) {
    falhar(quem, `'${campo}' não pode conter UUID, caminho ou binário local.`);
  }
  return resultado;
}

function chavesExatas(valor, permitidas, quem, campo) {
  for (const chave of Object.keys(valor)) {
    if (CAMPO_RUNTIME.test(chave) || !permitidas.includes(chave)) {
      falhar(quem, `'${campo}.${chave}' não é permitido no contrato de intenção.`);
    }
  }
}

function lista(valor, quem, campo) {
  if (!Array.isArray(valor) || valor.length > LIMITE_LISTA) {
    falhar(quem, `'${campo}' precisa ser lista com no máximo ${LIMITE_LISTA} itens.`);
  }
  const itens = valor.map((item, i) => texto(item, quem, `${campo}[${i}]`)).sort(compararTexto);
  if (new Set(itens).size !== itens.length) falhar(quem, `'${campo}' não pode repetir itens.`);
  return itens;
}

/**
 * Valida e canonicaliza a intenção opcional de uma receita.
 * `undefined` e `null` significam intenção ausente e retornam `null`.
 */
export function normalizarIntencaoPeca(valor, { quem = 'INTENCAO' } = {}) {
  if (valor === undefined || valor === null) return null;
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
    falhar(quem, 'precisa ser objeto ou estar ausente.');
  }
  chavesExatas(valor, CAMPOS_INTENCAO_PECA, quem, quem);
  const ausentes = CAMPOS_INTENCAO_PECA.filter((campo) => !Object.hasOwn(valor, campo));
  if (ausentes.length) falhar(quem, `precisa declarar: ${ausentes.join(', ')}.`);
  const eixos = valor.eixosLocais;
  if (!eixos || typeof eixos !== 'object' || Array.isArray(eixos)) falhar(quem, "'eixosLocais' precisa ser objeto.");
  chavesExatas(eixos, EIXOS_LOCAIS, quem, `${quem}.eixosLocais`);
  const eixosAusentes = EIXOS_LOCAIS.filter((eixo) => !Object.hasOwn(eixos, eixo));
  if (eixosAusentes.length) falhar(quem, `eixosLocais precisa declarar: ${eixosAusentes.join(', ')}.`);
  return {
    funcao: texto(valor.funcao, quem, 'funcao'),
    familia: texto(valor.familia, quem, 'familia'),
    eixosLocais: Object.fromEntries(EIXOS_LOCAIS.map((eixo) => [eixo, texto(eixos[eixo], quem, `eixosLocais.${eixo}`)])),
    invariantes: lista(valor.invariantes, quem, 'invariantes'),
    criteriosVisuais: lista(valor.criteriosVisuais, quem, 'criteriosVisuais'),
  };
}

/** Diff por significado, sem índice de array ou identidade de runtime. */
export function compararIntencoes(intencaoAnterior, intencaoAtual) {
  const anterior = normalizarIntencaoPeca(intencaoAnterior, { quem: 'compararIntencoes.anterior' });
  const atual = normalizarIntencaoPeca(intencaoAtual, { quem: 'compararIntencoes.atual' });
  const campos = ['funcao', 'familia'].flatMap((campo) => (
    anterior?.[campo] !== atual?.[campo]
      ? [{ campo, anterior: anterior?.[campo] ?? null, atual: atual?.[campo] ?? null }]
      : []
  ));
  const eixosAlterados = EIXOS_LOCAIS
    .filter((eixo) => anterior?.eixosLocais?.[eixo] !== atual?.eixosLocais?.[eixo])
    .map((eixo) => ({ eixo, anterior: anterior?.eixosLocais?.[eixo] ?? null, atual: atual?.eixosLocais?.[eixo] ?? null }));
  const diffLista = (campo) => {
    const a = new Set(anterior?.[campo] ?? []);
    const b = new Set(atual?.[campo] ?? []);
    return {
      adicionadas: [...b].filter((item) => !a.has(item)).sort(compararTexto),
      removidas: [...a].filter((item) => !b.has(item)).sort(compararTexto),
    };
  };
  const invariantes = diffLista('invariantes');
  const criteriosVisuais = diffLista('criteriosVisuais');
  const mudou = Boolean(campos.length || eixosAlterados.length
    || invariantes.adicionadas.length || invariantes.removidas.length
    || criteriosVisuais.adicionadas.length || criteriosVisuais.removidas.length);
  return { mudou, campos, eixosLocais: { alterados: eixosAlterados }, invariantes, criteriosVisuais };
}
