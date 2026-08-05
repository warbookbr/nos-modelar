/* mcp.test.mjs — contrato real de stdio, catálogo, recursos e ferramentas MCP. */
import { existsSync, readFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { Client, LATEST_PROTOCOL_VERSION } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { descreverPecaReutilizavel, PECAS_DISPONIVEIS } from '../mecanifica/descrever-peca.mjs';
import { validarPacoteNoDisco } from '../modelagem/validar-pacote.mjs';
import { compararRevisoes } from '../modelagem/revisao-modelagem.mjs';
import {
  comparar, descrever, resumoComparacao, resumoDescricao, resumoTotais, validar,
} from './perfis/revisao.mjs';
import { compararSaida, descreverSaida, validarSaida } from './contratos.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '../..');
const SERVIDOR = join(RAIZ, 'tools/mcp/servidor.mjs');
const tamanhosStructured = {};

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
    });
    try {
      await client.connect(transport);
      expect(client.getServerVersion()).toEqual({ name: 'mecanifica-mcp', version: '0.1.0' });
      expect(client.getNegotiatedProtocolVersion()).toBe(LATEST_PROTOCOL_VERSION);
      expect(client.getServerCapabilities()).toEqual({
        tools: { listChanged: true }, resources: { listChanged: true },
      });
    } finally {
      await client.close();
    }
  });

  it('faz handshake bruto, anuncia exatamente três tools e dois resources', async () => {
    const { cliente, inicializacao } = await conectado();
    try {
      expect(inicializacao.result.serverInfo).toEqual({ name: 'mecanifica-mcp', version: '0.1.0' });
      expect(inicializacao.result.capabilities).toEqual({
        tools: { listChanged: true }, resources: { listChanged: true },
      });
      const ferramentas = await cliente.enviar('tools/list');
      expect(ferramentas.result.tools.map((tool) => tool.name)).toEqual([
        'descrever_peca', 'validar_pacote', 'comparar_revisoes',
      ]);
      expect(ferramentas.result.tools).toHaveLength(3);
      for (const tool of ferramentas.result.tools) expect(tool.outputSchema).toBeDefined();
      const recursos = await cliente.enviar('resources/list');
      expect(recursos.result.resources.map((resource) => resource.uri)).toEqual([
        'mecanifica://estado', 'mecanifica://capacidades/modelagem',
      ]);
      expect(recursos.result.resources).toHaveLength(2);
    } finally {
      await cliente.fechar();
    }
  });

  it('valida as três respostas reais com o outputSchema do cliente oficial', async () => {
    const client = new Client({ name: 'teste-mecanifica', version: '1' });
    const transport = new StdioClientTransport({
      command: process.execPath, args: [SERVIDOR], cwd: RAIZ, stderr: 'pipe',
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
    expect(PECAS_DISPONIVEIS).toHaveLength(37);
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
      const traversal = await cliente.enviar('tools/call', { name: 'validar_pacote', arguments: { id: '../segredo' } });
      expect(traversal.result).toMatchObject({ isError: true });
      expect(traversal.result.structuredContent).toBeUndefined();
      expect(traversal.result.content[0].text).toMatch(/Input validation error/);
      const ausente = await cliente.enviar('tools/call', { name: 'validar_pacote', arguments: { id: 'pacote-inexistente' } });
      expect(ausente.result).toMatchObject({ isError: true, structuredContent: {
        ok: false, erro: { codigo: 'pacote_nao_encontrado' },
      } });
    } finally {
      await cliente.fechar();
    }
  });

  it('entrega os dois recursos e não expõe caminhos do runtime', async () => {
    const { cliente } = await conectado();
    try {
      const estado = await cliente.enviar('resources/read', { uri: 'mecanifica://estado' });
      const capacidades = await cliente.enviar('resources/read', { uri: 'mecanifica://capacidades/modelagem' });
      const estadoValor = JSON.parse(estado.result.contents[0].text);
      const capacidadesValor = JSON.parse(capacidades.result.contents[0].text);
      expect(estadoValor).toMatchObject({ perfil: 'revisao', transporte: 'stdio', contrato: 'mecanifica.mcp.revisao.v1' });
      expect(estadoValor.ferramentas).toEqual(['descrever_peca', 'validar_pacote', 'comparar_revisoes']);
      expect(capacidadesValor.limites.join(' ')).not.toMatch(/\/workspaces|[A-Z]:\\/);
    } finally {
      await cliente.fechar();
    }
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

  it('registra a linha-base de bytes das três respostas estruturadas', () => {
    expect(tamanhosStructured).toEqual({
      descrever_peca: expect.any(Number),
      validar_pacote: expect.any(Number),
      comparar_revisoes: expect.any(Number),
    });
    console.log(`structuredContent bytes: ${JSON.stringify(tamanhosStructured)}`);
  });
});
