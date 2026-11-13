/* passos.js — o que entra em cada etapa de uma montagem resolvida, e a montagem pintada de cada passo.
   Núcleo do passo a passo, sem navegador: recebe a montagem resolvida e a ordem das etapas (`etapas` da montagem
   persistida) e devolve, por etapa, as instâncias novas e a lista de peças delas. A pintura (destaque das novas,
   esmaecido das já montadas) troca a cor das faces numa cópia da malha; a malha da montagem resolvida não é tocada. */
import { listarPecas } from './lista-de-pecas.js';

export const COR_DO_DESTAQUE = '#e8590c';
export const COR_DO_FUNDO = '#dce2df';
const COR_SEM_DECLARACAO = '#9aa3a0';
const FRACAO_DO_ESMAECIDO = 0.72;

function hexParaRgb(hex) {
  const texto = String(hex).replace('#', '');
  const cheio = texto.length === 3 ? [...texto].map((c) => c + c).join('') : texto;
  return [0, 2, 4].map((i) => parseInt(cheio.slice(i, i + 2), 16));
}
const rgbParaHex = (rgb) => `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;

/** A cor misturada ao fundo: fração 0 devolve a cor, 1 devolve o fundo. */
export function esmaecer(cor, fracao = FRACAO_DO_ESMAECIDO) {
  const base = hexParaRgb(cor);
  const fundo = hexParaRgb(COR_DO_FUNDO);
  return rgbParaHex(base.map((c, i) => c + (fundo[i] - c) * fracao));
}

function neutroPintado(neutro, corDe) {
  const F = new Map();
  for (const [id, face] of neutro.F) {
    const { material, ...resto } = face;
    const original = (material && neutro.materiais?.[material]?.cor) ?? face.cor ?? COR_SEM_DECLARACAO;
    F.set(id, { ...resto, cor: corDe(original) });
  }
  return { ...neutro, F, materiais: {} };
}

/** O topo da instância: o id da etapa que a contém (as etapas citam instâncias da raiz). */
const etapaDe = (instancia) => instancia.caminho[0];

/**
 * Um passo por id de `etapas`, na ordem dada. Cada passo traz o id, as instâncias novas (as da raiz com esse id, que
 * podem ser uma submontagem) e a lista de peças delas. Ids de `etapas` sem instância na montagem resolvida são erro.
 */
export function passosDaMontagem(montagem, etapas) {
  const porId = new Map(montagem.instancias.map((instancia) => [instancia.id, instancia]));
  const ausentes = etapas.filter((id) => !porId.has(id));
  if (ausentes.length) {
    throw new Error(`etapas sem instância na montagem resolvida: ${ausentes.join(', ')}. Esperado: todo id de 'etapas' ser instância da raiz.`);
  }
  const passos = etapas.map((id, indice) => {
    const instancia = porId.get(id);
    return {
      numero: indice + 1,
      etapa: id,
      alvo: instancia.alvo.ref,
      instancia,
      lista: listarPecas({ id: montagem.id, instancias: [instancia] }),
    };
  });
  const foraDasEtapas = montagem.instancias.map((i) => i.id).filter((id) => !etapas.includes(id));
  return { passos, foraDasEtapas };
}

/**
 * A montagem do passo `indice`: as instâncias das etapas até ele, as já montadas esmaecidas e a nova em destaque.
 * `cache` guarda a malha pintada de cada instância, para a mesma instância não ser copiada a cada passo.
 */
export function montagemDoPasso(montagem, passos, indice, cache = new Map()) {
  const pintada = (instancia, modo, corDe) => {
    const chave = `${instancia.id}\u0000${modo}`;
    if (cache.has(chave)) return cache.get(chave);
    const pinta = (item) => (item.alvo.tipo === 'montagem'
      ? { ...item, montagem: { ...item.montagem, instancias: item.montagem.instancias.map(pinta) } }
      : { ...item, definicao: { ...item.definicao, neutro: neutroPintado(item.definicao.neutro, corDe) } });
    const resultado = pinta(instancia);
    cache.set(chave, resultado);
    return resultado;
  };
  const instancias = passos.slice(0, indice + 1).map((passo, i) => (i === indice
    ? pintada(passo.instancia, 'destaque', () => COR_DO_DESTAQUE)
    : pintada(passo.instancia, 'esmaecido', (cor) => esmaecer(cor))));
  return { id: montagem.id, instancias };
}

export { etapaDe };
