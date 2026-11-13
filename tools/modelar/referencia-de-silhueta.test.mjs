import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { alisarTrecho, lerAlisar, comoCLI, dividirAnel, lerAlinhar, lerCortes, lerEscala, ErroDeSilhueta, transformacao } from './referencia-de-silhueta.mjs';
import { lerReferencia, medirSilhueta } from './silhueta-contra-referencia.mjs';

/* Um corte cai no vértice do contorno mais perto do pedido, e a ponta de uma quina sai arredondada pelo alisamento do módulo, daí os 3 px nos cortes. A forma conhecida: um L em mm, nos eixos do modelo. A imagem sintética a desenha girada em 25 graus e a 0,4 mm/px, com y para baixo. */
const L = [[0, 0], [100, 0], [100, 20], [40, 20], [40, 60], [0, 60]];
const MM_POR_PX = 0.4;
const GIRO = (25 * Math.PI) / 180;
const CENTRO = [330, 380];
const paraPx = ([a, b]) => {
  const u = (a * Math.cos(GIRO) - b * Math.sin(GIRO)) / MM_POR_PX;
  const v = (a * Math.sin(GIRO) + b * Math.cos(GIRO)) / MM_POR_PX;
  return [CENTRO[0] + u, CENTRO[1] - v];
};
const paraModeloExato = ([x, y]) => {
  const u = (x - CENTRO[0]) * MM_POR_PX; const v = -(y - CENTRO[1]) * MM_POR_PX;
  return [u * Math.cos(GIRO) + v * Math.sin(GIRO), -u * Math.sin(GIRO) + v * Math.cos(GIRO)];
};
const dentroDoL = ([a, b]) => (a >= 0 && a <= 100 && b >= 0 && b <= 20) || (a >= 0 && a <= 40 && b >= 0 && b <= 60);

function imagemSintetica() {
  const png = new PNG({ width: 700, height: 700 });
  for (let y = 0; y < 700; y++) for (let x = 0; x < 700; x++) {
    const escuro = dentroDoL(paraModeloExato([x, y]));
    const i = (y * 700 + x) * 4;
    png.data[i] = png.data[i + 1] = png.data[i + 2] = escuro ? 20 : 255; png.data[i + 3] = 255;
  }
  return PNG.sync.write(png);
}

const distanciaAoL = (p) => {
  let d = Infinity;
  for (let i = 0; i < L.length; i++) {
    const s = L[i]; const t = L[(i + 1) % L.length];
    const dx = t[0] - s[0]; const dy = t[1] - s[1];
    const u = Math.max(0, Math.min(1, ((p[0] - s[0]) * dx + (p[1] - s[1]) * dy) / (dx * dx + dy * dy)));
    d = Math.min(d, Math.hypot(p[0] - s[0] - u * dx, p[1] - s[1] - u * dy));
  }
  return d;
};

const lista = (...ps) => ps.map((p) => p.map((v) => v.toFixed(2)).join(',')).join(',');
const capturar = async (argv) => {
  const out = []; const err = [];
  const o = process.stdout.write.bind(process.stdout); const e = process.stderr.write.bind(process.stderr);
  process.stdout.write = (t) => { out.push(String(t)); return true; };
  process.stderr.write = (t) => { err.push(String(t)); return true; };
  try { return { codigo: await comoCLI(argv), out: out.join(''), err: err.join('') }; } finally { process.stdout.write = o; process.stderr.write = e; }
};

const pasta = mkdtempSync(join(tmpdir(), 'referencia-silhueta-'));
const imagem = join(pasta, 'l.png');
writeFileSync(imagem, imagemSintetica());
const regioes = join(pasta, 'regioes.json');
const [c0, c1, c2] = [paraPx([0, 0]), paraPx([100, 20]), paraPx([0, 60])];
writeFileSync(regioes, JSON.stringify({ limiar: 128, regioes: { l: [paraPx([10, 10]).map(Math.round)] } }));
const base = [
  `--imagem=${imagem}`, `--regioes=${regioes}`,
  `--escala=${lista(paraPx([0, 0]), paraPx([0, 60]))},60`,
  `--alinhar=${lista(paraPx([0, 0]), [0, 0], paraPx([100, 0]), [100, 0])}`,
  `--cortes=${c0.map((v) => v.toFixed(1))};${c1.map((v) => v.toFixed(1))};${c2.map((v) => v.toFixed(1))}`,
  '--trechos=fundo,topo,esquerda',
];

describe('a referência a partir de uma imagem sintética', () => {
  it('recupera a forma girada a menos de 1 pixel em mm e divide nos cortes pedidos', async () => {
    const saida = join(pasta, 'trechos.json');
    const r = await capturar([...base, `--saida=${saida}`, `--sobreposicao=${join(pasta, 'sobre.png')}`]);
    expect(r.err).toBe('');
    expect(r.codigo).toBe(0);
    const ref = JSON.parse(readFileSync(saida, 'utf8'));
    expect(ref.escala).toBe('mm');
    expect(ref.conferidoPelaPessoa).toBeNull();
    expect(ref.alinhamento).toEqual([[0, 0], [100, 0]]);
    expect(Object.keys(ref.trechos)).toEqual(['fundo', 'topo', 'esquerda']);
    for (const pts of Object.values(ref.trechos)) for (const p of pts) expect(distanciaAoL(p)).toBeLessThan(MM_POR_PX);
    const ponta = (nome, fim) => { const t = ref.trechos[nome]; return t[fim ? t.length - 1 : 0]; };
    expect(Math.hypot(...[ponta('fundo', false), [0, 0]].reduce((a, b) => a.map((v, i) => v - b[i])))).toBeLessThan(MM_POR_PX * 3);
    expect(Math.hypot(ponta('fundo', true)[0] - 100, ponta('fundo', true)[1] - 20)).toBeLessThan(MM_POR_PX * 3);
    expect(ponta('fundo', true)).toEqual(ponta('topo', false));
    expect(ponta('topo', true)).toEqual(ponta('esquerda', false));
    expect(ponta('esquerda', true)).toEqual(ponta('fundo', false));
    expect(PNG.sync.read(readFileSync(join(pasta, 'sobre.png'))).width).toBe(700);
  }, 60000);

  it('a referência gerada, medida contra a forma verdadeira, desvia menos de 1 pixel em mm', async () => {
    const saida = join(pasta, 'trechos2.json');
    await capturar([...base, `--saida=${saida}`]);
    const ref = lerReferencia(JSON.parse(readFileSync(saida, 'utf8')));
    const retangulo = (x0, z0, x1, z1) => [[[x0, z0], [x1, z0], [x1, z1]], [[x0, z0], [x1, z1], [x0, z1]]].flat().reduce((acc, _, i, a) => (i % 3 === 0 ? [...acc, { p: a.slice(i, i + 3).map(([x, z]) => [x, 0, z]), parte: 'l' }] : acc), []);
    const tris = [...retangulo(0, 0, 100, 20), ...retangulo(0, 0, 40, 60)];
    const { resultado } = medirSilhueta({ tris, referencia: ref, plano: 'xz', alinhamentoMax: 2 });
    for (const t of resultado) expect(t.maximoDoModuloMm).toBeLessThan(MM_POR_PX * 1.5);
  }, 60000);

  it('é determinística e grava --conferido', async () => {
    const a = join(pasta, 'a.json'); const b = join(pasta, 'b.json');
    await capturar([...base, `--saida=${a}`]);
    await capturar([...base, `--saida=${b}`, '--conferido=Ana, 2026-11-13']);
    const ja = JSON.parse(readFileSync(a, 'utf8')); const jb = JSON.parse(readFileSync(b, 'utf8'));
    expect(jb.conferidoPelaPessoa).toBe('Ana, 2026-11-13');
    expect(jb.trechos).toEqual(ja.trechos);
    expect(lerReferencia(ja).conferidoPelaPessoa).toBeNull();
    expect(lerReferencia(jb).conferidoPelaPessoa).toBe('Ana, 2026-11-13');
  }, 60000);
});

describe('as recusas dizem o recebido, o esperado e o conserto', () => {
  it('sem escala', async () => {
    const r = await capturar(base.filter((a) => !a.startsWith('--escala')).concat(`--saida=${join(pasta, 'x.json')}`));
    expect(r.codigo).toBe(2);
    expect(r.err).toMatch(/falta --escala \(recebi nada\).*Esperado: --escala=x1,y1,x2,y2,mm/);
  });
  it('sem os dois pontos de alinhamento', async () => {
    const r = await capturar(base.filter((a) => !a.startsWith('--alinhar')).concat(`--saida=${join(pasta, 'x.json')}`));
    expect(r.codigo).toBe(2);
    expect(r.err).toMatch(/faltam os dois pontos de alinhamento \(recebi nada\).*Esperado: --alinhar=/);
    expect(() => lerAlinhar('1,2,3,4')).toThrow(/recebeu "1,2,3,4".*Esperado: 8 números/);
  });
  it('escala que discorda dos pontos do modelo', () => {
    const escala = lerEscala('0,0,100,0,50');
    const alinhamento = lerAlinhar('0,0,0,0,100,0,100,0');
    expect(() => transformacao({ escala, alinhamento })).toThrow(/discordam.*100\.0 mm no modelo.*Esperado: a mesma distância/s);
  });
  it('corte longe do contorno, fora de ordem e com nomes a menos', () => {
    const anel = [[0, 0], [100, 0], [100, 100], [0, 100]];
    expect(() => dividirAnel(anel, [[0, 0], [500, 500]], ['a', 'b'])).toThrow(/corte 2 .*cai a .* px do contorno/);
    expect(() => dividirAnel(anel, [[0, 0], [100, 0]], ['a'])).toThrow(/1 nome\(s\) e --cortes traz 2 corte\(s\)/);
    expect(() => dividirAnel(anel, [[0, 0], [100, 100], [100, 0]], ['a', 'b', 'c'])).not.toThrow();
    expect(() => dividirAnel(anel, [[0, 0], [100, 0], [0, 0.5]], ['a', 'b', 'c'])).toThrow(ErroDeSilhueta);
    expect(() => lerCortes('1,2')).toThrow(/Esperado: dois ou mais pontos/);
  });
  it('responde a --ajuda', async () => {
    const r = await capturar(['--ajuda']);
    expect(r.codigo).toBe(0);
    expect(r.out).toContain('--escala=');
  });
});

describe('o alisamento do trecho, o limiar e os recortes de perto', () => {
  const onda = Array.from({ length: 201 }, (_, i) => [i, 0.3 * Math.sin(i * 1.7)]);

  it('troca a ondulação por uma curva suave, com as pontas fixas, e mede o desvio do bruto', () => {
    const r = alisarTrecho(onda, 4);
    expect(r.curva[0]).toEqual(onda[0]);
    expect(r.curva[r.curva.length - 1]).toEqual(onda[200]);
    expect(Math.max(...r.curva.slice(40, -40).map((p) => Math.abs(p[1])))).toBeLessThan(0.05);
    expect(r.desvioMaxMm).toBeGreaterThan(0.25);
    expect(r.desvioMaxMm).toBeLessThan(0.45);
    const reta = alisarTrecho(Array.from({ length: 101 }, (_, i) => [i, 2 * i]), 5);
    expect(reta.desvioMaxMm).toBeLessThan(1e-6);
  });

  it('lê --alisar e recusa o formato, o mm e o trecho que não existe', () => {
    expect(lerAlisar('gume:3,dorso:2', ['gume', 'dorso'])).toEqual([{ trecho: 'gume', sigmaMm: 3 }, { trecho: 'dorso', sigmaMm: 2 }]);
    expect(lerAlisar(null, ['a'])).toEqual([]);
    expect(() => lerAlisar('gume', ['gume'])).toThrow(/recebeu "gume".*Esperado: <trecho>:<mm>/);
    expect(() => lerAlisar('xis:3', ['gume'])).toThrow(/trecho 'xis', que não existe/);
  });

  it('grava em origem o alisamento e o limiar, recusa acima de --alisar-max e grava os recortes de perto', async () => {
    const saida = join(pasta, 'lisa.json');
    const r = await capturar([...base, '--limiar=100', '--alisar=fundo:1', '--alisar-max=3', `--saida=${saida}`, `--sobreposicao=${join(pasta, 'lisa.png')}`, '--sobreposicao-de-perto=fundo']);
    expect(r.err).toBe('');
    const ref = JSON.parse(readFileSync(saida, 'utf8'));
    expect(ref.origem.segmentacao.limiar).toBe(100);
    expect(ref.origem.segmentacao.limiarDe).toBe('--limiar');
    expect(ref.origem.alisados).toHaveLength(1);
    expect(ref.origem.alisados[0]).toMatchObject({ trecho: 'fundo', sigmaMm: 1 });
    expect(ref.origem.alisados[0].desvioMaxMm).toBeLessThanOrEqual(ref.origem.alisarMaxMm);
    const recorte = PNG.sync.read(readFileSync(join(pasta, 'lisa-de-perto-fundo-01.png')));
    expect(recorte.width).toBe(600);
    const recusa = await capturar([...base, '--alisar=esquerda:30', '--alisar-max=0.1', `--saida=${join(pasta, 'x.json')}`]);
    expect(recusa.codigo).toBe(2);
    expect(recusa.err).toMatch(/alisar 'esquerda' com 30 mm afasta a curva até .* mm.*limite é 0\.1 mm.*Esperado/);
    const semRegioes = await capturar([`--imagem=${imagem}`, '--contorno=nenhum.json', '--limiar=100', ...base.slice(2), `--saida=${join(pasta, 'x.json')}`]);
    expect(semRegioes.codigo).toBe(2);
  }, 60000);
});
