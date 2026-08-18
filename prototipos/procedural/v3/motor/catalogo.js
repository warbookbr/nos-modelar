/* catálogo.js — projeções puras e determinísticas do registro de operações.
   Não executa receita, não lê arquivos e não conhece visor, MCP ou domínio. */
const FORMATO_CATALOGO = 'mecanifica.catalogo-capacidades@1';
const FORMATO_HIPERGRAFO = 'mecanifica.hipergrafo-capacidades@1';

function comparar(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
function texto(valor, nome) {
  if (valor == null) return null;
  if (typeof valor !== 'string' || !valor.trim()) throw new TypeError(`${nome} precisa ser texto não vazio`);
  return valor.trim().toLocaleLowerCase('pt-BR');
}
function lista(valor, nome) {
  if (valor == null) return null;
  const valores = Array.isArray(valor) ? valor : [valor];
  return valores.map((item) => texto(item, nome)).sort(comparar);
}
function copiarOperacao(operacao) {
  return {
    id: operacao.id, nome: operacao.nome, versao: operacao.versao,
    categoria: operacao.categoria, artefatos: {
      entra: [...(operacao.artefatos?.entra ?? [])].sort(comparar),
      sai: [...(operacao.artefatos?.sai ?? [])].sort(comparar),
    },
    efeitos: [...(operacao.efeitos ?? [])].sort(comparar), identidade: operacao.identidade,
  };
}

/* A configuração é a fonte; catálogo é somente uma projeção serializável dela. */
export function catalogoDeCapacidades(registro) {
  if (!registro || registro.formato !== 'mecanifica.registro-operacoes@1' || !Array.isArray(registro.manifesto)) {
    throw new TypeError('catálogo exige registro explícito de operações');
  }
  const modulos = registro.manifesto.map((modulo) => ({
    id: modulo.id, versao: modulo.versao,
    requer: [...(modulo.requer ?? [])].map(({ id, versao }) => versao ? { id, versao } : { id }).sort((a, b) => comparar(a.id, b.id)),
    operacoes: modulo.operacoes.map(copiarOperacao).sort((a, b) => comparar(a.id, b.id)),
  })).sort((a, b) => comparar(a.id, b.id));
  const operacoes = modulos.flatMap(({ operacoes: itens }) => itens).sort((a, b) => comparar(a.id, b.id));
  return Object.freeze({ formato: FORMATO_CATALOGO, assinatura: registro.assinatura, modulos, operacoes });
}

function conferirCatalogo(catalogo) {
  if (!catalogo || catalogo.formato !== FORMATO_CATALOGO || !Array.isArray(catalogo.operacoes)) {
    throw new TypeError('operação exige catálogo de capacidades');
  }
}
function incluiTodos(haystack, needles) { return !needles || needles.every((item) => haystack.includes(item)); }

/* Busca declarativa: encontra contratos; não promete que uma receita concreta é válida. */
export function buscarCapacidades(catalogo, consulta = {}) {
  conferirCatalogo(catalogo);
  if (!consulta || typeof consulta !== 'object' || Array.isArray(consulta)) throw new TypeError('consulta precisa ser objeto');
  const filtros = {
    texto: texto(consulta.texto, 'consulta.texto'),
    consome: lista(consulta.consome, 'consulta.consome'), produz: lista(consulta.produz, 'consulta.produz'),
    efeito: lista(consulta.efeito, 'consulta.efeito'), identidade: texto(consulta.identidade, 'consulta.identidade'),
  };
  const operacoes = catalogo.operacoes.filter((operacao) => {
    const corpus = [operacao.id, operacao.nome, operacao.categoria, operacao.identidade, ...operacao.efeitos, ...operacao.artefatos.entra, ...operacao.artefatos.sai]
      .join(' ').toLocaleLowerCase('pt-BR');
    return (!filtros.texto || corpus.includes(filtros.texto))
      && incluiTodos(operacao.artefatos.entra.map((item) => item.toLocaleLowerCase('pt-BR')), filtros.consome)
      && incluiTodos(operacao.artefatos.sai.map((item) => item.toLocaleLowerCase('pt-BR')), filtros.produz)
      && incluiTodos(operacao.efeitos.map((item) => item.toLocaleLowerCase('pt-BR')), filtros.efeito)
      && (!filtros.identidade || operacao.identidade.toLocaleLowerCase('pt-BR') === filtros.identidade);
  }).map(copiarOperacao);
  return { formato: 'mecanifica.busca-capacidades@1', consulta: filtros, total: operacoes.length, operacoes };
}

export function explicarCapacidade(catalogo, identificador) {
  conferirCatalogo(catalogo);
  const termo = texto(identificador, 'identificador');
  const exata = catalogo.operacoes.find((operacao) => operacao.id.toLocaleLowerCase('pt-BR') === termo || operacao.nome.toLocaleLowerCase('pt-BR') === termo);
  if (exata) return { formato: 'mecanifica.explicacao-capacidade@1', encontrada: true, operacao: copiarOperacao(exata) };
  const candidatas = buscarCapacidades(catalogo, { texto: termo }).operacoes.map(({ id, nome }) => ({ id, nome }));
  return {
    formato: 'mecanifica.explicacao-capacidade@1', encontrada: false, identificador,
    diagnostico: candidatas.length ? 'não há correspondência exata; veja candidatas' : 'capacidade não registrada', candidatas,
  };
}

/* O tipo da malha entra e sai de transformações; a projeção por arcos teria
   ciclos. O contrato correto é, portanto, hipergrafo direcionado, não DAG falso. */
export function hipergrafoDeCapacidades(catalogo) {
  conferirCatalogo(catalogo);
  const tipos = new Set(catalogo.operacoes.flatMap((operacao) => [...operacao.artefatos.entra, ...operacao.artefatos.sai]));
  const nos = [
    ...[...tipos].sort(comparar).map((tipo) => ({ id: `artefato:${tipo}`, tipo: 'artefato', artefato: tipo })),
    ...catalogo.operacoes.map((operacao) => ({ id: operacao.id, tipo: 'operacao', nome: operacao.nome })),
  ].sort((a, b) => comparar(a.id, b.id));
  const hiperarestas = catalogo.operacoes.map((operacao) => ({
    id: `contrato:${operacao.id}`, operacao: operacao.id,
    entra: operacao.artefatos.entra.map((tipo) => `artefato:${tipo}`), sai: operacao.artefatos.sai.map((tipo) => `artefato:${tipo}`),
  })).sort((a, b) => comparar(a.id, b.id));
  return { formato: FORMATO_HIPERGRAFO, assinatura: catalogo.assinatura, nos, hiperarestas };
}

export { FORMATO_CATALOGO, FORMATO_HIPERGRAFO };
