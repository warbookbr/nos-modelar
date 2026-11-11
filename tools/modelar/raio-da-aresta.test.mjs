/* raio-da-aresta.test.mjs — a medida do raio de uma aresta sobre a malha final, com a verdade conhecida: o cilindro de raio dado entre dois
 * planos (a 90 e a 120 graus por dentro), a quina viva, o perfil que não é arco (a quina por colunas de apoio) e o comando com o pedido. Sem domínio. */
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { perfilDoApoio, raioDoFilete } from '../../procedural/nucleo/apoio-do-vinco.js';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { CAPACIDADES, executar as fichas } from './capacidade.mjs';
import { amostrasDaLinha, executar, linhaDaAresta, linhasDosVincos, medirAresta, medirLinhas, medirPerfil, menorRaioDeCurvatura, prepararMalha } from './raio-da-aresta.mjs';
import { malhaDoCilindro, receitaDaDobra } from './fixtures/dobra-por-apoio.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const ESBOCO = join(AQUI, 'fixtures/dobra-por-apoio.esboco.mjs');
const area = mkdtempSync(join(tmpdir(), 'raio-da-aresta-'));
const gravarReceita = (nome, receita) => { const f = join(area, nome); writeFileSync(f, `export default ${JSON.stringify(receita)};\n`); return f; };

/* o corte da malha do cilindro pela linha da quina viva, ao longo de z */
const medirCilindro = (opcoes, pedidoMm = null) => medirAresta(prepararMalha(malhaDoCilindro(opcoes)), { nome: 'quina', pontos: [[0, 0, 0], [0, 0, 0.3]] }, { cadaMm: 50, pedidoMm });

describe('o raio de um cilindro entre dois planos', () => {
  it.each([[90, 8], [60, 8], [90, 14], [60, 5]])('a dobra de %i graus (por dentro %i) com raio %i mm sai a 2% do verdadeiro, e as duas medidas concordam', (angulo, raio) => {
    const r = medirCilindro({ raio, angulo });
    expect(r.cortes).toBe(6);
    expect(r.medidos).toBe(6);
    expect(Math.abs(r.raioMm.mediano - raio) / raio).toBeLessThan(0.02);
    expect(r.raioMm.maximo - r.raioMm.minimo).toBeLessThan(0.05);
    expect(Math.abs(r.curvaturaMm.mediano - raio) / raio).toBeLessThan(0.02);
    expect(r.anguloDaDobraGraus.mediano).toBeCloseTo(angulo, 0);
    expect(r.naturezas).toEqual({ arco: 6 });
  });

  it('com o pedido igual ao raio nenhum corte foge; com outro pedido todos fogem, e o pior desvio diz onde', () => {
    const certo = medirCilindro({ raio: 8, angulo: 90 }, 8);
    expect(certo).toMatchObject({ foraDoPedido: 0, sobPedido: true });
    const errado = medirCilindro({ raio: 8, angulo: 90 }, 12);
    expect(errado).toMatchObject({ foraDoPedido: 6, sobPedido: false, pedidoMm: 12 });
    expect(errado.piorDesvio).toMatchObject({ referenciaMm: 12, diferenca: -4 });
    expect(errado.piorDesvio.raioMm).toBeCloseTo(8, 1);
    expect(errado.piorDesvio.posicaoMm).toHaveLength(3);
    /* 8 mm contra 9,5 mm de pedido ainda cabe nos 20% */
    expect(medirCilindro({ raio: 8, angulo: 90 }, 9.5).sobPedido).toBe(true);
  });
});

describe('a quina viva e o perfil que não é arco', () => {
  it('a quina viva sai com raio zero e dita viva, e foge de qualquer pedido', () => {
    const r = medirCilindro({ raio: 0, angulo: 90 }, 3);
    expect(r.raioMm.maximo).toBeLessThan(0.25);
    expect(r.naturezas).toEqual({ viva: 6 });
    expect(r.sobPedido).toBe(false);
  });

  it('o perfil que a subdivisão dá com colunas de apoio não é arco: as duas medidas divergem, e o filete é o do núcleo', () => {
    const { neutro, entrada } = executarReceita(receitaDaDobra({ angulo: 90, apoio: 6, vizinho: 40 }));
    const [aresta] = medirLinhas(neutro, linhasDosVincos(entrada), { pedidos: {} }).arestas;
    const esperado = raioDoFilete(perfilDoApoio({ angulo: 90, apoio: 6, vizinho: 40 })).raio;
    /* o raio do filete é o que o núcleo converte em distância do apoio, a 2% do da relação fechada */
    expect(Math.abs(aresta.raioMm.mediano - esperado) / esperado).toBeLessThan(0.02);
    expect(aresta.naturezas).toEqual({ 'nao-arco': aresta.cortes });
    const corte = aresta.porCorte[0];
    expect(corte.divergencia).toBeGreaterThan(0.25);
    expect(corte.curvaturaMm).toBeLessThan(0.7 * corte.raioMm);
    expect(aresta.anguloDaDobraGraus.mediano).toBeCloseTo(90, 0);
  });

  it('o menor raio de curvatura é o do círculo por três pontos seguidos, e o perfil reto não tem', () => {
    const arco = Array.from({ length: 20 }, (_, k) => [10 * Math.cos((k * Math.PI) / 40), 10 * Math.sin((k * Math.PI) / 40)]);
    expect(menorRaioDeCurvatura(arco).raio).toBeCloseTo(10, 6);
    expect(menorRaioDeCurvatura([[0, 0], [1, 0], [2, 0], [3, 0]])).toBeNull();
    expect(medirPerfil([[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]).natureza).toBe('plana');
  });

  it('a dobra de menos de 2 graus não tem raio que se leia', () => {
    const r = medirCilindro({ raio: 400, angulo: 1 });
    expect(r.medidos).toBe(0);
    expect(r.naturezas.plana).toBe(6);
  });
});

describe('os cortes sobre a linha', () => {
  it('a cada 50 mm a partir de meio passo de folga, e a linha curta tem um corte no meio', () => {
    const { amostras, comprimentoMm } = amostrasDaLinha([[0, 0, 0], [0, 0, 0.3]], 50);
    expect(comprimentoMm).toBeCloseTo(300, 9);
    expect(amostras.map((a) => Math.round(a.s))).toEqual([25, 75, 125, 175, 225, 275]);
    expect(amostras[0].t).toEqual([0, 0, 1]);
    expect(amostrasDaLinha([[0, 0, 0], [0, 0, 0.03]], 50).amostras.map((a) => a.s)).toEqual([15]);
  });

  it('a aresta dada por dois pontos em mm, e a recusa de texto ruim', () => {
    const l = linhaDaAresta('0,0,0:0,0,300');
    expect(l.pontos).toEqual([[0, 0, 0], [0, 0, 0.3]]);
    expect(() => linhaDaAresta('0,0,0')).toThrow(/--aresta espera/);
    expect(() => linhaDaAresta('0,0:1,1,1')).toThrow(/--aresta espera/);
    expect(() => linhaDaAresta('1,1,1:1,1,1')).toThrow(/dois pontos iguais/);
  });

  it('o corte longe da aresta é dito, e não medido', () => {
    const r = medirAresta(prepararMalha(malhaDoCilindro({ raio: 8, angulo: 90 })), { nome: 'longe', pontos: [[0.2, 0.2, 0], [0.2, 0.2, 0.3]] }, { cadaMm: 100 });
    expect(r.medidos).toBe(0);
    expect(r.porCorte[0].natureza).toBe('sem-corte');
  });
});

describe('o comando', () => {
  const receita = gravarReceita('dobra.mjs', receitaDaDobra({ angulo: 90, apoio: 6, vizinho: 40 }));
  const nitidez = (r) => JSON.parse(r.stdout).pecas[0].arestas[0].raioMm.mediano;

  it('mede o vinco nomeado da receita, com a tabela de raio, curvatura, dobra, natureza e pior desvio', async () => {
    const r = await executar([receita]);
    expect(r.codigo).toBe(0);
    expect(r.stdout).toMatch(/quina \(passo 0\): 16 de 16 cortes medidos em 800 mm/);
    expect(r.stdout).toMatch(/raio do filete \(mín \/ mediano \/ máx\): 3,7 \/ 3,7 \/ 3,7 mm; menor raio de curvatura: 2,1 \/ 2,1 \/ 2,1 mm; dobra de 90,0/);
    expect(r.stdout).toMatch(/16 nao-arco \(o perfil não é arco/);
    expect(r.stdout).toMatch(/pior desvio de 3,7 mm \(a mediana\)/);
  });

  it('--pedido sai 1 quando o raio foge, 0 quando cabe na tolerância, e --tolerancia a muda', async () => {
    const medido = nitidez(await executar([receita, '--json']));
    expect((await executar([receita, `--pedido=quina:${medido}`])).codigo).toBe(0);
    const fora = await executar([receita, '--pedido=quina:6']);
    expect(fora.codigo).toBe(1);
    expect(fora.stdout).toMatch(/FORA DO PEDIDO/);
    expect(fora.stdout).toMatch(/1 de 1 arestas com pedido fogem dele por mais de 20%: quina/);
    expect((await executar([receita, '--pedido=quina:6', '--tolerancia=0.5'])).codigo).toBe(0);
    expect(JSON.parse((await executar([receita, '--pedido=quina:6', '--json'])).stdout)).toMatchObject({ tolerancia: 0.2, foraDoPedido: ['quina'] });
  });

  it('o raio que o próprio vinco declara vale sem --pedido', () => {
    const { neutro, entrada } = executarReceita(receitaDaDobra({ angulo: 90, apoio: 6, vizinho: 40 }));
    entrada.PASSOS[0][1].vincos[0].raio = 0.006;
    const [aresta] = medirLinhas(neutro, linhasDosVincos(entrada), { pedidos: {} }).arestas;
    expect(aresta).toMatchObject({ pedidoMm: 6, origemDoPedido: 'raio do vinco', sobPedido: false });
    expect(medirLinhas(neutro, linhasDosVincos(entrada), { pedidos: { quina: 3.7 } }).arestas[0]).toMatchObject({ pedidoMm: 3.7, origemDoPedido: '--pedido', sobPedido: true });
  });

  it('--aresta mede o trecho dado por dois pontos, e --json traz o perfil de cada corte', async () => {
    /* a chapa de uma pele só: com duas, o corte entra pela pele mais perto do primeiro ponto, e o raio de uma é o da outra mais a espessura */
    const uma = gravarReceita('uma-pele.mjs', receitaDaDobra({ angulo: 90, apoio: 6, vizinho: 40, espessura: 0 }));
    const r = await executar([uma, '--aresta=0,0,100:0,0,500', '--cada=100', '--json']);
    expect(r.codigo).toBe(0);
    const [aresta] = JSON.parse(r.stdout).pecas[0].arestas;
    expect(aresta).toMatchObject({ nome: 'aresta', cortes: 4, medidos: 4 });
    expect(aresta.porCorte[0]).toMatchObject({ natureza: 'nao-arco', pontosDoPerfil: expect.any(Number) });
    expect(aresta.raioMm.mediano).toBeCloseTo(3.7, 1);
  });

  it('--automatico acha a crista que a receita não declarou e a mede, a 3% do raio que o núcleo converte', async () => {
    const sem = gravarReceita('sem-vinco.mjs', receitaDaDobra({ angulo: 120, apoio: 50, vizinho: 50, declarar: 'nenhum' }));
    const r = await executar([sem, '--automatico', '--janela=150', '--json']);
    expect(r.codigo).toBe(0);
    const arestas = JSON.parse(r.stdout).pecas[0].arestas;
    expect(arestas).toHaveLength(1);
    expect(arestas[0].nome).toBe('crista1');
    const esperado = raioDoFilete(perfilDoApoio({ angulo: 120, apoio: 50, vizinho: 50 })).raio;
    expect(Math.abs(arestas[0].raioMm.mediano - esperado) / esperado).toBeLessThan(0.03);
    expect(arestas[0].anguloDaDobraGraus.mediano).toBeCloseTo(120, 0);
    /* a receita que declara a quina não tem crista a achar */
    expect((await executar([receita, '--automatico'])).codigo).toBe(2);
  });

  it('lê o esboço 2.0 direto, e recusa com o código 2 o vinco que não existe, o pedido sem aresta e o argumento ruim', async () => {
    const e = await executar([ESBOCO, '--json']);
    expect(e.codigo).toBe(0);
    expect(JSON.parse(e.stdout).entrada).toBe('esboço dobra-por-apoio.esboco.mjs, opção 1');
    const semVinco = await executar([receita, '--vinco=outra']);
    expect(semVinco.codigo).toBe(2);
    expect(semVinco.stderr).toMatch(/o vinco 'outra' não existe/);
    const pedido = await executar([receita, '--pedido=outra:3']);
    expect(pedido.codigo).toBe(2);
    expect(pedido.stderr).toMatch(/--pedido cita 'outra'/);
    expect((await executar([receita, '--pedido=quina'])).codigo).toBe(2);
    expect((await executar([receita, '--cada=0'])).codigo).toBe(2);
    expect((await executar([receita, '--nao-existe=1'])).codigo).toBe(2);
    expect((await executar([join(area, 'nada.mjs')])).codigo).toBe(2);
    expect((await executar([])).codigo).toBe(2);
  });

  it('a peça sem vinco nomeado diz como medir, e a ficha da capacidade acha o comando por raio, aresta e filete', async () => {
    const sem = gravarReceita('sem-vinco-2.mjs', receitaDaDobra({ declarar: 'nenhum' }));
    const r = await executar([sem]);
    expect(r.codigo).toBe(2);
    expect(r.stderr).toMatch(/--aresta=x,y,z:x,y,z ou --automatico/);
    expect(CAPACIDADES.raioDaAresta.arquivo).toBe('tools/modelar/raio-da-aresta.mjs');
    for (const termo of ['raio', 'aresta', 'filete', 'esboço']) expect((await fichas([termo])).stdout).toContain('raioDaAresta');
  });
});
