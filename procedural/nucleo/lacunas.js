/* lacunas.js — diagnóstico e planejamento estrutural puros sobre o catálogo.
   Não executa receita, não grava disco e não decide promoção de capacidade. */
import { FORMATO_CATALOGO } from './catalogo.js';

export const FORMATO_LACUNA_CAPACIDADE = 'mecanifica.lacuna-capacidade@1';
export const FORMATO_PLANO_CAPACIDADES = 'mecanifica.plano-capacidades@1';
export const FORMATO_CLASSIFICACAO_LACUNA = 'mecanifica.classificacao-lacuna@1';
const CLASSIFICACOES = new Set(['composicao', 'operacao-nativa', 'representacao']);

export class ErroLacunaCapacidade extends Error {
  constructor(mensagem) { super(`lacuna de capacidade: ${mensagem}`); this.name = 'ErroLacunaCapacidade'; }
}

const comparar = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const objeto = (valor) => valor && typeof valor === 'object' && !Array.isArray(valor);
function texto(valor, onde) {
  if (typeof valor !== 'string' || !valor.trim()) throw new ErroLacunaCapacidade(`${onde} exige texto não vazio`);
  return valor.trim();
}
function inteiroNaoNegativo(valor, onde) {
  if (!Number.isInteger(valor) || valor < 0) throw new ErroLacunaCapacidade(`${onde} exige inteiro não negativo`);
  return valor;
}
function custo(valor, onde) {
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < 0) throw new ErroLacunaCapacidade(`${onde} exige custo finito não negativo`);
  return valor;
}
function tipos(valor, onde, { vazio = true } = {}) {
  if (!Array.isArray(valor) || (!vazio && !valor.length)) throw new ErroLacunaCapacidade(`${onde} exige lista${vazio ? '' : ' não vazia'}`);
  const lista = valor.map((item, indice) => texto(item, `${onde}[${indice}]`)).sort(comparar);
  if (new Set(lista).size !== lista.length) throw new ErroLacunaCapacidade(`${onde} não pode repetir artefato`);
  return lista;
}
function copiar(valor) { return JSON.parse(JSON.stringify(valor)); }
function congelar(valor) {
  if (valor && typeof valor === 'object' && !Object.isFrozen(valor)) {
    for (const item of Object.values(valor)) congelar(item);
    Object.freeze(valor);
  }
  return valor;
}
function conferirArtefatos(valor, onde, { saiObrigatorio = false } = {}) {
  if (!objeto(valor)) throw new ErroLacunaCapacidade(`${onde} exige objeto`);
  const chaves = Object.keys(valor).sort(comparar);
  if (chaves.join(',') !== 'entra,sai') throw new ErroLacunaCapacidade(`${onde} aceita somente entra e sai`);
  return { entra: tipos(valor.entra, `${onde}.entra`), sai: tipos(valor.sai, `${onde}.sai`, { vazio: !saiObrigatorio }) };
}

/* Este registro é dado serializável: a borda escolhe onde guardá-lo. */
export function criarLacunaCapacidade(entrada = {}) {
  if (!objeto(entrada)) throw new ErroLacunaCapacidade('registro exige objeto');
  const permitidas = new Set(['formato', 'id', 'objetivo', 'artefatos', 'interfaces', 'requisitos', 'candidatas', 'requisitoAusente', 'contorno', 'recorrencia', 'classificacao']);
  for (const campo of Object.keys(entrada)) if (!permitidas.has(campo)) throw new ErroLacunaCapacidade(`registro não aceita '${campo}'`);
  if (entrada.formato !== undefined && entrada.formato !== FORMATO_LACUNA_CAPACIDADE) throw new ErroLacunaCapacidade('formato incompatível');
  const candidatas = entrada.candidatas ?? [];
  if (!Array.isArray(candidatas)) throw new ErroLacunaCapacidade('candidatas exige lista');
  const requisitoAusente = entrada.requisitoAusente ?? null;
  if (requisitoAusente !== null && (!objeto(requisitoAusente) || !['artefato', 'interface', 'representacao'].includes(requisitoAusente.tipo) || typeof requisitoAusente.id !== 'string' || !requisitoAusente.id.trim())) {
    throw new ErroLacunaCapacidade('requisitoAusente exige tipo artefato, interface ou representacao e id');
  }
  const contorno = entrada.contorno ?? null;
  if (contorno !== null && (!objeto(contorno) || Object.keys(contorno).sort(comparar).join(',') !== 'custo,descricao' || typeof contorno.descricao !== 'string' || !contorno.descricao.trim())) {
    throw new ErroLacunaCapacidade('contorno exige descrição e custo');
  }
  const classificacao = entrada.classificacao ?? null;
  if (classificacao !== null && !CLASSIFICACOES.has(classificacao)) throw new ErroLacunaCapacidade('classificação inválida');
  const candidatasCanonicas = candidatas.map((item, indice) => texto(item, `candidatas[${indice}]`)).sort(comparar);
  if (new Set(candidatasCanonicas).size !== candidatasCanonicas.length) throw new ErroLacunaCapacidade('candidatas não pode repetir capacidade');
  return congelar({
    formato: FORMATO_LACUNA_CAPACIDADE,
    id: texto(entrada.id, 'id'), objetivo: texto(entrada.objetivo, 'objetivo'),
    artefatos: conferirArtefatos(entrada.artefatos, 'artefatos', { saiObrigatorio: true }),
    interfaces: conferirArtefatos(entrada.interfaces ?? { entra: [], sai: [] }, 'interfaces'),
    requisitos: tipos(entrada.requisitos ?? [], 'requisitos'),
    candidatas: candidatasCanonicas,
    requisitoAusente: requisitoAusente ? { tipo: requisitoAusente.tipo, id: texto(requisitoAusente.id, 'requisitoAusente.id') } : null,
    contorno: contorno ? { descricao: texto(contorno.descricao, 'contorno.descricao'), custo: custo(contorno.custo, 'contorno.custo') } : null,
    recorrencia: inteiroNaoNegativo(entrada.recorrencia ?? 0, 'recorrencia'), classificacao,
  });
}

function conferirCatalogo(catalogo) {
  if (!catalogo || catalogo.formato !== FORMATO_CATALOGO || !Array.isArray(catalogo.operacoes)) throw new ErroLacunaCapacidade('planejador exige catálogo de capacidades');
  return catalogo.operacoes.map((operacao, indice) => ({
    id: texto(operacao?.id, `catálogo.operacoes[${indice}].id`), nome: texto(operacao?.nome, `catálogo.operacoes[${indice}].nome`),
    artefatos: conferirArtefatos(operacao?.artefatos, `catálogo.operacoes[${indice}].artefatos`),
    interfaces: conferirArtefatos(operacao?.interfaces ?? { entra: [], sai: [] }, `catálogo.operacoes[${indice}].interfaces`),
    requisitos: tipos(operacao?.requisitos ?? [], `catálogo.operacoes[${indice}].requisitos`),
    custo: custo(operacao?.custo ?? 1, `catálogo.operacoes[${indice}].custo`),
  })).sort((a, b) => comparar(a.id, b.id));
}
function inclui(todos, esperados) { return esperados.every((item) => todos.includes(item)); }
function estado(tiposDisponiveis) { return [...tiposDisponiveis].sort(comparar); }
function chave(artefatos, interfaces) { return `${estado(artefatos).join('\u0000')}\u0001${estado(interfaces).join('\u0000')}`; }
function faltantes(disponiveis, exigidos) { return exigidos.filter((item) => !disponiveis.includes(item)); }
function normalizarConsulta(consulta = {}) {
  if (!objeto(consulta)) throw new ErroLacunaCapacidade('consulta exige objeto');
  const permitidas = new Set(['artefatos', 'interfaces', 'requisitos', 'maxCusto', 'maxCadeias', 'pesos']);
  for (const chaveDaConsulta of Object.keys(consulta)) if (!permitidas.has(chaveDaConsulta)) throw new ErroLacunaCapacidade(`consulta não aceita '${chaveDaConsulta}'`);
  const pesos = consulta.pesos ?? {};
  if (!objeto(pesos)) throw new ErroLacunaCapacidade('pesos exige objeto por operação');
  const pesosCanonicos = Object.fromEntries(Object.entries(pesos).map(([id, valor]) => [texto(id, 'pesos.id'), custo(valor, `pesos.${id}`)]));
  return {
    artefatos: conferirArtefatos(consulta.artefatos, 'consulta.artefatos', { saiObrigatorio: true }),
    interfaces: conferirArtefatos(consulta.interfaces ?? { entra: [], sai: [] }, 'consulta.interfaces'),
    requisitos: tipos(consulta.requisitos ?? [], 'consulta.requisitos'),
    maxCusto: consulta.maxCusto === undefined ? 12 : custo(consulta.maxCusto, 'maxCusto'),
    maxCadeias: consulta.maxCadeias === undefined ? 8 : inteiroNaoNegativo(consulta.maxCadeias, 'maxCadeias'), pesos: pesosCanonicos,
  };
}

/* Busca apenas compatibilidade contratual. Não escolhe argumentos, forma ou estética. */
export function planejarCapacidades(catalogo, consulta = {}) {
  const operacoes = conferirCatalogo(catalogo), filtro = normalizarConsulta(consulta);
  const inicial = estado(filtro.artefatos.entra), interfacesIniciais = estado(filtro.interfaces.entra), descartes = new Map(), encontrados = [];
  const fila = [{ disponiveis: inicial, interfaces: interfacesIniciais, operacoes: [], custo: 0 }], melhor = new Map([[chave(inicial, interfacesIniciais), 0]]);
  while (fila.length && encontrados.length < filtro.maxCadeias) {
    fila.sort((a, b) => a.custo - b.custo || comparar(a.operacoes.map(({ id }) => id).join('\u0000'), b.operacoes.map(({ id }) => id).join('\u0000')) || comparar(chave(a.disponiveis, a.interfaces), chave(b.disponiveis, b.interfaces)));
    const atual = fila.shift();
    if (inclui(atual.disponiveis, filtro.artefatos.sai) && inclui(atual.interfaces, filtro.interfaces.sai)) {
      encontrados.push({ operacoes: atual.operacoes.map(({ id, nome }) => ({ id, nome })), custo: atual.custo, artefatos: { entra: inicial, sai: atual.disponiveis }, interfaces: { entra: interfacesIniciais, sai: atual.interfaces } });
      continue;
    }
    for (const operacao of operacoes) {
      const falta = faltantes(atual.disponiveis, operacao.artefatos.entra);
      if (falta.length) {
        descartes.set(`${operacao.id}\u0000${falta.join('\u0000')}`, { operacao: { id: operacao.id, nome: operacao.nome }, motivo: `exige artefatos ainda indisponíveis: ${falta.join(', ')}` });
        continue;
      }
      const interfaceAusente = faltantes(atual.interfaces, operacao.interfaces.entra);
      if (interfaceAusente.length) {
        descartes.set(`${operacao.id}\u0000interface\u0000${interfaceAusente.join('\u0000')}`, { operacao: { id: operacao.id, nome: operacao.nome }, motivo: `exige interfaces ainda indisponíveis: ${interfaceAusente.join(', ')}` });
        continue;
      }
      const requisitoAusente = faltantes(filtro.requisitos, operacao.requisitos);
      if (requisitoAusente.length) {
        descartes.set(`${operacao.id}\u0000requisito\u0000${requisitoAusente.join('\u0000')}`, { operacao: { id: operacao.id, nome: operacao.nome }, motivo: `exige requisitos não fornecidos: ${requisitoAusente.join(', ')}` });
        continue;
      }
      const proximos = estado(new Set([...atual.disponiveis, ...operacao.artefatos.sai]));
      const proximasInterfaces = estado(new Set([...atual.interfaces, ...operacao.interfaces.sai]));
      if (chave(proximos, proximasInterfaces) === chave(atual.disponiveis, atual.interfaces)) continue;
      const proximoCusto = atual.custo + (filtro.pesos[operacao.id] ?? operacao.custo);
      if (proximoCusto > filtro.maxCusto) continue;
      const chaveProxima = chave(proximos, proximasInterfaces), custoConhecido = melhor.get(chaveProxima);
      if (custoConhecido !== undefined && custoConhecido < proximoCusto) continue;
      if (custoConhecido === undefined || proximoCusto < custoConhecido) melhor.set(chaveProxima, proximoCusto);
      fila.push({ disponiveis: proximos, interfaces: proximasInterfaces, operacoes: [...atual.operacoes, operacao], custo: proximoCusto });
    }
  }
  return congelar({
    formato: FORMATO_PLANO_CAPACIDADES, objetivo: { artefatos: filtro.artefatos, interfaces: filtro.interfaces, requisitos: filtro.requisitos },
    cadeias: encontrados, descartes: [...descartes.values()].sort((a, b) => comparar(a.operacao.id, b.operacao.id) || comparar(a.motivo, b.motivo)),
    limites: { maxCusto: filtro.maxCusto, maxCadeias: filtro.maxCadeias },
    diagnostico: encontrados.length ? 'cadeias estruturalmente compatíveis encontradas; valide argumentos e geometria no executor' : 'nenhuma cadeia estruturalmente compatível dentro do orçamento',
  });
}

/* Uma lacuna não instala nem promove nada. A evidência de representação é sempre explícita. */
export function classificarLacunaCapacidade(catalogo, lacuna) {
  const registro = criarLacunaCapacidade(copiar(lacuna));
  const plano = planejarCapacidades(catalogo, { artefatos: registro.artefatos, interfaces: registro.interfaces, requisitos: registro.requisitos });
  const classificacao = plano.cadeias.length ? 'composicao' : registro.requisitoAusente?.tipo === 'representacao' ? 'representacao' : 'operacao-nativa';
  const fundamento = classificacao === 'composicao'
    ? 'há cadeia estrutural compatível; reutilize ou formalize composição antes de criar operação'
    : classificacao === 'representacao'
      ? 'o registro declara explicitamente que o requisito ausente é de representação'
      : 'não há cadeia estrutural compatível e não há evidência explícita de representação ausente';
  return congelar({ formato: FORMATO_CLASSIFICACAO_LACUNA, lacuna: registro.id, classificacao, fundamento, plano });
}

export function schemaDaLacunaCapacidade() {
  return congelar({
    $schema: 'https://json-schema.org/draft/2020-12/schema', $id: FORMATO_LACUNA_CAPACIDADE,
    type: 'object', additionalProperties: false,
    required: ['formato', 'id', 'objetivo', 'artefatos', 'interfaces', 'requisitos', 'candidatas', 'requisitoAusente', 'contorno', 'recorrencia', 'classificacao'],
    properties: {
      formato: { const: FORMATO_LACUNA_CAPACIDADE }, id: { type: 'string', minLength: 1 }, objetivo: { type: 'string', minLength: 1 },
      artefatos: { type: 'object', additionalProperties: false, required: ['entra', 'sai'], properties: { entra: { type: 'array', items: { type: 'string', minLength: 1 }, uniqueItems: true }, sai: { type: 'array', minItems: 1, items: { type: 'string', minLength: 1 }, uniqueItems: true } } },
      interfaces: { type: 'object', additionalProperties: false, required: ['entra', 'sai'], properties: { entra: { type: 'array', items: { type: 'string', minLength: 1 }, uniqueItems: true }, sai: { type: 'array', items: { type: 'string', minLength: 1 }, uniqueItems: true } } },
      requisitos: { type: 'array', items: { type: 'string', minLength: 1 }, uniqueItems: true },
      candidatas: { type: 'array', items: { type: 'string', minLength: 1 } },
      requisitoAusente: { anyOf: [{ type: 'null' }, { type: 'object', additionalProperties: false, required: ['tipo', 'id'], properties: { tipo: { enum: ['artefato', 'interface', 'representacao'] }, id: { type: 'string', minLength: 1 } } }] },
      contorno: { anyOf: [{ type: 'null' }, { type: 'object', additionalProperties: false, required: ['descricao', 'custo'], properties: { descricao: { type: 'string', minLength: 1 }, custo: { type: 'number', minimum: 0 } } }] },
      recorrencia: { type: 'integer', minimum: 0 }, classificacao: { anyOf: [{ type: 'null' }, { enum: [...CLASSIFICACOES] }] },
    },
  });
}
