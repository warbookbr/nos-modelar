/* gabinete.test.mjs — a família `gabinete`: cada perfil sai com a base e a tampa, cada uma num pedaço só e sem órfão; a
 * tampa só encosta na base (borda e encaixe), sem atravessar; a parede tem a espessura pedida; e o ressalto da base tem o
 * furo passante pelo fundo. */
import { describe, expect, it } from 'vitest';
import { chamar, criarRegistroDeFamilias } from '../index.js';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { contatosDaPeca } from '../../../src/autoria/contatos-da-peca.js';
import { pedacosDaMalha } from '../../../tools/fixtures/transmissao/pedacos.mjs';

const registro = criarRegistroDeFamilias();
const F = registro.obter('gabinete');
const receitaDe = (perfil) => ({ meta: { nome: 'gabinete' }, contatos: [{ par: ['base', 'tampa'], motivo: 'a tampa apoia na borda da base e o lábio entra no rebaixo' }], get CHAMADAS_COMPOSICOES() { return [chamar(F, 'g', { perfil })]; } });
const executar = (receita) => executarReceita(receita, { registroOperacoes: registro.registroOperacoes, registroComposicoes: registro.registroComposicoes }).neutro;
const caixa = (n, parte) => { const min = [Infinity, Infinity, Infinity]; const max = [-Infinity, -Infinity, -Infinity]; for (const f of n.F.values()) if (f.parte === parte) for (const v of f.vs) { const q = n.V.get(v); for (let k = 0; k < 3; k += 1) { min[k] = Math.min(min[k], q[k] * 1000); max[k] = Math.max(max[k], q[k] * 1000); } } return { min, max }; };

describe('família gabinete', () => {
  for (const perfil of Object.keys(F.contrato.perfis)) {
    it(`${perfil}: base e tampa num pedaço cada, a tampa só encostando na base`, () => {
      const receita = receitaDe(perfil);
      const n = executar(receita);
      expect((n.orfaos ?? []).map((o) => o.motivo)).toEqual([]);
      for (const parte of ['base', 'tampa']) expect(pedacosDaMalha({ V: n.V, F: new Map([...n.F].filter(([, f]) => f.parte === parte)) }), parte).toBe(1);
      const c = contatosDaPeca(n, receita);
      expect(c.paresEmContato.map((p) => `${p.par.join('+')}:${p.estado}`)).toEqual(['base+tampa:encostam']);
      expect(c.atravessados).toEqual([]);
      const q = F.contrato.perfis[perfil].parametros;
      const b = caixa(n, 'base'); const t = caixa(n, 'tampa');
      expect(b.max[0] - b.min[0]).toBeCloseTo(q.largura, 6);
      expect(b.min[1]).toBeCloseTo(0, 6);
      expect(t.max[1]).toBeCloseTo(q.altura, 6);
    });
  }

  it('a parede tem a espessura pedida e o furo do ressalto da base passa pelo fundo', () => {
    const n = executar(receitaDe('caixa-pequena'));
    /* no plano do fundo (y = 0) há os quatro furos do ressalto: vértices a 1,6 mm do centro do furo */
    const furos = [...n.V.values()].filter((q) => Math.abs(q[1]) < 1e-9).filter((q) => Math.abs(Math.hypot(q[0] * 1000 - 72, q[2] * 1000 - 47) - 1.6) < 1e-6);
    expect(furos.length).toBeGreaterThan(0);
    /* no lado de x positivo, fora dos cantos, as faces de fora e de dentro da parede ficam em x = 80 e x = 77,5 */
    const xs = new Set([...n.V.values()].filter((q) => q[0] > 0.077 && Math.abs(q[2] * 1000) <= 55 - 6 + 1e-6 && q[1] >= 0 && q[1] <= 0.03).map((q) => Math.round(q[0] * 1e7) / 1e4));
    expect([...xs].sort()).toEqual([77.5, 80]);
  });
});
