/* vincos-das-linhas.test.mjs — os vincos a partir das linhas 3D do pacote, sobre a forma desenhada por código.
 *
 * O gate da fatia 23 do plano da carroceria por subdivisão, sem Blender: as linhas 3D saem dos vincos conhecidos da forma,
 * com ruído de ±1 mm, no formato de `ler-linhas --3d`. Os vincos sugeridos cobrem a quina e a dobra do teto a menos de
 * 2 mm; o friso, que passa entre duas colunas, sai como faltante com as duas colunas e a fração certas, e a coluna posta
 * onde a ferramenta diz passa a acompanhá-lo; a declaração colada na receita é aceita pelo passo e a dobra aparece na
 * malha ao longo das linhas. Mesma receita, mesma saída. */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { cadeiaRefinada } from '../../procedural/nucleo/friso.js';
import { gaiolaPorEstacoes } from '../../procedural/nucleo/gaiola-por-estacoes.js';
import { refinarCadeias, vincosDasLinhas } from './vincos-das-linhas.mjs';
import {
  ANGULO_DA_QUINA, COLUNAS, ESTACOES, FRACAO_DO_FRISO, LINHAS, gaiolaDeProva, linhasDeProva, queda, receitaDeProva,
} from './fixtures/vincos-das-linhas-prova.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const ler = (receita = receitaDeProva(), linhas = linhasDeProva()) => vincosDasLinhas(receita, linhas).superficies[0];
const LIDA = ler();
const pecaDa = (s, linha, peca = 0) => s.linhas[linha].pecas[peca];

/* O maior diedro, em graus, das arestas da malha entregue que passam a até `raioMm` de cada ponto da linha (em mm). */
function diedrosAoLongo(receita, linhaMm, { raioMm = 3, cadaMm = 10 } = {}) {
  const { neutro } = executarReceita(receita);
  expect(neutro.orfaos).toEqual([]);
  const V = neutro.V; const faces = [...neutro.F.values()];
  const normal = (f) => {
    const p = f.vs.map((v) => V.get(v)); const n = [0, 0, 0];
    for (let k = 0; k < p.length; k++) { const a = p[k], b = p[(k + 1) % p.length]; n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]); }
    const l = Math.hypot(...n); return n.map((x) => x / l);
  };
  const arestas = new Map();
  for (const f of faces) for (let k = 0; k < f.vs.length; k++) { const a = f.vs[k], b = f.vs[(k + 1) % f.vs.length]; const c = a < b ? `${a},${b}` : `${b},${a}`; if (!arestas.has(c)) arestas.set(c, []); arestas.get(c).push(f); }
  const lista = [];
  for (const [c, fs] of arestas) {
    if (fs.length !== 2) continue;
    const [a, b] = c.split(',').map(Number); const n0 = normal(fs[0]), n1 = normal(fs[1]);
    const cos = Math.max(-1, Math.min(1, n0[0] * n1[0] + n0[1] * n1[1] + n0[2] * n1[2]));
    lista.push({ a: V.get(a).map((x) => x * 1000), b: V.get(b).map((x) => x * 1000), graus: (Math.acos(cos) * 180) / Math.PI });
  }
  return linhaMm.filter((_, k) => k % cadaMm === 0).map((q) => {
    let maior = 0;
    for (const e of lista) {
      const ab = e.b.map((x, i) => x - e.a[i]); const l2 = ab.reduce((s, x) => s + x * x, 0);
      const u = Math.min(1, Math.max(0, ab.reduce((s, x, i) => s + x * (q[i] - e.a[i]), 0) / l2));
      if (Math.hypot(...q.map((x, i) => x - e.a[i] - u * ab[i])) <= raioMm) maior = Math.max(maior, e.graus);
    }
    return maior;
  });
}
const fracaoAcima = (graus, limiar) => graus.filter((g) => g >= limiar).length / graus.length;

describe('vincos a partir das linhas 3D do pacote', () => {
  it('as colunas e as estações saem dos nomes da gaiola, e a cadeia refinada segue a numeração da subdivisão', () => {
    expect(LIDA.cadeias).toEqual({ porNome: true, colunas: COLUNAS.length, estacoes: ESTACOES.length, arestas: 0 });
    const g = gaiolaDeProva();
    const nomes = g.passo.vertices; const indice = new Map(nomes.map((n, k) => [n, k]));
    const faces = g.passo.faces.map((f) => f.map((n) => indice.get(n)));
    const quina = ESTACOES.map((z) => indice.get(`z${z}_quina`));
    const z600 = COLUNAS.map((c) => indice.get(`z600_${c.nome}`));
    const [a, b] = refinarCadeias(faces, nomes.length, 3, [quina, z600]);
    expect(a).toEqual(cadeiaRefinada(faces, nomes.length, 3, quina).cadeia);
    expect(b).toEqual(cadeiaRefinada(faces, nomes.length, 3, z600).cadeia);
  });

  it('os vincos sugeridos seguem a quina e a dobra do teto e cobrem as linhas a menos de 2 mm', () => {
    expect(LIDA.vincos.map((v) => [v.nome, v.acompanha])).toEqual([
      ['vinco_quina', { coluna: 'quina', de: 'z0', ate: 'z1200' }],
      ['vinco_z600', { estacao: 'z600', de: 'centro', ate: 'quina' }],
    ]);
    expect(LIDA.vincos[0].pontos).toEqual(ESTACOES.map((z) => `z${z}_quina`));
    expect(LIDA.vincos[1].pontos).toEqual(['z600_centro', 'z600_teto', 'z600_quina']);
    expect(LIDA.vincosNaGaiola).toEqual([
      { nome: 'vinco_quina', coluna: 'quina', de: 'z0', ate: 'z1200', nitidez: LIDA.vincos[0].nitidez },
      { nome: 'vinco_z600', estacao: 'z600', de: 'centro', ate: 'quina', nitidez: 'viva' },
    ]);
    expect(LIDA.comVincos).toEqual({ aceitos: true });
    expect(LIDA.cantos).toEqual([]);
    for (const v of LIDA.vincos) {
      expect(v.comVinco.distanciaMm.maxima).toBeLessThan(2);
      expect(v.comVinco.distanciaMm.media).toBeLessThan(1);
    }
    /* a quina foi lida do lado x < 0 e vale pelo espelho; a dobra do teto atravessa a costura, e o pedaço x > 0 repete o
       espelho do outro */
    expect(pecaDa(LIDA, 0)).toMatchObject({ espelhada: true, coberturaComVincos: 1 });
    expect(pecaDa(LIDA, 1, 0)).toMatchObject({ espelhada: true, coberturaComVincos: 1 });
    expect(pecaDa(LIDA, 1, 1)).toMatchObject({ espelhada: false, espelhoDe: { linha: 1, peca: 0 } });
    /* antes do vinco, a coluna e a estação na superfície limite lisa ficam a poucos milímetros das linhas */
    const [quina] = pecaDa(LIDA, 0).trechos; const [dobra] = pecaDa(LIDA, 1).trechos;
    expect(quina).toMatchObject({ tipo: 'coluna', acompanha: { coluna: 'quina', de: 'z0', ate: 'z1200' } });
    expect(dobra).toMatchObject({ tipo: 'estacao', acompanha: { estacao: 'z600', de: 'centro', ate: 'quina' } });
    expect(quina.distanciaMm.media).toBeLessThan(1.5);
    expect(dobra.distanciaMm.media).toBeLessThan(2.5);
    expect(quina.vincos.map((v) => v.nome)).toEqual(['vinco_quina']);
    /* a borda de baixo acompanha a borda da gaiola e não pede vinco */
    expect(pecaDa(LIDA, 3).trechos).toHaveLength(1);
    expect(pecaDa(LIDA, 3).trechos[0]).toMatchObject({ tipo: 'borda', acompanha: { coluna: 'soleira' } });
    expect(pecaDa(LIDA, 3).trechos[0].vincos).toBeUndefined();
  });

  it('a nitidez sai do ângulo lido, a menor da escada que dobra a malha a 90% dele; sem ângulo, viva', () => {
    const [quina, dobra] = LIDA.vincos;
    expect(dobra.nitidez).toBe('viva');
    expect(quina.nitidez).not.toBe('viva');
    const escada = quina.escada;
    expect(escada[escada.length - 1]).toEqual({ nitidez: quina.nitidez, diedroGraus: expect.any(Number) });
    expect(escada[escada.length - 1].diedroGraus).toBeGreaterThanOrEqual(0.9 * ANGULO_DA_QUINA);
    /* não é vazio: o degrau anterior da escada não chega a 90% */
    expect(escada.length).toBeGreaterThan(1);
    expect(escada[escada.length - 2].diedroGraus).toBeLessThan(0.9 * ANGULO_DA_QUINA);
  });

  it('o friso, entre flancoAlto e flancoBaixo, sai faltante com a fração certa, e a coluna posta ali passa a acompanhá-lo', () => {
    expect(LIDA.faltantes).toHaveLength(1);
    const [f] = LIDA.faltantes;
    expect(f).toMatchObject({ linha: 2, sugestao: { tipo: 'coluna', entre: ['flancoAlto', 'flancoBaixo'], estacoes: ['z0', 'z1200'] } });
    expect(Math.abs(f.sugestao.fracao - FRACAO_DO_FRISO)).toBeLessThan(0.02);
    expect(f.texto).toMatch(/^coluna nova entre 'flancoAlto' e 'flancoBaixo', a 0,4\d? do caminho/);
    expect(f.sugestao.porEstacao.map((e) => e.estacao)).toEqual(ESTACOES.map((z) => `z${z}`));
    for (const e of f.sugestao.porEstacao) expect(Math.abs(e.fracao - FRACAO_DO_FRISO)).toBeLessThan(0.03);
    expect(pecaDa(LIDA, 2).coberturaComVincos).toBe(0);
    /* a coluna nova, no ponto da linha que a ferramenta deu em cada estação, tirado o desvio da seção */
    const em = new Map(f.sugestao.porEstacao.map((e) => [e.estacao, e.emMm]));
    const g = gaiolaPorEstacoes({
      eixo: 'z',
      estacoes: ESTACOES.map((z) => {
        const colunas = COLUNAS.map((c) => ({ nome: c.nome, em: [c.em[0] / 1000, (c.em[1] - queda(z)) / 1000] }));
        const p = em.get(`z${z}`);
        colunas.splice(COLUNAS.findIndex((c) => c.nome === 'flancoBaixo'), 0, { nome: 'friso', em: [p[0] / 1000, p[1] / 1000] });
        return { nome: `z${z}`, em: z / 1000, colunas };
      }),
      medidas: [...COLUNAS.map((c) => ({ coluna: c.nome })), { coluna: 'friso' }],
      simetria: 'x',
    });
    const receita = { PARAMS: {}, TOPO: g.pontos, PASSOS: [['subdivisao', { origemId: 1, ...g.passo, borda: 'cantos', niveis: 2 }]] };
    const s = ler(receita);
    expect(s.faltantes).toEqual([]);
    expect(pecaDa(s, 2).trechos.map((t) => t.acompanha)).toEqual([{ coluna: 'friso', de: 'z0', ate: 'z1200' }]);
    /* o friso dobra em z600 com a forma, e o vinco liso pela coluna passa a 4 mm dali: a ferramenta pede o canto nesse
       ponto, e com ele o vinco fica a menos de 2,5 mm da linha, porque a coluna nova carrega o ruído de ±1 mm da leitura */
    const friso = s.vincos.find((v) => v.acompanha.coluna === 'friso');
    expect(friso.cantos.map((c) => c.ponto)).toEqual(['z600_friso']);
    expect(friso.cantos[0].anguloGraus).toBeGreaterThan(20);
    expect(s.cantos).toEqual(['z600_friso']);
    expect(s.cantosNaGaiola).toEqual([{ estacao: 'z600', coluna: 'friso' }]);
    expect(s.comVincos).toEqual({ aceitos: true, cantos: ['z600_friso'] });
    expect(friso.comVinco.semCantosDistanciaMm.maxima).toBeGreaterThan(3);
    expect(friso.comVinco.distanciaMm.maxima).toBeLessThan(2.5);
    expect(friso.comVinco.distanciaMm.media).toBeLessThan(1);
    expect(pecaDa(s, 2).coberturaComVincos).toBeGreaterThan(0.99);
  });

  it('a declaração colada no passo é aceita e a dobra aparece na malha ao longo das linhas; sem ela, não', () => {
    const vincos = LIDA.vincos.map(({ nome, pontos, nitidez }) => ({ nome, pontos, nitidez }));
    const com = receitaDeProva({ vincos });
    const sem = receitaDeProva();
    const quinaCom = diedrosAoLongo(com, LINHAS.quina), quinaSem = diedrosAoLongo(sem, LINHAS.quina);
    const dobraCom = diedrosAoLongo(com, LINHAS.dobraDoTeto), dobraSem = diedrosAoLongo(sem, LINHAS.dobraDoTeto);
    /* o limiar de 20 graus fica abaixo das duas dobras da forma (47 e 26,6 graus) */
    expect(fracaoAcima(quinaCom, 20)).toBe(1);
    expect(fracaoAcima(dobraCom, 20)).toBe(1);
    expect(fracaoAcima(quinaSem, 20)).toBeLessThan(0.1);
    expect(fracaoAcima(dobraSem, 20)).toBe(0);
    /* a mesma declaração em nomes de coluna e estação, no ajudante, dá a mesma malha */
    const pelaGaiola = executarReceita(receitaDeProva({ vincosNaGaiola: LIDA.vincosNaGaiola })).neutro;
    const peloPasso = executarReceita(com).neutro;
    expect([...pelaGaiola.V.values()]).toEqual([...peloPasso.V.values()]);
  });

  it('sem nomes estacao_coluna, as cadeias são os laços de arestas e a declaração cita os pontos', () => {
    const r = receitaDeProva(); const g = r.PASSOS[0][1];
    const novo = new Map(g.vertices.map((n, k) => [n, `p${k}`]));
    const troca = (n) => novo.get(n);
    const anonima = {
      PARAMS: {}, TOPO: Object.fromEntries(Object.entries(r.TOPO).map(([n, p]) => [troca(n), p])),
      PASSOS: [['subdivisao', { ...g, vertices: g.vertices.map(troca), faces: g.faces.map((f) => f.map(troca)), medidas: g.medidas.map(troca) }]],
    };
    const s = ler(anonima);
    expect(s.cadeias.porNome).toBe(false);
    expect(s.cadeias.arestas).toBeGreaterThan(0);
    expect(s.vincosNaGaiola).toBeNull();
    expect(s.vincos.map((v) => v.pontos)).toEqual(LIDA.vincos.map((v) => v.pontos.map(troca)));
    expect(s.faltantes).toHaveLength(1);
  });

  it('a mesma entrada dá a mesma saída, e a linha de comando a imprime em JSON', () => {
    expect(JSON.stringify(ler())).toBe(JSON.stringify(LIDA));
    const pasta = mkdtempSync(join(tmpdir(), 'vincos-das-linhas-'));
    try {
      const arquivo = join(pasta, 'linhas.json');
      writeFileSync(arquivo, JSON.stringify(linhasDeProva()));
      const r = spawnSync(process.execPath, [join(AQUI, 'vincos-das-linhas.mjs'), 'tools/modelar/fixtures/vincos-das-linhas-prova.js', `--linhas=${arquivo}`], { cwd: join(AQUI, '../..'), encoding: 'utf8' });
      expect(r.status).toBe(0);
      expect(JSON.stringify(JSON.parse(r.stdout).superficies[0])).toBe(JSON.stringify(LIDA));
      const ruim = spawnSync(process.execPath, [join(AQUI, 'vincos-das-linhas.mjs'), 'tools/modelar/fixtures/vincos-das-linhas-prova.js', `--linhas=${arquivo}`, '--limiar=3'], { cwd: join(AQUI, '../..'), encoding: 'utf8' });
      expect(ruim.status).toBe(1);
      expect(ruim.stderr).toMatch(/opção desconhecida --limiar=3/);
    } finally { rmSync(pasta, { recursive: true, force: true }); }
  });
});
