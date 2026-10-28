/* regua-sinal-curvatura-cortes.test.mjs — o que a fatia 25 do plano da carroceria por subdivisão deu à régua, provado sobre a
   chapa de tools/blender/placa-de-prova.mjs, desenhada por código: o mapa de distância com sinal pela normal da candidata
   (azul onde ela afunda, vermelho onde sobra, com a normal invertida da candidata desfeita) e a imagem grande por vista; a
   curvatura comparada, que acusa a ondulação plantada e a aba de 90 graus que falta e dá zero para a forma contra ela mesma,
   enquanto a distância mediana nem nota a aba; os cortes declarados, sem diferença para a forma contra ela mesma e com 20 mm
   no topo da aba que falta; e a contagem de falhas de ondulação da receita.

   Só roda com MODELAR_BLENDER apontando o executável do Blender (e python3 com Pillow e numpy); sem a variável, o bloco
   inteiro se ignora. */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CAIXA, obj } from './placa-de-prova.mjs';
import { doAmbiente } from '../ambiente.mjs';

const BLENDER = doAmbiente('BLENDER');
const AQUI = fileURLToPath(new URL('.', import.meta.url));
const FIXTURE_ONDULACAO = join(AQUI, '../modelar/fixtures/ondulacao-prova.js');
const FIXTURE_LISA = join(AQUI, '../modelar/fixtures/ondulacao-prova-lisa.js');
const ABA = { raio: 0.003, altura: 0.02 };

function regua(args) {
  const r = spawnSync(BLENDER, ['-b', '--factory-startup', '--python', join(AQUI, 'regua.py'), '--', ...args], { encoding: 'utf8', maxBuffer: 256 << 20 });
  if (r.status !== 0) throw new Error(`regua.py saiu com ${r.status}:\n${r.stdout.slice(-3000)}\n${r.stderr.slice(-3000)}`);
}

/** Conta os pixels dominantemente azuis e vermelhos de um PNG, e devolve também o tamanho. */
function pixels(arquivo) {
  const r = spawnSync('python3', ['-I', '-c', [
    'import sys, json', 'import numpy as np', 'from PIL import Image',
    'a = np.asarray(Image.open(sys.argv[1]).convert("RGB")).astype(int)',
    'azul = (a[..., 2] - a[..., 0] > 80)', 'verm = (a[..., 0] - a[..., 2] > 80)',
    'print(json.dumps({"largura": a.shape[1], "altura": a.shape[0], "azul": int(azul.sum()), "vermelho": int(verm.sum())}))',
  ].join('\n'), arquivo], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr);
  return JSON.parse(r.stdout);
}

describe.skipIf(!BLENDER)('régua: mapa com sinal, curvatura comparada, cortes e ondulação da receita', () => {
  let dir;
  const p = (nome) => join(dir, nome);
  const metricas = (nome) => JSON.parse(readFileSync(p(`${nome}/metricas.json`), 'utf8'));
  const medir = (nome, ref, cand, extra = []) => {
    regua(['--referencia', p(`${ref}.obj`), '--candidata', p(`${cand}.obj`), '--caixa', CAIXA, '--saida', p(nome), '--nome', nome,
      '--config', p('cfg.json'), '--densidade', '80000', ...extra]);
    return metricas(nome);
  };

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'regua-sinal-'));
    writeFileSync(p('lisa.obj'), obj());
    writeFileSync(p('aba.obj'), obj({ aba: ABA }));
    writeFileSync(p('onda.obj'), obj({ onda: { amplitude: 0.002, comprimento: 0.06 } }));
    writeFileSync(p('sobe.obj'), obj({ desloca: 0.002 }));
    writeFileSync(p('desce-invertida.obj'), obj({ desloca: -0.002, inverter: true }));
    // o observador fica acima do horizonte: a face de cima é o lado de fora, e a normal invertida precisa ser desfeita
    writeFileSync(p('cfg.json'), JSON.stringify({ visibilidade: { elevacao_minima: 0.3 }, resolucao_folha: [320, 240], resolucao_vista: [720, 540],
      amostras_render: 4, vistas: [{ nome: 'topo', direcao: [0, -1, 0], cima: [0, 0, -1] }] }));
  });
  afterAll(() => {
    if (!dir) return;
    if (doAmbiente('BLENDER_GUARDAR')) console.log(`saídas em ${dir}`);
    else rmSync(dir, { recursive: true, force: true });
  });

  it('a forma contra ela mesma dá curvatura, sinal e cortes sem diferença', { timeout: 300000 }, () => {
    const m = medir('identidade', 'aba', 'aba', ['--cortes', 'z=0.15,x=0.1', '--sem-imagens']);
    const t = m.curvatura.total;
    expect(t.n).toBeGreaterThan(5000);
    expect(t.referencia_1_m.p99).toBeGreaterThan(30);   // a dobra tem curvatura alta, e a diferença para ela mesma é zero
    expect(t.diferenca_abs_1_m.maxima).toBeLessThan(0.01);
    expect(t.dentro_do_limite).toBe(true);
    expect(m.ref_para_cand_com_sinal_mm.minimo).toBeGreaterThan(-0.001);
    expect(m.ref_para_cand_com_sinal_mm.maximo).toBeLessThan(0.001);
    expect(Object.keys(m.cortes)).toEqual(['z150', 'x100']);
    for (const c of Object.values(m.cortes)) {
      const cand = c.candidatas.aba;
      expect(cand.ref_para_cand_mm.maxima).toBeLessThan(1e-3);
      expect(cand.cand_para_ref_mm.maxima).toBeLessThan(1e-3);
      expect(c.ampliacao).toBe('sem diferença');
    }
  });

  it('a aba de 90 graus que falta sai na curvatura, e a distância mediana nem a nota', { timeout: 300000 }, () => {
    const m = medir('sem-aba', 'aba', 'lisa', ['--sem-imagens']);
    expect(m.ref_para_cand_mm.mediana).toBeLessThan(0.5);
    expect(m.ref_para_cand_mm.p99).toBeGreaterThan(10);
    const t = m.curvatura.total;
    expect(t.falta_1_m.p99).toBeGreaterThan(40);
    expect(t.falta_1_m.maxima).toBeGreaterThan(60);
    expect(t.excesso_1_m.maxima).toBe(0);
    expect(t.fracao_acima_limite).toBeGreaterThan(0.1);
    expect(t.dentro_do_limite).toBe(false);
    // o ponto da aba fica abaixo da referência: a candidata afunda
    expect(m.ref_para_cand_com_sinal_mm.p5).toBeLessThan(-3);
    expect(m.ref_para_cand_com_sinal_mm.fracao_sobra_1mm).toBe(0);
  });

  it('o corte pelo meio da aba mostra 20 mm no topo dela, em duas candidatas, com a ampliação na maior diferença', { timeout: 300000 }, () => {
    const m = medir('cortes', 'aba', 'lisa', ['--cortes', 'z=0.15', '--outras-candidatas', p('aba.obj'), '--sem-imagens']);
    const c = m.cortes.z150;
    expect(c.candidatas.lisa.ref_para_cand_mm.maxima).toBeGreaterThan(19.5);
    expect(c.candidatas.lisa.ref_para_cand_mm.maxima).toBeLessThan(20.5);
    expect(c.candidatas.lisa.ref_para_cand_mm.ponto_da_maxima_mm[0]).toBeCloseTo(300, 0);
    expect(c.candidatas.lisa.ref_para_cand_mm.ponto_da_maxima_mm[1]).toBeCloseTo(20, 0);
    expect(c.candidatas.lisa.cand_para_ref_mm.maxima).toBeLessThan(2);
    expect(c.candidatas.aba.ref_para_cand_mm.maxima).toBeLessThan(1e-3);
    expect(c.ampliacao).toBe('maior diferença');
    const [u0, u1, v0, v1] = c.ampliacao_mm;
    expect(u0).toBeLessThan(300);
    expect(u1).toBeGreaterThan(300);
    expect(v0).toBeLessThan(20);
    expect(v1).toBeGreaterThan(20);
  });

  it('a ondulação plantada troca a cor do mapa com sinal e sai na curvatura; as imagens saem grandes', { timeout: 300000 }, () => {
    const m = medir('onda', 'lisa', 'onda', ['--cortes', 'z=0.15', '--mapa-sinal-mm', '2']);
    const s = m.ref_para_cand_com_sinal_mm;
    expect(s.fracao_afunda_1mm).toBeGreaterThan(0.25);
    expect(s.fracao_sobra_1mm).toBeGreaterThan(0.25);
    expect(s.p5).toBeLessThan(-1.5);
    expect(s.p95).toBeGreaterThan(1.5);
    const t = m.curvatura.total;
    expect(t.excesso_1_m.p90).toBeGreaterThan(10);
    expect(t.falta_1_m.maxima).toBe(0);
    expect(t.fracao_acima_limite).toBeGreaterThan(0.1);
    // o mapa da folha tem as duas cores e a imagem da vista é a dos três painéis lado a lado, de até 720 px cada um
    const mapa = pixels(p('onda/mapa_sinal-topo.png'));
    expect(mapa.azul).toBeGreaterThan(300);
    expect(mapa.vermelho).toBeGreaterThan(300);
    const vista = pixels(p('onda/vista-topo.png'));
    expect(vista.largura).toBeGreaterThan(3 * 300);
    expect(vista.largura).toBeLessThanOrEqual(3 * 720 + 28);
    expect(vista.azul).toBeGreaterThan(1500);
    expect(vista.vermelho).toBeGreaterThan(1500);
    expect(existsSync(p('onda/paineis'))).toBe(false);
    expect(existsSync(p('onda/folha.png'))).toBe(true);
    for (const f of ['corte-z150.png', 'corte-z150-ampliado.png']) expect(existsSync(p(`onda/cortes/${f}`))).toBe(true);
    // a chapa lisa contra a ondulada não tem dobra a menos
    expect(m.ref_para_cand_mm.mediana).toBeGreaterThan(1);
  });

  it('a candidata acima sai positiva, e a abaixo com a normal invertida sai negativa', { timeout: 300000 }, () => {
    const acima = medir('acima', 'lisa', 'sobe', ['--sem-imagens']).ref_para_cand_com_sinal_mm;
    expect(acima.mediana).toBeCloseTo(2, 2);
    expect(acima.fracao_sobra_1mm).toBe(1);
    const abaixo = medir('abaixo', 'lisa', 'desce-invertida', ['--sem-imagens']).ref_para_cand_com_sinal_mm;
    expect(abaixo.mediana).toBeCloseTo(-2, 2);
    expect(abaixo.fracao_afunda_1mm).toBe(1);
  });

  it('com --receita, a régua conta as falhas abertas de ondulação e a maior amplitude', { timeout: 300000 }, () => {
    const lisa = medir('receita-lisa', 'lisa', 'lisa', ['--sem-imagens', '--receita', FIXTURE_LISA]).ondulacao_da_receita;
    expect(lisa.falhas_abertas).toBe(0);
    expect(lisa.maior_amplitude_mm).toBe(0);
    const plantada = medir('receita-plantada', 'lisa', 'lisa', ['--sem-imagens', '--receita', FIXTURE_ONDULACAO]).ondulacao_da_receita;
    expect(plantada.falhas_abertas).toBeGreaterThanOrEqual(1);
    expect(plantada.maior_amplitude_mm).toBeGreaterThan(0.7);
    expect(plantada.maior_amplitude_mm).toBeLessThan(1.3);
    expect(plantada.maiores[0].pontos.slice(0, 2).sort()).toEqual(['p5_3', 'p6_3']);
  });
});
