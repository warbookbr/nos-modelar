/* medida-do-desenho-conferir.mjs — o gate `desenho:check`.
 *
 * Duas coisas, nesta ordem. A primeira prova a medida: os casos montados à mão de `medida-do-desenho-casos.mjs` (uma caixa, uma caixa com
 * furo, duas caixas encostadas, um cilindro fino) dão zero no desenho certo e acusam, com grupo e posição, o traço plantado e o traço
 * tirado; sem isto, um zero das quarenta e oito vistas não diria nada. A segunda mede as quarenta e oito vistas do conjunto de calibração
 * do crítico (doze imagens, quatro vistas) e reprova com todo pixel de vazamento ou de falha que o registro das causas não declare.
 *
 * O registro (`docs/modelar/banco-de-provas/desenho-das-linhas/causas.json`, formato `mecanifica.desenho-das-linhas@1`) lista, por imagem,
 * vista e tipo, o máximo de pixels que o desenho ainda deixa e a causa provada: um resto que o desenho não consegue tirar (a ponta de um
 * traço a meio pixel da aresta, que o vetor não põe no pixel) e não um defeito que ficou para depois. Vazio, o gate exige zero. Uma causa
 * que passou do que declara reprova; uma que já não é usada só é dita. */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TOLERANCIA_DO_DESENHO } from '../../modulos/esboco/src/medida-do-desenho.js';
import { VISTAS_DO_CONJUNTO } from '../../src/autoria/calibracao-do-critico.js';
import { PASTA_DO_CONJUNTO, RAIZ, lerConjuntoDoDisco } from './calibracao-do-critico.mjs';
import { medirConjunto, detalheDosRelatos, tabelaDosRelatos } from './medida-do-desenho.mjs';
import { provarAMedida } from './medida-do-desenho-casos.mjs';

export const FORMATO_DAS_CAUSAS = 'mecanifica.desenho-das-linhas@1';
export const ARQUIVO_DAS_CAUSAS = 'docs/modelar/banco-de-provas/desenho-das-linhas/causas.json';
const TIPOS = ['vazamento', 'falha'];

export class ErroDasCausas extends Error {}

/** Lê e valida o registro das causas: `{ formato, causas: [{ imagem, vista, tipo, maximoPixels, causa }] }`. */
export function lerCausas(raiz = RAIZ, imagens = null) {
  const arquivo = join(raiz, ARQUIVO_DAS_CAUSAS);
  if (!existsSync(arquivo)) throw new ErroDasCausas(`o registro das causas do desenho não existe: ${ARQUIVO_DAS_CAUSAS}`);
  const dados = JSON.parse(readFileSync(arquivo, 'utf8'));
  if (dados.formato !== FORMATO_DAS_CAUSAS) throw new ErroDasCausas(`${ARQUIVO_DAS_CAUSAS}: o formato é '${FORMATO_DAS_CAUSAS}', e veio '${dados.formato}'`);
  if (!Array.isArray(dados.causas)) throw new ErroDasCausas(`${ARQUIVO_DAS_CAUSAS}: "causas" precisa ser uma lista`);
  const vistos = new Set();
  dados.causas.forEach((c, i) => {
    const onde = `${ARQUIVO_DAS_CAUSAS}, causa ${i + 1}`;
    if (imagens && !imagens.includes(c.imagem)) throw new ErroDasCausas(`${onde}: '${c.imagem}' não é uma imagem do conjunto (${imagens.join(', ')})`);
    if (!VISTAS_DO_CONJUNTO.includes(c.vista)) throw new ErroDasCausas(`${onde}: '${c.vista}' não é uma vista do conjunto (${VISTAS_DO_CONJUNTO.join(', ')})`);
    if (!TIPOS.includes(c.tipo)) throw new ErroDasCausas(`${onde}: o tipo é 'vazamento' ou 'falha', e veio '${c.tipo}'`);
    if (!Number.isInteger(c.maximoPixels) || c.maximoPixels < 1) throw new ErroDasCausas(`${onde}: "maximoPixels" precisa ser um inteiro de 1 em diante`);
    if (typeof c.causa !== 'string' || c.causa.trim().length < 20) throw new ErroDasCausas(`${onde}: "causa" precisa dizer a causa provada, em uma frase`);
    const chave = `${c.imagem}|${c.vista}|${c.tipo}`;
    if (vistos.has(chave)) throw new ErroDasCausas(`${onde}: ${c.imagem} ${c.vista} ${c.tipo} já tem causa declarada`);
    vistos.add(chave);
  });
  return dados;
}

/** O que reprova nos relatos: o pixel que passa do que o registro declara. Devolve a lista de falhas, em texto, e as causas que já não se usam. */
export function falhasDosRelatos(relatos, causas) {
  const falhas = []; const folgadas = [];
  const declarado = (id, vista, tipo) => causas.find((c) => c.imagem === id && c.vista === vista && c.tipo === tipo)?.maximoPixels ?? 0;
  for (const r of relatos) {
    for (const tipo of TIPOS) {
      const t = r[tipo]; const maximo = declarado(r.id, r.vista, tipo);
      if (t.pixels > maximo) falhas.push(`${r.id} ${r.vista}: ${tipo} de ${t.pixels} px em ${t.grupos} grupos${maximo > 0 ? `, e o registro das causas declara até ${maximo} px` : ''}`);
      else if (maximo > 0 && t.pixels < maximo) folgadas.push(`${r.id} ${r.vista} ${tipo}: o registro declara até ${maximo} px e o desenho deixa ${t.pixels}`);
    }
  }
  return { falhas, folgadas };
}

export async function conferirDesenho({ navegador, raiz = RAIZ, so = null }, saida = console) {
  const conjunto = lerConjuntoDoDisco({ raiz, exigirGerados: false });
  const { causas } = lerCausas(raiz, conjunto.imagens.map((i) => i.id));
  const provas = await provarAMedida({ navegador });
  const reprovadas = provas.filter((p) => !p.ok);
  if (reprovadas.length > 0) {
    saida.error(`desenho:check FALHOU — a medida não passou em ${reprovadas.length} de ${provas.length} provas dos casos montados à mão:`);
    for (const p of reprovadas) saida.error(`  ${p.nome}: ${p.texto}`);
    return 1;
  }
  const relatos = await medirConjunto({ raiz, so, navegador });
  const { falhas, folgadas } = falhasDosRelatos(relatos, causas);
  if (falhas.length > 0) {
    saida.error(`desenho:check FALHOU — ${falhas.length} vista(s) do conjunto de calibração com traço sem aresta ou aresta sem traço (tolerância de ${TOLERANCIA_DO_DESENHO} px):`);
    for (const f of falhas) saida.error(`  ${f}`);
    saida.error(detalheDosRelatos(relatos));
    saida.error('veja `npm run desenho:medir -- --so=<imagem> --vista=<vista> --saida=<pasta>`, que grava o desenho, a referência e o diagnóstico (vazamento em vermelho, falha em azul).');
    return 1;
  }
  for (const f of folgadas) saida.log(`desenho:check — causa folgada: ${f}`);
  const declaradas = causas.length;
  saida.log(`desenho:check ok — a medida passou em ${provas.length} provas dos casos montados à mão, e ${relatos.length} vistas (${PASTA_DO_CONJUNTO}) ficam dentro do registro das causas${declaradas ? ` (${declaradas} causa(s) declarada(s))` : ', sem pixel de vazamento nem de falha'}.`);
  if (process.env.DESENHO_TABELA === '1') saida.log(tabelaDosRelatos(relatos));
  return 0;
}
