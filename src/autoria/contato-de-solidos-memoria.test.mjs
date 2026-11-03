/* contato-de-solidos-memoria.test.mjs — a memória de auditoria de uma execução do `descrever` reaproveita sólidos e pares sem
   mudar nenhuma resposta e sem depender da ordem.

   `descreverPeca` e `contatosDaPeca` auditavam os mesmos pares do zero (409 s e 411 s no furgão realista, 2026-11-03).
   `criarMemoriaDeAuditoria(neutro)` guarda o sólido de cada parte e o resultado de cada par e tolerância, só na memória do
   processo. A prova é a igualdade: com memória, cada função devolve o que devolvia sem ela, qualquer que seja quem audita
   primeiro, e um par nunca responde pela resposta de outro. */
import { describe, expect, it } from 'vitest';
import { auditarParDeSolidos, criarMemoriaDeAuditoria, prepararSolido } from './contato-de-solidos.js';
import { contatosDaPeca } from './contatos-da-peca.js';
import { descreverPeca } from './descrever-partes.js';
import { executarReceita } from './executar-receita.js';

function caixa(id, [x, y, z], lado = 1) {
  const V = new Map(); const F = new Map();
  const cantos = [];
  for (let i = 0; i < 8; i += 1) {
    const p = [x + (i & 1 ? lado : 0), y + (i & 2 ? lado : 0), z + (i & 4 ? lado : 0)];
    V.set(`${id}${i}`, p); cantos.push(`${id}${i}`);
  }
  const faces = [[0, 2, 3, 1], [4, 5, 7, 6], [0, 1, 5, 4], [2, 6, 7, 3], [0, 4, 6, 2], [1, 3, 7, 5]];
  faces.forEach((f, k) => F.set(`${id}f${k}`, { id: `${id}f${k}`, vs: f.map((i) => cantos[i]) }));
  return prepararSolido({ V, F }, undefined, id);
}

async function medirFixture(nome) {
  const mod = await import(`../../tools/modelar/fixtures/contatos/${nome}.js`);
  const receita = { meta: mod.meta, PASSOS: mod.PASSOS, ...(mod.contatos ? { contatos: mod.contatos } : {}) };
  return { receita, neutro: executarReceita(receita).neutro };
}

describe('memória de auditoria', () => {
  it('cada par responde pela sua conta: separados, encostados e invadidos na mesma memória', () => {
    const a = caixa('a', [0, 0, 0]);
    const longe = caixa('b', [5, 0, 0]);
    const encosta = caixa('c', [1, 0, 0]);
    const invade = caixa('d', [0.5, 0.5, 0.5]);
    const memoria = criarMemoriaDeAuditoria({});
    const pares = [[a, longe], [a, encosta], [a, invade], [longe, encosta], [encosta, invade]];
    for (const tolerancia of [1e-9, 1e-7]) {
      for (const [x, y] of pares) {
        expect(auditarParDeSolidos(x, y, tolerancia, { memoria })).toEqual(auditarParDeSolidos(x, y, tolerancia));
      }
    }
    expect(auditarParDeSolidos(a, longe, 1e-9).estado).toBe('separadas');
    expect(auditarParDeSolidos(a, encosta, 1e-9).estado).toBe('encostam');
    expect(auditarParDeSolidos(a, invade, 1e-9).estado).toBe('interpenetram');
    expect(memoria.pares.size).toBe(pares.length * 2);
  });

  it('a segunda pergunta sai da memória e a resposta devolvida não é a guardada', () => {
    const memoria = criarMemoriaDeAuditoria({});
    const a = caixa('a', [0, 0, 0]); const b = caixa('b', [0.5, 0, 0]);
    const primeira = auditarParDeSolidos(a, b, 1e-9, { memoria });
    const segunda = auditarParDeSolidos(a, b, 1e-9, { memoria });
    expect(memoria.pares.size).toBe(1);
    expect(segunda).toEqual(primeira);
    expect(segunda).not.toBe(primeira);
    const ordemInversa = criarMemoriaDeAuditoria({});
    expect(auditarParDeSolidos(b, a, 1e-9, { memoria: ordemInversa }).estado).toBe(primeira.estado);
  });

  it('o inconclusivo e a profundidade não passam pela memória', () => {
    const memoria = criarMemoriaDeAuditoria({});
    const a = caixa('a', [0, 0, 0]); const b = caixa('b', [0.5, 0, 0]);
    expect(auditarParDeSolidos(a, b, 1e-9, { memoria, profundidade: true }))
      .toEqual(auditarParDeSolidos(a, b, 1e-9, { profundidade: true }));
    expect(auditarParDeSolidos({ inconclusivo: 'malha-vazia' }, b, 1e-9, { memoria }).estado).toBe('inconclusivo');
    expect(memoria.pares.size).toBe(0);
  });

  it('descreverPeca e contatosDaPeca dão o mesmo com a memória compartilhada, em qualquer ordem', async () => {
    for (const nome of ['fixture-contato-declarado', 'fixture-contato-nao-declarado', 'fixture-parte-engolida']) {
      const { receita, neutro } = await medirFixture(nome);
      const semMemoria = { descricao: descreverPeca(neutro), contatos: contatosDaPeca(neutro, receita) };

      const m1 = criarMemoriaDeAuditoria(neutro);
      const descricaoPrimeiro = descreverPeca(neutro, { memoria: m1 });
      const contatosDepois = contatosDaPeca(neutro, receita, { memoria: m1 });
      expect(descricaoPrimeiro).toEqual(semMemoria.descricao);
      expect(contatosDepois).toEqual(semMemoria.contatos);

      const m2 = criarMemoriaDeAuditoria(neutro);
      const contatosPrimeiro = contatosDaPeca(neutro, receita, { memoria: m2 });
      const descricaoDepois = descreverPeca(neutro, { memoria: m2 });
      expect(contatosPrimeiro).toEqual(semMemoria.contatos);
      expect(descricaoDepois).toEqual(semMemoria.descricao);

      /* a mesma memória não cresce com a segunda passagem: os pares da descrição já estavam nos dos contatos */
      expect(m1.pares.size).toBe(m2.pares.size);
      expect(m1.pares.size).toBeGreaterThan(0);
    }
  });

  it('uma memória de outro neutro é recusada', async () => {
    const { receita, neutro } = await medirFixture('fixture-contato-declarado');
    const outra = criarMemoriaDeAuditoria({});
    expect(() => descreverPeca(neutro, { memoria: outra })).toThrow(/outro neutro/);
    expect(() => contatosDaPeca(neutro, receita, { memoria: outra })).toThrow(/outro neutro/);
  });
});
