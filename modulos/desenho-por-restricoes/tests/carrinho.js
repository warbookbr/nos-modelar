/* carrinho.js — a lateral de um carrinho de mão, a descrição que os testes do desenho por restrições usam: 17 relações que fecham o
   desenho sem grau de liberdade, e os valores em que quatro resolvedores (planegcs, libslvs do SolveSpace, Sketcher do FreeCAD e a
   linha de comando do CADCraft) concordaram até o milésimo de milímetro. Os quatro cenários e o chute espelhado saem dela por
   cópia. Objeto sintético: nenhuma medida aqui vem de uma imagem de referência. */

export const carrinho = () => ({
  formato: 'mecanifica.desenho@1',
  objeto: 'carrinho de mão',
  vista: 'lateral',
  olhando: 'do lado esquerdo, roda à esquerda',
  referencias: { chao: { reta: 'horizontal', v: 0 }, eixoDaRoda: { reta: 'vertical', h: 0 } },
  pontos: {
    C: [10, 180], H: [1400, 700], F: [1000, 500], G: [1000, 10],
    A: [260, 300], B: [900, 500], D: [900, 850], E: [0, 850],
  },
  partes: {
    roda: { circulo: { centro: 'C' } },
    braco: { barra: ['C', 'H'], espessura: 40 },
    pe: { barra: ['F', 'G'], espessura: 30 },
    cacamba: { poligono: ['A', 'B', 'D', 'E'] },
  },
  relacoes: [
    { nome: 'raio da roda', raio: 'roda', mm: 200 },
    { nome: 'roda no chão', tangente: ['roda', 'chao'], lado: 'acima' },
    { nome: 'roda no eixo', sobre: ['C', 'eixoDaRoda'] },
    { nome: 'comprimento do braço', distancia: ['C', 'H'], mm: 1500 },
    { nome: 'altura do pegador', distancia: ['H', 'chao'], mm: 650, lado: 'acima' },
    { nome: 'pé preso no braço', sobre: ['F', 'braco'] },
    { nome: 'posição do pé', distancia: ['C', 'F'], mm: 1050 },
    { nome: 'pé no chão', sobre: ['G', 'chao'] },
    { nome: 'pé a prumo', vertical: ['F', 'G'] },
    { nome: 'folga do fundo', distancia: ['A', 'braco'], mm: 80, lado: 'acima' },
    { nome: 'frente do fundo', distancia: ['A', 'eixoDaRoda'], mm: 250, lado: 'direita' },
    { nome: 'fundo junto do braço', paralela: [['A', 'B'], 'braco'] },
    { nome: 'comprimento do fundo', distancia: ['A', 'B'], mm: 650 },
    { nome: 'traseira a prumo', vertical: ['B', 'D'] },
    { nome: 'altura da borda', distancia: ['D', 'chao'], mm: 900, lado: 'acima' },
    { nome: 'borda de nível', horizontal: ['D', 'E'] },
    { nome: 'inclinação da frente', angulo: [['A', 'B'], ['A', 'E']], graus: 120 },
  ],
});

/* Onde os quatro resolvedores concordaram, em milímetro. */
export const VALORES_DO_CARRINHO = {
  C: [0, 200], H: [1430.909, 650], F: [1001.636, 515], G: [1001.636, 0],
  A: [250, 362.484], B: [870.06, 557.484], D: [870.06, 900], E: [-335.725, 900],
};

/* O chute espelhado: a caçamba inteira abaixo do braço. O planegcs devolve sucesso, zero grau de liberdade e a frente em -518. */
export const chuteEspelhado = () => {
  const d = carrinho();
  d.pontos.A = [300, 150]; d.pontos.B = [900, 380]; d.pontos.E = [100, 850];
  return d;
};

/* Conflito: uma segunda altura para o pegador. */
export const carrinhoEmConflito = () => {
  const d = carrinho();
  d.relacoes.push({ nome: 'altura do pegador (de novo)', distancia: ['H', 'chao'], mm: 700, lado: 'acima' });
  return d;
};

/* Faltando: sem a altura da borda, a traseira, a borda e a frente da caçamba ficam soltas. */
export const carrinhoFaltando = () => {
  const d = carrinho();
  d.relacoes = d.relacoes.filter((r) => r.nome !== 'altura da borda');
  return d;
};

/* Redundante: o comprimento do fundo repetido por uma relação que o próprio resultado já implica. */
export const carrinhoRedundante = () => {
  const d = carrinho();
  d.relacoes.push({ nome: 'folga do fundo (de novo)', distancia: ['B', 'braco'], mm: 80, lado: 'acima' });
  return d;
};
