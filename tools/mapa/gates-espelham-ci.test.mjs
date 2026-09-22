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
import { DEPENDE_DE, GATES, RECURSOS_DO_GATE } from '../gates.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '../..');

function comandosDoCI() {
  const ci = readFileSync(join(REPO, '.github/workflows/ci.yml'), 'utf8');
  const encontrados = [...ci.matchAll(/^\s+run:\s*(.+)$/gm)].map((m) => m[1].trim());
  return new Set(encontrados
    .filter((c) => c.startsWith('npm run '))
    .map((c) => c.slice('npm run '.length).trim()));
}

/* A lista morava na corrente de `&&` do `package.json`. Ela saiu de lá porque
   `A && B` para no primeiro erro: com `npm test` vermelho, os dezesseis gates
   seguintes nunca rodavam e o estado deles era desconhecido. Agora `gates` é um
   runner que roda todos e relata todos, e a fonte da verdade é o array exportado
   por `tools/gates.mjs`. A garantia deste arquivo não mudou — só o lugar onde
   ele lê. */
function comandosDoGates() {
  return new Set(GATES);
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

  /* AS DECLARAÇÕES DE CONCORRÊNCIA APONTAM PARA GATES QUE EXISTEM. Recurso
     declarado para um nome que saiu da lista não trava nada, e a proteção some
     calada: os gates voltam a rodar juntos e a falha aparece longe daqui. */
  it('recurso e dependência só nomeiam gates da lista', () => {
    const fora = [
      ...Object.keys(RECURSOS_DO_GATE),
      ...Object.keys(DEPENDE_DE),
      ...Object.values(DEPENDE_DE),
    ].filter((nome) => !GATES.includes(nome));
    expect(fora, `nome fora da lista de gates: ${fora.join(', ')}`).toEqual([]);
  });

  it('nenhum gate depende de si mesmo nem de quem depende dele', () => {
    for (const [gate, anterior] of Object.entries(DEPENDE_DE)) {
      expect(gate, 'um gate não pode esperar por si mesmo').not.toBe(anterior);
      expect(DEPENDE_DE[anterior], `${gate} e ${anterior} esperam um pelo outro`).not.toBe(gate);
    }
  });

  it('o passo `gates` do package.json aponta para o runner', () => {
    /* Se alguém devolver a corrente de `&&` ao package.json, a lista acima
       deixa de descrever o que roda de fato — e este arquivo passaria a
       garantir o espelho errado, calado. */
    const pkg = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8'));
    expect(pkg.scripts.gates).toContain('tools/gates.mjs');
  });
});
