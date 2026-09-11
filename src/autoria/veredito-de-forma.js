/* veredito-de-forma.js — a saída do revisor, em vocabulário fechado.
 *
 * O DEFEITO QUE ISTO EXISTE PARA IMPEDIR. Um revisor disse, em prosa, que um
 * trecho "precisava ir para a frente". O erro era de inclinação, e quem corrigiu
 * transladou em vez de girar: a peça saiu torta de outro jeito e a rodada foi
 * perdida. A prosa deixou a tradução de defeito para operação na mão de quem
 * modela, que é justamente quem não pode decidir isso sozinho.
 *
 * Por isso `angulo` e `posicao` são tipos DIFERENTES e nenhum sentido serve aos
 * dois: quem aponta é obrigado a escolher, e quem corrige recebe a escolha já
 * feita. O vocabulário é fechado de propósito. Quando um defeito não couber em
 * nenhum tipo, a saída não é abrir um campo livre — é registrar o caso e
 * acrescentar um tipo nomeado, porque campo livre volta a ser prosa.
 *
 * ESTE MÓDULO NÃO JULGA. Ele só recusa veredito malformado. Quem olha é o
 * revisor; quem decide parar é quem orquestra; e ninguém dos dois é quem
 * modelou. */

export const FORMATO_VEREDITO = 'mecanifica.veredito-de-forma';
export const VERSAO_VEREDITO = 1;

/** O que pode estar errado. Fechado: ver o cabeçalho. */
export const TIPOS_DE_DEFEITO = Object.freeze({
  angulo: ['maior', 'menor'],
  comprimento: ['maior', 'menor'],
  posicao: ['adiantada', 'atrasada', 'alta', 'baixa'],
  espessura: ['maior', 'menor'],
  ausencia: ['faltando'],
  uniao: ['afastado', 'atravessando'],
});

export const CAMPOS_DEFEITO = Object.freeze(['parte', 'tipo', 'onde', 'sentido', 'evidencia']);
export const CAMPOS_VEREDITO = Object.freeze(['alvo', 'nota', 'defeitos', 'observacao']);

const NOME_DE_PARTE = /^[a-zA-Z][a-zA-Z0-9]*$/;
const LIMITE_TEXTO = 240;
const LIMITE_DEFEITOS = 32;
/* A evidência é onde o revisor viu, e tem tamanho mínimo pela mesma razão que o
   motivo de contato tem: campo que aceita "ok" é campo que some. */
export const MINIMO_DA_EVIDENCIA = 15;

function falhar(quem, mensagem) { throw new TypeError(`${quem}: ${mensagem}`); }

function texto(valor, quem, campo, minimo = 1) {
  if (typeof valor !== 'string' || valor.trim() === '') falhar(quem, `'${campo}' precisa ser texto não vazio.`);
  const limpo = valor.trim();
  if (limpo.length < minimo) falhar(quem, `'${campo}' precisa ter pelo menos ${minimo} caracteres; diga onde você viu.`);
  if (limpo.length > LIMITE_TEXTO) falhar(quem, `'${campo}' excede ${LIMITE_TEXTO} caracteres.`);
  return limpo;
}

function chavesExatas(valor, permitidas, quem, campo) {
  for (const chave of Object.keys(valor)) {
    if (!permitidas.includes(chave)) falhar(quem, `'${campo}.${chave}' não é permitido no veredito.`);
  }
  const ausentes = permitidas.filter((chave) => !Object.hasOwn(valor, chave));
  if (ausentes.length) falhar(quem, `'${campo}' precisa declarar: ${ausentes.join(', ')}.`);
}

function umDefeito(valor, quem, campo, partesConhecidas) {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
    falhar(quem, `'${campo}' precisa ser objeto; veredito em prosa não é veredito.`);
  }
  chavesExatas(valor, CAMPOS_DEFEITO, quem, campo);

  const parte = texto(valor.parte, quem, `${campo}.parte`);
  if (!NOME_DE_PARTE.test(parte)) {
    falhar(quem, `'${campo}.parte' precisa ser o nome da parte como a peça a chama, sem espaço.`);
  }
  if (partesConhecidas && !partesConhecidas.has(parte)) {
    falhar(quem, `'${campo}.parte' aponta '${parte}', que o plano não promete nem a peça entrega.`);
  }

  const tipo = texto(valor.tipo, quem, `${campo}.tipo`);
  if (!Object.hasOwn(TIPOS_DE_DEFEITO, tipo)) {
    falhar(quem, `'${campo}.tipo' precisa ser um de: ${Object.keys(TIPOS_DE_DEFEITO).join(', ')}.`);
  }
  const sentidos = TIPOS_DE_DEFEITO[tipo];
  const sentido = texto(valor.sentido, quem, `${campo}.sentido`);
  if (!sentidos.includes(sentido)) {
    falhar(quem, `'${campo}.sentido' para tipo '${tipo}' precisa ser um de: ${sentidos.join(', ')}.`);
  }

  return {
    parte,
    tipo,
    /* A âncora é a extremidade ou o trecho, e não o corpo: peça com medida certa
       e extremidade no lugar errado produz a mesma imagem confusa que peça com
       medida errada, e a diferença entre as duas é o que diz como corrigir. */
    onde: texto(valor.onde, quem, `${campo}.onde`),
    sentido,
    evidencia: texto(valor.evidencia, quem, `${campo}.evidencia`, MINIMO_DA_EVIDENCIA),
  };
}

function compararDefeitos(a, b) {
  return a.parte.localeCompare(b.parte) || a.tipo.localeCompare(b.tipo) || a.onde.localeCompare(b.onde);
}

/**
 * Valida e canonicaliza o veredito de uma rodada. `partesConhecidas`, quando
 * fornecida, recusa defeito apontado em parte que não existe — revisor que
 * inventa nome de parte produz correção impossível.
 */
export function normalizarVeredito(valor, { quem = 'veredito', partesConhecidas = null } = {}) {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
    falhar(quem, 'precisa ser objeto; texto corrido não é veredito.');
  }
  chavesExatas(valor, CAMPOS_VEREDITO, quem, quem);

  const nota = valor.nota;
  if (typeof nota !== 'number' || !Number.isFinite(nota) || nota < 0 || nota > 10) {
    falhar(quem, "'nota' precisa ser número de 0 a 10.");
  }
  if (!Array.isArray(valor.defeitos) || valor.defeitos.length > LIMITE_DEFEITOS) {
    falhar(quem, `'defeitos' precisa ser lista com no máximo ${LIMITE_DEFEITOS} itens.`);
  }
  const conhecidas = partesConhecidas ? new Set(partesConhecidas) : null;
  const defeitos = valor.defeitos
    .map((defeito, i) => umDefeito(defeito, quem, `defeitos[${i}]`, conhecidas))
    .sort(compararDefeitos);

  return {
    formato: FORMATO_VEREDITO,
    versao: VERSAO_VEREDITO,
    alvo: texto(valor.alvo, quem, 'alvo'),
    nota,
    defeitos,
    observacao: texto(valor.observacao, quem, 'observacao', MINIMO_DA_EVIDENCIA),
  };
}

/**
 * O laço continua enquanto houver defeito apontado. Lista vazia não é
 * aprovação: é ausência de achado nesta rodada, e quem decide parar é quem
 * orquestra, com a nota e as medidas na mão.
 */
export function rodadaFechou(veredito, { notaMinima = 8 } = {}) {
  const v = veredito?.formato === FORMATO_VEREDITO ? veredito : normalizarVeredito(veredito);
  return { fechou: v.defeitos.length === 0 && v.nota >= notaMinima, nota: v.nota, defeitos: v.defeitos.length };
}
