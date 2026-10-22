/* alisar-a-superficie.test.mjs — a ferramenta de alisamento sobre chapas desenhadas por código.
 *
 * A chapa de prova tem as estações-chave com um erro de leitura de até 1,5 mm plantado nos pontos-chave das curvas de seção,
 * e a interpolação espalha o erro em ondulações de várias estações. O alisamento tira as falhas acima do limiar com todas as
 * medidas a até 2 mm, edita só números da TABELA que movem entradas editáveis, dá as mesmas edições em duas execuções e
 * devolve a TABELA como estava. Uma forma com uma dobra real e sem vinco declarado sai como não alisável dentro da
 * tolerância, com as falhas que sobram e as medidas que impedem. As conferências não usam o modelo da ferramenta: aplicam
 * as edições a uma TABELA nova e rodam a receita e a leitura de ondulação. */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { derivar, receitaDeProva, secao } from './fixtures/alisar-prova.js';
import { PLANTADA as ONDULACAO_PLANTADA, receitaDeProva as chapaDaOndulacao } from './fixtures/ondulacao-prova.js';
import { gravarCopia, alisarReceita, pesosDaMalha, pontosDosCortes } from './alisar-a-superficie.mjs';
import { ondulacaoDaSuperficie, superficiesDaReceita } from './ondulacao-da-superficie.mjs';
import { cholesky, indiceEspacial, minimosQuadradosComBolas } from './alisar-numerico.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const REPO = join(AQUI, '../..');
const MM = 1000;

/* os cortes em z da forma desenhada, no formato de ler-corte.py, nas duas metades da chapa */
function cortesDeProva(zs, erro = 1.5) {
  return {
    ferramenta: 'ler-corte', unidade: 'mm',
    cortes: zs.map((z) => {
      const meia = Array.from({ length: 121 }, (_, k) => secao(z, k / 120));
      const pontos = [...meia.map(([x, y]) => [-x, y]).reverse(), ...meia.slice(1).map(([x, y]) => [x, y])];
      return { corte: `z${z}`, eixo: 'z', valor_mm: z, eixos_uv: ['x', 'y'], erro_mm: erro, polilinhas: [{ fechada: false, pontos_mm: pontos }] };
    }),
  };
}

/* aplica as edições a uma TABELA nova e devolve a superfície e a leitura de ondulação */
function lerComEdicoes(opcoes, edicoes) {
  const { receita, TABELA } = receitaDeProva(opcoes);
  for (const e of edicoes) { if (e.indice === undefined) TABELA[e.tabela] = e.novo; else TABELA[e.tabela][e.indice] = e.novo; }
  const sup = superficiesDaReceita(receita)[0];
  return { sup, ond: ondulacaoDaSuperficie(sup), receita };
}

/* as medidas da receita original: o ponto declarado de cada ponto medido, em metro */
function medidasOriginais(opcoes) {
  const { TABELA } = receitaDeProva(opcoes);
  const g = derivar(TABELA);
  return g.passo.medidas.map((m) => (typeof m === 'string' ? m : m.ponto)).map((nome) => ({ nome, p: g.pontos[nome] }));
}

const distanciaDasMedidas = (sup, medidas) => {
  const indice = new Map(sup.declarados.map((n, k) => [n, k]));
  return medidas.map(({ nome, p }) => { const v = sup.calculados[indice.get(nome)]; return MM * Math.hypot(v[0] - p[0], v[1] - p[1], v[2] - p[2]); });
};

describe('alisamento da superfície', () => {
  const PLANTADA = { ruido: 1.5 };
  let antes, relatorio, outro, tabelaDepois, relatorioDobra, relatorioCortes;

  beforeAll(() => {
    const { receita, TABELA } = receitaDeProva(PLANTADA);
    antes = ondulacaoDaSuperficie(superficiesDaReceita(receita)[0]);
    const copia = JSON.stringify(TABELA);
    relatorio = alisarReceita({ receita, tabela: TABELA });
    tabelaDepois = JSON.stringify(TABELA) === copia;
    const r2 = receitaDeProva(PLANTADA);
    outro = alisarReceita({ receita: r2.receita, tabela: r2.TABELA });
    const d = receitaDeProva({ dobra: 15 });
    relatorioDobra = alisarReceita({ receita: d.receita, tabela: d.TABELA });
    const c = receitaDeProva(PLANTADA);
    relatorioCortes = alisarReceita({ receita: c.receita, tabela: c.TABELA }, { cortes: cortesDeProva([600, 1000, 1400, 1800, 2200]) });
  }, 240000);

  it('a ondulação plantada passa do limiar, com falhas de mais de três espaçamentos', () => {
    expect(antes.falhas.length).toBeGreaterThanOrEqual(6);
    expect(antes.falhas.filter((f) => f.extensaoEmEspacamentos >= 3).length).toBeGreaterThanOrEqual(3);
    expect(Math.max(...antes.falhas.map((f) => f.amplitudeMm))).toBeGreaterThan(0.6);
    /* a origem dos pontos citados vem da gaiola: entrada, curva de seção ou estação gerada */
    const tipos = new Set(antes.falhas.flatMap((f) => f.pontos.map((p) => p.origem?.tipo)));
    expect(tipos.has('curva')).toBe(true);
    expect(tipos.has('gerada')).toBe(true);
    expect(relatorio.antes.falhas).toBe(antes.falhas.length);
  });

  it('tira as falhas acima do limiar e todas as medidas ficam a até 2 mm', () => {
    expect(relatorio.alisavel).toBe(true);
    expect(relatorio.depois.falhas).toBe(0);
    expect(relatorio.edicoes.length).toBeGreaterThan(20);
    /* conferência independente do modelo da ferramenta: as edições numa TABELA nova, a receita rodada e lida */
    const { sup, ond } = lerComEdicoes(PLANTADA, relatorio.edicoes);
    expect(ond.falhas).toEqual([]);
    const d = distanciaDasMedidas(sup, medidasOriginais(PLANTADA));
    expect(d.length).toBeGreaterThan(40);
    expect(Math.max(...d)).toBeLessThanOrEqual(2);
    expect(relatorio.medidas.depois.maximoMm).toBeLessThanOrEqual(2);
    /* a edição não passa do dobro do erro de leitura e as medidas se afastam em média pouco */
    expect(Math.max(...relatorio.edicoes.map((e) => Math.abs(e.deslocamentoMm)))).toBeLessThanOrEqual(4);
    expect(ond.desvioMm.maximo).toBeLessThan(0.3);
  });

  it('as edições citam só nomes editáveis: números da TABELA que movem entradas, nunca estação gerada', () => {
    const { TABELA } = receitaDeProva(PLANTADA);
    for (const e of relatorio.edicoes) {
      expect(e.tabela).toMatch(/^c[0-6]_[0-8]$/);
      expect(TABELA[e.tabela][e.indice]).toBe(e.antigo);
      expect(e.entradas).toHaveLength(1);
      expect(e.entradas[0]).toMatch(/^e[0-6]\/secao\[[0-8]\]\.(u|v)$/);
      expect(Math.abs(e.novo - e.antigo)).toBeGreaterThan(0);
      expect(e.deslocamentoMm).toBeCloseTo(e.novo - e.antigo, 1);
    }
    const nomes = new Set(relatorio.edicoes.map((e) => `${e.tabela}[${e.indice}]`));
    expect(nomes.size).toBe(relatorio.edicoes.length);
    /* nenhuma folha que muda a estrutura (passo da interpolação, peso da medida, posição de estação) é editada */
    expect(relatorio.edicoes.some((e) => e.tabela === 'passo_estacao' || e.tabela === 'peso_cota')).toBe(false);
    expect(relatorio.modelo.folhasRecusadas).toBeGreaterThan(0);
    expect(JSON.stringify(relatorio.edicoes)).not.toMatch(/e[0-6]_[0-9]_s|_[0-9]_s[0-9]/);
  });

  it('duas execuções dão as mesmas edições, e a TABELA volta como estava', () => {
    expect(JSON.stringify(outro.edicoes)).toBe(JSON.stringify(relatorio.edicoes));
    expect(JSON.stringify(outro)).toBe(JSON.stringify(relatorio));
    expect(tabelaDepois).toBe(true);
  });

  it('a forma com uma dobra real e sem vinco declarado sai como não alisável dentro da tolerância', () => {
    expect(relatorioDobra.antes.falhas).toBeGreaterThan(0);
    expect(relatorioDobra.alisavel).toBe(false);
    expect(relatorioDobra.motivo).toMatch(/^não alisável dentro da tolerância de 2 mm.*vinco ou estação nova/);
    expect(relatorioDobra.depois.falhas).toBeGreaterThan(0);
    expect(relatorioDobra.sobram.length).toBe(relatorioDobra.depois.falhas);
    /* a falha que sobra é a da dobra, ao longo de várias estações, e as medidas que impedem estão no limite da tolerância */
    const maior = relatorioDobra.sobram[0];
    expect(maior.extensaoEmEspacamentos).toBeGreaterThan(5);
    expect(maior.impedem.length).toBeGreaterThan(0);
    for (const m of maior.impedem) { expect(m.distanciaMm).toBeGreaterThanOrEqual(0.85 * m.limiteMm); expect(m.limiteMm).toBeCloseTo(2, 5); }
    expect(relatorioDobra.medidas.depois.maximoMm).toBeLessThanOrEqual(2.1);
  });

  it('em duas rodadas as edições acumulam contra os valores originais e os limites valem para o conjunto', () => {
    const d = receitaDeProva({ dobra: 15 });
    const r = alisarReceita({ receita: d.receita, tabela: d.TABELA }, { rodadas: 2, regularizacao: 0.3 });
    expect(r.rodadas).toHaveLength(2);
    expect(r.rodadaEscolhida).toBeGreaterThanOrEqual(1);
    const { TABELA } = receitaDeProva({ dobra: 15 });
    for (const e of r.edicoes) { expect(TABELA[e.tabela][e.indice]).toBe(e.antigo); expect(Math.abs(e.deslocamentoMm)).toBeLessThanOrEqual(4.01); }
    const { sup } = lerComEdicoes({ dobra: 15 }, r.edicoes);
    expect(Math.max(...distanciaDasMedidas(sup, medidasOriginais({ dobra: 15 })))).toBeLessThanOrEqual(2.1);
    expect(r.depois.falhas).toBeLessThanOrEqual(r.antes.falhas + 1);
  });

  it('com os cortes lidos, os pontos do traço entram como medidas e ficam a até a tolerância', () => {
    expect(relatorioCortes.tolerancia.medidasMm).toBe(1.5);
    expect(relatorioCortes.alisavel).toBe(true);
    expect(relatorioCortes.cortes.antes.n).toBeGreaterThan(200);
    expect(relatorioCortes.cortes.depois.n).toBe(relatorioCortes.cortes.antes.n);
    /* o limite de cada ponto é a tolerância ou a distância que ele já tinha, se maior */
    const limite = Math.max(1.5, relatorioCortes.cortes.antes.maximoMm) * 1.05 + 0.05;
    expect(relatorioCortes.cortes.depois.maximoMm).toBeLessThanOrEqual(limite);
    expect(relatorioCortes.cortes.depois.maximoMm).toBeLessThanOrEqual(relatorioCortes.cortes.antes.maximoMm);
    expect(relatorioCortes.cortes.depois.p95Mm).toBeLessThanOrEqual(relatorioCortes.cortes.antes.p95Mm);
    expect(Object.keys(relatorioCortes.cortes.porCorte)).toHaveLength(5);
    expect(relatorioCortes.depois.falhas).toBe(0);
    const { sup } = lerComEdicoes(PLANTADA, relatorioCortes.edicoes);
    const pontos = pontosDosCortes(cortesDeProva([600, 1000, 1400, 1800, 2200]), 8);
    const idx = indiceEspacial(sup.calculados, sup.faces);
    const d = pontos.map((c) => idx.maisPerto(c.p, 0.05)?.distancia * MM);
    expect(Math.max(...d)).toBeLessThanOrEqual(limite);
  });

  it('a conferência entra no relatório: o modelo linear erra o desvio por menos de 0,05 mm', () => {
    expect(relatorio.modelo.diferencaDoModeloMm).toBeLessThan(0.05);
    expect(relatorio.modelo.violacaoMaximaMm).toBeLessThan(0.05);
    expect(relatorio.modelo.rastreadas).toBe(true);
  });
});

describe('chapa sem falha', () => {
  it('não edita nada e diz que não há o que alisar', () => {
    const { receita, TABELA } = receitaDeProva({ ruido: 0 });
    const r = alisarReceita({ receita, tabela: TABELA });
    expect(r.antes.falhas).toBe(0);
    expect(r.alisavel).toBe(true);
    expect(r.edicoes).toEqual([]);
    expect(r.modelo.semFalhas).toBe(true);
  });
});

describe('receita sem TABELA e sem ajudante de gaiola', () => {
  it('edita os pontos nomeados de TOPO e tira a ondulação plantada, com as medidas exatas a até 2 mm', () => {
    const receita = chapaDaOndulacao({ vincos: true, plantar: ONDULACAO_PLANTADA });
    const original = JSON.stringify(receita.TOPO);
    const r = alisarReceita({ receita });
    expect(JSON.stringify(receita.TOPO)).toBe(original);
    expect(r.antes.falhas).toBe(1);
    expect(r.alisavel).toBe(true);
    expect(r.depois.falhas).toBe(0);
    expect(r.modelo.rastreadas).toBe(false);
    /* os dois pontos plantados andam cerca de 1 mm de volta; os outros, quase nada */
    const nomes = r.edicoes.map((e) => e.tabela);
    expect(nomes).toContain('p5_3');
    expect(nomes).toContain('p6_3');
    const mover = (n) => r.edicoes.filter((e) => e.tabela === n).reduce((s, e) => s + Math.abs(e.deslocamentoMm), 0);
    expect(mover('p5_3')).toBeGreaterThan(0.4);
    expect(mover('p6_3')).toBeGreaterThan(0.4);
    expect(r.medidas.depois.maximoMm).toBeLessThanOrEqual(2);
    expect(r.edicoes.every((e) => e.entradas.length === 0)).toBe(true);
  });
});

describe('peças do alisamento', () => {
  it('os pesos da malha refazem a superfície entregue, e a soma de cada linha é 1', () => {
    const { receita } = receitaDeProva({ ruido: 1.5 });
    const sup = superficiesDaReceita(receita)[0];
    const W = pesosDaMalha(sup);
    const c = W.verificar();
    expect(c.erro).toBeLessThan(1e-9);
    expect(c.somas).toBeLessThan(1e-9);
    expect(W.grupos).toBeGreaterThan(10);
  });

  it('o operador do desvio reproduz o desvio medido em cada vértice', () => {
    const { receita } = receitaDeProva({ ruido: 1.5 });
    const sup = superficiesDaReceita(receita)[0];
    const ond = ondulacaoDaSuperficie(sup, { devolverOperador: true });
    let pior = 0; let linhas = 0;
    for (let v = 0; v < ond.amostra; v++) {
      const op = ond.operador[v]; if (!op) continue;
      let q = sup.calculados[v].map((x) => x);
      for (const [a, pi] of op.itens) q = q.map((x, k) => x - pi * sup.calculados[a][k]);
      const d = (op.nz[0] * q[0] + op.nz[1] * q[1] + op.nz[2] * q[2]) / op.s;
      pior = Math.max(pior, Math.abs(d - ond.desvios[v]));
      linhas += 1;
    }
    expect(linhas).toBeGreaterThan(500);
    expect(pior).toBeLessThan(1e-9);
  });

  it('o ajuste com restrições chega ao ótimo de um problema pequeno de resposta conhecida', () => {
    /* minimizar ½‖x − (3, 4)‖² com ‖x‖ ≤ 2 dá x = 2 (3, 4)/5 = (1,2; 1,6); sem a restrição, x = (3, 4) */
    const H = Float64Array.from([1, 0, 0, 1]); const g = Float64Array.from([3, 4]);
    const F = [{ colunas: Int32Array.of(0), valores: Float64Array.of(1) }, { colunas: Int32Array.of(1), valores: Float64Array.of(1) }];
    const livre = minimosQuadradosComBolas({ H, g, n: 2, F, f0: new Float64Array(2), grupos: [{ linhas: [0, 1], raio: 100 }], kappa: 100 });
    expect(livre.x[0]).toBeCloseTo(3, 8); expect(livre.x[1]).toBeCloseTo(4, 8);
    const preso = minimosQuadradosComBolas({ H, g, n: 2, F, f0: new Float64Array(2), grupos: [{ linhas: [0, 1], raio: 2 }], kappa: 100, externas: 30, tolerancia: 1e-9 });
    expect(preso.x[0]).toBeCloseTo(1.2, 5); expect(preso.x[1]).toBeCloseTo(1.6, 5);
    expect(preso.violacaoMaxima).toBeLessThan(1e-8);
    /* a caixa de uma linha só: |x0| ≤ 1 */
    const caixa = minimosQuadradosComBolas({ H, g, n: 2, F: [F[0]], f0: new Float64Array(1), grupos: [{ linhas: [0], raio: 1 }], kappa: 100, externas: 30, tolerancia: 1e-9 });
    expect(caixa.x[0]).toBeCloseTo(1, 5); expect(caixa.x[1]).toBeCloseTo(4, 5);
    const c = cholesky(Float64Array.from([4, 2, 2, 3]), 2).resolver(Float64Array.from([6, 5]));
    expect(c[0]).toBeCloseTo(1, 12); expect(c[1]).toBeCloseTo(1, 12);
  });

  it('os pontos dos cortes saem a cada passo de arco, no plano e no valor do corte', () => {
    const pontos = pontosDosCortes({ cortes: [{ corte: 'x930', eixo: 'x', valor_mm: 930, eixos_uv: ['y', 'z'], erro_mm: 1.2, polilinhas: [{ pontos_mm: [[0, 700], [0, 710], [0, 720], [0, 730]] }] }] }, 15);
    expect(pontos.map((p) => p.p)).toEqual([[0.93, 0, 0.7], [0.93, 0, 0.72]]);
    expect(pontos[0].erroMm).toBe(1.2);
    expect(() => pontosDosCortes({ nada: 1 }, 8)).toThrow(/ler-corte/);
  });

  it('a cópia da receita troca os números no texto da TABELA e recusa o que não é literal', () => {
    const pasta = mkdtempSync(join(tmpdir(), 'alisar-'));
    try {
      const origem = join(pasta, 'receita.js');
      writeFileSync(origem, "export const TABELA = {\n  passo: 40,\n  p_a_borda: [924, -300], p_a_labio: [917, -260.5, 3],\n  altura: 12.5,\n  'p_b': [1, 2],\n};\n");
      const destino = join(pasta, 'copia.js');
      gravarCopia(origem, destino, [
        { tabela: 'p_a_borda', indice: 1, antigo: -300, novo: -298.7 }, { tabela: 'p_a_labio', indice: 2, antigo: 3, novo: 4.25 },
        { tabela: 'altura', indice: null, antigo: 12.5, novo: 13 }, { tabela: 'p_b', indice: 0, antigo: 1, novo: 1.5 },
      ]);
      expect(readFileSync(destino, 'utf8')).toBe("export const TABELA = {\n  passo: 40,\n  p_a_borda: [924, -298.7], p_a_labio: [917, -260.5, 4.25],\n  altura: 13,\n  'p_b': [1.5, 2],\n};\n");
      expect(() => gravarCopia(origem, destino, [{ tabela: 'nao_existe', indice: 0, antigo: 1, novo: 2 }])).toThrow(/não achei 'nao_existe'/);
    } finally { rmSync(pasta, { recursive: true, force: true }); }
  });
});

describe('linha de comando', () => {
  it('imprime o relatório em JSON com as edições, e a opção desconhecida falha', () => {
    const r = spawnSync('node', ['tools/mecanifica/alisar-a-superficie.mjs', 'tools/mecanifica/fixtures/alisar-prova.js'], { cwd: REPO, encoding: 'utf8', timeout: 120000 });
    expect(r.status).toBe(0);
    const saida = JSON.parse(r.stdout);
    expect(saida.peca).toBe('tools/mecanifica/fixtures/alisar-prova.js');
    expect(saida.alisavel).toBe(true);
    expect(saida.depois.falhas).toBe(0);
    expect(saida.edicoes[0]).toMatchObject({ tabela: expect.stringMatching(/^c\d_\d$/), entradas: expect.any(Array) });
    const ruim = spawnSync('node', ['tools/mecanifica/alisar-a-superficie.mjs', 'tools/mecanifica/fixtures/alisar-prova.js', '--inventada=1'], { cwd: REPO, encoding: 'utf8' });
    expect(ruim.status).toBe(1);
    expect(ruim.stderr).toMatch(/opção desconhecida/);
  }, 180000);
});

