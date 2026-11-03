/* planos.mjs — confere que os planos ativos são no máximo cinco, cada um com território declarado e sem
   sobreposição, e que nenhum plano executivo ultrapassa o limite curto acordado. */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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

/* CONTRATO DE PLANOS ATIVOS (2026-11-03): até MAXIMO_DE_ATIVOS planos `ativo` ao mesmo tempo, cada um com a linha
   `**Território:**` logo abaixo do Estado, com os caminhos que ele muda (pasta terminada em `/` ou arquivo, entre
   crases e separados por vírgula) ou `nenhum (aguarda aprovação)`. Dois planos ativos não podem ter caminhos em que um
   é prefixo do outro. Os caminhos de CAMINHOS_COMPARTILHADOS pertencem a todos e ficam fora dessa conta. */
export const MAXIMO_DE_ATIVOS = 5;
export const CAMINHOS_COMPARTILHADOS = [
  'docs/modelar/planos/',
  'docs/MAPA.md',
  'docs/modelar/gerado/',
  'tools/gates.mjs',
  '.github/workflows/',
  'package.json',
  'package-lock.json',
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
  const invalido = caminhos.find((c) => !c || c.startsWith('/') || c.includes('..') || /\s/.test(c));
  if (invalido !== undefined) return { problema: `**Território:** caminho inválido "${invalido}"` };
  return { caminhos: caminhos.filter((c) => !CAMINHOS_COMPARTILHADOS.some((s) => sobrepoe(c, s))) };
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
    if (!naRaiz && estado && ESTADOS_EM_JOGO.has(estado)) {
      problemas.push(
        `${nome}: está em subpasta com estado '${estado}'. Plano em jogo mora na raiz de planos/; ` +
        'subpasta guarda o que saiu de cena.',
      );
    }
    textoDe[nome] = texto;
    return { nome, estado, linhas, naRaiz };
  });

  const ativos = planos.filter((plano) => plano.estado === 'ativo');
  if (ativos.length > MAXIMO_DE_ATIVOS) {
    problemas.push(`há ${ativos.length} planos ativos; o máximo é ${MAXIMO_DE_ATIVOS}: ${ativos.map((p) => p.nome).join(', ')}`);
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

function executar() {
  const resultado = conferirPlanos();
  resultado.problemas.push(...conferirPlanoAtivoNosIndices().problemas);
  if (resultado.problemas.length > 0) {
    console.error(`planos:check FALHOU — ${resultado.problemas.length} problema(s):`);
    for (const problema of resultado.problemas) console.error(`  - ${problema}`);
    process.exitCode = 1;
    return;
  }
  console.log(`planos:check ok — ${resultado.planos.length} plano(s), ${resultado.ativos.length} ativo(s)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) executar();
