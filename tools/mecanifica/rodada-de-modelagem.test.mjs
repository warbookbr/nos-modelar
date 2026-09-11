/* rodada-de-modelagem.test.mjs — o registro do laço, de ponta a ponta.
 *
 * A prova que interessa aqui é a sequência inteira: uma peça reprovada nas
 * medidas volta a modelar sem gastar revisão, uma peça julgada com defeitos
 * continua, e o laço só termina por decisão escrita — nunca porque quem conduz
 * achou que estava bom. O registro precisa sobreviver à rodada: veredito que
 * vive só no diálogo some com a janela de contexto.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { proximaAcao } from '../../src/autoria/laco-de-modelagem.js';
import { gravarRodada, lerRodadas, pastaDeRodadas } from './rodada-de-modelagem.mjs';

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

describe('registro de rodadas', () => {
  it('grava cada rodada num arquivo próprio, numerado e não reescrito', () => {
    const { arquivo } = gravar('peca-de-ensaio', {
      medidas: { passou: true, relatorio: 'guarda:acervo ok' },
      veredito: veredito(2),
    });
    expect(existsSync(arquivo)).toBe(true);
    expect(arquivo).toMatch(/rodada-01\.json$/);
    const gravado = JSON.parse(readFileSync(arquivo, 'utf8'));
    expect(gravado.veredito.defeitos).toHaveLength(2);

    gravar('peca-de-ensaio', { medidas: { passou: false, relatorio: 'contato aberto' } });
    expect(ler('peca-de-ensaio').map((r) => r.numero)).toEqual([1, 2]);
  });

  it('a sequência inteira decide sozinha, e termina com motivo escrito', () => {
    const peca = 'peca-de-ensaio';
    expect(proximaAcao(ler(peca)).acao).toBe('modelar');

    /* Rodada 1: as medidas reprovam, então nem se chama revisão. */
    gravar(peca, { medidas: { passou: false, relatorio: 'contato declarado que nao acontece' } });
    expect(proximaAcao(ler(peca))).toMatchObject({ acao: 'modelar' });

    /* Rodada 2: medidas passam e ainda não houve julgamento. */
    gravar(peca, { medidas: { passou: true, relatorio: 'guarda:acervo ok' } });
    expect(proximaAcao(ler(peca)).acao).toBe('revisar');

    /* Rodada 3: três defeitos apontados; volta a modelar com eles na mão. */
    gravar(peca, { medidas: { passou: true, relatorio: 'ok' }, veredito: veredito(3) });
    expect(proximaAcao(ler(peca)).acao).toBe('modelar');
    expect(ler(peca).at(-1).veredito.defeitos).toHaveLength(3);

    /* Rodada 4: um defeito restante. Ainda não fecha. */
    gravar(peca, { medidas: { passou: true, relatorio: 'ok' }, veredito: veredito(1) });
    expect(proximaAcao(ler(peca)).acao).toBe('modelar');

    /* Rodada 5: nenhum defeito e nota alta. Só aqui o laço fecha. */
    gravar(peca, { medidas: { passou: true, relatorio: 'ok' }, veredito: veredito(0, 9) });
    const fim = proximaAcao(ler(peca));
    expect(fim.acao).toBe('parar-fechou');
    expect(fim.motivo).toMatch(/nota 9/);

    /* O registro guarda o que motivou cada correção, e não só o fim. */
    const historia = ler(peca);
    expect(historia.map((r) => r.veredito?.defeitos.length ?? null)).toEqual([null, null, 3, 1, 0]);
  });

  it('recusa nome de peça que não serve de pasta, mesmo com a pasta injetada', () => {
    expect(() => ler('../fora')).toThrow(/não é nome de peça/);
    expect(() => gravar('Peça Com Espaço', { medidas: { passou: true } }))
      .toThrow(/não é nome de peça/);
    expect(() => pastaDeRodadas('../fora')).toThrow(/não é nome de peça/);
  });

  it('a rodada mora DENTRO da pasta da peça quando a peça é uma pasta', () => {
    /* A bicicleta migrou: o registro dela fica ao lado da receita que ele
       julgou, e não numa árvore de documentação que quem abre a peça não vê. */
    expect(pastaDeRodadas('bicicleta-quadro'))
      .toMatch(/prototipos\/procedural\/v3\/pecas\/bicicleta-quadro\/rodadas$/);
  });

  it('peça que não existe, ou que é arquivo solto, grava no lugar antigo', () => {
    /* Registro de peça anterior à pasta não muda de lugar: evidência não se
       move para caber numa arrumação nova. */
    expect(pastaDeRodadas('peca-que-nunca-existiu'))
      .toMatch(/docs\/mecanifica\/historico\/rodadas\/peca-que-nunca-existiu$/);
  });
});
