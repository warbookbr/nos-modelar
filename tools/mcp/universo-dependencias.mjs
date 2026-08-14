/* universo-dependencias.mjs — universo canônico confiável para leitura MCP. */
import { lstatSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { consultarImpactoGlobal } from '../../src/autoria/consultar-impacto-global.js';
import { derivarMapaDependencias } from '../../src/autoria/derivar-mapa-dependencias.js';
import { lerUniversoAutoria } from '../../src/autoria/ler-universo-autoria.js';
import { criarSnapshotUniversoAutoria, serializarCanonico } from '../../src/autoria/snapshot-universo-autoria.js';
import { criarProvedoresAutoriaInativa } from '../mecanifica/autoria-ativa.mjs';
import { criarCarregadoresUniverso, sha256Canonico } from '../mecanifica/universo-autoria.mjs';

export const FORMATO_UNIVERSO_MCP_DEPENDENCIAS = 'mecanifica.universo-mcp-dependencias';
export const VERSAO_UNIVERSO_MCP_DEPENDENCIAS = 1;
export const VARIAVEL_UNIVERSO_MCP_DEPENDENCIAS = 'MECANIFICA_UNIVERSO_DEPENDENCIAS';

export class ErroUniversoMcpDependencias extends Error {
  constructor(codigo, mensagem, acao) {
    super(mensagem);
    this.name = 'ErroUniversoMcpDependencias';
    this.codigo = codigo;
    this.acao = acao;
  }
}

function falhar(codigo, mensagem, acao) {
  throw new ErroUniversoMcpDependencias(codigo, mensagem, acao);
}

function objetoSimples(valor) {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor)
    && Object.getPrototypeOf(valor) === Object.prototype;
}

function arquivoComum(caminho, codigo = 'configuracao-insegura') {
  let estado;
  try { estado = lstatSync(caminho); } catch {
    falhar(codigo, 'A configuração do universo não pôde ser lida.', 'Revise a configuração confiável do host MCP.');
  }
  if (!estado.isFile() || estado.isSymbolicLink()) {
    falhar(codigo, 'O universo exige arquivo comum, sem vínculo simbólico.', 'Use arquivo local comum na configuração do servidor.');
  }
}

function lerJson(caminho, codigo) {
  arquivoComum(caminho, codigo);
  try { return JSON.parse(readFileSync(caminho, 'utf8')); } catch {
    falhar(codigo, 'O JSON configurado não é válido.', 'Corrija a configuração antes de iniciar o servidor MCP.');
  }
}

function resumoDoMapa(mapa) {
  return {
    formato: 'mecanifica.resumo-dependencias-global',
    versao: 1,
    configurado: true,
    universo: {
      id: mapa.universo.id,
      entidades: mapa.entidades.length,
      raizes: mapa.raizes.map(({ id }) => ({ id })),
    },
    mapa: {
      formato: mapa.formato,
      versao: mapa.versao,
      sha256: sha256Canonico(serializarCanonico(mapa)),
    },
    cobertura: mapa.cobertura,
  };
}

export function criarUniversoDependencias({
  universo,
  raizMontagens,
  raizPecas,
  provedores = criarProvedoresAutoriaInativa(),
} = {}) {
  const documento = lerUniversoAutoria(universo);
  if (typeof raizMontagens !== 'string' || typeof raizPecas !== 'string') {
    falhar('configuracao-invalida', 'As raízes de montagens e peças são obrigatórias.', 'Configure os diretórios confiáveis no host MCP.');
  }
  const montagens = resolve(raizMontagens);
  const pecas = resolve(raizPecas);

  async function mapa() {
    const carregadores = criarCarregadoresUniverso({
      raizMontagens: montagens,
      raizPecas: pecas,
      provedores,
    });
    const snapshot = await criarSnapshotUniversoAutoria({
      universo: documento,
      ...carregadores,
      hash: sha256Canonico,
    });
    return derivarMapaDependencias(snapshot);
  }

  return Object.freeze({
    configurado: true,
    ids() {
      return {
        montagens: documento.montagens.map(({ id }) => id),
        pecas: documento.pecas.map(({ id }) => id),
      };
    },
    comProvedores(novosProvedores) {
      return criarUniversoDependencias({
        universo: documento,
        raizMontagens: montagens,
        raizPecas: pecas,
        provedores: novosProvedores,
      });
    },
    async resumo() { return resumoDoMapa(await mapa()); },
    async consultar(alvo) { return consultarImpactoGlobal(await mapa(), alvo); },
  });
}

export function criarUniversoDependenciasVazio() {
  return Object.freeze({
    configurado: false,
    ids() { return { montagens: [], pecas: [] }; },
    comProvedores() { return criarUniversoDependenciasVazio(); },
    async resumo() {
      return {
        formato: 'mecanifica.resumo-dependencias-global',
        versao: 1,
        configurado: false,
      };
    },
    async consultar() {
      falhar(
        'universo-nao-configurado',
        'O servidor não possui universo canônico de dependências configurado.',
        `Defina ${VARIAVEL_UNIVERSO_MCP_DEPENDENCIAS} ao iniciar o servidor.`,
      );
    },
  });
}

export function carregarUniversoDependencias(caminhoConfiguracao) {
  if (typeof caminhoConfiguracao !== 'string' || !caminhoConfiguracao || !isAbsolute(caminhoConfiguracao)) {
    falhar('configuracao-invalida', 'O caminho do universo precisa ser absoluto.', `Defina ${VARIAVEL_UNIVERSO_MCP_DEPENDENCIAS} com caminho absoluto.`);
  }
  const caminho = resolve(caminhoConfiguracao);
  const dado = lerJson(caminho, 'configuracao-invalida');
  if (!objetoSimples(dado)
    || dado.formato !== FORMATO_UNIVERSO_MCP_DEPENDENCIAS
    || dado.versao !== VERSAO_UNIVERSO_MCP_DEPENDENCIAS
    || typeof dado.universo !== 'string'
    || typeof dado.raizMontagens !== 'string'
    || typeof dado.raizPecas !== 'string'
    || Object.keys(dado).sort().join(',') !== 'formato,raizMontagens,raizPecas,universo,versao') {
    falhar('configuracao-invalida', 'A configuração não atende ao contrato do universo MCP.', `Use ${FORMATO_UNIVERSO_MCP_DEPENDENCIAS} v${VERSAO_UNIVERSO_MCP_DEPENDENCIAS}.`);
  }
  const base = dirname(caminho);
  return criarUniversoDependencias({
    universo: lerJson(resolve(base, dado.universo), 'universo-indisponivel'),
    raizMontagens: resolve(base, dado.raizMontagens),
    raizPecas: resolve(base, dado.raizPecas),
  });
}

export function universoDependenciasDoAmbiente(ambiente = process.env) {
  const caminho = ambiente?.[VARIAVEL_UNIVERSO_MCP_DEPENDENCIAS];
  return caminho ? carregarUniversoDependencias(caminho) : criarUniversoDependenciasVazio();
}
