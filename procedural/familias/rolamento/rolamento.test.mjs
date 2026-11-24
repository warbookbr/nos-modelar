/* rolamento.test.mjs — a família `rolamento`: cada designação da tabela sai com os dois anéis e as esferas, sem órfão; as
 * esferas ficam soltas na folga das pistas, sem tocar os anéis; o vedado cobre as esferas; o rolamento no mancal só encosta
 * no alojamento; e a tabela recusa a designação que não existe. */
import { describe, expect, it } from 'vitest';
import { chamar, criarRegistroDeFamilias } from '../index.js';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { contatosDaPeca } from '../../../src/autoria/contatos-da-peca.js';
import { pedacosDaMalha } from '../../../tools/fixtures/transmissao/pedacos.mjs';
import { ROLAMENTOS, parametrosDoRolamento } from './tabela.js';
import { regraDasEsferas } from './geometria.js';

const registro = criarRegistroDeFamilias();
const F = registro.obter('rolamento');
const receitaDe = (parametros) => ({ meta: { nome: 'rolamento' }, get CHAMADAS_COMPOSICOES() { return [chamar(F, 'r', parametros)]; } });
const executar = (receita) => executarReceita(receita, { registroOperacoes: registro.registroOperacoes, registroComposicoes: registro.registroComposicoes }).neutro;
const partes = (n) => [...new Set([...n.F.values()].map((f) => f.parte))].sort();

describe('família rolamento', () => {
  it('cada designação sai com os dois anéis e as esferas, sem órfão', () => {
    for (const nome of Object.keys(ROLAMENTOS)) {
      const q = parametrosDoRolamento(nome);
      const n = executar(receitaDe(q));
      expect((n.orfaos ?? []).map((o) => o.motivo), nome).toEqual([]);
      expect(partes(n), nome).toEqual(['anelExterno', 'anelInterno', 'esferas']);
      expect(pedacosDaMalha(n), nome).toBe(2 + regraDasEsferas(q).esferas);
    }
  });

  it('as esferas ficam soltas na folga, e o vedado tem as mesmas peças', () => {
    for (const forma of [1, 2]) {
      const receita = receitaDe(parametrosDoRolamento(6204, forma));
      receita.contatos = [];
      const c = contatosDaPeca(executar(receita), receita);
      expect(c.paresEmContato, `forma ${forma}`).toEqual([]);
      expect(c.atravessados).toEqual([]);
    }
  });

  it('no mancal, o rolamento só encosta no alojamento, e o mancal sai num pedaço só', () => {
    const receita = receitaDe(parametrosDoRolamento(6205, 3));
    receita.contatos = [{ par: ['anelExterno', 'mancal'], motivo: 'o anel externo assenta no alojamento do mancal' }];
    const n = executar(receita);
    expect(partes(n)).toEqual(['anelExterno', 'anelInterno', 'esferas', 'mancal']);
    const c = contatosDaPeca(n, receita);
    expect(c.paresEmContato.map((p) => `${p.par.join('+')}:${p.estado}`)).toEqual(['anelExterno+mancal:encostam']);
    expect(c.atravessados).toEqual([]);
  });

  it('a tabela recusa a designação que não existe, dizendo as aceitas', () => {
    expect(() => parametrosDoRolamento(6300)).toThrow(/'6300' não existe; aceitos: 6000/);
  });
});
