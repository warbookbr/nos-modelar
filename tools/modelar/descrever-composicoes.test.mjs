/* descrever-composicoes.test.mjs — a porta de avisos das operações de composição no `descrever`: o que o resultado da operação traz e o que a conferência dela acha
   saem num bloco que não reprova, e a receita sem `COMPOSICOES` sai sem o bloco. */
import { describe, expect, it } from 'vitest';
import { avisosDasComposicoes, CONFERENCIAS } from './avisos-de-composicao.mjs';
import { descreverPecaReutilizavel } from './descrever-peca.mjs';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { furoPassante } from '../../procedural/nucleo/furo-passante.js';
import perdido from '../fixtures/corpo-por-fatias/ponto-perdido/receita.js';
import limpa from '../fixtures/acervo/peca-de-prova/receita.js';

const SECAO = /AVISO\(S\) DE OPERAÇÃO DE COMPOSIÇÃO \(aviso; não reprova\)/;

describe('os avisos das operações de composição no descrever', () => {
  it('o ponto perdido do corpo por fatias sai no bloco, com a operação e a parte, sem reprovar', async () => {
    const r = await descreverPecaReutilizavel({ peca: 'tools/fixtures/corpo-por-fatias/ponto-perdido/receita', modulo: perdido, semVeredito: true });
    expect(r.ok).toBe(true);
    expect(r.stdout).toMatch(SECAO);
    expect(r.stdout).toMatch(/corpoPorFatias \(parte corpo\): na fatia 'f0' \(em 0 mm\), \d+ de 40 pontos dados ficam a mais de 0,1 mm da volta reamostrada em 8 pontos/);
    expect(r.stderr).toMatch(/AVISO: \d+ aviso\(s\) de operação de composição/);
    expect(r.resultado.avisosDeComposicao.length).toBeGreaterThanOrEqual(2);
  });

  it('a peça sem COMPOSICOES sai sem o bloco', async () => {
    const r = await descreverPecaReutilizavel({ peca: 'tools/fixtures/acervo/peca-de-prova/receita', modulo: limpa, semVeredito: true });
    expect(r.stdout).not.toMatch(/OPERAÇÃO DE COMPOSIÇÃO/);
    expect(r.resultado.avisosDeComposicao).toEqual([]);
  });

  it('os avisos da gaiola (amostragemDesigual) no resultado entram pelo mesmo caminho, na ordem do resultado', () => {
    const { neutro } = executarReceita(limpa);
    const r = avisosDasComposicoes(neutro, { COMPOSICOES: [{ operacao: 'x', resultado: { avisos: [{ ref: 'amostragemDesigual', texto: 'desigual' }, 'solto'] } }] });
    expect(r.linhas).toEqual(['x: desigual', 'x: solto']);
  });

  it('FUROS_PASSANTES passa pela mesma porta e a conferência do furo vira aviso', () => {
    const passos = [['cubo', { origemId: 1, larg: 0.1, alt: 0.1, prof: 0.1, em: [0, 0, 0] }]];
    const furo = furoPassante({ solido: { origem: { op: 'cubo', id: 1 } }, posicao: [0, 50, 0], direcao: 'y', raio: 5, comprimento: 20, ids: { cilindro: 2, subtrair: 3 } });
    const { neutro } = executarReceita({ PASSOS: [...passos, ...furo.passos], PARAMS: {}, TOPO: {}, MATERIAIS: {}, ALIASES: furo.aliases });
    expect(typeof CONFERENCIAS.furoPassante).toBe('function');
    const r = avisosDasComposicoes(neutro, { FUROS_PASSANTES: [{ furo }] });
    const s = avisosDasComposicoes(neutro, { COMPOSICOES: [{ operacao: 'furoPassante', resultado: furo }] });
    expect(r.total).toBeGreaterThan(0);
    expect(r.linhas.every((l) => l.startsWith('furoPassante: '))).toBe(true);
    expect(s.linhas).toEqual(r.linhas);
  });

  it('entrada malformada vira aviso que diz o esperado, e não quebra o descrever', () => {
    const r = avisosDasComposicoes({}, { COMPOSICOES: [{ operacao: 'x' }, 'texto'] });
    expect(r.linhas[0]).toMatch(/COMPOSICOES\[0\] é \{ operacao, resultado, parte\? \}/);
    expect(r.linhas.length).toBe(2);
    expect(avisosDasComposicoes({}, { COMPOSICOES: 5 }).linhas[0]).toMatch(/COMPOSICOES é a lista/);
    expect(avisosDasComposicoes({}, {}).total).toBe(0);
  });
});
