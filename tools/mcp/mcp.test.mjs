/* mcp.test.mjs — contrato real de stdio, catálogo, recursos e ferramentas MCP. */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client, LATEST_PROTOCOL_VERSION } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { descreverPecaReutilizavel, PECAS_DISPONIVEIS } from '../mecanifica/descrever-peca.mjs';
import { olharBancada } from '../mecanifica/olhar-bancada.mjs';
import { validarPacoteNoDisco } from '../modelagem/validar-pacote.mjs';
import { compararRevisoes } from '../modelagem/revisao-modelagem.mjs';
import { listarCatalogoDePacotes, serializarCanonico } from '../modelagem/formato-pacote.mjs';
import {
  comparar, conteudoRenderizacao, descrever, LIMITES_VISTAS, renderizar,
  resumoComparacao, resumoDescricao, resumoTotais, validar,
} from './perfis/revisao.mjs';
import {
  catalogarMontagens, conteudoRenderizacaoMontagem, descreverMontagem,
  LIMITES_VISTAS_MONTAGEM, planejarRevalidacao, renderizarMontagem,
} from './perfis/montagens.mjs';
import {
  catalogarMontagensSaida, compararSaida, descreverMontagemSaida, descreverSaida,
  consultarImpactoGlobalSaida, renderizarMontagemSaida, renderizarSaida, revalidarMontagemSaida, validarSaida,
} from './contratos.mjs';
import {
  carregarCatalogoMontagens, VARIAVEL_CATALOGO_MCP_MONTAGENS,
} from './catalogo-montagens.mjs';
import { VARIAVEL_UNIVERSO_MCP_DEPENDENCIAS } from './universo-dependencias.mjs';
import * as EIXO_AUTORIA from '../../autoria-assistida/experimentos/autoria-geometrica-do-zero/receitas/eixo-guia.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '../..');
const SERVIDOR = join(RAIZ, 'tools/mcp/servidor.mjs');
const CONFIGURACAO_MONTAGENS = join(RAIZ, 'tools/mcp/fixtures/catalogo-montagens.json');
const CONFIGURACAO_UNIVERSO = join(RAIZ, 'tools/mcp/fixtures/universo-dependencias.json');
const CONFIGURACAO_CATALOGO_MAPA = join(RAIZ, 'tools/mcp/fixtures/catalogo-mapa-dependencias.json');
const MONTAGEM_AUTORIA = JSON.parse(readFileSync(join(RAIZ, 'tools/mecanifica/fixtures/montagens-persistidas/v3-separacao-direcional.json'), 'utf8'));
const MONTAGEM_SISTEMA_A = JSON.parse(readFileSync(join(RAIZ, 'tools/mecanifica/fixtures/mapa-dependencias/montagens/sistema-a.json'), 'utf8'));
const MATERIALIZAR_CATALOGO_AUTORIA = join(RAIZ, 'autoria-assistida/experimentos/autoria-geometrica-do-zero/materializar-catalogo.mjs');
const receitaEixo = (fim) => ({
  formato: 'mecanifica.receita-declarativa', versao: 1, id: 'eixo-guia',
  params: { ...EIXO_AUTORIA.PARAMS, fim, comprimento: fim - EIXO_AUTORIA.PARAMS.inicio },
  topo: EIXO_AUTORIA.TOPO, passos: EIXO_AUTORIA.PASSOS,
  materiais: EIXO_AUTORIA.MATERIAIS, aliases: EIXO_AUTORIA.ALIASES,
  meta: { nome: 'eixo-guia', desc: 'eixo declarativo do experimento' },
});
const CATALOGO_MONTAGENS = carregarCatalogoMontagens(CONFIGURACAO_MONTAGENS);
const tamanhosStructured = {};
let configuracaoAnterior;
let universoAnterior;

beforeAll(() => {
  configuracaoAnterior = process.env[VARIAVEL_CATALOGO_MCP_MONTAGENS];
  universoAnterior = process.env[VARIAVEL_UNIVERSO_MCP_DEPENDENCIAS];
  process.env[VARIAVEL_CATALOGO_MCP_MONTAGENS] = CONFIGURACAO_MONTAGENS;
  process.env[VARIAVEL_UNIVERSO_MCP_DEPENDENCIAS] = CONFIGURACAO_UNIVERSO;
});

afterAll(() => {
  if (configuracaoAnterior === undefined) delete process.env[VARIAVEL_CATALOGO_MCP_MONTAGENS];
  else process.env[VARIAVEL_CATALOGO_MCP_MONTAGENS] = configuracaoAnterior;
  if (universoAnterior === undefined) delete process.env[VARIAVEL_UNIVERSO_MCP_DEPENDENCIAS];
  else process.env[VARIAVEL_UNIVERSO_MCP_DEPENDENCIAS] = universoAnterior;
});

function clienteStdio() {
  const processo = spawn(process.execPath, [SERVIDOR], { cwd: RAIZ, stdio: ['pipe', 'pipe', 'pipe'] });
  let buffer = '';
  let proximoId = 1;
  let stderr = '';
  const respostas = new Map();
  const stdoutNaoProtocolar = [];
  processo.stderr.setEncoding('utf8');
  processo.stderr.on('data', (chunk) => { stderr += chunk; });
  processo.stdout.setEncoding('utf8');
  processo.stdout.on('data', (chunk) => {
    buffer += chunk;
    let quebra;
    while ((quebra = buffer.indexOf('\n')) >= 0) {
      const linha = buffer.slice(0, quebra).trim();
      buffer = buffer.slice(quebra + 1);
      if (!linha) continue;
      let mensagem;
      try { mensagem = JSON.parse(linha); } catch { stdoutNaoProtocolar.push(linha); continue; }
      const pendente = respostas.get(mensagem.id);
      if (pendente) {
        respostas.delete(mensagem.id);
        pendente.resolve(mensagem);
      }
    }
  });
  processo.on('close', () => {
    for (const { reject } of respostas.values()) reject(new Error('servidor encerrou antes da resposta.'));
    respostas.clear();
  });
  function enviar(method, params = {}) {
    const id = proximoId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        respostas.delete(id);
        reject(new Error(`tempo esgotado para ${method}`));
      }, 5_000);
      respostas.set(id, {
        resolve: (mensagem) => { clearTimeout(timer); resolve(mensagem); },
        reject: (erro) => { clearTimeout(timer); reject(erro); },
      });
      processo.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
    });
  }
  function notificar(method, params = {}) {
    processo.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method, params })}\n`);
  }
  async function fechar() {
    processo.stdin.end();
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('servidor não encerrou')), 5_000);
      processo.once('close', (codigo, sinal) => {
        clearTimeout(timer);
        if (codigo !== 0 && sinal === null) reject(new Error(`servidor encerrou com código ${codigo}`));
        else resolve();
      });
    });
    return { stderr, stdoutNaoProtocolar };
  }
  return { enviar, notificar, fechar, processo };
}

async function conectado() {
  const cliente = clienteStdio();
  const inicializacao = await cliente.enviar('initialize', {
    protocolVersion: LATEST_PROTOCOL_VERSION,
    capabilities: {},
    clientInfo: { name: 'teste-mecanifica', version: '1' },
  });
  cliente.notificar('notifications/initialized');
  return { cliente, inicializacao };
}

describe('servidor MCP local — perfil revisao', () => {
  it('importa sem iniciar stdio nem escrever', () => {
    const resultado = spawnSync(process.execPath, ['--input-type=module', '-e', `import(${JSON.stringify(SERVIDOR)})`], {
      cwd: RAIZ, encoding: 'utf8', timeout: 5_000,
    });
    expect(resultado.status).toBe(0);
    expect(resultado.stdout).toBe('');
    expect(resultado.stderr).toBe('');
  });

  it('valida initialize com o cliente oficial e a versão oficial do protocolo', async () => {
    const client = new Client({ name: 'teste-mecanifica', version: '1' });
    const transport = new StdioClientTransport({
      command: process.execPath, args: [SERVIDOR], cwd: RAIZ, stderr: 'pipe',
      env: {
        [VARIAVEL_CATALOGO_MCP_MONTAGENS]: CONFIGURACAO_MONTAGENS,
        [VARIAVEL_UNIVERSO_MCP_DEPENDENCIAS]: CONFIGURACAO_UNIVERSO,
      },
    });
    try {
      await client.connect(transport);
      expect(client.getServerVersion()).toEqual({ name: 'mecanifica-mcp', version: '0.5.0' });
      expect(client.getNegotiatedProtocolVersion()).toBe(LATEST_PROTOCOL_VERSION);
      expect(client.getServerCapabilities()).toEqual({
        tools: { listChanged: true }, resources: { listChanged: true },
      });
    } finally {
      await client.close();
    }
  });

  it('faz handshake bruto, anuncia nove tools e seis resources somente leitura', async () => {
    const { cliente, inicializacao } = await conectado();
    try {
      expect(inicializacao.result.serverInfo).toEqual({ name: 'mecanifica-mcp', version: '0.5.0' });
      expect(inicializacao.result.capabilities).toEqual({
        tools: { listChanged: true }, resources: { listChanged: true },
      });
      const ferramentas = await cliente.enviar('tools/list');
      expect(ferramentas.result.tools.map((tool) => tool.name)).toEqual([
        'descrever_peca', 'validar_pacote', 'comparar_revisoes', 'renderizar_vistas',
        'descrever_montagem', 'planejar_revalidacao_montagem', 'catalogar_montagens', 'renderizar_montagem', 'consultar_impacto_global',
      ]);
      expect(ferramentas.result.tools).toHaveLength(9);
      for (const tool of ferramentas.result.tools) {
        expect(tool.outputSchema).toBeDefined();
        expect(tool.annotations).toMatchObject({ readOnlyHint: true, destructiveHint: false });
      }
      const recursos = await cliente.enviar('resources/list');
      expect(recursos.result.resources.map((resource) => resource.uri)).toEqual([
        'mecanifica://estado', 'mecanifica://dependencias', 'mecanifica://capacidades/modelagem',
        'mecanifica://pacotes', 'mecanifica://montagens', 'mecanifica://autoria',
      ]);
      expect(recursos.result.resources).toHaveLength(6);
    } finally {
      await cliente.fechar();
    }
  });

  it('valida as três respostas reais com o outputSchema do cliente oficial', async () => {
    const client = new Client({ name: 'teste-mecanifica', version: '1' });
    const transport = new StdioClientTransport({
      command: process.execPath, args: [SERVIDOR], cwd: RAIZ, stderr: 'pipe',
      env: { [VARIAVEL_CATALOGO_MCP_MONTAGENS]: CONFIGURACAO_MONTAGENS },
    });
    try {
      await client.connect(transport);
      const chamadas = [
        ['descrever_peca', { peca: '_jardineira', casas: 3 }],
        ['validar_pacote', { id: 'homologacao-mancal' }],
        ['comparar_revisoes', { id: 'prova-caixote', anterior: 'r001', posterior: 'r002' }],
      ];
      for (const [name, arguments_] of chamadas) {
        const resultado = await client.callTool({ name, arguments: arguments_ });
        expect(resultado.isError).not.toBe(true);
        tamanhosStructured[name] = Buffer.byteLength(JSON.stringify(resultado.structuredContent), 'utf8');
      }
    } finally {
      await client.close();
    }
  });

  it('chama descrever_peca real, retorna structuredContent e preserva a régua', async () => {
    const esperado = await descreverPecaReutilizavel({ peca: '_jardineira', casas: 3 });
    const { cliente } = await conectado();
    try {
      const resposta = await cliente.enviar('tools/call', { name: 'descrever_peca', arguments: { peca: '_jardineira', casas: 3 } });
      expect(resposta.error).toBeUndefined();
      expect(resposta.result.isError).toBe(false);
      expect(resposta.result.structuredContent).toEqual({
        ok: true, codigo: esperado.codigo,
        resultado: { peca: '_jardineira', descricao: resumoDescricao(esperado.resultado.descricao) },
      });
      tamanhosStructured.descrever_peca = Buffer.byteLength(JSON.stringify(resposta.result.structuredContent), 'utf8');
      expect(resposta.result.content).toEqual([{ type: 'text', text: 'descrever_peca: operação concluída.' }]);
    } finally {
      await cliente.fechar();
    }
  }, 20_000);

  it('prova o contrato de descrição em todo o acervo sem abrir outro servidor', async () => {
    for (const peca of PECAS_DISPONIVEIS) {
      const resposta = await descrever({ peca });
      descreverSaida.parse(resposta);
      expect(resposta.erro?.codigo).not.toBe('falha_interna');
    }
    expect(PECAS_DISPONIVEIS).toHaveLength(38);
  }, 120_000);

  it('valida pacote existente pelo serviço real e lê somente o resumo', async () => {
    const esperado = await validarPacoteNoDisco('homologacao-mancal');
    const { cliente } = await conectado();
    try {
      const resposta = await cliente.enviar('tools/call', { name: 'validar_pacote', arguments: { id: 'homologacao-mancal' } });
      expect(resposta.result.structuredContent).toEqual({
        ok: true, codigo: 0,
        resultado: {
          id: 'homologacao-mancal', modo: esperado.modo, peca: esperado.peca,
          partes: esperado.partes, bytes: esperado.bytes,
          alvo: {
            peca: esperado.alvo.peca, partes: esperado.alvo.partes,
            totais: resumoTotais(esperado.alvo.descricao.totais),
          },
        },
      });
      tamanhosStructured.validar_pacote = Buffer.byteLength(JSON.stringify(resposta.result.structuredContent), 'utf8');
    } finally {
      await cliente.fechar();
    }
  });

  it('prova os pacotes oficiais dos Casos 1 e 2 com o schema público', async () => {
    for (const id of ['homologacao-mancal', 'homologacao-placa']) {
      validarSaida.parse(await validar({ id }));
    }
  });

  it('compara revisões oficiais reais pelo comparador existente', async () => {
    const pacote = 'prova-caixote';
    const anterior = JSON.parse(readFileSync(join(RAIZ, 'autoria-assistida/pacotes', pacote, 'revisoes/r001/revisao.json')));
    const posterior = JSON.parse(readFileSync(join(RAIZ, 'autoria-assistida/pacotes', pacote, 'revisoes/r002/revisao.json')));
    const esperado = compararRevisoes(anterior, posterior);
    const { cliente } = await conectado();
    try {
      const resposta = await cliente.enviar('tools/call', {
        name: 'comparar_revisoes', arguments: { id: pacote, anterior: 'r001', posterior: 'r002' },
      });
      expect(resposta.result.structuredContent).toEqual({
        ok: true, codigo: 0,
        resultado: { id: pacote, anterior: 'r001', posterior: 'r002', comparacao: resumoComparacao(esperado) },
      });
      tamanhosStructured.comparar_revisoes = Buffer.byteLength(JSON.stringify(resposta.result.structuredContent), 'utf8');
    } finally {
      await cliente.fechar();
    }
  });

  it('prova os pares oficiais homologados com o schema público', () => {
    for (const [id, anterior, posterior] of [
      ['homologacao-mancal', 'r001', 'r002'],
      ['prova-caixote', 'r001', 'r002'],
    ]) {
      compararSaida.parse(comparar({ id, anterior, posterior }));
    }
  });

  it('recusa entrada inválida e traversal com diagnóstico estruturado', async () => {
    const { cliente } = await conectado();
    try {
      const peca = await cliente.enviar('tools/call', { name: 'descrever_peca', arguments: { peca: '../segredo' } });
      expect(peca.result).toMatchObject({ isError: true });
      expect(peca.result.structuredContent).toBeUndefined();
      expect(peca.result.content[0].text).toMatch(/Input validation error/);
      expect(await descrever({ peca: '../segredo' })).toMatchObject({
        ok: false, erro: { codigo: 'entrada_recusada' },
      });
      const visual = await cliente.enviar('tools/call', {
        name: 'renderizar_vistas', arguments: { peca: '../segredo' },
      });
      expect(visual.result).toMatchObject({ isError: true });
      expect(visual.result.structuredContent).toBeUndefined();
      expect(visual.result.content[0].text).toMatch(/Input validation error/);
      expect((await renderizar({ peca: '../segredo' })).resposta).toMatchObject({
        ok: false, erro: { codigo: 'entrada_recusada' },
      });
      const traversal = await cliente.enviar('tools/call', { name: 'validar_pacote', arguments: { id: '../segredo' } });
      expect(traversal.result).toMatchObject({ isError: true });
      expect(traversal.result.structuredContent).toBeUndefined();
      expect(traversal.result.content[0].text).toMatch(/Input validation error/);
      const ausente = await cliente.enviar('tools/call', { name: 'validar_pacote', arguments: { id: 'pacote-inexistente' } });
      expect(ausente.result).toMatchObject({ isError: true, structuredContent: {
        ok: false, erro: { codigo: 'pacote_nao_encontrado' },
      } });
      const montagemTraversal = await cliente.enviar('tools/call', {
        name: 'descrever_montagem', arguments: { id: '../segredo' },
      });
      expect(montagemTraversal.result).toMatchObject({ isError: true });
      expect(montagemTraversal.result.structuredContent).toBeUndefined();
      expect(montagemTraversal.result.content[0].text).toMatch(/Input validation error/);
      const montagemAusente = await cliente.enviar('tools/call', {
        name: 'descrever_montagem', arguments: { id: 'nao-catalogada' },
      });
      expect(montagemAusente.result).toMatchObject({
        isError: true,
        structuredContent: { ok: false, erro: { codigo: 'montagem_nao_encontrada' } },
      });
      expect(JSON.stringify(montagemAusente.result)).not.toMatch(/\/workspaces|[A-Z]:\\|\/home\//);
    } finally {
      await cliente.fechar();
    }
  });

  it('entrega os recursos e não expõe caminhos do runtime', async () => {
    const { cliente } = await conectado();
    try {
      const estado = await cliente.enviar('resources/read', { uri: 'mecanifica://estado' });
      const capacidades = await cliente.enviar('resources/read', { uri: 'mecanifica://capacidades/modelagem' });
      const pacotes = await cliente.enviar('resources/read', { uri: 'mecanifica://pacotes' });
      const dependencias = await cliente.enviar('resources/read', { uri: 'mecanifica://dependencias' });
      const montagens = await cliente.enviar('resources/read', { uri: 'mecanifica://montagens' });
      const estadoValor = JSON.parse(estado.result.contents[0].text);
      const capacidadesValor = JSON.parse(capacidades.result.contents[0].text);
      const pacotesValor = JSON.parse(pacotes.result.contents[0].text);
      const dependenciasValor = JSON.parse(dependencias.result.contents[0].text);
      const montagensValor = JSON.parse(montagens.result.contents[0].text);
      expect(estadoValor).toMatchObject({
        perfil: 'revisao', transporte: 'stdio', contrato: 'mecanifica.mcp.revisao.v5',
        catalogoMontagensConfigurado: true, universoDependenciasConfigurado: true,
      });
      expect(estadoValor.ferramentas).toEqual([
        'descrever_peca', 'validar_pacote', 'comparar_revisoes', 'renderizar_vistas',
        'descrever_montagem', 'planejar_revalidacao_montagem', 'catalogar_montagens', 'renderizar_montagem', 'consultar_impacto_global',
      ]);
      expect(capacidadesValor.limites.join(' ')).not.toMatch(/\/workspaces|[A-Z]:\\/);
      expect(capacidadesValor.consegue).toContain('descobrir pacotes e revisões oficiais disponíveis');
      expect(JSON.stringify(pacotesValor)).not.toMatch(/\/workspaces|[A-Z]:\\|\/home\//);
      expect(dependenciasValor).toMatchObject({
        formato: 'mecanifica.resumo-dependencias-global', configurado: true,
        universo: { id: 'fixture-mapa-dependencias', entidades: 8 },
        mapa: { sha256: expect.stringMatching(/^sha256:/) }, cobertura: { completa: true },
      });
      expect(JSON.stringify(dependenciasValor)).not.toMatch(/\/workspaces|[A-Z]:\\|\/home\/|documento|composicao|ocorrencias/);
      expect(montagensValor).toEqual({
        formato: 'mecanifica.catalogo-mcp-montagens-publico',
        versao: 1,
        configurado: true,
        raizes: [{ id: 'gabarito-separacao-direcional' }, { id: 'gabarito-unitario' }],
      });
      expect(JSON.stringify(montagensValor)).not.toMatch(/\/workspaces|[A-Z]:\\|\/home\/|raizMontagens|raizPecas/);
    } finally {
      await cliente.fechar();
    }
  });

  it('mecanifica://pacotes devolve o catálogo real no contrato aprovado, ordenado', async () => {
    const { cliente } = await conectado();
    try {
      const resposta = await cliente.enviar('resources/read', { uri: 'mecanifica://pacotes' });
      const valor = JSON.parse(resposta.result.contents[0].text);
      expect(valor).toEqual({
        formato: 'mecanifica.catalogo-pacotes',
        versao: 1,
        pacotes: [
          { id: 'homologacao-mancal', revisoes: ['r001', 'r002'] },
          { id: 'homologacao-placa', revisoes: ['r001'] },
          { id: 'prova-caixote', revisoes: ['r001', 'r002', 'r003'] },
          { id: 'prova-freio', revisoes: ['r001'] },
        ],
      });
      const ids = valor.pacotes.map((pacote) => pacote.id);
      expect(ids).toEqual([...ids].sort());
      for (const pacote of valor.pacotes) {
        expect(pacote.revisoes).toEqual([...pacote.revisoes].sort());
      }
    } finally {
      await cliente.fechar();
    }
  });

  it('descobre um pacote e duas revisões só pelo recurso e chama validar_pacote/comparar_revisoes sem ler o repositório', async () => {
    const client = new Client({ name: 'consumidor-descoberta', version: '1' });
    const transport = new StdioClientTransport({
      command: process.execPath, args: [SERVIDOR], cwd: RAIZ, stderr: 'pipe',
    });
    try {
      await client.connect(transport);
      const catalogo = await client.readResource({ uri: 'mecanifica://pacotes' });
      const { pacotes } = JSON.parse(catalogo.contents[0].text);
      const descoberto = pacotes.find((pacote) => pacote.revisoes.length >= 2);
      expect(descoberto).toBeDefined();
      const validado = await client.callTool({ name: 'validar_pacote', arguments: { id: descoberto.id } });
      expect(validado.isError).not.toBe(true);
      expect(validado.structuredContent.resultado.id).toBe(descoberto.id);
      const [anterior, posterior] = descoberto.revisoes;
      const comparado = await client.callTool({
        name: 'comparar_revisoes', arguments: { id: descoberto.id, anterior, posterior },
      });
      expect(comparado.isError).not.toBe(true);
      expect(comparado.structuredContent.resultado).toMatchObject({ id: descoberto.id, anterior, posterior });
    } finally {
      await client.close();
    }
  });

  it('mantém paridade entre os serviços de montagem e seus schemas públicos', async () => {
    const descricao = await descreverMontagem({
      id: 'gabarito-separacao-direcional', caminho: ['movel'], incluirRelacionados: true,
    }, { catalogo: CATALOGO_MONTAGENS });
    descreverMontagemSaida.parse(descricao);
    expect(descricao.resultado.contexto).toMatchObject({
      formato: 'mecanifica.contexto-montagem',
      raiz: { id: 'gabarito-separacao-direcional' },
      totais: { pecas: 2, relacoesDeclaradas: 1 },
    });

    const roteiro = await planejarRevalidacao({
      id: 'gabarito-separacao-direcional', alvo: ['movel'],
    }, { catalogo: CATALOGO_MONTAGENS });
    revalidarMontagemSaida.parse(roteiro);
    expect(roteiro.resultado.roteiro.itens).toEqual([
      expect.objectContaining({ alcance: 'direta', revalidacao: expect.objectContaining({ executavel: true }) }),
    ]);
    expect(roteiro.resultado.roteiro.pendencias.map(({ codigo }) => codigo)).toContain('uso-global-fora-da-raiz-nao-verificado');

    const catalogado = await catalogarMontagens({
      ids: ['gabarito-unitario', 'gabarito-separacao-direcional'],
    }, { catalogo: CATALOGO_MONTAGENS });
    catalogarMontagensSaida.parse(catalogado);
    expect(catalogado.resultado.catalogo.raizes).toEqual([
      { id: 'gabarito-separacao-direcional' }, { id: 'gabarito-unitario' },
    ]);
    expect(catalogado.resultado.catalogo.limitacoes).toContain('somente-raizes-explicitamente-fornecidas');
  });

  it('consumidor caixa-preta descobre e audita montagem sem ler caminhos do repositório', async () => {
    const client = new Client({ name: 'consumidor-montagens', version: '1' });
    const transport = new StdioClientTransport({
      command: process.execPath, args: [SERVIDOR], cwd: RAIZ, stderr: 'pipe',
      env: { [VARIAVEL_CATALOGO_MCP_MONTAGENS]: CONFIGURACAO_MONTAGENS },
    });
    try {
      await client.connect(transport);
      const recurso = await client.readResource({ uri: 'mecanifica://montagens' });
      const publico = JSON.parse(recurso.contents[0].text);
      const id = publico.raizes.find((raiz) => raiz.id === 'gabarito-separacao-direcional').id;

      const descrita = await client.callTool({ name: 'descrever_montagem', arguments: { id } });
      expect(descrita.isError).not.toBe(true);
      descreverMontagemSaida.parse(descrita.structuredContent);

      const roteiro = await client.callTool({
        name: 'planejar_revalidacao_montagem', arguments: { id, alvo: ['movel'] },
      });
      expect(roteiro.isError).not.toBe(true);
      revalidarMontagemSaida.parse(roteiro.structuredContent);

      const catalogado = await client.callTool({
        name: 'catalogar_montagens',
        arguments: { ids: publico.raizes.map((raiz) => raiz.id) },
      });
      expect(catalogado.isError).not.toBe(true);
      catalogarMontagensSaida.parse(catalogado.structuredContent);
      const troca = JSON.stringify({ recurso: publico, descrita, roteiro, catalogado });
      expect(troca).not.toMatch(/\/workspaces|[A-Z]:\\|\/home\/|raizMontagens|raizPecas/);
      tamanhosStructured.descrever_montagem = Buffer.byteLength(JSON.stringify(descrita.structuredContent), 'utf8');
      tamanhosStructured.planejar_revalidacao_montagem = Buffer.byteLength(JSON.stringify(roteiro.structuredContent), 'utf8');
      tamanhosStructured.catalogar_montagens = Buffer.byteLength(JSON.stringify(catalogado.structuredContent), 'utf8');
    } finally {
      await client.close();
    }
  });

  it('consumidor caixa-preta descobre cobertura e consulta impacto sem ler o mapa ou caminhos', async () => {
    const client = new Client({ name: 'consumidor-impacto-global', version: '1' });
    const transport = new StdioClientTransport({
      command: process.execPath, args: [SERVIDOR], cwd: RAIZ, stderr: 'pipe',
      env: {
        [VARIAVEL_CATALOGO_MCP_MONTAGENS]: CONFIGURACAO_MONTAGENS,
        [VARIAVEL_UNIVERSO_MCP_DEPENDENCIAS]: CONFIGURACAO_UNIVERSO,
      },
    });
    try {
      await client.connect(transport);
      const recurso = await client.readResource({ uri: 'mecanifica://dependencias' });
      const resumo = JSON.parse(recurso.contents[0].text);
      expect(resumo).toMatchObject({
        configurado: true,
        universo: { id: 'fixture-mapa-dependencias', entidades: 8 },
        mapa: { sha256: expect.stringMatching(/^sha256:/) },
      });
      expect(JSON.stringify(resumo)).not.toMatch(/\/workspaces|[A-Z]:\\|\/home\/|composicao|ocorrencias|documento/);

      const impacto = await client.callTool({
        name: 'consultar_impacto_global', arguments: { tipo: 'peca', id: 'peca-compartilhada' },
      });
      expect(impacto.isError).not.toBe(true);
      consultarImpactoGlobalSaida.parse(impacto.structuredContent);
      expect(impacto.structuredContent.resultado.impacto).toMatchObject({
        raizesAfetadas: ['sistema-a', 'sistema-b'], raizesNaoAfetadas: ['sistema-isolado'],
      });
      expect(JSON.stringify(impacto)).not.toMatch(/\/workspaces|[A-Z]:\\|\/home\/|\.json|documento|composicao|ocorrencias/);
    } finally {
      await client.close();
    }
  });

  it('reconstrói impacto global em nova sessão após publicar uma revisão ativa e mede economia de contexto', async () => {
    const repositorio = mkdtempSync(join(tmpdir(), 'mecanifica-mcp-mapa-r05-'));
    const ambiente = {
      ...process.env,
      [VARIAVEL_CATALOGO_MCP_MONTAGENS]: CONFIGURACAO_CATALOGO_MAPA,
      [VARIAVEL_UNIVERSO_MCP_DEPENDENCIAS]: CONFIGURACAO_UNIVERSO,
      MECANIFICA_PERFIL: 'autoria', MECANIFICA_REPOSITORIO_AUTORIA: repositorio,
    };
    const escritor = new Client({ name: 'consumidor-r05-escritor', version: '1' });
    const transporteEscritor = new StdioClientTransport({
      command: process.execPath, args: [SERVIDOR], cwd: RAIZ, stderr: 'pipe', env: ambiente,
    });
    let antes;
    let aplicada;
    try {
      await escritor.connect(transporteEscritor);
      const recursoAntes = await escritor.readResource({ uri: 'mecanifica://dependencias' });
      antes = JSON.parse(recursoAntes.contents[0].text);
      const impactoAntes = await escritor.callTool({
        name: 'consultar_impacto_global', arguments: { tipo: 'peca', id: 'peca-compartilhada' },
      });
      expect(impactoAntes.structuredContent.resultado.impacto.raizesAfetadas).toEqual(['sistema-a', 'sistema-b']);
      const contextos = await Promise.all(['sistema-a', 'sistema-b', 'sistema-isolado'].map((id) => escritor.callTool({
        name: 'descrever_montagem', arguments: { id },
      })));
      const bytesImpacto = Buffer.byteLength(JSON.stringify(impactoAntes.structuredContent), 'utf8');
      const bytesContextos = contextos.reduce((total, resposta) => total + Buffer.byteLength(JSON.stringify(resposta.structuredContent), 'utf8'), 0);
      expect(bytesImpacto).toBeLessThan(bytesContextos);

      const candidata = JSON.parse(JSON.stringify(MONTAGEM_SISTEMA_A));
      candidata.instancias = candidata.instancias.filter((instancia) => instancia.id !== 'compartilhado');
      const planejada = await escritor.callTool({
        name: 'planejar_autoria_montagem', arguments: { id: 'sistema-a', revisaoObservada: null, montagem: candidata },
      });
      expect(planejada.isError).not.toBe(true);
      aplicada = await escritor.callTool({
        name: 'aplicar_autoria_montagem', arguments: {
          plano: planejada.structuredContent.resultado.plano,
          confirmacao: planejada.structuredContent.resultado.confirmacao,
          alvo: ['exclusivo-a'],
        },
      });
      expect(aplicada.structuredContent).toMatchObject({ ok: true, resultado: { id: 'sistema-a' } });
    } finally {
      await escritor.close();
    }

    const leitor = new Client({ name: 'consumidor-r05-nova-sessao', version: '1' });
    const transporteLeitor = new StdioClientTransport({
      command: process.execPath, args: [SERVIDOR], cwd: RAIZ, stderr: 'pipe',
      env: { ...ambiente, MECANIFICA_PERFIL: 'revisao' },
    });
    try {
      await leitor.connect(transporteLeitor);
      const recursoDepois = await leitor.readResource({ uri: 'mecanifica://dependencias' });
      const depois = JSON.parse(recursoDepois.contents[0].text);
      expect(depois.mapa.sha256).not.toBe(antes.mapa.sha256);
      const impactoDepois = await leitor.callTool({
        name: 'consultar_impacto_global', arguments: { tipo: 'peca', id: 'peca-compartilhada' },
      });
      consultarImpactoGlobalSaida.parse(impactoDepois.structuredContent);
      expect(impactoDepois.structuredContent.resultado.impacto).toMatchObject({
        raizesAfetadas: ['sistema-b'], raizesNaoAfetadas: ['sistema-a', 'sistema-isolado'],
      });
      const proveniencia = await leitor.callTool({
        name: 'consultar_impacto_global', arguments: { tipo: 'montagem', id: 'sistema-a' },
      });
      expect(proveniencia.structuredContent.resultado.impacto.roteiroRevalidacao[0].proveniencia).toMatchObject({
        fonte: 'revisao-ativa', revisao: aplicada.structuredContent.resultado.revisao,
      });
      expect(JSON.stringify({ antes, depois, impactoDepois, proveniencia })).not.toContain(repositorio);
    } finally {
      await leitor.close();
      rmSync(repositorio, { recursive: true, force: true });
    }
  }, 180_000);

  it('consumidor caixa-preta conclui autoria por MCP sem shell nem paths', async () => {
    const repositorio = mkdtempSync(join(tmpdir(), 'mecanifica-mcp-r05-'));
    const client = new Client({ name: 'consumidor-autoria-caixa-preta', version: '1' });
    const transport = new StdioClientTransport({
      command: process.execPath, args: [SERVIDOR], cwd: RAIZ, stderr: 'pipe',
      env: {
        ...process.env,
        [VARIAVEL_CATALOGO_MCP_MONTAGENS]: CONFIGURACAO_MONTAGENS,
        MECANIFICA_PERFIL: 'autoria',
        MECANIFICA_REPOSITORIO_AUTORIA: repositorio,
      },
    });
    try {
      await client.connect(transport);
      const estado = await client.readResource({ uri: 'mecanifica://estado' });
      const publico = JSON.parse(estado.contents[0].text);
      expect(publico).toMatchObject({ perfil: 'autoria' });
      expect(publico.ferramentas).toEqual([
        'descrever_peca', 'validar_pacote', 'comparar_revisoes', 'renderizar_vistas',
        'descrever_montagem', 'planejar_revalidacao_montagem', 'catalogar_montagens', 'renderizar_montagem', 'consultar_impacto_global',
        'consultar_campanha_revalidacao', 'consultar_item_revalidacao', 'registrar_resultado_revalidacao', 'obsoletar_item_revalidacao', 'obsoletar_campanha_revalidacao',
        'observar_autoria_montagem', 'planejar_autoria_montagem', 'historico_autoria_montagem', 'comparar_revisoes_montagem', 'planejar_restauracao_montagem', 'planejar_alteracao_montagem', 'inspecionar_proposta_montagem', 'aplicar_autoria_montagem',
        'observar_autoria_receita', 'planejar_autoria_receita', 'inspecionar_proposta_receita', 'aplicar_autoria_receita',
      ]);
      const id = 'gabarito-separacao-direcional';
      const observada = await client.callTool({ name: 'observar_autoria_montagem', arguments: { id } });
      expect(observada.structuredContent).toMatchObject({ ok: true, resultado: { revisao: null } });
      const publicada = JSON.parse(JSON.stringify(MONTAGEM_AUTORIA));
      publicada.instancias.find((item) => item.id === 'movel').pose.deslocamento = [0, 1.025, 0];
      const planejada = await client.callTool({ name: 'planejar_autoria_montagem', arguments: { id, revisaoObservada: null, montagem: publicada } });
      expect(planejada.structuredContent).toMatchObject({ ok: true });
      const { plano, confirmacao } = planejada.structuredContent.resultado;
      const alternativa = JSON.parse(JSON.stringify(publicada));
      alternativa.instancias.find((item) => item.id === 'movel').pose.deslocamento = [0, 1.03, 0];
      const concorrentePlanejada = await client.callTool({ name: 'planejar_autoria_montagem', arguments: { id, revisaoObservada: null, montagem: alternativa } });
      const concorrentePlano = concorrentePlanejada.structuredContent.resultado;
      const inspecionada = await client.callTool({ name: 'inspecionar_proposta_montagem', arguments: { plano, confirmacao, alvo: ['movel'] } });
      expect(inspecionada.structuredContent).toMatchObject({ ok: true, resultado: { promocao: { estado: 'aprovado' } } });
      const aplicada = await client.callTool({ name: 'aplicar_autoria_montagem', arguments: { plano, confirmacao, alvo: ['movel'] } });
      expect(aplicada.structuredContent).toMatchObject({ ok: true });
      const relida = await client.callTool({ name: 'observar_autoria_montagem', arguments: { id } });
      expect(relida.structuredContent.resultado.revisao).toBe(aplicada.structuredContent.resultado.revisao);
      const descritaAtiva = await client.callTool({ name: 'descrever_montagem', arguments: { id } });
      expect(descritaAtiva.structuredContent.resultado.contexto.relacoes[0].medidas.separacaoDirecional).toBeCloseTo(0.025);
      const estadoAtivo = await client.readResource({ uri: 'mecanifica://autoria' });
      expect(JSON.parse(estadoAtivo.contents[0].text).montagens).toContainEqual(expect.objectContaining({
        id, revisao: aplicada.structuredContent.resultado.revisao, fonte: 'revisao-ativa',
      }));
      const concorrente = await client.callTool({ name: 'aplicar_autoria_montagem', arguments: { plano: concorrentePlano.plano, confirmacao: concorrentePlano.confirmacao, alvo: ['movel'] } });
      expect(concorrente.isError).toBe(true);

      /* ALTERAÇÃO COMPACTA pela porta: o consumidor muda um campo sem devolver
         o documento inteiro, e o serviço reconstitui o resto a partir da
         revisão ativa. A prova mede as duas coisas que importam — o campo
         citado mudou, e o documento resultante é idêntico ao que o caminho
         longo produziria. */
      const revisaoAtiva = aplicada.structuredContent.resultado.revisao;
      const alterada = await client.callTool({
        name: 'planejar_alteracao_montagem',
        arguments: {
          id, revisaoObservada: revisaoAtiva,
          alteracoes: [{ alvo: { instancia: 'movel' }, campo: 'pose.deslocamento', valor: [0, 1.04, 0] }],
        },
      });
      expect(alterada.structuredContent).toMatchObject({ ok: true });
      expect(alterada.structuredContent.resultado.diff).toEqual([{
        alvo: "instancia 'movel'", campo: 'pose.deslocamento', de: [0, 1.025, 0], para: [0, 1.04, 0],
      }]);
      /* o documento reconstituído bate byte a byte com o do caminho longo */
      const longo = JSON.parse(JSON.stringify(relida.structuredContent.resultado.montagem));
      longo.instancias.find((item) => item.id === 'movel').pose.deslocamento = [0, 1.04, 0];
      expect(JSON.stringify(alterada.structuredContent.resultado.plano.montagem)).toBe(JSON.stringify(longo));
      /* e ela segue pelo MESMO caminho de gates: inspecionar e só então aplicar */
      const inspAlterada = await client.callTool({
        name: 'inspecionar_proposta_montagem',
        arguments: { plano: alterada.structuredContent.resultado.plano, confirmacao: alterada.structuredContent.resultado.confirmacao, alvo: ['movel'] },
      });
      expect(inspAlterada.structuredContent).toMatchObject({ ok: true, resultado: { promocao: { estado: 'aprovado' } } });
      /* aplicada de fato: é ela que dá ao histórico uma segunda revisão, e sem
         segunda revisão não existe comparação nem restauração para provar. */
      const alteradaAplicada = await client.callTool({
        name: 'aplicar_autoria_montagem',
        arguments: { plano: alterada.structuredContent.resultado.plano, confirmacao: alterada.structuredContent.resultado.confirmacao, alvo: ['movel'] },
      });
      expect(alteradaAplicada.structuredContent).toMatchObject({ ok: true });
      const revisaoDepoisDaAlteracao = alteradaAplicada.structuredContent.resultado.revisao;
      /* endereço posicional é recusado na porta, não só na função interna */
      const posicional = await client.callTool({
        name: 'planejar_alteracao_montagem',
        arguments: {
          id, revisaoObservada: revisaoDepoisDaAlteracao,
          alteracoes: [{ alvo: { instancia: 'movel' }, campo: 'pose.deslocamento.1', valor: 1.05 }],
        },
      });
      expect(posicional.isError).toBe(true);
      expect(posicional.structuredContent.erro.codigo).toBe('campo_posicional');

      /* HISTÓRICO, COMPARAÇÃO E RESTAURAÇÃO pela porta. Sem isto o agente
         publica e não consegue olhar para trás: o conteúdo antigo fica guardado
         do lado, e inalcançável. */
      const historico = await client.callTool({ name: 'historico_autoria_montagem', arguments: { id } });
      expect(historico.structuredContent).toMatchObject({ ok: true });
      const revisoes = historico.structuredContent.resultado.revisoes;
      expect(revisoes.length).toBeGreaterThanOrEqual(2);
      expect(revisoes[revisoes.length - 1]).toMatchObject({ revisao: revisaoDepoisDaAlteracao, ativa: true });
      expect(revisoes[0].pai).toBe(null);

      /* a comparação sai no MESMO vocabulário da alteração compacta */
      const comparada = await client.callTool({
        name: 'comparar_revisoes_montagem',
        arguments: { id, anterior: revisoes[0].revisao, posterior: revisaoDepoisDaAlteracao },
      });
      expect(comparada.structuredContent).toMatchObject({ ok: true });
      expect(comparada.structuredContent.resultado.alteracoes).toContainEqual(
        expect.objectContaining({ alvo: "instancia 'movel'", campo: 'pose.deslocamento' }),
      );

      /* restaurar NÃO move o estado ativo: devolve um plano, que segue pelos
         gates de sempre. */
      const restauracao = await client.callTool({
        name: 'planejar_restauracao_montagem',
        arguments: { id, revisaoObservada: revisaoDepoisDaAlteracao, revisao: revisoes[0].revisao },
      });
      expect(restauracao.structuredContent).toMatchObject({ ok: true });
      const aindaAtiva = await client.callTool({ name: 'observar_autoria_montagem', arguments: { id } });
      expect(aindaAtiva.structuredContent.resultado.revisao).toBe(revisaoDepoisDaAlteracao);
      /* e o plano carrega o conteúdo da revisão pedida, não o atual */
      const primeira = await client.callTool({
        name: 'comparar_revisoes_montagem',
        arguments: { id, anterior: revisaoDepoisDaAlteracao, posterior: revisoes[0].revisao },
      });
      expect(restauracao.structuredContent.resultado.alteracoes)
        .toEqual(primeira.structuredContent.resultado.alteracoes);

      /* restaurar a revisão que já é a ativa é recusado */
      const semEfeito = await client.callTool({
        name: 'planejar_restauracao_montagem',
        arguments: { id, revisaoObservada: revisaoDepoisDaAlteracao, revisao: revisaoDepoisDaAlteracao },
      });
      expect(semEfeito.isError).toBe(true);
      expect(semEfeito.structuredContent.erro.codigo).toBe('restauracao_sem_efeito');
      expect(concorrente.structuredContent).toMatchObject({ ok: false, erro: { codigo: 'revisao_desatualizada' } });
      expect(JSON.stringify({ estado: publico, observada, planejada, inspecionada, aplicada, relida, descritaAtiva, estadoAtivo, concorrente })).not.toContain(repositorio);
    } finally {
      await client.close();
      rmSync(repositorio, { recursive: true, force: true });
    }
  }, 180_000);

  it('consumidor MCP recusa eixo inválido e publica a correção declarativa', async () => {
    const temporario = mkdtempSync(join(tmpdir(), 'mecanifica-mcp-receita-r01-'));
    const catalogoLocal = join(temporario, 'catalogo');
    const repositorio = join(temporario, 'repositorio');
    const preparado = spawnSync(process.execPath, [MATERIALIZAR_CATALOGO_AUTORIA, catalogoLocal], { cwd: RAIZ, encoding: 'utf8' });
    expect(preparado.status).toBe(0);
    const client = new Client({ name: 'consumidor-autoria-receita', version: '1' });
    const transport = new StdioClientTransport({
      command: process.execPath, args: [SERVIDOR], cwd: RAIZ, stderr: 'pipe',
      env: {
        ...process.env,
        [VARIAVEL_CATALOGO_MCP_MONTAGENS]: join(catalogoLocal, 'catalogo.json'),
        MECANIFICA_PERFIL: 'autoria', MECANIFICA_REPOSITORIO_AUTORIA: repositorio,
        MECANIFICA_RECEITAS_AUTORIZADAS: 'eixo-guia',
      },
    });
    try {
      await client.connect(transport);
      const estado = await client.readResource({ uri: 'mecanifica://estado' });
      const idReceita = JSON.parse(estado.contents[0].text).receitasAutorizadas[0];
      expect(idReceita).toBe('eixo-guia');
      const observada = await client.callTool({ name: 'observar_autoria_receita', arguments: { id: idReceita } });
      expect(observada.structuredContent).toMatchObject({ ok: true, resultado: { revisao: null } });

      const invalida = await client.callTool({ name: 'planejar_autoria_receita', arguments: { id: idReceita, revisaoObservada: null, receita: receitaEixo(0.035) } });
      const { plano: planoInvalido, confirmacao: confirmacaoInvalida } = invalida.structuredContent.resultado;
      const inspeçãoInválida = await client.callTool({ name: 'inspecionar_proposta_receita', arguments: { plano: planoInvalido, confirmacao: confirmacaoInvalida } });
      expect(inspeçãoInválida).toMatchObject({ isError: true, structuredContent: { ok: false, erro: { codigo: 'revalidacao_recusada' } } });

      const corrigida = await client.callTool({ name: 'planejar_autoria_receita', arguments: { id: idReceita, revisaoObservada: null, receita: receitaEixo(0.010) } });
      const proposta = corrigida.structuredContent.resultado;
      const inspecionada = await client.callTool({ name: 'inspecionar_proposta_receita', arguments: { plano: proposta.plano, confirmacao: proposta.confirmacao } });
      expect(inspecionada.structuredContent).toMatchObject({ ok: true, resultado: { estado: 'aprovada', revalidacao: { cobertura: 'catalogo-explicito' } } });
      const aplicada = await client.callTool({ name: 'aplicar_autoria_receita', arguments: { plano: proposta.plano, confirmacao: proposta.confirmacao } });
      expect(aplicada.structuredContent).toMatchObject({ ok: true, resultado: { estado: 'aplicado' } });
      const relida = await client.callTool({ name: 'observar_autoria_receita', arguments: { id: idReceita } });
      expect(relida.structuredContent.resultado.revisao).toBe(aplicada.structuredContent.resultado.revisao);
      const descritaAtiva = await client.callTool({ name: 'descrever_montagem', arguments: { id: 'autoria-geometrica-do-zero' } });
      const eixoAtivo = descritaAtiva.structuredContent.resultado.contexto.instancias.find(({ caminho }) => caminho.join('/') === 'eixo');
      expect(eixoAtivo.caixaMundo.max[0]).toBeCloseTo(0.010);
      const autoriaAtiva = await client.readResource({ uri: 'mecanifica://autoria' });
      expect(JSON.parse(autoriaAtiva.contents[0].text).receitas).toEqual([expect.objectContaining({
        id: idReceita, revisao: aplicada.structuredContent.resultado.revisao, fonte: 'revisao-ativa',
      })]);

      const clienteNovo = new Client({ name: 'consumidor-continuacao', version: '1' });
      const transporteNovo = new StdioClientTransport({
        command: process.execPath, args: [SERVIDOR], cwd: RAIZ, stderr: 'pipe',
        env: {
          ...process.env,
          [VARIAVEL_CATALOGO_MCP_MONTAGENS]: join(catalogoLocal, 'catalogo.json'),
          MECANIFICA_PERFIL: 'revisao', MECANIFICA_REPOSITORIO_AUTORIA: repositorio,
          MECANIFICA_RECEITAS_AUTORIZADAS: 'eixo-guia',
        },
      });
      try {
        await clienteNovo.connect(transporteNovo);
        const estadoNovo = await clienteNovo.readResource({ uri: 'mecanifica://estado' });
        expect(JSON.parse(estadoNovo.contents[0].text)).toMatchObject({ perfil: 'revisao', autoriaAtivaConfigurada: true });
        const descritaNova = await clienteNovo.callTool({ name: 'descrever_montagem', arguments: { id: 'autoria-geometrica-do-zero' } });
        const eixoNovo = descritaNova.structuredContent.resultado.contexto.instancias.find(({ caminho }) => caminho.join('/') === 'eixo');
        expect(eixoNovo.caixaMundo.max[0]).toBeCloseTo(0.010);
      } finally { await clienteNovo.close(); }
      expect(JSON.stringify({ observada, invalida, inspeçãoInválida, corrigida, inspecionada, aplicada, relida, descritaAtiva, autoriaAtiva })).not.toContain(temporario);
    } finally {
      await client.close();
      rmSync(temporario, { recursive: true, force: true });
    }
  }, 180_000);

  it('transporta vistas de montagem sem colocar base64 no structuredContent', async () => {
    const png = Buffer.from('89504e470d0a1a0a', 'hex');
    let instante = 100;
    const executada = await renderizarMontagem({
      id: 'gabarito-separacao-direcional', vistas: ['isometrica', 'direita'],
    }, {
      catalogo: CATALOGO_MONTAGENS,
      agora: () => (instante += 10),
      capturar: async ({ caminho, vistas, timeoutMs }) => {
        expect({ caminho, vistas, timeoutMs }).toEqual({
          caminho: [], vistas: ['isometrica', 'direita'], timeoutMs: LIMITES_VISTAS_MONTAGEM.timeoutMs,
        });
        return {
          ok: true, codigo: 0,
          resultado: {
            capturas: vistas.map((nome) => ({
              nome, mimeType: 'image/png', largura: 1280, altura: 720, dados: png,
              instancias: [['movel'], ['referencia']],
              enquadramento: { valida: true, area: 0.25, largura: 0.5, altura: 0.5, cortado: false },
            })),
          },
        };
      },
    });
    renderizarMontagemSaida.parse(executada.resposta);
    expect(JSON.stringify(executada.resposta)).not.toContain(png.toString('base64'));
    const conteudo = conteudoRenderizacaoMontagem(executada);
    expect(conteudo.filter(({ type }) => type === 'image')).toHaveLength(2);
  });

  describe('listarCatalogoDePacotes — ordenação, filtragem e confinamento (fixture isolada)', () => {
    function comPacotesTemporarios(fabrica) {
      const raizPacotes = mkdtempSync(join(tmpdir(), 'mecanifica-pacotes-'));
      const fora = mkdtempSync(join(tmpdir(), 'mecanifica-fora-'));
      try {
        fabrica(raizPacotes, fora);
        return listarCatalogoDePacotes({ raizPacotes });
      } finally {
        rmSync(raizPacotes, { recursive: true, force: true });
        rmSync(fora, { recursive: true, force: true });
      }
    }
    /* Fixture mínima, mas realmente válida no contrato `mecanifica.pacote-
       modelagem`/`mecanifica.referencias-modelagem` — as mesmas chaves e
       formato de um pacote oficial real (ex.: homologacao-mancal), só que
       reduzida a um item por lista onde o contrato permite. `guias` aponta
       para um guia que de fato existe em `autoria-assistida/guias/`, porque
       `validarPacote` confere isso contra a raiz real do repositório. */
    function briefingValido(id) {
      return {
        alvo: { caminho: `prototipos/fps/v3/pecas/${id}.js`, modo: 'criacao', peca: id },
        checklist: [{ criterio: 'critério mínimo de prova.', estado: 'aberto', id: 'unico', prioridade: 1 }],
        formato: 'mecanifica.pacote-modelagem',
        guias: ['forma/silhueta-e-transicoes'],
        id,
        objetivo: 'Fixture de teste mínima e válida para o catálogo de pacotes.',
        partesEsperadas: ['parte'],
        perfil: {
          distanciaMinima: 0.1, fidelidade: 'F0', interacao: 'contexto',
          orcamento: { faces: 10 }, origem: 'declarado', precisao: 'ilustrativa', visual: 'esquematico',
        },
        provas: ['prova'],
        versao: 1,
      };
    }
    function referenciasValidas() {
      return { ausenciaDeclarada: true, formato: 'mecanifica.referencias-modelagem', referencias: [], versao: 1 };
    }
    function pacoteValido(raizPacotes, id, revisoes = []) {
      const pasta = join(raizPacotes, id);
      mkdirSync(pasta, { recursive: true });
      writeFileSync(join(pasta, 'briefing.json'), serializarCanonico(briefingValido(id)));
      writeFileSync(join(pasta, 'referencias.json'), serializarCanonico(referenciasValidas()));
      for (const revisao of revisoes) {
        const pastaRevisao = join(pasta, 'revisoes', revisao);
        mkdirSync(pastaRevisao, { recursive: true });
        writeFileSync(join(pastaRevisao, 'revisao.json'), '{"ok":true}');
      }
    }

    it('ordena pacotes e revisões lexicograficamente, mesmo fora de ordem no disco', () => {
      const catalogo = comPacotesTemporarios((raiz) => {
        pacoteValido(raiz, 'zebra', ['r002', 'r001', 'r010']);
        pacoteValido(raiz, 'abelha', []);
      });
      expect(catalogo).toEqual([
        { id: 'abelha', revisoes: [] },
        { id: 'zebra', revisoes: ['r001', 'r002', 'r010'] },
      ]);
    });

    it('ignora pastas sem briefing.json, sem referencias.json ou com JSON inválido', () => {
      const catalogo = comPacotesTemporarios((raiz) => {
        pacoteValido(raiz, 'valido');
        mkdirSync(join(raiz, 'sem-briefing'), { recursive: true });
        writeFileSync(join(raiz, 'sem-briefing', 'referencias.json'), '{}');
        mkdirSync(join(raiz, 'sem-referencias'), { recursive: true });
        writeFileSync(join(raiz, 'sem-referencias', 'briefing.json'), '{}');
        mkdirSync(join(raiz, 'json-quebrado'), { recursive: true });
        writeFileSync(join(raiz, 'json-quebrado', 'briefing.json'), '{ isto não é json');
        writeFileSync(join(raiz, 'json-quebrado', 'referencias.json'), '{}');
      });
      expect(catalogo).toEqual([{ id: 'valido', revisoes: [] }]);
    });

    it('ignora nomes que não são slug (maiúsculas, sublinhado, ponto)', () => {
      const catalogo = comPacotesTemporarios((raiz) => {
        pacoteValido(raiz, 'valido');
        pacoteValido(raiz, 'Invalido_Maiusculo');
        pacoteValido(raiz, 'nome.com.ponto');
      });
      expect(catalogo).toEqual([{ id: 'valido', revisoes: [] }]);
    });

    it('ignora revisões sem revisao.json legível, mantendo as demais', () => {
      const catalogo = comPacotesTemporarios((raiz) => {
        pacoteValido(raiz, 'pacote', ['r001']);
        mkdirSync(join(raiz, 'pacote', 'revisoes', 'r002'), { recursive: true });
        writeFileSync(join(raiz, 'pacote', 'revisoes', 'r002', 'revisao.json'), 'não é json');
        mkdirSync(join(raiz, 'pacote', 'revisoes', 'r003'), { recursive: true });
        mkdirSync(join(raiz, 'pacote', 'revisoes', 'nome-invalido'), { recursive: true });
        writeFileSync(join(raiz, 'pacote', 'revisoes', 'nome-invalido', 'revisao.json'), '{}');
      });
      expect(catalogo).toEqual([{ id: 'pacote', revisoes: ['r001'] }]);
    });

    it('ignora pacote cujo diretório é symlink escapando da raiz de pacotes', () => {
      const catalogo = comPacotesTemporarios((raiz, fora) => {
        pacoteValido(raiz, 'legitimo');
        pacoteValido(fora, 'segredo-fora-da-raiz');
        symlinkSync(join(fora, 'segredo-fora-da-raiz'), join(raiz, 'escape'), 'dir');
      });
      expect(catalogo).toEqual([{ id: 'legitimo', revisoes: [] }]);
    });

    it('ignora revisões quando revisoes/ do pacote é symlink escapando da raiz', () => {
      const catalogo = comPacotesTemporarios((raiz, fora) => {
        pacoteValido(raiz, 'pacote-com-revisoes-fora', ['r001']);
        const pasta = join(raiz, 'pacote-com-revisoes-fora');
        rmSync(join(pasta, 'revisoes'), { recursive: true, force: true });
        const revisoesForaDaRaiz = join(fora, 'revisoes-secretas');
        mkdirSync(join(revisoesForaDaRaiz, 'r999'), { recursive: true });
        writeFileSync(join(revisoesForaDaRaiz, 'r999', 'revisao.json'), '{"segredo":true}');
        symlinkSync(revisoesForaDaRaiz, join(pasta, 'revisoes'), 'dir');
      });
      expect(catalogo).toEqual([{ id: 'pacote-com-revisoes-fora', revisoes: [] }]);
    });

    it('ignora o pacote inteiro quando briefing.json é symlink apontando para fora da raiz', () => {
      const catalogo = comPacotesTemporarios((raiz, fora) => {
        pacoteValido(raiz, 'pacote-com-briefing-fora');
        const pasta = join(raiz, 'pacote-com-briefing-fora');
        const briefingSecreto = join(fora, 'briefing-secreto.json');
        writeFileSync(briefingSecreto, '{"segredo":true}');
        rmSync(join(pasta, 'briefing.json'));
        symlinkSync(briefingSecreto, join(pasta, 'briefing.json'));
      });
      expect(catalogo).toEqual([]);
    });

    it('ignora só a revisão quando revisao.json é symlink apontando para fora da raiz, mantendo o pacote', () => {
      const catalogo = comPacotesTemporarios((raiz, fora) => {
        pacoteValido(raiz, 'pacote-com-revisao-json-fora', ['r001']);
        const pasta = join(raiz, 'pacote-com-revisao-json-fora');
        const revisaoSecreta = join(fora, 'revisao-secreta.json');
        writeFileSync(revisaoSecreta, '{"segredo":true}');
        rmSync(join(pasta, 'revisoes', 'r001', 'revisao.json'));
        symlinkSync(revisaoSecreta, join(pasta, 'revisoes', 'r001', 'revisao.json'));
      });
      expect(catalogo).toEqual([{ id: 'pacote-com-revisao-json-fora', revisoes: [] }]);
    });

    it('ignora pasta de pacote que é symlink para outro pacote válido dentro da mesma raiz', () => {
      const catalogo = comPacotesTemporarios((raiz) => {
        pacoteValido(raiz, 'pacote-real', ['r001']);
        symlinkSync(join(raiz, 'pacote-real'), join(raiz, 'alias'), 'dir');
      });
      expect(catalogo).toEqual([{ id: 'pacote-real', revisoes: ['r001'] }]);
    });

    it('ignora revisoes/ quando é symlink para a pasta revisoes/ de outro pacote válido na mesma raiz', () => {
      const catalogo = comPacotesTemporarios((raiz) => {
        pacoteValido(raiz, 'doador', ['r001']);
        pacoteValido(raiz, 'receptor-com-alias-interno');
        const pastaReceptor = join(raiz, 'receptor-com-alias-interno');
        rmSync(join(pastaReceptor, 'revisoes'), { recursive: true, force: true });
        symlinkSync(join(raiz, 'doador', 'revisoes'), join(pastaReceptor, 'revisoes'), 'dir');
      });
      expect(catalogo).toEqual([
        { id: 'doador', revisoes: ['r001'] },
        { id: 'receptor-com-alias-interno', revisoes: [] },
      ]);
    });

    it('ignora briefing.json quando é symlink para o briefing.json de outro pacote válido na mesma raiz', () => {
      const catalogo = comPacotesTemporarios((raiz) => {
        pacoteValido(raiz, 'doador-de-briefing');
        pacoteValido(raiz, 'receptor-de-briefing-alias');
        const pasta = join(raiz, 'receptor-de-briefing-alias');
        rmSync(join(pasta, 'briefing.json'));
        symlinkSync(join(raiz, 'doador-de-briefing', 'briefing.json'), join(pasta, 'briefing.json'));
      });
      expect(catalogo).toEqual([{ id: 'doador-de-briefing', revisoes: [] }]);
    });

    it('ignora pacote com briefing.json sintaticamente válido mas que não satisfaz o contrato canônico', () => {
      const catalogo = comPacotesTemporarios((raiz) => {
        pacoteValido(raiz, 'valido');
        const pasta = join(raiz, 'contrato-invalido');
        mkdirSync(pasta, { recursive: true });
        writeFileSync(join(pasta, 'briefing.json'), serializarCanonico({ ok: true }));
        writeFileSync(join(pasta, 'referencias.json'), serializarCanonico(referenciasValidas()));
      });
      expect(catalogo).toEqual([{ id: 'valido', revisoes: [] }]);
    });

    it('ignora pacote cujo briefing.id diverge do nome da pasta', () => {
      const catalogo = comPacotesTemporarios((raiz) => {
        pacoteValido(raiz, 'valido');
        const pasta = join(raiz, 'pasta-com-id-divergente');
        mkdirSync(pasta, { recursive: true });
        writeFileSync(join(pasta, 'briefing.json'), serializarCanonico(briefingValido('outro-id')));
        writeFileSync(join(pasta, 'referencias.json'), serializarCanonico(referenciasValidas()));
      });
      expect(catalogo).toEqual([{ id: 'valido', revisoes: [] }]);
    });

    it('ignora pacote cujo briefing.json é válido mas não está serializado em bytes canônicos', () => {
      const catalogo = comPacotesTemporarios((raiz) => {
        pacoteValido(raiz, 'valido');
        const pasta = join(raiz, 'nao-canonico');
        mkdirSync(pasta, { recursive: true });
        writeFileSync(join(pasta, 'briefing.json'), JSON.stringify(briefingValido('nao-canonico')));
        writeFileSync(join(pasta, 'referencias.json'), serializarCanonico(referenciasValidas()));
      });
      expect(catalogo).toEqual([{ id: 'valido', revisoes: [] }]);
    });

    it('devolve lista vazia, sem lançar, quando a raiz de pacotes não existe', () => {
      expect(listarCatalogoDePacotes({ raizPacotes: join(tmpdir(), 'mecanifica-raiz-inexistente-xyz') })).toEqual([]);
    });
  });

  it('mantém stderr fora do protocolo e encerra o processo stdio limpo', async () => {
    const { cliente } = await conectado();
    const encerramento = await cliente.fechar();
    expect(encerramento.stdoutNaoProtocolar).toEqual([]);
    expect(encerramento.stderr).toBe('');
    expect(existsSync(SERVIDOR)).toBe(true);
  });

  it('rejeita promises pendentes quando o servidor stdio encerra', async () => {
    const cliente = clienteStdio();
    const pendente = cliente.enviar('tools/call', {
      name: 'descrever_peca', arguments: { peca: '_jardineira' },
    });
    cliente.processo.kill('SIGTERM');
    await expect(pendente).rejects.toThrow('servidor encerrou antes da resposta');
  });

  it('captura quatro PNGs em memória e fecha navegador e Vite sem criar saída', async () => {
    const fechamentos = { browser: 0, vite: 0 };
    const png = Buffer.from('89504e470d0a1a0a', 'hex');
    const page = {
      on() {},
      async goto() {},
      async waitForFunction() {},
      async waitForTimeout() {},
      async evaluate(fn) {
        const fonte = String(fn);
        if (fonte.includes('const b =')) return {
          ready: true, erro: null, peca: '_jardineira', partes: ['corpo'],
          selecaoIgnorada: [], diagnosticos: { facesSemParte: [] },
          estatisticas: { facesNeutras: 12, triangulos: 12 }, estado: {},
        };
        if (fonte.includes('.url()')) return 'http://127.0.0.1:4173/nos-mecanifica/bancada.html';
        if (fonte.includes('.enquadramento()')) return { valida: true, area: 0.5, largura: 0.7, altura: 0.7, cortado: false };
        throw new Error(`evaluate inesperado: ${fonte}`);
      },
      async screenshot(opcoes) {
        expect(opcoes).toEqual({ type: 'png' });
        return png;
      },
    };
    const browser = {
      async newPage() { return page; },
      async close() { fechamentos.browser += 1; },
    };
    const vite = {
      httpServer: { address: () => ({ port: 4173 }) },
      async listen() {},
      async close() { fechamentos.vite += 1; },
    };
    const resultado = await olharBancada({
      peca: '_jardineira', revisar: true, capturarEmMemoria: true, espera: 1,
      dependencias: {
        createServer: async () => vite,
        carregarPlaywright: async () => ({ chromium: { launch: async () => browser } }),
      },
    });
    expect(resultado.ok).toBe(true);
    expect(resultado.resultado.arquivos).toEqual([]);
    expect(resultado.resultado.capturas).toHaveLength(4);
    expect(resultado.resultado.capturas.map(({ nome }) => nome)).toEqual(['isometrica', 'frontal', 'direita', 'superior']);
    expect(fechamentos).toEqual({ browser: 1, vite: 1 });
  });

  it('fecha Browser e Vite quando o timeout é forçado', async () => {
    const fechamentos = { browser: 0, vite: 0 };
    let rejeitarEspera;
    const espera = new Promise((_, reject) => { rejeitarEspera = reject; });
    const page = {
      on() {},
      async goto() {},
      async waitForFunction() {},
      waitForTimeout() { return espera; },
      async evaluate(fn) {
        const fonte = String(fn);
        if (fonte.includes('const b =')) return {
          ready: true, erro: null, peca: '_jardineira', partes: ['corpo'],
          selecaoIgnorada: [], diagnosticos: { facesSemParte: [] },
          estatisticas: { facesNeutras: 12, triangulos: 12 }, estado: {},
        };
        throw new Error(`evaluate inesperado antes do timeout: ${fonte}`);
      },
    };
    const browser = {
      async newPage() { return page; },
      async close() {
        fechamentos.browser += 1;
        rejeitarEspera?.(new Error('browser fechado'));
      },
    };
    const vite = {
      httpServer: { address: () => ({ port: 4173 }) },
      async listen() {},
      async close() { fechamentos.vite += 1; },
    };
    const resultado = await olharBancada({
      peca: '_jardineira', revisar: true, capturarEmMemoria: true,
      timeoutMs: 10, espera: 60_000,
      dependencias: {
        createServer: async () => vite,
        carregarPlaywright: async () => ({ chromium: { launch: async () => browser } }),
      },
    });
    expect(resultado).toMatchObject({ ok: false, erro: { codigo: 'tempo_esgotado' } });
    expect(fechamentos.browser).toBeGreaterThanOrEqual(1);
    expect(fechamentos.vite).toBeGreaterThanOrEqual(1);
  });

  it('estrutura manifesto e imagens sem repetir base64 no structuredContent', async () => {
    const png = Buffer.from('89504e470d0a1a0a', 'hex');
    let instante = 100;
    const executado = await renderizar({ peca: '_jardineira' }, {
      agora: () => (instante += 10),
      olhar: async ({ capturarEmMemoria, revisar, timeoutMs }) => {
        expect({ capturarEmMemoria, revisar, timeoutMs }).toEqual({
          capturarEmMemoria: true, revisar: true, timeoutMs: LIMITES_VISTAS.timeoutMs,
        });
        return {
          ok: true, codigo: 0,
          resultado: {
            peca: '_jardineira',
            capturas: ['isometrica', 'frontal', 'direita', 'superior'].map((nome) => ({
              nome, mimeType: 'image/png', largura: 1280, altura: 720, dados: png,
            })),
            vistas: ['isometrica', 'frontal', 'direita', 'superior'].map((nome) => ({
              nome, enquadramento: { valida: true, area: 0.5, largura: 0.7, altura: 0.7, cortado: false },
            })),
          },
        };
      },
    });
    renderizarSaida.parse(executado.resposta);
    expect(executado.resposta.resultado.vistas).toHaveLength(4);
    expect(JSON.stringify(executado.resposta)).not.toContain(png.toString('base64'));
    const content = conteudoRenderizacao(executado);
    expect(content.filter(({ type }) => type === 'image')).toHaveLength(4);
    for (const imagem of content.slice(1)) {
      expect(Buffer.from(imagem.data, 'base64').subarray(0, 8)).toEqual(png);
    }
  });

  it('recusa payload e timeout sem devolver resultado parcial', async () => {
    const nomes = ['isometrica', 'frontal', 'direita', 'superior'];
    const enquadramento = { valida: true, area: 0.5, largura: 0.7, altura: 0.7, cortado: false };
    const excedido = await renderizar({ peca: '_jardineira' }, {
      limites: { ...LIMITES_VISTAS, imagemBytes: 4 },
      olhar: async () => ({
        ok: true, codigo: 0, resultado: { peca: '_jardineira',
          capturas: nomes.map((nome) => ({ nome, largura: 1280, altura: 720, dados: Buffer.alloc(5) })),
          vistas: nomes.map((nome) => ({ nome, enquadramento })),
        },
      }),
    });
    expect(excedido.resposta).toMatchObject({ ok: false, erro: { codigo: 'payload_excedido' } });
    expect(excedido.imagens).toEqual([]);
    const expirado = await renderizar({ peca: '_jardineira' }, {
      olhar: async () => ({ ok: false, codigo: 1, erro: { codigo: 'tempo_esgotado', mensagem: 'tempo' } }),
    });
    expect(expirado.resposta).toMatchObject({ ok: false, erro: { codigo: 'tempo_esgotado' } });
    expect(expirado.imagens).toEqual([]);
  });

  const testeVisualReal = process.env.MCP_VISUAL_REAL === '1' ? it : it.skip;
  testeVisualReal('consumidor zerado conclui os Casos 1 e 2 com quatro vistas e zero escrita', async () => {
    const antes = spawnSync('git', ['status', '--porcelain'], { cwd: RAIZ, encoding: 'utf8' }).stdout;
    const client = new Client({ name: 'consumidor-visual-mecanifica', version: '1' });
    const transport = new StdioClientTransport({
      command: process.execPath, args: [SERVIDOR], cwd: RAIZ, stderr: 'pipe',
    });
    const metricas = { recursos: 0, ferramentas: 0, casos: [] };
    try {
      await client.connect(transport);
      for (const uri of ['mecanifica://estado', 'mecanifica://capacidades/modelagem']) {
        await client.readResource({ uri });
        metricas.recursos += 1;
      }
      for (const id of ['homologacao-mancal', 'homologacao-placa']) {
        const validado = await client.callTool({ name: 'validar_pacote', arguments: { id } });
        metricas.ferramentas += 1;
        const peca = validado.structuredContent.resultado.peca;
        await client.callTool({ name: 'descrever_peca', arguments: { peca } });
        metricas.ferramentas += 1;
        const inicio = Date.now();
        const vistas = await client.callTool({ name: 'renderizar_vistas', arguments: { peca } });
        metricas.ferramentas += 1;
        renderizarSaida.parse(vistas.structuredContent);
        const imagens = vistas.content.filter(({ type }) => type === 'image');
        expect(imagens).toHaveLength(4);
        for (const imagem of imagens) {
          expect(Buffer.from(imagem.data, 'base64').subarray(0, 8)).toEqual(Buffer.from('89504e470d0a1a0a', 'hex'));
        }
        metricas.casos.push({
          id, peca, duracaoMs: Date.now() - inicio,
          bytes: vistas.structuredContent.resultado.bytes,
          vistas: vistas.structuredContent.resultado.vistas.map(({ nome, bytes }) => ({ nome, bytes })),
          respostaBytes: Buffer.byteLength(JSON.stringify(vistas), 'utf8'),
        });
      }
    } finally {
      await client.close();
    }
    const depois = spawnSync('git', ['status', '--porcelain'], { cwd: RAIZ, encoding: 'utf8' }).stdout;
    expect(depois).toBe(antes);
    expect(metricas).toMatchObject({ recursos: 2, ferramentas: 6 });
    console.log(`MCP_VISUAL_METRICAS ${JSON.stringify(metricas)}`);
  }, 180_000);

  testeVisualReal('consumidor zerado descobre, consulta e vê uma montagem sem escrita', async () => {
    const antes = spawnSync('git', ['status', '--porcelain'], { cwd: RAIZ, encoding: 'utf8' }).stdout;
    const client = new Client({ name: 'consumidor-visual-montagem', version: '1' });
    const transport = new StdioClientTransport({
      command: process.execPath, args: [SERVIDOR], cwd: RAIZ, stderr: 'pipe',
      env: { [VARIAVEL_CATALOGO_MCP_MONTAGENS]: CONFIGURACAO_MONTAGENS },
    });
    try {
      await client.connect(transport);
      const recurso = await client.readResource({ uri: 'mecanifica://montagens' });
      const { raizes } = JSON.parse(recurso.contents[0].text);
      const id = raizes.find((raiz) => raiz.id === 'gabarito-separacao-direcional').id;
      const descrita = await client.callTool({ name: 'descrever_montagem', arguments: { id } });
      expect(descrita.isError).not.toBe(true);
      const visual = await client.callTool({
        name: 'renderizar_montagem', arguments: { id, vistas: ['isometrica', 'direita'] },
      });
      expect(visual.isError).not.toBe(true);
      renderizarMontagemSaida.parse(visual.structuredContent);
      expect(visual.content.filter(({ type }) => type === 'image')).toHaveLength(2);
      for (const imagem of visual.content.filter(({ type }) => type === 'image')) {
        expect(Buffer.from(imagem.data, 'base64').subarray(0, 8)).toEqual(Buffer.from('89504e470d0a1a0a', 'hex'));
      }
      expect(JSON.stringify(visual.structuredContent)).not.toMatch(/\/workspaces|[A-Z]:\\|\/home\//);
      tamanhosStructured.renderizar_montagem = Buffer.byteLength(JSON.stringify(visual.structuredContent), 'utf8');
    } finally {
      await client.close();
    }
    const depois = spawnSync('git', ['status', '--porcelain'], { cwd: RAIZ, encoding: 'utf8' }).stdout;
    expect(depois).toBe(antes);
  }, 120_000);

  it('registra a linha-base de bytes das respostas estruturadas', () => {
    expect(tamanhosStructured).toMatchObject({
      descrever_peca: expect.any(Number),
      validar_pacote: expect.any(Number),
      comparar_revisoes: expect.any(Number),
      descrever_montagem: expect.any(Number),
      planejar_revalidacao_montagem: expect.any(Number),
      catalogar_montagens: expect.any(Number),
    });
    console.log(`structuredContent bytes: ${JSON.stringify(tamanhosStructured)}`);
  });
});
