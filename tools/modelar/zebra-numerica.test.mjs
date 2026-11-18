/* zebra-numerica.test.mjs — a zebra numérica nas chapas de prova da correção de superfície: o controle sem ruído não tem laço fechado e o com ruído tem,
 * o número varia menos que os ±5 extremos do protótipo entre densidades de pontos, a persistência dos extremos, as exclusões da caixa (`menos`, por caixa e por disco) e as recusas da medida. */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { receitaDeProva } from '../fixtures/correcao-de-superficie/chapas.mjs';
import { nomesDasFaixas, persistencia, zebraNumerica } from './zebra-numerica.mjs';

const chapaDe = (nome) => {
  const receita = receitaDeProva(nome);
  return executarReceita({ ...receita, PASSOS: receita.PASSOS.filter(([op]) => op === 'subdivisao'), vaos: undefined }).neutro.chapas[0];
};
const sem = chapaDe('rede-sem-ruido');
const com = chapaDe('rede-com-ruido');

describe('persistencia', () => {
  it('uma fileira com a borda nas pontas: o pico alto morre na borda e o baixo na sela entre os dois', () => {
    const valores = [0, 3, 1, 2, 0];
    const vizinhos = [[1], [0, 2], [1, 3], [2, 4], [3]];
    const pares = persistencia(valores, vizinhos, [1, 0, 0, 0, 1]);
    expect(pares.map((p) => [p.pico, p.sela, p.persistencia]).sort((a, b) => a[0] - b[0])).toEqual([[1, 0, 3], [3, 2, 1]]);
  });
  it('um platô não dá extremo com persistência', () => {
    const pares = persistencia([1, 1, 1], [[1], [0, 2], [1]], [1, 0, 1]);
    expect(pares.every((p) => p.persistencia === 0)).toBe(true);
  });
});

describe('zebraNumerica', () => {
  it('as faixas ganham nome', () => {
    expect(nomesDasFaixas([100, 200, 500])).toEqual(['<100', '100-200', '200-500', '>=500']);
  });

  it('a chapa de controle não tem laço fechado e a com ruído tem, a taxa de base da medida', () => {
    const a = zebraNumerica(sem, { passoMm: 25 }); const b = zebraNumerica(com, { passoMm: 25 });
    expect(a.regioes[0].lacos).toBe(0);
    expect(b.regioes[0].lacos).toBeGreaterThanOrEqual(2);
    expect(b.regioes[0].lacos).toBeGreaterThan(a.regioes[0].lacos);
  });

  it('o número varia menos que o ruído de ±5 extremos entre densidades de pontos', () => {
    const lidos = [40, 25, 15].map((p) => zebraNumerica(com, { passoMm: p }).regioes[0]);
    expect(lidos[2].pontos).toBeGreaterThan(lidos[0].pontos * 3);
    const ext = lidos.map((r) => r.extremos); const lac = lidos.map((r) => r.lacos);
    expect(Math.max(...ext) - Math.min(...ext)).toBeLessThanOrEqual(1);
    expect(Math.max(...lac) - Math.min(...lac)).toBeLessThanOrEqual(1);
    const esp = lidos.map((r) => r.lacosEsperados);
    expect((Math.max(...esp) - Math.min(...esp)) / Math.max(...esp)).toBeLessThan(0.15);
  });

  it('é determinística e a caixa vazia é recusada com o que foi recebido', () => {
    expect(zebraNumerica(com, { passoMm: 40 })).toEqual(zebraNumerica(com, { passoMm: 40 }));
    expect(() => zebraNumerica(com, { caixas: { fora: { x: [1e6, 2e6] } } })).toThrow(/região 'fora' não tem face/);
    expect(() => zebraNumerica(com, { passoMm: 0 })).toThrow(/--passo espera/);
    expect(() => zebraNumerica(com, { faixas: [200, 100] })).toThrow('--faixas espera mm crescentes e maiores que zero, como 100,200,500');
    expect(() => zebraNumerica(com, { olhar: 'w' })).toThrow("o olhar espera +x, -x, +y, -y, +z ou -z, e veio 'w'");
  });

  describe('as exclusões da caixa (`menos`)', () => {
    const ilhasDe = (menos) => { const r = zebraNumerica(com, { passoMm: 25, caixas: { chapa: menos ? { menos } : {} } }).regioes[0]; return { r, ilhas: r.direcoes.flatMap((d) => d.ilhas) }; };
    const perto = (ilhas, x, z, raio) => ilhas.filter((i) => Math.hypot(i.ponto[0] - x, i.ponto[2] - z) <= raio);
    const inteira = ilhasDe(null);

    it('a chapa de prova tem um extremo em (249, 250) e outro em (844, 250), os dois que as exclusões disputam', () => {
      expect(perto(inteira.ilhas, 249, 250, 5)).toHaveLength(1);
      expect(perto(inteira.ilhas, 844, 250, 5)).toHaveLength(1);
      expect(inteira.r.excluidas).toBeUndefined();
    });

    it('o disco tira o extremo que cai dentro dele e deixa o de fora', () => {
      const { r, ilhas } = ilhasDe([{ centro: [249, 0, 250], normal: [0, 2, 0], raio: 60 }]);
      expect(perto(ilhas, 249, 250, 60)).toHaveLength(0);
      expect(perto(ilhas, 844, 250, 5)).toHaveLength(1);
      expect(r.excluidas).toBeGreaterThan(0);
      expect(r.faces + r.excluidas).toBe(inteira.r.faces);
      expect(r.extremos).toBeLessThan(inteira.r.extremos);
    });

    it('o disco vale em qualquer distância ao longo da normal, e o centro longe do extremo não o tira', () => {
      expect(perto(ilhasDe([{ centro: [249, 900, 250], normal: [0, 1, 0], raio: 60 }]).ilhas, 249, 250, 60)).toHaveLength(0);
      expect(perto(ilhasDe([{ centro: [450, 0, 60], normal: [0, 1, 0], raio: 40 }]).ilhas, 249, 250, 5)).toHaveLength(1);
    });

    it('a caixa tira o extremo que cai dentro dela e deixa o de fora, e o eixo ausente não limita', () => {
      const { r, ilhas } = ilhasDe([{ x: [790, 900], z: [190, 310] }]);
      expect(perto(ilhas, 844, 250, 5)).toHaveLength(0);
      expect(perto(ilhas, 249, 250, 5)).toHaveLength(1);
      expect(r.faces + r.excluidas).toBe(inteira.r.faces);
      const faixa = ilhasDe([{ x: [790, 900] }]);
      expect(faixa.r.excluidas).toBeGreaterThan(r.excluidas);
      expect(faixa.ilhas.filter((i) => i.ponto[0] >= 790 && i.ponto[0] <= 900)).toHaveLength(0);
    });

    it('duas exclusões somam, e a lista vazia não muda a medida', () => {
      const { ilhas } = ilhasDe([{ centro: [249, 0, 250], normal: [0, 1, 0], raio: 60 }, { x: [790, 900], z: [190, 310] }]);
      expect(perto(ilhas, 249, 250, 60)).toHaveLength(0);
      expect(perto(ilhas, 844, 250, 5)).toHaveLength(0);
      const vazia = ilhasDe([]);
      expect(vazia.r.excluidas).toBe(0);
      expect(vazia.r.extremos).toBe(inteira.r.extremos);
      expect(vazia.r.lacosEsperados).toBe(inteira.r.lacosEsperados);
    });

    it('recusa cada formato errado dizendo a região, a exclusão e o que veio', () => {
      const com1 = (menos) => () => zebraNumerica(com, { caixas: { painel: { menos } } });
      expect(com1({ x: [0, 1] })).toThrow(/região 'painel' espera em `menos` uma lista de caixas e discos, e veio \{"x":\[0,1\]\}/);
      expect(com1([7])).toThrow(/exclusão 1 da região 'painel' espera um objeto de caixa ou de disco, e veio 7/);
      expect(com1([{ x: [0, 1] }, [1, 2]])).toThrow(/exclusão 2 da região 'painel' espera um objeto de caixa ou de disco/);
      expect(com1([{ x: [0, 1], diametro: 3 }])).toThrow(/tem chave desconhecida \(diametro\)/);
      expect(com1([{ x: [0, 1], raio: 3 }])).toThrow('mistura caixa (x) com disco (raio); declare uma exclusão para cada');
      expect(com1([{}])).toThrow(/está vazia; a caixa pede ao menos um de x, y e z/);
      expect(com1([{ x: [10, 0] }])).toThrow(/espera em x o intervalo \[min, max\] em mm, com min até max, e veio \[10,0\]/);
      expect(com1([{ z: [0, '1'] }])).toThrow(/espera em z o intervalo \[min, max\]/);
      expect(com1([{ y: 5 }])).toThrow(/espera em y o intervalo \[min, max\]/);
      expect(com1([{ normal: [0, 1, 0], raio: 3 }])).toThrow(/espera no disco o centro \[x, y, z\] em mm, e veio undefined/);
      expect(com1([{ centro: [0, 0], normal: [0, 1, 0], raio: 3 }])).toThrow(/espera no disco o centro \[x, y, z\] em mm, e veio \[0,0\]/);
      expect(com1([{ centro: [0, 0, 0], normal: [0, 0, 0], raio: 3 }])).toThrow(/espera no disco a normal \[nx, ny, nz\] diferente de zero, e veio \[0,0,0\]/);
      expect(com1([{ centro: [0, 0, 0], raio: 3 }])).toThrow(/espera no disco a normal/);
      expect(com1([{ centro: [0, 0, 0], normal: [0, 1, 0], raio: 0 }])).toThrow(/espera no disco o raio em mm maior que zero, e veio 0/);
      expect(com1([{ centro: [0, 0, 0], normal: [0, 1, 0] }])).toThrow(/espera no disco o raio em mm maior que zero/);
      expect(com1([{ x: [-1e6, 1e6] }])).toThrow(/região 'painel' ficou sem face: as exclusões de `menos` tiram as 1000 faces que a caixa cobre/);
    });

    it('a exclusão chega pela linha de comando, no JSON de --caixas', () => {
      const pasta = mkdtempSync(join(tmpdir(), 'zebra-menos-'));
      try {
        const caixas = join(pasta, 'caixas.json');
        writeFileSync(caixas, JSON.stringify({ inteira: {}, semDisco: { menos: [{ centro: [249, 0, 250], normal: [0, 1, 0], raio: 60 }] } }));
        const bom = spawnSync('node', ['tools/modelar/zebra-numerica.mjs', 'rede-com-ruido', `--caixas=${caixas}`], { encoding: 'utf8' });
        expect(bom.status).toBe(0);
        const [a, b] = JSON.parse(bom.stdout).regioes;
        expect(b.excluidas).toBeGreaterThan(0);
        expect(b.extremos).toBeLessThan(a.extremos);
        writeFileSync(caixas, JSON.stringify({ ruim: { menos: [{ raio: 5 }] } }));
        const ruim = spawnSync('node', ['tools/modelar/zebra-numerica.mjs', 'rede-com-ruido', `--caixas=${caixas}`], { encoding: 'utf8' });
        expect(ruim.status).toBe(2);
        expect(ruim.stderr).toMatch(/zebra: a exclusão 1 da região 'ruim' espera no disco o centro/);
      } finally { rmSync(pasta, { recursive: true, force: true }); }
    });
  });

  it('o olhar pedido troca as direções lidas', () => {
    const r = zebraNumerica(com, { olhar: '+x' }).regioes[0];
    expect(r.olhar).toBe('+x');
    expect(r.direcoes.map((d) => d.eixo)).toEqual(['y', 'z']);
  });

  it('responde a --ajuda e recusa opção desconhecida', () => {
    const ajuda = spawnSync('node', ['tools/modelar/zebra-numerica.mjs', '--ajuda'], { encoding: 'utf8' });
    expect(ajuda.status).toBe(0);
    expect(ajuda.stderr).toMatch(/uso: node tools\/modelar\/zebra-numerica.mjs/);
    const ruim = spawnSync('node', ['tools/modelar/zebra-numerica.mjs', 'rede-sem-ruido', '--foo=1'], { encoding: 'utf8' });
    expect(ruim.status).toBe(2);
    const passo = spawnSync('node', ['tools/modelar/zebra-numerica.mjs', 'rede-sem-ruido', '--passo=largo'], { encoding: 'utf8' });
    expect(passo.status).toBe(2);
    expect(passo.stderr).toContain("zebra: --passo espera um número, e veio 'largo'");
  });
});
