/* esqueleto.test.mjs — a árvore de juntas: recusas com campo e conserto, determinismo, propagação de medida, o andaime no normalizador de forma-global e a conferência do proporcoes. */
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { normalizarAndaimeGlobal } from '../../src/autoria/forma-global.js';
import { comoCLI, conferirEsqueleto, escreverEsqueleto, gerarEsqueleto } from './esqueleto.mjs';
import { conferirProporcoes } from './proporcoes.mjs';

const FIXTURE = 'tools/fixtures/esqueleto';
const temporarios = [];
const lerJson = (c) => JSON.parse(readFileSync(c, 'utf8'));

function copia() {
  const pasta = mkdtempSync(join(tmpdir(), 'esqueleto-'));
  temporarios.push(pasta);
  cpSync(FIXTURE, pasta, { recursive: true });
  return { pasta, arquivo: join(pasta, 'proporcoes.json') };
}
const editar = (arquivo, fn) => { const d = lerJson(arquivo); fn(d); writeFileSync(arquivo, `${JSON.stringify(d, null, 2)}\n`); };
const comJunta = (id, fn) => (d) => fn(d.esqueleto.juntas.find((j) => j.id === id), d);
const posicoes = (caminho) => Object.fromEntries(gerarEsqueleto(caminho).arvore.juntas.map((j) => [j.id, j.posicao]));

afterEach(() => { while (temporarios.length) rmSync(temporarios.pop(), { recursive: true, force: true }); });

describe('recusas: dizem o campo, o recebido, o esperado e o comando que conserta', () => {
  const recusa = (mudar, padrao) => {
    const { arquivo } = copia();
    editar(arquivo, mudar);
    expect(() => gerarEsqueleto(arquivo)).toThrow(padrao);
    expect(() => gerarEsqueleto(arquivo)).toThrow(/conserte com: .*npm run esqueleto -- --proporcoes=/);
  };
  it('pai que não existe', () => recusa(comJunta('cotovelo-direito', (j) => { j.pai = 'umero'; }), /esqueleto\.juntas\[1\]\.pai = 'umero', que não existe; esperava a raiz 'tronco' ou um id de junta/));
  it('ciclo', () => recusa((d) => { comJunta('ombro-direito', (j) => { j.pai = 'mao-direito'; })(d); }, /o ciclo .* -> .* em esqueleto\.juntas; esperava uma árvore/));
  it('junta que é pai de si mesma', () => recusa(comJunta('cotovelo-direito', (j) => { j.pai = 'cotovelo-direito'; }), /o ciclo cotovelo-direito -> cotovelo-direito/));
  it('comprimento negativo', () => recusa(comJunta('cotovelo-direito', (j) => { j.comprimento = -5; }), /esqueleto\.juntas\[1\]\.comprimento = -5; esperava um número maior que zero/));
  it('comprimento zero vindo de fórmula', () => recusa((d) => { d.medidas.comprimentoDoBraco = '=raioDoOmbro - raioDoOmbro'; }, /comprimento = 0 \(de "=comprimentoDoBraco"\)|comprimento = 0/));
  it('direção nula', () => recusa(comJunta('cotovelo-direito', (j) => { j.direcao = [0, 0, 0]; }), /esqueleto\.juntas\[1\]\.direcao = \[0,0,0\], um vetor nulo/));
  it('fórmula com medida inexistente', () => recusa(comJunta('cotovelo-direito', (j) => { j.comprimento = '=comprimentoDoUmero + 1'; }), /esqueleto\.juntas\[1\]\.comprimento = "=comprimentoDoUmero \+ 1", que usa a medida 'comprimentoDoUmero'/));
  it('espelho de junta que não existe', () => recusa(comJunta('ombro-esquerdo', (j) => { j.espelho.de = 'ombro-fantasma'; }), /espelho\.de = 'ombro-fantasma', que não existe/));
  it('espelho sem troca quando há descendentes', () => recusa(comJunta('ombro-esquerdo', (j) => { delete j.espelho.troca; }), /espelho sem "troca"/));
  it('pai do espelho que não é o espelho do pai da fonte', () => recusa((d) => {
    d.esqueleto.juntas.push({ id: 'ombro-baixo', pai: 'mao-direito', espelho: { de: 'ombro-direito', plano: 'x', troca: ['direito', 'baixo'] } });
  }, /pai = 'mao-direito'.*esperava o espelho \(plano x\) do pai 'tronco'/));
  it('id repetido', () => recusa((d) => { d.esqueleto.juntas[2].id = 'cotovelo-direito'; }, /o id 'cotovelo-direito' repetido/));
  it('curso sem filha', () => recusa(comJunta('mao-direito', (j) => { j.eixo = [1, 0, 0]; j.curso = { minimo: 0, maximo: 10 }; }), /a junta 'mao-direito' com curso e sem filha/));
  it('o CLI recusa seção ausente e arquivo sem esqueleto', () => {
    const { arquivo } = copia();
    editar(arquivo, (d) => { delete d.esqueleto; });
    expect(() => comoCLI([`--proporcoes=${arquivo}`], () => {})).toThrow(/sem a seção "esqueleto"/);
  });
});

describe('geração', () => {
  it('duas execuções dão os mesmos bytes, e as saídas gravadas da fixture batem', () => {
    const a = copia(), b = copia();
    escreverEsqueleto(a.arquivo); escreverEsqueleto(b.arquivo);
    for (const f of ['andaime.json', 'articulacoes.json']) {
      expect(readFileSync(join(a.pasta, f), 'utf8')).toBe(readFileSync(join(b.pasta, f), 'utf8'));
      expect(readFileSync(join(a.pasta, f), 'utf8')).toBe(readFileSync(join(FIXTURE, f), 'utf8'));
    }
    expect(escreverEsqueleto(a.arquivo)).toEqual([]);
    expect(conferirEsqueleto(a.arquivo)).toEqual([]);
  });

  it('o espelho reflete posição e membros, e o eixo de giro como pseudovetor', () => {
    const p = posicoes(`${FIXTURE}/proporcoes.json`);
    expect(p['ombro-direito']).toEqual([200, 1400, 0]);
    expect(p['ombro-esquerdo']).toEqual([-200, 1400, 0]);
    expect(p['cotovelo-esquerdo']).toEqual([-200, 1100, 0]);
    expect(p['mao-esquerdo']).toEqual([-200, 850, 0]);
    const andaime = lerJson(`${FIXTURE}/andaime.json`);
    const porta = (id) => andaime.portas.find((x) => x.id === id).interface;
    expect(porta('porta-ombro-esquerdo').eixo).toEqual([1, 0, 0]);
    expect(lerJson(`${FIXTURE}/articulacoes.json`).articulacoes.map((x) => x.id)).toEqual(['ombro-direito', 'cotovelo-direito', 'ombro-esquerdo', 'cotovelo-esquerdo']);
  });

  it('mudar um comprimento move a junta filha e o que pende dela, e só isso', () => {
    const { arquivo } = copia();
    const antes = posicoes(arquivo);
    editar(arquivo, (d) => { d.medidas.comprimentoDoBraco = 350; });
    const depois = posicoes(arquivo);
    expect(depois['cotovelo-direito'][1]).toBe(antes['cotovelo-direito'][1] - 50);
    expect(depois['mao-direito'][1]).toBe(antes['mao-direito'][1] - 50);
    expect(depois['cotovelo-esquerdo'][1]).toBe(antes['cotovelo-esquerdo'][1] - 50);
    for (const parado of ['tronco', 'ombro-direito', 'ombro-esquerdo']) expect(depois[parado]).toEqual(antes[parado]);
  });

  it('o andaime gerado passa no normalizador de forma-global: uma bola por junta, um bastão por segmento, uma porta por junta com eixo', () => {
    const andaime = normalizarAndaimeGlobal(lerJson(`${FIXTURE}/andaime.json`));
    expect(andaime.volumes.filter((v) => v.tipo === 'esfera')).toHaveLength(7);
    expect(andaime.volumes.filter((v) => v.tipo === 'cilindro')).toHaveLength(6);
    expect(andaime.portas).toHaveLength(4);
  });

  it('um membro oblíquo vira tubo reto e também passa no normalizador', () => {
    const { arquivo } = copia();
    editar(arquivo, comJunta('cotovelo-direito', (j) => { j.direcao = [1, -1, 0]; }));
    const { arquivos } = gerarEsqueleto(arquivo);
    const andaime = normalizarAndaimeGlobal(arquivos[0].json);
    expect(andaime.volumes.find((v) => v.id === 'bastao-cotovelo-direito').tipo).toBe('tubo');
    expect(andaime.volumes.find((v) => v.id === 'bastao-ombro-direito').tipo).toBe('cilindro');
  });
});

describe('conferência (gate 2 do plano)', () => {
  it('npm run proporcoes sem escrever acusa o andaime que ficou para trás depois de mudar uma medida', () => {
    const { arquivo } = copia();
    escreverEsqueleto(arquivo);
    expect(conferirProporcoes(arquivo)).toEqual([]);
    editar(arquivo, (d) => { d.medidas.comprimentoDoAntebraco = 280; });
    const d = conferirProporcoes(arquivo);
    expect(d.length).toBeGreaterThan(0);
    expect(d.map((x) => x.lugar).join(' ')).toMatch(/andaime\.json/);
    expect(d[0].mensagem).toMatch(/o que o esqueleto dá\.\n\s+conserte com: npm run esqueleto -- --proporcoes=.* --escrever/);
    expect(escreverEsqueleto(arquivo)).toContain('andaime.json');
    expect(conferirProporcoes(arquivo)).toEqual([]);
  });

  it('o CLI responde a --ajuda, confere (1 na divergência) e escreve', () => {
    const { arquivo } = copia();
    const saida = [];
    expect(comoCLI(['--ajuda'], (t) => saida.push(t))).toBe(0);
    expect(saida.join('\n')).toMatch(/--proporcoes=<proporcoes\.json>/);
    expect(comoCLI([`--proporcoes=${arquivo}`], () => {})).toBe(0);
    editar(arquivo, (d) => { d.medidas.larguraDosOmbros = 500; });
    expect(comoCLI([`--proporcoes=${arquivo}`], () => {})).toBe(1);
    expect(comoCLI([`--proporcoes=${arquivo}`, '--escrever'], () => {})).toBe(0);
    expect(comoCLI([`--proporcoes=${arquivo}`], () => {})).toBe(0);
  });
});
