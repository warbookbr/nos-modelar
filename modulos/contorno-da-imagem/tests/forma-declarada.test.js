/* forma-declarada.test.js — o desenhador declara que um trecho da borda é reta,
   curva ou detalhe; a ferramenta ajusta quando a imagem concorda e avisa, sem
   ajustar, quando ela se afasta mais que a tolerância. */
import { describe, expect, it } from 'vitest';
import { segmentar, silhuetaEmPedacos } from '../src/index.js';
import { imagemAntisserrilhada, amostrarAnel, desvioDaReta, areaDoAnel, sobreposicaoEBuraco } from './ajudas-subpixel.js';

const FUNDO = 240; const CORPO = 150;
const corpo = (topo) => (x, y) => (x < 20 || x > 140 || y < topo(x) || y > 80 ? FUNDO : CORPO);
const regioes = { corpo: [60, 60] };

describe('forma declarada: reta', () => {
  const topo = (x) => 20 + 0.2 * (x - 20);
  const png = imagemAntisserrilhada(160, 100, corpo(topo));
  const trecho = { de: [40, topo(40)], ate: [120, topo(120)], forma: 'reta' };
  const noTopo = (anel) => amostrarAnel(anel).filter(([x, y]) => x > 41 && x < 119 && Math.abs(y - topo(x)) < 1.5);

  it('ajusta a reta nos pontos subpixel do trecho: a borda inclinada fica num segmento só', async () => {
    const sem = await segmentar(png, { limiar: 225, regioes });
    const seg = await segmentar(png, { limiar: 225, regioes, formas: { corpo: [trecho] } });
    expect(seg.formas.avisos).toEqual([]);
    expect(seg.formas.ajustadas).toHaveLength(1);
    expect(seg.formas.ajustadas[0]).toMatchObject({ parte: 'corpo', forma: 'reta', de: trecho.de, ate: trecho.ate });
    expect(seg.formas.ajustadas[0].desvioPx).toBeLessThan(0.3);
    expect(desvioDaReta(noTopo(seg.regioes.corpo.contornoPx))).toBeLessThan(0.02);
    expect(desvioDaReta(noTopo(seg.regioes.corpo.contornoPx))).toBeLessThanOrEqual(desvioDaReta(noTopo(sem.regioes.corpo.contornoPx)));
    /* Só o trecho muda: o resto da borda tem os mesmos pontos de antes. */
    const fora = (anel) => anel.filter(([x]) => x < 38 || x > 122).map((p) => p.join(',')).join('|');
    expect(fora(seg.regioes.corpo.contornoPx)).toBe(fora(sem.regioes.corpo.contornoPx));
    /* No trecho ficam dois vértices, os dois extremos da reta. */
    expect(seg.regioes.corpo.contornoPx.filter(([x, y]) => x > 39 && x < 121 && Math.abs(y - topo(x)) < 1)).toHaveLength(2);
  });

  it('um trecho declarado reto que não é reto gera aviso, com o trecho, a parte e o desvio, e não é ajustado', async () => {
    /* A borda de cima é um arco de 4 px de flecha em 100 px: o que o desenhador
       chamou de reta é, na imagem, outra coisa. */
    const pngArco = imagemAntisserrilhada(160, 100, corpo((x) => 24 - 4 * (1 - ((x - 80) / 60) ** 2)));
    const topoArco = (x) => 24 - 4 * (1 - ((x - 80) / 60) ** 2);
    const declarado = { de: [30, topoArco(30)], ate: [130, topoArco(130)], forma: 'reta', nome: 'bordo de ataque' };
    const sem = await segmentar(pngArco, { limiar: 225, regioes });
    const seg = await segmentar(pngArco, { limiar: 225, regioes, formas: { corpo: [declarado] } });
    expect(seg.formas.ajustadas).toEqual([]);
    expect(seg.formas.avisos).toHaveLength(1);
    const [aviso] = seg.formas.avisos;
    expect(aviso).toMatchObject({ parte: 'corpo', nome: 'bordo de ataque', forma: 'reta', de: declarado.de, ate: declarado.ate });
    expect(aviso.desvioPx).toBeGreaterThan(1.5);
    expect(aviso.toleranciaPx).toBe(1.5);
    expect(aviso.mensagem).toMatch(/'corpo'/);
    expect(aviso.mensagem).toMatch(/reta/);
    expect(aviso.mensagem).toMatch(/detalhe/);
    expect(aviso.mensagem).toMatch(new RegExp(`${String(aviso.desvioPx.toFixed(2)).replace('.', ',')} px`));
    /* Nada foi ajustado: o contorno é o de quem não declarou. */
    expect(seg.regioes.corpo.pedacos).toEqual(sem.regioes.corpo.pedacos);
    expect(seg.regioes.corpo.contornoPx).toEqual(sem.regioes.corpo.contornoPx);
  });

  it('a tolerância é do desenhador: com 5 px o mesmo arco é aceito como reta', async () => {
    const topoArco = (x) => 24 - 4 * (1 - ((x - 80) / 60) ** 2);
    const pngArco = imagemAntisserrilhada(160, 100, corpo(topoArco));
    const seg = await segmentar(pngArco, { limiar: 225, regioes, formas: { corpo: [{ de: [30, topoArco(30)], ate: [130, topoArco(130)], forma: 'reta' }] }, toleranciaDaForma: 5 });
    expect(seg.formas.avisos).toEqual([]);
    expect(seg.formas.ajustadas).toHaveLength(1);
  });

  it('sem declaração nada muda: o contorno é o da borda subpixel', async () => {
    const a = await segmentar(png, { limiar: 225, regioes });
    const b = await segmentar(png, { limiar: 225, regioes, formas: {} });
    expect(b.regioes.corpo.contornoPx).toEqual(a.regioes.corpo.contornoPx);
    expect(b.formas).toEqual({ ajustadas: [], avisos: [], detalhes: [] });
  });

  it('detalhe mantém a borda como a imagem dá', async () => {
    const a = await segmentar(png, { limiar: 225, regioes });
    const b = await segmentar(png, { limiar: 225, regioes, formas: { corpo: [{ ...trecho, forma: 'detalhe' }] } });
    expect(b.regioes.corpo.contornoPx).toEqual(a.regioes.corpo.contornoPx);
    expect(b.formas.detalhes).toHaveLength(1);
    expect(b.formas.ajustadas).toEqual([]);
  });
});

describe('forma declarada: curva', () => {
  const centro = [60, 60]; const raio = 35;
  const png = imagemAntisserrilhada(130, 130, (x, y) => (Math.hypot(x - centro[0], y - centro[1]) < raio ? CORPO : FUNDO));
  const ponto = (graus) => [centro[0] + raio * Math.cos((graus * Math.PI) / 180), centro[1] + raio * Math.sin((graus * Math.PI) / 180)];

  it('ajusta uma curva suave no arco: os pontos novos ficam a 0,2 px do círculo', async () => {
    const seg = await segmentar(png, { limiar: 225, regioes: { disco: [60, 60] }, formas: { disco: [{ de: ponto(200), ate: ponto(340), forma: 'curva' }] } });
    expect(seg.formas.avisos).toEqual([]);
    expect(seg.formas.ajustadas).toHaveLength(1);
    expect(seg.formas.ajustadas[0].forma).toBe('curva');
    const arco = amostrarAnel(seg.regioes.disco.contornoPx).filter(([x, y]) => Math.atan2(y - centro[1], x - centro[0]) < (-30 * Math.PI) / 180 && Math.atan2(y - centro[1], x - centro[0]) > (-150 * Math.PI) / 180);
    expect(arco.length).toBeGreaterThan(100);
    for (const [x, y] of arco) expect(Math.abs(Math.hypot(x - centro[0], y - centro[1]) - raio)).toBeLessThan(0.2);
    /* O círculo todo continua um polígono só, sem pontas. */
    expect(seg.regioes.disco.pedacos).toHaveLength(1);
    expect(Math.abs(areaDoAnel(seg.regioes.disco.contornoPx) - Math.PI * raio * raio) / (Math.PI * raio * raio)).toBeLessThan(0.02);
  });

  it('declarar reta no arco avisa: 35 px de raio, 140 graus', async () => {
    const seg = await segmentar(png, { limiar: 225, regioes: { disco: [60, 60] }, formas: { disco: [{ de: ponto(200), ate: ponto(340), forma: 'reta' }] } });
    expect(seg.formas.ajustadas).toEqual([]);
    expect(seg.formas.avisos).toHaveLength(1);
    expect(seg.formas.avisos[0].desvioPx).toBeGreaterThan(10);
  });
});

describe('forma declarada: a divisa compartilhada', () => {
  const costuraX = (y) => 70 + 0.35 * (y - 30);
  const png = imagemAntisserrilhada(160, 90, (x, y) => {
    if (x < 20 || x > 140 || y < 20 || y > 70) return FUNDO;
    return Math.abs(x - costuraX(y)) * Math.cos(Math.atan(0.35)) < 0.9 ? 90 : CORPO;
  });
  const config = { limiar: 225, regioes: { a: [40, 45], b: [115, 45] } };

  it('o ajuste de um trecho na divisa vale para as duas partes, sem buraco nem sobreposição', async () => {
    const trecho = { de: [costuraX(25), 25], ate: [costuraX(65), 65], forma: 'reta' };
    const seg = await segmentar(png, { ...config, formas: { a: [trecho] } });
    expect(seg.formas.avisos).toEqual([]);
    expect(seg.formas.ajustadas).toHaveLength(1);
    const { pedacos } = await silhuetaEmPedacos(seg, { folga: 0 });
    const aneis = [seg.regioes.a.contornoPx, seg.regioes.b.contornoPx];
    expect(sobreposicaoEBuraco(aneis, [pedacos[0].contornoPx], [18, 18, 142, 72])).toEqual({ sobra: 0, buraco: 0 });
    expect(Math.abs(areaDoAnel(aneis[0]) + areaDoAnel(aneis[1]) - areaDoAnel(pedacos[0].contornoPx))).toBeLessThan(1e-3);
    /* A costura é uma reta só nas duas partes, e é a mesma. */
    const costuraDe = (anel) => amostrarAnel(anel).filter(([x, y]) => y > 26 && y < 64 && Math.abs(x - costuraX(y)) < 1.5);
    for (const anel of aneis) expect(desvioDaReta(costuraDe(anel))).toBeLessThan(0.03);
    const chave = ([x, y]) => `${x},${y}`;
    const b = new Set(aneis[1].map(chave));
    expect(aneis[0].filter((v) => b.has(chave(v))).length).toBeGreaterThanOrEqual(2);
  });
});

describe('forma declarada: o trecho que atravessa a junção com outra parte', () => {
  /* Uma tampa escura sobre a borda de cima: a borda de `base` é fundo, depois a
     tampa, depois fundo de novo, tudo na mesma reta. As junções vão para a reta e
     a tampa continua encaixada. */
  const borda = (x) => 20.4 + 0.1 * (x - 20);
  const png = imagemAntisserrilhada(160, 100, (x, y) => {
    if (x < 20 || x > 140 || y > 80) return FUNDO;
    if (x >= 60 && x < 80 && y >= borda(x) - 7 && y < borda(x)) return 90;
    return y < borda(x) ? FUNDO : CORPO;
  });
  const config = { limiar: 225, regioes: { base: [100, 60], tampa: [70, borda(70) - 3] } };
  const trecho = { de: [30, borda(30)], ate: [130, borda(130)], forma: 'reta' };

  it('ajusta a reta nas três cadeias, leva as junções para ela, e a tampa continua encaixada na base', async () => {
    const sem = await segmentar(png, config);
    const seg = await segmentar(png, { ...config, formas: { base: [trecho] } });
    expect(seg.formas.avisos).toEqual([]);
    expect(seg.formas.ajustadas).toHaveLength(1);
    const noTopo = (anel) => amostrarAnel(anel).filter(([x, y]) => x > 31 && x < 129 && Math.abs(y - borda(x)) < 1.2);
    expect(desvioDaReta(noTopo(seg.regioes.base.contornoPx))).toBeLessThan(0.15);
    const { pedacos } = await silhuetaEmPedacos(seg, { folga: 0 });
    const aneis = [seg.regioes.base.contornoPx, seg.regioes.tampa.contornoPx];
    expect(sobreposicaoEBuraco(aneis, [pedacos[0].contornoPx], [18, 6, 142, 82])).toEqual({ sobra: 0, buraco: 0 });
    /* A tampa só muda onde as junções foram para a reta (menos de 2% da área, que é de 140 px²), e a divisa é a mesma nas duas. */
    expect(Math.abs(seg.regioes.tampa.areaPx - sem.regioes.tampa.areaPx) / sem.regioes.tampa.areaPx).toBeLessThan(0.02);
    const chave = ([x, y]) => `${x},${y}`;
    const t = new Set(seg.regioes.tampa.contornoPx.map(chave));
    expect(seg.regioes.base.contornoPx.filter((v) => t.has(chave(v))).length).toBeGreaterThanOrEqual(2);
  });
});

describe('forma declarada: o que é recusado', () => {
  it('recusa forma declarada com a máscara de pixel, que não tem borda subpixel para ajustar', async () => {
    const png = imagemAntisserrilhada(160, 100, corpo(() => 20));
    await expect(segmentar(png, { limiar: 225, regioes, bordaSubpixel: false, formas: { corpo: [{ de: [30, 20], ate: [100, 20], forma: 'reta' }] } })).rejects.toThrow(/bordaSubpixel/);
  });

  const png = imagemAntisserrilhada(160, 100, corpo(() => 20));
  const cfg = (formas) => ({ limiar: 225, regioes, formas });

  it('recusa parte que não existe, forma desconhecida e ponto mal escrito', async () => {
    await expect(segmentar(png, cfg({ asa: [{ de: [30, 20], ate: [100, 20], forma: 'reta' }] }))).rejects.toThrow(/'asa' não é uma parte/);
    await expect(segmentar(png, cfg({ corpo: [{ de: [30, 20], ate: [100, 20], forma: 'zigue' }] }))).rejects.toThrow(/forma 'zigue'/);
    await expect(segmentar(png, cfg({ corpo: [{ de: [30], ate: [100, 20], forma: 'reta' }] }))).rejects.toThrow(/"de" e "ate"/);
  });

  it('recusa ponto que não está na borda da parte, dizendo a que distância ele está', async () => {
    await expect(segmentar(png, cfg({ corpo: [{ de: [60, 50], ate: [100, 20], forma: 'reta' }] }))).rejects.toThrow(/está a \d+,\d+ px da borda/);
  });

  it('recusa dois pontos no mesmo lugar', async () => {
    await expect(segmentar(png, cfg({ corpo: [{ de: [60, 20], ate: [60.5, 20], forma: 'reta' }] }))).rejects.toThrow(/mesmo lugar/);
  });
});
