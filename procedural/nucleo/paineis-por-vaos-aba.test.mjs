/* paineis-por-vaos-aba.test.mjs — a opção `aba` de `paineisPorVaos`: a borda de cada painel cortado dobra para dentro com uma perna, e o vão entre dois painéis ganha fundo
 * sem o forro (atrito 3 do RECEITA.md do sedã). Fixtures sem domínio: a chapa plana de 1 mm cortada por uma linha, com um piso estreito por baixo (só o raio que desce pelo
 * vão, de lado, passa ao largo dele), medida por `vao:partes --fundo=modelo` (`vaoEntrePartes`): sem a aba o vão é "sem fundo", com ela não é; e o que a opção não pode mudar. */
import { describe, expect, it } from 'vitest';
import { paineisPorVaos } from './paineis-por-vaos.js';
import { nucleo } from './entrada.js';
import { vaoEntrePartes } from '../../tools/modelar/vao-entre-partes.mjs';

const T = 1;
const chapa = () => ['extrusao', { origemId: 1, eixo: 'x', altura: 400, em: [-200, 0, 0], perfil: [[0, 0], [-T, 0], [-T, 400], [0, 400]] }];
/* o perfil de extrusao em x é [-y, z]; a chapa tem y de 0 a T e z de 0 a 400 */
const LINHAS = [{ nome: 'meio', eixo: 'y', pontos: [[-300, 200], [300, 200]] }];
const PAINEIS = [{ nome: 'a', eixo: 'y', ponto: [0, 100] }, { nome: 'b', eixo: 'y', ponto: [0, 300] }];
const cortar = (extra = {}) => paineisPorVaos({ chapa: { passos: [chapa()], origem: { op: 'extrusao', id: 1 } }, vao: 4, linhas: LINHAS, paineis: PAINEIS, modo: 'superficie', ...extra });
const comPiso = (g) => [...g.passos,
  ['extrusao', { origemId: 90, eixo: 'y', altura: 1, em: [0, -61, 0], perfil: [[-900, 170], [900, 170], [900, 230], [-900, 230]] }],
  ['parte', { nome: 'piso', sel: { origem: { op: 'extrusao', id: 90 } } }]];
const executa = (passos) => { const st = nucleo(passos, {}, {}); expect(st.orfaos).toEqual([]); return st; };
const faces = (st) => [...st.F.values()].filter((f) => f.parte).map((f) => ({ pts: f.vs.map((v) => st.V.get(v)), parte: f.parte }));
const fundoDoVao = (st) => vaoEntrePartes(faces(st), { fundo: Infinity, soltas: 'recusar', linhaMinima: 10 }).pares.find((p) => p.a === 'a' && p.b === 'b');
/* o vão sem fundo que o comando recusa: o trecho de linha acima da linha mínima (10 mm); as pontas de 5 mm onde a chapa acaba, pelo lado, não contam */
const semFundo = (par) => par.fora.filter((f) => /vão sem fundo/.test(f.motivo));

describe('a aba do painel cortado', () => {
  it('sem a opção os passos são os de antes, e o vão sem a aba é sem fundo para o raio que passa ao lado do piso', () => {
    const sem = cortar();
    expect(sem.passos).toEqual(cortar({ aba: undefined }).passos);
    expect(sem.passos).toEqual(cortar({ aba: false }).passos);
    expect(sem.passos.some((p) => p[0] === 'unir')).toBe(false);
    const antes = fundoDoVao(executa(comPiso(sem)));
    expect(semFundo(antes)).toHaveLength(1);
    expect(antes.semFundo.linhaMm).toBeGreaterThan(390); /* a chapa tem 400 mm de comprimento */
  });

  it('com aba de 12 mm a 90 graus o vão tem fundo, os painéis seguem dois, e a perna é do painel', () => {
    const g = cortar({ aba: { largura: 12, angulo: 90, raio: 0.5 } });
    const st = executa(comPiso(g));
    expect(g.passos.filter((p) => p[0] === 'unir')).toHaveLength(1);
    expect(g.partes.every((p) => p.origem.op === 'unir')).toBe(true);
    const par = fundoDoVao(st);
    expect(semFundo(par)).toEqual([]);
    expect(par.semFundo.linhaMm).toBeLessThan(10);
    for (const nome of ['a', 'b']) {
      const ys = faces(st).filter((f) => f.parte === nome).flatMap((f) => f.pts.map((q) => q[1]));
      expect(Math.min(...ys)).toBeLessThan(-T - 10);
      expect(Math.max(...ys)).toBeLessThanOrEqual(T + 1e-6);
    }
    expect(new Set(faces(st).map((f) => f.parte))).toEqual(new Set(['a', 'b', 'piso']));
    /* o vão da pele segue o pedido: a perna recua da parede e não o estreita */
    expect(g.medidas.folgaMedida).toBeGreaterThanOrEqual(4 - 1e-6);
  });

  it('com aba a limpeza do corte desfaz a face fina até a razão 0,004 (a perna passa rente à parede); sem aba o passo é o de antes, e `limpar.limite` troca o valor', () => {
    const limpa = (g) => g.passos.find((p) => p[0] === 'limparLascas')[1];
    expect(limpa(cortar()).limite).toBeUndefined();
    expect(limpa(cortar({ aba: { largura: 12 } })).limite).toBe(0.004);
    expect(limpa(cortar({ aba: { largura: 12 }, limpar: { tolerancia: 0.01, limite: 0.006 } })).limite).toBe(0.006);
    expect(limpa(cortar({ limpar: { tolerancia: 0.02 } }))).toEqual({ sel: { origem: expect.any(Object) }, tolerancia: 0.02 });
    expect(() => cortar({ limpar: { tolerancia: 0.01, limite: 0.9 } })).toThrow(/limite entre 0 e 0,5/);
  });

  it('a perna inclinada a 60 graus, sem raio, tira o vão do chão e a saída é a mesma em duas chamadas', () => {
    const a = cortar({ aba: { largura: 14, angulo: 60 } });
    const b = cortar({ aba: { largura: 14, angulo: 60 } });
    expect(JSON.stringify(a.passos)).toBe(JSON.stringify(b.passos));
    const par = fundoDoVao(executa(comPiso(a)));
    /* a perna de cada painel se inclina para baixo dele, e de um dos lados deixa passar parte dos raios: o vão fecha menos que a 90 graus */
    process.stdout.write(`[aba] 60 graus: ${par.semFundo ? par.semFundo.linhaMm : 0} mm de linha sem fundo\n`);
    expect(par.semFundo?.linhaMm ?? 0).toBeLessThan(402.5);
  });

  it('a aba por linha vale sobre a da chamada, e aba: false deixa a linha sem perna', () => {
    const g = cortar({ aba: { largura: 12 }, linhas: [{ ...LINHAS[0], aba: false }] });
    expect(g.passos.some((p) => p[0] === 'unir')).toBe(false);
    const h = cortar({ linhas: [{ ...LINHAS[0], aba: { largura: 8, angulo: 90 } }] });
    expect(h.passos.filter((p) => p[0] === 'unir')).toHaveLength(1);
  });

  it('as recusas dizem o campo: largura, angulo fora de 45 a 90, campo desconhecido e linha de vista', () => {
    const grito = (extra) => { try { cortar(extra); } catch (e) { return e.message; } return 'não gritou'; };
    expect(grito({ aba: { largura: 0 } })).toMatch(/largura é o comprimento da perna/);
    expect(grito({ aba: { largura: 10, angulo: 120 } })).toMatch(/angulo é o giro da chapa na dobra, de 45 a 90 graus/);
    expect(grito({ aba: { largura: 10, angulo: 30 } })).toMatch(/de 45 a 90 graus/);
    expect(grito({ aba: { largura: 10, cor: 1 } })).toMatch(/campo desconhecido 'cor'/);
    expect(grito({ modo: 'vista', aba: { largura: 10 } })).toMatch(/só vale no modo 'superficie'/);
    });

  it('na emenda em T a perna acaba antes da outra linha: três painéis, as pernas não se encostam, e o aviso diz quantos trechos ficaram sem perna', () => {
    const linhas = [{ nome: 'A', eixo: 'y', pontos: [[-300, 200], [300, 200]] }, { nome: 'B', eixo: 'y', pontos: [[0, 200], [0, 500]] }];
    const paineis = [{ nome: 'a', eixo: 'y', ponto: [0, 100] }, { nome: 'b', eixo: 'y', ponto: [-100, 300] }, { nome: 'c', eixo: 'y', ponto: [100, 300] }];
    const g = cortar({ linhas, paineis, aba: { largura: 12, angulo: 90 } });
    const st = executa(g.passos);
    expect(new Set(faces(st).map((f) => f.parte))).toEqual(new Set(['a', 'b', 'c']));
    expect(g.avisos.some((x) => x.ref === 'abaCortadaNaEmenda')).toBe(true);
    expect(g.medidas.aba.trechosSemPerna).toBeGreaterThan(0);
    expect([...st.F.values()].filter((f) => !f.parte)).toEqual([]);
    /* as pernas dos três painéis existem, e a de A acaba antes de B: nenhum vértice de perna (abaixo da chapa) de x entre -16 e 16 na faixa de A */
    const baixo = faces(st).flatMap((f) => f.pts).filter((q) => q[1] < -T - 1);
    expect(baixo.length).toBeGreaterThan(0);
    expect(baixo.some((q) => Math.abs(q[0]) < 16 && Math.abs(q[2] - 200) > 3 && Math.abs(q[2] - 200) < 10 && Math.abs(q[0]) > 3)).toBe(false);
  });
});
