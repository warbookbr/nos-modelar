/* dobra-da-superficie.test.mjs — a régua de dobra sobre superfícies pequenas feitas aqui: duas faces que se dobram num ângulo conhecido.
 * O diedro é 180 graus menos o ângulo entre as normais; abaixo do mínimo a aresta fora de vinco é dobra, com a parte, o lugar e o ângulo;
 * o vinco declarado e a borda livre não entram; as arestas que se tocam são uma dobra só; e a mesma superfície dá a mesma saída. A régua
 * contra a peça de prova com a aba torta está em `tools/fixtures/solido-por-lacos/tubos.test.ts`. */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { AJUDA, PADROES, dobraDaReceita, dobraDaSuperficie, superficiesDaReceita, textoDaDobra } from './dobra-da-superficie.mjs';
import { executarComCachePorPasso } from './entrada-de-medida.mjs';
import { importarReceita, receitaDoModulo } from './importar-receita.mjs';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';
import { AJUDA as AJUDA_DO_VINCO, vincoOcultoDaReceita } from './vinco-oculto.mjs';

/* duas faces de 1 m por 1 m: a primeira plana, em z = 0, e a segunda dobrada para cima `a` graus em torno da aresta x = 1 */
function folha(a, { vincos = [], parte = 'chapa' } = {}) {
  const r = (a * Math.PI) / 180;
  const vertices = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [1 + Math.cos(r), 0, Math.sin(r)], [1 + Math.cos(r), 1, Math.sin(r)]];
  return {
    vertices, faces: [[0, 1, 2, 3], [2, 1, 4, 5]], vincos, partes: vertices.map(() => new Set([parte])),
    gaiola: { vertices: [[0, 0, 0], [1, 0, 0]] }, nomeDe: (j) => ['ponta', 'aresta'][j],
  };
}

describe('dobra da superfície: o diedro agudo entre faces vizinhas fora de vinco', () => {
  it('a folha dobrada 100 graus tem diedro de 80 e é dobra, com a parte, o lugar, o ponto da gaiola e o ângulo', () => {
    const { arestas, dobras } = dobraDaSuperficie(folha(100));
    expect(arestas).toBe(7);
    expect(dobras).toHaveLength(1);
    expect(dobras[0]).toMatchObject({ parte: 'chapa', posicaoMm: [1000, 500, 0], diedroGraus: 80, arestas: 1, extensaoMm: 1000, pertoDe: 'aresta' });
    expect(textoDaDobra(dobras[0])).toBe('dobra na parte chapa, em [1000; 500; 0] mm, perto do ponto aresta da gaiola: diedro de 80 graus em 1 aresta(s), 1000 mm, de [1000; 0; 0] a [1000; 1000; 0] mm');
    expect(dobras[0].caixaMm).toEqual({ min: [1000, 0, 0], max: [1000, 1000, 0] });
  });

  it('a folha lisa, ou dobrada pouco, não é dobra, e o limiar é do diedro (120 graus por padrão)', () => {
    expect(PADROES.diedroMinimoGraus).toBe(120);
    expect(dobraDaSuperficie(folha(0)).dobras).toEqual([]);
    expect(dobraDaSuperficie(folha(59)).dobras).toEqual([]);
    expect(dobraDaSuperficie(folha(61)).dobras).toHaveLength(1);
    expect(dobraDaSuperficie(folha(100), { diedroMinimoGraus: 80 }).dobras).toEqual([]);
    expect(dobraDaSuperficie(folha(100), { diedroMinimoGraus: 81 }).dobras).toHaveLength(1);
  });

  it('o vinco declarado, de qualquer nitidez, tira a aresta da medida, e a borda livre nunca entra', () => {
    expect(dobraDaSuperficie(folha(100, { vincos: [[1, 2, 0.3]] })).dobras).toEqual([]);
    expect(dobraDaSuperficie(folha(100, { vincos: [[2, 1, true]] })).dobras).toEqual([]);
    /* as outras seis arestas só têm uma face */
    expect(dobraDaSuperficie(folha(179)).dobras).toHaveLength(1);
  });

  it('a parte vem das faces da aresta, a mais dobrada vem primeiro, e a mesma superfície dá a mesma saída', () => {
    const a = dobraDaSuperficie(folha(100, { parte: 'tubo' }));
    expect(a.dobras[0].parte).toBe('tubo');
    expect(JSON.stringify(dobraDaSuperficie(folha(100, { parte: 'tubo' })))).toBe(JSON.stringify(a));
    /* duas dobras que não se tocam: uma terceira face dobra para baixo a 150 graus, e a de menor diedro vem primeiro */
    const f = folha(100);
    f.vertices.push([0 - Math.cos(0.5), 0, -Math.sin(0.5)], [0 - Math.cos(0.5), 1, -Math.sin(0.5)]);
    f.faces.push([0, 3, 7, 6]);
    f.partes.push(new Set(['chapa']), new Set(['chapa']));
    const duas = dobraDaSuperficie(f, { diedroMinimoGraus: 170 }).dobras;
    expect(duas).toHaveLength(2);
    expect(duas[0].diedroGraus).toBeLessThan(duas[1].diedroGraus);
  });
});

/* A superfície lida do que a execução guardou (`neutro.chapas`) contra a gaiola e o refino refeitos, e a execução que recomeça do
   cache por passo contra a direta: a carenagem de prova tem medidas, simetria e espessura, o ombro do braço não tem medida, e a alça
   da empilhadeira tem duas chapas, uma por passo `subdivisao` (a chapa trocada entre os passos tem de aparecer). `daExecucaoGuardada`
   diz por qual caminho cada superfície saiu: sem ele, a régua que sempre refizesse a gaiola passaria na igualdade. A
   lataria do carro, que leva um minuto sem cache, está medida no banco de provas do laço mais rápido (2026-11-26). */
describe('a dobra e o vinco pela execução guardada dão o mesmo que refazendo a subdivisão', () => {
  const comparavel = (sups) => sups.map(({ gaiola, nomeDe, partes, daExecucaoGuardada, ...resto }) => ({
    ...resto, partes: partes.map((p) => [...p].sort()), gaiola: gaiola.vertices, imagem: gaiola.imagem ?? null, nomes: gaiola.vertices.map((_, j) => nomeDe(j)),
  }));
  const semDesenho = ({ _desenho, ...resto }) => ({ ...resto, segmentos: _desenho.map((d) => d.segmentos) });

  const CHAPAS = { 'carenagem-de-prova': 1, 'braco-robotico/ombro': 1, 'empilhadeira/alca': 2 };
  const caminhos = (sups) => sups.map((sup) => sup.daExecucaoGuardada);
  for (const peca of Object.keys(CHAPAS)) {
    it(`${peca}: a mesma superfície, a mesma dobra e o mesmo vinco, direto, pelo cache frio e pelo cache quente`, async () => {
      const caminho = resolverCaminhoReceita(peca);
      const receita = receitaDoModulo(await importarReceita(caminho));
      const direta = executarReceita(receita);
      const refeitas = superficiesDaReceita(receita, direta, { guardada: false });
      expect(refeitas).toHaveLength(CHAPAS[peca]);
      expect(direta.neutro.chapas.map((c) => c.passo)).toEqual(refeitas.map((sup) => sup.passo));
      expect(comparavel(superficiesDaReceita(receita, direta))).toEqual(comparavel(refeitas));
      /* o caminho de cada superfície: a execução com as chapas é lida do guardado, em todo passo, e a refeita não */
      expect(caminhos(superficiesDaReceita(receita, direta))).toEqual(refeitas.map(() => true));
      expect(caminhos(refeitas)).toEqual(refeitas.map(() => false));
      const dobra = JSON.stringify(dobraDaReceita(receita, {}, direta));
      const vinco = JSON.stringify(semDesenho(vincoOcultoDaReceita(receita, {}, direta)));
      /* sem `executada`, as réguas executam a receita elas mesmas */
      expect(JSON.stringify(dobraDaReceita(receita))).toBe(dobra);
      /* a execução sem as chapas (um estado montado por quem chama) cai na gaiola refeita, com a mesma saída */
      const semChapas = { entrada: direta.entrada, neutro: { V: direta.neutro.V, F: direta.neutro.F } };
      expect(caminhos(superficiesDaReceita(receita, semChapas))).toEqual(refeitas.map(() => false));
      expect(JSON.stringify(dobraDaReceita(receita, {}, semChapas))).toBe(dobra);
      /* a chapa sem os vincos, sem os cantos ou sem a borda não ganha valor suposto: cai na conta direta, com a mesma saída */
      for (const campo of ['vincos', 'cantos', 'borda', 'faces']) {
        const semCampo = { entrada: direta.entrada, neutro: { ...direta.neutro, chapas: direta.neutro.chapas.map(({ [campo]: _fora, ...chapa }) => chapa) } };
        expect(caminhos(superficiesDaReceita(receita, semCampo)), campo).toEqual(refeitas.map(() => false));
        expect(comparavel(superficiesDaReceita(receita, semCampo)), campo).toEqual(comparavel(refeitas));
      }
      expect(JSON.stringify(semDesenho(vincoOcultoDaReceita(receita, {}, semChapas)))).toBe(vinco);
      const pasta = mkdtempSync(join(tmpdir(), 'dobra-pelo-cache-'));
      try {
        const fria = await executarComCachePorPasso(caminho, receita, { pastaDoCachePorPrefixo: pasta });
        const quente = await executarComCachePorPasso(caminho, receita, { pastaDoCachePorPrefixo: pasta });
        expect(fria.cachePorPasso.recomecouDoPasso).toBe(0);
        expect(quente.cachePorPasso.recomecouDoPasso).toBe(quente.cachePorPasso.total);
        for (const { executada } of [fria, quente]) {
          expect(comparavel(superficiesDaReceita(receita, executada))).toEqual(comparavel(refeitas));
          expect(caminhos(superficiesDaReceita(receita, executada))).toEqual(refeitas.map(() => true));
          expect(JSON.stringify(dobraDaReceita(receita, {}, executada))).toBe(dobra);
          expect(JSON.stringify(semDesenho(vincoOcultoDaReceita(receita, {}, executada)))).toBe(vinco);
        }
      } finally { rmSync(pasta, { recursive: true, force: true }); }
    });
  }
});

describe('a ajuda das duas réguas', () => {
  for (const [ferramenta, ajuda] of [['dobra-da-superficie', AJUDA], ['vinco-oculto', AJUDA_DO_VINCO]]) {
    it(`${ferramenta} responde --ajuda com o uso, sem executar receita, e recusa o argumento que não conhece dizendo o esperado`, () => {
      const roda = (...args) => spawnSync(process.execPath, [`tools/modelar/${ferramenta}.mjs`, ...args], { encoding: 'utf8' });
      for (const args of [['--ajuda'], ['carenagem-de-prova', '--ajuda'], ['--help']]) {
        const r = roda(...args);
        expect([r.status, r.stdout.trim(), r.stderr]).toEqual([0, ajuda, '']);
      }
      expect(ajuda).toContain(`node tools/modelar/${ferramenta}.mjs <peça>`);
      expect(ajuda).toContain('--sem-cache');
      const semPeca = roda();
      expect(semPeca.status).toBe(2);
      expect(semPeca.stderr).toContain('recebido sem a peça; esperado o nome dela.');
      expect(semPeca.stderr).toContain(ajuda);
      const desconhecido = roda('carenagem-de-prova', '--nao-existe');
      expect(desconhecido.status).toBe(1);
      expect(desconhecido.stderr).toContain('argumento recebido: --nao-existe; esperado');
      expect(desconhecido.stderr).toContain(`node tools/modelar/${ferramenta}.mjs --ajuda`);
      expect(desconhecido.stdout).toBe('');
    });
  }
});
