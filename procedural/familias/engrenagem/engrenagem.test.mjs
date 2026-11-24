/* engrenagem.test.mjs — a família `engrenagem`: cada perfil sai numa parte só e sem órfão, a reta tem os diâmetros de
 * cabeça e de pé da ISO 53 e o dente com meio passo de espessura no primitivo, e as restrições recusam o furo que não cabe
 * e menos de 17 dentes. */
import { describe, expect, it } from 'vitest';
import { chamar, criarRegistroDeFamilias } from '../index.js';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { pedacosDaMalha } from '../../../tools/fixtures/transmissao/pedacos.mjs';
import { geometriaDaEngrenagem } from './geometria.js';

const registro = criarRegistroDeFamilias();
const ENGRENAGEM = registro.obter('engrenagem');
const executar = (parametros) => executarReceita(
  { meta: { nome: 'engrenagem' }, get CHAMADAS_COMPOSICOES() { return [chamar(ENGRENAGEM, 'engrenagem', parametros)]; } },
  { registroOperacoes: registro.registroOperacoes, registroComposicoes: registro.registroComposicoes },
).neutro;
const completos = (perfil) => ({ ...Object.fromEntries(Object.entries(ENGRENAGEM.contrato.parametros).map(([n, d]) => [n, d.padrao])), ...ENGRENAGEM.contrato.perfis[perfil].parametros });

describe('família engrenagem', () => {
  it('cada perfil sai numa malha de um pedaço só, sem lasca solta', () => {
    for (const perfil of Object.keys(ENGRENAGEM.contrato.perfis)) expect(pedacosDaMalha(executar({ perfil })), perfil).toBe(1);
  });

  it('cada perfil sai numa parte só, sem órfão', () => {
    for (const perfil of Object.keys(ENGRENAGEM.contrato.perfis)) {
      const n = executar({ perfil });
      expect((n.orfaos ?? []).map((o) => o.motivo), perfil).toEqual([]);
      expect([...new Set([...n.F.values()].map((f) => f.parte))], perfil).toEqual(['engrenagem']);
    }
  });

  it('a reta de módulo 1 com 20 dentes tem cabeça de 22 mm e pé de 17,5 mm, medidos na malha', () => {
    const g = geometriaDaEngrenagem(completos('reta-m1-z20'));
    expect(g.diametroPrimitivo).toBe(20);
    expect(g.diametroDeCabeca).toBe(22);
    expect(g.diametroDePe).toBe(17.5);
    expect(g.diametroDeBase).toBeCloseTo(20 * Math.cos(Math.PI / 9), 9);
    const n = executar({ perfil: 'reta-m1-z20' });
    const raios = [];
    for (const p of n.V.values()) if (p[1] * 1000 > g.baseDoVao + 1) raios.push(Math.hypot(p[0], p[2]) * 1000);
    const naCoroa = raios.filter((r) => r > g.raioDoCubo + 0.01);
    expect(Math.max(...naCoroa)).toBeCloseTo(11, 3);
    expect(Math.min(...naCoroa)).toBeCloseTo(8.75, 2);
  });

  it('o vão tem meio passo de largura no primitivo, e o dente também', () => {
    const g = geometriaDaEngrenagem(completos('reta-m2-z30'));
    const rp = g.diametroPrimitivo / 2;
    /* o ângulo do vão no primitivo: os dois pontos do flanco em volta do raio primitivo, interpolados */
    const lado = g.vao.slice(0, g.vao.length >> 1).map(([x, z]) => [Math.hypot(x, z), Math.atan2(z, x)]);
    const k = lado.findIndex(([r], i) => i > 0 && r < rp);
    const [[r0, a0], [r1, a1]] = [lado[k - 1], lado[k]];
    const meioAngulo = a0 + ((rp - r0) / (r1 - r0)) * (a1 - a0);
    expect(2 * meioAngulo * rp).toBeCloseTo((Math.PI * 2) / 2, 2);
  });

  it('as restrições recusam o furo que não cabe, o cubo fino e menos de 17 dentes', () => {
    expect(() => chamar(ENGRENAGEM, 'e', { perfil: 'reta-m1-z20', furo: 16, diametroDoCubo: 20 })).toThrow(/furo-cabe-no-pe/);
    expect(() => chamar(ENGRENAGEM, 'e', { perfil: 'reta-m1-z20', diametroDoCubo: 7 })).toThrow(/cubo-maior-que-o-furo/);
    expect(() => chamar(ENGRENAGEM, 'e', { perfil: 'reta-m1-z20', dentes: 12 })).toThrow(/dentes/);
  });
});
