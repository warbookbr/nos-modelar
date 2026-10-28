/* ondulacao-leitura.test.mjs — o dado lido com peso, o aviso de estações próximas e a face virada na ferramenta de ondulação
 *
 * O gate da fatia 2 do plano da gaiola que segue as feições, sobre a chapa curva lida com erro de
 * tools/modelar/fixtures/leitura-prova.js (desenhada por código, nenhum número de referência externa). Com ruído de leitura de
 * ±2 mm plantado em todos os pontos, a cota exata (o comportamento antigo) copia e amplifica o erro em ondulações de mais de
 * 2 mm, e a gaiola que declara `leitura` mede com peso e fica abaixo de 0,8 mm. O erro está nos próprios pontos da gaiola, e por
 * isso o peso não leva a chapa abaixo do limiar padrão de 0,3 mm: ele tira a amplificação, e a medida da ferramenta com limiar de 1 mm
 * (metade do erro plantado) sai sem falha. Estações-chave a 4 mm uma da outra avisam pelo nome, e com a cota exata dobram a chapa
 * em centenas de faces, que a ferramenta acusa como face virada; a forma lisa continua sem falha. */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ondulacaoDaReceita, superficiesDaReceita } from './ondulacao-da-superficie.mjs';
import { receita } from './fixtures/leitura-prova.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const ler = (opcoes, ferramenta = {}) => ondulacaoDaReceita(receita(opcoes), ferramenta).superficies[0];
const maior = (s) => Math.max(0, ...s.falhas.map((f) => f.amplitudeMm));
/* a chapa é quase horizontal: a face virada tem a área projetada em y negativa */
const viradasPelaArea = (opcoes) => {
  const s = superficiesDaReceita(receita(opcoes))[0];
  const area = (f) => { let a = 0; for (let k = 0; k < f.length; k++) { const p = s.vertices[f[k]], q = s.vertices[f[(k + 1) % f.length]]; a += (p[2] - q[2]) * (p[0] + q[0]); } return a / 2; };
  return s.faces.filter((f) => area(f) < -2e-9).length;
};

describe('o erro de leitura plantado na chapa: cota exata e cota com peso', () => {
  it('na forma lisa, sem erro, a ferramenta não acusa nada, com a cota exata e com a leitura', () => {
    for (const leitura of [false, true]) {
      const s = ler({ ruidoMm: 0, leitura });
      expect(s.falhas).toEqual([]);
      expect(s.facesViradas).toBe(0);
    }
  });

  it('com ±2 mm a cota exata ondula acima de 2 mm, e a leitura com peso fica abaixo de 0,8 mm e sem falha acima de 1 mm (metade do erro plantado)', () => {
    const exata = ler({ leitura: false });
    const comPeso = ler({ leitura: true });
    expect(maior(exata)).toBeGreaterThan(2);
    expect(exata.falhas.filter((f) => f.amplitudeMm > 1).length).toBeGreaterThan(10);
    expect(maior(comPeso)).toBeLessThan(0.8);
    expect(maior(exata) / maior(comPeso)).toBeGreaterThan(2.5);
    expect(comPeso.falhas.filter((f) => f.amplitudeMm > 1)).toEqual([]);
    expect(comPeso.desvioMm.p95).toBeLessThan(exata.desvioMm.p95 / 2);
    expect(comPeso.facesViradas).toBe(0);
  });
});

describe('estações-chave a 4 mm uma da outra', () => {
  const apertadas = { apertadas: 5, ruidoMm: 0 };

  it('a gaiola avisa pelo nome de cada par e diz o espaçamento mínimo, e a ferramenta relata os avisos sem contá-los como falha', () => {
    const s = ler({ ...apertadas, leitura: true });
    expect(s.avisosDaGaiola.map((a) => a.estacoes)).toEqual([['e8', 'e9'], ['e9', 'e10'], ['e10', 'e11'], ['e11', 'e12'], ['e12', 'e13']]);
    for (const a of s.avisosDaGaiola) expect(a).toMatchObject({ ref: 'estacoesProximas', espacamentoMm: 4, minimoRecomendadoMm: 40 });
    expect(s.avisosDaGaiola[0].texto).toMatch(/estações-chave 'e8' e 'e9' ficam a 4 mm uma da outra/);
    expect(s.falhas).toEqual([]);
    expect(ler({ ruidoMm: 0, leitura: true }).avisosDaGaiola).toEqual([]);
  });

  it('com a opção estrita o aviso grita ao montar a gaiola, com os nomes', () => {
    expect(() => ondulacaoDaReceita(receita({ ...apertadas, leitura: { estrito: true } }))).toThrow(/a leitura é estrita e 5 pares de estações-chave estão mais perto[^]*'e8' e 'e9'/);
  });

  it('com a cota exata a chapa lisa dobra sobre si, e a ferramenta acusa a face virada com a posição e os pontos nomeados', () => {
    const s = ler({ ...apertadas, leitura: false });
    const viradas = s.falhas.filter((f) => f.tipo === 'faceVirada');
    expect(viradas.length).toBeGreaterThan(0);
    expect(s.facesViradas).toBeGreaterThan(300);
    /* a contagem confere com a da área projetada, que não usa a ferramenta */
    expect(s.facesViradas).toBe(viradasPelaArea({ ...apertadas, leitura: false }));
    const nomes = viradas.flatMap((f) => f.pontos.map((p) => p.nome));
    expect(nomes.length).toBeGreaterThan(0);
    for (const n of nomes) expect(n).toMatch(/^e\d+_c\d+$/);
    expect(nomes.some((n) => /^e(8|9|10|11|12|13)_/.test(n))).toBe(true);
    for (const f of viradas) {
      expect(f.anguloGraus).toBeGreaterThan(150);
      expect(f.posicaoMm[2]).toBeGreaterThan(790);
      expect(f.posicaoMm[2]).toBeLessThan(830);
      expect(f.faces).toBeGreaterThan(0);
    }
  });

  it('com a leitura as mesmas estações não dobram a chapa: o peso tira a face virada, e o aviso já tinha dito', () => {
    const s = ler({ ...apertadas, leitura: true });
    expect(s.facesViradas).toBe(0);
    expect(viradasPelaArea({ ...apertadas, leitura: true })).toBe(0);
  });
});

describe('a linha de comando', () => {
  it('imprime facesViradas e avisosDaGaiola, e aceita --virada-graus', () => {
    const r = spawnSync(process.execPath, [join(AQUI, 'ondulacao-da-superficie.mjs'), 'tools/modelar/fixtures/leitura-prova.js', '--limiar-mm=1', '--virada-graus=100'], { cwd: join(AQUI, '../..'), encoding: 'utf8' });
    expect(r.status).toBe(0);
    const saida = JSON.parse(r.stdout);
    expect(saida.opcoes.viradaGraus).toBe(100);
    expect(saida.superficies[0].facesViradas).toBe(0);
    expect(saida.superficies[0].avisosDaGaiola).toEqual([]);
    expect(saida.falhas).toBe(0);
  });
});
