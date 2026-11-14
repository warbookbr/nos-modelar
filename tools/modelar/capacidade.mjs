#!/usr/bin/env node
/* capacidade.mjs — a primeira parada de quem vai usar um ajudante de gaiola: `npm run capacidade` lista, `npm run capacidade -- <nome>` dá a ficha.
 *
 * A ficha não tem fonte própria: é o trecho do comentário de cabeçalho do arquivo do ajudante que começa na linha `FICHA <nome>` e termina na
 * linha `FIM DA FICHA`. Este comando só o recorta e imprime sem o prefixo de comentário. O trecho segue uma ordem fixa: `serve:` (para que serve),
 * `quando:` (quando usar em vez das outras), `campos:` (um campo por linha, recuado dois espaços, `nome: texto`), `exemplo:` (código mínimo
 * que o teste executa), `peça:` (uma peça do acervo que usa). A ficha cabe em 60 linhas, e o teste confere isso e que cada campo citado
 * aparece no código do arquivo.
 *
 * As operações do núcleo (REGISTRO_OPERACOES) e as extensões (registro com extensões, montado como em tools/catalogo/gerar-catalogo-capacidades.mjs)
 * também têm ficha aqui, sem texto escrito à mão: a intenção, os campos do schema de argumentos (nome, tipo, obrigatório, descrição) e o exemplo
 * são o que `uso` do registro publica, a mesma fonte de docs/modelar/gerado/schemas-operacoes.json. Este arquivo só lê o registro.
 *
 * Uso: npm run capacidade [-- <nome>]   (node tools/modelar/capacidade.mjs [<nome>] [--ajuda]) */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { REGISTRO_OPERACOES, criarRegistroComExtensoes } from '../../procedural/nucleo/entrada.js';
import { MANIFESTO as MANIFESTO_ARTICULACAO } from '../../procedural/extensoes/articulacao/manifesto.js';
import { implementar as implementarArticulacao } from '../../procedural/extensoes/articulacao/implementacao.js';
import { MANIFESTO as MANIFESTO_CASCA } from '../../procedural/extensoes/casca/manifesto.js';
import { implementar as implementarCasca } from '../../procedural/extensoes/casca/implementacao.js';
import { EXTENSAO as EXTENSAO_CHAPA_DOBRADA } from '../../procedural/extensoes/chapa-dobrada/index.js';
import { MANIFESTO as MANIFESTO_BARRAS } from '../../procedural/extensoes/estrutura-de-barras/manifesto.js';
import { implementar as implementarBarras } from '../../procedural/extensoes/estrutura-de-barras/implementacao.js';
import { MANIFESTO as MANIFESTO_PRISMA } from '../../procedural/extensoes/prisma-triangular/manifesto.js';
import { implementar as implementarPrisma } from '../../procedural/extensoes/prisma-triangular/implementacao.js';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

const ESTACOES = 'procedural/nucleo/gaiola-por-estacoes.js';

/* arquivo: onde está o comentário com a ficha; funcao e de: a função que o exemplo chama e o arquivo que a exporta; usa: as outras funções
   que o exemplo chama, pelo nome e pelo arquivo que as exporta (o ajudante que lê a saída de outro ajudante). As opções de
   gaiolaPorEstacoes (interpolada, anéis) têm ficha própria, mas o exemplo delas chama gaiolaPorEstacoes. */
export const CAPACIDADES = Object.freeze({
  gaiolaPorEstacoes: { arquivo: ESTACOES, funcao: 'gaiolaPorEstacoes', de: ESTACOES },
  gaiolaPorRede: { arquivo: 'procedural/nucleo/gaiola-por-rede.js', funcao: 'gaiolaPorRede', de: 'procedural/nucleo/gaiola-por-rede.js' },
  gaiolaVarrida: { arquivo: 'procedural/nucleo/gaiola-varrida.js', funcao: 'gaiolaVarrida', de: 'procedural/nucleo/gaiola-varrida.js' },
  gaiolaInterpolada: { arquivo: 'procedural/nucleo/gaiola-interpolada.js', funcao: 'gaiolaPorEstacoes', de: ESTACOES },
  gaiolaAneis: { arquivo: 'procedural/nucleo/gaiola-aneis.js', funcao: 'gaiolaPorEstacoes', de: ESTACOES },
  gaiolaPorLacos: { arquivo: 'procedural/nucleo/gaiola-por-lacos.js', funcao: 'gaiolaPorLacos', de: 'procedural/nucleo/gaiola-por-lacos.js' },
  lacosPelasVistas: { arquivo: 'procedural/nucleo/lacos-pelas-vistas.js', funcao: 'lacosPelasVistas', de: 'procedural/nucleo/lacos-pelas-vistas.js' },
  paineisPorVaos: { arquivo: 'procedural/nucleo/paineis-por-vaos.js', funcao: 'paineisPorVaos', de: 'procedural/nucleo/paineis-por-vaos.js' },
  curvaDaGaiola: { arquivo: 'procedural/nucleo/curva-da-gaiola.js', funcao: 'curvaDaGaiola', de: 'procedural/nucleo/curva-da-gaiola.js', usa: { gaiolaPorLacos: 'procedural/nucleo/gaiola-por-lacos.js' } },
  normalDaGaiola: { arquivo: 'procedural/nucleo/normal-da-gaiola.js', funcao: 'conferirNormalDaGaiola', de: 'procedural/nucleo/normal-da-gaiola.js' },
  vaoEntrePartes: { arquivo: 'tools/modelar/vao-entre-partes.mjs', funcao: 'vaoEntrePartes', de: 'tools/modelar/vao-entre-partes.mjs' },
  instanciaDeFamilia: { arquivo: 'tools/modelar/instancia-de-familia.mjs', funcao: 'instanciaDeFamilia', de: 'tools/modelar/instancia-de-familia.mjs' },
  raioDaAresta: { arquivo: 'tools/modelar/raio-da-aresta.mjs', funcao: 'medirPerfil', de: 'tools/modelar/raio-da-aresta.mjs' },
  ondulacaoDaSuperficie: { arquivo: 'tools/modelar/ondulacao-da-superficie.mjs', funcao: 'ondulacaoDaReceita', de: 'tools/modelar/ondulacao-da-superficie.mjs' },
  apoioDoVinco: { arquivo: 'procedural/nucleo/apoio-do-vinco.js', funcao: 'apoioDoVinco', de: 'procedural/nucleo/apoio-do-vinco.js' },
  chapaDeContorno: { arquivo: 'procedural/nucleo/chapa-de-contorno.js', funcao: 'chapaDeContorno', de: 'procedural/nucleo/chapa-de-contorno.js' },
  corpoDeSecaoVariavel: { arquivo: 'procedural/nucleo/corpo-de-secao-variavel.js', funcao: 'corpoDeSecaoVariavel', de: 'procedural/nucleo/corpo-de-secao-variavel.js' },
  corpoPorFatias: { arquivo: 'procedural/nucleo/corpo-por-fatias.js', funcao: 'corpoPorFatias', de: 'procedural/nucleo/corpo-por-fatias.js' },
  furoPassante: { arquivo: 'procedural/nucleo/furo-passante.js', funcao: 'furoPassante', de: 'procedural/nucleo/furo-passante.js' },
  recortarArcoNoPerfil: { arquivo: 'procedural/nucleo/curva2d.js', funcao: 'recortarArcoNoPerfil', de: 'procedural/nucleo/curva2d.js' },
  retanguloArredondado: { arquivo: 'procedural/nucleo/contorno.js', funcao: 'retanguloArredondado', de: 'procedural/nucleo/contorno.js' },
  areaDoContorno: { arquivo: 'procedural/nucleo/contorno.js', funcao: 'areaDoContorno', de: 'procedural/nucleo/contorno.js' },
  deslocarContorno: { arquivo: 'procedural/nucleo/contorno.js', funcao: 'deslocarContorno', de: 'procedural/nucleo/contorno.js' },
  contornoComArcos: { arquivo: 'procedural/nucleo/arcos-do-contorno.js', funcao: 'contornoComArcos', de: 'procedural/nucleo/arcos-do-contorno.js' },
});

export const LIMITE_DE_LINHAS = 60;

/* As cinco extensões, na ordem e com as pastas de gerar-catalogo-capacidades.mjs. */
const EXTENSOES = [
  [MANIFESTO_CASCA, implementarCasca, 'casca'],
  [EXTENSAO_CHAPA_DOBRADA.manifesto, EXTENSAO_CHAPA_DOBRADA.implementacao, 'chapa-dobrada'],
  [MANIFESTO_ARTICULACAO, implementarArticulacao, 'articulacao'],
  [MANIFESTO_BARRAS, implementarBarras, 'estrutura-de-barras'],
  [MANIFESTO_PRISMA, implementarPrisma, 'prisma-triangular'],
];

/** { operacoes: Map nome -> item do registro, extensoes: Map nome -> { item, pasta, manifesto } } */
export function operacoesPublicadas() {
  const operacoes = new Map(REGISTRO_OPERACOES.listar().map((o) => [o.nome, o]));
  const comExtensoes = criarRegistroComExtensoes({ registroBase: REGISTRO_OPERACOES, extensoes: EXTENSOES.map(([manifesto, implementacao]) => ({ manifesto, implementacao })) });
  const porNome = new Map(comExtensoes.listar().map((o) => [o.nome, o]));
  const extensoes = new Map();
  for (const [manifesto, , pasta] of EXTENSOES) {
    const item = porNome.get(manifesto.operacao.nome);
    if (item) extensoes.set(item.nome, { item, pasta, modulo: manifesto.id });
  }
  return { operacoes, extensoes };
}

const tipoDoCampo = (c) => {
  if (!c || typeof c !== 'object') return 'qualquer';
  if (c.enum) return c.enum.map((v) => JSON.stringify(v)).join('|');
  if (c.type) return Array.isArray(c.type) ? c.type.join('|') : c.type;
  if (c.anyOf) return [...new Set(c.anyOf.map(tipoDoCampo))].join('|');
  return 'qualquer';
};

/** A ficha de uma operação, só do que `uso` publica: para que serve, os campos (um por linha) e o exemplo (um passo por linha). */
export function fichaDaOperacao(item, { extensao = null } = {}) {
  const uso = item.uso;
  if (!uso) return `${item.nome}\n(o registro não publica contrato de uso para esta operação)\n`;
  const schema = uso.schemaArgumentos ?? {};
  const obrigatorios = new Set(schema.required ?? []);
  const campos = Object.entries(schema.properties ?? {});
  const linhas = [`${item.nome}  (${extensao ? 'extensão' : 'operação do núcleo'}, ${item.id})`];
  const naReceita = extensao?.pasta === 'estrutura-de-barras' ? 'disponível na receita de peça (executarReceita usa REGISTRO_DA_RECEITA, em src/autoria/executar-receita.js, quando ninguém passa registro); fora dela ' : '';
  if (extensao) linhas.push(`ligação: ${naReceita}só existe no registro com extensões: criarRegistroComExtensoes({ registroBase: REGISTRO_OPERACOES, extensoes: [{ manifesto, implementacao }] }); manifesto em procedural/extensoes/${extensao.pasta}/manifesto.js`);
  linhas.push(`serve: ${uso.intencao}`, `campos${campos.length ? ' (nome, tipo, obrigatório ou opcional, descrição):' : ': nenhum'}`);
  for (const [nome, c] of campos) linhas.push(`  ${nome}: ${tipoDoCampo(c)}, ${obrigatorios.has(nome) ? 'obrigatório' : 'opcional'}${c?.description ? `, ${c.description}` : ''}`);
  if (uso.exemplo?.PASSOS?.length) {
    linhas.push('exemplo (PASSOS, de docs/modelar/gerado/schemas-operacoes.json):');
    for (const passo of uso.exemplo.PASSOS) linhas.push(`  ${JSON.stringify(passo)}`);
  } else linhas.push('exemplo: o registro não publica');
  return `${linhas.join('\n')}\n`;
}

/** Os nomes mais próximos de `nome` entre `candidatos`: contêm-no ou são contidos, ou têm distância de edição curta. */
export function maisProximos(nome, candidatos, limite = 5) {
  const q = semAcento(nome);
  const dist = (a, b) => {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j += 1) d[0][j] = j;
    for (let i = 1; i <= a.length; i += 1) for (let j = 1; j <= b.length; j += 1) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  };
  return candidatos.map((c) => {
    const k = semAcento(c);
    const contem = q.length >= 3 && (k.includes(q) || q.includes(k));
    return { c, pontos: contem ? 0 : dist(q, k) };
  }).filter((x) => x.pontos === 0 || x.pontos <= Math.max(2, Math.floor(q.length / 3))).sort((a, b) => a.pontos - b.pontos || a.c.localeCompare(b.c)).slice(0, limite).map((x) => x.c);
}

/** O que `npm run capacidade -- <nome>` reconhece: { tipo: 'ficha'|'operacao'|'extensao', nome } ou null; sem diferenciar maiúsculas. */
export function classificarNome(nome) {
  const q = nome.toLowerCase();
  const ficha = Object.keys(CAPACIDADES).find((n) => n.toLowerCase() === q);
  if (ficha) return { tipo: 'ficha', nome: ficha };
  const { operacoes, extensoes } = operacoesPublicadas();
  const op = [...operacoes.keys()].find((n) => n.toLowerCase() === q);
  if (op) return { tipo: 'operacao', nome: op };
  const ex = [...extensoes.keys()].find((n) => n.toLowerCase() === q);
  return ex ? { tipo: 'extensao', nome: ex } : null;
}

/** Os nomes de operações do núcleo e de extensões, para listar e para a busca do `comecar`. */
export function nomesPublicados() {
  const { operacoes, extensoes } = operacoesPublicadas();
  return { operacoes: [...operacoes.keys()].sort(), extensoes: [...extensoes.keys()].sort() };
}

const AJUDA = `npm run capacidade [-- <nome>]  (node tools/modelar/capacidade.mjs)
Sem nome, lista as capacidades (de gaiola, de painel, de vão e de instância de família) com uma linha cada, e depois os nomes das operações do núcleo e das extensões. Com o nome de uma capacidade, imprime a ficha:
para que serve, quando usar em vez das outras, os campos com uma linha cada, o exemplo mínimo e uma peça do acervo que a usa; ela é recortada do comentário de cabeçalho do arquivo
da capacidade, e não existe em outro lugar. Com o nome de uma operação ou extensão, imprime a ficha que o registro publica: para que serve, os campos (nome, tipo, obrigatório, descrição) e o exemplo.
`;

/** O comentário de cabeçalho do arquivo (o primeiro bloco `/* ... *\/`), com o prefixo de comentário tirado de cada linha. */
function cabecalho(fonte) {
  const m = /\/\*([\s\S]*?)\*\//.exec(fonte);
  if (!m) return { linhas: [], fim: 0 };
  return { linhas: m[1].split('\n').map((l) => l.replace(/^\s*\* ?/, '')), fim: m.index + m[0].length };
}

/** lerFicha(fonte, nome?) -> { nome, linhas, serve, campos, codigo } ou null; `codigo` é o arquivo sem o comentário de cabeçalho.
 *  Um cabeçalho pode ter várias fichas (contorno.js): com `nome`, vale a que se chama assim; sem ele, a primeira. */
export function lerFicha(fonte, nome) {
  const { linhas: cruas, fim } = cabecalho(fonte);
  /* um cabeçalho sem `*` à esquerda (contorno.js, curva2d.js) recuou a ficha: o recuo da linha FICHA sai de todas */
  const recuo = (l) => /^ */.exec(l)[0].length;
  const de = cruas.findIndex((l) => (nome ? l.trim() === `FICHA ${nome}` : /^ *FICHA \S+\s*$/.test(l)));
  const linhas = de < 0 ? cruas : cruas.map((l) => (recuo(l) >= recuo(cruas[de]) ? l.slice(recuo(cruas[de])) : l));
  const ate = linhas.findIndex((l, i) => i > de && /^FIM DA FICHA\s*$/.test(l));
  if (de < 0 || ate < 0) return null;
  const corpo = linhas.slice(de + 1, ate);
  const serve = (corpo.find((l) => l.startsWith('serve: ')) ?? '').slice('serve: '.length).trim();
  const iCampos = corpo.findIndex((l) => l === 'campos:');
  const campos = [];
  for (let i = iCampos + 1; iCampos >= 0 && i < corpo.length && /^ {2}\S/.test(corpo[i]); i += 1) {
    const m = /^ {2}(\w+): /.exec(corpo[i]);
    if (m) campos.push(m[1]);
  }
  const exemploDe = corpo.findIndex((l) => l === 'exemplo:');
  const exemploAte = corpo.findIndex((l, i) => i > exemploDe && !/^ {2}/.test(l));
  const exemplo = exemploDe < 0 ? '' : corpo.slice(exemploDe + 1, exemploAte < 0 ? corpo.length : exemploAte).join('\n');
  return { nome: linhas[de].slice('FICHA '.length).trim(), linhas: corpo, serve, campos, exemplo, codigo: fonte.slice(fim) };
}

function fichaDe(nome) {
  return lerFicha(readFileSync(resolve(REPO, CAPACIDADES[nome].arquivo), 'utf8'), nome);
}

const semAcento = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const listar = () => Object.keys(CAPACIDADES).map((n) => `${n.padEnd(20)} ${fichaDe(n)?.serve ?? '(sem ficha)'}`).join('\n');

const listarTudo = () => {
  const { operacoes, extensoes } = nomesPublicados();
  return `${listar()}\n\nOperações do núcleo (npm run capacidade -- <nome>):\n${operacoes.map((n) => `  ${n}`).join('\n')}\n\nExtensões (só existem no registro com extensões):\n${extensoes.map((n) => `  ${n}`).join('\n')}`;
};

export function executar(args) {
  if (args.includes('--ajuda')) return { codigo: 0, stdout: AJUDA, stderr: '' };
  const nome = args.find((a) => !a.startsWith('--'));
  if (!nome) return { codigo: 0, stdout: `${listarTudo()}\n`, stderr: '' };
  const publicada = classificarNome(nome);
  /* a palavra: as capacidades cuja ficha a cita em `serve` ou `quando` (painel, vão, linha de vão, porta, capô) */
  const palavras = semAcento(args.filter((x) => !x.startsWith('--')).join(' ')).split(/\s+/).filter((w) => w.length >= 3);
  const citam = Object.keys(CAPACIDADES).filter((n) => {
    const f = fichaDe(n);
    const texto = semAcento((f?.linhas ?? []).filter((l) => l.startsWith('serve: ') || l.startsWith('quando: ')).join(' '));
    return palavras.length > 0 && palavras.every((w) => texto.includes(w));
  });
  if (publicada && publicada.tipo !== 'ficha') {
    const { operacoes, extensoes } = operacoesPublicadas();
    const extensao = publicada.tipo === 'extensao' ? extensoes.get(publicada.nome) : null;
    /* O nome de operação também pode ser a palavra que leva a um ajudante: `filete` é operação, e é por ela que se acha o
       `raioDaAresta`. A ficha da operação sai primeiro, e as fichas de ajudante que citam a palavra vêm depois. */
    const ficha = fichaDaOperacao(extensao ? extensao.item : operacoes.get(publicada.nome), { extensao });
    const tambem = citam.length ? `\nfichas de ajudante que citam '${nome}':\n${citam.map((n) => `${n.padEnd(20)} ${fichaDe(n).serve}`).join('\n')}\n` : '';
    return { codigo: 0, stdout: `${ficha}${tambem}`, stderr: '' };
  }
  const achado = publicada?.nome;
  if (!achado) {
    if (citam.length) return { codigo: 0, stdout: `'${nome}' não é o nome de uma capacidade; as que a citam:\n${citam.map((n) => `${n.padEnd(20)} ${fichaDe(n).serve}`).join('\n')}\n`, stderr: '' };
  }
  if (!achado) {
    const { operacoes, extensoes } = nomesPublicados();
    const perto = maisProximos(nome, [...Object.keys(CAPACIDADES), ...operacoes, ...extensoes]);
    return { codigo: 2, stdout: '', stderr: `'${nome}' não é ficha, operação nem extensão.${perto.length ? ` Os nomes mais próximos: ${perto.join(', ')}.` : ''}\nnpm run capacidade lista todos os nomes.\n` };
  }
  const ficha = fichaDe(achado);
  if (!ficha) return { codigo: 2, stdout: '', stderr: `${CAPACIDADES[achado].arquivo} não tem o trecho FICHA ... FIM DA FICHA no comentário de cabeçalho\n` };
  return { codigo: 0, stdout: `${achado}  (${CAPACIDADES[achado].arquivo})\n${ficha.linhas.join('\n')}\n`, stderr: '' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const r = executar(process.argv.slice(2));
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  process.exit(r.codigo);
}
