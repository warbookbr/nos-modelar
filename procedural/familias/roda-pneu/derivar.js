/* derivar.js — dos parâmetros da família `roda-pneu` (o diâmetro em milímetro, as medidas em proporção do diâmetro, as
   contagens em contagem) aos argumentos da composição (metro).

   Quase todas as medidas são proporções do diâmetro do pneu (`diametroPneu`, o diâmetro de rodagem), de modo que o mínimo e o
   máximo de cada uma fazem sentido em qualquer escala, de 50 a 2000 mm. A largura do aro é a proporção da largura do pneu, a
   parede do raio é a proporção do diâmetro do raio, e a profundidade do sulco é a proporção do flanco (a metade da diferença
   entre o diâmetro do pneu e o do aro). As poucas medidas que a família não expõe são constantes de projeto escritas aqui com o
   nome do que são e, quando absolutas, em milímetro: o chanfro do ombro não passa de 9 mm porque a conferência da porta do
   assento mede o raio dentro de 10 mm do plano da face. As restrições do `familia.json` citam as mesmas constantes (a relação
   do friso com a banda, o raio dos nós dos raios), de modo que mudar uma delas pede mudar a outra; o teste `roda-pneu.test.js`
   mede a peça contra as duas.

   A BANDA. `banda` 0 é o pneu pneumático, com o bojo no flanco e a largura do aro própria. 1 é o pneu maciço (rodízio): a seção
   é um anel de lados retos, com a largura do aro igual à da banda. 2 é a roda sem pneu (aço de trem, madeira de carroça), com a
   mesma seção reta, o chanfro pequeno, o material do aço na banda e, se `alturaDoFriso` for maior que zero, o friso do lado de
   dentro. 3 é o pneumático com relevo: `sulcos` prismas, cada um de `larguraDoSulco` do passo e `profundidadeDoSulco` do flanco,
   cortados de lado a lado da banda (garras entre eles, ou sulcos, conforme a largura).

   O CUBO. `tipo` 0 é a roda de disco: o cubo é um anel de `larguraCubo` centrado no `desvio`, e a chapa de `espessuraDisco`
   sobrepõe o meio da parede do cubo e o meio da parede do aro. `tipo` 1 é a raiada de um plano: o cubo é o mesmo anel e os raios
   vão de um nó no meio da parede do cubo a um nó na parede do aro, no plano do `desvio`. `tipo` 2 é a raiada de duas flanges: o
   cubo é um tubo de `diametroCubo` com uma flange de `diametroFlange` e `espessuraDisco` em cada ponta, e os raios saem
   alternados da flange de fora (os de índice par) e da de dentro (os ímpares), do meio da flange, e chegam ao plano do meio do
   aro (x = 0). Com `cruzamento` c, o nó do aro fica c passos angulares adiante do nó do cubo nos raios pares e c passos atrás
   nos ímpares, o que faz cada raio cruzar c raios do sentido oposto; por isso o número de raios é par quando há cruzamento.

   Puro e determinístico: nenhuma leitura de relógio, de sorteio ou de arquivo. */
import { escalaresDaRoda, idDaRoda, nomeDoNoDoAro, nomeDoNoDoCubo } from './composicoes.js';

const MM = 0.001;
export const ALTURA_DO_BOJO = 0.35;
export const FRACAO_DO_CHANFRO = 0.12;
export const FRACAO_DO_CHANFRO_DA_RODA_SEM_PNEU = 0.05;
export const FRACAO_DO_CHANFRO_NA_LARGURA = 0.3;
export const CHANFRO_MAXIMO_DO_OMBRO_MM = 9;
export const ESPESSURA_DO_FRISO = 1.2;
export const TALUDE_DO_FRISO = 0.6;
export const FOLGA_DA_FERRAMENTA = 0.1;
export const FOLGA_DO_PRISMA_DO_SULCO = 0.05;
/* posição de nó em metro, arredondada a 0,1 nm: tira o ruído da última casa de seno e cosseno do hash da geometria */
const arredondar = (valor) => Math.round(valor * 1e10) / 1e10;

export function derivar({
  diametroPneu, larguraPneu, diametroAro, larguraAro, paredeDoAro, banda, tipo, espessuraDisco, larguraCubo, diametroCubo,
  diametroFlange, diametroFuroCentral, furosDeFixacao, diametroCirculoFuros, diametroFuro, desvio, raios, diametroRaio,
  paredeDoRaio, cruzamento, alturaDoFriso, sulcos, profundidadeDoSulco, larguraDoSulco,
}) {
  const D = diametroPneu;
  const alturaDoFrisoMm = alturaDoFriso * D;
  const raioDoFriso = D / 2;
  const raioDoPneu = raioDoFriso - alturaDoFrisoMm;
  const raioDoAssento = (diametroAro * D) / 2;
  const flanco = raioDoPneu - raioDoAssento;
  const parede = paredeDoAro * D;
  const raioInternoDoAro = raioDoAssento - parede;
  const largura = larguraPneu * D;
  const meiaLargura = largura / 2;
  const comAroProprio = banda === 0 || banda === 3;
  const meiaLarguraDoAro = (comAroProprio ? larguraAro * largura : largura) / 2;
  const chanfro = Math.min(
    (banda === 2 ? FRACAO_DO_CHANFRO_DA_RODA_SEM_PNEU : FRACAO_DO_CHANFRO) * flanco, CHANFRO_MAXIMO_DO_OMBRO_MM, FRACAO_DO_CHANFRO_NA_LARGURA * largura,
  );
  const comFriso = alturaDoFrisoMm > 0;
  const passoDaBanda = (largura - 2 * chanfro) / 6;
  const inicioDaBandaEsquerda = comFriso ? -meiaLargura : -meiaLargura + chanfro;
  const fimDoFriso = comFriso ? -meiaLargura + ESPESSURA_DO_FRISO * alturaDoFrisoMm : inicioDaBandaEsquerda + passoDaBanda;
  const fimDoTalude = comFriso ? fimDoFriso + TALUDE_DO_FRISO * alturaDoFrisoMm : fimDoFriso + passoDaBanda;

  /* o desvio é a fração da folga que o aro deixa ao que ocupa o plano: a chapa, o raio ou, na raiada de flanges, o cubo */
  const larguraDoAro = 2 * meiaLarguraDoAro;
  const ocupante = tipo === 0 ? espessuraDisco * D : tipo === 1 ? diametroRaio * D : 0;
  const centroDoCubo = (desvio * (larguraDoAro - ocupante)) / 2;
  const larguraDoCubo = larguraCubo * D;
  const inicioDoCubo = centroDoCubo - larguraDoCubo / 2;
  const fimDoCubo = centroDoCubo + larguraDoCubo / 2;
  const raioDoCubo = (diametroCubo * D) / 2;
  const raioDoFuroCentral = (diametroFuroCentral * D) / 2;
  const raioDaFlange = (diametroFlange * D) / 2;
  const espessura = espessuraDisco * D;
  const folga = FOLGA_DA_FERRAMENTA * larguraDoCubo;
  const mm = (valor) => valor * MM;

  const sulcada = banda === 3;
  const todos = {
    raioDoPneu: mm(raioDoPneu),
    raioDoOmbro: mm(raioDoPneu - chanfro),
    raioDoBojo: mm(raioDoAssento + ALTURA_DO_BOJO * flanco),
    raioDoAssento: mm(raioDoAssento),
    raioDoFriso: mm(raioDoFriso),
    inicioDaLargura: mm(-meiaLargura),
    meiaLargura: mm(meiaLargura),
    inicioDoAro: mm(-meiaLarguraDoAro),
    meiaLarguraDoAro: mm(meiaLarguraDoAro),
    inicioDaBandaEsquerda: mm(inicioDaBandaEsquerda),
    fimDoFriso: mm(fimDoFriso),
    fimDoTalude: mm(fimDoTalude),
    fimDaBanda: mm(meiaLargura - chanfro),
    raioInternoDoAro: mm(raioInternoDoAro),
    raioDoFuroCentral: mm(raioDoFuroCentral),
    raioDoCubo: mm(raioDoCubo),
    raioDaFlange: mm(raioDaFlange),
    inicioDoCubo: mm(inicioDoCubo),
    fimDoCubo: mm(fimDoCubo),
    inicioDoMiolo: mm(inicioDoCubo + espessura),
    fimDoMiolo: mm(fimDoCubo - espessura),
    raioDoCirculoDeFuros: mm((diametroCirculoFuros * D) / 2),
    raioDoFuro: mm((diametroFuro * D) / 2),
    inicioDaFerramenta: mm(inicioDoCubo - folga),
    fimDaFerramenta: mm(fimDoCubo + folga),
    passoAngular: 360 / furosDeFixacao,
    inicioDaPortaDoPneu: mm(-largura),
    inicioDaPortaDoEixo: mm(inicioDoCubo - fimDoCubo),
    profundidadeDosFuros: mm(fimDoCubo - inicioDoCubo),
    diametroDoFuro: mm(diametroFuro * D),
    raioExternoDoEixo: mm(tipo === 2 ? raioDaFlange : raioDoCubo),
    raioInternoDaChapa: mm((raioDoFuroCentral + raioDoCubo) / 2),
    raioDaChapa: mm(raioInternoDoAro + parede / 2),
    inicioDaChapa: mm(centroDoCubo - espessura / 2),
    fimDaChapa: mm(centroDoCubo + espessura / 2),
    diametroDoRaio: mm(diametroRaio * D),
  };
  if (sulcada) {
    const profundidade = profundidadeDoSulco * flanco;
    const passo = (2 * Math.PI * raioDoPneu) / sulcos;
    Object.assign(todos, {
      larguraDaFerramentaDoSulco: mm(largura * 1.2 + 2 * alturaDoFrisoMm),
      alturaDaFerramentaDoSulco: mm(profundidade + alturaDoFrisoMm + FOLGA_DO_PRISMA_DO_SULCO * raioDoPneu),
      larguraDoPrismaDoSulco: mm(larguraDoSulco * passo),
      baseDaFerramentaDoSulco: mm(raioDoPneu - profundidade),
      passoDoSulco: 360 / sulcos,
    });
  }
  const argumentos = Object.fromEntries(escalaresDaRoda({ tipo, sulcada }).map((nome) => [nome, todos[nome]]));
  argumentos.furos = furosDeFixacao;
  argumentos.materialDoPneu = banda === 2 ? 'aco' : 'borracha';
  if (sulcada) argumentos.sulcos = sulcos;
  if (tipo === 0) return { composicao: idDaRoda({ tipo, sulcada }), argumentos };

  /* os raios */
  const maciço = paredeDoRaio === 0;
  if (!maciço) argumentos.paredeDoRaio = mm(paredeDoRaio * diametroRaio * D);
  const raioDoNoDoCubo = tipo === 1 ? 0.75 * raioDoCubo + 0.25 * raioDoFuroCentral : (raioDoCubo + raioDaFlange) / 2;
  const raioDoNoDoAro = raioInternoDoAro + parede / 2;
  const passo = 360 / raios;
  const noEm = (x, raio, graus) => [
    arredondar(mm(x)), arredondar(mm(raio * Math.cos((graus * Math.PI) / 180))), arredondar(mm(raio * Math.sin((graus * Math.PI) / 180))),
  ];
  for (let k = 0; k < raios; k++) {
    const sentido = k % 2 === 0 ? 1 : -1;
    const xDoCubo = tipo === 1 ? centroDoCubo : (k % 2 === 0 ? fimDoCubo - espessura / 2 : inicioDoCubo + espessura / 2);
    const xDoAro = tipo === 1 ? centroDoCubo : 0;
    argumentos[nomeDoNoDoCubo(k)] = noEm(xDoCubo, raioDoNoDoCubo, k * passo);
    argumentos[nomeDoNoDoAro(k)] = noEm(xDoAro, raioDoNoDoAro, k * passo + sentido * cruzamento * passo);
  }
  return { composicao: idDaRoda({ tipo, raios, maciço, sulcada }), argumentos };
}
