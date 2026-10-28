#!/usr/bin/env node
/* objeto.mjs — em que etapa do fluxo um objeto está, e o que vem a seguir.
 *
 * O fluxo tem cinco etapas, na ordem em que o objeto é produzido: alinhamento,
 * mapear as partes, prancha, modelagem por etapa e aceite. Cada uma deixa
 * arquivo na pasta do objeto, e esta ferramenta lê o estado do disco, como
 * `rodada-de-modelagem --acao` faz para uma peça. O contrato está em
 * `docs/modelar/usar/FLUXO-DO-OBJETO.md`.
 *
 * Também lista o pacote de referência que o modelador e o crítico recebem,
 * nesta ordem: a imagem de referência, a prancha limpa e o mapa de partes
 * com as folhas de divisa.
 *
 * O papel de cada imagem vem de `referencias/papeis.json`, quando existe:
 * `principal` passa por mapa e prancha, `apoio` só pelo mapa (dá medidas à
 * prancha principal por `origem`) e `substituida` fica fora das etapas, com
 * `por` e `motivo`. Imagem que o arquivo não cita, ou pasta sem o arquivo,
 * segue como principal.
 *
 * As referências moram em `referencias/` na pasta do objeto. O objeto que já
 * tem as referências noutra pasta do repositório (as do avião ficaram no banco
 * de provas, citadas pelos registros das rodadas dele) as aponta em
 * `referencias.json`, `{ "pasta": "<caminho relativo à pasta do objeto>",
 * "motivo": "..." }`, em vez de copiá-las.
 *
 * USO
 *   npm run objeto -- <objeto>          por exemplo braco-robotico */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { acaoDaPasta } from './rodadas-com-critico.mjs';

const REPO = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const ACERVO = join(REPO, 'procedural/pecas');

/* O estado de uma conversa com crítico, na moeda do fluxo. */
function estadoDasRodadas(pasta) {
  const d = acaoDaPasta(pasta);
  return { fechou: 'feito', desenhar: 'em andamento', humano: 'decisão da pessoa' }[d.acao] ?? d.acao;
}

const PAPEIS = ['principal', 'apoio', 'substituida'];

/* Lê e valida `referencias/papeis.json`; sem o arquivo, devolve vazio. */
export function papeisDasReferencias(refs) {
  const arquivo = join(refs, 'papeis.json');
  if (!existsSync(arquivo)) return {};
  const imagens = JSON.parse(readFileSync(arquivo, 'utf8')).imagens ?? {};
  for (const [img, p] of Object.entries(imagens)) {
    if (!PAPEIS.includes(p.papel)) throw new Error(`papeis.json: a imagem '${img}' tem papel '${p.papel}', e o papel é ${PAPEIS.join(', ')}.`);
    if (p.papel !== 'principal' && !p.motivo) throw new Error(`papeis.json: a imagem '${img}' é ${p.papel} e precisa de motivo.`);
    if (p.papel === 'substituida' && !p.por) throw new Error(`papeis.json: a imagem '${img}' é substituida e precisa dizer por qual imagem.`);
  }
  return imagens;
}

/* A pasta das referências do objeto: `referencias/`, ou a que `referencias.json` aponta, relativa à pasta do objeto. */
export function pastaDasReferencias(pasta) {
  const arquivo = join(pasta, 'referencias.json');
  if (!existsSync(arquivo)) return join(pasta, 'referencias');
  const { pasta: apontada, motivo } = JSON.parse(readFileSync(arquivo, 'utf8'));
  if (typeof apontada !== 'string' || !apontada || isAbsolute(apontada)) throw new Error('referencias.json: "pasta" deve ser um caminho relativo à pasta do objeto.');
  if (typeof motivo !== 'string' || !motivo) throw new Error('referencias.json: diga em "motivo" por que as referências moram fora da pasta do objeto.');
  if (existsSync(join(pasta, 'referencias'))) throw new Error('referencias.json aponta outra pasta, e o objeto também tem referencias/; fique com uma das duas.');
  const destino = resolve(pasta, apontada);
  if (!existsSync(destino) || !statSync(destino).isDirectory()) throw new Error(`referencias.json: a pasta ${apontada} não existe.`);
  return destino;
}

export function estadoDoObjeto(objeto, { acervo = ACERVO } = {}) {
  const pasta = join(acervo, objeto);
  if (!existsSync(pasta)) throw new Error(`o objeto '${objeto}' não existe em ${relative(REPO, acervo) || acervo}.`);
  const refs = pastaDasReferencias(pasta);
  const etapas = [];
  const rel = (p) => relative(REPO, p);

  const alinhado = existsSync(join(pasta, 'ALINHAMENTO.md')) && existsSync(join(pasta, 'montagem.json'));
  etapas.push({ etapa: 'alinhamento', estado: alinhado ? 'feito' : 'a fazer', como: 'skill alinhar-modelagem' });

  const imagens = existsSync(refs) ? readdirSync(refs).filter((n) => n.endsWith('.regioes.json')).sort().map((n) => n.replace(/\.regioes\.json$/, '')) : [];
  const pacotes = [];
  const papeis = existsSync(refs) ? papeisDasReferencias(refs) : {};
  const substituidas = [];
  if (!imagens.length) {
    etapas.push({ etapa: 'mapear as partes', estado: 'a fazer', como: 'skill contorno-da-imagem' });
    etapas.push({ etapa: 'prancha', estado: 'a fazer', como: 'skill prancha-dos-contornos' });
  }
  for (const img of imagens) {
    const base = join(refs, img);
    const papel = papeis[img]?.papel ?? 'principal';
    if (papel === 'substituida') { substituidas.push({ imagem: img, por: papeis[img].por, motivo: papeis[img].motivo }); continue; }
    const separacao = estadoDasRodadas(`${base}.regioes.rodadas`);
    etapas.push({ etapa: `mapear as partes de ${img}${papel === 'apoio' ? ' (apoio)' : ''}`, estado: separacao, como: 'skill contorno-da-imagem' });
    const temPrancha = papel === 'principal' && existsSync(`${base}.prancha.png`);
    const prancha = papel === 'apoio' ? 'feito' : separacao !== 'feito' ? 'espera o mapa de partes' : (temPrancha ? estadoDasRodadas(`${base}.prancha.rodadas`) : 'a fazer');
    if (papel === 'principal') etapas.push({ etapa: `prancha de ${img}`, estado: prancha, como: 'skill prancha-dos-contornos' });
    const pacote = join(refs, `${img}.pacote`);
    const folhas = existsSync(pacote) ? readdirSync(pacote).filter((n) => /^divisas-\d+\.png$/.test(n)).sort().map((n) => rel(join(pacote, n))) : [];
    pacotes.push({
      papel,
      imagem: rel(`${base}.png`),
      prancha: temPrancha ? rel(`${base}.prancha.png`) : null,
      mapaDePartes: existsSync(join(pacote, 'mapa-de-partes.png')) ? rel(join(pacote, 'mapa-de-partes.png')) : null,
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
  return { objeto, etapas, proxima: pendente ?? null, pacotes, substituidas };
}

function imprimir({ objeto, etapas, proxima, pacotes, substituidas = [] }) {
  const linhas = [`objeto ${objeto}`, ''];
  for (const e of etapas) linhas.push(`  ${e.etapa.padEnd(40)} ${e.estado}`);
  for (const s of substituidas) linhas.push(`  ${s.imagem} substituída por ${s.por}: ${s.motivo}`);
  linhas.push('', proxima ? `próxima: ${proxima.etapa} (${proxima.como})` : 'próxima: nada; o objeto está completo.');
  for (const p of pacotes) {
    linhas.push('', `pacote de referência${p.papel === 'apoio' ? ' de apoio' : ''}${p.pronto ? '' : ' (incompleto)'}:`, `  1. ${p.imagem}`, `  2. ${p.prancha ?? (p.papel === 'apoio' ? '(sem prancha: imagem de apoio)' : '(prancha ainda não feita)')}`, `  3. ${p.mapaDePartes ?? '(mapa de partes ainda não feito)'}`);
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
