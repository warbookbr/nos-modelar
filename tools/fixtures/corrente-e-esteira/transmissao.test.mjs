/* transmissao.test.mjs — a fatia 2 do plano de corrente e esteira: a corrente 08B entre rodas de 18 e 36 dentes fecha com
 * um número par de elos, cada trecho reto tem passos exatos, os rolos assentam nos vãos sem atravessar, as peças da
 * corrente só encostam ou se cravam (pino nas placas, na casa de centésimos de milímetro), e a montagem sai rápida. */
import { describe, expect, it } from 'vitest';
import { criarRegistroDeFamilias } from '../../../procedural/familias/index.js';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { contatosDaPeca } from '../../../src/autoria/contatos-da-peca.js';
import { disposicaoDaCorrente, geometriaDaCorrente } from '../../../procedural/familias/corrente/geometria.js';
import { medidasDaCorrente } from '../../../procedural/familias/corrente/tabela.js';
import { receitaDaTransmissao } from './transmissao.mjs';

const registro = criarRegistroDeFamilias();

describe('transmissão por corrente de prova', () => {
  const { receita, transmissao } = receitaDaTransmissao();
  const inicio = performance.now();
  const neutro = executarReceita(receita, { registroOperacoes: registro.registroOperacoes }).neutro;
  const segundos = (performance.now() - inicio) / 1000;

  it('fecha com um número par de elos, com os trechos retos em passos exatos, sem órfão e abaixo de dez segundos', () => {
    expect(transmissao.elos % 2).toBe(0);
    expect((neutro.orfaos ?? []).map((o) => o.motivo)).toEqual([]);
    expect(segundos).toBeLessThan(10);
    const g = geometriaDaCorrente(transmissao.parametrosDaCorrente);
    const [A1] = [g.trechos[0].inicio]; const B1 = g.trechos[1].inicio;
    expect(Math.hypot(B1[0] - A1[0], B1[1] - A1[1])).toBeCloseTo(g.n * 12.7, 9);
  });

  it('os rolos assentam nos vãos sem atravessar, e as peças da corrente só encostam ou se cravam', () => {
    const c = contatosDaPeca(neutro, receita);
    expect(c.atravessados).toEqual([]);
    expect(c.naoDeclarados).toEqual([]);
    for (const sem of c.declaradosSemContato) {
      expect(sem.par.some((p) => p.startsWith('roda')), JSON.stringify(sem)).toBe(true);
      expect(sem.distancia * 1000).toBeLessThan(0.05);
    }
    for (const p of c.paresEmContato) if (p.estado === 'interpenetram') expect(p.penetracao.profundidade * 1000, p.par.join('+')).toBeLessThan(0.1);
  });

  it('recusa a distância curta demais e a corrente que não existe', () => {
    expect(() => disposicaoDaCorrente({ ...medidasDaCorrente('08B'), dentes1: 18, dentes2: 36, distancia: 60 })).toThrow(/curta para as rodas/);
    expect(() => medidasDaCorrente('08A')).toThrow(/'08A' não existe; aceitas: 06B/);
  });
});
