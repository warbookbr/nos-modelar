/* razao.test.js — a razão interseção/união entre dois contornos, sem alinhar, alinhada por um ponto declarado e pela melhor translação,
   e as duas medidas do arquivo inteiro: a união das regiões (o padrão, com o vão cercado e o furo da região fora) e o anel de fora da silhueta. */
import { describe, expect, it } from 'vitest';
import { desenhar, razaoInterseccaoUniao, ErroDeDesenho } from '../src/index.js';
import { carrinho } from './carrinho.js';

const retangulo = (h0, v0, h1, v1) => [[h0, v0], [h1, v0], [h1, v1], [h0, v1]];
const comoContorno = (anel, pedacos = [anel]) => ({ formato: 'mecanifica.contornos@1', silhueta: { contornoMm: anel, pedacos: pedacos.map((contornoMm) => ({ contornoMm })) }, regioes: {} });
/* Uma região com os anéis dela como pedaços, e o arquivo de contornos com a silhueta pelo anel de fora, como o desenho grava. */
const regiao = (aneis, foraDoModelo = false) => ({ ...(foraDoModelo ? { foraDoModelo: true } : {}), contornoMm: aneis[0], pedacos: aneis.map((contornoMm) => ({ contornoMm })) });
const arquivo = (regioes, silhueta) => ({ formato: 'mecanifica.contornos@1', silhueta: { contornoMm: silhueta[0], pedacos: silhueta.map((contornoMm) => ({ contornoMm })) }, regioes });
const moverArquivo = (c, dh, dv) => {
  const mover = (anel) => anel.map(([h, v]) => [Math.round((h + dh) * 1000) / 1000, Math.round((v + dv) * 1000) / 1000]);
  const deslocar = (f) => ({ ...f, contornoMm: mover(f.contornoMm), pedacos: f.pedacos.map((p) => ({ ...p, contornoMm: mover(p.contornoMm) })) });
  return { ...c, silhueta: deslocar(c.silhueta), regioes: Object.fromEntries(Object.entries(c.regioes).map(([nome, r]) => [nome, deslocar(r)])) };
};

/* Um corpo de 300 por 200 sobre dois pés e uma longarina fina embaixo: a longarina fecha o vão entre os pés, de 220 por 90 mm. */
const COM_VAO = 220 * 90;
const arcoFechado = () => arquivo({
  corpo: regiao([retangulo(0, 100, 300, 200)]),
  peEsquerdo: regiao([retangulo(0, 10, 40, 100)]),
  peDireito: regiao([retangulo(260, 10, 300, 100)]),
  longarina: regiao([retangulo(0, 0, 300, 10)]),
}, [retangulo(0, 0, 300, 200)]);
const blocoCheio = () => arquivo({ bloco: regiao([retangulo(0, 0, 300, 200)]) }, [retangulo(0, 0, 300, 200)]);

describe('a razão interseção/união', () => {
  it('é 1 para a mesma forma e 0 para formas sem encontro', async () => {
    const a = [retangulo(0, 0, 100, 50)];
    const igual = await razaoInterseccaoUniao(a, a);
    expect(igual.semAlinhar.iou).toBe(1);
    expect(igual.melhorTranslacao.iou).toBe(1);
    expect(igual.porPonto).toBeNull();
    const longe = await razaoInterseccaoUniao(a, [retangulo(1000, 1000, 1100, 1050)]);
    expect(longe.semAlinhar.iou).toBe(0);
    expect(longe.melhorTranslacao.iou).toBe(1);
    expect(longe.melhorTranslacao.deslocamento[0]).toBeCloseTo(-1000, 2);
    expect(longe.melhorTranslacao.deslocamento[1]).toBeCloseTo(-1000, 2);
  });

  it('dá os números conhecidos de dois retângulos deslocados: interseção 4000, união 6000', async () => {
    const r = await razaoInterseccaoUniao([retangulo(0, 0, 100, 50)], [retangulo(20, 0, 120, 50)], { alinharPor: { a: [0, 0], b: [20, 0] } });
    expect(r.semAlinhar.iou).toBeCloseTo(4000 / 6000, 6);
    expect(r.porPonto.iou).toBe(1);
    expect(r.porPonto.deslocamento).toEqual([-20, 0]);
    expect(r.melhorTranslacao.iou).toBe(1);
    expect(r.melhorTranslacao.deslocamento[0]).toBeCloseTo(-20, 2);
    expect(r.areaA).toBe(5000);
    expect(r.areaB).toBe(5000);
  });

  it('o ponto declarado errado dá a razão do alinhamento errado, e a melhor translação a separa do erro de forma', async () => {
    /* Mesma forma de 100 por 50 e outra de 100 por 40: a melhor razão possível é 40/50 = 0,8, com a menor dentro da maior. */
    const a = [retangulo(0, 0, 100, 50)]; const b = [retangulo(300, 300, 400, 340)];
    const r = await razaoInterseccaoUniao(a, b, { alinharPor: { a: [0, 0], b: [300, 300] } });
    expect(r.porPonto.iou).toBeCloseTo(0.8, 6);
    expect(r.melhorTranslacao.iou).toBeCloseTo(0.8, 6);
    const torto = await razaoInterseccaoUniao(a, b, { alinharPor: { a: [0, 0], b: [300, 280] } });
    /* A menor desce 20 mm: a interseção é 100 por 30, a união 5000 + 4000 - 3000. */
    expect(torto.porPonto.iou).toBeCloseTo(3000 / 6000, 6);
    expect(torto.melhorTranslacao.iou).toBeCloseTo(0.8, 6);
  });

  it('acha a translação de uma forma em L entre as duas posições possíveis do encaixe', async () => {
    const L = (dh, dv) => [[dh, dv], [dh + 100, dv], [dh + 100, dv + 30], [dh + 30, dv + 30], [dh + 30, dv + 100], [dh, dv + 100]];
    const r = await razaoInterseccaoUniao([L(0, 0)], [L(517, -233)]);
    expect(r.semAlinhar.iou).toBe(0);
    expect(r.melhorTranslacao.iou).toBeCloseTo(1, 6);
    expect(r.melhorTranslacao.deslocamento[0]).toBeCloseTo(-517, 2);
    expect(r.melhorTranslacao.deslocamento[1]).toBeCloseTo(233, 2);
  });

  it('é determinística: a mesma entrada dá o mesmo resultado', async () => {
    const a = [retangulo(0, 0, 100, 50)]; const b = [[[10, 5], [95, 0], [120, 40], [20, 60]]];
    expect(JSON.stringify(await razaoInterseccaoUniao(a, b))).toBe(JSON.stringify(await razaoInterseccaoUniao(a, b)));
  });

  it('lê arquivos de contornos: a silhueta inteira com todos os pedaços, uma região pelo nome, e o desenho contra a cópia deslocada dele', async () => {
    const { contornos } = await desenhar(carrinho());
    const igual = await razaoInterseccaoUniao(contornos, contornos);
    expect(igual.semAlinhar.iou).toBe(1);
    const roda = await razaoInterseccaoUniao(contornos, contornos, { parteA: 'roda', parteB: 'roda' });
    expect(roda.semAlinhar.iou).toBe(1);
    const deslocado = moverArquivo(contornos, 123.4, -45.6);
    const r = await razaoInterseccaoUniao(contornos, deslocado, { alinharPor: { a: [0, 0], b: [123.4, -45.6] } });
    expect(r.medida).toBe('regioes');
    expect(r.semAlinhar.iou).toBeLessThan(0.7);
    expect(r.porPonto.iou).toBeCloseTo(1, 6);
    expect(r.melhorTranslacao.iou).toBeCloseTo(1, 4);
    expect(r.melhorTranslacao.deslocamento[0]).toBeCloseTo(-123.4, 1);
    expect(r.melhorTranslacao.deslocamento[1]).toBeCloseTo(45.6, 1);
    /* O carrinho não tem vão cercado nem parte fora do modelo: as duas medidas dão o mesmo número, e nada sai ao lado. */
    expect(r.comparada).toBeNull();
    expect(igual.comparada).toBeNull();
  });

  it('um pedaço a mais na silhueta conta: sem o pedaço da caçamba a razão cai para a fração da área', async () => {
    const { contornos } = await desenhar(carrinho());
    const [grande, pequeno] = contornos.silhueta.pedacos;
    const so = comoContorno(grande.contornoMm);
    const r = await razaoInterseccaoUniao(contornos, so, { medida: 'silhueta' });
    expect(r.semAlinhar.iou).toBeCloseTo(grande.areaMm2 / (grande.areaMm2 + pequeno.areaMm2), 2);
  });

  it('um vão fechado por uma barra fina: a silhueta o enche e a razão antiga dá 1 contra um bloco cheio, a nova dá a fração que a referência de fato cobre', async () => {
    const nova = await razaoInterseccaoUniao(arcoFechado(), blocoCheio());
    expect(nova.medida).toBe('regioes');
    expect(nova.areaA).toBeCloseTo(300 * 200 - COM_VAO, 6);
    expect(nova.areaB).toBeCloseTo(300 * 200, 6);
    expect(nova.semAlinhar.iou).toBeCloseTo((300 * 200 - COM_VAO) / (300 * 200), 6);
    expect(nova.melhorTranslacao.iou).toBeCloseTo((300 * 200 - COM_VAO) / (300 * 200), 4);
    const antiga = await razaoInterseccaoUniao(arcoFechado(), blocoCheio(), { medida: 'silhueta' });
    expect(antiga.medida).toBe('silhueta');
    expect(antiga.areaA).toBeCloseTo(300 * 200, 6);
    expect(antiga.semAlinhar.iou).toBe(1);
  });

  it('a outra medida sai ao lado quando dá outro número, nas duas direções, e não sai quando dá o mesmo', async () => {
    const nova = await razaoInterseccaoUniao(arcoFechado(), blocoCheio());
    expect(nova.comparada).toMatchObject({ medida: 'silhueta', areaA: 60000, semAlinhar: { iou: 1 }, melhorTranslacao: { iou: 1 } });
    const antiga = await razaoInterseccaoUniao(arcoFechado(), blocoCheio(), { medida: 'silhueta' });
    expect(antiga.comparada.medida).toBe('regioes');
    expect(antiga.comparada.semAlinhar.iou).toBeCloseTo(nova.semAlinhar.iou, 6);
    /* O desenho que abre o vão como a referência dá a mesma razão pelas duas medidas: não há o que comparar. */
    const fiel = await razaoInterseccaoUniao(arcoFechado(), arcoFechado());
    expect(fiel.semAlinhar.iou).toBe(1);
    expect(fiel.comparada).toBeNull();
    /* Uma região pelo nome e uma lista de anéis não dependem da medida. */
    expect((await razaoInterseccaoUniao(arcoFechado(), blocoCheio(), { parteA: 'corpo', parteB: 'bloco' })).comparada).toBeNull();
    expect((await razaoInterseccaoUniao([retangulo(0, 0, 10, 10)], [retangulo(0, 0, 5, 10)])).comparada).toBeNull();
  });

  it('a melhor translação acha o encaixe de duas formas com vão, e o ponto declarado também', async () => {
    const r = await razaoInterseccaoUniao(arcoFechado(), moverArquivo(arcoFechado(), 37, -21), { alinharPor: { a: [0, 0], b: [37, -21] } });
    expect(r.semAlinhar.iou).toBeLessThan(0.8);
    expect(r.porPonto.iou).toBeCloseTo(1, 6);
    expect(r.melhorTranslacao.iou).toBeCloseTo(1, 4);
    expect(r.melhorTranslacao.deslocamento[0]).toBeCloseTo(-37, 1);
    expect(r.melhorTranslacao.deslocamento[1]).toBeCloseTo(21, 1);
    /* Alinhadas as duas medidas coincidem; sem alinhar o vão pesa diferente, e basta uma das três razões diferir para a outra sair. */
    expect(r.comparada.medida).toBe('silhueta');
    expect(r.comparada.porPonto.iou).toBeCloseTo(1, 6);
    expect(r.comparada.semAlinhar.iou).not.toBeCloseTo(r.semAlinhar.iou, 3);
  });

  it('uma região em anel conta o vão de dentro como fora, qualquer que seja o sentido do anel de dentro', async () => {
    const quadrado = retangulo(0, 0, 100, 100); const buraco = retangulo(30, 30, 70, 70);
    for (const interno of [buraco, [...buraco].reverse()]) {
      const anel = arquivo({ aro: regiao([quadrado, interno]) }, [quadrado]);
      const pelaRegiao = await razaoInterseccaoUniao(anel, [quadrado], { parteA: 'aro' });
      expect(pelaRegiao.areaA).toBeCloseTo(10000 - 1600, 6);
      expect(pelaRegiao.semAlinhar.iou).toBeCloseTo(8400 / 10000, 6);
      const doArquivo = await razaoInterseccaoUniao(anel, arquivo({ cheio: regiao([quadrado]) }, [quadrado]));
      expect(doArquivo.semAlinhar.iou).toBeCloseTo(8400 / 10000, 6);
      expect(doArquivo.comparada).toMatchObject({ medida: 'silhueta', semAlinhar: { iou: 1 } });
      /* O anel contra ele mesmo deslocado: a busca acha o deslocamento mesmo com o furo. */
      const deslocado = await razaoInterseccaoUniao(anel, moverArquivo(anel, 41, 17), { parteA: 'aro', parteB: 'aro' });
      expect(deslocado.semAlinhar.iou).toBeLessThan(0.6);
      expect(deslocado.melhorTranslacao.iou).toBeCloseTo(1, 4);
    }
    /* Outra região que cobre o vão o fecha: o que uma região cerca e outra preenche é dentro. */
    const comCubo = arquivo({ aro: regiao([quadrado, buraco]), cubo: regiao([buraco]) }, [quadrado]);
    const fechado = await razaoInterseccaoUniao(comCubo, [quadrado]);
    expect(fechado.semAlinhar.iou).toBeCloseTo(1, 6);
    expect(fechado.comparada).toBeNull();
  });

  it('as regiões foraDoModelo não entram na união, e um arquivo só de regiões fora do modelo usa todas', async () => {
    const corpo = retangulo(0, 0, 100, 50); const cabo = retangulo(100, 20, 300, 30);
    const comCabo = arquivo({ corpo: regiao([corpo]), cabo: regiao([cabo], true) }, [corpo]);
    const semCabo = arquivo({ corpo: regiao([corpo]) }, [corpo]);
    const r = await razaoInterseccaoUniao(comCabo, semCabo);
    expect(r.semAlinhar.iou).toBe(1);
    expect(r.areaA).toBe(5000);
    const so = arquivo({ cabo: regiao([cabo], true) }, [cabo]);
    expect((await razaoInterseccaoUniao(so, [cabo])).semAlinhar.iou).toBe(1);
    /* Pedindo o cabo pelo nome, ele é medido. */
    expect((await razaoInterseccaoUniao(comCabo, [cabo], { parteA: 'cabo' })).semAlinhar.iou).toBe(1);
  });

  it('o arquivo sem regiões é recusado na medida padrão, dizendo a outra, e a medida silhueta o mede', async () => {
    const sem = comoContorno(retangulo(0, 0, 100, 50));
    await expect(razaoInterseccaoUniao(sem, [retangulo(0, 0, 100, 50)])).rejects.toThrow(/o primeiro contorno: não traz regiões para somar; a medida "silhueta" mede o anel de fora da silhueta/);
    const r = await razaoInterseccaoUniao(sem, [retangulo(0, 0, 100, 50)], { medida: 'silhueta' });
    expect(r.semAlinhar.iou).toBe(1);
    expect(r.comparada).toBeNull();
  });

  it('uma medida desconhecida é recusada dizendo as que existem', async () => {
    await expect(razaoInterseccaoUniao(arcoFechado(), blocoCheio(), { medida: 'contorno' })).rejects.toThrow(/a medida deve ser "regioes" ou "silhueta" \(--medida=<nome> no comando\), e veio "contorno"/);
  });

  it('recusa entrada ilegível dizendo o que corrigir', async () => {
    await expect(razaoInterseccaoUniao({ formato: 'outro' }, [retangulo(0, 0, 1, 1)])).rejects.toThrow(ErroDeDesenho);
    await expect(razaoInterseccaoUniao({ formato: 'outro' }, [retangulo(0, 0, 1, 1)])).rejects.toThrow(/o primeiro contorno: deve ser um arquivo "formato": "mecanifica.contornos@1" ou uma lista de anéis/);
    const { contornos } = await desenhar(carrinho());
    await expect(razaoInterseccaoUniao(contornos, contornos, { parteB: 'banco' })).rejects.toThrow(/o segundo contorno: não há a região "banco"; as regiões são "braco", "cacamba", "pe", "roda"/);
    await expect(razaoInterseccaoUniao([[[0, 0], [1, 1]]], [retangulo(0, 0, 1, 1)])).rejects.toThrow(/cada anel com 3 ou mais pontos/);
    await expect(razaoInterseccaoUniao([retangulo(0, 0, 1, 1)], [retangulo(0, 0, 1, 1)], { alinharPor: { a: [0, 0] } })).rejects.toThrow(/"alinharPor" deve ser/);
  });
});
