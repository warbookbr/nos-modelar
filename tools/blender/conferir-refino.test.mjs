/* conferir-refino.test.mjs — a conferência entre rodadas de refino (tools/blender/conferir-refino.py), provada sobre a chapa
   com abertura de tools/blender/chapa-com-abertura-de-prova.mjs, desenhada por código: a primeira versão tem a abertura em y
   de 250 a 450 mm e um calombo liso de 10 mm; a segunda baixa a abertura 45 mm e tira o calombo. Com a abertura dada como
   certa, a conferência acusa a abertura com uns 45 mm e não acusa o calombo, que não estava na lista, e o acusa quando a
   lista o inclui; duas candidatas iguais dão deslocamento zero; a tolerância se declara por zona; o sinal é o do deslocamento
   da nova em relação à anterior; a receita (.js) entra no lugar do OBJ; e duas execuções dão a mesma medida.

   Com receita nos dois lados (tools/blender/receitas-de-prova/chapa-rodada-*.js, uma chapa com abertura), a conferência compara
   por parte nomeada: a segunda rodada acrescenta o friso em volta da abertura e arredonda o canto inferior esquerdo da
   abertura; o friso sai como parte nova e o canto, declarado como pedido da zona, fica fora da conta, e nada é acusado; sem o
   pedido o canto é acusado, com --todas-as-partes o friso (4 mm) é acusado, e a abertura que desce 45 mm é acusada de
   qualquer modo. Com OBJ, que não traz partes, a saída diz que a comparação inclui tudo.

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
const RODADA = (n) => join(AQUI, `receitas-de-prova/chapa-rodada-${n}.js`);

// a abertura com folga em volta, pela posição que a primeira versão dá a ela, e o calombo, e um trecho que ninguém mexe
const JANELA = { nome: 'janela', x: [280, 720], y: [230, 470], z: [-20, 20] };
const CALOMBO_ZONA = { nome: 'calombo', x: [780, 920], y: [90, 210], z: [-20, 20] };
const BASE = { nome: 'base', x: [0, 1000], y: [520, 600] };
// o que o crítico mandou mudar na janela da receita: arredondar o canto inferior esquerdo da abertura (a abertura vai de x 300 a
// 700 e de y 250 a 450, com o raio de 30 mm), numa caixa que o cobre com folga e fica dentro da zona
const PEDIDO = { descricao: 'arredondar o canto inferior esquerdo da janela', x: [295, 335], y: [245, 285] };

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

  const cada = (nome, de, para, zonas, extra = []) => {
    writeFileSync(p(`${nome}-zonas.json`), JSON.stringify(zonas));
    conferir(['--anterior', RODADA(de), '--nova', RODADA(para), '--zonas', p(`${nome}-zonas.json`), '--saida', p(nome), '--caixa', CAIXA, '--sem-imagens', ...extra]);
    return ler(nome);
  };
  const JANELA_COM_PEDIDO = { ...JANELA, pedido: [PEDIDO] };

  it('receita: o friso acrescentado é parte nova e o canto pedido fica fora da conta, e nada é acusado', { timeout: 300000 }, () => {
    const m = cada('receita-pedido', 1, 2, { zonas: [JANELA_COM_PEDIDO, BASE] });
    expect(m.mexidas).toEqual([]);
    expect(m.texto).toEqual(['Nenhuma zona dada como certa passou da tolerância.']);
    expect(m.partes.comparacao).toBe('por-parte');
    expect(m.partes.comparadas).toEqual(['chapa']);
    expect(m.partes.sumidas).toEqual([]);
    expect(m.partes.novas.map((x) => x.nome)).toEqual(['friso']);
    expect(m.partes.novas[0].zonas).toEqual(['janela']);
    expect(m.partes.novas[0].caixa_mm.x).toEqual([280, 720]);
    expect(m.partes.novas[0].caixa_mm.z).toEqual([6, 10]);
    // a zona, fora do pedido, quase não anda (o arco do canto passa um pouco da caixa); o canto andou uns 7,7 mm e vem medido à parte
    expect(m.zonas.janela.valor_mm).toBeLessThan(0.1);
    const ped = m.zonas.janela.pedidos[0];
    expect(ped.descricao).toBe(PEDIDO.descricao);
    for (const sentido of ['anterior_para_nova_mm', 'nova_para_anterior_mm']) expect(ped[sentido].n).toBeGreaterThan(20);
    const andou = Math.max(ped.anterior_para_nova_mm.maximo, ped.nova_para_anterior_mm.maximo);
    expect(andou).toBeGreaterThan(6.5);
    expect(andou).toBeLessThan(9);
    expect(m.zonas.janela.nova_para_anterior_mm.n).toBeGreaterThan(1000);
    // as notas dizem o modo, a parte nova e o pedido, e vão para o arquivo das notas, não para o texto do modelador
    expect(m.notas.join('\n')).toContain('"friso"');
    expect(m.notas.join('\n')).toContain('cai na zona "janela"');
    expect(m.notas.join('\n')).toContain(PEDIDO.descricao);
    expect(readFileSync(p('receita-pedido/conferencia-notas.md'), 'utf8')).toContain('Parte nova na rodada');
    expect(readFileSync(p('receita-pedido/conferencia.md'), 'utf8')).not.toContain('friso');
    // a mesma conferência, com --partes chapa, dá a mesma medida
    const igual = cada('receita-pedido-partes', 1, 2, { zonas: [JANELA_COM_PEDIDO, BASE] }, ['--partes', 'chapa']);
    expect(sem({ ...igual, partes: undefined, notas: undefined })).toBe(sem({ ...m, partes: undefined, notas: undefined }));
    expect(igual.partes.motivo).toContain('--partes');
  });

  it('receita: sem o pedido o canto arredondado é acusado, com uns 7,7 mm em +x, e o friso não', { timeout: 300000 }, () => {
    const m = cada('receita-sem-pedido', 1, 2, { zonas: [JANELA, BASE] });
    expect(m.mexidas.map((x) => x.zona)).toEqual(['janela']);
    const j = m.mexidas[0];
    expect(j.mm).toBeGreaterThan(6.5);
    expect(j.mm).toBeLessThan(9);
    expect(j.ponto_mm[0]).toBeGreaterThan(300);
    expect(j.ponto_mm[0]).toBeLessThan(335);
    expect(j.ponto_mm[1]).toBeGreaterThan(250);
    expect(j.ponto_mm[1]).toBeLessThan(285);
    expect(m.partes.novas.map((x) => x.nome)).toEqual(['friso']);
  });

  it('receita: com --todas-as-partes o friso entra na conta e é acusado com 4 mm em +z, mesmo com o pedido', { timeout: 300000 }, () => {
    const m = cada('receita-todas', 1, 2, { zonas: [JANELA_COM_PEDIDO, BASE] }, ['--todas-as-partes']);
    expect(m.partes.comparacao).toBe('tudo');
    expect(m.mexidas.map((x) => x.zona)).toEqual(['janela']);
    expect(m.mexidas[0].mm).toBeGreaterThan(3.8);
    expect(m.mexidas[0].mm).toBeLessThan(4.2);
    expect(m.mexidas[0].eixo).toBe('+z');
  });

  it('receita: a abertura e o friso que descem 45 mm saem acusados, com ou sem o pedido do canto', { timeout: 300000 }, () => {
    for (const [nome, janela] of [['receita-desce', JANELA_COM_PEDIDO], ['receita-desce-sem-pedido', JANELA]]) {
      const m = cada(nome, 1, 3, { zonas: [janela, BASE] });
      expect(m.mexidas.map((x) => x.zona)).toEqual(['janela']);
      const j = m.mexidas[0];
      expect(j.mm).toBeGreaterThan(41);
      expect(j.mm).toBeLessThan(46);
      expect(j.eixo).toBe('-y');
      expect(j.fracao_acima_da_tolerancia).toBeGreaterThan(0.1);
      expect(m.partes.novas.map((x) => x.nome)).toEqual(['friso']);
      expect(m.zonas.base.mexida).toBe(false);
    }
    // da segunda para a terceira rodada o friso existe nas duas, e ele também entra na comparação
    const duas = cada('receita-desce-com-friso', 2, 3, { zonas: [JANELA_COM_PEDIDO, BASE] });
    expect(duas.partes.comparadas).toEqual(['chapa', 'friso']);
    expect(duas.partes.novas).toEqual([]);
    expect(duas.mexidas.map((x) => x.zona)).toEqual(['janela']);
  });

  it('receita: a parte que sumiu sai nas notas, sem acusação, e o OBJ diz que a comparação inclui tudo', { timeout: 300000 }, () => {
    const m = cada('receita-sumiu', 2, 1, { zonas: [JANELA_COM_PEDIDO, BASE] });
    expect(m.mexidas).toEqual([]);
    expect(m.partes.sumidas.map((x) => x.nome)).toEqual(['friso']);
    expect(m.partes.sumidas[0].zonas).toEqual(['janela']);
    expect(m.partes.novas).toEqual([]);
    expect(m.notas.join('\n')).toContain('Parte que sumiu na rodada');
    const obj = rodar('obj-tudo', 'v1.obj', 'v2.obj', { zonas: [JANELA, BASE] }, ['--sem-imagens']);
    expect(obj.partes.comparacao).toBe('tudo');
    expect(obj.partes.motivo).toContain('não traz partes');
    expect(obj.notas[0]).toContain('A comparação inclui tudo');
  });

  it('recusa --partes com nome que não está nas duas rodadas e pedido que não serve, com o código 2', { timeout: 300000 }, () => {
    const casos = [
      ['partes-ausente', { zonas: [JANELA] }, ['--partes', 'friso'], 'não está nas duas'],
      ['partes-obj', { zonas: [JANELA] }, ['--partes', 'chapa'], 'receita'],
      ['pedido-fora', { zonas: [{ ...JANELA, pedido: [{ descricao: 'x', x: [200, 335], y: [245, 285] }] }] }, [], 'sai da zona'],
      ['pedido-inteiro', { zonas: [{ ...JANELA, pedido: [{ descricao: 'x', x: [280, 720] }] }] }, [], 'cobre a zona inteira'],
      ['pedido-sem-descricao', { zonas: [{ ...JANELA, pedido: [{ x: [295, 335] }] }] }, [], 'descricao'],
      ['pedido-repetido', { zonas: [{ ...JANELA, pedido: [PEDIDO, PEDIDO] }] }, [], 'repetido'],
    ];
    for (const [nome, zonas, extra, trecho] of casos) {
      writeFileSync(p(`${nome}.json`), JSON.stringify(zonas));
      const entrada = nome === 'partes-obj' ? ['--anterior', p('v1.obj'), '--nova', p('v2.obj')] : ['--anterior', RODADA(1), '--nova', RODADA(2)];
      const r = spawnSync(BLENDER, ['-b', '--factory-startup', '--python', join(AQUI, 'conferir-refino.py'), '--', ...entrada,
        '--zonas', p(`${nome}.json`), '--saida', p(nome), '--caixa', CAIXA, '--sem-imagens', ...extra], { encoding: 'utf8' });
      expect(r.status, `${nome}: ${r.stderr}`).toBe(2);
      expect(r.stderr).toContain(trecho);
    }
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
