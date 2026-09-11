/* plano-de-modelagem.js — o que a peça PROMETE ser, escrito antes da geometria.
 *
 * A intenção da peça, em `INTENCAO`, diz função, família e critérios em termos
 * gerais. O plano de modelagem diz o resto: que partes existem, como cada uma
 * se chama, que forma cada uma tem e por qual técnica, de que imagem ela foi
 * tirada e qual medida dá a escala, e o que faz um revisor reprovar ESTE
 * objeto. É o contrato que o modelador recebe antes de escrever passo nenhum, e
 * é dele que sai tanto a medida automática quanto o material do revisor.
 *
 * POR QUE É CONTRATO E NÃO ROTEIRO. Numa bicicleta anterior o pneu saiu maciço:
 * aro, cubo e raios nunca chegaram a ser modelados, e como não havia segunda
 * parte para acusar contato, a peça passou limpa. Parte prometida e não
 * entregue é invisível para toda medida que só olha o que existe. Escrever a
 * lista ANTES transforma a ausência em algo mensurável.
 *
 * O QUE ELE NÃO CARREGA. Os contatos continuam em `contatos` da receita, onde
 * `contatos-da-peca` já os lê e cobra. Duas listas de contato em dois lugares
 * dariam duas verdades, e a que não fosse medida viraria ficção.
 *
 * A DISCIPLINA É A MESMA DA INTENÇÃO: só texto declarativo, chave desconhecida
 * recusada, listas ordenadas por ponto de código para que a mesma declaração
 * produza a mesma entrada e o mesmo diff. Índice, UUID, caminho absoluto e
 * campo de runtime não entram, porque plano é o que a peça pretende ser e não
 * um retrato de execução. */

export const FORMATO_PLANO_DE_MODELAGEM = 'mecanifica.plano-de-modelagem';
export const VERSAO_PLANO_DE_MODELAGEM = 1;

export const CAMPOS_PLANO = Object.freeze([
  'objeto', 'referencias', 'escala', 'partes', 'criteriosDeReprovacao',
]);
export const CAMPOS_ESCALA = Object.freeze(['medida', 'milimetros']);
export const CAMPOS_PARTE = Object.freeze(['nome', 'forma', 'tecnica']);

const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i;
const CAMPO_RUNTIME = /^(uuid|indice|index|passo|timestamp|createdat|updatedat|host)$/i;
const ABSOLUTO = /^(?:[a-z]:\\|\\\\|\/|data:)/i;
const NOME_DE_PARTE = /^[a-zA-Z][a-zA-Z0-9]*$/;
const LIMITE_TEXTO = 240;
const LIMITE_LISTA = 64;

/* Motivo e critério têm tamanho mínimo pela mesma razão que o motivo de contato
   tem: campo livre que aceita "ok" é campo que some. */
export const MINIMO_DO_CRITERIO = 15;

function compararTexto(a, b) { return a < b ? -1 : a > b ? 1 : 0; }

function falhar(quem, mensagem) { throw new TypeError(`${quem}: ${mensagem}`); }

function texto(valor, quem, campo, minimo = 1) {
  if (typeof valor !== 'string' || valor.trim() === '') falhar(quem, `'${campo}' precisa ser texto não vazio.`);
  const limpo = valor.trim();
  if (limpo.length < minimo) falhar(quem, `'${campo}' precisa ter pelo menos ${minimo} caracteres; diga o que é.`);
  if (limpo.length > LIMITE_TEXTO) falhar(quem, `'${campo}' excede ${LIMITE_TEXTO} caracteres.`);
  if (UUID.test(limpo) || ABSOLUTO.test(limpo)) {
    falhar(quem, `'${campo}' não pode conter UUID, caminho absoluto ou binário local.`);
  }
  return limpo;
}

function chavesExatas(valor, permitidas, quem, campo) {
  for (const chave of Object.keys(valor)) {
    if (CAMPO_RUNTIME.test(chave) || !permitidas.includes(chave)) {
      falhar(quem, `'${campo}.${chave}' não é permitido no plano de modelagem.`);
    }
  }
  const ausentes = permitidas.filter((chave) => !Object.hasOwn(valor, chave));
  if (ausentes.length) falhar(quem, `'${campo}' precisa declarar: ${ausentes.join(', ')}.`);
}

function listaDeTextos(valor, quem, campo, minimo = 1) {
  if (!Array.isArray(valor) || valor.length === 0 || valor.length > LIMITE_LISTA) {
    falhar(quem, `'${campo}' precisa ser lista não vazia com no máximo ${LIMITE_LISTA} itens.`);
  }
  const itens = valor.map((item, i) => texto(item, quem, `${campo}[${i}]`, minimo)).sort(compararTexto);
  if (new Set(itens).size !== itens.length) falhar(quem, `'${campo}' não pode repetir itens.`);
  return itens;
}

function umaParte(valor, quem, campo) {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) falhar(quem, `'${campo}' precisa ser objeto.`);
  chavesExatas(valor, CAMPOS_PARTE, quem, campo);
  const nome = texto(valor.nome, quem, `${campo}.nome`);
  /* O nome da parte é o mesmo endereço que a receita usa no passo `parte` e que
     a medida de contato devolve. Nome com espaço ou acento aqui e outro lá
     produziria parte "ausente" a cada conferência. */
  if (!NOME_DE_PARTE.test(nome)) {
    falhar(quem, `'${campo}.nome' precisa ser o mesmo identificador usado no passo 'parte': letras e dígitos, sem espaço.`);
  }
  return {
    nome,
    forma: texto(valor.forma, quem, `${campo}.forma`, MINIMO_DO_CRITERIO),
    tecnica: texto(valor.tecnica, quem, `${campo}.tecnica`),
  };
}

/**
 * Valida e canonicaliza o plano de modelagem de uma receita.
 * `undefined` e `null` significam plano ausente e retornam `null`; quem exige
 * plano é o gate, não este módulo — aqui ausência não é o mesmo que inválido.
 */
export function normalizarPlanoDeModelagem(valor, { quem = 'PLANO' } = {}) {
  if (valor === undefined || valor === null) return null;
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) falhar(quem, 'precisa ser objeto ou estar ausente.');
  chavesExatas(valor, CAMPOS_PLANO, quem, quem);

  const escala = valor.escala;
  if (!escala || typeof escala !== 'object' || Array.isArray(escala)) falhar(quem, "'escala' precisa ser objeto.");
  chavesExatas(escala, CAMPOS_ESCALA, quem, `${quem}.escala`);
  if (typeof escala.milimetros !== 'number' || !Number.isFinite(escala.milimetros) || escala.milimetros <= 0) {
    falhar(quem, "'escala.milimetros' precisa ser número finito maior que zero.");
  }

  if (!Array.isArray(valor.partes) || valor.partes.length === 0 || valor.partes.length > LIMITE_LISTA) {
    falhar(quem, `'partes' precisa ser lista não vazia com no máximo ${LIMITE_LISTA} itens.`);
  }
  const partes = valor.partes
    .map((parte, i) => umaParte(parte, quem, `partes[${i}]`))
    .sort((a, b) => compararTexto(a.nome, b.nome));
  const nomes = partes.map((p) => p.nome);
  if (new Set(nomes).size !== nomes.length) falhar(quem, "'partes' não pode repetir nome.");

  return {
    formato: FORMATO_PLANO_DE_MODELAGEM,
    versao: VERSAO_PLANO_DE_MODELAGEM,
    objeto: texto(valor.objeto, quem, 'objeto', MINIMO_DO_CRITERIO),
    referencias: listaDeTextos(valor.referencias, quem, 'referencias'),
    escala: { medida: texto(escala.medida, quem, 'escala.medida'), milimetros: escala.milimetros },
    partes,
    criteriosDeReprovacao: listaDeTextos(valor.criteriosDeReprovacao, quem, 'criteriosDeReprovacao', MINIMO_DO_CRITERIO),
  };
}

/** As partes prometidas que a peça executada não entregou, e as que ela entregou
 *  sem ter prometido. Vazio dos dois lados é a única forma de cumprir o plano. */
export function conferirPartesContraPlano(plano, nomesEntregues) {
  if (!plano) return { faltando: [], naoPrometidas: [], prometidas: [] };
  const entregues = new Set(nomesEntregues ?? []);
  const prometidas = plano.partes.map((p) => p.nome);
  return {
    prometidas,
    faltando: prometidas.filter((nome) => !entregues.has(nome)).sort(compararTexto),
    naoPrometidas: [...entregues].filter((nome) => !prometidas.includes(nome)).sort(compararTexto),
  };
}
