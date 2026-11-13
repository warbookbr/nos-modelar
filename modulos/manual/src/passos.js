/* passos.js — o que entra em cada etapa de uma montagem resolvida, e a montagem pintada de cada passo.
   Núcleo do passo a passo, sem navegador: recebe a montagem resolvida e a ordem das etapas (`etapas` da montagem
   persistida) e devolve, por passo (uma etapa ou um grupo de etapas seguidas iguais), as instâncias novas e a lista de peças delas. A pintura (destaque das novas,
   esmaecido das já montadas) troca a cor das faces numa cópia da malha; a malha da montagem resolvida não é tocada. */
import { chaveDaPeca, instanciasDePeca, listarPecas } from './lista-de-pecas.js';

export const COR_DO_DESTAQUE = '#e8590c';
export const COR_DO_FUNDO = '#dce2df';
/** O caminho que a captura usa como foco para enquadrar todas as instâncias do passo (as do destaque). */
export const FOCO_DO_PASSO = 'passo-em-destaque';
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

/** A chave de agrupamento de uma etapa: o alvo e as peças que ela traz, cada uma com os seus parâmetros. */
const chaveDaEtapa = (instancia) => `${instancia.alvo.tipo}:${instancia.alvo.ref}\u0000${instanciasDePeca({ instancias: [instancia] }).map(chaveDaPeca).join('\u0001')}`;

const unicos = (itens) => [...new Set(itens)];

/**
 * Os passos da montagem na ordem de `etapas`. Com `agrupar` (padrão), etapas seguidas que põem a mesma peça (mesmo alvo e
 * mesmos parâmetros) viram um passo só; a ordem nunca muda. Cada passo traz as etapas, as instâncias novas (as da raiz com
 * esses ids, que podem ser submontagens), a lista de peças delas e, vindos de `textos.etapas` (o `manual.etapas` da montagem),
 * as instruções e os avisos: iguais aparecem uma vez, diferentes aparecem todos, na ordem das etapas.
 * Ids de `etapas` sem instância na montagem resolvida são erro.
 */
export function passosDaMontagem(montagem, etapas, { agrupar = true, textos = {} } = {}) {
  const porId = new Map(montagem.instancias.map((instancia) => [instancia.id, instancia]));
  const ausentes = etapas.filter((id) => !porId.has(id));
  if (ausentes.length) {
    throw new Error(`etapas sem instância na montagem resolvida: ${ausentes.join(', ')}. Esperado: todo id de 'etapas' ser instância da raiz.`);
  }
  const grupos = [];
  for (const id of etapas) {
    const instancia = porId.get(id);
    const ultimo = grupos.at(-1);
    if (agrupar && ultimo && ultimo.chave === chaveDaEtapa(instancia)) {
      ultimo.etapas.push(id);
      ultimo.instancias.push(instancia);
    } else {
      grupos.push({ chave: chaveDaEtapa(instancia), etapas: [id], instancias: [instancia] });
    }
  }
  const passos = grupos.map(({ etapas: ids, instancias }, indice) => {
    const instrucoes = unicos(ids.map((id) => textos[id]?.instrucao).filter(Boolean));
    const avisos = unicos(ids.flatMap((id) => textos[id]?.avisos ?? []));
    return {
      numero: indice + 1,
      etapas: ids,
      alvo: instancias[0].alvo.ref,
      quantidade: instancias.length,
      instancias,
      lista: listarPecas({ id: montagem.id, instancias }),
      ...(instrucoes.length ? { instrucoes } : {}),
      ...(avisos.length ? { avisos } : {}),
    };
  });
  const foraDasEtapas = montagem.instancias.map((i) => i.id).filter((id) => !etapas.includes(id));
  return { passos, foraDasEtapas };
}

/**
 * A montagem do passo `indice`: as instâncias dos passos até ele, as já montadas esmaecidas e as do passo em destaque.
 * `cache` guarda a malha pintada de cada instância, para a mesma instância não ser copiada a cada passo.
 */
export function montagemDoPasso(montagem, passos, indice, cache = new Map()) {
  const pintada = (instancia, modo, corDe) => {
    const chave = `${instancia.id}\u0000${modo}`;
    if (cache.has(chave)) return cache.get(chave);
    /* As instâncias do destaque ganham o prefixo FOCO_DO_PASSO no caminho (que só identifica a instância; a pose é a de
       mundo), para a captura, que enquadra um caminho só, enquadrar o grupo inteiro. */
    const prefixo = modo === 'destaque' ? [FOCO_DO_PASSO] : [];
    const pinta = (item) => (item.alvo.tipo === 'montagem'
      ? { ...item, caminho: [...prefixo, ...item.caminho], montagem: { ...item.montagem, instancias: item.montagem.instancias.map(pinta) } }
      : { ...item, caminho: [...prefixo, ...item.caminho], definicao: { ...item.definicao, neutro: neutroPintado(item.definicao.neutro, corDe) } });
    const resultado = pinta(instancia);
    cache.set(chave, resultado);
    return resultado;
  };
  const instancias = passos.slice(0, indice + 1).flatMap((passo, i) => passo.instancias.map((instancia) => (i === indice
    ? pintada(instancia, 'destaque', () => COR_DO_DESTAQUE)
    : pintada(instancia, 'esmaecido', (cor) => esmaecer(cor)))));
  return { id: montagem.id, instancias };
}

export { etapaDe };
