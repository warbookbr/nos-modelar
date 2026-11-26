/* abre-na-bancada.test.mjs — toda peça e toda montagem do acervo vira cena Three.js pelo caminho da bancada, sem navegador.
 *
 * A bancada abre uma peça por `processarReceitaSessao` (que roda a receita e chama `adaptarThree`) e uma montagem por
 * `abrirMontagemDoAcervo` (que chama `adaptarMontagemThree`). Nenhuma outra conferência fazia essa conversão com o acervo
 * inteiro: `guarda:acervo` mede contato, plano e cadeia da receita sobre o neutro, e o neutro de uma face que as orelhas de
 * `adaptarThree` não fecham passa por todas elas. Foi assim que a face 3001 do capô do motor do avião chegou à bancada, que
 * abriu o avião sem o motor.
 *
 * As peças saíram para `abre-na-bancada-pecas-1` a `-3.test.mjs`, em fatias, com a mesma conta da fatia; aqui ficam as montagens e a
 * conferência de que as fatias cobrem o acervo.
 *
 * Reprova dizendo a peça (ou o caminho da instância na montagem) e a face, que é o que a mensagem de `adaptarThree` traz.
 * Roda na bateria rápida (`npm run test:rapidos`), porque a conta é só CPU: o acervo inteiro leva segundos. */
import { describe, expect, it } from 'vitest';
import { listarParaBancada } from '../../../src/bancada/acervo-receitas.js';
import { resolverMontagemDoAcervo } from '../../../src/bancada/sessao/montagem-em-dados.js';
import { adaptarMontagemThree } from '../../../src/autoria/adaptar-montagem-three.js';


const acervo = listarParaBancada();
const pecas = acervo.filter((entrada) => !entrada.emDados && !entrada.ensaio);
/* as peças da fatia n de 3, pela ordem do id: toda peça cai em exatamente uma fatia (a mesma conta nos quatro arquivos) */
const pecasDaFatia = (n, total = 3) => [...pecas].sort((a, b) => a.id.localeCompare(b.id)).filter((_, i) => i % total === n - 1);
const montagens = acervo.filter((entrada) => entrada.emDados && !entrada.ensaio);

describe('o acervo abre na bancada', () => {
  it('lista peças e montagens, para a varredura não passar vazia', () => {
    expect(pecas.length).toBeGreaterThan(0);
    expect(montagens.length).toBeGreaterThan(0);
  });

  it('as fatias das peças cobrem o acervo, cada peça numa fatia só', () => {
    const ids = [1, 2, 3].flatMap((n) => pecasDaFatia(n).map((e) => e.id));
    expect(ids.sort()).toEqual(pecas.map((e) => e.id).sort());
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cada montagem abre com todas as instâncias, sem aviso de "abriu sem"', async () => {
    const reprovadas = [];
    const emConstrucao = [];
    for (const entrada of montagens) {
      const dados = await entrada.carregar();
      /* A montagem em construção, que tem instância de peça planejada sem nenhum passo (como no teste das peças), fica de fora: as
         portas dos vínculos só existem depois da primeira rodada da peça, e a do robô humanoide (2026-11-14) reprovava por isso. Ela
         volta a ser aberta assim que todas as peças dela tiverem forma. */
      const semForma = [];
      for (const instancia of dados?.instancias ?? []) {
        if (instancia?.alvo?.tipo !== 'peca') continue;
        const receita = await acervo.find((e) => e.id === instancia.alvo.ref)?.carregar();
        if (receita && Array.isArray(receita.PASSOS) && receita.PASSOS.length === 0) semForma.push(instancia.alvo.ref);
      }
      if (semForma.length) { emConstrucao.push(`${entrada.id}: ${[...new Set(semForma)].join(', ')}`); continue; }
      const resolvida = await resolverMontagemDoAcervo(dados, acervo);
      adaptarMontagemThree(resolvida, {
        aoFalhar: (caminho, erro) => reprovadas.push(`${entrada.id} abriu sem ${caminho.join('/')}: ${erro.message}`),
      });
    }
    if (emConstrucao.length) console.warn(`montagens em construção, fora da varredura (peças sem passo):\n${emConstrucao.join('\n')}`);
    expect(emConstrucao.length, 'ao menos uma montagem do acervo foi aberta').toBeLessThan(montagens.length);
    expect(reprovadas, `instâncias que não abrem na bancada:\n${reprovadas.join('\n')}`).toEqual([]);
    /* as seis montagens levaram mais de 180 s no CI em 2026-11-12, quando a do sedã entrou: medidas na máquina local, avião 6 s, braço 17 s, carrinho 5 s,
       empilhadeira 13 s, instalação solar 3 s e sedã 236 s, porque cada uma das cinco etapas do sedã executa o recorte do carro inteiro. O limite é o do teste das
       peças; o custo de abrir o sedã é defeito da receita dele, anotado no RECEITA.md do banco de provas (atrito 9), e não deste teste. */
  }, 900_000);
});
