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

   O SULCO AO LONGO DA VOLTA. Nas bandas pneumáticas (0 e 3), `sulcosCirculares` maiores que zero cortam anéis retangulares na
   banda. A área plana da banda (entre o talude do friso, ou o ombro, e o ombro do outro lado) é dividida em `sulcosCirculares`
   passos iguais; o sulco de cada passo tem `larguraDoSulcoCircular` do passo, é centrado nele (as bordas ficam com meio passo
   de banda inteira, como as nervuras do ombro de um pneu de estrada) e tem `profundidadeDoSulcoCircular` do flanco. Convive com o
   relevo transversal da banda 3: os dois cortes saem da mesma subtração.

   A VENTILAÇÃO. Na roda de disco (`tipo` 0), `furosDeVentilacao` maiores que zero furam a chapa numa volta de raio
   `diametroCirculoDeVentilacao / 2`, com o primeiro furo a meio passo de +y (entre dois parafusos, quando as duas contagens
   são iguais). Os dois parâmetros opcionais valem zero por padrão, e com zero a composição é a de antes deles.

   OS LADOS E O OMBRO. `ladosDoPneu` (96 por padrão, como sempre) é o número de lados da revolução do pneu e do aro que ele abraça, para a silhueta
   de um pneu grande ficar redonda sem mexer no cubo nem na chapa. `ombroRedondo` 1 troca o chanfro reto de cada ombro por um arco de quarto de círculo de raio
   igual ao chanfro, em três segmentos: os pontos intermediários saem de `derivar` em [raio, x] (E à esquerda, D à direita, 1 e 2 na ordem do perfil). Onde há
   friso (o lado de -x), o arco não existe e os dois pontos ficam sobre a parede reta, sem mudar a forma. Com 0 e 96 a composição é a de antes.

   O OMBRO LARGO. `ombroDoPneu` maior que zero troca o chanfro limitado (a fração do flanco, até 9 mm e até 30% da largura) pela
   fração pedida do flanco, sem o teto de 9 mm: o pneu industrial alto, de ombro de dezenas de milímetros. Convive com
   `ombroRedondo`: com os dois, a seção do lado é uma curva só, sem quina, que é a do pneu industrial alto (a curva do ombro largo,
   abaixo). O máximo do contrato (0,6 do flanco) deixa o ombro acima do bojo, e a
   restrição `ombro-cabe-na-banda` recusa, com as duas medidas em mm, o ombro que passa de 30% da largura da banda. Com o ombro
   acima de 10 mm o chanfro sai da faixa em que a conferência da porta do assento procura o raio, e a porta passa a declarar como
   raio externo o raio que a face plana de dentro alcança (`raioDaFaceDoAssento`, o raio do ombro); sem o ombro largo, ou com
   friso (a parede de dentro é plana até o friso), ele é o raio do friso, como sempre. Com 0 a roda é a de antes.

   A CURVA DO OMBRO LARGO (`ombroDoPneu` maior que zero com `ombroRedondo` 1, composição de sufixo `-ombro-largo`). O lado do pneu sai
   do talão em curva até o bojo, a largura máxima, onde chega na vertical (uma parábola em `PONTOS_DO_FLANCO` + 1 segmentos), e do bojo
   à banda num quarto de superelipse de expoente `EXPOENTE_DO_OMBRO_LARGO` e `SEGMENTOS_DO_OMBRO_LARGO` segmentos, de semieixo radial do
   bojo ao raio do pneu e axial do ombro, tangente ao flanco no bojo e à banda no fim: sem quina entre o flanco e o ombro. Do lado do
   friso a superelipse não existe e os pontos dela ficam sobre a parede reta. A face de dentro deixa de ter parte plana no plano da porta, e o raio
   externo da porta do assento é o maior raio da seção a até `FAIXA_DA_PORTA_MM` do plano, que é onde a conferência da porta o procura.

   Puro e determinístico: nenhuma leitura de relógio, de sorteio ou de arquivo. */
import { EXPOENTE_DO_OMBRO_LARGO, LADOS_DO_PNEU, PONTOS_DO_FLANCO, SEGMENTOS_DO_OMBRO_LARGO, escalaresDaRoda, nomesDoOmbroLargo, idDaRoda, nomeDoNoDoAro, nomeDoNoDoCubo } from './composicoes.js';

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
/* a faixa em torno do plano da porta em que a conferência da porta mede o raio (`FAIXA_DO_RAIO` de `porta-confere-forma.js`, 10 mm) */
export const FAIXA_DA_PORTA_MM = 10;
/* posição de nó em metro, arredondada a 0,1 nm: tira o ruído da última casa de seno e cosseno do hash da geometria */
const arredondar = (valor) => Math.round(valor * 1e10) / 1e10;

export function derivar({
  diametroPneu, larguraPneu, diametroAro, larguraAro, paredeDoAro, banda, tipo, espessuraDisco, larguraCubo, diametroCubo,
  diametroFlange, diametroFuroCentral, furosDeFixacao, diametroCirculoFuros, diametroFuro, desvio, raios, diametroRaio,
  paredeDoRaio, cruzamento, alturaDoFriso, sulcos, profundidadeDoSulco, larguraDoSulco,
  sulcosCirculares = 0, larguraDoSulcoCircular = 0, profundidadeDoSulcoCircular = 0,
  furosDeVentilacao = 0, diametroCirculoDeVentilacao = 0, diametroFuroDeVentilacao = 0,
  ladosDoPneu = LADOS_DO_PNEU, ombroRedondo = 0, ombroDoPneu = 0,
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
  const ombroLargo = ombroDoPneu > 0;
  const chanfro = ombroLargo ? ombroDoPneu * flanco : Math.min(
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
  const circular = (banda === 0 || banda === 3) && sulcosCirculares > 0;
  const ventilada = tipo === 0 && furosDeVentilacao > 0;
  const todos = {
    raioDoPneu: mm(raioDoPneu),
    raioDoOmbro: mm(raioDoPneu - chanfro),
    raioDoBojo: mm(raioDoAssento + ALTURA_DO_BOJO * flanco),
    raioDoAssento: mm(raioDoAssento),
    raioDoFriso: mm(raioDoFriso),
    raioDaFaceDoAssento: mm(ombroLargo && !comFriso ? raioDoPneu - chanfro : raioDoFriso),
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
  if (circular) {
    const inicioDaArea = comFriso ? fimDoTalude : inicioDaBandaEsquerda;
    const passoCircular = (meiaLargura - chanfro - inicioDaArea) / sulcosCirculares;
    const larguraCircular = larguraDoSulcoCircular * passoCircular;
    const inicioCircular = inicioDaArea + (passoCircular - larguraCircular) / 2;
    Object.assign(todos, {
      raioDoFundoDoSulcoCircular: mm(raioDoPneu - profundidadeDoSulcoCircular * flanco),
      raioDoTopoDoSulcoCircular: mm(raioDoPneu * (1 + FOLGA_DO_PRISMA_DO_SULCO)),
      inicioDoPrimeiroSulcoCircular: mm(inicioCircular),
      fimDoPrimeiroSulcoCircular: mm(inicioCircular + larguraCircular),
      passoDosSulcosCirculares: mm(passoCircular),
    });
  }
  if (ventilada) {
    const raioDaVolta = (diametroCirculoDeVentilacao * D) / 2;
    const angulo = (Math.PI / furosDeVentilacao);
    Object.assign(todos, {
      yDoFuroDeVentilacao: arredondar(mm(raioDaVolta * Math.cos(angulo))),
      zDoFuroDeVentilacao: arredondar(mm(raioDaVolta * Math.sin(angulo))),
      raioDoFuroDeVentilacao: mm((diametroFuroDeVentilacao * D) / 2),
      inicioDaFerramentaDeVentilacao: mm(centroDoCubo - espessura * 0.75),
      fimDaFerramentaDeVentilacao: mm(centroDoCubo + espessura * 0.75),
      passoAngularDaVentilacao: 360 / furosDeVentilacao,
    });
  }
  const redondo = ombroRedondo > 0;
  const curva = redondo && ombroLargo;
  if (curva) {
    /* [raio, x] do lado esquerdo (-x); o direito é o espelho, sempre com a elipse */
    const raioDoBojo = raioDoAssento + ALTURA_DO_BOJO * flanco;
    const flancoEm = (k) => {
      const t = k / (PONTOS_DO_FLANCO + 1);
      return [raioDoAssento + t * (raioDoBojo - raioDoAssento), -meiaLargura + (meiaLargura - meiaLarguraDoAro) * (1 - t) ** 2];
    };
    const elipseEm = (k) => {
      const a = (k / SEGMENTOS_DO_OMBRO_LARGO) * (Math.PI / 2);
      const e = 2 / EXPOENTE_DO_OMBRO_LARGO;
      return [raioDoBojo + (raioDoPneu - raioDoBojo) * Math.sin(a) ** e, -meiaLargura + chanfro - chanfro * Math.cos(a) ** e];
    };
    const naParede = (k) => [raioDoBojo + (k / SEGMENTOS_DO_OMBRO_LARGO) * (raioDoFriso - raioDoBojo), -meiaLargura];
    const nomes = nomesDoOmbroLargo();
    const pontos = {};
    for (let k = 1; k <= PONTOS_DO_FLANCO; k++) { pontos[`FE${k}`] = flancoEm(k); pontos[`FD${k}`] = [flancoEm(k)[0], -flancoEm(k)[1]]; }
    for (let k = 1; k < SEGMENTOS_DO_OMBRO_LARGO; k++) {
      pontos[`OE${k}`] = comFriso ? naParede(k) : elipseEm(k);
      pontos[`OD${k}`] = [elipseEm(k)[0], -elipseEm(k)[1]];
    }
    for (const [chave, [raio, x]] of Object.entries(pontos)) Object.assign(todos, { [nomes.raio(chave)]: mm(raio), [nomes.x(chave)]: mm(x) });
    /* o raio da porta: o maior raio da seção do lado esquerdo a até a faixa do plano dela */
    const doLado = [[raioDoAssento, -meiaLarguraDoAro], [raioDoBojo, -meiaLargura], [raioDoFriso, inicioDaBandaEsquerda],
      ...Object.entries(pontos).filter(([chave]) => chave.includes('E')).map(([, ponto]) => ponto)];
    todos.raioDaFaceDoAssento = mm(Math.max(...doLado.filter(([, x]) => x + meiaLargura <= FAIXA_DA_PORTA_MM).map(([raio]) => raio)));
  } else if (redondo) {
    /* o arco de quarto de círculo de raio `chanfro`, de (raioDoPneu - chanfro, -meiaLargura) a (raioDoPneu, -meiaLargura + chanfro) à esquerda, nos ângulos de 30 e 60 graus */
    const noArco = (graus, lado) => {
      const a = (graus * Math.PI) / 180;
      return [raioDoPneu - chanfro + chanfro * Math.sin(a), lado * (meiaLargura - chanfro + chanfro * Math.cos(a))];
    };
    const [e1, e2, d2, d1] = [noArco(30, -1), noArco(60, -1), noArco(30, 1), noArco(60, 1)];
    /* com friso o lado esquerdo é a parede reta de (raioDoPneu - chanfro) a raioDoFriso em x = -meiaLargura: os dois pontos ficam nela */
    const naParede = (t) => [raioDoPneu - chanfro + t * (raioDoFriso - (raioDoPneu - chanfro)), -meiaLargura];
    const [p1, p2] = comFriso ? [naParede(1 / 3), naParede(2 / 3)] : [e1, e2];
    Object.assign(todos, {
      raioDoOmbroE1: mm(p1[0]), xDoOmbroE1: mm(p1[1]), raioDoOmbroE2: mm(p2[0]), xDoOmbroE2: mm(p2[1]),
      raioDoOmbroD1: mm(d1[0]), xDoOmbroD1: mm(d1[1]), raioDoOmbroD2: mm(d2[0]), xDoOmbroD2: mm(d2[1]),
    });
  }
  const argumentos = Object.fromEntries(escalaresDaRoda({ tipo, sulcada, circular, ventilada, ombroRedondo: redondo, ombroLargo: curva }).map((nome) => [nome, todos[nome]]));
  argumentos.ladosDoPneu = ladosDoPneu;
  argumentos.furos = furosDeFixacao;
  argumentos.materialDoPneu = banda === 2 ? 'aco' : 'borracha';
  if (sulcada) argumentos.sulcos = sulcos;
  if (circular) argumentos.sulcosCirculares = sulcosCirculares;
  if (ventilada) argumentos.furosDeVentilacao = furosDeVentilacao;
  if (tipo === 0) return { composicao: idDaRoda({ tipo, sulcada, circular, ventilada, ombroRedondo: redondo, ombroLargo: curva }), argumentos };

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
  return { composicao: idDaRoda({ tipo, raios, maciço, sulcada, circular, ombroRedondo: redondo, ombroLargo: curva }), argumentos };
}
