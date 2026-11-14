/* recusas-exercitadas.test.mjs — o gate que recusa recusa de entrada sem teste: acha a mensagem de cada `grita`, `throw`, `erro:` e
   `erroAcionavel`, reprova a recusa nova que nenhum teste cita, aceita a que um teste cita, e mantém a lista de exceções honesta. */
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { FONTES_VIGIADAS, SEM_ENTRADA_QUE_ALCANCE, conferirRecusasExercitadas, recusasDoTexto } from './recusas-exercitadas.mjs';

const pastas = [];
function raizCom(arquivos) {
  const raiz = mkdtempSync(join(tmpdir(), 'recusas-'));
  pastas.push(raiz);
  for (const [caminho, texto] of Object.entries(arquivos)) { mkdirSync(dirname(join(raiz, caminho)), { recursive: true }); writeFileSync(join(raiz, caminho), texto); }
  return raiz;
}
afterAll(() => { for (const p of pastas) rmSync(p, { recursive: true, force: true }); });

const FONTE = `export const op = {
  alfa(st, a, i) {
    if (!a.x) return grita(st, i, 'alfa', 'x', 'x precisa ser um número finito maior que zero');
    if (!a.y) throw new TypeError(\`y vale \${a.y}, e o limite de entrada é inteiro\`);
    return { erro: ['z', \`z precisa de \${a.z} pontos, no mínimo três pontos\`] };
  },
};`;
const CONFIG = [{ arquivo: 'src/fonte.js' }];

describe('recusasDoTexto', () => {
  it('acha a mensagem do grita, do throw e do erro, com o texto fixo e a linha', () => {
    const r = recusasDoTexto(FONTE);
    expect(r.map((x) => x.linha)).toEqual([3, 4, 5]);
    expect(r[0].texto).toBe('x precisa ser um número finito maior que zero');
    expect(r[1].textos).toEqual([', e o limite de entrada é inteiro']);
    expect(r[1].texto).toBe(', e o limite de entrada é inteiro');
    expect(r[2].texto).toBe('pontos, no mínimo três pontos');
  });

  it('não conta comentário, a declaração da função nem o texto curto demais', () => {
    const texto = `// grita('a', 'texto de comentário que não é recusa')\n/* throw new Error('também comentário aqui dentro') */\nfunction grita(st, i, op, ref, motivo) { st.orfaos.push({ motivo }); }\nreturn grita(st, i, 'op', 'ref', 'curto');`;
    expect(recusasDoTexto(texto)).toEqual([]);
  });

  it('segue o template com chaves, aspas e outro template dentro do ${...}', () => {
    const texto = 'return grita(st, i, "op", "ref", `a lista ${a.map((x) => `[${x}]`).join(", ")} não vale: o texto fixo depois`);';
    const r = recusasDoTexto(texto);
    expect(r).toHaveLength(1);
    expect(r[0].texto).toBe(' não vale: o texto fixo depois'.trim());
  });
});

describe('conferirRecusasExercitadas', () => {
  it('as fontes vigiadas do repositório passam, com as exceções declaradas e motivo em cada uma', () => {
    expect(conferirRecusasExercitadas()).toEqual([]);
    expect(FONTES_VIGIADAS.length).toBeGreaterThanOrEqual(6);
    for (const [chave, motivo] of Object.entries(SEM_ENTRADA_QUE_ALCANCE)) {
      expect(chave).toMatch(/^[\w/.-]+: /);
      expect(motivo.length, chave).toBeGreaterThan(40);
    }
  });

  it('a recusa nova que nenhum teste cita reprova, dizendo o arquivo, a linha e a mensagem', () => {
    const raiz = raizCom({ 'src/fonte.js': FONTE, 'src/fonte.test.mjs': "expect(x).toThrow('x precisa ser um número finito maior que zero'); expect(y).toMatch(/e o limite de entrada é inteiro/);" });
    const falhas = conferirRecusasExercitadas({ raiz, fontes: CONFIG, excecoes: {} });
    expect(falhas).toHaveLength(1);
    expect(falhas[0]).toMatch(/^src\/fonte\.js:5: a recusa "pontos, no mínimo três pontos" não tem teste que a exercite/);
  });

  it('com um teste que cita cada mensagem, passa; o teste de outra pasta também vale, e o que está fora das pastas de teste não', () => {
    const citando = "'x precisa ser um número finito maior que zero' 'e o limite de entrada é inteiro' 'no mínimo três pontos'";
    expect(conferirRecusasExercitadas({ raiz: raizCom({ 'src/fonte.js': FONTE, 'tools/a/b.test.ts': citando }), fontes: CONFIG, excecoes: {} })).toEqual([]);
    expect(conferirRecusasExercitadas({ raiz: raizCom({ 'src/fonte.js': FONTE, 'docs/citando.txt': citando }), fontes: CONFIG, excecoes: {} })).toHaveLength(3);
    expect(conferirRecusasExercitadas({ raiz: raizCom({ 'src/fonte.js': FONTE, 'src/citando.js': citando }), fontes: CONFIG, excecoes: {} })).toHaveLength(3);
  });

  it('a mensagem trocada na fonte, com o teste da antiga, reprova: a recusa reescrita é recusa nova', () => {
    const raiz = raizCom({
      'src/fonte.js': FONTE.replace('x precisa ser um número finito maior que zero', 'o campo x vale zero ou menos e não pode'),
      'src/fonte.test.mjs': "'x precisa ser um número finito maior que zero' 'e o limite de entrada é inteiro' 'no mínimo três pontos'",
    });
    const falhas = conferirRecusasExercitadas({ raiz, fontes: CONFIG, excecoes: {} });
    expect(falhas).toHaveLength(1);
    expect(falhas[0]).toMatch(/src\/fonte\.js:3: a recusa "o campo x vale zero/);
  });

  it('a exceção com motivo cala a recusa sem teste; a que já tem teste, a sem motivo e a que não corresponde a nada reprovam', () => {
    const sem = raizCom({ 'src/fonte.js': FONTE, 'src/fonte.test.mjs': "'x precisa ser um número finito maior que zero' 'e o limite de entrada é inteiro'" });
    const real = 'src/fonte.js: pontos, no mínimo três pontos';
    expect(conferirRecusasExercitadas({ raiz: sem, fontes: CONFIG, excecoes: { [real]: 'sem entrada que a alcance, por esta razão escrita' } })).toEqual([]);
    expect(conferirRecusasExercitadas({ raiz: sem, fontes: CONFIG, excecoes: { [real]: '  ' } })[0]).toMatch(/não diz o motivo/);
    const com = raizCom({ 'src/fonte.js': FONTE, 'src/fonte.test.mjs': "'x precisa ser um número finito maior que zero' 'e o limite de entrada é inteiro' 'no mínimo três pontos'" });
    expect(conferirRecusasExercitadas({ raiz: com, fontes: CONFIG, excecoes: { [real]: 'motivo escrito' } })[0]).toMatch(/já tem teste que a cita/);
    expect(conferirRecusasExercitadas({ raiz: com, fontes: CONFIG, excecoes: { 'src/fonte.js: outra coisa qualquer': 'motivo' } })[0]).toMatch(/não corresponde a nenhuma recusa/);
  });

  it('a fonte que não existe e o trecho que não se acha reprovam', () => {
    const raiz = raizCom({ 'src/fonte.js': FONTE });
    expect(conferirRecusasExercitadas({ raiz, fontes: [{ arquivo: 'src/some.js' }], excecoes: {} })[0]).toMatch(/fonte vigiada não existe/);
    expect(conferirRecusasExercitadas({ raiz, fontes: [{ arquivo: 'src/fonte.js', trecho: { de: /^nada$/, ate: /^fim$/ } }], excecoes: {} })[0]).toMatch(/o trecho vigiado não foi achado/);
  });

  it('o trecho vigiado só lê entre a abertura e o fechamento', () => {
    const texto = `${FONTE.slice(0, FONTE.lastIndexOf('};'))}  /* depois */\n  beta(st, a, i) { return grita(st, i, 'beta', 'q', 'a recusa de outra operação fora do trecho'); },\n};`;
    const raiz = raizCom({ 'src/fonte.js': texto, 'src/f.test.mjs': "'x precisa ser um número finito maior que zero' 'e o limite de entrada é inteiro' 'no mínimo três pontos'" });
    const fontes = [{ arquivo: 'src/fonte.js', trecho: { de: /^ {2}alfa\(/, ate: /^ {2}\/\* depois/ } }];
    expect(conferirRecusasExercitadas({ raiz, fontes, excecoes: {} })).toEqual([]);
    expect(conferirRecusasExercitadas({ raiz, fontes: CONFIG, excecoes: {} })).toHaveLength(1);
  });
});
