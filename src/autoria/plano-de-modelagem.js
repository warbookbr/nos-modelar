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

import { criteriosDe, FAMILIAS_DE_OBJETO } from '../../procedural/criterios/index.js';
import { normalizarLataria } from './lataria.js';
import { normalizarDobrasAceitas } from './dobras-aceitas.js';

export const FORMATO_PLANO_DE_MODELAGEM = 'mecanifica.plano-de-modelagem';
export const VERSAO_PLANO_DE_MODELAGEM = 1;

export const CAMPOS_PLANO = Object.freeze([
  'objeto', 'referencias', 'escala', 'partes', 'criteriosDeReprovacao',
]);
/* Campos que o plano pode declarar ou não. `familia` escolhe o arquivo de critérios por família de objeto (assento, veículo, móvel de
   caixa) de `procedural/criterios/`, e `familiaProcedural` é a família de `procedural/familias/` que gerou a peça, de onde o brief do
   crítico lê as `perguntas` por componente. `lataria` diz se a peça é de chapa de superfície livre e quais partes são a chapa, ou a
   dispensa com o motivo (`lataria.js`): o pacote do crítico de peça de lataria leva a luz rasante e a curvatura da lataria. Plano sem
   eles produz a mesma forma canônica de antes. `dobrasAceitas` lista a dobra, o vinco e o chanfro que a peça aceita de propósito, com o motivo
   (`dobras-aceitas.js`): as réguas de superfície não os contam e os listam como aceitos. `espessuraMinima: { mm, partes? }` declara a parede mais fina que a
   peça aceita, em milímetro, para todas as partes ou só para as listadas: sem ele o `descrever` mostra a espessura por parte só como informação, e com ele
   avisa a parte que passa abaixo. */
export const CAMPOS_OPCIONAIS_DO_PLANO = Object.freeze(['familia', 'familiaProcedural', 'lataria', 'dobrasAceitas', 'espessuraMinima']);
export const CAMPOS_ESCALA = Object.freeze(['medida', 'milimetros']);
export const CAMPOS_PARTE = Object.freeze(['nome', 'forma', 'tecnica']);
/* `dePerto` da parte: onde o pedido ao crítico mostra a feição pequena que o plano promete (raio de 6 mm, rebaixo, friso), numa vista
   de perto com a câmera mirando o ponto. A vista isolada da parte enquadra a parte inteira, e uma feição de poucos milímetros ocupa
   menos de dois pontos de imagem nela: o crítico não a vê e não pode apontá-la nem aprová-la. Até quatro entradas por parte. */
export const CAMPOS_OPCIONAIS_DA_PARTE = Object.freeze(['dePerto']);
export const CAMPOS_DE_PERTO = Object.freeze(['ponto', 'oQue']);
export const LIMITE_DE_PERTO = 4;
export const LIMITE_O_QUE_DE_PERTO = 120;
const LIMITE_DO_PONTO_MM = 100000;
const LIMITE_DA_DISTANCIA_MM = 10000;

const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i;
const CAMPO_RUNTIME = /^(uuid|indice|index|passo|timestamp|createdat|updatedat|host)$/i;
const ABSOLUTO = /^(?:[a-z]:\\|\\\\|\/|data:)/i;
const ID_DE_FAMILIA = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const NOME_DE_PARTE = /^[a-zA-Z][a-zA-Z0-9]*$/;
const LIMITE_TEXTO = 240;
const LIMITE_LISTA = 64;
/* As partes têm teto próprio desde 2026-11-07: o furgão realista, um veículo inteiro, chegou às 64 com a lataria, os vidros, as
   rodas, o plástico, as luzes e o interior simples, e o interior dos faróis e das lanternas (refletor e lâmpada) passaria disso;
   a pessoa escolheu 128 só para as partes, e as outras listas do PLANO seguem em 64. */
const LIMITE_PARTES = 128;

/* Motivo e critério têm tamanho mínimo pela mesma razão que o motivo de contato
   tem: campo livre que aceita "ok" é campo que some. */
export const MINIMO_DO_CRITERIO = 15;

function compararTexto(a, b) { return a < b ? -1 : a > b ? 1 : 0; }

function falhar(quem, mensagem) { throw new TypeError(`${quem}: ${mensagem}`); }

function texto(valor, quem, campo, minimo = 1) {
  if (typeof valor !== 'string' || valor.trim() === '') falhar(quem, `'${campo}' precisa ser texto não vazio.`);
  const limpo = valor.trim();
  if (limpo.length < minimo) falhar(quem, `'${campo}' precisa ter pelo menos ${minimo} caracteres; diga o que é.`);
  if (limpo.length > LIMITE_TEXTO) falhar(quem, `'${campo}' excede ${LIMITE_TEXTO} caracteres (tem ${limpo.length}, ${limpo.length - LIMITE_TEXTO} a mais que o limite).`);
  if (UUID.test(limpo) || ABSOLUTO.test(limpo)) {
    falhar(quem, `'${campo}' não pode conter UUID, caminho absoluto ou binário local.`);
  }
  return limpo;
}

function chavesExatas(valor, permitidas, quem, campo, opcionais = []) {
  for (const chave of Object.keys(valor)) {
    if (CAMPO_RUNTIME.test(chave) || !(permitidas.includes(chave) || opcionais.includes(chave))) {
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

function umaEntradaDePerto(valor, quem, campo) {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) falhar(quem, `'${campo}' precisa ser objeto { ponto, oQue, distancia? }.`);
  chavesExatas(valor, CAMPOS_DE_PERTO, quem, campo, ['distancia']);
  const { ponto } = valor;
  if (!Array.isArray(ponto) || ponto.length !== 3 || !ponto.every((n) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= LIMITE_DO_PONTO_MM)) {
    falhar(quem, `'${campo}.ponto' precisa ser [x, y, z], três números finitos em milímetros do referencial da peça (até ${LIMITE_DO_PONTO_MM} em módulo), para a câmera ter onde mirar.`);
  }
  const oQue = texto(valor.oQue, quem, `${campo}.oQue`, 10);
  if (oQue.length > LIMITE_O_QUE_DE_PERTO) {
    falhar(quem, `'${campo}.oQue' excede ${LIMITE_O_QUE_DE_PERTO} caracteres (tem ${oQue.length}): diga em uma frase curta o que o crítico olha naquele ponto.`);
  }
  const saida = { ponto: [...ponto], oQue };
  if (valor.distancia !== undefined) {
    if (typeof valor.distancia !== 'number' || !Number.isFinite(valor.distancia) || valor.distancia <= 0 || valor.distancia > LIMITE_DA_DISTANCIA_MM) {
      falhar(quem, `'${campo}.distancia' precisa ser número em milímetros maior que zero e até ${LIMITE_DA_DISTANCIA_MM}: é a distância da câmera ao ponto.`);
    }
    saida.distancia = valor.distancia;
  }
  return saida;
}

function umaParte(valor, quem, campo) {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) falhar(quem, `'${campo}' precisa ser objeto.`);
  chavesExatas(valor, CAMPOS_PARTE, quem, campo, CAMPOS_OPCIONAIS_DA_PARTE);
  const nome = texto(valor.nome, quem, `${campo}.nome`);
  /* O nome da parte é o mesmo endereço que a receita usa no passo `parte` e que
     a medida de contato devolve. Nome com espaço ou acento aqui e outro lá
     produziria parte "ausente" a cada conferência. */
  if (!NOME_DE_PARTE.test(nome)) {
    falhar(quem, `'${campo}.nome' precisa ser o mesmo identificador usado no passo 'parte': letras e dígitos, sem espaço.`);
  }
  let dePerto;
  if (valor.dePerto !== undefined) {
    if (!Array.isArray(valor.dePerto) || valor.dePerto.length === 0 || valor.dePerto.length > LIMITE_DE_PERTO) {
      falhar(quem, `'${campo}.dePerto' precisa ser lista de 1 a ${LIMITE_DE_PERTO} entradas { ponto, oQue, distancia? }: cada uma vira uma vista de perto da feição pequena que o plano promete; sem feição pequena, tire o campo.`);
    }
    dePerto = valor.dePerto.map((entrada, i) => umaEntradaDePerto(entrada, quem, `${campo}.dePerto[${i}]`));
  }
  return {
    nome,
    forma: texto(valor.forma, quem, `${campo}.forma`, MINIMO_DO_CRITERIO),
    tecnica: texto(valor.tecnica, quem, `${campo}.tecnica`),
    ...(dePerto ? { dePerto } : {}),
  };
}

const LIMITE_DA_ESPESSURA_MM = 1000;
function normalizarEspessuraMinima(valor, nomes, quem) {
  const campo = 'espessuraMinima';
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) falhar(quem, `'${campo}' precisa ser objeto { mm, partes? }.`);
  chavesExatas(valor, ['mm'], quem, campo, ['partes']);
  if (typeof valor.mm !== 'number' || !Number.isFinite(valor.mm) || valor.mm <= 0 || valor.mm > LIMITE_DA_ESPESSURA_MM) {
    falhar(quem, `'${campo}.mm' precisa ser número em milímetros maior que zero e até ${LIMITE_DA_ESPESSURA_MM}; veio ${JSON.stringify(valor.mm)}.`);
  }
  const saida = { mm: valor.mm };
  if (valor.partes !== undefined) {
    if (!Array.isArray(valor.partes) || valor.partes.length === 0) falhar(quem, `'${campo}.partes' precisa ser lista não vazia de nomes de 'partes' do plano.`);
    const ruim = valor.partes.find((n) => typeof n !== 'string' || !nomes.includes(n));
    if (ruim !== undefined) falhar(quem, `'${campo}.partes' cita ${JSON.stringify(ruim)}, que não está em 'partes' do plano (${nomes.join(', ')}).`);
    if (new Set(valor.partes).size !== valor.partes.length) falhar(quem, `'${campo}.partes' não pode repetir parte.`);
    saida.partes = [...valor.partes].sort(compararTexto);
  }
  return saida;
}

/**
 * Valida e canonicaliza o plano de modelagem de uma receita.
 * `undefined` e `null` significam plano ausente e retornam `null`; quem exige
 * plano é o gate, não este módulo — aqui ausência não é o mesmo que inválido.
 */
export function normalizarPlanoDeModelagem(valor, { quem = 'PLANO' } = {}) {
  if (valor === undefined || valor === null) return null;
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) falhar(quem, 'precisa ser objeto ou estar ausente.');
  chavesExatas(valor, CAMPOS_PLANO, quem, quem, CAMPOS_OPCIONAIS_DO_PLANO);
  if (valor.familia !== undefined && criteriosDe(valor.familia) === undefined) {
    falhar(quem, `'familia' precisa ser uma família de objeto com critérios (${FAMILIAS_DE_OBJETO.join(', ')}); veio ${JSON.stringify(valor.familia)}.`);
  }
  if (valor.familiaProcedural !== undefined && !(typeof valor.familiaProcedural === 'string' && ID_DE_FAMILIA.test(valor.familiaProcedural))) {
    falhar(quem, `'familiaProcedural' precisa ser o id de uma família de procedural/familias (minúsculas, hífen entre as palavras); veio ${JSON.stringify(valor.familiaProcedural)}.`);
  }

  const escala = valor.escala;
  if (!escala || typeof escala !== 'object' || Array.isArray(escala)) falhar(quem, "'escala' precisa ser objeto.");
  chavesExatas(escala, CAMPOS_ESCALA, quem, `${quem}.escala`);
  if (typeof escala.milimetros !== 'number' || !Number.isFinite(escala.milimetros) || escala.milimetros <= 0) {
    falhar(quem, "'escala.milimetros' precisa ser número finito maior que zero.");
  }

  if (!Array.isArray(valor.partes) || valor.partes.length === 0 || valor.partes.length > LIMITE_PARTES) {
    falhar(quem, `'partes' precisa ser lista não vazia com no máximo ${LIMITE_PARTES} itens.`);
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
    ...(valor.familia === undefined ? {} : { familia: valor.familia }),
    ...(valor.familiaProcedural === undefined ? {} : { familiaProcedural: valor.familiaProcedural }),
    ...(valor.lataria === undefined ? {} : { lataria: normalizarLataria(valor.lataria, nomes, { quem }) }),
    ...(valor.dobrasAceitas === undefined ? {} : { dobrasAceitas: normalizarDobrasAceitas(valor.dobrasAceitas, nomes, { quem }) }),
    ...(valor.espessuraMinima === undefined ? {} : { espessuraMinima: normalizarEspessuraMinima(valor.espessuraMinima, nomes, quem) }),
  };
}

/**
 * Onde procurar uma referência declarada. Duas formas valem, e a ordem importa:
 * primeiro relativa à PASTA DA PEÇA, que é onde a referência deve morar, e
 * depois relativa à raiz do repositório, que é a forma antiga e continua aceita
 * enquanto houver peça fora de pasta. Quem resolve de fato é quem tem disco;
 * aqui só se diz quais caminhos são legítimos, para que a regra exista num
 * lugar só e não seja reescrita por cada comando.
 */
/** A referência declarada em `referencias/locais/`: imagem de estudo que mora só na máquina de quem a trouxe (a pasta é ignorada pelo git).
 *  Quando falta, as ferramentas avisam e seguem; fora dessa pasta, a falta reprova. */
export function ehReferenciaLocal(referencia) {
  return /(^|\/)referencias\/locais\//.test(String(referencia ?? '').trim().replaceAll('\\', '/'));
}

export function caminhosDaReferencia(referencia, pastaDaPeca) {
  const limpo = String(referencia ?? '').trim();
  if (limpo === '') return [];
  const candidatos = [];
  if (pastaDaPeca) candidatos.push(`${pastaDaPeca.replace(/\/$/, '')}/${limpo}`);
  candidatos.push(limpo);
  return [...new Set(candidatos)];
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
