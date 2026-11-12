/* olhar-bancada.test.mjs — validação antecipada de peças e mitigação de timeout em capturas headless. */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { FATOR_DE_AMOSTRAGEM } from './capturar-montagem.mjs';
import * as THREE from 'three';
import { PRAZO_DE_CARGA_MS, abrirCapturaCompartilhada, agendarEncerramento, ajustarCamera, comoCLI, criarDicas, olharBancada } from './olhar-bancada.mjs';

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
    const contagem = { servidores: 0, navegadores: 0, paginas: 0, cargas: 0, esperas: [], cortes: [], vistasTrocadas: 0, paginasFechadas: 0, navegadoresFechados: 0 };
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
      async evaluate(fn, argumento) {
        const texto = String(fn);
        if (texto.includes('.corte(')) { contagem.cortes.push(argumento); return argumento; }
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

  it('a vista de corte liga o plano uma vez, pela ponte, para todas as vistas da chamada', async () => {
    const { contagem, dependencias } = bancadaContada();
    const resposta = await olharBancada({
      ...comum, vistas: ['traseira', 'frontal'], corte: { eixo: 'z', posicao: 0, lado: 'mais' }, dependencias,
    });
    expect(resposta.ok).toBe(true);
    expect(contagem.cortes).toEqual([{ eixo: 'z', posicao: 0, lado: 'mais' }]);
    expect(resposta.resultado.capturas).toHaveLength(2);
  });

  it('a vista de corte recusa pedido mal formado e a mistura com arame na própria chamada', async () => {
    const { dependencias } = bancadaContada();
    const ruim = await olharBancada({ ...comum, corte: { eixo: 'k', posicao: 1 }, dependencias });
    expect(ruim.erro.mensagem).toMatch(/eixo "k" não existe/);
    const misturado = await olharBancada({ ...comum, corte: { eixo: 'z', posicao: 1 }, arame: 'raio-x', dependencias });
    expect(misturado.erro.mensagem).toMatch(/não se mistura com --arame/);
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
    expect(resposta.erro.mensagem).toMatch(/repita com --prazo=<segundos>/);
    expect(contagem.esperas.every((opcoes) => opcoes.timeout === 5)).toBe(true);
    expect(PRAZO_DE_CARGA_MS).toBeGreaterThan(30_000);
  });
});

describe('a vista de corte', () => {
  async function recusa(argv) {
    const resposta = await comoCLI(argv);
    expect(resposta.ok).toBe(false);
    expect(resposta.codigo).toBe(2);
    expect(resposta.erro.categoria).toBe('uso');
    return resposta.erro.mensagem;
  }

  it('recusa eixo inválido, posição não numérica, corte sem posição e lado inválido', async () => {
    expect(await recusa(['fixture-visual', '--corte=w:0'])).toMatch(/eixo "w" não existe; use x, y, z/);
    expect(await recusa(['fixture-visual', '--corte=z:meio'])).toMatch(/posição "meio" não é um número/);
    expect(await recusa(['fixture-visual', '--corte=z:'])).toMatch(/posição "" não é um número/);
    expect(await recusa(['fixture-visual', '--corte=z'])).toMatch(/pede <eixo>:<posição em mm>/);
    expect(await recusa(['fixture-visual', '--corte=z:0', '--corte-lado=frente'])).toMatch(/use mais ou menos/);
    expect(await recusa(['fixture-visual', '--corte-lado=mais'])).toMatch(/só vale junto de --corte/);
  });

  it('recusa a mistura com arame, raio X, par e análise, antes de abrir servidor ou navegador', async () => {
    expect(await recusa(['fixture-visual', '--corte=z:0', '--arame'])).toMatch(/não se mistura com --arame/);
    expect(await recusa(['fixture-visual', '--corte=z:0', '--raio-x'])).toMatch(/não se mistura com --arame/);
    expect(await recusa(['fixture-visual', '--corte=z:0', '--par=a,b'])).toMatch(/não se mistura com --par/);
    expect(await recusa(['fixture-visual', '--corte=z:0', '--analise'])).toMatch(/não se mistura com --analise/);
  });
});

describe('a ajuda da bancada', () => {
  it('cita toda opção e toda bandeira que o comando aceita', async () => {
    const { AJUDA, OPCOES_DA_CLI, BANDEIRAS_DA_CLI } = await import('./olhar-bancada.mjs');
    const faltando = [...OPCOES_DA_CLI, ...BANDEIRAS_DA_CLI].filter((nome) => !AJUDA.includes(`--${nome}`));
    expect(faltando).toEqual([]);
  });
});

describe('a câmera que mira um ponto e a isométrica de trás', () => {
  const ENQUADRAMENTO = { valida: true, area: 0.3, largura: 0.5, altura: 0.6, cortado: false };

  /* a bancada falsa, que guarda cada ajuste de câmera que a ferramenta mandou à página e o endereço que ela abriu */
  function bancadaDosAjustes() {
    const registro = { ajustes: [], urls: [], trocadas: [] };
    const page = {
      on() {}, off() {},
      async goto(url) { if (url !== 'about:blank') registro.urls.push(url); },
      async waitForFunction() {},
      async waitForTimeout() {},
      async evaluate(fn, argumento) {
        const texto = String(fn);
        if (Array.isArray(argumento) && argumento.length === 4 && typeof argumento[0] === 'number') { if (argumento[3]) registro.ajustes.push(argumento[3]); return true; }
        if (texto.includes('__modelarAjustarCamera = ')) return undefined;
        if (texto.includes('__modelarAjuste')) return { dentroDaPeca: false };
        if (texto.includes('definirVista')) { registro.trocadas.push(argumento); return undefined; }
        if (texto.includes('__modelarQuadros')) return undefined;
        if (texto.includes('b.ready')) {
          return { ready: true, erro: null, peca: 'Peça falsa', partes: ['a'], selecaoIgnorada: [], diagnosticos: { facesSemParte: [] }, estatisticas: { facesNeutras: 1, triangulos: 2 }, estado: null };
        }
        if (texto.includes('.enquadramento()')) return { url: 'http://127.0.0.1/harness.html', enquadramento: ENQUADRAMENTO };
        if (/auditoria|selecionar|enquadrar|focar/.test(texto)) return null;
        throw new Error(`pergunta inesperada à página: ${texto}`);
      },
      async screenshot() { const png = new PNG({ width: 64, height: 36 }); png.data.fill(200); return PNG.sync.write(png); },
      async close() {},
    };
    const dependencias = {
      createServer: async () => ({ httpServer: { address: () => ({ port: 43123 }) }, async listen() {}, async close() {} }),
      carregarPlaywright: async () => ({ chromium: { launch: async () => ({ async newPage() { return page; }, async close() {} }) } }),
    };
    return { registro, dependencias };
  }
  const comum = { peca: 'fixture-visual', res: '640x360', auditoria: true, capturarEmMemoria: true };

  it('recusa o pedido mal formado antes de abrir servidor ou navegador', async () => {
    const casos = [
      [{ mirar: '1200,900' }, /--mirar pede x,y,z em milímetros/],
      [{ mirar: '1,2,x' }, /--mirar pede x,y,z em milímetros/],
      [{ mirar: '1,2,3', distancia: '0' }, /--distancia pede milímetros maiores que zero/],
      [{ distancia: '300' }, /--distancia só vale junto de --mirar/],
      [{ mirar: '1,2,3', focar: true, selecionadas: 'a' }, /--mirar não se mistura com --focar/],
      [{ mirar: '1,2,3', revisar: true }, /--mirar não se mistura com --revisar/],
      [{ mirar: '1,2,3', par: 'a,b' }, /--mirar não se mistura com --par/],
    ];
    for (const [pedido, mensagem] of casos) {
      let abriu = false;
      const r = await olharBancada({ ...comum, ...pedido, dependencias: { createServer: async () => { abriu = true; throw new Error('não devia abrir'); } } });
      expect(r.codigo).toBe(2);
      expect(r.erro.mensagem).toMatch(mensagem);
      expect(abriu).toBe(false);
    }
    const pelaCLI = await comoCLI(['fixture-visual', '--mirar=1,2,3', '--analise']);
    expect(pelaCLI.codigo).toBe(2);
    expect(pelaCLI.stderr).toContain('--mirar não se mistura com --analise');
  });

  it('manda à página o ponto em mm, a distância (600 mm por padrão) e a direção de cada vista, e a captura sai com o ponto no nome', async () => {
    const { registro, dependencias } = bancadaDosAjustes();
    const r = await olharBancada({ ...comum, mirar: '1200,900,-300', vistas: ['direita', 'isometrica-traseira'], dependencias });
    expect(r.ok).toBe(true);
    expect(registro.ajustes).toEqual([
      { mirar: { mm: [1200, 900, -300], distanciaMm: 600, direcao: [1, 0, 0] } },
      { mirar: { mm: [1200, 900, -300], distanciaMm: 600, direcao: [-1, 0.72, -1] } },
    ]);
    const comDistancia = await olharBancada({ ...comum, mirar: [10, 20, 30], distancia: 150, vistas: ['frontal'], dependencias: bancadaDosAjustes().dependencias });
    expect(comDistancia.ok).toBe(true);
    const emArquivo = await olharBancada({ peca: 'fixture-visual', res: '640x360', auditoria: true, mirar: '1200,-900.5,0', distancia: 250, vistas: ['direita'], saida: 'tools/bancadas/out/teste-da-mira', dependencias: bancadaDosAjustes().dependencias });
    expect(emArquivo.resultado.arquivos[0]).toMatch(/bancada-fixture-visual-direita-mira-1200_m900p5_0-d250\.png$/);
    rmSync(join(REPO, 'tools/bancadas/out/teste-da-mira'), { recursive: true, force: true });
  });

  it('a isométrica de trás abre a página na isométrica, gira a câmera na página e a segunda vista troca para a isométrica, sem pedir uma vista que a bancada não tem', async () => {
    const { registro, dependencias } = bancadaDosAjustes();
    const r = await olharBancada({ ...comum, vistas: ['isometrica-traseira', 'isometrica-traseira'], dependencias });
    expect(r.ok).toBe(true);
    expect(registro.urls).toHaveLength(1);
    expect(registro.urls[0]).not.toMatch(/vista=/);
    expect(registro.trocadas).toEqual(['isometrica']);
    expect(registro.ajustes).toEqual([{ giro: true, fora: false }, { giro: true, fora: false }]);
    const semAjuste = bancadaDosAjustes();
    await olharBancada({ ...comum, vistas: ['isometrica', 'direita'], dependencias: semAjuste.dependencias });
    expect(semAjuste.registro.ajustes).toEqual([]);
  });

  it('o foco de uma parte pede o recuo da câmera para fora da peça', async () => {
    const { registro, dependencias } = bancadaDosAjustes();
    await olharBancada({ ...comum, selecionadas: 'a', modo: 'contexto', focar: true, vistas: ['direita'], dependencias });
    expect(registro.ajustes).toEqual([{ giro: false, fora: true }]);
  });
});

describe('o ajuste da câmera na página', () => {
  /* a página falsa: uma peça de 1,2 m de lado (em metro de receita) posta no estúdio com escala 2 e deslocada, a câmera de verdade do three */
  function montar({ ortografica = false, posicao = [3, 1, 0], alvo = [0, 1, 0], aspecto = 2 } = {}) {
    const raiz = new THREE.Group();
    const malha = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2));
    malha.userData.faces = [1];
    raiz.add(malha);
    raiz.scale.setScalar(2);
    raiz.position.set(0, 1, 0);
    const scene = new THREE.Scene();
    scene.add(raiz);
    raiz.updateMatrixWorld(true);
    const camera = ortografica ? new THREE.OrthographicCamera(-1, 1, 1, -1, 0.025, 100) : new THREE.PerspectiveCamera(38, aspecto, 0.025, 100);
    camera.position.set(...posicao);
    const controls = { target: new THREE.Vector3(...alvo), minDistance: 0.25, maxDistance: 30, update() {} };
    const chamadas = [];
    const ambiente = {
      scene, camera, controls,
      renderer: { domElement: { clientWidth: 1280, clientHeight: 640 } },
      olharComoReferencia(pedido) { chamadas.push(pedido); },
    };
    globalThis.window = { __mecanificaBancada: { ambiente: () => ambiente } };
    return { camera, controls, chamadas };
  }
  const arredondar = (v) => v.toArray().map((n) => Math.round(n * 1e6) / 1e6);

  it('mirar põe a câmera à distância pedida do ponto em mm, na direção da vista, olhando para ele, e diz o campo visível', () => {
    const { camera, controls, chamadas } = montar();
    const feito = ajustarCamera({ mirar: { mm: [300, 200, -300], distanciaMm: 500, direcao: [1, 0, 0] } });
    /* o ponto em mm vira metro de receita e vai ao estúdio: escala 2 e deslocamento y 1 */
    const ponto = [0.6, 1 + 0.4, -0.6];
    expect(arredondar(controls.target)).toEqual(ponto);
    expect(arredondar(camera.position)).toEqual([0.6 + 1, 1.4, -0.6]);
    expect(chamadas).toHaveLength(1);
    expect(chamadas[0]).toMatchObject({ centro: ponto, direcao: [1, 0, 0], vista: 'livre', instantaneo: true });
    expect(chamadas[0].meiaAltura).toBeCloseTo(1 * Math.tan((19 * Math.PI) / 180), 6);
    expect(chamadas[0].meiaLargura).toBeCloseTo(2 * chamadas[0].meiaAltura, 6);
    /* a distância mínima dos controles cede só quando a câmera chega mais perto que ela: a 1 m do ponto ela fica em 0,25 */
    expect(controls.minDistance).toBe(0.25);
    expect(feito.mirou).toEqual({ ponto: [300, 200, -300], distanciaMm: 500, campoMm: Math.round(2 * 500 * Math.tan((19 * Math.PI) / 180)) });
    expect(feito.dentroDaPeca).toBe(false);
    ajustarCamera({ mirar: { mm: [300, 200, -300], distanciaMm: 100, direcao: [1, 0, 0] } });
    expect(controls.minDistance).toBeCloseTo(0.1, 9);
    expect(camera.position.distanceTo(controls.target)).toBeCloseTo(0.2, 9);
  });

  it('mirar de perto, dentro da caixa da peça, é dito e não é mudado', () => {
    const { camera } = montar();
    const feito = ajustarCamera({ mirar: { mm: [0, 0, 0], distanciaMm: 300, direcao: [1, 0, 0] } });
    expect(feito.dentroDaPeca).toBe(true);
    expect(feito.afastou).toBeUndefined();
    expect(arredondar(camera.position)).toEqual([0.6, 1, 0]);
  });

  it('o giro leva a câmera para o lado oposto em torno do eixo vertical do alvo, na mesma altura e distância', () => {
    const { camera, controls } = montar({ posicao: [3, 2.5, 4], alvo: [0, 1, 0] });
    const antes = camera.position.distanceTo(controls.target);
    const feito = ajustarCamera({ giro: true });
    expect(feito.girou).toBe(true);
    expect(arredondar(camera.position)).toEqual([-3, 2.5, -4]);
    expect(camera.position.distanceTo(controls.target)).toBeCloseTo(antes, 9);
  });

  it('a câmera de um foco pequeno que caiu dentro da peça recua pelo mesmo raio até passar da caixa, e a perspectiva mantém o quadro pelo zoom', () => {
    /* a caixa da peça vai de x = -1,2 a 1,2 no estúdio, e a câmera de 0,6 m do alvo está dentro */
    const { camera, controls } = montar({ posicao: [0.6, 1, 0], alvo: [0, 1, 0] });
    const feito = ajustarCamera({ fora: true });
    expect(feito.afastou).toBeDefined();
    expect(feito.dentroDaPeca).toBe(false);
    expect(camera.position.x).toBeGreaterThan(1.2);
    expect(camera.position.y).toBeCloseTo(1, 9);
    expect(camera.position.distanceTo(controls.target) / 0.6).toBeCloseTo(camera.zoom, 9);
    expect(feito.afastou.deMm).toBe(Math.round((0.6 / 2) * 1000));
    expect(feito.afastou.paraMm).toBeGreaterThan(feito.afastou.deMm);
  });

  it('na ortográfica o recuo não mexe no zoom, e a câmera que já está fora não se move', () => {
    const orto = montar({ ortografica: true, posicao: [0, 1, 0.6], alvo: [0, 1, 0] });
    ajustarCamera({ fora: true });
    expect(orto.camera.zoom).toBe(1);
    expect(orto.camera.position.z).toBeGreaterThan(1.2);
    const fora = montar({ posicao: [6, 1, 0], alvo: [0, 1, 0] });
    const feito = ajustarCamera({ fora: true });
    expect(feito.afastou).toBeUndefined();
    expect(arredondar(fora.camera.position)).toEqual([6, 1, 0]);
    expect(fora.camera.zoom).toBe(1);
  });
});

describe('o andamento da captura e o fim do processo', () => {
  it('diz cada etapa longa ao entrar nela e, a cada intervalo, onde está e quanto falta', async () => {
    const linhas = [];
    const resposta = await olharBancada({
      peca: 'fixture-visual', vistas: ['isometrica'], capturarEmMemoria: true,
      aoProgredir: (linha) => linhas.push(linha), intervaloDoProgressoMs: 25,
      dependencias: {
        createServer: async () => {
          await new Promise((ok) => setTimeout(ok, 120));
          return { httpServer: { address: () => ({ port: 43123 }) }, async listen() {}, async close() {} };
        },
        carregarPlaywright: async () => ({ chromium: { launch: async () => { throw new Error('Interrompido propositalmente.'); } } }),
      },
    });
    expect(resposta.ok).toBe(false);
    expect(linhas.some((l) => /^bancada: subir o servidor \(fixture-visual\), \d+ s desde o começo$/.test(l))).toBe(true);
    expect(linhas.some((l) => /^bancada: abrir o navegador/.test(l))).toBe(true);
    const batidas = linhas.filter((l) => l.startsWith("bancada: ainda em 'subir o servidor'"));
    expect(batidas.length).toBeGreaterThanOrEqual(2);
    expect(batidas[0]).toMatch(/\d+ s gastos, 0 de 1 imagens feitas|\d+ s gastos, 0 de 0 imagens feitas/);
  });

  it('sem quem escute, nada é dito, e a batida para quando a captura acaba', async () => {
    const r = await olharBancada({
      peca: 'fixture-visual', vistas: ['isometrica'], capturarEmMemoria: true,
      dependencias: { createServer: async () => { throw new Error('parou'); } },
    });
    expect(r.ok).toBe(false);
    const linhas = [];
    await olharBancada({
      peca: 'fixture-visual', vistas: ['isometrica'], capturarEmMemoria: true, aoProgredir: (l) => linhas.push(l), intervaloDoProgressoMs: 10,
      dependencias: { createServer: async () => { throw new Error('parou'); } },
    });
    const quantas = linhas.length;
    await new Promise((ok) => setTimeout(ok, 60));
    expect(linhas).toHaveLength(quantas);
  });

  it('um sinal de parada fecha o navegador e o servidor da captura: o ouvinte existe durante a captura e sai ao fim', async () => {
    const antes = ['SIGINT', 'SIGTERM', 'SIGHUP'].map((s) => process.listenerCount(s));
    let durante = null;
    await olharBancada({
      peca: 'fixture-visual', vistas: ['isometrica'], capturarEmMemoria: true,
      dependencias: {
        createServer: async () => { durante = ['SIGINT', 'SIGTERM', 'SIGHUP'].map((s) => process.listenerCount(s)); throw new Error('parou'); },
      },
    });
    expect(durante).toEqual(antes.map((n) => n + 1));
    expect(['SIGINT', 'SIGTERM', 'SIGHUP'].map((s) => process.listenerCount(s))).toEqual(antes);
  });

  it('o encerramento forçado sai com o código da captura depois da espera, e o temporizador não segura o processo', async () => {
    const saidas = []; const avisos = [];
    const temporizador = agendarEncerramento(1, { esperaMs: 20, sair: (c) => saidas.push(c), escrever: (t) => avisos.push(t) });
    expect(temporizador.hasRef()).toBe(false);
    await new Promise((ok) => setTimeout(ok, 80));
    expect(saidas).toEqual([1]);
    expect(avisos[0]).toContain('encerrado à força');
  });
});
