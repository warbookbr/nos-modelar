/* fuso.test.mjs — a família `fuso`: cada fuso da tabela sai com o núcleo, o filete e a castanha, sem órfão; o filete
 * cosmético assenta no núcleo como a rosca do fixador (a faceta do núcleo e a do filete se cruzam um pouco, sem atravessar)
 * e a castanha envolve o fuso sem tocar; o trapezoidal tem o diâmetro menor da ISO 2904; e
 * a tabela recusa o nome que não existe. */
import { describe, expect, it } from 'vitest';
import { chamar, criarRegistroDeFamilias } from '../index.js';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { contatosDaPeca } from '../../../src/autoria/contatos-da-peca.js';
import { DE_ESFERAS, TRAPEZOIDAIS, parametrosDoFuso } from './tabela.js';
import { geometriaDoFuso } from './geometria.js';

const registro = criarRegistroDeFamilias();
const F = registro.obter('fuso');
const receitaDe = (parametros) => ({ meta: { nome: 'fuso' }, get CHAMADAS_COMPOSICOES() { return [chamar(F, 'f', parametros)]; } });
const executar = (receita) => executarReceita(receita, { registroOperacoes: registro.registroOperacoes, registroComposicoes: registro.registroComposicoes }).neutro;
const partes = (n) => [...new Set([...n.F.values()].map((f) => f.parte))].sort();

describe('família fuso', () => {
  it('cada fuso da tabela sai com o núcleo, o filete e a castanha, sem órfão', () => {
    for (const nome of [...Object.keys(TRAPEZOIDAIS), ...Object.keys(DE_ESFERAS)]) {
      const n = executar(receitaDe(parametrosDoFuso(nome, { comprimento: 300, posicaoDaCastanha: 60 })));
      expect((n.orfaos ?? []).map((o) => o.motivo), nome).toEqual([]);
      expect(partes(n), nome).toEqual(['castanha', 'filete', 'fuso']);
    }
  });

  it('o filete assenta no núcleo sem atravessar, e a castanha não toca o fuso', () => {
    for (const nome of ['Tr20x4', '25x10']) {
      const receita = receitaDe(parametrosDoFuso(nome, { comprimento: 400, posicaoDaCastanha: 100 }));
      receita.contatos = [{ par: ['filete', 'fuso'], motivo: 'o filete cosmético assenta no núcleo, como a rosca do fixador' }];
      const c = contatosDaPeca(executar(receita), receita);
      expect(c.paresEmContato.map((p) => `${p.par.join('+')}:${p.estado}`), nome).toEqual(['filete+fuso:interpenetram']);
      expect(c.naoDeclarados, nome).toEqual([]);
      expect(c.atravessados, nome).toEqual([]);
    }
  });

  it('o trapezoidal tem o diâmetro menor da ISO 2904 (d3 = d − 2 (P/2 + ac))', () => {
    expect(2 * geometriaDoFuso(parametrosDoFuso('Tr20x4', { comprimento: 300 })).raioDoNucleo).toBeCloseTo(15.5, 9);
    expect(2 * geometriaDoFuso(parametrosDoFuso('Tr32x6', { comprimento: 300 })).raioDoNucleo).toBeCloseTo(25, 9);
  });

  it('a tabela recusa o nome que não existe, dizendo os aceitos', () => {
    expect(() => parametrosDoFuso('Tr22x5')).toThrow(/'Tr22x5' não existe; aceitos: Tr10x2/);
  });
});
