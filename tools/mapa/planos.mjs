/* planos.mjs — confere que os planos ativos são no máximo seis comuns e nove com os de núcleo, cada um com território
   declarado e sem sobreposição, que o campo Núcleo bate com o território, e que nenhum plano executivo ultrapassa o limite
   curto acordado. */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { planosRemovidosNoEnvio, problemasDeTentativas } from './tentativas-dos-planos.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '../..');
const ESTADOS = new Set(['rascunho', 'pronto', 'ativo', 'concluído', 'cancelado', 'congelado']);
const NOME_PLANO = /^\d{4}-\d{2}-\d{2}-.+\.md$/;

/* G4 — subpasta guarda plano, não o esconde do gate.
 *
 * A leitura era `readdirSync` sem recursão, então qualquer plano movido para
 * uma subpasta deixava de ter estado e limite de linhas conferidos: sumia do
 * gate em vez de ser guardado por ele. A pasta `congelados/` já vinha se
 * apoiando nisso sem que ninguém tivesse decidido isso.
 *
 * Agora todas as subpastas são varridas e conferidas. O que continua valendo
 * só para a raiz é QUEM PODE ESTAR EM JOGO: `ativo`, `pronto` e `rascunho`
 * moram na raiz; subpasta guarda o que saiu de cena. */
const ESTADOS_EM_JOGO = new Set(['ativo', 'pronto', 'rascunho']);

function planosDe(pasta, prefixo = '') {
  const encontrados = [];
  for (const entrada of readdirSync(pasta, { withFileTypes: true })) {
    const relativo = prefixo ? `${prefixo}/${entrada.name}` : entrada.name;
    if (entrada.isDirectory()) {
      encontrados.push(...planosDe(join(pasta, entrada.name), relativo));
    } else if (NOME_PLANO.test(entrada.name)) {
      encontrados.push({ nome: relativo, caminho: join(pasta, entrada.name), naRaiz: prefixo === '' });
    }
  }
  return encontrados.sort((a, b) => a.nome.localeCompare(b.nome));
}

function contarLinhas(texto) {
  const normal = texto.replace(/\r\n/g, '\n').replace(/\n$/, '');
  return normal ? normal.split('\n').length : 0;
}

/* O TETO SUBIU DE 200 PARA 300 EM 2026-09-22. Um plano que vai sendo executado
   carrega duas coisas: o que ele pretende e o que cada fatia achou. A segunda
   cresce e é a parte que não se pode inventar depois, porque é medida. Com 200
   linhas, três fatias seguidas de um plano só gastaram mais tempo cortando
   frase do que executando, e o corte começou a sair de conteúdo em vez de
   repetição — que é o mesmo defeito já registrado sobre `leitura:obrigatoria`:
   teto por número não sabe distinguir o que importa do que sobra.

   Continua havendo teto porque plano é para ser lido inteiro antes de começar,
   e plano que ninguém lê não governa nada. */
const TETO_DE_LINHAS = 300;

/* CONTRATO DE PLANOS ATIVOS (2026-11-03; o teto foi de 5 a 6 em 2026-11-10, com duas sessões em paralelo e um plano novo de
   cada uma sobre a mesma base): até MAXIMO_DE_ATIVOS planos `ativo` ao mesmo tempo, cada um com a linha
   `**Território:**` logo abaixo do Estado, com os caminhos que ele muda (pasta terminada em `/` ou arquivo, entre
   crases e separados por vírgula) ou `nenhum (aguarda aprovação)`. Dois planos ativos não podem ter caminhos em que um
   é prefixo do outro. Os caminhos de CAMINHOS_COMPARTILHADOS pertencem a todos e ficam fora dessa conta. */
export const MAXIMO_DE_ATIVOS = 6;

/* VAGAS DE NÚCLEO (decidido pela pessoa em 2026-11-26, plano do processo e do CI): além dos MAXIMO_DE_ATIVOS de qualquer tipo,
   até VAGAS_EXTRAS_DE_NUCLEO planos ativos a mais, só de ajuste ou melhoria do núcleo. Todo plano em jogo declara
   `**Núcleo:** sim` ou `**Núcleo:** não` abaixo do Estado, e no plano ativo o campo é conferido contra o território: sim pede um
   caminho em PASTA_DO_NUCLEO, e um caminho lá pede sim. O gate não confere quanto do plano é núcleo nem se o caminho existe
   (um arquivo novo ainda não existe): plano de núcleo é o que muda o núcleo, e quem ativa vê o território no cabeçalho. */
export const VAGAS_EXTRAS_DE_NUCLEO = 3;
export const PASTA_DO_NUCLEO = 'procedural/nucleo/';

/* O campo Núcleo de um plano: true, false, ou undefined quando falta ou é ilegível. */
export function nucleoDe(texto) {
  const valor = texto.match(/^\*\*Núcleo:\*\*\s*(.+?)\s*$/m)?.[1]?.toLowerCase().replace(/\.$/, '');
  return valor === 'sim' ? true : valor === 'não' ? false : undefined;
}

/* A recusa do campo: { problema } quando falta, está duplicado ou é ilegível, com a linha recebida; ou {} quando está certo.
   A quase-linha (sem acento, outra caixa, dois-pontos fora, marcador de lista, indentada) é procurada só para ser mostrada. */
export function problemaDoNucleo(texto) {
  const certas = [...texto.matchAll(/^\*\*Núcleo:\*\*.*$/gm)].map((m) => m[0]);
  if (certas.length > 1) return { problema: `tem ${certas.length} linhas **Núcleo:**; deixe uma só, abaixo do Estado` };
  if (certas.length === 1) {
    return nucleoDe(texto) === undefined ? { problema: `a linha **Núcleo:** é ilegível (recebido: ${JSON.stringify(certas[0])}); escreva **Núcleo:** sim ou **Núcleo:** não` } : {};
  }
  const quase = texto.match(/^[ \t]*(?:[-*][ \t]+)?\*\*n[uú]cleo(?::\*\*|\*\*:).*$/gim)?.[0];
  return { problema: `falta a linha **Núcleo:** sim ou **Núcleo:** não abaixo do Estado${quase ? ` (achada a linha ${JSON.stringify(quase.trim())}, escrita fora do padrão)` : ''}; declare se o plano muda ${PASTA_DO_NUCLEO}` };
}

/* Os caminhos do território que ficam no núcleo, antes do filtro dos compartilhados. */
function caminhosNoNucleo(texto) {
  const linha = texto.match(/^\*\*Território:\*\*\s*(.*?)\s*$/m)?.[1] ?? '';
  const nucleo = PASTA_DO_NUCLEO.replace(/\/$/, '');
  return [...linha.matchAll(/`([^`]+)`/g)].map((m) => m[1].trim()).filter((c) => {
    const n = c.toLowerCase().replace(/\/+$/, '');
    return n === nucleo || n.startsWith(`${nucleo}/`) || nucleo.startsWith(`${n}/`);
  });
}
export const CAMINHOS_COMPARTILHADOS = [
  'docs/modelar/planos/',
  'docs/MAPA.md',
  'docs/modelar/gerado/',
  'tools/gates.mjs',
  '.github/workflows/',
  'package.json',
  'package-lock.json',
  'procedural/familias/index.js',
  'docs/modelar/ferramentas-por-objeto.json',
  'tools/modelar/capacidade.mjs',
];

/* O território de um plano: { caminhos } (vazio quando espera aprovação) ou { problema }. */
export function territorioDe(texto) {
  const linha = texto.match(/^\*\*Território:\*\*\s*(.*?)\s*$/m)?.[1];
  if (linha === undefined) return { problema: 'plano ativo sem a linha **Território:**' };
  if (/^nenhum \(aguarda aprovação\)\.?$/i.test(linha)) return { caminhos: [] };
  const caminhos = [...linha.matchAll(/`([^`]+)`/g)].map((m) => m[1].trim());
  if (caminhos.length === 0) {
    return { problema: `**Território:** ilegível; liste caminhos entre crases ou escreva "nenhum (aguarda aprovação)": ${linha}` };
  }
  const invalido = caminhos.find((c) => !c || c.startsWith('/') || c.startsWith('./') || c.includes('//') || c.includes('..') || /\s/.test(c));
  if (invalido !== undefined) return { problema: `**Território:** caminho inválido "${invalido}"` };
  /* sai do território só o caminho igual a um compartilhado ou dentro de uma pasta compartilhada; a pasta-mãe de um
     compartilhado (`procedural/` contém `procedural/familias/index.js`) fica, porque ela muda mais que o compartilhado */
  return { caminhos: caminhos.filter((c) => !CAMINHOS_COMPARTILHADOS.some((s) => c === s || (s.endsWith('/') && c.startsWith(s)))) };
}

/* Há sobreposição quando os caminhos são iguais ou um é pasta (termina em `/`) que contém o outro. */
export function sobrepoe(a, b) {
  return a === b || (a.endsWith('/') && b.startsWith(a)) || (b.endsWith('/') && a.startsWith(b));
}

function sobreposicoes(territorios) {
  const problemas = [];
  for (let i = 0; i < territorios.length; i++) {
    for (let j = i + 1; j < territorios.length; j++) {
      for (const a of territorios[i].caminhos) {
        for (const b of territorios[j].caminhos) {
          if (sobrepoe(a, b)) {
            problemas.push(`territórios sobrepostos entre ${territorios[i].nome} e ${territorios[j].nome}: ${a} e ${b} têm o caminho em comum ${a.length <= b.length ? a : b}`);
          }
        }
      }
    }
  }
  return problemas;
}

/* Os nomes de arquivo dos planos que o bloco "Planos ativos" lista, em ordem de prioridade, ou `undefined` se não houver
   a declaração. O bloco é o resto da linha da marca mais, quando a linha acaba ali, a lista que vem depois (até a primeira
   linha em branco após ela); "nenhum" vale lista vazia. */
const MARCA_DE_ATIVOS = /^(?:-\s*)?(?:\*\*Planos ativos:\*\*|Planos ativos:)(.*)$/mi;

export function ativosDoIndice(texto, marca = MARCA_DE_ATIVOS) {
  const achado = marca.exec(texto);
  if (!achado) return undefined;
  const linhas = [achado[1]];
  if (!achado[1].trim()) {
    const seguintes = texto.slice(achado.index + achado[0].length).replace(/^\n/, '').split('\n');
    let i = 0;
    while (i < seguintes.length && !seguintes[i].trim()) i++;
    for (; i < seguintes.length && seguintes[i].trim(); i++) linhas.push(seguintes[i]);
  } else {
    const seguintes = texto.slice(achado.index + achado[0].length).replace(/^\n/, '').split('\n');
    for (let i = 0; i < seguintes.length && /^\s+\S/.test(seguintes[i]); i++) linhas.push(seguintes[i]);
  }
  const bloco = linhas.join('\n');
  const nomes = [...bloco.matchAll(/\]\(([^)]+\.md)(?:#[^)]*)?\)/g)].map((m) => nomeDoLink(m[1]));
  if (nomes.length === 0 && !/\bnenhum\b/i.test(bloco)) return undefined;
  return nomes;
}

export function conferirPlanos({
  pasta = join(RAIZ, 'docs/modelar/planos'),
  indice = join(pasta, 'README.md'),
  raiz = RAIZ,
  removidos = planosRemovidosNoEnvio(raiz),
} = {}) {
  const problemas = [];
  if (!existsSync(pasta)) return { problemas: [`pasta de planos ausente: ${pasta}`], planos: [], ativos: [] };
  if (!existsSync(indice)) return { problemas: [`índice de planos ausente: ${indice}`], planos: [], ativos: [] };

  const textoDe = {};
  const planos = planosDe(pasta).map(({ nome, caminho, naRaiz }) => {
    const texto = readFileSync(caminho, 'utf8');
    const linhas = contarLinhas(texto);
    const estado = texto.match(/^\*\*Estado:\*\*\s*(.+?)\s*$/mi)?.[1]?.toLowerCase();
    if (linhas > TETO_DE_LINHAS) {
      problemas.push(`${nome}: ${linhas} linhas; o limite é ${TETO_DE_LINHAS}`);
    }
    if (!estado || !ESTADOS.has(estado)) problemas.push(`${nome}: estado ausente ou inválido`);
    /* Plano-raiz (`**Tipo:** raiz`) só gera outros planos e não se ativa: ele não tem implementação nem gate de código,
       e ativá-lo daria um lugar de plano ativo a quem não muda nada. */
    const tipo = texto.match(/^\*\*Tipo:\*\*\s*(.+?)\s*$/mi)?.[1]?.toLowerCase();
    if (tipo === 'raiz' && (estado === 'ativo' || estado === 'pronto')) {
      problemas.push(
        `${nome}: é plano-raiz (**Tipo:** raiz) e está '${estado}'; plano-raiz não se ativa. ` +
        'Volte o estado a rascunho e ative um dos planos que ele gera.',
      );
    }
    if (!naRaiz && estado && ESTADOS_EM_JOGO.has(estado)) {
      problemas.push(
        `${nome}: está em subpasta com estado '${estado}'. Plano em jogo mora na raiz de planos/; ` +
        'subpasta guarda o que saiu de cena.',
      );
    }
    textoDe[nome] = texto;
    return { nome, estado, linhas, naRaiz };
  });

  for (const plano of planos) {
    if (!plano.naRaiz || !ESTADOS_EM_JOGO.has(plano.estado)) continue;
    const { problema: problemaNucleo } = problemaDoNucleo(textoDe[plano.nome]);
    if (problemaNucleo) { problemas.push(`${plano.nome}: ${problemaNucleo}`); continue; }
    const nucleo = nucleoDe(textoDe[plano.nome]);
    plano.nucleo = nucleo;
    if (plano.estado !== 'ativo') continue;
    const noNucleo = caminhosNoNucleo(textoDe[plano.nome]);
    if (nucleo && !noNucleo.length) problemas.push(`${plano.nome}: declara **Núcleo:** sim e o território não tem caminho em ${PASTA_DO_NUCLEO}; ponha o caminho do núcleo no território ou declare não`);
    if (!nucleo && noNucleo.length) problemas.push(`${plano.nome}: declara **Núcleo:** não e o território tem ${noNucleo.join(', ')}; declare sim`);
  }

  /* A tabela de tentativas (2026-11-27): o plano de modelagem na raiz de planos/ que passa a concluído precisa dela no banco de provas. */
  problemas.push(...problemasDeTentativas([
    ...planos.filter((p) => p.naRaiz).map((p) => ({ nome: p.nome, estado: p.estado, texto: textoDe[p.nome] })),
    /* o plano que o envio tirou da raiz (`git rm` à mão, ou movido) responde pela tabela do mesmo modo que o fechamento normal */
    ...removidos.filter((r) => !planos.some((p) => p.naRaiz && p.nome === r.nome)),
  ], raiz));

  /* o plano que o envio tirou da raiz e não está em subpasta nenhuma só sai concluído ou cancelado, como `encerrarPlano` exige */
  for (const r of removidos) {
    if (planos.some((p) => p.nome.split('/').pop() === r.nome) || r.estado === 'concluído' || r.estado === 'cancelado') continue;
    problemas.push(`${r.nome}: o envio tirou o plano da raiz de planos/ com o último Estado gravado '${r.estado ?? 'ausente'}'; só sai plano concluído ou cancelado (npm run planos:encerrar), ou mova-o para uma subpasta`);
  }

  const ativos = planos.filter((plano) => plano.estado === 'ativo');
  const comuns = ativos.filter((p) => p.nucleo !== true);
  if (comuns.length > MAXIMO_DE_ATIVOS) {
    problemas.push(`há ${comuns.length} planos ativos que não são de núcleo; o máximo é ${MAXIMO_DE_ATIVOS}: ${comuns.map((p) => p.nome).join(', ')}`);
  }
  if (ativos.length > MAXIMO_DE_ATIVOS + VAGAS_EXTRAS_DE_NUCLEO) {
    problemas.push(`há ${ativos.length} planos ativos; o máximo é ${MAXIMO_DE_ATIVOS + VAGAS_EXTRAS_DE_NUCLEO}, ${MAXIMO_DE_ATIVOS} de qualquer tipo e ${VAGAS_EXTRAS_DE_NUCLEO} a mais só de núcleo: ${ativos.map((p) => p.nome).join(', ')}`);
  }

  const territorios = [];
  for (const plano of ativos) {
    const { problema, caminhos } = territorioDe(textoDe[plano.nome]);
    if (problema) problemas.push(`${plano.nome}: ${problema}`);
    else territorios.push({ nome: plano.nome, caminhos });
  }
  problemas.push(...sobreposicoes(territorios));

  const textoIndice = readFileSync(indice, 'utf8');
  const listados = ativosDoIndice(textoIndice);
  if (!listados) problemas.push('README.md: declaração "Planos ativos" ausente');
  else {
    const nomes = new Set(ativos.map((p) => p.nome));
    for (const nome of listados) {
      if (!nomes.has(nome)) problemas.push(`README.md lista como ativo um plano que não está ativo: ${nome}`);
    }
    for (const nome of nomes) {
      if (!listados.includes(nome)) problemas.push(`README.md não lista o plano ativo ${nome}`);
    }
    if (new Set(listados).size !== listados.length) problemas.push('README.md lista o mesmo plano ativo mais de uma vez');
  }

  /* Plano em rascunho ou pronto na raiz precisa de link no índice: em 2026-11-05 quatro planos de agosto estavam
     parados na raiz sem aparecer nele, e ninguém os via. */
  const linkados = new Set([...textoIndice.matchAll(/\]\(([^)]+\.md)(?:#[^)]*)?\)/g)].map((m) => nomeDoLink(m[1])));
  for (const plano of planos) {
    if (plano.naRaiz && (plano.estado === 'rascunho' || plano.estado === 'pronto') && !linkados.has(plano.nome)) {
      problemas.push(`README.md não liga o plano em '${plano.estado}' ${plano.nome}; ligue-o no índice ou encerre-o`);
    }
  }

  return { problemas, planos, ativos };
}

/* Os três lugares que dizem quais planos estão ativos (README.md da raiz, docs/modelar/INDEX.md e o índice de planos)
   divergiram sem que nada reprovasse. Cada lugar é reduzido ao conjunto de arquivos apontados, ou ao vazio quando diz
   "nenhum", e os três precisam coincidir. */
function nomeDoLink(destino) {
  return destino.split('#')[0].split('/').pop();
}

const PADROES_DE_ATIVO = {
  raiz: /^Planos ativos:(.*)$/mi,
  indice: /^-\s*Planos ativos:(.*)$/mi,
  planos: /^\*\*Planos ativos:\*\*(.*)$/mi,
};

export function planosAtivosDeclarados(texto, tipo) {
  const nomes = ativosDoIndice(texto, PADROES_DE_ATIVO[tipo]);
  return nomes && [...new Set(nomes)].sort();
}

export function conferirPlanoAtivoNosIndices({
  readme = join(RAIZ, 'README.md'),
  indice = join(RAIZ, 'docs/modelar/INDEX.md'),
  planos = join(RAIZ, 'docs/modelar/planos/README.md'),
} = {}) {
  const fontes = [
    ['README.md', readme, 'raiz', 'parágrafo "Planos ativos:" com os links, ou "Planos ativos: nenhum"'],
    ['docs/modelar/INDEX.md', indice, 'indice', 'linha "- Planos ativos:" com os links, ou "- Planos ativos: nenhum"'],
    ['docs/modelar/planos/README.md', planos, 'planos', 'declaração "**Planos ativos:**" com a lista'],
  ];
  const problemas = [];
  const declarados = [];
  for (const [nome, caminho, tipo, esperado] of fontes) {
    if (!existsSync(caminho)) {
      problemas.push(`${nome}: arquivo ausente`);
      continue;
    }
    const declarado = planosAtivosDeclarados(readFileSync(caminho, 'utf8'), tipo);
    if (!declarado) problemas.push(`${nome}: não declara os planos ativos (esperado ${esperado})`);
    else declarados.push([nome, declarado.join(', ') || 'nenhum']);
  }
  if (new Set(declarados.map(([, valor]) => valor)).size > 1) {
    problemas.push(
      `planos ativos divergem entre os índices: ${declarados.map(([nome, valor]) => `${nome} → ${valor}`).join('; ')}`,
    );
  }
  return { problemas, declarados };
}

/* As linhas "Planos ativos" do README.md da raiz e do docs/modelar/INDEX.md são geradas da lista do índice de planos
   (a fonte, com a ordem de prioridade): o que está entre os marcadores é regravado por `npm run planos:gerar`. */
export const MARCADORES_ATIVOS = ['<!-- planos-ativos:inicio -->', '<!-- planos-ativos:fim -->'];
const COMANDO_GERAR = 'npm run planos:gerar';

/* Os planos da lista "**Planos ativos:**" do índice, na ordem: [{ nome, arquivo }], ou undefined sem a declaração. */
export function ativosDaFonte(texto) {
  const achado = /^\*\*Planos ativos:\*\*(.*)$/mi.exec(texto);
  if (!achado) return undefined;
  const itens = [];
  let comecou = false;
  for (const linha of texto.slice(achado.index + achado[0].length).split('\n')) {
    const item = /^\d+\.\s*\[([^\]]+)\]\(([^)#]+\.md)\)/.exec(linha);
    if (item) { comecou = true; itens.push({ nome: item[1], arquivo: item[2] }); } else if (comecou && !linha.trim()) break;
  }
  return itens;
}

/* "[a](x), [b](y) e [c](z)." com o prefixo de pasta de cada destino; "nenhum." sem planos. */
export function gerarLinksDosAtivos(itens, prefixo) {
  const links = itens.map(({ nome, arquivo }) => `[${nome}](${prefixo}${arquivo})`);
  if (links.length === 0) return 'nenhum.';
  return `${links.length === 1 ? links[0] : `${links.slice(0, -1).join(', ')} e ${links.at(-1)}`}.`;
}

/* O texto com o que está entre os marcadores trocado por `bloco`; null quando os marcadores faltam ou estão fora de ordem. */
export function trocarAtivosEntreMarcadores(texto, bloco) {
  const [inicio, fim] = MARCADORES_ATIVOS;
  const i = texto.indexOf(inicio);
  const f = texto.indexOf(fim);
  if (i < 0 || f < i) return null;
  return `${texto.slice(0, i + inicio.length)}${bloco}${texto.slice(f)}`;
}

const DESTINOS_GERADOS = [
  ['README.md', 'README.md', 'docs/modelar/planos/'],
  ['docs/modelar/INDEX.md', 'docs/modelar/INDEX.md', 'planos/'],
];

function lerGerados(raiz, caminhoFonte) {
  const fonte = ativosDaFonte(readFileSync(join(raiz, caminhoFonte), 'utf8'));
  return DESTINOS_GERADOS.map(([nome, relativo, prefixo]) => {
    const atual = readFileSync(join(raiz, relativo), 'utf8');
    return { nome, relativo, atual, esperado: fonte === undefined ? null : trocarAtivosEntreMarcadores(atual, gerarLinksDosAtivos(fonte, prefixo)), fonte };
  });
}

/* Confere que as linhas geradas estão em dia com a lista do índice de planos. */
export function conferirLinhasGeradas({ raiz = RAIZ, fonte = 'docs/modelar/planos/README.md' } = {}) {
  const problemas = [];
  for (const { nome, atual, esperado, fonte: lista } of lerGerados(raiz, fonte)) {
    if (lista === undefined) { problemas.push(`${fonte}: declaração "Planos ativos" ausente; não há de onde gerar`); break; }
    if (esperado === null) problemas.push(`${nome} perdeu um marcador (${MARCADORES_ATIVOS.join(', ')}): ponha de volta na linha "Planos ativos" e rode \`${COMANDO_GERAR}\``);
    else if (esperado !== atual) problemas.push(`${nome}: a linha "Planos ativos" está desatualizada em relação a ${fonte}; rode \`${COMANDO_GERAR}\``);
  }
  return problemas;
}

/* Regrava as linhas geradas; devolve os problemas (marcador perdido) sem gravar o arquivo que os tem. */
export function gerarLinhas({ raiz = RAIZ, fonte = 'docs/modelar/planos/README.md' } = {}) {
  const problemas = [];
  for (const { nome, relativo, atual, esperado, fonte: lista } of lerGerados(raiz, fonte)) {
    if (lista === undefined) { problemas.push(`${fonte}: declaração "Planos ativos" ausente`); break; }
    if (esperado === null) problemas.push(`${nome} perdeu um marcador (${MARCADORES_ATIVOS.join(', ')}): ponha de volta onde a lista deve ficar`);
    else if (esperado !== atual) writeFileSync(join(raiz, relativo), esperado);
  }
  return problemas;
}

/* ENCERRAR UM PLANO. Desde 2026-11-13 o plano concluído ou cancelado não fica na árvore: ganha uma linha na crônica, com o commit em
   que o texto inteiro está, os links de documento para ele passam a apontar para a crônica, e o arquivo sai. Citação em código e em
   receita não muda: os gates de links e de citações a aceitam quando o nome consta na crônica (`retirados.mjs`). */
export const CRONICA_DOS_ENCERRADOS = 'docs/modelar/decisoes/PLANOS-ENCERRADOS.md';

/* A linha nova entra antes da primeira linha de plano da crônica, que está em ordem de data decrescente. */
export function acrescentarNaCronica(cronica, nome, linha, commit) {
  const entrada = `- \`${nome}\`: ${linha.trim().replace(/\.$/, '')}. O texto está no commit \`${commit}\`, em \`docs/modelar/planos/${nome}\`.`;
  const linhas = cronica.split('\n');
  const primeira = linhas.findIndex((l) => l.startsWith('- `'));
  if (primeira < 0) throw new Error('a crônica não tem nenhuma linha de plano');
  linhas.splice(primeira, 0, entrada);
  return linhas.join('\n');
}

/* Troca, num documento, todo link markdown que resolve para o plano pelo link para a crônica, mantendo o texto do link. */
export function trocarLinksDoPlano(texto, arquivo, plano, cronica) {
  const pasta = dirname(arquivo);
  return texto.replace(/(\]\()([^)#\s]+)(#[^)\s]*)?\)/g, (tudo, abre, alvo) => {
    if (alvo.includes('://') || join(pasta, alvo).split(sep).join('/') !== plano) return tudo;
    return `${abre}${relative(pasta, cronica).replace(/\\/g, '/') || cronica.split('/').pop()})`;
  });
}

/* Regera todo `DOSSIE.md` de objeto na raiz (`tools/modelar/dossie-do-objeto.mjs --todos`): `{ texto, falhou }`, o texto que ele imprime ou,
   na falha, o que ele disse: a regeração segue objeto a objeto, e a mensagem de falha lista os dossiês regravados e os que não. */
function regerarDossies(raiz) {
  try {
    return { texto: execFileSync(process.execPath, [join(RAIZ, 'tools/modelar/dossie-do-objeto.mjs'), '--todos', `--raiz=${raiz}`], { cwd: raiz, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(), falhou: false };
  } catch (erro) {
    return { texto: `a regeração dos dossiês falhou (${String(erro.stderr || erro.message).trim()}); o plano já saiu e a crônica já tem a linha: conserte o que ela diz e rode npm run dossie -- --todos`, falhou: true };
  }
}

export function encerrarPlano(nome, linha, { raiz = RAIZ } = {}) {
  const git = (...args) => execFileSync('git', args, { cwd: raiz, encoding: 'utf8' }).trim();
  const plano = `docs/modelar/planos/${nome}`;
  if (!existsSync(join(raiz, plano))) throw new Error(`${plano} não existe na raiz de planos/`);
  if (!linha || !linha.trim()) throw new Error('falta --linha "<o que o plano entregou ou decidiu>"');
  const texto = readFileSync(join(raiz, plano), 'utf8');
  const estado = texto.match(/^\*\*Estado:\*\*\s*(.+?)\s*$/mi)?.[1]?.toLowerCase();
  if (estado !== 'concluído' && estado !== 'cancelado') throw new Error(`${nome}: o Estado é '${estado}'; encerra-se plano concluído ou cancelado`);
  if (/## Fechamento\s+Preencher ao concluir ou cancelar/.test(texto)) throw new Error(`${nome}: o Fechamento não foi preenchido`);
  /* a mesma recusa da conferência dos planos, antes de a crônica e o `git rm` mudarem qualquer coisa */
  const deTentativas = problemasDeTentativas([{ nome, estado, texto }], raiz);
  if (deTentativas.length) throw new Error(deTentativas.join('; '));
  if (git('status', '--porcelain', '--', plano) !== '') throw new Error(`${nome}: grave o commit do plano fechado antes de encerrar; a crônica cita esse commit`);
  const commit = git('log', '-1', '--format=%h', '--', plano);
  const cronica = join(raiz, CRONICA_DOS_ENCERRADOS);
  writeFileSync(cronica, acrescentarNaCronica(readFileSync(cronica, 'utf8'), nome, linha, commit));
  let trocados = 0;
  for (const arquivo of git('ls-files', '*.md').split('\n').filter((f) => f && f !== plano)) {
    const antes = readFileSync(join(raiz, arquivo), 'utf8');
    const depois = trocarLinksDoPlano(antes, arquivo, plano, CRONICA_DOS_ENCERRADOS);
    if (depois !== antes) { writeFileSync(join(raiz, arquivo), depois); trocados += 1; }
  }
  git('rm', '-q', '--', plano);
  /* o DOSSIE.md de objeto lista os planos que cobrem a pasta dele: sem o plano que saiu, ele regera da crônica e dos planos que ficam */
  const { texto: regerados, falhou: dossiesFalharam } = regerarDossies(raiz);
  return { commit, trocados, regerados, dossiesFalharam };
}

function executar() {
  const iEncerrar = process.argv.indexOf('--encerrar');
  if (iEncerrar >= 0) {
    const iLinha = process.argv.indexOf('--linha');
    try {
      const { commit, trocados, regerados, dossiesFalharam } = encerrarPlano(process.argv[iEncerrar + 1], iLinha >= 0 ? process.argv[iLinha + 1] : '');
      if (dossiesFalharam) process.exitCode = 1;
      console[dossiesFalharam ? 'error' : 'log'](`planos:encerrar ${dossiesFalharam ? 'ENCERROU COM FALHA NOS DOSSIÊS' : 'ok'} — texto no commit ${commit}, ${trocados} documento(s) com link trocado; tire o plano da lista de ativos do índice se ele estava lá, e rode npm run planos:gerar e npm run mapa${regerados ? `; ${regerados}` : ''}`);
    } catch (erro) { console.error(`planos:encerrar FALHOU — ${erro.message}`); process.exitCode = 1; }
    return;
  }
  if (process.argv.includes('--gerar')) {
    const problemas = gerarLinhas();
    for (const problema of problemas) console.error(problema);
    if (problemas.length > 0) process.exitCode = 1;
    else console.log('planos:gerar ok — linhas "Planos ativos" do README.md e do INDEX.md regravadas da fonte');
    return;
  }
  const resultado = conferirPlanos();
  resultado.problemas.push(...conferirPlanoAtivoNosIndices().problemas, ...conferirLinhasGeradas());
  if (resultado.problemas.length > 0) {
    console.error(`planos:check FALHOU — ${resultado.problemas.length} problema(s):`);
    for (const problema of resultado.problemas) console.error(`  - ${problema}`);
    process.exitCode = 1;
    return;
  }
  const deNucleo = resultado.ativos.filter((p) => p.nucleo === true).length;
  console.log(`planos:check ok — ${resultado.planos.length} plano(s), ${resultado.ativos.length} ativo(s), ${deNucleo} de núcleo (até ${MAXIMO_DE_ATIVOS} comuns e ${VAGAS_EXTRAS_DE_NUCLEO} a mais de núcleo)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) executar();
