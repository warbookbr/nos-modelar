/* gaiola-grande.mjs — a gaiola grande e escalável do plano do ajuste esparso, sem objeto: a casca simétrica neutra das chapas de prova
 * (`definicaoDaChapaSimetrica`, um quarto de elipse de 600 por 500 mm ao longo de 1000 mm) passada pela `gaiolaPorRede` com `simetria: 'x'`
 * e espelhada como o passo `subdivisao` a espelha, com todo ponto da gaiola espelhada medido com peso 1, como a lataria do carro com
 * `pesoDasCurvas: 1`. O que importa é a ordem dos vértices que a rede entrega, com as imagens do espelho no fim: é ela que dá a banda larga
 * e o expoente 3,1 que o ensaio do carro mediu; uma grade comum do mesmo tamanho resolve cinco vezes mais rápido e não reproduz a lei.
 * `passo` (mm) escolhe o tamanho: 30 dá 1.785 incógnitas na gaiola espelhada, 20 dá 3.927 e 15 dá 6.969. */
import { gaiolaPorRede } from '../../../procedural/nucleo/gaiola-por-rede.js';
import { gaiolaDoPasso } from '../../../procedural/nucleo/operacoes/subdivisao.js';
import { definicaoDaChapaSimetrica } from '../correcao-de-superficie/chapas.mjs';

/** A gaiola espelhada, em metro, e as medidas `{ indice, peso: 1 }` de todos os pontos medidos dela e das imagens: `{ gaiola, medidas, meia }`. */
export function gaiolaGrande({ passo = 20 } = {}) {
  const rede = gaiolaPorRede(definicaoDaChapaSimetrica({ passo }));
  const a = { ...rede.passo, borda: 'cantos' };
  const nomesMedidos = a.medidas; delete a.medidas;
  const r = gaiolaDoPasso(a, { vec: (p) => (typeof p === 'string' ? rede.pontos[p] : p).map((c) => c / 1000), num: (x) => x });
  if (r.erro) throw new Error(`gaiola-grande: ${r.erro.join(': ')}`);
  const gaiola = { ...r.gaiola, borda: a.borda };
  const indice = new Map(a.vertices.map((nome, k) => [nome, k]));
  const medidos = nomesMedidos.map((m) => indice.get(typeof m === 'string' ? m : m.ponto));
  const todos = [...new Set([...medidos, ...medidos.map((k) => gaiola.imagem?.[k] ?? k)])].sort((x, y) => x - y);
  return { gaiola, medidas: todos.map((i) => ({ indice: i, peso: 1 })), meia: a.vertices.length };
}
