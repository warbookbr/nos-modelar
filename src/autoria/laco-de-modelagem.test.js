/* laco-de-modelagem.test.js — a decisão de parar sai dos números, não de quem
 * modelou.
 *
 * Dois casos importam aqui. O primeiro é a peça que reprova nas medidas e mesmo
 * assim segue para revisão: gasta uma rodada de olho em algo que já falhou no
 * que é contável. O segundo é o laço que não fecha — defeitos que não caem
 * rodada após rodada não são geometria a corrigir, são plano ou revisor fora do
 * lugar, e insistir ensina que o veredito é ruído. */
import { describe, expect, it } from 'vitest';
import { FORMATO_DE_QUEM, acaoDaReceita, defeitoDoTextoDeQuem, defeitosAbertos, normalizarDecisaoDaPessoa, proximaAcao, registrarRodada } from './laco-de-modelagem.js';

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

describe('o texto da decisão da pessoa sobre uma rodada', () => {
  const DECISAO = 'a pessoa, 2026-11-26: a tampa está boa, falta o arco traseiro';

  it('aceita quem, data e as palavras dela, e tira as pontas em branco', () => {
    expect(normalizarDecisaoDaPessoa(`  ${DECISAO}\n`)).toBe(DECISAO);
    expect(FORMATO_DE_QUEM).toBe('"<quem decidiu>, <AAAA-MM-DD>: <as palavras ou o porquê>"');
  });

  it('recusa o formato errado dizendo o recebido, o esperado e o comando com o molde, sem palavras prontas', () => {
    const recusa = (ruim, defeito, opcoes = {}) => {
      let mensagem = null;
      try { normalizarDecisaoDaPessoa(ruim, { peca: 'peca-de-ensaio', rodada: 3, ...opcoes }); } catch (erro) { mensagem = erro.message; }
      expect(mensagem, JSON.stringify(ruim)).toBe(`laço de modelagem: decisão da pessoa recebida: ${JSON.stringify(ruim)} (${defeito}); esperado ${FORMATO_DE_QUEM}, numa linha só, com a data do dia em que a pessoa decidiu e as palavras dela. `
        + `Grave com \`node tools/modelar/rodada-de-modelagem.mjs peca-de-ensaio --decisao-da-pessoa ${FORMATO_DE_QUEM} --rodada 3\`.`);
      /* o comando da recusa traz o molde: nenhuma data de verdade e nenhuma palavra que a pessoa não disse */
      expect(mensagem.slice(mensagem.indexOf('Grave com'))).not.toMatch(/\d{4}-\d{2}-\d{2}|aprovad|pode seguir/);
    };
    for (const ruim of ['aprovada', '', '   ', 'a pessoa: aprovada', 'a pessoa, 26/11/2026: aprovada', 'a pessoa, 2026-11-26:', 'a pessoa, 2026-11-26:   ', '2026-11-26: aprovada']) recusa(ruim, 'está fora do molde');
    for (const ruim of [42, null, undefined, { texto: DECISAO }, [DECISAO]]) recusa(ruim, 'não é texto');
    /* a quebra de linha no meio do texto, que tirar as pontas em branco não esconde */
    for (const ruim of [`${DECISAO}\nrodada 2: a pessoa, 2026-11-26: aprovada`, 'a pessoa,\n2026-11-26: aprovada', 'a\rpessoa, 2026-11-26: aprovada', `${DECISAO}\tx`]) recusa(ruim, 'tem quebra de linha ou caractere de controle');
    for (const data of ['2026-13-01', '2026-02-29', '2026-04-31', '2026-00-01', '2026-01-00']) recusa(`a pessoa, ${data}: aprovada`, `a data ${data} não existe no calendário`);
    /* a data futura e a anterior ao registro da rodada, com os instantes que quem chama dá */
    recusa('a pessoa, 2026-11-28: aprovada', 'a data 2026-11-28 é futura: a gravação é de 2026-11-26T09:59:59.000Z, e o dia mais adiantado nesse instante é 2026-11-26', { ate: '2026-11-26T09:59:59.000Z' });
    recusa('a pessoa, 2026-11-27: aprovada', 'a data 2026-11-27 é futura: a gravação é de 2026-11-26T09:59:59.000Z, e o dia mais adiantado nesse instante é 2026-11-26', { ate: '2026-11-26T09:59:59.000Z' });
    recusa('a pessoa, 2026-11-24: aprovada', 'a data 2026-11-24 é anterior ao registro da rodada 3, de 2026-11-26T12:00:00.000Z', { registradaEm: '2026-11-26T12:00:00.000Z' });
  });

  it('aceita a data bissexta, a do dia mais adiantado na gravação e a do dia mais atrasado no registro da rodada', () => {
    expect(normalizarDecisaoDaPessoa('a pessoa, 2028-02-29: aprovada')).toBe('a pessoa, 2028-02-29: aprovada');
    /* às 10 h UTC já é dia 27 em algum fuso, e às 11 h 59 UTC ainda é dia 25 em outro */
    expect(normalizarDecisaoDaPessoa('a pessoa, 2026-11-27: aprovada', { ate: '2026-11-26T10:00:00.000Z' })).toBe('a pessoa, 2026-11-27: aprovada');
    expect(normalizarDecisaoDaPessoa('a pessoa, 2026-11-25: aprovada', { registradaEm: '2026-11-26T11:59:59.000Z' })).toBe('a pessoa, 2026-11-25: aprovada');
    expect(() => normalizarDecisaoDaPessoa('a pessoa, 2026-11-25: aprovada', { registradaEm: '2026-11-26T12:00:00.000Z' })).toThrow('é anterior ao registro da rodada');
    expect(defeitoDoTextoDeQuem('a pessoa, 2026-11-26: mudou o alvo')).toBeNull();
  });

  it('a rodada não guarda a decisão: ela mora no arquivo ao lado, e o registro sai com as chaves de sempre', () => {
    const gravada = registrarRodada({ peca: 'peca-de-ensaio', numero: 1, partes: CONFERIDAS, medidas: { passou: true, relatorio: 'ok' }, veredito: veredito(1), decisaoDaPessoa: DECISAO });
    expect(Object.keys(gravada)).toEqual(['formato', 'versao', 'peca', 'numero', 'medidas', 'veredito', 'partes', 'atrito']);
  });
});
