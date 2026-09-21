/* braco-robotico.js — braço industrial fictício de 6 eixos, alcance 850 mm,
 * classe de 5 kg de carga. Peça inteira, e não módulo de um conjunto maior.
 *
 * DE ONDE VÊM OS NÚMEROS. Não há imagem cotada deste robô, porque ele não
 * existe. A tabela é a de um braço real dessa classe: alcance de 850 mm
 * repartido entre braço, antebraço e punho, base de 180 mm de diâmetro e
 * coluna de 160. As três imagens em `referencias/` foram geradas e servem de
 * consulta de FORMA, e não de cota: elas dizem que o punho tem forquilha
 * vazada, que os anéis entre carcaças são peças salientes e que o antebraço
 * sai do flanco da carcaça do cotovelo, e não do topo dela. Onde imagem e
 * tabela discordarem, a tabela manda, e isso já aconteceu uma vez: a lateral
 * põe a razão entre alcance horizontal e altura em 0,73 e a tabela põe em
 * 0,61, porque a imagem tem leve perspectiva e o antebraço dela é
 * proporcionalmente mais comprido do que o de um braço de 850 mm.
 *
 * ESCALA: metros, como o resto do acervo. A tabela é em milímetro porque é
 * assim que cota de robô é publicada, e `m()` converte num lugar só.
 *
 * GEOMETRIA AINDA NÃO ESCRITA. `gerarPassos` devolve lista vazia de propósito:
 * esta receita nasceu na rodada de alinhamento, antes de existir passo, para
 * que o plano e os contatos pudessem ser cobrados por gate antes de qualquer
 * malha. Quem escreve os passos é o modelador, com este plano na mão.
 */

const m = (mm) => mm / 1000;

export const TABELA = {
  baseDiametro: 180,
  baseAltura: 150,
  colunaDiametro: 160,
  colunaAltura: 180,
  bracoComprimento: 380,
  bracoLargura: 130,
  bracoProfundidade: 110,
  cotoveloDesvio: 90,
  antebracoComprimento: 370,
  antebracoDiametroRaiz: 100,
  antebracoDiametroPonta: 85,
  punhoComprimento: 100,
  flangeDiametro: 90,
  flangeEspessura: 12,
  flangeFuros: 8,
  flangeCircunferenciaDeFuros: 65,
  flangeFuroCentral: 35,

  sobreposicaoJunta: 4,
  bracoChanfro: 10,
  punhoDiametro: 85,
  punhoDiametroDegrau: 65,
  punhoCilindroDiametro: 50,
  punhoRasgoLargura: 18,
  punhoSobreposicao: 8,
  flangeSobreposicao: 4,
};

export function derivar(t = TABELA) {
  /* Os centros de junta são a verdade dimensional desta peça, e cada um sai da
     soma dos elos anteriores. Nenhuma coordenada é digitada à mão: mexer num
     comprimento tem que arrastar tudo o que vem depois dele. */
  const junta2 = [0, 0, m(t.baseAltura + t.colunaAltura)];
  const junta3 = [0, 0, junta2[2] + m(t.bracoComprimento)];
  const punho = [m(t.antebracoComprimento), m(t.cotoveloDesvio), junta3[2]];
  const flange = [punho[0] + m(t.punhoComprimento), punho[1], punho[2]];
  const alcance = m(t.bracoComprimento + t.antebracoComprimento + t.punhoComprimento);
  return { junta2, junta3, punho, flange, alcance };
}

export const ORIGENS = {
  baseDiametro: 'cota de base de braco industrial de 5 kg de carga',
  baseAltura: 'cota de base de braco industrial de 5 kg de carga',
  colunaDiametro: 'cota de coluna giratoria da mesma classe',
  colunaAltura: 'cota de coluna giratoria da mesma classe',
  bracoComprimento: 'reparticao do alcance de 850 mm entre braco, antebraco e punho',
  bracoLargura: 'secao de carcaca de braco da mesma classe',
  bracoProfundidade: 'secao de carcaca de braco da mesma classe',
  cotoveloDesvio: 'desvio lateral do cotovelo visto na referencia de perto',
  antebracoComprimento: 'reparticao do alcance de 850 mm entre braco, antebraco e punho',
  antebracoDiametroRaiz: 'secao de antebraco da mesma classe',
  antebracoDiametroPonta: 'secao de antebraco da mesma classe',
  punhoComprimento: 'reparticao do alcance de 850 mm entre braco, antebraco e punho',
  flangeDiametro: 'padrao de flange de ferramenta da mesma classe',
  flangeEspessura: 'padrao de flange de ferramenta da mesma classe',
  flangeFuros: 'padrao de flange de ferramenta da mesma classe',
  flangeCircunferenciaDeFuros: 'padrao de flange de ferramenta da mesma classe',
  flangeFuroCentral: 'padrao de flange de ferramenta da mesma classe',

  sobreposicaoJunta: 'sobreposicao minima entre elos consecutivos, para que a junta encoste de verdade e nao so tangencie a caixa vizinha',
  bracoChanfro: 'chanfro suave da carcaca retangular do braco, dentro do limite que a secao permite',
  punhoDiametro: 'continuidade com o diametro de ponta do antebraco, onde a carcaca do punho comeca',
  punhoDiametroDegrau: 'diametro mais estreito do punho junto ao flange, formando o degrau visto na referencia de punho',
  punhoCilindroDiametro: 'diametro do bloco cilindrico interno visivel na forquilha, menor que a carcaca do punho',
  punhoRasgoLargura: 'largura do rasgo passante da forquilha, visto na referencia de punho',
  punhoSobreposicao: 'sobreposicao entre a carcaca do punho e a ponta do antebraco, para que a junta encoste de verdade',
  flangeSobreposicao: 'sobreposicao entre o flange e o degrau do punho, para que a junta encoste de verdade',
};

/* GEOMETRIA. Z para cima (TOPO.origem). `cilindro`/`cone`/`lathe` nascem com a
   base em y=0 e o topo em y=altura (chao embaixo); `eixo:'z'` gira essa base
   para o plano XY e `em` posiciona onde a base cai, já depois do giro (pose de
   criacao). `eixo:'x'` deita o mesmo cilindro no eixo X, base em `em`, topo em
   `em + [altura,0,0]` — é assim que braco, antebraco, punho e flange, que
   correm ao longo de X, sao encadeados sem uma coordenada calculada a mao: a
   base de cada elo é a ponta do elo anterior.

   `chamferBox` nao tem `eixo` (nao é gerada por revolucao), entao o braco
   nasce deitado (y=0..altura) e precisa de um `rotaciona x 90` com pivo na
   origem para erguer o mesmo y=altura para z=altura, seguido de um
   `transladar` até a base da coluna — a mesma regra da tabela de orientacao da
   skill, só que aplicada a Y->Z em vez de Y->X.

   Cada junta recebe `sobreposicaoJunta` (ou a sobreposicao propria da peca,
   `punhoSobreposicao`/`flangeSobreposicao`) puxando o elo de cima para dentro
   do elo de baixo, sem mexer no topo: o comprimento cresce pela mesma
   sobreposicao, entao o topo continua exatamente na junta derivada e o
   contato deixa de ser tangencia de caixa para virar volume que realmente se
   cruza — a diferenca que este plano de contatos exige. */
function gerarPassos(t = TABELA) {
  const ov = t.sobreposicaoJunta;

  const z1 = t.baseAltura;                    // topo da base = fundo da coluna (junta 1)
  const z2 = z1 + t.colunaAltura;              // topo da coluna = fundo do braco (junta 2)
  const z3 = z2 + t.bracoComprimento;          // topo do braco = raiz do antebraco (junta 3)
  const xAntebracoRaiz = 0;
  const xAntebracoPonta = t.antebracoComprimento;
  const yCotovelo = t.cotoveloDesvio;

  const meioPunho = (t.punhoComprimento - t.punhoRasgoLargura) / 2;
  const xCheekRaiz = xAntebracoPonta - t.punhoSobreposicao;
  const xCheekPonta = xAntebracoPonta + meioPunho + t.punhoRasgoLargura;
  const xFlangeCentro = xAntebracoPonta + t.punhoComprimento;

  const segAntebraco = t.antebracoComprimento / 3;
  const diamAntebracoMeio = (t.antebracoDiametroRaiz + t.antebracoDiametroPonta) / 2;

  const BASE = 1, COLUNA = 2, BRACO = 3;
  const ANTEBRACO_RAIZ = 4, ANTEBRACO_MEIO = 5, ANTEBRACO_PONTA = 6;
  const PUNHO_CHEEK_RAIZ = 7, PUNHO_CILINDRO = 8, PUNHO_CHEEK_PONTA = 9, FLANGE = 10;

  /* O cilindro, sozinho entre os geradores, publica `origem` sem `lado` nem
     `tampa` como só as LATERAIS — as duas tampas ficam sem identidade se o
     `parte` citar só isso. Um cilindro inteiro é a união dos três termos;
     como `sel.origem` aqui não aceita lista, a peça marca a parte em três
     passos por cilindro em vez de um só. */
  const parteCilindroInteiro = (nome, id) => ([
    ['parte', { nome, sel: { origem: { op: 'cilindro', id } } }],
    ['parte', { nome, sel: { origem: { op: 'cilindro', id, tampa: 'fundo' } } }],
    ['parte', { nome, sel: { origem: { op: 'cilindro', id, tampa: 'topo' } } }],
  ]);

  return [
    // ---------- base ----------
    ['cilindro', {
      origemId: BASE, eixo: 'z', em: [0, 0, 0],
      raio: m(t.baseDiametro) / 2, altura: m(t.baseAltura),
    }],
    ...parteCilindroInteiro('base', BASE),

    // ---------- coluna (desce `ov` dentro da base, mantendo o topo em z2) ----------
    ['cilindro', {
      origemId: COLUNA, eixo: 'z', em: [0, 0, m(z1 - ov)],
      raio: m(t.colunaDiametro) / 2, altura: m(t.colunaAltura + ov),
    }],
    ...parteCilindroInteiro('coluna', COLUNA),

    // ---------- braco: carcaca retangular chanfrada, deitada em Y e erguida para Z ----------
    ['chamferBox', {
      origemId: BRACO,
      larg: m(t.bracoLargura), alt: m(t.bracoComprimento + ov), prof: m(t.bracoProfundidade),
      chanfro: m(t.bracoChanfro),
    }],
    ['rotaciona', { sel: { origem: { op: 'chamferBox', id: BRACO } }, eixo: 'x', graus: 90, pivo: [0, 0, 0] }],
    ['transladar', { sel: { origem: { op: 'chamferBox', id: BRACO } }, d: [0, 0, m(z2 - ov)] }],
    ['parte', { nome: 'braco', sel: { origem: { op: 'chamferBox', id: BRACO } } }],

    /* antebraco: afinar de raizD para pontaD pede o loft, mas o loft não fecha
       as duas pontas (não tem tampa própria — GEOMETRIA AINDA AGRAVA) e a
       malha aberta resultante deixou a medida de contato sem decidir
       antebraco↔braco e antebraco↔punho (dois pares que a receita declara e
       precisam fechar). Substituído por três cilindros fechados encadeados,
       cada um com diâmetro constante, afinando em degraus em vez de suave —
       ATRITO registrado: falta um jeito de fechar as pontas de um loft (ou um
       loft com tampa automática) para este afinamento sair liso. */
    ['cilindro', {
      origemId: ANTEBRACO_RAIZ, eixo: 'x', em: [m(xAntebracoRaiz), m(yCotovelo), m(z3)],
      raio: m(t.antebracoDiametroRaiz) / 2, altura: m(segAntebraco),
    }],
    ...parteCilindroInteiro('antebraco', ANTEBRACO_RAIZ),

    ['cilindro', {
      origemId: ANTEBRACO_MEIO, eixo: 'x', em: [m(segAntebraco - ov), m(yCotovelo), m(z3)],
      raio: m(diamAntebracoMeio) / 2, altura: m(segAntebraco + ov),
    }],
    ...parteCilindroInteiro('antebraco', ANTEBRACO_MEIO),

    ['cilindro', {
      origemId: ANTEBRACO_PONTA, eixo: 'x', em: [m(2 * segAntebraco - ov), m(yCotovelo), m(z3)],
      raio: m(t.antebracoDiametroPonta) / 2, altura: m(segAntebraco + ov),
    }],
    ...parteCilindroInteiro('antebraco', ANTEBRACO_PONTA),

    // ---------- punho: forquilha vazada (dois topos) mais o bloco cilindrico interno ----------
    ['cilindro', {
      origemId: PUNHO_CHEEK_RAIZ, eixo: 'x', em: [m(xCheekRaiz), m(yCotovelo), m(z3)],
      raio: m(t.punhoDiametro) / 2, altura: m(meioPunho + t.punhoSobreposicao),
    }],
    ...parteCilindroInteiro('punho', PUNHO_CHEEK_RAIZ),

    ['cilindro', {
      origemId: PUNHO_CILINDRO, eixo: 'x', em: [m(xAntebracoPonta), m(yCotovelo), m(z3)],
      raio: m(t.punhoCilindroDiametro) / 2, altura: m(t.punhoComprimento),
    }],
    ...parteCilindroInteiro('punho', PUNHO_CILINDRO),

    ['cilindro', {
      origemId: PUNHO_CHEEK_PONTA, eixo: 'x', em: [m(xCheekPonta), m(yCotovelo), m(z3)],
      raio: m(t.punhoDiametroDegrau) / 2, altura: m(meioPunho + t.flangeSobreposicao),
    }],
    ...parteCilindroInteiro('punho', PUNHO_CHEEK_PONTA),

    // ---------- flange: disco de ferramenta, centrado exatamente na junta derivada ----------
    ['cilindro', {
      origemId: FLANGE, eixo: 'x',
      em: [m(xFlangeCentro - t.flangeEspessura / 2), m(yCotovelo), m(z3)],
      raio: m(t.flangeDiametro) / 2, altura: m(t.flangeEspessura),
    }],
    ...parteCilindroInteiro('flange', FLANGE),
  ];
}

/* PONTOS DECLARADOS — os critérios do plano escritos como coordenada e
   tolerância, para que `conferir-pontos` os confira por conta a cada rodada.
   Todos saem da tabela por aritmética; nenhum é digitado, porque coordenada
   digitada deixa de corresponder à tabela assim que ela muda.

   SÓ ENTRA AQUI O QUE A CAIXA DE CADA PARTE DEFINE SEM AMBIGUIDADE. O centro
   da junta 3 ficou de fora de propósito: o antebraço entra pelo flanco da
   carcaça do cotovelo, e o centro da sobreposição das duas caixas não cai no
   eixo da junta. Declarar ali um número que a medida não sabe produzir seria
   ensinar que o ponto é decorativo. No lugar dele vai a ponta do antebraço,
   que a caixa define exatamente e que erra junto se o cotovelo sair do lugar. */
function pontosDeclarados(t = TABELA) {
  const juntaUm = t.baseAltura;
  const juntaDois = juntaUm + t.colunaAltura;
  const juntaTres = juntaDois + t.bracoComprimento;
  const meioRaiz = t.antebracoDiametroRaiz / 2;
  return [
    { nome: 'baseCentro', parte: 'base', medida: 'centro',
      em: [0, 0, t.baseAltura / 2], toleranciaMm: 3 },
    { nome: 'junta1', entre: ['base', 'coluna'],
      em: [0, 0, juntaUm], toleranciaMm: 5 },
    { nome: 'junta2', entre: ['coluna', 'braco'],
      em: [0, 0, juntaDois], toleranciaMm: 5 },
    { nome: 'bracoTopo', parte: 'braco', medida: 'maximo',
      em: [t.bracoLargura / 2, t.bracoProfundidade / 2, juntaTres], toleranciaMm: 5 },
    { nome: 'antebracoPonta', parte: 'antebraco', medida: 'maximo',
      em: [t.antebracoComprimento, t.cotoveloDesvio + meioRaiz, juntaTres + meioRaiz], toleranciaMm: 5 },
    { nome: 'flangeCentro', parte: 'flange', medida: 'centro',
      em: [t.antebracoComprimento + t.punhoComprimento, t.cotoveloDesvio, juntaTres], toleranciaMm: 5 },
  ];
}

export const receitaBracoRobotico = {
  meta: {
    nome: 'Braço robótico de 6 eixos',
    versao: '0.1.0',
    autor: 'Mecanifica Procedural AI',
    desc: 'braço industrial fictício, alcance 850 mm, classe de 5 kg',
  },

  PARAMS: TABELA,

  ORIGENS,

  PONTOS: pontosDeclarados(),

  PLANO: {
    objeto: 'braco robotico industrial ficticio de 6 eixos, alcance 850 mm, classe de 5 kg, peca inteira',
    referencias: [
      'referencias/lateral.png',
      'referencias/punho.png',
      'referencias/cotovelo.png',
    ],
    escala: { medida: 'alcance do braco esticado, do eixo da coluna ao flange', milimetros: 850 },
    partes: [
      { nome: 'base', forma: 'cilindro chato apoiado no chao, de 180 de diametro e 150 de altura', tecnica: 'cilindro com tampas' },
      { nome: 'coluna', forma: 'cilindro de 160 de diametro que gira sobre a base e sobe ate a junta 2', tecnica: 'cilindro com tampas' },
      { nome: 'braco', forma: 'carcaca de secao retangular que sobe 380 da coluna ate o cotovelo, com topo arredondado', tecnica: 'loft de superelipse ao longo de reta' },
      { nome: 'antebraco', forma: 'cilindro de 370 que sai do flanco da carcaca do cotovelo, afinando de 100 para 85', tecnica: 'loft de secao circular' },
      { nome: 'punho', forma: 'conjunto de 100 com forquilha vazada de lado a lado, onde ficam as juntas 4, 5 e 6', tecnica: 'caixa com rasgo passante mais cilindro interno' },
      { nome: 'flange', forma: 'disco chato de 90 de diametro e 12 de espessura, com oito furos e um furo central', tecnica: 'cilindro com furos booleanos' },
    ],
    criteriosDeReprovacao: [
      'centro da junta 2 fora de (0, 0, 330), tolerancia de 5 mm',
      'centro da junta 3 fora de (0, 0, 710), tolerancia de 5 mm',
      'centro do punho fora de (370, 90, 710), tolerancia de 5 mm',
      'centro do flange fora de (470, 90, 710), tolerancia de 5 mm',
      'base com diametro diferente de 180 mm, tolerancia de 3 mm',
    ],
  },

  /* CONTATOS INTENCIONAIS. Um braço é uma cadeia contínua: cada elo encosta no
     anterior porque é ali que a junta trabalha. Elo que não encosta é braço
     partido, e par que se toca fora desta lista é colisão. */
  contatos: [
    { par: ['base', 'coluna'], motivo: 'a coluna gira apoiada na base, na junta 1' },
    { par: ['braco', 'coluna'], motivo: 'o braco articula no topo da coluna, na junta 2' },
    { par: ['antebraco', 'braco'], motivo: 'o antebraco articula no flanco do braco, na junta 3' },
    { par: ['antebraco', 'punho'], motivo: 'o punho fecha a ponta do antebraco, nas juntas 4, 5 e 6' },
    { par: ['flange', 'punho'], motivo: 'o flange e a saida de ferramenta do punho' },
  ],

  TOPO: {
    origem: 'centro da base no chao; x para a frente, y para a esquerda, z para cima',
    simetria: 'nenhuma: o desvio do cotovelo quebra a simetria bilateral de proposito',
    modulo: 'peça inteira; nenhum módulo separado',
  },

  MATERIAIS: {
    carcacaCinza: { cor: '#c9c9c6', metalicidade: 0.15, aspereza: 0.55 },
    anelEscuro: { cor: '#55585c', metalicidade: 0.75, aspereza: 0.30 },
  },

  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receitaBracoRobotico;
