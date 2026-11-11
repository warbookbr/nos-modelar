/* sobra-entre-partes.test.mjs — a placa reta que passa do corpo em arco nos cantos sobra na vista de cima, com a distância conhecida; a
   placa encurtada para dentro do arco não sobra; de frente nenhuma das duas sobra. E as recusas e o código de saída do comando. */
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { dePng } from './leitura-por-regioes.mjs';
import { CORES_DA_SOBRA, desenharSobra, distanciaAoConjunto, executar, lerPares, sobraEntrePartes } from './sobra-entre-partes.mjs';

/* um prisma de altura y0..y1 sobre um polígono convexo da planta (x, z), com o índice da parte */
function prisma(planta, y0, y1, parte) {
  const faces = [
    { pts: planta.map(([x, z]) => [x, y1, z]), parte },
    { pts: [...planta].reverse().map(([x, z]) => [x, y0, z]), parte },
  ];
  planta.forEach(([x, z], i) => {
    const [x2, z2] = planta[(i + 1) % planta.length];
    faces.push({ pts: [[x, y0, z], [x2, y0, z2], [x2, y1, z2], [x, y1, z]], parte });
  });
  return faces;
}
/* o corpo: x de -200 a 200, z de -100 até o arco de raio 500 com centro em (0, -400), que vale 100 no meio e 58,3 nos lados */
const R = 500; const CZ = -400;
const arco = (x) => Math.sqrt(R * R - x * x) + CZ;
function corpo() {
  const planta = [[-200, -100], [200, -100]];
  for (let i = 0; i <= 96; i += 1) { const x = 200 - (400 * i) / 96; planta.push([x, arco(x)]); }
  return prisma(planta, 0, 50, 1);
}
const placa = (meia) => prisma([[-meia, 60], [meia, 60], [meia, 90], [-meia, 90]], 10, 40, 2);
/* o canto (200, 90) da placa longa está a |(200, 490)| - 500 = 29,25 mm do arco */
const DISTANCIA_DO_CANTO = Math.hypot(200, 90 - CZ) - R;

describe('sobra entre partes', () => {
  it('a transformada de distância dá a distância de centro a centro', () => {
    const m = new Uint8Array(7 * 5); m[2 * 7 + 1] = 1;
    const d = distanciaAoConjunto(m, 7, 5);
    expect(d[2 * 7 + 1]).toBe(0); expect(d[2 * 7 + 4]).toBe(9); expect(d[0]).toBe(5); expect(d[4 * 7 + 6]).toBe(29);
    expect(distanciaAoConjunto(new Uint8Array(4), 2, 2)[0]).toBe(Infinity);
  });

  it('a placa reta que passa do arco nos cantos sobra na vista de cima, e de frente não', () => {
    const faces = [...corpo(), ...placa(200)];
    const [cima, frente] = sobraEntrePartes(faces, ['capo', 'grade'], [['grade', 'capo']], { vistas: ['superior', 'frontal'], largura: 400 });
    expect(cima.mmPorPx).toBeCloseTo(1, 6);
    expect(Math.abs(cima.maxMm - DISTANCIA_DO_CANTO)).toBeLessThan(cima.mmPorPx);
    expect(cima.sobra).toBe(true);
    /* a área de sobra: o que a placa tem acima do arco, de x = -200 a 200, entre z = arco(x) e 90 */
    let area = 0; for (let x = -200; x < 200; x += 0.01) area += Math.max(0, 90 - Math.max(60, arco(x + 0.005))) * 0.01;
    expect(Math.abs(cima.areaMm2 - area) / area).toBeLessThan(0.1);
    expect(frente.pixels).toBe(0); expect(frente.maxMm).toBe(0); expect(frente.sobra).toBe(false);
    /* o desenho tem vermelho na sobra e cinza escuro na placa */
    const im = desenharSobra(cima);
    const cores = new Set(); for (let i = 0; i < im.dados.length; i += 3) cores.add([...im.dados.slice(i, i + 3)].join());
    expect(cores.has(CORES_DA_SOBRA.sobra.join())).toBe(true); expect(cores.has(CORES_DA_SOBRA.contida.join())).toBe(true);
  });

  it('a placa encurtada para dentro do arco não sobra em vista nenhuma', () => {
    const faces = [...corpo(), ...placa(90)];
    const r = sobraEntrePartes(faces, ['capo', 'grade'], [['grade', 'capo']], { vistas: ['superior', 'frontal'], largura: 400 });
    expect(r.map((x) => x.pixels)).toEqual([0, 0]);
    expect(r.some((x) => x.sobra)).toBe(false);
  });

  it('o quadro é o do modelo inteiro: a mesma placa mede o mesmo com ou sem outra parte que não entra no par', () => {
    const longe = prisma([[500, -100], [600, -100], [600, 0], [500, 0]], 0, 10, 3);
    const so = sobraEntrePartes([...corpo(), ...placa(200)], ['capo', 'grade'], [['grade', 'capo']], { vistas: ['superior'], largura: 400 })[0];
    const com = sobraEntrePartes([...corpo(), ...placa(200), ...longe], ['capo', 'grade', 'longe'], [['grade', 'capo']], { vistas: ['superior'], largura: 800 })[0];
    expect(com.mmPorPx).toBeCloseTo(1, 6);
    expect(Math.abs(com.maxMm - so.maxMm)).toBeLessThan(1);
  });

  it('a silhueta da continente é a real: a peça no furo de um anel sobra pela distância até a borda do furo, e de frente não', () => {
    /* o anel: coroa de raio 50 a 80 mm em y 0 a 20, em 48 setores de quadriláteros; o pino, de 30 por 30 mm no centro do furo */
    const anel = []; const n = 48;
    for (let k = 0; k < n; k += 1) {
      const a = (2 * Math.PI * k) / n; const b = (2 * Math.PI * (k + 1)) / n;
      const p = (r, t) => [r * Math.cos(t), r * Math.sin(t)];
      anel.push(...prisma([p(50, a), p(80, a), p(80, b), p(50, b)], 0, 20, 1));
    }
    const pino = prisma([[-15, -15], [15, -15], [15, 15], [-15, 15]], 0, 10, 2);
    const [cima, frente] = sobraEntrePartes([...anel, ...pino], ['anel', 'pino'], [['pino', 'anel']], { vistas: ['superior', 'frontal'], largura: 320 });
    expect(cima.sobra).toBe(true);
    /* o pino inteiro está no furo: a área é a dele, e o pixel mais longe do anel é o centro, a cerca de 50 mm (o polígono de 48 lados) */
    expect(Math.abs(cima.areaMm2 - 900) / 900).toBeLessThan(0.1);
    expect(Math.abs(cima.maxMm - 50 * Math.cos(Math.PI / n))).toBeLessThan(2 * cima.mmPorPx);
    expect(frente.pixels).toBe(0);
  });

  it('o par com vistas próprias só é medido nelas, e o sem, nas vistas gerais', () => {
    const faces = [...corpo(), ...placa(200)];
    const r = sobraEntrePartes(faces, ['capo', 'grade'], [{ par: 'grade:capo', vistas: ['frontal'] }, ['grade', 'capo'], 'grade:capo@direita'], { vistas: ['superior'], largura: 400 });
    expect(r.map((x) => `${x.vista}:${x.contida}:${x.continente}`)).toEqual(['superior:grade:capo', 'frontal:grade:capo', 'direita:grade:capo']);
    expect(r.map((x) => x.sobra)).toEqual([true, false, false]);
    /* só com vistas próprias, a vista geral não entra */
    expect(sobraEntrePartes(faces, ['capo', 'grade'], [{ contida: 'grade', continente: 'capo', vistas: ['frontal'] }], { vistas: ['superior'], largura: 400 }).map((x) => x.vista)).toEqual(['frontal']);
  });

  it('recusa nome de parte, vista e par ruins', () => {
    const faces = [...corpo(), ...placa(200)];
    expect(() => sobraEntrePartes(faces, ['capo', 'grade'], [['moldura', 'capo']])).toThrow('a parte "moldura" não existe na opção (capo, grade)');
    expect(() => sobraEntrePartes(faces, ['capo', 'grade'], [['grade', 'capo']], { vistas: ['de-lado'] })).toThrow('não existe na bancada');
    expect(lerPares('grade:capo, fundo:capo@superior+direita')).toEqual([{ contida: 'grade', continente: 'capo', vistas: null }, { contida: 'fundo', continente: 'capo', vistas: ['superior', 'direita'] }]);
    expect(() => lerPares('grade:capo@')).toThrow('contida:continente');
    expect(() => sobraEntrePartes(faces, ['capo', 'grade'], [{ par: 'grade:capo', vistas: ['de-lado'] }])).toThrow('vista "de-lado" não existe na bancada');
    expect(() => sobraEntrePartes(faces, ['capo', 'grade'], [{ par: 'grade:capo', vistas: 'superior' }])).toThrow('espera vistas numa lista');
    expect(() => lerPares('grade')).toThrow('contida:continente');
    expect(() => lerPares('capo:capo')).toThrow('dentro dela mesma');
    expect(() => lerPares(null)).toThrow('contida:continente');
  });

  it('o comando sai 1 com sobra, 0 sem e 2 em argumento ruim, e grava o desenho', async () => {
    const pasta = mkdtempSync(join(tmpdir(), 'sobra-'));
    const esboco = join(pasta, 'bloco.esboco.json');
    writeFileSync(esboco, JSON.stringify({ opcoes: [{ titulo: 'bloco', formas: [
      { id: 'base', op: 'cubo', args: { larg: 100, alt: 60, prof: 40 } }, { id: 'topo', op: 'cubo', args: { larg: 120, alt: 30, prof: 40 }, sobre: 'base' }] }] }));
    const sobra = await executar([esboco, '--dentro=topo:base', '--vistas=superior', '--largura=240', `--saida=${pasta}`]);
    expect(sobra.stderr).toBe('');
    expect(sobra.codigo).toBe(1);
    expect(sobra.stdout).toMatch(/^superior: topo em base, sobra máxima 10\.\d mm, área 800 mm² \(0\.50 mm por px\): sobra/);
    const png = join(pasta, 'superior-topo-em-base.png');
    expect(existsSync(png)).toBe(true);
    expect(dePng(readFileSync(png)).largura).toBe(240);
    const dentro = await executar([esboco, '--dentro=base:topo', '--vistas=superior', '--largura=240']);
    expect(dentro.codigo).toBe(0); expect(dentro.stdout).toContain(': dentro');
    /* o par com vista própria no texto: de frente o topo mais largo também sobra, e só a frontal é medida */
    const propria = await executar([esboco, '--dentro=topo:base@frontal', '--vistas=superior', '--largura=240']);
    expect(propria.stdout).toMatch(/^frontal: topo em base/); expect(propria.stdout).not.toContain('superior:');
    /* a tolerância é de quem conduz: com 11 mm a sobra de 10 mm passa */
    expect((await executar([esboco, '--dentro=topo:base', '--vistas=superior', '--tolerancia-mm=11'])).codigo).toBe(0);
    const nome = await executar([esboco, '--dentro=topo:capo']);
    expect(nome.codigo).toBe(2); expect(nome.stderr).toContain('a parte "capo" não existe na opção (base, topo)');
    expect((await executar([esboco])).codigo).toBe(2);
    expect((await executar([esboco, '--dentro=topo:base', '--vistas=de-lado'])).codigo).toBe(2);
    expect((await executar([esboco, '--dentro=topo:base', '--tolerancia-mm=x'])).codigo).toBe(2);
    expect((await executar([esboco, '--dentro=topo:base', '--opcao=2'])).codigo).toBe(2);
    expect((await executar([join(pasta, 'nao-tem.esboco.json'), '--dentro=topo:base'])).codigo).toBe(2);
    expect((await executar(['--ajuda'])).stdout).toContain('npm run sobra:partes');
  });
});
