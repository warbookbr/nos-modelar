#!/usr/bin/env node
/* servidor.mjs — servidor MCP local stdio do perfil revisao, sem escrita. */
import { fileURLToPath, pathToFileURL } from 'node:url';
import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod';
import { ferramentasRevisao } from './perfis/revisao.mjs';
import {
  PERFIL, TRANSPORTE, VERSAO_CONTRATO_MCP,
} from './contratos.mjs';
import { listarCatalogoDePacotes } from '../modelagem/formato-pacote.mjs';

const IDENTIDADE = Object.freeze({ name: 'mecanifica-mcp', version: '0.2.0' });

const estado = Object.freeze({
  contrato: VERSAO_CONTRATO_MCP,
  perfil: PERFIL,
  transporte: TRANSPORTE,
  ferramentas: ferramentasRevisao.map(({ nome }) => nome),
  capacidadesAusentes: [
    'promover_revisao',
    'autoria',
    'materiais',
    'coordenacao',
    'servidor_http',
  ],
});

const capacidadesModelagem = Object.freeze({
  perfil: PERFIL,
  consegue: [
    'descrever uma peça pela régua neutra existente',
    'validar um pacote oficial somente leitura',
    'comparar duas revisões oficiais do mesmo pacote',
    'produzir e transportar as quatro vistas oficiais sem escrita',
    'descobrir pacotes e revisões oficiais disponíveis',
  ],
  aindaNaoConsegue: [
    'promover ou escrever revisões',
    'editar autoria, materiais ou documentação',
  ],
  limites: [
    'aceita identificadores, nunca caminhos do cliente',
    'não executa shell, Git ou servidor HTTP',
    'não escreve em pacotes, revisões, fontes ou documentação',
  ],
});

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

function registrarPerfil(server) {
  for (const ferramenta of ferramentasRevisao) {
    server.registerTool(
      ferramenta.nome,
      {
        title: ferramenta.nome,
        description: ferramenta.descricao,
        inputSchema: ferramenta.inputSchema,
        outputSchema: ferramenta.outputSchema,
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
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

function registrarRecursos(server) {
  server.registerResource(
    'estado',
    'mecanifica://estado',
    { title: 'Estado do servidor Mecanifica', description: 'Contrato e capacidades ativas.', mimeType: 'application/json' },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(estado) }] }),
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
}

export function criarServidor() {
  const server = new McpServer(IDENTIDADE);
  registrarPerfil(server);
  registrarRecursos(server);
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
