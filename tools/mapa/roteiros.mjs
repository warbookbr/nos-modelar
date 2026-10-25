#!/usr/bin/env node
/* roteiros.mjs — os invariantes e os roteiros de leitura por intenção, como dado.
 *
 * A fonte é `docs/mecanifica/roteiros/roteiros.json`. Dela saem a página gerada
 * `ROTEIROS.md` (o que cada intenção lê antes, o que abre só quando a condição
 * aparece, a skill, os comandos e o que se confere no fim) e dois blocos do
 * `CLAUDE.md`, entre marcadores: as regras (os invariantes) e a linha de cada
 * roteiro. O `CLAUDE.md` entra no contexto sozinho, sem custar leitura, por isso
 * é o lugar dos invariantes. O gate `leitura:obrigatoria` usa as funções daqui
 * para conferir que todo arquivo e todo comando citado existe, que cada roteiro
 * cabe no orçamento e que as páginas estão em dia com o JSON.
 *
 *   npm run roteiros:gerar   regrava o ROTEIROS.md e os blocos do CLAUDE.md
 */
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const PASTA = 'docs/mecanifica/roteiros';
export const CAMINHO_JSON = `${PASTA}/roteiros.json`;
export const CAMINHO_ROTEIROS = `${PASTA}/ROTEIROS.md`;
export const CAMINHO_CLAUDE = 'CLAUDE.md';

/* As seções em que o `CLAUDE.md` agrupa os invariantes, na ordem em que aparecem, e o título de cada uma. */
export const SECOES_DOS_INVARIANTES = { regras: 'Regras', qualidade: 'Coordenação e qualidade' };

/* Os marcadores que delimitam, no `CLAUDE.md`, o que o gerador regrava. */
export const MARCADORES = {
  roteiros: ['<!-- roteiros:inicio -->', '<!-- roteiros:fim -->'],
  invariantes: ['<!-- invariantes:inicio -->', '<!-- invariantes:fim -->'],
};

/* A frase do `quando` é uma linha de índice: passa disso, vira parágrafo e o índice deixa de ser lido de relance. */
export const TETO_DA_FRASE = 140;

const AVISO_GERADO = '<!-- Gerado de roteiros.json por `npm run roteiros:gerar`. Não edite à mão. -->';

export function carregarRoteiros(raiz = RAIZ) {
  return JSON.parse(readFileSync(join(raiz, CAMINHO_JSON), 'utf8'));
}

function scriptsDoPacote(raiz) {
  return JSON.parse(readFileSync(join(raiz, 'package.json'), 'utf8')).scripts ?? {};
}

/* Um comando citado existe quando é `npm run <script>` de um script do package.json, ou `node <arquivo>` de um arquivo do
   repositório. O resto da linha (argumentos, marcadores como <arquivo>) não se confere. */
function problemaDoComando(comando, scripts, raiz) {
  const npm = /^npm run ([^\s]+)/.exec(comando);
  if (npm) return scripts[npm[1]] ? null : `o script "${npm[1]}" não existe no package.json`;
  const node = /^node ([^\s]+)/.exec(comando);
  if (node) return existsSync(join(raiz, node[1])) ? null : `o arquivo ${node[1]} não existe`;
  return 'o comando precisa começar por "npm run" ou "node"';
}

const textoCheio = (v) => typeof v === 'string' && v.trim() !== '';

/* Os problemas do JSON, um por linha, cada um dizendo o que corrigir. Lista vazia quando está tudo certo. */
export function validarRoteiros(dados, raiz = RAIZ) {
  const problemas = [];
  const scripts = scriptsDoPacote(raiz);
  if (dados?.versao !== 1) problemas.push(`${CAMINHO_JSON}: "versao" deve ser 1.`);

  const idsInv = new Set();
  const existe = (relativo) => existsSync(join(raiz, relativo));
  for (const [i, inv] of (dados?.invariantes ?? []).entries()) {
    const onde = `invariante ${inv?.id ?? `#${i + 1}`}`;
    if (!textoCheio(inv?.id)) problemas.push(`${onde}: falta o "id".`);
    else if (idsInv.has(inv.id)) problemas.push(`${onde}: "id" repetido.`);
    else idsInv.add(inv.id);
    if (!textoCheio(inv?.texto)) problemas.push(`${onde}: falta o "texto".`);
    if (!Object.hasOwn(SECOES_DOS_INVARIANTES, inv?.secao)) {
      problemas.push(`${onde}: "secao" deve ser uma de ${Object.keys(SECOES_DOS_INVARIANTES).join(', ')} (recebido ${JSON.stringify(inv?.secao)}).`);
    }
    if (inv?.gate !== null && !(typeof inv?.gate === 'string' && scripts[inv.gate])) {
      problemas.push(`${onde}: "gate" deve ser null ou um script do package.json (recebido ${JSON.stringify(inv?.gate)}).`);
    }
    if (inv?.gate === 'test') {
      if (!textoCheio(inv?.teste) || !existe(inv.teste)) problemas.push(`${onde}: o gate "test" precisa de "teste", o arquivo do teste do vitest que confere a regra (recebido ${JSON.stringify(inv?.teste)}).`);
    } else if (inv?.teste !== undefined) {
      problemas.push(`${onde}: "teste" só vale com o gate "test".`);
    }
  }
  if (idsInv.size === 0) problemas.push(`${CAMINHO_JSON}: a lista "invariantes" está vazia.`);

  const ids = new Set();
  for (const [i, r] of (dados?.roteiros ?? []).entries()) {
    const onde = `roteiro ${r?.id ?? `#${i + 1}`}`;
    if (!textoCheio(r?.id)) problemas.push(`${onde}: falta o "id".`);
    else if (ids.has(r.id)) problemas.push(`${onde}: "id" repetido.`);
    else ids.add(r.id);
    for (const campo of ['intencao', 'titulo', 'quando', 'passo', 'conferido']) {
      if (!textoCheio(r?.[campo])) problemas.push(`${onde}: falta "${campo}".`);
    }
    if (textoCheio(r?.quando) && r.quando.length > TETO_DA_FRASE) {
      problemas.push(`${onde}: o "quando" tem ${r.quando.length} caracteres, e a frase do índice cabe em ${TETO_DA_FRASE}.`);
    }
    const ler = Array.isArray(r?.ler) ? r.ler : [];
    if (ler.length === 0) problemas.push(`${onde}: a lista "ler" está vazia.`);
    if (!ler.includes(CAMINHO_CLAUDE)) problemas.push(`${onde}: "ler" precisa incluir ${CAMINHO_CLAUDE}, que traz os invariantes e toda intenção lê.`);
    for (const relativo of ler) if (!existe(relativo)) problemas.push(`${onde}: ${relativo} não existe (corrija o caminho em "ler" ou tire a linha).`);
    for (const item of r?.sobDemanda ?? []) {
      if (!textoCheio(item?.arquivo) || !existe(item.arquivo)) problemas.push(`${onde}: ${item?.arquivo} de "sobDemanda" não existe.`);
      if (!textoCheio(item?.quando)) problemas.push(`${onde}: ${item?.arquivo} de "sobDemanda" não diz "quando" abrir.`);
      if (ler.includes(item?.arquivo)) problemas.push(`${onde}: ${item.arquivo} está em "ler" e em "sobDemanda".`);
    }
    if (r?.skill !== null && !(textoCheio(r?.skill) && existe(`.claude/skills/${r.skill}/SKILL.md`))) {
      problemas.push(`${onde}: a skill ${JSON.stringify(r?.skill)} não existe em .claude/skills/.`);
    }
    for (const comando of r?.comandos ?? []) {
      const p = problemaDoComando(comando, scripts, raiz);
      if (p) problemas.push(`${onde}: o comando "${comando}" não serve: ${p}.`);
    }
    if (!Number.isInteger(r?.orcamentoBytes) || r.orcamentoBytes <= 0) problemas.push(`${onde}: "orcamentoBytes" deve ser um inteiro positivo.`);
    const base = r?.linhaDeBase;
    if (!(Number.isInteger(base?.bytes) && base.bytes > 0 && /^\d{4}-\d{2}-\d{2}$/.test(base?.data ?? ''))) {
      problemas.push(`${onde}: "linhaDeBase" deve ser { "bytes": inteiro, "data": "AAAA-MM-DD" }.`);
    }
  }
  if (ids.size === 0) problemas.push(`${CAMINHO_JSON}: a lista "roteiros" está vazia.`);
  return problemas;
}

/* O tamanho de cada arquivo de "ler" e o total, em bytes. Arquivo que não existe conta 0 (a validação já o aponta). */
export function medirRoteiro(roteiro, raiz = RAIZ) {
  const arquivos = roteiro.ler.map((relativo) => {
    const caminho = join(raiz, relativo);
    return { relativo, bytes: existsSync(caminho) ? statSync(caminho).size : 0 };
  });
  return { arquivos, total: arquivos.reduce((soma, a) => soma + a.bytes, 0) };
}

const milhar = (n) => n.toLocaleString('pt-BR');
const codigo = (s) => `\`${s}\``;

/* O texto do invariante e, quando há gate, a frase que diz qual o confere. Um teste do vitest é conferido pelo gate `test`, e a
   frase cita o arquivo dele. */
function textoDoInvariante(inv) {
  if (!inv.gate) return inv.texto;
  if (inv.gate === 'test') return `${inv.texto} O teste ${codigo(inv.teste)}, do gate ${codigo('test')}, confere.`;
  return `${inv.texto} O gate ${codigo(inv.gate)} confere.`;
}

/* Quebra o texto em linhas de até `largura` colunas sem partir um trecho entre crases, para o `docs:citacoes` e o leitor
   verem cada comando inteiro numa linha. A primeira linha leva `marca`, as outras o recuo. */
function quebrar(texto, marca, largura = 80) {
  const palavras = texto.match(/(?:`[^`]*`|\S)+/g) ?? [];
  const linhas = [];
  let atual = '';
  for (const p of palavras) {
    if (atual !== '' && marca.length + atual.length + 1 + p.length > largura) { linhas.push(atual); atual = p; }
    else atual = atual === '' ? p : `${atual} ${p}`;
  }
  linhas.push(atual);
  return linhas.map((l, i) => (i === 0 ? marca : ' '.repeat(marca.length)) + l);
}

/* O bloco de regras do `CLAUDE.md`: uma seção por grupo de invariantes, com um item por invariante sem gate. O `CLAUDE.md` é
   o contrato mínimo, lido em todo contexto, e guarda só o que nenhuma ferramenta confere; a regra com gate chega como recusa
   do gate no momento do erro e fica listada no `ROTEIROS.md`. */
export function gerarBlocoInvariantes(dados) {
  const partes = [];
  for (const [chave, titulo] of Object.entries(SECOES_DOS_INVARIANTES)) {
    const itens = dados.invariantes.filter((inv) => inv.secao === chave && !inv.gate);
    if (itens.length === 0) continue;
    if (partes.length > 0) partes.push('');
    partes.push(`## ${titulo}`, '', ...itens.flatMap((inv) => quebrar(textoDoInvariante(inv), '- ')));
  }
  return partes.join('\n');
}

/* A lista de roteiros do `CLAUDE.md`: o id e a frase de cada um. */
export function gerarBlocoRoteiros(dados) {
  return dados.roteiros.map((r) => `- ${codigo(r.id)}: ${r.quando}`).join('\n');
}

/* Troca o que está entre os marcadores de `nome` por `bloco`. Devolve null quando os marcadores faltam ou estão fora de ordem. */
function trocarEntreMarcadores(texto, nome, bloco) {
  const [inicio, fim] = MARCADORES[nome];
  const i = texto.indexOf(inicio);
  const f = texto.indexOf(fim);
  if (i < 0 || f < i) return null;
  return `${texto.slice(0, i + inicio.length)}\n${bloco}\n${texto.slice(f)}`;
}

/* O `CLAUDE.md` com os dois blocos regravados do JSON. Devolve null quando um marcador falta. */
export function gerarClaude(textoAtual, dados) {
  const comRoteiros = trocarEntreMarcadores(textoAtual, 'roteiros', gerarBlocoRoteiros(dados));
  return comRoteiros === null ? null : trocarEntreMarcadores(comRoteiros, 'invariantes', gerarBlocoInvariantes(dados));
}

export function gerarRoteirosMd(dados) {
  const partes = [
    '# Roteiros de leitura por intenção',
    '',
    AVISO_GERADO,
    '',
    'Cada roteiro diz o que ler antes de começar, o que abrir só quando a condição aparecer, a',
    'skill, os comandos e o que se confere no fim, e `npm run comecar -- <roteiro>` (ou a ferramenta',
    'MCP `comecar`) devolve o mesmo com o passo seguinte lido do estado. Todo roteiro começa pelo',
    '`CLAUDE.md`, que traz as regras que nenhuma ferramenta confere e a lista destes roteiros. `npm run leitura:obrigatoria` imprime',
    'o tamanho da leitura de cada roteiro contra o orçamento e a linha de base, e o gate recusa o',
    'roteiro que passa de um ou do outro. O `AGENTS.md` faz para outros agentes o papel do',
    '`CLAUDE.md` e não entra na soma.',
    '',
    '| roteiro | intenção | quando |',
    '| --- | --- | --- |',
    ...dados.roteiros.map((r) => `| ${codigo(r.id)} | ${r.intencao} | ${r.quando} |`),
  ];
  const cobradas = dados.invariantes.filter((inv) => inv.gate);
  if (cobradas.length > 0) {
    partes.push('', '## Regras cobradas por gate', '', 'Valem em toda intenção e saem do `CLAUDE.md` porque o gate as recusa no momento do erro:', '');
    for (const inv of cobradas) partes.push(...quebrar(textoDoInvariante(inv), '- ', 100));
  }
  for (const r of dados.roteiros) {
    partes.push('', `## ${r.id}: ${r.titulo}`, '', r.quando, '');
    partes.push(`Ler antes de começar, num orçamento de ${milhar(r.orcamentoBytes)} bytes (linha de base de ${milhar(r.linhaDeBase.bytes)} bytes em ${r.linhaDeBase.data}):`, '');
    for (const relativo of r.ler) partes.push(`- ${codigo(relativo)}`);
    if ((r.sobDemanda ?? []).length > 0) {
      partes.push('', 'Abrir só quando a condição aparecer:', '');
      for (const item of r.sobDemanda) partes.push(`- ${codigo(item.arquivo)}, quando ${item.quando}.`);
    }
    partes.push('');
    if (r.skill) partes.push(`Skill: ${codigo(r.skill)}.`, '');
    if ((r.comandos ?? []).length > 0) partes.push(`Comandos: ${r.comandos.map(codigo).join(', ')}.`, '');
    partes.push(`Passo seguinte, sem estado lido: ${r.passo}`, '', `Conferido no fim: ${r.conferido}`);
  }
  return `${partes.join('\n')}\n`;
}

/* As páginas geradas que diferem do que está no disco: [{ relativo, esperado }]. `esperado` é null quando o `CLAUDE.md`
   perdeu um marcador, e aí não há o que regravar. */
export function paginasDesatualizadas(dados, raiz = RAIZ) {
  const lido = (relativo) => (existsSync(join(raiz, relativo)) ? readFileSync(join(raiz, relativo), 'utf8') : null);
  const claude = lido(CAMINHO_CLAUDE);
  return [
    { relativo: CAMINHO_ROTEIROS, esperado: gerarRoteirosMd(dados), atual: lido(CAMINHO_ROTEIROS) },
    { relativo: CAMINHO_CLAUDE, esperado: claude === null ? null : gerarClaude(claude, dados), atual: claude },
  ].filter(({ esperado, atual }) => esperado === null || atual !== esperado).map(({ relativo, esperado }) => ({ relativo, esperado }));
}

function executar() {
  const dados = carregarRoteiros();
  if (process.argv.includes('--gerar')) {
    const claude = gerarClaude(readFileSync(join(RAIZ, CAMINHO_CLAUDE), 'utf8'), dados);
    if (claude === null) {
      console.error(`${CAMINHO_CLAUDE} perdeu um marcador (${Object.values(MARCADORES).flat().join(', ')}): ponha de volta onde o bloco deve ficar.`);
      process.exitCode = 1;
      return;
    }
    writeFileSync(join(RAIZ, CAMINHO_CLAUDE), claude);
    writeFileSync(join(RAIZ, CAMINHO_ROTEIROS), gerarRoteirosMd(dados));
    console.log(`gravados ${CAMINHO_CLAUDE} (blocos entre marcadores) e ${CAMINHO_ROTEIROS}`);
    return;
  }
  console.error('uso: npm run roteiros:gerar (a conferência é o gate leitura:obrigatoria)');
  process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) executar();
