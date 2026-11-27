/* casos.mjs — os casos de prova da família `cabo`: cada um é uma chamada com só o que difere dos padrões (as pontas em milímetro, a direção de
   saída de cada ponta, o comprimento ou a folga, o diâmetro). Servem ao teste da família, à medida dos casos e às imagens do banco de provas. */
export const CASOS_DO_CABO = Object.freeze({
  laco: { descricao: 'pontas próximas (30 mm) saindo para cima, cabo de 300 mm: o laço', parametros: { adx: 0, ady: 1, adz: 0, dx: 30, bdx: 0, bdy: 1, bdz: 0, comprimento: 300, diametro: 4 } },
  frente: { descricao: 'pontas viradas uma para a outra, a 120 mm, cabo de 170 mm', parametros: { dx: 120, comprimento: 170, diametro: 4 } },
  u: { descricao: 'pontas paralelas lado a lado, a 60 mm, saindo para cima, cabo de 200 mm: o U', parametros: { adx: 0, ady: 1, adz: 0, dx: 60, bdx: 0, bdy: 1, bdz: 0, comprimento: 200, diametro: 4 } },
  esticado: { descricao: 'pontas viradas uma para a outra, a 200 mm, cabo de 201 mm (0,5% de folga)', parametros: { dx: 200, comprimento: 201, diametro: 4 } },
  caimento: { descricao: 'pontas viradas uma para a outra, a 200 mm, cabo de 230 mm, caindo pelo peso (caimento 20)', parametros: { dx: 200, comprimento: 230, diametro: 4, caimento: 20 } },
  tridimensional: { descricao: 'pontas fora de um plano, a 150, 40 e 80 mm, cabo de 300 mm', parametros: { adx: 0.7071, ady: 0.7071, adz: 0, dx: 150, dy: 40, dz: 80, bdx: 0, bdy: 0.7071, bdz: -0.7071, comprimento: 300, diametro: 4 } },
});
