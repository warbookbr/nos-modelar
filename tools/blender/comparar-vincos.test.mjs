/* comparar-vincos.test.mjs — comparar-vincos mede os vincos da candidata contra as linhas de feição lidas do pacote cego,
   por vista, no total e em 3D. A prova roda sem Blender: o pacote é o do prisma de prova desenhado pelo imagens.py
   (pacote-de-prova.mjs), e o vincos.json da candidata, que o olhar-candidata.py gravaria, sai aqui dos vincos exatos do prisma,
   cada um nas vistas que o veem. A forma contra o próprio pacote dá cobertura e precisão acima de 0,9; sem os vincos do
   chanfro, a perda aparece no lado, no topo e em 3D, e não na frente; com eles 5 mm acima, o desvio de 5 mm aparece no lado e
   em 3D. Só precisa de python3 com Pillow e numpy, e se ignora sem eles; leva perto de 10 s e fica na lista dos lentos. A
   mesma prova com a candidata renderizada pelo Blender está em leitura-blender.test.mjs. */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CAIXA, visivel, vincos } from './prisma-de-prova.mjs';
import { amostrar, montarPacote, py, temPillow } from './pacote-de-prova.mjs';
import { doAmbiente } from '../ambiente.mjs';

const AQUI = fileURLToPath(new URL('.', import.meta.url));

describe.skipIf(!temPillow)('comparar-vincos sobre o pacote desenhado por código', () => {
  let dir;
  const p = (...n) => join(dir, ...n);
  let cams;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'comparar-vincos-'));
    cams = montarPacote(dir);
  }, 120000);
  // MODELAR_BLENDER_GUARDAR=1 guarda a pasta com o pacote e as comparações para olhar depois
  afterAll(() => {
    if (!dir) return;
    if (doAmbiente('BLENDER_GUARDAR')) console.log(`saídas em ${dir}`);
    else rmSync(dir, { recursive: true, force: true });
  });

  it('dá a forma contra o próprio pacote acima de 0,9 e acusa o vinco ausente e o deslocado na vista certa', () => {
    // o vincos.json que o olhar-candidata.py grava, feito aqui dos vincos exatos: cada vinco visível em cada vista, e os
    // visíveis em alguma; a variante tira ou sobe 5 mm os dois vincos longitudinais do chanfro, em (±350, 180) mm
    const chanfro = (a) => a.pontos[0][2] === CAIXA[4] && Math.abs(Math.abs(a.pontos[0][0]) - 0.35) < 1e-9 && Math.abs(a.pontos[0][1] - 0.18) < 1e-9;
    const json = (lista) => ({ angulo_feicao: 25, passo_m: 0.002, segmentos: { feicao: lista.length },
      vistas: Object.fromEntries(Object.entries(cams).map(([n, c]) => [n, lista.filter((a) => visivel(a, c.direcao))
        .map((a) => ({ tipo: 'feicao', pontos_m: amostrar(a.pontos) }))])),
      qualquer_vista: lista.filter((a) => Object.values(cams).some((c) => visivel(a, c.direcao))).map((a) => ({ tipo: 'feicao', pontos_m: amostrar(a.pontos) })) });
    const todos = vincos();
    expect(todos.filter(chanfro).length).toBe(2);
    writeFileSync(p('vin-igual.json'), JSON.stringify(json(todos)));
    writeFileSync(p('vin-sem.json'), JSON.stringify(json(todos.filter((a) => !chanfro(a)))));
    writeFileSync(p('vin-desl.json'), JSON.stringify(json(todos.map((a) => (chanfro(a) ? { ...a, pontos: a.pontos.map(([x, y, z]) => [x, y + 0.005, z]) } : a)))));
    const comparar = (arq, saida) => {
      py('comparar-vincos.py', ['--pacote', p('pacote'), '--vincos-candidata', p(arq), '--saida', p(saida)]);
      return JSON.parse(readFileSync(p(saida, 'comparacao-vincos.json'), 'utf8'));
    };
    const igual = comparar('vin-igual.json', 'vin-igual');
    for (const [n, m] of [...Object.entries(igual.vistas), ['total', igual.total]]) {
      for (const k of ['cobertura_2mm', 'precisao_2mm', 'cobertura_5mm', 'precisao_5mm']) expect(m[k], `${n} ${k}`).toBeGreaterThan(0.9);
      expect(m.desvio_mediana_mm, n).toBeLessThan(1);
    }
    // em 3D a curva lida casa duas vistas, com a tolerância de leitura de 3 mm, e a medida vale a 5 mm
    expect(igual['3d'].tolerancia_leitura_mm).toBeLessThanOrEqual(3);
    for (const k of ['cobertura_5mm', 'precisao_5mm']) expect(igual['3d'][k], k).toBeGreaterThan(0.9);
    expect(igual['3d'].desvio_mediana_mm).toBeLessThan(1);
    for (const n of Object.keys(cams)) {
      expect(existsSync(p('vin-igual', `${n}-vincos.png`)), n).toBe(true);
      expect(igual.vistas[n].erro_leitura_mm, n).toBeGreaterThan(0);
    }
    // a mesma entrada dá a mesma saída
    comparar('vin-igual.json', 'vin-igual-2');
    expect(readFileSync(p('vin-igual-2', 'comparacao-vincos.json'), 'utf8')).toBe(readFileSync(p('vin-igual', 'comparacao-vincos.json'), 'utf8'));

    // sem o vinco do chanfro: a perda aparece no lado, no topo e em 3D, e a frente, onde ele é um ponto, não muda
    const sem = comparar('vin-sem.json', 'vin-sem');
    for (const n of ['lado', 'topo', '3d']) {
      const m = n === '3d' ? sem['3d'] : sem.vistas[n];
      expect(m.cobertura_5mm, n).toBeLessThan(0.85);
      expect(m.precisao_5mm, n).toBeGreaterThan(0.95);
    }
    expect(sem.vistas.frente.cobertura_5mm).toBeGreaterThan(0.95);
    // deslocado 5 mm em y: o desvio aparece no lado e em 3D; no topo, que mostra x e z, o vinco não se move
    const desl = comparar('vin-desl.json', 'vin-desl');
    for (const m of [desl.vistas.lado, desl['3d']]) {
      expect(m.cobertura_2mm).toBeLessThan(0.85);
      expect(m.desvio_p90_mm).toBeGreaterThan(4);
      expect(m.desvio_p90_mm).toBeLessThan(6.5);
    }
    for (const n of ['topo', 'frente']) expect(desl.vistas[n].cobertura_2mm, n).toBeGreaterThan(0.95);

    // o erro de entrada sai com a mensagem e o código 2, como em comparar-cortes
    for (const [args, msg] of [[[], 'falta --candidata'], [['--vincos-candidata', p('nao-existe.json')], 'não existe']]) {
      const r = spawnSync('python3', ['-I', join(AQUI, 'comparar-vincos.py'), '--pacote', p('pacote'), '--saida', p('vin-erro'), ...args], { encoding: 'utf8' });
      expect(r.status, msg).toBe(2);
      expect(r.stderr, msg).toContain(msg);
    }
  });
});
