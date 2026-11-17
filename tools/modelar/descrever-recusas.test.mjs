/* descrever-recusas.test.mjs — `descrever --recusas` dá a mesma lista que `nucleo(gerarPassos(TABELA)).orfaos`, o script de uma linha que a sessão de
   2026-11-13 a 2026-11-16 reescreveu 188 vezes (gate 2 do plano de comparar com a referência). Três peças: duas que geram sem recusa e uma com um passo
   recusado de propósito, um material que cita uma origem que não existe. O núcleo recebe o que a receita exporta além dos passos (PARAMS, TOPO, MATERIAIS,
   ESQUELETO, ALIASES), como `executarReceita` passa: a linha literal `nucleo(gerarPassos(TABELA))`, sem eles, inventa órfãos de ponto e de alias que não
   existem na peça (4 na carenagem e 42 na lava-louças, medido em 2026-11-17). */
import { describe, expect, it } from 'vitest';
import { descreverPecaReutilizavel } from './descrever-peca.mjs';
import { nucleo } from '../../procedural/nucleo/entrada.js';
import * as carenagem from '../../procedural/pecas/carenagem-de-prova/receita.js';
import * as lavaLoucas from '../../procedural/pecas/lava-loucas-compacta-branca/receita.js';

const texto = (o) => `passo ${o.passo} (${o.op}): ${o.motivo}${o.ref == null ? '' : ` — ref ${JSON.stringify(o.ref)}`}`;
const linhasDoStdout = (stdout) => stdout.split('\n').filter((l) => /^ {2}passo \d+ \(/.test(l)).map((l) => l.slice(2));

const PASSO_RECUSADO = ['material', { sel: { origem: { op: 'subdivisao', id: 99 } }, usa: 'chapa' }];
const CASOS = [
  { nome: 'carenagem-de-prova', mod: carenagem, passos: carenagem.gerarPassos(carenagem.TABELA) },
  { nome: 'lava-loucas-compacta-branca', mod: lavaLoucas, passos: lavaLoucas.gerarPassos(lavaLoucas.TABELA) },
  { nome: 'carenagem-de-prova', mod: carenagem, passos: [...carenagem.gerarPassos(carenagem.TABELA), PASSO_RECUSADO], recusada: true },
];

describe('descrever --recusas', () => {
  for (const caso of CASOS) {
    it(`${caso.nome}${caso.recusada ? ' com um passo recusado' : ''}: a mesma lista que nucleo(gerarPassos(TABELA)).orfaos`, async () => {
      const d = caso.mod.default;
      const esperado = nucleo(caso.passos, d.PARAMS, d.TOPO, d.MATERIAIS, d.ESQUELETO, d.ALIASES).orfaos;
      const modulo = { ...d, PASSOS: caso.passos };
      const r = await descreverPecaReutilizavel({ peca: caso.nome, modulo, recusas: true });
      expect(r.resultado.orfaos).toEqual(esperado);
      const linhas = linhasDoStdout(r.stdout);
      expect(linhas).toHaveLength(esperado.length);
      expect([...linhas].sort()).toEqual(esperado.map(texto).sort());
      expect(r.codigo).toBe(esperado.length ? 1 : 0);
      expect(r.resultado.descricao).toBeUndefined();
      if (caso.recusada) {
        expect(esperado.length).toBeGreaterThan(0);
        expect(r.stdout).toMatch(/RECUSA\(S\) DO NÚCLEO/);
        expect(linhas.some((l) => l.startsWith(`passo ${caso.passos.length - 1} (material)`))).toBe(true);
      } else {
        expect(esperado).toEqual([]);
        expect(r.stdout).toMatch(/^SEM RECUSA/);
      }
    });
  }
});
