/* tracados.mjs — os traçados neutros da prova da tubulação: a rede de aço de 2" com duas curvas, um tê e uma redução para
 * 1 1/2", e a de PVC de 50 mm em L. Em milímetro. */
export const REDE_DE_ACO = Object.freeze({
  material: 'aco',
  nos: [
    { nome: 'entrada', posicao: [0, 0, 0] },
    { nome: 'curva1', posicao: [600, 0, 0] },
    { nome: 'te', posicao: [600, 0, 500] },
    { nome: 'ramal', posicao: [1000, 0, 500] },
    { nome: 'curva2', posicao: [600, 0, 1100] },
    { nome: 'reducao', posicao: [600, 600, 1100] },
    { nome: 'saida', posicao: [600, 1000, 1100] },
  ],
  trechos: [
    { de: 'entrada', para: 'curva1', bitola: '2' },
    { de: 'curva1', para: 'te', bitola: '2' },
    { de: 'te', para: 'ramal', bitola: '2' },
    { de: 'te', para: 'curva2', bitola: '2' },
    { de: 'curva2', para: 'reducao', bitola: '2' },
    { de: 'reducao', para: 'saida', bitola: '1.1/2' },
  ],
});

export const L_DE_PVC = Object.freeze({
  material: 'pvc',
  nos: [{ nome: 'a', posicao: [0, 0, 0] }, { nome: 'b', posicao: [400, 0, 0] }, { nome: 'c', posicao: [400, 300, 0] }],
  trechos: [{ de: 'a', para: 'b', bitola: '50' }, { de: 'b', para: 'c', bitola: '50' }],
});
