/* duas-instancias.test.mjs — duas instâncias da mesma família numa receita, a prova da fatia 1 do plano de engrenagem, polia e correia.
 *
 * O par de polias e o par de engrenagens põem duas instâncias de uma família na mesma receita. Duas chamadas cruas em
 * `CHAMADAS_COMPOSICOES` repetem os ids de origem que a composição declara, e o núcleo deixa órfãos; `instanciaDeFamilia`
 * soma a base aos ids de cada instância e renomeia as partes, pelas `poses` de uma chamada ou pela `base` encadeada de
 * duas. A família usada é a `mola`, que já existe; o par de polias segue pelo mesmo caminho. */
import { describe, expect, it } from 'vitest';
import { chamar, criarRegistroDeFamilias } from '../../../procedural/familias/index.js';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { instanciaDeFamilia } from '../../modelar/instancia-de-familia.mjs';

const registro = criarRegistroDeFamilias();
const MOLA = registro.obter('mola');
const porPassos = (PASSOS) => executarReceita({ meta: { nome: 'duas-instancias' }, PASSOS }, { registroOperacoes: registro.registroOperacoes }).neutro;
const partes = (neutro) => [...new Set([...neutro.F.values()].map((f) => f.parte))].sort();
const orfaos = (neutro) => neutro.orfaos ?? [];
const DESLOCADA = { posicao: [0.05, 0, 0] };

describe('duas instâncias da mesma família numa receita', () => {
  it('duas chamadas cruas repetem os ids de origem e deixam órfãos', () => {
    const neutro = executarReceita(
      { meta: { nome: 'duas-cruas' }, get CHAMADAS_COMPOSICOES() { return [chamar(MOLA, 'a', {}), chamar(MOLA, 'b', {})]; } },
      { registroOperacoes: registro.registroOperacoes, registroComposicoes: registro.registroComposicoes },
    ).neutro;
    expect(orfaos(neutro).some((o) => /ambígua/.test(o.motivo))).toBe(true);
  });

  it('as poses de uma chamada de instanciaDeFamilia saem sem órfão e com as partes de cada instância', () => {
    const { passos } = instanciaDeFamilia({ familia: 'mola', registro, poses: [{ pose: { posicao: [0, 0, 0] }, nomes: 'a' }, { pose: DESLOCADA, nomes: 'b' }] });
    const neutro = porPassos(passos);
    expect(orfaos(neutro)).toEqual([]);
    expect(partes(neutro)).toEqual(['aEspiras', 'bEspiras']);
  });

  it('duas chamadas de instanciaDeFamilia encadeadas pela base saem sem órfão, e sem a base colidem', () => {
    const primeira = instanciaDeFamilia({ familia: 'mola', registro, nomes: 'a', id: 'a' });
    const segunda = instanciaDeFamilia({ familia: 'mola', registro, nomes: 'b', id: 'b', base: primeira.origem, pose: DESLOCADA });
    const encadeada = porPassos([...primeira.passos, ...segunda.passos]);
    expect(orfaos(encadeada)).toEqual([]);
    expect(partes(encadeada)).toEqual(['aEspiras', 'bEspiras']);
    const semBase = instanciaDeFamilia({ familia: 'mola', registro, nomes: 'b', id: 'b', pose: DESLOCADA });
    expect(orfaos(porPassos([...primeira.passos, ...semBase.passos])).length).toBeGreaterThan(0);
  });
});
