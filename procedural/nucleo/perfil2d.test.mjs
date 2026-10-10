/* perfil2d.test.mjs — perfil 2D com furos e deslocamento de contorno sobre a CrossSection da Manifold.

   As afirmações são números: áreas calculadas à mão, contagens de pontos, distâncias medidas e a saída byte a byte.
   Nenhuma é "parece certo". A tolerância de 1e-6 cobre a grade de 1e-8 do Clipper2. */
import { describe, expect, it } from 'vitest';
import { areaDoContorno, deslocarContorno } from './contorno.js';
import { CANTOS_DO_DESLOCAMENTO, ErroDePerfil, formaParaContorno, montarPerfil } from './perfil2d.js';
import { sha256Hex } from './sha256.js';

const RETANGULO = { retangulo: { largura: 4, profundidade: 3 } };
const areaPoligono = (n, r) => 0.5 * n * r * r * Math.sin((2 * Math.PI) / n);
const recusa = (entrada, opcoes) => { try { montarPerfil(entrada, opcoes); } catch (e) { return e; } return null; };

describe('furo', () => {
  it('um furo circular: um componente, um furo, área do retângulo menos a do polígono do furo', () => {
    const p = montarPerfil({ externo: RETANGULO, furos: [{ circulo: { raio: 0.5 } }] });
    expect(p.componentes).toHaveLength(1);
    expect(p.componentes[0].externo).toHaveLength(4);
    expect(p.componentes[0].furos).toHaveLength(1);
    expect(p.componentes[0].furos[0]).toHaveLength(16);
    expect(p.area).toBeCloseTo(12 - areaPoligono(16, 0.5), 6);
    expect(areaDoContorno(p.componentes[0].externo)).toBeGreaterThan(0);
    expect(areaDoContorno(p.componentes[0].furos[0])).toBeLessThan(0);
  });

  it('vários furos de formas diferentes: a área é a soma exata, e a ordem é a do menor ponto', () => {
    const p = montarPerfil({
      externo: RETANGULO,
      furos: [
        { circulo: { raio: 0.3, centro: [1, 0] } },
        { retangulo: { largura: 0.5, profundidade: 0.5, centro: [-1, 0.5] } },
        [[-1.5, -1], [-0.5, -1], [-1, -0.2]],
      ],
    });
    const [c] = p.componentes;
    expect(c.furos.map((f) => f.length)).toEqual([3, 4, 16]);   // por ponto inicial: (-1.5,-1), (-1.25,0.25), (0.7,0)
    expect(p.area).toBeCloseTo(12 - 0.5 * 1 * 0.8 - 0.25 - areaPoligono(16, 0.3), 6);
  });

  it('furo que encosta na borda é recusado com o campo, a distância e o conserto', () => {
    const e = recusa({ externo: RETANGULO, furos: [{ circulo: { raio: 0.5, centro: [1.5, 0] } }] });   // toca x = 2
    expect(e).toBeInstanceOf(ErroDePerfil);
    expect(e.campo).toBe('furos[0]');
    expect(e.message).toMatch(/encosta ou cruza a borda/);
    expect(e.message).toMatch(/distância/);
    expect(e.message).toMatch(/recorte no próprio contorno externo/);
  });

  it('furo que cruza a borda, furo fora e furo a uma folga mínima da borda', () => {
    expect(recusa({ externo: RETANGULO, furos: [{ circulo: { raio: 1, centro: [1.5, 0] } }] }).message).toMatch(/encosta ou cruza/);
    const fora = recusa({ externo: RETANGULO, furos: [{ circulo: { raio: 0.2, centro: [5, 0] } }] });
    expect(fora.campo).toBe('furos[0]');
    expect(fora.message).toMatch(/fora do contorno externo/);
    const folgado = montarPerfil({ externo: RETANGULO, furos: [{ circulo: { raio: 0.5, centro: [1.4, 0] } }] });   // 0,1 de folga
    expect(folgado.componentes[0].furos).toHaveLength(1);
  });

  it('furos que se tocam, se sobrepõem ou um dentro do outro são recusados com o índice do segundo', () => {
    const tocam = recusa({ externo: RETANGULO, furos: [{ circulo: { raio: 0.5, centro: [-0.5, 0] } }, { circulo: { raio: 0.5, centro: [0.5, 0] } }] });
    expect(tocam.campo).toBe('furos[1]');
    expect(tocam.message).toMatch(/furo 0/);
    const dentro = recusa({ externo: RETANGULO, furos: [{ circulo: { raio: 1 } }, { circulo: { raio: 0.2 } }] });
    expect(dentro.campo).toBe('furos[1]');
    expect(dentro.message).toMatch(/dentro do outro/);
  });
});

describe('deslocamento de contorno', () => {
  const desloca = (para, canto, extra = {}) => montarPerfil({ externo: RETANGULO, deslocar: { para, distancia: 0.2, canto }, ...extra });

  it('para dentro, o recuo de um contorno só com cantos convexos é o mesmo nos três cantos (3,6 × 2,6)', () => {
    for (const canto of CANTOS_DO_DESLOCAMENTO) {
      const p = desloca('dentro', canto);
      expect(p.area, canto).toBeCloseTo(3.6 * 2.6, 6);
      expect(p.componentes[0].externo, canto).toHaveLength(4);
    }
  });

  it('para fora, esquadria, reto e redondo diferem exatamente pelo que cada um põe no canto', () => {
    const esquadria = desloca('fora', 'esquadria');
    const reto = desloca('fora', 'reto');
    const redondo = desloca('fora', 'redondo');
    const borda = 12 + 14 * 0.2;
    expect(esquadria.area).toBeCloseTo(borda + 4 * 0.2 * 0.2, 6);                       // quadrado d × d em cada canto
    expect(reto.area).toBeCloseTo(borda + 4 * 0.2 * 0.2 * (2 * Math.SQRT2 - 2), 6);      // o canto é cortado por uma reta tangente ao círculo de raio d no vértice
    expect(redondo.area).toBeCloseTo(borda + 4 * 0.5 * 0.04 * 4 * Math.sin(Math.PI / 8), 6);   // 4 segmentos por quarto de volta
    expect(esquadria.componentes[0].externo).toHaveLength(4);
    expect(reto.componentes[0].externo).toHaveLength(8);
    expect(redondo.componentes[0].externo).toHaveLength(20);                            // 4 cantos × (4 segmentos + 1)
  });

  it('os arcos têm o número de segmentos pedido', () => {
    const p = desloca('fora', 'redondo', { segmentosArco: 8 });
    expect(p.componentes[0].externo).toHaveLength(36);
    expect(p.segmentosArco).toBe(8);
  });

  it('o furo cresce quando o contorno recua e encolhe quando ele expande', () => {
    const furos = [{ circulo: { raio: 0.5 } }];
    const dentro = montarPerfil({ externo: RETANGULO, furos, deslocar: { para: 'dentro', distancia: 0.2, canto: 'esquadria' } });
    const fora = montarPerfil({ externo: RETANGULO, furos, deslocar: { para: 'fora', distancia: 0.2, canto: 'esquadria' } });
    const raio = (f) => Math.max(...f.map((q) => Math.hypot(q[0], q[1])));
    expect(raio(dentro.componentes[0].furos[0])).toBeGreaterThan(0.5);
    expect(raio(fora.componentes[0].furos[0])).toBeLessThan(0.5);
  });

  it('um canto côncavo (L) distingue os três cantos no recuo', () => {
    const L = [[0, 0], [4, 0], [4, 1], [1, 1], [1, 4], [0, 4]];
    const areas = Object.fromEntries(CANTOS_DO_DESLOCAMENTO.map((canto) => [canto, montarPerfil({ externo: L, deslocar: { para: 'dentro', distancia: 0.2, canto } }).area]));
    expect(areas.esquadria).toBeLessThan(areas.reto);   // o recuo come mais área onde as arestas se prolongam até se cruzar
    expect(areas.reto).toBeLessThanOrEqual(areas.redondo);
    expect(areas.esquadria).toBeCloseTo(7 - 0.2 * (4 + 4 + 3 + 3 + 1 + 1) + 0.2 * 0.2 * (5 - 1), 6);
  });

  it('concorda com deslocarContorno na esquadria de um polígono convexo, nos dois sentidos', () => {
    const hexagono = Array.from({ length: 6 }, (_, k) => [2 * Math.cos((Math.PI * k) / 3), 2 * Math.sin((Math.PI * k) / 3)]);
    for (const [para, sinal] of [['dentro', 1], ['fora', -1]]) {
      const esperado = deslocarContorno(hexagono, sinal * 0.3);
      const medido = montarPerfil({ externo: hexagono, deslocar: { para, distancia: 0.3, canto: 'esquadria' } }).componentes[0].externo;
      expect(medido).toHaveLength(esperado.length);
      const chave = (q) => `${q[0].toFixed(5)},${q[1].toFixed(5)}`;
      const conjunto = new Set(medido.map(chave));
      for (const q of esperado) expect(conjunto.has(chave(q)), `${para} ${chave(q)}`).toBe(true);
    }
  });

  it('um recuo que parte o perfil dá um componente por pedaço, em ordem canônica', () => {
    const U = [[0, 0], [10, 0], [10, 4], [6, 4], [6, 1], [4, 1], [4, 4], [0, 4]];
    const p = montarPerfil({ externo: U, deslocar: { para: 'dentro', distancia: 1.2, canto: 'esquadria' } });
    expect(p.componentes).toHaveLength(2);
    expect(p.componentes.map((c) => c.externo[0])).toEqual([[1.2, 1.2], [7.2, 1.2]]);
  });

  it('um recuo que apaga o perfil é recusado e diz o recuo máximo', () => {
    const e = recusa({ externo: RETANGULO, deslocar: { para: 'dentro', distancia: 2, canto: 'esquadria' } });
    expect(e).toBeInstanceOf(ErroDePerfil);
    expect(e.campo).toBe('deslocar');
    expect(e.message).toMatch(/apaga o perfil inteiro/);
    expect(e.message).toMatch(/recuo máximo é aproximadamente 1\.5/);
  });
});

describe('recusa de entrada inválida: o campo, o valor e o que é aceito', () => {
  const casos = [
    [{ externo: RETANGULO, deslocar: { distancia: 1 } }, 'deslocar.para', /'dentro' ou 'fora'.*veio undefined/],
    [{ externo: RETANGULO, deslocar: { para: 'dentro', distancia: -1 } }, 'deslocar.distancia', /maior que zero \(veio -1\)/],
    [{ externo: RETANGULO, deslocar: { para: 'dentro', distancia: 1, canto: 'chanfro' } }, 'deslocar.canto', /'redondo', 'reto', 'esquadria'.*"chanfro"/],
    [{ externo: RETANGULO, deslocar: { para: 'dentro', distancia: 1, limite: 1 } }, 'deslocar.limite', />= 2 \(veio 1\)/],
    [{ externo: RETANGULO, deslocar: { para: 'dentro', distancia: 1, raio: 3 } }, 'deslocar.raio', /campo desconhecido; aceito: para, distancia, canto, limite/],
    [{ externo: RETANGULO, segmentosArco: 0 }, 'segmentosArco', /inteiro >= 1 \(veio 0\)/],
    [{ externo: [[0, 0], [1, 0]] }, 'externo', /3 pontos.*veio 2/],
    [{ externo: [[0, 0], [1, 0], [1, 'a']] }, 'externo[2][1]', /número finito/],
    [{ externo: [[0, 0], [1, 1], [1, 0], [0, 1]] }, 'externo', /não é um polígono simples/],
    [{ externo: { elipse: { raio: 1 } } }, 'externo', /forma desconhecida.*aceito: lista de pontos/],
    [{ externo: { circulo: { raio: -1 } } }, 'externo.circulo.raio', /maior que zero \(veio -1\)/],
    [{ externo: { circulo: { raio: 1, diametro: 2 } } }, 'externo.circulo.diametro', /campo desconhecido; aceito em circulo: raio, centro/],
    [{ externo: { retangulo: { largura: 1, profundidade: 1, cantos: 0.6 } } }, 'externo.retangulo', /soma dos raios/],
    [{ externo: RETANGULO, furos: 'um' }, 'furos', /lista de formas/],
    [{}, 'externo', /obrigatório/],
  ];
  for (const [entrada, campo, mensagem] of casos) {
    it(`${campo}: ${mensagem}`, () => {
      const e = recusa(entrada);
      expect(e, 'deveria recusar').toBeInstanceOf(ErroDePerfil);
      expect(e.campo).toBe(campo);
      expect(e.message).toMatch(mensagem);
    });
  }

  it('na revolução, raio negativo é recusado e um deslocamento para fora que atravessa o eixo é cortado nele', () => {
    const e = recusa({ externo: [[-1, 0], [1, 0], [1, 1], [-1, 1]] }, { semiPlano: true, nomes: { externo: 'perfil' } });
    expect(e.campo).toBe('perfil');
    expect(e.message).toMatch(/raio negativo \(-1\)/);
    const p = montarPerfil({ externo: [[0, 0], [1, 0], [1, 1], [0, 1]], deslocar: { para: 'fora', distancia: 0.5, canto: 'esquadria' } }, { semiPlano: true });
    expect(Math.min(...p.componentes[0].externo.map((q) => q[0]))).toBe(0);
    expect(p.area).toBeCloseTo(1.5 * 2, 6);
  });
});

describe('formas prontas', () => {
  it('o retângulo de cantos arredondados é o de retanguloArredondado, deslocado para o centro', () => {
    const pontos = formaParaContorno({ retangulo: { largura: 2, profundidade: 1, centro: [10, 5], cantos: 0.25 } }, 'x', { segmentosArco: 3 });
    expect(pontos).toHaveLength(16);
    expect(Math.min(...pontos.map((q) => q[0]))).toBeCloseTo(9, 9);
    expect(Math.max(...pontos.map((q) => q[1]))).toBeCloseTo(5.5, 9);
  });

  it('o círculo tem 4 × segmentosArco pontos e começa em +u', () => {
    const pontos = formaParaContorno({ circulo: { raio: 2, centro: [1, 1] } }, 'x', { segmentosArco: 5 });
    expect(pontos).toHaveLength(20);
    expect(pontos[0]).toEqual([3, 1]);
  });

  it('os números passam pelo resolvedor da receita (PARAM)', () => {
    const num = (x) => (x === 'meia' ? 0.5 : x);
    const pontos = formaParaContorno({ circulo: { raio: 'meia' } }, 'x', { num });
    expect(pontos[0]).toEqual([0.5, 0]);
  });
});

describe('determinismo', () => {
  const entrada = {
    externo: { retangulo: { largura: 4, profundidade: 3, cantos: [0.3, 0.3, 0, 0.5] } },
    furos: [{ circulo: { raio: 0.4, centro: [-1, 0] } }, { retangulo: { largura: 0.6, profundidade: 0.4, centro: [1, 0.2] } }],
    deslocar: { para: 'dentro', distancia: 0.15, canto: 'redondo' },
    segmentosArco: 6,
  };

  it('a mesma entrada devolve a mesma saída, byte a byte, em chamadas repetidas', () => {
    const a = JSON.stringify(montarPerfil(entrada));
    for (let k = 0; k < 5; k++) expect(JSON.stringify(montarPerfil(entrada))).toBe(a);
  });

  it('o ponto de partida e o sentido da lista de pontos não mudam a saída', () => {
    const base = [[0, 0], [4, 0], [4, 3], [1, 3], [0, 2]];
    const girada = [...base.slice(2), ...base.slice(0, 2)];
    const invertida = [...base].reverse();
    const f = (externo) => JSON.stringify(montarPerfil({ externo, furos: [[[1, 0.5], [2, 0.5], [2, 1.5], [1, 1.5]]], deslocar: { para: 'fora', distancia: 0.1, canto: 'redondo' } }));
    expect(f(girada)).toBe(f(base));
    expect(f(invertida)).toBe(f(base));
  });

  it('a saída de uma receita de referência tem o hash fixado (a regressão de versão da Manifold ou do Clipper2 aparece aqui)', () => {
    const p = montarPerfil(entrada);
    expect(p.componentes.map((c) => [c.externo.length, c.furos.map((f) => f.length)])).toEqual([[22, [48, 28]]]);
    expect(sha256Hex(JSON.stringify(p))).toBe('b575f35f28d74fafdc94f14b7ff8fb721cb027dd76e57b5af5f82a8be4d2e5c3');
  });
});
