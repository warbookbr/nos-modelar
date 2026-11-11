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
import { acaoDaPeca, ajustarImportsDaCopia, blocoDaPeca, contradicoesEntreRodadas, entradaDosArquivos, normalizarRelatoDoModelador, resumoDoLaco, gravarRodada, impressaoDaForma, lerArgumentos, lerRodadas, medirReceita, pastaDeRodadas, registrarMedida, textoFinalDoAssistente, ultimoBlocoJson } from './rodada-de-modelagem.mjs';
import { normalizarVeredito } from '../../src/autoria/veredito-de-forma.js';
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
      .toMatch(/docs\/modelar\/historico\/rodadas\/peca-que-nunca-existiu$/);
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
    const r = spawnSync(process.execPath, ['tools/modelar/rodada-de-modelagem.mjs', peca, '--acao'], { encoding: 'utf8' });
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

/* A RODADA LIDA DIRETO DO QUE OS AGENTES DEVOLVERAM. As fixtures são pequenas e sintéticas, nos dois formatos que o comando reconhece:
   texto puro e a transcrição JSONL do harness (um bloco da resposta por linha, com thinking, tool_use e dois textos na última mensagem). */
describe('a rodada lida dos arquivos dos agentes', () => {
  const PASTA = 'tools/fixtures/rodada-dos-agentes';
  const f = (nome) => `${PASTA}/${nome}`;
  const blocoDoCritico = ultimoBlocoJson(readFileSync(f('critico-texto.txt'), 'utf8'));
  const blocoDoModelador = ultimoBlocoJson(readFileSync(f('modelador-texto.txt'), 'utf8'));
  const escrever = (nome, texto) => { const caminho = join(area, nome); writeFileSync(caminho, texto, 'utf8'); return caminho; };
  const comBloco = (objeto) => `Conferi.\n\n\`\`\`json\n${JSON.stringify(objeto)}\n\`\`\`\n`;

  it('reconhece o texto puro e a transcrição JSONL, e pega o último bloco do último texto do assistente', () => {
    const puro = textoFinalDoAssistente(readFileSync(f('critico-texto.txt'), 'utf8'));
    const transcricao = textoFinalDoAssistente(readFileSync(f('critico-transcricao.jsonl'), 'utf8'));
    expect(puro.formato).toBe('texto');
    expect(transcricao.formato).toBe('transcrição');
    /* o bloco citado no texto anterior (nota 3) e o citado no meio do último texto não são a resposta */
    expect(ultimoBlocoJson(puro.texto)).toEqual(blocoDoCritico);
    expect(ultimoBlocoJson(transcricao.texto)).toEqual(blocoDoCritico);
    expect(blocoDoCritico.nota).toBe(7);
    expect(ultimoBlocoJson(textoFinalDoAssistente(readFileSync(f('modelador-transcricao.jsonl'), 'utf8')).texto)).toEqual(blocoDoModelador);
  });

  it('a transcrição sem bloco no último texto é recusada, dizendo isso e o arquivo, ainda que um texto anterior tenha bloco', () => {
    const arquivo = f('critico-transcricao-sem-bloco.jsonl');
    expect(() => entradaDosArquivos({ modelador: f('modelador-texto.txt'), critico: arquivo }))
      .toThrow(new RegExp(`${arquivo}: o último texto do crítico não tem bloco`));
    const vazia = escrever('so-usuario.jsonl', `${JSON.stringify({ type: 'user', message: { role: 'user', content: 'brief' } })}\n`);
    expect(() => textoFinalDoAssistente(readFileSync(vazia, 'utf8'), { arquivo: vazia })).toThrow(/não tem nenhum texto do assistente/);
  });

  it('o relato entregue pela ferramenta de devolução, sem bloco de texto, vale como o último texto do agente', () => {
    const relato = 'Li as vistas.\n\n```json\n{ "alvo": "a.png", "nota": 6, "defeitos": [] }\n```';
    const linhas = [
      { type: 'user', message: { role: 'user', content: 'pedido' } },
      { type: 'assistant', message: { id: 'm1', role: 'assistant', content: [{ type: 'text', text: 'Vou abrir as imagens.' }] } },
      { type: 'assistant', message: { id: 'm2', role: 'assistant', content: [{ type: 'tool_use', name: 'Read', input: { file_path: 'a.png' } }] } },
      { type: 'assistant', message: { id: 'm3', role: 'assistant', content: [{ type: 'tool_use', name: 'SubagentHandback', input: { message: relato } }] } },
      { type: 'user', message: { role: 'user', content: [{ type: 'tool_result', content: 'ok' }] } },
    ];
    const arquivo = escrever('critico-devolucao.jsonl', `${linhas.map((l) => JSON.stringify(l)).join('\n')}\n`);
    const lido = textoFinalDoAssistente(readFileSync(arquivo, 'utf8'), { arquivo });
    expect(lido.formato).toBe('transcrição');
    expect(ultimoBlocoJson(lido.texto)).toEqual({ alvo: 'a.png', nota: 6, defeitos: [] });
  });

  it('o bloco que não é JSON válido é recusado com o arquivo', () => {
    const quebrado = escrever('modelador-quebrado.txt', 'Conferi.\n\n```json\n{ "partes": [ }\n```\n');
    expect(() => entradaDosArquivos({ modelador: quebrado })).toThrow(new RegExp(`${quebrado}: o último bloco .*não é JSON válido`));
  });

  it('monta a entrada igual nos dois formatos: o veredito é o bloco do crítico sem mudar, e o atrito de quem conduz vem depois', () => {
    const entradaTexto = entradaDosArquivos({ modelador: f('modelador-texto.txt'), critico: f('critico-texto.txt'), atrito: ['o defeito foi do plano'] });
    const entradaJsonl = entradaDosArquivos({ modelador: f('modelador-transcricao.jsonl'), critico: f('critico-transcricao.jsonl'), atrito: ['o defeito foi do plano'] });
    expect(entradaJsonl).toEqual(entradaTexto);
    expect(entradaTexto.veredito).toEqual(blocoDoCritico);
    expect(entradaTexto.partes).toEqual(blocoDoModelador.partes);
    expect(entradaTexto.notaDePassagem).toBe(blocoDoModelador.notaDePassagem);
    expect(entradaTexto.atrito).toEqual([...blocoDoModelador.atrito, 'o defeito foi do plano']);
  });

  it('sem --critico a entrada não tem veredito, e sem --modelador não há entrada', () => {
    expect(entradaDosArquivos({ modelador: f('modelador-texto.txt') })).not.toHaveProperty('veredito');
    expect(() => entradaDosArquivos({ critico: f('critico-texto.txt') })).toThrow(/falta --modelador/);
    expect(() => entradaDosArquivos({ modelador: join(area, 'nao-existe.txt') })).toThrow(/nao-existe\.txt: não consegui ler o arquivo do modelador/);
  });

  it('o erro de validação diz de qual arquivo e de qual campo veio', () => {
    const longa = 'x'.repeat(241);
    const atritoLongo = escrever('modelador-atrito.txt', comBloco({ ...blocoDoModelador, atrito: [longa] }));
    expect(() => entradaDosArquivos({ modelador: atritoLongo })).toThrow(new RegExp(`^${atritoLongo}, campo atrito\\[0\\]: 'atrito\\[0\\]' excede 240`));
    /* a frase de quem conduz: o erro aponta o --atrito, pela ordem em que foi dado */
    expect(() => entradaDosArquivos({ modelador: f('modelador-texto.txt'), atrito: ['curta', longa] }))
      .toThrow(/^--atrito nº 2: 'atrito\[2\]' excede 240/);
    const semPartes = escrever('modelador-sem-partes.txt', comBloco({ atrito: [], notaDePassagem: 'nota' }));
    expect(() => entradaDosArquivos({ modelador: semPartes })).toThrow(new RegExp(`^${semPartes}, campo partes: a rodada precisa trazer 'partes'`));
    const observacaoLonga = escrever('modelador-observacao.txt', comBloco({ partes: [{ nome: 'corpo', confere: false, observacao: longa }] }));
    expect(() => entradaDosArquivos({ modelador: observacaoLonga })).toThrow(new RegExp(`^${observacaoLonga}, campo partes: 'partes\\[0\\]\\.observacao' não passa de 240`));
    const notaLonga = escrever('modelador-nota.txt', comBloco({ ...blocoDoModelador, notaDePassagem: 'n'.repeat(601) }));
    expect(() => entradaDosArquivos({ modelador: notaLonga })).toThrow(new RegExp(`^${notaLonga}, campo notaDePassagem: 'notaDePassagem' não passa de 600`));
    const vereditoRuim = escrever('critico-ruim.txt', comBloco({ ...blocoDoCritico, nota: 11 }));
    expect(() => entradaDosArquivos({ modelador: f('modelador-texto.txt'), critico: vereditoRuim })).toThrow(new RegExp(`^${vereditoRuim}, bloco do veredito: `));
  });

  it('recusa no bloco do modelador o que não é dele', () => {
    const alheio = escrever('modelador-com-veredito.txt', comBloco({ ...blocoDoModelador, veredito: blocoDoCritico, medidas: { passou: true } }));
    expect(() => entradaDosArquivos({ modelador: alheio })).toThrow(new RegExp(`^${alheio}: o bloco do modelador traz 'veredito', 'medidas'`));
  });

  it('grava a rodada com o veredito idêntico ao bloco do crítico, e a medição da ferramenta continua valendo', async () => {
    const FIXTURES = 'tools/fixtures/refina-forma-global';
    const pasta = join(area, 'peca-de-ensaio');
    const entrada = entradaDosArquivos({ modelador: f('modelador-transcricao.jsonl'), critico: f('critico-transcricao.jsonl'), atrito: ['atribuição de quem conduz'] });
    const { rodada, arquivo } = await registrarMedida('peca-de-ensaio', entrada, { pasta, medir: () => medirReceita(`${FIXTURES}/ok/receita.js`) });
    const gravada = JSON.parse(readFileSync(arquivo, 'utf8'));
    expect(JSON.stringify(gravada.veredito)).toBe(JSON.stringify(normalizarVeredito(blocoDoCritico)));
    expect(gravada.partes.map((p) => p.nome)).toEqual(['sapata', 'corpo']);
    expect(rodada.atrito).toEqual([...blocoDoModelador.atrito, 'atribuição de quem conduz']);
    expect(rodada.medidas.passou).toBe(true);
    /* a recusa do veredito quando a medição reprova vale também para esta forma */
    await expect(registrarMedida('peca-de-ensaio', entrada, { pasta: join(area, 'outra'), medir: () => medirReceita(`${FIXTURES}/parte-fora/receita.js`) }))
      .rejects.toThrow(/o veredito do crítico não se registra/);
  }, 60000);

  it('lê os argumentos: --atrito repete, --registrar aceita arquivo ou nenhum, e a peça pode vir depois das opções', () => {
    expect(lerArgumentos(['aviao/partes/x', '--registrar', '--modelador', 'm.txt', '--critico', 'c.jsonl', '--atrito', 'um', '--atrito', 'dois']))
      .toEqual({ peca: 'aviao/partes/x', opcoes: { atrito: ['um', 'dois'], registrar: true, modelador: 'm.txt', critico: 'c.jsonl' } });
    expect(lerArgumentos(['p', '--registrar', 'rodada.json']).opcoes.registrar).toBe('rodada.json');
    expect(lerArgumentos(['--registrar', '--modelador', 'm.txt', 'p']).peca).toBe('p');
    expect(() => lerArgumentos(['p', '--registrar', '--modelador'])).toThrow(/--modelador pede um valor/);
  });

  it('a linha de comando recusa misturar as duas formas e pede uma delas', () => {
    const roda = (...args) => spawnSync(process.execPath, ['tools/modelar/rodada-de-modelagem.mjs', ...args], { encoding: 'utf8' });
    const mistura = roda('peca-de-ensaio', '--registrar', 'rodada.json', '--modelador', f('modelador-texto.txt'));
    expect(mistura.status).toBe(1);
    expect(mistura.stderr).toContain('formas diferentes');
    const nada = roda('peca-de-ensaio', '--registrar');
    expect(nada.status).toBe(1);
    expect(nada.stderr).toContain('--registrar precisa de');
    const semArquivo = roda('peca-de-ensaio', '--registrar', '--modelador', join(area, 'nao-existe.txt'));
    expect(semArquivo.status).toBe(1);
    expect(semArquivo.stderr).toContain('não consegui ler o arquivo do modelador');
  }, 60000);
});

describe('a impressão da forma e os afastamentos declarados', () => {
  it('a mesma malha com afastamento declarado no REFINA tem outra impressão, e a sem afastamento não muda', async () => {
    const { impressaoDaForma } = await import('./rodada-de-modelagem.mjs');
    const pasta = 'tools/fixtures/forma-do-esboco';
    const semDeclarar = await impressaoDaForma(`${pasta}/deslocada/receita.js`);
    const declarada = await impressaoDaForma(`${pasta}/deslocada-declarada/receita.js`);
    expect(semDeclarar).toMatch(/^sha256:/);
    expect(declarada).toMatch(/^sha256:/);
    expect(declarada).not.toBe(semDeclarar);
    expect(await impressaoDaForma(`${pasta}/deslocada/receita.js`)).toBe(semDeclarar);
  });
});

describe('o alvo do veredito fica no repositório', async () => {
  const { alvoDoRepositorio } = await import('./rodada-de-modelagem.mjs');
  const { mkdtempSync, writeFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const raiz = '/repo';
  it('passa texto que não é caminho e torna relativo o caminho absoluto, inclusive o de pasta de trabalho de agente', () => {
    expect(alvoDoRepositorio('sem alvo: o plano não cita imagem', raiz)).toBe('sem alvo: o plano não cita imagem');
  });
  it('recusa o alvo em pasta que o CI não tem', () => {
    expect(() => alvoDoRepositorio('/repo/tools/bancadas/out/critica-x/vista.png', raiz)).toThrow(/não é um arquivo do repositório/);
    expect(() => alvoDoRepositorio('/fora/imagem.png', raiz)).toThrow(/não é um arquivo do repositório/);
    /* em 2026-11-11 um crítico escreveu "sem referência; comparado com o pedido.md de .../tools/bancadas/out/...": o texto passou, e o CI reprovou o link */
    expect(() => alvoDoRepositorio('sem referência; comparado com o pedido.md de /repo/tools/bancadas/out/critica-x/pedido.md', raiz)).toThrow(/pasta que o CI não tem/);
    /* a imagem que existe fora do repositório é a referência externa, e só o nome dela é gravado */
    const fora = mkdtempSync(`${tmpdir()}/alvo-externo-`);
    writeFileSync(`${fora}/lado.png`, 'x');
    expect(alvoDoRepositorio(`${fora}/lado.png`, raiz)).toBe('referência externa, fora do repositório: lado.png');
  });
});

describe('o relato de várias peças num texto só', () => {
  const bloco = (objeto) => `\`\`\`json\n${JSON.stringify(objeto)}\n\`\`\``;
  const relato = [
    'Entreguei três peças.', '', '**banco**:', bloco({ partes: [{ nome: 'assento', confere: true }] }), '',
    '`roda-traseira`', bloco({ partes: [{ nome: 'aro', confere: true }] }), '', '## carcaca:', bloco({ partes: [{ nome: 'chassi', confere: true }] }),
  ].join('\n');

  it('escolhe o bloco precedido do nome da peça, tolerando crases, negrito, título e dois-pontos', () => {
    expect(blocoDaPeca(relato, 'empilhadeira/banco').partes[0].nome).toBe('assento');
    expect(blocoDaPeca(relato, 'empilhadeira/roda-traseira').partes[0].nome).toBe('aro');
    expect(blocoDaPeca(relato, 'carcaca').partes[0].nome).toBe('chassi');
  });

  it('com um bloco só, ou com vários sem nome, vale o último; com nomes e nenhum da peça, recusa dizendo os nomes', () => {
    expect(blocoDaPeca(`texto\n\nbanco\n${bloco({ a: 1 })}`, 'obj/outra')).toEqual({ a: 1 });
    expect(blocoDaPeca(`citei o anterior\n${bloco({ a: 1 })}\n\na resposta é esta\n${bloco({ a: 2 })}`, 'obj/outra')).toEqual({ a: 2 });
    expect(() => blocoDaPeca(relato, 'empilhadeira/garfo', { arquivo: 'm.txt', papel: 'modelador' }))
      .toThrow(/^m\.txt: o texto do modelador tem 3 blocos .*nenhum nomeado 'garfo'; os nomes achados são 'banco', 'roda-traseira', 'carcaca'/);
  });

  it('normaliza o confere em texto e o atrito em frase única sem perder o dado', () => {
    expect(normalizarRelatoDoModelador({
      partes: [{ nome: 'a', confere: 'sim, com o raio de 8 mm' }, { nome: 'b', confere: 'não: falta a aba' }, { nome: 'c', confere: 'sim' }, { nome: 'd', confere: true }],
      atrito: 'a família não aceita o ombro largo',
    })).toEqual({
      partes: [{ nome: 'a', confere: true, observacao: 'sim, com o raio de 8 mm' }, { nome: 'b', confere: false, observacao: 'não: falta a aba' },
        { nome: 'c', confere: true }, { nome: 'd', confere: true }],
      atrito: ['a família não aceita o ombro largo'],
    });
  });

  it('a entrada dos arquivos usa o bloco da peça e passa na validação depois de normalizar', () => {
    const arquivo = join(area, 'modelador-varias.txt');
    writeFileSync(arquivo, `${relato}\n\nbanco\n${bloco({ partes: [{ nome: 'encosto', confere: 'sim, sem abas' }], atrito: 'uma frase só' })}\n`, 'utf8');
    const entrada = entradaDosArquivos({ modelador: arquivo, peca: 'empilhadeira/banco' });
    expect(entrada.partes).toEqual([{ nome: 'encosto', confere: true, observacao: 'sim, sem abas' }]);
    expect(entrada.atrito).toEqual(['uma frase só']);
    expect(() => entradaDosArquivos({ modelador: arquivo, peca: 'empilhadeira/volante' })).toThrow(/nenhum nomeado 'volante'/);
  });
});

describe('a data da rodada', () => {
  it('grava a data e a hora do registro em ISO e UTC, e a rodada antiga sem data continua lida', () => {
    const pasta = join(area, 'datada');
    const { rodada } = gravarRodada('datada', { partes: CONFERIDAS, medidas: { passou: true, relatorio: 'ok' } }, { pasta, receitaTexto: null, agora: () => '2026-11-11T12:00:00.000Z' });
    expect(rodada.registradaEm).toBe('2026-11-11T12:00:00.000Z');
    const segunda = gravarRodada('datada', { partes: CONFERIDAS, medidas: { passou: true, relatorio: 'ok' } }, { pasta, receitaTexto: null }).rodada;
    expect(segunda.registradaEm).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    writeFileSync(join(pasta, 'rodada-03.json'), JSON.stringify({ ...segunda, numero: 3, registradaEm: undefined }), 'utf8');
    expect(lerRodadas('datada', { pasta }).map((r) => r.registradaEm ?? null)).toEqual(['2026-11-11T12:00:00.000Z', segunda.registradaEm, null]);
  });
});

describe('a contradição e a repetição entre rodadas', () => {
  const defeito = (parte, tipo, sentido, onde, evidencia = 'na vista lateral a linha do alvo passa por fora') => ({ parte, tipo, sentido, onde, evidencia });
  const rodada = (numero, defeitos, atrito = []) => ({ numero, medidas: { passou: true }, veredito: { nota: 6, defeitos }, atrito });

  it('acusa o sentido oposto na mesma parte e no mesmo lugar, e a repetição do que foi atribuído ao plano', () => {
    const rodadas = [
      rodada(1, [defeito('pino', 'comprimento', 'maior', 'ponta de cima do pino'), defeito('base', 'uniao', 'afastado', 'borda de baixo da base, sobre a tampa', 'fresta escura sob a borda')],
        ['rodada 1, fresta sob a borda da base: e a folga de 0,5 mm; atribuido ao plano da montagem']),
      rodada(2, [defeito('pino', 'comprimento', 'menor', 'ponta de cima do pino'), defeito('base', 'uniao', 'afastado', 'borda de baixo da base, lado da frente'),
        defeito('pino', 'espessura', 'menor', 'meio do pino'), defeito('aba', 'comprimento', 'menor', 'ponta de cima')]),
    ];
    const achados = contradicoesEntreRodadas(rodadas);
    expect(achados).toEqual([
      { caso: 'contradicao', rodada: 2, rodadaAnterior: 1, parte: 'pino', agora: 'comprimento menor em ponta de cima do pino', antes: 'comprimento maior em ponta de cima do pino' },
      { caso: 'repeticao', rodada: 2, rodadaAnterior: 1, parte: 'base', agora: 'uniao afastado em borda de baixo da base, lado da frente',
        antes: rodadas[0].atrito[0], atribuicao: 'plano' },
    ]);
    const resumo = resumoDoLaco('obj/peca', { rodadas, decisao: { acao: 'modelar', motivo: 'x', medicao: null } });
    expect(resumo).toContain('contradições e repetições:');
    expect(resumo).toContain('rodada 2, pino: "comprimento menor em ponta de cima do pino" contradiz a rodada 1');
    expect(resumo).toContain('repete o que a rodada 1 atribuiu ao plano');
  });

  it('não acusa nada com uma rodada só, nem a repetição do que foi atribuído ao modelador, nem o lugar diferente', () => {
    expect(contradicoesEntreRodadas([rodada(1, [defeito('pino', 'comprimento', 'maior', 'ponta')])])).toEqual([]);
    expect(contradicoesEntreRodadas([
      rodada(1, [defeito('base', 'uniao', 'afastado', 'borda de baixo da base', 'fresta escura sob a borda')], ['rodada 1, fresta sob a borda da base: atribuido ao modelador']),
      rodada(2, [defeito('base', 'uniao', 'afastado', 'borda de baixo da base'), defeito('pino', 'comprimento', 'menor', 'raiz junto ao furo')]),
    ])).toEqual([]);
    expect(resumoDoLaco('obj/peca', { rodadas: [], decisao: { acao: 'modelar', motivo: 'x', medicao: null } })).not.toContain('contradições');
  });
});

/* AS FACES FINAS NA MEDIÇÃO. A caçamba do carrinho de mão teve 70 faces finas e `--acao` dizia que a medição passou; o crítico só
   suspeitou, por uma mancha no mapa de curvatura. A contagem vira aviso, e reprova quando cresce ou quando a peça de lataria é nova. */
describe('a medição conta as faces finas da malha', () => {
  const fina = 'tools/fixtures/faces-finas/fina/receita.js';
  const latariaFina = 'tools/fixtures/faces-finas/fina-de-lataria/receita.js';
  const limpa = 'tools/fixtures/faces-finas/sem-fina/receita.js';
  const rodadaCom = (total) => ({ numero: 1, facesFinas: { total, porParte: { chapa: total } } });

  it('avisa quantas, em que parte e o comando para listá-las, sem reprovar a peça que já as tinha', async () => {
    const medicao = await medirReceita(fina, { rodadas: [rodadaCom(4)] });
    expect(medicao.passou).toBe(true);
    expect(medicao.facesFinas).toEqual({ total: 4, porParte: { chapa: 4 } });
    expect(medicao.avisos.join('\n')).toMatch(/4 face\(s\) fina\(s\) na malha \(chapa: 4\); liste-as com `npm run -s malha:lascas -- tools\/fixtures\/faces-finas\/fina\/receita\.js`/);
    expect(medicao.relatorio).toBe('descrever (veredito), guarda:acervo, guarda:referencial: ok');
    const resumo = resumoDoLaco(fina, { rodadas: [], decisao: { acao: 'revisar', motivo: 'x', medicao } });
    expect(resumo).toContain('aviso: 4 face(s) fina(s) na malha (chapa: 4)');
  });

  it('a peça sem face fina não tem aviso nem contagem a gravar além de zero', async () => {
    const medicao = await medirReceita(limpa, { rodadas: [] });
    expect(medicao.passou).toBe(true);
    expect(medicao.facesFinas.total).toBe(0);
    expect(medicao.avisos).toEqual([]);
  });

  it('reprova quando a contagem cresce em relação à última rodada da peça', async () => {
    const cresceu = await medirReceita(fina, { rodadas: [rodadaCom(2)] });
    expect(cresceu.passou).toBe(false);
    expect(cresceu.relatorio).toMatch(/faces finas cresceram: 4 agora contra 2 na última rodada \(chapa: 4\)/);
    expect((await medirReceita(fina, { rodadas: [rodadaCom(9)] })).passou).toBe(true);
  });

  it('reprova a peça nova que declara chapa de lataria, e só ela', async () => {
    const nova = await medirReceita(latariaFina, { rodadas: [] });
    expect(nova.passou).toBe(false);
    expect(nova.relatorio).toMatch(/peça nova de chapa de lataria com 4 face\(s\) fina\(s\)/);
    expect((await medirReceita(fina, { rodadas: [] })).passou).toBe(true);
    expect((await medirReceita(latariaFina, { rodadas: [rodadaCom(4)] })).passou).toBe(true);
  });

  it('a rodada gravada guarda a contagem, e a que não a tinha segue sem ela', async () => {
    const pasta = join(area, PECA_DAS_FACES);
    const { rodada } = await registrarMedida(PECA_DAS_FACES, { partes: CONFERIDAS }, { pasta, medir: () => medirReceita(fina, { rodadas: [] }) });
    expect(rodada.facesFinas).toEqual({ total: 4, porParte: { chapa: 4 } });
    expect(ler(PECA_DAS_FACES)[0].facesFinas.total).toBe(4);
    const { rodada: antiga } = gravarRodada('peca-antiga', { partes: CONFERIDAS, medidas: { passou: true, relatorio: 'ok' } }, { pasta: join(area, 'peca-antiga') });
    expect(antiga).not.toHaveProperty('facesFinas');
  });
});
const PECA_DAS_FACES = 'peca-das-faces';

/* TEXTO DE PLANO MUDOU, FORMA NÃO. O chassi do carrinho trocou só o `PLANO.lataria` por uma dispensa, com a malha idêntica, e a ação
   passou de `parar-fechou` a `revisar`. Só o que o pedido do crítico lê (objeto, partes, critérios, referências) pede novo julgamento. */
describe('a ação mantém o julgamento quando só o texto da receita mudou', () => {
  const SUPORTE = resolve('tools/fixtures/refina-forma-global/suporte.js');
  const PECA = 'peca-de-ensaio';
  const receita = (corpo = '') => `import { receitaDoSuporte } from '${SUPORTE}';\nconst r = receitaDoSuporte();\n${corpo}\nexport default r;\n`;
  const DISPENSA = "r.PLANO.lataria = { dispensa: 'a peça é suporte de chapa grossa, sem superfície livre a conferir com a luz rasante' };";
  const gravarNaArea = (nome, texto) => { const arquivo = join(area, `${nome}.js`); writeFileSync(arquivo, texto); return arquivo; };

  async function julgadaCom(texto) {
    const pasta = join(area, PECA);
    gravarRodada(PECA, { partes: CONFERIDAS, medidas: { passou: true, relatorio: 'ok' }, veredito: veredito(0, 9) }, { pasta, receitaTexto: texto });
    return pasta;
  }
  const medirTexto = (caminho, texto) => async () => ({
    passou: true, sha256: `sha256:${'a'.repeat(64)}`, caminho, texto, relatorio: 'ok', avisos: [],
  });

  it('a impressão não muda com a dispensa da lataria e muda com o objeto, a forma da parte, o critério ou a referência', async () => {
    const base = await impressaoDaForma(gravarNaArea('base', receita()));
    expect(await impressaoDaForma(gravarNaArea('dispensa', receita(DISPENSA)))).toBe(base);
    expect(await impressaoDaForma(gravarNaArea('dobras', receita("r.PLANO.dobrasAceitas = [{ parte: 'sapata', regiao: { min: [-100, 0, -100], max: [100, 20, 100] }, motivo: 'a sapata é uma caixa de quina viva por projeto, e a quina é desenho' }];")))).toBe(base);
    for (const [nome, mudanca] of [
      ['objeto', "r.PLANO.objeto += ', com o furo de fixação no meio';"],
      ['forma', "r.PLANO.partes[0].forma += ' e cantos chanfrados';"],
      ['criterio', "r.PLANO.criteriosDeReprovacao.push('a coluna fora do centro da sapata por mais de 2 mm');"],
      ['referencia', "r.PLANO.referencias.push('../alvo.json');"],
    ]) {
      expect(await impressaoDaForma(gravarNaArea(nome, receita(mudanca)))).not.toBe(base);
    }
  });

  it('só o texto da lataria mudou: mantém o fechamento e diz que só o texto mudou', async () => {
    const pasta = await julgadaCom(receita());
    const nova = gravarNaArea('nova', receita(DISPENSA));
    const decisao = await acaoDaPeca(PECA, { rodadas: ler(PECA), pasta, medir: medirTexto(nova) });
    expect(decisao.acao).toBe('parar-fechou');
    expect(decisao.motivo).toContain('Só o texto mudou, e nada do que o crítico lê');
  });

  it('o que o crítico lê mudou: continua pedindo novo julgamento', async () => {
    const pasta = await julgadaCom(receita());
    const nova = gravarNaArea('nova', receita("r.PLANO.criteriosDeReprovacao.push('a coluna fora do centro da sapata por mais de 2 mm');"));
    const decisao = await acaoDaPeca(PECA, { rodadas: ler(PECA), pasta, medir: medirTexto(nova) });
    expect(decisao.acao).toBe('revisar');
    expect(decisao.motivo).toContain('falta o crítico julgar esta');
  });

  it('o registro sem cópia da receita julgada segue como antes: pede novo julgamento', async () => {
    const pasta = await julgadaCom(receita());
    rmSync(join(pasta, 'receita-01.js'));
    const nova = gravarNaArea('nova', receita(DISPENSA));
    const decisao = await acaoDaPeca(PECA, { rodadas: ler(PECA), pasta, medir: medirTexto(nova) });
    expect(decisao.acao).toBe('revisar');
    expect(decisao.motivo).toContain('falta o crítico julgar esta');
  });
});
