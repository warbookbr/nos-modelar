#!/usr/bin/env node
/* receita-esqueleto.mjs — o esqueleto da receita de uma peça que ainda vai ser alinhada.
 *
 * `npm run receita:esqueleto -- <peça>` cria `procedural/pecas/<peça>/receita.js` com `PLANO` (objeto, referencias, escala, partes e
 * criteriosDeReprovacao), `contatos: []`, `TABELA = {}` e nenhum passo. O alinhamento escreve o combinado direto no `PLANO`. Os campos
 * saem vazios, e o normalizador do `PLANO` recusa a receita até todos estarem preenchidos: `--objeto`, `--escala` e `--partes` só
 * adiantam o que a pessoa já disse, e a parte nasce com forma e técnica vazias, que a recusa também cobra.
 *
 * Recusa se a receita já existe. Uso: npm run receita:esqueleto -- <peça> [--objeto=<texto>] [--escala=<medida>:<milímetros>]
 * [--partes=a,b,c]   (node tools/modelar/receita-esqueleto.mjs <peça> [--ajuda]) */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { lerArgumentos } from './argumentos.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const NOME_DE_PECA = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const NOME_DE_PARTE = /^[a-zA-Z][a-zA-Z0-9]*$/;

const AJUDA = `npm run receita:esqueleto -- <peça> [--objeto=<texto>] [--escala=<medida>:<milímetros>] [--partes=a,b,c]
Cria procedural/pecas/<peça>/receita.js com o PLANO vazio, contatos [] e TABELA {}, sem passos. O PLANO sai vazio de propósito: o
normalizador o recusa até o alinhamento preencher objeto, referencias, escala, partes (com forma e técnica) e criteriosDeReprovacao.

  <peça>      nome da pasta: minúsculas, dígitos e hífen (furgao-realista)
  --objeto    o objeto e o recorte dele, já dito pela pessoa
  --escala    uma medida real e seu valor em milímetros, "comprimento total:4200"
  --partes    nomes das partes em camelCase, separados por vírgula (paraLamaDir,capo)
  --ajuda     este texto

Recusa se a receita já existe. Depois: escreva o combinado no PLANO, em referencias/ ponha as imagens versionáveis e, as de estudo com
marca, em referencias/locais/ (ignorada pelo git).
`;

const literal = (texto) => JSON.stringify(texto);

/** O texto da receita-esqueleto. `partes` é a lista de nomes; cada uma nasce com `forma` e `tecnica` vazias. */
export function textoDoEsqueleto({ peca, objeto = '', escala = { medida: '', milimetros: 0 }, partes = [] }) {
  const itens = partes.map((nome) => `    { nome: ${literal(nome)}, forma: '', tecnica: '' },`).join('\n');
  return `/* ${peca} — esqueleto criado por \`npm run receita:esqueleto\`. O PLANO sai vazio e é recusado até o alinhamento o preencher
 * (skill alinhar-modelagem); a receita não tem passo nem medida, e a TABELA é onde as medidas vão morar. */

export const TABELA = {};

export const CONTATOS = [];

/* A PREENCHER no alinhamento: objeto, referencias (imagens em referencias/; as de estudo em referencias/locais/), escala, partes
 * (forma e tecnica de cada uma) e criteriosDeReprovacao (cada um uma frase verificável). */
export const PLANO = {
  objeto: ${literal(objeto)},
  referencias: [],
  escala: { medida: ${literal(escala.medida)}, milimetros: ${escala.milimetros} },
  partes: [${itens ? `\n${itens}\n  ` : ''}],
  criteriosDeReprovacao: [],
};

const receita = {
  meta: { nome: ${literal(peca)}, desc: '' },
  PARAMS: TABELA,
  PLANO,
  contatos: CONTATOS,
  PASSOS: [],
};

export default receita;
`;
}

function lerEscala(texto) {
  const corte = texto.lastIndexOf(':');
  const medida = corte < 0 ? '' : texto.slice(0, corte).trim();
  const milimetros = Number(corte < 0 ? NaN : texto.slice(corte + 1));
  if (!medida || !Number.isFinite(milimetros) || milimetros <= 0) {
    throw new Error(`--escala precisa ser <medida>:<milímetros>, como "comprimento total:4200"; veio ${JSON.stringify(texto)}.`);
  }
  return { medida, milimetros };
}

/** Cria o esqueleto. `raiz` é o repositório (injetável para o teste). Devolve `{ codigo, stdout, stderr }`. */
export function executar(argv, { raiz = REPO } = {}) {
  let lido;
  try {
    lido = lerArgumentos(argv, { opcoes: ['objeto', 'escala', 'partes'], bandeiras: ['ajuda'], posicional: { nome: 'a peça', obrigatorio: false } });
  } catch (erro) {
    return { codigo: 2, stdout: '', stderr: `receita:esqueleto: ${erro.message}\n${AJUDA}` };
  }
  if (lido.bandeira('ajuda')) return { codigo: 0, stdout: AJUDA, stderr: '' };
  const peca = lido.posicional;
  const falha = (mensagem) => ({ codigo: 2, stdout: '', stderr: `receita:esqueleto: ${mensagem}\n` });
  if (!peca) return { codigo: 2, stdout: '', stderr: `receita:esqueleto: diga a peça.\n${AJUDA}` };
  if (!NOME_DE_PECA.test(peca)) return falha(`'${peca}' não é nome de peça: use minúsculas, dígitos e hífen.`);
  let escala;
  let partes = [];
  try {
    if (lido.opcao('escala') !== null) escala = lerEscala(lido.opcao('escala'));
    if (lido.opcao('partes') !== null) {
      partes = lido.opcao('partes').split(',').map((p) => p.trim()).filter(Boolean);
      const ruim = partes.find((p) => !NOME_DE_PARTE.test(p));
      if (ruim !== undefined) throw new Error(`--partes: '${ruim}' não é nome de parte (camelCase, letras e dígitos).`);
      if (new Set(partes).size !== partes.length) throw new Error('--partes não pode repetir nome.');
    }
  } catch (erro) {
    return falha(erro.message);
  }
  const caminho = join(raiz, 'procedural/pecas', peca, 'receita.js');
  if (existsSync(caminho) || existsSync(join(raiz, 'procedural/pecas', `${peca}.js`))) {
    return falha(`a receita de '${peca}' já existe (${caminho.replace(`${raiz}/`, '')}); o esqueleto não a sobrescreve.`);
  }
  mkdirSync(dirname(caminho), { recursive: true });
  writeFileSync(caminho, textoDoEsqueleto({ peca, objeto: lido.opcao('objeto') ?? '', escala, partes }), { encoding: 'utf8', flag: 'wx' });
  return {
    codigo: 0,
    stdout: `criada procedural/pecas/${peca}/receita.js, com o PLANO vazio: o normalizador o recusa até o alinhamento preencher objeto, referencias, escala, partes e criteriosDeReprovacao.\n`,
    stderr: '',
  };
}

const executadoComoCLI = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (executadoComoCLI) {
  const r = executar(process.argv.slice(2));
  process.stdout.write(r.stdout);
  process.stderr.write(r.stderr);
  process.exitCode = r.codigo;
}
