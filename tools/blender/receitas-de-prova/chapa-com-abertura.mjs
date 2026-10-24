/* chapa-com-abertura.mjs — a receita desenhada por código com que se prova a conferência do refino entre receitas: uma chapa
   de 1 m (x) por 0,6 m (y) e 6 mm de espessura, com a face de fora para +z, e uma abertura retangular. Uma rodada de refino é
   uma chamada de `receitaDaChapa`: a segunda rodada acrescenta o friso em volta da abertura (uma parte nova, por cima da
   chapa) e arredonda um canto da abertura; a terceira, além disso, baixa a abertura 45 mm. Em metro, y para cima e a frente
   em +z; nenhum dado vem de referência externa. */

export const CHAPA = { largura: 1.0, altura: 0.6, espessura: 0.006 };
/** A abertura da primeira rodada: 400 por 200 mm, de x 300 a 700 e de y 250 a 450 mm. */
export const ABERTURA = { x0: 0.3, x1: 0.7, y0: 0.25, y1: 0.45 };
/** O raio, em metro, com que a segunda rodada arredonda o canto inferior esquerdo da abertura. */
export const RAIO_DO_CANTO = 0.03;
/** O friso: uma moldura de 20 mm de largura e 4 mm de altura sobre a chapa, com o vão da abertura. */
export const FRISO = { largura: 0.02, altura: 0.004 };

/* No perfil da extrusão em z o segundo eixo (v) sai em -y no mundo, e o retângulo vai de x0 a x1 e de y0 a y1 do mundo. */
const retangulo = (x0, x1, y0, y1, cantos) => ({
  retangulo: { largura: x1 - x0, profundidade: y1 - y0, centro: [(x0 + x1) / 2, -(y0 + y1) / 2], ...(cantos ? { cantos } : {}) },
});

/** receitaDaChapa({ friso, canto, desce }) -> a receita { PARAMS, PASSOS }: `friso` acrescenta a parte "friso" em volta da
 *  abertura, `canto` arredonda o canto inferior esquerdo da abertura com o raio dado (metro) e `desce` baixa a abertura, em
 *  metro. A parte "chapa" é a mesma nas três. */
export function receitaDaChapa({ friso = false, canto = 0, desce = 0 } = {}) {
  const a = { x0: ABERTURA.x0, x1: ABERTURA.x1, y0: ABERTURA.y0 - desce, y1: ABERTURA.y1 - desce };
  const cantos = canto ? [0, canto, 0, 0] : undefined;
  const passos = [
    ['extrusao', {
      origemId: 1, eixo: 'z', altura: CHAPA.espessura,
      perfil: retangulo(0, CHAPA.largura, 0, CHAPA.altura),
      furos: [retangulo(a.x0, a.x1, a.y0, a.y1, cantos)],
    }],
    ['parte', { nome: 'chapa', sel: { origem: { op: 'extrusao', id: 1 } } }],
  ];
  if (friso) {
    const f = FRISO.largura;
    passos.push(
      ['extrusao', {
        origemId: 2, eixo: 'z', altura: FRISO.altura, em: [0, 0, CHAPA.espessura],
        perfil: retangulo(a.x0 - f, a.x1 + f, a.y0 - f, a.y1 + f),
        furos: [retangulo(a.x0, a.x1, a.y0, a.y1, cantos)],
      }],
      ['parte', { nome: 'friso', sel: { origem: { op: 'extrusao', id: 2 } } }],
    );
  }
  return { PARAMS: {}, PASSOS: passos };
}
