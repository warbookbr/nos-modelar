/* derivar.js — dos parâmetros do móvel de caixa (milímetro) à chamada de composição (metro).

   Puro: recebe os parâmetros completos e devolve a composição do conjunto (o corpo com os trilhos, as portas e as gavetas
   fechadas numa peça só), cujo id depende só do número de portas e do número de gavetas, e os argumentos de todas as peças.
   A montagem v5 chama as composições soltas com os mesmos argumentos (`argumentosDasPecas`). As dobradiças só entram na
   montagem: com a porta embutida fechada elas ficam dentro dos rebaixos e dos rasgos, e as da sobreposta ficam atrás da porta. */
import { ID_DO_CONJUNTO, corpoDe, gavetaDe, guiaDe, portaDe, trilhoDe } from './composicoes.js';
import { geometriaDoMovel } from './geometria.js';

/**
 * A geometria e os argumentos (em metro) do corpo, de cada porta, de cada gaveta, do guia de cada gaveta e, na frente de correr,
 * do trilho de cada folha, com os tipos que as composições declaram. A folha de correr publica a porta do eixo (a articulação
 * é prismática); a porta de dobradiça, não.
 */
export function argumentosDasPecas(parametros) {
  const geometria = geometriaDoMovel(parametros);
  const corpo = corpoDe(geometria, parametros);
  const portas = geometria.portas.map((_, indice) => portaDe(geometria, parametros, indice, { portas: geometria.correr }));
  const gavetas = geometria.gavetas.map((_, indice) => gavetaDe(geometria, parametros, indice, { portas: true }));
  const guias = geometria.gavetas.map((_, indice) => guiaDe(geometria, parametros, indice));
  const trilhos = geometria.correr ? geometria.portas.map((_, indice) => trilhoDe(geometria, parametros, indice)) : [];
  return { geometria, corpo, portas, gavetas, guias, trilhos };
}

export function derivar(parametros) {
  const geometria = geometriaDoMovel(parametros);
  const argumentos = { ...corpoDe(geometria, parametros, { guias: true }).argumentos };
  geometria.portas.forEach((_, indice) => Object.assign(argumentos, portaDe(geometria, parametros, indice).argumentos));
  geometria.gavetas.forEach((_, indice) => Object.assign(argumentos, gavetaDe(geometria, parametros, indice).argumentos));
  return { composicao: ID_DO_CONJUNTO(parametros.portas, parametros.gavetas), argumentos };
}
