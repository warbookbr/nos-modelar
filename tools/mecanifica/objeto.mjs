#!/usr/bin/env node
/* objeto.mjs — em que etapa do fluxo um objeto está, e o que vem a seguir.
 *
 * O fluxo tem cinco etapas, na ordem em que o objeto é produzido: alinhamento,
 * separação das partes, prancha, modelagem por etapa e aceite. Cada uma deixa
 * arquivo na pasta do objeto, e esta ferramenta lê o estado do disco, como
 * `rodada-de-modelagem --acao` faz para uma peça. O contrato está em
 * `docs/mecanifica/usar/FLUXO-DO-OBJETO.md`.
 *
 * Também lista o pacote de referência que o modelador e o crítico recebem,
 * nesta ordem: a imagem de referência, a prancha limpa e a sobreposição a 20%
 * com as folhas de divisa.
 *
 * USO
 *   npm run objeto -- <objeto>          por exemplo braco-robotico */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { proximaAcao } from '../../modulos/contorno-da-imagem/src/index.js';
import { lerRodadas } from './rodadas-com-critico.mjs';

const REPO = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const ACERVO = join(REPO, 'procedural/pecas');

/* O estado de uma conversa com crítico, na moeda do fluxo. */
function estadoDasRodadas(pasta) {
  const d = proximaAcao(lerRodadas(pasta));
  return { fechou: 'feito', desenhar: 'em andamento', humano: 'decisão da pessoa' }[d.acao] ?? d.acao;
}

export function estadoDoObjeto(objeto, { acervo = ACERVO } = {}) {
  const pasta = join(acervo, objeto);
  if (!existsSync(pasta)) throw new Error(`o objeto '${objeto}' não existe em ${relative(REPO, acervo) || acervo}.`);
  const refs = join(pasta, 'referencias');
  const etapas = [];
  const rel = (p) => relative(REPO, p);

  const alinhado = existsSync(join(pasta, 'ALINHAMENTO.md')) && existsSync(join(pasta, 'montagem.json'));
  etapas.push({ etapa: 'alinhamento', estado: alinhado ? 'feito' : 'a fazer', como: 'skill alinhar-modelagem' });

  const imagens = existsSync(refs) ? readdirSync(refs).filter((n) => n.endsWith('.regioes.json')).sort().map((n) => n.replace(/\.regioes\.json$/, '')) : [];
  const pacotes = [];
  if (!imagens.length) {
    etapas.push({ etapa: 'separação', estado: 'a fazer', como: 'skill contorno-da-imagem' });
    etapas.push({ etapa: 'prancha', estado: 'a fazer', como: 'skill prancha-dos-contornos' });
  }
  for (const img of imagens) {
    const base = join(refs, img);
    const separacao = estadoDasRodadas(`${base}.regioes.rodadas`);
    etapas.push({ etapa: `separação de ${img}`, estado: separacao, como: 'skill contorno-da-imagem' });
    const temPrancha = existsSync(`${base}.prancha.png`);
    const prancha = separacao !== 'feito' ? 'espera a separação' : (temPrancha ? estadoDasRodadas(`${base}.prancha.rodadas`) : 'a fazer');
    etapas.push({ etapa: `prancha de ${img}`, estado: prancha, como: 'skill prancha-dos-contornos' });
    const pacote = join(refs, `${img}.pacote`);
    const folhas = existsSync(pacote) ? readdirSync(pacote).filter((n) => /^divisas-\d+\.png$/.test(n)).sort().map((n) => rel(join(pacote, n))) : [];
    pacotes.push({
      imagem: rel(`${base}.png`),
      prancha: temPrancha ? rel(`${base}.prancha.png`) : null,
      sobreposicao: existsSync(join(pacote, 'sobreposicao.png')) ? rel(join(pacote, 'sobreposicao.png')) : null,
      divisas: folhas,
      pronto: separacao === 'feito' && prancha === 'feito',
    });
  }

  const arquivoEtapas = join(pasta, 'montagem.etapas.json');
  const registro = existsSync(arquivoEtapas) ? JSON.parse(readFileSync(arquivoEtapas, 'utf8')) : null;
  const montagem = existsSync(join(pasta, 'montagem.json')) ? JSON.parse(readFileSync(join(pasta, 'montagem.json'), 'utf8')) : null;
  const ordem = montagem?.etapas ?? [];
  const fixas = new Set((registro?.etapas ?? []).filter((e) => e.estado === 'fixa').map((e) => e.instancia));
  const quebradas = (registro?.etapas ?? []).filter((e) => e.estado === 'quebrada').map((e) => e.instancia);
  const proximaParte = quebradas[0] ?? ordem.find((i) => !fixas.has(i));
  etapas.push({
    etapa: 'modelagem por etapa',
    /* A ferramenta só conhece as etapas que a montagem declara; parte que o
       alinhamento lista e a montagem ainda não tem não aparece aqui. */
    estado: !ordem.length ? 'a fazer' : (proximaParte ? `${fixas.size} de ${ordem.length} fixas; próxima ${proximaParte}` : `feito nas ${ordem.length} etapas que a montagem declara`),
    como: 'skill laco-de-modelagem',
  });
  etapas.push({ etapa: 'aceite', estado: 'a cada etapa', como: 'npm run etapas -- --fixar' });

  const pendente = etapas.find((e) => !e.estado.startsWith('feito') && e.estado !== 'a cada etapa');
  return { objeto, etapas, proxima: pendente ?? null, pacotes };
}

function imprimir({ objeto, etapas, proxima, pacotes }) {
  const linhas = [`objeto ${objeto}`, ''];
  for (const e of etapas) linhas.push(`  ${e.etapa.padEnd(34)} ${e.estado}`);
  linhas.push('', proxima ? `próxima: ${proxima.etapa} (${proxima.como})` : 'próxima: nada; o objeto está completo.');
  for (const p of pacotes) {
    linhas.push('', `pacote de referência${p.pronto ? '' : ' (incompleto)'}:`, `  1. ${p.imagem}`, `  2. ${p.prancha ?? '(prancha ainda não feita)'}`, `  3. ${p.sobreposicao ?? '(sobreposição ainda não feita)'}`);
    for (const f of p.divisas) linhas.push(`     ${f}`);
  }
  return `${linhas.join('\n')}\n`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const objeto = process.argv[2];
  if (!objeto) { process.stderr.write('uso: npm run objeto -- <objeto>\n'); process.exitCode = 2; }
  else {
    try { process.stdout.write(imprimir(estadoDoObjeto(objeto))); } catch (erro) { process.stderr.write(`objeto: ${erro.message}\n`); process.exitCode = 1; }
  }
}
