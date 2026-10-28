/* limiar-de-dobra.test.mjs — comparar-vincos mede os vincos pelo mesmo limiar de dobra da régua (fatia 3 do plano da gaiola que
   segue as feições). Antes, a ferramenta de vincos contava como vinco a aresta a partir de 25 graus, o desenho de linhas do
   pacote, e a régua a partir de 40: uma candidata cujas dobras tinham de 25 a 40 graus saía com cobertura alta em
   comparar-vincos e quase nula na régua.

   A forma é um prisma extrudado em z, desenhado por código, com uma rampa de 50 graus entre dois patamares planos: a referência
   tem as duas dobras da rampa de 50 graus; a candidata tem a primeira de 50 e a segunda de 30 (o patamar de depois sobe 20
   graus), nas mesmas posições. A régua conta só a dobra de 50 graus da candidata e dá cobertura de 0,5; comparar-vincos, pelo
   mesmo limiar, dá a cobertura da régua a 0,02, relata o comprimento da dobra de 30 graus como rasa e, com o limiar baixado a
   25 graus, devolve a medida de antes, em que as duas ferramentas contam as duas dobras.

   Só roda com MODELAR_BLENDER apontando o executável do Blender (e python3 com Pillow e numpy); sem a variável, o bloco se
   ignora. A classificação das curvas lidas do pacote está em leitura-do-pacote.test.mjs, sem Blender. */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import earcut from 'earcut';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { doAmbiente } from '../ambiente.mjs';

const BLENDER = doAmbiente('BLENDER');
const AQUI = fileURLToPath(new URL('.', import.meta.url));
/** A caixa do pacote e da régua: x de -0,4 a 0,4, y de -0,1 a 0,4 e z de 0,2 a 0,8, onde só as duas dobras da rampa aparecem. */
const CAIXA = '-0.4,0.4,-0.1,0.4,0.2,0.8';
const COMPRIMENTO = 1.0;
const RAMPA = { de: -0.1, ate: 0.1, graus: 50 };

function rodar(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 256 << 20 });
  if (r.status !== 0) throw new Error(`${args.find((a) => a.endsWith('.py'))} saiu com ${r.status}:\n${r.stdout.slice(-3000)}\n${r.stderr.slice(-3000)}`);
  return r.stdout;
}
const py = (script, args) => rodar('python3', ['-I', join(AQUI, script), ...args]);
const blender = (script, args) => rodar(BLENDER, ['-b', '--factory-startup', '--python', join(AQUI, script), '--', ...args]);

/** O OBJ do prisma: a seção (x, y) é fundo reto, lados retos e o topo em patamar, rampa de 50 graus e patamar que sobe `subida`
    graus; as tampas ficam em z = 0 e z = 1, fora da caixa. */
function prisma(subida) {
  const h = (RAMPA.ate - RAMPA.de) * Math.tan((RAMPA.graus * Math.PI) / 180);
  const direita = [0.6, h + 0.5 * Math.tan((subida * Math.PI) / 180)];
  const secao = [[-0.6, -0.2], [0.6, -0.2], direita, [RAMPA.ate, h], [RAMPA.de, 0], [-0.6, 0]];
  const n = secao.length;
  const v = [...secao.map(([x, y]) => [x, y, 0]), ...secao.map(([x, y]) => [x, y, COMPRIMENTO])];
  const f = [];
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; f.push([i, j, n + j, n + i]); }
  const tri = earcut(secao.flat());
  const area = (a, b, c) => (secao[b][0] - secao[a][0]) * (secao[c][1] - secao[a][1]) - (secao[b][1] - secao[a][1]) * (secao[c][0] - secao[a][0]);
  for (let k = 0; k < tri.length; k += 3) {
    const [a, b, c] = area(tri[k], tri[k + 1], tri[k + 2]) > 0 ? [tri[k], tri[k + 1], tri[k + 2]] : [tri[k], tri[k + 2], tri[k + 1]];
    f.push([n + a, n + b, n + c], [c, b, a]);
  }
  return `${v.map((p) => `v ${p.join(' ')}`).join('\n')}\n${f.map((q) => `f ${q.map((i) => i + 1).join(' ')}`).join('\n')}\n`;
}

describe.skipIf(!BLENDER)('comparar-vincos e régua pelo mesmo limiar de dobra', () => {
  let dir;
  const p = (...n) => join(dir, ...n);
  const lido = (...n) => JSON.parse(readFileSync(p(...n), 'utf8'));
  const regua = (cand, nome, extra = []) => {
    blender('regua.py', ['--referencia', p('referencia.obj'), '--candidata', p(cand), '--caixa', CAIXA, '--saida', p(nome), '--nome', nome, '--sem-imagens', ...extra]);
    return lido(nome, 'metricas.json').vincos;
  };
  const comparar = (nome, extra = []) => {
    py('comparar-vincos.py', ['--pacote', p('pacote'), '--candidata', p('candidata.obj'), '--blender', BLENDER, '--vista', 'topo', '--sem-3d', '--saida', p(nome), ...extra]);
    return lido(nome, 'comparacao-vincos.json');
  };

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'limiar-de-dobra-'));
    writeFileSync(p('referencia.obj'), prisma(0));
    writeFileSync(p('candidata.obj'), prisma(20));
    writeFileSync(p('cfg.json'), JSON.stringify({ amostras_render: 1 }));
    blender('pacote-cego.py', ['--referencia', p('referencia.obj'), '--caixa', CAIXA, '--config', p('cfg.json'), '--saida', p('pacote'), '--privado', p('privado')]);
  }, 600000);
  afterAll(() => {
    if (!dir) return;
    if (doAmbiente('BLENDER_GUARDAR')) console.log(`saídas em ${dir}`);
    else rmSync(dir, { recursive: true, force: true });
  });

  it('o pacote desenha as duas dobras da referência, de 50 graus, e a candidata tem uma de 50 e uma de 30', () => {
    const pacote = lido('pacote', 'pacote.json');
    expect(pacote.linhas.feicao).toBe(2);
    expect(pacote.configuracao.angulo_feicao).toBe(25);
  });

  it('a régua conta só a dobra de 50 graus da candidata (cobertura 0,5), e comparar-vincos dá a cobertura da régua a 0,02', { timeout: 600000 }, () => {
    const r = regua('candidata.obj', 'regua');
    expect(r.angulo_graus).toBe(40);
    expect(r.ref_comprimento_mm).toBeGreaterThan(1100);
    expect(r.cand_comprimento_mm).toBeGreaterThan(550);
    expect(r.cand_comprimento_mm).toBeLessThan(650);
    expect(r.cobertura_5mm).toBeGreaterThan(0.45);
    expect(r.cobertura_5mm).toBeLessThan(0.55);
    const c = comparar('padrao');
    expect(c.angulo_vinco).toBe(40);
    expect(Math.abs(c.total.cobertura_5mm - r.cobertura_5mm)).toBeLessThanOrEqual(0.02);
    expect(Math.abs(c.total.cobertura_2mm - r.cobertura_5mm)).toBeLessThanOrEqual(0.02);
    expect(c.total.precisao_5mm).toBeGreaterThan(0.98);
  });

  it('relata a dobra de 30 graus como rasa, em 3D e na vista, e a candidata sem rasa não tem comprimento rasa', () => {
    const c = lido('padrao', 'comparacao-vincos.json');
    expect(c.rasas.faixa_graus).toEqual([25, 40]);
    expect(c.rasas.comprimento_candidata_3d_mm).toBeGreaterThan(590);
    expect(c.rasas.comprimento_candidata_3d_mm).toBeLessThan(610);
    expect(c.rasas.comprimento_vincos_candidata_3d_mm).toBeGreaterThan(590);
    expect(c.rasas.comprimento_vincos_candidata_3d_mm).toBeLessThan(610);
    expect(c.rasas.por_vista_mm.topo).toBeGreaterThan(590);
    expect(c.vistas.topo.rasas_candidata_mm).toBe(c.rasas.por_vista_mm.topo);
    // a candidata igual à referência não tem dobra rasa
    py('comparar-vincos.py', ['--pacote', p('pacote'), '--candidata', p('referencia.obj'), '--blender', BLENDER, '--vista', 'topo', '--sem-3d', '--saida', p('igual')]);
    const igual = lido('igual', 'comparacao-vincos.json');
    expect(igual.rasas.comprimento_candidata_3d_mm).toBe(0);
    expect(igual.total.cobertura_5mm).toBeGreaterThan(0.95);
  });

  it('com o limiar baixado a 25 graus as duas ferramentas contam as duas dobras da candidata e dão a cobertura inteira', { timeout: 600000 }, () => {
    const r = regua('candidata.obj', 'regua-25', ['--angulo-vinco', '25']);
    const c = comparar('limiar-25', ['--angulo-vinco', '25']);
    expect(r.cobertura_5mm).toBeGreaterThan(0.95);
    expect(c.total.cobertura_5mm).toBeGreaterThan(0.95);
    expect(Math.abs(c.total.cobertura_5mm - r.cobertura_5mm)).toBeLessThanOrEqual(0.02);
    expect(c.rasas.comprimento_candidata_3d_mm).toBe(0);
  });

  it('a mesma entrada dá a mesma saída', () => {
    comparar('padrao-2');
    expect(readFileSync(p('padrao-2', 'comparacao-vincos.json'), 'utf8')).toBe(readFileSync(p('padrao', 'comparacao-vincos.json'), 'utf8'));
  });
});
