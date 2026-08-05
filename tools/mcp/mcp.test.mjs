/* mcp.test.mjs — contrato real de stdio, catálogo, recursos e ferramentas MCP. */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { Client, LATEST_PROTOCOL_VERSION } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { descreverPecaReutilizavel, PECAS_DISPONIVEIS } from '../mecanifica/descrever-peca.mjs';
import { olharBancada } from '../mecanifica/olhar-bancada.mjs';
import { validarPacoteNoDisco } from '../modelagem/validar-pacote.mjs';
import { compararRevisoes } from '../modelagem/revisao-modelagem.mjs';
import { listarCatalogoDePacotes } from '../modelagem/formato-pacote.mjs';
import {
  comparar, conteudoRenderizacao, descrever, LIMITES_VISTAS, renderizar,
  resumoComparacao, resumoDescricao, resumoTotais, validar,
} from './perfis/revisao.mjs';
import { compararSaida, descreverSaida, renderizarSaida, validarSaida } from './contratos.mjs';

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
      expect(client.getServerVersion()).toEqual({ name: 'mecanifica-mcp', version: '0.2.0' });
      expect(client.getNegotiatedProtocolVersion()).toBe(LATEST_PROTOCOL_VERSION);
      expect(client.getServerCapabilities()).toEqual({
        tools: { listChanged: true }, resources: { listChanged: true },
      });
    } finally {
      await client.close();
    }
  });

  it('faz handshake bruto, anuncia exatamente quatro tools e três resources', async () => {
    const { cliente, inicializacao } = await conectado();
    try {
      expect(inicializacao.result.serverInfo).toEqual({ name: 'mecanifica-mcp', version: '0.2.0' });
      expect(inicializacao.result.capabilities).toEqual({
        tools: { listChanged: true }, resources: { listChanged: true },
      });
      const ferramentas = await cliente.enviar('tools/list');
      expect(ferramentas.result.tools.map((tool) => tool.name)).toEqual([
        'descrever_peca', 'validar_pacote', 'comparar_revisoes', 'renderizar_vistas',
      ]);
      expect(ferramentas.result.tools).toHaveLength(4);
      for (const tool of ferramentas.result.tools) expect(tool.outputSchema).toBeDefined();
      const recursos = await cliente.enviar('resources/list');
      expect(recursos.result.resources.map((resource) => resource.uri)).toEqual([
        'mecanifica://estado', 'mecanifica://capacidades/modelagem', 'mecanifica://pacotes',
      ]);
      expect(recursos.result.resources).toHaveLength(3);
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
    } finally {
      await cliente.fechar();
    }
  });

  it('entrega os três recursos e não expõe caminhos do runtime', async () => {
    const { cliente } = await conectado();
    try {
      const estado = await cliente.enviar('resources/read', { uri: 'mecanifica://estado' });
      const capacidades = await cliente.enviar('resources/read', { uri: 'mecanifica://capacidades/modelagem' });
      const pacotes = await cliente.enviar('resources/read', { uri: 'mecanifica://pacotes' });
      const estadoValor = JSON.parse(estado.result.contents[0].text);
      const capacidadesValor = JSON.parse(capacidades.result.contents[0].text);
      const pacotesValor = JSON.parse(pacotes.result.contents[0].text);
      expect(estadoValor).toMatchObject({ perfil: 'revisao', transporte: 'stdio', contrato: 'mecanifica.mcp.revisao.v2' });
      expect(estadoValor.ferramentas).toEqual(['descrever_peca', 'validar_pacote', 'comparar_revisoes', 'renderizar_vistas']);
      expect(capacidadesValor.limites.join(' ')).not.toMatch(/\/workspaces|[A-Z]:\\/);
      expect(capacidadesValor.consegue).toContain('descobrir pacotes e revisões oficiais disponíveis');
      expect(JSON.stringify(pacotesValor)).not.toMatch(/\/workspaces|[A-Z]:\\|\/home\//);
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
    function pacoteValido(raizPacotes, id, revisoes = []) {
      const pasta = join(raizPacotes, id);
      mkdirSync(pasta, { recursive: true });
      writeFileSync(join(pasta, 'briefing.json'), '{"ok":true}');
      writeFileSync(join(pasta, 'referencias.json'), '{"ok":true}');
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

  it('registra a linha-base de bytes das três respostas estruturadas', () => {
    expect(tamanhosStructured).toEqual({
      descrever_peca: expect.any(Number),
      validar_pacote: expect.any(Number),
      comparar_revisoes: expect.any(Number),
    });
    console.log(`structuredContent bytes: ${JSON.stringify(tamanhosStructured)}`);
  });
});
