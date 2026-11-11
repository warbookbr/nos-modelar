import { it } from 'vitest';
// @ts-expect-error
import { paineisPorVaos } from './paineis-por-vaos.js';
// @ts-expect-error
import { nucleo } from './entrada.js';
it('x', () => {
  const rad = Math.PI / 180; const rc = 10, mm = 6; const TAN38 = Math.tan(38 * rad);
  const laco = (em: number) => { const a = 60 + em * TAN38; const b = 40 + em * TAN38;
    const arco = (cx: number, cz: number, a0: number) => Array.from({ length: mm + 1 }, (_, k) => { const t = a0 + (Math.PI / 2) * k / mm; return [cx + rc * Math.cos(t), cz + rc * Math.sin(t)]; });
    return { em, trechos: { baixo: [[-a + rc, -b], [a - rc, -b]], dir: [...arco(a - rc, -b + rc, -Math.PI / 2), ...arco(a - rc, b - rc, 0)], cima: [[a - rc, b], [-a + rc, b]], esq: [...arco(-a + rc, b - rc, Math.PI / 2), ...arco(-a + rc, -b + rc, Math.PI)] } }; };
  // @ts-expect-error
  return import('./gaiola-por-lacos.js').then(({ gaiolaPorLacos }) => {
  const gaiola = gaiolaPorLacos({ nome: 'cuba', eixo: 'y', tampa: { de: 'esq', ate: 'dir' }, aberta: 'fim', espessura: 1, trechos: [{ nome: 'baixo', pontos: 5 }, { nome: 'dir', pontos: 9 }, { nome: 'cima', pontos: 5 }, { nome: 'esq', pontos: 9 }], lacos: [0, 20, 40, 60, 80].map(laco) });
  const CUBA = [['subdivisao', { origemId: 1, ...gaiola.passo, niveis: 2, espessura: 1 }]];
  const g = paineisPorVaos({ chapa: { passos: CUBA, origem: { op: 'subdivisao', id: 1 }, pontos: gaiola.pontosMm }, vao: 4, linhas: [{ nome: 'meio', eixo: 'y', pontos: [[-150, 0], [150, 0]] }], paineis: [{ nome: 'a', eixo: 'y', ponto: [0, 20] }], modo: 'superficie' });
  const st = nucleo(g.passos, {}, gaiola.pontosMm);
  console.log('avisos', JSON.stringify(g.avisos.map((a: any) => a.ref)), 'ferr', g.passos.filter((p: any, i: number) => i > 0 && p[0] === 'subdivisao').length);
  const br = [...st.V.values()].filter((p: number[]) => Math.abs(p[2]) < 1.9).map((p: number[]) => p.map((x) => Math.round(x * 10) / 10));
  console.log('bridge', br.length, JSON.stringify(br.slice(0, 30)));
  });
});
