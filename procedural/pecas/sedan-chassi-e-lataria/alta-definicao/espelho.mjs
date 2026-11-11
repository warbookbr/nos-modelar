/* espelho.mjs: o lado esquerdo das peças soltas do sedã em alta definição (ciclo 5). A chapa que cruza o eixo (o corpo de baixo, a
 * cabine, os painéis da frente e de trás, a tomada de ar, o para-brisa e o vidro traseiro) sai inteira pela `simetria: 'x'` da gaiola,
 * que o passo espelha antes de subdividir. A peça que fica de um lado só (o vidro da porta, a lente do farol, a lanterna) é a cópia
 * espelhada da gaiola: os pontos com x trocado de sinal e o sufixo do lado no nome, as faces na ordem inversa (a normal continua para
 * fora) e os vincos e cantos pelos nomes novos. Os nomes de parte trocam `Dir` por `Esq`. */

/** O nome do lado esquerdo: `Dir` no fim vira `Esq`; sem ele, o sufixo `Esq` vai no fim. */
export const doLadoEsquerdo = (nome) => (/Dir$/.test(nome) ? nome.replace(/Dir$/, 'Esq') : `${nome}Esq`);

/** A cópia espelhada em x de uma gaiola já convertida para mm: `{ pontos, passo }`, com os nomes dos pontos trocados por `renomear`. */
export function espelharGaiola({ pontosMm, passo }, renomear = (n) => `${n}_esq`) {
  const pontos = Object.fromEntries(Object.entries(pontosMm).map(([n, [x, y, z]]) => [renomear(n), [-x, y, z]]));
  const r = (n) => renomear(n);
  const novo = {
    ...passo,
    vertices: passo.vertices.map(r),
    faces: passo.faces.map((f) => [...f].reverse().map(r)),
    ...(passo.vincos ? { vincos: passo.vincos.map((v) => ({ ...v, ...(v.nome ? { nome: renomear(v.nome) } : {}), pontos: v.pontos.map(r) })) } : {}),
    ...(passo.cantos ? { cantos: passo.cantos.map(r) } : {}),
  };
  return { pontos, passo: novo };
}

/** Uma linha de pontos em mm espelhada em x. */
export const espelharLinha = (pontos) => pontos.map(([x, y, z]) => [-x, y, z]);
