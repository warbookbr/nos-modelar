/* Desempenho do esboço: a projeção reaproveita as faces de cada forma, só mede os pares cujas caixas na tela se
   cruzam, o desenho tem a opção de menos lados nos círculos, e a linha de comando tem o modo rápido. Os valores
   fixos dos testes de projeção foram medidos com a implementação anterior a essas otimizações. */
import { describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { desenharEsboco, ErroDeEsboco, explodir, FLECHA_PX, ladosPorEscala, resolverOpcao, VISTAS } from '../src/index.js';
import { medirProjecaoDaOpcao, verificarProjecao } from '../src/projecao.js';
import { verificarContato } from '../src/contato.js';
import { expandirEsboco } from '../src/expandir.js';
import { analisarEsboco, gerarEsboco } from '../../../tools/modelar/esboco.mjs';

const fixture = (nome) => JSON.parse(readFileSync(new URL(`./fixtures/${nome}.esboco.json`, import.meta.url), 'utf8'));
const caixa = (id, centro, extra = {}) => ({ id, tipo: 'caixa', largura: 20, altura: 20, profundidade: 20, centro, ...extra });

describe('projeção: cache de faces e filtro por caixa envolvente', () => {
  it('a cópia deslocada pela explosão dá a mesma medida que refatiar a forma já deslocada, em toda vista', () => {
    const esboco = expandirEsboco(fixture('moto-curvas'));
    const rs = resolverOpcao(esboco.opcoes[0], 'A', esboco.pontos).filter((r) => r.forma.oculto !== true);
    for (const explosao of [{ eixo: 'z', fator: 1.6 }, { eixo: 'x', fator: 2.2 }]) {
      const ex = explodir(rs, explosao);
      /* o espalhamento cria objetos sem origem registrada: as faces saem de um fatiamento novo, na posição final */
      const novas = ex.map((r) => ({ ...r }));
      for (const vista of Object.keys(VISTAS)) {
        expect(medirProjecaoDaOpcao(ex, vista), `${explosao.eixo} ${vista}`).toEqual(medirProjecaoDaOpcao(novas, vista));
      }
    }
  });

  it('sem `areas` o resultado tem os mesmos pares e não traz as áreas', () => {
    const esboco = expandirEsboco(fixture('moto-componentes'));
    const rs = resolverOpcao(esboco.opcoes[0], 'A', esboco.pontos).filter((r) => r.forma.oculto !== true);
    for (const vista of Object.keys(VISTAS)) {
      const completo = medirProjecaoDaOpcao(rs, vista);
      const enxuto = medirProjecaoDaOpcao(rs, vista, { areas: false });
      expect(enxuto.pares).toEqual(completo.pares);
      expect(enxuto.celula_mm).toBe(completo.celula_mm);
      expect(enxuto).not.toHaveProperty('areas');
      expect(Object.keys(completo.areas)).toHaveLength(rs.length);
    }
  });

  it('formas com caixas separadas na tela não geram par, e uma que se cruza gera', () => {
    const longe = Array.from({ length: 30 }, (_, k) => caixa(`c${k}`, [k * 100, 0, 0]));
    const rs = resolverOpcao({ formas: longe });
    for (const vista of ['frontal', 'superior']) expect(medirProjecaoDaOpcao(rs, vista, { areas: false }).pares).toEqual([]);
    const perto = resolverOpcao({ formas: [...longe, caixa('sobre', [300, 5, 0])] });
    const pares = medirProjecaoDaOpcao(perto, 'frontal', { areas: false }).pares;
    expect(pares.map((p) => [p.a, p.b])).toEqual([['c3', 'sobre']]);
    /* a grade tem 320 células no maior lado (3 000 mm): a caixa de 20 mm é uma faixa de 2 células, e a fração sai em passos de 0,25 */
    expect(pares[0].fracao).toBeGreaterThanOrEqual(0.5);
  });

  it('os achados e a explosão sugerida das motos de prova são os que a implementação anterior media', () => {
    const componentes = verificarProjecao(fixture('moto-componentes'), { forcar: true });
    expect(componentes.achados).toHaveLength(60);
    expect(componentes.achados[0]).toMatchObject({ vista: 'isometrica', pecas: ['quadro.coluna', 'garfoD.coroa'], fracao: 1, area_mm2: 4875, folga_mm: 2 });
    expect(componentes.achados[1]).toMatchObject({ pecas: ['rodaFrente.pneu', 'garfoE.perna'], fracao: 0.947, area_mm2: 15028.3, folga_mm: 16.1 });
    const curvas = verificarProjecao(fixture('moto-curvas'), { forcar: true });
    expect(curvas.achados).toHaveLength(63);
    expect(curvas.achados[0]).toMatchObject({ pecas: ['quadro.coluna', 'garfoD.coroa'], fracao: 1, area_mm2: 4908.6, folga_mm: 2 });
    /* a explosão sugerida percorre os 24 pares eixo e fator: as duas opções da moto de parâmetros bastam */
    const parametros = verificarProjecao(fixture('moto-parametros'), { forcar: true, sugerir: true });
    expect(parametros.achados).toHaveLength(28);
    expect(parametros.explosao.map((e) => [e.eixo, e.fator, e.achados_antes, e.achados_depois])).toEqual([['y', 2.4, 14, 5], ['y', 2.4, 14, 5]]);
  }, 120000);

  it('a moto de prova com sugestão de explosão leva menos de 10 s e uma opção de 66 formas mede em menos de 20 s', () => {
    const t0 = performance.now();
    const moto = verificarProjecao(fixture('moto'), { forcar: true, sugerir: true });
    const decorrido = (performance.now() - t0) / 1000;
    expect(moto.explosao[0]).toMatchObject({ origem: 'sugerida', eixo: 'z' });
    expect(decorrido).toBeLessThan(10);
    /* 66 formas: 22 hastes, 22 anéis e 22 caixas, todos com o círculo de 128 lados */
    const formas = Array.from({ length: 22 }, (_, k) => [
      { id: `h${k}`, tipo: 'cilindro', diametro: 30, comprimento: 200, eixo: 'x', centro: [k * 40, 100, 0] },
      { id: `a${k}`, tipo: 'anel', diametroExterno: 120, diametroInterno: 80, espessura: 40, eixo: 'x', centro: [k * 40, 0, 150] },
      caixa(`c${k}`, [k * 40, -100, -150], { largura: 60, altura: 60, profundidade: 60 }),
    ]).flat();
    const denso = { opcoes: [{ titulo: 'T', formas }], contato: { usar: true, folga: 5000 } };
    const t1 = performance.now();
    verificarContato(denso);
    verificarProjecao(denso, { forcar: true });
    expect((performance.now() - t1) / 1000).toBeLessThan(20);
  }, 120000);
});

describe('desenho com menos lados', () => {
  const anel = { id: 'r', tipo: 'anel', diametroExterno: 600, diametroInterno: 400, espessura: 100, eixo: 'x', centro: [0, 300, 0] };
  const haste = { id: 'h', tipo: 'cilindro', diametro: 20, comprimento: 400, eixo: 'y', centro: [0, 500, 0] };
  const e = { opcoes: [{ titulo: 'T', formas: [anel, haste] }] };

  it('sem o campo o desenho é o de sempre, e com ele o SVG fica menor', () => {
    const antigo = fixture('casa');
    expect(desenharEsboco(antigo).svg).toBe(readFileSync(new URL('./fixtures/casa.svg', import.meta.url), 'utf8'));
    expect(desenharEsboco({ ...e, ladosPorEscala: false }).svg).toBe(desenharEsboco(e).svg);
    const completo = desenharEsboco(e).svg;
    const enxuto = desenharEsboco({ ...e, ladosPorEscala: true }).svg;
    expect(enxuto.length).toBeLessThan(completo.length / 2);
    expect(enxuto).not.toBe(completo);
    const motoCompleta = desenharEsboco(fixture('moto-curvas')).svg;
    expect(desenharEsboco({ ...fixture('moto-curvas'), ladosPorEscala: true }).svg.length).toBeLessThan(motoCompleta.length * 0.6);
  });

  it('os lados seguem a escala: círculo pequeno no mínimo, grande até 128, e `lados` declarado vence', () => {
    expect(ladosPorEscala(2)).toBe(16);
    expect(ladosPorEscala(2, 32)).toBe(32);
    expect(ladosPorEscala(1e6)).toBe(128);
    const passos = [5, 20, 60, 150, 400].map((r) => ladosPorEscala(r));
    expect(passos).toEqual([...passos].sort((a, b) => a - b));
    /* a flecha do polígono escolhido cabe em FLECHA_PX */
    for (const r of [20, 60, 150, 400]) {
      const n = ladosPorEscala(r);
      expect(r * (1 - Math.cos(Math.PI / n))).toBeLessThanOrEqual(FLECHA_PX + 1e-9);
    }
    const declarado = { opcoes: [{ formas: [{ ...haste, lados: 100 }] }] };
    expect(desenharEsboco({ ...declarado, ladosPorEscala: true }).svg).toBe(desenharEsboco(declarado).svg);
  });

  it('o gate e a projeção medem o esboço completo mesmo com o campo ligado', () => {
    const c = { ...e, contato: { usar: true, folga: 5000 } };
    expect(JSON.stringify(verificarContato({ ...c, ladosPorEscala: true }))).toBe(JSON.stringify(verificarContato(c)));
    expect(JSON.stringify(verificarProjecao({ ...c, ladosPorEscala: true }, { forcar: true }))).toBe(JSON.stringify(verificarProjecao(c, { forcar: true })));
  });

  it('valida `ladosPorEscala` e o `lados` do anel com a mensagem do campo', () => {
    expect(() => desenharEsboco({ ...e, ladosPorEscala: 'sim' })).toThrow(/"ladosPorEscala" deve ser true ou false/);
    expect(() => desenharEsboco({ opcoes: [{ formas: [{ ...anel, lados: 16 }] }] })).toThrow(/"lados" do anel deve ser um inteiro de 32 a 128/);
    expect(() => desenharEsboco({ opcoes: [{ formas: [{ ...anel, lados: 40.5 }] }] })).toThrow(ErroDeEsboco);
    expect(desenharEsboco({ opcoes: [{ formas: [{ ...anel, lados: 64 }] }] }).svg.length).toBeLessThan(desenharEsboco({ opcoes: [{ formas: [anel] }] }).svg.length);
  });
});

describe('modo rápido e sugestão sob pedido na linha de comando', () => {
  const sobreposto = () => ({ opcoes: [{ titulo: 'T', formas: [caixa('a', [0, 0, 0]), caixa('b', [30, 5, 5])] }], contato: { usar: true, folga: 500 } });

  it('--rapido no desenho grava só o SVG, sem PNG', async () => {
    const pasta = mkdtempSync(join(tmpdir(), 'rapido-'));
    const arq = join(pasta, 'p.esboco.json');
    writeFileSync(arq, JSON.stringify(sobreposto()));
    const r = await gerarEsboco(arq, { rapido: true });
    expect(r.png).toBeNull();
    expect(existsSync(join(pasta, 'p.svg'))).toBe(true);
    expect(existsSync(join(pasta, 'p.png'))).toBe(false);
    expect(r.contato.usar).toBe(true);
  });

  it('--analise --rapido não gera imagem nem abre navegador e diz isso no manifesto', async () => {
    const pasta = mkdtempSync(join(tmpdir(), 'rapido-'));
    const arq = join(pasta, 'p.esboco.json');
    writeFileSync(arq, JSON.stringify(sobreposto()));
    const { pasta: saida, manifesto } = await analisarEsboco(arq, { rapido: true });
    expect(manifesto.arquivos).toEqual([]);
    expect(manifesto.rapido).toBe(true);
    expect(manifesto.projecao.variantes).toEqual([]);
    expect(manifesto.projecao.explosao).toEqual([]);
    expect(manifesto.projecao.relatorio).toHaveLength(1);
    expect(existsSync(join(saida, 'manifesto.json'))).toBe(true);
    expect(existsSync(join(saida, 'isometrica-legendas-sem-centros.png'))).toBe(false);
    await expect(analisarEsboco(arq, { rapido: true, zoom: 'frontal:0,0,10,10' })).rejects.toThrow(/--zoom recorta uma imagem/);
  });

  it('a análise só sugere explosão e deslocamento com --sugerir, e sem ele as imagens saem com menos lados', async () => {
    const pasta = mkdtempSync(join(tmpdir(), 'rapido-'));
    const arq = join(pasta, 'p.esboco.json');
    writeFileSync(arq, JSON.stringify(sobreposto()));
    const padrao = (await analisarEsboco(arq, { rapido: true })).manifesto;
    expect(padrao.projecao.explosao).toEqual([]);
    expect(padrao.sugestoes.filter((s) => s.origem === 'projecao')).toEqual([]);
    expect(padrao.sugerir).toBeUndefined();
    expect(Object.values(padrao.projecao.porVista).flat().every((a) => a.sugestao === undefined)).toBe(true);
    const pedido = (await analisarEsboco(arq, { rapido: true, sugerir: true })).manifesto;
    expect(pedido.sugerir).toBe(true);
    expect(pedido.projecao.explosao[0]).toMatchObject({ origem: 'sugerida' });
    expect(pedido.sugestoes.some((s) => s.origem === 'projecao')).toBe(true);
    const completo = (await analisarEsboco(arq)).manifesto;
    expect(completo.desenho).toEqual({ ladosPorEscala: true });
    expect(completo.rapido).toBeUndefined();
    writeFileSync(arq, JSON.stringify({ ...sobreposto(), ladosPorEscala: false }));
    expect((await analisarEsboco(arq)).manifesto.desenho).toEqual({ ladosPorEscala: false });
  }, 120000);
});
