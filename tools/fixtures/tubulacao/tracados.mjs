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

/* a rede só de curvas e tampão, para a fatia 2: um zigue-zague em três dimensões, de 2", com o fim fechado */
export const ZIGUE_ZAGUE = Object.freeze({
  material: 'aco',
  nos: [
    { nome: 'a', posicao: [0, 0, 0] },
    { nome: 'b', posicao: [500, 0, 0] },
    { nome: 'c', posicao: [500, 400, 0] },
    { nome: 'd', posicao: [500, 400, 600] },
    { nome: 'e', posicao: [900, 800, 600], fim: 'tampao' },
  ],
  trechos: [
    { de: 'a', para: 'b', bitola: '2' },
    { de: 'b', para: 'c', bitola: '2' },
    { de: 'c', para: 'd', bitola: '2' },
    { de: 'd', para: 'e', bitola: '2' },
  ],
});

/* a rede de prova do plano: dez nós de aço de 2", com o flange na entrada e na ponta do ramal, a válvula de esfera na
   linha e a de gaveta no ramal, três curvas, o tê e a redução para 1 1/2" */
export const REDE_DE_PROVA = Object.freeze({
  material: 'aco',
  nos: [
    { nome: 'entrada', posicao: [0, 0, 0], fim: 'flange' },
    { nome: 'esfera', posicao: [700, 0, 0], valvula: 'esfera' },
    { nome: 'curva1', posicao: [1400, 0, 0] },
    { nome: 'te', posicao: [1400, 0, 700] },
    { nome: 'gaveta', posicao: [1800, 0, 700], valvula: 'gaveta' },
    { nome: 'ramal', posicao: [2400, 0, 700], fim: 'flange' },
    { nome: 'curva2', posicao: [1400, 0, 1500] },
    { nome: 'reducao', posicao: [1400, 800, 1500] },
    { nome: 'curva3', posicao: [1400, 1300, 1500] },
    { nome: 'saida', posicao: [1900, 1300, 1500] },
  ],
  trechos: [
    { de: 'entrada', para: 'esfera', bitola: '2' },
    { de: 'esfera', para: 'curva1', bitola: '2' },
    { de: 'curva1', para: 'te', bitola: '2' },
    { de: 'te', para: 'gaveta', bitola: '2' },
    { de: 'gaveta', para: 'ramal', bitola: '2' },
    { de: 'te', para: 'curva2', bitola: '2' },
    { de: 'curva2', para: 'reducao', bitola: '2' },
    { de: 'reducao', para: 'curva3', bitola: '1.1/2' },
    { de: 'curva3', para: 'saida', bitola: '1.1/2' },
  ],
});
