/* compat.test.js — o `mecanifica.desenho@3` não muda o que o @1 e o @2 davam. Os hashes abaixo são os do contorno, da vista em traço e do
   texto do relatório que a versão anterior do módulo (a de antes do @3) gravou para estes objetos sintéticos; o código novo tem de
   dar os mesmos bytes. E todo desenho gravado no repositório continua válido. */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { desenhar, validarDescricao } from '../src/index.js';
import { carrinho, carrinhoRedundante } from './carrinho.js';
import { chapa, duasRodas, meiaLua, placaArredondada } from './formas.js';

const h = (x) => createHash('sha256').update(x).digest('hex').slice(0, 16);
const origem = { desenho: 'lateral.desenho.json', sha256: 'x' };

/* contornos, svg, texto — medidos com o módulo anterior ao @3 */
const DE_ANTES = {
  carrinho: [carrinho, '00ed0126544c0190', '7a0b3e1a57939242', '5309737154604569'],
  carrinhoRedundante: [carrinhoRedundante, '00ed0126544c0190', '7a0b3e1a57939242', '46ab6396143fba3f'],
  chapa: [chapa, 'f4ae7e7aa38daf96', '0d3ffae4904e365e', '622d4afd229e59d8'],
  meiaLua: [meiaLua, '598ea45e1f6f0da8', '611b210fd2fe1079', '7746b7ff306d3ddd'],
  duasRodas: [duasRodas, 'bb98d59451dad0df', 'a3341b3a97d25148', 'f32f87b2cec9cdae'],
  placaArredondada: [placaArredondada, '9e1b06b56792895a', '960abe46092ae50b', '55e37cf18c7559a7'],
};

describe('o @1 e o @2 dão os mesmos bytes que davam antes do @3', () => {
  it.each(Object.entries(DE_ANTES))('%s', async (_nome, [fazer, contornos, svg, texto]) => {
    const r = await desenhar(fazer(), { origem });
    expect([h(JSON.stringify(r.contornos)), h(r.svg), h(r.texto)]).toEqual([contornos, svg, texto]);
  });

  it('o carrinho escrito em @1 (sem raioDoCanto) dá o mesmo contorno que em @2', async () => {
    const d = carrinho(); d.formato = 'mecanifica.desenho@1';
    const r = await desenhar(d, { origem });
    expect(h(JSON.stringify(r.contornos))).toBe(DE_ANTES.carrinho[1]);
  });
});

describe('os desenhos gravados no repositório', () => {
  const raiz = new URL('../../../docs/mecanifica/banco-de-provas/', import.meta.url).pathname;
  const arquivos = existsSync(raiz) ? readdirSync(raiz, { recursive: true }).filter((f) => f.endsWith('.desenho.json')).sort() : [];

  it('há desenhos gravados para conferir', () => {
    expect(arquivos.length).toBeGreaterThan(0);
  });

  for (const arquivo of arquivos) {
    it(`${arquivo} valida`, () => {
      const d = JSON.parse(readFileSync(join(raiz, arquivo), 'utf8'));
      expect(validarDescricao(d).erros).toEqual([]);
    });
  }
});
