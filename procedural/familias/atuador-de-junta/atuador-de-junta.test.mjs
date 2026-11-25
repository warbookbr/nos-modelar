/* atuador-de-junta.test.mjs — a família `atuador-de-junta`: cada tamanho da tabela sai com a carcaça e a flange de saída,
 * cada uma num pedaço só; a saída só encosta na face da frente da carcaça; as portas dos furos casam com os furos (a
 * conferência da família cobra isso); e a tabela recusa o tamanho que não existe. */
import { describe, expect, it } from 'vitest';
import { chamar, criarRegistroDeFamilias } from '../index.js';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { contatosDaPeca } from '../../../src/autoria/contatos-da-peca.js';
import { pedacosDaMalha } from '../../../tools/fixtures/transmissao/pedacos.mjs';
import { ATUADORES, parametrosDoAtuador } from './tabela.js';

const registro = criarRegistroDeFamilias();
const F = registro.obter('atuador-de-junta');

describe('família atuador-de-junta', () => {
  for (const diametro of Object.keys(ATUADORES)) it(`o atuador de ${diametro} mm sai com a carcaça e a saída, a saída só encostando`, () => {
    const receita = { meta: { nome: 'atuador' }, contatos: [{ par: ['carcaca', 'saida'], motivo: 'a flange de saída gira sobre a face da frente da carcaça' }], get CHAMADAS_COMPOSICOES() { return [chamar(F, 'a', parametrosDoAtuador(diametro))]; } };
    const n = executarReceita(receita, { registroOperacoes: registro.registroOperacoes, registroComposicoes: registro.registroComposicoes }).neutro;
    expect((n.orfaos ?? []).map((o) => o.motivo)).toEqual([]);
    for (const parte of ['carcaca', 'saida']) expect(pedacosDaMalha({ V: n.V, F: new Map([...n.F].filter(([, f]) => f.parte === parte)) }), parte).toBe(1);
    const c = contatosDaPeca(n, receita);
    expect(c.paresEmContato.map((p) => `${p.par.join('+')}:${p.estado}`)).toEqual(['carcaca+saida:encostam']);
    expect(c.atravessados).toEqual([]);
  });

  it('recusa o tamanho que não existe, dizendo os aceitos', () => {
    expect(() => parametrosDoAtuador(70)).toThrow(/70 não existe; aceitos: 40, 60, 80, 100, 120/);
  });
});
