/* empilhadeira/protetor — o protetor do operador da empilhadeira: as quatro colunas, o quadro do teto com as travessas, a grade do teto,
 * as luzes de trabalho, o espelho e as lanternas do alto, numa peça rígida.
 *
 * Etapa da montagem `../../montagem.json` depois das peças da torre (fatia 5 do plano `docs/modelar/planos/2026-11-09-empilhadeira.md`,
 * item 5 das partes do `../../ALINHAMENTO.md`). A forma é a do rascunho que a pessoa aprovou por imagem em 2026-11-10
 * (`../../referencias/protetor-posto.esboco.mjs`), levada para cá sem mudança de medida; o rascunho passou a chamar `montarProtetor`
 * daqui, de modo que a geometria tem uma fonte só. A alça de acesso, presa atrás da coluna da frente, fica no rascunho: o plano a põe
 * na fatia 7, com os acessórios.
 *
 * DE ONDE VEM CADA MEDIDA (do rascunho, que as tirou das vistas; as contas de cada número estão no cabeçalho dele). A lateral de
 * `lateral.contornos.json` entra na escala da carcaça pela calibração `lateral` da TABELA, em px da imagem dela: z = -(px - 349,8) x
 * 4,2955 + 194,1 e y = (493,6 - py) x 4,2955 + 183,9. A coluna da frente sai da borda da frente dela na lateral, uma reta de 14,5 graus
 * para trás, com o eixo 36 mm atrás da borda; o topo do quadro a 2.135 (a ficha dá 2.150 de altura com as lanternas); o teto com 480
 * mm de meia largura por fora e 55 de perfil (a ficha dá 960 de largura); a coluna de trás, uma chapa larga de lado que se afina para
 * cima, pela lateral; as larguras pela vista de trás e pela de frente.
 *
 * O ENCAIXE. A origem é a da máquina: o chão sob o centro do eixo dianteiro, no meio da largura; y para cima, +x à esquerda de quem
 * dirige e a frente em +z. Os pés da frente assentam na face de cima da aba do paralama da carcaça, no recolhimento dos cantos do
 * painel, e os de trás na face de cima das colunas da carcaça. A montagem v5 não mede plano sobre plano: ela põe o protetor pela
 * porta `peTrasEsquerdo` na porta `apoioDoProtetorTrasEsquerdo` da carcaça, e os outros três pés vão pela mesma pose rígida.
 *
 * A cadeia: a TABELA em mm; `derivar` calcula os perfis, o trilho da coluna da frente e as portas em mm; `montarProtetor` escreve os
 * passos em mm num estado { passos, topo, origem } (o mesmo que o rascunho da máquina usa); `gerarPassos` converte para metro com
 * `m()`, campo de medida a campo de medida, num lugar só, e `gerarTopo` os pontos nomeados da gaiola da coluna da frente. */
import { TABELA as CARCACA, apoiosDoProtetor } from '../carcaca/receita.js';
import { ferramentas } from '../carcaca/receita/ferramentas.js';
import { gaiolaVarrida } from '../../../../nucleo/gaiola-varrida.js';

export const TABELA = {
  /* As cores do rascunho: o cinza das colunas da carcaça, o escuro dos fundos e o vermelho das lanternas. */
  cores: { aco: CARCACA.cores.cinza, escuro: CARCACA.cores.escuro, vermelho: '#c0302a' },
  /* A lateral da máquina inteira levada à carcaça: o px da imagem em mm, z para a frente e y para cima. */
  lateral: { mmPorPx: 4.2955, z: { px: 349.8, mm: 194.1 }, y: { px: 493.6, mm: 183.9 } },

  /* A COLUNA DA FRENTE, um tubo de 55 mm em x por 70 de lado, de quinas vivas. A borda da frente dela na lateral passa por [z, y]
     (-12,9, 800,7) e (-279,2, 1.831,6), px 398 na linha 350 e px 460 na linha 110; o eixo fica 36 mm atrás da borda. De frente o pé vai
     de 455 a 512 mm em y 768, e o tubo se inclina para dentro até o meio do teto em y 1.990, segue no plano do teto até a dobra de raio
     60 e corre no alto até z -1.300. Estações a cada 50 mm nas retas e dez na dobra. O pé nasce 20 mm abaixo do apoio na aba do
     paralama, na mesma reta, e o plano da face de cima da aba o corta: no rascunho o fim do tubo, perpendicular a ele, entrava na aba
     atrás e ficava acima dela na frente. A gaiola vai sem nível de subdivisão (no rascunho, 2): com as quinas vivas a seção já é o
     retângulo e a dobra já segue o arco pelas dez estações, e subdividida ela punha três vértices no meio de cada lado da face do
     corte do pé, que nenhum leque nem orelha da triangulação serve (o OBJ da luz rasante a recusa). */
  coluna: {
    borda: [[-12.9, 800.7], [-279.2, 1831.6]],
    recuoDoEixo: 36,
    secao: { x: 55, lado: 70 },
    pe: { abaixoDoApoio: 20, larguraEm: 768, x: [455, 512] },
    juntaY: 1990,
    raioDaDobra: 60,
    fimNoAlto: -1300,
    estacoes: { passo: 50, naDobra: 10 },
    niveis: 0,
  },

  /* O TETO. O topo do quadro a 2.135 (lateral, linha 39,5), o eixo do perfil 45 mm abaixo dele, as travessas de 70 mm de altura, o
     fim de trás na face de trás da travessa de trás em z -1.425 e a meia largura do perfil de 425 a 480, a do tubo da coluna da frente;
     o perfil extrudado sai 1 mm além do tubo de cada lado, porque rente a ele as faces das duas se cruzavam no mesmo plano e a face de
     baixo da travessa da frente ficava com vértices em fila dos dois lados, de triângulo sem área. O perfil de lado, da dobra
     até a coluna de trás, pelo contorno da lateral em px: a borda de baixo com a quina de dentro da frente em arco, e o topo com o
     canto de fora redondo, de px 523 a 8 mm do topo a 537 no topo. O arco de dentro, que na lateral acaba no px 499 (y 1.826) 98 mm
     atrás da coluna, troca os dois últimos pontos por uma curva (Bézier cúbica, `concordancia`) que sai na direção do arco e chega à
     face de trás da coluna da frente em y 1.790, na direção dela e 5 mm dentro do tubo, sempre acima do espelho (y 1.800 atrás de z
     -385): no rascunho ele voltava à coluna por um corte reto em y 1.826, o toco sob a dobra. */
  teto: {
    topo: 2135, alturaDoPerfil: 70, eixoAbaixoDoTopo: 45, tras: -1425, x: [425, 480],
    perfil: {
      baixo: [[678, 80], [578, 81], [533, 84], [525, 87], [519, 90], [514, 93], [511, 96], [504, 102], [499, 111]],
      concordancia: { trocaOsUltimos: 2, ate: 1790, dentroDoTubo: 5, alca: [40, 40], pontos: 10 },
      alemDoTubo: 1,
      frente: [[478, 75], [486, 60], [490, 50], [503, 45]],
      canto: { px: 523, abaixoDoTopo: 8 },
      topo: [537, 678],
    },
    /* as travessas: a da frente sobre a dobra, de 80 a 5 mm atrás do eixo dela, e a de trás, de 75 mm, que leva as lanternas; 1 mm
       além da face de dentro do perfil */
    travessas: { frente: [80, 5], tras: 75, alem: 1 },
  },

  /* A COLUNA DE TRÁS, chapa larga de lado que se afina para cima, pela lateral em px: a borda de trás (px 741 a 722) e a da frente
     (px 678 a 690), o canto de cima e de trás redondo de 40 mm e o topo até z -1.215. O pé, de z -1.272 a -1.505, desce a 1.138 e o
     plano da face de cima das colunas da carcaça o corta (no rascunho ele entrava de 3 a 16 mm nelas); de trás, ela vai do apoio na
     borda das colunas (de 460 a 516 mm, `apoiosDoProtetor` da carcaça) à largura do teto em y 1.990 (`teto.x`), e a seção de trás
     sobe 5 mm acima do topo. A silhueta vai em x de 380 a 600 e a seção em z de -1.600 a -1.100, cruzadas. */
  colunaTras: {
    pe: { z: [-1272, -1505], y: 1138 },
    tras: [[741, 200], [732, 140], [726, 95], [722, 65]],
    canto: 40,
    topoAte: -1215,
    frente: [[678, 95], [681, 140], [689, 200], [690, 260]],
    secao: { y: 1120, sobreOTopo: 5 },
    silhuetaEmX: [380, 600],
    secaoEmZ: [-1600, -1100],
  },

  /* A GRADE DO TETO: seis barras ao comprido a 60, 180 e 300 mm do centro, de 30 mm, e duas atravessadas em z -814 e -969, de 2.095 a
     2.130 mm (40 a 5 abaixo do topo), apoiadas nas travessas: de 75 mm atrás do eixo da dobra a 70 mm à frente do fim de trás. */
  grade: { barras: [60, 180, 300], largura: 30, atravessadas: [-814, -969], abaixoDoTopo: [40, 5], frente: 75, tras: 70 },

  /* AS LUZES DE TRABALHO: na lateral, z -181 a -288 e y 1.745 a 1.943, à frente da coluna; uma caixa de 90 mm de lado de 1.750 a 1.940,
     com a face de trás 3 mm dentro da face da frente da coluna (inclinada como ela), de 445 a 530 mm. */
  luzes: { y: [1750, 1940], dentroDaColuna: 3, fundo: 90, x: [445, 530] },

  /* AS LANTERNAS DO ALTO, na face de trás da travessa de trás: de 18 mm atrás a 2 mm dentro dela, de 60 a 5 mm abaixo do topo, de 205
     a 410 mm do centro. */
  lanternas: { z: [-18, 2], abaixoDoTopo: [60, 5], x: [205, 410] },

  /* O ESPELHO, do lado esquerdo (+x): o vidro de z -455 a -385, y 1.640 a 1.800 e x 356 a 426, e o braço de z -395 até 66 mm atrás da
     borda da frente da coluna em y 1.720, de y 1.705 a 1.730 e x 400 a 440. */
  espelho: { z: [-455, -385], y: [1640, 1800], x: [356, 426], braco: { z: -395, atras: 66, em: 1720, y: [1705, 1730], x: [400, 440] } },

  /* OS CORTES DOS PÉS pelo plano do apoio: o bloco que tira o que fica abaixo da face de cima da aba e das colunas, ao longo da aresta
     de cima delas (a mesma da carcaça), 150 mm de fundo, e 30 mm além do pé de cada lado em x. */
  corteDosPes: { fundo: 150, alem: 30 },
};

const m = (mm) => mm / 1000;
const retangulo = (u0, v0, u1, v1) => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
const espelhoX = (xy) => xy.map(([x, y]) => [-x, y]);

/** Os perfis, o trilho da coluna da frente e as portas, em mm, no referencial da máquina. */
export function derivar(T = TABELA) {
  const L = T.lateral;
  const ZL = (px) => -(px - L.z.px) * L.mmPorPx + L.z.mm;
  const YL = (py) => (L.y.px - py) * L.mmPorPx + L.y.mm;
  const C = T.coluna; const TE = T.teto; const CT = T.colunaTras;
  const APOIOS = apoiosDoProtetor(CARCACA);
  const yPe = APOIOS.frenteEsquerdo.ponto[1] - C.pe.abaixoDoApoio;
  const [[zb0, yb0], [zb1, yb1]] = C.borda;
  const INCL = (zb1 - zb0) / (yb1 - yb0);                       // dz/dy da coluna da frente: -0,258
  const zFrente = (y) => zb0 + INCL * (y - yb0);                // a borda da frente da coluna da frente
  const zEixoFrente = (y) => zFrente(y) - C.recuoDoEixo;
  const TOPO = TE.topo; const Y_TETO = TOPO - TE.eixoAbaixoDoTopo;

  /* o trilho da coluna da frente, do lado s (1 é +x), e o comprimento até o começo e o fim da dobra */
  function trilhoDaColunaFrente(s) {
    const r = C.raioDaDobra;
    const yLarg = C.pe.larguraEm;
    const meio = (y) => { const f = (y - yLarg) / (C.juntaY - yLarg); return ((C.pe.x[0] + C.pe.x[1]) * (1 - f) + (TE.x[0] + TE.x[1]) * f) / 2; };
    const x = s * (TE.x[0] + TE.x[1]) / 2;
    const B = [zEixoFrente(Y_TETO), Y_TETO]; const Cc = [C.fimNoAlto, Y_TETO];
    const u1 = [B[0] - zEixoFrente(yPe), B[1] - yPe]; const l1 = Math.hypot(...u1); u1[0] /= l1; u1[1] /= l1;
    const u2 = [Cc[0] - B[0], Cc[1] - B[1]]; const l2 = Math.hypot(...u2); u2[0] /= l2; u2[1] /= l2;
    const giro = Math.atan2(u1[0] * u2[1] - u1[1] * u2[0], u1[0] * u2[0] + u1[1] * u2[1]);
    const t = r * Math.tan(Math.abs(giro) / 2);
    const ini = [B[0] - u1[0] * t, B[1] - u1[1] * t]; const fim = [B[0] + u2[0] * t, B[1] + u2[1] * t];
    const sg = Math.sign(giro); const n1 = [-u1[1] * sg, u1[0] * sg]; const cen = [ini[0] + n1[0] * r, ini[1] + n1[1] * r];
    const P = ([z, y]) => [x, y, z];
    /* o giro no plano (z, y) de ângulo `giro` é, em torno do eixo x, o giro de -giro */
    const pe = [s * meio(yPe), yPe, zEixoFrente(yPe)]; const junta = P([zEixoFrente(C.juntaY), C.juntaY]);
    const dist = (a, b) => Math.hypot(...a.map((v, k) => v - b[k]));
    const s0 = dist(pe, junta) + dist(junta, P(ini));
    return {
      trilho: [{ reta: { de: pe, ate: junta } }, { reta: { de: junta, ate: P(ini) } },
        { arco: { centro: P(cen), eixo: [1, 0, 0], de: P(ini), graus: -giro * 180 / Math.PI } }, { reta: { de: P(fim), ate: P(Cc) } }],
      dobra: [s0, s0 + r * Math.abs(giro)],
    };
  }
  const hx = C.secao.x / 2; const hl = C.secao.lado / 2;
  const secaoColuna = [{ u: -hx, v: -hl, nome: 'a' }, { u: hx, v: -hl, nome: 'b' }, { u: hx, v: hl, nome: 'c' }, { u: -hx, v: hl, nome: 'd' }];

  /* o perfil de lado do teto, da dobra até a coluna de trás */
  const PF = TE.perfil;
  /* a concordância do arco de dentro com a face de trás da coluna da frente: do fim do arco, na direção dele, à face de trás, na
     direção da coluna; depois o contorno entra no eixo do tubo */
  const CC = PF.concordancia;
  const baixo = PF.baixo.slice(0, PF.baixo.length - CC.trocaOsUltimos).map(([z, y]) => [ZL(z), YL(y)]);
  const unit = ([a, b]) => { const l = Math.hypot(a, b); return [a / l, b / l]; };
  const P0 = baixo[baixo.length - 1];
  const d0 = unit([P0[0] - baixo[baixo.length - 2][0], P0[1] - baixo[baixo.length - 2][1]]);
  const meiaFundo = C.secao.lado / 2 * Math.hypot(1, INCL);              // a meia espessura do tubo medida em z
  const P3 = [zEixoFrente(CC.ate) - meiaFundo + CC.dentroDoTubo, CC.ate];
  const subir = unit([INCL, 1]);                                         // a direção da coluna, para cima
  const P1 = [P0[0] + d0[0] * CC.alca[0], P0[1] + d0[1] * CC.alca[0]];
  const P2 = [P3[0] + subir[0] * CC.alca[1], P3[1] + subir[1] * CC.alca[1]];
  const concordancia = Array.from({ length: CC.pontos }, (_, k) => {
    const t = (k + 1) / CC.pontos; const u = 1 - t;
    return [0, 1].map((e) => u ** 3 * P0[e] + 3 * u * u * t * P1[e] + 3 * u * t * t * P2[e] + t ** 3 * P3[e]);
  });
  const perfilTeto = [...baixo, ...concordancia, [zEixoFrente(CC.ate), CC.ate],
    ...PF.frente.map(([z, y]) => [ZL(z), YL(y)]), [ZL(PF.canto.px), TOPO - PF.canto.abaixoDoTopo], [ZL(PF.topo[0]), TOPO], [ZL(PF.topo[1]), TOPO]];

  /* a coluna de trás: a silhueta de lado e a seção de trás de cada lado */
  const ladoTras = [[CT.pe.z[0], CT.pe.y], [CT.pe.z[1], CT.pe.y], ...CT.tras.map(([z, y]) => [ZL(z), YL(y)]),
    ...Array.from({ length: 7 }, (_, k) => { const a = Math.PI + Math.PI / 2 * k / 6; return [TE.tras + CT.canto + CT.canto * Math.cos(a), TOPO - CT.canto - CT.canto * Math.sin(a)]; }),
    [CT.topoAte, TOPO], ...CT.frente.map(([z, y]) => [ZL(z), YL(y)])];
  const secaoTras = (s) => {
    const xPe = APOIOS.trasEsquerdo.x;
    const p = [[xPe[0], CT.secao.y], [xPe[1], CT.secao.y], [TE.x[1], C.juntaY], [TE.x[1], TOPO + CT.secao.sobreOTopo], [TE.x[0], TOPO + CT.secao.sobreOTopo], [TE.x[0], C.juntaY]];
    return s > 0 ? p : espelhoX(p).reverse();
  };

  /* o bloco do corte de cada pé, em [z, y] da lateral: a aresta de cima do apoio e o fundo abaixo dela */
  const corte = ({ aresta: [[za, ya], [zb, yb]] }) => [[za, ya], [zb, yb], [zb, yb - T.corteDosPes.fundo], [za, ya - T.corteDosPes.fundo]];
  /* as portas dos pés: o plano do apoio, com a normal para baixo; o ponto é o do apoio da carcaça, que fica no plano */
  const portas = {};
  for (const lado of ['Esquerdo', 'Direito']) {
    for (const [onde, extensao] of [['Frente', [C.secao.x, C.secao.lado]], ['Tras', [APOIOS.trasEsquerdo.x[1] - APOIOS.trasEsquerdo.x[0], Math.abs(CT.pe.z[1] - CT.pe.z[0])]]]) {
      const a = APOIOS[`${onde.toLowerCase()}${lado}`];
      portas[`pe${onde}${lado}`] = { forma: 'plano', papel: 'apoia', ponto: a.ponto, normal: a.normal.map((v) => (v === 0 ? 0 : -v)), extensao, referencia: [1, 0, 0] };
    }
  }
  const zDobra = zEixoFrente(Y_TETO);
  return { APOIOS, corte, portas, ZL, YL, zFrente, zEixoFrente, TOPO, Y_TETO, zDobra, trilhoDaColunaFrente, secaoColuna, perfilTeto, ladoTras, secaoTras };
}

/** Monta o protetor no estado { passos, topo, origem }, em mm, no referencial da máquina, e devolve as origens das portas. */
export function montarProtetor(estado, T = TABELA) {
  const D = derivar(T);
  const { extX, extZ, booleana, parte } = ferramentas(estado);
  const unir = (...s) => booleana('unir', s);
  const cortar = (a, ...s) => booleana('subtrair', [a, ...s]);
  const cruzar = (...s) => booleana('intersectar', s);
  const lados = (fn) => [1, -1].map(fn);
  const emX = (s, [a, b]) => (s > 0 ? [a, b] : [-b, -a]);
  const TE = T.teto; const C = T.coluna; const CT = T.colunaTras; const TOPO = D.TOPO;

  /* o tubo da seção da coluna pelo trilho, fechado e tampado, pelo passo `subdivisao` sem nível: a cada 50 mm nas retas e dez
     estações na dobra, para que a face de dentro siga o arco */
  const tubo = (nome, { trilho, dobra }) => {
    const g = gaiolaVarrida({ nome, trilho, quadro: { u: [1, 0, 0] }, secao: D.secaoColuna, fechada: true, tampas: true,
      estacoes: [{ fracao: 0 }, { passo: C.estacoes.passo }, { em: dobra[0] }, { entre: C.estacoes.naDobra }, { em: dobra[1] }, { passo: C.estacoes.passo }, { fracao: 1 }],
      vincos: D.secaoColuna.map(({ nome: linha }) => ({ linha, nitidez: 'viva' })) });
    Object.assign(estado.topo, Object.fromEntries(g.posicoes));
    estado.origem += 1;
    estado.passos.push(['subdivisao', { origemId: estado.origem, vertices: g.vertices, faces: g.faces, vincos: g.vincos, cantos: g.cantos, niveis: C.niveis }]);
    return { origem: { op: 'subdivisao', id: estado.origem } };
  };

  /* QUADRO: de cada lado a coluna da frente com o perfil de lado do teto num tubo só, o perfil, e a coluna de trás (a silhueta de lado
     cruzada com a seção de trás), menos o que fica abaixo do plano de cada apoio, um corte por pé; depois as duas travessas do teto.
     A porta do pé sai da costura do corte dele, que é a face que o corte deixa e a borda do pé em volta: a lateral do bloco que vira
     essa face não tem índice estável (ela é a 0 num pé e a 3 no outro), e citada inteira a origem do bloco cita as faces consumidas. */
  const cortes = {};
  const al = T.corteDosPes.alem; const xTras = D.APOIOS.trasEsquerdo.x;
  const quadros = lados((s) => {
    const lado = s > 0 ? 'Esquerdo' : 'Direito';
    const juntos = unir(
      tubo(`colunaFrente${s > 0 ? 'E' : 'D'}`, D.trilhoDaColunaFrente(s)),
      extX(D.perfilTeto, ...emX(s, [TE.x[0] - TE.perfil.alemDoTubo, TE.x[1] + TE.perfil.alemDoTubo])),
      cruzar(extX(D.ladoTras, ...emX(s, CT.silhuetaEmX)), extZ(D.secaoTras(s), CT.secaoEmZ[0], CT.secaoEmZ[1])),
    );
    cortes[`peFrente${lado}`] = cortar(juntos, extX(D.corte(D.APOIOS[`frente${lado}`]), ...emX(s, [C.pe.x[0] - al, C.pe.x[1] + al])));
    cortes[`peTras${lado}`] = cortar(cortes[`peFrente${lado}`], extX(D.corte(D.APOIOS[`tras${lado}`]), ...emX(s, [xTras[0] - al, xTras[1] + al])));
    return cortes[`peTras${lado}`];
  });
  const xTravessa = TE.x[0] + TE.travessas.alem;
  /* a travessa da frente cruzada com a silhueta do perfil, para acompanhar o canto redondo de cima dele: caixa até o topo, ela saía
     acima do canto, o degrau na cota do teto junto à dobra */
  const travessas = [cruzar(extX(retangulo(D.zDobra - TE.travessas.frente[0], TOPO - TE.alturaDoPerfil, D.zDobra - TE.travessas.frente[1], TOPO), -xTravessa, xTravessa),
    extX(D.perfilTeto, -xTravessa, xTravessa)),
    extX(retangulo(TE.tras, TOPO - TE.alturaDoPerfil, TE.tras + TE.travessas.tras, TOPO), -xTravessa, xTravessa)];
  parte('quadro', unir(...quadros, ...travessas), T.cores.aco);

  /* GRADE DO TETO: as barras ao comprido e as atravessadas, de lado a lado */
  const G = T.grade;
  const zGrade = [D.zDobra - G.frente, TE.tras + G.tras];
  const yGrade = [TOPO - G.abaixoDoTopo[0], TOPO - G.abaixoDoTopo[1]];
  const barras = G.barras.flatMap((x) => [x, -x]).map((x) => extX(retangulo(zGrade[1], yGrade[0], zGrade[0], yGrade[1]), x - G.largura / 2, x + G.largura / 2));
  const atravessadas = G.atravessadas.map((z) => extX(retangulo(z - G.largura / 2, yGrade[0], z + G.largura / 2, yGrade[1]), -xTravessa, xTravessa));
  parte('gradeTeto', unir(...barras, ...atravessadas), T.cores.aco);

  /* LUZES DE TRABALHO: a caixa de cada lado com a face de trás na face da frente da coluna, inclinada como ela */
  const LU = T.luzes;
  const ladoLuz = [[D.zFrente(LU.y[0]) - LU.dentroDaColuna, LU.y[0]], [D.zFrente(LU.y[1]) - LU.dentroDaColuna, LU.y[1]], [D.zFrente(LU.y[1]) + LU.fundo, LU.y[1]], [D.zFrente(LU.y[0]) + LU.fundo, LU.y[0]]];
  parte('luzesTrabalho', unir(...lados((s) => extX(ladoLuz, ...emX(s, LU.x)))), T.cores.escuro);

  /* LANTERNAS DO ALTO, na face de trás da travessa de trás */
  const LA = T.lanternas;
  parte('lanternas', unir(...lados((s) => extX(retangulo(TE.tras + LA.z[0], TOPO - LA.abaixoDoTopo[0], TE.tras + LA.z[1], TOPO - LA.abaixoDoTopo[1]), ...emX(s, LA.x)))), T.cores.vermelho);

  /* ESPELHO, do lado esquerdo: o vidro e o braço até a face de trás da coluna da frente */
  const E = T.espelho; const BR = E.braco;
  parte('espelho', unir(extX(retangulo(E.z[0], E.y[0], E.z[1], E.y[1]), E.x[0], E.x[1]),
    extX(retangulo(BR.z, BR.y[0], D.zFrente(BR.em) - BR.atras, BR.y[1]), BR.x[0], BR.x[1])), T.cores.escuro);

  return { cortes };
}

/* Os campos de medida de cada operação e das portas: neles todo número é milímetro. */
const MEDIDAS = { extrusao: ['perfil', 'em', 'altura'] };
const MEDIDAS_DA_PORTA = ['centro', 'ponto', 'raio', 'raioInterno', 'raioExterno', 'inicio', 'fim', 'extensao'];
const emMetro = (v) => (typeof v === 'number' ? m(v) : Array.isArray(v) ? v.map(emMetro) : v);

/** Os PASSOS, em metro: a forma e, no fim, as quatro portas dos pés, cada uma da face que o corte dela deixou. */
export function gerarPassos(T = TABELA) {
  const estado = { passos: [], topo: {}, origem: 0 };
  const { cortes } = montarProtetor(estado, T);
  const forma = estado.passos.map(([op, args]) => [op, Object.fromEntries(Object.entries(args).map(([k, v]) => [k, (MEDIDAS[op] ?? []).includes(k) ? emMetro(v) : v]))]);
  const { portas } = derivar(T);
  const porta = (id) => ['publicarPorta', { id, de: { ...cortes[id].origem, costura: true }, interface: Object.fromEntries(Object.entries(portas[id]).map(([k, v]) => [k, MEDIDAS_DA_PORTA.includes(k) ? emMetro(v) : v])) }];
  return [...forma, ...['peFrenteEsquerdo', 'peFrenteDireito', 'peTrasEsquerdo', 'peTrasDireito'].map(porta)];
}

/** Os pontos nomeados da gaiola das colunas da frente, em metro. */
export function gerarTopo(T = TABELA) {
  const estado = { passos: [], topo: {}, origem: 0 };
  montarProtetor(estado, T);
  return Object.fromEntries(Object.entries(estado.topo).map(([nome, p]) => [nome, p.map(m)]));
}

export const CONTATOS = [
  { par: ['gradeTeto', 'quadro'], motivo: 'as barras da grade, de 2.095 a 2.130 mm, entram 5 mm nas travessas do teto, que vão de 2.065 a 2.135, e as atravessadas vão até 1 mm além da face de dentro do perfil de lado' },
  { par: ['lanternas', 'quadro'], motivo: 'as lanternas entram 2 mm na face de trás da travessa de trás, em z -1.425' },
  { par: ['luzesTrabalho', 'quadro'], motivo: 'a face de trás de cada luz fica 3 mm dentro da face da frente da coluna da frente, inclinada como ela' },
  { par: ['espelho', 'quadro'], motivo: 'o braço do espelho entra 5 mm na face de trás da coluna da frente esquerda, em y 1.705 a 1.730' },
];

const receita = {
  meta: { nome: 'empilhadeira/protetor', desc: 'protetor do operador da empilhadeira: as quatro colunas e o quadro do teto, a grade do teto, as luzes de trabalho, o espelho e as lanternas do alto' },
  PARAMS: TABELA,
  get TOPO() { return { origem: 'a da máquina: o chão sob o centro do eixo dianteiro, no meio da largura; y para cima, +x à esquerda de quem dirige e a frente em +z', ...gerarTopo(this.PARAMS) }; },
  PLANO: {
    objeto: 'o protetor do operador de uma empilhadeira de contrapeso de 2,5 t: as quatro colunas, o teto em grade, as luzes de trabalho, o espelho e as lanternas do alto, numa peça rígida presa à carcaça pelos quatro pés',
    referencias: ['../../referencias/tras.ia.png', '../../referencias/frente.ia.png', '../../referencias/cima.ia.png'],
    escala: { medida: 'altura do protetor do operador, no topo do quadro do teto (TABELA do alinhamento, rascunho; 2.150 na ficha, com as lanternas)', milimetros: 2135 },
    partes: [
      { nome: 'quadro', forma: 'quatro colunas cinza e o quadro do teto a 2.135 mm, 960 de largura: a da frente, tubo de 55 por 70 inclinado 14,5 graus para trás, dobra com raio 60 e segue como perfil do teto; a de trás, chapa que se afina para cima; duas travessas', tecnica: 'tubo por gaiolaVarrida fechada e tampada, subdividido, unido ao perfil do teto extrudado em x e à coluna de trás (silhueta em x cruzada com a seção em z); cada pé cortado pelo plano do apoio; travessas extrudadas' },
      { nome: 'gradeTeto', forma: 'a grade cinza do teto: seis barras de 30 mm ao comprido, a 60, 180 e 300 mm do centro, e duas atravessadas em z -814 e -969, de 2.095 a 2.130 mm, apoiadas nas travessas', tecnica: 'retângulos laterais extrudados em x, unidos' },
      { nome: 'luzesTrabalho', forma: 'duas luzes de trabalho escuras, caixas de 90 mm de lado de 1.750 a 1.940 mm, presas na face da frente de cada coluna da frente e inclinadas como ela, de 445 a 530 mm do centro', tecnica: 'quadrilátero lateral extrudado em x, um de cada lado' },
      { nome: 'espelho', forma: 'o espelho escuro do lado esquerdo (+x), de 70 por 160 mm, de 356 a 426 mm do centro, atrás da coluna da frente e preso à face de trás dela por um braço', tecnica: 'retângulos laterais extrudados em x, unidos' },
      { nome: 'lanternas', forma: 'duas lanternas vermelhas na face de trás da travessa de trás, de 205 a 410 mm do centro e de 2.075 a 2.130 mm', tecnica: 'retângulos laterais extrudados em x, um de cada lado' },
    ],
    criteriosDeReprovacao: [
      'o protetor estreito ou baixo para uma empilhadeira de 2,5 t: o teto com menos de 960 mm de largura ou abaixo de 2.100 mm',
      'um pé fora do apoio: o da frente fora da aba do paralama ou o de trás fora das colunas da carcaça, ou um pé cruzando a carcaça',
      'a coluna da frente de pé na vertical, ou sem a dobra que a leva ao perfil de lado do teto',
      'o teto sem a grade de barras, ou a grade solta das travessas',
      'a luz, o espelho ou a lanterna solta da coluna ou da travessa, ou o espelho do lado direito de quem dirige',
      'cor trocada: o quadro laranja, ou a lanterna que não é vermelha',
    ],
    lataria: { partes: ['quadro'] },
  },
  contatos: CONTATOS,
  /* Os extremos que a TABELA fixa, em mm: a grade, as luzes, o espelho e as lanternas. O quadro tem o extremo no tubo e no corte do pé,
     e fica com as vistas. */
  get PONTOS() {
    const T = this.PARAMS; const D = derivar(T); const TE = T.teto; const G = T.grade; const LU = T.luzes; const E = T.espelho; const LA = T.lanternas;
    const xTravessa = TE.x[0] + TE.travessas.alem;
    return [
      { nome: 'canto da frente da grade, em cima', parte: 'gradeTeto', medida: 'maximo', em: [xTravessa, D.TOPO - G.abaixoDoTopo[1], D.zDobra - G.frente], toleranciaMm: 0.5 },
      { nome: 'canto de trás da grade, embaixo', parte: 'gradeTeto', medida: 'minimo', em: [-xTravessa, D.TOPO - G.abaixoDoTopo[0], TE.tras + G.tras], toleranciaMm: 0.5 },
      { nome: 'luz de trabalho esquerda, na frente e em cima', parte: 'luzesTrabalho', medida: 'maximo', em: [LU.x[1], LU.y[1], D.zFrente(LU.y[0]) + LU.fundo], toleranciaMm: 0.5 },
      { nome: 'espelho, no braço', parte: 'espelho', medida: 'maximo', em: [E.braco.x[1], E.y[1], D.zFrente(E.braco.em) - E.braco.atras], toleranciaMm: 0.5 },
      { nome: 'espelho, embaixo e atrás', parte: 'espelho', medida: 'minimo', em: [E.x[0], E.y[0], E.z[0]], toleranciaMm: 0.5 },
      { nome: 'lanterna direita, embaixo e atrás', parte: 'lanternas', medida: 'minimo', em: [-LA.x[1], D.TOPO - LA.abaixoDoTopo[0], TE.tras + LA.z[0]], toleranciaMm: 0.5 },
      { nome: 'lanterna esquerda, em cima e na frente', parte: 'lanternas', medida: 'maximo', em: [LA.x[1], D.TOPO - LA.abaixoDoTopo[1], TE.tras + LA.z[1]], toleranciaMm: 0.5 },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
