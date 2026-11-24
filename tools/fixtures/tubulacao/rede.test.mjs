/* rede.test.mjs — a fatia 2 do plano da tubulação: o zigue-zague de aço de 2" com três curvas de raio longo e o tampão sai
 * com cada peça no lugar, os tubos no comprimento de corte, as bocas casadas (curva e tubo com os mesmos 48 vértices, só
 * encostando) e nenhum outro contato,
 * e a família `tubulacao` sai oca e num pedaço só em cada perfil. */
import { describe, expect, it } from 'vitest';
import { receitaDaRede } from './rede.mjs';
import { ZIGUE_ZAGUE } from './tracados.mjs';
import { girosDoQuadro } from '../../../procedural/familias/tubulacao/rede.js';
import { chamar, criarRegistroDeFamilias } from '../../../procedural/familias/index.js';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { contatosDaPeca } from '../../../src/autoria/contatos-da-peca.js';
import { pedacosDaMalha } from '../transmissao/pedacos.mjs';

const registro = criarRegistroDeFamilias();
const executar = (receita) => executarReceita(receita, { registroOperacoes: registro.registroOperacoes }).neutro;
function caixa(neutro, parte) {
  const min = [Infinity, Infinity, Infinity]; const max = [-Infinity, -Infinity, -Infinity];
  for (const f of neutro.F.values()) if (f.parte === parte) for (const v of f.vs) { const p = neutro.V.get(v); for (let k = 0; k < 3; k += 1) { min[k] = Math.min(min[k], p[k] * 1000); max[k] = Math.max(max[k], p[k] * 1000); } }
  return { min, max };
}

describe('família tubulacao', () => {
  it('cada perfil sai oco, numa parte e num pedaço só', () => {
    const F = registro.obter('tubulacao');
    for (const perfil of Object.keys(F.contrato.perfis)) {
      const n = executarReceita({ meta: { nome: perfil }, get CHAMADAS_COMPOSICOES() { return [chamar(F, 'p', { perfil })]; } }, { registroOperacoes: registro.registroOperacoes, registroComposicoes: registro.registroComposicoes }).neutro;
      expect((n.orfaos ?? []).map((o) => o.motivo), perfil).toEqual([]);
      expect(pedacosDaMalha(n), perfil).toBe(1);
      /* oco: nenhum vértice no eixo, a não ser no fundo do tampão */
      const noEixo = [...n.V.values()].filter((p) => Math.hypot(p[0], p[2]) < 1e-6).length;
      if (!perfil.startsWith('tampao')) expect(noEixo, perfil).toBe(0);
    }
  });

  it('os giros do quadro levam x e y aos vetores pedidos, também com y ao longo de x', () => {
    for (const [x, y] of [[[0, 0, 1], [1, 0, 0]], [[1, 0, 0], [0, 1, 0]], [[0, 1, 0], [0, 0, -1]]]) {
      const giros = girosDoQuadro(x, y);
      const girar = (v) => giros.reduce((p, { eixo, graus }) => {
        const r = (graus * Math.PI) / 180; const c = Math.cos(r); const s = Math.sin(r); const [a, b, d] = p;
        return eixo === 'x' ? [a, b * c - d * s, b * s + d * c] : eixo === 'y' ? [a * c + d * s, b, -a * s + d * c] : [a * c - b * s, a * s + b * c, d];
      }, v);
      girar([1, 0, 0]).forEach((v, k) => expect(v).toBeCloseTo(x[k], 9));
      girar([0, 1, 0]).forEach((v, k) => expect(v).toBeCloseTo(y[k], 9));
    }
  });
});

describe('rede em zigue-zague', () => {
  const { receita, rede } = receitaDaRede(ZIGUE_ZAGUE);
  const neutro = executar(receita);

  it('sai com os quatro tubos, as três curvas e o tampão, sem órfão', () => {
    expect((neutro.orfaos ?? []).map((o) => o.motivo)).toEqual([]);
    expect(rede.pecas.map((p) => p.nome)).toEqual(['tubo0', 'tubo1', 'tubo2', 'tubo3', 'curvab', 'curvac', 'curvad', 'tampaoe']);
    expect(rede.portas).toHaveLength(1);
  });

  it('o primeiro tubo vai de x = 0 ao começo da curva, no comprimento de corte', () => {
    const c = caixa(neutro, 'tubo0Tubo');
    expect(c.min[0]).toBeCloseTo(0, 6);
    expect(c.max[0]).toBeCloseTo(500 - 76, 6);
    expect(c.max[1] - c.min[1]).toBeCloseTo(60.3, 1);
  });

  it('as bocas casam: todo contato é encosto de topo, sem sobreposição, e só os declarados', () => {
    const c = contatosDaPeca(neutro, receita);
    expect(c.paresEmContato).toHaveLength(7);
    expect(c.paresEmContato.every((p) => p.estado === 'encostam')).toBe(true);
    expect(c.cobertura.completa).toBe(true);
    expect(c.naoDeclarados).toEqual([]);
    expect(c.declaradosSemContato).toEqual([]);
    expect(c.atravessados).toEqual([]);
  });
});
