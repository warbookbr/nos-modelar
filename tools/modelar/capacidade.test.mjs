/* capacidade.test.mjs — a ficha de cada capacidade de gaiola: recortada do cabeçalho, em até 60 linhas, com os campos no código e o exemplo executável */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { REGISTRO_OPERACOES } from '../../procedural/nucleo/entrada.js';
import { CAPACIDADES, LIMITE_DE_LINHAS, executar, lerFicha, nomesPublicados } from './capacidade.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const nomes = Object.keys(CAPACIDADES);

describe('capacidade: a ficha é recortada do cabeçalho do código', () => {
  it('sem nome, lista cada capacidade em uma linha', () => {
    const r = executar([]);
    expect(r.codigo).toBe(0);
    const linhas = r.stdout.trimEnd().split('\n');
    for (const n of nomes) expect(linhas.some((l) => l.startsWith(n))).toBe(true);
    /* depois das fichas de ajudante, os nomes das operações e das extensões */
    const apos = linhas.slice(nomes.length);
    for (const n of nomesPublicados().operacoes) expect(apos).toContain(`  ${n}`);
    for (const n of nomesPublicados().extensoes) expect(apos).toContain(`  ${n}`);
    expect(r.stdout.indexOf('Operações do núcleo')).toBeGreaterThan(r.stdout.indexOf(nomes.at(-1)));
  });

  it('nome desconhecido recusa e sugere os mais próximos entre fichas, operações e extensões', () => {
    const r = executar(['inexistente']);
    expect(r.codigo).toBe(2);
    expect(r.stderr).toContain('npm run capacidade');
    expect(executar(['apara']).stderr).toContain('aparar');
    expect(executar(['caska']).stderr).toContain('casca');
    expect(executar(['gaiolaPorRde']).stderr).toContain('gaiolaPorRede');
  });

  it('a ficha de aparar traz os campos obrigatórios, os opcionais e o exemplo do registro', () => {
    const r = executar(['aparar']);
    expect(r.codigo).toBe(0);
    const uso = REGISTRO_OPERACOES.listar().find((o) => o.nome === 'aparar').uso;
    expect(r.stdout).toContain(uso.intencao);
    for (const c of uso.schemaArgumentos.required) expect(r.stdout, c).toMatch(new RegExp(`^  ${c}: .*, obrigatório, `, 'm'));
    expect(r.stdout).toMatch(/^ {2}limpar: .*, opcional, /m);
    for (const passo of uso.exemplo.PASSOS) expect(r.stdout).toContain(JSON.stringify(passo));
  });

  it('toda operação do registro imprime ficha sem erro, com intenção e um exemplo', () => {
    for (const { nome, uso } of REGISTRO_OPERACOES.listar()) {
      const r = executar([nome]);
      expect(r.codigo, nome).toBe(0);
      expect(r.stdout, nome).toContain(uso.intencao);
      expect(r.stdout, nome).toContain('exemplo');
      expect(r.stdout, nome).not.toContain('undefined');
    }
  });

  it('uma extensão diz que só existe no registro com extensões e onde está o manifesto', () => {
    const { extensoes } = nomesPublicados();
    expect(extensoes).toContain('casca');
    for (const nome of extensoes) {
      const r = executar([nome]);
      expect(r.codigo, nome).toBe(0);
      expect(r.stdout, nome).toContain('só existe no registro com extensões');
      expect(r.stdout, nome).toContain('criarRegistroComExtensoes');
      expect(r.stdout, nome).toMatch(/manifesto em procedural\/extensoes\/[\w-]+\/manifesto\.js/);
    }
  });

  it('uma palavra que não é nome acha as capacidades que a citam em serve ou quando', () => {
    for (const busca of [['painel'], ['linha de vão'], ['capô'], ['porta']]) {
      const r = executar(busca);
      expect(r.codigo, busca.join(' ')).toBe(0);
      expect(r.stdout, busca.join(' ')).toContain('paineisPorVaos');
    }
    expect(executar(['xyzxyz']).codigo).toBe(2);
  });

  it('--ajuda descreve o uso', () => {
    expect(executar(['--ajuda']).stdout).toContain('npm run capacidade');
  });

  for (const nome of nomes) {
    describe(nome, () => {
      const fonte = readFileSync(resolve(REPO, CAPACIDADES[nome].arquivo), 'utf8');
      const ficha = lerFicha(fonte);

      it('tem ficha com o nome da capacidade e todas as partes', () => {
        expect(ficha).not.toBeNull();
        expect(ficha.nome).toBe(nome);
        for (const parte of ['serve: ', 'quando: ', 'campos:', 'exemplo:', 'peça: ']) {
          expect(ficha.linhas.some((l) => l.startsWith(parte)), parte).toBe(true);
        }
        expect(ficha.campos.length).toBeGreaterThan(0);
      });

      it(`cabe em ${LIMITE_DE_LINHAS} linhas`, () => {
        const saida = executar([nome]).stdout.trimEnd().split('\n');
        expect(saida.length).toBeLessThanOrEqual(LIMITE_DE_LINHAS);
      });

      it('cada campo citado aparece no código, fora do comentário de cabeçalho', () => {
        for (const campo of ficha.campos) {
          expect(new RegExp(`\\b${campo}\\b`).test(ficha.codigo), `campo '${campo}'`).toBe(true);
        }
      });

      it('a peça de exemplo existe e o exemplo mínimo executa', async () => {
        const peca = /^peça: (\S+)/m.exec(ficha.linhas.join('\n'))[1];
        expect(() => readFileSync(resolve(REPO, peca))).not.toThrow();
        const modulo = await import(resolve(REPO, CAPACIDADES[nome].de));
        const funcao = modulo[CAPACIDADES[nome].funcao];
        expect(typeof funcao).toBe('function');
        const usa = Object.entries(CAPACIDADES[nome].usa ?? {});
        const outras = await Promise.all(usa.map(async ([f, de]) => (await import(resolve(REPO, de)))[f]));
        const r = new Function(CAPACIDADES[nome].funcao, ...usa.map(([f]) => f), `return ${ficha.exemplo}`)(funcao, ...outras);
        expect(r).toBeTruthy();
      });
    });
  }
});
