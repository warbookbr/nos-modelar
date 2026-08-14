/* universo-dependencias.test.mjs — provas do adaptador MCP do mapa global. */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { carregarUniversoDependencias } from './universo-dependencias.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '../..');
const CONFIGURACAO = join(RAIZ, 'tools/mcp/fixtures/universo-dependencias.json');

describe('universo MCP de dependências', () => {
  it('resume o mapa completo sem transportar o mapa nem caminhos locais', async () => {
    const universo = carregarUniversoDependencias(CONFIGURACAO);
    const resumo = await universo.resumo();
    expect(resumo).toMatchObject({
      formato: 'mecanifica.resumo-dependencias-global', versao: 1, configurado: true,
      universo: {
        id: 'fixture-mapa-dependencias', entidades: 8,
        raizes: [{ id: 'sistema-a' }, { id: 'sistema-b' }, { id: 'sistema-isolado' }],
      },
      mapa: { formato: 'mecanifica.mapa-dependencias', versao: 1, sha256: expect.stringMatching(/^sha256:/) },
      cobertura: { completa: true },
    });
    expect(JSON.stringify(resumo)).not.toMatch(/\/workspaces|[A-Z]:\\|documento|composicao|ocorrencias/);
  });

  it('consulta uma peça por identidade e mantém o ramo isolado fora do impacto', async () => {
    const universo = carregarUniversoDependencias(CONFIGURACAO);
    const impacto = await universo.consultar({ tipo: 'peca', id: 'peca-compartilhada' });
    expect(impacto.raizesAfetadas).toEqual(['sistema-a', 'sistema-b']);
    expect(impacto.raizesNaoAfetadas).toEqual(['sistema-isolado']);
    expect(JSON.stringify(impacto)).not.toMatch(/\/workspaces|[A-Z]:\\|documento|\.json/);
  });

  it('recusa caminho de configuração não absoluto', () => {
    expect(() => carregarUniversoDependencias('tools/mcp/fixtures/universo-dependencias.json')).toThrow('absoluto');
  });
});
