/* leitura-declarada-acervo.test.mjs — a leitura declarada conferida contra peças do acervo (fatia 2 do plano do cache por passo). As
 * peças cobrem as declarações que não são 'malha' (a que é 'malha' não diverge): a `subdivisao`, a `extrusao` e o `lathe`, que não leem
 * nada da malha que existia, o `friso`, que lê só a costura citada, e o `subtrair`, que lê só os vértices dos sólidos citados. A
 * conferência do acervo inteiro, peça por peça, é a do `levantar-leitura.mjs --conferir` do banco de provas do plano. */
import { describe, expect, it } from 'vitest';
import { importarReceita, receitaDoModulo } from '../../../tools/modelar/importar-receita.mjs';
import { resolverCaminhoReceita } from '../../../tools/modelar/resolver-caminho-receita.mjs';
import { REGISTRO_DA_RECEITA, entradaDaReceita } from '../../../src/autoria/executar-receita.js';
import { neutroCanonico, nucleo } from '../entrada.js';
import { LEITURA_DAS_OPERACOES } from './leitura-declarada.js';

const PECAS = ['braco-robotico/ombro', 'braco-robotico/antebraco', 'carrinho-de-mao/cacamba', 'empilhadeira/carcaca', 'sedan-chassi-e-lataria/frente-e-traseira'];
const executar = (e, opcoes = {}) => nucleo(e.PASSOS, e.PARAMS, e.TOPO, e.MATERIAIS, e.ESQUELETO, e.ALIASES, { registroOperacoes: REGISTRO_DA_RECEITA, ...opcoes });
const entradaDe = async (peca) => entradaDaReceita(receitaDoModulo(await importarReceita(resolverCaminhoReceita(peca))));

describe('a leitura declarada nas peças do acervo', () => {
  it('as peças cobrem toda declaração que não é malha', async () => {
    const usadas = new Set();
    for (const peca of PECAS) for (const [op] of (await entradaDe(peca)).PASSOS) usadas.add(op);
    const estreitas = Object.entries(LEITURA_DAS_OPERACOES).filter(([, d]) => d.V !== 'malha' || d.F !== 'malha').map(([nome]) => nome);
    expect(estreitas.filter((nome) => !usadas.has(nome))).toEqual([]);
  });

  for (const peca of PECAS) {
    it(`${peca}: o núcleo conferido não acha leitura fora do declarado`, async () => {
      const e = await entradaDe(peca);
      expect(() => executar(e, { leitura: 'conferido' })).not.toThrow();
    });
  }

  it('o registro de leitura não muda a malha da peça', async () => {
    const e = await entradaDe('braco-robotico/ombro');
    expect(JSON.stringify(neutroCanonico(executar(e, { leitura: 'conferido' })))).toBe(JSON.stringify(neutroCanonico(executar(e))));
  });
});
