// Testes de metal e tecido: determinismo, tile contínuo, efeito de cada campo, e regressão de madeira e liso.
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { gerarTextura } from '../src/index.js';

const hash = (t) => createHash('sha256').update(t.rgba).digest('hex');

// Diferença média absoluta entre duas colunas (ou linhas) de pixels.
function diferenca(t, a, b, coluna) {
  const { largura: W, altura: H, rgba } = t;
  let soma = 0;
  const n = coluna ? H : W;
  for (let k = 0; k < n; k += 1) {
    const pa = coluna ? k * W + a : a * W + k;
    const pb = coluna ? k * W + b : b * W + k;
    for (let c = 0; c < 3; c += 1) soma += Math.abs(rgba[pa * 4 + c] - rgba[pb * 4 + c]);
  }
  return soma / (n * 3);
}

function mediaInterna(t, coluna) {
  let soma = 0;
  for (let k = 1; k < t.largura; k += 1) soma += diferenca(t, k - 1, k, coluna);
  return soma / (t.largura - 1);
}

const laranja = (t) => {
  let n = 0;
  for (let p = 0; p < t.rgba.length; p += 4) if (t.rgba[p] > t.rgba[p + 2] + 25 && t.rgba[p] > t.rgba[p + 1] + 15) n += 1;
  return n;
};
const luz = (t) => {
  let s = 0;
  for (let p = 0; p < t.rgba.length; p += 4) s += t.rgba[p] + t.rgba[p + 1] + t.rgba[p + 2];
  return s / (t.rgba.length / 4) / 3;
};
const claros = (t, limite) => {
  let n = 0;
  for (let p = 0; p < t.rgba.length; p += 4) if (t.rgba[p] > limite) n += 1;
  return n;
};

describe('regressão de madeira e liso', () => {
  it('mantém os hashes de antes de metal e tecido existirem', () => {
    expect(hash(gerarTextura({ tipo: 'madeira', cor: [95, 48, 30], desgaste: 0.3, veio: 1 }, { px: 128, semente: 1 }))).toBe('b01d52af1b716d2a5c9471266802d4bc9cf1ef2b6f87c27687dc8cb6df28a11f');
    const completa = { tipo: 'madeira', cor: [95, 48, 30], desgaste: 0.6, veio: 3, tabuas: 4, borda: 0.5, ferrugem: 0.3 };
    expect(hash(gerarTextura(completa, { px: 128, semente: 2 }))).toBe('aeea4d5ec0ba65c63d3b2af850ceedb6d993db715b70db3c3e537bbf30fd19b2');
    expect(hash(gerarTextura({ tipo: 'liso', cor: [200, 40, 40], desgaste: 0.2 }, { px: 128, semente: 1 }))).toBe('da92286f74d87a259a5e359c0830267652ee8d5a3c1237d25313bf9d20265cd3');
  });
});

const materiais = {
  'metal pintado': { tipo: 'metal', cor: [238, 238, 232], desgaste: 0.2, ferrugem: 0.1 },
  'metal escovado': { tipo: 'metal', cor: [199, 198, 195], desgaste: 0.25 },
  'tecido azul': { tipo: 'tecido', cor: [50, 60, 120], desgaste: 0.3 },
  'tecido marrom': { tipo: 'tecido', cor: [120, 60, 35], desgaste: 0.35, ferrugem: 0.1 },
};

describe.each(Object.entries(materiais))('%s', (_nome, material) => {
  it('devolve um tile opaco de 0,5 m, determinístico, e a semente muda a imagem', () => {
    const a = gerarTextura(material, { px: 128, semente: 3 });
    expect(a.metrosPorTile).toBe(0.5);
    expect(a.rgba.length).toBe(128 * 128 * 4);
    for (let p = 3; p < a.rgba.length; p += 4) expect(a.rgba[p]).toBe(255);
    expect(hash(a)).toBe(hash(gerarTextura(material, { px: 128, semente: 3 })));
    expect(hash(a)).not.toBe(hash(gerarTextura(material, { px: 128, semente: 4 })));
  });

  it('é contínuo na emenda, com e sem desgaste e estrago', () => {
    for (const m of [material, { ...material, desgaste: 0.7, ferrugem: 0.6 }, { ...material, desgaste: 0, manchas: 0.6, rasgos: 0.6 }]) {
      const t = gerarTextura(m, { px: 128 });
      expect(diferenca(t, 127, 0, true)).toBeLessThan(Math.max(4, 2 * mediaInterna(t, true)));
      expect(diferenca(t, 127, 0, false)).toBeLessThan(Math.max(4, 2 * mediaInterna(t, false)));
    }
  });

  it('a média de cor fica perto da cor pedida sem desgaste', () => {
    const t = gerarTextura({ ...material, desgaste: 0, ferrugem: 0 }, { px: 128 });
    const m = [0, 0, 0];
    for (let p = 0; p < t.rgba.length; p += 4) for (let c = 0; c < 3; c += 1) m[c] += t.rgba[p + c];
    m.forEach((v, c) => expect(Math.abs(v / (t.rgba.length / 4) - material.cor[c])).toBeLessThan(22));
  });

  it('mais ferrugem tem mais pixels alaranjados', () => {
    const sem = gerarTextura({ ...material, desgaste: 0.5, ferrugem: 0 }, { px: 256 });
    const com = gerarTextura({ ...material, desgaste: 0.5, ferrugem: 1 }, { px: 256 });
    expect(hash(com)).not.toBe(hash(sem));
    // numa base que já é alaranjada a contagem não distingue a ferrugem
    if (laranja(sem) < sem.rgba.length / 8) expect(laranja(com)).toBeGreaterThan(laranja(sem) + 200);
  });

  it('desgaste muda a imagem e sem desgaste não há ferrugem', () => {
    const a = gerarTextura({ ...material, desgaste: 0, ferrugem: 0 }, { px: 128 });
    const b = gerarTextura({ ...material, desgaste: 0.6, ferrugem: 0 }, { px: 128 });
    expect(hash(a)).not.toBe(hash(b));
    if (material.cor[0] < material.cor[2] + 25) expect(laranja(a)).toBeLessThan(50);
  });
});

describe('metal', () => {
  it('o escovado corre ao longo do eixo x: varia pouco entre colunas e mais entre linhas', () => {
    const t = gerarTextura({ tipo: 'metal', cor: [199, 198, 195] }, { px: 256 });
    expect(mediaInterna(t, true)).toBeLessThan(mediaInterna(t, false) * 0.6);
  });

  it('cinza médio vira escovado e o acabamento declarado manda', () => {
    const cinza = { tipo: 'metal', cor: [199, 198, 195] };
    const claro = { tipo: 'metal', cor: [238, 238, 232] };
    const h = (m) => hash(gerarTextura(m, { px: 64 }));
    expect(h(cinza)).toBe(h({ ...cinza, acabamento: 'escovado' }));
    expect(h(cinza)).not.toBe(h({ ...cinza, acabamento: 'pintado' }));
    expect(h(claro)).toBe(h({ ...claro, acabamento: 'pintado' }));
    expect(h(claro)).not.toBe(h({ ...claro, acabamento: 'escovado' }));
  });

  it('o desgaste escurece a chapa pintada', () => {
    const limpo = gerarTextura({ tipo: 'metal', cor: [238, 238, 232] }, { px: 128 });
    const gasto = gerarTextura({ tipo: 'metal', cor: [238, 238, 232], desgaste: 0.8 }, { px: 128 });
    expect(luz(gasto)).toBeLessThan(luz(limpo));
  });
});

describe('tecido', () => {
  it('tem trama nos dois eixos', () => {
    const t = gerarTextura({ tipo: 'tecido', cor: [50, 60, 120] }, { px: 256 });
    const x = mediaInterna(t, true);
    const y = mediaInterna(t, false);
    expect(x).toBeGreaterThan(0.8);
    expect(y).toBeGreaterThan(0.8);
    expect(x / y).toBeLessThan(2);
    expect(y / x).toBeLessThan(2);
  });

  it('manchas escurecem e rasgos clareiam o tecido', () => {
    const base = { tipo: 'tecido', cor: [50, 60, 120] };
    expect(luz(gerarTextura({ ...base, manchas: 1 }, { px: 128 }))).toBeLessThan(luz(gerarTextura(base, { px: 128 })) - 2);
    expect(claros(gerarTextura({ ...base, rasgos: 1 }, { px: 256 }), 140)).toBeGreaterThan(100);
    expect(claros(gerarTextura(base, { px: 256 }), 140)).toBe(0);
  });

  it('o tile pequeno também fecha na emenda', () => {
    const t = gerarTextura({ tipo: 'tecido', cor: [50, 60, 120], desgaste: 0.4 }, { px: 64 });
    expect(diferenca(t, 63, 0, true)).toBeLessThan(Math.max(4, 2 * mediaInterna(t, true)));
  });
});
