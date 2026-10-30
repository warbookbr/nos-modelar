/* curvatura-da-lataria.test.mjs — a curvatura média da lataria em JavaScript (curvatura-da-lataria.js) contra a do Blender.
 *
 * O que não precisa do Python: a esfera dá 1/r com o sinal do enrolamento, a malha não indexada dá o mesmo que a indexada, a peça
 * de borda sai cinza e fora da conta, a faixa dos vincos sai ocre e fora da escala, e a saída é a mesma a cada chamada.
 *
 * A concordância, no python3 do sistema (com numpy, sem o Blender): `tools/blender/curvatura-por-vertice.py` roda o próprio
 * `curvatura-da-lataria.py` com o render desligado sobre o OBJ que `exportar:obj` grava, com as partes de lataria e os vincos que as
 * vistas obrigatórias passam, e devolve a curvatura, a faixa e a cor de cada vértice. O gate do plano das visões de conferência
 * (fatia 2) é a curvatura do módulo, calculada sobre o estado neutro com os triângulos do OBJ (`malhaDoNeutro`), ficar a até 5 % da
 * escala do Python em cada vértice comparável, com os mesmos vértices sem dado e a mesma faixa, na peça de prova com vinco e na
 * carenagem de prova. A chapa com o friso prova a separação da peça de borda sobre o mesmo OBJ dos dois lados. */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { validarMalhaObj } from '../../modulos/exportador-obj/src/validar-malha.js';
import { exportarArquivoObj } from '../../tools/modelar/exportar-obj.mjs';
import { importarReceita, receitaDoModulo } from '../../tools/modelar/importar-receita.mjs';
import { resolverCaminhoReceita } from '../../tools/modelar/resolver-caminho-receita.mjs';
import { obj as chapaComFriso } from '../../tools/blender/chapa-com-amassado-de-prova.mjs';
import {
  CINZA_DA_BORDA, CINZA_SEM_DADO, COR_DA_FAIXA, ESTADO, PISO_DA_ESCALA,
  corDivergente, curvaturaDaLataria, curvaturaMedia, escalaDaCurvatura, faixaDosVincos, malhaDoNeutro, soldar,
} from './curvatura-da-lataria.js';
import { executarReceita } from './executar-receita.js';
import { latariaDaReceita, partesDaLataria } from './lataria.js';
import { normalizarPlanoDeModelagem } from './plano-de-modelagem.js';
import { vincosDaMalha } from './vincos-da-malha.js';

const SCRIPT = fileURLToPath(new URL('../../tools/blender/curvatura-por-vertice.py', import.meta.url));
const LIMITE_DA_ESCALA = 0.05;

/* Um icosaedro subdividido `niveis` vezes e levado à esfera de raio `r` centrada em `c`. */
function esfera(r, niveis = 4, c = [0, 0, 0]) {
  const t = (1 + Math.sqrt(5)) / 2;
  let V = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]];
  let F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  for (let n = 0; n < niveis; n++) {
    const meio = new Map();
    const m = (a, b) => {
      const k = a < b ? `${a},${b}` : `${b},${a}`;
      if (!meio.has(k)) { meio.set(k, V.length); V.push(V[a].map((x, i) => (x + V[b][i]) / 2)); }
      return meio.get(k);
    };
    F = F.flatMap(([a, b, d]) => { const ab = m(a, b); const bd = m(b, d); const da = m(d, a); return [[a, ab, da], [b, bd, ab], [d, da, bd], [ab, bd, da]]; });
  }
  V = V.map((p) => { const l = Math.hypot(...p); return p.map((x, i) => c[i] + (r * x) / l); });
  return { posicoes: Float64Array.from(V.flat()), triangulos: Int32Array.from(F.flat()) };
}

const mediana = (xs) => { const o = [...xs].sort((a, b) => a - b); return o[Math.floor(o.length / 2)]; };

describe('a curvatura da lataria em JavaScript, sem o Python', () => {
  it('a esfera dá 1/r, positiva com as faces para fora e negativa ao contrário', () => {
    const { posicoes, triangulos } = esfera(0.3);
    const s = soldar(posicoes, triangulos);
    const { H, valido } = curvaturaMedia(s.V, s.F, 0.02);
    expect(valido.every((v) => v === 1)).toBe(true);
    expect(Math.abs(mediana(H) - 1 / 0.3) / (1 / 0.3)).toBeLessThan(0.02);
    const virada = Int32Array.from(triangulos);
    for (let i = 0; i < virada.length; i += 3) [virada[i + 1], virada[i + 2]] = [virada[i + 2], virada[i + 1]];
    const sv = soldar(posicoes, virada);
    expect(Math.abs(mediana(curvaturaMedia(sv.V, sv.F, 0.02).H) + 1 / 0.3) / (1 / 0.3)).toBeLessThan(0.02);
  });

  it('a malha não indexada, com um vértice por canto, dá o mesmo vértice a vértice que a indexada, e a mesma saída a cada chamada', () => {
    const { posicoes, triangulos } = esfera(0.3, 3);
    const indexada = curvaturaDaLataria({ posicoes, triangulos });
    const solta = new Float64Array(triangulos.length * 3);
    triangulos.forEach((v, i) => { solta.set(posicoes.subarray(3 * v, 3 * v + 3), 3 * i); });
    const cantos = Int32Array.from({ length: triangulos.length }, (_, i) => i);
    const naoIndexada = curvaturaDaLataria({ posicoes: solta, triangulos: cantos });
    triangulos.forEach((v, i) => {
      expect(naoIndexada.curvatura[i]).toBe(indexada.curvatura[v]);
      expect([...naoIndexada.cores.subarray(3 * i, 3 * i + 3)]).toEqual([...indexada.cores.subarray(3 * v, 3 * v + 3)]);
    });
    const deNovo = curvaturaDaLataria({ posicoes: solta, triangulos: cantos });
    expect(Buffer.from(deNovo.cores.buffer).equals(Buffer.from(naoIndexada.cores.buffer))).toBe(true);
    expect(deNovo.escala).toBe(naoIndexada.escala);
  });

  it('a peça fora da lista de lataria sai cinza claro, sem curvatura e fora da escala; a chapa aberta perde o dado junto da borda', () => {
    const bola = esfera(0.3, 3);
    const chapa = { posicoes: [], triangulos: [] };
    const n = 30;
    for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) chapa.posicoes.push(1 + i * 0.01, 0, j * 0.01);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const a = i * (n + 1) + j;
        chapa.triangulos.push(a, a + 1, a + n + 2, a, a + n + 2, a + n + 1);
      }
    }
    const nb = bola.posicoes.length / 3;
    const posicoes = [...bola.posicoes, ...chapa.posicoes];
    const triangulos = [...bola.triangulos, ...chapa.triangulos.map((v) => v + nb)];
    const partes = [...Array(bola.triangulos.length / 3).fill('friso'), ...Array(chapa.triangulos.length / 3).fill('chapa__2')];
    const r = curvaturaDaLataria({ posicoes, triangulos, partes, lataria: ['chapa'] });
    for (let i = 0; i < nb; i++) {
      expect(r.estado[i]).toBe(ESTADO.BORDA);
      expect(Number.isNaN(r.curvatura[i])).toBe(true);
      expect(r.cores[3 * i]).toBeCloseTo(CINZA_DA_BORDA, 6);
    }
    expect(r.contagens).toMatchObject({ borda: nb, lataria: (n + 1) ** 2 });
    expect(r.escala).toBe(PISO_DA_ESCALA);
    const centro = nb + 15 * (n + 1) + 15;
    const canto = nb;
    expect(r.estado[centro]).toBe(ESTADO.COM_VALOR);
    expect(r.curvatura[centro]).toBeCloseTo(0, 9);
    expect([...r.cores.subarray(3 * centro, 3 * centro + 3)]).toEqual([1, 1, 1]);
    expect(r.estado[canto]).toBe(ESTADO.SEM_DADO);
    expect(r.cores[3 * canto]).toBeCloseTo(CINZA_SEM_DADO, 6);
    expect(() => curvaturaDaLataria({ posicoes, triangulos, partes, lataria: ['nenhuma'] })).toThrow(/nenhuma lataria/);
  });

  it('a faixa dos vincos sai ocre e fora da escala, e a cor satura na escala', () => {
    const { posicoes, triangulos } = esfera(0.3, 4);
    const vincos = [{ nome: 'meridiano', segmentos: [[[0, -0.3, 0.3], [0, 0.3, 0.3]]] }];
    const r = curvaturaDaLataria({ posicoes, triangulos, vincos, faixa: 0.05 });
    const s = soldar(posicoes, triangulos);
    const faixa = faixaDosVincos(s.V, vincos[0].segmentos, 0.05);
    expect(r.contagens.faixa).toBe(faixa.reduce((a, b) => a + b, 0));
    expect(r.contagens.faixa).toBeGreaterThan(10);
    const i = r.estado.indexOf(ESTADO.FAIXA);
    expect(r.naFaixa[i]).toBe(1);
    expect([...r.cores.subarray(3 * i, 3 * i + 3)].map((c) => Number(c.toFixed(6)))).toEqual(COR_DA_FAIXA.map((c) => Number(c.toFixed(6))));
    expect(r.faixa).toBe(0.05);
    expect(r.escalaComAFaixa).toBe(escalaDaCurvatura(curvaturaMedia(s.V, s.F).H));
    expect(corDivergente(2, 1)).toEqual([0.85, 0.1, 0.1]);
    expect(corDivergente(-1, 1)).toEqual([0.1, 0.25, 0.85]);
    expect(corDivergente(0, 1)).toEqual([1, 1, 1]);
  });
});

/* ---------- a concordância com o Python ---------- */

const temNumpy = spawnSync('python3', ['-c', 'import numpy'], { encoding: 'utf8' }).status === 0;
const area = mkdtempSync(join(tmpdir(), 'curvatura-da-lataria-'));
afterAll(() => rmSync(area, { recursive: true, force: true }));

/* Roda a conta do script sobre o OBJ e devolve { V, cores, lataria, H, valido, faixa, resumo }. */
function doPython(pasta, obj, { lataria = [], borda = [], vincos = [] } = {}) {
  const args = ['--malha', obj, '--saida', join(pasta, 'peca-')];
  if (lataria.length) args.push('--lataria', lataria.join(','));
  if (borda.length) args.push('--borda', borda.join(','));
  if (vincos.length) {
    writeFileSync(join(pasta, 'vincos.json'), JSON.stringify({ vincos }));
    args.push('--vincos', join(pasta, 'vincos.json'));
  }
  const saida = join(pasta, 'por-vertice.json');
  const r = spawnSync('python3', [SCRIPT, saida, '--', ...args], { encoding: 'utf8', maxBuffer: 1 << 28 });
  expect(r.status, r.stderr).toBe(0);
  return JSON.parse(readFileSync(saida, 'utf8'));
}

/* A comparação vértice a vértice: cada vértice soldado do Python acha o da entrada do módulo a menos de 5 µm (o OBJ grava a µm).
   Devolve a maior diferença de curvatura em fração da escala do Python, os vértices comparáveis e as divergências de dado, de
   faixa e de cor. */
function comparar(py, posicoes, js) {
  const cel = 1e-4;
  const grade = new Map();
  const n = posicoes.length / 3;
  for (let i = 0; i < n; i++) {
    const k = `${Math.floor(posicoes[3 * i] / cel)},${Math.floor(posicoes[3 * i + 1] / cel)},${Math.floor(posicoes[3 * i + 2] / cel)}`;
    if (!grade.has(k)) grade.set(k, []);
    grade.get(k).push(i);
  }
  const par = (p) => {
    const c = p.map((x) => Math.floor(x / cel));
    let melhor = -1;
    let perto = 5e-6;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let d = -1; d <= 1; d++) {
      for (const i of grade.get(`${c[0] + a},${c[1] + b},${c[2] + d}`) ?? []) {
        const dist = Math.hypot(posicoes[3 * i] - p[0], posicoes[3 * i + 1] - p[1], posicoes[3 * i + 2] - p[2]);
        if (dist < perto) { perto = dist; melhor = i; }
      }
    }
    return melhor;
  };
  const escala = py.resumo.escala_1_m;
  const igual = (cor, ref) => cor.every((c, k) => Math.abs(c - ref[k]) < 1e-6);
  const estadoDaCor = (cor) => (igual(cor, COR_DA_FAIXA) ? ESTADO.FAIXA : igual(cor, [CINZA_SEM_DADO, CINZA_SEM_DADO, CINZA_SEM_DADO]) ? ESTADO.SEM_DADO
    : igual(cor, [CINZA_DA_BORDA, CINZA_DA_BORDA, CINZA_DA_BORDA]) ? ESTADO.BORDA : ESTADO.COM_VALOR);
  const r = { maior: 0, onde: null, comparaveis: 0, semPar: 0, dadoDiverge: 0, faixaDiverge: 0, corDiverge: 0, faixa: 0 };
  py.V.forEach((p, v) => {
    const i = par(p);
    if (i < 0) { r.semPar++; return; }
    if (estadoDaCor(py.cores[v]) !== js.estado[i]) r.corDiverge++;
  });
  py.lataria.forEach((v, k) => {
    const i = par(py.V[v]);
    if (i < 0) return;
    const hp = py.H[k];
    const hj = js.curvatura[i];
    if ((hp != null) !== Number.isFinite(hj)) { r.dadoDiverge++; return; }
    if (hp == null) return;
    const naFaixa = py.faixa[k] === 1;
    if (naFaixa) r.faixa++;
    if (naFaixa !== (js.naFaixa[i] === 1)) r.faixaDiverge++;
    r.comparaveis++;
    const d = Math.abs(hj - hp) / escala;
    if (d > r.maior) { r.maior = d; r.onde = { ponto: py.V[v], python: hp, modulo: hj, naFaixa }; }
  });
  return r;
}

async function pecaDoAcervo(alvo) {
  const caminho = resolverCaminhoReceita(alvo);
  const receita = receitaDoModulo(await importarReceita(caminho));
  const executada = executarReceita(receita);
  /* as partes e os vincos como `vistasDeSuperficie` os passa ao script */
  const partes = latariaDaReceita(receita, normalizarPlanoDeModelagem(receita.PLANO)).partes ?? partesDaLataria(executada.neutro);
  const vincos = vincosDaMalha(null, executada);
  const pasta = mkdtempSync(join(area, 'peca-'));
  const obj = join(pasta, 'peca.obj');
  await exportarArquivoObj({ arquivo: caminho, saida: obj, sobrescrever: true });
  return { executada, partes, vincos, pasta, obj };
}

describe.skipIf(!temNumpy)('a curvatura da lataria concorda com a do script do Blender, no python3 do sistema', () => {
  for (const [alvo, rotulo] of [['tools/fixtures/lataria-com-vinco/receita.js', 'a peça de prova com vinco'], ['carenagem-de-prova', 'a carenagem de prova']]) {
    it(`${rotulo}: a até 5 % da escala em cada vértice comparável, com os mesmos vértices sem dado e a mesma faixa`, async () => {
      const { executada, partes, vincos, pasta, obj } = await pecaDoAcervo(alvo);
      expect(vincos.length).toBeGreaterThan(0);
      const malha = malhaDoNeutro(executada.neutro);
      /* os triângulos são os do OBJ: os mesmos que o exportador escolhe para cada face */
      const doExportador = validarMalhaObj(executada.neutro).faces.flatMap((f) => f.triangulos.map((t) => t.join(','))).sort();
      const doModulo = [];
      for (let t = 0; t < malha.triangulos.length; t += 3) doModulo.push([0, 1, 2].map((k) => malha.ids[malha.triangulos[t + k]]).join(','));
      expect(doModulo.sort()).toEqual(doExportador);

      const py = doPython(pasta, obj, { lataria: partes, vincos });
      const js = curvaturaDaLataria({ ...malha, lataria: partes, vincos });
      const r = comparar(py, malha.posicoes, js);
      expect(r.semPar).toBe(0);
      expect(r.comparaveis).toBeGreaterThan(10000);
      expect(r.dadoDiverge).toBe(0);
      expect(r.faixa).toBe(py.resumo.faixa_dos_vincos.vertices);
      expect(r.faixaDiverge).toBe(0);
      expect(r.corDiverge).toBe(0);
      expect(js.contagens.faixa).toBe(py.resumo.faixa_dos_vincos.vertices);
      expect(js.contagens.semDado).toBe(py.resumo.vertices_sem_dado);
      expect(r.maior, JSON.stringify(r.onde)).toBeLessThanOrEqual(LIMITE_DA_ESCALA);
      expect(Math.abs(js.escala - py.resumo.escala_1_m) / py.resumo.escala_1_m).toBeLessThan(LIMITE_DA_ESCALA);
    });
  }

  it('a chapa com o friso, lida do mesmo OBJ dos dois lados: o friso fica de borda e a conta é a mesma até o arredondamento', () => {
    const pasta = mkdtempSync(join(area, 'chapa-'));
    const texto = chapaComFriso();
    const obj = join(pasta, 'chapa.obj');
    writeFileSync(obj, texto);
    const py = doPython(pasta, obj, { borda: ['friso'] });
    const posicoes = [];
    const triangulos = [];
    const partes = [];
    let atual = '';
    for (const l of texto.split('\n')) {
      if (l.startsWith('v ')) posicoes.push(...l.split(/\s+/).slice(1, 4).map(Number));
      else if (l.startsWith('o ') || l.startsWith('g ')) atual = l.slice(2).trim();
      else if (l.startsWith('f ')) {
        const ids = l.trim().split(/\s+/).slice(1).map((s) => Number(s.split('/')[0]) - 1);
        for (let k = 1; k + 1 < ids.length; k++) { triangulos.push(ids[0], ids[k], ids[k + 1]); partes.push(atual); }
      }
    }
    const js = curvaturaDaLataria({ posicoes, triangulos, partes, lataria: ['chapa'] });
    const r = comparar(py, posicoes, js);
    expect(r.semPar).toBe(0);
    expect(js.contagens.borda).toBe(py.resumo.vertices_de_borda);
    expect(js.contagens.borda).toBeGreaterThan(0);
    expect(r.dadoDiverge).toBe(0);
    expect(r.corDiverge).toBe(0);
    expect(r.maior).toBeLessThan(1e-9);
    expect(js.escala).toBeCloseTo(py.resumo.escala_1_m, 4);
  });
});
