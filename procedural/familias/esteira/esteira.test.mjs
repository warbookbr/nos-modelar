/* esteira.test.mjs — a família `esteira`: cada passo da tabela fecha em volta da motriz e da guia sem órfão; as buchas, as
 * sapatas, a guia e os roletes só encostam nos trilhos, a bucha fica no vão da motriz com a folga do assento e nada
 * atravessa; a esteira sai rápida; e a tabela recusa o passo que não existe e roletes demais. */
import { describe, expect, it } from 'vitest';
import { chamar, criarRegistroDeFamilias } from '../index.js';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { contatosDaPeca } from '../../../src/autoria/contatos-da-peca.js';
import { ESTEIRAS, parametrosDaEsteira } from './tabela.js';
import { geometriaDaEsteira } from './geometria.js';

const registro = criarRegistroDeFamilias();
const F = registro.obter('esteira');
const c = (a, b, motivo) => ({ par: [a, b], motivo });
const CONTATOS = [
  c('buchas', 'trilhos', 'a bucha fica presa entre os dois trilhos do elo'),
  c('sapatas', 'trilhos', 'a sapata é parafusada no lado de fora do trilho'),
  c('guia', 'trilhos', 'a guia apoia no lado de dentro dos trilhos onde a esteira enrola'),
  c('roletes', 'trilhos', 'os roletes apoiam no lado de dentro dos trilhos de baixo'),
];
const receitaDe = (q) => ({ meta: { nome: 'esteira' }, contatos: CONTATOS, get CHAMADAS_COMPOSICOES() { return [chamar(F, 'e', q)]; } });
const executar = (receita) => executarReceita(receita, { registroOperacoes: registro.registroOperacoes, registroComposicoes: registro.registroComposicoes }).neutro;

/* O teto é guarda contra travamento (tools/CLAUDE.md): no CI, cuja máquina varia de duas a três vezes, ele é o triplo do local;
   o envio de 2026-11-26 reprovou aqui a 2,0 e 2,2 s sem mudança na família. */
const TETO_EM_SEGUNDOS = process.env.CI ? 6 : 2;

describe('família esteira', () => {
  it('cada passo fecha sem órfão, abaixo de dois segundos, com os encontros só encostando e nada atravessado', () => {
    for (const [passo, distancia] of [[101, 1600], [135, 2200], [171, 3000]]) {
      const receita = receitaDe(parametrosDaEsteira(passo, { distancia, roletes: 4 }));
      const t = performance.now();
      const n = executar(receita);
      expect((performance.now() - t) / 1000, `${passo}`).toBeLessThan(TETO_EM_SEGUNDOS);
      expect((n.orfaos ?? []).map((o) => o.motivo), `${passo}`).toEqual([]);
      const k = contatosDaPeca(n, receita);
      expect(k.paresEmContato.map((p) => `${p.par.join('+')}:${p.estado}`).sort(), `${passo}`).toEqual(['buchas+trilhos:encostam', 'guia+trilhos:encostam', 'roletes+trilhos:encostam', 'sapatas+trilhos:encostam']);
      expect(k.naoDeclarados, `${passo}`).toEqual([]);
      expect(k.atravessados, `${passo}`).toEqual([]);
    }
  });

  it('a esteira fecha com um número par de elos e a ponta do dente da motriz fica abaixo da sapata', () => {
    const g = geometriaDaEsteira(parametrosDaEsteira(135, { distancia: 2200 }));
    expect(g.elos % 2).toBe(0);
    expect(g.raioDaCoroa).toBeLessThan(g.R1 * Math.cos(Math.PI / 21) + 65 / 2);
  });

  it('recusa o passo que não existe e roletes que não cabem', () => {
    expect(() => parametrosDaEsteira(150)).toThrow(/'150' não existe; aceitos: 101, 135, 171/);
    expect(() => geometriaDaEsteira(parametrosDaEsteira(135, { distancia: 1500, roletes: 8 }))).toThrow(/roletes não cabem/);
    expect(Object.keys(ESTEIRAS)).toHaveLength(3);
  });
});
