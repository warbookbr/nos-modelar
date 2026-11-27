/* dossie-do-objeto.test.mjs — o dossiê gerado é o esperado, e a conferência recusa o desatualizado e o que perdeu a seção à mão. */
import { afterEach, describe, expect, it } from 'vitest';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { conferirDossie, gerarDossie, lerArgumentos, montarDossie, operacoesPorParte, secoesAMao, unidadesDoObjeto } from './dossie-do-objeto.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(AQUI, '../fixtures/dossie');
const temporarias = [];
afterEach(() => { while (temporarias.length) rmSync(temporarias.pop(), { recursive: true, force: true }); });

function copia() {
  const pasta = mkdtempSync(join(tmpdir(), 'modelar-dossie-'));
  temporarias.push(pasta);
  cpSync(FIXTURE, pasta, { recursive: true });
  return pasta;
}
const DOCS = 'documentos/modelar';
const dossieDe = (raiz, objeto) => join(raiz, 'procedural/pecas', objeto, 'DOSSIE.md');

describe('as operações de cada parte', () => {
  it('sobe o grafo dos passos e leva o que modifica o sólido, sem pegar as outras partes', () => {
    const { PASSOS } = JSON.parse(JSON.stringify({ PASSOS: [
      ['cubo', { origemId: 1 }], ['cubo', { origemId: 2 }], ['rotaciona', { sel: { origem: { op: 'cubo', id: 2 } } }],
      ['subtrair', { origemId: 3, solidos: [{ origem: { op: 'cubo', id: 1 } }, { origem: { op: 'cubo', id: 2 } }] }],
      ['cubo', { origemId: 4 }],
      ['parte', { nome: 'a', sel: { origem: { op: 'subtrair', id: 3 } } }], ['parte', { nome: 'b', sel: { origem: { op: 'cubo', id: 4 } } }],
      ['material', { usa: 'x', sel: { grupo: 'b' } }],
    ] }));
    const r = operacoesPorParte(PASSOS);
    expect(r.a).toEqual([{ op: 'cubo', vezes: 2 }, { op: 'rotaciona', vezes: 1 }, { op: 'subtrair', vezes: 1 }, { op: 'parte', vezes: 1 }]);
    expect(r.b).toEqual([{ op: 'cubo', vezes: 1 }, { op: 'parte', vezes: 1 }, { op: 'material', vezes: 1 }]);
  });
  it('é vazio sem PASSOS ou sem passo parte', () => {
    expect(operacoesPorParte(null)).toEqual({});
    expect(operacoesPorParte([['cubo', { origemId: 1 }]])).toEqual({});
  });
});

describe('as unidades', () => {
  it('a peça de receita única é uma unidade; o objeto de várias partes, uma por parte; a parte, só ela', () => {
    expect(unidadesDoObjeto('objeto-de-prova', FIXTURE).unidades.map((u) => u.id)).toEqual(['peca']);
    expect(unidadesDoObjeto('objeto-com-partes', FIXTURE).unidades.map((u) => u.id)).toEqual(['base', 'tampa']);
    expect(unidadesDoObjeto('objeto-com-partes/tampa', FIXTURE).unidades.map((u) => u.peca)).toEqual(['objeto-com-partes/tampa']);
    expect(() => unidadesDoObjeto('nao-existe', FIXTURE)).toThrow(/não é objeto do acervo/);
  });
});

describe('o dossiê gerado', () => {
  it('é igual ao esperado gravado na fixture, para a peça única e para o objeto de partes', async () => {
    for (const objeto of ['objeto-de-prova', 'objeto-com-partes']) {
      const raiz = copia();
      const esperado = readFileSync(dossieDe(FIXTURE, objeto), 'utf8');
      rmSync(dossieDe(raiz, objeto));
      await gerarDossie(objeto, { raiz, docs: DOCS });
      const gerado = readFileSync(dossieDe(raiz, objeto), 'utf8');
      // o esperado tem a seção à mão preenchida de propósito; o resto é igual
      const semMao = (t) => t.replace(/(<!-- dossie:a-mao:([^:\s]+):inicio -->\n)[\s\S]*?(\n<!-- dossie:a-mao:\2:fim -->)/g, '$1$3');
      expect(semMao(gerado)).toBe(semMao(esperado));
    }
  });
  it('traz o PLANO, as operações por parte, a rodada com nota e defeito, a decisão da pessoa e o plano com a tabela', async () => {
    const { texto } = await montarDossie('objeto-de-prova', { raiz: FIXTURE, docs: DOCS, aMao: secoesAMao(readFileSync(dossieDe(FIXTURE, 'objeto-de-prova'), 'utf8')) });
    expect(texto).toContain('- Escala: largura da caixa, 200 mm');
    expect(texto).toContain('| `caixa` | cubo ×2, transladar ×1, subtrair ×1, parte ×1, material ×1 |');
    expect(texto).toContain('| 1 | 2026-11-20 | passou | 4 | 1 | a pessoa, 2026-11-21: tampa de 4 mm está boa, a caixa segue |');
    expect(texto).toContain('banco de provas: [estudo-de-prova](../../../documentos/modelar/banco-de-provas/estudo-de-prova); tabela de tentativas: [README.md](../../../documentos/modelar/banco-de-provas/estudo-de-prova/README.md)');
    expect(texto).toContain('`2026-11-10-caixas-antigas.md`');
    expect(texto).not.toContain('nada a ver com a pasta');
    expect(texto).not.toContain('Plano de ferramenta');
  });
  it('preserva a seção à mão ao regerar', async () => {
    const raiz = copia();
    await gerarDossie('objeto-de-prova', { raiz, docs: DOCS });
    expect(secoesAMao(readFileSync(dossieDe(raiz, 'objeto-de-prova'), 'utf8')).peca).toContain('parede fina por subtração');
  });
});

describe('--check', () => {
  it('aceita o dossiê em dia', async () => {
    for (const objeto of ['objeto-de-prova', 'objeto-com-partes']) {
      const raiz = copia();
      await gerarDossie(objeto, { raiz, docs: DOCS });
      expect((await conferirDossie(objeto, { raiz, docs: DOCS })).problemas).toEqual([]);
    }
  });
  it('recusa o dossiê da fixture, gravado e em dia, quando a receita muda', async () => {
    const raiz = copia();
    expect((await conferirDossie('objeto-de-prova', { raiz, docs: DOCS })).problemas).toEqual([]);
    const receita = join(raiz, 'procedural/pecas/objeto-de-prova/receita.js');
    writeFileSync(receita, readFileSync(receita, 'utf8').replace('milimetros: 200', 'milimetros: 250'));
    const { problemas } = await conferirDossie('objeto-de-prova', { raiz, docs: DOCS });
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatch(/desatualizado.*rode `npm run dossie -- objeto-de-prova`/);
  });
  it('recusa o dossiê que não existe', async () => {
    const raiz = copia();
    rmSync(dossieDe(raiz, 'objeto-com-partes'));
    expect((await conferirDossie('objeto-com-partes', { raiz, docs: DOCS })).problemas[0]).toMatch(/não existe; rode `npm run dossie -- objeto-com-partes`/);
  });
  it('recusa o dossiê que perdeu a seção à mão', async () => {
    const raiz = copia();
    const arquivo = dossieDe(raiz, 'objeto-de-prova');
    writeFileSync(arquivo, readFileSync(arquivo, 'utf8').replace(/<!-- dossie:a-mao:peca:inicio -->\n[\s\S]*?\n<!-- dossie:a-mao:peca:fim -->/, ''));
    expect((await conferirDossie('objeto-de-prova', { raiz, docs: DOCS })).problemas[0]).toMatch(/perdeu a seção à mão de peca/);
  });
  it('recusa o dossiê desatualizado depois de uma rodada nova ou de um plano novo', async () => {
    const raiz = copia();
    writeFileSync(join(raiz, DOCS, 'planos', '2026-11-25-outro-da-pasta.md'), '# Outro\n\n**Estado:** ativo\n\n**Território:** `procedural/pecas/objeto-de-prova/`.\n');
    expect((await conferirDossie('objeto-de-prova', { raiz, docs: DOCS })).problemas[0]).toMatch(/desatualizado/);
  });
});

describe('a linha de comando', () => {
  const rodar = (...args) => spawnSync(process.execPath, [join(AQUI, 'dossie-do-objeto.mjs'), ...args], { encoding: 'utf8' });
  it('responde a --ajuda, recusa opção sem = desconhecida e gera e confere pela fixture', () => {
    expect(rodar('--ajuda').stdout).toMatch(/npm run dossie -- <objeto>/);
    const ruim = rodar('x', '--raiz', 'a');
    expect(ruim.status).toBe(1);
    expect(ruim.stderr).toMatch(/opção desconhecida: --raiz/);
    const raiz = copia();
    expect(rodar('objeto-de-prova', `--raiz=${raiz}`, `--docs=${DOCS}`, '--check').status).toBe(0);
    writeFileSync(dossieDe(raiz, 'objeto-de-prova'), 'qualquer coisa');
    const r = rodar('objeto-de-prova', `--raiz=${raiz}`, `--docs=${DOCS}`, '--check');
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/dossie:check FALHOU/);
  });
  it('lerArgumentos aceita --raiz com igual', () => {
    expect(lerArgumentos(['a', '--check', '--raiz=/x']).raiz).toBe('/x');
  });
});
