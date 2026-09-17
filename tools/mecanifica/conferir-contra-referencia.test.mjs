import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  calibrarPorAncoras, envelopeDaMalha, envelopeDaFoto, compararBordas, conferirContraReferencia,
} from './conferir-contra-referencia.mjs';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import receitaDeProva from '../fixtures/acervo/peca-de-prova/receita.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
/* A REFERÊNCIA É A SILHUETA DA PRÓPRIA PEÇA DE PROVA, desenhada a partir da
   malha dela e guardada ao lado da receita. Uma foto de conteúdo faria este
   teste depender de peça do acervo; a silhueta sintética é exata, então o
   desvio esperado é perto de zero e qualquer regressão no caminho — calibração,
   leitura de borda, projeção da malha — aparece como número crescendo. */
const FOTO = join(REPO, 'tools/fixtures/acervo/peca-de-prova/referencias/silhueta-lateral.png');
const ANCORAS = join(REPO, 'tools/fixtures/acervo/peca-de-prova/referencias/ancoras-silhueta.json');

/* Duas âncoras coerentes: 10 px valem 40 mm nos dois eixos. */
const coerentes = [
  { nome: 'a', px: [100, 200], mm: [0, 0] },
  { nome: 'b', px: [200, 100], mm: [400, 400] },
];

describe('calibração por âncora', () => {
  it('devolve escala e origem, e resíduo zero quando os dois eixos concordam', () => {
    const cal = calibrarPorAncoras(coerentes);
    expect(cal.mmPorPx).toBeCloseTo(4, 6);
    expect(cal.residuo.z).toBeCloseTo(0, 6);
    expect(cal.residuo.y).toBeCloseTo(0, 6);
    expect(cal.paraMm(100, 200)).toEqual([0, 0]);
    /* y cresce para cima no modelo e para baixo no pixel: inverte. */
    expect(cal.paraMm(100, 100)[1]).toBeCloseTo(400, 6);
  });

  it('RECUSA âncoras cuja escala em z discorda da escala em y', () => {
    /* Mesma distância em pixel, mas o z pede 8 mm/px e o y pede 4. Foto em
       perspectiva ou âncora mal localizada cai aqui, e cair aqui é o ponto:
       escala errada faz todo desvio virar ficção. */
    const tortas = [
      { nome: 'a', px: [100, 200], mm: [0, 0] },
      { nome: 'b', px: [200, 100], mm: [800, 400] },
    ];
    expect(() => calibrarPorAncoras(tortas)).toThrow(/discordam da escala/);
  });

  it('recusa número de âncoras diferente de dois e âncora malformada', () => {
    expect(() => calibrarPorAncoras([coerentes[0]])).toThrow(/exatamente 2/);
    expect(() => calibrarPorAncoras([coerentes[0], { nome: 'b', px: [1, 2] }])).toThrow(/px:\[x,y\] e mm:\[z,y\]/);
  });

  it('recusa âncoras próximas demais na foto para dar escala', () => {
    const juntas = [
      { nome: 'a', px: [100, 100], mm: [0, 0] },
      { nome: 'b', px: [105, 103], mm: [40, 24] },
    ];
    expect(() => calibrarPorAncoras(juntas)).toThrow(/muito próximas/);
  });
});

describe('envelope da malha', () => {
  /* Uma face quadrada no plano lateral, de z=0 a z=1 m e y=0 a y=2 m. */
  const neutro = {
    V: new Map([[0, [0, 0, 0]], [1, [0, 0, 1]], [2, [0, 2, 1]], [3, [0, 2, 0]]]),
    F: new Map([[0, { vs: [0, 1, 2, 3], parte: 'chapa' }]]),
  };

  it('devolve topo e base em milímetro, por projeção pura', () => {
    const env = envelopeDaMalha(neutro, { estacoes: 10 });
    expect(env.faixaZ.map(Math.round)).toEqual([0, 1000]);
    expect(env.topo.every(([, y]) => Math.abs(y - 2000) < 1e-6)).toBe(true);
    expect(env.base.every(([, y]) => Math.abs(y) < 1e-6)).toBe(true);
  });

  it('filtra por parte e reclama quando a parte pedida não existe', () => {
    expect(envelopeDaMalha(neutro, { partes: ['chapa'] }).topo.length).toBeGreaterThan(0);
    expect(() => envelopeDaMalha(neutro, { partes: ['inexistente'] })).toThrow(/nenhuma face/);
  });
});

describe('comparação de bordas', () => {
  const reta = (a, b, n = 21) => Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  });

  it('mede desvio constante com o sinal certo: positivo é malha acima', () => {
    const r = compararBordas(reta([0, 100], [1000, 100]), reta([0, 130], [1000, 130]));
    expect(r.desvioMedio).toBeCloseTo(30, 5);
    expect(r.desvioMaximo).toBeCloseTo(30, 5);
  });

  it('separa erro de inclinação de erro de altura', () => {
    /* Média perto de zero e máximo alto é a assinatura de inclinação errada;
       foi exatamente esse o diagnóstico do tubo superior da bicicleta. */
    const r = compararBordas(reta([0, 100], [1000, 200]), reta([0, 150], [1000, 150]));
    expect(Math.abs(r.desvioMedio)).toBeLessThan(1);
    expect(Math.abs(r.desvioMaximo)).toBeGreaterThan(45);
  });

  it('recusa bordas que não se sobrepõem em z', () => {
    expect(() => compararBordas(reta([0, 0], [100, 0]), reta([500, 0], [600, 0]))).toThrow(/não se sobrepõem/);
  });
});

describe('sobre a folha de referência da peça de prova', () => {
  it('as âncoras declaradas dão escala coerente nos dois eixos', () => {
    const cfg = JSON.parse(readFileSync(ANCORAS, 'utf8'));
    const cal = calibrarPorAncoras(cfg.ancoras);
    /* A silhueta é desenhada a meio milímetro por pixel, e as âncoras têm de
       chegar nesse número sozinhas, pelos dois eixos. Resíduo é o quanto a
       escala lida em z discorda da lida em y: escala errada faz todo desvio
       virar ficção, então ele é conferido antes de qualquer comparação. */
    expect(cal.mmPorPx).toBeGreaterThan(0.48);
    expect(cal.mmPorPx).toBeLessThan(0.52);
    expect(Math.abs(cal.residuo.z)).toBeLessThan(0.02);
    expect(Math.abs(cal.residuo.y)).toBeLessThan(0.02);
  });

  it('a borda extraída da imagem acompanha a silhueta, sem salto', () => {
    const cfg = JSON.parse(readFileSync(ANCORAS, 'utf8'));
    const cal = calibrarPorAncoras(cfg.ancoras);
    const pts = envelopeDaFoto(FOTO, cal, { recorte: cfg.recorte, qual: 'topo', limiar: cfg.limiar });
    expect(pts.length).toBeGreaterThan(50);

    /* O QUE SE AFIRMA É FIDELIDADE, E NÃO SUAVIDADE. A borda tinha de subir da
       traseira para a frente e não dar salto maior que 30 mm, o que descrevia o
       tubo superior da bicicleta e não a extração: esta peça desce da esquerda
       para a direita e tem um degrau de verdade, de 95 mm, onde a travessa
       termina e o tubo deitado começa. O que a extração não pode fazer é
       inventar borda diferente da que a malha tem, e é isso que se mede. */
    const daMalha = envelopeDaMalha(executarReceita(receitaDeProva).neutro, { estacoes: 400 }).topo;
    const r = compararBordas(pts, daMalha.filter((p) => p && Number.isFinite(p[1])));
    expect(Math.abs(r.desvioMaximo)).toBeLessThan(1);

    const ys = pts.map((p) => p[1]);
    const yDaMalha = daMalha.filter((p) => p && Number.isFinite(p[1])).map((p) => p[1]);
    expect(Math.min(...ys)).toBeCloseTo(Math.min(...yDaMalha), 0);
    expect(Math.max(...ys)).toBeCloseTo(Math.max(...yDaMalha), 0);
  });

  it('a peça passa contra a própria silhueta, e o veredito vem com número', async () => {
    const r = await conferirContraReferencia({
      alvo: 'peca-de-prova', imagem: FOTO, ancoras: ANCORAS,
    });
    expect(r.ok).toBe(true);
    expect(r.resultado.estacoes).toBeGreaterThan(20);
    /* A régua é apertada de propósito: contra a silhueta dela mesma, a peça não
       tem direito a errar 25 mm. Meio milímetro é o que a rasterização da
       imagem, a meio milímetro por pixel, deixa de resto. */
    expect(Math.abs(r.resultado.desvioMaximo)).toBeLessThan(1);
    expect(r.stdout).toMatch(/APROVADO/);
  }, 60_000);
});
