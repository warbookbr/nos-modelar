/* olhar-bancada.test.mjs — validação antecipada de peças e mitigação de timeout em capturas headless. */
import { describe, expect, it } from 'vitest';
import { olharBancada } from './olhar-bancada.mjs';

describe('olhar-bancada — validação rápida e mitigação de timeout', () => {
  it('rejeita imediatamente peça inexistente antes de iniciar servidor ou navegador', async () => {
    let iniciouServidor = false;
    const resultado = await olharBancada({
      peca: 'peca-totalmente-inexistente-12345',
      capturarEmMemoria: true,
      dependencias: {
        createServer: async () => {
          iniciouServidor = true;
          throw new Error('Servidor não deveria ser iniciado para peça inexistente!');
        },
      },
    });

    expect(resultado.ok).toBe(false);
    expect(resultado.codigo).toBe(2);
    expect(resultado.erro.categoria).toBe('uso');
    expect(resultado.erro.mensagem).toMatch(/não encontrada no catálogo de fixtures nem em prototipos/i);
    expect(iniciouServidor).toBe(false);
  });

  it('não ativa sessão se a peça solicitada for uma das fixtures do harness', async () => {
    let ativou = false;
    const servidor = {
      httpServer: { address: () => ({ port: 43123 }) },
      async listen() {},
      async close() {},
    };

    const resultado = await olharBancada({
      peca: 'fixture-visual',
      vistas: ['isometrica'],
      capturarEmMemoria: true,
      dependencias: {
        createServer: async () => servidor,
        ativarReceitaBancada: async () => { ativou = true; },
        carregarPlaywright: async () => ({
          chromium: {
            launch: async () => {
              throw new Error('Interrompido propositalmente para o teste.');
            },
          },
        }),
      },
    });

    expect(ativou).toBe(false);
    expect(resultado.ok).toBe(false);
  });

  it('auto-ativa sessão quando a peça é receita local válida', async () => {
    let ativouComAlvo = null;
    const servidor = {
      httpServer: { address: () => ({ port: 43123 }) },
      async listen() {},
      async close() {},
    };

    const resultado = await olharBancada({
      peca: 'mancal-guia',
      vistas: ['isometrica'],
      capturarEmMemoria: true,
      dependencias: {
        createServer: async () => servidor,
        ativarReceitaBancada: async ({ alvo }) => {
          ativouComAlvo = alvo;
        },
        carregarPlaywright: async () => ({
          chromium: {
            launch: async () => {
              throw new Error('Interrompido propositalmente após validação e ativação.');
            },
          },
        }),
      },
    });

    expect(ativouComAlvo).toContain('mancal-guia.js');
    expect(resultado.ok).toBe(false);
    expect(resultado.erro.mensagem).toContain('Interrompido propositalmente');
  });
});
