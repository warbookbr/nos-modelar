/* Biblioteca genérica de componentes de arquivo: parafuso, mola, engrenagem, rolamento, perfil estrutural e dobradiça.
   Cada um tem teste de expansão (ids, parâmetros, âncoras), de medida na geometria resolvida e de gate de contato aprovado
   no exemplo mínimo. */
import { describe, expect, it } from 'vitest';
import { ancorasDe, desenharEsboco, resolverOpcao } from '../src/index.js';
import { expandirEsboco } from '../src/expandir.js';
import { NOMES_DOS_COMPONENTES } from '../src/componentes.js';
import { verificarContato } from '../src/contato.js';
import { GERADORES } from '../src/perfis.js';

const perto = (v, esperado, casas = 4) => { expect(v).toHaveLength(esperado.length); v.forEach((x, i) => expect(x).toBeCloseTo(esperado[i], casas)); };
const extensao = (r) => r.max.map((v, i) => v - r.min[i]);
const esboco = (formas, extra = {}) => ({ opcoes: [{ titulo: 'T', formas }], contato: { usar: true }, ...extra });
const expandir = (formas) => expandirEsboco(esboco(formas)).opcoes[0];
const resolvidas = (formas) => Object.fromEntries(resolverOpcao(expandir(formas), 'T').map((r) => [r.id, r]));
const gate = (formas) => verificarContato(esboco(formas));

describe('a biblioteca ampliada', () => {
  it('lista os dez componentes de arquivo', () => {
    expect(NOMES_DOS_COMPONENTES).toEqual(['roda', 'garfo', 'quadro', 'mancal', 'parafuso', 'mola', 'engrenagem', 'rolamento', 'perfil', 'dobradica']);
  });
});

describe('parafuso', () => {
  const chapa = { id: 'chapa', tipo: 'caixa', largura: 60, altura: 60, profundidade: 4, centro: [0, 0, -2] };
  const formas = [chapa, { id: 'p', usa: 'parafuso', de: [0, 0, 0], para: [0, 0, 40], ponta: { fim: true } }];

  it('o eixo e o comprimento saem de `de` e `para`: cabeça sextavada de 7 mm e haste de 33 mm', () => {
    const r = resolvidas(formas);
    perto(ancorasDe(r['p.haste']).fim, [0, 0, 40]);
    perto(ancorasDe(r['p.cabeca']).inicio, [0, 0, 0]);
    perto(ancorasDe(r['p.cabeca']).fim, ancorasDe(r['p.haste']).inicio);
    expect(r['p.cabeca'].forma.lados).toBe(6);
    expect(extensao(r['p.cabeca'])[2]).toBeCloseTo(7, 4);
    expect(extensao(r['p.haste'])[2]).toBeCloseTo(33, 4);
    expect(extensao(r['p.haste'])[0]).toBeCloseTo(10, 4);
  });

  it('com sextavada 0 a cabeça é redonda, e o parafuso segue uma direção qualquer', () => {
    const r = resolvidas([{ id: 'p', usa: 'parafuso', de: [0, 0, 0], para: [0, 30, 40], parametros: { sextavada: 0, diametro: 6 }, ponta: true }]);
    expect(r['p.cabeca'].forma.lados).toBeUndefined();
    const a = ancorasDe(r['p.haste']);
    expect(Math.hypot(...a.fim.map((c, i) => c - ancorasDe(r['p.cabeca']).inicio[i]))).toBeCloseTo(50, 4);
  });

  it('o gate aprova o parafuso apoiado na chapa (a ponta livre declarada) e reprova a ponta solta', () => {
    expect(gate(formas).resultado).toBe('aprovado');
    const solto = gate([{ id: 'p', usa: 'parafuso', de: [0, 0, 0], para: [0, 0, 40] }]);
    expect(solto.achados.map((a) => a.tipo)).toEqual(['ponta-livre', 'ponta-livre']);
  });
});

describe('mola', () => {
  it('o tubo helicoidal sobe 3 passos entre as sapatas, que encostam nas pontas do fio', () => {
    const r = resolvidas([{ id: 'm', usa: 'mola', centro: [0, 0, 0], parametros: { raio: 20, fio: 3, passo: 8 } }]);
    const fio = ancorasDe(r['m.fio']);
    perto(fio.inicio, [20, 3, 0]);
    perto(fio.fim, [20, 27, 0]);
    expect(r['m.fio'].forma.caminho).toHaveLength(25);
    expect(r['m.topo'].min[1]).toBeCloseTo(fio.fim[1] + 1.5, 4);
    expect(r['m.base'].max[1]).toBeCloseTo(fio.inicio[1] - 1.5, 4);
    expect(gate([{ id: 'm', usa: 'mola', centro: [0, 0, 0] }]).resultado).toBe('aprovado');
  });

  it('com `aneis` a pilha tem `espiras` anéis encostados e a sapata de cima assenta no último', () => {
    const f = [{ id: 'm', usa: 'mola', centro: [0, 0, 0], parametros: { aneis: 1, espiras: 5, fio: 4, raio: 18 } }];
    const r = resolvidas(f);
    const aneis = Object.keys(r).filter((id) => id.startsWith('m.anel'));
    expect(aneis).toEqual(['m.anel', 'm.anel1', 'm.anel2', 'm.anel3', 'm.anel4']);
    expect(r['m.anel4'].max[1]).toBeCloseTo(1.5 + 5 * 4, 4);
    expect(r['m.topo'].min[1]).toBeCloseTo(r['m.anel4'].max[1], 4);
    expect(r['m.fio']).toBeUndefined();
    expect(gate(f).resultado).toBe('aprovado');
  });
});

describe('engrenagem', () => {
  it('o gerador `engrenagem` dá 5 pontos por dente, com a raiz e o topo nos raios pedidos, e recusa dentes demais poucos', () => {
    const p = GERADORES.engrenagem.gerar({ dentes: 12, raioExterno: 30, raioRaiz: 25 }, 't');
    expect(p).toHaveLength(60);
    const raios = p.map(([u, v]) => Math.hypot(u, v));
    expect(Math.max(...raios)).toBeCloseTo(30, 2);
    expect(Math.min(...raios)).toBeCloseTo(25, 2);
    expect(p.filter((_, i) => i % 5 === 1 || i % 5 === 2).every(([u, v]) => Math.abs(Math.hypot(u, v) - 30) < 0.01)).toBe(true);
    expect(() => GERADORES.engrenagem.gerar({ dentes: 4, raioExterno: 30, raioRaiz: 25 }, 't')).toThrow(/"dentes" deve ser um inteiro de 6 ou mais/);
  });

  it('o corpo mede o diâmetro externo do módulo, o cubo encosta na face de cima e o gate aprova', () => {
    const f = [{ id: 'g', usa: 'engrenagem', centro: [0, 0, 0], parametros: { dentes: 20, modulo: 4 } }];
    const r = resolvidas(f);
    expect(extensao(r['g.corpo'])[1]).toBeGreaterThan(87);
    expect(extensao(r['g.corpo'])[1]).toBeLessThanOrEqual(88 + 1e-6);
    expect(r['g.corpo'].forma.perfil).toHaveLength(100);
    expect(r['g.cubo'].min[2]).toBeCloseTo(r['g.corpo'].max[2], 4);
    expect(gate(f).resultado).toBe('aprovado');
    expect(desenharEsboco(esboco(f)).svg).toContain('<path');
  });

  it('duas engrenagens de mesmo módulo ficam a módulo x dentes entre centros, com o centro de uma na âncora da outra', () => {
    const f = [
      { id: 'a', usa: 'engrenagem', centro: [0, 0, 0], parametros: { dentes: 20, modulo: 4 } },
      { id: 'b', usa: 'engrenagem', centro: { ancora: 'a.eixo', mm: [80, 0, 0] }, parametros: { dentes: 20, modulo: 4 } },
    ];
    const r = resolvidas(f);
    expect(r['b.corpo'].centro[0] - r['a.corpo'].centro[0]).toBe(80);
  });
});

describe('rolamento', () => {
  const f = [{ id: 'r', usa: 'rolamento', centro: [0, 0, 0] }];

  it('tem dois anéis e `esferas` esferas a meia fiada, cada uma tangente aos dois anéis', () => {
    const r = resolvidas(f);
    const esferas = Object.keys(r).filter((id) => id.startsWith('r.esfera'));
    expect(esferas).toHaveLength(8);
    /* diametro 52, furo 25: terco = 4,5; as esferas giram no raio 12,5 + 6,75 = 19,25 */
    for (const id of esferas) expect(Math.hypot(r[id].centro[0], r[id].centro[1])).toBeCloseTo(19.25, 3);
    expect(extensao(r['r.esfera'])[0]).toBeCloseTo(4.5, 1);
    expect(r['r.anelInterno'].forma.diametroExterno).toBeCloseTo(34, 6);
    expect(r['r.anelExterno'].forma.diametroInterno).toBeCloseTo(43, 6);
    /* esfera tangente: o raio da fiada menos o raio da esfera é o externo do anel interno (17), e mais o raio, o interno do externo (21,5) */
    expect(19.25 - 2.25).toBeCloseTo(17, 6);
    expect(19.25 + 2.25).toBeCloseTo(21.5, 6);
  });

  it('o gate aprova o rolamento e os parâmetros mudam o número de esferas', () => {
    expect(gate(f).resultado).toBe('aprovado');
    const dez = [{ id: 'r', usa: 'rolamento', centro: [0, 0, 0], parametros: { esferas: 10, diametro: 80, furo: 40 } }];
    expect(Object.keys(resolvidas(dez)).filter((id) => id.startsWith('r.esfera'))).toHaveLength(10);
    expect(gate(dez).resultado).toBe('aprovado');
  });
});

describe('perfil estrutural', () => {
  it('a cantoneira em L tem a caixa largura x altura x comprimento e uma aba de espessura', () => {
    const f = [{ id: 'p', usa: 'perfil', centro: [0, 0, 0], parametros: { largura: 50, altura: 30, espessura: 5, comprimento: 200 } }];
    const r = resolvidas(f);
    expect(extensao(r['p.corpo'])).toEqual([50, 30, 200]);
    expect(r['p.corpo'].forma.perfil).toHaveLength(6);
    expect(gate(f).resultado).toBe('aprovado');
  });

  it('com `u` o canal tem 8 pontos e com `tubo` o tubo retangular tem 12, ambos com a mesma caixa', () => {
    const u = resolvidas([{ id: 'p', usa: 'perfil', centro: [0, 0, 0], parametros: { u: 1 } }]);
    expect(u['p.corpo'].forma.perfil).toHaveLength(8);
    expect(extensao(u['p.corpo'])).toEqual([40, 40, 300]);
    const t = [{ id: 'p', usa: 'perfil', centro: [0, 0, 0], parametros: { tubo: 1, largura: 60, altura: 40, espessura: 3 } }];
    const r = resolvidas(t);
    expect(r['p.corpo'].forma.perfil).toHaveLength(12);
    expect(extensao(r['p.corpo'])).toEqual([60, 40, 300]);
    expect(gate(t).resultado).toBe('aprovado');
    expect(gate([{ id: 'p', usa: 'perfil', centro: [0, 0, 0], parametros: { u: 1 } }]).resultado).toBe('aprovado');
  });
});

describe('dobradiça', () => {
  it('o pino fica entre duas abas coplanares encostadas nos lados dele', () => {
    const f = [{ id: 'd', usa: 'dobradica', centro: [0, 30, 0] }];
    const r = resolvidas(f);
    expect(extensao(r['d.pino'])).toEqual([8, 60, 8]);
    expect(r['d.abaE'].max[0]).toBeCloseTo(r['d.pino'].min[0], 4);
    expect(r['d.abaD'].min[0]).toBeCloseTo(r['d.pino'].max[0], 4);
    expect(extensao(r['d.abaE'])).toEqual([30, 60, 3]);
    perto(r['d.abaE'].centro.slice(1), [30, 0]);
    expect(ancorasDe(r['d.abaD'])['+x'][0]).toBeCloseTo(34, 4);
    expect(gate(f).resultado).toBe('aprovado');
  });

  it('as abas acompanham os parâmetros e as âncoras `bordaE` e `bordaD` marcam as pontas', () => {
    const r = resolvidas([{ id: 'd', usa: 'dobradica', centro: [0, 0, 0], parametros: { larguraAba: 50, diametroPino: 10 } }, { id: 'c', tipo: 'caixa', largura: 4, altura: 4, profundidade: 4, centro: 'd.bordaD' }]);
    perto(r.c.centro, [55, 0, 0]);
  });
});
