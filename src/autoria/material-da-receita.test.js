/* material-da-receita.test.js — o normalizador do material da receita: recusa o campo que não conhece, confere faixa, dá o padrão
   e mantém o sentido dos campos que existiam antes do plano de materiais realistas. */
import { describe, expect, it } from 'vitest';
import {
  CAMPOS, CAMPOS_ACEITOS, RELEVOS, TIPOS_DE_RELEVO, normalizarMaterial, normalizarMateriais,
} from './material-da-receita.js';

describe('normalizarMaterial — campo desconhecido', () => {
  it('recusa dizendo o nome do campo e os campos aceitos', () => {
    let erro;
    try { normalizarMaterial('tinta', { cor: '#112233', brilhoo: 0.5 }); } catch (e) { erro = e; }
    expect(erro).toBeInstanceOf(Error);
    expect(erro.message).toContain("material 'tinta'");
    expect(erro.message).toContain("campo 'brilhoo' desconhecido");
    for (const aceito of CAMPOS_ACEITOS) expect(erro.message).toContain(aceito);
  });

  it('recusa campo de outra grafia, em inglês ou com acento', () => {
    for (const campo of ['roughness', 'metalness', 'clearcoat', 'transmissão', 'opacity']) {
      expect(() => normalizarMaterial('m', { [campo]: 0.5 }), campo).toThrow(`campo '${campo}' desconhecido`);
    }
  });

  it('recusa subcampo desconhecido do relevo, dizendo os aceitos', () => {
    expect(() => normalizarMaterial('m', { relevo: { tipo: 'prismas', altura: 2 } }))
      .toThrow(/relevo\.altura.*Aceitos em relevo: tipo, escala, intensidade/);
  });

  it('recusa declaração que não é objeto', () => {
    expect(() => normalizarMaterial('m', '#fff')).toThrow(/precisa ser objeto de campos/);
    expect(() => normalizarMaterial('m', null)).toThrow(/precisa ser objeto de campos/);
    expect(() => normalizarMaterial('m', [])).toThrow(/precisa ser objeto de campos/);
    expect(() => normalizarMateriais([])).toThrow(/dicionário/);
  });
});

describe('normalizarMaterial — faixas', () => {
  const numericos = Object.entries(CAMPOS).filter(([, s]) => s.tipo === 'numero' || s.tipo === 'inteiro');

  it('aceita os dois extremos e recusa o que passa deles, em todo campo numérico', () => {
    expect(numericos.length).toBeGreaterThanOrEqual(15);
    for (const [campo, spec] of numericos) {
      expect(normalizarMaterial('m', { [campo]: spec.min })[campo], `${campo} mínimo`).toBe(spec.min);
      expect(normalizarMaterial('m', { [campo]: spec.max })[campo], `${campo} máximo`).toBe(spec.max);
      expect(() => normalizarMaterial('m', { [campo]: spec.max + 1 }), `${campo} acima`).toThrow(`campo '${campo}'`);
      expect(() => normalizarMaterial('m', { [campo]: spec.min - 1 }), `${campo} abaixo`).toThrow(`campo '${campo}'`);
      expect(() => normalizarMaterial('m', { [campo]: Number.NaN }), `${campo} NaN`).toThrow(`campo '${campo}'`);
      expect(() => normalizarMaterial('m', { [campo]: '0.5' }), `${campo} texto`).toThrow(`campo '${campo}'`);
    }
  });

  it('o índice de refração vai de 1 a 2,5 e a transmissão de 0 a 1', () => {
    expect(() => normalizarMaterial('vidro', { indiceDeRefracao: 0.9 })).toThrow(/1 a 2.5/);
    expect(() => normalizarMaterial('vidro', { transmissao: 1.2 })).toThrow(/0 a 1/);
  });

  it('confere cor, opção, booleano e inteiro', () => {
    expect(() => normalizarMaterial('m', { cor: 'azul' })).toThrow(/cor hexadecimal/);
    expect(() => normalizarMaterial('m', { tomDoVidro: '#12345' })).toThrow(/cor hexadecimal/);
    expect(() => normalizarMaterial('m', { mistura: 'vidro' })).toThrow(/opaco, recorte, transparente/);
    expect(() => normalizarMaterial('m', { tipo: 'couro' })).toThrow(/liso, metal, madeira, tecido/);
    expect(() => normalizarMaterial('m', { acabamento: 'polido' })).toThrow(/pintado, escovado/);
    expect(() => normalizarMaterial('m', { semLuz: 1 })).toThrow(/verdadeiro ou falso/);
    expect(() => normalizarMaterial('m', { tabuas: 2.5 })).toThrow(/inteiro/);
  });

  it('confere o tipo, a escala e a intensidade do relevo', () => {
    expect(() => normalizarMaterial('m', { relevo: { tipo: 'espinhos' } })).toThrow(/prismas, bandaDeRodagem, letras, granulado/);
    expect(() => normalizarMaterial('m', { relevo: 'prismas' })).toThrow(/precisa ser objeto/);
    for (const tipo of TIPOS_DE_RELEVO) {
      const { escala, intensidade } = RELEVOS[tipo];
      expect(normalizarMaterial('m', { relevo: { tipo, escala: escala.min, intensidade: 1 } }).relevo)
        .toEqual({ tipo, escala: escala.min, intensidade: 1 });
      expect(() => normalizarMaterial('m', { relevo: { tipo, escala: escala.max * 2 } }), `${tipo} escala`).toThrow('relevo.escala');
      expect(() => normalizarMaterial('m', { relevo: { tipo, escala: escala.min / 2 } }), `${tipo} escala baixa`).toThrow('relevo.escala');
      expect(() => normalizarMaterial('m', { relevo: { tipo, intensidade: intensidade.max + 0.1 } }), `${tipo} intensidade`).toThrow('relevo.intensidade');
    }
  });
});

describe('normalizarMaterial — valores padrão', () => {
  it('o material vazio devolve todos os campos, nos padrões da tabela', () => {
    const m = normalizarMaterial('vazio', {});
    expect(Object.keys(m)).toEqual(CAMPOS_ACEITOS);
    expect(m).toMatchObject({
      tipo: null, cor: null, mistura: 'opaco', opacidade: 1, aspereza: 0.68, metalicidade: 0.12, emissivo: 0, semLuz: false,
      contorno: 0, acabamento: null, brilho: null, verniz: 0, asperezaDoVerniz: 0.05, transmissao: 0, indiceDeRefracao: 1.5,
      tomDoVidro: null, flocos: 0, relevo: null,
    });
  });

  it('sem declaração (undefined) vale como todos os padrões', () => {
    expect(normalizarMaterial('x')).toEqual(normalizarMaterial('x', {}));
  });

  it('a opacidade padrão é 1, ou 0,58 quando a mistura é transparente; a declarada vale sempre', () => {
    expect(normalizarMaterial('m', {}).opacidade).toBe(1);
    expect(normalizarMaterial('m', { mistura: 'recorte' }).opacidade).toBe(1);
    expect(normalizarMaterial('m', { mistura: 'transparente' }).opacidade).toBe(0.58);
    expect(normalizarMaterial('m', { mistura: 'transparente', opacidade: 0.2 }).opacidade).toBe(0.2);
    expect(normalizarMaterial('m', { opacidade: 0.4 }).opacidade).toBe(0.4);
  });

  it('o relevo declarado só pelo tipo toma escala e intensidade do tipo', () => {
    for (const tipo of TIPOS_DE_RELEVO) {
      expect(normalizarMaterial('m', { relevo: { tipo } }).relevo).toEqual({
        tipo, escala: RELEVOS[tipo].escala.padrao, intensidade: RELEVOS[tipo].intensidade.padrao,
      });
    }
  });

  it('é determinístico e congelado, e não altera a declaração', () => {
    const decl = { cor: '#aa0000', verniz: 0.8, relevo: { tipo: 'granulado' } };
    const a = normalizarMaterial('m', decl);
    expect(JSON.stringify(normalizarMaterial('m', decl))).toBe(JSON.stringify(a));
    expect(Object.isFrozen(a)).toBe(true);
    expect(Object.isFrozen(a.relevo)).toBe(true);
    expect(decl).toEqual({ cor: '#aa0000', verniz: 0.8, relevo: { tipo: 'granulado' } });
  });
});

describe('normalizarMaterial — os campos de hoje ficam como estavam', () => {
  it('guarda cada valor declarado dos campos antigos sem alterar', () => {
    const decl = {
      tipo: 'metal', cor: '#a9adb3', mistura: 'transparente', opacidade: 0.5, aspereza: 0.1, metalicidade: 0.35, emissivo: 1.4,
      semLuz: true, contorno: 0.5, acabamento: 'escovado', brilho: 0.7, desgaste: 0.05, veio: 2, borda: 0.3, tabuas: 6,
      ferrugem: 0.1, manchas: 0.2, rasgos: 0.1,
    };
    expect(normalizarMaterial('m', decl)).toMatchObject(decl);
  });

  it('aspereza e metalicidade zero valem zero, e não o padrão', () => {
    const m = normalizarMaterial('m', { aspereza: 0, metalicidade: 0, emissivo: 0 });
    expect(m.aspereza).toBe(0);
    expect(m.metalicidade).toBe(0);
  });

  it('normaliza o dicionário inteiro, nome a nome', () => {
    const todos = normalizarMateriais({ a: { cor: '#111111' }, b: { cor: '#222222', verniz: 1 } });
    expect(Object.keys(todos)).toEqual(['a', 'b']);
    expect(todos.b.verniz).toBe(1);
    expect(() => normalizarMateriais({ a: { cor: '#111111' }, b: { cro: '#222222' } })).toThrow("material 'b': campo 'cro'");
  });
});

describe('a chave que agrupa as malhas', () => {
  it('separa dois materiais que diferem só no verniz, ou só no relevo, e funde os iguais', async () => {
    const { materialDaFace } = await import('./adaptar-three.js');
    const catalogo = normalizarMateriais({
      a: { cor: '#112233' }, b: { cor: '#112233', verniz: 1 }, c: { cor: '#112233' },
      d: { cor: '#112233', relevo: { tipo: 'granulado' } }, e: { cor: '#112233', relevo: { tipo: 'granulado', escala: 0.4, intensidade: 0.35 } },
    });
    const chave = (material) => materialDaFace({ material }, catalogo).chave;
    expect(chave('a')).toBe(chave('c'));
    expect(chave('a')).not.toBe(chave('b'));
    expect(chave('a')).not.toBe(chave('d'));
    expect(chave('d')).toBe(chave('e'));
  });
});
