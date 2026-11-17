/* etapas-do-acervo.test.mjs — a releitura de todo `montagem.etapas.json` do acervo, pela impressão do aceite.
 *
 * A etapa que a pessoa fixou vale pela impressão que ela aceitou: a forma, os parâmetros, a pose, as juntas, as portas que ela cita e a
 * ordem das anteriores. Quem muda a receita de uma parte fixa, ou de uma parte anterior de que ela depende, muda o que foi aceito sem
 * ninguém perceber, e a ferramenta de etapas só acusa quando alguém a roda (em 2026-10-28 o texto do braço e do avião mudou e as etapas
 * só quebraram na leitura seguinte). Este teste lê cada registro como a ferramenta lê, sem gravar, e reprova a etapa com aceite
 * vigente que a leitura não devolve fixa; a mensagem lista a origem de cada impressão (a história do commit do aceite, ou a impressão
 * de agora herdada na migração, com a porta não provada). O acervo foi migrado em 2026-11-17: 52 etapas, 43 pela história e 9 herdadas. */
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { acrescentarAceite, imprimirEtapa } from '../../../src/autoria/etapas-pela-impressao.js';
import { estadoDasEtapas, gravarRegistro, reabrir } from '../etapas-da-montagem.mjs';
import { conferirEtapasDoAcervo, lerReferenciaDasMigradas } from './etapas-do-acervo.mjs';
import { REPO } from '../resolver-caminho-receita.mjs';

const ACERVO = join(REPO, 'procedural/pecas');
const MONTAGENS = readdirSync(ACERVO).map((objeto) => join(ACERVO, objeto, 'montagem.json'))
  .filter((arquivo) => existsSync(arquivo) && existsSync(arquivo.replace(/\.json$/, '.etapas.json')));

describe('as etapas fixas do acervo seguem fixas na releitura', () => {
  it('o acervo tem registro de etapas para reler', () => {
    expect(MONTAGENS.length).toBeGreaterThan(0);
  });

  /* a origem de cada impressão migrada, como a migração a gravou, e o máximo de cada uma: reabrir e aceitar de novo só tira etapas dela.
     `commit do aceite` é a impressão reconstruída pela árvore do commit, com a forma e as juntas conferidas; `impressão de agora` é a do
     dia da migração, herdada (a porta citada, quando há, não está provada) */
  const REFERENCIA = lerReferenciaDasMigradas();
  const ORIGENS = {
    aviao: { 'impressão de agora': 8 },
    'braco-robotico': { 'commit do aceite': 11, 'impressão de agora': 1 },
    'carrinho-de-mao': { 'commit do aceite': 4 },
    empilhadeira: { 'commit do aceite': 23 },
    'sedan-chassi-e-lataria': { 'commit do aceite': 5 },
  };

  for (const arquivo of MONTAGENS) {
    const nome = arquivo.slice(ACERVO.length + 1).replace(/\/montagem\.json$/, '');
    it(`${nome}: nenhum aceite vigente quebra ao ser relido, e a origem das impressões migradas não passa da gravada`, async () => {
      const r = await conferirEtapasDoAcervo(arquivo, { origensMaximas: ORIGENS[nome] ?? null, migradas: REFERENCIA[nome] ?? {} });
      expect(r.versaoErrada, `${nome}: o registro deve ser da versão 3; migre-o com migrar-etapas-para-impressao.mjs`).toBeUndefined();
      const mensagem = r.naoFixas.map((e) => `etapa '${e.instancia}' da montagem '${nome}' tem aceite vigente (impressão: ${r.vigentes.get(e.instancia).origem?.via ?? 'dada com o aceite'}) e a releitura a devolve ${e.estado} (${e.motivo ?? 'sem motivo'}): `
        + 'a receita dela ou de uma parte anterior mudou depois do aceite. Reabra a etapa com a pessoa (`npm run etapas -- <montagem.json> --reabrir <instância> --por "<quem, data: motivo>"`) ou desfaça a mudança.').join('\n');
      expect(r.naoFixas.map((e) => e.instancia), mensagem).toEqual([]);
      expect(r.excedidas, `as origens migradas e vigentes de '${nome}':\n${r.listadas.join('\n')}`).toEqual([]);
      expect(r.forjados, `evento migrado de '${nome}' que não está na lista travada (etapas-do-acervo.migradas.json): impressão, aceite ou origem trocados`).toEqual([]);
      expect(r.sumidos, `evento migrado de '${nome}' que sumiu do registro sem reabertura (a reabertura acrescenta, não apaga)`).toEqual([]);
      expect(r.orfaos, `'${nome}' tem aceite vigente de instância que a montagem já não tem`).toEqual([]);
      /* reler a montagem do sedã leva 199 s na máquina local (2026-11-13), contra 3 a 11 s das outras: só a carroceria dele, de 174 mil faces com o
         chassi aparado pela lataria, executa em mais de 3 minutos. O limite é o dos outros testes que percorrem o acervo; o custo é da receita do
         sedã, anotado no fechamento da fatia 4c do plano do núcleo, e não deste teste. */
    }, 900_000);
  }

  /* A REABERTURA PELO CAMINHO LEGÍTIMO NÃO REPROVA A GUARDA: o aceite anulado não é cobrado e o aceite novo não conta como migrado. */
  it('a etapa reaberta, e depois aceita de novo, numa cópia do carrinho de mão, passa na guarda com as origens que sobram', async () => {
    const area = mkdtempSync(join(tmpdir(), 'guarda-reabre-'));
    try {
      const pasta = join(area, 'carrinho-de-mao');
      cpSync(join(ACERVO, 'carrinho-de-mao'), pasta, { recursive: true });
      const montagem = join(pasta, 'montagem.json');
      const maximos = ORIGENS['carrinho-de-mao'];
      const migradas = REFERENCIA['carrinho-de-mao'];
      expect((await conferirEtapasDoAcervo(montagem, { origensMaximas: maximos, migradas })).porOrigem).toEqual({ 'commit do aceite': 4 });
      /* reaberta: a etapa sai das vigentes, e o aceite anulado não é cobrado */
      let registro = await reabrir(montagem, 'roda', 'Ana, 2026-11-17: prova da guarda');
      gravarRegistro(montagem, registro);
      const reaberta = await conferirEtapasDoAcervo(montagem, { origensMaximas: maximos, migradas });
      expect(reaberta.naoFixas).toEqual([]);
      expect(reaberta.porOrigem).toEqual({ 'commit do aceite': 3 });
      /* aceite novo depois dela: vale no lugar, e o conjunto migrado só diminui */
      const { medido } = await estadoDasEtapas(montagem);
      registro = acrescentarAceite(registro, medido, 'roda', { por: 'Ana, 2026-11-17: de novo' });
      gravarRegistro(montagem, registro);
      const refeita = await conferirEtapasDoAcervo(montagem, { origensMaximas: maximos, migradas });
      expect(refeita.naoFixas).toEqual([]);
      expect(refeita.excedidas).toEqual([]);
      expect([refeita.forjados, refeita.sumidos, refeita.orfaos]).toEqual([[], [], []]);
      expect(refeita.porOrigem).toEqual({ 'commit do aceite': 3 });
      expect([...refeita.vigentes.keys()]).toHaveLength(4);
      /* uma origem a mais do que a gravada reprova */
      expect((await conferirEtapasDoAcervo(montagem, { origensMaximas: { 'commit do aceite': 2 } })).excedidas).toEqual(['commit do aceite']);
    } finally { rmSync(area, { recursive: true, force: true }); }
  }, 300_000);

  describe('o evento migrado forjado e o aceite órfão', () => {
    const copiar = () => {
      const area = mkdtempSync(join(tmpdir(), 'guarda-forja-'));
      const pasta = join(area, 'carrinho-de-mao');
      cpSync(join(ACERVO, 'carrinho-de-mao'), pasta, { recursive: true });
      const montagem = join(pasta, 'montagem.json');
      return { area, montagem, registro: join(pasta, 'montagem.etapas.json') };
    };
    const opcoes = { origensMaximas: ORIGENS['carrinho-de-mao'], migradas: REFERENCIA['carrinho-de-mao'] };

    it('o registro do acervo como está passa na lista travada', async () => {
      const { area, montagem } = copiar();
      try {
        const r = await conferirEtapasDoAcervo(montagem, opcoes);
        expect([r.forjados, r.sumidos, r.orfaos, r.naoFixas]).toEqual([[], [], [], []]);
      } finally { rmSync(area, { recursive: true, force: true }); }
    }, 120_000);

    it('forja B: a impressão trocada pela de agora, com a origem de migração mantida, reprova', async () => {
      const { area, montagem, registro } = copiar();
      try {
        const original = JSON.parse(readFileSync(registro, 'utf8'));
        const { medido } = await estadoDasEtapas(montagem);
        const forjado = structuredClone(original);
        forjado.eventos.find((e) => e.instancia === 'cacamba').impressao = { ...imprimirEtapa(medido, 'cacamba'), anteriores: ['chassi', 'pes', 'forjado'] };
        writeFileSync(registro, JSON.stringify(forjado));
        const r = await conferirEtapasDoAcervo(montagem, opcoes);
        expect(r.forjados).toEqual(['cacamba']);
        expect(r.sumidos).toEqual(['cacamba']);
      } finally { rmSync(area, { recursive: true, force: true }); }
    }, 120_000);

    it('forja A: o evento migrado apagado e um aceite novo no lugar, sem reabertura, reprova', async () => {
      const { area, montagem, registro } = copiar();
      try {
        const original = JSON.parse(readFileSync(registro, 'utf8'));
        const { medido } = await estadoDasEtapas(montagem);
        const sem = structuredClone(original);
        sem.eventos = sem.eventos.filter((e) => e.instancia !== 'cacamba');
        writeFileSync(registro, JSON.stringify(acrescentarAceite(sem, medido, 'cacamba', { por: 'forjado' })));
        const r = await conferirEtapasDoAcervo(montagem, opcoes);
        expect(r.sumidos).toEqual(['cacamba']);
        expect(r.forjados).toEqual([]);
      } finally { rmSync(area, { recursive: true, force: true }); }
    }, 120_000);

    it('o aceite vigente de uma instância que a montagem já não tem reprova como órfão', async () => {
      const { area, montagem } = copiar();
      try {
        const m = JSON.parse(readFileSync(montagem, 'utf8'));
        m.etapas = m.etapas.filter((x) => x !== 'roda');
        m.instancias = m.instancias.filter((x) => x.id !== 'roda');
        m.relacoes = []; m.posicoes = m.posicoes.filter((x) => x.instancia !== 'roda');
        delete m.apoioNoChao; delete m.auditoriaIntersecoes;
        m.vinculos = (m.vinculos ?? []).filter((x) => !JSON.stringify(x).includes('roda'));
        writeFileSync(montagem, JSON.stringify(m, null, 2));
        const r = await conferirEtapasDoAcervo(montagem, opcoes);
        expect(r.orfaos).toEqual(['roda']);
      } finally { rmSync(area, { recursive: true, force: true }); }
    }, 120_000);
  });
});
