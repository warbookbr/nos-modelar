/* perguntas-da-peca.test.mjs — o bloco de perguntas de forma que o brief do crítico da peça traz, lido do PLANO da receita. */
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PERGUNTA_ABERTA } from '../../src/autoria/perguntas-do-critico.js';
import { blocoDasPerguntas, perguntasDaPecaArquivo } from './perguntas-da-peca.mjs';

function receitaComPlano(extra) {
  const raiz = mkdtempSync(join(tmpdir(), 'perguntas-peca-'));
  const pasta = join(raiz, 'procedural/pecas/roupeiro-de-prova');
  mkdirSync(pasta, { recursive: true });
  const plano = {
    objeto: 'roupeiro de duas portas de MDF, de 1600 mm de largura',
    referencias: ['referencias/roupeiro.png'],
    escala: { medida: 'altura do roupeiro', milimetros: 2200 },
    partes: [
      { nome: 'corpo', forma: 'caixa de parede uniforme aberta na frente', tecnica: 'casca' },
      { nome: 'dobradicas', forma: 'três dobradiças por porta na borda que gira', tecnica: 'articula' },
    ],
    criteriosDeReprovacao: ['dobradiça aparecendo por fora da lateral do corpo'],
    ...extra,
  };
  writeFileSync(join(pasta, 'receita.js'), `export const PASSOS = [];\nexport const PLANO = ${JSON.stringify(plano)};\n`);
  return raiz;
}

describe('perguntas da peça', () => {
  it('o PLANO sem `familia` nem `familiaProcedural` não tem pergunta específica, e o bloco é vazio', async () => {
    const r = await perguntasDaPecaArquivo('roupeiro-de-prova', { raiz: receitaComPlano({}) });
    expect(r.todas).toEqual([]);
    expect(blocoDasPerguntas(r.todas)).toBe('');
  });

  it('com `familia` o bloco traz a pergunta da dobradiça e fecha com a pergunta aberta', async () => {
    const r = await perguntasDaPecaArquivo('roupeiro-de-prova', { raiz: receitaComPlano({ familia: 'movel-de-caixa' }) });
    const bloco = blocoDasPerguntas(r.todas);
    expect(bloco).toMatch(/\n {2}1\. De que lado de cada porta fica cada dobradiça/);
    expect(bloco.endsWith(`${PERGUNTA_ABERTA}`)).toBe(true);
    expect(bloco.split('\n')[0]).toMatch(/^Perguntas de forma deste objeto/);
  });

  it('com `familiaProcedural` o bloco começa pelas `perguntas` do familia.json, e a família desconhecida é recusada', async () => {
    const r = await perguntasDaPecaArquivo('roupeiro-de-prova', { raiz: receitaComPlano({ familia: 'movel-de-caixa', familiaProcedural: 'movel-de-caixa' }) });
    expect(r.componente.length).toBeGreaterThan(0);
    expect(r.todas.slice(0, r.componente.length)).toEqual(r.componente);
    await expect(perguntasDaPecaArquivo('roupeiro-de-prova', { raiz: receitaComPlano({ familiaProcedural: 'inexistente' }) })).rejects.toThrow(/não é uma família registrada \(.*movel-de-caixa/);
  });

  it('o PLANO com `familia` desconhecida é recusado com as que existem', async () => {
    await expect(perguntasDaPecaArquivo('roupeiro-de-prova', { raiz: receitaComPlano({ familia: 'cofre' }) })).rejects.toThrow(/assento, movel-de-caixa, veiculo/);
  });
});
