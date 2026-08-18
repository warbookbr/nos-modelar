import { describe, expect, it } from 'vitest';
// @ts-expect-error — contrato JavaScript puro da autoria.
import { compararIntencoes, normalizarIntencaoPeca } from '../../src/autoria/intencao-peca.js';
// @ts-expect-error — fronteira JavaScript exercitada pelo gate.
import { entradaDaReceita, executarReceita } from '../../src/autoria/executar-receita.js';
// @ts-expect-error — medição JavaScript headless.
import { descreverPeca } from '../../src/autoria/descrever-partes.js';
// @ts-expect-error — serviço headless da descrição.
import { descreverPecaReutilizavel } from './descrever-peca.mjs';
// @ts-expect-error — revisão JavaScript persistível.
import { compararRevisoes, construirRevisao } from '../modelagem/revisao-modelagem.mjs';

const intencao = {
  funcao: 'guiar a carga entre duas interfaces',
  familia: 'suporte estrutural',
  eixosLocais: { z: 'profundidade', x: 'largura', y: 'altura' },
  invariantes: ['eixo central permanece livre', 'base permanece apoiada'],
  criteriosVisuais: ['silhueta compacta', 'transições legíveis'],
};

const receita = (INTENCAO?: unknown) => ({
  ...(INTENCAO === undefined ? {} : { INTENCAO }),
  PARAMS: { lado: 1 },
  PASSOS: [
    ['cubo', { origemId: 1, lado: 'lado' }],
    ['parte', { nome: 'corpo', sel: { origem: { op: 'cubo', id: 1 } } }],
  ],
});

function vistas() {
  return ['isometrica', 'frontal', 'direita', 'superior'].map((nome) => ({
    nome,
    enquadramento: { valida: true, area: 0.5, largura: 0.5, altura: 0.5, cortado: false },
  }));
}

describe('intenção semântica opcional de peça', () => {
  it('canonicaliza e entra na entrada, sem contaminar receita sem intenção', () => {
    const com = entradaDaReceita(receita(intencao));
    expect(com.INTENCAO).toEqual({
      funcao: intencao.funcao,
      familia: intencao.familia,
      eixosLocais: { x: 'largura', y: 'altura', z: 'profundidade' },
      invariantes: ['base permanece apoiada', 'eixo central permanece livre'],
      criteriosVisuais: ['silhueta compacta', 'transições legíveis'],
    });
    const sem = entradaDaReceita(receita());
    expect(Object.hasOwn(sem, 'INTENCAO')).toBe(false);
    expect(executarReceita(receita()).entrada).toEqual(sem);
  });

  it('falha fechado em campos ausentes, desconhecidos, runtime e duplicados', () => {
    expect(() => normalizarIntencaoPeca({ ...intencao, familia: undefined })).toThrow(/familia/);
    expect(() => normalizarIntencaoPeca({ ...intencao, surpresa: 'x' })).toThrow(/surpresa/);
    expect(() => normalizarIntencaoPeca({ ...intencao, invariantes: ['mesmo', 'mesmo'] })).toThrow(/repetir/);
    expect(() => normalizarIntencaoPeca({ ...intencao, host: 'local' })).toThrow(/host/);
    expect(() => executarReceita(receita({ ...intencao, eixosLocais: { ...intencao.eixosLocais, x: 'C:\\tmp' } }))).toThrow(/caminho/);
  });

  it('expõe intenção e null no resultado estruturado do serviço headless', async () => {
    const com = await descreverPecaReutilizavel({ peca: 'fixture-intencao', modulo: receita(intencao) });
    const sem = await descreverPecaReutilizavel({ peca: 'fixture-sem-intencao', modulo: receita() });
    expect(com.resultado?.intencao).toEqual(entradaDaReceita(receita(intencao)).INTENCAO);
    expect(com.resultado?.descricao.intencao).toEqual(com.resultado?.intencao);
    expect(sem.resultado?.intencao).toBeNull();
    expect(sem.resultado?.descricao.intencao).toBeNull();
  });

  it('inclui intenção na assinatura quando declarada e difere por campos semânticos', () => {
    const neutro = executarReceita(receita()).neutro;
    const base = descreverPeca(neutro);
    const anterior = construirRevisao({ peca: 'fixture-intencao', descricao: { ...base, intencao }, vistas: vistas() });
    const atualIntencao = {
      ...intencao,
      eixosLocais: { ...intencao.eixosLocais, z: 'curso' },
      invariantes: ['base permanece apoiada', 'fixação continua acessível'],
    };
    const atual = construirRevisao({ peca: 'fixture-intencao', descricao: { ...base, intencao: atualIntencao }, vistas: vistas() });
    expect(atual.assinaturaModelo).not.toBe(anterior.assinaturaModelo);
    expect(compararRevisoes(anterior, atual).intencao).toEqual({
      mudou: true,
      campos: [],
      eixosLocais: { alterados: [{ eixo: 'z', anterior: 'profundidade', atual: 'curso' }] },
      invariantes: { adicionadas: ['fixação continua acessível'], removidas: ['eixo central permanece livre'] },
      criteriosVisuais: { adicionadas: [], removidas: [] },
    });
    const legado = construirRevisao({ peca: 'fixture-intencao', descricao: base, vistas: vistas() });
    const legadoComNull = construirRevisao({ peca: 'fixture-intencao', descricao: { ...base, intencao: null }, vistas: vistas() });
    expect(legado.assinaturaModelo).toBe(legadoComNull.assinaturaModelo);
  });
});

