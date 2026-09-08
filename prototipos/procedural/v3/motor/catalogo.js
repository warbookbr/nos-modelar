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
function limite(valor) {
  if (valor == null) return null;
  if (!Number.isSafeInteger(valor) || valor < 1 || valor > 100) throw new TypeError('consulta.limite precisa ser inteiro entre 1 e 100');
  return valor;
}
function copiar(valor) { return valor == null ? valor : JSON.parse(JSON.stringify(valor)); }
function usoCompacto(uso) {
  if (!uso) return null;
  return {
    intencao: uso.intencao,
    schema: uso.schema ?? uso.schemaArgumentos?.$id ?? null,
    obrigatorios: [...(uso.obrigatorios ?? uso.schemaArgumentos?.required ?? [])],
  };
}
function copiarOperacao(operacao) {
  return {
    id: operacao.id, nome: operacao.nome, versao: operacao.versao,
    categoria: operacao.categoria, artefatos: {
      entra: [...(operacao.artefatos?.entra ?? [])].sort(comparar),
      sai: [...(operacao.artefatos?.sai ?? [])].sort(comparar),
    },
    interfaces: {
      entra: [...(operacao.interfaces?.entra ?? [])].sort(comparar),
      sai: [...(operacao.interfaces?.sai ?? [])].sort(comparar),
    },
    requisitos: [...(operacao.requisitos ?? [])].sort(comparar),
    custo: operacao.custo ?? 1,
    efeitos: [...(operacao.efeitos ?? [])].sort(comparar), identidade: operacao.identidade,
    uso: usoCompacto(operacao.uso),
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
    limite: limite(consulta.limite), cursor: texto(consulta.cursor, 'consulta.cursor'),
  };
  const encontradas = catalogo.operacoes.filter((operacao) => {
    const corpus = [operacao.id, operacao.nome, operacao.categoria, operacao.identidade, operacao.uso?.intencao, ...(operacao.uso?.obrigatorios ?? []), ...operacao.efeitos, ...operacao.artefatos.entra, ...operacao.artefatos.sai, ...operacao.interfaces.entra, ...operacao.interfaces.sai, ...operacao.requisitos]
      .filter(Boolean)
      .join(' ').toLocaleLowerCase('pt-BR');
    return (!filtros.texto || corpus.includes(filtros.texto))
      && incluiTodos(operacao.artefatos.entra.map((item) => item.toLocaleLowerCase('pt-BR')), filtros.consome)
      && incluiTodos(operacao.artefatos.sai.map((item) => item.toLocaleLowerCase('pt-BR')), filtros.produz)
      && incluiTodos(operacao.efeitos.map((item) => item.toLocaleLowerCase('pt-BR')), filtros.efeito)
      && (!filtros.identidade || operacao.identidade.toLocaleLowerCase('pt-BR') === filtros.identidade);
  });
  const depoisDoCursor = filtros.cursor
    ? encontradas.filter(({ id }) => id.toLocaleLowerCase('pt-BR') > filtros.cursor)
    : encontradas;
  const operacoes = depoisDoCursor.slice(0, filtros.limite ?? depoisDoCursor.length).map(copiarOperacao);
  const truncado = operacoes.length < depoisDoCursor.length;
  return {
    formato: 'mecanifica.busca-capacidades@1', consulta: filtros,
    total: encontradas.length, retornadas: operacoes.length,
    omitidas: depoisDoCursor.length - operacoes.length, truncado,
    proximoCursor: truncado ? operacoes.at(-1)?.id ?? null : null,
    operacoes,
    diagnostico: encontradas.length === 0 ? diagnosticarBuscaVazia(catalogo, filtros) : null,
  };
}

/**
 * Por que a busca voltou vazia.
 *
 * POR QUE ISTO EXISTE (achado modelando a bicicleta): `texto: 'tubo cilindro
 * caminho'` devolveu zero e `texto: 'cilindro'` devolveu um. O `texto` é
 * casado como UMA substring do corpus, então frase com mais de uma palavra
 * praticamente nunca casa — e quem pergunta recebe uma lista vazia idêntica à
 * de um catálogo que realmente não tem nada, sem nenhum sinal de que a palavra
 * a mais foi o que zerou.
 *
 * Zero resultados é uma resposta legítima; zero resultados SEM MOTIVO é a mesma
 * família do no-op silencioso: a ferramenta sabe a causa e não conta. Aqui ela
 * conta qual termo existe no índice sozinho e qual não existe.
 *
 * Isto NÃO muda o casamento. Trocar substring por conjunção mudaria o que toda
 * consulta existente devolve, e é decisão separada — o diagnóstico deixa a
 * decisão informada em vez de tomá-la por conta própria.
 */
function diagnosticarBuscaVazia(catalogo, filtros) {
  if (!filtros.texto) return { motivo: 'sem-correspondencia', termos: [], sugestao: null };
  const termos = filtros.texto.split(/\s+/).filter(Boolean);
  if (termos.length < 2) return { motivo: 'sem-correspondencia', termos: [], sugestao: null };

  const porTermo = termos.map((termo) => ({
    termo,
    operacoes: buscarCapacidades(catalogo, { texto: termo }).total,
  }));
  const acham = porTermo.filter(({ operacoes }) => operacoes > 0);
  return {
    motivo: 'texto-casa-como-frase-inteira',
    termos: porTermo,
    sugestao: acham.length ? acham[0].termo : null,
    explicacao: acham.length
      ? `'${filtros.texto}' é procurado como frase única, não como conjunto de palavras.`
        + ` Sozinho(s), ${acham.map(({ termo, operacoes }) => `'${termo}' acha ${operacoes}`).join(', ')};`
        + ` ${porTermo.filter(({ operacoes }) => operacoes === 0).map(({ termo }) => `'${termo}'`).join(', ')} não está no índice.`
      : `nenhuma das palavras de '${filtros.texto}' está no índice, nem sozinha.`,
  };
}

export function explicarCapacidade(catalogo, identificador, { registro = null } = {}) {
  conferirCatalogo(catalogo);
  const termo = texto(identificador, 'identificador');
  const exata = catalogo.operacoes.find((operacao) => operacao.id.toLocaleLowerCase('pt-BR') === termo || operacao.nome.toLocaleLowerCase('pt-BR') === termo);
  if (exata) {
    const operacao = copiarOperacao(exata);
    const registrada = registro?.resolver?.(exata.id) ?? null;
    if (registrada?.uso) operacao.uso = copiar(registrada.uso);
    return { formato: 'mecanifica.explicacao-capacidade@1', encontrada: true, operacao };
  }
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
