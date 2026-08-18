/* procedural.test.mjs — R09: serviço puro e consumo MCP externo usam a mesma lógica. */
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client, LATEST_PROTOCOL_VERSION } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { describe, expect, it } from 'vitest';
import { criarServicoDescobertaProcedural } from '../../prototipos/procedural/v3/servicos/descoberta.js';
import {
  buscarCapacidadesSaida, combinarCapacidadesSaida, diagnosticarExtensaoSaida,
  validarComposicaoEntrada,
} from './contratos.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '../..');
const SERVIDOR = join(RAIZ, 'tools/mcp/servidor.mjs');
const MALHA = 'mecanifica.malha-poligonal@1';
const composicao = {
  formato: 'mecanifica.composicao-procedural@1', id: 'mecanifica.composicao.r09-base', versao: '1.0.0',
  parametros: { origem: { tipo: 'inteiro' }, lado: { tipo: 'numero' } }, artefatos: { entra: [], sai: [MALHA] },
  nos: [{ id: 'bloco', operacao: 'cubo', argumentos: { origemId: { parametro: 'origem' }, lado: { parametro: 'lado' } } }],
};

describe('serviço procedural e MCP — R09', () => {
  it('mantém descoberta fora de MCP, filesystem e visor', () => {
    const fonte = readFileSync(new URL('../../prototipos/procedural/v3/servicos/descoberta.js', import.meta.url), 'utf8');
    expect(fonte).not.toMatch(/node:fs|node:path|@modelcontextprotocol|three|readFile|writeFile/i);
    const servico = criarServicoDescobertaProcedural();
    expect(servico.buscar({ texto: 'cubo' }).operacoes).toHaveLength(1);
    expect(servico.validarComposicao({ composicoes: [composicao], id: composicao.id, parametros: { origem: 700, lado: 1 } })).toMatchObject({ valida: true, passos: [['cubo', { origemId: 700, lado: 1 }]] });
  });

  it('um cliente externo descobre, combina, valida, analisa lacuna e diagnostica extensão sem escrita', async () => {
    const client = new Client({ name: 'ensaio-procedural-r09', version: '1' });
    const transport = new StdioClientTransport({ command: process.execPath, args: [SERVIDOR], cwd: RAIZ, stderr: 'pipe' });
    const servico = criarServicoDescobertaProcedural();
    try {
      await client.connect(transport);
      expect(client.getNegotiatedProtocolVersion()).toBe(LATEST_PROTOCOL_VERSION);
      const catalogo = JSON.parse((await client.readResource({ uri: 'mecanifica://procedural/catalogo' })).contents[0].text);
      expect(catalogo.operacoes.some(({ nome }) => nome === 'cubo')).toBe(true);
      const schemas = JSON.parse((await client.readResource({ uri: 'mecanifica://procedural/schemas' })).contents[0].text);
      expect(schemas).toMatchObject({ formato: 'mecanifica.schemas-descoberta@1', operacoes: { total: 32 } });
      const busca = await client.callTool({ name: 'buscar_capacidades', arguments: { produz: MALHA, detalhe: 'completo', limite: 64 } });
      expect(busca.isError).not.toBe(true);
      expect(busca.structuredContent.resultado).toMatchObject(servico.buscar({ produz: MALHA, limite: 64 }));
      buscarCapacidadesSaida.parse(busca.structuredContent);
      expect(busca.structuredContent.resultado.controle).toMatchObject({ detalhe: 'completo', truncado: false });
      const descricao = await client.callTool({ name: 'descrever_capacidade', arguments: { identificador: 'cubo' } });
      expect(descricao.structuredContent.resultado).toMatchObject({
        encontrada: true,
        operacao: {
          id: 'mecanifica.operacao.cubo',
          uso: {
            formato: 'mecanifica.uso-operacao@1',
            schemaArgumentos: { $id: 'mecanifica.argumentos.cubo@1' },
            exemplo: { formato: 'mecanifica.exemplo-operacao@1', PASSOS: [['cubo', { lado: 1 }]] },
          },
        },
      });
      const plano = await client.callTool({ name: 'combinar_capacidades', arguments: { artefatos: { entra: [], sai: ['mecanifica.porta@1'] }, detalhe: 'completo', limite: 64 } });
      expect(plano.isError).not.toBe(true);
      expect(plano.structuredContent.resultado).toMatchObject(servico.combinar({ artefatos: { entra: [], sai: ['mecanifica.porta@1'] } }));
      combinarCapacidadesSaida.parse(plano.structuredContent);
      expect(plano.structuredContent.resultado.controle).toMatchObject({ detalhe: 'completo' });
      const validacao = await client.callTool({ name: 'validar_composicao', arguments: { composicoes: [composicao], id: composicao.id, parametros: { origem: 701, lado: 2 } } });
      expect(validacao.structuredContent.resultado).toMatchObject({ valida: true, passos: [['cubo', { origemId: 701, lado: 2 }]] });
      const lacuna = await client.callTool({ name: 'analisar_lacuna', arguments: { id: 'mecanifica.lacuna.material', objetivo: 'atribuir material físico', artefatos: { entra: [], sai: ['mecanifica.material-fisico@1'] }, recorrencia: 2, contorno: { descricao: 'registrar a pendência fora da receita', custo: 1 } } });
      expect(lacuna.structuredContent.resultado.classificacao).toMatchObject({ classificacao: 'operacao-nativa' });
      const extensao = await client.callTool({ name: 'diagnosticar_extensao', arguments: { capacidade: 'prismaTriangular' } });
      expect(extensao.structuredContent.resultado).toMatchObject({ estado: 'ausente', codigo: 'extensao_ausente', executavel: false, proximoPasso: { ferramenta: 'analisar_lacuna' } });
      diagnosticarExtensaoSaida.parse(extensao.structuredContent);
    } finally { await client.close(); }
  }, 30_000);

  it('expõe saída tipada e limita descoberta por padrão', async () => {
    const client = new Client({ name: 'ensaio-procedural-schema', version: '1' });
    const transport = new StdioClientTransport({ command: process.execPath, args: [SERVIDOR], cwd: RAIZ, stderr: 'pipe' });
    try {
      await client.connect(transport);
      const ferramentas = (await client.listTools()).tools;
      const busca = ferramentas.find(({ name }) => name === 'buscar_capacidades');
      const plano = ferramentas.find(({ name }) => name === 'combinar_capacidades');
      expect(JSON.stringify(busca.outputSchema)).not.toContain('"__schema0"');
      expect(JSON.stringify(plano.outputSchema)).not.toContain('"__schema0"');
      const resposta = await client.callTool({ name: 'buscar_capacidades', arguments: {} });
      expect(resposta.isError).not.toBe(true);
      expect(resposta.structuredContent.resultado.controle).toMatchObject({ limite: 8, detalhe: 'resumo', truncado: true });
      expect(resposta.structuredContent.resultado.operacoes).toHaveLength(8);
      const vistos = [...resposta.structuredContent.resultado.operacoes.map(({ id }) => id)];
      let pagina = resposta.structuredContent.resultado;
      while (pagina.proximoCursor) {
        const proxima = await client.callTool({ name: 'buscar_capacidades', arguments: { cursor: pagina.proximoCursor } });
        expect(proxima.isError).not.toBe(true);
        pagina = proxima.structuredContent.resultado;
        vistos.push(...pagina.operacoes.map(({ id }) => id));
      }
      expect(new Set(vistos).size).toBe(32);
      expect(pagina.controle.truncado).toBe(false);
    } finally { await client.close(); }
  }, 30_000);

  it('recusa ID de composição fora do contrato antes de chegar ao núcleo', async () => {
    expect(() => validarComposicaoEntrada.parse({ composicoes: [composicao], id: 'x' })).toThrow();
    const client = new Client({ name: 'ensaio-procedural-id', version: '1' });
    const transport = new StdioClientTransport({ command: process.execPath, args: [SERVIDOR], cwd: RAIZ, stderr: 'pipe' });
    try {
      await client.connect(transport);
      const resposta = await client.callTool({ name: 'validar_composicao', arguments: { composicoes: [composicao], id: 'x' } });
      expect(resposta.isError).toBe(true);
    } finally { await client.close(); }
  }, 30_000);

  it('mantém o processo stdio vivo até receber a primeira requisição', async () => {
    const processo = spawn(process.execPath, [SERVIDOR], {
      cwd: RAIZ,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    try {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, 150);
        processo.once('close', (codigo, sinal) => {
          clearTimeout(timer);
          reject(new Error(`servidor encerrou antes da primeira requisição (${codigo ?? sinal})`));
        });
      });
      expect(processo.exitCode).toBeNull();
    } finally {
      processo.kill('SIGTERM');
      await new Promise((resolve) => processo.once('close', resolve));
    }
  });
});
