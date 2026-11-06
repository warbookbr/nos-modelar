/* chapa-grande.test.ts — bateria do plano da abertura em qualquer direção (`docs/modelar/planos/2026-11-06-abertura-em-qualquer-direcao.md`):
   o tempo de um vão numa chapa de cerca de 250 mil faces, do tamanho da do furgão (`chapa-grande.js`, 12 por 12 pontos, cinco níveis).
   É um teste lento (cerca de um minuto, com a memória de 3 GB): fica em `TESTES_LENTOS` de `tools/testes-lentos.mjs`. Mede o tempo da
   subdivisão sem o vão e o do passo todo, o gate de malha e a borda contra o desenho, e imprime os números do banco de provas. Antes
   desta bateria a chapa de 125 mil vértices estourava a pilha em `Math.max(...lista)` dentro da operação, e o adaptador do Three
   (`adaptar-three.js`, `push(...lote.faces)`) a estoura ainda: o gate de malha desta chapa roda sem o adaptador (sem a conferência de
   triângulo sem área da triangulação), e o limite vai para o banco de provas. */
import { describe, expect, it } from 'vitest';
import { VAO, passosDe } from './chapa-grande.js';
import { desvioDoVao, exigirFechada, gate1, piorDesvio, rodar } from './medidas';

describe('um vão numa chapa de 250 mil faces', () => {
  it('sai fechado, sem lasca, com a borda a menos de 0,5 mm do desenho, e o tempo vai para o banco de provas', () => {
    const sem = passosDe({ niveis: 5, abertura: false });
    const base = rodar(sem.TOPO, sem.PASSOS, 'chapa-grande');
    expect(base.orfaos).toEqual([]);
    const com = passosDe({ niveis: 5 });
    const neutro = rodar(com.TOPO, com.PASSOS, 'chapa-grande');
    expect(neutro.orfaos).toEqual([]);
    expect(neutro.F.size).toBeGreaterThan(240000);
    exigirFechada(gate1(neutro, undefined, { adaptador: false }));
    const d = desvioDoVao(neutro, 0, 'y', VAO);
    expect(piorDesvio(d)).toBeLessThan(0.5);
    console.log(JSON.stringify({ chapaGrande: { facesSemVao: base.F.size, facesComVao: neutro.F.size, msSubdivisao: base.ms, msPassoTodo: neutro.ms, msDoVao: neutro.ms - base.ms, desvioMm: Number(piorDesvio(d).toFixed(4)), limpeza: neutro.aberturas[0].limpeza, rssMB: Math.round(process.memoryUsage().rss / 1e6) } }));
  }, 900000);
});
