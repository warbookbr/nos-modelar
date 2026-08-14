#!/usr/bin/env node
/* servidor.mjs — servidor MCP local stdio com revisão e autoria opt-in. */
import { fileURLToPath, pathToFileURL } from 'node:url';
import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod';
import { ferramentasRevisao } from './perfis/revisao.mjs';
import { criarFerramentasMontagem } from './perfis/montagens.mjs';
import { criarFerramentasImpactoGlobal } from './perfis/impacto-global.mjs';
import { criarFerramentasAutoria } from './perfis/autoria-montagens.mjs';
import { criarFerramentasAutoriaReceitas } from './perfis/autoria-receitas.mjs';
import { catalogoMontagensDoAmbiente } from './catalogo-montagens.mjs';
import { universoDependenciasDoAmbiente } from './universo-dependencias.mjs';
import {
  criarProvedoresAutoriaAtiva, criarProvedoresAutoriaInativa,
} from '../mecanifica/autoria-ativa.mjs';
import {
  PERFIL, TRANSPORTE, VERSAO_CONTRATO_MCP,
} from './contratos.mjs';
import { listarCatalogoDePacotes } from '../modelagem/formato-pacote.mjs';

const IDENTIDADE = Object.freeze({ name: 'mecanifica-mcp', version: '0.5.0' });

function estadoDo(ferramentas, catalogoMontagens, universoDependencias, perfil = PERFIL, autoria = {}) {
  return {
    contrato: VERSAO_CONTRATO_MCP,
    perfil,
    transporte: TRANSPORTE,
    ferramentas: ferramentas.map(({ nome }) => nome),
    catalogoMontagensConfigurado: catalogoMontagens.configurado,
    universoDependenciasConfigurado: universoDependencias.configurado,
    autoriaAtivaConfigurada: autoria.configurado === true,
    receitasAutorizadas: autoria.configurado ? [...(autoria.receitasAutorizadas ?? [])].sort() : [],
    capacidadesAusentes: [
      'promover_revisao',
      ...(perfil === 'autoria' ? ['autoria_de_javascript_arbitrario'] : ['escrita']),
      'materiais',
      'coordenacao',
      'servidor_http',
    ],
  };
}

function capacidadesDo(catalogoMontagens, universoDependencias, perfil = PERFIL) {
  return {
    perfil,
    consegue: [
      'descrever uma peça pela régua neutra existente',
      'validar um pacote oficial somente leitura',
      'comparar duas revisões oficiais do mesmo pacote',
      'produzir e transportar as quatro vistas oficiais de peça sem escrita',
      'descobrir pacotes e revisões oficiais disponíveis',
      'descobrir e descrever montagens explicitamente autorizadas',
      'derivar roteiro de revalidação e catálogo entre raízes escolhidas',
      ...(universoDependencias.configurado ? ['consultar impacto global no universo canônico configurado'] : []),
      'produzir vistas de montagem ou subárvore em memória',
      ...(perfil === 'autoria' ? ['planejar, inspecionar e publicar montagens autorizadas', 'planejar, executar, revalidar e publicar receitas declarativas autorizadas', 'reler revisões ativas pelas ferramentas comuns'] : []),
    ],
    aindaNaoConsegue: perfil === 'autoria'
      ? ['executar JavaScript arbitrário, editar materiais genéricos ou documentação', 'usar shell, Git ou servidor HTTP']
      : ['promover ou escrever revisões', 'editar ou materializar autoria, materiais ou documentação'],
    limites: [
      'aceita identificadores semânticos, nunca caminhos do cliente',
      'catálogo de montagens depende de configuração explícita do host',
      `catálogo de montagens configurado: ${catalogoMontagens.configurado ? 'sim' : 'não'}`,
      `universo canônico de dependências configurado: ${universoDependencias.configurado ? 'sim' : 'não'}`,
      'não executa shell, Git ou servidor HTTP',
      ...(perfil === 'autoria'
        ? ['autoria exige perfil e repositório local opt-in do host']
        : ['não escreve em pacotes, revisões, fontes ou documentação']),
    ],
  };
}

function textoDaResposta(nome, resposta) {
  if (resposta.ok) return `${nome}: operação concluída.`;
  return `${nome}: ${resposta.erro?.mensagem ?? 'operação recusada.'}`;
}

function respostaFalhaInterna(nome, erro) {
  process.stderr.write(`mecanifica-mcp: ${nome}: falha interna (${erro?.name ?? 'Error'}).\n`);
  return {
    ok: false,
    codigo: 1,
    erro: {
      codigo: erro instanceof z.ZodError ? 'entrada_recusada' : 'falha_interna',
      mensagem: erro instanceof z.ZodError
        ? 'A entrada não atende ao schema da ferramenta.'
        : 'A ferramenta não conseguiu concluir a operação.',
      acao: erro instanceof z.ZodError
        ? 'Corrija os campos conforme o schema anunciado em tools/list.'
        : 'Tente novamente; não altere os argumentos com base neste erro.',
    },
  };
}

function registrarPerfil(server, ferramentas) {
  for (const ferramenta of ferramentas) {
    server.registerTool(
      ferramenta.nome,
      {
        title: ferramenta.nome,
        description: ferramenta.descricao,
        inputSchema: ferramenta.inputSchema,
        outputSchema: ferramenta.outputSchema,
        annotations: ferramenta.anotacoes ?? { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      },
      async (entrada) => {
        try {
          const executado = await ferramenta.executar(entrada);
          const resposta = ferramenta.estruturar ? ferramenta.estruturar(executado) : executado;
          const content = ferramenta.conteudo
            ? ferramenta.conteudo(executado)
            : [{ type: 'text', text: textoDaResposta(ferramenta.nome, resposta) }];
          return {
            isError: !resposta.ok,
            content,
            structuredContent: resposta,
          };
        } catch (erro) {
          const resposta = respostaFalhaInterna(ferramenta.nome, erro);
          return {
            isError: true,
            content: [{ type: 'text', text: textoDaResposta(ferramenta.nome, resposta) }],
            structuredContent: resposta,
          };
        }
      },
    );
  }
}

function registrarRecursos(server, {
  ferramentas, catalogoMontagens, universoDependencias, perfil, autoria, provedoresAutoria,
}) {
  const estado = estadoDo(ferramentas, catalogoMontagens, universoDependencias, perfil, autoria);
  const capacidadesModelagem = capacidadesDo(catalogoMontagens, universoDependencias, perfil);
  server.registerResource(
    'estado',
    'mecanifica://estado',
    { title: 'Estado do servidor Mecanifica', description: 'Contrato e capacidades ativas.', mimeType: 'application/json' },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(estado) }] }),
  );
  server.registerResource(
    'resumo-dependencias-global',
    'mecanifica://dependencias',
    {
      title: 'Resumo do universo de dependências',
      description: 'Hash, cobertura e raízes do universo canônico configurado, sem mapa completo.',
      mimeType: 'application/json',
    },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(await universoDependencias.resumo()),
      }],
    }),
  );
  server.registerResource(
    'capacidades-modelagem',
    'mecanifica://capacidades/modelagem',
    { title: 'Capacidades de modelagem', description: 'Limites do perfil revisao.', mimeType: 'application/json' },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(capacidadesModelagem) }] }),
  );
  server.registerResource(
    'catalogo-pacotes',
    'mecanifica://pacotes',
    {
      title: 'Catálogo de pacotes',
      description: 'Pacotes e revisões oficiais disponíveis, somente leitura.',
      mimeType: 'application/json',
    },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify({
          formato: 'mecanifica.catalogo-pacotes',
          versao: 1,
          pacotes: listarCatalogoDePacotes(),
        }),
      }],
    }),
  );
  server.registerResource(
    'catalogo-montagens',
    'mecanifica://montagens',
    {
      title: 'Catálogo de montagens',
      description: 'Raízes explicitamente autorizadas pelo host, sem caminhos locais.',
      mimeType: 'application/json',
    },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify({
          formato: 'mecanifica.catalogo-mcp-montagens-publico',
          versao: 1,
          configurado: catalogoMontagens.configurado,
          raizes: catalogoMontagens.listar(),
        }),
      }],
    }),
  );
  server.registerResource(
    'autoria-ativa',
    'mecanifica://autoria',
    {
      title: 'Estado da autoria ativa',
      description: 'Revisões imutáveis que sobrepõem a base estática por identidade semântica.',
      mimeType: 'application/json',
    },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(await provedoresAutoria.estado()),
      }],
    }),
  );
}

function autoriaDoAmbiente(catalogoMontagens, universoDependencias, ambiente = process.env) {
  const raizRepositorio = ambiente?.MECANIFICA_REPOSITORIO_AUTORIA;
  if (!raizRepositorio || (!catalogoMontagens.configurado && !universoDependencias.configurado)) return { configurado: false };
  const receitasAutorizadas = new Set(String(ambiente?.MECANIFICA_RECEITAS_AUTORIZADAS ?? '')
    .split(',').map((item) => item.trim()).filter((item) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item)));
  return { configurado: true, raizRepositorio, catalogo: catalogoMontagens, receitasAutorizadas };
}

export function criarServidor({
  catalogoMontagens = catalogoMontagensDoAmbiente(),
  universoDependencias = universoDependenciasDoAmbiente(),
  perfil = process.env.MECANIFICA_PERFIL ?? PERFIL,
  autoria = autoriaDoAmbiente(catalogoMontagens, universoDependencias),
} = {}) {
  const server = new McpServer(IDENTIDADE);
  const idsUniverso = universoDependencias.ids();
  const provedoresAutoria = autoria.configurado
    ? criarProvedoresAutoriaAtiva({
      raizRepositorio: autoria.raizRepositorio,
      montagensAutorizadas: catalogoMontagens.listar().map(({ id }) => id),
      receitasAutorizadas: autoria.receitasAutorizadas,
    })
    : criarProvedoresAutoriaInativa();
  const provedoresUniverso = autoria.configurado
    ? criarProvedoresAutoriaAtiva({
      raizRepositorio: autoria.raizRepositorio,
      montagensAutorizadas: idsUniverso.montagens,
      receitasAutorizadas: idsUniverso.pecas,
    })
    : provedoresAutoria;
  const catalogoAtivo = autoria.configurado
    ? catalogoMontagens.comProvedores(provedoresAutoria)
    : catalogoMontagens;
  const universoAtivo = autoria.configurado
    ? universoDependencias.comProvedores(provedoresUniverso)
    : universoDependencias;
  const contextoAutoria = { ...autoria, catalogo: catalogoAtivo };
  const leitura = [
    ...ferramentasRevisao,
    ...criarFerramentasMontagem(catalogoAtivo),
    ...criarFerramentasImpactoGlobal(universoAtivo),
  ];
  const perfilAutoria = perfil === 'autoria' && autoria.configurado && catalogoMontagens.configurado;
  const ferramentas = perfilAutoria
    ? [...leitura, ...criarFerramentasAutoria(contextoAutoria), ...criarFerramentasAutoriaReceitas(contextoAutoria)]
    : leitura;
  registrarPerfil(server, ferramentas);
  registrarRecursos(server, {
    ferramentas,
    catalogoMontagens: catalogoAtivo,
    universoDependencias: universoAtivo,
    autoria: contextoAutoria,
    provedoresAutoria,
    perfil: perfilAutoria ? 'autoria' : PERFIL,
  });
  return server;
}

export function iniciarServidor() {
  return serveStdio(() => criarServidor(), {
    onerror: (erro) => process.stderr.write(`mecanifica-mcp: ${erro.message}\n`),
  });
}

const executadoComoCLI = process.argv[1]
  && pathToFileURL(fileURLToPath(import.meta.url)).href === pathToFileURL(process.argv[1]).href;
if (executadoComoCLI) iniciarServidor();
