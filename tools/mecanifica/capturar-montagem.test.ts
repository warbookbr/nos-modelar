import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error — resolvedor JavaScript público, exercitado pelo contrato.
import { resolverMontagemPersistida } from '../../src/autoria/resolver-montagem-persistida.js';
// @ts-expect-error — serviço MJS exercitado pelo contrato visual.
import { capturarMontagem, FATOR_DE_AMOSTRAGEM, reduzirPorMedia, serializarMontagemVisual, VISTAS_MONTAGEM } from './capturar-montagem.mjs';

const MONTAGENS = join(process.cwd(), 'tools/mecanifica/fixtures/montagens-persistidas');
const PECAS = join(process.cwd(), 'tools/mecanifica/fixtures/pecas-resolvidas');
const ler = (arquivo: string) => JSON.parse(readFileSync(arquivo, 'utf8'));

/* Um PNG opaco de `largura` por `altura`, cada pixel dado por `pixel(x, y)`, que devolve [r, g, b, a]. */
function pngDe(largura: number, altura: number, pixel: (x: number, y: number) => number[] = () => [200, 210, 205, 255]): Buffer {
  const png = new PNG({ width: largura, height: altura });
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) png.data.set(pixel(x, y), (y * largura + x) * 4);
  }
  return PNG.sync.write(png);
}
const tamanhoDoPng = (dados: Buffer) => { const png = PNG.sync.read(dados); return [png.width, png.height]; };
/* O que o Playwright entrega: o viewport multiplicado pelo `deviceScaleFactor` da página. */
const fotoDaPagina = (opcoes: { viewport: { width: number; height: number }; deviceScaleFactor?: number }) => {
  const fator = opcoes.deviceScaleFactor ?? 1;
  return pngDe(opcoes.viewport.width * fator, opcoes.viewport.height * fator);
};

async function resolvida() {
  return resolverMontagemPersistida(ler(join(MONTAGENS, 'v3-separacao-direcional.json')), {
    carregarMontagem: async (ref: string) => ler(join(MONTAGENS, `${ref}.json`)),
    carregarPeca: async (ref: string) => ler(join(PECAS, `${ref}.json`)),
  });
}

describe('captura importável de montagem', () => {
  it('expõe frente, verso, laterais, topo e fundo para inspeção dirigida', () => {
    expect(VISTAS_MONTAGEM).toEqual([
      'isometrica', 'frontal', 'traseira', 'direita', 'esquerda', 'superior', 'inferior',
    ]);
  });

  it('serializa somente o caminho semântico escolhido sem identidade de runtime', async () => {
    const dados = serializarMontagemVisual(await resolvida(), ['movel']);
    expect(dados.instancias.map((item: { caminho: string[] }) => item.caminho)).toEqual([['movel']]);
    expect(JSON.stringify(dados)).not.toMatch(/uuid/i);
  });

  it('captura PNGs em memória e fecha browser e Vite', async () => {
    const fechamentos = { browser: 0, vite: 0 };
    let abertura: { viewport: { width: number; height: number }; deviceScaleFactor?: number } | null = null;
    const page = {
      on() {},
      async goto() {},
      async waitForFunction() {},
      async waitForTimeout() {},
      async evaluate(_fn: unknown, [_dados, vista]: [unknown, string]) {
        return {
          id: 'gabarito-separacao-direcional', vista,
          instancias: [['movel'], ['referencia']],
          enquadramento: { valida: true, area: 0.25, largura: 0.5, altura: 0.5, cortado: false },
        };
      },
      async screenshot(opcoes: unknown) {
        expect(opcoes).toEqual({ type: 'png' });
        return fotoDaPagina(abertura!);
      },
    };
    const browser = {
      async newPage(opcoes: typeof abertura) { abertura = opcoes; return page; },
      async close() { fechamentos.browser += 1; },
    };
    const vite = {
      httpServer: { address: () => ({ port: 4173 }) },
      async listen() {},
      async close() { fechamentos.vite += 1; },
    };
    const resultado = await capturarMontagem({
      montagem: await resolvida(),
      vistas: ['isometrica', 'direita'],
      espera: 0,
      dependencias: {
        criarServidor: async () => vite,
        carregarPlaywright: async () => ({ chromium: { launch: async () => browser } }),
      },
    });
    expect(resultado.ok).toBe(true);
    expect(resultado.resultado?.capturas).toHaveLength(2);
    /* a página abre em dobro e a imagem entregue volta ao tamanho do quadro: 1280 por 720, o de antes da suavização */
    expect(abertura).toEqual({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: FATOR_DE_AMOSTRAGEM });
    expect(tamanhoDoPng(resultado.resultado?.capturas[0].dados)).toEqual([1280, 720]);
    expect(resultado.resultado?.capturas[0]).toMatchObject({ largura: 1280, altura: 720 });
    expect(fechamentos).toEqual({ browser: 1, vite: 1 });
  });

  it('passa a projeção pedida ao visor, e perspectiva quando ninguém pede', async () => {
    const pedidas: string[] = [];
    const page = {
      on() {}, async goto() {}, async waitForFunction() {}, async waitForTimeout() {},
      async evaluate(_fn: unknown, [, vista, projecao]: [unknown, string, string]) {
        pedidas.push(projecao);
        return { id: 'x', vista, instancias: [], enquadramento: { valida: true, area: 0.25, largura: 0.5, altura: 0.5, cortado: false } };
      },
      async screenshot() { return fotoDaPagina({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: FATOR_DE_AMOSTRAGEM }); },
    };
    const dependencias = {
      criarServidor: async () => ({ httpServer: { address: () => ({ port: 4173 }) }, async listen() {}, async close() {} }),
      carregarPlaywright: async () => ({ chromium: { launch: async () => ({ async newPage() { return page; }, async close() {} }) } }),
    };
    await capturarMontagem({ montagem: await resolvida(), vistas: ['frontal'], projecao: 'ortografica', espera: 0, dependencias });
    await capturarMontagem({ montagem: await resolvida(), vistas: ['frontal'], espera: 0, dependencias });
    expect(pedidas).toEqual(['ortografica', 'perspectiva']);
  });

  it('recusa caminho ausente antes de subir infraestrutura visual', async () => {
    let iniciou = false;
    const resultado = await capturarMontagem({
      montagem: await resolvida(),
      caminho: ['nao-existe'],
      dependencias: { criarServidor: async () => { iniciou = true; throw new Error('não deveria iniciar'); } },
    });
    expect(resultado).toMatchObject({ ok: false, erro: { codigo: 'caminho-ausente' } });
    expect(iniciou).toBe(false);
  });

  /* O foco enquadra a caixa de uma instância: o conjunto inteiro fazia a peça de uma etapa ocupar um décimo do quadro, e o crítico leu
     um degrau na junta do capô e a deriva mais grossa do que é. O cálculo do quadro mora no visor, que roda no navegador; aqui se
     prova o que a captura entrega a ele e o que ela recusa antes de subir infraestrutura. */
  function infraestruturaFalsa(argumentosDoVisor: unknown[][], viewports: unknown[] = []) {
    let abertura: { viewport: { width: number; height: number }; deviceScaleFactor?: number } = { viewport: { width: 1280, height: 720 } };
    const page = {
      on() {}, async goto() {}, async waitForFunction() {}, async waitForTimeout() {},
      async evaluate(_fn: unknown, argumentos: unknown[]) {
        argumentosDoVisor.push(argumentos);
        return { id: 'x', vista: argumentos[1], instancias: [], enquadramento: { valida: true, area: 0.5, largura: 0.8, altura: 0.8, cortado: false } };
      },
      async screenshot() { return fotoDaPagina(abertura); },
    };
    return {
      criarServidor: async () => ({ httpServer: { address: () => ({ port: 4173 }) }, async listen() {}, async close() {} }),
      carregarPlaywright: async () => ({
        chromium: { launch: async () => ({ async newPage(opcoes: typeof abertura) { viewports.push(opcoes); abertura = opcoes; return page; }, async close() {} }) },
      }),
    };
  }

  it('passa ao visor o caminho do foco e a folga, e devolve o foco no resultado; o id sozinho vale como caminho de um segmento', async () => {
    const chamadas: unknown[][] = [];
    const resultado = await capturarMontagem({
      montagem: await resolvida(), foco: 'movel', folga: 0.25, vistas: ['frontal', 'direita'], projecao: 'ortografica', espera: 0, dependencias: infraestruturaFalsa(chamadas),
    });
    expect(resultado.ok).toBe(true);
    expect(resultado.resultado?.foco).toEqual(['movel']);
    expect(chamadas.map((c) => c.slice(1))).toEqual([['frontal', 'ortografica', ['movel'], 0.25], ['direita', 'ortografica', ['movel'], 0.25]]);
  });

  it('sem foco o visor recebe foco nulo e a folga de sempre, e o conjunto continua sendo o quadro', async () => {
    const chamadas: unknown[][] = [];
    const resultado = await capturarMontagem({ montagem: await resolvida(), vistas: ['frontal'], espera: 0, dependencias: infraestruturaFalsa(chamadas) });
    expect(resultado.resultado?.foco).toBeNull();
    expect(chamadas[0].slice(1)).toEqual(['frontal', 'perspectiva', null, 0.1]);
  });

  it('o foco que nenhuma peça visível tem recusa antes de subir infraestrutura, com o código de uso', async () => {
    let iniciou = false;
    const dependencias = { criarServidor: async () => { iniciou = true; throw new Error('não deveria iniciar'); } };
    const ausente = await capturarMontagem({ montagem: await resolvida(), foco: ['nao-existe'], dependencias });
    expect(ausente).toMatchObject({ ok: false, codigo: 2, erro: { codigo: 'foco-ausente' } });
    /* o foco precisa estar entre as peças que o filtro de `caminho` deixou */
    const filtrado = await capturarMontagem({ montagem: await resolvida(), caminho: ['movel'], foco: 'referencia', dependencias });
    expect(filtrado).toMatchObject({ ok: false, codigo: 2, erro: { codigo: 'foco-ausente' } });
    expect(iniciou).toBe(false);
  });

  it('o foco malformado e a folga fora da faixa são recusados', async () => {
    const dependencias = { criarServidor: async () => { throw new Error('não deveria iniciar'); } };
    for (const foco of [[], [''], [1], 3]) {
      expect(await capturarMontagem({ montagem: await resolvida(), foco: foco as never, dependencias })).toMatchObject({ ok: false, codigo: 2, erro: { codigo: 'foco-invalido' } });
    }
    for (const folga of [-0.1, 2.5, Number.NaN]) {
      expect(await capturarMontagem({ montagem: await resolvida(), foco: 'movel', folga, dependencias })).toMatchObject({ ok: false, erro: { codigo: 'captura-invalida' } });
    }
  });

  it('a altura pedida é a do quadro, e sem ela vale o 16 por 9 de sempre; altura fora da faixa é recusada', async () => {
    const viewports: unknown[] = [];
    const comAltura = await capturarMontagem({
      montagem: await resolvida(), largura: 1200, altura: 1000, vistas: ['frontal'], espera: 0, dependencias: infraestruturaFalsa([], viewports),
    });
    expect(comAltura.resultado?.capturas[0]).toMatchObject({ largura: 1200, altura: 1000 });
    const semAltura = await capturarMontagem({ montagem: await resolvida(), largura: 1280, vistas: ['frontal'], espera: 0, dependencias: infraestruturaFalsa([], viewports) });
    expect(semAltura.resultado?.capturas[0]).toMatchObject({ largura: 1280, altura: 720 });
    expect(viewports).toEqual([
      { viewport: { width: 1200, height: 1000 }, deviceScaleFactor: FATOR_DE_AMOSTRAGEM },
      { viewport: { width: 1280, height: 720 }, deviceScaleFactor: FATOR_DE_AMOSTRAGEM },
    ]);
    for (const altura of [100, 4000, 700.5]) {
      expect(await capturarMontagem({ montagem: await resolvida(), altura, dependencias: { criarServidor: async () => { throw new Error('não deveria iniciar'); } } })).toMatchObject({ ok: false, erro: { codigo: 'captura-invalida' } });
    }
  });
});

/* A BORDA SUAVIZADA: a página abre em dobro e o PNG volta ao tamanho do quadro pela média de cada bloco. */
describe('redução por média da captura', () => {
  it('cada pixel de saída é a média do bloco, canal por canal, com o alfa', () => {
    /* bloco da esquerda: três pixels brancos e um preto (uma aresta inclinada cortando o pixel de saída); bloco da direita: tudo preto */
    const entrada = pngDe(4, 2, (x, y) => (x < 2 ? (x === 1 && y === 1 ? [0, 0, 0, 255] : [255, 255, 255, 255]) : [0, 0, 0, 255]));
    const saida = PNG.sync.read(reduzirPorMedia(entrada, 2));
    expect([saida.width, saida.height]).toEqual([2, 1]);
    expect([...saida.data.subarray(0, 4)]).toEqual([191, 191, 191, 255]);
    expect([...saida.data.subarray(4, 8)]).toEqual([0, 0, 0, 255]);
  });

  it('uma aresta de pixel inteiro continua afiada, e um degrau de meio pixel vira nível intermediário', () => {
    const afiada = PNG.sync.read(reduzirPorMedia(pngDe(4, 4, (x) => (x < 2 ? [255, 0, 0, 255] : [0, 0, 255, 255])), 2));
    expect([...afiada.data.subarray(0, 4)]).toEqual([255, 0, 0, 255]);
    expect([...afiada.data.subarray(4, 8)]).toEqual([0, 0, 255, 255]);
    const degrau = PNG.sync.read(reduzirPorMedia(pngDe(2, 2, (_x, y) => (y === 0 ? [255, 255, 255, 255] : [0, 0, 0, 255])), 2));
    expect([...degrau.data.subarray(0, 4)]).toEqual([128, 128, 128, 255]);
  });

  it('o fator 1 devolve a imagem como veio, e o tamanho que não divide ou o fator inválido recusam', () => {
    const entrada = pngDe(3, 3);
    expect(reduzirPorMedia(entrada, 1)).toEqual(entrada);
    expect(() => reduzirPorMedia(entrada, 2)).toThrow(/não divide por 2/);
    expect(() => reduzirPorMedia(entrada, 0)).toThrow(/inteiro, 1 ou mais/);
    expect(() => reduzirPorMedia(entrada, 1.5)).toThrow(/inteiro, 1 ou mais/);
  });

  it('é determinística: a mesma entrada dá os mesmos bytes', () => {
    const entrada = pngDe(8, 8, (x, y) => [(x * 37 + y * 11) % 256, (x * 5) % 256, (y * 9) % 256, 255]);
    expect(reduzirPorMedia(entrada, 2)).toEqual(reduzirPorMedia(entrada, 2));
  });

  it('o fator padrão é 2', () => {
    expect(FATOR_DE_AMOSTRAGEM).toBe(2);
    expect(tamanhoDoPng(reduzirPorMedia(pngDe(2560, 1440)))).toEqual([1280, 720]);
  });
});
