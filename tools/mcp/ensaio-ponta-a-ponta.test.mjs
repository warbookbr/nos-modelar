/* ensaio-ponta-a-ponta.test.mjs — três peças privadas exercitando o MCP real. */
import { Client, LATEST_PROTOCOL_VERSION } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { describe, expect, it } from 'vitest';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  catalogarMontagensSaida, descreverMontagemSaida,
  renderizarMontagemSaida, revalidarMontagemSaida,
} from './contratos.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '../..');
const SERVIDOR = join(RAIZ, 'tools/mcp/servidor.mjs');
const CONFIGURACAO = join(RAIZ, 'tools/mcp/fixtures/ensaio-ponta-a-ponta/catalogo.json');

describe('ensaio privado ponta a ponta — peças, montagem e MCP', () => {
  it('descobre, audita e renderiza três peças por um consumidor MCP', async () => {
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
        raizes: [{ id: 'ensaio-ponta-a-ponta' }],
      });

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

      const visual = await client.callTool({
        name: 'renderizar_montagem',
        arguments: { id: 'ensaio-ponta-a-ponta', vistas: ['isometrica'] },
      });
      expect(visual.isError).not.toBe(true);
      renderizarMontagemSaida.parse(visual.structuredContent);
      expect(visual.structuredContent.resultado.vistas).toHaveLength(1);
      expect(visual.content.filter(({ type }) => type === 'image')).toHaveLength(1);
      expect(Buffer.from(visual.content.find(({ type }) => type === 'image').data, 'base64')
        .subarray(0, 8)).toEqual(Buffer.from('89504e470d0a1a0a', 'hex'));
    } finally {
      await client.close();
    }
  }, 120_000);
});
