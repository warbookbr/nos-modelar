/* ensaio-ponta-a-ponta.test.mjs — três peças privadas exercitando o MCP real. */
import { Client, LATEST_PROTOCOL_VERSION } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
// @ts-expect-error — exportador MJS exercitado pela fixture privada.
import { exportarPeca } from '../mecanifica/exportar-peca.mjs';
import placaBase from './fixtures/ensaio-ponta-a-ponta/receitas/placa-base.mjs';
import suportePortas from './fixtures/ensaio-ponta-a-ponta/receitas/suporte-portas.mjs';
import pinoGuia from './fixtures/ensaio-ponta-a-ponta/receitas/pino-guia.mjs';
import {
  catalogarMontagensSaida, descreverMontagemSaida,
  descreverSaida, renderizarSaida,
  revisarMontagemSaida, revalidarMontagemSaida,
} from './contratos.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '../..');
const SERVIDOR = join(RAIZ, 'tools/mcp/servidor.mjs');
const CONFIGURACAO = join(RAIZ, 'tools/mcp/fixtures/ensaio-ponta-a-ponta/catalogo.json');

describe('ensaio privado ponta a ponta — peças, montagem e MCP', () => {
  it('descobre, audita e renderiza três peças por um consumidor MCP', async () => {
    for (const [id, receita] of Object.entries({ 'placa-base': placaBase, 'suporte-portas': suportePortas, 'pino-guia': pinoGuia })) {
      const gerada = await exportarPeca(id, { modulo: receita });
      const salva = JSON.parse(readFileSync(join(RAIZ, `tools/mcp/fixtures/ensaio-ponta-a-ponta/pecas/${id}.json`), 'utf8'));
      expect(gerada.dado, `artefato desatualizado: ${id}`).toEqual(salva);
    }
    const client = new Client({ name: 'ensaio-ponta-a-ponta', version: '1' });
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [SERVIDOR],
      cwd: RAIZ,
      stderr: 'pipe',
      env: {
        ...process.env,
        MECANIFICA_CATALOGO_MONTAGENS: CONFIGURACAO,
      },
    });

    try {
      await client.connect(transport);
      expect(client.getNegotiatedProtocolVersion()).toBe(LATEST_PROTOCOL_VERSION);

      const estado = JSON.parse((await client.readResource({ uri: 'mecanifica://estado' })).contents[0].text);
      expect(estado).toMatchObject({
        perfil: 'revisao',
        transporte: 'stdio',
        catalogoMontagensConfigurado: true,
      });

      const recurso = await client.readResource({ uri: 'mecanifica://montagens' });
      const catalogoPublico = JSON.parse(recurso.contents[0].text);
      expect(catalogoPublico).toEqual({
        formato: 'mecanifica.catalogo-mcp-montagens-publico',
        versao: 1,
        configurado: true,
        raizes: [
          { id: 'ensaio-ponta-a-ponta' },
          { id: 'ensaio-ponta-a-ponta-inconclusiva' },
          { id: 'ensaio-ponta-a-ponta-intersecao' },
        ],
      });

      const pecas = await client.readResource({ uri: 'mecanifica://pecas' });
      expect(JSON.parse(pecas.contents[0].text)).toEqual({
        formato: 'mecanifica.catalogo-pecas-montagens-publico',
        versao: 1,
        configurado: true,
        pecas: [
          { id: 'pino-guia' },
          { id: 'pino-guia-aberto' },
          { id: 'placa-base' },
          { id: 'suporte-portas' },
        ],
      });

      const pino = await client.callTool({
        name: 'descrever_peca', arguments: { peca: 'pino-guia' },
      });
      expect(pino.isError).not.toBe(true);
      descreverSaida.parse(pino.structuredContent);
      expect(pino.structuredContent.resultado.descricao.totais).toMatchObject({
        faces: 6, vertices: 8, portas: 1, orfaos: 0,
      });

      const pinoVisual = await client.callTool({
        name: 'renderizar_vistas', arguments: { peca: 'pino-guia' },
      });
      expect(pinoVisual.isError).not.toBe(true);
      renderizarSaida.parse(pinoVisual.structuredContent);
      expect(pinoVisual.content.filter(({ type }) => type === 'image')).toHaveLength(4);

      const descrita = await client.callTool({
        name: 'descrever_montagem',
        arguments: { id: 'ensaio-ponta-a-ponta' },
      });
      expect(descrita.isError).not.toBe(true);
      descreverMontagemSaida.parse(descrita.structuredContent);
      expect(descrita.structuredContent).toMatchObject({
        ok: true,
        codigo: 0,
        resultado: {
          id: 'ensaio-ponta-a-ponta',
          contexto: {
            raiz: { id: 'ensaio-ponta-a-ponta' },
            totais: {
              pecas: 3,
              montagens: 0,
              relacoesDeclaradas: 1,
              satisfeitas: 1,
              reprovadas: 0,
            },
          },
        },
      });
      expect(descrita.structuredContent.resultado.contexto.instancias.map(({ alvo }) => alvo.ref))
        .toEqual(['placa-base', 'pino-guia', 'suporte-portas']);

      const roteiro = await client.callTool({
        name: 'planejar_revalidacao_montagem',
        arguments: { id: 'ensaio-ponta-a-ponta', alvo: ['pino'] },
      });
      expect(roteiro.isError).not.toBe(true);
      revalidarMontagemSaida.parse(roteiro.structuredContent);
      expect(roteiro.structuredContent.resultado.roteiro.alvo).toEqual({ caminho: ['pino'] });

      const catalogado = await client.callTool({
        name: 'catalogar_montagens',
        arguments: { ids: ['ensaio-ponta-a-ponta'] },
      });
      expect(catalogado.isError).not.toBe(true);
      catalogarMontagensSaida.parse(catalogado.structuredContent);
      expect(catalogado.structuredContent.resultado.catalogo.raizes)
        .toEqual([{ id: 'ensaio-ponta-a-ponta' }]);

      const revisao = await client.callTool({
        name: 'revisar_montagem',
        arguments: { id: 'ensaio-ponta-a-ponta', vistas: ['isometrica', 'direita'] },
      });
      expect(revisao.isError).not.toBe(true);
      revisarMontagemSaida.parse(revisao.structuredContent);
      expect(revisao.structuredContent).toMatchObject({
        ok: true,
        resultado: {
          estado: 'incompleta',
          verificacoes: [{ id: 'encaixeDoPino', estado: 'passou' }],
          visual: { estado: 'produzida' },
        },
      });
      expect(revisao.structuredContent.resultado.recomendacoes[0]).toContain(
        'A presença no catálogo significa apenas que o host incluiu o ID no escopo de operações do MCP',
      );
      expect(revisao.content.find(({ type }) => type === 'text')?.text).toContain(
        'não comprova homologação, aprovação, validação completa nem ausência de falhas',
      );
      expect(revisao.content.filter(({ type }) => type === 'image')).toHaveLength(2);
      expect(Buffer.from(revisao.content.find(({ type }) => type === 'image').data, 'base64')
        .subarray(0, 8)).toEqual(Buffer.from('89504e470d0a1a0a', 'hex'));
    } finally {
      await client.close();
    }
  }, 120_000);

  it('reprova uma montagem com encaixe desalinhado e explica a causa', async () => {
    const client = new Client({ name: 'ensaio-ponta-a-ponta-falha', version: '1' });
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [SERVIDOR],
      cwd: RAIZ,
      stderr: 'pipe',
      env: {
        ...process.env,
        MECANIFICA_CATALOGO_MONTAGENS: join(RAIZ, 'tools/mcp/fixtures/ensaio-ponta-a-ponta/catalogo-falha.json'),
      },
    });
    try {
      await client.connect(transport);
      const revisao = await client.callTool({
        name: 'revisar_montagem',
        arguments: { id: 'ensaio-ponta-a-ponta-falha', vistas: ['isometrica'] },
      });
      expect(revisao.isError).not.toBe(true);
      revisarMontagemSaida.parse(revisao.structuredContent);
      expect(revisao.structuredContent).toMatchObject({
        ok: true,
        resultado: {
          estado: 'reprovada',
          verificacoes: [{
            id: 'encaixeDoPino',
            estado: 'falhou',
            diagnosticos: [{ codigo: 'eixos-descentrados' }],
          }],
        },
      });
      expect(revisao.content.filter(({ type }) => type === 'image')).toHaveLength(1);
    } finally {
      await client.close();
    }
  }, 120_000);

  it('reprova uma interseção geométrica detectada pela auditoria MCP', async () => {
    const client = new Client({ name: 'ensaio-ponta-a-ponta-intersecao', version: '1' });
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [SERVIDOR],
      cwd: RAIZ,
      stderr: 'pipe',
      env: {
        ...process.env,
        MECANIFICA_CATALOGO_MONTAGENS: join(RAIZ, 'tools/mcp/fixtures/ensaio-ponta-a-ponta/catalogo.json'),
      },
    });
    try {
      await client.connect(transport);
      const revisao = await client.callTool({
        name: 'revisar_montagem',
        arguments: { id: 'ensaio-ponta-a-ponta-intersecao', vistas: ['isometrica'] },
      });
      expect(revisao.isError).not.toBe(true);
      revisarMontagemSaida.parse(revisao.structuredContent);
      expect(revisao.structuredContent.resultado).toMatchObject({ estado: 'reprovada' });
      expect(revisao.structuredContent.resultado.auditoriaIntersecoes.pares).toEqual(
        expect.arrayContaining([expect.objectContaining({
          a: ['pino'], b: ['suporte'], estado: 'interpenetram',
        })]),
      );
    } finally {
      await client.close();
    }
  }, 120_000);

  it('mantém uma geometria aberta como inconclusiva no MCP', async () => {
    const client = new Client({ name: 'ensaio-ponta-a-ponta-inconclusiva', version: '1' });
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [SERVIDOR],
      cwd: RAIZ,
      stderr: 'pipe',
      env: {
        ...process.env,
        MECANIFICA_CATALOGO_MONTAGENS: join(RAIZ, 'tools/mcp/fixtures/ensaio-ponta-a-ponta/catalogo.json'),
      },
    });
    try {
      await client.connect(transport);
      const revisao = await client.callTool({
        name: 'revisar_montagem',
        arguments: { id: 'ensaio-ponta-a-ponta-inconclusiva', vistas: ['isometrica'] },
      });
      expect(revisao.isError).not.toBe(true);
      revisarMontagemSaida.parse(revisao.structuredContent);
      expect(revisao.structuredContent.resultado).toMatchObject({ estado: 'incompleta' });
      expect(revisao.structuredContent.resultado.auditoriaIntersecoes.pares).toEqual(
        expect.arrayContaining([expect.objectContaining({ estado: 'inconclusivo' })]),
      );
    } finally {
      await client.close();
    }
  }, 120_000);
});
