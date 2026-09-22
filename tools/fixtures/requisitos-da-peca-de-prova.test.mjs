/* requisitos-da-peca-de-prova.test.mjs — a régua da peça de prova mede o que as
   guardas realmente exigem, e reprova quando falta. */
import { describe, expect, it } from 'vitest';
import { conferirRequisitos, REQUISITOS } from './requisitos-da-peca-de-prova.js';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import * as prova from './acervo/peca-de-prova/receita.js';

const receita = prova.default ?? prova;
const malha = () => executarReceita(receita).neutro;

describe('requisitos da peça de prova', () => {
  /* O SUJEITO DA RÉGUA É A PRÓPRIA FIXTURE. Antes era a bicicleta, a peça de
     acervo contra a qual as guardas tinham sido escritas, e a régua servia para
     aferir que ela não pedia mais do que aquela peça oferecia. A bicicleta saiu
     do repositório e as guardas passaram a rodar sobre esta peça, então é esta
     que precisa passar: régua que reprova a fixture que ela governa deixa toda
     a bateria de navegador sem objeto. */
  it('a peça que as guardas exercitam passa na régua', () => {
    const veredito = conferirRequisitos(malha(), { referenciasDeclaradas: 1 });
    expect(veredito.faltas).toEqual([]);
    expect(veredito.ok).toBe(true);
  });

  /* Os números medidos aqui são os MESMOS que as guardas imprimem quando rodam
     sobre esta peça. Bater é o que prova que a régua mede a condição certa, e
     não uma grandeza parecida. */
  it('a ilha e as juntas medidas são as que as guardas relatam', () => {
    const { medido } = conferirRequisitos(malha(), { referenciasDeclaradas: 1 });
    expect(medido.maiorIlha).toBe(38);
    expect(medido.juntas).toBe(3);
  });

  it('peça sem referência declarada reprova, porque a guarda de referência fica sem objeto', () => {
    const veredito = conferirRequisitos(malha(), { referenciasDeclaradas: 0 });
    expect(veredito.ok).toBe(false);
    expect(veredito.faltas.join(' ')).toMatch(/referência visual declarada/);
  });

  it('peça com uma parte só reprova, porque "as outras ficam paradas" falaria de nenhuma', () => {
    const neutro = malha();
    const F = new Map([...neutro.F].map(([id, f]) => [id, { ...f, parte: 'unica' }]));
    const veredito = conferirRequisitos({ ...neutro, F }, { referenciasDeclaradas: 1 });
    expect(veredito.ok).toBe(false);
    expect(veredito.faltas.join(' ')).toMatch(/partes: 1/);
  });

  it('peça sem parte vizinha reprova por falta de junta', () => {
    const neutro = malha();
    const F = new Map([...neutro.F].filter(([, f]) => f.parte === 'tuboEsquerdo'
      || f.parte === 'tuboDireito'));
    /* Afastar uma das partes para longe desfaz o encontro sem mudar a contagem. */
    const V = new Map([...neutro.V].map(([id, p]) => [id, [...p]]));
    for (const [, f] of F) {
      if (f.parte !== 'tuboEsquerdo') continue;
      for (const v of f.vs) V.get(v)[0] += 5;
    }
    const veredito = conferirRequisitos({ ...neutro, V, F }, { referenciasDeclaradas: 1 });
    expect(veredito.faltas.join(' ')).toMatch(/juntas detectadas/);
  });

  it('a régua não altera a malha que recebe', () => {
    const neutro = malha();
    const copia = new Map([...neutro.V].map(([id, p]) => [id, [...p]]));
    conferirRequisitos(neutro, { referenciasDeclaradas: 1 });
    for (const [id, p] of copia) expect(neutro.V.get(id)).toEqual(p);
  });

  it('todo requisito declarado tem medida correspondente', () => {
    const { medido } = conferirRequisitos(malha(), { referenciasDeclaradas: 1 });
    expect(Object.keys(REQUISITOS)).toHaveLength(6);
    for (const chave of ['partes', 'verticesDisputados', 'maiorIlha', 'juntas', 'referenciasDeclaradas']) {
      expect(medido[chave], chave).toBeTypeOf('number');
    }
  });
});
