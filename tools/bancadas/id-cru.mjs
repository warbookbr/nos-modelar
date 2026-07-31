/* id-cru.mjs — o gate do O-4 (docs/mecanifica/OFICINA-OTIMIZACOES.md): REPROVA
 * peça NOVA que enderece geometria por id posicional, sem quebrar as herdadas.
 *
 * O `CLAUDE.md` proíbe id posicional como referência persistida, mas o formato
 * salvo aceita SEIS formas de COLEÇÃO de id cru. QUAIS são elas, e por que
 * `de:{op,id}` do `publicarPorta` NÃO é uma delas, está escrito num lugar só:
 * `prototipos/fps/v3/motor/referencia-posicional.js`. Este gate, a guarda de
 * salvamento da Oficina e o oráculo do harness importam de lá — a regra copiada
 * em três lugares divergiu duas vezes na mesma chave (ATRITOS-AUTORIA A-22), e
 * na segunda a Oficina passou a recusar uma peça que este gate aprova.
 *
 * O que continua sendo responsabilidade DESTE arquivo: a lista herdada, a
 * comparação medido × congelado e o conselho de conserto.
 *
 * As três últimas formas eram o BURACO que a revisão da R2 achou: o arquivo afirmava
 * cobrir "as três formas de coleção" e deixava passar `pesar {vs}`, o pincel
 * macio e o `de:[ids]` do `mescla` — que é COLEÇÃO, não singular, e estava
 * declarado como singular. Medido no baseline: `_oficina-esqueleto` tem 6
 * passos `pesar` com 24 ids de vértice que a lista congelada registrava como
 * `selV: 0`. O gate deixava passar exatamente a classe que veio proibir.
 *
 * A CONTAGEM É DE ID, NÃO DE PASSO. Contar passo era a segunda cegueira: com
 * `faces` medindo "quantos passos têm a chave", um `pincel` podia ir de 2 para
 * 200 faces sem mexer no número, e o cabeçalho ainda prometia contagem exata.
 * Regra: chave presente conta os ids que ela carrega, e NUNCA menos que 1 —
 * `faces: []` e `faces: 'nada'` são a forma legada sendo usada (o núcleo grita
 * nas duas), não ausência dela.
 *
 * A lista de exceções é EXPLÍCITA e VERSIONADA (`id-cru-herdado.json`): nome de
 * peça e contagem exata por forma. Nada de heurística de data ou de mtime — o
 * `CLAUDE.md` exige determinismo, e uma lista com nome ainda diz QUEM deve.
 * `herdadas` é uma LISTA ORDENADA, não um objeto: nome de peça que parece
 * inteiro (`9.js`, `10.js` são nomes legais) é reordenado numericamente pelo
 * motor JS e pelo `JSON.parse`, então um objeto grava numa ordem e relê noutra
 * — o arquivo salvo se autoinvalidava. Ordem é dado; array carrega ordem, mapa
 * não.
 * A contagem é EXATA nos dois sentidos: cresceu, reprova (dívida nova
 * disfarçada de herdada); diminuiu, reprova pedindo que a lista encolha junto
 * (senão a lista mente e vira teto para regredir de graça). Peça que sai da
 * lista e continua usando id cru cai na regra da peça nova e reprova.
 *
 * O escopo (seis formas de coleção) e o fora-de-escopo (as quatro formas
 * SINGULARES do núcleo) estão declarados no módulo da regra, não aqui — duas
 * declarações do mesmo escopo é como o A-22 começou.
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
import {
  FORMAS, ROTULO, TEM_CAMINHO_SEMANTICO, contarIdCru, detalheDe, objetoPlano, totalDe,
} from '../../prototipos/fps/v3/motor/referencia-posicional.js';

/* reexportado para quem já importava daqui (os testes do gate e o harness da
   guarda): a regra mudou de casa, não de contrato. */
export { FORMAS, ROTULO, contarIdCru, detalheDe, totalDe };

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const PECAS = join(REPO, 'prototipos/fps/v3/pecas');

export const LISTA_PADRAO = join(HERE, 'id-cru-herdado.json');
/* 2: `herdadas` virou lista ordenada e ganhou as três formas que faltavam. Ler
   um arquivo `formato: 1` com esta ferramenta compararia contagem de PASSO com
   contagem de ID — número contra número, sem nada estourar. Por isso o formato
   é fechado: arquivo antigo GRITA em vez de mentir. */
export const FORMATO = 2;

/* A remediação HONESTA. A mensagem antiga mandava "endereçe por
   sel:{alias|grupo|origem|regiao}" para qualquer forma, e isso mentia duas
   vezes: `vs`/`pontos`/`de` não têm caminho semântico no núcleo, e quem modela
   em `oficina.html` e clica Salvar não tem como emitir referência semântica
   nenhuma — a interface só sabe gravar id posicional, e grava justamente no
   diretório que este gate varre. Conselho impossível é pior que conselho
   nenhum: manda o autor procurar uma saída que não existe. */
function comoConsertar(uso) {
  const presentes = FORMAS.filter((k) => uso[k] > 0);
  const semCaminho = presentes.filter((k) => !TEM_CAMINHO_SEMANTICO[k]);
  const linhas = [];
  if (presentes.some((k) => TEM_CAMINHO_SEMANTICO[k])) {
    linhas.push('escrita à mão: troque por sel:{alias|grupo|origem|regiao} — o freio a disco prova que dá (0 id cru).');
  }
  if (semCaminho.length) {
    const nomes = semCaminho.map((k) => ROTULO[k]);
    const juntos = nomes.length > 1 ? `${nomes.slice(0, -1).join(', ')} e ${nomes.at(-1)}` : nomes[0];
    linhas.push(`${juntos} ${nomes.length > 1 ? 'NÃO têm' : 'NÃO tem'} caminho semântico no núcleo — a op só aceita id ali. Ou a peça nova ainda não usa a op, ou entra na lista herdada de propósito.`);
  }
  linhas.push('salva pela Oficina (prototipos/fps/v3/oficina.html → Salvar → prototipos/fps/v3/pecas/): a interface AINDA NÃO sabe emitir referência semântica — ela só grava id posicional (R4/R5 do plano). Enquanto isso as saídas honestas são duas: converter a peça à mão, ou registrar a entrada em tools/bancadas/id-cru-herdado.json DE PROPÓSITO, assumindo a dívida no commit. Atrito A-15 em docs/mecanifica/ATRITOS-AUTORIA.md.');
  return linhas.map((l) => `\n      · ${l}`).join('');
}

/* Validação da lista salva. Chave nova em formato salvo entra com validação que
   GRITA em valor inesperado: aqui nada é aceito por omissão nem por coerção. */
export function validarLista(dados) {
  const erros = [];
  if (!objetoPlano(dados)) return ['a lista precisa ser um objeto JSON'];
  const chaves = Object.keys(dados).sort();
  if (chaves.join(',') !== 'formato,herdadas') erros.push(`chaves de topo inesperadas: ${chaves.join(',') || '(nenhuma)'} — só formato e herdadas`);
  if (dados.formato !== FORMATO) erros.push(`formato ${JSON.stringify(dados.formato)} desconhecido — esta ferramenta lê só ${FORMATO}`);
  if (!Array.isArray(dados.herdadas)) { erros.push('herdadas precisa ser uma LISTA de entradas {peca, ...contagens} — objeto não carrega ordem (nome que parece inteiro reordena)'); return erros; }

  const ESPERADAS = ['peca', ...FORMAS].slice().sort().join(',');
  let anterior = null;
  for (const entrada of dados.herdadas) {
    if (!objetoPlano(entrada)) { erros.push(`entrada ${JSON.stringify(entrada)} não é um objeto {peca, ...contagens}`); continue; }
    const nome = entrada.peca;
    if (typeof nome !== 'string' || !nome) { erros.push(`entrada com peca ${JSON.stringify(nome)} — precisa ser um nome não-vazio`); continue; }
    const k = Object.keys(entrada).sort();
    if (k.join(',') !== ESPERADAS) { erros.push(`${nome}: chaves ${k.join(',') || '(nenhuma)'} — precisa ter exatamente peca, ${FORMAS.join(', ')}`); continue; }
    /* Ordem ESTRITAMENTE crescente: pega desordem e nome repetido de uma vez
       (repetido é a pior das duas — a segunda entrada venceria em silêncio). */
    if (anterior !== null && !(anterior < nome)) {
      erros.push(anterior === nome ? `${nome}: entrada duplicada — cada peça aparece uma vez` : `herdadas fora de ordem alfabética (${JSON.stringify(anterior)} antes de ${JSON.stringify(nome)}) — o arquivo precisa ser determinístico`);
    }
    anterior = nome;
    let ok = true;
    for (const forma of FORMAS) {
      const n = entrada[forma];
      if (!Number.isSafeInteger(n) || n < 0) { erros.push(`${nome}.${forma}: ${JSON.stringify(n)} não é inteiro não-negativo`); ok = false; }
    }
    if (ok && totalDe(entrada) === 0) erros.push(`${nome}: entrada zerada — peça sem id cru não é dívida herdada, remova a entrada`);
  }
  return erros;
}

/* A lista no disco é ORDENADA; a comparação quer acesso por nome. `indexar` faz
   a ponte, e só depois de `validarLista` ter aprovado (duplicata já gritou). */
export function indexar(herdadas) {
  const mapa = {};
  for (const e of herdadas ?? []) {
    const uso = {};
    for (const forma of FORMAS) uso[forma] = e[forma];
    mapa[e.peca] = uso;
  }
  return mapa;
}

export function lerLista(caminho = LISTA_PADRAO) {
  if (!existsSync(caminho)) return { ausente: true, dados: null, erros: [] };
  let dados;
  try { dados = JSON.parse(readFileSync(caminho, 'utf8')); }
  catch (e) { return { ausente: false, dados: null, erros: [`não consegui ler ${caminho}: ${e.message}`] }; }
  return { ausente: false, dados, erros: validarLista(dados) };
}

/* Grava a partir do mapa nome->uso. A ordem sai de `Object.keys().sort()` e
   SOBREVIVE ao disco porque o destino é um array — num objeto, "9" e "10"
   voltariam antes de qualquer letra e o arquivo recém-gravado seria recusado
   pelo próprio `--check` do comando seguinte. */
export function gravarLista(herdadas, caminho = LISTA_PADRAO) {
  const lista = Object.keys(herdadas).sort().map((peca) => {
    const e = { peca };
    for (const forma of FORMAS) e[forma] = herdadas[peca][forma];
    return e;
  });
  writeFileSync(caminho, JSON.stringify({ formato: FORMATO, herdadas: lista }, null, 2) + '\n');
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
      problemas.push(`${nome}: ID CRU em peça NOVA — ${totalDe(usos[nome])} id(s) posicional(is) (${detalheDe(usos[nome])}).${comoConsertar(usos[nome])}`);
    }
  }
  for (const nome of Object.keys(herdadas).sort()) {
    const esperado = herdadas[nome], medido = usos[nome];
    if (!medido) {
      problemas.push(`${nome}: listada como herdada mas mede 0 id cru (peça sumiu, perdeu PASSOS, ou a dívida foi paga) — remova a entrada com \`npm run id-cru\`.`);
      continue;
    }
    for (const forma of FORMAS) {
      if (medido[forma] === esperado[forma]) continue;
      const cresceu = medido[forma] > esperado[forma];
      problemas.push(
        `${nome}.${forma}: ${medido[forma]} id(s) de ${ROTULO[forma]}, a lista congelou ${esperado[forma]} — ` +
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

  const herdadas = ausente ? {} : indexar(dados.herdadas);

  if (checando) {
    const problemas = conferir(usos, herdadas);
    if (problemas.length) {
      console.error(`✗ id-cru — ${problemas.length} problema(s):`);
      for (const p of problemas) console.error(`  - ${p}`);
      console.error('\nid-cru FALHOU — id posicional é referência proibida pelo CLAUDE.md; a lista herdada é dívida congelada, não permissão.');
      process.exit(1);
    }
    console.log(`✓ id-cru — 0 id cru fora da lista herdada (${dados.herdadas.length} peça(s) herdada(s), ${totalMedido} id(s) congelado(s))`);
    process.exit(0);
  }

  if (ausente) {
    gravarLista(usos, caminho);
    console.log(`lista herdada FUNDADA em ${caminho}: ${Object.keys(usos).length} peça(s), ${totalMedido} id(s) cru(s).`);
    for (const nome of Object.keys(usos).sort()) console.log(`  ${nome}: ${detalheDe(usos[nome])}`);
    process.exit(0);
  }

  /* A lista só ENCOLHE por ferramenta. Entrar nela é decisão humana, escrita à
     mão e revisada no diff — senão bastaria rodar o comando para transformar
     dívida nova em herdada, e o gate não gatearia nada. */
  const recusas = conferir(usos, herdadas).filter((p) => p.includes('peça NOVA') || p.includes('NÃO cresce'));
  if (recusas.length) {
    console.error(`✗ id-cru — ${recusas.length} caso(s) que esta ferramenta NÃO grava:`);
    for (const r of recusas) console.error(`  - ${r}`);
    console.error('\nA lista herdada só encolhe automaticamente. Aumentar exige editar id-cru-herdado.json à mão, com justificativa no commit.');
    process.exit(1);
  }

  const novo = {};
  const encolheu = [];
  for (const nome of Object.keys(herdadas).sort()) {
    const antes = herdadas[nome], medido = usos[nome];
    if (!medido) { encolheu.push(`${nome}: saiu da lista (0 id cru)`); continue; }
    novo[nome] = {};
    for (const forma of FORMAS) novo[nome][forma] = medido[forma];
    for (const forma of FORMAS) if (medido[forma] !== antes[forma]) encolheu.push(`${nome}.${forma}: ${antes[forma]} → ${medido[forma]}`);
  }
  gravarLista(novo, caminho);
  console.log(`id-cru — ${Object.keys(novo).length} peça(s) herdada(s), ${totalMedido} id(s) cru(s) congelado(s).`);
  if (encolheu.length) for (const e of encolheu) console.log(`  ${e}`);
  else console.log('  (nada mudou)');
  console.log(`gravado em ${caminho}`);
  process.exit(0);
}
