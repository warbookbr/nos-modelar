/* gates-espelham-ci.test.mjs — o comando local `npm run gates` cobre tudo o que
 * o CI executa.
 *
 * POR QUE ESTE TESTE EXISTE. Durante toda uma sessão eu disse "gates verdes"
 * rodando a suíte e quatro gates de documentação — e o CI reprovava no PRIMEIRO
 * passo, `typecheck`, que eu nunca tinha executado. Não havia comando único que
 * espelhasse o CI, então cada um montava o próprio subconjunto e a diferença
 * entre "verde aqui" e "verde lá" era invisível até o merge.
 *
 * E o mesmo buraco engoliu o gate da fronteira do laboratório: ele foi criado,
 * documentado como a promessa que sustenta a incubação, e não estava no
 * `ci.yml`. A promessa existia; a verificação não.
 *
 * Este teste falha quando os dois conjuntos divergem, em qualquer direção. */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '../..');

function comandosDoCI() {
  const ci = readFileSync(join(REPO, '.github/workflows/ci.yml'), 'utf8');
  const encontrados = [...ci.matchAll(/^\s+run:\s*(.+)$/gm)].map((m) => m[1].trim());
  return new Set(encontrados
    .filter((c) => c.startsWith('npm run '))
    .map((c) => c.slice('npm run '.length).trim()));
}

function comandosDoGates() {
  const pkg = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8'));
  const gates = pkg.scripts.gates ?? '';
  return new Set(gates.split('&&')
    .map((c) => c.trim())
    .filter((c) => c.startsWith('npm run '))
    .map((c) => c.slice('npm run '.length).trim()));
}

describe('npm run gates espelha o CI', () => {
  it('todo comando do CI está no gates', () => {
    const faltando = [...comandosDoCI()].filter((c) => !comandosDoGates().has(c));
    expect(faltando, `o CI roda isto e o gates local não: ${faltando.join(', ')}`).toEqual([]);
  });

  it('todo comando do gates está no CI', () => {
    /* A outra direção importa igual: um gate que só roda na máquina de quem
       escreveu não protege a main. */
    const sobrando = [...comandosDoGates()].filter((c) => !comandosDoCI().has(c));
    expect(sobrando, `o gates local roda isto e o CI não: ${sobrando.join(', ')}`).toEqual([]);
  });

  it('o script existe e não está vazio', () => {
    expect(comandosDoGates().size).toBeGreaterThan(10);
  });
});
