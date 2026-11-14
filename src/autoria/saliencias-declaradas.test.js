/* saliencias-declaradas.test.js — `PLANO.saliencias`: o normalizador recusa o que o campo não admite, dizendo o que recebeu, o que esperava e o comando que mostra o
 * calombo medido, e o plano sem o campo mantém a forma canônica de antes. */
import { describe, expect, it } from 'vitest';
import { normalizarSaliencias, salienciasDaReceita } from './saliencias-declaradas.js';
import { normalizarPlanoDeModelagem } from './plano-de-modelagem.js';
import { receitaDeProva } from '../../tools/fixtures/saliencia-declarada/receita.js';

const MOTIVO = 'lombada desenhada de dupla curvatura, aprovada como forma';
const salienciaOk = { regiao: { min: [0, 0, 0], max: [100, 70, 100] }, sentido: 'fora', amplitudeMm: 60, motivo: MOTIVO };
const recusa = (valor) => { try { normalizarSaliencias(valor); } catch (erro) { return erro.message; } return null; };

describe('PLANO.saliencias: o normalizador', () => {
  it('aceita a declaração completa e devolve a forma canônica ordenada pela região', () => {
    const outra = { ...salienciaOk, regiao: { min: [-100, 0, 0], max: [-10, 70, 100] }, sentido: 'dentro' };
    expect(normalizarSaliencias([salienciaOk, outra])).toEqual([outra, salienciaOk]);
  });

  it('recusa lista vazia, região sem volume, sentido, amplitude, motivo, chave alheia e item repetido, sempre com recebido, esperado e o comando', () => {
    expect(recusa([])).toMatch(/'saliencias' recebeu 0 itens; esperado lista de 1 a 32 itens/);
    expect(recusa([{ ...salienciaOk, regiao: { min: [0, 0, 0], max: [0, 5, 5] } }])).toMatch(/'saliencias\[0\]\.regiao' recebeu min \[0,0,0\] e max \[0,5,5\]; esperado min menor que max/);
    expect(recusa([{ ...salienciaOk, regiao: { min: [0, 0], max: [1, 1, 1] } }])).toMatch(/regiao\.min' recebeu \[0,0\]; esperado \[x, y, z\]/);
    expect(recusa([{ ...salienciaOk, sentido: 'para fora' }])).toMatch(/sentido' recebeu "para fora"; esperado um de fora, dentro/);
    expect(recusa([{ ...salienciaOk, amplitudeMm: 0 }])).toMatch(/amplitudeMm' recebeu 0; esperado número finito maior que 0 e até 1000 mm/);
    expect(recusa([{ ...salienciaOk, amplitudeMm: '60' }])).toMatch(/amplitudeMm' recebeu "60"/);
    expect(recusa([{ ...salienciaOk, motivo: 'ok' }])).toMatch(/motivo' recebeu "ok"; esperado texto de pelo menos 15 caracteres/);
    expect(recusa([{ ...salienciaOk, parte: 'chapa' }])).toMatch(/saliencias\[0\]\.parte' recebeu a chave; esperado uma de regiao, sentido, amplitudeMm, motivo/);
    expect(recusa([salienciaOk, salienciaOk])).toMatch(/recebeu item repetido/);
    expect(recusa([{ ...salienciaOk, motivo: '/home/pessoa/notas.txt aprovado de propósito' }])).toMatch(/UUID, caminho absoluto/);
    for (const texto of [recusa([]), recusa([{ ...salienciaOk, sentido: 'x' }])]) expect(texto).toMatch(/npm run ondulacao -- <peça>/);
  });

  it('o plano sem o campo mantém a forma canônica de antes, e com ele o campo entra no plano normalizado', () => {
    const { PLANO } = receitaDeProva({ declarar: false });
    expect('saliencias' in normalizarPlanoDeModelagem(PLANO)).toBe(false);
    expect(salienciasDaReceita({ PLANO })).toEqual([]);
    const com = receitaDeProva({ declarar: true }).PLANO;
    expect(normalizarPlanoDeModelagem(com).saliencias).toEqual(salienciasDaReceita({ PLANO: com }));
    expect(() => normalizarPlanoDeModelagem({ ...PLANO, saliencias: [{ ...salienciaOk, sentido: 'x' }] })).toThrow(/saliencias\[0\]\.sentido/);
  });
});
