/* conferir-refino.test.mjs — a conferência entre rodadas de refino (tools/blender/conferir-refino.py), provada sobre a chapa
   com abertura de tools/blender/chapa-com-abertura-de-prova.mjs, desenhada por código: a primeira versão tem a abertura em y
   de 250 a 450 mm e um calombo liso de 10 mm; a segunda baixa a abertura 45 mm e tira o calombo. Com a abertura dada como
   certa, a conferência acusa a abertura com uns 45 mm e não acusa o calombo, que não estava na lista, e o acusa quando a
   lista o inclui; duas candidatas iguais dão deslocamento zero; a tolerância se declara por zona; o sinal é o do deslocamento
   da nova em relação à anterior; a receita (.js) entra no lugar do OBJ; e duas execuções dão a mesma medida.

   Só roda com MECANIFICA_BLENDER apontando o executável do Blender (e python3 com Pillow e numpy); sem a variável, o bloco
   inteiro se ignora. */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CALOMBO, CAIXA, abaixo, obj } from './chapa-com-abertura-de-prova.mjs';

const BLENDER = process.env.MECANIFICA_BLENDER;
const AQUI = fileURLToPath(new URL('.', import.meta.url));
const RECEITA_LISA = join(AQUI, '../mecanifica/fixtures/ondulacao-prova-lisa.js');

// a abertura com folga em volta, pela posição que a primeira versão dá a ela, e o calombo, e um trecho que ninguém mexe
const JANELA = { nome: 'janela', x: [280, 720], y: [230, 470], z: [-20, 20] };
const CALOMBO_ZONA = { nome: 'calombo', x: [780, 920], y: [90, 210], z: [-20, 20] };
const BASE = { nome: 'base', x: [0, 1000], y: [520, 600] };

function conferir(args) {
  const r = spawnSync(BLENDER, ['-b', '--factory-startup', '--python', join(AQUI, 'conferir-refino.py'), '--', ...args], { encoding: 'utf8', maxBuffer: 256 << 20 });
  if (r.status !== 0) throw new Error(`conferir-refino.py saiu com ${r.status}:\n${r.stdout.slice(-3000)}\n${r.stderr.slice(-3000)}`);
  return r.stdout;
}

/** Conta os pixels de uma cor (a menos de `tol` em cada canal) numa imagem. */
function pixels(arquivo, cor, tol = 40) {
  const r = spawnSync('python3', ['-I', '-c', [
    'import sys, json', 'import numpy as np', 'from PIL import Image',
    'a = np.asarray(Image.open(sys.argv[1]).convert("RGB")).astype(int)',
    'cor = json.loads(sys.argv[2])',
    'm = (np.abs(a - np.array(cor)) <= int(sys.argv[3])).all(2)',
    'print(int(m.sum()))',
  ].join('\n'), arquivo, JSON.stringify(cor), String(tol)], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr);
  return Number(r.stdout);
}

describe.skipIf(!BLENDER)('conferir-refino: a zona dada como certa que o refino mexeu', () => {
  let dir;
  const p = (nome) => join(dir, nome);
  const ler = (nome) => JSON.parse(readFileSync(p(`${nome}/conferencia.json`), 'utf8'));
  const rodar = (nome, ant, nova, zonas, extra = []) => {
    writeFileSync(p(`${nome}-zonas.json`), JSON.stringify(zonas));
    conferir(['--anterior', p(ant), '--nova', p(nova), '--zonas', p(`${nome}-zonas.json`), '--saida', p(nome), '--caixa', CAIXA, ...extra]);
    return ler(nome);
  };
  const sem = (m) => JSON.stringify(m, (k, v) => (k.startsWith('segundos') ? undefined : v));

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'conferir-refino-'));
    writeFileSync(p('v1.obj'), obj({ calombo: CALOMBO }));
    writeFileSync(p('v2.obj'), obj({ abertura: abaixo(45) }));
    writeFileSync(p('lisa.obj'), obj());
    writeFileSync(p('lisa-fora-5mm.obj'), obj({ desloca: 0.005 }));
    writeFileSync(p('cfg.json'), JSON.stringify({ resolucao_vista: [640, 480], amostras_render: 4, vistas: [{ nome: 'frente', direcao: [0, 0, -1], cima: [0, 1, 0] }] }));
  });
  afterAll(() => {
    if (!dir) return;
    if (process.env.MECANIFICA_BLENDER_GUARDAR) console.log(`saídas em ${dir}`);
    else rmSync(dir, { recursive: true, force: true });
  });

  it('com a abertura dada como certa, acusa a abertura com uns 45 mm e não o calombo, e desenha o mapa e as zonas', { timeout: 300000 }, () => {
    const m = rodar('abertura', 'v1.obj', 'v2.obj', { zonas: [JANELA, BASE] }, ['--config', p('cfg.json')]);
    expect(m.mexidas.map((x) => x.zona)).toEqual(['janela']);
    const j = m.mexidas[0];
    expect(j.mm).toBeGreaterThan(41);
    expect(j.mm).toBeLessThan(46);
    expect(j.eixo).toBe('-y');
    expect(j.movimento_da_nova_mm[1]).toBeLessThan(-41);
    expect(Math.abs(j.movimento_da_nova_mm[0])).toBeLessThan(1);
    expect(Math.abs(j.movimento_da_nova_mm[2])).toBeLessThan(1);
    // o lugar: o ponto do máximo e o trecho acima da tolerância ficam na faixa que a abertura deixou e na que ganhou
    expect(j.ponto_mm[0]).toBeGreaterThan(300);
    expect(j.ponto_mm[0]).toBeLessThan(700);
    expect(j.caixa_acima_da_tolerancia_mm.y[0]).toBeGreaterThanOrEqual(230);
    expect(j.fracao_acima_da_tolerancia).toBeGreaterThan(0.1);
    expect(m.zonas.base.mexida).toBe(false);
    expect(m.zonas.base.valor_mm).toBeLessThan(0.01);
    // o calombo, que não estava na lista, mexeu fora das zonas e não é acusado
    expect(m.zonas.calombo).toBeUndefined();
    const fora = m.fora_das_zonas.nova_para_anterior_mm;
    expect(fora.maximo).toBeGreaterThan(9);
    expect(fora.maximo).toBeLessThan(10.5);
    expect(fora.com_sinal_mm.minimo).toBeLessThan(-9);
    // no total entram os dois, e a mediana é zero: quase toda a chapa ficou onde estava
    expect(m.total.anterior_para_nova_mm.maximo).toBeGreaterThan(41);
    expect(m.total.anterior_para_nova_mm.mediana).toBeLessThan(0.01);
    expect(m.texto[0]).toContain('"janela"');
    expect(readFileSync(p('abertura/conferencia.md'), 'utf8')).toContain('foi mexida');
    // o sinal é o da nova em relação à anterior: o que a anterior tinha e a nova não tem é negativo, o que a nova ganhou é positivo
    const z = m.zonas.janela;
    expect(z.anterior_para_nova_mm.com_sinal_mm.minimo).toBeLessThan(-41);
    expect(z.anterior_para_nova_mm.com_sinal_mm.maximo).toBeLessThan(0.01);
    expect(z.nova_para_anterior_mm.com_sinal_mm.maximo).toBeGreaterThan(41);
    expect(z.nova_para_anterior_mm.com_sinal_mm.minimo).toBeGreaterThan(-0.01);
    // a imagem da vista: o mapa com sinal tem azul e vermelho, e as zonas saem em magenta (mexida) e verde (conferida)
    const img = p('abertura/conferencia-frente.png');
    expect(existsSync(img)).toBe(true);
    expect(pixels(img, [200, 0, 160], 30)).toBeGreaterThan(300);
    expect(pixels(img, [0, 140, 60], 30)).toBeGreaterThan(300);
    expect(pixels(img, [90, 130, 235], 60)).toBeGreaterThan(300);
    expect(pixels(img, [235, 100, 80], 60)).toBeGreaterThan(300);
  });

  it('a lista decide: com o calombo declarado como certo, ele é acusado com uns 10 mm para dentro', { timeout: 300000 }, () => {
    const m = rodar('calombo', 'v1.obj', 'v2.obj', { zonas: [JANELA, CALOMBO_ZONA] }, ['--sem-imagens']);
    expect(m.mexidas.map((x) => x.zona).sort()).toEqual(['calombo', 'janela']);
    const c = m.mexidas.find((x) => x.zona === 'calombo');
    expect(c.mm).toBeGreaterThan(9);
    expect(c.mm).toBeLessThan(10.5);
    expect(c.eixo).toBe('-z');
    expect(m.zonas.calombo.anterior_para_nova_mm.com_sinal_mm.minimo).toBeLessThan(-9);
    expect(m.mexidas[0].zona).toBe('janela');   // da maior para a menor
  });

  it('duas candidatas iguais dão deslocamento zero e nenhuma zona mexida', { timeout: 300000 }, () => {
    const m = rodar('identica', 'v1.obj', 'v1.obj', { zonas: [JANELA, CALOMBO_ZONA, BASE] }, ['--sem-imagens']);
    expect(m.mexidas).toEqual([]);
    for (const sentido of ['anterior_para_nova_mm', 'nova_para_anterior_mm']) {
      expect(m.total[sentido].n).toBeGreaterThan(30000);
      expect(m.total[sentido].maximo).toBeLessThan(0.001);
      expect(m.total[sentido].com_sinal_mm.minimo).toBe(0);
      expect(m.total[sentido].com_sinal_mm.maximo).toBe(0);
    }
    for (const z of Object.values(m.zonas)) expect(z.valor_mm).toBeLessThan(0.001);
    expect(m.texto).toEqual(['Nenhuma zona dada como certa passou da tolerância.']);
  });

  it('a tolerância se declara por zona e na linha de comando, e o p95 pode ser o critério', { timeout: 300000 }, () => {
    const larga = rodar('tol-zona', 'v1.obj', 'v2.obj', { zonas: [{ ...JANELA, tolerancia_mm: 50 }, BASE] }, ['--sem-imagens']);
    expect(larga.mexidas).toEqual([]);
    expect(larga.zonas.janela.valor_mm).toBeGreaterThan(41);
    const global = rodar('tol-global', 'v1.obj', 'v2.obj', { zonas: [JANELA] }, ['--sem-imagens', '--tolerancia-mm', '60']);
    expect(global.mexidas).toEqual([]);
    const p95 = rodar('p95', 'v1.obj', 'v2.obj', { criterio: 'p95', zonas: [JANELA, BASE] }, ['--sem-imagens']);
    expect(p95.zonas.janela.criterio).toBe('p95');
    expect(p95.zonas.janela.valor_mm).toBeLessThan(p95.zonas.janela.anterior_para_nova_mm.maximo + 1e-9);
    expect(p95.mexidas.map((x) => x.zona)).toEqual(['janela']);
  });

  it('o sinal vem da normal: a chapa 5 mm para fora dá +5 mm nos dois sentidos', { timeout: 300000 }, () => {
    const m = rodar('fora', 'lisa.obj', 'lisa-fora-5mm.obj', { zonas: [{ nome: 'chapa', x: [100, 900], y: [50, 550] }] }, ['--sem-imagens']);
    expect(m.mexidas.map((x) => x.zona)).toEqual(['chapa']);
    const z = m.zonas.chapa;
    for (const sentido of ['anterior_para_nova_mm', 'nova_para_anterior_mm']) {
      expect(z[sentido].maximo).toBeGreaterThan(4.9);
      expect(z[sentido].maximo).toBeLessThan(5.1);
      expect(z[sentido].com_sinal_mm.mediana).toBeGreaterThan(4.9);
      expect(z[sentido].com_sinal_mm.minimo).toBeGreaterThan(4.9);
    }
    expect(m.mexidas[0].eixo).toBe('+z');
  });

  it('a receita entra no lugar do OBJ e a mesma entrada dá a mesma medida', { timeout: 300000 }, () => {
    const zonas = { zonas: [{ nome: 'chapa' }] };
    writeFileSync(p('receita-zonas.json'), JSON.stringify(zonas));
    conferir(['--anterior', RECEITA_LISA, '--nova', RECEITA_LISA, '--zonas', p('receita-zonas.json'), '--saida', p('receita'), '--sem-imagens']);
    const m = ler('receita');
    expect(m.mexidas).toEqual([]);
    expect(m.zonas.chapa.anterior_para_nova_mm.n).toBeGreaterThan(1000);
    expect(m.zonas.chapa.valor_mm).toBeLessThan(0.001);
    // duas execuções da mesma entrada, uma com imagens e outra sem, dão a mesma medida
    const outra = rodar('abertura-de-novo', 'v1.obj', 'v2.obj', { zonas: [JANELA, BASE] }, ['--sem-imagens']);
    expect(sem(outra)).toBe(sem(ler('abertura')));
  });

  it('recusa a entrada que não serve, com o código 2', { timeout: 120000 }, () => {
    writeFileSync(p('repetida.json'), JSON.stringify({ zonas: [{ nome: 'a', x: [0, 1] }, { nome: 'a', x: [2, 3] }] }));
    writeFileSync(p('sem-nome.json'), JSON.stringify({ zonas: [{ x: [0, 1] }] }));
    for (const [arquivo, trecho] of [['repetida.json', 'repetida'], ['sem-nome.json', 'nome']]) {
      const r = spawnSync(BLENDER, ['-b', '--factory-startup', '--python', join(AQUI, 'conferir-refino.py'), '--', '--anterior', p('v1.obj'), '--nova', p('v2.obj'),
        '--zonas', p(arquivo), '--saida', p('recusa'), '--caixa', CAIXA, '--sem-imagens'], { encoding: 'utf8' });
      expect(r.status).toBe(2);
      expect(r.stderr).toContain(trecho);
    }
  });
});
