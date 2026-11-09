/* abre-na-bancada.test.mjs — toda peça e toda montagem do acervo vira cena Three.js pelo caminho da bancada, sem navegador.
 *
 * A bancada abre uma peça por `processarReceitaSessao` (que roda a receita e chama `adaptarThree`) e uma montagem por
 * `abrirMontagemDoAcervo` (que chama `adaptarMontagemThree`). Nenhuma outra conferência fazia essa conversão com o acervo
 * inteiro: `guarda:acervo` mede contato, plano e cadeia da receita sobre o neutro, e o neutro de uma face que as orelhas de
 * `adaptarThree` não fecham passa por todas elas. Foi assim que a face 3001 do capô do motor do avião chegou à bancada, que
 * abriu o avião sem o motor.
 *
 * Reprova dizendo a peça (ou o caminho da instância na montagem) e a face, que é o que a mensagem de `adaptarThree` traz.
 * Roda na bateria rápida (`npm run test:rapidos`), porque a conta é só CPU: o acervo inteiro leva segundos. */
import { describe, expect, it } from 'vitest';
import { listarParaBancada } from '../../../src/bancada/acervo-receitas.js';
import { processarReceitaSessao } from '../../../src/bancada/sessao/carregar-sessao.js';
import { resolverMontagemDoAcervo } from '../../../src/bancada/sessao/montagem-em-dados.js';
import { adaptarMontagemThree } from '../../../src/autoria/adaptar-montagem-three.js';

const acervo = listarParaBancada();
const pecas = acervo.filter((entrada) => !entrada.emDados && !entrada.ensaio);
const montagens = acervo.filter((entrada) => entrada.emDados && !entrada.ensaio);

describe('o acervo abre na bancada', () => {
  it('lista peças e montagens, para a varredura não passar vazia', () => {
    expect(pecas.length).toBeGreaterThan(0);
    expect(montagens.length).toBeGreaterThan(0);
  });

  it('cada peça vira cena por processarReceitaSessao, o caminho da bancada', async () => {
    const reprovadas = [];
    for (const entrada of pecas) {
      const receita = await entrada.carregar();
      /* parte planejada que espera a etapa: tem plano e nenhum passo, e a bancada não a desenha */
      if (!Array.isArray(receita?.PASSOS) || receita.PASSOS.length === 0) continue;
      try {
        processarReceitaSessao(receita, { nome: entrada.id });
      } catch (erro) {
        reprovadas.push(`${entrada.id}: ${erro.message}`);
      }
    }
    expect(reprovadas, `peças que não abrem na bancada:\n${reprovadas.join('\n')}`).toEqual([]);
    /* o furgão realista leva sozinho uns 250 s no CI desde a janela da cabine (oito vãos na booleana da chapa inteira, plano
       `2026-11-09-abertura-na-vizinhanca-de-todo-vao.md`), e o prazo padrão de 180 s não cobre o acervo */
  }, 600_000);

  it('cada montagem abre com todas as instâncias, sem aviso de "abriu sem"', async () => {
    const reprovadas = [];
    for (const entrada of montagens) {
      const resolvida = await resolverMontagemDoAcervo(await entrada.carregar(), acervo);
      adaptarMontagemThree(resolvida, {
        aoFalhar: (caminho, erro) => reprovadas.push(`${entrada.id} abriu sem ${caminho.join('/')}: ${erro.message}`),
      });
    }
    expect(reprovadas, `instâncias que não abrem na bancada:\n${reprovadas.join('\n')}`).toEqual([]);
  });
});
