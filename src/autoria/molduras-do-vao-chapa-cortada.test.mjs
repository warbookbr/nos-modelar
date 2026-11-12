/* molduras-do-vao-chapa-cortada.test.mjs — a abertura de uma chapa que um corte em painéis atravessou (atrito 2 do RECEITA.md do sedã).
 *
 * O corte (`paineisPorVaos`, ou qualquer `subtrair` por cima da chapa) tira os vértices da chapa onde a lâmina cruza a borda da abertura, e a
 * declaração em `vaos` procurava na malha o vértice de cada ponto da borda: com um ponto cortado, nenhuma declaração era possível e a abertura
 * reprovava sempre. A abertura segue sendo a volta de borda livre da gaiola, e a declaração `semMoldura` mede o que restou dela, diz quantos
 * pontos o corte tirou e segue exigindo o motivo; o vão com moldura continua recusando o ponto que sumiu (mensagem do código). A chapa é a de `friso-prova.js`
 * (vão de 200 x 200 mm), e a lâmina é um prisma de 10 mm que passa pelo meio de um lado do vão. */
import { describe, expect, it } from 'vitest';
import { nucleo } from '../../procedural/nucleo/entrada.js';
import * as prova from '../../procedural/nucleo/fixtures/friso-prova.js';
import { conferirVaosDaPeca, formatarVaos } from './molduras-do-vao.js';

const P = prova.pontos();
const lamina = (z0, z1) => ['extrusao', { origemId: 2, eixo: 'y', altura: 0.4, em: [0, 0.1, 0], perfil: [[0.395, z0], [0.405, z0], [0.405, z1], [0.395, z1]] }];
const passos = (cortada) => [
  ['subdivisao', { origemId: 1, ...prova.gaiola(), niveis: 2 }],
  ...(cortada ? [lamina(0.25, 0.35), ['subtrair', { origemId: 3, solidos: [{ origem: { op: 'subdivisao', id: 1 } }, { origem: { op: 'extrusao', id: 2 } }] }]] : []),
];
const executa = (cortada) => { const n = nucleo(passos(cortada), P); expect(n.orfaos).toEqual([]); return n; };
const declara = (extra) => [{ nome: 'abertura', borda: prova.bordaDoVao(), ...extra }];
const MOTIVO = 'a abertura é a boca do compartimento, aberta de propósito e fechada por outra peça';

describe('a abertura de uma chapa cortada por cima da borda', () => {
  it('sem o corte, a declaração sem moldura mede a borda inteira e não tem ponto cortado', () => {
    const r = conferirVaosDaPeca(executa(false), { vaos: declara({ semMoldura: { motivo: MOTIVO } }) });
    expect(r.problemas).toEqual([]);
    expect(r.vaos[0].cortados).toBe(0);
  });

  it('com o corte, a abertura é declarada, o texto diz quantos pontos o corte tirou e a medida cobre o que restou', () => {
    const inteira = conferirVaosDaPeca(executa(false), { vaos: declara({ semMoldura: { motivo: MOTIVO } }) });
    const neutro = executa(true);
    const r = conferirVaosDaPeca(neutro, { vaos: declara({ semMoldura: { motivo: MOTIVO } }) });
    expect(r.problemas).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.aberturas).toHaveLength(1);
    expect(r.aberturas[0].vao).toBe('abertura');
    expect(r.vaos[0].cortados).toBeGreaterThan(0);
    expect(r.vaos[0].comprimento).toBeGreaterThan(0.9 * inteira.vaos[0].comprimento);
    expect(formatarVaos(r)).toMatch(/ponto\(s\) dela cortado\(s\) pelas linhas de vão/);
  });

  it('a abertura cortada sem declaração continua reprovando, e o motivo curto continua recusado', () => {
    const r = conferirVaosDaPeca(executa(true), {});
    expect(r.ok).toBe(false);
    expect(r.problemas[0]).toMatch(/tem uma abertura sem declaração/);
    expect(() => conferirVaosDaPeca(executa(true), { vaos: declara({ semMoldura: { motivo: 'curto' } }) })).toThrow(/motivo/);
  });
});
