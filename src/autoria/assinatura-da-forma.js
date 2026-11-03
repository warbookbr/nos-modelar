/* assinatura-da-forma.js — a impressão do que uma receita gera, para a etapa
   fixa saber se a peça que a pessoa aceitou continua a mesma.

   Comparar o texto da receita quebrava a etapa por um comentário, por uma
   imagem retirada do `PLANO.referencias` ou por uma reformatação, sem a forma
   mudar. A assinatura vem da malha executada: cada face entra pelo ciclo de
   coordenadas em forma canônica (rotação, sentido e numeração de vértices não
   contam), com a parte, a cor, o material, o liso, o sólido e as quebras de
   sombra. Mover um vértice, trocar um material ou mudar a quina que o
   sombreamento suaviza altera a assinatura; comentário, `PLANO`, `meta` e
   passos que dão a mesma malha não alteram. Um `PLANO` que muda critérios não
   quebra a etapa: o aceite foi dado à forma, e o critério novo entra pelo laço
   do crítico, que já cobra a receita que mudou depois da última rodada. */
import { cicloCanonicoDaFace } from './descrever-partes.js';
import { sha256Hex } from './assinatura-geometria.js';

const comparar = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

export function assinaturaDaForma(neutro) {
  const quem = 'assinaturaDaForma';
  const ponto = (id) => JSON.stringify(neutro.V.get(id).map((v) => (Object.is(v, -0) ? 0 : v)));
  const faces = [...neutro.F.values()].map((face) => {
    const quebras = (face.quebras ?? []).map(([a, b]) => [ponto(a), ponto(b)].sort(comparar).join('~')).sort(comparar);
    return JSON.stringify([
      cicloCanonicoDaFace(face, neutro, quem), face.parte ?? null, face.cor ?? null, face.material ?? null,
      typeof face.liso === 'number' ? face.liso : !!face.liso, !!face.solido, quebras,
    ]);
  }).sort(comparar);
  return `sha256:${sha256Hex(faces.join('\n'))}`;
}
