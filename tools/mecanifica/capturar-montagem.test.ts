import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error — resolvedor JavaScript público, exercitado pelo contrato.
import { resolverMontagemPersistida } from '../../src/autoria/resolver-montagem-persistida.js';
// @ts-expect-error — serviço MJS exercitado pelo contrato visual.
import { capturarMontagem, serializarMontagemVisual, VISTAS_MONTAGEM } from './capturar-montagem.mjs';

const MONTAGENS = join(process.cwd(), 'tools/mecanifica/fixtures/montagens-persistidas');
const PECAS = join(process.cwd(), 'tools/mecanifica/fixtures/pecas-resolvidas');
const ler = (arquivo: string) => JSON.parse(readFileSync(arquivo, 'utf8'));

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
    const png = Buffer.from('89504e470d0a1a0a', 'hex');
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
        return png;
      },
    };
    const browser = {
      async newPage() { return page; },
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
    expect(resultado.resultado?.capturas[0].dados).toEqual(png);
    expect(fechamentos).toEqual({ browser: 1, vite: 1 });
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
});
