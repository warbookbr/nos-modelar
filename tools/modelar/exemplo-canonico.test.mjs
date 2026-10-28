/* exemplo-canonico.test.mjs — o exemplo de receita que a documentação ensina
 * precisa passar pelo mesmo caminho que o acervo.
 *
 * O guia de autoria ensinou por meses um exemplo com `meta.versao`, materiais
 * com chaves que o acervo não usa, `PARAMS` soltos e `PASSOS` literal, e nada
 * acusou, porque o bloco era texto. Aqui todo bloco de código marcado com
 * `exemplo-canonico` na cabeça da cerca (```javascript exemplo-canonico) é
 * extraído, gravado como `receita.js` de uma pasta de peça e conferido pelas
 * funções que `guarda:acervo` usa: `descreverPecaReutilizavel` (executa a
 * receita, mede o contato e a forma prometida), o plano, as referências, as
 * portas e os pontos declarados. Além disso o teste exige a cadeia do contrato
 * (`TABELA` em milímetro exportada como `PARAMS`, `derivar`, `gerarPassos` e
 * `get PASSOS`) e os campos que o acervo cobra. */
import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { descreverPecaReutilizavel } from './descrever-peca.mjs';
import { conferirPontos } from './conferir-pontos.mjs';
import { emArquivoSolto, referenciasAusentes } from './guardas/guarda-acervo.mjs';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { conferirPortasNaForma } from '../../src/autoria/porta-confere-forma.js';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const PASTAS_DE_DOCUMENTO = ['docs/modelar', '.claude/skills'];
const BLOCO = /^```[a-z]+ exemplo-canonico[ \t]*\n([\s\S]*?)\n```[ \t]*$/gm;

function markdownsDe(pasta) {
  const achados = [];
  for (const entrada of readdirSync(pasta, { withFileTypes: true })) {
    const caminho = join(pasta, entrada.name);
    if (entrada.isDirectory()) achados.push(...markdownsDe(caminho));
    else if (entrada.name.endsWith('.md')) achados.push(caminho);
  }
  return achados.sort();
}

function blocosCanonicos(texto) {
  return [...texto.matchAll(BLOCO)].map((achado) => achado[1]);
}

const exemplos = PASTAS_DE_DOCUMENTO
  .flatMap((pasta) => markdownsDe(join(REPO, pasta)))
  .flatMap((arquivo) => blocosCanonicos(readFileSync(arquivo, 'utf8'))
    .map((codigo, indice) => ({ arquivo: arquivo.slice(REPO.length + 1), indice, codigo })));

const temporarias = [];
afterEach(() => {
  while (temporarias.length) rmSync(temporarias.pop(), { recursive: true, force: true });
});

/* A pasta da peça vive dentro de um acervo de ensaio, com a referência do
   plano ao lado, como no acervo real. */
function pastaDaPeca(codigo) {
  const raiz = mkdtempSync(join(tmpdir(), 'modelar-exemplo-'));
  temporarias.push(raiz);
  const pasta = join(raiz, 'exemplo');
  mkdirSync(join(pasta, 'referencias'), { recursive: true });
  writeFileSync(join(pasta, 'referencias', 'alvo.md'), '# alvo\n');
  const arquivo = join(pasta, 'receita.js');
  writeFileSync(arquivo, codigo);
  return { raiz, arquivo };
}

describe('exemplo canônico da documentação', () => {
  it('a documentação marca pelo menos um exemplo', () => {
    expect(exemplos.length).toBeGreaterThan(0);
  });

  it('ignora a marcação fora da cabeça da cerca', () => {
    expect(blocosCanonicos('```javascript\nexemplo-canonico\n```')).toEqual([]);
    expect(blocosCanonicos('```javascript exemplo-canonico\nexport const a = 1;\n```')).toEqual(['export const a = 1;']);
  });

  describe.each(exemplos)('$arquivo (bloco $indice)', ({ codigo }) => {
    it('segue a cadeia do contrato: TABELA em mm como PARAMS, derivar, gerarPassos e get PASSOS', async () => {
      const { arquivo } = pastaDaPeca(codigo);
      const modulo = await import(pathToFileURL(arquivo).href);
      const receita = modulo.default;
      expect(receita.PARAMS).toBe(modulo.TABELA);
      expect(typeof modulo.derivar).toBe('function');
      expect(typeof modulo.gerarPassos).toBe('function');
      expect(Object.getOwnPropertyDescriptor(receita, 'PASSOS')?.get).toBeTypeOf('function');
      expect(receita.PASSOS).toEqual(modulo.gerarPassos(modulo.TABELA));
      /* Mudar a tabela muda a peça: é o motivo de o PASSOS ser um getter. */
      const alterada = { ...receita, PARAMS: { ...modulo.TABELA } };
      const primeiraMedida = Object.keys(modulo.TABELA)[0];
      alterada.PARAMS[primeiraMedida] += 10;
      expect(modulo.gerarPassos(alterada.PARAMS)).not.toEqual(receita.PASSOS);
    });

    it('declara os campos que o acervo exige, no formato real', async () => {
      const { arquivo } = pastaDaPeca(codigo);
      const receita = (await import(pathToFileURL(arquivo).href)).default;
      expect(Object.keys(receita.meta).sort()).toEqual(['desc', 'nome']);
      expect(receita.meta.nome).toMatch(/^[a-z0-9-]+(\/[a-z0-9-]+)?$/);
      for (const campo of ['PLANO', 'MATERIAIS', 'TOPO', 'contatos', 'PONTOS']) {
        expect(receita[campo], campo).toBeTruthy();
      }
      for (const [nome, material] of Object.entries(receita.MATERIAIS)) {
        expect(typeof material.cor, `${nome}.cor`).toBe('string');
        expect(Object.keys(material).every((chave) => ['cor', 'metalicidade', 'aspereza'].includes(chave)), nome).toBe(true);
      }
      expect(typeof receita.TOPO.origem).toBe('string');
    });

    it('passa pelo caminho da guarda do acervo', async () => {
      const { raiz, arquivo } = pastaDaPeca(codigo);
      const modulo = await import(pathToFileURL(arquivo).href);
      const receita = modulo.default;

      expect(emArquivoSolto(arquivo, { raiz })).toBe(false);

      const medida = await descreverPecaReutilizavel({ peca: arquivo, modulo });
      expect(medida.ok, medida.stderr).toBe(true);

      expect(medida.resultado.plano).toBeTruthy();
      expect(referenciasAusentes(arquivo, medida.resultado.plano, { raiz })).toEqual([]);

      const partesDoPlano = medida.resultado.plano.partes.map((parte) => parte.nome).sort();
      const partesDoPasso = receita.PASSOS.filter(([op]) => op === 'parte').map(([, passo]) => passo.nome).sort();
      expect(partesDoPasso).toEqual(partesDoPlano);

      const { neutro } = executarReceita(receita);
      expect(conferirPortasNaForma(neutro)).toEqual([]);

      const pontos = conferirPontos(receita, { quem: 'exemplo canônico' });
      expect(pontos.ok, JSON.stringify(pontos.pontos)).toBe(true);
    });
  });
});
