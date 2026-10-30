/* lataria.test.js — quando uma peça é de lataria, e quais partes dela são a chapa.
 *
 * A peça de lataria leva a luz rasante e a curvatura da lataria no pacote do crítico (decisão da pessoa em 2026-10-30). Aqui se
 * prova o reconhecimento sem o Blender: pelo passo `subdivisao` dos PASSOS, pela declaração validada de `PLANO.lataria`, e as partes
 * de lataria pela procedência da malha executada. */
import { describe, expect, it } from 'vitest';
import { executarReceita } from './executar-receita.js';
import { latariaDaReceita, normalizarLataria, partesDaLataria } from './lataria.js';
import { normalizarPlanoDeModelagem } from './plano-de-modelagem.js';
import provaDeLataria from '../../tools/fixtures/lataria-de-prova/receita.js';

const PLANO = {
  objeto: 'chapa curva com nervura, para provar a lataria',
  referencias: ['referencias/alvo.md'],
  escala: { medida: 'largura da chapa', milimetros: 800 },
  partes: [
    { nome: 'chapa', forma: 'chapa de 2 mm de duas curvaturas e um vão', tecnica: 'subdivisao' },
    { nome: 'nervura', forma: 'nervura retangular de 8 por 5 mm na chapa', tecnica: 'friso' },
  ],
  criteriosDeReprovacao: ['a chapa tem amassado que a forma não pede'],
};
const CUBO = [['cubo', { origemId: 1, larg: 1, alt: 1, prof: 1 }], ['parte', { nome: 'chapa', sel: { origem: { op: 'cubo', id: 1 } } }]];

describe('o reconhecimento da peça de lataria', () => {
  it('a peça com passo subdivisao é de lataria, e a sem ele não é', () => {
    const comSubdivisao = latariaDaReceita(provaDeLataria, normalizarPlanoDeModelagem(provaDeLataria.PLANO));
    expect(comSubdivisao).toEqual({ lataria: true, porque: 'a receita tem superfície livre por subdivisão (PASSOS[0])', partes: null });
    expect(latariaDaReceita({ PASSOS: CUBO }, null)).toMatchObject({ lataria: false });
    /* o passo também vale escrito como objeto, e a receita sem PASSOS (só composições) não é de lataria sem declarar */
    expect(latariaDaReceita({ PASSOS: [{ op: 'subdivisao' }] }, null).lataria).toBe(true);
    expect(latariaDaReceita({ CHAMADAS_COMPOSICOES: [] }, null).lataria).toBe(false);
  });

  it('a declaração faz de lataria a peça de outra técnica, com as partes dela, e dispensa a de subdivisão que não é chapa', () => {
    const declarada = normalizarPlanoDeModelagem({ ...PLANO, lataria: { partes: ['chapa'] } });
    expect(declarada.lataria).toEqual({ partes: ['chapa'] });
    expect(latariaDaReceita({ PASSOS: CUBO }, declarada)).toEqual({ lataria: true, porque: 'PLANO.lataria declara as partes chapa', partes: ['chapa'] });
    const dispensada = normalizarPlanoDeModelagem({ ...PLANO, lataria: { dispensa: 'é um estofado de espuma, e não chapa' } });
    expect(latariaDaReceita(provaDeLataria, dispensada)).toMatchObject({ lataria: false, porque: 'PLANO.lataria dispensa: é um estofado de espuma, e não chapa' });
    /* plano sem a opção sai como antes, sem o campo */
    expect(normalizarPlanoDeModelagem(PLANO)).not.toHaveProperty('lataria');
  });

  it('a declaração é validada: parte fora do plano, as duas chaves, chave alheia e dispensa sem motivo são recusadas', () => {
    const nomes = ['chapa', 'nervura'];
    expect(() => normalizarLataria({ partes: ['teto'] }, nomes)).toThrow(/'lataria.partes' cita 'teto', que não está em 'partes' do plano \(chapa, nervura\)/);
    expect(() => normalizarLataria({ partes: ['chapa'], dispensa: 'um motivo comprido o bastante' }, nomes)).toThrow(/'partes' ou 'dispensa', uma das duas/);
    expect(() => normalizarLataria({ borda: ['nervura'] }, nomes)).toThrow(/'lataria.borda' não é permitido/);
    expect(() => normalizarLataria({ dispensa: 'não' }, nomes)).toThrow(/pelo menos 15 caracteres/);
    expect(() => normalizarLataria({ partes: [] }, nomes)).toThrow(/lista não vazia/);
    expect(() => normalizarLataria(true, nomes)).toThrow(/precisa ser \{ partes/);
    expect(() => normalizarPlanoDeModelagem({ ...PLANO, lataria: { partes: ['teto'] } })).toThrow(/^PLANO: 'lataria.partes' cita 'teto'/);
  });

  it('as partes de lataria são as que têm face nascida de passo subdivisao: a chapa sim, a nervura do friso não', () => {
    const { neutro } = executarReceita(provaDeLataria);
    expect(Object.keys(neutro.partes).sort()).toEqual(['chapa', 'nervura']);
    expect(partesDaLataria(neutro)).toEqual(['chapa']);
    expect(partesDaLataria(executarReceita({ PASSOS: CUBO }).neutro)).toEqual([]);
  });
});
