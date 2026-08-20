#!/usr/bin/env node
/* forma-nao-automotiva.mjs — a segunda metade da prova P2: a mesma cage e a
   mesma subdivisão sobre um objeto que não é carro. Se a representação
   carregasse vocabulário automotivo, isto não fecharia.

   Alvo: um invólucro de eletrodoméstico com abertura de ventilação — canto vivo
   embaixo, topo abaulado, e um rasgo real com retorno de borda. */

import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validarCage, imprimirMedidas, fita } from './cage.mjs';
import { subdividir } from './subdividir.mjs';
import { desenhar } from './render.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const chave = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

export function construirInvolucro({ larg = 300, alt = 220, prof = 240, retorno = 10 } = {}) {
  const V = new Map();
  const F = new Map();
  const vincos = new Map();
  const grade = [];
  let n = 0;

  const COLUNAS = 10;   // volta do perímetro
  const LINHAS = 7;     // da base ao topo
  for (let i = 0; i < LINHAS; i += 1) {
    const t = i / (LINHAS - 1);
    /* Topo abaulado, base reta: superelipse cujo expoente cai com a altura. */
    const e = 2 + 6 * (1 - t);
    const encolhe = 1 - 0.18 * t * t;
    const linha = [];
    for (let j = 0; j < COLUNAS; j += 1) {
      const a = (j / COLUNAS) * Math.PI * 2;
      const cx = Math.sign(Math.cos(a)) * Math.abs(Math.cos(a)) ** (2 / e);
      const cz = Math.sign(Math.sin(a)) * Math.abs(Math.sin(a)) ** (2 / e);
      V.set(n, [cx * (larg / 2) * encolhe, t * alt, cz * (prof / 2) * encolhe]);
      linha.push(n);
      n += 1;
    }
    grade.push(linha);
  }

  /* Rasgo de ventilação: duas células de uma face lateral saem. */
  const rasgo = new Set(['3,4', '3,5', '4,4', '4,5']);
  let f = 0;
  const removidas = [];
  for (let i = 0; i < LINHAS - 1; i += 1) {
    for (let j = 0; j < COLUNAS; j += 1) {
      if (rasgo.has(`${i},${j}`)) { removidas.push([i, j]); continue; }
      const k = (j + 1) % COLUNAS;
      F.set(f, { id: f, vs: [grade[i][j], grade[i][k], grade[i + 1][k], grade[i + 1][j]], parte: i < 2 ? 'base' : 'capa' });
      f += 1;
    }
  }

  /* Retorno de borda do rasgo, pela mesma regra do arco de roda. */
  const conta = new Map();
  for (const face of F.values()) {
    for (let i = 0; i < 4; i += 1) conta.set(chave(face.vs[i], face.vs[(i + 1) % 4]), (conta.get(chave(face.vs[i], face.vs[(i + 1) % 4])) ?? 0) + 1);
  }
  const naMoldura = new Set();
  for (let j = 0; j < COLUNAS; j += 1) {
    naMoldura.add(chave(grade[0][j], grade[0][(j + 1) % COLUNAS]));
    naMoldura.add(chave(grade[LINHAS - 1][j], grade[LINHAS - 1][(j + 1) % COLUNAS]));
  }
  const borda = [...conta.entries()].filter(([k, c]) => c === 1 && !naMoldura.has(k)).map(([k]) => k.split('|').map(Number)).sort((a, b) => a[0] - b[0]);
  const dentro = new Map();
  for (const v of [...new Set(borda.flat())].sort((a, b) => a - b)) {
    const p = V.get(v);
    const r = Math.hypot(p[0], p[2]) || 1;
    V.set(n, [p[0] - (p[0] / r) * retorno, p[1], p[2] - (p[2] / r) * retorno]);
    dentro.set(v, n);
    n += 1;
  }
  /* Fita orientada contra a pele, pelo utilitário neutro. Escrever
     `[a, b, dentro(b), dentro(a)]` direto entra com a normal invertida quando a
     pele percorre a aresta nesse mesmo sentido, e nada reclamava antes de o
     validador ganhar a regra de orientação. */
  {
    const r = fita(F, borda, dentro, 'rasgoRetorno', f);
    for (const face of r.feitas) F.set(face.id, face);
    f = r.idF;
  }
  for (const [a, b] of borda) vincos.set(chave(a, b), 2);

  /* Base reta e viva; aresta de encontro com o piso não deve arredondar. */
  for (let j = 0; j < COLUNAS; j += 1) vincos.set(chave(grade[0][j], grade[0][(j + 1) % COLUNAS]), 3);

  return {
    formato: 'mecanifica.cage-quad@1',
    V, F, vincos,
    loops: { aroDaBase: { v: grade[0], fechado: true }, bordaDoRasgo: { v: [...new Set(borda.flat())].sort((a, b) => a - b), fechado: false } },
    removidas: removidas.length,
  };
}

if (process.argv[1] && process.argv[1].endsWith('forma-nao-automotiva.mjs')) {
  const c = construirInvolucro();
  const { problemas, medidas } = validarCage({ ...c, loops: { aroDaBase: c.loops.aroDaBase } });
  console.log('INVOLUCRO — a mesma cage e a mesma subdivisão, sem nada de carro');
  console.log(imprimirMedidas(medidas));
  console.log(problemas.length ? `  ALERTA ${problemas.length}: ${problemas.map((p) => p.texto).join('; ')}` : '  sem problemas');
  const m = subdividir(c, 2);
  console.log(`  nível 2: ${m.F.size} faces, ${m.V.size} vértices`);
  const dir = path.join(AQUI, 'evidencias');
  mkdirSync(dir, { recursive: true });
  for (const camera of ['isometrica', 'lateral']) {
    writeFileSync(path.join(dir, `involucro-${camera}.svg`), `${desenhar(m, { camera })}\n`);
  }
  console.log(`  evidência em ${path.relative(process.cwd(), dir)}/involucro-*.svg`);
}
