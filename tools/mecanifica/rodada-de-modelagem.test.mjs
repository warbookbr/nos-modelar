/* rodada-de-modelagem.test.mjs — o registro do laço, de ponta a ponta.
 *
 * A prova que interessa aqui é a sequência inteira: uma peça reprovada nas
 * medidas volta a modelar sem gastar revisão, uma peça julgada com defeitos
 * continua, e o laço só termina por decisão escrita — nunca porque quem conduz
 * achou que estava bom. O registro precisa sobreviver à rodada: veredito que
 * vive só no diálogo some com a janela de contexto.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { proximaAcao } from '../../src/autoria/laco-de-modelagem.js';
import { acaoDaPeca, ajustarImportsDaCopia, gravarRodada, impressaoDaForma, lerRodadas, medirReceita, pastaDeRodadas, registrarMedida } from './rodada-de-modelagem.mjs';
import { pecasDoAcervo } from './guardas/guarda-acervo.mjs';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';

let area;
const ler = (peca) => lerRodadas(peca, { pasta: join(area, peca) });
const gravar = (peca, entrada) => gravarRodada(peca, entrada, { pasta: join(area, peca) });

const veredito = (quantos, nota = 6) => ({
  alvo: 'referencias/lateral.png',
  nota,
  defeitos: Array.from({ length: quantos }, (_, i) => ({
    parte: `parte${i}`, tipo: 'angulo', onde: 'extremidade superior', sentido: 'menor',
    evidencia: 'na vista lateral a linha do alvo nao coincide com a do modelo',
  })),
  observacao: 'a silhueta geral bate e alguns trechos saem da linha do alvo',
});

/* A pasta real do repositório não é área de teste: gravar rodada de ensaio no
   histórico deixaria evidência de algo que nunca aconteceu. */
beforeEach(() => { area = mkdtempSync(join(tmpdir(), 'rodadas-')); });

afterEach(() => rmSync(area, { recursive: true, force: true }));

const CONFERIDAS = [{ nome: 'corpo', confere: true }];

describe('registro de rodadas', () => {
  it('grava cada rodada num arquivo próprio, numerado e não reescrito', () => {
    const { arquivo } = gravar('peca-de-ensaio', {
      partes: CONFERIDAS,
      medidas: { passou: true, relatorio: 'guarda:acervo ok' },
      veredito: veredito(2),
    });
    expect(existsSync(arquivo)).toBe(true);
    expect(arquivo).toMatch(/rodada-01\.json$/);
    const gravado = JSON.parse(readFileSync(arquivo, 'utf8'));
    expect(gravado.veredito.defeitos).toHaveLength(2);

    gravar('peca-de-ensaio', { partes: CONFERIDAS, medidas: { passou: false, relatorio: 'contato aberto' } });
    expect(ler('peca-de-ensaio').map((r) => r.numero)).toEqual([1, 2]);
  });

  it('a sequência inteira decide sozinha, e termina com motivo escrito', () => {
    const peca = 'peca-de-ensaio';
    expect(proximaAcao(ler(peca)).acao).toBe('modelar');

    /* Rodada 1: as medidas reprovam, então nem se chama revisão. */
    gravar(peca, { partes: CONFERIDAS, medidas: { passou: false, relatorio: 'contato declarado que nao acontece' } });
    expect(proximaAcao(ler(peca))).toMatchObject({ acao: 'modelar' });

    /* Rodada 2: medidas passam e ainda não houve julgamento. */
    gravar(peca, { partes: CONFERIDAS, medidas: { passou: true, relatorio: 'guarda:acervo ok' } });
    expect(proximaAcao(ler(peca)).acao).toBe('revisar');

    /* Rodada 3: três defeitos apontados; volta a modelar com eles na mão. */
    gravar(peca, { partes: CONFERIDAS, medidas: { passou: true, relatorio: 'ok' }, veredito: veredito(3) });
    expect(proximaAcao(ler(peca)).acao).toBe('modelar');
    expect(ler(peca).at(-1).veredito.defeitos).toHaveLength(3);

    /* Rodada 4: um defeito restante. Ainda não fecha. */
    gravar(peca, { partes: CONFERIDAS, medidas: { passou: true, relatorio: 'ok' }, veredito: veredito(1) });
    expect(proximaAcao(ler(peca)).acao).toBe('modelar');

    /* Rodada 5: nenhum defeito e nota alta. Só aqui o laço fecha. */
    gravar(peca, { partes: CONFERIDAS, medidas: { passou: true, relatorio: 'ok' }, veredito: veredito(0, 9) });
    const fim = proximaAcao(ler(peca));
    expect(fim.acao).toBe('parar-fechou');
    expect(fim.motivo).toMatch(/nota 9/);

    /* O registro guarda o que motivou cada correção, e não só o fim. */
    const historia = ler(peca);
    expect(historia.map((r) => r.veredito?.defeitos.length ?? null)).toEqual([null, null, 3, 1, 0]);
  });

  it('recusa nome de peça que não serve de pasta, mesmo com a pasta injetada', () => {
    expect(() => ler('../fora')).toThrow(/não é nome de peça/);
    expect(() => gravar('Peça Com Espaço', { partes: CONFERIDAS, medidas: { passou: true } }))
      .toThrow(/não é nome de peça/);
    expect(() => pastaDeRodadas('../fora')).toThrow(/não é nome de peça/);
  });

  /* A peça é lida do acervo e não nomeada; com o acervo sem peça — o que
     `guarda:acervo` só aceita declarado — não há pasta de peça para apontar, e
     o caso volta sozinho com a próxima peça. */
  it.skipIf(pecasDoAcervo().length === 0)('a rodada mora DENTRO da pasta da peça quando a peça é uma pasta', () => {
    /* O registro fica ao lado da receita que ele julgou, e não numa árvore de
       documentação que quem abre a peça não vê. A peça usada é a que estiver no
       acervo, e não um nome escrito aqui: nome escrito faz o teste cair no
       caminho de fallback quando aquela peça sair, e aí ele afirma o contrário
       do que promete sem ninguém notar. */
    const [peca] = pecasDoAcervo();
    expect(pastaDeRodadas(peca)).toBe(join(dirname(resolverCaminhoReceita(peca)), 'rodadas'));
    expect(pastaDeRodadas(peca).replaceAll('\\', '/')).toMatch(/procedural\/pecas\//);
  });

  it('peça que não existe, ou que é arquivo solto, grava no lugar antigo', () => {
    /* Registro de peça anterior à pasta não muda de lugar: evidência não se
       move para caber numa arrumação nova. */
    expect(pastaDeRodadas('peca-que-nunca-existiu').replaceAll('\\', '/'))
      .toMatch(/docs\/mecanifica\/historico\/rodadas\/peca-que-nunca-existiu$/);
  });
});

/* O que a rodada TENTOU e POR QUÊ. A receita mostra só o estado final; o
   modelador da etapa seguinte é outro agente e precisa ler o que mudou em cada
   rodada e o motivo, sem depender de ninguém lembrar de escrever. */
describe('diferença da receita e nota de passagem', () => {
  const entrada = (extra = {}) => ({ partes: CONFERIDAS, medidas: { passou: false, relatorio: 'junta reprovada' }, ...extra });
  const gravarCom = (texto, extra) => gravarRodada('peca-de-ensaio', entrada(extra), { pasta: join(area, 'peca-de-ensaio'), receitaTexto: texto });

  it('a ferramenta grava o que mudou na receita desde a rodada anterior', () => {
    const primeira = gravarCom('const TABELA = {\n  raioDoFuro: 20,\n};\n').rodada;
    expect(primeira.receita.diferenca.primeira).toBe(true);
    const segunda = gravarCom('const TABELA = {\n  raioDoFuro: 20.5,\n};\n').rodada;
    expect(segunda.receita.sha256).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(segunda.receita.sha256).not.toBe(primeira.receita.sha256);
    expect(segunda.receita.diferenca).toMatchObject({ primeira: false, removidas: 1, acrescentadas: 1, cortada: false });
    expect(segunda.receita.diferenca.linhas).toEqual([
      { tipo: '-', linha: 2, texto: '  raioDoFuro: 20,' },
      { tipo: '+', linha: 2, texto: '  raioDoFuro: 20.5,' },
    ]);
  });

  it('guarda a nota de passagem e recusa nota vazia', () => {
    const { rodada } = gravarCom('x', { notaDePassagem: '  folga de 0,2 porque o pino é retificado  ' });
    expect(rodada.notaDePassagem).toBe('folga de 0,2 porque o pino é retificado');
    expect(() => gravarCom('x', { notaDePassagem: '   ' })).toThrow(/notaDePassagem/);
  });
});

describe('limite de rodadas estendido por escrito', () => {
  it('sem arquivo vale o limite de sempre; com arquivo válido vale o escrito; sem autor ou motivo recusa', async () => {
    const { limiteDaPeca } = await import('./rodada-de-modelagem.mjs');
    const { LIMITE_DE_RODADAS } = await import('../../src/autoria/laco-de-modelagem.js');
    const { writeFileSync } = await import('node:fs');
    expect(limiteDaPeca('peca-x', { pasta: area })).toBe(LIMITE_DE_RODADAS);
    writeFileSync(join(area, 'limite.json'), JSON.stringify({ limite: 7, por: 'pessoa', motivo: 'fechar o bico de trás' }));
    expect(limiteDaPeca('peca-x', { pasta: area })).toBe(7);
    writeFileSync(join(area, 'limite.json'), JSON.stringify({ limite: 7 }));
    expect(() => limiteDaPeca('peca-x', { pasta: area })).toThrow(/quem decidiu/);
  });
});

describe('cópia da receita em rodadas/', () => {
  it('desce um nível nos imports relativos e deixa os de pacote como estão', () => {
    const texto = "import { BLOCO } from '../../../../nucleo/entrada.js';\nimport x from './vizinho.js';\nimport * as T from 'three';\n";
    expect(ajustarImportsDaCopia(texto)).toBe("import { BLOCO } from '../../../../../nucleo/entrada.js';\nimport x from '.././vizinho.js';\nimport * as T from 'three';\n");
  });
});

/* A TRAVA: a medição é da ferramenta, sobre a receita atual identificada pelo hash. Peças reais de `tools/fixtures/refina-forma-global/`
   (o suporte que passa, o que sai do envelope do andaime, o que sai do contorno) medem de verdade; a rodada grava na área de teste. */
describe('a medição da receita atual trava o laço', () => {
  const FIXTURES = 'tools/fixtures/refina-forma-global';
  const fixture = (variante) => `${FIXTURES}/${variante}/receita.js`;
  const medirFixture = (variante) => () => medirReceita(fixture(variante));
  const PECA = 'peca-de-ensaio';
  const entrada = (extra = {}) => ({ partes: CONFERIDAS, ...extra });

  it('mede com o veredito, as guardas do acervo e do referencial, e identifica a receita pelo hash do texto', async () => {
    const ok = await medirReceita(fixture('ok'));
    expect(ok).toMatchObject({ passou: true, relatorio: 'descrever (veredito), guarda:acervo, guarda:referencial: ok' });
    expect(ok.sha256).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(ok.texto).toBe(readFileSync(resolverCaminhoReceita(fixture('ok')), 'utf8'));
    const fora = await medirReceita(fixture('parte-fora'));
    expect(fora.passou).toBe(false);
    expect(fora.sha256).not.toBe(ok.sha256);
    expect(fora.relatorio).toContain("a parte 'sapata' sai do envelope do volume 'sapata' em +x por 30 mm");
    const contorno = await medirReceita(fixture('contorno-parte-fora'));
    expect(contorno.passou).toBe(false);
    expect(contorno.relatorio).toContain('a parte "sapata" da peça desvia 29,9 mm da referência');
    expect(await medirReceita(fixture('ok'))).toEqual(ok);
  });

  it('--acao devolve modelar enquanto a medição da receita atual não passar, ainda que a última rodada tenha fechado', async () => {
    gravar(PECA, entrada({ medidas: { passou: true, relatorio: 'ok' }, veredito: veredito(0, 9) }));
    expect(proximaAcao(ler(PECA)).acao).toBe('parar-fechou');
    const reprovada = await acaoDaPeca(PECA, { rodadas: ler(PECA), medir: medirFixture('parte-fora') });
    expect(reprovada.acao).toBe('modelar');
    expect(reprovada.motivo).toContain('a medição da receita atual');
    expect(reprovada.motivo).toContain("a parte 'sapata' sai do envelope do volume 'sapata'");
    expect(reprovada.medicao.passou).toBe(false);
    /* com a medição passando, a receita é outra que a da rodada: o fechamento era da versão anterior */
    const passando = await acaoDaPeca(PECA, { rodadas: ler(PECA), medir: medirFixture('ok') });
    expect(passando.acao).toBe('parar-fechou');
  });

  it('a receita gravada na rodada vale como a medida: receita igual segue as rodadas, receita nova pede o crítico', async () => {
    const { rodada } = await registrarMedida(PECA, entrada({ veredito: veredito(0, 9) }), { pasta: join(area, PECA), medir: medirFixture('ok') });
    expect(rodada.receita.sha256).toBe((await medirReceita(fixture('ok'))).sha256);
    expect(rodada.medidas).toEqual({ passou: true, relatorio: 'descrever (veredito), guarda:acervo, guarda:referencial: ok' });
    const igual = await acaoDaPeca(PECA, { rodadas: ler(PECA), medir: medirFixture('ok') });
    expect(igual.acao).toBe('parar-fechou');
    const nova = await acaoDaPeca(PECA, { rodadas: ler(PECA), medir: medirFixture('g01-ok') });
    expect(nova.acao).toBe('revisar');
    expect(nova.motivo).toContain('a receita mudou depois da rodada 1');
  });

  it('a receita que mudou fora da malha e do PLANO segue as rodadas, e a que mudou a malha pede o crítico', async () => {
    expect(await impressaoDaForma(fixture('g01-ok'))).toBe(await impressaoDaForma(fixture('ok')));
    expect(await impressaoDaForma(fixture('sapata-deslocada'))).not.toBe(await impressaoDaForma(fixture('ok')));
    const pasta = join(area, PECA);
    await registrarMedida(PECA, entrada({ veredito: veredito(0, 9) }), { pasta, medir: medirFixture('ok') });
    /* a cópia que a rodada guarda importa a partir da pasta rodadas/ da peça; aqui ela mora fora, e o import vai absoluto */
    writeFileSync(join(pasta, 'receita-01.js'), readFileSync(fixture('ok'), 'utf8').replace("'../suporte.js'", `'${resolve(FIXTURES, 'suporte.js')}'`));
    const mesma = await acaoDaPeca(PECA, { rodadas: ler(PECA), medir: medirFixture('g01-ok'), pasta });
    expect(mesma.acao).toBe('parar-fechou');
    expect(mesma.motivo).toContain('mas produz a mesma malha e o mesmo PLANO que o crítico julgou');
    const outra = await acaoDaPeca(PECA, { rodadas: ler(PECA), medir: medirFixture('sapata-deslocada'), pasta });
    expect(outra.medicao.passou).toBe(true);
    expect(outra.acao).toBe('revisar');
    expect(outra.motivo).toContain('falta o crítico julgar esta');
  });

  it('--registrar recusa o veredito do crítico quando a medição reprovou, e não grava nada', async () => {
    const pasta = join(area, PECA);
    await expect(registrarMedida(PECA, entrada({ veredito: veredito(1) }), { pasta, medir: medirFixture('contorno-parte-fora') }))
      .rejects.toThrow(/o veredito do crítico não se registra: a medição da receita atual \(sha256:[0-9a-f]{8}\) reprovou/);
    await expect(registrarMedida(PECA, entrada({ veredito: veredito(1) }), { pasta, medir: medirFixture('contorno-parte-fora') }))
      .rejects.toThrow(/a parte "sapata" da peça desvia 29,9 mm/);
    expect(existsSync(pasta)).toBe(false);
  });

  it('--registrar sem veredito grava o relatório da falha, e a ação seguinte é modelar', async () => {
    const pasta = join(area, PECA);
    const { rodada } = await registrarMedida(PECA, entrada(), { pasta, medir: medirFixture('parte-fora') });
    expect(rodada.veredito).toBeNull();
    expect(rodada.medidas.passou).toBe(false);
    expect(rodada.medidas.relatorio).toContain("a parte 'sapata' sai do envelope");
    expect((await acaoDaPeca(PECA, { rodadas: ler(PECA), medir: medirFixture('parte-fora') })).acao).toBe('modelar');
  });

  it('--registrar recusa as medidas que a sessão declara quando a ferramenta mede outra coisa', async () => {
    const pasta = join(area, PECA);
    await expect(registrarMedida(PECA, entrada({ medidas: { passou: true, relatorio: 'guarda:acervo ok' } }), { pasta, medir: medirFixture('parte-fora') }))
      .rejects.toThrow(/as medidas declaradas dizem que passou e a ferramenta mediu a receita atual .* como reprovada.*A medição é da ferramenta/s);
    expect(existsSync(pasta)).toBe(false);
    /* a declaração que concorda com a ferramenta é aceita, e vale a medição dela */
    const { rodada } = await registrarMedida(PECA, entrada({ medidas: { passou: true, relatorio: 'à mão' }, veredito: veredito(0, 9) }), { pasta, medir: medirFixture('ok') });
    expect(rodada.medidas.relatorio).toBe('descrever (veredito), guarda:acervo, guarda:referencial: ok');
  });

  it.skipIf(pecasDoAcervo().length === 0)('a linha de comando mede a receita atual da peça do acervo e diz o hash e o resultado antes da ação', () => {
    const [peca] = pecasDoAcervo();
    const r = spawnSync(process.execPath, ['tools/mecanifica/rodada-de-modelagem.mjs', peca, '--acao'], { encoding: 'utf8' });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/medição da receita atual \(sha256:[0-9a-f]{8}\): (passou|reprovou)\npróxima ação: (modelar|revisar|parar-[a-z-]+) — /);
  }, 60000);

  it('a peça sem receita não tem medição, e a rodada não se registra', async () => {
    await expect(registrarMedida(PECA, entrada({ veredito: veredito(0, 9) }), { pasta: join(area, PECA), medir: () => medirReceita('peca-que-nunca-existiu') }))
      .rejects.toThrow(/não consegui medir a receita de 'peca-de-ensaio'.*sem medição a rodada não se registra/);
    const sem = await acaoDaPeca(PECA, { rodadas: [], limite: 6, medir: () => medirReceita('peca-que-nunca-existiu') });
    expect(sem).toMatchObject({ acao: 'modelar', medicao: null });
  });
});
