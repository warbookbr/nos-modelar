#!/usr/bin/env node
/* id-cru.mjs — o gate do O-4 (docs/mecanifica/OFICINA-OTIMIZACOES.md): REPROVA
 * peça NOVA que enderece geometria por id posicional, sem quebrar as herdadas.
 *
 * O `CLAUDE.md` proíbe id posicional como referência persistida, mas o formato
 * salvo aceita três formas de COLEÇÃO de id cru — `faces:[ids]` (legado),
 * `sel:{v:[ids]}` e `sel:{f:[ids]}`. Medido no repositório: 131 usos em 13
 * peças. Remover de vez quebraria as 13 e o gabarito; o freio a disco, escrito
 * já com o caminho semântico, tem 0 — prova de que `alias`/`grupo`/`origem`/
 * `regiao` bastam. Este gate separa dívida HERDADA de dívida NOVA.
 *
 * A lista de exceções é EXPLÍCITA e VERSIONADA (`id-cru-herdado.json`): nome de
 * peça e contagem exata por forma. Nada de heurística de data ou de mtime — o
 * `CLAUDE.md` exige determinismo, e uma lista com nome ainda diz QUEM deve.
 * A contagem é EXATA nos dois sentidos: cresceu, reprova (dívida nova
 * disfarçada de herdada); diminuiu, reprova pedindo que a lista encolha junto
 * (senão a lista mente e vira teto para regredir de graça). Peça que sai da
 * lista e continua usando id cru cai na regra da peça nova e reprova.
 *
 * FORA DE ESCOPO, de propósito e declarado: as formas SINGULARES de id cru
 * (`face:<id>` de `vira`/`moveF`/`extruda`/`apagaFace`, `v:<id>` de `moveV`,
 * `a`/`b` de `moveA`, `de`/`para` de `mescla`). Metade dessas ops não tem
 * caminho semântico nenhum no núcleo atual — `vira` só aceita `face:<id>` —,
 * então gatear isso hoje proibiria usar a op em vez de proibir o atalho. Fica
 * registrado como pendência do plano, não como omissão silenciosa.
 *
 *   node tools/bancadas/id-cru.mjs           # relata e ENCOLHE a lista herdada (nunca aumenta)
 *   node tools/bancadas/id-cru.mjs --check   # o gate: exit≠0 na primeira divergência
 *
 *   npm run id-cru        # atualiza a lista depois de PAGAR dívida herdada
 *   npm run id-cru:check  # roda em toda rodada, sempre precisa sair 0
 */
import { readFileSync, existsSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const PECAS = join(REPO, 'prototipos/fps/v3/pecas');

export const LISTA_PADRAO = join(HERE, 'id-cru-herdado.json');
export const FORMATO = 1;

/* As três formas de coleção que o gate cobre. A ordem é a da mensagem de erro
   e a da serialização — determinismo antes de estética. */
export const FORMAS = /** @type {const} */ (['faces', 'selV', 'selF']);

const ROTULO = { faces: 'faces:[ids]', selV: 'sel:{v:[ids]}', selF: 'sel:{f:[ids]}' };

const objetoPlano = (x) => typeof x === 'object' && x !== null && !Array.isArray(x);

/* Conta id cru numa lista de PASSOS. Estrutural, não textual: um comentário
   citando `faces:` não conta, e um passo montado por helper conta. Presença da
   chave já é uso — `faces: 'nada'` é id cru MALFORMADO, não ausência (o núcleo
   grita nele; o gate não pode ser mais permissivo que o núcleo). */
export function contarIdCru(passos) {
  const uso = { faces: 0, selV: 0, selF: 0 };
  if (!Array.isArray(passos)) return uso;
  for (const passo of passos) {
    if (!Array.isArray(passo)) continue;
    const a = passo[1];
    if (!objetoPlano(a)) continue;
    if (Object.hasOwn(a, 'faces')) uso.faces++;
    const sel = a.sel;
    if (objetoPlano(sel)) {
      if (Object.hasOwn(sel, 'v')) uso.selV++;
      if (Object.hasOwn(sel, 'f')) uso.selF++;
    }
  }
  return uso;
}

export const totalDe = (uso) => FORMAS.reduce((s, k) => s + uso[k], 0);
export const detalheDe = (uso) => FORMAS.filter((k) => uso[k] > 0).map((k) => `${uso[k]}× ${ROTULO[k]}`).join(', ');

/* Validação da lista salva. Chave nova em formato salvo entra com validação que
   GRITA em valor inesperado: aqui nada é aceito por omissão nem por coerção. */
export function validarLista(dados) {
  const erros = [];
  if (!objetoPlano(dados)) return ['a lista precisa ser um objeto JSON'];
  const chaves = Object.keys(dados).sort();
  if (chaves.join(',') !== 'formato,herdadas') erros.push(`chaves de topo inesperadas: ${chaves.join(',') || '(nenhuma)'} — só formato e herdadas`);
  if (dados.formato !== FORMATO) erros.push(`formato ${JSON.stringify(dados.formato)} desconhecido — esta ferramenta lê só ${FORMATO}`);
  if (!objetoPlano(dados.herdadas)) { erros.push('herdadas precisa ser um objeto nome->contagem'); return erros; }

  const nomes = Object.keys(dados.herdadas);
  const ordenados = nomes.slice().sort();
  if (nomes.some((n, k) => n !== ordenados[k])) erros.push('herdadas fora de ordem alfabética — o arquivo precisa ser determinístico');
  for (const nome of nomes) {
    if (!nome) { erros.push('entrada com nome vazio'); continue; }
    const uso = dados.herdadas[nome];
    if (!objetoPlano(uso)) { erros.push(`${nome}: contagem precisa ser um objeto com ${FORMAS.join(', ')}`); continue; }
    const k = Object.keys(uso).sort();
    if (k.join(',') !== FORMAS.slice().sort().join(',')) { erros.push(`${nome}: chaves ${k.join(',') || '(nenhuma)'} — precisa ter exatamente ${FORMAS.join(', ')}`); continue; }
    let ok = true;
    for (const forma of FORMAS) {
      const n = uso[forma];
      if (!Number.isSafeInteger(n) || n < 0) { erros.push(`${nome}.${forma}: ${JSON.stringify(n)} não é inteiro não-negativo`); ok = false; }
    }
    if (ok && totalDe(uso) === 0) erros.push(`${nome}: entrada zerada — peça sem id cru não é dívida herdada, remova a entrada`);
  }
  return erros;
}

export function lerLista(caminho = LISTA_PADRAO) {
  if (!existsSync(caminho)) return { ausente: true, dados: null, erros: [] };
  let dados;
  try { dados = JSON.parse(readFileSync(caminho, 'utf8')); }
  catch (e) { return { ausente: false, dados: null, erros: [`não consegui ler ${caminho}: ${e.message}`] }; }
  return { ausente: false, dados, erros: validarLista(dados) };
}

export function gravarLista(herdadas, caminho = LISTA_PADRAO) {
  const ordenado = {};
  for (const nome of Object.keys(herdadas).sort()) ordenado[nome] = herdadas[nome];
  writeFileSync(caminho, JSON.stringify({ formato: FORMATO, herdadas: ordenado }, null, 2) + '\n');
}

/* Mede as peças do repositório. Mesmo escopo do `gabarito:selecao`: só peça com
   `PASSOS` exportado (peça JS-pura não tem envelope da Oficina para gatear). */
export async function medirPecas(dir = PECAS) {
  const nomes = readdirSync(dir).filter((f) => f.endsWith('.js')).map((f) => f.replace(/\.js$/, '')).sort();
  const usos = {};
  const falhas = [];
  for (const nome of nomes) {
    let mod;
    try { mod = await import(pathToFileURL(join(dir, `${nome}.js`)).href); }
    catch (e) { falhas.push(`${nome}: falhou ao importar — ${e.message}`); continue; }
    if (!Array.isArray(mod.PASSOS)) continue;
    const uso = contarIdCru(mod.PASSOS);
    if (totalDe(uso) > 0) usos[nome] = uso;
  }
  return { usos, falhas };
}

/* Compara medição × lista. Devolve a lista de problemas, cada um já com o
   número que o autor precisa para agir. */
export function conferir(usos, herdadas) {
  const problemas = [];
  for (const nome of Object.keys(usos).sort()) {
    if (!Object.hasOwn(herdadas, nome)) {
      problemas.push(`${nome}: ID CRU em peça NOVA — ${totalDe(usos[nome])} uso(s) (${detalheDe(usos[nome])}). Endereçe por sel:{alias|grupo|origem|regiao}; o freio a disco prova que dá (0 id cru).`);
    }
  }
  for (const nome of Object.keys(herdadas).sort()) {
    const esperado = herdadas[nome], medido = usos[nome];
    if (!medido) {
      problemas.push(`${nome}: listada como herdada mas mede 0 uso de id cru (peça sumiu, perdeu PASSOS, ou a dívida foi paga) — remova a entrada com \`npm run id-cru\`.`);
      continue;
    }
    for (const forma of FORMAS) {
      if (medido[forma] === esperado[forma]) continue;
      const cresceu = medido[forma] > esperado[forma];
      problemas.push(
        `${nome}.${forma}: ${medido[forma]} uso(s) de ${ROTULO[forma]}, a lista congelou ${esperado[forma]} — ` +
        (cresceu ? 'dívida herdada NÃO cresce: a peça é antiga, o uso é novo.' : 'dívida paga: encolha a lista com `npm run id-cru`.'),
      );
    }
  }
  return problemas;
}

/* ---- CLI ------------------------------------------------------------------ */
const chamadoDireto = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (chamadoDireto) {
  const args = process.argv.slice(2);
  const iCheck = args.indexOf('--check');
  const checando = iCheck >= 0;
  const caminho = resolve(REPO, (checando ? args[iCheck + 1] : args[0]) || LISTA_PADRAO);

  const { usos, falhas } = await medirPecas();
  if (falhas.length) {
    console.error(`✗ ${falhas.length} peça(s) não puderam ser medidas:`);
    for (const f of falhas) console.error(`  - ${f}`);
    process.exit(2);
  }
  const totalMedido = Object.values(usos).reduce((s, u) => s + totalDe(u), 0);

  const { ausente, dados, erros } = lerLista(caminho);
  if (erros.length) {
    console.error(`✗ lista herdada inválida (${caminho}):`);
    for (const e of erros) console.error(`  - ${e}`);
    process.exit(2);
  }

  if (ausente && checando) { console.error(`✗ lista herdada ausente: ${caminho} — rode \`npm run id-cru\` para fundá-la e COMMITE o arquivo.`); process.exit(2); }

  if (checando) {
    const problemas = conferir(usos, dados.herdadas);
    if (problemas.length) {
      console.error(`✗ id-cru — ${problemas.length} problema(s):`);
      for (const p of problemas) console.error(`  - ${p}`);
      console.error('\nid-cru FALHOU — id posicional é referência proibida pelo CLAUDE.md; a lista herdada é dívida congelada, não permissão.');
      process.exit(1);
    }
    console.log(`✓ id-cru — 0 uso de id cru fora da lista herdada (${Object.keys(dados.herdadas).length} peça(s) herdada(s), ${totalMedido} uso(s) congelado(s))`);
    process.exit(0);
  }

  if (ausente) {
    gravarLista(usos, caminho);
    console.log(`lista herdada FUNDADA em ${caminho}: ${Object.keys(usos).length} peça(s), ${totalMedido} uso(s) de id cru.`);
    for (const nome of Object.keys(usos).sort()) console.log(`  ${nome}: ${detalheDe(usos[nome])}`);
    process.exit(0);
  }

  /* A lista só ENCOLHE por ferramenta. Entrar nela é decisão humana, escrita à
     mão e revisada no diff — senão bastaria rodar o comando para transformar
     dívida nova em herdada, e o gate não gatearia nada. */
  const recusas = conferir(usos, dados.herdadas).filter((p) => p.includes('peça NOVA') || p.includes('NÃO cresce'));
  if (recusas.length) {
    console.error(`✗ id-cru — ${recusas.length} caso(s) que esta ferramenta NÃO grava:`);
    for (const r of recusas) console.error(`  - ${r}`);
    console.error('\nA lista herdada só encolhe automaticamente. Aumentar exige editar id-cru-herdado.json à mão, com justificativa no commit.');
    process.exit(1);
  }

  const novo = {};
  const encolheu = [];
  for (const nome of Object.keys(dados.herdadas).sort()) {
    const antes = dados.herdadas[nome], medido = usos[nome];
    if (!medido) { encolheu.push(`${nome}: saiu da lista (0 uso)`); continue; }
    novo[nome] = { faces: medido.faces, selV: medido.selV, selF: medido.selF };
    for (const forma of FORMAS) if (medido[forma] !== antes[forma]) encolheu.push(`${nome}.${forma}: ${antes[forma]} → ${medido[forma]}`);
  }
  gravarLista(novo, caminho);
  console.log(`id-cru — ${Object.keys(novo).length} peça(s) herdada(s), ${totalMedido} uso(s) de id cru congelado(s).`);
  if (encolheu.length) for (const e of encolheu) console.log(`  ${e}`);
  else console.log('  (nada mudou)');
  console.log(`gravado em ${caminho}`);
  process.exit(0);
}
