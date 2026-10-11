/* derivar.js — dos parâmetros do roupeiro (milímetro) à chamada de composição (metro).

   Puro: recebe os parâmetros completos e devolve a composição do conjunto (o corpo e as portas fechadas numa peça só), cujo
   id depende do número de portas, de haver prateleiras e de haver cabideiro, e os argumentos de todas as peças. A montagem
   v5 chama as composições soltas com os mesmos argumentos (`argumentosDasPecas`). As dobradiças só entram na montagem: com
   a porta fechada elas ficam dentro dos rebaixos e dos rasgos. */
import { ID_DO_CONJUNTO, corpoDe, portaDe } from './composicoes.js';
import { geometriaDoRoupeiro } from './geometria.js';

/** A geometria e os argumentos (em metro) do corpo e de cada porta, com os tipos que as composições declaram. */
export function argumentosDasPecas(parametros) {
  const geometria = geometriaDoRoupeiro(parametros);
  const corpo = corpoDe(geometria, parametros);
  const portas = geometria.portas.map((_, indice) => portaDe(geometria, parametros, indice));
  return { geometria, corpo, portas };
}

export function derivar(parametros) {
  const { corpo, portas } = argumentosDasPecas(parametros);
  const argumentos = { ...corpo.argumentos };
  for (const porta of portas) Object.assign(argumentos, porta.argumentos);
  return { composicao: ID_DO_CONJUNTO(parametros.portas, parametros.prateleiras, parametros.cabideiro), argumentos };
}
