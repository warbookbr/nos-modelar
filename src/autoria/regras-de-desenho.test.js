/* regras-de-desenho.test.js — o campo `regras` do arquivo de critérios por família (formato, validação, filtro pela condição), o
   alinhamento por família e os pedidos da pessoa contados por etapa. */
import { describe, expect, it } from 'vitest';
import {
  ErroDePerguntas, FORMATO_CRITERIOS, TETO_DE_REGRAS_POR_FAMILIA,
  lerCriterios, perguntasDaFamiliaDeObjeto, perguntasDaPeca, regrasDaFamilia,
} from './perguntas-do-critico.js';
import { PERGUNTAS_GENERICAS, palavrasDoTexto, perguntasDoAlinhamento, textoDoAlinhamento } from './alinhamento-por-familia.js';
import { ErroDePedidos, FORMATO_PEDIDOS, contarPedidos, lerPedido, lerPedidos } from './pedidos-da-pessoa.js';
import { criteriosDe } from '../../procedural/criterios/index.js';

const criterios = (mudar = () => {}) => {
  const c = { formato: FORMATO_CRITERIOS, id: 'cofre', cobre: ['cofre'], perguntas: [{ texto: 'De que lado fica a porta?', condicao: { forma: ['porta*'] } }] };
  mudar(c);
  return c;
};
const recusa = (fn, Classe = ErroDePerguntas) => { try { fn(); } catch (e) { expect(e).toBeInstanceOf(Classe); return e; } throw new Error('devia recusar'); };

const regra = (mudar = () => {}) => {
  const r = {
    id: 'porta-visivel',
    texto: 'Toda porta mostra a fresta que a separa da lataria.',
    perguntaDoAlinhamento: 'Qual a largura da fresta de cada porta?',
    perguntaDeForma: 'Onde a fresta de cada porta fecha a volta, e em que trecho ela some?',
    condicao: { forma: ['*porta*'] },
    conferencia: 'fresta-da-porta',
    origem: 'Pedido da pessoa em uma etapa de ensaio.',
  };
  mudar(r);
  return r;
};
const comRegras = (...regras) => criterios((c) => { c.regras = regras; });

describe('as regras de desenho da família', () => {
  it('o arquivo sem `regras` continua válido no formato @1 e devolve a lista vazia', () => {
    const lido = lerCriterios(criterios());
    expect(lido.formato).toBe('mecanifica.criterios-do-objeto@1');
    expect(lido.regras).toEqual([]);
    expect(perguntasDaFamiliaDeObjeto(lido, { formas: ['porta'] })).toEqual(['De que lado fica a porta?']);
  });

  it('lê a regra completa, congelada, e a pergunta de forma vem depois das perguntas da família', () => {
    const lido = lerCriterios(comRegras(regra()));
    expect(Object.isFrozen(lido.regras)).toBe(true);
    expect(lido.regras[0]).toMatchObject({ id: 'porta-visivel', conferencia: 'fresta-da-porta' });
    expect(perguntasDaFamiliaDeObjeto(lido, { formas: ['portaDireita'] }, { comRegras: true })).toEqual(['De que lado fica a porta?', 'Onde a fresta de cada porta fecha a volta, e em que trecho ela some?']);
    // sem `comRegras` (o brief do esboço, que é blocagem) só entram as perguntas da família
    expect(perguntasDaFamiliaDeObjeto(lido, { formas: ['portaDireita'] })).toEqual(['De que lado fica a porta?']);
    expect(perguntasDaFamiliaDeObjeto(lido, { formas: ['teto'] }, { comRegras: true })).toEqual([]);
  });

  it('a conferência é opcional', () => {
    expect(lerCriterios(comRegras(regra((r) => { delete r.conferencia; }))).regras[0].conferencia).toBeUndefined();
  });

  it('a conferência pode levar os parâmetros da regra, e o nome continua a ser lido como texto', () => {
    const lida = lerCriterios(comRegras(regra((r) => { r.conferencia = { nome: 'distancia-minima', parametros: { minimo: 30, faixas: [{ medida: 'a', min: 0.5 }] } }; }))).regras[0];
    expect(lida.conferencia).toBe('distancia-minima');
    expect(lida.parametros).toEqual({ minimo: 30, faixas: [{ medida: 'a', min: 0.5 }] });
    expect(Object.isFrozen(lida.parametros.faixas[0])).toBe(true);
    const erro = (c) => recusa(() => lerCriterios(comRegras(regra((r) => { r.conferencia = c; }))));
    expect(erro({ nome: 'distancia-minima', limite: 3 }).aceito).toMatch(/campo conhecido: nome, parametros/);
    expect(erro({ nome: 'distancia-minima', parametros: { minimo: null } }).aceito).toMatch(/números, textos e listas/);
    expect(erro({ parametros: { minimo: 30 } }).onde).toMatch(/conferencia/);
  });

  it('recusa a regra mal formada dizendo o campo e o que é aceito', () => {
    const erro = (mudar) => recusa(() => lerCriterios(comRegras(regra(mudar))));
    expect(erro((r) => { delete r.texto; }).aceito).toMatch(/a regra em uma frase/);
    expect(erro((r) => { r.texto = 'Primeira frase. Segunda frase.'; }).aceito).toMatch(/uma frase só/);
    expect(erro((r) => { r.texto = 'Sem ponto final'; }).aceito).toMatch(/terminada em "\."/);
    expect(erro((r) => { r.perguntaDoAlinhamento = 'Diga a largura'; }).aceito).toMatch(/terminada em "\?"/);
    expect(erro((r) => { r.perguntaDeForma = 'A fresta fecha a volta?'; }).onde).toMatch(/perguntaDeForma/);
    expect(erro((r) => { r.perguntaDeForma = 'Qual a proporção entre a porta e o teto?'; }).aceito).toMatch(/pergunta de forma/);
    expect(erro((r) => { delete r.condicao; }).aceito).toMatch(/precisa existir no objeto/);
    expect(erro((r) => { r.conferencia = 'Fresta Da Porta'; }).onde).toMatch(/conferencia/);
    expect(erro((r) => { delete r.origem; }).onde).toMatch(/origem/);
    expect(erro((r) => { r.origem = '/tmp/x/nota.md'; }).aceito).toMatch(/sem caminho absoluto/);
    expect(erro((r) => { r.id = 'Porta Visivel'; }).onde).toMatch(/id/);
    expect(erro((r) => { r.extra = 1; }).aceito).toMatch(/campo conhecido: id, texto/);
  });

  it('recusa o id repetido, a pergunta de forma repetida, a lista vazia e o excesso de regras', () => {
    expect(recusa(() => lerCriterios(comRegras(regra(), regra((r) => { r.perguntaDeForma = 'Onde a porta abre, e por que lado?'; })))).aceito).toMatch(/id que ainda não foi usado/);
    expect(recusa(() => lerCriterios(comRegras(regra(), regra((r) => { r.id = 'outra'; })))).aceito).toMatch(/nem por outra regra/);
    expect(recusa(() => lerCriterios(criterios((c) => { c.regras = []; }))).aceito).toMatch(/ao menos uma regra/);
    const muitas = Array.from({ length: TETO_DE_REGRAS_POR_FAMILIA + 1 }, (_, i) => regra((r) => { r.id = `regra-${i}`; r.perguntaDeForma = `Onde fica a peça ${i}, e em que trecho?`; }));
    expect(recusa(() => lerCriterios(comRegras(...muitas))).aceito).toMatch(new RegExp(`no máximo ${TETO_DE_REGRAS_POR_FAMILIA} regras`));
  });

  it('as regras chegam a `perguntasDaPeca` pelas partes do PLANO', () => {
    const c = lerCriterios(comRegras(regra()));
    expect(perguntasDaPeca({ partes: [{ nome: 'portaDireita' }] }, { criterios: c }).todas).toContain('Onde a fresta de cada porta fecha a volta, e em que trecho ela some?');
    expect(perguntasDaPeca({ partes: [{ nome: 'teto' }] }, { criterios: c }).todas).toEqual([]);
  });

  it('o catálogo do veículo fala de veículo em geral, sem furgão nem fabricante, em uma frase por regra', () => {
    const regras = criteriosDe('veiculo').regras;
    expect(regras.length).toBeGreaterThanOrEqual(7);
    for (const r of regras) {
      for (const t of [r.texto, r.perguntaDoAlinhamento, r.perguntaDeForma]) expect(t).not.toMatch(/furg[aã]o|ford|fiat|renault|mercedes|volkswagen|peugeot|citro[eë]n|iveco/i);
      expect(r.texto).toMatch(/\.$/);
    }
  });
});

describe('o alinhamento por família', () => {
  const veiculo = criteriosDe('veiculo');

  it('sem partes entram todas as regras; com partes, só as de condição que vale', () => {
    expect(perguntasDoAlinhamento(veiculo).itens).toHaveLength(veiculo.regras.length);
    const so = perguntasDoAlinhamento(veiculo, { componentes: ['porta', 'saia'], formas: ['porta', 'saia'] });
    expect(so.itens.map((i) => i.id)).toContain('peca-fixa-nao-cobre-porta');
    expect(so.itens.map((i) => i.id)).not.toContain('vidro-com-interior');
    expect(regrasDaFamilia(veiculo, { componentes: [], formas: ['guidao'] })).toEqual([]);
  });

  it('cada item traz a pergunta, a regra literal e a conferência quando existe', () => {
    const item = perguntasDoAlinhamento(veiculo).itens.find((i) => i.id === 'linhas-vizinhas-afastadas');
    expect(item.conferencia).toBe('divisoes');
    expect(item.regra).toMatch(/30 mm/);
    expect(textoDoAlinhamento(perguntasDoAlinhamento(veiculo))).toMatch(/conferência: divisoes/);
  });

  it('objeto sem família, ou família sem regras, usa o conjunto genérico curto', () => {
    const sem = perguntasDoAlinhamento(null);
    expect(sem.generico).toBe(true);
    expect(sem.itens).toHaveLength(PERGUNTAS_GENERICAS.length);
    expect(PERGUNTAS_GENERICAS.length).toBeLessThanOrEqual(6);
    expect(perguntasDoAlinhamento(criteriosDe('assento')).generico).toBe(true);
  });

  it('as palavras de um texto escrito servem de partes para a condição', () => {
    expect(palavrasDoTexto('A saia sobre as portas; para-brisa.')).toEqual(expect.arrayContaining(['saia', 'portas', 'para-brisa']));
    const r = perguntasDoAlinhamento(veiculo, { formas: palavrasDoTexto('o arco e o pneu') });
    expect(r.itens.map((i) => i.id)).toContain('alargamento-ao-pneu');
  });
});

describe('os pedidos da pessoa', () => {
  const pedido = (mudar = () => {}) => {
    const p = { texto: 'Faixa de teto mais alta.', etapa: '3', regra: 'coluna-e-faixa-de-teto', ondeMora: 'procedural/criterios/veiculo.json#coluna-e-faixa-de-teto' };
    mudar(p);
    return p;
  };
  const arquivo = (...pedidos) => ({ formato: FORMATO_PEDIDOS, peca: 'furgao-realista', pedidos });

  it('lê o pedido e guarda a etapa como texto, mesmo escrita como número', () => {
    expect(lerPedido(pedido((p) => { p.etapa = 3; })).etapa).toBe('3');
  });

  it('recusa o pedido sem texto, sem etapa, sem regra ou com o lugar absoluto', () => {
    const erro = (mudar) => recusa(() => lerPedido(pedido(mudar)), ErroDePedidos);
    expect(erro((p) => { delete p.texto; }).onde).toMatch(/texto/);
    expect(erro((p) => { p.etapa = 'duas etapas'; }).onde).toMatch(/etapa/);
    expect(erro((p) => { delete p.regra; }).aceito).toMatch(/id da regra que faltou/);
    expect(erro((p) => { p.ondeMora = '/tmp/regra.json'; }).onde).toMatch(/ondeMora/);
    expect(erro((p) => { p.extra = 1; }).aceito).toMatch(/campo conhecido/);
  });

  it('recusa o formato errado e o pedido repetido na mesma etapa', () => {
    expect(recusa(() => lerPedidos({ ...arquivo(), formato: 'outro' }), ErroDePedidos).onde).toBe('formato');
    expect(recusa(() => lerPedidos(arquivo(pedido(), pedido())), ErroDePedidos).aceito).toMatch(/ainda não foi registrado/);
    expect(() => lerPedidos(arquivo(pedido(), pedido((p) => { p.etapa = '4'; })))).not.toThrow();
  });

  it('conta os pedidos por etapa em ordem numérica e por regra', () => {
    const lido = lerPedidos(arquivo(
      pedido(), pedido((p) => { p.texto = 'Outro.'; p.regra = 'arco-com-alargamento'; }),
      pedido((p) => { p.etapa = '10'; }), pedido((p) => { p.etapa = '4'; }),
    ));
    const c = contarPedidos(lido.pedidos);
    expect(c.total).toBe(4);
    expect(Object.entries(c.porEtapa)).toEqual([['3', 2], ['4', 1], ['10', 1]]);
    expect(c.porRegra['coluna-e-faixa-de-teto']).toBe(3);
  });
});
