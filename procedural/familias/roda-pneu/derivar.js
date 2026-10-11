/* derivar.js — dos parâmetros da família `roda-pneu` (milímetro, contagem) aos argumentos da composição (metro).

   Puro e determinístico: nenhuma leitura de relógio, de sorteio ou de arquivo. As medidas que a família não expõe como
   parâmetro são constantes de projeto, escritas aqui com o nome do que são: a parede do barril do aro, a saliência do
   cubo para dentro, o chanfro do ombro e a altura do bojo no flanco. As restrições do `familia.json` citam as mesmas
   constantes (os 12 mm de saliência do cubo, por exemplo), de modo que mudar uma delas pede mudar a outra; o teste
   `roda-pneu.test.js` mede a peça contra as duas. */
import { ID_RODA_DE_DISCO } from './composicoes.js';

const MM = 0.001;
export const PAREDE_DO_ARO = 5;
export const SALIENCIA_DO_CUBO = 12;
export const CHANFRO_MAXIMO_DO_OMBRO = 8;
export const FRACAO_DO_CHANFRO = 0.12;
export const ALTURA_DO_BOJO = 0.35;
const FOLGA_DA_FERRAMENTA = 5;

export function derivar({
  diametroPneu, larguraPneu, diametroAro, larguraAro, espessuraDisco, diametroCubo, diametroFuroCentral,
  furosDeFixacao, diametroCirculoFuros, diametroFuro, desvio,
}) {
  const raioDoPneu = diametroPneu / 2;
  const raioDoAssento = diametroAro / 2;
  const flanco = raioDoPneu - raioDoAssento;
  const chanfro = Math.min(CHANFRO_MAXIMO_DO_OMBRO, FRACAO_DO_CHANFRO * flanco);
  const meiaLargura = larguraPneu / 2;
  const meiaLarguraDoAro = larguraAro / 2;
  const inicioDoCubo = desvio - espessuraDisco / 2 - SALIENCIA_DO_CUBO;
  const inicioDaChapa = desvio - espessuraDisco / 2;
  const fimDaChapa = desvio + espessuraDisco / 2;
  const mm = (valor) => valor * MM;
  return {
    composicao: ID_RODA_DE_DISCO,
    argumentos: {
      raioDoPneu: mm(raioDoPneu),
      raioDoOmbro: mm(raioDoPneu - chanfro),
      raioDoBojo: mm(raioDoAssento + ALTURA_DO_BOJO * flanco),
      raioDoAssento: mm(raioDoAssento),
      inicioDaLargura: mm(-meiaLargura),
      meiaLargura: mm(meiaLargura),
      inicioDaBanda: mm(-(meiaLargura - chanfro)),
      meiaLarguraDaBanda: mm(meiaLargura - chanfro),
      inicioDoAro: mm(-meiaLarguraDoAro),
      meiaLarguraDoAro: mm(meiaLarguraDoAro),
      raioInternoDoAro: mm(raioDoAssento - PAREDE_DO_ARO),
      raioDoFuroCentral: mm(diametroFuroCentral / 2),
      raioDoCubo: mm(diametroCubo / 2),
      raioDoCirculoDeFuros: mm(diametroCirculoFuros / 2),
      raioDoFuro: mm(diametroFuro / 2),
      inicioDoCubo: mm(inicioDoCubo),
      inicioDaChapa: mm(inicioDaChapa),
      fimDaChapa: mm(fimDaChapa),
      inicioDaFerramenta: mm(inicioDoCubo - FOLGA_DA_FERRAMENTA),
      fimDaFerramenta: mm(fimDaChapa + FOLGA_DA_FERRAMENTA),
      passoAngular: 360 / furosDeFixacao,
      inicioDaPortaDoPneu: mm(-larguraPneu),
      inicioDaPortaDoEixo: mm(inicioDoCubo - fimDaChapa),
      profundidadeDosFuros: mm(fimDaChapa - inicioDoCubo),
      diametroDoFuro: mm(diametroFuro),
      raioDaChapa: mm(raioDoAssento - PAREDE_DO_ARO),
      furos: furosDeFixacao,
    },
  };
}
