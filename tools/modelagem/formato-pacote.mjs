/* formato-pacote.mjs — contrato pequeno, estrito e canônico do pacote de
   modelagem assistida. Não conhece Three.js, domínio automotivo ou runtime de
   navegador: só o arquivo procedural, o núcleo neutro e a régua de partes. */
import {
  existsSync, lstatSync, readFileSync, readdirSync, realpathSync, statSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
export const RAIZ_REPOSITORIO = resolve(AQUI, '../..');
export const RAIZ_GUIAS = join(RAIZ_REPOSITORIO, 'autoria-assistida/guias');
export const RAIZ_PACOTES = join(RAIZ_REPOSITORIO, 'autoria-assistida/pacotes');
export const REVISOES = 'revisoes';
export const LIMITE_PACOTE_BYTES = 24 * 1024;
export const LIMITE_REFERENCIAS = 4;
export const LIMITE_GUIAS = 4;
export const LIMITE_CHECKLIST = 8;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const REVISAO_SLUG = /^r[0-9]+$/;
/* fixtures de prova herdadas começam por `_`; o sublinhado é nome, não índice. */
const NOME_SEMANTICO = /^[A-Za-z_][A-Za-z0-9_-]*$/;
const SHA256 = /^sha256:[a-f0-9]{64}$/;
const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i;
const INDICE_POSICIONAL = /\b(?:face|corpo|passo|[íi]ndice|index)\s*(?:#|:|=)?\s*\d+\b/i;
const TIMESTAMP = /\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?\b/;
const BASE64 = /(?:base64,|\b[A-Za-z0-9+/]{96,}={0,2}\b)/i;
const TEMP = /(?:^|[\\/])(?:AppData[\\/]Local[\\/]Temp|Temp)(?:[\\/]|$)/i;

export class ErroDePacote extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = 'ErroDePacote';
  }
}

function falhar(mensagem) { throw new ErroDePacote(mensagem); }
function objeto(valor) {
  return Boolean(valor) && typeof valor === 'object' && !Array.isArray(valor);
}
function lista(valor, onde) {
  if (!Array.isArray(valor)) falhar(`${onde} precisa ser uma lista.`);
  return valor;
}
function texto(valor, onde) {
  if (typeof valor !== 'string' || valor.trim() === '') falhar(`${onde} precisa ser texto não vazio.`);
  return valor;
}
function chavesExatas(valor, esperadas, onde) {
  if (!objeto(valor)) falhar(`${onde} precisa ser objeto.`);
  const recebidas = Object.keys(valor).sort();
  const permitidas = [...esperadas].sort();
  const desconhecidas = recebidas.filter((chave) => !permitidas.includes(chave));
  const ausentes = permitidas.filter((chave) => !recebidas.includes(chave));
  if (desconhecidas.length || ausentes.length) {
    falhar(`${onde} tem chaves inválidas; ausentes: ${ausentes.join(', ') || '(nenhuma)'}; `
      + `desconhecidas: ${desconhecidas.join(', ') || '(nenhuma)'}.`);
  }
}
function textoSeguro(valor, onde) {
  const recebido = texto(valor, onde);
  if (UUID.test(recebido)) falhar(`${onde} não aceita UUID.`);
  if (INDICE_POSICIONAL.test(recebido)) falhar(`${onde} não aceita identidade posicional.`);
  if (TIMESTAMP.test(recebido)) falhar(`${onde} não aceita timestamp.`);
  if (/^\s*data:/i.test(recebido)) falhar(`${onde} não aceita data URI.`);
  if (BASE64.test(recebido)) falhar(`${onde} não aceita base64.`);
  if (TEMP.test(recebido)) falhar(`${onde} não aceita caminho de Temp.`);
  if (/(?:^|[\s"'(])(?:[A-Za-z]:[\\/]|\\\\|file:\/\/|\/)/.test(recebido)) {
    falhar(`${onde} não aceita caminho absoluto.`);
  }
  return recebido;
}
function slug(valor, onde) {
  const recebido = textoSeguro(valor, onde);
  if (!SLUG.test(recebido)) falhar(`${onde} precisa ser slug minúsculo estável, recebi ${JSON.stringify(recebido)}.`);
  return recebido;
}
function nomeSemantico(valor, onde) {
  const recebido = textoSeguro(valor, onde);
  if (!NOME_SEMANTICO.test(recebido) || /^\d+$/.test(recebido)) {
    falhar(`${onde} precisa ser nome semântico, não índice, recebi ${JSON.stringify(recebido)}.`);
  }
  return recebido;
}
function unicos(valores, onde) {
  if (new Set(valores).size !== valores.length) falhar(`${onde} tem valores repetidos.`);
}
function caminhoRelativo(valor, onde) {
  const recebido = textoSeguro(valor, onde);
  if (recebido.includes('\\') || recebido.startsWith('/') || isAbsolute(recebido)
    || recebido.split('/').includes('..') || !/^[A-Za-z0-9._/-]+$/.test(recebido)) {
    falhar(`${onde} precisa ser caminho relativo canônico dentro do repositório.`);
  }
  return recebido;
}

/** Ordena somente mapas; listas mantêm ordem porque prioridade é significado. */
export function canonizar(valor) {
  if (Array.isArray(valor)) return valor.map(canonizar);
  if (objeto(valor)) {
    const saida = {};
    for (const chave of Object.keys(valor).sort()) saida[chave] = canonizar(valor[chave]);
    return saida;
  }
  if (valor === null || typeof valor === 'string' || typeof valor === 'boolean') return valor;
  if (typeof valor === 'number' && Number.isFinite(valor)) return Object.is(valor, -0) ? 0 : valor;
  falhar(`valor não serializável no pacote: ${String(valor)}.`);
}

export function serializarCanonico(valor) {
  return `${JSON.stringify(canonizar(valor), null, 2)}\n`;
}

function validarGuias(guias, { raizGuias = RAIZ_GUIAS } = {}) {
  lista(guias, 'briefing.guias');
  if (guias.length < 1 || guias.length > LIMITE_GUIAS) {
    falhar(`briefing.guias precisa ter entre 1 e ${LIMITE_GUIAS} guias.`);
  }
  const normalizados = guias.map((guia, indice) => {
    const id = textoSeguro(guia, `briefing.guias[${indice}]`);
    if (!/^(forma|material|processo)\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
      falhar(`briefing.guias[${indice}] precisa apontar para forma/, material/ ou processo/ por slug.`);
    }
    const arquivo = join(raizGuias, `${id}.md`);
    if (!existsSync(arquivo)) falhar(`guia '${id}' não existe em autoria-assistida/guias/.`);
    return id;
  });
  unicos(normalizados, 'briefing.guias');
  return normalizados;
}

function validarChecklist(checklist) {
  lista(checklist, 'briefing.checklist');
  if (checklist.length < 1 || checklist.length > LIMITE_CHECKLIST) {
    falhar(`briefing.checklist precisa ter entre 1 e ${LIMITE_CHECKLIST} itens.`);
  }
  const ids = [];
  const estados = new Set(['aberto', 'atendido', 'divergente', 'bloqueado_capacidade', 'adiado', 'obsoleto']);
  checklist.forEach((item, indice) => {
    chavesExatas(item, ['criterio', 'estado', 'id', 'prioridade'], `briefing.checklist[${indice}]`);
    ids.push(slug(item.id, `briefing.checklist[${indice}].id`));
    if (!Number.isInteger(item.prioridade) || item.prioridade !== indice + 1) {
      falhar(`briefing.checklist[${indice}].prioridade precisa ser ${indice + 1}; a ordem é parte do contrato.`);
    }
    if (!estados.has(item.estado)) falhar(`briefing.checklist[${indice}].estado é inválido.`);
    textoSeguro(item.criterio, `briefing.checklist[${indice}].criterio`);
  });
  unicos(ids, 'briefing.checklist');
}

/* Os cinco eixos de PERFIS-DE-AUTORIA.md são metadado do pacote, não um nome
   comprimido. O autor pode trocar a origem para `declarado`; o preparador marca
   explicitamente quando aplicou o padrão canônico por falta de informação. */
function validarPerfil(perfil) {
  chavesExatas(perfil, [
    'distanciaMinima', 'fidelidade', 'interacao', 'orcamento', 'origem', 'precisao', 'visual',
  ], 'briefing.perfil');
  if (!['esquematico', 'lowpolyIntencional', 'tecnicoDidatico', 'realistaApresentacao'].includes(perfil.visual)) {
    falhar('briefing.perfil.visual precisa ser esquematico, lowpolyIntencional, tecnicoDidatico ou realistaApresentacao.');
  }
  if (!['F0', 'F1', 'F2', 'F3'].includes(perfil.fidelidade)) {
    falhar('briefing.perfil.fidelidade precisa estar entre F0 e F3.');
  }
  if (!['ilustrativa', 'dimensional', 'mecanica'].includes(perfil.precisao)) {
    falhar('briefing.perfil.precisao precisa ser ilustrativa, dimensional ou mecanica.');
  }
  if (!['contexto', 'selecao', 'montagem', 'animacao'].includes(perfil.interacao)) {
    falhar('briefing.perfil.interacao precisa ser contexto, selecao, montagem ou animacao.');
  }
  if (!Number.isFinite(perfil.distanciaMinima) || perfil.distanciaMinima < 0) {
    falhar('briefing.perfil.distanciaMinima precisa ser número finito >= 0.');
  }
  if (!['declarado', 'suposicao-canonica'].includes(perfil.origem)) {
    falhar('briefing.perfil.origem precisa ser declarado ou suposicao-canonica, sem timestamp.');
  }
  if (!objeto(perfil.orcamento)) falhar('briefing.perfil.orcamento precisa ser objeto.');
  const chaves = Object.keys(perfil.orcamento).sort();
  const invalidas = chaves.filter((chave) => !['faces', 'materiais', 'partes'].includes(chave));
  if (invalidas.length || !chaves.includes('faces')) {
    falhar(`briefing.perfil.orcamento aceita faces obrigatórias e partes/materiais opcionais; inválidas: ${invalidas.join(', ') || '(nenhuma)'}.`);
  }
  for (const chave of chaves) {
    if (!Number.isInteger(perfil.orcamento[chave]) || perfil.orcamento[chave] <= 0) {
      falhar(`briefing.perfil.orcamento.${chave} precisa ser inteiro positivo.`);
    }
  }
}

function validarBriefing(briefing, opcoes) {
  chavesExatas(briefing, [
    'alvo', 'checklist', 'formato', 'guias', 'id', 'objetivo', 'partesEsperadas', 'perfil', 'provas', 'versao',
  ], 'briefing');
  if (briefing.formato !== 'mecanifica.pacote-modelagem' || briefing.versao !== 1) {
    falhar('briefing precisa declarar formato mecanifica.pacote-modelagem, versão 1.');
  }
  slug(briefing.id, 'briefing.id');
  textoSeguro(briefing.objetivo, 'briefing.objetivo');
  validarPerfil(briefing.perfil);
  chavesExatas(briefing.alvo, ['caminho', 'modo', 'peca'], 'briefing.alvo');
  const peca = nomeSemantico(briefing.alvo.peca, 'briefing.alvo.peca');
  const caminho = caminhoRelativo(briefing.alvo.caminho, 'briefing.alvo.caminho');
  const modo = textoSeguro(briefing.alvo.modo, 'briefing.alvo.modo');
  if (!['refinamento', 'criacao'].includes(modo)) {
    falhar('briefing.alvo.modo precisa ser refinamento ou criacao.');
  }
  const esperado = `prototipos/procedural/v3/pecas/${peca}.js`;
  if (caminho !== esperado) falhar(`briefing.alvo.caminho precisa ser exatamente ${esperado}.`);

  lista(briefing.partesEsperadas, 'briefing.partesEsperadas');
  if (!briefing.partesEsperadas.length) falhar('briefing.partesEsperadas não pode ser vazio.');
  const partes = briefing.partesEsperadas.map((parte, indice) => nomeSemantico(parte, `briefing.partesEsperadas[${indice}]`));
  unicos(partes, 'briefing.partesEsperadas');
  if (opcoes.partesDisponiveis) {
    const disponiveis = new Set(opcoes.partesDisponiveis);
    for (const parte of partes) {
      if (!disponiveis.has(parte)) {
        falhar(`briefing.partesEsperadas cita '${parte}', mas a descrição headless do alvo só conhece: ${[...disponiveis].join(', ')}.`);
      }
    }
  }
  validarGuias(briefing.guias, opcoes);
  validarChecklist(briefing.checklist);
  lista(briefing.provas, 'briefing.provas');
  if (briefing.provas.length < 1 || briefing.provas.length > 4) falhar('briefing.provas precisa ter entre 1 e 4 provas.');
  const provas = briefing.provas.map((prova, indice) => slug(prova, `briefing.provas[${indice}]`));
  unicos(provas, 'briefing.provas');
  return { peca, caminho, modo, partes };
}

function validarLocalizador(localizador, onde) {
  const recebido = textoSeguro(localizador, onde);
  if (recebido.startsWith('repo://')) {
    const interno = recebido.slice('repo://'.length);
    if (!interno || interno.startsWith('/') || interno.includes('\\') || interno.split('/').includes('..')
      || !/^[A-Za-z0-9._/-]+$/.test(interno)) {
      falhar(`${onde} repo:// precisa apontar para caminho relativo canônico.`);
    }
    return recebido;
  }
  let url;
  try { url = new URL(recebido); } catch { falhar(`${onde} precisa usar https:// ou repo://.`); }
  if (url.protocol !== 'https:' || url.username || url.password) {
    falhar(`${onde} precisa usar https:// sem credenciais ou repo://.`);
  }
  return recebido;
}

/* `repo://` é uma referência verificável: nunca deixa a raiz real do
   repositório, mesmo se algum segmento for symlink ou junction. Hash de https
   é apenas compromisso externo: este validador não baixa rede para confirmá-lo. */
function validarReferenciaDoRepositorio(localizador, hash, onde, { raizRepositorio = RAIZ_REPOSITORIO } = {}) {
  const interno = localizador.slice('repo://'.length);
  let raiz;
  try { raiz = realpathSync(raizRepositorio); } catch { falhar(`${onde} não conseguiu resolver a raiz do repositório.`); }
  const candidato = resolve(raiz, interno);
  if (!caminhoDentro(raiz, candidato)) {
    falhar(`${onde} repo:// escapa da raiz do repositório.`);
  }
  if (!existsSync(candidato)) falhar(`${onde} repo:// aponta para arquivo inexistente.`);

  let destino;
  try { destino = realpathSync(candidato); } catch { falhar(`${onde} repo:// não pode ser resolvido.`); }
  if (!caminhoDentro(raiz, destino)) {
    falhar(`${onde} repo:// segue symlink ou junction para fora do repositório.`);
  }
  if (!statSync(candidato).isFile()) {
    falhar(`${onde} repo:// precisa apontar para arquivo regular.`);
  }
  if (hash !== null) {
    const encontrado = `sha256:${createHash('sha256').update(readFileSync(candidato)).digest('hex')}`;
    if (encontrado !== hash) falhar(`${onde} hash SHA-256 diverge do arquivo repo://.`);
  }
}

function validarReferencias(referencias, opcoes) {
  chavesExatas(referencias, ['ausenciaDeclarada', 'formato', 'referencias', 'versao'], 'referencias');
  if (referencias.formato !== 'mecanifica.referencias-modelagem' || referencias.versao !== 1) {
    falhar('referencias precisa declarar formato mecanifica.referencias-modelagem, versão 1.');
  }
  if (typeof referencias.ausenciaDeclarada !== 'boolean') falhar('referencias.ausenciaDeclarada precisa ser booleano.');
  lista(referencias.referencias, 'referencias.referencias');
  const itens = referencias.referencias;
  if (referencias.ausenciaDeclarada && itens.length !== 0) falhar('ausência declarada exige lista de referências vazia.');
  if (!referencias.ausenciaDeclarada && (itens.length < 1 || itens.length > LIMITE_REFERENCIAS)) {
    falhar(`referencias.referencias precisa ter entre 1 e ${LIMITE_REFERENCIAS} itens, ou ausência declarada.`);
  }
  const ids = [];
  itens.forEach((item, indice) => {
    chavesExatas(item, ['descricao', 'hash', 'id', 'localizador', 'sustenta'], `referencias.referencias[${indice}]`);
    ids.push(slug(item.id, `referencias.referencias[${indice}].id`));
    const localizador = validarLocalizador(item.localizador, `referencias.referencias[${indice}].localizador`);
    textoSeguro(item.descricao, `referencias.referencias[${indice}].descricao`);
    lista(item.sustenta, `referencias.referencias[${indice}].sustenta`);
    const sustenta = item.sustenta;
    if (sustenta.some((itemSustenta) => !['medida', 'aceite'].includes(itemSustenta))) {
      falhar(`referencias.referencias[${indice}].sustenta só aceita medida ou aceite.`);
    }
    unicos(sustenta, `referencias.referencias[${indice}].sustenta`);
    if (item.hash !== null && (typeof item.hash !== 'string' || !SHA256.test(item.hash))) {
      falhar(`referencias.referencias[${indice}].hash precisa ser sha256:<64 hex> ou null.`);
    }
    if (sustenta.length && !SHA256.test(item.hash ?? '')) {
      falhar(`referencias.referencias[${indice}] sustenta medida ou aceite e exige hash SHA-256.`);
    }
    if (localizador.startsWith('repo://')) {
      validarReferenciaDoRepositorio(localizador, item.hash, `referencias.referencias[${indice}].localizador`, opcoes);
    }
    /* Para https://, hash é compromisso externo. Não há download neste contrato. */
  });
  unicos(ids, 'referencias.referencias');
}

/**
 * Valida os dois documentos em memória. Em `criacao`, a ausência de
 * `partesDisponiveis` é deliberada: ainda não há fonte para importar. Quando a
 * descrição estiver disponível, passá-la sempre confere a mesma lista declarada.
 */
export function validarPacote(briefing, referencias, opcoes = {}) {
  const alvo = validarBriefing(briefing, opcoes);
  validarReferencias(referencias, opcoes);
  const bytes = Buffer.byteLength(serializarCanonico(briefing), 'utf8')
    + Buffer.byteLength(serializarCanonico(referencias), 'utf8');
  if (bytes > LIMITE_PACOTE_BYTES) {
    falhar(`pacote tem ${bytes} bytes; o limite é ${LIMITE_PACOTE_BYTES} bytes (24 KiB).`);
  }
  return { ...alvo, bytes };
}

/** Carrega alvo procedural e o mede na mesma régua neutra da bancada. */
export async function descreverAlvo(peca, { raizRepositorio = RAIZ_REPOSITORIO } = {}) {
  const nome = nomeSemantico(peca, 'alvo.peca');
  const pasta = join(raizRepositorio, 'prototipos/procedural/v3/pecas');
  const arquivo = join(pasta, `${nome}.js`);
  if (!existsSync(arquivo) || !readdirSync(pasta).includes(`${nome}.js`)) {
    falhar(`alvo '${nome}' não existe em prototipos/procedural/v3/pecas/.`);
  }
  const modulo = await import(pathToFileURL(arquivo).href);
  if (!Array.isArray(modulo.PASSOS)) falhar(`alvo '${nome}' não exporta PASSOS da Oficina.`);
  const { nucleo } = await import(pathToFileURL(join(raizRepositorio, 'prototipos/procedural/v3/motor/oficina.js')).href);
  const { descreverPeca } = await import(pathToFileURL(join(raizRepositorio, 'src/autoria/descrever-partes.js')).href);
  let neutro;
  try {
    neutro = nucleo(modulo.PASSOS, modulo.PARAMS ?? {}, modulo.TOPO ?? {}, modulo.MATERIAIS ?? {}, modulo.ESQUELETO ?? null, modulo.ALIASES ?? []);
  } catch (erro) {
    falhar(`alvo '${nome}' foi recusado pelo núcleo: ${erro.message}`);
  }
  const descricao = descreverPeca(neutro);
  if (descricao.totais.orfaos || descricao.totais.facesSemParte) {
    falhar(`alvo '${nome}' não é semanticamente íntegro: ${descricao.totais.facesSemParte} face(s) sem identidade e ${descricao.totais.orfaos} órfão(s).`);
  }
  return { peca: nome, partes: descricao.partes.map((parte) => parte.nome), descricao };
}

/**
 * Consulta somente a rota canônica do alvo. Não importa o módulo e, portanto,
 * permite preparar ou validar um pacote de criação antes de sua fonte existir.
 */
export function alvoExiste(peca, { raizRepositorio = RAIZ_REPOSITORIO } = {}) {
  const nome = nomeSemantico(peca, 'alvo.peca');
  const pasta = join(raizRepositorio, 'prototipos/procedural/v3/pecas');
  const arquivo = join(pasta, `${nome}.js`);
  return existsSync(arquivo) && readdirSync(pasta).includes(`${nome}.js`);
}

export function caminhoPacote(id, { raizPacotes = RAIZ_PACOTES } = {}) {
  return join(raizPacotes, slug(id, 'pacote'));
}

export function conferirBytesCanonicos(conteudo, valor, onde) {
  const esperado = serializarCanonico(valor);
  if (conteudo !== esperado) {
    falhar(`${onde} não está canonicalizado; regrave-o pela serialização canônica, sem ordem ou espaços livres.`);
  }
}

export function caminhoDentro(raiz, candidato) {
  const relativo = relative(raiz, candidato);
  return relativo !== '' && !relativo.startsWith('..') && !isAbsolute(relativo);
}

/* Resolve `nome` (componente simples, sem separador) dentro de `pastaReal` —
   que já precisa ser um caminho real, sem symlinks — e devolve o caminho
   literal do resultado, ou `null` fail-closed. Duas checagens, nessa ordem:
   (1) `lstatSync` no caminho literal rejeita symlink como categoria própria,
   dentro ou fora da raiz — um pacote `alias` symlinkado para outro pacote
   válido dentro de `RAIZ_PACOTES` não passa, mesmo sem escapar de nada;
   (2) com o candidato confirmado não-symlink, `realpathSync` ainda confirma
   confinamento contra escape (defesa em profundidade; num não-symlink o real
   já é o próprio literal, mas manter a checagem cobre qualquer peculiaridade
   de filesystem). Nunca lança. Encadear a partir de uma raiz já validada
   neste mesmo nível, nunca da raiz literal do topo, é o que impede um
   symlink intermediário (ex.: `<pacote>/revisoes`) de abrir uma nova "raiz"
   alheia que passaria despercebida numa checagem feita só contra o topo. */
function resolverFilhoConfinado(pastaReal, nome) {
  const candidato = join(pastaReal, nome);
  let literal;
  try { literal = lstatSync(candidato); } catch { return null; }
  if (literal.isSymbolicLink()) return null;
  let real;
  try { real = realpathSync(candidato); } catch { return null; }
  return caminhoDentro(pastaReal, real) ? real : null;
}

function pastaRealConfinada(pastaReal, nome) {
  const real = resolverFilhoConfinado(pastaReal, nome);
  if (real === null) return null;
  try { return statSync(real).isDirectory() ? real : null; } catch { return null; }
}

function arquivoRealConfinado(pastaReal, nome) {
  const real = resolverFilhoConfinado(pastaReal, nome);
  if (real === null) return null;
  try { return statSync(real).isFile() ? real : null; } catch { return null; }
}

function jsonValidoOuNulo(arquivo) {
  try { return JSON.parse(readFileSync(arquivo, 'utf8')); } catch { return null; }
}

/* Um pacote só é oficial se satisfizer o mesmo contrato canônico que
   `validar_pacote` exige: `briefing.json`/`referencias.json` com bytes
   canônicos exatos (`conferirBytesCanonicos`), estrutura válida de
   `mecanifica.pacote-modelagem`/`mecanifica.referencias-modelagem`
   (`validarPacote`), e `briefing.id` igual ao nome da pasta. JSON
   sintaticamente válido mas fora do contrato — ou com id divergente da pasta
   — não é suficiente e não é publicado; caso contrário o catálogo poderia
   anunciar um id que `validar_pacote` rejeitaria na hora. Fail-closed: só
   `false` ou `true`, nunca lança. */
function pacoteOficialValido(pastaPacoteReal, id) {
  const briefingArquivo = arquivoRealConfinado(pastaPacoteReal, 'briefing.json');
  if (briefingArquivo === null) return false;
  const referenciasArquivo = arquivoRealConfinado(pastaPacoteReal, 'referencias.json');
  if (referenciasArquivo === null) return false;
  let briefingTexto;
  let referenciasTexto;
  let briefingValor;
  let referenciasValor;
  try {
    briefingTexto = readFileSync(briefingArquivo, 'utf8');
    referenciasTexto = readFileSync(referenciasArquivo, 'utf8');
    briefingValor = JSON.parse(briefingTexto);
    referenciasValor = JSON.parse(referenciasTexto);
  } catch { return false; }
  if (!objeto(briefingValor) || briefingValor.id !== id) return false;
  try {
    conferirBytesCanonicos(briefingTexto, briefingValor, 'briefing.json');
    conferirBytesCanonicos(referenciasTexto, referenciasValor, 'referencias.json');
    validarPacote(briefingValor, referenciasValor);
  } catch { return false; }
  return true;
}

function listarRevisoesValidas(pastaPacoteReal) {
  const pastaRevisoesReal = pastaRealConfinada(pastaPacoteReal, REVISOES);
  if (pastaRevisoesReal === null) return [];
  let entradas;
  try { entradas = readdirSync(pastaRevisoesReal, { withFileTypes: true }); } catch { return []; }
  const revisoes = [];
  for (const entrada of entradas) {
    if (!REVISAO_SLUG.test(entrada.name)) continue;
    const pastaRevisaoReal = pastaRealConfinada(pastaRevisoesReal, entrada.name);
    if (pastaRevisaoReal === null) continue;
    const revisaoJson = arquivoRealConfinado(pastaRevisaoReal, 'revisao.json');
    if (revisaoJson === null || jsonValidoOuNulo(revisaoJson) === null) continue;
    revisoes.push(entrada.name);
  }
  return revisoes.sort();
}

/**
 * Catálogo somente leitura de pacotes e revisões oficiais, derivado da raiz a
 * cada chamada. Ignora de forma fail-closed qualquer entrada que não seja um
 * slug confinado com `briefing.json`/`referencias.json` que satisfaçam o
 * mesmo contrato canônico que `validar_pacote` exige (`pacoteOficialValido`),
 * e qualquer revisão sem `revisao.json` legível na mesma rota que
 * `comparar_revisoes` já consome. Cada pasta e cada arquivo (incluindo
 * `revisoes/` em si) é resolvido e confinado pelo caminho real antes de ser
 * lido, então um symlink em qualquer nível — a pasta do pacote, `revisoes/`,
 * uma pasta de revisão, ou qualquer dos três JSONs — dentro ou fora de
 * `RAIZ_PACOTES`, é rejeitado, nunca seguido. Não expõe caminhos absolutos
 * nem conteúdo dos arquivos, só `id` e a lista ordenada de revisões.
 */
export function listarCatalogoDePacotes({ raizPacotes = RAIZ_PACOTES } = {}) {
  let raizReal;
  let entradas;
  try {
    raizReal = realpathSync(raizPacotes);
    entradas = readdirSync(raizPacotes, { withFileTypes: true });
  } catch { return []; }
  const pacotes = [];
  for (const entrada of entradas) {
    if (!SLUG.test(entrada.name)) continue;
    const pastaPacoteReal = pastaRealConfinada(raizReal, entrada.name);
    if (pastaPacoteReal === null) continue;
    if (!pacoteOficialValido(pastaPacoteReal, entrada.name)) continue;
    pacotes.push({ id: entrada.name, revisoes: listarRevisoesValidas(pastaPacoteReal) });
  }
  return pacotes.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
