/* aviao/empenagem-horizontal — as duas metades do estabilizador do avião de pequeno porte, com os profundores, os eixos deles e os
 * suportes, na pose de pouso, com os profundores neutros.
 *
 * Quinta etapa do avião (`../../montagem.json`): o plano está em `../../ALINHAMENTO.md` e as formas vêm da unidade
 * `empenagem-horizontal` do esboço aprovado da segunda rodada (`docs/modelar/banco-de-provas/aviao-2026-10-11/esboco-r2/`, o mestre
 * e `aviao-detalhe-empenagem-horizontal.esboco.json`). A receita refina o andaime `../../andaime.json` (REFINA).
 *
 * Referencial do acervo e do esboço: Y para cima, chão em y = 0, x para a direita do piloto, a proa para -z e a cauda para +z. Cada
 * forma do lado direito (D) tem a do esquerdo (E) espelhada em x: a receita monta o lado D e o espelha com `espelha` antes de nomear
 * as partes, porque a cópia herda o nome da fonte. A TABELA está em milímetro, no quadro do esboço, e a conversão para metro acontece
 * só em `derivar`. A fuselagem não publica porta, e por isso a raiz do estabilizador (o ponto de encaixe `estX0`, `estYc0` e `estZq0`
 * do esboço) está na TABELA como o ponto do esboço, e não sai de um vínculo de medida nem de um encaixe de porta da montagem v5.
 *
 * A metade do estabilizador é a chamada da família `superficie-aerodinamica` com o perfil `estabilizador` e os parâmetros do esboço,
 * expandida aqui dentro dos PASSOS. A família gera a semi-superfície na pose dela, com a raiz na origem (o ponto do eixo de torção a
 * 25% da corda, que é o da porta `raiz`) e a envergadura em +x, e o esboço a põe com a raiz no ponto de encaixe; a receita faz o
 * mesmo com `transladar`. Da expansão fica só o `loft`, com a identidade que esta receita lhe dá, e saem a parte `fixa`, o material,
 * o sólido e o liso, porque a receita nomeia as partes depois de recortá-las, e as duas portas, que a família publica no quadro local.
 *
 * O vão do profundor é o próprio profundor engrossado pela fresta (`subtrai` com `folga` no esboço): o contorno de cada seção é
 * deslocado para fora pela fresta, com a quina em esquadria. As duas extremidades avançam a fresta em x, com o contorno prolongado
 * na reta que une as duas seções vizinhas. O profundor tem um degrau a 2236 mm, onde a dobradiça recua de z 9810 para z 9640 e a
 * ponta da superfície fica com a corda maior; a parede do degrau olha para -x e o vão a acompanha recuada a fresta em x, de modo que
 * as seções do vão no degrau ficam a uma fresta antes das do profundor.
 *
 * O profundor é um `loft` em x de quatro seções de sete pontos, como no esboço. O loft só fecha uma ponta com um polo de raio zero, e
 * o polo nasce no eixo, a `tampa.avanco` além da seção, e `moveV` o leva ao centro dela, de modo que cada ponta é um leque quase
 * plano. O eixo é uma extrusão de um círculo em x, girada em z para a reta da dobradiça, e os suportes são lofts em z de quatro
 * seções de retângulo de cantos arredondados, fechados do mesmo modo. Os suportes seguem a curva suave que o esboço passa pelas
 * quatro seções (`suporte.trechos`).
 *
 * Os contatos declarados são os que o esboço mostra, medidos pela interseção dos sólidos das formas dele. Os pontos declarados
 * (`PONTOS`) medem a caixa de cada parte contra a TABELA e a malha da família, sem passar pelos passos.
 *
 * A rodada de ajustes de 2026-10-15 muda três coisas em relação ao esboço, porque a pessoa viu a referência real: a ponta do
 * estabilizador tem cerca de metade da corda da raiz (`cordaNaPonta`), o degrau da ponta do profundor recua para perto de um quinto
 * da meia-envergadura (`profundor.x`, com a espessura das seções refeita para a corda nova) e o bordo de fuga do profundor ganha o
 * compensador, uma aba própria (`compensadorD` e `compensadorE`) num rasgo do profundor com a fresta dos dois lados e da frente, presa
 * por uma alma que entra na parede dianteira do rasgo. O compensador não tem volume no andaime nem forma no esboço e entra em `REFINA.novas`. A
 * ponta mais estreita, o degrau recuado e o eixo mais curto tiram a parte da forma do esboço sem deslocá-la, e por isso o
 * `REFINA.esboco` declara o `minimo` próprio de cada uma, com o `motivo`.
 */
import { chamar, criarRegistroDeFamilias } from '../../../../../familias/index.js';
import { expandirChamadasDeComposicao } from '../../../../../nucleo/composicoes.js';
import { nucleo } from '../../../../../nucleo/entrada.js';

const ESBOCO = '../../../../../docs/modelar/banco-de-provas/aviao-2026-10-11/esboco-r2/aviao.esboco.json';
const LADOS = [['D', 'd', 'direito'], ['E', 'e', 'esquerdo']];
const porLado = (fazer) => LADOS.flatMap(([L, l, nome]) => fazer(L, l, nome));

const VOLUMES = Object.fromEntries(porLado((L, l) => [
  [`estabilizador${L}`, `estabilizador-${l}`], [`profundor${L}`, `profundor-${l}`], [`eixoProfundor${L}`, `eixo-profundor-${l}`],
  ...[1, 2, 3].map((n) => [`suporteProfundor${n}${L}`, `suporte-profundor${n}-${l}`]),
]));
const PARTES = Object.keys(VOLUMES);
/* As partes que saem da forma do esboço de propósito sem se deslocar, com o mínimo próprio de cada uma na razão interseção/união de
   volume contra a forma do esboço (o geral é 0,95), logo abaixo do que a parte tem hoje, e o motivo. A razão cai porque a forma pedida
   é outra, e o mínimo próprio só impede que caia mais. Deslocamento e alongamento não servem: nada aqui é translação, e a parte não
   passa do volume do andaime. */
const AFASTADAS = {
  estabilizador: {
    minimo: 0.88,
    motivo: 'a ponta tem a metade da corda da raiz (606 mm, e não os 736 do esboço) e o vão do degrau recuado para 1980 muda o recorte; razão 0,891 na rodada de ajustes de 2026-10-15',
  },
  profundor: {
    minimo: 0.70,
    motivo: 'o bordo de fuga da ponta fica mais à frente com a corda de 606 mm, as seções ficam mais finas (88/41/60/51), o degrau recua de 2236 para 1980 e o bordo ganha o rasgo do compensador; razão 0,705 e 0,704',
  },
  eixoProfundor: {
    minimo: 0.85,
    motivo: 'a haste acaba 21 mm antes do degrau novo, em x 1959, 236 mm mais curta que a do esboço; até 2215 ela ficava a 3 mm da face de cima do profundor; razão 0,87',
  },
};
/* As partes que a pessoa pediu além do esboço: sem volume no andaime e sem forma no esboço, entram em `REFINA.novas`. */
const NOVAS = porLado((L) => [`compensador${L}`]);

export const TABELA = {
  /* O estabilizador: os parâmetros `est*` do esboço. `raiz` é o ponto de encaixe (`estX0`, `estYc0` e o z a 25% da corda da raiz,
     `estZq0`); `envergadura` é `estEnv` e também o `estB` em que as frações do profundor e dos suportes se medem; `subida` é o `estDY`,
     quanto a linha dos 25% da corda sobe da raiz à ponta, que o profundor, o eixo e os suportes seguem. As cordas, em milímetro, são
     as da raiz e as da ponta, e as espessuras são as relativas da família. O bordo de fuga, de onde sai o comprimento do profundor, é
     a linha dos 25% da corda mais 75% da corda de cada x (`perfilDoEstabilizador`), e na raiz dá o `estTE0` do esboço, 10289; a ponta
     do esboço tinha 736 mm (`estTE1`, 10070), e a de agora tem a metade da corda da raiz, 606 mm, com o bordo de fuga em 9972,5.
     `fresta` é a folga do vão do profundor em volta dele e também a do rasgo do compensador. */
  estabilizador: {
    raiz: [190, 2085, 9380],
    envergadura: 2200,
    cordaNaRaiz: 1212,
    cordaNaPonta: 606,
    enflechamento: 3.59,
    diedro: 7.4,
    torcao: 0,
    incidenciaNaRaiz: 0,
    espessuraNaRaiz: 0.095,
    espessuraNaPonta: 0.09,
    subida: 286,
    fresta: 12,
  },
  /* O profundor: quatro seções, nos x de `x`, cada uma com o z da dobradiça (`dobradica`, a ponta do nariz) e a espessura (`espessura`).
     O comprimento de cada seção vai da dobradiça ao bordo de fuga do estabilizador naquele x, e o centro do contorno acompanha a linha
     do estabilizador. O contorno é o de sete pontos do esboço: o nariz é o arco de 45 graus (`nariz`, em fração da espessura) e o
     bordo de fuga tem `meiaEspessuraDoBordoDeFuga` para cada lado. O degrau, onde a dobradiça recua de 9810 para 9640, estava em 2236
     no esboço, a 6% da meia-envergadura da ponta; agora está em 1980, e o trecho da ponta, de 1980 a 2390, tem 18,6% dos 2200 mm
     (a referência real mostra perto de um quinto); o suporte 3, em 1950, fica sob o fim do trecho de dentro. A espessura de
     cada seção é a do perfil do estabilizador na dobradiça, que a corda nova de 606 mm adelgaça: 41 mm no fim do trecho de dentro
     (a dobradiça a 69% da corda), 60 mm no começo do trecho da ponta (a 50%) e 51 mm na ponta, contados do perfil da raiz e
     escalados pela corda e pela espessura relativa de cada x, menos 1 mm que o esboço também tem abaixo do perfil. */
  profundor: {
    x: [190, 1980, 1994, 2385],
    dobradica: [9810, 9810, 9640, 9640],
    espessura: [88, 41, 60, 51],
    nariz: [0.1465, 0.3535],
    meiaEspessuraDoBordoDeFuga: 4,
  },
  /* O eixo é a haste de `diametro` de x `inicio` até `antesDoDegrau` antes do degrau do profundor (`profundor.x[1]`, e o esboço o
     para 21 mm antes do degrau dele, em 2215), sobre a linha do estabilizador, `aFrente` antes da dobradiça da primeira seção do
     profundor, em `lados` lados. Com o degrau em 1980 a haste acaba em 1959; se ela seguisse até 2215, passaria a 3 mm da face de
     cima do profundor na ponta, onde o trecho de lá, mais fino, a cobre por pouco. */
  eixo: { inicio: 215, antesDoDegrau: 21, aFrente: 6, diametro: 30, lados: 48 },
  /* Os suportes ficam nos x de `x`, `abaixo` da face de baixo do profundor naquele x. A espessura do profundor ali é a reta entre
     `profundor.espessura[0]` e `profundor.espessura[1]` na fração do estabilizador, como no esboço. Cada suporte é um loft em z por
     `secoes`: `recuo` é a posição em z em relação à dobradiça da primeira seção do profundor, `tamanho` é [largura em x, altura em y]
     do retângulo, `cantos` é o raio do canto e `subida` é o deslocamento do centro em y em relação à linha de baixo do profundor.
     `segmentosDoCanto` são os segmentos do arco de cada canto, os 12 que o esboço usa. O esboço declara o suporte `suave`: uma curva
     de tangente contínua passa pelas quatro seções. `trechos` diz em quantos trechos a receita divide cada vão entre duas seções (um
     número por vão, três ao todo) para o loft seguir essa curva em vez de ligar as seções por troncos retos. Com 2, 1 e 2 (as seis
     estações do esboço) o contorno de baixo da lente virava poligonal, com quebras de 4,5 a 5,7 graus a cada 90 a 120 mm entre as
     pontas; 6, 4 e 7 põem uma estação a cada 23 a 30 mm, e a quebra cai a no máximo 2 graus. O loft aceita até 1000 vértices e
     faces, e com 52 pontos por seção isso limita as estações a 18, que são os 17 trechos de 6 + 4 + 7. */
  suporte: {
    x: [600, 1300, 1950],
    abaixo: 6,
    /* A espessura do profundor que o esboço usa para pôr os suportes, na raiz e na ponta do estabilizador (`sY1` a `sY3`): a reta entre
       as duas na fração do estabilizador. Os suportes ficam onde o esboço os pôs, e por isso a espessura continua a do esboço, e não a
       das seções novas do profundor. */
    espessuraDoEsboco: [88, 49],
    secoes: [
      { recuo: -230, tamanho: [58, 26], cantos: 12, subida: 4 },
      { recuo: -90, tamanho: [64, 44], cantos: 20, subida: 0 },
      { recuo: 30, tamanho: [58, 40], cantos: 18, subida: 4 },
      { recuo: 210, tamanho: [26, 14], cantos: 6, subida: 22 },
    ],
    segmentosDoCanto: 12,
    trechos: [6, 4, 7],
  },
  /* O compensador (a divisão no bordo de fuga do profundor, a pedido da pessoa na rodada de ajustes): uma aba do bordo de fuga entre
     os x de `x`. O rasgo que a recebe sai do profundor por subtrair e tem a parede dianteira a `profundidade` mm do bordo de fuga,
     medida em z, de modo que a parede corra paralela ao bordo, e a `fresta` do estabilizador nos dois lados em x e entre a parede e
     o corpo da aba. A alma da aba, `alma` mm mais fina em cada face, atravessa essa fresta e entra `entrada` mm na parede, e é ela
     que segura a aba ao profundor. O rasgo passa `alem` mm do bordo de fuga e `acima` mm das faces, para o corte atravessar o
     profundor inteiro. Fica no trecho de dentro do profundor, de 190 a 1980. */
  compensador: { x: [200, 940], profundidade: 130, entrada: 6, alma: 5, alem: 40, acima: 20 },
  /* `avanco` é quanto o polo de cada loft fica além da seção. No profundor as duas seções de ponta entram `avanco` (em `derivar`), e o
     polo cai no x da ponta, 190 e 2385, onde o esboço acaba o profundor; nas outras formas o polo passa da seção. */
  tampa: { avanco: 0.5 },
};

const m = (mm) => mm / 1000;
const GRAUS = Math.PI / 180;
const mAll = (v) => v.map(m);

let registro = null;
const registroDeFamilias = () => { registro ??= criarRegistroDeFamilias(); return registro; };

/* O ponto da reta que passa por (xa, a) e (xb, b), em x. Serve para interpolar e para prolongar além das duas pontas. */
const naReta = (a, xa, b, xb, x) => a.map((p, k) => [
  p[0] + ((b[k][0] - p[0]) * (x - xa)) / (xb - xa),
  p[1] + ((b[k][1] - p[1]) * (x - xa)) / (xb - xa),
]);

/* O contorno de sete pontos do profundor em uma seção, [z, y] em mm, anti-horário em (z, y): o topo do nariz, o arco, a ponta do
   nariz, o arco de baixo, a base do nariz e as duas pontas do bordo de fuga. */
function contornoDoProfundor(t, s) {
  const [n1, n2] = t.profundor.nariz;
  const b = t.profundor.meiaEspessuraDoBordoDeFuga;
  return [
    [s.dobradica + 0.5 * s.T, s.yc + 0.5 * s.T],
    [s.dobradica + n1 * s.T, s.yc + n2 * s.T],
    [s.dobradica, s.yc],
    [s.dobradica + n1 * s.T, s.yc - n2 * s.T],
    [s.dobradica + 0.5 * s.T, s.yc - 0.5 * s.T],
    [s.dobradica + s.L, s.yc - b],
    [s.dobradica + s.L, s.yc + b],
  ];
}

/* O contorno deslocado `d` para fora, com a quina em esquadria: cada vértice anda `d` pela soma das normais das duas arestas, dividida
   por um mais o produto escalar delas. O contorno é anti-horário em (z, y), e a normal de fora de uma aresta (ex, ey) é (ey, -ex). */
function deslocarContorno(pontos, d) {
  const n = pontos.length;
  const normal = (a, b) => {
    const ex = b[0] - a[0]; const ey = b[1] - a[1]; const l = Math.hypot(ex, ey);
    return [ey / l, -ex / l];
  };
  return pontos.map((p, i) => {
    const antes = normal(pontos[(i + n - 1) % n], p);
    const depois = normal(p, pontos[(i + 1) % n]);
    const k = d / (1 + antes[0] * depois[0] + antes[1] * depois[1]);
    return [p[0] + k * (antes[0] + depois[0]), p[1] + k * (antes[1] + depois[1])];
  });
}

/* O retângulo de cantos arredondados centrado em (cx, cy), anti-horário em (x, y), com `segmentos` segmentos por canto: os pontos de
   cada canto a partir do de baixo à direita, de -90 a 0 graus e assim por diante. */
function retanguloArredondado([largura, altura], raio, segmentos, [cx, cy]) {
  const r = Math.min(raio, largura / 2, altura / 2);
  const cantos = [
    [largura / 2 - r, -altura / 2 + r, -90], [largura / 2 - r, altura / 2 - r, 0],
    [-largura / 2 + r, altura / 2 - r, 90], [-largura / 2 + r, -altura / 2 + r, 180],
  ];
  return cantos.flatMap(([ox, oy, a0]) => Array.from({ length: segmentos + 1 }, (_, i) => {
    const a = (a0 + (90 * i) / segmentos) * GRAUS;
    return [cx + ox + r * Math.cos(a), cy + oy + r * Math.sin(a)];
  }));
}

/* A cúbica de Hermite por trechos com a tangente de Fritsch e Carlson (a do PCHIP), a mesma que o esboço passa pelas seções de um loft
   `suave`: passa por todos os valores, tem tangente contínua neles e não passa do valor de nenhuma seção entre duas vizinhas. Devolve
   as posições e os valores nas seções e nas estações entre elas, `trechos[k]` trechos no vão k. */
function curvaSuave(posicoes, valores, trechos) {
  const n = posicoes.length;
  if (trechos.length !== n - 1) throw new Error(`suporte: ${n} seções pedem ${n - 1} números em trechos, e a TABELA traz ${trechos.length}`);
  const h = posicoes.slice(1).map((p, k) => p - posicoes[k]);
  const d = valores.slice(1).map((v, k) => (v - valores[k]) / h[k]);
  const interna = (h0, h1, d0, d1) => {
    if (d0 * d1 <= 0) return 0;
    const a = 2 * h1 + h0;
    const b = h1 + 2 * h0;
    return (a + b) / (a / d0 + b / d1);
  };
  const daPonta = (h0, h1, d0, d1) => {
    const t = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1);
    if (Math.sign(t) !== Math.sign(d0)) return 0;
    if (Math.sign(d0) !== Math.sign(d1) && Math.abs(t) > 3 * Math.abs(d0)) return 3 * d0;
    return t;
  };
  const tangente = valores.map((_, k) => {
    if (k === 0) return daPonta(h[0], h[1], d[0], d[1]);
    if (k === n - 1) return daPonta(h[n - 2], h[n - 3], d[n - 2], d[n - 3]);
    return interna(h[k - 1], h[k], d[k - 1], d[k]);
  });
  const saida = { posicoes: [], valores: [] };
  for (let k = 0; k < n - 1; k++) {
    const quantos = trechos[k];
    if (!Number.isInteger(quantos) || quantos < 1) throw new Error(`suporte: trechos[${k}] precisa ser inteiro maior ou igual a 1`);
    for (let j = 0; j < quantos; j++) {
      const t = j / quantos;
      const [h00, h10, h01, h11] = [2 * t ** 3 - 3 * t ** 2 + 1, t ** 3 - 2 * t ** 2 + t, -2 * t ** 3 + 3 * t ** 2, t ** 3 - t ** 2];
      saida.posicoes.push(posicoes[k] + t * h[k]);
      saida.valores.push(h00 * valores[k] + h10 * h[k] * tangente[k] + h01 * valores[k + 1] + h11 * h[k] * tangente[k + 1]);
    }
  }
  saida.posicoes.push(posicoes[n - 1]);
  saida.valores.push(valores[n - 1]);
  return saida;
}

/* As seções `{ pos, pontos }` com as estações a mais da curva suave: cada coordenada de cada ponto anda pela cúbica de `curvaSuave`,
   de modo que a correspondência ponto a ponto entre as seções é a de sempre. */
function densificarSecoes(secoes, trechos) {
  const posicoes = secoes.map((s) => s.pos);
  const curvas = secoes[0].pontos.map((_, i) => [0, 1].map((c) => curvaSuave(posicoes, secoes.map((s) => s.pontos[i][c]), trechos)));
  return curvas[0][0].posicoes.map((pos, j) => ({ pos, pontos: curvas.map(([a, y]) => [a.valores[j], y.valores[j]]) }));
}

/* A conta do eixo: o comprimento e o giro em z, em graus, que levam +x à direção da reta `de` a `para`. O eixo sobe com o diedro e
   fica em z constante, e por isso não há giro em y. Cada giro é em torno de `de`. */
function giroDoEixo({ de, para }) {
  const d = para.map((v, k) => v - de[k]);
  const comprimento = Math.hypot(...d);
  const u = d.map((v) => v / comprimento);
  return { comprimento, em: Math.asin(u[1]) / GRAUS, y: Math.atan2(-u[2], u[0]) / GRAUS };
}

/* Os dados do estabilizador, em mm: a altura da linha dos 25% da corda e o z do bordo de fuga em um x (a linha dos 25%, que a
   família enflecha a `enflechamento` graus a partir da raiz, mais 75% da corda daquele x), e a espessura do profundor que o esboço
   usa para os suportes naquele x (a reta entre a da raiz e a da ponta, na fração do estabilizador). */
function perfilDoEstabilizador(t) {
  const e = t.estabilizador;
  const fracao = (x) => (x - e.raiz[0]) / e.envergadura;
  const [raiz, ponta] = t.suporte.espessuraDoEsboco;
  return {
    altura: (x) => e.raiz[1] + e.subida * fracao(x),
    bordoDeFuga: (x) => e.raiz[2] + (x - e.raiz[0]) * Math.tan(e.enflechamento * GRAUS) + 0.75 * (e.cordaNaRaiz + (e.cordaNaPonta - e.cordaNaRaiz) * fracao(x)),
    espessura: (x) => raiz + (ponta - raiz) * fracao(x),
  };
}

/* Os dados do profundor, em mm: as seções (x, a dobradiça, o comprimento, a espessura, a altura do centro e o contorno) e o vão, que
   é o profundor engrossado pela fresta. */
function medidasDoProfundor(t) {
  const p = t.profundor;
  const fresta = t.estabilizador.fresta;
  const f = perfilDoEstabilizador(t);
  const estacoes = p.x.map((x, i) => {
    const s = { x, dobradica: p.dobradica[i], L: f.bordoDeFuga(x) - p.dobradica[i], T: p.espessura[i], yc: f.altura(x) };
    return { ...s, pontos: contornoDoProfundor(t, s) };
  });
  const dentro = estacoes.map((s) => deslocarContorno(s.pontos, fresta));
  const ultima = estacoes.length - 1;
  /* O vão avança a fresta em x nas duas pontas, com o contorno da reta que une as duas seções vizinhas, e recua a fresta nas seções
     do meio, onde a parede do degrau olha para -x. */
  const vao = estacoes.map((s, i) => {
    if (i === 0) return { x: s.x - fresta, pontos: naReta(dentro[0], s.x, dentro[1], estacoes[1].x, s.x - fresta) };
    if (i === ultima) return { x: s.x + fresta, pontos: naReta(dentro[i - 1], estacoes[i - 1].x, dentro[i], s.x, s.x + fresta) };
    return { x: s.x - fresta, pontos: dentro[i] };
  });
  return { estacoes: estacoes.map(({ x, pontos }) => ({ x, pontos })), vao, base: estacoes[0] };
}

/* O compensador, em mm: a aba (seções de oito pontos [z, y] nos dois x de `compensador.x`) e o cortador do rasgo (seções de quatro
   pontos nos mesmos x, afastadas a fresta para fora). O contorno do profundor em cada x é a reta entre as duas primeiras seções, e o
   compensador fica todo no trecho de dentro. A aba é o corpo, do bordo de fuga até a fresta da parede do rasgo, com as faces do
   profundor entre o fim do nariz e o bordo (a de cima do ponto 0 ao 6 do contorno, a de baixo do 4 ao 5), e a alma, mais fina em
   `alma` mm em cada face, que atravessa a fresta e entra `entrada` mm na parede, onde prende a aba ao profundor. O cortador é o
   retângulo da parede do rasgo, a `profundidade` do bordo de fuga, até `alem` além dele, com `acima` além das faces. */
function medidasDoCompensador(t, estacoes) {
  const { x: [xa, xb], profundidade, entrada, alma, alem, acima } = t.compensador;
  const fresta = t.estabilizador.fresta;
  if (xb + fresta > estacoes[1].x) throw new Error(`compensador: o rasgo vai a x ${xb + fresta}, e o trecho de dentro do profundor acaba em ${estacoes[1].x}`);
  const contornoEm = (x) => naReta(estacoes[0].pontos, estacoes[0].x, estacoes[1].pontos, estacoes[1].x, x);
  const naFace = ([z0, y0], [z1, y1], z) => y0 + ((y1 - y0) * (z - z0)) / (z1 - z0);
  const aba = [xa, xb].map((x) => {
    const c = contornoEm(x);
    const zAlma = c[5][0] - profundidade - entrada;
    const zCorpo = c[5][0] - profundidade + fresta;
    const cima = (z) => naFace(c[0], c[6], z);
    const baixo = (z) => naFace(c[4], c[5], z);
    return {
      x,
      pontos: [[zAlma, cima(zAlma) - alma], [zAlma, baixo(zAlma) + alma], [zCorpo, baixo(zCorpo) + alma], [zCorpo, baixo(zCorpo)], c[5], c[6], [zCorpo, cima(zCorpo)], [zCorpo, cima(zCorpo) - alma]],
    };
  });
  const cortador = [xa - fresta, xb + fresta].map((x) => {
    const c = contornoEm(x);
    const zf = c[5][0] - profundidade;
    const zr = c[5][0] + alem;
    const yc = c[0][1] + acima;
    const yb = c[4][1] - acima;
    return { x, pontos: [[zf, yc], [zf, yb], [zr, yb], [zr, yc]] };
  });
  return { aba, cortador };
}

/* A haste do eixo e as seções de cada suporte, em mm. */
function medidasDoEixoEDosSuportes(t, base) {
  const f = perfilDoEstabilizador(t);
  const x0 = t.eixo.inicio;
  const x1 = t.profundor.x[1] - t.eixo.antesDoDegrau;
  const z = base.dobradica - t.eixo.aFrente;
  const eixo = { de: [x0, f.altura(x0), z], para: [x1, f.altura(x1), z] };
  const suportes = t.suporte.x.map((x) => {
    const y = f.altura(x) - 0.5 * f.espessura(x) - t.suporte.abaixo;
    return densificarSecoes(t.suporte.secoes.map((s) => ({
      pos: base.dobradica + s.recuo,
      pontos: retanguloArredondado(s.tamanho, s.cantos, t.suporte.segmentosDoCanto, [x, y + s.subida]),
    })), t.suporte.trechos);
  });
  return { eixo, suportes };
}

export function derivar(t = TABELA) {
  const e = t.estabilizador;
  const familia = registroDeFamilias().obter('superficie-aerodinamica');

  /* A chamada da família, com os parâmetros do esboço. */
  const chamada = chamar(familia, 'estabilizador', {
    perfil: 'estabilizador', simetria: 0, envergadura: e.envergadura, cordaNaRaiz: e.cordaNaRaiz / e.envergadura, cordaNaPonta: e.cordaNaPonta / e.envergadura,
    enflechamento: e.enflechamento, diedro: e.diedro, torcao: e.torcao, incidenciaNaRaiz: e.incidenciaNaRaiz,
    espessuraNaRaiz: e.espessuraNaRaiz, espessuraNaPonta: e.espessuraNaPonta, pontaLevantada: 0, comando: 0, comandoDiferencial: 0,
  });

  const profundor = medidasDoProfundor(t);
  const { eixo, suportes } = medidasDoEixoEDosSuportes(t, profundor.base);
  const compensador = medidasDoCompensador(t, profundor.estacoes);
  const giro = giroDoEixo(eixo);
  const pontosM = (s) => s.pontos.map(mAll);

  return {
    estabilizador: { chamada, desloca: mAll(e.raiz) },
    profundor: { estacoes: profundor.estacoes.map((s, i, todas) => ({ pos: m(s.x + (i === 0 ? t.tampa.avanco : 0) - (i === todas.length - 1 ? t.tampa.avanco : 0)), pontos: pontosM(s) })), vao: profundor.vao.map((s) => ({ pos: m(s.x), pontos: pontosM(s) })) },
    eixo: {
      de: mAll(eixo.de), comprimento: m(giro.comprimento), raio: m(t.eixo.diametro / 2), segmentos: t.eixo.lados / 4, giroEmZ: giro.em, giroEmY: giro.y,
    },
    suportes: suportes.map((secoes) => secoes.map((s) => ({ pos: m(s.pos), pontos: pontosM(s) }))),
    compensador: { aba: compensador.aba.map((s) => ({ pos: m(s.x), pontos: pontosM(s) })), cortador: compensador.cortador.map((s) => ({ pos: m(s.x), pontos: pontosM(s) })) },
    avanco: m(t.tampa.avanco),
  };
}

/* Para o eixo do loft em x: o plano da seção é y e z, o sinal que leva z ao +w do núcleo é -1, e a `orientacao` fixa o +u em y. Para o
   eixo em z: o plano é y e x, o sinal que leva x ao +w é +1, e a `orientacao` também fixa o +u em y. Com ela declarada o núcleo
   projeta a referência na tangente de cada seção, e u e w saem iguais em todas. */
const LOFT_EM = {
  x: { sinalW: -1, orientacao: [0, 1, 0], noEixo: (pos, y, a) => [pos, y, a], deslocamento: (a, y) => [0, y, a] },
  z: { sinalW: 1, orientacao: [0, 1, 0], noEixo: (pos, y, a) => [a, y, pos], deslocamento: (a, y) => [a, y, 0] },
};

/* A área com sinal pelo cadarço, sobre os dois primeiros números de cada ponto; o núcleo só aceita contorno anti-horário. */
function areaDoContorno(pontos) {
  let soma = 0;
  for (let i = 0; i < pontos.length; i++) {
    const a = pontos[i];
    const b = pontos[(i + 1) % pontos.length];
    soma += a[0] * b[1] - b[0] * a[1];
  }
  return soma / 2;
}

/* Um loft por seções, em metro: `eixo` é x ou z, e `estacoes` são `{ pos, pontos }` com a posição da seção no eixo e os pontos
   [a, y] no mundo, em que a é z no loft em x e x no loft em z. O caminho é a reta paralela ao eixo pelo centro da primeira seção, e o
   centro de cada contorno entra nos pontos, para as seções ficarem no plano de posição constante. Devolve as seções, com um polo de
   raio zero antes da primeira e depois da última, os `lados`, a `orientacao` e, para cada polo, a região que o seleciona e o
   deslocamento que o leva ao centro da seção de que ele fecha a ponta. */
function loftPorSecoes(eixo, estacoes, avanco) {
  const { sinalW, orientacao, noEixo, deslocamento } = LOFT_EM[eixo];
  const media = (pontos, k) => pontos.reduce((soma, p) => soma + p[k], 0) / pontos.length;
  const a0 = media(estacoes[0].pontos, 0);
  const y0 = media(estacoes[0].pontos, 1);
  const secoes = estacoes.map(({ pos, pontos }) => {
    const contorno = pontos.map(([a, y]) => [y - y0, sinalW * (a - a0)]);
    return { pos: noEixo(pos, y0, a0), contorno: areaDoContorno(contorno) < 0 ? contorno.reverse() : contorno };
  });
  const polo = (estacao, sentido) => {
    const pos = noEixo(estacao.pos + sentido * avanco, y0, a0);
    const folga = avanco / 4;
    return { pos, d: deslocamento(media(estacao.pontos, 0) - a0, media(estacao.pontos, 1) - y0), regiao: { min: pos.map((v) => v - folga), max: pos.map((v) => v + folga) } };
  };
  const polos = [polo(estacoes[0], -1), polo(estacoes[estacoes.length - 1], 1)];
  return {
    secoes: [{ pos: polos[0].pos, raio: 0 }, ...secoes, { pos: polos[1].pos, raio: 0 }],
    lados: secoes[0].contorno.length,
    orientacao,
    polos,
  };
}

/* Identidade estrutural dos passos, escolhida aqui: um bloco por forma, e dentro dele uma identidade por passo. A cópia espelhada
   (`espelha`) leva a identidade da fonte mais `ESPELHO`. */
const ID = {
  estabilizador: 100, cortadorDoProfundor: 110, estabilizadorRecortado: 120,
  profundor: 200, cortadorDoCompensador: 210, profundorRecortado: 211, eixoProfundor: 220,
  suporteProfundor1: 230, suporteProfundor2: 231, suporteProfundor3: 232, compensador: 240,
};
const ESPELHO = 500;

export const MATERIAIS = {
  superficie: { cor: '#9fb0c0', metalicidade: 0.3, aspereza: 0.45 },
  eixo: { cor: '#2b3138', metalicidade: 0.4, aspereza: 0.4 },
  suporte: { cor: '#5f6b78', metalicidade: 0.3, aspereza: 0.5 },
};

/* O ângulo, em graus, a partir do qual a quina fica nítida no sombreado liso: o da família, de 60 graus, que deixa lisos o nariz do
   profundor e os cantos do suporte (menos de 25 graus por segmento) e nítidos o bordo de fuga, as tampas e as paredes do vão. */
const ANGULO_LISO = 60;

export function gerarPassos(t = TABELA) {
  const P = derivar(t);
  const passos = [];
  const doPasso = (op, id) => ({ origem: { op, id } });

  /* A expansão da família: só o `loft`, com a identidade desta receita. */
  const daFamilia = ({ chamada }, origemId) => {
    const { passos: expandidos } = expandirChamadasDeComposicao(registroDeFamilias().registroComposicoes, [chamada]);
    const [, argumentos] = expandidos.find(([operacao]) => operacao === 'loft');
    return ['loft', { ...argumentos, origemId }];
  };
  const loft = (origemId, L) => {
    passos.push(['loft', { origemId, secoes: L.secoes, lados: L.lados, orientacao: L.orientacao }]);
    for (const polo of L.polos) passos.push(['moveV', { sel: { regiao: polo.regiao }, d: polo.d }]);
  };

  /* O estabilizador do lado direito, na pose do esboço, e o vão do profundor. */
  passos.push(daFamilia(P.estabilizador, ID.estabilizador));
  passos.push(['transladar', { d: P.estabilizador.desloca, sel: doPasso('loft', ID.estabilizador) }]);
  loft(ID.cortadorDoProfundor, loftPorSecoes('x', P.profundor.vao, P.avanco));

  /* O estabilizador menos o vão. */
  passos.push(['subtrair', {
    origemId: ID.estabilizadorRecortado,
    solidos: [doPasso('loft', ID.estabilizador), doPasso('loft', ID.cortadorDoProfundor)],
  }]);

  /* O profundor, menos o rasgo do compensador, e a aba do compensador no rasgo. */
  loft(ID.profundor, loftPorSecoes('x', P.profundor.estacoes, P.avanco));
  loft(ID.cortadorDoCompensador, loftPorSecoes('x', P.compensador.cortador, P.avanco));
  passos.push(['subtrair', {
    origemId: ID.profundorRecortado,
    solidos: [doPasso('loft', ID.profundor), doPasso('loft', ID.cortadorDoCompensador)],
  }]);
  loft(ID.compensador, loftPorSecoes('x', P.compensador.aba, P.avanco));

  /* O eixo e os suportes do lado direito. */
  const e = P.eixo;
  passos.push(['extrusao', { origemId: ID.eixoProfundor, eixo: 'x', altura: e.comprimento, perfil: { circulo: { raio: e.raio } }, segmentosArco: e.segmentos, em: e.de }]);
  passos.push(['rotaciona', { eixo: 'z', graus: e.giroEmZ, pivo: e.de, sel: doPasso('extrusao', ID.eixoProfundor) }]);
  if (e.giroEmY !== 0) passos.push(['rotaciona', { eixo: 'y', graus: e.giroEmY, pivo: e.de, sel: doPasso('extrusao', ID.eixoProfundor) }]);
  P.suportes.forEach((secoes, k) => loft(ID[`suporteProfundor${k + 1}`], loftPorSecoes('z', secoes, P.avanco)));

  /* Cada forma do lado direito: a cópia espelhada em x e os quatro passos que a nomeiam, com o material, o sólido e o liso. */
  const formas = [
    ['estabilizador', doPasso('subtrair', ID.estabilizadorRecortado), 'superficie'],
    ['profundor', doPasso('subtrair', ID.profundorRecortado), 'superficie'],
    ['compensador', doPasso('loft', ID.compensador), 'superficie'],
    ['eixoProfundor', doPasso('extrusao', ID.eixoProfundor), 'eixo'],
    ...[1, 2, 3].map((n) => [`suporteProfundor${n}`, doPasso('loft', ID[`suporteProfundor${n}`]), 'suporte']),
  ];
  for (const [nome, { origem }, material] of formas) {
    const copia = { op: 'espelha', id: origem.id + ESPELHO, de: origem };
    passos.push(['espelha', { eixo: 'x', pos: 0, origemId: copia.id, derivaDe: origem, sel: { origem } }]);
    for (const [sufixo, sel] of [['D', { origem }], ['E', { origem: copia }]]) {
      passos.push(['parte', { nome: `${nome}${sufixo}`, sel }]);
      passos.push(['material', { usa: material, sel }]);
      passos.push(['solido', { sel }]);
      passos.push(['liso', { angulo: ANGULO_LISO, sel }]);
    }
  }

  return passos;
}

const caixaDosPontos = (pontos) => ({
  min: [0, 1, 2].map((k) => Math.min(...pontos.map((p) => p[k]))),
  max: [0, 1, 2].map((k) => Math.max(...pontos.map((p) => p[k]))),
});

/* A caixa da superfície da família na pose do esboço, em milímetro, antes do vão: a malha da família executada sozinha e deslocada
   pela raiz. */
function caixaDaFamilia(t) {
  const { chamada, desloca } = derivar(t).estabilizador;
  const { passos } = expandirChamadasDeComposicao(registroDeFamilias().registroComposicoes, [chamada]);
  const { V } = nucleo(passos.filter(([operacao]) => operacao === 'loft'), {}, {}, {}, null, []);
  return caixaDosPontos([...V.values()].map((v) => v.map((c, k) => (c + desloca[k]) * 1000)));
}

/* A caixa de cada parte do lado direito, exceto o estabilizador, em milímetro, calculada da TABELA sem passar pelos passos: a do
   profundor, a dos contornos e do avanço dos polos, com o bordo de fuga mais alto em z depois do rasgo do compensador (o do x da
   parede de fora do rasgo, porque o bordo recua para fora); a da aba do compensador, a das duas seções e do avanço dos polos; a do eixo, a das duas tampas (um disco de raio `r` perpendicular à reta tem, em
   cada eixo, a extensão `r * sqrt(1 - d²)`); a dos suportes, a das seções (a curva suave não passa do valor de nenhuma seção). */
function caixasDoLadoDireito(t) {
  const avanco = t.tampa.avanco;
  const profundor = medidasDoProfundor(t);
  const { eixo, suportes } = medidasDoEixoEDosSuportes(t, profundor.base);
  const caixas = {};

  const doProfundor = caixaDosPontos(profundor.estacoes.flatMap(({ x, pontos }) => pontos.map(([z, y]) => [x, y, z])));
  /* O profundor não passa dos x da TABELA: as duas seções de ponta entram `avanco` e o polo de cada tampa cai no x da ponta. */
  const { aba, cortador } = medidasDoCompensador(t, profundor.estacoes);
  doProfundor.max[2] = perfilDoEstabilizador(t).bordoDeFuga(cortador[1].x);
  caixas.profundor = doProfundor;
  caixas.compensador = caixaDosPontos(aba.flatMap(({ x, pontos }) => pontos.map(([z, y]) => [x, y, z])));
  caixas.compensador.min[0] -= avanco;
  caixas.compensador.max[0] += avanco;

  const comprimento = Math.hypot(...eixo.para.map((v, k) => v - eixo.de[k]));
  const raio = t.eixo.diametro / 2;
  const folga = eixo.para.map((v, k) => raio * Math.sqrt(1 - ((v - eixo.de[k]) / comprimento) ** 2));
  const extremos = caixaDosPontos([eixo.de, eixo.para]);
  caixas.eixoProfundor = { min: extremos.min.map((v, k) => v - folga[k]), max: extremos.max.map((v, k) => v + folga[k]) };

  suportes.forEach((secoes, k) => {
    const caixa = caixaDosPontos(secoes.flatMap(({ pos, pontos }) => pontos.map(([x, y]) => [x, y, pos])));
    caixa.min[2] -= avanco;
    caixa.max[2] += avanco;
    caixas[`suporteProfundor${k + 1}`] = caixa;
  });
  return caixas;
}

/* Os pontos declarados, em milímetro: o mínimo e o máximo da caixa de cada parte, do lado direito e do esquerdo (o espelho em x). Do
   estabilizador só o mínimo, que é o da malha da família antes do vão (o vão só tira material de trás da dobradiça), com o x de
   fora vindo do máximo dela em x. O máximo dele em y e em z sai do corte do vão, que a conferência contra a forma do esboço mede. */
export function pontosDeclarados(t = TABELA) {
  const tolerancia = 1;
  const familia = caixaDaFamilia(t);
  const pontos = [
    { nome: 'estabilizadorD, o mínimo da caixa', parte: 'estabilizadorD', medida: 'minimo', em: familia.min, toleranciaMm: tolerancia },
    { nome: 'estabilizadorE, o mínimo da caixa', parte: 'estabilizadorE', medida: 'minimo', em: [-familia.max[0], familia.min[1], familia.min[2]], toleranciaMm: tolerancia },
  ];
  for (const [nome, { min, max }] of Object.entries(caixasDoLadoDireito(t))) {
    pontos.push(
      { nome: `${nome}D, o mínimo da caixa`, parte: `${nome}D`, medida: 'minimo', em: min, toleranciaMm: tolerancia },
      { nome: `${nome}D, o máximo da caixa`, parte: `${nome}D`, medida: 'maximo', em: max, toleranciaMm: tolerancia },
      { nome: `${nome}E, o mínimo da caixa`, parte: `${nome}E`, medida: 'minimo', em: [-max[0], min[1], min[2]], toleranciaMm: tolerancia },
      { nome: `${nome}E, o máximo da caixa`, parte: `${nome}E`, medida: 'maximo', em: [-min[0], max[1], max[2]], toleranciaMm: tolerancia },
    );
  }
  return pontos;
}

const receita = {
  meta: { nome: 'aviao/empenagem-horizontal', desc: 'empenagem horizontal do avião de pequeno porte: o estabilizador, os profundores, os eixos e os suportes' },
  PARAMS: TABELA,
  MATERIAIS,
  TOPO: { origem: 'a proa do avião em z 0; y para cima com o chão em y 0; x para a direita do piloto; o estabilizador na cauda, de z 9077 a z 10289' },
  PLANO: {
    objeto: 'empenagem horizontal de um avião monomotor de pequeno porte: as duas metades do estabilizador na cauda, cada uma com o profundor no bordo de fuga, o eixo dele e três suportes',
    referencias: [
      'docs/modelar/banco-de-provas/aviao-2026-10-11/referencias/topo.png',
      'docs/modelar/banco-de-provas/aviao-2026-10-11/referencias/topo.prancha.png',
      'docs/modelar/banco-de-provas/aviao-2026-10-11/referencias/frontal.png',
    ],
    escala: { medida: 'envergadura do estabilizador no esboço, de ponta a ponta', milimetros: 4780 },
    partes: porLado((L, l, nome) => [
      {
        nome: `estabilizador${L}`,
        forma: `metade ${nome} do estabilizador, da raiz junto à cauda até a ponta, com enflechamento e diedro, perfil de 9,5% afinando para a ponta, que tem cerca de metade da corda da raiz, e o vão do profundor recortado`,
        tecnica: 'a superfície da família superficie-aerodinamica, perfil estabilizador, com os parâmetros do esboço, expandida nos PASSOS e recortada por subtrair',
      },
      {
        nome: `profundor${L}`,
        forma: `profundor ${nome}, superfície do bordo de fuga do estabilizador, no vão dele com a fresta do esboço em volta, com o degrau da ponta a perto de um quinto da meia-envergadura e o rasgo do compensador no bordo de fuga`,
        tecnica: 'loft das seções do esboço, com as pontas fechadas e sombreado liso, e o rasgo do compensador por subtrair',
      },
      {
        nome: `compensador${L}`,
        forma: `compensador do profundor ${nome}, aba de corda constante no bordo de fuga do profundor, separada dele por fresta nos dois lados e na frente e presa por uma alma que entra na parede do rasgo`,
        tecnica: 'loft de duas seções de oito pontos tiradas do contorno do profundor, no rasgo que o profundor recebe por subtrair',
      },
      { nome: `eixoProfundor${L}`, forma: `eixo do profundor ${nome}, haste ao longo da dobradiça`, tecnica: 'cilindro entre as duas pontas da dobradiça do esboço' },
      ...[1, 2, 3].map((n) => ({ nome: `suporteProfundor${n}${L}`, forma: `suporte ${n} do profundor ${nome}, peça fina sob o estabilizador que segura o eixo`, tecnica: 'loft das seções do esboço' })),
    ]),
    criteriosDeReprovacao: [
      'estabilizador reto, sem o enflechamento, o diedro ou o afinamento do esboço',
      'profundor fora do vão, sem a fresta, ou atravessando o estabilizador',
      'eixo ou suporte solto, que não segura o profundor',
      'vão do profundor sem recorte no estabilizador',
      'ponta do estabilizador com bem mais que a metade da corda da raiz',
      'degrau da ponta do profundor a menos de um sexto da meia-envergadura da ponta',
      'bordo de fuga do profundor sem a divisão do compensador, ou compensador solto do profundor',
      'o REFINA acusando parte fora do envelope do volume dela ou abaixo do mínimo contra a forma do esboço',
    ],
  },
  /* Os contatos que o esboço mostra, medidos pela interseção dos sólidos das formas dele: o eixo entra no estabilizador (a parede
     dianteira do vão, 9 mm adiante do nariz do profundor) e no profundor, os três suportes entram no estabilizador e, pela ponta de
     trás, na face de baixo do profundor, e o eixo toca só o suporte 3 (4 mm), porque os suportes 1 e 2 ficam abaixo da haste. O
     estabilizador e o profundor não se tocam, pela fresta. */
  contatos: porLado((L, l, nome) => [
    { par: [`eixoProfundor${L}`, `profundor${L}`], motivo: `o eixo corre na dobradiça do profundor ${nome}` },
    { par: [`compensador${L}`, `profundor${L}`], motivo: `a alma do compensador entra na parede dianteira do rasgo do profundor ${nome}, que o segura` },
    { par: [`eixoProfundor${L}`, `estabilizador${L}`], motivo: `o eixo do profundor ${nome} entra na parede dianteira do vão do estabilizador, ao longo da haste` },
    { par: [`eixoProfundor${L}`, `suporteProfundor3${L}`], motivo: `o suporte 3 sobe até a haste do eixo do profundor ${nome}; os suportes 1 e 2 ficam abaixo dela` },
    ...[1, 2, 3].flatMap((n) => [
      { par: [`suporteProfundor${n}${L}`, `estabilizador${L}`], motivo: `o suporte ${n} sai do estabilizador ${nome}` },
      { par: [`suporteProfundor${n}${L}`, `profundor${L}`], motivo: `o suporte ${n} termina sob o profundor ${nome} e entra na face de baixo dele` },
    ]),
  ]),
  formas: Object.fromEntries([...PARTES, ...NOVAS].map((p) => [p, 'solido'])),
  REFINA: {
    andaime: '../../andaime.json',
    partes: VOLUMES,
    tolerancia: { envelope: 5, porta: 0.5 },
    esboco: { arquivo: ESBOCO, opcao: 1, formas: Object.fromEntries(PARTES.map((p) => [p, p.replace(/[DE]$/, '') in AFASTADAS ? { formas: p, ...AFASTADAS[p.replace(/[DE]$/, '')] } : p])), minimo: 0.95 },
    novas: Object.fromEntries(NOVAS.map((p) => [p, 'a pessoa pediu na rodada de ajustes de 2026-10-15 a divisão no bordo de fuga do profundor, que a referência real mostra e o esboço não tem'])),
  },
  get PONTOS() { return pontosDeclarados(this.PARAMS); },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
