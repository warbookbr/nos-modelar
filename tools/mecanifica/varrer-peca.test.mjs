/* Prova de R01: a varredura reproduz, sem dica nenhuma, o achado que motivou o
   plano — e nunca aplica o vencedor que encontra. */
import { describe, expect, it } from 'vitest';
import {
  EPSILON_EFEITO,
  lerCriterio,
  lerLiberdade,
  partesMovidas,
  sugerirEnquadramento,
  varrerLote,
  varrerSensibilidade,
} from '../../src/autoria/varrer-parametros.js';
import { varrerReutilizavel } from './varrer-peca.mjs';
import { importarReceita, receitaDoModulo } from './importar-receita.mjs';
import { REPO, resolverCaminhoReceita } from './resolver-caminho-receita.mjs';

async function carregar(nome) {
  return receitaDoModulo(await importarReceita(resolverCaminhoReceita(nome, { raiz: REPO })));
}

describe('vocabulário de critério', () => {
  const descricao = {
    totais: { orfaos: 0, facesSemParte: 0, partes: 2 },
    partes: [
      { nome: 'a', min: [0, 0, 0], max: [1, 2, 3], dimensoes: [1, 2, 3] },
      { nome: 'b', min: [-1, 0, 0], max: [0, 1, 1], dimensoes: [1, 1, 1] },
    ],
    relacoes: [
      { a: 'a', b: 'b', tipo: 'folga', distancia: 0.004 },
      { a: 'a', b: 'c', tipo: 'interpenetra', distancia: 0 },
    ],
  };

  it('lê cada critério aceito', () => {
    expect(lerCriterio('menor-folga').avaliar(descricao)).toBe(0.004);
    expect(lerCriterio('interpenetracoes').avaliar(descricao)).toBe(1);
    expect(lerCriterio('contatos').avaliar(descricao)).toBe(0);
    expect(lerCriterio('folga:b,a').avaliar(descricao)).toBe(0.004);
    expect(lerCriterio('dimensao:a:y').avaliar(descricao)).toBe(2);
    expect(lerCriterio('envelope:x').avaliar(descricao)).toBe(2);
  });

  it('devolve null, não zero, quando a peça não tem do que o critério fala', () => {
    /* Zero seria uma medida; null é a ausência dela. Confundir os dois faria a
       varredura ordenar candidatos por um número que ninguém mediu. */
    const semFolga = { ...descricao, relacoes: [] };
    expect(lerCriterio('menor-folga').avaliar(semFolga)).toBeNull();
    expect(lerCriterio('folga:a,b').avaliar(semFolga)).toBeNull();
    expect(lerCriterio('dimensao:inexistente:x').avaliar(descricao)).toBeNull();
  });

  it('recusa critério desconhecido dizendo quais existem', () => {
    expect(() => lerCriterio('folga-menor')).toThrow(/não existe.*menor-folga/s);
    expect(() => lerCriterio('folga:a')).toThrow(/duas partes/);
    expect(() => lerCriterio('dimensao:a:w')).toThrow(/x\|y\|z/);
  });
});

describe('liberdade de lote', () => {
  it('expande caminho:min..max:passos em valores igualmente espaçados', () => {
    const l = lerLiberdade('perna.secaoTopo:0.03..0.05:5');
    expect(l.caminho).toEqual(['perna', 'secaoTopo']);
    expect(l.valores.map((v) => Number(v.toFixed(4)))).toEqual([0.03, 0.035, 0.04, 0.045, 0.05]);
  });

  it('recusa faixa invertida, passos de menos e forma errada', () => {
    expect(() => lerLiberdade('a:0.05..0.03:4')).toThrow(/crescente/);
    expect(() => lerLiberdade('a:0.03..0.05:1')).toThrow(/≥ 2/);
    expect(() => lerLiberdade('a:0.03-0.05')).toThrow(/caminho:min\.\.max:passos/);
  });
});

describe('sensibilidade na cadeira', () => {
  it('encontra sozinha o único parâmetro que move a menor folga', async () => {
    const receita = await carregar('cadeira-de-madeira');
    const r = varrerSensibilidade(receita, { criterio: 'menor-folga' });

    const movem = r.efeitos.filter((e) => e.move).map((e) => e.caminho);
    expect(movem).toEqual(['perna.secaoTopo']);
    expect(r.variantes).toBe(42);

    const [menor, maior] = r.efeitos.find((e) => e.caminho === 'perna.secaoTopo').sondas;
    /* O achado que abriu o plano: encolher abre mais folga E cria quatro
       interpenetrações; engordar abre menos e não quebra nada. É o trade-off
       que a IA passava a rodada procurando por tentativa e erro. */
    expect(menor.deltaCriterio * 1000).toBeCloseTo(6.07, 1);
    expect(menor.deltaInterpenetracoes).toBe(4);
    expect(maior.deltaCriterio * 1000).toBeCloseTo(2.0, 1);
    expect(maior.deltaInterpenetracoes).toBe(0);
  }, 60_000);

  it('não conta ruído de ponto flutuante como efeito', async () => {
    /* Medido: `assento.altura` desloca a menor folga em ~2,8e-14 m. Sem a porta
       do epsilon ele entrava na lista dos que movem o critério, ao lado de um
       que move seis milímetros. */
    const receita = await carregar('cadeira-de-madeira');
    const r = varrerSensibilidade(receita, { criterio: 'menor-folga' });
    const altura = r.efeitos.find((e) => e.caminho === 'assento.altura');
    expect(altura.move).toBe(false);
    const ruido = Math.max(...altura.sondas.map((s) => Math.abs(s.deltaCriterio)));
    expect(ruido).toBeGreaterThan(0);
    expect(ruido).toBeLessThan(EPSILON_EFEITO);
  }, 60_000);

  it('recusa antes de rodar quando a varredura não cabe no orçamento', async () => {
    const receita = await carregar('cadeira-de-madeira');
    expect(() => varrerSensibilidade(receita, { orcamento: 10 })).toThrow(/42 variantes.*orçamento é 10/);
  }, 30_000);

  it('numa receita de PASSOS literais, diz que nada move e aponta o diagnóstico', async () => {
    const receita = await carregar('prensa-hidraulica');
    const r = varrerSensibilidade(receita, { criterio: 'envelope:y' });
    expect(r.efeitos.every((e) => !e.move)).toBe(true);
    const texto = (await varrerReutilizavel({ alvo: 'prensa-hidraulica', criterio: 'envelope:y' })).stdout;
    expect(texto).toContain('npm run parametros');
  }, 60_000);
});

describe('lote', () => {
  it('ordena por objetivo declarado e mostra o custo de cada candidato', async () => {
    const receita = await carregar('cadeira-de-madeira');
    const r = varrerLote(receita, {
      liberdades: ['perna.secaoTopo:0.036..0.05:8'],
      criterio: 'menor-folga',
      objetivo: { modo: 'maximizar' },
    });
    expect(r.variantes).toBe(8);
    expect(r.viaveis.length).toBe(8);
    expect(r.viaveis[0].valor).toBeGreaterThanOrEqual(r.viaveis[1].valor);
    /* O melhor número do lote custa quatro interpenetrações; o segundo não custa
       nada. A ferramenta mostra os dois e não escolhe. */
    expect(r.viaveis[0].custo.interpenetracoes).toBe(4);
    expect(r.viaveis[1].custo.interpenetracoes).toBe(0);
  }, 60_000);

  it('sem objetivo declarado não ordena, e diz isso', async () => {
    const r = await varrerReutilizavel({
      alvo: 'cadeira-de-madeira',
      liberdades: ['perna.secaoTopo:0.036..0.05:4'],
    });
    expect(r.ok).toBe(true);
    expect(r.stdout).toContain('sem objetivo declarado');
  }, 60_000);

  it('recusa a grade que estoura o orçamento em vez de rodar por minutos', async () => {
    const receita = await carregar('cadeira-de-madeira');
    expect(() => varrerLote(receita, {
      liberdades: ['perna.secaoTopo:0.03..0.05:20', 'assento.larg:0.4..0.5:20'],
      orcamento: 50,
    })).toThrow(/400 combinações.*orçamento é 50/);
  }, 30_000);
});

describe('o que a ferramenta NÃO faz', () => {
  it('não aplica vencedor, não toca a receita e diz isso na saída', async () => {
    const receita = await carregar('cadeira-de-madeira');
    const antes = JSON.stringify(receita.PARAMS);

    const sensibilidade = await varrerReutilizavel({ alvo: 'cadeira-de-madeira' });
    const lote = await varrerReutilizavel({
      alvo: 'cadeira-de-madeira',
      liberdades: ['perna.secaoTopo:0.036..0.05:4'],
      objetivo: { modo: 'maximizar' },
    });

    expect(JSON.stringify(receita.PARAMS)).toBe(antes);
    for (const r of [sensibilidade, lote]) {
      expect(r.stdout).toContain('CANDIDATOS medidos, não uma decisão');
      expect(r.stdout).toContain('nada foi aplicado');
    }
  }, 90_000);

  it('cabe na tela: a sensibilidade inteira da cadeira sai em menos de 4 KB', async () => {
    const r = await varrerReutilizavel({ alvo: 'cadeira-de-madeira' });
    expect(Buffer.byteLength(r.stdout)).toBeLessThan(4_000);
  }, 60_000);

  it('recusa uso ambíguo com diagnóstico, nunca escolhendo por conta própria', async () => {
    expect((await varrerReutilizavel({})).codigo).toBe(2);
    expect((await varrerReutilizavel({ alvo: 'nao-existe' })).codigo).toBe(2);
    const criterioRuim = await varrerReutilizavel({ alvo: 'cadeira-de-madeira', criterio: 'inventado' });
    expect(criterioRuim.codigo).toBe(2);
    expect(criterioRuim.stderr).toContain('menor-folga');
  }, 30_000);
});

describe('a medição escolhe o enquadramento', () => {
  it('aponta as partes que andaram, não a que foi alterada', async () => {
    /* Mexer em `perna.secaoTopo` não move a caixa das pernas: move as saias e
       travessas que se encontram com elas. Quem olhasse a perna não veria a
       mudança — é exatamente o palpite que esta linha substitui. */
    const receita = await carregar('cadeira-de-madeira');
    const { comCaminho } = await import('../../src/autoria/parametros-vivos.js');
    const { partes, proporcao } = partesMovidas(
      receita,
      comCaminho(receita.PARAMS, ['perna', 'secaoTopo'], 0.036),
    );
    expect(partes.map((p) => p.nome).sort())
      .toEqual(['saiaLateral', 'saiaTraseira', 'travessaLateral', 'travessaTraseira']);
    expect(partes.every((p) => p.deslocamento > 0)).toBe(true);
    expect(proporcao).toBeGreaterThan(1.5);
  }, 60_000);

  it('escolhe o modo pela quantidade de partes e pede resolução para peça alta', () => {
    const uma = [{ nome: 'aba', deslocamento: 1 }];
    const duas = [...uma, { nome: 'colar', deslocamento: 1 }];
    const tres = [...duas, { nome: 'haste', deslocamento: 1 }];
    expect(sugerirEnquadramento('x', uma)).toContain('--selecionadas=aba --modo=isolar --focar');
    expect(sugerirEnquadramento('x', duas)).toContain('--par=aba,colar');
    expect(sugerirEnquadramento('x', tres)).toContain('--modo=contexto');
    expect(sugerirEnquadramento('x', uma)).not.toContain('--res=');
    expect(sugerirEnquadramento('x', uma, { proporcao: 2.1 })).toContain('--res=1280x1707');
    expect(sugerirEnquadramento('x', [])).toBeNull();
  });

  it('emite a linha pronta na saída da sensibilidade, e nenhuma quando nada move', async () => {
    const comMovimento = await varrerReutilizavel({ alvo: 'cadeira-de-madeira' });
    expect(comMovimento.stdout).toContain('ONDE OLHAR');
    expect(comMovimento.stdout).toMatch(/npm run bancada -- cadeira-de-madeira --cores/);

    const semMovimento = await varrerReutilizavel({ alvo: 'prensa-hidraulica', criterio: 'envelope:y' });
    expect(semMovimento.stdout).not.toContain('ONDE OLHAR');
  }, 90_000);
});
