/* curvatura.worker.js — o trabalhador que calcula a curvatura da peça fora do quadro da cena (`calculo-da-curvatura.js`).
 *
 * Recebe `{ pedido, vincos, lataria, neutro }`, com o estado neutro empacotado, e devolve `{ pedido, resultado }` ou
 * `{ pedido, erro }`, com os vetores do resultado transferidos.
 *
 * Avisa `{ pronto: true }` quando sobe, e quem pede espera o aviso para mandar: em 2026-10-30, com o núcleo procedural no grafo do
 * trabalhador (a Manifold carrega com `await` no topo do módulo), o pedido mandado durante a carga ficou sem resposta depois de
 * 20 s no servidor de desenvolvimento. O grafo hoje é só a conta da curvatura, e o aviso continua, para não depender disso. */
import { criarCalculadoraDaCurvatura, desempacotarNeutro } from './calculo-da-curvatura.js';

const calcular = criarCalculadoraDaCurvatura();

self.onmessage = ({ data }) => {
  const { pedido, vincos, lataria, neutro } = data;
  try {
    const resultado = calcular({ vincos, lataria, neutro: desempacotarNeutro(neutro) });
    self.postMessage({ pedido, resultado }, [resultado.ids.buffer, resultado.cores.buffer]);
  } catch (erro) {
    self.postMessage({ pedido, erro: String(erro?.message ?? erro) });
  }
};

self.postMessage({ pronto: true });
