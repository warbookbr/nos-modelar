/* modelo-aberto.mjs — a entrada comum das ferramentas de vista: abre um esboço OU uma receita de peça e devolve a mesma estrutura.
 *
 * POR QUE ELE EXISTE. `linhas:modelo`, `vista:rapida`, `leitura:regioes`, `casamento:vista` e `conferir:vistas` abriam só o esboço do
 * `esboco:nucleo` (`montarOpcoes`). No furgão (2026-11-11) a vista rápida da cabine saiu em 11 s contra 4 a 15 min da bancada, mas foi
 * preciso um adaptador fora do repositório para rodar a receita. Aqui a receita entra como um esboço de uma opção só: `{ paineis: [{ titulo,
 * neutro, partes, ... }], recusas: [] }`, a forma que as cinco já consomem.
 *
 * O ALVO. Um arquivo `.json` é esboço. Um módulo `.js` ou `.mjs` é receita quando exporta `PASSOS` ou `CHAMADAS_COMPOSICOES`, e esboço
 * quando não. Um nome sem arquivo no caminho dado (`furgao-realista`, `braco-robotico/base`) resolve como o `descrever` resolve.
 *
 * A PARTE DA RECEITA. `ateOPasso` executa só os passos de 0 a N (os passos só dependem dos anteriores): para a chapa de uma peça de
 * centenas de passos, o que vem depois do `subdivisao` dela (frisos, vãos, rodas) não roda. O que um passo seguinte tiraria ou cortaria
 * da chapa não entra na imagem, e o texto que as ferramentas imprimem diz o passo em que a execução parou.
 *
 * O RECORTE. `--recorte=x0,y0,z0,x1,y1,z1` é uma caixa em mm do referencial da peça (o da receita, o mesmo do `descrever`). Fica o que a
 * caixa corta, e a imagem enquadra a caixa: é um corte em profundidade também, e uma face entre a câmera e a caixa que não a toca
 * não aparece. */
import { existsSync, statSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { carregarConfiguracaoDeComposicoes, faltaRegistroDeComposicoes } from './configuracao-composicoes.mjs';
import { importarReceita, receitaDoModulo } from './importar-receita.mjs';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';

export class ErroDoModelo extends Error {
  constructor(mensagem) { super(mensagem); this.name = 'ErroDoModelo'; }
}

const temEnvelope = (r) => Boolean(r) && typeof r === 'object' && (Array.isArray(r.PASSOS) || Array.isArray(r.CHAMADAS_COMPOSICOES));

/** Acha a receita do alvo: `{ caminho, receita }`, ou null quando o alvo não é receita (é esboço, ou não existe como peça). */
export async function acharReceita(alvo) {
  let caminho = null;
  const direto = resolve(alvo);
  if (existsSync(direto) && statSync(direto).isFile()) {
    if (!/\.(mjs|js)$/.test(direto)) return null;
    caminho = direto;
  } else {
    try { caminho = resolverCaminhoReceita(alvo); } catch { return null; }
  }
  let modulo;
  try { modulo = await importarReceita(caminho); } catch (erro) {
    throw new ErroDoModelo(`${alvo}: o módulo não carregou: ${erro.message}`);
  }
  const receita = receitaDoModulo(modulo);
  return temEnvelope(receita) ? { caminho, receita } : null;
}

/** As partes do neutro na ordem em que aparecem nas faces, e quantas faces ficaram sem parte. */
export function partesDoNeutro(neutro) {
  const vistas = new Set(); let semParte = 0;
  for (const f of [...neutro.F.values()].sort((a, b) => a.id - b.id)) {
    if (typeof f.parte === 'string' && f.parte) vistas.add(f.parte); else semParte += 1;
  }
  return { partes: [...vistas], semParte };
}

/**
 * Abre um esboço ou uma receita de peça e devolve `{ origem: 'esboco' | 'receita', nome, paineis, recusas, parou }`, a estrutura de
 * `montarOpcoes`. `parou` só existe na receita executada até um passo: `{ passo, total, operacao }`.
 * @param {string} alvo  arquivo de esboço, caminho de receita ou nome de peça
 * @param {{ ateOPasso?: number|null, composicoes?: string|null, relato?: boolean, aoProgredir?: (linha: string) => void }} [o]
 */
export async function abrirModelo(alvo, { ateOPasso = null, composicoes = null, relato = false, aoProgredir = null } = {}) {
  const achada = await acharReceita(alvo);
  if (!achada) {
    if (ateOPasso !== null) throw new ErroDoModelo('--ate-passo só vale para receita de peça, e o alvo é um esboço');
    const { lerArquivoDeEsboco, montarOpcoes } = await import('./esboco-nucleo.mjs');
    const nome = basename(alvo);
    const montado = montarOpcoes(await lerArquivoDeEsboco(resolve(alvo)), { nome, relato });
    return { origem: 'esboco', nome, ...montado };
  }
  let { receita } = achada;
  const nome = basename(achada.caminho).replace(/^(receita|montagem|index)\.m?js$/, '') || basename(resolve(achada.caminho, '..'));
  const titulo = nome.replace(/\.m?js$/, '');
  const total = Array.isArray(receita.PASSOS) ? receita.PASSOS.length : null;
  let parou = null;
  if (ateOPasso !== null) {
    if (!Array.isArray(receita.PASSOS)) throw new ErroDoModelo('--ate-passo precisa de uma receita com PASSOS; esta compõe por CHAMADAS_COMPOSICOES');
    if (!Number.isInteger(ateOPasso) || ateOPasso < 0 || ateOPasso >= total) throw new ErroDoModelo(`--ate-passo espera um passo de 0 a ${total - 1} e veio ${ateOPasso}`);
    const passo = receita.PASSOS[ateOPasso];
    parou = { passo: ateOPasso, total, operacao: Array.isArray(passo) ? passo[0] : (passo?.op ?? null) };
    receita = { ...receita, PASSOS: receita.PASSOS.slice(0, ateOPasso + 1) };
  }
  let execucao = {};
  if (composicoes !== null) execucao = await carregarConfiguracaoDeComposicoes(composicoes);
  const falta = faltaRegistroDeComposicoes(receita, execucao.registroComposicoes, `'${alvo}'`);
  if (falta) throw new ErroDoModelo(falta);
  const t0 = performance.now();
  aoProgredir?.(`modelo: executando ${titulo}${parou ? ` até o passo ${parou.passo} de ${parou.total}` : ''}${total == null ? '' : ` (${parou ? parou.passo + 1 : total} passos)`}`);
  let executada;
  try { executada = executarReceita(receita, execucao); } catch (erro) { throw new ErroDoModelo(`o núcleo recusou ${titulo}: ${erro.message}`); }
  const { entrada, neutro } = executada;
  const { partes, semParte } = partesDoNeutro(neutro);
  const painel = { titulo, nota: '', receita, entrada, neutro, partes, facesSemParte: semParte, formas: [], contatos: null, segundos: (performance.now() - t0) / 1000 };
  return { origem: 'receita', nome: titulo, vista: null, paineis: [painel], recusas: [], parou };
}

/** A frase que as ferramentas imprimem sobre o que foi aberto, com a parada e o tempo da execução. */
export function resumoDaAbertura(m) {
  if (m.origem !== 'receita') return null;
  const p = m.paineis[0];
  const ate = m.parou ? `, executada só até o passo ${m.parou.passo} de ${m.parou.total}${m.parou.operacao ? ` (${m.parou.operacao})` : ''}; o que os passos seguintes cortam ou acrescentam não entra` : '';
  return `receita ${m.nome}: ${p.partes.length} partes, ${p.neutro.F.size} faces, executada em ${p.segundos.toFixed(1)} s${ate}`;
}

/* --- o recorte em mm ------------------------------------------------------------------------------------------------------------- */
/** `x0,y0,z0,x1,y1,z1` em mm -> `{ min, max }` ordenado por eixo; ErroDoModelo quando não são seis números ou a caixa não tem volume. */
export function lerRecorte(texto) {
  if (texto === null || texto === undefined) return null;
  const v = String(texto).split(',').map(Number);
  if (v.length !== 6 || !v.every(Number.isFinite)) throw new ErroDoModelo('--recorte espera seis números em mm, x0,y0,z0,x1,y1,z1');
  const min = [0, 1, 2].map((k) => Math.min(v[k], v[k + 3])); const max = [0, 1, 2].map((k) => Math.max(v[k], v[k + 3]));
  if ([0, 1, 2].some((k) => !(max[k] > min[k]))) throw new ErroDoModelo('--recorte precisa de uma caixa com volume: cada eixo com mínimo menor que o máximo');
  return { min, max };
}

/** A face (pontos em mm) toca a caixa do recorte: a caixa dos pontos dela cruza a caixa. */
export function faceNoRecorte(pts, recorte) {
  for (let k = 0; k < 3; k += 1) {
    let lo = Infinity; let hi = -Infinity;
    for (const p of pts) { if (p[k] < lo) lo = p[k]; if (p[k] > hi) hi = p[k]; }
    if (hi < recorte.min[k] || lo > recorte.max[k]) return false;
  }
  return true;
}

/** As faces que o recorte toca. */
export const recortarFaces = (faces, recorte) => (recorte ? faces.filter((f) => faceNoRecorte(f.pts, recorte)) : faces);

/** O quadro `{ u0, u1, v0, v1 }` em mm da base da câmera que enquadra a caixa do recorte (as oito quinas projetadas). */
export function quadroDoRecorte(recorte, base) {
  let u0 = Infinity; let u1 = -Infinity; let v0 = Infinity; let v1 = -Infinity;
  for (const x of [recorte.min[0], recorte.max[0]]) for (const y of [recorte.min[1], recorte.max[1]]) for (const z of [recorte.min[2], recorte.max[2]]) {
    const u = x * base.direita[0] + y * base.direita[1] + z * base.direita[2]; const v = x * base.cima[0] + y * base.cima[1] + z * base.cima[2];
    if (u < u0) u0 = u; if (u > u1) u1 = u; if (v < v0) v0 = v; if (v > v1) v1 = v;
  }
  return { u0, u1, v0, v1 };
}

/** Escolhe a opção do painel e trata a recusa, para as ferramentas que abrem o modelo da mesma forma. */
export function painelDaOpcao(montado, opcao, rotulo) {
  if (montado.recusas?.length) {
    const texto = montado.recusas.map((r) => (typeof r === 'string' ? r : [r.opcao, r.forma, r.motivo].filter(Boolean).join(': '))).map((r) => `- ${r}`).join('\n');
    return { erro: { codigo: 1, stdout: '', stderr: `${rotulo}: o esboço foi recusado:\n${texto}\n` } };
  }
  const painel = montado.paineis[opcao - 1];
  if (!painel) return { erro: { codigo: 2, stdout: '', stderr: `${rotulo}: ${montado.origem === 'receita' ? 'a receita tem uma opção só' : `o esboço tem ${montado.paineis.length} opções`}\n` } };
  return { painel };
}
