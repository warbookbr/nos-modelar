/* universo-dependencias.test.mjs — provas do adaptador MCP do mapa global. */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { carregarUniversoDependencias, criarUniversoDependencias } from './universo-dependencias.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '../..');
const CONFIGURACAO = join(RAIZ, 'tools/mcp/fixtures/universo-dependencias.json');
const DIRETORIO_FIXTURE = join(RAIZ, 'tools/mecanifica/fixtures/mapa-dependencias');

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

  it('recusa o resumo quando a revisão observada muda durante o snapshot', async () => {
    let observacoes = 0;
    const universo = criarUniversoDependencias({
      universo: JSON.parse(readFileSync(join(DIRETORIO_FIXTURE, 'universo.json'), 'utf8')),
      raizMontagens: join(DIRETORIO_FIXTURE, 'montagens'),
      raizPecas: join(DIRETORIO_FIXTURE, 'pecas'),
      tentativas: 1,
      provedores: {
        async carregarMontagem() { return null; },
        async carregarPeca() { return null; },
        async estado() {
          observacoes += 1;
          return {
            formato: 'mecanifica.autoria-ativa', versao: 1,
            montagens: [{ id: 'sistema-a', revisao: `r-${observacoes}`, fonte: 'revisao-ativa' }], receitas: [],
          };
        },
      },
    });
    await expect(universo.resumo()).rejects.toMatchObject({ codigo: 'universo-alterado' });
  });
});
