/* A expectativa da montagem passou a JULGAR: par que se toque fora da lista sai
   em `naoDeclarados`. Estes testes montam uma montagem sintética de dois cubos,
   porque o que está sob prova é a leitura da declaração, não a geometria — essa
   já é provada em quatro suítes de montagem real e em `contatos-da-peca`. */
import { describe, expect, it } from 'vitest';
import { auditarIntersecoesMontagem } from './auditar-intersecoes-montagem.js';
import { executarReceita } from './executar-receita.js';
import { MINIMO_DO_MOTIVO } from './contatos-da-peca.js';

const cubo = (origemId, em, lado = 1) => ({
  meta: { nome: `cubo-${origemId}` },
  PASSOS: [
    ['cubo', { origemId, larg: lado, alt: lado, prof: lado, em }],
    ['parte', { nome: `p${origemId}`, sel: { origem: { op: 'cubo', id: origemId } } }],
    ['solido', { sel: { grupo: `p${origemId}` } }],
  ],
});

/* O segundo cubo é menor para produzir contenção por vértice, que é o caminho
   mais direto. O caso de lados iguais tem teste próprio abaixo. */
function montagem({ separacao, expectativas, lado = 0.4 }) {
  const a = executarReceita(cubo(1, [0, 0, 0])).neutro;
  const b = executarReceita(cubo(2, [separacao, 0, 0], lado)).neutro;
  return {
    instancias: [
      { caminho: ['a'], alvo: { tipo: 'peca' }, definicao: { neutro: a }, poseMundo: null },
      { caminho: ['b'], alvo: { tipo: 'peca' }, definicao: { neutro: b }, poseMundo: null },
    ],
    auditoriaIntersecoes: { toleranciaNumerica: 1e-9, expectativas },
  };
}

const DECLARADO = [{
  id: 'e1', a: { caminho: ['a'] }, b: { caminho: ['b'] },
  motivo: 'as duas peças se encaixam de propósito nesta montagem',
}];

describe('a declaração da montagem é contrato, não anotação', () => {
  it('par em contato SEM declaração sai em naoDeclarados', () => {
    const r = auditarIntersecoesMontagem(montagem({ separacao: 0.5, expectativas: [] }));
    expect(r.naoDeclarados).toHaveLength(1);
    expect(r.naoDeclarados[0].estado).toBe('interpenetram');
    expect(r.naoDeclarados[0].metodo).toBe('contencao-e-malha');
  });

  /* O CASO QUE O CENTROIDE CONSERTOU. Com lados iguais e eixos alinhados, todo
     vértice de um cubo cai exatamente na superfície do outro, nenhum fica
     estritamente dentro, e metade de volume sobreposto saía como `encostam`. A
     amostragem passou a incluir o centroide de cada triângulo, e o estado
     voltou a corresponder ao que a geometria mostra. */
  it('cubos de lado igual meio sobrepostos são acusados como interpenetram', () => {
    const r = auditarIntersecoesMontagem(montagem({ separacao: 0.5, expectativas: [], lado: 1 }));
    expect(r.naoDeclarados).toHaveLength(1);
    expect(r.naoDeclarados[0].estado).toBe('interpenetram');
    expect(r.naoDeclarados[0].metodo).toBe('contencao-e-malha');
  });

  /* A amostragem nova não pode inventar contato onde não há: cubos iguais que
     apenas se encostam face a face continuam `encostam`. */
  it('cubos de lado igual que só se encostam continuam encostam', () => {
    const r = auditarIntersecoesMontagem(montagem({ separacao: 1, expectativas: [], lado: 1 }));
    expect(r.naoDeclarados).toHaveLength(1);
    expect(r.naoDeclarados[0].estado).toBe('encostam');
  });

  it('o mesmo par COM declaração não sai em naoDeclarados', () => {
    const r = auditarIntersecoesMontagem(montagem({ separacao: 0.5, expectativas: DECLARADO }));
    expect(r.naoDeclarados).toEqual([]);
    expect(r.declaradosSemContato).toEqual([]);
  });

  it('peças separadas não geram acusação nenhuma', () => {
    const r = auditarIntersecoesMontagem(montagem({ separacao: 5, expectativas: [] }));
    expect(r.naoDeclarados).toEqual([]);
  });

  /* Declaração que descreve o que não existe não reprova, mas aparece: é a
     primeira forma de a lista virar ficção. */
  it('declaração sem contato correspondente aparece sem reprovar', () => {
    const r = auditarIntersecoesMontagem(montagem({ separacao: 5, expectativas: DECLARADO }));
    expect(r.naoDeclarados).toEqual([]);
    expect(r.declaradosSemContato).toHaveLength(1);
    expect(r.declaradosSemContato[0].id).toBe('e1');
  });
});

describe('declaração morta falha em vez de sumir', () => {
  it('caminho que a montagem não tem falha nomeando os disponíveis', () => {
    const alvo = () => auditarIntersecoesMontagem(montagem({
      separacao: 0.5,
      expectativas: [{ ...DECLARADO[0], b: { caminho: ['inexistente'] } }],
    }));
    expect(alvo).toThrow(/não tem a peça/);
    expect(alvo).toThrow(/\["a"\], \["b"\]/);
  });

  it('motivo curto falha dizendo o tamanho mínimo', () => {
    expect(() => auditarIntersecoesMontagem(montagem({
      separacao: 0.5,
      expectativas: [{ ...DECLARADO[0], motivo: 'ok' }],
    }))).toThrow(new RegExp(`${MINIMO_DO_MOTIVO} caracteres`));
  });

  it('o mesmo par declarado duas vezes falha', () => {
    expect(() => auditarIntersecoesMontagem(montagem({
      separacao: 0.5,
      expectativas: [DECLARADO[0], { ...DECLARADO[0], id: 'e2' }],
    }))).toThrow(/já foi declarado/);
  });
});
