/* Contratos neutros da N1. Este módulo valida intenção, fonte e provedores;
   não executa geometria, não lê disco e não conhece Three.js ou MCP. */

export const FORMATO_OBJETIVO_AUTORIA = 'mecanifica.objetivo-autoria@1';
export const FORMATO_RECEITA_AUTORAL = 'mecanifica.receita-autoral@1';
export const FORMATO_PROVEDOR_AUTORIA = 'mecanifica.provedor-autoria@1';
export const FORMATO_REGISTRO_PROVEDORES = 'mecanifica.registro-provedores-autoria@1';

export const FAMILIAS_AUTORIA = Object.freeze([
  'peca-mecanica', 'veiculo', 'humanoide', 'sistema-articulado',
]);
export const ETAPAS_AUTORIA = Object.freeze([
  'briefing', 'alvo', 'andaime', 'blocagem', 'decomposicao', 'integracao',
  'superficie', 'estados', 'revisao', 'promocao',
]);
export const TIPOS_FONTE_AUTORAL = Object.freeze([
  'receita-procedural', 'andaime', 'superficie-semantica', 'montagem',
  'estado', 'combinada',
]);
export const TIPOS_PRODUTO_DERIVADO = Object.freeze([
  'malha-neutra', 'malha-densa', 'triangulacao', 'normais', 'medicao',
  'imagem', 'contexto-resolvido',
]);

const FAMILIAS = new Set(FAMILIAS_AUTORIA);
const ETAPAS = new Set(ETAPAS_AUTORIA);
const FONTES = new Set(TIPOS_FONTE_AUTORAL);
const DERIVADOS = new Set(TIPOS_PRODUTO_DERIVADO);
const QUALIDADES = new Set(['exploratoria', 'reconhecivel', 'integrada', 'promovivel']);
const EFEITOS_INCERTEZA = new Set(['diagnostico', 'bloqueia']);
const EFEITOS_PROVEDOR = new Set(['leitura', 'planejamento', 'compilacao', 'validacao', 'revisao', 'publicacao']);
const ESTADOS_GATE = new Set(['pendente', 'aprovado', 'reprovado', 'bloqueado']);
const DIRECOES = new Set(['+x', '-x', '+y', '-y', '+z', '-z']);
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const ASSINATURA = /^sha256:[0-9a-f]{64}$/;
const CAMPO_RUNTIME = /^(uuid|indice|index|passo|timestamp|createdat|updatedat|host|camera)$/i;

export class ErroContratoAutoria3D extends Error {
  constructor(codigo, caminho, mensagem) {
    super(`${caminho}: ${mensagem}`);
    this.name = 'ErroContratoAutoria3D';
    this.codigo = codigo;
    this.caminho = caminho;
  }
}

const comparar = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const simples = (valor) => valor !== null && typeof valor === 'object' && !Array.isArray(valor)
  && (Object.getPrototypeOf(valor) === Object.prototype || Object.getPrototypeOf(valor) === null);

function falhar(codigo, caminho, mensagem) {
  throw new ErroContratoAutoria3D(codigo, caminho, mensagem);
}

function congelar(valor) {
  if (valor && typeof valor === 'object' && !Object.isFrozen(valor)) {
    Object.values(valor).forEach(congelar);
    Object.freeze(valor);
  }
  return valor;
}

function conferirSerializavel(valor, caminho, vistos = new Set()) {
  if (valor === null || typeof valor === 'string' || typeof valor === 'boolean') return;
  if (typeof valor === 'number') {
    if (!Number.isFinite(valor)) falhar('nao-serializavel', caminho, 'número precisa ser finito.');
    return;
  }
  if (typeof valor !== 'object') falhar('nao-serializavel', caminho, `tipo '${typeof valor}' não pertence a JSON.`);
  if (vistos.has(valor)) falhar('nao-serializavel', caminho, 'não pode conter ciclo.');
  vistos.add(valor);
  if (!Array.isArray(valor) && !simples(valor)) falhar('nao-serializavel', caminho, 'precisa usar somente objetos simples e listas.');
  Object.entries(valor).forEach(([chave, item]) => conferirSerializavel(item, `${caminho}.${chave}`, vistos));
  vistos.delete(valor);
}

function copiar(valor, caminho) {
  conferirSerializavel(valor, caminho);
  try { return JSON.parse(JSON.stringify(valor)); } catch {
    falhar('nao-serializavel', caminho, 'precisa ser dado JSON serializável.');
  }
}

function objeto(valor, caminho) {
  if (!simples(valor)) falhar('estrutura-invalida', caminho, 'precisa ser objeto simples.');
  return valor;
}

function chavesExatas(valor, permitidas, caminho) {
  const extras = Object.keys(valor).filter((chave) => CAMPO_RUNTIME.test(chave) || !permitidas.includes(chave));
  if (extras.length) falhar('chave-desconhecida', caminho, `chave(s) não permitida(s): ${extras.sort(comparar).join(', ')}.`);
  const ausentes = permitidas.filter((chave) => !Object.hasOwn(valor, chave));
  if (ausentes.length) falhar('campo-ausente', caminho, `precisa declarar: ${ausentes.join(', ')}.`);
}

function texto(valor, caminho, { maximo = 500 } = {}) {
  if (typeof valor !== 'string' || !valor.trim()) falhar('texto-invalido', caminho, 'precisa ser texto não vazio.');
  const resultado = valor.trim();
  if (resultado.length > maximo) falhar('texto-longo', caminho, `excede ${maximo} caracteres.`);
  if (/(?:[a-z]:\\|\\\\|data:|file:\/\/)/i.test(resultado)) falhar('identidade-runtime', caminho, 'não pode conter caminho ou dado local.');
  return resultado;
}

function slug(valor, caminho) {
  const resultado = texto(valor, caminho, { maximo: 120 });
  if (!SLUG.test(resultado)) falhar('identidade-invalida', caminho, 'precisa ser slug semântico em minúsculas.');
  return resultado;
}

function versao(valor, caminho) {
  if (typeof valor !== 'string' || !SEMVER.test(valor)) falhar('versao-invalida', caminho, 'precisa ser versão semântica x.y.z.');
  return valor;
}

function listaTextos(valor, caminho, { vazia = true, slugue = false } = {}) {
  if (!Array.isArray(valor) || (!vazia && valor.length === 0)) falhar('lista-invalida', caminho, `precisa ser lista${vazia ? '' : ' não vazia'}.`);
  const itens = valor.map((item, indice) => (slugue ? slug(item, `${caminho}[${indice}]`) : texto(item, `${caminho}[${indice}]`))).sort(comparar);
  if (new Set(itens).size !== itens.length) falhar('item-duplicado', caminho, 'não pode repetir itens.');
  return itens;
}

function eixos(valor, caminho) {
  objeto(valor, caminho);
  chavesExatas(valor, ['direita', 'cima', 'frente'], caminho);
  const resultado = Object.fromEntries(['direita', 'cima', 'frente'].map((nome) => {
    if (!DIRECOES.has(valor[nome])) falhar('eixo-invalido', `${caminho}.${nome}`, 'precisa usar +x, -x, +y, -y, +z ou -z.');
    return [nome, valor[nome]];
  }));
  const bases = Object.values(resultado).map((direcao) => direcao.slice(1));
  if (new Set(bases).size !== bases.length) falhar('eixos-colineares', caminho, 'direita, cima e frente precisam usar três eixos distintos.');
  return resultado;
}

function referencias(valor, caminho) {
  if (!Array.isArray(valor) || !valor.length) falhar('referencia-ausente', caminho, 'precisa declarar ao menos uma referência ou briefing rastreável.');
  const itens = valor.map((item, indice) => {
    const onde = `${caminho}[${indice}]`;
    objeto(item, onde); chavesExatas(item, ['id', 'tipo', 'evidencia'], onde);
    return { id: slug(item.id, `${onde}.id`), tipo: slug(item.tipo, `${onde}.tipo`), evidencia: texto(item.evidencia, `${onde}.evidencia`) };
  }).sort((a, b) => comparar(a.id, b.id));
  if (new Set(itens.map(({ id }) => id)).size !== itens.length) falhar('item-duplicado', caminho, 'não pode repetir ID de referência.');
  return itens;
}

function incertezas(valor, caminho, idsReferencias) {
  if (!Array.isArray(valor)) falhar('lista-invalida', caminho, 'precisa ser lista, mesmo quando vazia.');
  const itens = valor.map((item, indice) => {
    const onde = `${caminho}[${indice}]`;
    objeto(item, onde); chavesExatas(item, ['id', 'sobre', 'motivo', 'efeito', 'referencia'], onde);
    if (!EFEITOS_INCERTEZA.has(item.efeito)) falhar('efeito-invalido', `${onde}.efeito`, 'precisa ser diagnostico ou bloqueia.');
    const referencia = item.referencia === null ? null : slug(item.referencia, `${onde}.referencia`);
    if (referencia !== null && !idsReferencias.has(referencia)) falhar('referencia-ausente', `${onde}.referencia`, `não encontra '${referencia}'.`);
    return {
      id: slug(item.id, `${onde}.id`), sobre: texto(item.sobre, `${onde}.sobre`),
      motivo: texto(item.motivo, `${onde}.motivo`), efeito: item.efeito, referencia,
    };
  }).sort((a, b) => comparar(a.id, b.id));
  if (new Set(itens.map(({ id }) => id)).size !== itens.length) falhar('item-duplicado', caminho, 'não pode repetir ID de incerteza.');
  return itens;
}

function artefatos(valor, caminho, { saidaObrigatoria = true } = {}) {
  objeto(valor, caminho); chavesExatas(valor, ['entra', 'sai'], caminho);
  return {
    entra: listaTextos(valor.entra, `${caminho}.entra`),
    sai: listaTextos(valor.sai, `${caminho}.sai`, { vazia: !saidaObrigatoria }),
  };
}

function necessidades(valor, caminho) {
  if (!Array.isArray(valor)) falhar('lista-invalida', caminho, 'precisa ser lista, mesmo quando vazia.');
  const itens = valor.map((item, indice) => {
    const onde = `${caminho}[${indice}]`;
    objeto(item, onde);
    chavesExatas(item, ['id', 'etapa', 'classe', 'artefatos', 'interfaces', 'requisitos', 'obrigatoria'], onde);
    if (!ETAPAS.has(item.etapa)) falhar('etapa-invalida', `${onde}.etapa`, `precisa ser uma etapa de ${ETAPAS_AUTORIA.join(', ')}.`);
    if (typeof item.obrigatoria !== 'boolean') falhar('booleano-invalido', `${onde}.obrigatoria`, 'precisa ser booleano.');
    return {
      id: slug(item.id, `${onde}.id`), etapa: item.etapa, classe: slug(item.classe, `${onde}.classe`),
      artefatos: artefatos(item.artefatos, `${onde}.artefatos`),
      interfaces: artefatos(item.interfaces, `${onde}.interfaces`, { saidaObrigatoria: false }),
      requisitos: listaTextos(item.requisitos, `${onde}.requisitos`), obrigatoria: item.obrigatoria,
    };
  }).sort((a, b) => ETAPAS_AUTORIA.indexOf(a.etapa) - ETAPAS_AUTORIA.indexOf(b.etapa) || comparar(a.id, b.id));
  if (new Set(itens.map(({ id }) => id)).size !== itens.length) falhar('item-duplicado', caminho, 'não pode repetir ID de necessidade.');
  return itens;
}

export function normalizarObjetivoAutoria(valor) {
  objeto(valor, '$');
  chavesExatas(valor, [
    'formato', 'id', 'familia', 'intencao', 'qualidade', 'unidade', 'eixos',
    'referencias', 'restricoes', 'rejeicoes', 'incertezas', 'necessidades',
  ], '$');
  if (valor.formato !== FORMATO_OBJETIVO_AUTORIA) falhar('formato-invalido', 'formato', `esperado '${FORMATO_OBJETIVO_AUTORIA}'.`);
  if (!FAMILIAS.has(valor.familia)) falhar('familia-invalida', 'familia', `esperado ${FAMILIAS_AUTORIA.join(', ')}.`);
  if (!QUALIDADES.has(valor.qualidade)) falhar('qualidade-invalida', 'qualidade', 'valor desconhecido.');
  if (valor.unidade !== 'mm') falhar('unidade-invalida', 'unidade', "a fronteira v1 usa somente 'mm'.");
  const refs = referencias(valor.referencias, 'referencias');
  return congelar({
    formato: FORMATO_OBJETIVO_AUTORIA, id: slug(valor.id, 'id'), familia: valor.familia,
    intencao: texto(valor.intencao, 'intencao'), qualidade: valor.qualidade, unidade: 'mm',
    eixos: eixos(valor.eixos, 'eixos'), referencias: refs,
    restricoes: listaTextos(valor.restricoes, 'restricoes'),
    rejeicoes: listaTextos(valor.rejeicoes, 'rejeicoes', { vazia: false }),
    incertezas: incertezas(valor.incertezas, 'incertezas', new Set(refs.map(({ id }) => id))),
    necessidades: necessidades(valor.necessidades, 'necessidades'),
  });
}

function entidadesSemanticas(valor, caminho, campos) {
  objeto(valor, caminho); chavesExatas(valor, campos, caminho);
  return Object.fromEntries(campos.map((campo) => [campo, listaTextos(valor[campo], `${caminho}.${campo}`, { slugue: true })]));
}

function fontesAutorais(valor) {
  if (!Array.isArray(valor) || !valor.length) falhar('fonte-ausente', 'fontes', 'precisa declarar ao menos uma fonte editável.');
  const itens = valor.map((item, indice) => {
    const onde = `fontes[${indice}]`;
    objeto(item, onde); chavesExatas(item, ['id', 'tipo', 'formato', 'versao'], onde);
    if (!FONTES.has(item.tipo)) {
      const detalhe = DERIVADOS.has(item.tipo) ? 'produto derivado não pode ocupar a lista de fontes.' : 'tipo de fonte desconhecido.';
      falhar('tipo-fonte-invalido', `${onde}.tipo`, detalhe);
    }
    return { id: slug(item.id, `${onde}.id`), tipo: item.tipo, formato: texto(item.formato, `${onde}.formato`), versao: versao(item.versao, `${onde}.versao`) };
  }).sort((a, b) => comparar(a.id, b.id));
  if (new Set(itens.map(({ id }) => id)).size !== itens.length) falhar('item-duplicado', 'fontes', 'não pode repetir ID de fonte.');
  return itens;
}

function produtosDerivados(valor) {
  if (!Array.isArray(valor)) falhar('lista-invalida', 'produtosDerivados', 'precisa ser lista.');
  const itens = valor.map((item, indice) => {
    const onde = `produtosDerivados[${indice}]`;
    objeto(item, onde); chavesExatas(item, ['id', 'tipo', 'estado', 'assinatura', 'provedor', 'versao'], onde);
    if (!DERIVADOS.has(item.tipo)) falhar('tipo-derivado-invalido', `${onde}.tipo`, 'tipo de produto derivado desconhecido.');
    if (!['esperado', 'compilado'].includes(item.estado)) falhar('estado-invalido', `${onde}.estado`, 'precisa ser esperado ou compilado.');
    const assinatura = item.assinatura === null ? null : texto(item.assinatura, `${onde}.assinatura`);
    if (item.estado === 'esperado' && assinatura !== null) falhar('assinatura-antecipada', `${onde}.assinatura`, 'produto esperado ainda não possui assinatura.');
    if (item.estado === 'compilado' && !ASSINATURA.test(assinatura ?? '')) falhar('assinatura-invalida', `${onde}.assinatura`, 'produto compilado exige sha256 válido.');
    return {
      id: slug(item.id, `${onde}.id`), tipo: item.tipo, estado: item.estado, assinatura,
      provedor: slug(item.provedor, `${onde}.provedor`), versao: versao(item.versao, `${onde}.versao`),
    };
  }).sort((a, b) => comparar(a.id, b.id));
  if (new Set(itens.map(({ id }) => id)).size !== itens.length) falhar('item-duplicado', 'produtosDerivados', 'não pode repetir ID de produto.');
  return itens;
}

export function normalizarReceitaAutoral(valor) {
  objeto(valor, '$');
  chavesExatas(valor, [
    'formato', 'id', 'objetivo', 'familia', 'revisaoPai', 'intencao', 'coordenadas',
    'fontes', 'semantica', 'dependencias', 'produtosDerivados', 'aceite',
  ], '$');
  if (valor.formato !== FORMATO_RECEITA_AUTORAL) falhar('formato-invalido', 'formato', `esperado '${FORMATO_RECEITA_AUTORAL}'.`);
  if (!FAMILIAS.has(valor.familia)) falhar('familia-invalida', 'familia', 'família desconhecida.');
  const coordenadas = objeto(valor.coordenadas, 'coordenadas');
  chavesExatas(coordenadas, ['unidade', 'escala', 'eixos'], 'coordenadas');
  if (coordenadas.unidade !== 'mm') falhar('unidade-invalida', 'coordenadas.unidade', "precisa ser 'mm'.");
  if (typeof coordenadas.escala !== 'number' || !Number.isFinite(coordenadas.escala) || coordenadas.escala <= 0) falhar('escala-invalida', 'coordenadas.escala', 'precisa ser número finito positivo.');
  if (!Array.isArray(valor.dependencias)) falhar('lista-invalida', 'dependencias', 'precisa ser lista.');
  const dependencias = valor.dependencias.map((item, indice) => {
    const onde = `dependencias[${indice}]`;
    objeto(item, onde); chavesExatas(item, ['tipo', 'id', 'revisao'], onde);
    return { tipo: slug(item.tipo, `${onde}.tipo`), id: slug(item.id, `${onde}.id`), revisao: item.revisao === null ? null : slug(item.revisao, `${onde}.revisao`) };
  }).sort((a, b) => comparar(`${a.tipo}:${a.id}`, `${b.tipo}:${b.id}`));
  if (new Set(dependencias.map(({ tipo, id }) => `${tipo}:${id}`)).size !== dependencias.length) falhar('item-duplicado', 'dependencias', 'não pode repetir dependência semântica.');
  const aceite = objeto(valor.aceite, 'aceite');
  chavesExatas(aceite, ['gates'], 'aceite');
  if (!Array.isArray(aceite.gates) || !aceite.gates.length) falhar('gate-ausente', 'aceite.gates', 'precisa declarar ao menos um gate.');
  const gates = aceite.gates.map((item, indice) => {
    const onde = `aceite.gates[${indice}]`;
    objeto(item, onde); chavesExatas(item, ['id', 'estado'], onde);
    if (!ESTADOS_GATE.has(item.estado)) falhar('estado-invalido', `${onde}.estado`, 'estado de gate desconhecido.');
    return { id: slug(item.id, `${onde}.id`), estado: item.estado };
  }).sort((a, b) => comparar(a.id, b.id));
  if (new Set(gates.map(({ id }) => id)).size !== gates.length) falhar('item-duplicado', 'aceite.gates', 'não pode repetir gate.');
  return congelar({
    formato: FORMATO_RECEITA_AUTORAL, id: slug(valor.id, 'id'), objetivo: slug(valor.objetivo, 'objetivo'),
    familia: valor.familia, revisaoPai: valor.revisaoPai === null ? null : slug(valor.revisaoPai, 'revisaoPai'),
    intencao: texto(valor.intencao, 'intencao'),
    coordenadas: { unidade: 'mm', escala: coordenadas.escala, eixos: eixos(coordenadas.eixos, 'coordenadas.eixos') },
    fontes: fontesAutorais(valor.fontes),
    semantica: entidadesSemanticas(valor.semantica, 'semantica', ['regioes', 'landmarks', 'interfaces']),
    dependencias, produtosDerivados: produtosDerivados(valor.produtosDerivados),
    aceite: { gates },
  });
}

function normalizarManifestoProvedor(valor, caminho) {
  objeto(valor, caminho);
  chavesExatas(valor, ['formato', 'id', 'versao', 'familias', 'etapas', 'classes', 'efeitos'], caminho);
  if (valor.formato !== FORMATO_PROVEDOR_AUTORIA) falhar('formato-invalido', `${caminho}.formato`, `esperado '${FORMATO_PROVEDOR_AUTORIA}'.`);
  const familias = listaTextos(valor.familias, `${caminho}.familias`, { vazia: false });
  if (familias.some((familia) => familia !== '*' && !FAMILIAS.has(familia))) falhar('familia-invalida', `${caminho}.familias`, 'contém família desconhecida.');
  const etapas = listaTextos(valor.etapas, `${caminho}.etapas`, { vazia: false });
  if (etapas.some((etapa) => !ETAPAS.has(etapa))) falhar('etapa-invalida', `${caminho}.etapas`, 'contém etapa desconhecida.');
  const efeitos = listaTextos(valor.efeitos, `${caminho}.efeitos`, { vazia: false });
  if (efeitos.some((efeito) => !EFEITOS_PROVEDOR.has(efeito))) falhar('efeito-invalido', `${caminho}.efeitos`, 'contém efeito desconhecido.');
  return congelar({
    formato: FORMATO_PROVEDOR_AUTORIA, id: slug(valor.id, `${caminho}.id`), versao: versao(valor.versao, `${caminho}.versao`),
    familias, etapas, classes: listaTextos(valor.classes, `${caminho}.classes`, { vazia: false, slugue: true }), efeitos,
  });
}

export function criarRegistroProvedoresAutoria(provedores = []) {
  if (!Array.isArray(provedores)) falhar('lista-invalida', 'provedores', 'precisa ser lista.');
  const runtimes = provedores.map((provedor, indice) => {
    const onde = `provedores[${indice}]`;
    objeto(provedor, onde);
    const extras = Object.keys(provedor).filter((chave) => !['manifesto', 'planejar'].includes(chave));
    if (extras.length) falhar('chave-desconhecida', onde, `chave(s) não permitida(s): ${extras.sort(comparar).join(', ')}.`);
    if (typeof provedor.planejar !== 'function') falhar('planejador-ausente', `${onde}.planejar`, 'precisa ser função pura de planejamento.');
    return { manifesto: normalizarManifestoProvedor(provedor.manifesto, `${onde}.manifesto`), planejar: provedor.planejar };
  }).sort((a, b) => comparar(a.manifesto.id, b.manifesto.id));
  if (new Set(runtimes.map(({ manifesto }) => manifesto.id)).size !== runtimes.length) falhar('provedor-duplicado', 'provedores', 'não pode repetir ID de provedor.');
  const porId = new Map(runtimes.map((runtime) => [runtime.manifesto.id, runtime]));
  const manifestos = congelar(runtimes.map(({ manifesto }) => manifesto));
  return Object.freeze({
    formato: FORMATO_REGISTRO_PROVEDORES,
    listar: () => manifestos,
    candidatos({ familia, etapa, classe }) {
      return congelar(manifestos.filter((manifesto) => (manifesto.familias.includes('*') || manifesto.familias.includes(familia))
        && manifesto.etapas.includes(etapa) && manifesto.classes.includes(classe)));
    },
    planejar(id, contexto) {
      const runtime = porId.get(id);
      if (!runtime) falhar('provedor-ausente', 'provedor', `não encontra '${id}'.`);
      return runtime.planejar(congelar(copiar(contexto, 'contexto')));
    },
  });
}
