#!/usr/bin/env node
/**
 * conferir-juntas.mjs — ferramenta de medição e diagnóstico de interfaces de contato
 * entre componentes de uma peça procedural.
 *
 * Mede com precisão euclidiana:
 * 1. Vão de contato real entre faces opostas (detectando frestas);
 * 2. Paralelismo angular das normais (detectando cortes inclinados e cunhas);
 * 3. Coplanaridade e selagem das interfaces de marcenaria e mecânica.
 */
import { readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lerArgumentos } from './argumentos.mjs';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { importarReceita, receitaDoModulo } from './importar-receita.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const PECAS = join(REPO, 'prototipos/procedural/v3/pecas');

function calcularNormal(vs, V) {
  if (vs.length < 3) return [0, 1, 0];
  const p0 = V.get(vs[0]);
  const p1 = V.get(vs[1]);
  const p2 = V.get(vs[2]);
  if (!p0 || !p1 || !p2) return [0, 1, 0];
  const ax = p1[0] - p0[0], ay = p1[1] - p0[1], az = p1[2] - p0[2];
  const bx = p2[0] - p0[0], by = p2[1] - p0[1], bz = p2[2] - p0[2];
  const nx = ay * bz - az * by;
  const ny = az * bx - ax * bz;
  const nz = ax * by - ay * bx;
  const len = Math.hypot(nx, ny, nz);
  return len > 1e-9 ? [nx / len, ny / len, nz / len] : [0, 1, 0];
}

function calcularCentro(vs, V) {
  let sx = 0, sy = 0, sz = 0;
  let count = 0;
  for (const vid of vs) {
    const p = V.get(vid);
    if (p) {
      sx += p[0]; sy += p[1]; sz += p[2];
      count++;
    }
  }
  return count > 0 ? [sx / count, sy / count, sz / count] : [0, 0, 0];
}

export function analisarJuntas(neutro, { filtroEntre = null } = {}) {
  const V = neutro.V;
  const F = neutro.F;

  const facesPorParte = new Map();
  for (const face of F.values()) {
    if (!face.parte) continue;
    if (!facesPorParte.has(face.parte)) facesPorParte.set(face.parte, []);
    facesPorParte.get(face.parte).push(face);
  }

  const nomesPartes = [...facesPorParte.keys()].sort();
  const relatorio = [];

  for (let i = 0; i < nomesPartes.length; i++) {
    for (let j = i + 1; j < nomesPartes.length; j++) {
      const parteA = nomesPartes[i];
      const parteB = nomesPartes[j];

      if (filtroEntre && filtroEntre.length === 2) {
        const parBuscado = [filtroEntre[0], filtroEntre[1]].sort();
        const parAtual = [parteA, parteB].sort();
        if (parAtual[0] !== parBuscado[0] || parAtual[1] !== parBuscado[1]) continue;
      }

      const facesA = facesPorParte.get(parteA);
      const facesB = facesPorParte.get(parteB);

      let melhorEncontro = null;
      let menorDist = Infinity;

      for (const fa of facesA) {
        const na = calcularNormal(fa.vs, V);
        const ca = calcularCentro(fa.vs, V);

        for (const fb of facesB) {
          const nb = calcularNormal(fb.vs, V);
          const cb = calcularCentro(fb.vs, V);

          const dist = Math.hypot(ca[0] - cb[0], ca[1] - cb[1], ca[2] - cb[2]);
          const dot = na[0] * nb[0] + na[1] * nb[1] + na[2] * nb[2];

          // Duas faces formam interface se estão próximas (< 45 mm) e com normais em oposição (dot < -0.3)
          if (dist < 0.045 && dot < -0.3) {
            if (dist < menorDist) {
              menorDist = dist;
              const anguloOposicao = Math.acos(Math.max(-1, Math.min(1, -dot))) * (180 / Math.PI);
              const vaoNormal = Math.abs((cb[0] - ca[0]) * na[0] + (cb[1] - ca[1]) * na[1] + (cb[2] - ca[2]) * na[2]);

              melhorEncontro = {
                parteA,
                parteB,
                faceA: fa.id,
                faceB: fb.id,
                dist,
                vaoMm: vaoNormal * 1000,
                anguloDesvioGraus: anguloOposicao,
              };
            }
          }
        }
      }

      if (melhorEncontro) {
        let status = '✓ SELADA (FLUSH)';
        if (melhorEncontro.anguloDesvioGraus > 8.0) {
          status = '⚠ CUNHA / DESALINHADA';
        } else if (melhorEncontro.vaoMm > 1.5) {
          status = '⚠ FRESTA VISÍVEL';
        }
        relatorio.push({ ...melhorEncontro, status });
      }
    }
  }

  return relatorio;
}

export async function conferirJuntasCli(args = process.argv.slice(2)) {
  let lido;
  try {
    lido = lerArgumentos(args, {
      opcoes: ['entre'],
      bandeiras: ['estrito'],
      posicional: { nome: 'a peça', obrigatorio: true },
    });
  } catch (erro) {
    console.error(`conferir-juntas: ${erro.message}`);
    return 2;
  }

  const alvo = lido.posicional;
  let caminho = alvo.endsWith('.js') || alvo.includes('/') || alvo.includes('\\')
    ? resolve(process.cwd(), alvo)
    : join(PECAS, `${alvo}.js`);

  const mod = await importarReceita(caminho);
  const receita = receitaDoModulo(mod);
  const { neutro } = executarReceita(receita);

  let filtroEntre = null;
  const optEntre = lido.opcao('entre');
  if (optEntre) {
    filtroEntre = optEntre.split(',').map((s) => s.trim());
  }

  const juntas = analisarJuntas(neutro, { filtroEntre });

  console.log(`\n═══ CONFERÊNCIA DE JUNTAS — ${alvo} ═══\n`);
  if (juntas.length === 0) {
    console.log('Nenhuma interface de contato direto encontrada para o filtro especificado.');
    return 0;
  }

  console.log(
    'Junta'.padEnd(38) +
    'Vão (mm)'.padEnd(14) +
    'Desvio Ang.'.padEnd(16) +
    'Status'
  );
  console.log('─'.repeat(80));

  let temProblema = false;
  for (const j of juntas) {
    const nomeJunta = `${j.parteA} ↔ ${j.parteB}`;
    const vaoStr = `${j.vaoMm.toFixed(2)} mm`;
    const angStr = `${j.anguloDesvioGraus.toFixed(1)}°`;
    if (j.status.startsWith('⚠')) temProblema = true;

    console.log(
      nomeJunta.padEnd(38) +
      vaoStr.padEnd(14) +
      angStr.padEnd(16) +
      j.status
    );
  }

  console.log('');
  if (temProblema && lido.bandeira('estrito')) {
    console.error('Falha em --estrito: foram encontradas juntas com fresta ou desvio angular.');
    return 1;
  }

  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  conferirJuntasCli().then((code) => {
    if (code !== 0) process.exit(code);
  }).catch((err) => {
    console.error('Erro na conferência de juntas:', err);
    process.exit(1);
  });
}
