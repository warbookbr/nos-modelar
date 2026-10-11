/* geometria.js — as medidas do móvel de caixa a partir dos parâmetros da família, em milímetro.

   Função pura sobre números: o `derivar`, a montagem e os testes leem daqui, de modo que a composição, o curso declarado e as
   contas dos testes vêm da mesma conta. Nada aqui conhece Three.js nem a malha.

   O QUADRO. O corpo tem a origem no chão, no centro da largura e da profundidade: x é a largura, y a altura (o chão é y = 0)
   e z a profundidade, com a frente em z = +profundidade / 2. O corpo é a caixa de painéis aberta na frente (laterais,
   tampo, base e fundo, todos com a espessura `painel`), sobre o rodapé, sobre pés ou sem base.

   AS ZONAS. O vão interno (da face de cima da base à face de baixo do tampo) se divide em zonas empilhadas, separadas por
   um painel horizontal: a coluna de gavetas, a zona das portas e o vão aberto (sem porta). A coluna fica embaixo ou, com
   `gavetasEmCima`, em cima. Com portas, a zona das portas é a que cede a altura (as gavetas têm a altura pedida) e, com
   `alturaDasPortas`, ela para nessa altura e o que sobra acima vira o vão aberto. Sem portas, as gavetas dividem a altura
   toda e `alturaDaGaveta` deixa de valer; sem portas nem gavetas o vão aberto ocupa tudo.

   A FRENTE. `frente` 1 é a embutida (portas e frentes de gaveta entre as laterais, à ras da frente do corpo, com 3 mm de
   folga em volta), 0 a sobreposta (as portas e as frentes cobrem a frente do corpo, 4 mm à frente dele) e 2 a de correr
   (as portas deslizam em x, cada uma numa camada, atrás do plano da frente). Na embutida, de três portas para cima há uma
   divisória central entre as baias: um par e uma porta, ou dois pares. Na sobreposta há uma ou duas portas, cada uma presa
   a uma lateral. Na de correr há de duas a quatro folhas, cada uma com um rasgo na borda de cima e outro na de baixo onde
   entra o trilho que o corpo leva no teto e no piso da zona das portas; as gavetas, se há, têm a frente embutida.

   A DOBRADIÇA. Cada porta tem n dobradiças, com a quantidade e a altura derivadas da altura e do peso da porta. Na embutida
   são as da família `dobradica`: o pino fica no meio da espessura da parede em que a porta gira (lateral ou divisória), a
   dois milímetros e meio de fundo atrás da frente, de modo que o tambor fica inteiro dentro da espessura da parede e atrás do
   plano da frente: a folha fixa entra pelo fundo da parede, num rasgo de 2 mm, e a folha móvel entra pela borda da porta,
   num rasgo igual, e a parede ganha um rebaixo para o tambor girar e um rasgo para a folha fixa.

   Na sobreposta nenhuma parte da dobradiça aparece por fora com a porta fechada, e a família `dobradica` não serve, porque o
   tambor dela ficaria no canto da face externa da lateral. A dobradiça é uma dobradiça de pino oculta, uma simplificação da
   dobradiça de caneco, que gira por um quadrilátero articulado e tem o pivô virtual fora do corpo; aqui o pivô é um pino
   físico de 3 mm, vertical, no plano do verso da porta, a 6,95 mm da face externa da lateral, atrás da porta fechada (a borda
   da porta fica a 3,5 mm da face e deixa 1 mm de porta antes do sulco do pino). A peça fixa tem a placa, parafusada na face
   interna da lateral e 24 mm de fundo, o pino com um colar em cada ponta e duas abas que passam pela fresta entre o corpo e
   a porta, por cima da quina da frente da lateral, da placa ao colar. A peça móvel tem o aro, que gira em volta do pino entre
   os colares, e a folha, uma chapa que sai do aro para dentro do sulco que a porta abre no verso dela. A porta fica a 4 mm do
   corpo (`AFASTAMENTO_DA_SOBREPOSTA`) porque a borda da porta, ao girar em torno do pino, recua até a distância do pino à
   borda (3,45 mm) e não pode entrar na quina da frente da lateral. O eixo da articulação é o do pino. A porta abre de 0 a 90
   graus (`CURSO_NA_SOBREPOSTA`): medido contra as malhas, a borda da porta bate na quina da lateral a 94,4 graus, e nenhuma
   peça da dobradiça colide até 100; os 110 graus da embutida pediriam o pivô virtual da dobradiça de caneco. Com a porta
   fechada nada da dobradiça fica fora do contorno do corpo mais a porta, de frente, de lado e de cima, e de frente a porta a
   cobre; só vista exatamente de lado ou de cima, pela fresta de 4 mm entre o corpo e a porta, a aba e o aro aparecem, a
   partir de 4,7 mm da face externa.

   A GAVETA. Frente, duas laterais, traseira e fundo. Cada lateral leva um rasgo na face de fora e nele entra um trilho preso
   à lateral do corpo: a gaveta desliza em z, para fora, e o trilho continua engatado ao menos `ENCAIXE_MINIMO_DA_GAVETA` no
   fim do curso. */
import { geometriaDaDobradica } from '../dobradica/geometria.js';

export const FOLGA_DA_PORTA = 3; // mm entre a porta e o que a cerca
export const SOBREPOSICAO = 1; // mm que uma peça entra na outra para a união não ter face coincidente
export const RECUO_DA_PRATELEIRA = 2; // mm atrás da face de trás da porta (a espessura do painel mais isto, da frente)
export const RECUO_DO_RODAPE_NA_FRENTE = 50; // mm
export const RECUO_DO_RODAPE_NO_FUNDO = 20; // mm
export const RECUO_DA_DIVISORIA = 0.5; // mm atrás da frente: a divisória não tem face coplanar com as bordas do corpo
export const RAIO_DO_CABIDEIRO = 12.5; // mm (tubo de 25 mm)
export const LADOS_DO_CABIDEIRO = 16;
export const DISTANCIA_DO_CABIDEIRO_AO_TAMPO = 120; // mm do eixo do tubo até a face de baixo do tampo
export const ROUPA_PENDURADA = 1000; // mm abaixo do eixo do tubo
export const ESPACO_DO_CABIDEIRO = DISTANCIA_DO_CABIDEIRO_AO_TAMPO + ROUPA_PENDURADA;
export const DENSIDADE_DO_MDF = 7e-7; // kg/mm3 (700 kg/m3)
export const CURSO_NA_LATERAL = 110; // graus
export const CURSO_NA_SOBREPOSTA = 90; // graus: a borda da porta, ao girar em torno do pino, passa a quina da lateral até 94 graus
export const FOLGA_DO_REBAIXO = 0.5; // mm entre o tambor e a parede do rebaixo
export const MARGEM_DO_REBAIXO = 3; // mm acima e abaixo da dobradiça
export const FOLGA_DO_RASGO = 0.2; // mm de cada lado da folha
export const ENTRADA_DA_FOLHA_NA_PORTA = 15; // mm que a folha móvel entra na borda da porta
export const MARGEM_DA_DOBRADICA = 80; // mm da borda da porta à borda da dobradiça
export const COMPRIMENTO_MAXIMO_DO_PUXADOR = 400; // mm
export const LARGURA_DO_PUXADOR = 20; // mm
export const SAIDA_DO_PUXADOR = 20; // mm para fora da frente
export const CURSO_MAXIMO_NA_DIVISORIA = 90;

/* a frente sobreposta */
export const AFASTAMENTO_DA_SOBREPOSTA = 4; // mm entre a frente do corpo e o verso da porta ou da frente de gaveta
export const RECUO_DA_SOBREPOSTA_NO_LADO = 3.5; // mm da face externa da lateral à borda da porta ou da frente de gaveta: o tambor fica a 0,5 mm da borda
export const FOLGA_DA_SOBREPOSTA_NA_BORDA = 1.5; // mm da borda de cima e de baixo do corpo à borda da frente

/* a dobradiça de pino oculta da porta sobreposta */
export const RAIO_DO_PINO_OCULTO = 1.5; // mm (pino de 3 mm)
export const FOLGA_DO_ARO = 0.15; // mm entre o pino e o furo do aro
export const PAREDE_DO_ARO = 0.6; // mm
export const RAIO_DO_ARO = RAIO_DO_PINO_OCULTO + FOLGA_DO_ARO + PAREDE_DO_ARO; // mm, também o do colar
export const FOLGA_DO_SULCO = 0.2; // mm entre o aro e o sulco da porta
export const RAIO_DO_SULCO = RAIO_DO_ARO + FOLGA_DO_SULCO; // mm
export const PAREDE_DA_BORDA_DA_SOBREPOSTA = 1; // mm de porta entre a borda e o sulco do pino
export const DISTANCIA_DO_PINO_A_FACE = RECUO_DA_SOBREPOSTA_NO_LADO + PAREDE_DA_BORDA_DA_SOBREPOSTA + RAIO_DO_SULCO; // mm da face externa da lateral ao eixo do pino
export const COMPRIMENTO_DO_COLAR = 8; // mm de pino engrossado em cada ponta
export const FOLGA_DO_ARO_AO_COLAR = 0.5; // mm
export const ESPESSURA_DA_ABA = 1.8; // mm da chapa que passa pela fresta
export const FOLGA_DA_ABA_NA_PORTA = 0.2; // mm entre a aba e o verso da porta
export const INICIO_DA_ABA_DO_PINO = 1.5; // mm do eixo do pino ao começo da aba, para o colar a cobrir por cima
export const ESPESSURA_DA_PLACA = 2.5; // mm
export const COMPRIMENTO_DA_PLACA = 24; // mm de fundo, a partir da frente do corpo
export const ESPESSURA_DA_FOLHA = 1.5; // mm
export const ENTRADA_DA_FOLHA_NA_PORTA_OCULTA = 0.5; // mm do plano do verso da porta à face de baixo da folha
export const INICIO_DA_FOLHA = 1.9; // mm do eixo do pino ao começo da folha, fora do furo do aro
export const COMPRIMENTO_DA_FOLHA = 12; // mm
export const LADOS_DO_PINO_OCULTO = 16;
export const RECUO_DA_PRATELEIRA_COM_PLACA = 30; // mm da frente do corpo à frente da prateleira atrás de portas sobrepostas

/* a porta de correr */
export const RECUO_DA_PORTA_DE_CORRER = 20; // mm da frente do corpo à face da frente da primeira camada
export const FOLGA_ENTRE_CAMADAS = 6; // mm entre duas camadas de folhas
export const SOBREPOSICAO_DAS_FOLHAS = 40; // mm que uma folha cobre da vizinha, com a porta fechada
export const ALTURA_DO_TRILHO_DE_CORRER = 8; // mm que o trilho sai do piso e do teto da zona
export const LARGURA_DO_TRILHO_DE_CORRER = 6; // mm
export const PROFUNDIDADE_DO_RASGO_DE_CORRER = 10; // mm que o rasgo sobe na borda da folha
export const LARGURA_DO_RASGO_DE_CORRER = 9; // mm
export const FOLGA_DA_FOLHA_NO_PISO = 3; // mm entre a borda de baixo da folha e o piso da zona
export const SAIDA_DO_PUXADOR_DE_CORRER = 4; // mm: o puxador não passa da folga entre as camadas

/* a gaveta */
export const ESPESSURA_DA_CAIXA_DA_GAVETA = 12; // mm: laterais e traseira
export const ESPESSURA_DO_FUNDO_DA_GAVETA = 8; // mm
export const ELEVACAO_DO_FUNDO_DA_GAVETA = 6; // mm do pé da lateral à face de baixo do fundo
export const FOLGA_LATERAL_DA_GAVETA = 3; // mm entre a lateral da gaveta e a lateral do corpo
export const FOLGA_TRASEIRA_DA_GAVETA = 15; // mm entre a traseira da gaveta e o fundo do corpo, com a gaveta fechada
export const BAIXA_DA_CAIXA_NA_FRENTE = 8; // mm do pé da frente ao pé da caixa
export const ALTA_DA_CAIXA_NA_FRENTE = 12; // mm do topo da caixa ao topo da frente
export const PROFUNDIDADE_DO_RASGO_DA_GAVETA = 6; // mm
export const ALTURA_DO_RASGO_DA_GAVETA = 14; // mm
export const ALTURA_DO_TRILHO = 10; // mm
export const AVANCO_DO_TRILHO = 6; // mm que o trilho sai da face interna da lateral do corpo
export const FIM_DO_TRILHO_ATRAS_DA_FRENTE = 2; // mm entre o fim do trilho e a placa de trás da frente embutida
export const ENCAIXE_MINIMO_DA_GAVETA = 100; // mm de trilho engatado no fim do curso
export const COMPRIMENTO_DO_PUXADOR_DA_GAVETA = 120; // mm
export const ALTURA_DO_PUXADOR_DA_GAVETA = 16; // mm

/* a base */
export const RAIO_DO_PE_NA_BASE = 18; // mm
export const RAIO_DO_PE_NO_TOPO = 26; // mm
export const RECUO_DO_PE = 60; // mm da borda do corpo ao eixo do pé
export const LADOS_DO_PE = 16;

/* o que cabe */
export const ALTURA_MINIMA_DA_ZONA_DE_PORTAS = 350; // mm
export const ALTURA_MINIMA_DA_GAVETA = 80; // mm
export const ALTURA_MINIMA_DO_VAO_ABERTO = 100; // mm

/* a quantidade máxima de cada peça que a composição prevê */
export const MAXIMO_DE_PRATELEIRAS = 8;
export const MAXIMO_DE_GAVETAS = 5;
export const MAXIMO_DE_PORTAS = 4;
export const MAXIMO_DE_TRILHOS_DE_CORRER = MAXIMO_DE_PORTAS;

const OCULTA = Object.freeze({
  raioDoPino: RAIO_DO_PINO_OCULTO, raioDoAro: RAIO_DO_ARO, raioDoSulco: RAIO_DO_SULCO, distanciaDoPinoAFace: DISTANCIA_DO_PINO_A_FACE,
  comprimentoDoColar: COMPRIMENTO_DO_COLAR, folgaDoAroAoColar: FOLGA_DO_ARO_AO_COLAR,
});

const arredondar = (valor) => Number(valor.toPrecision(12));
export const metro = (mm) => arredondar(mm * 0.001);
const limitar = (valor, minimo, maximo) => Math.min(maximo, Math.max(minimo, valor));

/** A frente é sobreposta (0), embutida (1) ou de correr (2). */
export const ehSobreposta = (frente) => frente === 0;
export const ehDeCorrer = (frente) => frente === 2;

/** Há divisória central, de três portas para cima, na embutida e na de correr. */
export const temDivisoria = (portas, frente = 1) => portas >= 3 && !ehSobreposta(frente);

/** As portas de cada baia: uma porta, um par, um par e uma porta, dois pares. */
export const PORTAS_POR_BAIA = Object.freeze({ 1: [1], 2: [2], 3: [2, 1], 4: [2, 2] });

/* ---------- as zonas ---------- */

/**
 * As zonas do vão interno, de baixo para cima, e os painéis horizontais entre elas. Cada zona traz o `tipo` ('gavetas',
 * 'portas' ou 'vao'), a altura do vão que ela abre (`y0` a `y1`) e o que fica abaixo e acima dela (`'externa'`, a base ou o
 * tampo do corpo, ou `'separador'`).
 */
export function zonasDoMovel(p) {
  const { altura, rodape, painel, portas, gavetas, alturaDaGaveta, gavetasEmCima, alturaDasPortas } = p;
  const yBase = rodape + painel;
  const yTampo = altura - painel;
  const interno = yTampo - yBase;
  const temGavetas = gavetas > 0;
  const temPortas = portas > 0;
  const alturas = { gavetas: 0, portas: 0, vao: 0 };
  if (temPortas) {
    const fixaDasGavetas = temGavetas ? gavetas * alturaDaGaveta + (gavetas + 1) * FOLGA_DA_PORTA : 0;
    const resto = interno - (temGavetas ? fixaDasGavetas + painel : 0);
    const aberto = alturaDasPortas > 0 ? Math.max(0, resto - painel - alturaDasPortas) : 0;
    alturas.gavetas = fixaDasGavetas;
    if (aberto > 0) { alturas.portas = alturaDasPortas; alturas.vao = aberto; } else alturas.portas = resto;
  } else if (temGavetas) alturas.gavetas = interno;
  else alturas.vao = interno;

  const ordem = (gavetasEmCima ? ['portas', 'vao', 'gavetas'] : ['gavetas', 'portas', 'vao']).filter((tipo) => alturas[tipo] > 0);
  const zonas = [];
  const separadores = [];
  let cursor = yBase;
  ordem.forEach((tipo, i) => {
    const ultima = i === ordem.length - 1;
    zonas.push({
      tipo, y0: cursor, y1: cursor + alturas[tipo], altura: alturas[tipo], abaixo: i === 0 ? 'externa' : 'separador', acima: ultima ? 'externa' : 'separador',
    });
    cursor += alturas[tipo];
    if (!ultima) { separadores.push({ y0: cursor, y1: cursor + painel }); cursor += painel; }
  });
  return { yBase, yTampo, interno, zonas, separadores, porTipo: Object.fromEntries(zonas.map((z) => [z.tipo, z])) };
}

/* O quanto uma frente sobreposta passa do vão que ela cobre, para baixo e para cima: até 1,5 mm da borda do corpo, ou até
   1,5 mm do meio do painel que separa duas zonas (a folha entre duas frentes é sempre de 3 mm). */
function extensaoDaSobreposta(vizinho, painel) {
  return vizinho === 'externa' ? painel + FOLGA_DA_SOBREPOSTA_NA_BORDA : (painel + FOLGA_DA_PORTA) / 2;
}

/* ---------- a porta e a dobradiça ---------- */

/** A largura de cada porta, em milímetro. */
export function larguraDaPorta({ largura, painel, portas, frente = 1 }) {
  if (ehDeCorrer(frente)) return (largura - 2 * painel - 2 * FOLGA_DA_PORTA + (portas - 1) * SOBREPOSICAO_DAS_FOLHAS) / portas;
  if (ehSobreposta(frente)) {
    return (largura - 2 * RECUO_DA_SOBREPOSTA_NO_LADO - (portas - 1) * FOLGA_DA_PORTA) / portas;
  }
  const baias = temDivisoria(portas, frente) ? 2 : 1;
  return (largura - (baias + 1) * painel - (portas + baias) * FOLGA_DA_PORTA) / portas;
}

/** A altura de cada porta, em milímetro. */
export function alturaDaPorta(p) {
  const { portas, painel, frente = 1 } = p;
  if (!(portas > 0)) return 0;
  const zona = zonasDoMovel(p).porTipo.portas;
  if (ehSobreposta(frente)) return zona.altura - 2 * FOLGA_DA_PORTA + extensaoDaSobreposta(zona.abaixo, painel) + extensaoDaSobreposta(zona.acima, painel);
  return zona.altura - 2 * FOLGA_DA_PORTA;
}

/** O peso de uma porta de MDF, em quilograma (o puxador não conta). */
export const pesoDaPorta = (p) => larguraDaPorta(p) * alturaDaPorta(p) * p.painel * DENSIDADE_DO_MDF;

/**
 * Os parâmetros da família `dobradica` para uma porta de `peso` quilogramas e `altura` milímetros, num painel de `painel`
 * milímetros. Quanto mais pesada, mais comprida a dobradiça, mais grossa a chapa e o pino e mais dobradiças; a folha tem a
 * largura que sobra depois do tambor, do afastamento até a borda da porta e da entrada na porta.
 */
export function dobradicaDaPorta({ peso, altura, painel }) {
  const pesada = peso > 12;
  const diametroPino = pesada ? 6 : 5;
  const espessura = pesada ? 2.5 : 2;
  const alturaDaDobradica = Math.round(limitar(60 + 3 * peso, 70, 120));
  /* o mínimo de nós e de furos: a folha entra num rasgo e o furo de fixação não aparece, e cada nó a mais pesa na conferência do curso */
  const nos = 3;
  const furos = 1;
  const porAltura = altura <= 900 ? 2 : altura <= 1500 ? 3 : altura <= 2100 ? 4 : 5;
  const quantidade = limitar(Math.max(2, Math.ceil(peso / 8), porAltura), 2, 5);
  const afastamento = painel / 2 + FOLGA_DA_PORTA; // do pino até a borda da porta
  const larguraFolha = Math.round((afastamento - diametroPino / 2 + ENTRADA_DA_FOLHA_NA_PORTA) * 10) / 10;
  return {
    quantidade,
    parametros: { altura: alturaDaDobradica, larguraFolha, espessura, diametroPino, nos, furos },
  };
}

/** O que cada apoio de dobradiça é: o lado do vão em que a porta fica, para a porta embutida. */
const APOIOS = Object.freeze({
  'lateral-esquerda': { vao: 1 },
  'divisoria-esquerda': { vao: -1 },
  'divisoria-direita': { vao: 1 },
  'lateral-direita': { vao: -1 },
});
export const ORDEM_DOS_APOIOS = Object.freeze(['lateral-esquerda', 'divisoria-esquerda', 'divisoria-direita', 'lateral-direita']);

/* ---------- o móvel inteiro ---------- */

/**
 * Todas as medidas do móvel, em milímetro. `p` traz os parâmetros completos da família. Devolve o quadro, as zonas, a base,
 * a divisória, as prateleiras, o cabideiro, as portas (cada uma com as suas dobradiças) e as gavetas.
 */
export function geometriaDoMovel(p) {
  const { largura, profundidade, painel, portas, prateleiras, rodape, cabideiro, pes, frente, gavetas, alturaDaGaveta } = p;
  const sobreposta = ehSobreposta(frente);
  const correr = ehDeCorrer(frente);
  const frenteDoCorpo = profundidade / 2;
  const fundo = -profundidade / 2;
  const x0 = -largura / 2 + painel; // face interna da lateral esquerda
  const x1 = largura / 2 - painel; // face interna da lateral direita
  const zonas = zonasDoMovel(p);
  const { yBase, yTampo } = zonas;
  const zonaDasPortas = zonas.porTipo.portas ?? null;
  const zonaDasGavetas = zonas.porTipo.gavetas ?? null;
  const zonaDoVao = zonas.porTipo.vao ?? null;
  const divisoria = temDivisoria(portas, frente);
  const porBaia = PORTAS_POR_BAIA[portas] ?? [];
  const wd = portas > 0 ? larguraDaPorta(p) : 0;
  const hd = portas > 0 ? alturaDaPorta(p) : 0;
  const peso = portas > 0 ? pesoDaPorta(p) : 0;
  const dobradica = portas > 0 && !correr ? dobradicaDaPorta({ peso, altura: hd, painel }) : null;
  /* só a embutida usa a família `dobradica`; a sobreposta tem a dobradiça de pino oculta (`g.oculta`) */
  const dg = dobradica && !sobreposta ? geometriaDaDobradica(dobradica.parametros) : null;
  const raioDoTambor = dg ? dg.mm.raioDoNo : 0;

  /* o verso e a frente das portas e das frentes de gaveta: no plano da frente do corpo (embutida) ou 4 mm à frente dele */
  const zDoVerso = sobreposta ? frenteDoCorpo + AFASTAMENTO_DA_SOBREPOSTA : frenteDoCorpo - painel;
  const zDaFrente = zDoVerso + painel;
  const recuoDoPinoNaParede = painel / 2; // embutida: o pino no meio da espessura da parede
  /* quanto o pino entra na parede, a partir da face em que a dobradiça se apoia (só na embutida) */
  const profundidadeDoPino = dg ? recuoDoPinoNaParede : 0;
  /* o pino da embutida fica atrás da frente, o da sobreposta no plano do verso da porta */
  const zDoPino = sobreposta ? zDoVerso : dg ? frenteDoCorpo - (raioDoTambor + FOLGA_DO_REBAIXO) : 0;
  const afastamento = recuoDoPinoNaParede + FOLGA_DA_PORTA; // embutida: do pino até a borda da porta
  const alturaDaDobradica = dobradica ? dobradica.parametros.altura : 0;
  const stagger = portas === 4 && !sobreposta ? alturaDaDobradica + 40 : 0;

  /* o fundo que as folhas de correr tomam atrás da frente, até a face de trás da última camada, e o recuo das prateleiras e da
     divisória com elas */
  const passoDasCamadas = painel + FOLGA_ENTRE_CAMADAS;
  const recuoDaPrateleiraAtrasDasFolhas = RECUO_DA_PORTA_DE_CORRER + (portas - 1) * passoDasCamadas + painel + RECUO_DA_PRATELEIRA;

  /* as baias: x do começo, largura e as portas (embutida); na de correr, as duas metades em volta da divisória do meio */
  const baias = [];
  if (correr && divisoria) {
    baias.push({ indice: 0, n: 0, x: x0, largura: -painel / 2 - x0, fim: -painel / 2 });
    baias.push({ indice: 1, n: 0, x: painel / 2, largura: x1 - painel / 2, fim: x1 });
  } else if (frente === 1 && portas > 0) {
    let x = x0;
    porBaia.forEach((n, i) => {
      const larguraDaBaia = n * wd + (n + 1) * FOLGA_DA_PORTA;
      baias.push({ indice: i, n, x, largura: larguraDaBaia, fim: x + larguraDaBaia });
      x += larguraDaBaia + (divisoria && i === 0 ? painel : 0);
    });
  }
  const xDaDivisoria = divisoria
    ? {
      esquerda: baias[0].fim, direita: baias[0].fim + painel, centro: baias[0].fim + painel / 2,
      zFrente: correr ? frenteDoCorpo - recuoDaPrateleiraAtrasDasFolhas : frenteDoCorpo - RECUO_DA_DIVISORIA,
    }
    : null;

  /* as portas, da esquerda para a direita */
  const listaDePortas = [];
  if (correr) {
    for (let k = 0; k < portas; k += 1) {
      const xMin = x0 + FOLGA_DA_PORTA + k * (wd - SOBREPOSICAO_DAS_FOLHAS);
      const direcao = k < portas / 2 ? 1 : -1; // as folhas da esquerda abrem para a direita, as da direita para a esquerda
      const zFrenteDaFolha = frenteDoCorpo - RECUO_DA_PORTA_DE_CORRER - k * passoDasCamadas;
      listaDePortas.push({
        indice: k, correr: true, camada: k, direcao, vao: direcao, xMin, xMax: xMin + wd, xLivre: direcao === 1 ? xMin + wd : xMin,
        zFrente: zFrenteDaFolha, zVerso: zFrenteDaFolha - painel, saidaDoPuxador: SAIDA_DO_PUXADOR_DE_CORRER, curso: Math.floor(wd - SOBREPOSICAO_DAS_FOLHAS),
      });
    }
  } else if (sobreposta) {
    const xa = -largura / 2 + RECUO_DA_SOBREPOSTA_NO_LADO;
    for (let j = 0; j < portas; j += 1) {
      const apoio = j === 0 ? 'lateral-esquerda' : 'lateral-direita';
      const vao = APOIOS[apoio].vao;
      const xMin = xa + j * (wd + FOLGA_DA_PORTA);
      const xMax = xMin + wd;
      const face = vao === 1 ? -largura / 2 : largura / 2; // a face externa da lateral
      const abre = -vao; // o lado do ar, a partir da parede
      listaDePortas.push({
        indice: j, baia: 0, apoio, vao, abre, face, xDoPino: face + vao * DISTANCIA_DO_PINO_A_FACE,
        xMin, xMax, xDaBorda: vao === 1 ? xMin : xMax, xLivre: vao === 1 ? xMax : xMin, sinalDoPratoEmZ: 1,
        zVerso: zDoVerso, zFrente: zDaFrente, saidaDoPuxador: SAIDA_DO_PUXADOR,
      });
    }
  } else {
    baias.forEach((baia, i) => {
      const ultima = i === baias.length - 1;
      for (let j = 0; j < baia.n; j += 1) {
        const xMin = baia.x + FOLGA_DA_PORTA + j * (wd + FOLGA_DA_PORTA);
        /* a porta da esquerda da baia gira à esquerda; no par, a da direita gira à direita; a porta só da última baia, que
           vem depois do par, gira na lateral da direita, e a porta só de uma única baia gira na lateral da esquerda */
        let apoio;
        if (baia.n === 2) apoio = j === 0 ? (i === 0 ? 'lateral-esquerda' : 'divisoria-direita') : (i === 0 && divisoria ? 'divisoria-esquerda' : 'lateral-direita');
        else apoio = ultima && divisoria ? 'lateral-direita' : 'lateral-esquerda';
        const vao = APOIOS[apoio].vao;
        const face = { 'lateral-esquerda': x0, 'lateral-direita': x1, 'divisoria-esquerda': xDaDivisoria?.esquerda, 'divisoria-direita': xDaDivisoria?.direita }[apoio];
        const xDoPino = face - vao * recuoDoPinoNaParede;
        listaDePortas.push({
          indice: listaDePortas.length, baia: i, apoio, vao, abre: vao, face, profundidadeDoPino, xDoPino,
          xMin, xMax: xMin + wd,
          xDaBorda: xDoPino + vao * afastamento,
          xLivre: vao === 1 ? xMin + wd : xMin,
          sinalDoPratoEmZ: -1,
          zVerso: zDoVerso, zFrente: zDaFrente, saidaDoPuxador: SAIDA_DO_PUXADOR,
        });
      }
    });
  }

  /* a altura da porta: da borda de baixo da frente, e as dobradiças igualmente espaçadas */
  const y0DasPortas = zonaDasPortas
    ? zonaDasPortas.y0 + FOLGA_DA_PORTA - (sobreposta ? extensaoDaSobreposta(zonaDasPortas.abaixo, painel) : 0)
    : 0;
  if (dobradica) {
    const n = dobradica.quantidade;
    const margemDoCentro = MARGEM_DA_DOBRADICA + alturaDaDobradica / 2;
    const passo = (hd - 2 * margemDoCentro - stagger) / (n - 1);
    for (const porta of listaDePortas) {
      const deslocamento = porta.apoio === 'divisoria-direita' ? stagger : 0;
      porta.y0 = y0DasPortas;
      porta.altura = hd;
      porta.curso = porta.apoio.startsWith('divisoria') ? CURSO_MAXIMO_NA_DIVISORIA : sobreposta ? CURSO_NA_SOBREPOSTA : CURSO_NA_LATERAL;
      porta.dobradicas = Array.from({ length: n }, (_, k) => ({
        indice: k, y: y0DasPortas + margemDoCentro + deslocamento + k * passo, x: porta.xDoPino, z: zDoPino,
      }));
      porta.primeiraDobradica = porta.dobradicas[0].y;
      porta.passoDasDobradicas = passo;
    }
  }

  for (const porta of listaDePortas) {
    if (!porta.correr) continue;
    porta.y0 = y0DasPortas;
    porta.altura = hd;
  }

  /* a base */
  let base = { tipo: 'nenhuma', altura: 0 };
  if (rodape > 0 && !pes) {
    const larguraDoRodape = largura - 2 * painel;
    const profundidadeDoRodape = profundidade - RECUO_DO_RODAPE_NA_FRENTE - RECUO_DO_RODAPE_NO_FUNDO;
    const zDoRodape = ((fundo + RECUO_DO_RODAPE_NO_FUNDO) + (frenteDoCorpo - RECUO_DO_RODAPE_NA_FRENTE)) / 2;
    base = { tipo: 'rodape', altura: rodape, largura: larguraDoRodape, profundidade: profundidadeDoRodape, zDoCentro: zDoRodape };
  } else if (rodape > 0) {
    const xs = [-largura / 2 + RECUO_DO_PE, largura / 2 - RECUO_DO_PE];
    const zs = [fundo + RECUO_DO_PE, frenteDoCorpo - RECUO_DO_PE];
    base = { tipo: 'pes', altura: rodape, posicoes: zs.flatMap((zz) => xs.map((xx) => [xx, zz])) };
  }

  /* prateleiras e cabideiro: as prateleiras ficam no vão aberto, se há, senão na zona das portas, abaixo da roupa pendurada */
  const zonaDasPrateleiras = zonaDoVao ?? zonaDasPortas;
  const baiaDasPrateleiras = zonaDoVao || !divisoria ? { x: x0, fim: x1 } : { x: baias[0].x, fim: baias[0].fim };
  const cabideiroNaBaia = cabideiro && zonaDasPortas && divisoria ? baias[1] : null;
  const cabideiroNoVaoInteiro = Boolean(cabideiro && zonaDasPortas && !divisoria);
  const espacoDoCabideiro = cabideiroNoVaoInteiro && zonaDasPrateleiras === zonaDasPortas ? ESPACO_DO_CABIDEIRO : 0;
  let pratelas = null;
  if (prateleiras > 0 && zonaDasPrateleiras) {
    const zonaUtil = zonaDasPrateleiras.altura - espacoDoCabideiro;
    const folga = (zonaUtil - prateleiras * painel) / (prateleiras + 1);
    pratelas = {
      total: prateleiras, x: baiaDasPrateleiras.x, fim: baiaDasPrateleiras.fim, zona: zonaUtil, folga, passo: folga + painel,
      yPrimeira: zonaDasPrateleiras.y0 + folga,
      recuoDaFrente: zonaDasPrateleiras !== zonaDasPortas ? RECUO_DA_PRATELEIRA
        : sobreposta ? RECUO_DA_PRATELEIRA_COM_PLACA : correr ? recuoDaPrateleiraAtrasDasFolhas : painel + RECUO_DA_PRATELEIRA,
    };
  }

  /* as gavetas */
  const listaDeGavetas = [];
  if (zonaDasGavetas) {
    const alturaDaFrente = portas > 0 ? alturaDaGaveta : (zonaDasGavetas.altura - (gavetas + 1) * FOLGA_DA_PORTA) / gavetas;
    const xa = sobreposta ? -largura / 2 + RECUO_DA_SOBREPOSTA_NO_LADO : x0 + FOLGA_DA_PORTA;
    const xb = sobreposta ? largura / 2 - RECUO_DA_SOBREPOSTA_NO_LADO : x1 - FOLGA_DA_PORTA;
    const larguraDaCaixa = (x1 - x0) - 2 * FOLGA_LATERAL_DA_GAVETA;
    const zTraseira = fundo + painel + FOLGA_TRASEIRA_DA_GAVETA;
    const zFimDoTrilho = frenteDoCorpo - painel - FIM_DO_TRILHO_ATRAS_DA_FRENTE;
    const curso = Math.floor(zFimDoTrilho - zTraseira - ENCAIXE_MINIMO_DA_GAVETA);
    for (let k = 0; k < gavetas; k += 1) {
      const vao0 = zonaDasGavetas.y0 + FOLGA_DA_PORTA + k * (alturaDaFrente + FOLGA_DA_PORTA); // o vão que a frente embutida ocupa
      const vao1 = vao0 + alturaDaFrente;
      const ext0 = sobreposta && k === 0 ? extensaoDaSobreposta(zonaDasGavetas.abaixo, painel) : 0;
      const ext1 = sobreposta && k === gavetas - 1 ? extensaoDaSobreposta(zonaDasGavetas.acima, painel) : 0;
      const yDaCaixa0 = vao0 + BAIXA_DA_CAIXA_NA_FRENTE;
      const yDaCaixa1 = vao1 - ALTA_DA_CAIXA_NA_FRENTE;
      listaDeGavetas.push({
        indice: k, vao0, vao1, y0: vao0 - ext0, y1: vao1 + ext1, x0: xa, x1: xb, zVerso: zDoVerso, zFrente: zDaFrente,
        caixa: {
          largura: larguraDaCaixa, y0: yDaCaixa0, y1: yDaCaixa1, yDoMeio: (yDaCaixa0 + yDaCaixa1) / 2, zTraseira, zFrente: zDoVerso,
        },
        trilho: { y: (yDaCaixa0 + yDaCaixa1) / 2, z0: fundo + painel - SOBREPOSICAO, z1: zFimDoTrilho },
        curso,
      });
      const gaveta = listaDeGavetas.at(-1);
      const { trilho } = gaveta;
      const cubosDoTrilho = [x0 + (AVANCO_DO_TRILHO - SOBREPOSICAO) / 2, x1 - (AVANCO_DO_TRILHO - SOBREPOSICAO) / 2].map((xCentro) => ({
        larg: AVANCO_DO_TRILHO + SOBREPOSICAO, alt: ALTURA_DO_TRILHO, prof: trilho.z1 - trilho.z0, em: [xCentro, trilho.y - ALTURA_DO_TRILHO / 2, (trilho.z0 + trilho.z1) / 2],
      }));
      gaveta.guia = {
        cubos: cubosDoTrilho, eixo: [0, 0, 1], centro: [0, trilho.y, trilho.z1], perfil: { largura: larguraDaCaixa, altura: ALTURA_DO_RASGO_DA_GAVETA }, curso,
      };
    }
  }

  const resultado = {
    quadro: { frente: frenteDoCorpo, fundo, x0, x1, yBase, yTampo },
    zonas, sobreposta, correr, wd, hd, peso, y0DasPortas, passoDasCamadas,
    dobradica, dobradicaGeometria: dg, oculta: dobradica && sobreposta ? { ...OCULTA, altura: alturaDaDobradica } : null, raioDoTambor, zDoPino, recuoDoPino: recuoDoPinoNaParede, afastamento, zDoVerso, zDaFrente, stagger,
    baias, divisoria: xDaDivisoria, portas: listaDePortas, gavetas: listaDeGavetas, base,
    prateleiras: pratelas,
    cabideiro: cabideiro && zonaDasPortas ? {
      x: cabideiroNaBaia ? cabideiroNaBaia.x : x0,
      fim: cabideiroNaBaia ? cabideiroNaBaia.fim : x1,
      y: zonaDasPortas.y1 - DISTANCIA_DO_CABIDEIRO_AO_TAMPO,
    } : null,
  };

  /* o que cada porta corta na própria laje: o rasgo da folha da dobradiça, repetido por dobradiça, ou os dois rasgos do
     trilho (o de baixo e o de cima) na borda da folha de correr; e o trilho que o corpo leva para cada folha de correr */
  for (const porta of listaDePortas) {
    if (porta.correr) {
      const zCentro = (porta.zFrente + porta.zVerso) / 2;
      porta.cortes = {
        total: 2, passo: hd - PROFUNDIDADE_DO_RASGO_DE_CORRER + SOBREPOSICAO,
        rasgo: {
          larg: wd + 2 * SOBREPOSICAO, alt: PROFUNDIDADE_DO_RASGO_DE_CORRER + SOBREPOSICAO, prof: LARGURA_DO_RASGO_DE_CORRER,
          em: [(porta.xMin + porta.xMax) / 2, y0DasPortas - SOBREPOSICAO, zCentro],
        },
      };
      const zonaDoTrilho = zonaDasPortas;
      const cuboDoTrilho = (yBaseDoCubo) => ({
        larg: x1 - x0 + 2 * SOBREPOSICAO, alt: ALTURA_DO_TRILHO_DE_CORRER + SOBREPOSICAO, prof: LARGURA_DO_TRILHO_DE_CORRER, em: [0, yBaseDoCubo, zCentro],
      });
      porta.guia = {
        cubos: [cuboDoTrilho(zonaDoTrilho.y0 - SOBREPOSICAO), cuboDoTrilho(zonaDoTrilho.y1 - ALTURA_DO_TRILHO_DE_CORRER)],
        eixo: [porta.direcao, 0, 0], centro: [(porta.xMin + porta.xMax) / 2, y0DasPortas + hd / 2, zCentro],
        perfil: { largura: hd + 40, altura: hd }, curso: porta.curso,
      };
    } else {
      porta.cortes = { total: porta.dobradicas.length, passo: porta.passoDasDobradicas, rasgo: sobreposta ? rasgoDaPortaOculta(resultado, porta) : rasgoDaPorta(resultado, porta) };
    }
  }
  return resultado;
}

/**
 * O que o corpo corta para a dobradiça de uma porta, em milímetro: o rebaixo, onde o tambor gira (abre para o lado do ar), e
 * o rasgo, onde entra a folha fixa. Cada corte é uma caixa `{ larg, alt, prof, em }` (a base do cubo em y) e se repete a
 * cada `passo` ao longo de y, `total` vezes.
 */
export function cortesDoApoio(g, porta) {
  const dg = g.dobradicaGeometria.mm;
  const raio = g.raioDoTambor;
  const folha = g.dobradica.parametros;
  const y0 = porta.dobradicas[0].y - folha.altura / 2;
  const profundidadeDoRebaixo = 2 * raio + 2 * FOLGA_DO_REBAIXO + SOBREPOSICAO;
  const entraNaParede = porta.profundidadeDoPino + raio + FOLGA_DO_REBAIXO;
  const larguraDoRebaixo = entraNaParede + SOBREPOSICAO;
  const centroDoRebaixoEmX = porta.face + porta.abre * (SOBREPOSICAO - entraNaParede) / 2;
  const zDoRebaixo = (g.zDoPino - raio - FOLGA_DO_REBAIXO + g.quadro.frente + SOBREPOSICAO) / 2;
  const fundoDoRasgo = g.zDoPino - dg.xExterno - 0.3;
  const topoDoRasgo = g.zDoPino - raio - FOLGA_DO_REBAIXO + SOBREPOSICAO;
  return {
    total: porta.dobradicas.length,
    passo: porta.passoDasDobradicas,
    rebaixo: {
      larg: larguraDoRebaixo, alt: folha.altura + 2 * MARGEM_DO_REBAIXO, prof: profundidadeDoRebaixo, em: [centroDoRebaixoEmX, y0 - MARGEM_DO_REBAIXO, zDoRebaixo],
    },
    rasgo: {
      larg: folha.espessura + 2 * FOLGA_DO_RASGO, alt: folha.altura + 0.6, prof: topoDoRasgo - fundoDoRasgo,
      em: [porta.xDoPino + porta.vao * dg.zDaChapa, y0 - 0.3, (topoDoRasgo + fundoDoRasgo) / 2],
    },
  };
}

/**
 * O rasgo da borda da porta onde entra a folha móvel, em milímetro: da borda (1 mm para fora, para o corte abrir) até o fim
 * da folha. Na embutida a folha fica atrás do pino (a porta está atrás da frente); na sobreposta, à frente dele.
 */
export function rasgoDaPorta(g, porta) {
  const dg = g.dobradicaGeometria.mm;
  const folha = g.dobradica.parametros;
  const comeco = porta.xDaBorda - porta.vao * SOBREPOSICAO;
  const fim = porta.xDoPino + porta.vao * (dg.xExterno + 0.3);
  const y0 = porta.dobradicas[0].y - folha.altura / 2;
  return {
    larg: Math.abs(fim - comeco), alt: folha.altura + 0.6, prof: folha.espessura + 2 * FOLGA_DO_RASGO,
    em: [(comeco + fim) / 2, y0 - 0.3, g.zDoPino + porta.sinalDoPratoEmZ * dg.zDaChapa],
  };
}

/**
 * O sulco do verso da porta sobreposta, em milímetro: do começo do furo do pino, a `RAIO_DO_SULCO` do eixo, até a ponta da
 * folha, e do plano do verso (1 mm para fora, para o corte abrir) até o fundo do sulco, a `RAIO_DO_SULCO` do eixo. Fica a
 * `PAREDE_DA_BORDA_DA_SOBREPOSTA` da borda da porta, de modo que o sulco não abre na borda.
 */
export function rasgoDaPortaOculta(g, porta) {
  const folha = g.dobradica.parametros;
  const de = DISTANCIA_DO_PINO_A_FACE - RAIO_DO_SULCO;
  const ate = DISTANCIA_DO_PINO_A_FACE + INICIO_DA_FOLHA + COMPRIMENTO_DA_FOLHA + FOLGA_DO_SULCO;
  const z0 = g.zDoPino - SOBREPOSICAO;
  const z1 = g.zDoPino + RAIO_DO_SULCO;
  const y0 = porta.dobradicas[0].y - folha.altura / 2;
  return {
    larg: ate - de, alt: folha.altura + 0.6, prof: z1 - z0,
    em: [porta.face + porta.vao * (de + ate) / 2, y0 - 0.3, (z0 + z1) / 2],
  };
}

/**
 * As peças da dobradiça oculta de uma dobradiça (a `k`-ésima) de uma porta sobreposta, em milímetro, no quadro do móvel. A
 * fixa é a placa na face interna da lateral, as duas abas e o pino com um colar em cada ponta; a móvel é o aro, entre os
 * colares, e a folha que sai dele para dentro do sulco da porta. Cada caixa é `{ larg, alt, prof, em }` (a base em y).
 */
export function pecasDaDobradicaOculta(g, porta, k, painel) {
  const dobradica = porta.dobradicas[k];
  const altura = g.dobradica.parametros.altura;
  const y0 = dobradica.y - altura / 2;
  const y1 = dobradica.y + altura / 2;
  const { vao, face } = porta;
  const xDe = (u) => face + vao * u;
  const zPino = g.zDoPino;
  const uDoPino = DISTANCIA_DO_PINO_A_FACE;
  const uDaPlacaFora = painel + ESPESSURA_DA_PLACA;
  const zDaPlacaTopo = zPino - FOLGA_DA_ABA_NA_PORTA;
  const entreU = (a, b, alt, yBase, z0, z1) => ({ larg: Math.abs(b - a), alt, prof: z1 - z0, em: [xDe((a + b) / 2), yBase, (z0 + z1) / 2] });
  const colar = COMPRIMENTO_DO_COLAR;
  const abaDe = uDoPino + INICIO_DA_ABA_DO_PINO;
  const zDaAbaBaixo = zDaPlacaTopo - ESPESSURA_DA_ABA;
  const yDoAro0 = y0 + colar + FOLGA_DO_ARO_AO_COLAR;
  const yDoAro1 = y1 - colar - FOLGA_DO_ARO_AO_COLAR;
  const zDaFolha0 = zPino + ENTRADA_DA_FOLHA_NA_PORTA_OCULTA;
  const uDaFolha0 = uDoPino + INICIO_DA_FOLHA;
  return {
    y0, y1, yDoAro0, yDoAro1, xDoPino: xDe(uDoPino), zDoPino: zPino,
    fixa: {
      placa: entreU(painel, uDaPlacaFora, altura, y0, g.quadro.frente - COMPRIMENTO_DA_PLACA, zDaPlacaTopo),
      abaDeBaixo: entreU(abaDe, uDaPlacaFora, colar, y0, zDaAbaBaixo, zDaPlacaTopo),
      abaDeCima: entreU(abaDe, uDaPlacaFora, colar, y1 - colar, zDaAbaBaixo, zDaPlacaTopo),
    },
    movel: {
      folha: entreU(uDaFolha0, uDaFolha0 + COMPRIMENTO_DA_FOLHA, yDoAro1 - yDoAro0, yDoAro0, zDaFolha0, zDaFolha0 + ESPESSURA_DA_FOLHA),
    },
  };
}

/* Um retângulo em planta (x, z) de uma porta, no instante em que ela gira `graus` em torno do pino. O retângulo é a seção
   horizontal da porta: da borda da porta até a ponta livre, da face de trás até a frente. */
function retanguloDaPorta(g, porta, graus) {
  const vao = porta.vao;
  const espessura = g.espessura;
  const rad = (graus * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const pino = [porta.xDoPino, g.zDoPino];
  const longe = porta.xLivre - porta.xDoPino;
  const perto = vao * g.afastamento;
  const cantos = [[perto, g.zDoVerso], [longe, g.zDoVerso], [longe, g.zDoVerso + espessura], [perto, g.zDoVerso + espessura]]
    .map(([dx, zAbs]) => [dx, zAbs - g.zDoPino]);
  /* a rotação leva a ponta livre para a frente (+z): com a porta no vão +x, (dx, dz) vai a (dx c - dz s, dx s + dz c); com a
     porta no vão -x, a (dx c + dz s, -dx s + dz c) */
  return cantos.map(([dx, dz]) => {
    const dxg = vao === 1 ? dx * c - dz * s : dx * c + dz * s;
    const dzg = vao === 1 ? dx * s + dz * c : -dx * s + dz * c;
    return [pino[0] + dxg, pino[1] + dzg];
  });
}

function seCruzam(a, b) {
  const eixos = [];
  for (const poligono of [a, b]) {
    for (let i = 0; i < poligono.length; i += 1) {
      const pt = poligono[i];
      const q = poligono[(i + 1) % poligono.length];
      eixos.push([-(q[1] - pt[1]), q[0] - pt[0]]);
    }
  }
  return eixos.every(([ex, ez]) => {
    const pa = a.map(([x, zz]) => x * ex + zz * ez);
    const pb = b.map(([x, zz]) => x * ex + zz * ez);
    return Math.max(...pa) > Math.min(...pb) && Math.max(...pb) > Math.min(...pa);
  });
}

/**
 * O ângulo, no máximo `CURSO_MAXIMO_NA_DIVISORIA`, até o qual as duas portas que giram nas faces da divisória abrem juntas
 * sem se tocar, medido em planta com a seção de cada porta como retângulo. Sem divisória com quatro portas devolve o máximo.
 */
export function cursoNaDivisoria(g, painel) {
  const esquerda = g.portas.find((porta) => porta.apoio === 'divisoria-esquerda');
  const direita = g.portas.find((porta) => porta.apoio === 'divisoria-direita');
  if (!esquerda || !direita) return CURSO_MAXIMO_NA_DIVISORIA;
  const contexto = { ...g, espessura: painel };
  const livre = (graus) => !seCruzam(retanguloDaPorta(contexto, esquerda, graus), retanguloDaPorta(contexto, direita, graus));
  if (livre(CURSO_MAXIMO_NA_DIVISORIA)) return CURSO_MAXIMO_NA_DIVISORIA;
  let livreAte = 0;
  for (let graus = 0; graus <= CURSO_MAXIMO_NA_DIVISORIA; graus += 0.5) {
    if (!livre(graus)) break;
    livreAte = graus;
  }
  /* um grau a menos que o último ângulo livre, para as duas portas não ficarem encostadas no fim do curso */
  return Math.max(0, Math.floor(livreAte) - 1);
}

