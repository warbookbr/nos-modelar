/* olhar-bancada.test.mjs — validação antecipada de peças e mitigação de timeout em capturas headless. */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { FATOR_DE_AMOSTRAGEM } from './capturar-montagem.mjs';
import { PRAZO_DE_CARGA_MS, abrirCapturaCompartilhada, criarDicas, olharBancada } from './olhar-bancada.mjs';

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
      expect(url.pathname).toBe('/nos-modelar/tools/bancadas/harness.html');
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

/* A BORDA SUAVIZADA: a página abre em dobro, e a imagem entregue, em memória ou em arquivo, é a mesma e tem o tamanho do quadro. */
describe('captura suavizada', () => {
  const ENQUADRAMENTO = { valida: true, area: 0.3, largura: 0.5, altura: 0.6, cortado: false };

  /* Uma bancada falsa: responde ao que o laço de uma vista pergunta e fotografa um degrau inclinado no tamanho do viewport vezes o
     `deviceScaleFactor` que a página abriu. */
  function infraestruturaFalsa(aberturas) {
    let abertura = { viewport: { width: 1, height: 1 } };
    const page = {
      on() {},
      async goto() {},
      async waitForFunction() {},
      async waitForTimeout() {},
      async evaluate(fn) {
        const texto = String(fn);
        if (texto.includes('__modelarQuadros')) return undefined;
        if (texto.includes('b.ready')) {
          return {
            ready: true, erro: null, peca: 'Peça falsa', partes: ['a'], selecaoIgnorada: [], diagnosticos: { facesSemParte: [] },
            estatisticas: { facesNeutras: 1, triangulos: 2 }, estado: null,
          };
        }
        if (texto.includes('.enquadramento()')) return { url: 'http://127.0.0.1/harness.html', enquadramento: ENQUADRAMENTO };
        throw new Error(`pergunta inesperada à página: ${texto}`);
      },
      async screenshot(opcoes) {
        expect(opcoes).toEqual({ type: 'png' });
        const fator = abertura.deviceScaleFactor ?? 1;
        const largura = abertura.viewport.width * fator;
        const altura = abertura.viewport.height * fator;
        const png = new PNG({ width: largura, height: altura });
        for (let y = 0; y < altura; y++) {
          for (let x = 0; x < largura; x++) png.data.set(y * 3 > x ? [20, 30, 40, 255] : [230, 235, 232, 255], (y * largura + x) * 4);
        }
        return PNG.sync.write(png);
      },
    };
    return {
      createServer: async () => ({ httpServer: { address: () => ({ port: 43123 }) }, async listen() {}, async close() {} }),
      carregarPlaywright: async () => ({
        chromium: { launch: async () => ({ async newPage(opcoes) { aberturas.push(opcoes); abertura = opcoes; return page; }, async close() {} }) },
      }),
    };
  }

  it('abre a página em dobro e entrega, em memória e em arquivo, o mesmo PNG no tamanho do quadro', async () => {
    const aberturas = [];
    const pasta = `tools/bancadas/out/teste-suavizacao-${process.pid}`;
    try {
      const memoria = await olharBancada({
        peca: 'fixture-visual', vistas: ['isometrica'], res: '640x360', capturarEmMemoria: true, dependencias: infraestruturaFalsa(aberturas),
      });
      expect(memoria.ok).toBe(true);
      const arquivo = await olharBancada({
        peca: 'fixture-visual', vistas: ['isometrica'], res: '640x360', saida: pasta, dependencias: infraestruturaFalsa(aberturas),
      });
      expect(arquivo.ok).toBe(true);
      expect(aberturas).toEqual([
        { viewport: { width: 640, height: 360 }, deviceScaleFactor: FATOR_DE_AMOSTRAGEM },
        { viewport: { width: 640, height: 360 }, deviceScaleFactor: FATOR_DE_AMOSTRAGEM },
      ]);
      const [captura] = memoria.resultado.capturas;
      expect(captura).toMatchObject({ largura: 640, altura: 360 });
      const gravado = join(process.cwd(), pasta, 'bancada-fixture-visual-isometrica.png');
      expect(existsSync(gravado)).toBe(true);
      /* os mesmos bytes: a captura em memória e a gravada passam pelo mesmo caminho */
      expect(readFileSync(gravado).equals(captura.dados)).toBe(true);
      const imagem = PNG.sync.read(captura.dados);
      expect([imagem.width, imagem.height]).toEqual([640, 360]);
      /* o degrau da aresta virou nível intermediário: sem a suavização só existiriam os dois tons do desenho */
      const tons = new Set();
      for (let i = 0; i < imagem.data.length; i += 4) tons.add(imagem.data[i]);
      expect(tons.size).toBeGreaterThan(2);
    } finally {
      rmSync(join(process.cwd(), pasta), { recursive: true, force: true });
    }
  }, 60_000);
});

/* A CARGA DA PÁGINA É UMA POR CHAMADA, NÃO UMA POR VISTA. Cada vista abria a página de novo, e a perua levou 257 s numa máquina parada
   com 51 capturas; o contador da dependência injetada prova quantas cargas, páginas e navegadores uma ou várias chamadas pedem. */
describe('carga da página', () => {
  const ENQUADRAMENTO = { valida: true, area: 0.3, largura: 0.5, altura: 0.6, cortado: false };

  function bancadaContada({ falharPonte = false } = {}) {
    const contagem = { servidores: 0, navegadores: 0, paginas: 0, cargas: 0, esperas: [], vistasTrocadas: 0, paginasFechadas: 0, navegadoresFechados: 0 };
    const page = {
      on() {},
      off() {},
      async goto(url) { if (url !== 'about:blank') contagem.cargas += 1; },
      async waitForFunction(fn, arg, opcoes) {
        contagem.esperas.push(opcoes);
        if (falharPonte) {
          const erro = new Error('page.waitForFunction: Timeout 5ms exceeded.');
          erro.name = 'TimeoutError';
          throw erro;
        }
      },
      async waitForTimeout() {},
      async evaluate(fn) {
        const texto = String(fn);
        if (texto.includes('definirVista')) { contagem.vistasTrocadas += 1; return undefined; }
        if (texto.includes('__modelarQuadros')) return undefined;
        if (texto.includes('b.ready')) {
          return {
            ready: true, erro: null, peca: 'Peça falsa', partes: ['a'], selecaoIgnorada: [], diagnosticos: { facesSemParte: [] },
            estatisticas: { facesNeutras: 1, triangulos: 2 }, estado: null,
          };
        }
        if (texto.includes('.enquadramento()')) return { url: 'http://127.0.0.1/harness.html', enquadramento: ENQUADRAMENTO };
        if (/auditoria|selecionar|enquadrar|focar/.test(texto)) return null;
        throw new Error(`pergunta inesperada à página: ${texto}`);
      },
      async screenshot() {
        const png = new PNG({ width: 64, height: 36 });
        png.data.fill(200);
        return PNG.sync.write(png);
      },
      async close() { contagem.paginasFechadas += 1; },
    };
    const dependencias = {
      createServer: async () => {
        contagem.servidores += 1;
        return { httpServer: { address: () => ({ port: 43123 }) }, async listen() {}, async close() {} };
      },
      carregarPlaywright: async () => ({
        chromium: {
          launch: async () => {
            contagem.navegadores += 1;
            return { async newPage() { contagem.paginas += 1; return page; }, async close() { contagem.navegadoresFechados += 1; } };
          },
        },
      }),
    };
    return { contagem, dependencias };
  }

  const comum = { peca: 'fixture-visual', res: '640x360', auditoria: true, capturarEmMemoria: true };

  it('várias vistas de uma chamada carregam a página uma vez e trocam a câmera pela ponte', async () => {
    const { contagem, dependencias } = bancadaContada();
    const resposta = await olharBancada({ ...comum, vistas: ['isometrica', 'frontal', 'direita', 'superior'], dependencias });
    expect(resposta.ok).toBe(true);
    expect(resposta.resultado.capturas).toHaveLength(4);
    expect(contagem).toMatchObject({ cargas: 1, paginas: 1, vistasTrocadas: 3 });
    expect(resposta.resultado.cargasDePagina).toBe(1);
  });

  it('com a captura compartilhada, o servidor e o navegador sobem uma vez e a página da mesma peça é reaproveitada', async () => {
    const { contagem, dependencias } = bancadaContada();
    const compartilhada = await abrirCapturaCompartilhada({ dependencias });
    try {
      for (const vistas of [['isometrica', 'frontal'], ['traseira'], ['esquerda', 'superior']]) {
        const resposta = await olharBancada({ ...comum, vistas, compartilhada, dependencias });
        expect(resposta.ok).toBe(true);
      }
      /* uma chamada com outro quadro não reaproveita a página, e abre uma nova */
      const outroQuadro = await olharBancada({ ...comum, res: '800x450', vistas: ['direita'], compartilhada, dependencias });
      expect(outroQuadro.ok).toBe(true);
    } finally {
      await compartilhada.fechar();
    }
    expect(contagem).toMatchObject({ servidores: 1, navegadores: 1, cargas: 2, paginas: 2, navegadoresFechados: 1 });
    /* as duas páginas se fecharam, e o navegador só no `fechar` de quem o abriu */
    expect(contagem.paginasFechadas).toBe(2);
  });

  it('o prazo de carga vai como opção do Playwright e o estouro diz a etapa, o tempo e quantas imagens faltavam', async () => {
    const { contagem, dependencias } = bancadaContada({ falharPonte: true });
    const resposta = await olharBancada({ ...comum, vistas: ['isometrica', 'frontal'], prazoDeCargaMs: 5, dependencias });
    expect(resposta.ok).toBe(false);
    expect(resposta.erro.codigo).toBe('tempo_esgotado');
    expect(resposta.erro.mensagem).toMatch(/prazo de 5 ms/);
    expect(resposta.erro.mensagem).toMatch(/etapa: esperar a ponte da bancada/);
    expect(resposta.erro.mensagem).toMatch(/peça 'fixture-visual'/);
    expect(resposta.erro.mensagem).toMatch(/vista 'isometrica'/);
    expect(resposta.erro.mensagem).toMatch(/\d+ ms gastos nesta captura/);
    expect(resposta.erro.mensagem).toMatch(/0 de 2 imagens feitas, faltavam 2/);
    expect(contagem.esperas.every((opcoes) => opcoes.timeout === 5)).toBe(true);
    expect(PRAZO_DE_CARGA_MS).toBeGreaterThan(30_000);
  });
});
