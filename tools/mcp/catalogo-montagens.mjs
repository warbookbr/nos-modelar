/* catalogo-montagens.mjs — acesso MCP somente a raízes configuradas pelo host. */
import { lstatSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { resolverMontagemPersistida } from '../../src/autoria/resolver-montagem-persistida.js';
import { verificarCaminhoConfinado } from '../mecanifica/caminho-confinado.mjs';

export const FORMATO_CATALOGO_MCP_MONTAGENS = 'mecanifica.catalogo-mcp-montagens';
export const VERSAO_CATALOGO_MCP_MONTAGENS = 1;
export const VARIAVEL_CATALOGO_MCP_MONTAGENS = 'MECANIFICA_CATALOGO_MONTAGENS';
export const REGRA_ESCOPO_CATALOGO = 'A presença no catálogo significa apenas que o host incluiu o ID no escopo de operações do MCP. Ela permite usar as ferramentas anunciadas pelo perfil atual; por si só, não comprova homologação, aprovação, validação completa nem ausência de falhas.';

const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class ErroCatalogoMcpMontagens extends Error {
  constructor(codigo, mensagem, acao) {
    super(mensagem);
    this.name = 'ErroCatalogoMcpMontagens';
    this.codigo = codigo;
    this.acao = acao;
  }
}

function falhar(codigo, mensagem, acao) {
  throw new ErroCatalogoMcpMontagens(codigo, mensagem, acao);
}

function objetoSimples(valor) {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor)
    && Object.getPrototypeOf(valor) === Object.prototype;
}

function arquivoComum(caminho, codigo = 'configuracao-insegura') {
  let estado;
  try { estado = lstatSync(caminho); } catch {
    falhar(codigo, 'O catálogo configurado não pôde ser lido.', 'Revise a configuração do servidor MCP.');
  }
  if (!estado.isFile() || estado.isSymbolicLink()) {
    falhar(codigo, 'O catálogo exige arquivo comum, sem vínculo simbólico.', 'Use arquivo local comum na configuração do servidor.');
  }
}

function lerJsonConfinado(raiz, referencia, tipo) {
  const caminho = resolve(raiz, `${referencia}.json`);
  try {
    verificarCaminhoConfinado(caminho, { raiz });
    arquivoComum(caminho, 'referencia-indisponivel');
    return JSON.parse(readFileSync(caminho, 'utf8'));
  } catch (erro) {
    if (erro instanceof ErroCatalogoMcpMontagens) throw erro;
    falhar(
      'referencia-indisponivel',
      `Uma referência de ${tipo} pertencente ao escopo configurado não pôde ser carregada.`,
      'Revise o catálogo e os documentos persistidos sem alterar o ID pedido pelo agente.',
    );
  }
}

function validarRaizes(raizes) {
  if (!Array.isArray(raizes) || raizes.length === 0) {
    falhar('configuracao-invalida', 'O catálogo precisa declarar ao menos uma raiz.', 'Declare IDs de montagem explícitos na configuração.');
  }
  const vistas = new Set();
  const entradas = [];
  for (const entrada of raizes) {
    if (!objetoSimples(entrada) || Object.keys(entrada).sort().join(',') !== 'id,ref'
      || typeof entrada.id !== 'string' || !slug.test(entrada.id)
      || typeof entrada.ref !== 'string' || !slug.test(entrada.ref)) {
      falhar('configuracao-invalida', 'O catálogo contém ID de raiz inválido.', 'Use slugs sem caminhos na lista de raízes.');
    }
    if (vistas.has(entrada.id)) falhar('configuracao-invalida', 'O catálogo contém raiz duplicada.', 'Declare cada ID uma única vez.');
    vistas.add(entrada.id);
    entradas.push({ id: entrada.id, ref: entrada.ref });
  }
  return entradas.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

function percorrerPecas(montagem, visitar) {
  for (const instancia of montagem.instancias ?? []) {
    if (instancia.alvo.tipo === 'peca') visitar(instancia);
    else if (instancia.montagem) percorrerPecas(instancia.montagem, visitar);
  }
}

export function criarCatalogoMontagens({ raizMontagens, raizPecas, raizes, provedores = {} } = {}) {
  if (typeof raizMontagens !== 'string' || typeof raizPecas !== 'string') {
    falhar('configuracao-invalida', 'As raízes de montagens e peças são obrigatórias.', 'Configure os dois diretórios no host MCP.');
  }
  const montagens = resolve(raizMontagens);
  const pecas = resolve(raizPecas);
  const entradas = validarRaizes(raizes);
  const permitidas = new Map(entradas.map((entrada) => [entrada.id, entrada.ref]));

  async function ativaOuBase(tipo, ref, carregarBase) {
    const prover = tipo === 'montagem' ? provedores?.carregarMontagem : provedores?.carregarPeca;
    if (typeof prover === 'function') {
      const ativa = await prover.call(provedores, ref);
      if (ativa !== null && ativa !== undefined) return ativa;
    }
    return carregarBase();
  }

  function carregadores() {
    return {
      carregarMontagem: async (ref) => ativaOuBase(
        'montagem', ref, () => lerJsonConfinado(montagens, ref, 'montagem'),
      ),
      carregarPeca: async (ref) => ativaOuBase(
        'peca', ref, () => lerJsonConfinado(pecas, ref, 'peça'),
      ),
    };
  }

  async function resolverRaiz(id) {
    if (!permitidas.has(id)) {
      falhar('montagem-nao-encontrada', 'A montagem pedida não consta no catálogo.', 'Leia mecanifica://montagens e escolha um ID anunciado.');
    }
    try {
      const raizAtiva = await (typeof provedores?.carregarMontagem === 'function'
        ? provedores.carregarMontagem(id) : null);
      const raiz = raizAtiva ?? lerJsonConfinado(montagens, permitidas.get(id), 'montagem');
      const resolvida = await resolverMontagemPersistida(raiz, carregadores());
      if (resolvida.id !== id) {
        falhar('identidade-divergente', 'O ID interno da montagem diverge do catálogo.', 'Corrija o documento ou a entrada explícita do catálogo.');
      }
      return resolvida;
    } catch (erro) {
      if (erro instanceof ErroCatalogoMcpMontagens) throw erro;
      if (erro?.codigo) {
        falhar(
          erro.codigo,
          'Uma revisão ativa pertencente ao escopo configurado não pôde ser resolvida.',
          erro.acao ?? 'Inspecione e corrija a revisão ativa antes de continuar.',
        );
      }
      falhar('montagem-invalida', 'A montagem incluída no catálogo não pôde ser resolvida.', 'Valide montagem, referências e relações antes de tentar novamente.');
    }
  }

  async function listarPecas() {
    const refs = new Set();
    for (const entrada of entradas) {
      const montagem = await resolverRaiz(entrada.id);
      percorrerPecas(montagem, (instancia) => refs.add(instancia.alvo.ref));
    }
    return [...refs].sort();
  }

  async function resolverPeca(ref) {
    if (typeof ref !== 'string' || !slug.test(ref)) {
      falhar('peca-invalida', 'A peça precisa de um ID semântico.', 'Use um ID anunciado em mecanifica://pecas.');
    }
    const encontrados = [];
    for (const entrada of entradas) {
      const montagem = await resolverRaiz(entrada.id);
      percorrerPecas(montagem, (instancia) => {
        if (instancia.alvo.ref === ref) encontrados.push({ montagem: entrada.id, instancia });
      });
    }
    if (encontrados.length === 0) {
      falhar('peca-nao-encontrada', 'A peça pedida não está entre as peças das montagens listadas pelo host.', 'Leia mecanifica://pecas e escolha um ID anunciado.');
    }
    const primeiro = encontrados[0];
    return {
      id: ref,
      neutro: primeiro.instancia.definicao.neutro,
      montagens: [...new Set(encontrados.map(({ montagem }) => montagem))].sort(),
    };
  }

  return Object.freeze({
    configurado: true,
    listar() { return entradas.map(({ id }) => ({ id })); },
    listarPecas,
    resolverPeca,
    tem(id) { return permitidas.has(id); },
    carregadores,
    comProvedores(novosProvedores) {
      return criarCatalogoMontagens({
        raizMontagens: montagens,
        raizPecas: pecas,
        raizes: entradas,
        provedores: novosProvedores,
      });
    },
    async revalidarPeca(refPeca, candidata) {
      if (typeof refPeca !== 'string' || !slug.test(refPeca)) {
        falhar('peca-invalida', 'A peça candidata precisa de ID semântico.', 'Use um slug anunciado pela receita.');
      }
      const resultados = [];
      for (const entrada of entradas) {
        try {
          const raizAtiva = await (typeof provedores?.carregarMontagem === 'function'
            ? provedores.carregarMontagem(entrada.id) : null);
          const raiz = raizAtiva ?? lerJsonConfinado(montagens, entrada.ref, 'montagem');
          const base = carregadores();
          const resolvida = await resolverMontagemPersistida(raiz, {
            ...base,
            carregarPeca: async (ref) => ref === refPeca ? candidata : base.carregarPeca(ref),
          });
          let usa = false;
          const relacoes = [];
          const percorrer = (atual) => {
            for (const instancia of atual.instancias) {
              if (instancia.alvo.tipo === 'peca' && instancia.alvo.ref === refPeca) usa = true;
              if (instancia.montagem) percorrer(instancia.montagem);
            }
            for (const relacao of atual.relacoes ?? []) relacoes.push({ id: relacao.id, satisfeita: relacao.satisfeita, diagnosticos: relacao.diagnosticos });
          };
          percorrer(resolvida);
          resultados.push({ id: entrada.id, usa, estado: relacoes.every((item) => item.satisfeita) ? 'aprovada' : 'falhou', relacoes });
        } catch (erro) {
          resultados.push({ id: entrada.id, usa: null, estado: 'falhou', diagnostico: { codigo: erro?.codigo ?? 'montagem-invalida' } });
        }
      }
      return { cobertura: 'catalogo-explicito', peca: refPeca, raizes: resultados };
    },
    async resolver(id) {
      return resolverRaiz(id);
    },
  });
}

export function criarCatalogoMontagensVazio() {
  return Object.freeze({
    configurado: false,
    listar() { return []; },
    async listarPecas() { return []; },
    async resolverPeca() {
      falhar('peca-nao-encontrada', 'Não há peças disponíveis para inspeção.', `Configure ${VARIAVEL_CATALOGO_MCP_MONTAGENS} com uma montagem que o host deseja expor ao MCP.`);
    },
    tem() { return false; },
    carregadores() { return {}; },
    comProvedores() { return criarCatalogoMontagensVazio(); },
    async revalidarPeca() { return { cobertura: 'catalogo-ausente', raizes: [] }; },
    async resolver() {
      falhar('catalogo-nao-configurado', 'O servidor não possui catálogo de montagens configurado.', `Defina ${VARIAVEL_CATALOGO_MCP_MONTAGENS} ao iniciar o servidor.`);
    },
  });
}

export function carregarCatalogoMontagens(caminhoConfiguracao) {
  if (typeof caminhoConfiguracao !== 'string' || !caminhoConfiguracao || !isAbsolute(caminhoConfiguracao)) {
    falhar('configuracao-invalida', 'O caminho do catálogo precisa ser absoluto.', `Defina ${VARIAVEL_CATALOGO_MCP_MONTAGENS} com caminho absoluto.`);
  }
  const caminho = resolve(caminhoConfiguracao);
  arquivoComum(caminho);
  let dado;
  try { dado = JSON.parse(readFileSync(caminho, 'utf8')); } catch {
    falhar('configuracao-invalida', 'O catálogo configurado não é JSON válido.', 'Corrija a configuração antes de iniciar o MCP.');
  }
  if (!objetoSimples(dado)
    || dado.formato !== FORMATO_CATALOGO_MCP_MONTAGENS
    || dado.versao !== VERSAO_CATALOGO_MCP_MONTAGENS
    || typeof dado.raizMontagens !== 'string'
    || typeof dado.raizPecas !== 'string'
    || Object.keys(dado).sort().join(',') !== 'formato,raizMontagens,raizPecas,raizes,versao') {
    falhar('configuracao-invalida', 'O catálogo não atende ao contrato esperado.', `Use ${FORMATO_CATALOGO_MCP_MONTAGENS} v${VERSAO_CATALOGO_MCP_MONTAGENS}.`);
  }
  const base = dirname(caminho);
  return criarCatalogoMontagens({
    raizMontagens: resolve(base, dado.raizMontagens),
    raizPecas: resolve(base, dado.raizPecas),
    raizes: dado.raizes,
  });
}

export function catalogoMontagensDoAmbiente(ambiente = process.env) {
  const caminho = ambiente?.[VARIAVEL_CATALOGO_MCP_MONTAGENS];
  return caminho ? carregarCatalogoMontagens(caminho) : criarCatalogoMontagensVazio();
}
