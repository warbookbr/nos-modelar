/* ajuste-de-curva-lisa-lisura.test.mjs — o objetivo de lisura de `ajustarCurvaLisa` e as opções da forma (pontos esparsos, trecho mínimo, rumo fixo nas pontas), provados
 * fora da curva de qualquer objeto, em mais de um comprimento e mais de uma densidade: a lisura não dá variação de curvatura maior que o padrão, dá a mesma curva com os pontos
 * invertidos, e o padrão continua o mesmo, bit a bit. */
import { describe, expect, it } from 'vitest';
import { ajustarCurvaLisa, curvaLisaDoGuardado, curvaLisaGuardada, impressaoDoAjuste } from './ajuste-de-curva-lisa.js';

const ANGULO_AUREO = Math.PI * (3 - Math.sqrt(5));
const ruido = (pontos, amplitude) => pontos.map(([u, v], i) => [u + amplitude * Math.sin(i * ANGULO_AUREO), v + amplitude * Math.cos(i * ANGULO_AUREO * 1.7)]);
const arco = (R, graus, n) => Array.from({ length: n }, (_, i) => { const a = ((i / (n - 1)) * graus * Math.PI) / 180; return [R * Math.sin(a), R * (1 - Math.cos(a))]; });
const elipse = (a, b, n) => Array.from({ length: n }, (_, i) => { const t = (i / (n - 1)) * (Math.PI / 2) * 0.9; return [a * Math.cos(t), b * Math.sin(t)]; });
/* reta de 200, filete de 90 graus de raio 20 e reta de 200, com pontos a cada `passo` */
const filete = (passo) => {
  const p = []; for (let x = 0; x < 200; x += passo) p.push([x, 0]);
  for (let a = 0; a < Math.PI / 2; a += passo / 20) p.push([200 + 20 * Math.sin(a), 20 - 20 * Math.cos(a)]);
  for (let y = 20; y <= 220; y += passo) p.push([220, y]);
  return p;
};
const escalar = (pontos, S) => pontos.map(([x, y]) => [x * S, y * S]);
const variacao = (a) => a.variacaoDaCurvatura * a.comprimento;
/* a maior distância entre a curva de `a` e a de `b` percorrida ao contrário, em 101 amostras */
const distanciaInvertida = (a, b) => {
  let d = 0; for (let i = 0; i <= 100; i += 1) { const pa = a.ponto((i / 100) * a.comprimento); const pb = b.ponto(b.comprimento - (i / 100) * b.comprimento); d = Math.max(d, Math.hypot(pa[0] - pb[0], pa[1] - pb[1])); }
  return d;
};

describe('o padrão não muda com as opções novas', () => {
  it('objetivo menosClotoides escrito e omitido dão o mesmo ajuste, bit a bit, e a impressão não ganha campo', () => {
    const pontos = ruido(elipse(600, 250, 70), 0.3);
    const omitido = ajustarCurvaLisa(pontos, { tolerancia: 1 });
    const escrito = ajustarCurvaLisa(pontos, { tolerancia: 1, objetivo: 'menosClotoides', esparsos: false, trechoMinimo: null, rumoInicio: null, rumoFim: null });
    expect(JSON.stringify(escrito.guardado)).toBe(JSON.stringify(omitido.guardado));
    expect(escrito.desvios).toEqual(omitido.desvios);
    expect(impressaoDoAjuste(pontos, { tolerancia: 1, objetivo: 'menosClotoides', esparsos: false })).toEqual(impressaoDoAjuste(pontos, { tolerancia: 1 }));
    expect(Object.keys(impressaoDoAjuste(pontos, { tolerancia: 1 }).opcoes)).toEqual(['tolerancia', 'maximoDeClotoides', 'duros', 'eixos']);
    expect(impressaoDoAjuste(pontos, { tolerancia: 1, objetivo: 'lisura' }).opcoes.objetivo).toBe('lisura');
  });

  it('o ajuste guardado com objetivo de lisura não confere com o pedido sem ele, e diz a opção que mudou', () => {
    const pontos = arco(500, 90, 40);
    const a = ajustarCurvaLisa(pontos, { tolerancia: 0.5, objetivo: 'lisura' });
    const guardados = { arco: { impressao: impressaoDoAjuste(pontos, { tolerancia: 0.5, objetivo: 'lisura' }), curva: a.guardado } };
    expect(curvaLisaDoGuardado({ nome: 'arco', pontos, opcoes: { tolerancia: 0.5, objetivo: 'lisura' }, guardados }).doGuardado).toBe(true);
    const outro = curvaLisaDoGuardado({ nome: 'arco', pontos, opcoes: { tolerancia: 0.5 }, guardados });
    expect(outro.doGuardado).toBe(false);
    expect(outro.mudou.join('; ')).toMatch(/a opção objetivo era "lisura" e agora é undefined/);
  });
});

describe('o objetivo de lisura, em mais de um comprimento e mais de uma densidade', () => {
  const CASOS = [
    ['quarto de elipse limpo', (S) => escalar(elipse(600, 250, 70), S), 0.5],
    ['quarto de elipse com ruído', (S) => escalar(ruido(elipse(600, 250, 140), 0.3), S), 1],
    ['filete entre retas a cada 1,5', (S) => escalar(filete(1.5), S), 0.5],
    ['filete entre retas a cada 2, com ruído', (S) => escalar(ruido(filete(2), 0.2), S), 1],
  ];
  for (const [nome, gerar, tolerancia] of CASOS) {
    it(`${nome}, a ×1e-3, ×1 e ×1e3: cabe, a variação de curvatura não passa da do padrão e os pontos invertidos dão a mesma curva`, () => {
      const variacoes = [];
      for (const S of [1e-3, 1, 1e3]) {
        const pontos = gerar(S);
        const padrao = ajustarCurvaLisa(pontos, { tolerancia: tolerancia * S });
        const liso = ajustarCurvaLisa(pontos, { tolerancia: tolerancia * S, objetivo: 'lisura' });
        const invertido = ajustarCurvaLisa([...pontos].reverse(), { tolerancia: tolerancia * S, objetivo: 'lisura' });
        expect(liso.cabe, liso.motivo).toBe(true);
        expect(invertido.cabe, invertido.motivo).toBe(true);
        expect(liso.desvioMaximo).toBeLessThanOrEqual(tolerancia * S);
        expect(variacao(liso)).toBeLessThanOrEqual(variacao(padrao) * (1 + 1e-9));
        expect(distanciaInvertida(liso, invertido)).toBeLessThan(1e-9 * liso.comprimento);
        variacoes.push(variacao(liso));
      }
      /* a variação vezes o comprimento é adimensional: a mesma forma em outra escala dá o mesmo número, a menos do que a tolerância deixa */
      expect(Math.max(...variacoes) / Math.min(...variacoes)).toBeLessThan(1.1);
    });
  }

  it('no filete com ruído a lisura tira uma parte da variação que o padrão deixa', () => {
    const pontos = ruido(filete(2), 0.2);
    const padrao = ajustarCurvaLisa(pontos, { tolerancia: 1 });
    const liso = ajustarCurvaLisa(pontos, { tolerancia: 1, objetivo: 'lisura' });
    expect(variacao(liso)).toBeLessThan(0.95 * variacao(padrao));
  });

  it('o filete a cada 2 e a cada 0,5 dá a mesma contagem de clotoides e variação parecida', () => {
    const [grosso, fino] = [2, 0.5].map((passo) => ajustarCurvaLisa(filete(passo), { tolerancia: 0.5, objetivo: 'lisura' }));
    expect(grosso.cabe && fino.cabe).toBe(true);
    expect(fino.clotoides.length).toBe(grosso.clotoides.length);
    expect(Math.abs(variacao(fino) - variacao(grosso)) / variacao(grosso)).toBeLessThan(0.1);
  });

  it('com os duros e os rumos, os pontos invertidos também dão a mesma curva', () => {
    const pontos = ruido(elipse(600, 250, 70), 0.3);
    const opcoes = { tolerancia: 1, objetivo: 'lisura', duros: [20], rumoInicio: Math.PI / 2 };
    const ida = ajustarCurvaLisa(pontos, opcoes);
    const volta = ajustarCurvaLisa([...pontos].reverse(), { tolerancia: 1, objetivo: 'lisura', duros: [49], rumoFim: -Math.PI / 2 });
    expect(ida.cabe && volta.cabe).toBe(true);
    expect(ida.rumoEm(0)).toBe(Math.PI / 2);
    expect(volta.rumoEm(volta.comprimento)).toBeCloseTo(-Math.PI / 2, 12);
    expect(distanciaInvertida(ida, volta)).toBeLessThan(1e-9 * ida.comprimento);
  });
});

describe('os pontos esparsos', () => {
  it('a meia volta de raio 300 por 5 pontos: densos não cabem pela corda, esparsos cabem num arco só', () => {
    const pontos = arco(300, 180, 5);
    const denso = ajustarCurvaLisa(pontos, { tolerancia: 0.5 });
    expect(denso.cabe).toBe(false);
    expect(denso.motivo).toMatch(/o desvio da curva à poligonal dos pontos/);
    const esparso = ajustarCurvaLisa(pontos, { tolerancia: 0.5, esparsos: true });
    expect(esparso.cabe, esparso.motivo).toBe(true);
    expect(esparso.clotoides).toHaveLength(1);
    expect(esparso.joelhos[0].k).toBeCloseTo(1 / 300, 6);
    expect(esparso.comprimento).toBeCloseTo(300 * Math.PI, 1);
  });

  it('o quarto de arco de 500 por 7 pontos e por 4 pontos dá o mesmo raio', () => {
    for (const n of [7, 4]) {
      const a = ajustarCurvaLisa(arco(500, 90, n), { tolerancia: 0.5, esparsos: true, objetivo: 'lisura' });
      expect(a.cabe, a.motivo).toBe(true);
      expect(a.joelhos.every((j) => Math.abs(j.k - 1 / 500) < 1e-5)).toBe(true);
    }
  });

  it('a curva guardada que dá uma volta inteira entre dois pontos esparsos não cabe, e o motivo diz entre quais', () => {
    const k = 0.01; const meio = (2 * Math.PI - 0.5) / k; const L = 100 + 50 + meio + 50 + 100;
    const f = (s) => s / L;
    const guardado = { inicio: [0, 0], rumo: 0, comprimento: L, tolerancia: 0.5, joelhos: [{ f: 0, k: 0 }, { f: f(100), k: 0 }, { f: f(150), k }, { f: f(150 + meio), k }, { f: f(200 + meio), k: 0 }, { f: 1, k: 0 }] };
    const curva = curvaLisaGuardada(guardado);
    const pontos = [0, 100, 200 + meio, L].map((s) => curva.ponto(s));
    const opcoes = { tolerancia: 0.5, esparsos: true };
    const a = curvaLisaDoGuardado({ nome: 'laço', pontos, opcoes, guardados: { laço: { impressao: impressaoDoAjuste(pontos, opcoes), curva: guardado } } });
    expect(a.doGuardado).toBe(true);
    expect(a.cabe).toBe(false);
    expect(a.motivo).toMatch(/rad entre os pontos 1 e 2, pi ou mais: dá volta onde os pontos esparsos não pedem/);
  });
});

describe('o trecho mínimo e o rumo fixo nas pontas', () => {
  it('o trecho mínimo vale em unidade dos pontos: nenhuma clotoide fica abaixo dele, e o que não cabe diz que falta clotoide', () => {
    const pontos = ruido(elipse(600, 250, 140), 0.3);
    for (const trecho of [50, 200]) {
      const a = ajustarCurvaLisa(pontos, { tolerancia: 1, trechoMinimo: trecho });
      expect(a.cabe, a.motivo).toBe(true);
      expect(Math.min(...a.clotoides.map((c) => c.comprimento))).toBeGreaterThanOrEqual(trecho * (1 - 1e-9));
    }
    const apertado = ajustarCurvaLisa(filete(1), { tolerancia: 0.5, trechoMinimo: 40 });
    expect(apertado.cabe).toBe(false);
    expect(Math.min(...apertado.clotoides.map((c) => c.comprimento))).toBeGreaterThanOrEqual(40 * (1 - 1e-9));
    expect(apertado.motivo).toMatch(/falta clotoide/);
  });

  it('a curva de uma clotoide só que sai mais curta que o trecho mínimo não cabe, e o motivo diz quanto', () => {
    const p = ruido(Array.from({ length: 50 }, (_, i) => [i * 10, 0]), 0.3);
    let Lp = 0; for (let i = 1; i < p.length; i += 1) Lp += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
    const a = ajustarCurvaLisa(p, { tolerancia: 1, trechoMinimo: 0.9998 * Lp });
    expect(a.clotoides).toHaveLength(1);
    expect(a.cabe).toBe(false);
    expect(a.motivo).toMatch(/a clotoide mais curta tem .*, abaixo do trecho mínimo/);
  });

  it('os rumos declarados saem exatos nas pontas, na volta que os pontos dão, e o rumo que os pontos negam não cabe', () => {
    const pontos = arco(500, 90, 40);
    for (const [ri, rf] of [[0, Math.PI / 2], [2 * Math.PI, -1.5 * Math.PI]]) {
      const a = ajustarCurvaLisa(pontos, { tolerancia: 0.5, rumoInicio: ri, rumoFim: rf });
      expect(a.cabe, a.motivo).toBe(true);
      expect(a.rumoEm(0)).toBe(0);
      expect(a.rumoEm(a.comprimento)).toBeCloseTo(Math.PI / 2, 12);
    }
    const so = ajustarCurvaLisa(pontos, { tolerancia: 0.5, rumoFim: Math.PI / 2 });
    expect(so.rumoEm(so.comprimento)).toBeCloseTo(Math.PI / 2, 12);
    /* pi e 3,5 caíam no comprimento negativo, que percorria a curva para trás, e a chamada recusava em vez de dar cabe falso; 0,2 não cabe no padrão, e a lisura o
     * corrige numa clotoide de 8 mm dentro da tolerância, o que cabe de verdade */
    for (const [objetivo, rumos] of [['menosClotoides', [0.2, Math.PI, 3.5]], ['lisura', [Math.PI]]]) {
      for (const rumo of rumos) {
        const errado = ajustarCurvaLisa(pontos, { tolerancia: 0.5, rumoInicio: rumo, objetivo, maximoDeClotoides: 3 });
        expect(errado.cabe).toBe(false);
        expect(Math.abs(Math.cos(errado.rumoEm(0)) - Math.cos(rumo)) + Math.abs(Math.sin(errado.rumoEm(0)) - Math.sin(rumo))).toBeLessThan(1e-12);
        expect(errado.comprimento).toBeGreaterThan(0);
      }
    }
  });
});

describe('as recusas das opções novas dizem o que receberam', () => {
  it('objetivo, esparsos, trechoMinimo e os rumos', () => {
    const pontos = arco(500, 90, 20);
    expect(() => ajustarCurvaLisa(pontos, { objetivo: 'liso' })).toThrow(/objetivo espera 'menosClotoides' ou 'lisura', e veio "liso"/);
    expect(() => ajustarCurvaLisa(pontos, { esparsos: 1 })).toThrow(/esparsos espera true ou false, e veio 1/);
    expect(() => ajustarCurvaLisa(pontos, { trechoMinimo: -3 })).toThrow(/trechoMinimo espera o comprimento mínimo de uma clotoide, um número maior que zero na unidade dos pontos, ou null, e veio -3/);
    expect(() => ajustarCurvaLisa(pontos, { trechoMinimo: 1e6 })).toThrow(/não fica abaixo do comprimento da poligonal dos pontos .*: a curva não teria trecho que coubesse/);
    expect(() => ajustarCurvaLisa(pontos, { rumoFim: '1' })).toThrow(/rumoFim espera o rumo da tangente em radiano contra o primeiro eixo, um número finito, ou null, e veio "1"/);
    expect(() => ajustarCurvaLisa(pontos, { rumoInicio: Infinity })).toThrow(/rumoInicio espera o rumo da tangente/);
    expect(() => ajustarCurvaLisa(pontos, { rumoInicio: 1e17 })).toThrow(/rumoInicio \(100000000000000000\) passa de 1000 voltas .* onde a conta da volta perde o rumo; passe o rumo entre -pi e pi/);
  });
});
