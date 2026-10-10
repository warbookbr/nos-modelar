/* extrusao-de-perfil.test.ts — `extrusao` e o `lathe` com `furos` e `deslocar`: perfil 2D com furo e deslocamento de
   contorno, levantado ou revolucionado em sólido.

   O ATRITO. Para um furo passante ou uma peça com canto arredondado de raio dado, a receita calculava ponto a ponto, fora
   do JSON, e a conta envelhecia quando o parâmetro mudava. Agora o perfil é descrito (contorno externo, furos,
   deslocamento) e o núcleo monta os pontos pela CrossSection da Manifold.

   As provas são medidas: volume contra a área do perfil, toda aresta servida por exatamente duas faces, ids pela fórmula
   documentada e a malha igual byte a byte em execuções repetidas. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo em JavaScript, exercitado pela API pública.
import { nucleo } from '../entrada.js';
// @ts-expect-error — módulo JavaScript sem tipos.
import { areaDoContorno } from '../contorno.js';
// @ts-expect-error — módulo JavaScript sem tipos.
import { montarPerfil } from '../perfil2d.js';
// @ts-expect-error — módulo JavaScript sem tipos.
import { sha256Hex } from '../sha256.js';

type Malha = { V: Map<number, number[]>; F: Map<number, any>; orfaos: any[] };

const volume = (m: Malha) => {
  let v = 0;
  for (const f of m.F.values()) {
    const P = f.vs.map((id: number) => m.V.get(id)!);
    for (let k = 1; k < P.length - 1; k++) {
      const [a, b, c] = [P[0], P[k], P[k + 1]];
      v += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
    }
  }
  return v;
};
/* arestas que não servem exatamente a duas faces: buraco ou dobra */
const irregulares = (m: Malha) => {
  const uso = new Map<string, number>();
  for (const f of m.F.values()) {
    for (let k = 0; k < f.vs.length; k++) {
      const a = f.vs[k], b = f.vs[(k + 1) % f.vs.length];
      const chave = a < b ? `${a}-${b}` : `${b}-${a}`;
      uso.set(chave, (uso.get(chave) ?? 0) + 1);
    }
  }
  return [...uso.values()].filter((n) => n !== 2).length;
};
const areaDoPoligono = (n: number, r: number) => 0.5 * n * r * r * Math.sin((2 * Math.PI) / n);
const gritos = (m: Malha) => m.orfaos.map((o) => `${o.ref}: ${o.motivo}`).join(' | ');
const rodar = (passos: any[]) => nucleo(passos, {}) as Malha;
const facesDe = (passos: any[], origem: Record<string, unknown>) => {
  const m = nucleo([...passos, ['parte', { nome: 'alvo', sel: { origem } }]], {}) as Malha;
  expect(gritos(m)).toBe('');
  return [...m.F.values()].filter((f) => f.parte === 'alvo');
};
const areaTotal = (perfil: any) => perfil.componentes.reduce((s: number, c: any) => s + areaDoContorno(c.externo) + c.furos.reduce((t: number, f: number[][]) => t + areaDoContorno(f), 0), 0);

const RETANGULO = { retangulo: { largura: 2, profundidade: 1 } };
const COM_FURO = { origemId: 1, perfil: RETANGULO, furos: [{ circulo: { raio: 0.2, centro: [0.3, 0] } }], altura: 0.5 };

describe('extrusao', () => {
  it('sem furo é a caixa: 8 vértices, 6 faces, volume largura × profundidade × altura', () => {
    const m = rodar([['extrusao', { origemId: 1, perfil: RETANGULO, altura: 0.5 }]]);
    expect(gritos(m)).toBe('');
    expect(m.V.size).toBe(8);
    expect(m.F.size).toBe(6);
    expect(volume(m)).toBeCloseTo(1, 12);
    expect(irregulares(m)).toBe(0);
  });

  it('com furo: o sólido é fechado e o volume é a área do perfil vezes a altura', () => {
    const m = rodar([['extrusao', COM_FURO]]);
    expect(gritos(m)).toBe('');
    expect(irregulares(m)).toBe(0);
    expect(volume(m)).toBeCloseTo((2 - areaDoPoligono(16, 0.2)) * 0.5, 7);   // a grade do Clipper2 é de 1e-8
    // 4 + 16 laterais, e as tampas em peças convexas (nenhuma face com 3 cantos a menos que o necessário)
    expect([...m.F.values()].filter((f) => f.vs.length === 4 && Math.abs(m.V.get(f.vs[0])![1] - m.V.get(f.vs[1])![1]) > 0.4).length).toBe(20);
  });

  it('ids: base do ponto g = g, topo = N + g, lateral g = g (formato salvo)', () => {
    const m = rodar([['extrusao', COM_FURO]]);
    const N = 4 + 16;
    expect(m.V.size).toBe(2 * N);
    for (let g = 0; g < N; g++) {
      const base = m.V.get(g)!, topo = m.V.get(N + g)!;
      expect(topo[0]).toBe(base[0]); expect(topo[2]).toBe(base[2]);
      expect(base[1]).toBe(0); expect(topo[1]).toBe(0.5);
      expect(m.F.get(g)!.vs).toEqual([g, N + g, N + ((g < 4 ? (g + 1) % 4 : 4 + ((g - 4 + 1) % 16))), (g < 4 ? (g + 1) % 4 : 4 + ((g - 4 + 1) % 16))]);
    }
  });

  it('a normal de toda face aponta para fora do material', () => {
    const m = rodar([['extrusao', { ...COM_FURO, deslocar: { para: 'fora', distancia: 0.05, canto: 'redondo' } }]]);
    expect(volume(m)).toBeGreaterThan(0);
    expect(irregulares(m)).toBe(0);
  });

  it('a malha é um sólido para as booleanas: subtrair o perfil furado de um bloco tira exatamente o seu volume', () => {
    const m = rodar([
      ['cubo', { origemId: 1, larg: 4, alt: 2, prof: 3 }],
      ['extrusao', { origemId: 2, perfil: RETANGULO, furos: [{ circulo: { raio: 0.2, centro: [0.3, 0] } }], altura: 3, em: [0, -0.5, 0] }],
      ['subtrair', { origemId: 3, solidos: [{ origem: { op: 'cubo', id: 1 } }, { origem: { op: 'extrusao', id: 2 } }] }],
    ]);
    expect(gritos(m)).toBe('');
    expect(volume(m)).toBeCloseTo(24 - (2 - areaDoPoligono(16, 0.2)) * 2, 5);
  });

  it('furos alinhados (uma aresta de um furo na reta de um ponto do outro) dão tampa sem aresta solta', () => {
    const m = rodar([['extrusao', { origemId: 1, perfil: { retangulo: { largura: 2, profundidade: 1, cantos: [0.2, 0.2, 0, 0.3] } }, furos: [{ circulo: { raio: 0.1, centro: [-0.5, 0] } }, { retangulo: { largura: 0.3, profundidade: 0.2, centro: [0.4, 0.05] } }], deslocar: { para: 'fora', distancia: 0.05, canto: 'redondo' }, segmentosArco: 5, altura: 0.4 }]]);
    expect(gritos(m)).toBe('');
    expect(irregulares(m)).toBe(0);
    expect(volume(m)).toBeGreaterThan(0);
  });

  describe('deslocamento de contorno nos três cantos', () => {
    for (const canto of ['redondo', 'reto', 'esquadria']) {
      for (const para of ['dentro', 'fora']) {
        it(`${para}, canto ${canto}: sólido fechado com o volume da área do perfil deslocado`, () => {
          const entrada = { origemId: 1, perfil: RETANGULO, furos: [{ circulo: { raio: 0.2, centro: [0.3, 0] } }], deslocar: { para, distancia: 0.1, canto }, altura: 0.5 };
          const m = rodar([['extrusao', entrada]]);
          expect(gritos(m)).toBe('');
          expect(irregulares(m)).toBe(0);
          const perfil = montarPerfil({ externo: entrada.perfil, furos: entrada.furos, deslocar: entrada.deslocar });
          expect(volume(m)).toBeCloseTo(areaTotal(perfil) * 0.5, 9);
          const semDeslocar = (2 - areaDoPoligono(16, 0.2)) * 0.5;
          if (para === 'fora') expect(volume(m)).toBeGreaterThan(semDeslocar); else expect(volume(m)).toBeLessThan(semDeslocar);
        });
      }
    }
  });

  it('vários furos e um recuo que parte o perfil: um sólido fechado com um componente por pedaço', () => {
    const U = [[0, 0], [10, 0], [10, 4], [6, 4], [6, 1], [4, 1], [4, 4], [0, 4]];
    const m = rodar([['extrusao', { origemId: 1, perfil: U, furos: [{ circulo: { raio: 0.3, centro: [2, 2] } }, { circulo: { raio: 0.3, centro: [8, 2] } }], deslocar: { para: 'dentro', distancia: 0.5, canto: 'esquadria' }, altura: 1 }]]);
    expect(gritos(m)).toBe('');
    expect(irregulares(m)).toBe(0);
    const perfil = montarPerfil({ externo: U, furos: [{ circulo: { raio: 0.3, centro: [2, 2] } }, { circulo: { raio: 0.3, centro: [8, 2] } }], deslocar: { para: 'dentro', distancia: 0.5, canto: 'esquadria' } });
    expect(perfil.componentes).toHaveLength(2);
    expect(volume(m)).toBeCloseTo(areaTotal(perfil), 9);
  });

  it('o eixo e a posição de criação valem como nos outros geradores', () => {
    const m = rodar([['extrusao', { origemId: 1, perfil: RETANGULO, altura: 3, eixo: 'x', em: [10, 0, 0] }]]);
    expect(gritos(m)).toBe('');
    const xs = [...m.V.values()].map((p) => p[0]);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(3, 9);
    expect(Math.min(...xs)).toBeCloseTo(10, 9);
  });

  describe('origem publicada', () => {
    const passos = [['extrusao', COM_FURO]];
    it('sem eixo é o sólido inteiro (o que as booleanas aceitam); lado escolhe uma lateral e parede todas', () => {
      const todas = facesDe(passos, { op: 'extrusao', id: 1 });
      expect(todas).toHaveLength(rodar(passos as any).F.size);
      expect(facesDe(passos, { op: 'extrusao', id: 1, lado: 0 })).toHaveLength(1);
      expect(facesDe(passos, { op: 'extrusao', id: 1, parede: 'todas' })).toHaveLength(20);
    });
    it('tampa fundo e topo são todas as peças da tampa, a -y e a +y', () => {
      for (const [nome, y, normal] of [['fundo', 0, -1], ['topo', 0.5, 1]] as const) {
        const fs = facesDe(passos, { op: 'extrusao', id: 1, tampa: nome });
        expect(fs.length).toBeGreaterThan(1);
        const m = rodar(passos as any);
        let area = 0;
        for (const f of fs) {
          const P = f.vs.map((id: number) => m.V.get(id)!);
          expect(P.every((p: number[]) => p[1] === y)).toBe(true);
          let ny = 0;
          for (let k = 0; k < P.length; k++) { const p = P[k], q = P[(k + 1) % P.length]; ny += q[0] * p[2] - p[0] * q[2]; }
          area += ny / 2;
        }
        // a soma das áreas com sinal (normal +y positiva) é a área do perfil, com o sinal da normal
        expect(area * normal).toBeCloseTo(2 - areaDoPoligono(16, 0.2), 7);
      }
    });
    it('parede externo, furos e o número do furo', () => {
      expect(facesDe(passos, { op: 'extrusao', id: 1, parede: 'externo' })).toHaveLength(4);
      expect(facesDe(passos, { op: 'extrusao', id: 1, parede: 'furos' })).toHaveLength(16);
      const furo0 = facesDe(passos, { op: 'extrusao', id: 1, parede: 0 });
      expect(furo0).toHaveLength(16);
      const m = rodar([...passos, ['parte', { nome: 'alvo', sel: { origem: { op: 'extrusao', id: 1, parede: 0 } } }]] as any);
      for (const f of [...m.F.values()].filter((q) => q.parte === 'alvo')) for (const id of f.vs) {
        const p = m.V.get(id)!;
        expect(Math.hypot(p[0] - 0.3, p[2])).toBeCloseTo(0.2, 7);
      }
    });
    it('parede de furo que não existe diz quantos furos o perfil tem', () => {
      const m = nucleo([...passos, ['parte', { nome: 'alvo', sel: { origem: { op: 'extrusao', id: 1, parede: 3 } } }]], {}) as Malha;
      expect(gritos(m)).toMatch(/parede 3 .* não existe; o perfil tem 1 furo/);
    });
    it('parede junto com lado ou tampa é recusada', () => {
      const m = nucleo([...passos, ['parte', { nome: 'alvo', sel: { origem: { op: 'extrusao', id: 1, parede: 'externo', lado: 1 } } }]], {}) as Malha;
      expect(gritos(m)).toMatch(/extrusao usa op, id e, no máximo, um de/);
    });
  });

  describe('recusa de entrada inválida: o passo aborta com 0 V/0 F e o grito diz campo e valor', () => {
    const recusa = (extra: Record<string, unknown>) => {
      const m = rodar([['extrusao', { ...COM_FURO, ...extra }]]);
      expect(m.V.size).toBe(0);
      expect(m.F.size).toBe(0);
      return m.orfaos;
    };
    it('furo encostando na borda', () => {
      const o = recusa({ furos: [{ circulo: { raio: 0.5, centro: [0.5, 0] } }] });   // toca z = 0,5
      expect(o).toHaveLength(1);
      expect(o[0].ref).toBe('furos[0]');
      expect(o[0].motivo).toMatch(/encosta ou cruza a borda.*distância.*mínimo/);
    });
    it('altura zero, negativa ou não finita', () => {
      expect(recusa({ altura: 0 })[0]).toMatchObject({ ref: 'altura' });
      expect(recusa({ altura: 0 })[0].motivo).toMatch(/maior que zero \(veio 0\)/);
      expect(recusa({ altura: -1 })[0].motivo).toMatch(/veio -1/);
    });
    it('deslocamento que apaga o perfil', () => {
      const o = recusa({ furos: [], deslocar: { para: 'dentro', distancia: 5, canto: 'esquadria' } });
      expect(o[0].ref).toBe('deslocar');
      expect(o[0].motivo).toMatch(/apaga o perfil inteiro; o recuo máximo é aproximadamente 0\.5/);
    });
    it('canto desconhecido e sentido ausente', () => {
      expect(recusa({ deslocar: { para: 'dentro', distancia: 0.1, canto: 'chanfro' } })[0].ref).toBe('deslocar.canto');
      expect(recusa({ deslocar: { distancia: 0.1 } })[0].ref).toBe('deslocar.para');
    });
    it('perfil ausente', () => {
      const m = rodar([['extrusao', { origemId: 1 }]]);
      expect(m.orfaos[0].ref).toBe('perfil');
      expect(m.orfaos[0].motivo).toMatch(/obrigatório/);
    });
  });

  describe('determinismo', () => {
    const receita = [['extrusao', { origemId: 1, perfil: { retangulo: { largura: 2, profundidade: 1, cantos: [0.2, 0.2, 0, 0.3] } }, furos: [{ circulo: { raio: 0.1, centro: [-0.5, 0] } }, { retangulo: { largura: 0.3, profundidade: 0.2, centro: [0.4, 0.05] } }], deslocar: { para: 'fora', distancia: 0.05, canto: 'redondo' }, segmentosArco: 5, altura: 0.4 }]];
    const serie = (m: Malha) => JSON.stringify({ V: [...m.V.entries()], F: [...m.F.entries()].map(([id, f]) => [id, f.vs]) });
    it('a mesma receita dá a mesma malha, byte a byte, em execuções repetidas', () => {
      const a = serie(rodar(receita));
      for (let k = 0; k < 4; k++) expect(serie(rodar(receita))).toBe(a);
    });
    it('o hash da malha de referência está fixado', () => {
      const m = rodar(receita);
      expect(gritos(m)).toBe('');
      expect(irregulares(m)).toBe(0);
      expect(sha256Hex(serie(m))).toBe('90bceab03b0044df251039e04d265ad031b04278636e417fbb680e953a23b04f');
    });
  });
});

describe('lathe com furos e deslocar', () => {
  const L = 24;
  const SECAO = [[0.5, 0], [1, 0], [1, 0.4], [0.5, 0.4]];
  const FURO = { circulo: { raio: 0.05, centro: [0.75, 0.2] } };
  const lathe = (extra: Record<string, unknown>, perfil = SECAO) => rodar([['lathe', { origemId: 1, lados: L, perfil, ...extra }]]);

  it('sem furos nem deslocar nada muda: o caminho é o de sempre', () => {
    const aberto = lathe({}, [...SECAO, SECAO[0]]);
    const secao = lathe({ furos: [] });
    expect(volume(secao)).toBeCloseTo(volume(aberto), 12);
    expect(irregulares(secao)).toBe(0);
  });

  it('a seção furada é o anel menos o anel do furo revolucionado, e o sólido é fechado', () => {
    const furo = montarPerfil({ externo: [[0.5, 0], [1, 0], [1, 0.4], [0.5, 0.4]], furos: [FURO] }).componentes[0].furos[0];
    const completo = lathe({ furos: [FURO] });
    expect(gritos(completo)).toBe('');
    expect(irregulares(completo)).toBe(0);
    // o furo horário revolucionado sozinho dá o volume com o sinal trocado, então o total é a soma dos dois laços
    const anel = lathe({}, [...SECAO, SECAO[0]]);   // a seção sem furo, fechada à moda antiga
    const furoAntiHorario = [...furo].reverse();
    const dentro = lathe({}, [...furoAntiHorario, furoAntiHorario[0]]);   // o furo sozinho, como seção fechada
    expect(gritos(dentro)).toBe('');
    expect(volume(dentro)).toBeGreaterThan(0);
    expect(volume(completo)).toBeCloseTo(volume(anel) - volume(dentro), 10);
  });

  it('as faixas se enfileiram: o externo e depois os furos', () => {
    const base = [['lathe', { origemId: 1, lados: L, perfil: SECAO, furos: [FURO] }]];
    const externas = facesDe(base, { op: 'lathe', id: 1, faixa: 0 });
    expect(externas).toHaveLength(L);
    const doFuro = facesDe(base, { op: 'lathe', id: 1, faixa: 4 });   // o externo tem 4 segmentos (a seção fecha sobre si)
    expect(doFuro).toHaveLength(L);
    const m = rodar([...base, ['parte', { nome: 'alvo', sel: { origem: { op: 'lathe', id: 1, faixa: 4 } } }]] as any);
    for (const f of [...m.F.values()].filter((q) => q.parte === 'alvo')) for (const id of f.vs) {
      const p = m.V.get(id)!;
      expect(Math.hypot(Math.hypot(p[0], p[2]) - 0.75, p[1] - 0.2)).toBeLessThanOrEqual(0.05 + 1e-7);
    }
  });

  it('uma seção que encosta no eixo vira polos: o disco com recuo redondo é fechado e igual ao cilindro quando não há recuo', () => {
    const disco = [[0, 0], [1, 0], [1, 0.4], [0, 0.4]];
    const m = lathe({ furos: [] }, disco);
    const cilindro = rodar([['cilindro', { raio: 1, altura: 0.4, lados: L }]]);
    expect(gritos(m)).toBe('');
    expect(irregulares(m)).toBe(0);
    expect(volume(m)).toBeCloseTo(volume(cilindro), 12);
    const recuado = lathe({ deslocar: { para: 'dentro', distancia: 0.1, canto: 'redondo' } }, disco);
    expect(gritos(recuado)).toBe('');
    expect(irregulares(recuado)).toBe(0);
    expect(volume(recuado)).toBeLessThan(volume(cilindro));
    expect(volume(recuado)).toBeGreaterThan(0);
  });

  it('deslocar para fora atravessando o eixo é cortado no eixo', () => {
    const m = lathe({ deslocar: { para: 'fora', distancia: 0.2, canto: 'esquadria' } }, [[0, 0], [1, 0], [1, 0.4], [0, 0.4]]);
    expect(gritos(m)).toBe('');
    expect(irregulares(m)).toBe(0);
    const cilindro = rodar([['cilindro', { raio: 1.2, altura: 0.8, lados: L }]]);
    expect(volume(m)).toBeCloseTo(volume(cilindro), 10);
  });

  it('recusas dizem o campo e o valor', () => {
    const m = lathe({ furos: [{ circulo: { raio: 0.3, centro: [0.55, 0.2] } }] });
    expect(m.V.size).toBe(0);
    expect(m.orfaos[0].ref).toBe('furos[0]');
    expect(m.orfaos[0].motivo).toMatch(/encosta ou cruza a borda do contorno externo \(perfil\)/);
    const negativo = lathe({ furos: [] }, [[-0.1, 0], [1, 0], [1, 0.4], [-0.1, 0.4]]);
    expect(negativo.orfaos[0].ref).toBe('perfil');
    expect(negativo.orfaos[0].motivo).toMatch(/raio negativo \(-0\.1\)/);
  });

  it('determinismo: a mesma receita dá a mesma malha, byte a byte', () => {
    const receita = { furos: [FURO], deslocar: { para: 'dentro', distancia: 0.03, canto: 'redondo' }, segmentosArco: 3 };
    const serie = (m: Malha) => JSON.stringify({ V: [...m.V.entries()], F: [...m.F.entries()].map(([id, f]) => [id, f.vs]) });
    const a = serie(lathe(receita));
    expect(gritos(lathe(receita))).toBe('');
    for (let k = 0; k < 3; k++) expect(serie(lathe(receita))).toBe(a);
    expect(sha256Hex(a)).toBe('d7a00daa709d73065c9691dccf393cf67fb23a3aa39e0a7ae7e2b598eeda8959');
  });
});
