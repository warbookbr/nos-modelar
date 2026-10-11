/* chamar-familia.test.js — `definirFamilia` e `chamar` sobre a família de prova: o que o `derivar` recebe e o que ele
   pode devolver. As recusas dos parâmetros e o caminho até a malha estão em `procedural/familias/familias.test.js`. */
import { describe, expect, it, vi } from 'vitest';
import { COMPOSICOES, ID_BARRA, ID_TUBO } from '../../tools/fixtures/familia-chamavel/composicoes.js';
import { TUBO_DE_PROVA } from '../../tools/fixtures/familia-chamavel/familia.js';
import { derivar } from '../../tools/fixtures/familia-chamavel/derivar.js';
import { ErroChamadaDeFamilia, chamar, definirFamilia } from './chamar-familia.js';
import { ErroFamilia } from './familia.js';

const contrato = () => structuredClone(TUBO_DE_PROVA.contrato);
const com = (derivarAlternativo) => definirFamilia({ contrato: contrato(), composicoes: COMPOSICOES, derivar: derivarAlternativo });
const recusa = (familia, id = 'corpo', parametros = {}) => {
  try { chamar(familia, id, parametros); } catch (erro) { expect(erro).toBeInstanceOf(ErroChamadaDeFamilia); return erro.message; }
  throw new Error('a chamada devia ser recusada');
};

describe('definirFamilia', () => {
  it('devolve o contrato lido, as composições e o derivar, congelados', () => {
    expect(TUBO_DE_PROVA.contrato.id).toBe('tubo-de-prova');
    expect(TUBO_DE_PROVA.composicoes.map(({ id }) => id)).toEqual([ID_BARRA, ID_TUBO]);
    expect(Object.isFrozen(TUBO_DE_PROVA)).toBe(true);
    expect(TUBO_DE_PROVA.derivar).toBe(derivar);
  });

  it('recusa contrato inválido, composição ausente ou repetida e derivar que não é função', () => {
    const quebrado = contrato(); quebrado.nivel = 'peca';
    expect(() => definirFamilia({ contrato: quebrado, composicoes: COMPOSICOES, derivar })).toThrow(/família 'tubo-de-prova': nivel recebeu "peca"/);
    expect(() => definirFamilia({ contrato: contrato(), composicoes: [], derivar })).toThrow(/composicoes recebeu \[\]; aceito: lista com ao menos uma composição/);
    expect(() => definirFamilia({ contrato: contrato(), composicoes: [COMPOSICOES[0], COMPOSICOES[0]], derivar })).toThrow(/composicoes recebeu "prova\.barra-macica"; aceito: composição citada uma vez só/);
    expect(() => definirFamilia({ contrato: contrato(), composicoes: COMPOSICOES, derivar: 'x' })).toThrow(/derivar recebeu "x"; aceito: função pura/);
  });
});

describe('chamar', () => {
  it('devolve a chamada de composição com os argumentos em metro', () => {
    expect(chamar(TUBO_DE_PROVA, 'corpo', { comprimento: 200, diametro: 50, parede: 4, lados: 16 })).toEqual({
      id: 'corpo', composicao: ID_TUBO,
      argumentos: { origem: 1, raio: 0.025, comprimento: 0.2, parte: 'corpo', material: 'aco', lados: 16, raioInterno: 0.021 },
    });
  });

  it('entrega ao derivar os parâmetros completos e congelados, uma vez por chamada', () => {
    const espiao = vi.fn((p) => derivar(p));
    chamar(com(espiao), 'corpo', { diametro: 80 });
    expect(espiao).toHaveBeenCalledTimes(1);
    expect(espiao.mock.calls[0][0]).toEqual({ comprimento: 120, diametro: 80, parede: 3, lados: 24 });
    expect(Object.isFrozen(espiao.mock.calls[0][0])).toBe(true);
    expect(() => chamar(com((p) => { p.diametro = 1; return derivar(p); }), 'corpo')).toThrow(TypeError);
  });

  it('não devolve referência aos dados do derivar e não muda os parâmetros recebidos', () => {
    const parametros = Object.freeze({ diametro: 80 });
    const a = chamar(TUBO_DE_PROVA, 'corpo', parametros);
    a.argumentos.raio = 99;
    expect(chamar(TUBO_DE_PROVA, 'corpo', parametros).argumentos.raio).toBe(0.04);
  });

  it('recusa o id da chamada e os parâmetros que não são objeto', () => {
    expect(recusa(TUBO_DE_PROVA, 'Corpo')).toBe('família \'tubo-de-prova\': id recebeu "Corpo"; aceito: id da chamada em minúsculas, dígitos e hífen, começando por letra.');
    expect(recusa(TUBO_DE_PROVA, 'corpo', [1])).toMatch(/parametros recebeu \[1\]; aceito: objeto \{ nome do parâmetro: valor \}/);
    expect(recusa(TUBO_DE_PROVA, 'corpo', null)).toMatch(/parametros recebeu null/);
  });

  it('recusa quem não é uma família carregada', () => {
    expect(() => chamar({ contrato: TUBO_DE_PROVA.contrato }, 'corpo')).toThrow(ErroFamilia);
    expect(() => chamar(null, 'corpo')).toThrow(/familia recebeu null; aceito: família carregada por definirFamilia/);
  });

  it('recusa o derivar que devolve composição, argumento ou forma que a família não declara', () => {
    expect(recusa(com(() => 7))).toMatch(/derivar recebeu 7; aceito: objeto \{ composicao, argumentos \}/);
    expect(recusa(com(() => ({ composicao: 'prova.outra', argumentos: {} })))).toMatch(/derivar\.composicao recebeu "prova\.outra"; aceito: uma composição da família: prova\.barra-macica, prova\.tubo-de-parede/);
    expect(recusa(com(() => ({ composicao: ID_BARRA })))).toMatch(/derivar\.argumentos recebeu nada \(campo ausente\)/);
    expect(recusa(com((p) => { const d = derivar({ ...p, parede: 0 }); return { ...d, argumentos: { ...d.argumentos, folga: 1 } }; }))).toMatch(/derivar\.argumentos\.folga recebeu 1; aceito: argumento de 'prova\.barra-macica': origem, raio/);
    expect(recusa(com((p) => { const d = derivar(p); delete d.argumentos.raio; return d; }))).toMatch(/derivar\.argumentos\.raio recebeu nada \(campo ausente\); aceito: o argumento 'raio' de 'prova\.tubo-de-parede', obrigatório/);
  });

  it('deixa passar o argumento que a composição preenche com o padrão', () => {
    const chamada = chamar(com((p) => { const d = derivar(p); delete d.argumentos.lados; return d; }), 'corpo');
    expect(chamada.argumentos).not.toHaveProperty('lados');
  });
});

describe('chamar com perfil', () => {
  const comPerfis = () => {
    const c = contrato();
    c.perfis = {
      barra: { descricao: 'barra maciça curta', parametros: { diametro: 30, comprimento: 90, parede: 0 } },
      cano: { descricao: 'cano de parede fina', parametros: { diametro: 60, comprimento: 300, parede: 2, lados: 32 } },
    };
    return definirFamilia({ contrato: c, composicoes: COMPOSICOES, derivar });
  };

  it('parte dos valores do perfil, completa com o padrão e deixa o chamador sobrescrever só o que quiser', () => {
    const familia = comPerfis();
    const doPerfil = chamar(familia, 'corpo', { perfil: 'cano' });
    expect(doPerfil).toEqual(chamar(familia, 'corpo', { diametro: 60, comprimento: 300, parede: 2, lados: 32 }));
    const ajustado = chamar(familia, 'corpo', { perfil: 'cano', comprimento: 400 });
    expect(ajustado).toEqual(chamar(familia, 'corpo', { diametro: 60, comprimento: 400, parede: 2, lados: 32 }));
    expect(chamar(familia, 'corpo', { perfil: 'barra' }).composicao).toBe(ID_BARRA);
    expect(chamar(familia, 'corpo', { perfil: 'barra', parede: 3 }).composicao).toBe(ID_TUBO);
  });

  it('recusa o perfil que a família não tem, e o perfil em família que não declara nenhum', () => {
    expect(recusa(comPerfis(), 'corpo', { perfil: 'roda' })).toMatch(/parametros\.perfil recebeu "roda"; aceito: um perfil da família: barra, cano/);
    expect(recusa(comPerfis(), 'corpo', { perfil: 7 })).toMatch(/parametros\.perfil recebeu 7/);
    expect(recusa(TUBO_DE_PROVA, 'corpo', { perfil: 'cano' })).toMatch(/parametros\.perfil recebeu "cano"; aceito: nada: a família não declara perfis/);
  });

  it('a chamada com perfil confere as restrições sobre os valores completos', () => {
    expect(recusa(comPerfis(), 'corpo', { perfil: 'cano', diametro: 400 })).toMatch(/parametros\.diametro recebeu 400/);
    expect(recusa(comPerfis(), 'corpo', { perfil: 'cano', comprimento: 40 })).toMatch(/restricao 'mais-comprido-que-largo'/);
  });
});
