/* dobra-aceita-pela-cadeia.test.mjs — a região de `PLANO.dobrasAceitas` vale pela cadeia inteira, e a ruga na ponta dela não some junto (plano de conferência, fatia 1).
 *
 * O caso é a crista da coluna do para-brisa do furgão realista na main de 2026-11-12, antes da correção da ruga do canto de cima: a vizinhança dela está em
 * `tools/fixtures/vinco-da-coluna/coluna-do-furgao.json` (faces a até 70 mm das duas cadeias que a régua acha, não o furgão). A região declarada naquela receita era a
 * caixa do MEIO da cadeia, e a régua a testava só no centro dela: a cadeia de 830,6 mm passava como aceita, com a ponta do canto, onde está a ruga, dentro do que
 * se aceitou. Com a cadeia inteira dentro da caixa, a região de antes não a cobre mais e a ruga volta a ser achado. */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { aceitacaoDe, normalizarDobrasAceitas, separarAceitos } from '../../src/autoria/dobras-aceitas.js';
import { vincoOcultoDaSuperficie } from './vinco-oculto.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const bruto = JSON.parse(readFileSync(join(AQUI, '../fixtures/vinco-da-coluna/coluna-do-furgao.json'), 'utf8'));
const sup = { ...bruto, partes: bruto.partes.map((p) => new Set(p)), gaiola: { vertices: [] }, nomeDe: () => null };
const MOTIVO = 'crista da borda da coroa ao longo da coluna do para-brisa (desenho da prancha)';
const aceitar = (regiao) => normalizarDobrasAceitas([{ parte: 'carroceria', tipos: ['vinco'], regiao, motivo: MOTIVO }], ['carroceria']);

/* as duas declarações do furgão de 2026-11-12 para o lado +x, como estão na receita dele */
const DE_ANTES = [
  ...aceitar({ min: [906, 1815, 1458], max: [930, 1850, 1482] }),
  ...aceitar({ min: [866, 2217, 1146], max: [916, 2267, 1196] }),
];

describe('a dobra aceita pela cadeia inteira: a coluna do para-brisa do furgão antes da correção da ruga', () => {
  const { vincos } = vincoOcultoDaSuperficie(sup);
  const coluna = vincos.find((v) => v.comprimentoMm > 500); const canto = vincos.find((v) => v.comprimentoMm < 500);

  it('a vizinhança tem as duas cadeias, com as pontas e a caixa de cada uma, e 39 mm entre a de baixo e a do canto', () => {
    expect(vincos).toHaveLength(2);
    expect(coluna).toMatchObject({ parte: 'carroceria', arestas: 53, comprimentoMm: 830.6 });
    expect(canto).toMatchObject({ parte: 'carroceria', arestas: 12, comprimentoMm: 272.8 });
    expect(coluna.pontasMm).toEqual([[910.1, 2130.5, 1253.6], [958.7, 1467.6, 1728.6]]);
    expect(canto.pontasMm).toEqual([[851.2, 2361.5, 1058.4], [908.1, 2162.3, 1230.9]]);
    const d = Math.hypot(...[0, 1, 2].map((k) => coluna.pontasMm[0][k] - canto.pontasMm[1][k]));
    expect(d).toBeGreaterThan(38); expect(d).toBeLessThan(40);
  });

  it('o centro de cada cadeia cai na região de antes (a régua velha as aceitava), e a cadeia inteira não cabe em região nenhuma delas', () => {
    for (const a of [coluna, canto]) {
      expect(DE_ANTES.some((r) => a.posicaoMm.every((x, k) => x >= r.regiao.min[k] && x <= r.regiao.max[k]))).toBe(true);
      expect(aceitacaoDe(DE_ANTES, { ...a, tipo: 'vinco' })).toBeNull();
    }
  });

  it('separarAceitos com a região de antes deixa as duas cadeias, a ruga entre elas, como achados', () => {
    const { aceitos, restantes } = separarAceitos(DE_ANTES, vincos.map((v) => ({ ...v, tipo: 'vinco' })));
    expect(aceitos).toEqual([]);
    expect(restantes).toHaveLength(2);
  });

  it('a região que contém a cadeia inteira a aceita, e a que deixa a ponta do canto de fora, não', () => {
    const justa = aceitar({ min: coluna.caixaMm.min, max: coluna.caixaMm.max });
    expect(aceitacaoDe(justa, { ...coluna, tipo: 'vinco' })).not.toBeNull();
    const semAPonta = aceitar({ min: coluna.caixaMm.min, max: [coluna.caixaMm.max[0], coluna.pontasMm[0][1] - 5, coluna.caixaMm.max[2]] });
    expect(aceitacaoDe(semAPonta, { ...coluna, tipo: 'vinco' })).toBeNull();
  });
});
