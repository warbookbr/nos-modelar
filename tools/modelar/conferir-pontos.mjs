#!/usr/bin/env node
/**
 * conferir-pontos.mjs — mede os PONTOS DECLARADOS de uma peça contra a malha
 * que a receita produz, e devolve o desvio de cada um em milímetro.
 *
 * POR QUE ELE EXISTE. Os critérios de reprovação do plano são prosa: alguém
 * precisa ler, entender e julgar. Prosa não reprova nada sozinha, e o que não
 * reprova sozinho é ignorado sob pressão de terminar. Um ponto declarado tem
 * coordenada e tolerância, então ele é conferido por conta a cada rodada, e o
 * veredito é um número e não uma opinião.
 *
 * DUAS ESPÉCIES DE PONTO, e cada uma mede coisa diferente.
 *
 * `entre: ['a','b']` é uma JUNTA: o centro da região onde as caixas das duas
 * partes se sobrepõem. É a medida certa para uma cadeia cinemática, porque a
 * junta não é um vértice de ninguém — ela é o lugar onde dois elos se
 * encontram. Partes que não se sobrepõem em algum eixo não têm junta, e isso é
 * acusado em vez de virar um número inventado no meio do vão.
 *
 * `parte: 'a'` é um ponto da PRÓPRIA PARTE: o centro da caixa dela, ou o
 * extremo dela num eixo. Serve para o que não é junta, como o centro do flange
 * ou a altura do topo.
 *
 * A DECLARAÇÃO É EM MILÍMETRO e a malha é em metro, como o resto do acervo. A
 * conversão mora aqui, num lugar só, porque duas conversões em dois arquivos
 * divergem no dia em que alguém mexe numa delas.
 */
import { pathToFileURL } from 'node:url';
import { caixaDaParte } from '../../src/autoria/descrever-partes.js';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { importarReceita, receitaDoModulo } from './importar-receita.mjs';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';

const MM_POR_METRO = 1000;
const EIXOS = ['x', 'y', 'z'];

function falhar(mensagem) { throw new Error(`conferir-pontos: ${mensagem}`); }

function exigirCoordenada(valor, quem) {
  if (!Array.isArray(valor) || valor.length !== 3 || !valor.every(Number.isFinite)) {
    falhar(`${quem}: 'em' precisa ser [x, y, z] em milímetro, com três números finitos.`);
  }
  return valor;
}

/* O centro da sobreposição das duas caixas. Se elas não se sobrepõem em algum
   eixo, não há junta: devolver o ponto médio ali seria inventar uma junta no
   meio do vão, que é exatamente o defeito que este ponto existe para pegar. */
function centroDaJunta(caixaA, caixaB, quem) {
  const centro = [];
  for (let k = 0; k < 3; k += 1) {
    const baixo = Math.max(caixaA.min[k], caixaB.min[k]);
    const alto = Math.min(caixaA.max[k], caixaB.max[k]);
    if (baixo > alto) {
      const vao = (baixo - alto) * MM_POR_METRO;
      return { erro: `${quem}: as partes não se encontram; sobra um vão de ${vao.toFixed(1)} mm em ${EIXOS[k]}.` };
    }
    centro.push((baixo + alto) / 2);
  }
  return { centro };
}

const MEDIDAS_DA_PARTE = {
  centro: (caixa) => caixa.centro,
  minimo: (caixa) => caixa.min,
  maximo: (caixa) => caixa.max,
};

function medirUmPonto(neutro, ponto, indice) {
  const quem = `pontos[${indice}]${ponto.nome ? ` '${ponto.nome}'` : ''}`;
  if (!ponto || typeof ponto !== 'object') falhar(`${quem}: precisa ser objeto.`);
  if (typeof ponto.nome !== 'string' || ponto.nome.trim() === '') falhar(`${quem}: precisa de 'nome'.`);
  const esperado = exigirCoordenada(ponto.em, quem);
  const tolerancia = ponto.toleranciaMm;
  if (!Number.isFinite(tolerancia) || tolerancia <= 0) {
    falhar(`${quem}: 'toleranciaMm' precisa ser número maior que zero; ponto sem tolerância não reprova nada.`);
  }

  let obtido;
  if (Array.isArray(ponto.entre)) {
    if (ponto.entre.length !== 2) falhar(`${quem}: 'entre' precisa nomear exatamente duas partes.`);
    if (ponto.parte) falhar(`${quem}: declare 'entre' ou 'parte', nunca os dois.`);
    const [a, b] = ponto.entre.map((nome) => caixaDaParte(neutro, nome));
    const junta = centroDaJunta(a, b, quem);
    if (junta.erro) return { nome: ponto.nome, passou: false, motivo: junta.erro };
    obtido = junta.centro;
  } else if (typeof ponto.parte === 'string') {
    const medida = ponto.medida ?? 'centro';
    const ler = MEDIDAS_DA_PARTE[medida];
    if (!ler) falhar(`${quem}: 'medida' desconhecida '${medida}'; use ${Object.keys(MEDIDAS_DA_PARTE).join(', ')}.`);
    obtido = ler(caixaDaParte(neutro, ponto.parte));
  } else {
    falhar(`${quem}: precisa declarar 'entre' com duas partes ou 'parte' com uma.`);
  }

  const obtidoMm = obtido.map((v) => v * MM_POR_METRO);
  const porEixo = obtidoMm.map((v, k) => v - esperado[k]);
  const distancia = Math.hypot(...porEixo);
  return {
    nome: ponto.nome,
    passou: distancia <= tolerancia,
    esperado,
    obtido: obtidoMm.map((v) => Number(v.toFixed(2))),
    desvioPorEixo: porEixo.map((v) => Number(v.toFixed(2))),
    desvio: Number(distancia.toFixed(2)),
    toleranciaMm: tolerancia,
  };
}

/**
 * Mede todos os pontos declarados de uma receita já carregada.
 * Devolve `{ ok, pontos }`, sem imprimir nada e sem encerrar o processo.
 */
export function conferirPontos(receita, { quem = 'peça' } = {}) {
  const declarados = receita?.PONTOS;
  if (!Array.isArray(declarados) || declarados.length === 0) {
    return { ok: false, semPontos: true, quem, pontos: [] };
  }
  const { neutro } = executarReceita(receita);
  const pontos = declarados.map((ponto, i) => medirUmPonto(neutro, ponto, i));
  return { ok: pontos.every((p) => p.passou), quem, pontos };
}

/* ---- o esperado de cada ponto, guardado e comparado entre rodadas ---- */

/**
 * O esperado de cada ponto de `PONTOS`, já resolvido em número: `{ nome, parte | entre, medida?, em, toleranciaMm }`. É o que a rodada
 * grava, para a seguinte dizer se o alvo da medida mudou. Não valida: o formato errado é recusado por `conferirPontos`, que mede.
 */
export function esperadosDosPontos(receita) {
  const declarados = Array.isArray(receita?.PONTOS) ? receita.PONTOS : [];
  return declarados.filter((p) => p && typeof p === 'object').map((p) => ({
    nome: String(p.nome ?? ''),
    ...(Array.isArray(p.entre) ? { entre: p.entre.map(String) } : { parte: String(p.parte ?? ''), medida: p.medida ?? 'centro' }),
    em: Array.isArray(p.em) ? p.em.map(Number) : [],
    toleranciaMm: Number(p.toleranciaMm),
  }));
}

/**
 * O texto com que a receita declara `PONTOS` (`PONTOS = [ ... ]` ou `PONTOS: [ ... ]`), do colchete que abre ao que fecha, com os espaços
 * reduzidos a um. Diz se alguém reescreveu a declaração: o esperado que muda com este texto igual é derivado de outro dado da receita.
 * Devolve null quando a receita não tem a lista escrita nela (a importada de outro arquivo, por exemplo).
 */
export function textoDosPontos(textoDaReceita) {
  const abre = /\bPONTOS\s*[=:]\s*\[/.exec(String(textoDaReceita ?? ''));
  if (!abre) return null;
  const inicio = abre.index + abre[0].length - 1;
  let nivel = 0;
  for (let k = inicio; k < textoDaReceita.length; k += 1) {
    const c = textoDaReceita[k];
    if (c === "'" || c === '"' || c === '`') {
      k += 1;
      while (k < textoDaReceita.length && textoDaReceita[k] !== c) k += textoDaReceita[k] === '\\' ? 2 : 1;
    } else if (c === '[') nivel += 1;
    else if (c === ']') { nivel -= 1; if (nivel === 0) return textoDaReceita.slice(inicio, k + 1).replace(/\s+/g, ' '); }
  }
  return null;
}

const mesmoEsperado = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * O que mudou no esperado dos pontos de uma rodada para a seguinte: o ponto de mesmo nome com outro alvo, outra tolerância ou outra
 * medida, e o ponto que saiu. O ponto novo não é mudança de esperado. Devolve `[{ nome, de, para }]`, com `para` null no que saiu.
 */
export function mudancasDosEsperados(antes, agora) {
  const novos = new Map((agora ?? []).map((p) => [p.nome, p]));
  const mudancas = [];
  for (const velho of antes ?? []) {
    const novo = novos.get(velho.nome) ?? null;
    if (!novo || !mesmoEsperado(velho, novo)) mudancas.push({ nome: velho.nome, de: velho, para: novo });
  }
  return mudancas;
}

const alvo = (p) => `[${p.em.join(', ')}] ±${p.toleranciaMm} mm`;
/** Uma mudança de esperado em uma linha: o nome do ponto, o alvo de antes e o de agora. */
export const formatarMudancaDeEsperado = (m) => (m.para ? `'${m.nome}': de ${alvo(m.de)} para ${alvo(m.para)}` : `'${m.nome}': saiu de PONTOS (era ${alvo(m.de)})`);

export function formatarPontos(resultado) {
  if (resultado.semPontos) {
    return `conferir-pontos — ${resultado.quem} NÃO DECLARA PONTOS\n`
      + '  A receita não exporta `PONTOS`, então nenhum critério desta peça é\n'
      + '  conferido por conta. Declare os pontos que o plano promete.\n';
  }
  const linhas = [`conferir-pontos — ${resultado.quem} ${resultado.ok ? 'PASSOU' : 'REPROVOU'}`];
  for (const p of resultado.pontos) {
    if (p.motivo) { linhas.push(`  ✗ ${p.nome}: ${p.motivo}`); continue; }
    const marca = p.passou ? '✓' : '✗';
    linhas.push(`  ${marca} ${p.nome}: desvio ${p.desvio} mm (tolerância ${p.toleranciaMm})`);
    if (!p.passou) {
      linhas.push(`      esperado [${p.esperado.join(', ')}]  obtido [${p.obtido.join(', ')}]`);
      linhas.push(`      por eixo x ${p.desvioPorEixo[0]}  y ${p.desvioPorEixo[1]}  z ${p.desvioPorEixo[2]}`);
    }
  }
  return `${linhas.join('\n')}\n`;
}

const AJUDA = `node tools/modelar/conferir-pontos.mjs <peça>
Mede os PONTOS que a receita exporta contra a malha e dá o desvio de cada um em mm, com ✓ ou ✗; sai com código 1 se algum
passar da tolerância. Cada ponto é { nome, em: [x, y, z] em mm, toleranciaMm } e mais um destes:
  entre: ['a', 'b']               o centro da junta, onde as caixas das duas partes se sobrepõem;
  parte: 'a', medida?             um ponto da caixa da parte: medida 'centro' (padrão), 'minimo' ou 'maximo'.
`;

async function principal(argv) {
  const alvo = argv[2];
  if (alvo === '--ajuda') {
    process.stdout.write(AJUDA);
    return 0;
  }
  if (!alvo) {
    process.stderr.write('uso: node tools/modelar/conferir-pontos.mjs <peça>\n');
    return 2;
  }
  const caminho = resolverCaminhoReceita(alvo);
  if (!caminho) {
    process.stderr.write(`conferir-pontos: não achei a receita '${alvo}'.\n`);
    return 2;
  }
  const receita = receitaDoModulo(await importarReceita(caminho));
  const resultado = conferirPontos(receita, { quem: alvo });
  process.stdout.write(formatarPontos(resultado));
  return resultado.ok ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  principal(process.argv).then((codigo) => { process.exitCode = codigo; }, (erro) => {
    process.stderr.write(`${erro.message}\n`);
    process.exitCode = 1;
  });
}
