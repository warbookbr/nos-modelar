/* formas.js — objetos sintéticos pequenos para os testes do desenho por restrições: uma chapa com furo e trava (polígono, círculo,
   barra e as relações paralela, perpendicular, igual, horizontal, sobre e ângulo), uma meia-lua (arco) e duas rodas que se tocam
   (tangência entre círculos). Cada um tem a geometria resolvida conhecida por conta de cabeça. */

export const chapa = () => ({
  formato: 'mecanifica.desenho@1',
  objeto: 'chapa com furo',
  vista: 'frontal',
  referencias: { chao: { reta: 'horizontal', v: 0 }, parede: { reta: 'vertical', h: 0 } },
  pontos: { A: [3, 4], B: [180, 10], C: [190, 90], D: [20, 110], F: [95, 45], Z: [110, 60] },
  partes: { chapa: { poligono: ['A', 'B', 'C', 'D'] }, furo: { circulo: { centro: 'F' } }, trava: { barra: ['F', 'Z'], espessura: 4 } },
  frenteParaFundo: ['trava', 'furo', 'chapa'],
  relacoes: [
    { nome: 'A no chão', sobre: ['A', 'chao'] },
    { nome: 'A na parede', sobre: ['A', 'parede'] },
    { nome: 'B de nível com A', horizontal: ['A', 'B'] },
    { nome: 'largura', distancia: ['A', 'B'], mm: 200 },
    { nome: 'C a prumo de B', perpendicular: [['A', 'B'], ['B', 'C']] },
    { nome: 'altura', distancia: ['B', 'C'], mm: 100 },
    { nome: 'topo paralelo', paralela: [['C', 'D'], ['A', 'B']] },
    { nome: 'topo igual à base', igual: [['C', 'D'], ['A', 'B']] },
    { nome: 'raio do furo', raio: 'furo', mm: 20 },
    { nome: 'furo a 50 do chão', distancia: ['F', 'chao'], mm: 50, lado: 'acima' },
    { nome: 'furo a 100 da parede', distancia: ['F', 'parede'], mm: 100, lado: 'direita' },
    { nome: 'trava no furo', sobre: ['Z', 'furo'] },
    { nome: 'trava a 45', angulo: ['chao', ['F', 'Z']], graus: 45 },
  ],
});

export const meiaLua = () => ({
  formato: 'mecanifica.desenho@1',
  objeto: 'meia lua',
  vista: 'frontal',
  referencias: { chao: { reta: 'horizontal', v: 0 }, eixo: { reta: 'vertical', h: 0 } },
  pontos: { M: [5, 90], S: [60, 92], E: [-55, 88] },
  partes: { lua: { arco: { centro: 'M', inicio: 'S', fim: 'E' } } },
  relacoes: [
    { nome: 'centro no eixo', sobre: ['M', 'eixo'] },
    { nome: 'centro a 100', distancia: ['M', 'chao'], mm: 100, lado: 'acima' },
    { nome: 'raio da lua', raio: 'lua', mm: 50 },
    { nome: 'início de nível', horizontal: ['M', 'S'] },
    { nome: 'fim de nível', horizontal: ['M', 'E'] },
  ],
});

export const duasRodas = (chuteDoQ = [100, 100], por = 'fora') => ({
  formato: 'mecanifica.desenho@1',
  objeto: 'duas rodas',
  vista: 'frontal',
  referencias: { chao: { reta: 'horizontal', v: 0 }, eixo: { reta: 'vertical', h: 0 } },
  pontos: { P: [3, 99], Q: chuteDoQ },
  partes: { grande: { circulo: { centro: 'P' } }, pequena: { circulo: { centro: 'Q' } } },
  relacoes: [
    { nome: 'P no eixo', sobre: ['P', 'eixo'] },
    { nome: 'P a 100', distancia: ['P', 'chao'], mm: 100, lado: 'acima' },
    { nome: 'Q a 100', distancia: ['Q', 'chao'], mm: 100, lado: 'acima' },
    { nome: 'raio da grande', raio: 'grande', mm: 40 },
    { nome: 'raio da pequena', raio: 'pequena', mm: 25 },
    { nome: 'se tocam', tangente: ['grande', 'pequena'], por },
  ],
});
