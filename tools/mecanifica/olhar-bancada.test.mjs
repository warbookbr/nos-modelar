/* olhar-bancada.test.mjs — validação antecipada de peças e mitigação de timeout em capturas headless. */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { criarDicas, olharBancada } from './olhar-bancada.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

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
    expect(resultado.erro.mensagem).toMatch(/não encontrada no catálogo de fixtures nem em procedural/i);
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
      peca: 'peca-de-prova',
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
       recebe é `peca-de-prova/receita.js`. Afirmar o nome do arquivo sozinho
       voltaria a amarrar a prova à forma antiga. */
    expect(ativouComAlvo?.replaceAll('\\', '/')).toContain('peca-de-prova/receita.js');
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

describe('cada captura lê a sessão que é dela', () => {
  /* O defeito: `sessao-ativa.json` é um arquivo só por repositório, e duas capturas de peças diferentes ao mesmo tempo se pisavam. A
     segunda a ativar trocava o arquivo, e a página da primeira o lia ao subir e mostrava a peça da outra (medido: a imagem de
     `aviao-motor` saiu com a deriva). Aqui não há navegador: a ativação e a página são trocadas por gravadores, e o que se confere é o
     que decide qual peça a página vê, o arquivo que a ativação recebe e o endereço que a página abre. */
  const servidor = { httpServer: { address: () => ({ port: 43123 }) }, async listen() {}, async close() {} };

  function capturaFalsa(rotulo, registro) {
    return {
      createServer: async () => servidor,
      ativarReceitaBancada: async ({ alvo, arquivoDaSessao }) => {
        registro.ativacoes.push({ rotulo, alvo, arquivoDaSessao });
        mkdirSync(dirname(arquivoDaSessao), { recursive: true });
        writeFileSync(arquivoDaSessao, JSON.stringify({ alvo }), 'utf8');
      },
      carregarPlaywright: async () => ({
        chromium: {
          launch: async () => ({
            async newPage() {
              return {
                on() {},
                async goto(url) {
                  registro.paginas.push({ rotulo, url, arquivoExistiaAoAbrir: existsSync(registro.ativacoes.find((a) => a.rotulo === rotulo).arquivoDaSessao) });
                  throw new Error('parar depois de abrir a página');
                },
              };
            },
            async close() {},
          }),
        },
      }),
    };
  }

  async function duasCapturasAoMesmoTempo() {
    const registro = { ativacoes: [], paginas: [] };
    const [a, b] = await Promise.all([
      olharBancada({ peca: 'peca-de-prova', vistas: ['isometrica'], capturarEmMemoria: true, dependencias: capturaFalsa('a', registro) }),
      olharBancada({ peca: 'tools/fixtures/forma-do-esboco/ok/receita.js', vistas: ['isometrica'], capturarEmMemoria: true, dependencias: capturaFalsa('b', registro) }),
    ]);
    return { registro, resultados: [a, b] };
  }

  it('duas capturas de peças diferentes ao mesmo tempo gravam cada uma o arquivo de sessão dela, diferente e fora do compartilhado', async () => {
    const { registro } = await duasCapturasAoMesmoTempo();
    expect(registro.ativacoes).toHaveLength(2);
    const [a, b] = ['a', 'b'].map((r) => registro.ativacoes.find((x) => x.rotulo === r));
    expect(a.alvo.replaceAll('\\', '/')).toContain('peca-de-prova/receita.js');
    expect(b.alvo.replaceAll('\\', '/')).toContain('forma-do-esboco/ok/receita.js');
    expect(a.arquivoDaSessao).not.toBe(b.arquivoDaSessao);
    for (const { arquivoDaSessao } of [a, b]) {
      expect(relative(join(REPO, 'tools/bancadas/out/sessoes'), arquivoDaSessao).startsWith('..')).toBe(false);
      expect(arquivoDaSessao.endsWith('.json')).toBe(true);
      expect([join(REPO, 'public/sessao-ativa.json'), join(REPO, 'sessao-ativa.json')]).not.toContain(arquivoDaSessao);
    }
  });

  it('cada página abre apontada para a sessão da peça dela, pela URL, e o arquivo já existe quando ela abre', async () => {
    const { registro } = await duasCapturasAoMesmoTempo();
    expect(registro.paginas).toHaveLength(2);
    for (const rotulo of ['a', 'b']) {
      const { arquivoDaSessao } = registro.ativacoes.find((x) => x.rotulo === rotulo);
      const pagina = registro.paginas.find((x) => x.rotulo === rotulo);
      const url = new URL(pagina.url);
      expect(url.pathname).toBe('/nos-mecanifica/tools/bancadas/harness.html');
      expect(url.searchParams.get('sessao')).toBe(relative(REPO, arquivoDaSessao).replaceAll('\\', '/'));
      expect(pagina.arquivoExistiaAoAbrir).toBe(true);
    }
    const [a, b] = registro.paginas.map((p) => new URL(p.url).searchParams.get('sessao'));
    expect(a).not.toBe(b);
  });

  it('o arquivo de sessão da captura é apagado ao fim, também quando a captura falha', async () => {
    const { registro, resultados } = await duasCapturasAoMesmoTempo();
    expect(resultados.every((r) => r.ok === false)).toBe(true);
    for (const { arquivoDaSessao } of registro.ativacoes) expect(existsSync(arquivoDaSessao)).toBe(false);
  });

  it('a fixture do harness não tem sessão, e a sessão ativa de quem trabalha não é tocada pela captura', async () => {
    const registro = { ativacoes: [], paginas: [] };
    await olharBancada({ peca: 'fixture-visual', vistas: ['isometrica'], capturarEmMemoria: true, dependencias: capturaFalsa('f', registro) });
    expect(registro.ativacoes).toEqual([]);
    expect(new URL(registro.paginas[0]?.url ?? 'http://x/?').searchParams.has('sessao')).toBe(false);
  });
});
