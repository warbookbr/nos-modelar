#!/usr/bin/env node
/* pedido-ao-agente.mjs — monta o pedido a um agente despachado a partir do plano: `npm run pedido -- <plano> --fatia=<n>`.
 *
 * Quem conduz escrevia o pedido à mão e copiava o território, o gate de saída e as regras de cada vez, com os números do
 * problema sem a data da medida. O comando imprime o que o plano já diz (o caminho, a fatia, o território, o gate de saída),
 * a regra de não sair do território, a citação de `.claude/REGRAS-DOS-AGENTES.md` e, de cada frase do problema que traz
 * número, a data e o commit da medida quando o plano os traz. A última linha fica em branco para a tarefa, que é a única
 * parte que quem conduz escreve.
 *
 * A data de uma medida é a que a própria frase traz; sem ela, a da pasta do banco de provas onde mora o arquivo de evidência
 * que o plano cita entre parênteses; sem ela, a da linha "Repositório e base". O commit vem da frase ou da linha de base. O
 * comando só lê.
 *
 *   npm run pedido -- <plano> --fatia=<n>   o pedido em texto
 *   npm run pedido -- <plano> --fatia=<n> --json
 *   npm run pedido -- --ajuda */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const PASTA_DOS_PLANOS = 'docs/modelar/planos';
export const PASTA_DO_BANCO = 'docs/modelar/banco-de-provas';
export const REGRAS = '.claude/REGRAS-DOS-AGENTES.md';
export const LINHA_DA_TAREFA = 'Tarefa: <escreva aqui o que o agente faz nesta fatia>';

const AJUDA = `npm run pedido -- <plano> --fatia=<n> [--json]  (node tools/mapa/pedido-ao-agente.mjs)
Monta o pedido a um agente a partir do plano: o caminho do plano, a fatia, o território, a regra de não sair dele, o gate de
saída, a citação de ${REGRAS} e, dos números do problema do plano, a data e o commit de cada medida quando o plano os traz.
Quem conduz acrescenta só a tarefa, na última linha.

  <plano>       o caminho do arquivo, o nome dele ou um trecho do nome, em ${PASTA_DOS_PLANOS}/
  --fatia=<n>   o número da fatia, como está na seção "Fatias" do plano
  --json        o mesmo conteúdo em JSON
  --ajuda       esta mensagem
`;

class Recusa extends Error {}

/* A seção `## <titulo>` do plano, sem a linha do título; '' quando não existe. */
export function secaoDoPlano(texto, titulo) {
  const linhas = texto.split('\n');
  const inicio = linhas.findIndex((l) => l.trim() === `## ${titulo}`);
  if (inicio < 0) return '';
  const fim = linhas.findIndex((l, i) => i > inicio && /^## /.test(l));
  return linhas.slice(inicio + 1, fim < 0 ? linhas.length : fim).join('\n').trim();
}

/* Os itens numerados de uma seção: [{ numero, texto }], com a linha recuada de continuação junto do item. */
export function itensNumerados(secao) {
  const itens = [];
  for (const linha of secao.split('\n')) {
    const m = /^(\d+)\. (.*)$/.exec(linha);
    if (m) itens.push({ numero: Number(m[1]), texto: m[2].trim() });
    else if (itens.length > 0 && /^\s+\S/.test(linha)) itens[itens.length - 1].texto += ` ${linha.trim()}`;
  }
  return itens;
}

/* O arquivo do plano que a consulta nomeia: o caminho, o nome do arquivo ou um trecho único do nome. */
export function acharPlano(consulta, raiz = RAIZ) {
  const pasta = join(raiz, PASTA_DOS_PLANOS);
  const nomes = existsSync(pasta) ? readdirSync(pasta).filter((n) => /^\d{4}-\d{2}-\d{2}-.+\.md$/.test(n)).sort() : [];
  const q = String(consulta ?? '').trim();
  const semPasta = q.replace(/\\/g, '/').replace(new RegExp(`^(\\./)?${PASTA_DOS_PLANOS}/`), '');
  const exato = nomes.filter((n) => n === semPasta || n === `${semPasta}.md`);
  const achados = exato.length > 0 ? exato : nomes.filter((n) => q !== '' && n.includes(semPasta));
  if (achados.length === 1) return `${PASTA_DOS_PLANOS}/${achados[0]}`;
  const lista = (achados.length > 0 ? achados : nomes).map((n) => `  ${n}`).join('\n');
  throw new Recusa(achados.length === 0
    ? `recebido o plano ${JSON.stringify(q)}, que não é arquivo de ${PASTA_DOS_PLANOS}/; esperado o caminho, o nome ou um trecho do nome de um plano; os planos da pasta são:\n${lista}`
    : `recebido o plano ${JSON.stringify(q)}, que casa com ${achados.length} arquivos; esperado um só; escreva mais do nome:\n${lista}`);
}

const DATA = /\b\d{4}-\d{2}-\d{2}\b/;
const COMMIT = /\b([0-9a-f]{7,40})\b/g;
const semCodigo = (t) => t.replace(/`[^`]*`/g, ' ');

/* Um commit é um hexadecimal de 7 a 40 dígitos com ao menos uma letra e um algarismo: o número puro é medida, e a palavra
   só de letras é palavra. */
const pareceCommit = (t) => /[a-f]/.test(t) && /\d/.test(t);
function commitDe(texto) {
  for (const m of texto.matchAll(COMMIT)) if (pareceCommit(m[1])) return m[1];
  return null;
}

/* O arquivo de evidência que a frase cita pelo nome (`documentacao.md`): o do banco de provas com esse nome, e quando há mais
   de um, o da pasta com a data mais nova que não passa da data do plano. */
function evidenciaDe(nome, dataDoPlano, raiz) {
  const banco = join(raiz, PASTA_DO_BANCO);
  if (!existsSync(banco)) return null;
  const candidatos = readdirSync(banco, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(banco, e.name, nome)))
    .map((e) => ({ arquivo: `${PASTA_DO_BANCO}/${e.name}/${nome}`, data: DATA.exec(e.name)?.[0] ?? null }))
    .filter((c) => c.data !== null && (dataDoPlano === null || c.data <= dataDoPlano))
    .sort((a, b) => b.data.localeCompare(a.data) || a.arquivo.localeCompare(b.arquivo));
  return candidatos[0] ?? null;
}

/* As medidas do problema: cada frase da seção "Problema observado" que traz número fora de código, com os números, a data e o
   commit. A fonte entre parênteses no fim de uma frase vale para as frases anteriores que ainda não tinham fonte. */
export function medidasDoProblema(texto, { raiz = RAIZ, nomeDoPlano = '' } = {}) {
  const problema = secaoDoPlano(texto, 'Problema observado').replace(/\s+/g, ' ');
  if (problema === '') return [];
  const base = /^\*\*Repositório e base:\*\*\s*(.+?)\s*$/m.exec(texto)?.[1] ?? '';
  const dataDoPlano = DATA.exec(nomeDoPlano)?.[0] ?? null;
  const frases = problema.split(/(?<=[.;:])\s+(?=[\p{Lu}\d`])/u).map((f) => f.trim()).filter(Boolean);
  const medidas = [];
  let semFonte = [];
  for (const frase of frases) {
    const limpa = semCodigo(frase).replace(new RegExp(DATA.source, 'g'), ' ').replace(COMMIT, (t) => (pareceCommit(t) ? ' ' : t));
    const numeros = [...limpa.matchAll(/\d[\d.]*(?:,\d+)?%?/g)].map((m) => m[0].replace(/\.$/, ''));
    const fontes = [...frase.matchAll(/`([\w.-]+\.md)`/g)].map((m) => evidenciaDe(m[1], dataDoPlano, raiz)).filter(Boolean);
    const medida = numeros.length > 0 ? { frase, numeros, data: DATA.exec(frase)?.[0] ?? null, origemDaData: 'frase', commit: commitDe(frase), fonte: null } : null;
    if (medida) { if (medida.data === null) medida.origemDaData = null; medidas.push(medida); semFonte.push(medida); }
    if (/\((?:[^()]*`[\w.-]+\.md`[^()]*)\)[.;:]?$/.test(frase) && fontes.length > 0) {
      for (const m of semFonte) {
        m.fonte = fontes.map((f) => f.arquivo).join(', ');
        if (m.data === null) { m.data = fontes[0].data; m.origemDaData = 'evidência'; }
      }
      semFonte = [];
    }
  }
  for (const m of medidas) {
    if (m.data === null && DATA.test(base)) { m.data = DATA.exec(base)[0]; m.origemDaData = 'base do plano'; }
    if (m.commit === null) m.commit = commitDe(base);
  }
  return medidas;
}

/* O pedido como dado: { plano, titulo, fatia, territorio, gateDeSaida, regras, medidas }. Recusa o plano sem território, sem a
   fatia pedida ou sem gate de saída, dizendo o recebido, o esperado e o conserto. */
export function montarPedido({ plano: consulta, fatia, raiz = RAIZ } = {}) {
  const plano = acharPlano(consulta, raiz);
  const texto = readFileSync(join(raiz, plano), 'utf8');
  const fatias = itensNumerados(secaoDoPlano(texto, 'Fatias'));
  const numero = Number(fatia);
  if (fatia === undefined || fatia === null || fatia === '' || !Number.isInteger(numero)) {
    throw new Recusa(`recebido --fatia=${fatia ?? ''}; esperado o número de uma fatia de ${plano} (${fatias.map((f) => f.numero).join(', ') || 'o plano não tem a seção "Fatias"'}); rode npm run pedido -- <plano> --fatia=<n>.`);
  }
  const escolhida = fatias.find((f) => f.numero === numero);
  if (!escolhida) throw new Recusa(`recebido --fatia=${numero}, que ${plano} não tem; esperado uma de ${fatias.map((f) => f.numero).join(', ') || 'nenhuma (o plano não tem a seção "Fatias")'}; corrija o número ou escreva a fatia no plano.`);
  const territorio = /^\*\*Território:\*\*\s*(.+?)\s*$/m.exec(texto)?.[1] ?? null;
  if (!territorio || !territorio.includes('`')) {
    throw new Recusa(`recebido ${plano} ${territorio ? `com o território "${territorio}"` : 'sem a linha **Território:**'}; esperado a linha **Território:** com os caminhos entre crases, porque o pedido diz ao agente onde ele pode mexer; escreva o território no plano (docs/modelar/planos/README.md diz o formato).`);
  }
  const gateDeSaida = itensNumerados(secaoDoPlano(texto, 'Gate de saída'));
  const gateEmTexto = gateDeSaida.length > 0 ? null : secaoDoPlano(texto, 'Gate de saída');
  if (gateDeSaida.length === 0 && gateEmTexto === '') throw new Recusa(`recebido ${plano} sem a seção "Gate de saída"; esperado a seção com o que prova a entrega; escreva-a no plano.`);
  const nomeDoPlano = plano.split('/').pop();
  return {
    plano,
    titulo: (/^# (.+)$/m.exec(texto)?.[1] ?? nomeDoPlano).trim(),
    estado: /^\*\*Estado:\*\*\s*(.+?)\s*$/m.exec(texto)?.[1] ?? null,
    fatia: escolhida,
    territorio,
    gateDeSaida: gateDeSaida.length > 0 ? gateDeSaida.map((g) => `${g.numero}. ${g.texto}`) : [gateEmTexto],
    regras: REGRAS,
    medidas: medidasDoProblema(texto, { raiz, nomeDoPlano }),
  };
}

function linhaDaMedida(m) {
  const data = m.data === null ? 'o plano não traz a data' : `medida de ${m.data}${m.origemDaData === 'evidência' ? `, a data da evidência ${m.fonte}` : m.origemDaData === 'base do plano' ? ', a data da base do plano' : ''}`;
  const commit = m.commit === null ? 'o plano não traz o commit' : `commit ${m.commit}`;
  const fonte = m.fonte !== null && m.origemDaData !== 'evidência' ? `; evidência ${m.fonte}` : '';
  return `- ${m.frase} (${m.numeros.join(', ')}: ${data}; ${commit}${fonte})`;
}

/* O pedido em texto, pronto para colar; a última linha é a da tarefa. */
export function textoDoPedido(pedido) {
  const partes = [
    `Pedido ao agente: fatia ${pedido.fatia.numero} do plano "${pedido.titulo}"`,
    '',
    `Plano: ${pedido.plano}${pedido.estado && pedido.estado !== 'ativo' ? ` (estado: ${pedido.estado}; só plano ativo autoriza implementação)` : ''}. Leia o plano inteiro antes de começar. A fatia ${pedido.fatia.numero} diz: ${pedido.fatia.texto}`,
    '',
    `Território: ${pedido.territorio}`,
    '',
    'Mexa só nos caminhos do território. Se a tarefa pedir outro arquivo, pare e relate antes de mudá-lo: o `npm run territorio:check` reprova o envio que muda arquivo fora do território dos planos ativos sem declarar o motivo. O que você criar entra no território do plano, na mesma mudança.',
    '',
    'Gate de saída do plano:',
    ...pedido.gateDeSaida,
    '',
    `Regras: siga \`${pedido.regras}\`, que vale para todo agente despachado além do que está neste pedido.`,
  ];
  if (pedido.medidas.length > 0) {
    partes.push('', 'Números do problema do plano, com a data e o commit de cada medida; meça de novo antes de comparar, porque a árvore andou desde então:', ...pedido.medidas.map(linhaDaMedida));
  }
  partes.push('', LINHA_DA_TAREFA);
  return `${partes.join('\n')}\n`;
}

export function executar(argv, { raiz = RAIZ, saida = process.stdout, erro = process.stderr } = {}) {
  if (argv.includes('--ajuda')) { saida.write(AJUDA); return 0; }
  const opcoes = argv.filter((a) => a.startsWith('--'));
  const desconhecida = opcoes.find((a) => a !== '--json' && !a.startsWith('--fatia='));
  const posicionais = argv.filter((a) => !a.startsWith('--'));
  try {
    if (desconhecida) throw new Recusa(`recebido a opção ${desconhecida}; esperado --fatia=<n>, --json ou --ajuda (a opção com valor se escreve com "="); rode npm run pedido -- --ajuda.`);
    if (posicionais.length !== 1) throw new Recusa(`recebido ${posicionais.length} ${posicionais.length === 1 ? 'plano' : 'planos'} (${posicionais.join(' ') || 'nenhum'}); esperado um plano e --fatia=<n>; rode npm run pedido -- <plano> --fatia=<n>.`);
    const pedido = montarPedido({ plano: posicionais[0], fatia: opcoes.find((a) => a.startsWith('--fatia='))?.slice('--fatia='.length), raiz });
    saida.write(argv.includes('--json') ? `${JSON.stringify(pedido, null, 2)}\n` : textoDoPedido(pedido));
    return 0;
  } catch (falha) {
    if (!(falha instanceof Recusa)) throw falha;
    erro.write(`pedido: ${falha.message}\n`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = executar(process.argv.slice(2));
