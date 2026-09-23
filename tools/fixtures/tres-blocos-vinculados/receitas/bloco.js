/* bloco.js — o bloco da fixture neutra "três blocos vinculados", nas três
   variações que ela usa: só pino, furo e pino, e só furo. Um arquivo só gera as
   três, porque a forma é a mesma e o que muda é quais aberturas o bloco tem.

   Segue a cadeia da casa: a `TABELA` em milímetros é exportada como `PARAMS`,
   `derivar()` converte para metro, e `gerarPassos()` escreve os passos em
   metro. Os raios de furo e de pino são os parâmetros que a montagem
   `tres-blocos` deriva das portas do bloco de baixo. */

const m = (mm) => mm / 1000;
const ID = Object.freeze({ corpo: 1, furo: 2, pino: 3 });

export function derivar(t) {
  return {
    raioDoCorpo: m(t.raioDoCorpo),
    alturaDoCorpo: m(t.alturaDoCorpo),
    raioDoFuro: m(t.raioDoFuro),
    raioDoPino: m(t.raioDoPino),
    alturaDoPino: m(t.alturaDoPino),
  };
}

export function gerarPassos(t, { comFuro, comPino }) {
  const P = derivar(t);
  const passos = [['cilindro', { origemId: ID.corpo, raio: P.raioDoCorpo, altura: P.alturaDoCorpo, lados: 32 }]];
  if (comFuro) {
    passos.push(['furo', {
      origemId: ID.furo,
      de: { op: 'cilindro', id: ID.corpo, tampa: 'topo' },
      saida: { op: 'cilindro', id: ID.corpo, tampa: 'fundo' },
      centro: [0, P.alturaDoCorpo, 0],
      raio: P.raioDoFuro,
      lados: 24,
    }]);
    passos.push(['publicarPorta', { nome: 'furo', de: { op: 'cilindro', id: ID.corpo }, interface: {
      forma: 'cilindro', papel: 'interna', eixo: [0, 1, 0], centro: [0, 0, 0],
      raio: P.raioDoFuro, inicio: 0, fim: P.alturaDoCorpo,
    } }]);
  }
  passos.push(['parte', { nome: 'corpo', sel: { origem: { op: 'cilindro', id: ID.corpo } } }]);
  if (comPino) {
    passos.push(['cilindro', { origemId: ID.pino, raio: P.raioDoPino, altura: P.alturaDoPino, lados: 24, em: [0, P.alturaDoCorpo, 0] }]);
    passos.push(['publicarPorta', { nome: 'pino', de: { op: 'cilindro', id: ID.pino }, interface: {
      forma: 'cilindro', papel: 'externa', eixo: [0, 1, 0], centro: [0, P.alturaDoCorpo, 0],
      raio: P.raioDoPino, inicio: 0, fim: P.alturaDoPino,
    } }]);
    passos.push(['parte', { nome: 'pino', sel: { origem: { op: 'cilindro', id: ID.pino } } }]);
  }
  return passos;
}

function bloco(nome, variacao, TABELA) {
  return {
    meta: { nome, desc: 'bloco da fixture neutra de vínculos de medida; não é conteúdo' },
    PARAMS: TABELA,
    get PASSOS() { return gerarPassos(this.PARAMS, variacao); },
  };
}

/* Os raios que a montagem deriva estão aqui com um valor qualquer: a prova é
   justamente que o valor usado na montagem vem da vizinha, e não daqui. */
export const blocoComPino = bloco('bloco-com-pino', { comFuro: false, comPino: true },
  { raioDoCorpo: 30, alturaDoCorpo: 20, raioDoFuro: 0, raioDoPino: 10, alturaDoPino: 15 });
export const blocoComFuroEPino = bloco('bloco-com-furo-e-pino', { comFuro: true, comPino: true },
  { raioDoCorpo: 30, alturaDoCorpo: 20, raioDoFuro: 1, raioDoPino: 1, alturaDoPino: 15 });
export const blocoComFuro = bloco('bloco-com-furo', { comFuro: true, comPino: false },
  { raioDoCorpo: 30, alturaDoCorpo: 20, raioDoFuro: 1, raioDoPino: 0, alturaDoPino: 0 });

export const RECEITAS = Object.freeze({
  'bloco-com-pino': blocoComPino,
  'bloco-com-furo-e-pino': blocoComFuroEPino,
  'bloco-com-furo': blocoComFuro,
});
