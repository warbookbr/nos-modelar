/* catalogo-montagens.mjs — acesso MCP somente a raízes configuradas pelo host. */
import { lstatSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { resolverMontagemPersistida } from '../../src/autoria/resolver-montagem-persistida.js';
import { verificarCaminhoConfinado } from '../mecanifica/caminho-confinado.mjs';

export const FORMATO_CATALOGO_MCP_MONTAGENS = 'mecanifica.catalogo-mcp-montagens';
export const VERSAO_CATALOGO_MCP_MONTAGENS = 1;
export const VARIAVEL_CATALOGO_MCP_MONTAGENS = 'MECANIFICA_CATALOGO_MONTAGENS';

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
      `Uma referência de ${tipo} autorizada não pôde ser carregada.`,
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

export function criarCatalogoMontagens({ raizMontagens, raizPecas, raizes } = {}) {
  if (typeof raizMontagens !== 'string' || typeof raizPecas !== 'string') {
    falhar('configuracao-invalida', 'As raízes de montagens e peças são obrigatórias.', 'Configure os dois diretórios no host MCP.');
  }
  const montagens = resolve(raizMontagens);
  const pecas = resolve(raizPecas);
  const entradas = validarRaizes(raizes);
  const permitidas = new Map(entradas.map((entrada) => [entrada.id, entrada.ref]));

  return Object.freeze({
    configurado: true,
    listar() { return entradas.map(({ id }) => ({ id })); },
    tem(id) { return permitidas.has(id); },
    carregadores() {
      return {
        carregarMontagem: async (ref) => lerJsonConfinado(montagens, ref, 'montagem'),
        carregarPeca: async (ref) => lerJsonConfinado(pecas, ref, 'peça'),
      };
    },
    async revalidarPeca(refPeca, candidata) {
      if (typeof refPeca !== 'string' || !slug.test(refPeca)) {
        falhar('peca-invalida', 'A peça candidata precisa de ID semântico.', 'Use um slug anunciado pela receita.');
      }
      const resultados = [];
      for (const entrada of entradas) {
        try {
          const raiz = lerJsonConfinado(montagens, entrada.ref, 'montagem');
          const base = this.carregadores();
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
      if (!permitidas.has(id)) {
        falhar('montagem-nao-encontrada', 'A montagem pedida não consta no catálogo.', 'Leia mecanifica://montagens e escolha um ID anunciado.');
      }
      try {
        const raiz = lerJsonConfinado(montagens, permitidas.get(id), 'montagem');
        const resolvida = await resolverMontagemPersistida(raiz, this.carregadores());
        if (resolvida.id !== id) {
          falhar('identidade-divergente', 'O ID interno da montagem diverge do catálogo.', 'Corrija o documento ou a entrada explícita do catálogo.');
        }
        return resolvida;
      } catch (erro) {
        if (erro instanceof ErroCatalogoMcpMontagens) throw erro;
        falhar('montagem-invalida', 'A montagem autorizada não pôde ser resolvida.', 'Valide montagem, referências e relações antes de tentar novamente.');
      }
    },
  });
}

export function criarCatalogoMontagensVazio() {
  return Object.freeze({
    configurado: false,
    listar() { return []; },
    tem() { return false; },
    carregadores() { return {}; },
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
