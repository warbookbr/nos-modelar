/* forma-do-esboco.test.js — a forma de cada parte da receita contra a forma do esboço, pela razão interseção/união de volume.
   O esboço é sintético e escrito à mão no formato de `formasResolvidas`: um bloco com um furo passante (o recorte de um cilindro) e uma viga
   inclinada 30 graus em z, os de `tools/fixtures/forma-do-esboco/bloco.esboco.json`. A receita que reproduz a forma dá razão acima de
   0,99, a menor e a deslocada reprovam, a viga sem a inclinação reprova, e o bloco sem o recorte dá a razão que o recorte tira. */
import { describe, expect, it } from 'vitest';
import { conferirFormaDoEsboco, textoDaRazao } from './forma-do-esboco.js';
import { executarReceita } from './executar-receita.js';
import { FORMATO_FORMAS_RESOLVIDAS } from './tradutor-nivel-zero.js';
import { receitaDoBloco } from '../../tools/fixtures/forma-do-esboco/suporte.js';

const IDENTIDADE = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const rotacaoEmZ = (graus) => {
  const t = (graus * Math.PI) / 180;
  return [[Math.cos(t), -Math.sin(t), 0], [Math.sin(t), Math.cos(t), 0], [0, 0, 1]];
};
const areaDoPoligono = (r, n) => 0.5 * n * r * r * Math.sin((2 * Math.PI) / n);

function forma(id, tipo, geometria, extra = {}) {
  return {
    id, tipo, oculto: false, unidade: null, parte: null, origem: null,
    geometria: { centro: [0, 0, 0], caixa: { min: [0, 0, 0], max: [0, 0, 0] }, matriz: IDENTIDADE, ancoras: {}, ...geometria },
    ...extra,
  };
}

/* O esboço do bloco: o bloco recortado pelo furo (um cilindro oculto) e a viga girada 30 graus. */
const esbocoDoBloco = (...maisFormas) => ({
  formato: FORMATO_FORMAS_RESOLVIDAS,
  opcao: { numero: 1, titulo: 'Bloco e viga' },
  parametros: {},
  pontos: {},
  formas: [
    forma('bloco', 'caixa', { eixo: 'y', largura: 200, altura: 100, profundidade: 120, centro: [0, 50, 0], recorte: { cortadores: [{ id: 'furo', retiradoMm3: 0 }], volumeCheioMm3: 0, volumeMm3: 0 } }),
    { ...forma('furo', 'cilindro', { eixo: 'y', diametro: 60, comprimento: 160, centro: [30, 50, 0] }), oculto: true, cortador: true },
    forma('viga', 'caixa', { eixo: 'y', largura: 300, altura: 40, profundidade: 60, centro: [0, 400, 0], matriz: rotacaoEmZ(30) }),
    ...maisFormas,
  ],
});

const DECLARACAO = { arquivo: 'bloco.esboco.json', opcao: 1, formas: { bloco: 'bloco', viga: 'viga' }, minimo: 0.99 };
const neutroDe = (opcoes) => {
  const { neutro } = executarReceita(receitaDoBloco(opcoes));
  expect(neutro.orfaos).toEqual([]);
  return neutro;
};
const conferir = (opcoes = {}, declaracao = DECLARACAO, dados = esbocoDoBloco()) => conferirFormaDoEsboco({ esboco: declaracao, dados, neutro: neutroDe(opcoes) });
const razao = (resultado, parte) => resultado.partes.find((p) => p.parte === parte).razao;

const VOLUME_DO_BLOCO = 200 * 120 * 100;
const VOLUME_DO_FURO = areaDoPoligono(30, 128) * 100;

describe('a receita que reproduz a forma do esboço', () => {
  it('dá razão acima de 0,99 no bloco recortado e na viga inclinada', () => {
    const r = conferir();
    expect(r.ok).toBe(true);
    expect(r.achados).toEqual([]);
    expect(razao(r, 'bloco')).toBeGreaterThan(0.99);
    expect(razao(r, 'viga')).toBeGreaterThan(0.99);
    expect(r.partes.map((p) => p.parte)).toEqual(['bloco', 'viga']);
    const bloco = r.partes[0];
    expect(bloco.volumeParteMm3).toBeCloseTo(VOLUME_DO_BLOCO - VOLUME_DO_FURO, -1);
    expect(bloco.volumeFormasMm3).toBeCloseTo(VOLUME_DO_BLOCO - VOLUME_DO_FURO, -1);
    expect(r.partes[1].volumeParteMm3).toBeCloseTo(300 * 40 * 60, -2);
  });

  it('é determinística: a mesma conferência dá o mesmo resultado', () => {
    expect(JSON.stringify(conferir())).toBe(JSON.stringify(conferir()));
  });
});

describe('a receita que sai da forma é reprovada', () => {
  it('o bloco sem o recorte dá a razão que o recorte tira: um menos o furo sobre o bloco', () => {
    const r = conferir({ furo: false });
    const esperada = 1 - VOLUME_DO_FURO / VOLUME_DO_BLOCO;
    expect(razao(r, 'bloco')).toBeCloseTo(esperada, 4);
    expect(r.ok).toBe(false);
    const [achado] = r.achados;
    expect(achado).toMatchObject({ codigo: 'parte-fora-da-forma-do-esboco', parte: 'bloco', formas: ['bloco'], minimo: 0.99 });
    expect(achado.razao).toBeCloseTo(esperada, 4);
    expect(achado.mensagem).toBe("a parte 'bloco' tem razão interseção/união de volume 0,882 com a forma 'bloco' do esboço (mínimo 0,99): a parte tem 2400 cm3, a forma tem 2117 cm3 e as duas dividem 2117 cm3.");
  });

  it('o bloco menor que a forma reprova, com a parte inteira dentro da forma', () => {
    const r = conferir({ escala: 0.9 });
    const parte = r.partes.find((p) => p.parte === 'bloco');
    /* o bloco de 90%, com o mesmo furo, cabe na forma: a razão é o volume dele sobre o da forma */
    const menor = (180 * 108 - areaDoPoligono(30, 128)) * 90;
    expect(parte.volumeComumMm3).toBeCloseTo(parte.volumeParteMm3, -1);
    expect(parte.razao).toBeCloseTo(menor / (VOLUME_DO_BLOCO - VOLUME_DO_FURO), 3);
    expect(parte.razao).toBeLessThan(0.99);
    expect(r.achados.map((a) => a.parte)).toEqual(['bloco']);
  });

  it('o bloco deslocado 20 mm em x reprova', () => {
    const r = conferir({ deslocamentoX: 20 });
    expect(razao(r, 'bloco')).toBeLessThan(0.75);
    expect(razao(r, 'bloco')).toBeGreaterThan(0.65);
    expect(r.achados.map((a) => a.codigo)).toEqual(['parte-fora-da-forma-do-esboco']);
  });

  it('a viga sem a inclinação do esboço reprova', () => {
    const r = conferir({ graus: 0 });
    expect(razao(r, 'viga')).toBeLessThan(0.2);
    expect(r.achados.map((a) => a.parte)).toEqual(['viga']);
    expect(razao(r, 'bloco')).toBeGreaterThan(0.99);
  });

  it('a razão que cai abaixo do mínimo só por pouco aparece com mais casas, para não parecer igual ao mínimo', () => {
    expect(textoDaRazao(0.8822, 0.99)).toBe('0,882');
    expect(textoDaRazao(0.9496, 0.95)).toBe('0,94960');
    expect(textoDaRazao(0.99996, 1)).toBe('0,99996');
    expect(textoDaRazao(0.9501, 0.95)).toBe('0,950');
  });

  it('o mínimo de uma parte vale no lugar do geral', () => {
    const declaracao = { ...DECLARACAO, formas: { bloco: { formas: 'bloco', minimo: 0.8 }, viga: 'viga' } };
    const r = conferir({ furo: false }, declaracao);
    expect(r.ok).toBe(true);
    expect(r.partes.find((p) => p.parte === 'bloco')).toMatchObject({ minimo: 0.8, ok: true });
    expect(r.partes.find((p) => p.parte === 'viga').minimo).toBe(0.99);
    const rigido = conferir({ furo: false }, { ...DECLARACAO, minimo: 0.5, formas: { bloco: { formas: 'bloco', minimo: 0.95 }, viga: 'viga' } });
    expect(rigido.achados.map((a) => a.parte)).toEqual(['bloco']);
  });
});

describe('uma parte, mais de uma forma', () => {
  it('a parte é comparada com a união das formas', () => {
    const neutro = neutroDe();
    for (const face of neutro.F.values()) face.parte = 'conjunto';
    const r = conferirFormaDoEsboco({ esboco: { ...DECLARACAO, formas: { conjunto: ['viga', 'bloco'] } }, dados: esbocoDoBloco(), neutro });
    expect(r.ok).toBe(true);
    expect(r.partes[0]).toMatchObject({ parte: 'conjunto', formas: ['bloco', 'viga'] });
    expect(r.partes[0].razao).toBeGreaterThan(0.99);
    const sem = conferirFormaDoEsboco({ esboco: { ...DECLARACAO, formas: { conjunto: ['bloco'] } }, dados: esbocoDoBloco(), neutro });
    expect(sem.achados[0].mensagem).toContain("com a forma 'bloco' do esboço");
    expect(conferirFormaDoEsboco({ esboco: { ...DECLARACAO, formas: { conjunto: ['bloco', 'viga'] } }, dados: esbocoDoBloco(), neutro }).achados).toEqual([]);
  });
});

describe('o que a conferência não consegue medir também reprova, dizendo o motivo', () => {
  it('a forma que o esboço não tem lista as formas da opção', () => {
    const r = conferir({}, { ...DECLARACAO, formas: { bloco: 'bloco', viga: 'trave' } });
    expect(r.ok).toBe(false);
    expect(r.achados).toEqual([expect.objectContaining({ codigo: 'forma-do-esboco-desconhecida', parte: 'viga', formas: ['trave'] })]);
    expect(r.achados[0].mensagem).toBe("a parte 'viga' declara refinar a forma 'trave' do esboço bloco.esboco.json (opção Bloco e viga), e a opção não tem essa forma (formas: bloco, furo, viga).");
    expect(r.partes.map((p) => p.parte)).toEqual(['bloco']);
  });

  it('a parte que a peça não entrega é recusada', () => {
    const r = conferir({}, { ...DECLARACAO, formas: { bloco: 'bloco', tampa: 'bloco' } });
    expect(r.achados).toEqual([expect.objectContaining({ codigo: 'parte-ausente-do-esboco', parte: 'tampa' })]);
    expect(r.achados[0].mensagem).toContain('a peça não tem nenhuma face com esse nome');
  });

  it('a forma que não tem sólido (a faixa) reprova com o motivo da forma', () => {
    const faixa = forma('faixa', 'envolve', { largura: 10, espessura: 2, fechado: true, trilha: { pontos: [], fechado: true } });
    const r = conferir({}, { ...DECLARACAO, formas: { bloco: 'faixa', viga: 'viga' } }, esbocoDoBloco(faixa));
    expect(r.achados).toEqual([expect.objectContaining({ codigo: 'forma-do-esboco-sem-solido', parte: 'bloco', formas: ['faixa'] })]);
    expect(r.achados[0].mensagem).toContain('a faixa que contorna círculos ainda não tem sólido');
    expect(razao(r, 'viga')).toBeGreaterThan(0.99);
  });

  it('a parte de malha aberta não tem como ser comparada, e não passa em silêncio', () => {
    const neutro = neutroDe();
    const faceDaViga = [...neutro.F.values()].find((f) => f.parte === 'viga');
    neutro.F.delete(faceDaViga.id);
    const r = conferirFormaDoEsboco({ esboco: DECLARACAO, dados: esbocoDoBloco(), neutro });
    expect(r.ok).toBe(false);
    expect(r.achados).toEqual([expect.objectContaining({ codigo: 'parte-sem-solido', parte: 'viga' })]);
    expect(r.achados[0].mensagem).toMatch(/a parte 'viga' não tem como ser comparada com a forma 'viga' do esboço: a malha da parte 'viga' não forma um sólido fechado e orientado/);
    expect(razao(r, 'bloco')).toBeGreaterThan(0.99);
  });

  it('a face que cita um vértice que a peça não tem é um achado da parte, e as outras partes seguem medidas', () => {
    const neutro = neutroDe();
    const faceDaViga = [...neutro.F.values()].find((f) => f.parte === 'viga');
    neutro.V.delete(faceDaViga.vs[0]);
    const r = conferirFormaDoEsboco({ esboco: DECLARACAO, dados: esbocoDoBloco(), neutro });
    expect(r.achados).toEqual([expect.objectContaining({ codigo: 'parte-sem-solido', parte: 'viga' })]);
    expect(r.achados[0].mensagem).toContain(`cita o vértice ${faceDaViga.vs[0]}, que a peça não tem`);
    expect(razao(r, 'bloco')).toBeGreaterThan(0.99);
  });

  it('a lista de formas da opção na mensagem é curta: vinte ids e quantos faltam', () => {
    const muitas = Array.from({ length: 30 }, (_, k) => forma(`f${String(k).padStart(2, '0')}`, 'caixa', { eixo: 'y', largura: 1, altura: 1, profundidade: 1 }));
    const r = conferir({}, { ...DECLARACAO, formas: { bloco: 'trave' } }, esbocoDoBloco(...muitas));
    expect(r.achados[0].mensagem).toMatch(/\(formas: bloco, f00, f01, .*, f18 e mais 13\)\.$/);
  });

  it('a declaração inválida é recusada antes de medir', () => {
    expect(() => conferirFormaDoEsboco({ esboco: { ...DECLARACAO, minimo: 2 }, dados: esbocoDoBloco(), neutro: neutroDe() })).toThrow(/'minimo' precisa ser a razão interseção\/união mínima/);
  });
});
