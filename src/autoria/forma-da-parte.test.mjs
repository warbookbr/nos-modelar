/* forma-da-parte.test.mjs — a promessa de forma só vale se ela reprovar.
 *
 * O par de fixtures carrega a mesma declaração — `aro: 'anel'` — e difere só no
 * que a receita entrega. Se um dia a medida parar de distinguir as duas, este
 * arquivo fica vermelho antes de alguém descobrir modelando.
 */
import { describe, expect, it } from 'vitest';
import { executarReceita } from './executar-receita.js';
import {
  FORMAS_NOMEADAS,
  formasDaPeca,
  formasMedidasDaPeca,
  lerFormasDeclaradas,
} from './forma-da-parte.js';

const RAIZ_FIXTURES = '../../tools/mecanifica/fixtures/contatos';

async function medir(nome) {
  const mod = await import(`${RAIZ_FIXTURES}/${nome}.js`);
  const receita = { meta: mod.meta, PASSOS: mod.PASSOS, ...(mod.formas ? { formas: mod.formas } : {}) };
  const { neutro } = executarReceita(receita);
  return { receita, neutro, resultado: formasDaPeca(neutro, receita) };
}

describe('formasDaPeca', () => {
  it('a MESMA promessa passa cumprida e reprova quebrada', async () => {
    const cumprida = await medir('fixture-forma-anel-cumprida');
    const quebrada = await medir('fixture-forma-anel-quebrada');

    expect(cumprida.receita.formas).toEqual(quebrada.receita.formas);

    expect(cumprida.resultado.divergentes).toEqual([]);
    expect(cumprida.resultado.conformes).toEqual([{ parte: 'aro', forma: 'anel' }]);

    expect(quebrada.resultado.divergentes).toHaveLength(1);
    expect(quebrada.resultado.divergentes[0]).toMatchObject({
      parte: 'aro',
      forma: 'anel',
      erros: [{ campo: 'furos', esperado: 1, medido: 0 }],
    });
  });

  it('conta furo passante por Euler, e o anel dá exatamente um', async () => {
    const { resultado } = await medir('fixture-forma-anel-cumprida');
    expect(resultado.medidas).toEqual([{
      parte: 'aro',
      corpos: 1,
      caracteristicaDeEuler: 0,
      fechada: true,
      furos: 1,
    }]);
  });

  it('parte SEM declaração não reprova por forma', async () => {
    const mod = await import(`${RAIZ_FIXTURES}/fixture-forma-anel-quebrada.js`);
    /* A mesma geometria que reprova declarada passa sem declaração: forma é
       opcional onde contato não é. */
    const { neutro } = executarReceita({ meta: mod.meta, PASSOS: mod.PASSOS });
    const resultado = formasDaPeca(neutro, {});
    expect(resultado.declaradas).toBe(0);
    expect(resultado.divergentes).toEqual([]);
    expect(resultado.medidas[0].furos).toBe(0);
  });

  it('malha aberta é INDECIDÍVEL, nunca sólido', async () => {
    /* Furo passante só é contável em malha fechada. Responder "sólido" numa
       malha aberta seria inventar garantia. */
    const neutro = {
      V: new Map([[1, [0, 0, 0]], [2, [1, 0, 0]], [3, [0, 1, 0]]]),
      F: new Map([[1, { id: 1, vs: [1, 2, 3], parte: 'chapa' }]]),
    };
    const medidas = formasMedidasDaPeca(neutro);
    expect(medidas.get('chapa').fechada).toBe(false);
    expect(medidas.get('chapa').furos).toBeNull();
    expect(medidas.get('chapa').indecidivel).toBe('malha-aberta');

    const resultado = formasDaPeca(neutro, { formas: { chapa: 'solido' } });
    expect(resultado.divergentes).toEqual([]);
    expect(resultado.indecidiveis).toHaveLength(1);
  });
});

describe('lerFormasDeclaradas', () => {
  const partes = ['aro', 'cubo'];

  it('anel e solido são atalhos para um número de furos', () => {
    expect(FORMAS_NOMEADAS.solido).toEqual({ furos: 0 });
    expect(FORMAS_NOMEADAS.anel).toEqual({ furos: 1 });
  });

  it('aceita furos e corpos explícitos', () => {
    const lido = lerFormasDeclaradas({ formas: { aro: { furos: 2, corpos: 16 } } }, partes);
    expect(lido.get('aro')).toEqual({ furos: 2, corpos: 16 });
  });

  it('recusa parte inexistente NOMEANDO as disponíveis', () => {
    expect(() => lerFormasDeclaradas({ formas: { fantasma: 'anel' } }, partes))
      .toThrow(/não tem parte 'fantasma'/);
    expect(() => lerFormasDeclaradas({ formas: { fantasma: 'anel' } }, partes))
      .toThrow(/Partes disponíveis: aro, cubo/);
  });

  it('recusa nome de forma desconhecido em vez de tratar como sólido', () => {
    /* `tubo` não existe de propósito: tubo e anel são a MESMA topologia, e
       oferecer duas palavras prometeria uma distinção que a régua não faz. */
    expect(() => lerFormasDeclaradas({ formas: { aro: 'tubo' } }, partes))
      .toThrow(/forma 'tubo' desconhecida/);
  });

  it('recusa furos negativo e campo desconhecido', () => {
    expect(() => lerFormasDeclaradas({ formas: { aro: { furos: -1 } } }, partes))
      .toThrow(/'furos' precisa ser inteiro >= 0/);
    expect(() => lerFormasDeclaradas({ formas: { aro: { furos: 1, cor: 'x' } } }, partes))
      .toThrow(/campo desconhecido 'cor'/);
  });
});

describe('o veredito sai no CÓDIGO DE SAÍDA', () => {
  async function estrito(nome) {
    const modulo = await import(`${RAIZ_FIXTURES}/${nome}.js`);
    const { descreverPecaReutilizavel } = await import('../../tools/mecanifica/descrever-peca.mjs');
    return descreverPecaReutilizavel({ peca: nome, modulo, estrito: true });
  }

  it('forma cumprida sai com código 0', async () => {
    const r = await estrito('fixture-forma-anel-cumprida');
    expect(r.codigo).toBe(0);
  });

  it('forma quebrada sai com código 1, e só por forma', async () => {
    const r = await estrito('fixture-forma-anel-quebrada');
    expect(r.codigo).toBe(1);
    /* A fixture isola UM defeito: nada de órfão nem de contato junto, senão
       ela não provaria qual conferência a pegou. */
    expect(r.resultado.formas.divergentes).toHaveLength(1);
    expect(r.resultado.contatos.naoDeclarados).toEqual([]);
    expect(r.stderr).not.toMatch(/ÓRFÃO/);
  });
});
