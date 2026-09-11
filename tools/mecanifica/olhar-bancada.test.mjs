/* olhar-bancada.test.mjs — validação antecipada de peças e mitigação de timeout em capturas headless. */
import { describe, expect, it } from 'vitest';
import { criarDicas, olharBancada } from './olhar-bancada.mjs';

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
      peca: 'bicicleta-quadro',
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

    /* O alvo é a receita resolvida, e a bicicleta virou pasta: o que a ativação
       recebe é `bicicleta-quadro/receita.js`. Afirmar o nome do arquivo sozinho
       voltaria a amarrar a prova à forma antiga. */
    expect(ativouComAlvo).toContain('bicicleta-quadro/receita.js');
    expect(resultado.ok).toBe(false);
    expect(resultado.erro.mensagem).toContain('Interrompido propositalmente');
  });
});

describe('dica aparece uma vez, e só quando se aplica', () => {
  it('sem achado, não existe linha nenhuma', () => {
    /* Dica que sempre aparece não é dica, é cabeçalho — e foi assim que a dica
       de resolução parou de ser lida. */
    expect(criarDicas().listar()).toEqual([]);
  });

  it('a MESMA dica em três vistas sai UMA vez, juntando as vistas', () => {
    const dicas = criarDicas();
    for (const vista of ['frontal', 'direita', 'superior']) {
      dicas.anotar('silhueta-vertical', 'silhueta vertical: ocupa 13% da largura', vista);
    }
    const lista = dicas.listar();
    expect(lista).toHaveLength(1);
    expect(lista[0].vistas).toEqual(['frontal', 'direita', 'superior']);
  });

  it('a mesma vista repetida não duplica na lista de vistas', () => {
    const dicas = criarDicas();
    dicas.anotar('cores-proximas', 'texto', 'frontal');
    dicas.anotar('cores-proximas', 'texto', 'frontal');
    expect(dicas.listar()[0].vistas).toEqual(['frontal']);
  });

  it('dicas diferentes convivem, e a sem vista fica sem vista', () => {
    const dicas = criarDicas();
    dicas.anotar('cores-proximas', 'cores', 'frontal');
    dicas.anotar('pares-alem-do-teto', '25 pares ficaram sem imagem');
    const lista = dicas.listar();
    expect(lista.map((d) => d.chave)).toEqual(['cores-proximas', 'pares-alem-do-teto']);
    expect(lista[1].vistas).toEqual([]);
  });

  it('listar devolve cópia: mexer no retorno não muda o acumulador', () => {
    const dicas = criarDicas();
    dicas.anotar('a', 'texto', 'frontal');
    dicas.listar()[0].vistas.push('invadida');
    expect(dicas.listar()[0].vistas).toEqual(['frontal']);
  });
});
