/* A oclusão das linhas de uma forma recortada (`subtrai`): uma linha que corre sobre a borda de uma face não some, e uma que está de
   fato atrás dela continua escondida. O teste da linha era de um ponto só, que contava a borda de uma face como dentro dela: a aresta
   do teto de um alojamento, que da vista de baixo coincide com a boca dele, era coberta pela superfície vizinha em trechos que
   dependiam de qual face o ponto tocava, e o contorno do vão saía quebrado, com fragmentos soltos (a asa recortada pelo alojamento do
   trem do avião, vista de baixo, segunda rodada). Agora a linha só some se a faixa de meio pixel de cada lado dela também está atrás. */
import { describe, expect, it } from 'vitest';
import { desenharEsboco, fatiarForma, resolverOpcao, VISTAS_TODAS } from '../src/index.js';
import { facesNaTela, linhasVisiveis } from '../src/recorte.js';
import { expandirEsboco } from '../src/expandir.js';

/* a placa de 400 x 40 x 300 com um alojamento de 120 x 30 x 80 aberto na face de baixo (y de -20 a 10), no centro [30, -5, 20] */
const placa = (extra = {}) => ({
  opcoes: [{ titulo: 'T', formas: [
    { id: 'placa', tipo: 'caixa', largura: 400, altura: 40, profundidade: 300, centro: [0, 0, 0], cor: 'cinza', subtrai: ['alojamento'] },
    { id: 'alojamento', tipo: 'caixa', cortador: true, largura: 120, altura: 30, profundidade: 80, centro: [30, -5, 20] },
  ] }],
  ...extra,
});
const resolvida = () => { const x = expandirEsboco(placa()); return resolverOpcao(x.opcoes[0], 'opção 1', x.pontos).find((r) => r.id === 'placa'); };
const unitario = (v) => { const m = Math.hypot(...v); return v.map((c) => c / m); };
const linhasDa = (r, vista, mmPorPixel) => fatiarForma(r, unitario(VISTAS_TODAS[vista].olho), { esquadrar: true, mmPorPixel }).flatMap((c) => c.lados.flatMap((l) => l.linhas));
/* as linhas do teto do alojamento (y = 10), cada aresta com o comprimento medido no mundo */
const noTeto = (linhas) => linhas.filter(([a, b]) => Math.abs(a[1] - 10) < 1e-6 && Math.abs(b[1] - 10) < 1e-6);
const comprimento = (linhas) => linhas.reduce((s, [a, b]) => s + Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), 0);

describe('o contorno do vão vista de baixo, onde o teto do alojamento coincide com a boca', () => {
  const MM_POR_PIXEL = 0.7;

  it('sem a escala (o piso de 0,01 mm) a aresta do teto, que cai sobre a borda da superfície, sai coberta', () => {
    /* o comportamento de antes, que as outras leituras (descrever, contato) seguem: só o piso decide */
    expect(comprimento(noTeto(linhasDa(resolvida(), 'inferior', 0)))).toBeLessThan(1);
  });

  it('com a escala do desenho as quatro arestas do teto saem inteiras: 2 x (120 + 80) mm', () => {
    const teto = noTeto(linhasDa(resolvida(), 'inferior', MM_POR_PIXEL));
    expect(comprimento(teto)).toBeCloseTo(2 * (120 + 80), 3);
  });

  it('a linha que está de fato atrás da superfície continua escondida: de cima nenhuma aresta do teto aparece', () => {
    expect(noTeto(linhasDa(resolvida(), 'superior', MM_POR_PIXEL))).toHaveLength(0);
    expect(linhasDa(resolvida(), 'superior', MM_POR_PIXEL)).toHaveLength(linhasDa(resolvida(), 'superior', 0).length);
  });

  it('o desenho com camada leva o contorno inteiro: o teto do alojamento tem os quatro traços, e a imagem é a mesma a cada vez', () => {
    const desenho = (vista) => desenharEsboco({ ...placa({ vista }), ocultar: ['titulo', 'escala', 'nota'], ladosPorEscala: true }, { camada: true });
    const a = desenho('inferior');
    const b = desenho('inferior');
    expect(JSON.stringify(a.camada)).toBe(JSON.stringify(b.camada));
    const forma = a.camada.formas.find((f) => f.id === 'placa');
    /* cada traço é um segmento com a profundidade de cada ponta (z ao longo do olho, que da vista de baixo é -y, mais o viés de
       desempate de no máximo 0,4 mm): o teto, em y = 10, fica em z = -10, e as quatro arestas dele estão na camada */
    const noFundo = forma.tracos.filter((t) => t.every((q) => Math.abs(q[2] + 10) < 0.5));
    expect(noFundo).toHaveLength(4);
  });
});

describe('o trecho solto de uma linha que o vizinho cobre quase toda', () => {
  /* duas faces de frente (z = 10) separadas por uma fresta, e uma linha atrás delas (z = 0) que corre sobre as duas e sobre a fresta */
  const face = (x0, x1) => ({ pts: [[x0, 0, 10], [x1, 0, 10], [x1, 100, 10], [x0, 100, 10]], n: [0, 0, 1] });
  const olho = [0, 0, 1];
  const visivel = (fresta, opcoes) => {
    const faces = [face(0, 35 - fresta / 2), face(35 + fresta / 2, 100)];
    return linhasVisiveis([[[-30, 50, 0], [130, 50, 0]]], facesNaTela(faces, olho), olho, opcoes).map(([a, b]) => [a[0], b[0]]);
  };

  it('a fresta menor que 6 px deixa passar um tracinho que não sai, e a de 10 px, que se vê, sai', () => {
    /* 1 mm por pixel: a fresta de 3 mm é de 3 px */
    const pequena = visivel(3, { fragmentoMinimo: 6, margemLateral: 0 });
    expect(pequena).toHaveLength(2);
    expect(pequena[0][1]).toBeCloseTo(0, 1);
    expect(pequena[1][0]).toBeCloseTo(100, 1);
    const grande = visivel(10, { fragmentoMinimo: 6, margemLateral: 0 });
    expect(grande).toHaveLength(3);
    expect(grande[1][0]).toBeCloseTo(30, 1);
    expect(grande[1][1]).toBeCloseTo(40, 1);
  });

  it('sem o piso do fragmento a fresta de 3 px sai, e as pontas do segmento, que continuam na linha vizinha, nunca são fragmento', () => {
    expect(visivel(3, { margemLateral: 0 })).toHaveLength(3);
    const pontas = visivel(3, { fragmentoMinimo: 1000, margemLateral: 0 });
    expect(pontas.map(([a, b]) => b - a).every((c) => c > 25)).toBe(true);
    expect(pontas).toHaveLength(2);
  });
});
