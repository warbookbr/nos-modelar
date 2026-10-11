/* As perguntas de forma por componente e por família de objeto no brief do crítico do esboço: o campo `perguntas` do componente e
   do módulo, `plano.familia` com a condição por pergunta, o teto com recusa, e o brief que sem nenhuma delas é o de antes. */
import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { COMPONENTES } from '../componentes/index.js';
import { catalogoDe } from '../src/componentes.js';
import { lerPlano } from '../src/plano.js';
import { expandirEsboco } from '../src/expandir.js';
import { perguntasDoComponente, perguntasDoEsboco } from '../src/perguntas.js';
import { CRITERIOS } from '../../../procedural/criterios/index.js';
import { PERGUNTA_ABERTA, TETO_POR_COMPONENTE, TETO_POR_FAMILIA, linhasDasPerguntas, lerPerguntasDoComponente } from '../../../src/autoria/perguntas-do-critico.js';
import { PERGUNTAS_DO_CRITICO, PERGUNTAS_DO_OBJETO, briefDoObjeto } from '../../../tools/mecanifica/esboco.mjs';

const GUARDA_ROUPA = new URL('../../../docs/mecanifica/banco-de-provas/rodada-2026-10-08/guarda-roupa/guarda-roupa.esboco.json', import.meta.url);
const guardaRoupa = (familia = 'movel-de-caixa') => {
  const e = JSON.parse(readFileSync(GUARDA_ROUPA, 'utf8'));
  if (familia !== null) e.plano.familia = familia;
  return e;
};
/* o guarda-roupa sem as dobradiças: as formas do módulo `porta` que são o pino e as abas saem */
const semDobradicas = () => {
  const e = guardaRoupa();
  e.modulos.porta.formas = e.modulos.porta.formas.filter((f) => !/^(pino|abaPainel|abaPorta)\d/.test(f.id));
  return e;
};
const caixa = (id, centro) => ({ id, tipo: 'caixa', largura: 20, altura: 20, profundidade: 20, centro });

describe('as perguntas nos componentes do esboço', () => {
  it('toda pergunta de componente da biblioteca passa pelo validador: aberta, de forma, sem proporção, dentro do teto', () => {
    const comPerguntas = Object.entries(COMPONENTES).filter(([, c]) => c.perguntas !== undefined);
    expect(comPerguntas.length).toBeGreaterThan(0);
    for (const [nome, c] of comPerguntas) {
      expect(() => lerPerguntasDoComponente(c.perguntas, nome), nome).not.toThrow();
      expect(c.perguntas.length, nome).toBeLessThanOrEqual(TETO_POR_COMPONENTE);
    }
  });

  it('o componente sem `perguntas` devolve lista vazia, e o campo some do catálogo do módulo que não o declara', () => {
    expect(perguntasDoComponente({ x: {} }, 'x')).toEqual([]);
    expect(catalogoDe({ m: { formas: [caixa('a', [0, 0, 0])] } }).m.perguntas).toBeUndefined();
  });

  it('o módulo declara `perguntas` no mesmo formato, e o campo vai para o catálogo', () => {
    const m = { formas: [caixa('a', [0, 0, 0])], perguntas: ['De que lado da tampa fica a dobradiça?'] };
    expect(catalogoDe({ m }).m.perguntas).toEqual(['De que lado da tampa fica a dobradiça?']);
  });

  it('o teto recusa o excesso por componente, com a mensagem dizendo o teto', () => {
    const muitas = Array.from({ length: TETO_POR_COMPONENTE + 1 }, (_, i) => `De que lado fica a peça ${i}?`);
    expect(() => lerPerguntasDoComponente(muitas, 'roda')).toThrow(new RegExp(`no máximo ${TETO_POR_COMPONENTE} perguntas por componente`));
    expect(() => catalogoDe({ m: { formas: [caixa('a', [0, 0, 0])], perguntas: muitas } })).toThrow(/no máximo \d+ perguntas por componente/);
  });

  it('recusa a pergunta fechada, a de proporção e a repetida', () => {
    expect(() => lerPerguntasDoComponente(['A dobradiça está por dentro?'], 'c')).toThrow(/pergunta aberta/);
    expect(() => lerPerguntasDoComponente(['Como a altura se compara à largura?'], 'c')).toThrow(/proporção/);
    expect(() => lerPerguntasDoComponente(['De que lado fica a peça?', 'De que lado fica a peça?'], 'c')).toThrow(/ainda não foi feita/);
  });
});

describe('as perguntas por família de objeto', () => {
  it('cada arquivo respeita o teto e dá a toda pergunta uma condição', () => {
    for (const c of Object.values(CRITERIOS)) {
      expect(c.perguntas.length, c.id).toBeLessThanOrEqual(TETO_POR_FAMILIA);
      for (const p of c.perguntas) expect(p.condicao.componente?.length || p.condicao.forma?.length, p.texto).toBeGreaterThan(0);
    }
  });

  it('o móvel de caixa tem a pergunta que pega a dobradiça do lado de fora da porta', () => {
    const dobradica = CRITERIOS['movel-de-caixa'].perguntas.find((p) => /dobradiça/.test(p.texto));
    expect(dobradica).toBeDefined();
    expect(dobradica.texto).toMatch(/Onde fica cada dobradiça com a porta fechada/);
    expect(dobradica.texto).toMatch(/escondida atrás da porta .* ou à vista na face externa/);
  });

  it('`plano.familia` é lido, e a família desconhecida é recusada com o "quis dizer" e as que existem', () => {
    expect(lerPlano({ texto: 'x', familia: 'veiculo' }).familia).toBe('veiculo');
    expect(lerPlano({ texto: 'x' }).familia).toBeUndefined();
    expect(() => lerPlano({ texto: 'x', familia: 'movel-caixa' })).toThrow(/assento, movel-de-caixa, veiculo.*quis dizer/);
    expect(() => lerPlano({ texto: 'x', familia: 3 })).toThrow(/plano\.familia/);
  });
});

describe('o brief do esboço do guarda-roupa', () => {
  it('traz a pergunta da dobradiça, das portas, das gavetas e das prateleiras com `plano.familia: movel-de-caixa`', () => {
    const { familia, todas } = perguntasDoEsboco(guardaRoupa());
    expect(familia.some((p) => /dobradiça/.test(p) && /atrás da porta/.test(p))).toBe(true);
    expect(familia.some((p) => /gaveta/.test(p))).toBe(true);
    expect(familia.some((p) => /prateleira/.test(p))).toBe(true);
    expect(todas).toEqual(expect.arrayContaining(familia));
  });

  it('a condição exclui a pergunta da dobradiça quando o esboço não tem dobradiça, e mantém as outras', () => {
    const { familia } = perguntasDoEsboco(semDobradicas());
    expect(familia.some((p) => /dobradiça/.test(p))).toBe(false);
    expect(familia.some((p) => /gaveta/.test(p))).toBe(true);
  });

  it('a condição acha a dobradiça pelo componente da biblioteca, e a pergunta de roda só entra no esboço com roda', () => {
    const comRoda = { plano: { familia: 'veiculo' }, opcoes: [{ titulo: 'T', formas: [caixa('corpo', [0, 100, 0]), { id: 'rodaT', usa: 'roda', centro: [0, 50, 0] }] }] };
    const semRoda = { plano: { familia: 'veiculo' }, opcoes: [{ titulo: 'T', formas: [caixa('corpo', [0, 100, 0])] }] };
    expect(perguntasDoEsboco(comRoda).familia.some((p) => /cada roda/.test(p))).toBe(true);
    expect(perguntasDoEsboco(semRoda).familia).toEqual([]);
    const dobradica = { plano: { familia: 'movel-de-caixa' }, opcoes: [{ titulo: 'T', formas: [caixa('corpo', [0, 0, 0]), { id: 'h', usa: 'dobradica', centro: [0, 0, 100] }] }] };
    expect(perguntasDoEsboco(dobradica).familia.some((p) => /dobradiça/.test(p))).toBe(true);
  });

  it('as perguntas do componente entram uma vez por componente, na ordem de aparição, antes das da família', () => {
    const e = { plano: { familia: 'veiculo' }, opcoes: [{ titulo: 'T', formas: [caixa('corpo', [0, 100, 0]), { id: 'rodaT', usa: 'roda', centro: [0, 50, 0] }, { id: 'rodaF', usa: 'roda', centro: [200, 50, 0] }] }] };
    const r = perguntasDoEsboco(e);
    expect(r.componente).toEqual(COMPONENTES.roda.perguntas);
    expect(r.todas.slice(0, r.componente.length)).toEqual(r.componente);
    expect(new Set(r.todas).size).toBe(r.todas.length);
  });

  it('o trecho de uma unidade só traz as perguntas dos componentes e das formas dela', () => {
    const e = guardaRoupa();
    const todas = expandirEsboco(e).opcoes[0].formas.map((f) => f.id);
    const soCorpo = new Set(todas.filter((id) => !id.includes('.')));
    const soPortas = new Set(todas.filter((id) => id.startsWith('portaE.') || id.startsWith('portaD.')));
    expect(perguntasDoEsboco(e, { formas: soCorpo }).familia.some((p) => /dobradiça/.test(p))).toBe(false);
    expect(perguntasDoEsboco(e, { formas: soPortas }).familia.some((p) => /dobradiça/.test(p))).toBe(true);
  });

  it('recusa o componente do módulo com `perguntas` mal formadas, dizendo qual', () => {
    const e = guardaRoupa();
    e.modulos.porta.perguntas = ['A dobradiça está por dentro?'];
    expect(() => perguntasDoEsboco(e)).toThrow(/modulos\.porta\.perguntas/);
  });
});

describe('o brief sem perguntas específicas é o de antes, byte a byte', () => {
  it('sem específicas, as linhas são exatamente as das cinco fixas numeradas, sem pergunta aberta', () => {
    const antes = (fixas) => fixas.map((p, i) => `  ${i + 1}. ${p}`);
    expect(linhasDasPerguntas(PERGUNTAS_DO_CRITICO, [])).toEqual(antes(PERGUNTAS_DO_CRITICO));
    expect(linhasDasPerguntas(PERGUNTAS_DO_OBJETO, [])).toEqual(antes(PERGUNTAS_DO_OBJETO));
  });

  it('com específicas, as fixas ficam como estão, as específicas vêm depois e a pergunta aberta fecha a lista', () => {
    const linhas = linhasDasPerguntas(PERGUNTAS_DO_OBJETO, ['De que lado fica a peça?']);
    expect(linhas.slice(0, PERGUNTAS_DO_OBJETO.length)).toEqual(linhasDasPerguntas(PERGUNTAS_DO_OBJETO, []));
    expect(linhas[PERGUNTAS_DO_OBJETO.length]).toBe(`  ${PERGUNTAS_DO_OBJETO.length + 1}. De que lado fica a peça?`);
    expect(linhas.at(-1)).toBe(`  ${PERGUNTAS_DO_OBJETO.length + 2}. ${PERGUNTA_ABERTA}`);
  });

  it('o esboço sem `plano.familia` e sem componente com `perguntas` não ganha pergunta nenhuma', () => {
    const e = guardaRoupa(null);
    expect(perguntasDoEsboco(e)).toEqual({ componente: [], familia: [], todas: [] });
    expect(perguntasDoEsboco({ opcoes: [{ titulo: 'T', formas: [caixa('a', [0, 0, 0])] }] }).todas).toEqual([]);
  });

  it('o brief do objeto do guarda-roupa: sem `plano.familia` termina nas cinco fixas; com ela acrescenta a da dobradiça antes de fechar', async () => {
    const pasta = mkdtempSync(join(tmpdir(), 'perguntas-'));
    const sem = join(pasta, 'sem.esboco.json');
    const com = join(pasta, 'com.esboco.json');
    writeFileSync(sem, JSON.stringify(guardaRoupa(null)));
    writeFileSync(com, JSON.stringify(guardaRoupa()));
    const fixas = linhasDasPerguntas(PERGUNTAS_DO_OBJETO, []).join('\n');
    const briefSem = await briefDoObjeto(sem, { saida: join(pasta, 's'), largura: 400 });
    expect(briefSem.texto.endsWith(`Responda, olhando só as imagens:\n${fixas}\n--- fim do brief ---\n`)).toBe(true);
    const briefCom = await briefDoObjeto(com, { saida: join(pasta, 'c'), largura: 400 });
    const depois = briefCom.texto.slice(briefCom.texto.indexOf('Responda, olhando só as imagens:'));
    expect(depois.startsWith(`Responda, olhando só as imagens:\n${fixas}\n`)).toBe(true);
    expect(depois).toMatch(/\n {2}6\. Onde fica cada dobradiça com a porta fechada/);
    expect(depois.endsWith(`${PERGUNTA_ABERTA}\n--- fim do brief ---\n`)).toBe(true);
  }, 180000);
});
