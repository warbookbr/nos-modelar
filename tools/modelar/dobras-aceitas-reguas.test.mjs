/* dobras-aceitas-reguas.test.mjs — `PLANO.dobrasAceitas` nas duas réguas de superfície e no `descrever`: a aba da técnica de hoje (`tubos-hoje.js`) sai como
 * 4 dobras e 1 chanfro não declarados; com o campo (`tubos-hoje-aceita.js`) as duas réguas a contam como aceita, com o motivo, e o `descrever` a lista em seção
 * própria, como aviso (o código de saída não muda por causa dela). */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { dobraDaReceita } from './dobra-da-superficie.mjs';
import { vincoOcultoDaReceita } from './vinco-oculto.mjs';
import hoje from '../fixtures/solido-por-lacos/tubos-hoje.js';
import aceita from '../fixtures/solido-por-lacos/tubos-hoje-aceita.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '../..');
const LENTO = 120_000;
const descrever = (peca) => spawnSync('node', ['tools/modelar/descrever-peca.mjs', peca], { cwd: RAIZ, encoding: 'utf8' });

describe('dobra e vinco aceitos pelo plano', () => {
  it('sem o campo, a aba é 4 dobras e 1 chanfro; com ele, as duas réguas a contam como aceita, com o motivo', () => {
    const d0 = dobraDaReceita(hoje); const v0 = vincoOcultoDaReceita(hoje);
    expect([d0.dobras, d0.aceitas, v0.chanfros, v0.aceitos]).toEqual([4, 0, 1, 0]);
    const d1 = dobraDaReceita(aceita); const v1 = vincoOcultoDaReceita(aceita);
    expect([d1.dobras, d1.aceitas, v1.vincos, v1.chanfros, v1.aceitos]).toEqual([0, 4, 0, 0, 1]);
    expect(d1.superficies[0].aceitas.every((a) => /aba da técnica de hoje/.test(a.motivo))).toBe(true);
    expect(v1.superficies[0].aceitos[0]).toMatchObject({ tipo: 'chanfro', larguraMm: 7.9 });
  }, LENTO);

  it('o descrever avisa sem reprovar: a peça sem o campo lista os 5 como não declarados, e com ele os separa como aceitos', () => {
    const a = descrever('tools/fixtures/solido-por-lacos/tubos-hoje.js');
    expect(a.stdout).toMatch(/5 DOBRA\(S\) E VINCO\(S\) NÃO DECLARADO\(S\) \(aviso; não reprova\)/);
    expect(a.stdout).not.toMatch(/ACEITO\(S\) PELO PLANO/);
    const b = descrever('tools/fixtures/solido-por-lacos/tubos-hoje-aceita.js');
    expect(b.stdout).toMatch(/5 DOBRA\(S\) E VINCO\(S\) ACEITO\(S\) PELO PLANO/);
    expect(b.stdout).toMatch(/\(aceita: aba da técnica de hoje/);
    /* as pontas da cadeia saem no texto, para quem lê saber até onde a região aceita vai */
    expect(b.stdout).toMatch(/, de \[[-\d.; ]+\] a \[[-\d.; ]+\] mm \(aceit/);
    expect(a.stdout).toMatch(/, de \[[-\d.; ]+\] a \[[-\d.; ]+\] mm\n/);
    expect(b.stdout).not.toMatch(/NÃO DECLARADO\(S\)/);
    expect(b.status).toBe(a.status);
  }, LENTO);
});
