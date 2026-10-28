/* retrato-do-acervo.test.mjs — o retrato é determinístico, a comparação reprova a peça de ensaio de caixa alterada dizendo qual peça
   e o que mudou, e a linha de comando sai com 1 contra um retrato adulterado. */
import { afterAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FORMATO, compararRetratos, formatarComparacao, lerRetrato, retratarReceita, serializarRetrato,
} from './retrato-do-acervo.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/* Um bloco de lado `lado` metros apoiado no chão, numa parte só. */
const bloco = (lado, parte = 'bloco') => ({
  PASSOS: [
    ['cubo', { origemId: 1, larg: lado, alt: lado, prof: lado, em: [0, 0, 0] }],
    ['parte', { nome: parte, sel: { origem: { op: 'cubo', id: 1 } } }],
  ],
});
const retrato = (pecas) => ({ formato: FORMATO, pecas });
const semTempo = ({ tempoMs, ...resto }) => resto;

describe('retrato: a medida de uma peça', () => {
  it('mede o bloco de 1 m: caixa, volume, área, faces e uma parte', () => {
    const r = retratarReceita(bloco(1));
    expect(r.caixa).toEqual({ min: [-0.5, 0, -0.5], max: [0.5, 1, 0.5] });
    expect(r.volume).toBeCloseTo(1, 12);
    expect(r.area).toBeCloseTo(6, 12);
    expect(r.faces).toBe(6);
    expect(r.facesFinas).toBe(0);
    expect(r.orfaos).toBe(0);
    expect(Object.keys(r.partes)).toEqual(['bloco']);
    expect(r.partes.bloco.volume).toBeCloseTo(1, 12);
    expect(r.tempoMs).toBeGreaterThanOrEqual(0);
  });

  it('a mesma receita dá o mesmo retrato nas duas execuções, tirado o tempo', () => {
    const a = retratarReceita(bloco(1.3));
    const b = retratarReceita(bloco(1.3));
    expect(semTempo(a)).toEqual(semTempo(b));
    const comparacao = compararRetratos(retrato({ ensaio: a }), retrato({ ensaio: b }));
    expect(comparacao.diferencas).toEqual([]);
    expect(comparacao.iguais).toBe(1);
  });

  it('uma receita que o núcleo recusa vira um erro no retrato, e não uma exceção', () => {
    const r = retratarReceita({});
    expect(r.erro).toMatch(/envelope/);
  });
});

describe('retrato: a comparação', () => {
  const antes = retrato({ ensaio: retratarReceita(bloco(1)), outra: retratarReceita(bloco(2)) });

  it('reprova a peça de caixa alterada e diz a peça, o eixo e o valor', () => {
    const depois = retrato({ ensaio: retratarReceita(bloco(1.002)), outra: antes.pecas.outra });
    const c = compararRetratos(antes, depois);
    const graves = c.diferencas.filter((d) => d.grave);
    expect(graves.length).toBeGreaterThan(0);
    expect(new Set(graves.map((d) => d.peca))).toEqual(new Set(['ensaio']));
    expect(graves.map((d) => d.campo)).toEqual(expect.arrayContaining(['caixa', 'volume', 'area']));
    const texto = formatarComparacao(c);
    expect(texto).toContain('MUDOU ensaio: caixa max x 500 mm → 501 mm');
    expect(texto).not.toContain('outra');
    expect(c.iguais).toBe(1);
  });

  it('aceita a diferença abaixo da tolerância da caixa (1e-9 m)', () => {
    const depois = retrato({ ensaio: retratarReceita(bloco(1 + 1e-10)), outra: antes.pecas.outra });
    expect(compararRetratos(antes, depois).diferencas).toEqual([]);
  });

  it('reprova a parte renomeada, nomeando a que sumiu e a que apareceu', () => {
    const depois = retrato({ ensaio: retratarReceita(bloco(1, 'caixote')), outra: antes.pecas.outra });
    const c = compararRetratos(antes, depois);
    expect(c.diferencas.filter((d) => d.grave).map((d) => d.detalhe)).toEqual(
      expect.arrayContaining(["a parte 'bloco' sumiu", "a parte 'caixote' apareceu"]),
    );
  });

  it('reprova a peça que sumiu e a que passou a falhar', () => {
    const sumiu = compararRetratos(antes, retrato({ outra: antes.pecas.outra }));
    expect(sumiu.diferencas).toEqual([{ peca: 'ensaio', parte: null, campo: 'peça', detalhe: 'estava no retrato e não está no de agora', grave: true }]);
    const falhou = compararRetratos(antes, retrato({ ensaio: retratarReceita({}), outra: antes.pecas.outra }));
    expect(falhou.diferencas.map((d) => [d.peca, d.campo, d.grave])).toEqual([['ensaio', 'erro', true]]);
  });

  it('faces e faces finas que caem são listadas sem reprovar; as que sobem reprovam', () => {
    const base = retratarReceita(bloco(1));
    const com = (mudanca) => retrato({ ensaio: { ...base, ...mudanca, partes: { bloco: { ...base.partes.bloco, ...(mudanca.faces ? { faces: mudanca.faces } : {}) } } } });
    const antesFino = com({ faces: 10, facesFinas: 2 });
    const caiu = compararRetratos(antesFino, com({ faces: 8, facesFinas: 0 }));
    expect(caiu.diferencas.map((d) => [d.campo, d.grave])).toEqual(expect.arrayContaining([['faces', false], ['facesFinas', false], ['partes.faces', false]]));
    expect(caiu.diferencas.every((d) => !d.grave)).toBe(true);
    const subiu = compararRetratos(antesFino, com({ faces: 10, facesFinas: 3 }));
    expect(subiu.diferencas).toEqual([expect.objectContaining({ campo: 'facesFinas', grave: true })]);
    expect(compararRetratos(antesFino, com({ faces: 10, facesFinas: 2, orfaos: 1 })).diferencas).toEqual([expect.objectContaining({ campo: 'orfaos', grave: true })]);
  });

  it('com `apenas`, as peças fora da lista não contam como sumidas', () => {
    const c = compararRetratos(antes, retrato({ ensaio: antes.pecas.ensaio }), { apenas: ['ensaio'] });
    expect(c.diferencas).toEqual([]);
  });

  it('o arquivo gravado volta igual ao retrato', () => {
    const lido = JSON.parse(serializarRetrato({ ...antes, base: 'ensaio' }));
    expect(lido).toEqual({ ...antes, base: 'ensaio' });
  });
});

describe('retrato: linha de comando', () => {
  const pasta = mkdtempSync(join(tmpdir(), 'retrato-'));
  afterAll(() => rmSync(pasta, { recursive: true, force: true }));
  const rodar = (...args) => spawnSync(process.execPath, ['tools/modelar/retrato-do-acervo.mjs', ...args], { cwd: REPO, encoding: 'utf8' });
  const arquivo = join(pasta, 'antes.json');

  it('grava o retrato de uma peça e a comparação contra ele mesmo sai com 0', () => {
    const gravou = rodar('--gravar', arquivo, '--pecas=suporte-tubo');
    expect(gravou.status).toBe(0);
    expect(Object.keys(lerRetrato(arquivo).pecas)).toEqual(['suporte-tubo']);
    const comparou = rodar('--comparar', arquivo, '--pecas=suporte-tubo');
    expect(comparou.status).toBe(0);
    expect(comparou.stdout).toContain('1 peça(s) iguais');
  });

  it('com a caixa de uma peça alterada no arquivo, sai com 1 e diz a peça e o que mudou', () => {
    const adulterado = JSON.parse(readFileSync(arquivo, 'utf8'));
    adulterado.pecas['suporte-tubo'].caixa.max[0] += 0.001;
    const alterado = join(pasta, 'adulterado.json');
    writeFileSync(alterado, JSON.stringify(adulterado));
    const r = rodar('--comparar', alterado, '--pecas=suporte-tubo');
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/MUDOU suporte-tubo: caixa max x .* mm → .* mm/);
  });

  it('sai com 2 para peça fora do acervo, bandeira desconhecida e retrato ausente', () => {
    expect(rodar('--pecas=nao-existe').status).toBe(2);
    expect(rodar('--compara').status).toBe(2);
    expect(rodar('--comparar', join(pasta, 'nada.json')).status).toBe(2);
  });
});
