/* exportacao.js — os dados do cabo que a exportação glTF grava em `extras` do nó do cabo, para Blender e Unreal.

   Os quatro primeiros têm o nome do componente de cabo da Unreal (CableComponent) e a unidade dele, o centímetro: CableLength (o comprimento do cabo, aqui o de corte),
   CableWidth (a largura, aqui o diâmetro), NumSegments (os trechos da curva) e NumSides (os lados da seção). Os nossos, em milímetro, vão ao lado: comprimentoDeCorteMm,
   diametroMm, raioMinimoMm, raioMinimoDiametros, caimento e lados (os dois últimos, com o comprimento, são o que o addon do Blender usa para refazer a curva). Os nomes dos nós das pontas (AttachStartTo e AttachEndTo) quem acrescenta é o exportador, que é quem nomeia os nós. */
import { medidasDoPedido } from './pedido.js';

const arredonda = (v, casas = 4) => { const f = 10 ** casas; return Math.round(v * f) / f + 0; };

/** Os `extras` de um cabo do pedido (o pedido absoluto, em milímetro, sem feixe). */
export function extrasDoCabo(pedido) {
  const m = medidasDoPedido(pedido).cabos[0];
  const diametro = pedido.diametro ?? 6;
  return {
    CableLength: arredonda(m.comprimentoDeCorte / 10),
    CableWidth: arredonda(diametro / 10),
    NumSegments: m.trechos,
    NumSides: m.lados,
    comprimentoDeCorteMm: arredonda(m.comprimentoDeCorte),
    diametroMm: arredonda(diametro),
    raioMinimoMm: arredonda(m.raioMinimo),
    raioMinimoDiametros: arredonda(pedido.raioMinimo ?? 5),
    caimento: arredonda(pedido.caimento ?? 0),
    lados: m.lados,
    unidadeDaUnreal: 'cm',
  };
}

/** A linha de cada cabo na lista de materiais da montagem: o nome, o comprimento de corte (o da curva, em milímetro), o diâmetro, os lados da seção e as portas das pontas (`lista` traz `{ pedido, porta de, porta para }` por cabo). */
export function linhaDeMaterial({ nome, pedido, de = null, para = null }) {
  const m = medidasDoPedido(pedido).cabos[0];
  return {
    cabo: nome,
    comprimentoDeCorteMm: arredonda(m.comprimentoDeCorte, 2),
    diametroMm: arredonda(pedido.diametro ?? 6, 2),
    lados: m.lados,
    de, para,
  };
}

/** A lista de materiais dos cabos de uma montagem, em ordem de nome, com o total de corte. */
export function listaDeMateriaisDosCabos(linhas) {
  const ordenadas = [...linhas].sort((a, b) => (a.cabo < b.cabo ? -1 : a.cabo > b.cabo ? 1 : 0));
  return { cabos: ordenadas, totalDeCorteMm: arredonda(ordenadas.reduce((s, l) => s + l.comprimentoDeCorteMm, 0), 2) };
}
