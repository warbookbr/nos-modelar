/* Fixture de teste: o `derivar` da família `roda-com-esboco`. Puro: recebe os parâmetros em milímetro, já completados com
   os padrões, e devolve a composição e os argumentos dela em metro. A roda tem o cubo e a espessura do disco do componente
   `roda` do esboço (cubo de 90 mm de diâmetro e 30 mm de saliência de cada lado, disco de um terço da largura), que a
   família repete porque é essa repetição que a conferência com o esboço protege.

   `defeito` existe só para os testes provarem a recusa: `excessoDoPneu` (mm) engorda o raio do pneu além do volume do
   esboço, e a porta do assento acompanha o pneu e publica o raio dele; `excessoDoAssento` (mm) move só o raio externo que
   a porta do assento publica. */
import { ID_RODA } from './composicoes.js';

const MM = 0.001;
const DIAMETRO_DO_CUBO = 90;
const SALIENCIA_DO_CUBO = 30;

export const criarDerivar = ({ excessoDoPneu = 0, excessoDoAssento = 0 } = {}) => function derivar({ diametro, aro, largura }) {
  const disco = largura / 3;
  return {
    composicao: ID_RODA,
    argumentos: {
      raioDoPneu: (diametro / 2 + excessoDoPneu) * MM,
      raioDoAro: (aro / 2) * MM,
      inicioDoPneu: (-largura / 2) * MM,
      meiaLargura: (largura / 2) * MM,
      inicioDoDisco: (-disco / 2) * MM,
      meiaEspessuraDoDisco: (disco / 2) * MM,
      raioDoCubo: (DIAMETRO_DO_CUBO / 2) * MM,
      inicioDoCuboE: (-disco / 2 - SALIENCIA_DO_CUBO) * MM,
      fimDoCubo: (disco / 2 + SALIENCIA_DO_CUBO) * MM,
      raioDoAssento: (diametro / 2 + excessoDoPneu + excessoDoAssento) * MM,
      profundidadeDoAssento: -largura * MM,
      profundidadeDoCubo: -SALIENCIA_DO_CUBO * MM,
      lados: 128,
    },
  };
};

export const derivar = criarDerivar();
