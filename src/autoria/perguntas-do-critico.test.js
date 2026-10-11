/* perguntas-do-critico.test.js — o validador das perguntas de forma, o arquivo de critérios por família de objeto com a condição por
   pergunta, o teto com recusa e as perguntas da peça (PLANO.familia e PLANO.familiaProcedural). */
import { describe, expect, it } from 'vitest';
import {
  ErroDePerguntas, FORMATO_CRITERIOS, PERGUNTA_ABERTA, TETO_POR_COMPONENTE, TETO_POR_FAMILIA,
  casaNome, condicaoVale, juntarPerguntas, lerCriterios, lerPergunta, linhasDasPerguntas, perguntasDaFamiliaDeObjeto, perguntasDaPeca,
} from './perguntas-do-critico.js';
import { CRITERIOS, FAMILIAS_DE_OBJETO, criteriosDe } from '../../procedural/criterios/index.js';
import { FAMILIAS } from '../../procedural/familias/index.js';
import { normalizarPlanoDeModelagem } from './plano-de-modelagem.js';

const criterios = (mudar = () => {}) => {
  const c = { formato: FORMATO_CRITERIOS, id: 'cofre', cobre: ['cofre'], perguntas: [{ texto: 'De que lado fica a porta?', condicao: { forma: ['porta*'] } }] };
  mudar(c);
  return c;
};
const recusa = (fn) => { try { fn(); } catch (e) { expect(e).toBeInstanceOf(ErroDePerguntas); return e; } throw new Error('devia recusar'); };

describe('a pergunta de forma', () => {
  it('aceita a pergunta aberta de forma e a limpa', () => {
    expect(lerPergunta('  De que lado   fica a dobradiça? ', 'x')).toBe('De que lado fica a dobradiça?');
    expect(lerPergunta('Vistas de frente, em que linha ficam as três peças?', 'x')).toContain('em que linha');
    expect(lerPergunta('Preso a quê, o apoio traseiro: onde ele encosta?', 'x')).toContain('onde');
  });

  it('recusa a pergunta que se responde com sim ou não, a que começa por verbo e a sem interrogação', () => {
    expect(recusa(() => lerPergunta('A dobradiça está por dentro?', 'x')).aceito).toMatch(/sim ou não/);
    expect(recusa(() => lerPergunta('Está a porta presa onde deve?', 'x')).aceito).toMatch(/sem começar por verbo/);
    expect(recusa(() => lerPergunta('De que lado fica a porta', 'x')).aceito).toMatch(/terminada em "\?"/);
    expect(recusa(() => lerPergunta('', 'x')).aceito).toMatch(/texto com a pergunta/);
  });

  it('recusa a pergunta de proporção, que vai para o --medidas', () => {
    for (const texto of ['Como a altura se compara à largura?', 'Qual a proporção entre a altura e o comprimento?', 'O que é mais alto que o encosto?', 'Qual a razão entre o tampo e a base?']) {
      expect(recusa(() => lerPergunta(texto, 'x')).aceito, texto).toMatch(/--medidas/);
    }
  });
});

describe('o arquivo de critérios por família de objeto', () => {
  it('lê o arquivo válido, congelado, com a condição de cada pergunta', () => {
    const lido = lerCriterios(criterios());
    expect(Object.isFrozen(lido)).toBe(true);
    expect(lido.perguntas[0].condicao).toEqual({ forma: ['porta*'] });
  });

  it('o teto por família recusa o excesso com a mensagem dizendo o teto, e aceita a família no teto', () => {
    const n = (k) => Array.from({ length: k }, (_, i) => ({ texto: `De que lado fica a peça ${i}?`, condicao: { forma: [`p${i}`] } }));
    const erro = recusa(() => lerCriterios(criterios((c) => { c.perguntas = n(TETO_POR_FAMILIA + 1); })));
    expect(erro.message).toMatch(new RegExp(`no máximo ${TETO_POR_FAMILIA} perguntas por família de objeto`));
    expect(() => lerCriterios(criterios((c) => { c.perguntas = n(TETO_POR_FAMILIA); }))).not.toThrow();
  });

  it('recusa a pergunta sem condição, a condição vazia ou com campo desconhecido, e a pergunta repetida', () => {
    expect(recusa(() => lerCriterios(criterios((c) => { delete c.perguntas[0].condicao; }))).aceito).toMatch(/precisa existir no objeto/);
    expect(recusa(() => lerCriterios(criterios((c) => { c.perguntas[0].condicao = {}; }))).aceito).toMatch(/ao menos um de "componente" e "forma"/);
    expect(recusa(() => lerCriterios(criterios((c) => { c.perguntas[0].condicao = { peca: ['x'] }; }))).aceito).toMatch(/campo conhecido: componente, forma/);
    expect(recusa(() => lerCriterios(criterios((c) => { c.perguntas.push({ ...c.perguntas[0] }); }))).aceito).toMatch(/ainda não foi feita/);
    expect(recusa(() => lerCriterios(criterios((c) => { c.formato = 'outro'; }))).onde).toMatch(/formato/);
    expect(recusa(() => lerCriterios(criterios((c) => { c.extra = 1; }))).aceito).toMatch(/campo conhecido/);
  });

  it('a condição vale quando o componente ou a forma citada existe, com padrão, sem distinguir maiúscula nem acento', () => {
    expect(casaNome('*caçamba*', 'Cacamba1')).toBe(true);
    expect(casaNome('porta*', 'portaE.pino1')).toBe(true);
    expect(casaNome('pino', 'portaE.pino1')).toBe(false);
    const c = { componente: ['dobradica'], forma: ['*pino*'] };
    expect(condicaoVale(c, { componentes: ['dobradica'], formas: [] })).toBe(true);
    expect(condicaoVale(c, { componentes: [], formas: ['portaE.pino1'] })).toBe(true);
    expect(condicaoVale(c, { componentes: ['porta'], formas: ['portaE.porta'] })).toBe(false);
  });

  it('todos os arquivos de procedural/criterios carregam, e cada um é achado pelo id', () => {
    expect(FAMILIAS_DE_OBJETO.length).toBeGreaterThan(0);
    for (const id of FAMILIAS_DE_OBJETO) { expect(criteriosDe(id)).toBe(CRITERIOS[id]); expect(CRITERIOS[id].perguntas.length).toBeLessThanOrEqual(TETO_POR_FAMILIA); }
    expect(criteriosDe('nao-existe')).toBeUndefined();
  });

  it('o móvel de caixa pergunta de que lado fica a dobradiça, e só entra com dobradiça no objeto', () => {
    const movel = CRITERIOS['movel-de-caixa'];
    const com = perguntasDaFamiliaDeObjeto(movel, { componentes: [], formas: ['portaE.pino1'] });
    const sem = perguntasDaFamiliaDeObjeto(movel, { componentes: [], formas: ['portaE.porta', 'lateralE'] });
    expect(com.some((p) => /dobradiça/.test(p) && /atrás da porta/.test(p))).toBe(true);
    expect(sem.some((p) => /dobradiça/.test(p))).toBe(false);
  });
});

describe('as linhas do brief', () => {
  it('sem específicas devolve as fixas como antes; com elas, as fixas, as específicas e a aberta no fim', () => {
    const fixas = ['a?', 'b?'];
    expect(linhasDasPerguntas(fixas, [])).toEqual(['  1. a?', '  2. b?']);
    expect(linhasDasPerguntas(fixas, ['c?'])).toEqual(['  1. a?', '  2. b?', '  3. c?', `  4. ${PERGUNTA_ABERTA}`]);
    expect(juntarPerguntas(['x?', 'y?'], ['y?', 'z?'])).toEqual(['x?', 'y?', 'z?']);
  });
});

describe('as perguntas da peça', () => {
  const PLANO = {
    objeto: 'roupeiro de duas portas de MDF, de 1600 mm de largura',
    referencias: ['referencias/roupeiro.png'],
    escala: { medida: 'altura do roupeiro', milimetros: 2200 },
    partes: [
      { nome: 'corpo', forma: 'caixa de parede uniforme aberta na frente', tecnica: 'casca' },
      { nome: 'dobradicas', forma: 'três dobradiças por porta na borda que gira', tecnica: 'articula' },
    ],
    criteriosDeReprovacao: ['dobradiça aparecendo por fora da lateral do corpo'],
  };

  it('o PLANO sem os campos novos tem a mesma forma canônica de antes', () => {
    const plano = normalizarPlanoDeModelagem(PLANO);
    expect(Object.keys(plano)).toEqual(['formato', 'versao', 'objeto', 'referencias', 'escala', 'partes', 'criteriosDeReprovacao']);
  });

  it('o PLANO aceita `familia` e `familiaProcedural`, e recusa o desconhecido', () => {
    const plano = normalizarPlanoDeModelagem({ ...PLANO, familia: 'movel-de-caixa', familiaProcedural: 'roupeiro' });
    expect(plano.familia).toBe('movel-de-caixa');
    expect(plano.familiaProcedural).toBe('roupeiro');
    expect(() => normalizarPlanoDeModelagem({ ...PLANO, familia: 'movel' })).toThrow(/assento, movel-de-caixa, veiculo/);
    expect(() => normalizarPlanoDeModelagem({ ...PLANO, familiaProcedural: 'Roupeiro 2' })).toThrow(/familiaProcedural/);
  });

  it('sem os campos não há pergunta; com `familia` entram as do arquivo cuja condição acha uma parte do PLANO', () => {
    const plano = normalizarPlanoDeModelagem(PLANO);
    expect(perguntasDaPeca(plano).todas).toEqual([]);
    const r = perguntasDaPeca(plano, { criterios: CRITERIOS['movel-de-caixa'] });
    expect(r.familia.some((p) => /dobradiça/.test(p))).toBe(true);
    expect(r.familia.some((p) => /gaveta/.test(p))).toBe(false);
    const semDobradica = normalizarPlanoDeModelagem({ ...PLANO, partes: [PLANO.partes[0]] });
    expect(perguntasDaPeca(semDobradica, { criterios: CRITERIOS['movel-de-caixa'] }).familia.some((p) => /dobradiça/.test(p))).toBe(false);
  });

  it('com `familiaProcedural` entram as `perguntas` do familia.json por componente, antes das do arquivo de critérios', () => {
    const roupeiro = FAMILIAS.find((f) => f.contrato.id === 'roupeiro').contrato;
    const plano = normalizarPlanoDeModelagem({ ...PLANO, familia: 'movel-de-caixa', familiaProcedural: 'roupeiro' });
    const r = perguntasDaPeca(plano, { criterios: CRITERIOS['movel-de-caixa'], perguntasDaFamilia: roupeiro.perguntas });
    expect(r.componente).toEqual(Object.values(roupeiro.perguntas).flat());
    expect(r.todas.slice(0, r.componente.length)).toEqual(r.componente);
    expect(TETO_POR_COMPONENTE).toBeGreaterThan(0);
  });
});
