/* sedan-chassi-e-lataria/partes/_comum/recorte.mjs: o recorte de uma etapa do sedã no conjunto que o esboço do carro inteiro monta.
 *
 * O esboço (`../../alta-definicao/chassi-aparado.esboco.mjs`) escreve o carro numa lista só de passos, em mm, com os números de origem
 * encadeados (a chapa, as lâminas do corte, os painéis; a chapa da cabine, o friso das molduras; o chassi aparado por essas duas chapas).
 * Cada etapa da montagem é uma peça com os passos que as partes dela pedem: as partes nomeadas, as origens que elas citam, as origens que
 * essas citam, e os passos de edição (`transladar`, `pincel`, `liso`, `limparLascas`) que mexem só em origem já mantida. O número de origem
 * é o do esboço, de modo que a malha da etapa é a mesma que a parte tem no carro inteiro. A conversão para metro é a do esboço 2.0
 * (`passoEmMetro`, em `modulos/esboco-nucleo/src/milimetro.js`), a única do projeto para esta lista. */
import { passoEmMetro, pontoEmMetro } from '../../../../../modulos/esboco-nucleo/src/milimetro.js';

const ehReferencia = (v) => v && typeof v === 'object' && !Array.isArray(v) && typeof v.op === 'string' && Number.isSafeInteger(v.id);

/** Os números de origem que um valor cita, em qualquer profundidade (`{ op, id }`). */
export function origensCitadas(valor, achadas = new Set()) {
  if (Array.isArray(valor)) valor.forEach((v) => origensCitadas(v, achadas));
  else if (valor && typeof valor === 'object') {
    if (ehReferencia(valor)) achadas.add(valor.id);
    Object.values(valor).forEach((v) => origensCitadas(v, achadas));
  }
  return achadas;
}

/** Os passos do conjunto que as partes `nomes` pedem, na ordem do conjunto, em mm. */
export function recortarPassos(passos, nomes) {
  const quem = new Set(nomes);
  const criador = new Map();
  passos.forEach((p, i) => { const id = p[1]?.origemId; if (Number.isSafeInteger(id)) criador.set(id, i); });
  const mantidos = new Set();
  const visita = (i) => {
    if (mantidos.has(i)) return;
    mantidos.add(i);
    for (const id of origensCitadas(passos[i][1])) if (criador.has(id)) visita(criador.get(id));
  };
  passos.forEach((p, i) => { if (p[0] === 'parte' && quem.has(p[1].nome)) visita(i); });
  const origensMantidas = new Set([...mantidos].map((i) => passos[i][1].origemId).filter(Number.isSafeInteger));
  /* os passos de edição: sem origem própria, citando só origem mantida (ou, no pincel por grupo, a parte pedida) */
  const editaMantida = (p) => {
    const sel = p[1]?.sel;
    if (sel?.grupo !== undefined) return quem.has(sel.grupo);
    const citadas = [...origensCitadas(p[1])];
    return citadas.length > 0 && citadas.every((id) => origensMantidas.has(id));
  };
  return passos.filter((p, i) => {
    if (mantidos.has(i)) return true;
    if (Number.isSafeInteger(p[1]?.origemId) || p[0] === 'parte') return false;
    return editaMantida(p);
  });
}

/** O recorte em metro, com o TOPO que as origens mantidas citam. */
export function recortar(conjunto, nomes) {
  const passos = recortarPassos(conjunto.passos, nomes).map((p, i) => passoEmMetro(p, `passo ${i} "${p[0]}"`));
  const topo = Object.fromEntries(Object.entries(conjunto.topo).map(([k, p]) => [k, pontoEmMetro(p)]));
  return { passos, topo };
}
