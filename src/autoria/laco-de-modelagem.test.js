/* laco-de-modelagem.test.js — a decisão de parar sai dos números, não de quem
 * modelou.
 *
 * Dois casos importam aqui. O primeiro é a peça que reprova nas medidas e mesmo
 * assim segue para revisão: gasta uma rodada de olho em algo que já falhou no
 * que é contável. O segundo é o laço que não fecha — defeitos que não caem
 * rodada após rodada não são geometria a corrigir, são plano ou revisor fora do
 * lugar, e insistir ensina que o veredito é ruído. */
import { describe, expect, it } from 'vitest';
import { FORMATO_DE_QUEM, acaoDaReceita, defeitosAbertos, normalizarDecisaoDaPessoa, proximaAcao, registrarRodada } from './laco-de-modelagem.js';

const defeito = (parte, tipo = 'angulo', sentido = 'menor') => ({
  parte, tipo, onde: 'extremidade superior', sentido,
  evidencia: 'na vista lateral a linha do alvo nao coincide com a do modelo',
});

const veredito = (quantos, nota = 6) => ({
  alvo: 'referencias/lateral.png',
  nota,
  defeitos: Array.from({ length: quantos }, (_, i) => defeito(`parte${i}`)),
  observacao: 'a silhueta geral bate e alguns trechos saem da linha do alvo',
});

const rodada = (numero, { passou = true, quantos = null, nota = 6, partes = CONFERIDAS } = {}) => registrarRodada({
  peca: 'peca-de-ensaio',
  numero,
  medidas: { passou, relatorio: passou ? 'guarda:acervo ok' : 'contato declarado que nao acontece' },
  veredito: quantos === null ? null : veredito(quantos, nota),
  partes,
});

const CONFERIDAS = [{ nome: 'corpo', confere: true }, { nome: 'tampa', confere: true }];

describe('laço de modelagem', () => {
  it('sem rodada nenhuma, a ação é modelar', () => {
    expect(proximaAcao([]).acao).toBe('modelar');
  });

  it('medida reprovada volta a modelar SEM gastar revisão', () => {
    const decisao = proximaAcao([rodada(1, { passou: false })]);
    expect(decisao.acao).toBe('modelar');
    expect(decisao.motivo).toMatch(/gastar rodada/);
  });

  it('peça que passou nas medidas e não foi julgada vai para revisão', () => {
    expect(proximaAcao([rodada(1)]).acao).toBe('revisar');
  });

  it('fecha quando não há defeito apontado e a nota alcança o mínimo', () => {
    expect(proximaAcao([rodada(1, { quantos: 0, nota: 9 })]).acao).toBe('parar-fechou');
    /* Nota baixa sem defeito listado não fecha: o revisor viu algo que não
       soube nomear, e parar aí seria aprovar pelo silêncio. */
    expect(proximaAcao([rodada(1, { quantos: 0, nota: 5 })]).acao).toBe('modelar');
  });

  it('PARA quando os defeitos não caem em três rodadas julgadas', () => {
    const historia = [rodada(1, { quantos: 4 }), rodada(2, { quantos: 4 }), rodada(3, { quantos: 5 })];
    const decisao = proximaAcao(historia);
    expect(decisao.acao).toBe('parar-sem-convergencia');
    expect(decisao.motivo).toMatch(/4, 4, 5/);
  });

  it('continua enquanto os defeitos estão caindo, mesmo com muitas rodadas julgadas', () => {
    const historia = [rodada(1, { quantos: 5 }), rodada(2, { quantos: 3 }), rodada(3, { quantos: 1 })];
    expect(proximaAcao(historia).acao).toBe('modelar');
  });

  it('a convergência volta a contar da rodada que a pessoa declarou, e para de novo três rodadas julgadas depois', () => {
    const historia = [rodada(1, { quantos: 4 }), rodada(2, { quantos: 4 }), rodada(3, { quantos: 5 })];
    expect(proximaAcao(historia).acao).toBe('parar-sem-convergencia');
    expect(proximaAcao(historia, { convergenciaDesde: 3 })).toMatchObject({ acao: 'modelar', motivo: '5 defeito(s) apontado(s) na rodada 3.' });
    const seguiu = [...historia, rodada(4, { quantos: 5 })];
    expect(proximaAcao(seguiu, { convergenciaDesde: 3 }).acao).toBe('modelar');
    const parouDeNovo = proximaAcao([...seguiu, rodada(5, { quantos: 5 })], { convergenciaDesde: 3 });
    expect(parouDeNovo.acao).toBe('parar-sem-convergencia');
    expect(parouDeNovo.motivo).toMatch(/5, 5, 5/);
    expect(acaoDaReceita(historia.map((r) => ({ ...r, receita: { sha256: HASH_A } })), atual(HASH_B), { convergenciaDesde: 3 }).acao).toBe('revisar');
  });

  it('sem limite declarado (Infinity) o laço não para por limite, e com o limite de sempre para', () => {
    const historia = [9, 8, 7, 6, 5, 4, 3, 2].map((quantos, i) => rodada(i + 1, { quantos }));
    expect(proximaAcao(historia).acao).toBe('parar-limite');
    expect(proximaAcao(historia, { limite: Infinity }).acao).toBe('modelar');
  });

  it('convergenciaDesde além da próxima rodada a registrar é recusado com os números que existem, e não desliga a parada', () => {
    const historia = Array.from({ length: 10 }, (_, i) => rodada(i + 1, { quantos: 3 }));
    expect(() => proximaAcao(historia, { limite: Infinity, convergenciaDesde: 99999 }))
      .toThrow("'convergenciaDesde' recebido: 99999; esperado no máximo 11, o número da próxima rodada a registrar (as registradas são 1, 2, 3, 4, 5, 6, 7, 8, 9, 10).");
    expect(() => proximaAcao([], { convergenciaDesde: 2 })).toThrow('esperado no máximo 1, o número da próxima rodada a registrar (as registradas são nenhuma)');
    expect(() => acaoDaReceita(historia.map((r) => ({ ...r, receita: { sha256: HASH_A } })), atual(HASH_B), { limite: Infinity, convergenciaDesde: 12 })).toThrow('esperado no máximo 11');
    expect(proximaAcao(historia, { limite: Infinity, convergenciaDesde: 11 }).acao).toBe('modelar');
    expect(proximaAcao(historia, { limite: Infinity }).acao).toBe('parar-sem-convergencia');
  });

  it('a decisão gravada que evita a parada aparece no motivo, com quem decidiu; sem evitar nada, não aparece', () => {
    const historia = [rodada(1, { quantos: 4 }), rodada(2, { quantos: 4 }), rodada(3, { quantos: 5 })];
    const por = "a pessoa, 2026-11-18: 'pode seguir'";
    expect(proximaAcao(historia, { convergenciaDesde: 3, por }).motivo)
      .toBe(`5 defeito(s) apontado(s) na rodada 3. Segue por decisão gravada em rodadas/limite.json (por: ${por}); sem ela a ação seria parar-sem-convergencia.`);
    expect(proximaAcao(historia, { convergenciaDesde: 3 }).motivo).toBe('5 defeito(s) apontado(s) na rodada 3.');
    expect(proximaAcao(historia, { por }).motivo).not.toContain('Segue por decisão gravada');
    const longa = [9, 8, 7, 6, 5, 4, 3].map((quantos, i) => rodada(i + 1, { quantos }));
    expect(proximaAcao(longa, { limite: Infinity, por }).motivo).toContain('sem ela a ação seria parar-limite.');
    expect(proximaAcao(longa.slice(0, 3), { limite: Infinity, por }).motivo).not.toContain('Segue por decisão gravada');
    const nova = acaoDaReceita(historia.map((r) => ({ ...r, receita: { sha256: HASH_A } })), atual(HASH_B), { convergenciaDesde: 3, por });
    expect(nova.acao).toBe('revisar');
    expect(nova.motivo).toContain(`Segue por decisão gravada em rodadas/limite.json (por: ${por}); sem ela a ação seria parar-sem-convergencia.`);
  });

  it('recusa convergenciaDesde que não é número de rodada, dizendo o recebido e o esperado', () => {
    for (const ruim of [0, 2.5, '6', null]) {
      expect(() => proximaAcao([rodada(1, { quantos: 1 })], { convergenciaDesde: ruim }))
        .toThrow(`'convergenciaDesde' recebido: ${JSON.stringify(ruim)}; esperado o número inteiro (1 ou mais) da rodada`);
    }
  });

  it('PARA no limite combinado de rodadas, dizendo quantos defeitos ficaram', () => {
    const historia = [5, 4, 3, 2, 2, 1].map((quantos, i) => rodada(i + 1, { quantos }));
    const decisao = proximaAcao(historia, { limite: 6 });
    expect(decisao.acao).toBe('parar-limite');
    expect(decisao.motivo).toMatch(/1 defeito\(s\) em aberto/);
  });

  it('a rodada guarda o veredito que a motivou, e recusa registro sem medida', () => {
    const r = rodada(1, { quantos: 2 });
    expect(r.formato).toBe('mecanifica.rodada-de-modelagem');
    expect(r.veredito.defeitos).toHaveLength(2);
    expect(defeitosAbertos([r])).toHaveLength(2);
    expect(() => registrarRodada({ peca: 'x', numero: 1 })).toThrow(/medidas/);
    expect(() => registrarRodada({ peca: 'x', numero: 0, medidas: { passou: true } })).toThrow(/começa em 1/);
  });

  /* A CONFERÊNCIA PARTE POR PARTE É OBRIGATÓRIA. O contrato do modelador já
     mandava gerar as vistas e responder por parte, e nada conferia que alguém
     tinha olhado: a rodada de quem olhou era idêntica à de quem não olhou. */
  it('recusa rodada sem a conferência de partes, e diz o que rodar', () => {
    const base = { peca: 'x', numero: 1, medidas: { passou: true } };
    expect(() => registrarRodada(base)).toThrow(/vistas:critica/);
    expect(() => registrarRodada({ ...base, partes: [] })).toThrow(/vazia não é conferência/);
  });

  it('parte que não confere precisa dizer onde difere', () => {
    const base = { peca: 'x', numero: 1, medidas: { passou: true } };
    expect(() => registrarRodada({ ...base, partes: [{ nome: 'punho', confere: false }] }))
      .toThrow(/não confere e não diz onde/);
    const aceita = registrarRodada({
      ...base,
      partes: [{ nome: 'punho', confere: false, observacao: 'saiu maciço; o plano promete rasgo passante' }],
    });
    expect(aceita.partes).toEqual([
      { nome: 'punho', confere: false, observacao: 'saiu maciço; o plano promete rasgo passante' },
    ]);
  });

  it('exige nome e resposta booleana em cada parte', () => {
    const base = { peca: 'x', numero: 1, medidas: { passou: true } };
    expect(() => registrarRodada({ ...base, partes: [{ confere: true }] })).toThrow(/nome/);
    expect(() => registrarRodada({ ...base, partes: [{ nome: 'corpo' }] })).toThrow(/booleano/);
  });

  it('rodada com medida reprovada não carrega veredito, e a próxima lê os defeitos da última julgada', () => {
    const historia = [rodada(1, { quantos: 3 }), rodada(2, { passou: false })];
    expect(historia[1].veredito).toBe(null);
    expect(defeitosAbertos(historia)).toHaveLength(3);
  });
});

const HASH_A = `sha256:${'a'.repeat(64)}`;
const HASH_B = `sha256:${'b'.repeat(64)}`;
const daReceita = (numero, sha256, opcoes) => registrarRodada({
  peca: 'peca-de-ensaio', numero, partes: CONFERIDAS, receita: { sha256, diferenca: { linhas: [] } },
  medidas: { passou: opcoes?.passou ?? true, relatorio: 'ok' }, veredito: opcoes?.quantos === undefined || opcoes?.quantos === null ? null : veredito(opcoes.quantos, opcoes.nota ?? 6),
});
const atual = (sha256, passou = true, relatorio = 'guarda:acervo ok') => ({ sha256, medicao: { passou, relatorio } });

describe('o crítico não julga o que a medida reprovou', () => {
  it('a rodada que traz o veredito sobre medida reprovada é recusada, e sem veredito é aceita', () => {
    const base = { peca: 'peca-de-ensaio', numero: 1, partes: CONFERIDAS, medidas: { passou: false, relatorio: 'parte deslocada 30 mm' } };
    expect(() => registrarRodada({ ...base, veredito: veredito(1) })).toThrow(/as medidas reprovaram \(parte deslocada 30 mm\).*o crítico só julga receita que passa nas medidas/);
    expect(registrarRodada(base).veredito).toBeNull();
    expect(registrarRodada({ ...base, medidas: { passou: true, relatorio: 'ok' }, veredito: veredito(1) }).veredito.defeitos).toHaveLength(1);
  });
});

describe('a ação dada a receita atual, identificada pelo hash', () => {
  it('a medição da receita atual que reprova devolve modelar com o relatório, qualquer que seja o histórico', () => {
    const historia = [daReceita(1, HASH_A, { quantos: 0, nota: 9 })];
    expect(proximaAcao(historia).acao).toBe('parar-fechou');
    const d = acaoDaReceita(historia, atual(HASH_A, false, 'a parte sapata sai do envelope'));
    expect(d).toMatchObject({ acao: 'modelar', medicaoReprovada: true });
    expect(d.motivo).toBe('a medição da receita atual (sha256:aaaaaaaa) reprovou: a parte sapata sai do envelope; revisar antes de a medição passar é gastar o crítico.');
    expect(acaoDaReceita([], atual(HASH_B, false, 'x')).acao).toBe('modelar');
  });

  it('com a medição passando, a receita igual à da última rodada segue a decisão das rodadas', () => {
    expect(acaoDaReceita([daReceita(1, HASH_A, { quantos: 2 })], atual(HASH_A)).acao).toBe('modelar');
    expect(acaoDaReceita([daReceita(1, HASH_A, { quantos: 0, nota: 9 })], atual(HASH_A)).acao).toBe('parar-fechou');
    /* texto novo com a malha e o PLANO da rodada: o julgamento vale; com a forma de outra rodada, não */
    const fechada = [daReceita(1, HASH_A, { quantos: 0, nota: 9 })];
    expect(acaoDaReceita(fechada, { ...atual(HASH_B), mesmaFormaDaRodada: 1 }).acao).toBe('parar-fechou');
    expect(acaoDaReceita(fechada, { ...atual(HASH_B), mesmaFormaDaRodada: 1 }).motivo).toContain('mesma malha e o mesmo PLANO');
    expect(acaoDaReceita(fechada, { ...atual(HASH_B), mesmaFormaDaRodada: 2 }).acao).toBe('revisar');
    expect(acaoDaReceita([daReceita(1, HASH_A)], atual(HASH_A)).acao).toBe('revisar');
  });

  it('a receita que mudou depois da rodada não herda o julgamento: o fechamento e a correção pedida são da versão anterior', () => {
    const fechada = acaoDaReceita([daReceita(1, HASH_A, { quantos: 0, nota: 9 })], atual(HASH_B));
    expect(fechada.acao).toBe('revisar');
    expect(fechada.motivo).toBe('a receita mudou depois da rodada 1 (sha256:aaaaaaaa para sha256:bbbbbbbb) e a medição da versão nova passa; o julgamento da rodada é da versão anterior e falta o crítico julgar esta.');
    expect(acaoDaReceita([daReceita(1, HASH_A, { quantos: 3 })], atual(HASH_B)).acao).toBe('revisar');
  });

  it('os limites do laço continuam valendo para a receita nova', () => {
    const semConvergir = [4, 4, 5].map((quantos, i) => daReceita(i + 1, HASH_A, { quantos }));
    expect(acaoDaReceita(semConvergir, atual(HASH_B)).acao).toBe('parar-sem-convergencia');
    const noLimite = [5, 4, 3, 2, 2, 1].map((quantos, i) => daReceita(i + 1, HASH_A, { quantos }));
    expect(acaoDaReceita(noLimite, atual(HASH_B), { limite: 6 }).acao).toBe('parar-limite');
  });

  it('sem rodada nenhuma a receita que passa vai ao crítico; rodada de antes do hash segue a decisão antiga', () => {
    expect(acaoDaReceita([], atual(HASH_A)).acao).toBe('revisar');
    expect(acaoDaReceita([rodada(1, { quantos: 2 })], atual(HASH_A)).acao).toBe('modelar');
    expect(acaoDaReceita([rodada(1)], atual(HASH_A)).acao).toBe('revisar');
  });

  it('a mesma receita que a rodada registrou reprovada e agora passa vai ao crítico', () => {
    expect(acaoDaReceita([daReceita(1, HASH_A, { passou: false })], atual(HASH_A)).acao).toBe('revisar');
  });

  it('recusa a receita sem a medição', () => {
    expect(() => acaoDaReceita([], { sha256: HASH_A })).toThrow(/medição/);
    expect(() => acaoDaReceita([], { sha256: HASH_A, medicao: {} })).toThrow(/medição/);
  });
});

describe('a decisão da pessoa na rodada', () => {
  const base = { peca: 'peca-de-ensaio', numero: 1, partes: CONFERIDAS, medidas: { passou: true, relatorio: 'ok' }, veredito: veredito(1) };
  const DECISAO = 'a pessoa, 2026-11-26: a tampa está boa, falta o arco traseiro';

  it('grava as palavras dela com a data, ao lado do veredito do crítico, e só isso', () => {
    const gravada = registrarRodada({ ...base, decisaoDaPessoa: `  ${DECISAO}\n` });
    expect(gravada.decisaoDaPessoa).toBe(DECISAO);
    expect(gravada.veredito.defeitos).toHaveLength(1);
    /* a decisão não depende do veredito: a pessoa decide também sobre a rodada que o crítico não julgou */
    expect(registrarRodada({ ...base, veredito: null, decisaoDaPessoa: DECISAO }).decisaoDaPessoa).toBe(DECISAO);
  });

  it('sem a decisão a rodada sai como antes, sem o campo', () => {
    for (const ausente of [undefined, null]) {
      const gravada = registrarRodada({ ...base, decisaoDaPessoa: ausente });
      expect(Object.keys(gravada)).not.toContain('decisaoDaPessoa');
      expect(gravada).toEqual(registrarRodada(base));
    }
    expect(Object.keys(registrarRodada(base))).toEqual(['formato', 'versao', 'peca', 'numero', 'medidas', 'veredito', 'partes', 'atrito']);
  });

  it('recusa o formato errado dizendo o recebido, o esperado e o comando que registra certo', () => {
    for (const ruim of ['aprovada', '', '   ', 'a pessoa: aprovada', 'a pessoa, 26/11/2026: aprovada', 'a pessoa, 2026-11-26:', 'a pessoa, 2026-11-26:   ', '2026-11-26: aprovada', 42, { texto: DECISAO }, [DECISAO]]) {
      let mensagem = null;
      try { registrarRodada({ ...base, decisaoDaPessoa: ruim }); } catch (erro) { mensagem = erro.message; }
      expect(mensagem, JSON.stringify(ruim)).toBe(`laço de modelagem: 'decisaoDaPessoa' recebido: ${JSON.stringify(ruim)}; esperado ${FORMATO_DE_QUEM}, só com a data e as palavras da pessoa. `
        + 'Registre com `node tools/modelar/rodada-de-modelagem.mjs peca-de-ensaio --registrar ... --decisao-da-pessoa "a pessoa, 2026-11-26: aprovada, pode seguir"`, '
        + 'ou sem a opção quando a pessoa ainda não decidiu.');
    }
    expect(FORMATO_DE_QUEM).toBe('"<quem decidiu>, <AAAA-MM-DD>: <as palavras ou o porquê>"');
    expect(normalizarDecisaoDaPessoa(undefined)).toBeUndefined();
    expect(normalizarDecisaoDaPessoa(DECISAO)).toBe(DECISAO);
  });
});
