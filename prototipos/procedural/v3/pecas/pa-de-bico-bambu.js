/* pa-de-bico-bambu.js — pá de bico completa, com cabo de colmo de bambu.
 *
 * POR QUE ELA EXISTE. O piloto do laboratório concluiu que o colmo bate o
 * eucalipto como cabo, e a conclusão precisava sair da tabela e virar objeto
 * inteiro: lâmina, bocal, cabo e empunhadura. Cabo solto não deixa ninguém
 * julgar proporção nem encaixe, que é onde a ideia vive ou morre.
 *
 * AS MEDIDAS SÃO DE UMA PÁ REAL, tiradas do desenho cotado de uma pá de bico de
 * 101,5 cm: lâmina de 248 mm de largura por 291 mm de comprimento, cabo de
 * 34 mm. A pá de referência tem cabo MACIÇO de madeira; esta troca por colmo de
 * 37 × 3 mm, que é a recomendação do estudo — e os 3 mm a mais de diâmetro são
 * justamente o que compensa o vazio.
 *
 * O QUE O COMPRIMENTO MUDA, e é a favor: com 710 mm de cabo em vez dos 1200 mm
 * que o estudo usou, o braço de alavanca cai e o momento com ele. A margem do
 * colmo no percentil 5 sobe de 0,75 para 1,26. Pá de cabo curto é o caso FÁCIL.
 *
 * UM DETALHE DE EIXOS QUE CUSTOU UMA RODADA. `inflate` constrói ao longo de Z:
 * lê a silhueta em z×y e a planta em z×x. O resto da pá corre em Y, que é o eixo
 * do cabo. Na primeira versão a lâmina saiu perpendicular ao conjunto e apareceu
 * como uma lasca solta no ar — geometria correta, montagem errada. `rotaciona`
 * põe a lâmina no eixo certo, e o giro é passo declarado e não ajuste de números
 * na silhueta: mexer nas coordenadas para compensar o eixo esconderia a razão.
 *
 * O QUE O CRÍTICO CEGO VIU, e o que foi feito com cada achado. Ele reconheceu o
 * objeto sem contexto — "pá de bico, haste de bambu, punho em D" — então a forma
 * comunica. Três achados:
 *
 *   - BOCAL APARENTEMENTE DESLOCADO na isométrica. NÃO é defeito: todas as
 *     seções do loft estão em x = 0, e a vista frontal mostra o bocal centrado e
 *     simétrico. É a concha da lâmina inclinando a leitura em perspectiva.
 *     Registrado em vez de "corrigido" — mexer aqui seria conserto certo num
 *     objeto que não estava errado.
 *   - LÂMINA SEM CHANFRO na borda de ataque. Verdade, e é o limite declarado
 *     abaixo: forma geral, não desenho de fabricação.
 *   - REFORÇO ENTRE HASTE E LÂMINA "não visível". Ele existe e é o bocal, em aço
 *     — o crítico não o distinguiu porque lâmina e bocal saem quase da mesma cor.
 *     É achado de LEGIBILIDADE, não de geometria.
 *
 * O QUE ESTA PEÇA NÃO É. Não é desenho de fabricação: a lâmina é a forma geral
 * com o nervo central e a pestana, mas sem o resto do estampado; o bocal é um
 * tronco de cone sem a costura, e a
 * empunhadura é o D em tubo sem o miolo moldado. Serve para julgar proporção,
 * encaixe e a aparência do conjunto — que é o que a pergunta pedia.
 */

const P = {
  lamina: { largura: 0.248, comprimento: 0.291, espessura: 0.004, concha: 0.030 },
  bocal: { comprimento: 0.150, raioBoca: 0.024, lados: 20 },
  cabo: { comprimento: 0.710, diametroExterno: 0.037, parede: 0.003, lados: 20 },
  nos: { quantidade: 3, saliencia: 0.0018, largura: 0.013 },
  punho: { altura: 0.120, meiaLargura: 0.058, raioTubo: 0.011, lados: 12 },
};

const L = P.lamina, B = P.bocal, C = P.cabo, N = P.nos, D = P.punho;
const Re = C.diametroExterno / 2;
const Ri = Re - C.parede;
/* A BOCA DA PÁ REAL TEM DUAS PARTES, e a primeira versão fundia as duas num
   cilindro só. Conferido contra foto de pá de bico comercial:

     - SOBRE A CHAPA ela é um NERVO — um vinco achatado que abre em leque e
       morre no terço de baixo da lâmina. Não é um tubo deitado: tem largura e
       quase nenhuma altura, e é ele que enrijece a chapa contra o dobramento.
     - ACIMA DOS OMBROS ela vira CANO, e o cano sobe bem além deles para abraçar
       o cabo num trecho longo. Na primeira versão o bocal terminava ABAIXO do
       topo da lâmina, e por isso os ombros liam altos demais em relação à boca.

   Achado pelo usuário, com foto de referência. O erro não era de medida: era de
   não ter olhado como a peça real resolve o encontro. */
const yOmbro = L.comprimento;                 /* topo da lâmina: onde ficam os ombros */
const yBocal = L.comprimento * 0.62;          /* meio do nervo, sobre a chapa */
const yBocaTopo = yOmbro + 0.064;             /* o cano sobe além dos ombros */
const yCabo = yOmbro - 0.046;                 /* o colmo entra e é abraçado pelo cano */

/* Seção achatada: larga na chapa, baixa em relevo. `lados` pontos exatos, que é
   o que o loft exige do contorno explícito. */
const ovalDoNervo = (meiaLargura, relevo) => Array.from({ length: B.lados }, (_, k) => {
  const t = (k / B.lados) * Math.PI * 2;
  return [meiaLargura * Math.cos(t), relevo * Math.sin(t)];
});
const yTopo = yCabo + C.comprimento;

/* Planta da lâmina: bico arredondado embaixo, ombros largos em cima. Meia
   largura em z, espelhada, porque a pá é simétrica e escrever os dois lados à
   mão convida a assimetria por descuido. */
const meia = L.largura / 2;
/* Contorno lido do desenho cotado: bico arredondado embaixo, laterais quase
   paralelas no meio, ombros levemente recolhidos em cima, onde entra o bocal.
   A primeira versão punha 60 mm de largura já na PONTA e saía com cara de
   espátula; bico de pá é ponta, e é ela que entra na terra. */
/* O OMBRO É CANTO ARREDONDADO, e não bisel. A primeira versão ia de
   `meia * 0.985` a `meia * 0.90` em linha reta, e lia como um chanfro qualquer
   com a boca aberta demais — apontado pelo usuário sobre o desenho cotado da pá
   comercial, onde o canto vira num raio curto e a aresta de cima fica quase
   reta entre os dois ombros. Os pontos abaixo descrevem esse raio. */
const plantaMeia = [
  [0.000, 0.012], [0.012, 0.038], [0.032, 0.068], [0.058, 0.093],
  [0.092, 0.112], [0.135, meia], [0.200, meia], [0.248, meia * 0.995],
  [0.268, meia * 0.980], [0.279, meia * 0.955], [0.286, meia * 0.915],
  [L.comprimento, meia * 0.855],
];
const plantaLamina = [
  ...plantaMeia.map(([z, x]) => [z, x]),
  ...[...plantaMeia].reverse().map(([z, x]) => [z, -x]),
];

/* Silhueta: a concha. A face inferior sobe do bico para a traseira, e a
   superior acompanha com a espessura da chapa. É o que dá o formato de colher. */
/* A concha: a chapa sobe do bico para a traseira.

   LIMITE DECLARADO: `inflate` cruza uma silhueta (z x y) com uma planta (z x x),
   e isso só curva a chapa AO LONGO do comprimento. A pá real também é côncava na
   LARGURA, e essa segunda curvatura não sai de um único `inflate`. A forma lê
   como pá porque a curva longitudinal domina, mas quem olhar de frente vai ver
   uma chapa reta na largura — melhor dizer do que deixar descobrir. */
const concha = (z) => L.concha * Math.pow(z / L.comprimento, 1.55);
const amostras = [0, 0.03, 0.07, 0.12, 0.18, 0.24, L.comprimento];
const silhuetaLamina = [
  ...amostras.map((z) => [z, concha(z) + L.espessura]),
  ...[...amostras].reverse().map((z) => [z, concha(z)]),
];

function perfilColmo(raioBase) {
  const pontos = [];
  const passo = C.comprimento / (N.quantidade - 1);
  for (let i = 0; i < N.quantidade; i += 1) {
    const y = yCabo + passo * i;
    const meiaN = N.largura / 2;
    if (i > 0) pontos.push({ y: y - meiaN * 2.2, r: raioBase });
    pontos.push({ y: y - meiaN, r: raioBase + N.saliencia * 0.55 });
    pontos.push({ y, r: raioBase + N.saliencia });
    pontos.push({ y: y + meiaN, r: raioBase + N.saliencia * 0.55 });
    if (i < N.quantidade - 1) pontos.push({ y: y + meiaN * 2.2, r: raioBase });
  }
  return pontos
    .filter((p) => p.y >= yCabo && p.y <= yTopo)
    .sort((a, b) => a.y - b.y)
    .filter((p, i, t) => i === 0 || p.y - t[i - 1].y > 1e-6)
    .map((p) => ({ pos: [0, p.y, 0], raio: p.r }));
}

/* A PESTANA — a borda de cima virada, onde o pé pisa.
   Nome com ressalva: "pestana" é o que mais se ouve em pá no Brasil, ao lado de
   "aba de pisar" e "apoio de pé"; não achei norma que fixe um só termo, então
   fica declarado que é o nome de uso e não uma citação.

   ELA NÃO É ONDULAÇÃO, É DOBRA. A chapa é a mesma, virada sobre si mesma no
   ombro, e resolve três coisas de uma vez: enrijece o ombro contra dobrar, tira
   o fio de corte de onde o pé encosta, e dá superfície plana para pisar. Sem
   ela o ombro é só uma aresta de chapa, que foi como esta peça ficou até aqui.

   E ELA MORRE NA LATERAL, que é a parte que o usuário viu no desenho e a nossa
   não tinha: o raio da dobra vai diminuindo até sumir antes do canto, em vez de
   terminar em degrau. Por isso a última seção tem raio quase nulo.

   O eixo já está girado quando ela é construída: a lâmina nasce deitada em Z e
   `rotaciona` põe o comprimento em Y, então a pestana corre em X (a largura),
   na altura do topo da lâmina e recuada pela concha. */
const yPestana = L.comprimento - 0.006;
const zPestana = -(L.concha + L.espessura * 0.5);
const RAIO_DA_PESTANA = 0.0052;

const pestana = (sinal) => [
  { pos: [sinal * 0.026, yPestana, zPestana], raio: RAIO_DA_PESTANA * 0.55 },
  { pos: [sinal * 0.045, yPestana, zPestana], raio: RAIO_DA_PESTANA },
  { pos: [sinal * 0.072, yPestana - 0.001, zPestana], raio: RAIO_DA_PESTANA },
  { pos: [sinal * 0.094, yPestana - 0.004, zPestana], raio: RAIO_DA_PESTANA * 0.72 },
  { pos: [sinal * meia * 0.87, yPestana - 0.010, zPestana], raio: RAIO_DA_PESTANA * 0.30 },
];

/* O D: dois montantes que abrem do topo do colmo e uma travessa que os une.
   Cada um é um loft de seção circular — o punho real tem miolo moldado, e a
   simplificação está declarada no topo do arquivo. */
/* O punho real não brota do colmo: ele entra num COLAR que abraça a ponta do
   cabo. A primeira versão fazia os montantes nascerem direto da madeira e o
   encontro ficava sem explicação — o mesmo defeito de encaixe fingido que a
   cabeça do machado já teve, e que só some quando a peça de junção existe. */
const yColar = yTopo - 0.052;
const yPunhoBase = yTopo - 0.006;
const yPunhoTopo = yPunhoBase + D.altura;
const montante = (sinal) => [
  { pos: [0, yPunhoBase, 0], raio: D.raioTubo * 1.15 },
  { pos: [sinal * D.meiaLargura * 0.55, yPunhoBase + D.altura * 0.34, 0], raio: D.raioTubo },
  { pos: [sinal * D.meiaLargura, yPunhoBase + D.altura * 0.70, 0], raio: D.raioTubo },
  { pos: [sinal * D.meiaLargura, yPunhoTopo - 0.008, 0], raio: D.raioTubo },
];

export const receitaPaDeBicoBambu = {
  meta: { nome: 'Pá de Bico com Cabo de Bambu', versao: '1.0.0', autor: 'Mecanifica Procedural AI' },

  PARAMS: P,

  TOPO: {
    medidasDeUmaPaReal: 'lâmina 248 × 291 mm, cabo 710 mm, total próximo de 1015 mm',
    caboTrocado: 'a referência é madeira maciça de 34 mm; aqui é colmo de 37 × 3 mm',
    cabosCurtoEFacil: 'com 710 mm o momento cai e a margem do colmo sobe para 1,26 no p05',
  },

  MATERIAIS: {
    aco: { cor: '#2b2f33', metalicidade: 0.72, aspereza: 0.44 },
    bambu: { cor: '#c9b177', metalicidade: 0.02, aspereza: 0.62 },
    bambuInterno: { cor: '#7a6a4a', metalicidade: 0.02, aspereza: 0.78 },
    borracha: { cor: '#23262a', metalicidade: 0.04, aspereza: 0.86 },
  },

  PASSOS: [
    ['inflate', {
      origemId: 1,
      contornoLado: silhuetaLamina,
      contornoTopo: plantaLamina,
      modo: 'secoes',
      /* 28 divisões, e o número tem motivo medido: `inflate` voxeliza o eixo
         mais longo, e com 4 o voxel dava 73 mm sobre um bico que se forma em
         90 mm — a ponta virava um bloco. A forma da lâmina É a ponta; grade
         grossa apaga exatamente o que a peça precisa mostrar. */
      divisoes: 28,
      lados: 18,
      expoenteSecao: 12,
    }],
    /* A lâmina nasce deitada em Z e é girada para o eixo do cabo. */
    ['rotaciona', { eixo: 'x', graus: -90, pivo: [0, 0, 0], sel: { origem: { op: 'inflate', id: 1 } } }],

    ['loft', {
      origemId: 2, lados: B.lados, orientacao: [1, 0, 0],
      secoes: [
        /* Nervo morrendo na chapa: largura crescendo, relevo indo a quase zero. */
        /* LARGURA ENXUTA, apontada pelo usuário sobre a vista frontal: a primeira
           versão do nervo abria 52 mm contra os 248 mm da lâmina e lia gorda.
           O relevo NÃO acompanha o corte — ele é o que abraça o cabo, e no topo
           precisa continuar maior que o raio do colmo. Estreitar é de forma;
           achatar seria de função. */
        { pos: [0, yBocal - 0.095, 0], contorno: ovalDoNervo(0.0075, 0.0016) },
        { pos: [0, yBocal - 0.050, 0], contorno: ovalDoNervo(0.0135, 0.0050) },
        { pos: [0, yBocal, 0], contorno: ovalDoNervo(0.0175, 0.0110) },
        /* Transição para cano, ainda sob os ombros. */
        { pos: [0, yCabo, 0], contorno: ovalDoNervo(0.0215, 0.0205) },
        { pos: [0, yOmbro, 0], raio: 0.0235 },
        { pos: [0, yBocaTopo - 0.022, 0], raio: Re + 0.0030 },
        { pos: [0, yBocaTopo, 0], raio: Re + 0.0016 },
      ],
    }],
    /* A pestana corre em X, então a referência do anel tem de ser TRANSVERSAL a
       X — [1,0,0] é paralela à tangente e o motor recusa, com razão. */
    ['loft', { origemId: 9, lados: 10, orientacao: [0, 1, 0], secoes: pestana(1) }],
    ['loft', { origemId: 10, lados: 10, orientacao: [0, 1, 0], secoes: pestana(-1) }],

    ['loft', { origemId: 3, lados: C.lados, orientacao: [1, 0, 0], secoes: perfilColmo(Re) }],
    ['loft', { origemId: 4, lados: C.lados, orientacao: [1, 0, 0], secoes: perfilColmo(Ri) }],
    ['loft', { origemId: 5, lados: D.lados, orientacao: [0, 0, 1], secoes: montante(1) }],
    ['loft', { origemId: 6, lados: D.lados, orientacao: [0, 0, 1], secoes: montante(-1) }],
    ['loft', {
      origemId: 8, lados: B.lados, orientacao: [1, 0, 0],
      secoes: [
        { pos: [0, yColar, 0], raio: Re + 0.0035 },
        { pos: [0, yColar + 0.030, 0], raio: Re + 0.0042 },
        /* O ESTRANGULAMENTO PRECISA FICAR ACIMA DO TOPO DO COLMO. A primeira
           versão afinava para o raio do punho em yTopo - 0.002, com 14,3 mm
           contra os 18,5 mm do tubo: o colar apertava antes de terminar de
           cobrir, e os últimos milímetros de bambu atravessavam ele. Achado a
           olho pelo usuário, e confirmado nos números — a vista geral mostrava,
           e eu tinha passado por ela sem ver. */
        { pos: [0, yTopo + 0.004, 0], raio: Re + 0.0030 },
        { pos: [0, yPunhoBase + 0.016, 0], raio: D.raioTubo * 1.30 },
      ],
    }],
    ['loft', {
      origemId: 7, lados: D.lados, orientacao: [0, 1, 0],
      secoes: [
        { pos: [-D.meiaLargura - 0.004, yPunhoTopo, 0], raio: D.raioTubo * 1.25 },
        { pos: [0, yPunhoTopo, 0], raio: D.raioTubo * 1.25 },
        { pos: [D.meiaLargura + 0.004, yPunhoTopo, 0], raio: D.raioTubo * 1.25 },
      ],
    }],

    ['parte', { nome: 'lamina', sel: { origem: { op: 'inflate', id: 1 } } }],
    ['parte', { nome: 'pestana', sel: { origem: { op: 'loft', id: 9 } } }],
    ['parte', { nome: 'pestana', sel: { origem: { op: 'loft', id: 10 } } }],
    ['parte', { nome: 'bocal', sel: { origem: { op: 'loft', id: 2 } } }],
    ['parte', { nome: 'colmo', sel: { origem: { op: 'loft', id: 3 } } }],
    ['parte', { nome: 'furo', sel: { origem: { op: 'loft', id: 4 } } }],
    ['parte', { nome: 'punho', sel: { origem: { op: 'loft', id: 5 } } }],
    ['parte', { nome: 'punho', sel: { origem: { op: 'loft', id: 6 } } }],
    ['parte', { nome: 'punho', sel: { origem: { op: 'loft', id: 7 } } }],
    ['parte', { nome: 'punho', sel: { origem: { op: 'loft', id: 8 } } }],

    ['material', { usa: 'aco', sel: { grupo: 'lamina' } }],
    ['material', { usa: 'aco', sel: { grupo: 'bocal' } }],
    ['material', { usa: 'aco', sel: { grupo: 'pestana' } }],
    ['material', { usa: 'bambu', sel: { grupo: 'colmo' } }],
    ['material', { usa: 'bambuInterno', sel: { grupo: 'furo' } }],
    ['material', { usa: 'borracha', sel: { grupo: 'punho' } }],
  ],
};

export default receitaPaDeBicoBambu;
