/* pasta-da-peca.test.mjs — a peça passa a poder ser uma pasta.
 *
 * O defeito que este arquivo guarda é a pasta virar acervo. Se a varredura
 * descer dentro do diretório da peça, cada referência, cada rodada e cada
 * arquivo que morar ali vira uma peça fantasma que o gate tenta medir e
 * reprova por não ter receita. A pasta é UMA peça, e o que está dentro dela é
 * material dela.
 *
 * O segundo caso é a identidade: com a receita chamada `receita.js`, o nome do
 * arquivo deixa de identificar qualquer coisa. Quem identifica é a pasta.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { listarAcervo } from '../../src/bancada/acervo-receitas.js';
import { pecasDoAcervo, referenciasAusentes } from './guarda-acervo.mjs';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';

const RECEITA = 'export default { meta: { nome: "ensaio" }, PASSOS: [] };\n';
let area;

beforeEach(() => { area = mkdtempSync(join(tmpdir(), 'pasta-peca-')); });
afterEach(() => rmSync(area, { recursive: true, force: true }));

function acervoDeMentira() {
  const acervo = join(area, 'prototipos/procedural/v3/pecas');
  mkdirSync(join(acervo, 'peca-em-pasta/referencias'), { recursive: true });
  writeFileSync(join(acervo, 'peca-em-pasta/receita.js'), RECEITA, 'utf8');
  writeFileSync(join(acervo, 'peca-em-pasta/referencias/lateral.png'), 'png', 'utf8');
  writeFileSync(join(acervo, 'peca-em-pasta/rodada-01.json'), '{}', 'utf8');
  writeFileSync(join(acervo, 'peca-de-arquivo.js'), RECEITA, 'utf8');
  return acervo;
}

describe('pasta da peça', () => {
  it('a pasta é UMA peça, e o que está dentro dela não vira peça', () => {
    const acervo = acervoDeMentira();
    expect(pecasDoAcervo(acervo)).toEqual(['peca-de-arquivo', 'peca-em-pasta']);
  });

  it('o resolvedor abre a pasta pela receita, e o nome curto continua valendo', () => {
    acervoDeMentira();
    const caminho = resolverCaminhoReceita('peca-em-pasta', { raiz: area });
    expect(caminho.endsWith('peca-em-pasta/receita.js')).toBe(true);
    /* O caminho completo da pasta também resolve, para quem copiou da saída de
       um comando em vez de digitar o nome. */
    expect(resolverCaminhoReceita('prototipos/procedural/v3/pecas/peca-em-pasta', { raiz: area }))
      .toBe(caminho);
  });

  it('a bancada nomeia a peça pela PASTA, não pelo arquivo', () => {
    const entradas = listarAcervo({
      '../../prototipos/procedural/v3/pecas/peca-em-pasta/receita.js': async () => ({ default: {} }),
      '../../prototipos/procedural/v3/pecas/peca-de-arquivo.js': async () => ({ default: {} }),
      '../../prototipos/procedural/v3/pecas/prensa/montagem.js': async () => ({ default: {} }),
    });
    expect(entradas.map((e) => e.id)).toEqual(['peca-de-arquivo', 'peca-em-pasta', 'prensa']);
    /* Peça em pasta não é montagem: quem abre precisa saber a diferença. */
    expect(entradas.find((e) => e.id === 'peca-em-pasta').montagem).toBe(false);
    expect(entradas.find((e) => e.id === 'prensa').montagem).toBe(true);
  });

  it('REPROVA referência declarada que não existe no disco', () => {
    const acervo = acervoDeMentira();
    const plano = { referencias: ['referencias/lateral.png', 'referencias/frontal.png'] };
    /* A que existe dentro da pasta da peça passa; a que não existe é nomeada. */
    expect(referenciasAusentes('peca-em-pasta', plano, { raiz: area }))
      .toEqual(['referencias/frontal.png']);
  });

  it('a forma antiga de referência, relativa à raiz, continua valendo', () => {
    const acervo = acervoDeMentira();
    const plano = { referencias: ['prototipos/procedural/v3/pecas/peca-em-pasta/referencias/lateral.png'] };
    expect(referenciasAusentes('peca-em-pasta', plano, { raiz: area })).toEqual([]);
    expect(referenciasAusentes('peca-de-arquivo', plano, { raiz: area })).toEqual([]);
    expect(acervo).toBeTruthy();
  });

  it('peça sem plano ou sem referência não tem o que conferir', () => {
    acervoDeMentira();
    expect(referenciasAusentes('peca-em-pasta', null, { raiz: area })).toEqual([]);
    expect(referenciasAusentes('peca-em-pasta', { referencias: [] }, { raiz: area })).toEqual([]);
  });

  it('pasta sem entrada de receita continua sendo varrida por dentro', () => {
    const acervo = join(area, 'prototipos/procedural/v3/pecas');
    mkdirSync(join(acervo, 'familia'), { recursive: true });
    writeFileSync(join(acervo, 'familia/uma.js'), RECEITA, 'utf8');
    writeFileSync(join(acervo, 'familia/outra.js'), RECEITA, 'utf8');
    expect(pecasDoAcervo(acervo)).toEqual(['familia/outra', 'familia/uma']);
  });
});
