/* derivar.js — dos parâmetros da família `roda-pneu` (milímetro, contagem) aos argumentos da composição (metro).

   O parâmetro `tipo` escolhe a composição: 0 é a roda de disco e 1 a roda raiada, cujos raios são barras da estrutura de
   barras. Na roda de disco os parâmetros do raio não entram em argumento nenhum e os argumentos são os mesmos de antes de
   a variante raiada existir; por isso o hash do disco não depende deles. Na raiada, cada raio vai de um nó no cubo, a
   `ENTRADA_DO_RAIO_NO_CUBO` abaixo da superfície do cubo, a um nó na parede interna do aro, todos no plano do meio da
   flange do cubo (o plano da chapa da roda de disco). Com `cruzamento` 0 o raio é radial. Com `cruzamento` c, o nó do aro
   fica c passos angulares adiante do nó do cubo nos raios pares e c passos atrás nos ímpares, o que faz cada raio cruzar c
   raios do sentido oposto, como na trama de roda de raios; por isso o número de raios é par quando há cruzamento. A ponta
   do raio é um corte reto, e o raio mais grosso que o contrato aceita tem 6 mm de raio, a mesma entrada no cubo; com a
   restrição de 0,3 de componente radial, a ponta nunca passa da superfície do cubo.

   Puro e determinístico: nenhuma leitura de relógio, de sorteio ou de arquivo. As medidas que a família não expõe como
   parâmetro são constantes de projeto, escritas aqui com o nome do que são: a parede do barril do aro, a saliência do
   cubo para dentro, o chanfro do ombro e a altura do bojo no flanco. As restrições do `familia.json` citam as mesmas
   constantes (os 12 mm de saliência do cubo, por exemplo), de modo que mudar uma delas pede mudar a outra; o teste
   `roda-pneu.test.js` mede a peça contra as duas. */
import {
  ARGUMENTOS_ESCALARES_DA_RAIADA, ID_RODA_DE_DISCO, idDaRodaRaiada, nomeDoNoDoAro, nomeDoNoDoCubo,
} from './composicoes.js';

const MM = 0.001;
export const PAREDE_DO_ARO = 5;
export const SALIENCIA_DO_CUBO = 12;
export const CHANFRO_MAXIMO_DO_OMBRO = 8;
export const FRACAO_DO_CHANFRO = 0.12;
export const ALTURA_DO_BOJO = 0.35;
export const ENTRADA_DO_RAIO_NO_CUBO = 6;
const FOLGA_DA_FERRAMENTA = 5;
/* posição de nó em metro, arredondada a 0,1 nm: tira o ruído da última casa de seno e cosseno do hash da geometria */
const arredondar = (valor) => Math.round(valor * 1e10) / 1e10;

export function derivar({
  diametroPneu, larguraPneu, diametroAro, larguraAro, espessuraDisco, diametroCubo, diametroFuroCentral,
  furosDeFixacao, diametroCirculoFuros, diametroFuro, desvio, tipo, raios, diametroRaio, paredeDoRaio, cruzamento,
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
  const argumentos = {
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
  };
  if (tipo === 0) return { composicao: ID_RODA_DE_DISCO, argumentos };
  const maciço = paredeDoRaio === 0;
  const raiada = Object.fromEntries(ARGUMENTOS_ESCALARES_DA_RAIADA.filter((nome) => nome !== 'diametroDoRaio').map((nome) => [nome, argumentos[nome]]));
  raiada.furos = argumentos.furos;
  raiada.diametroDoRaio = mm(diametroRaio);
  if (!maciço) raiada.paredeDoRaio = mm(paredeDoRaio);
  const xDoRaio = desvio;
  const raioDoNoDoCubo = diametroCubo / 2 - ENTRADA_DO_RAIO_NO_CUBO;
  const raioDoNoDoAro = raioDoAssento - PAREDE_DO_ARO;
  const passo = 360 / raios;
  const noEm = (raio, graus) => [
    arredondar(mm(xDoRaio)), arredondar(mm(raio * Math.cos((graus * Math.PI) / 180))), arredondar(mm(raio * Math.sin((graus * Math.PI) / 180))),
  ];
  for (let k = 0; k < raios; k++) {
    const sentido = k % 2 === 0 ? 1 : -1;
    raiada[nomeDoNoDoCubo(k)] = noEm(raioDoNoDoCubo, k * passo);
    raiada[nomeDoNoDoAro(k)] = noEm(raioDoNoDoAro, k * passo + sentido * cruzamento * passo);
  }
  /* a caixa que só os raios enchem: a laje do plano da flange, com folga de 0,1 mm, até o raio do aro mais a ponta do raio */
  const folga = 0.1;
  const limite = raioDoNoDoAro + diametroRaio / 2 + folga;
  raiada.regiaoDosRaiosMinima = [arredondar(mm(desvio - diametroRaio / 2 - folga)), arredondar(mm(-limite)), arredondar(mm(-limite))];
  raiada.regiaoDosRaiosMaxima = [arredondar(mm(desvio + diametroRaio / 2 + folga)), arredondar(mm(limite)), arredondar(mm(limite))];
  return { composicao: idDaRodaRaiada(raios, maciço), argumentos: raiada };
}
