/* contornos.test.js — a saída é o formato dos contornos da imagem com `origem`, a mesma descrição dá o mesmo arquivo byte a byte,
   a parte escondida fica com o pedaço visível, a silhueta é a união das partes dentro do modelo e os números saem na grade de 0,001 mm. */
import { describe, expect, it } from 'vitest';
import { desenhar } from '../src/index.js';
import { carrinho } from './carrinho.js';
import { chapa } from './formas.js';

const emFrente = () => { const d = carrinho(); d.frenteParaFundo = ['pe', 'braco', 'roda', 'cacamba']; return d; };
const serializar = (c) => `${JSON.stringify(c, null, 1)}\n`;

describe('mecanifica.contornos@1 do desenho', () => {
  it('traz o formato, a origem e o que o esboço e a prancha leem, sem os campos de imagem e de pixel', async () => {
    const { contornos } = await desenhar(emFrente(), { origem: { desenho: 'lateral.desenho.json', sha256: 'abc' } });
    expect(Object.keys(contornos)).toEqual(['formato', 'origem', 'silhueta', 'regioes']);
    expect(contornos.formato).toBe('mecanifica.contornos@1');
    expect(contornos.origem).toEqual({ desenho: 'lateral.desenho.json', sha256: 'abc', resolvedor: 'planegcs@1.3.0' });
    expect(contornos).not.toHaveProperty('imagem');
    expect(contornos).not.toHaveProperty('mmPorPx');
    expect(contornos).not.toHaveProperty('residuo');
    expect(Object.keys(contornos.silhueta)).toEqual(['contornoMm', 'linhaDeForaMm', 'pedacos', 'linhasDeForaMm']);
    expect(Object.keys(contornos.regioes)).toEqual(['braco', 'cacamba', 'pe', 'roda']);
    for (const r of Object.values(contornos.regioes)) {
      expect(Object.keys(r)).toEqual(['areaMm2', 'contornoMm', 'pedacos']);
      expect(r.pedacos[0].contornoMm).toEqual(r.contornoMm);
      expect(r.contornoMm.length).toBeGreaterThanOrEqual(3);
      expect(JSON.stringify(r)).not.toMatch(/Px/);
    }
  });

  it('sem origem declarada, grava a identidade da descrição por um hash do conteúdo', async () => {
    const { contornos } = await desenhar(emFrente());
    expect(contornos.origem.desenho).toBeNull();
    expect(contornos.origem.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('a mesma descrição dá o mesmo arquivo byte a byte, e a ordem dos campos e das relações não muda o contorno', async () => {
    const a = await desenhar(emFrente(), { origem: { desenho: 'x', sha256: 'y' } });
    const b = await desenhar(emFrente(), { origem: { desenho: 'x', sha256: 'y' } });
    expect(serializar(b.contornos)).toBe(serializar(a.contornos));
    expect(b.svg).toBe(a.svg);
    expect(b.texto).toBe(a.texto);
    const d = emFrente();
    d.relacoes = [...d.relacoes.slice(8), ...d.relacoes.slice(0, 8)];
    d.pontos = Object.fromEntries(Object.entries(d.pontos).reverse());
    const c = await desenhar(d, { origem: { desenho: 'x', sha256: 'y' } });
    expect(serializar(c.contornos)).toBe(serializar(a.contornos));
    expect(c.svg).toBe(a.svg);
  });

  it('os números ficam na grade de 0,001 mm, sem zero negativo e sem ruído da última casa', async () => {
    const { contornos } = await desenhar(emFrente());
    const texto = serializar(contornos);
    expect(texto).not.toMatch(/-0[,\n\s]/);
    const numeros = [...texto.matchAll(/-?\d+\.\d+/g)].map((m) => m[0]);
    expect(numeros.length).toBeGreaterThan(100);
    for (const n of numeros) expect(n.split('.')[1].length, n).toBeLessThanOrEqual(3);
  });

  it('cada anel começa no menor ponto, é anti-horário e não repete o primeiro no fim', async () => {
    const { contornos } = await desenhar(emFrente());
    const area = (a) => a.reduce((s, [h, v], i) => s + h * a[(i + 1) % a.length][1] - a[(i + 1) % a.length][0] * v, 0) / 2;
    const aneis = [contornos.silhueta.contornoMm, ...Object.values(contornos.regioes).flatMap((r) => r.pedacos.map((p) => p.contornoMm))];
    for (const a of aneis) {
      const menor = a.reduce((m, p) => (p[0] < m[0] || (p[0] === m[0] && p[1] < m[1]) ? p : m));
      expect(a[0]).toEqual(menor);
      expect(area(a)).toBeGreaterThan(0);
      expect(a.at(-1)).not.toEqual(a[0]);
    }
  });

  it('a parte escondida fica com o pedaço visível: a roda perde o que o braço cobre', async () => {
    const com = await desenhar(emFrente());
    const sem = await desenhar(carrinho());
    const cheio = 0.5 * 64 * 200 * 200 * Math.sin((2 * Math.PI) / 64);
    expect(sem.contornos.regioes.roda.areaMm2).toBeCloseTo(cheio, 1);
    expect(com.contornos.regioes.roda.areaMm2).toBeLessThan(sem.contornos.regioes.roda.areaMm2 - 7000);
    /* O pé fica à frente do braço e o cobre da borda de cima até o eixo, onde o pé acaba: metade da faixa de 30 mm de largura que o
       pé cruza no braço, cuja espessura vertical é 40 / cos(inclinação). */
    const inclinacao = (com.relatorio.medidas.partes.braco.anguloGraus * Math.PI) / 180;
    expect(com.contornos.regioes.braco.areaMm2).toBeCloseTo(1500 * 40 - (30 * 40) / Math.cos(inclinacao) / 2, -1);
    expect(com.contornos.regioes.pe.areaMm2).toBe(515 * 30);
  });

  it('a silhueta é a união das partes: a caçamba solta do braço é um pedaço à parte, do maior para o menor em ordem de área', async () => {
    const { contornos } = await desenhar(emFrente());
    const { pedacos } = contornos.silhueta;
    expect(pedacos).toHaveLength(2);
    expect(pedacos[0].areaMm2).toBeGreaterThan(pedacos[1].areaMm2);
    expect(contornos.silhueta.contornoMm).toEqual(pedacos[0].contornoMm);
    expect(contornos.silhueta.linhasDeForaMm).toHaveLength(2);
    /* O maior pedaço é a caçamba (cerca de 1.206 por 537); o outro é a roda, o braço e o pé. */
    expect(pedacos[0].areaMm2).toBeGreaterThan(300000);
  });

  it('a linha de fora passa além da silhueta, para as partes que tocam a borda ficarem dentro dela', async () => {
    const { contornos } = await desenhar(chapa());
    const caixa = (a) => [Math.min(...a.map((p) => p[0])), Math.min(...a.map((p) => p[1])), Math.max(...a.map((p) => p[0])), Math.max(...a.map((p) => p[1]))];
    const [h0, v0, h1, v1] = caixa(contornos.silhueta.contornoMm);
    const [f0, g0, f1, g1] = caixa(contornos.silhueta.linhaDeForaMm);
    for (const [fora, dentro] of [[f0, h0], [g0, v0]]) expect(fora).toBeLessThan(dentro);
    for (const [fora, dentro] of [[f1, h1], [g1, v1]]) expect(fora).toBeGreaterThan(dentro);
    expect(h0 - f0).toBeCloseTo(0.5, 3);
  });

  it('a parte fora do modelo tem região e sai da silhueta', async () => {
    const d = chapa();
    d.partes.trava.foraDoModelo = true;
    d.relacoes = d.relacoes.filter((r) => r.nome !== 'trava no furo');
    d.relacoes.push({ nome: 'trava no furo', distancia: ['F', 'Z'], mm: 60 });
    const { relatorio, contornos } = await desenhar(d);
    expect(relatorio.estado).toBe('resolvido');
    expect(contornos.regioes.trava.foraDoModelo).toBe(true);
    expect(contornos.regioes.chapa).not.toHaveProperty('foraDoModelo');
    expect(contornos.silhueta.contornoMm).toEqual([[0, 0], [200, 0], [200, 100], [0, 100]]);
    expect(relatorio.medidas.vista.larguraMm).toBe(200);
  });

  it('a parte inteira atrás de outra sai dos contornos e o relatório avisa', async () => {
    const d = chapa();
    d.partes.tampa = { poligono: ['A', 'B', 'C', 'D'] };
    d.frenteParaFundo = ['tampa', 'trava', 'furo', 'chapa'];
    const { relatorio, contornos } = await desenhar(d);
    expect(contornos.regioes).not.toHaveProperty('chapa');
    expect(relatorio.ocultas).toEqual(['chapa', 'furo', 'trava']);
    expect(relatorio.avisos.join('\n')).toMatch(/a parte "chapa" fica toda escondida pelas partes à frente dela em "frenteParaFundo"/);
  });
});

describe('a vista em traço', () => {
  it('é um SVG de texto puro, igual nas duas execuções, com o nome de cada parte fora do desenho', async () => {
    const { contornos, svg } = await desenhar(emFrente());
    const de = await desenhar(emFrente());
    expect(de.svg).toBe(svg);
    expect(svg.startsWith('<svg ')).toBe(true);
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true);
    const caminhos = [...svg.matchAll(/<path d="([^"]+)" fill="none" stroke="#000000"/g)].map((m) => m[1]);
    expect(caminhos).toHaveLength(2);
    const xs = caminhos.flatMap((c) => [...c.matchAll(/(-?\d+\.\d+),/g)].map((m) => Number(m[1])));
    const [minX, maxX] = [Math.min(...xs), Math.max(...xs)];
    for (const nome of Object.keys(contornos.regioes)) {
      const t = svg.match(new RegExp(`<text x="(-?\\d+\\.\\d+)" y="[^"]+" text-anchor="(end|start)" fill="#111111">${nome}</text>`));
      expect(t, nome).not.toBeNull();
      if (t[2] === 'end') expect(Number(t[1])).toBeLessThan(minX);
      else expect(Number(t[1])).toBeGreaterThan(maxX);
    }
  });

  it('põe o nome da parte entre aspas e símbolos de XML sem quebrar o SVG', async () => {
    const d = chapa();
    d.partes['a&b'] = d.partes.trava; delete d.partes.trava;
    d.frenteParaFundo = ['a&b', 'furo', 'chapa'];
    d.relacoes = d.relacoes.map((r) => (r.angulo ? { ...r, angulo: ['chao', ['F', 'Z']] } : r));
    const { svg } = await desenhar(d);
    expect(svg).toContain('>a&amp;b</text>');
  });
});
