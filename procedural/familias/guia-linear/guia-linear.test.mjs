/* guia-linear.test.mjs — a família `guia-linear`: cada tamanho sai com o trilho e o carro, cada um num pedaço só; o carro
 * apoia no topo do trilho só encostando, com o vão dos lados; o trilho tem os furos centrados no comprimento; e a tabela
 * recusa o tamanho que não existe. */
import { describe, expect, it } from 'vitest';
import { chamar, criarRegistroDeFamilias } from '../index.js';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { contatosDaPeca } from '../../../src/autoria/contatos-da-peca.js';
import { pedacosDaMalha } from '../../../tools/fixtures/transmissao/pedacos.mjs';
import { GUIAS, parametrosDaGuia } from './tabela.js';
import { geometriaDaGuia } from './geometria.js';

const registro = criarRegistroDeFamilias();
const F = registro.obter('guia-linear');
const receitaDe = (parametros) => ({ meta: { nome: 'guia' }, get CHAMADAS_COMPOSICOES() { return [chamar(F, 'g', parametros)]; } });
const executar = (receita) => executarReceita(receita, { registroOperacoes: registro.registroOperacoes, registroComposicoes: registro.registroComposicoes }).neutro;
const partes = (n) => [...new Set([...n.F.values()].map((f) => f.parte))].sort();

describe('família guia-linear', () => {
  it('cada tamanho sai com o trilho e o carro, sem órfão, e cada um num pedaço só', () => {
    for (const tamanho of Object.keys(GUIAS)) {
      const n = executar(receitaDe(parametrosDaGuia(tamanho, { comprimento: 400, posicaoDoCarro: 100 })));
      expect((n.orfaos ?? []).map((o) => o.motivo), tamanho).toEqual([]);
      expect(partes(n), tamanho).toEqual(['carro', 'trilho']);
      expect(pedacosDaMalha(n), tamanho).toBe(2);
    }
  });

  it('o carro só encosta no topo do trilho', () => {
    const receita = receitaDe(parametrosDaGuia(20, { comprimento: 500, posicaoDoCarro: 200 }));
    receita.contatos = [{ par: ['carro', 'trilho'], motivo: 'o carro apoia no topo do trilho' }];
    const c = contatosDaPeca(executar(receita), receita);
    expect(c.paresEmContato.map((p) => p.estado)).toEqual(['encostam']);
    expect(c.atravessados).toEqual([]);
  });

  it('os furos do trilho ficam centrados no comprimento, a cada passo', () => {
    const g = geometriaDaGuia(parametrosDaGuia(20, { comprimento: 500 }));
    expect(g.furos).toBe(9);
    expect(g.primeiro + (g.furos - 1) * 60 + g.primeiro).toBeCloseTo(500, 9);
  });

  it('a tabela recusa o tamanho que não existe, dizendo os aceitos', () => {
    expect(() => parametrosDaGuia(35)).toThrow(/'35' não existe; aceitos: 15, 20, 25, 30/);
  });
});
