/* lava-loucas-compacta-branca — lava-louças compacta branca de embutir sob bancada, com caixa branca, painel de controle na faixa de
 * cima da frente, porta, puxador de aço escovado no topo da porta, borracha preta, rodapé e duas pecinhas em L que ligam o rodapé
 * à caixa. O painel leva dois botões quadrados com chanfro, um botão redondo de ligar e desligar e quatro pontos indicadores.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0 e a frente do aparelho em +z; o fundo fica em -z e x cresce para a direita
 * de quem olha o aparelho de frente. Origem no chão, centrada em x e em z. A TABELA, em milímetro, é a única fonte das medidas;
 * `derivar` transforma a tabela em caixas e `gerarPassos` escreve, por parte, a forma, a `parte` e o `material`.
 *
 * Dimensões aprovadas pela pessoa (variação pequena sobre a imagem, que mostra 51,0 por 63,0 por 65,0 cm): 520 mm de largura,
 * 640 mm de altura e 650 mm de profundidade, medidas sobre o conjunto sem o puxador. A pessoa liberou depois a profundidade
 * total, que com o puxador facetado passa a 677,7 mm (de z -325 a z 352,7); largura e altura continuam 520 e 640 mm. Por isso a caixa, sozinha, tem 512 mm de
 * largura (as duas pecinhas de 4 mm ficam nas laterais e fecham 520 mm) e 610 mm de profundidade (a camada da frente tem 30 mm e
 * o puxador sai mais 10 mm à frente dela no corpo de 650 mm, e o centro do puxador ainda avança até z 352,7).
 *
 * Razões medidas em frontal.png (1200 por 1200 px), sobre a altura da face da frente, de y 182 a y 1101, 919 px, que corresponde
 * aos 640 mm (o trecho acima de y 182 na foto é o topo do aparelho visto de cima e não entra na face da frente):
 *   painel   128 px  0,139  -> 89,1 mm
 *   porta    717 px  0,780  -> 499,3 mm
 *   borracha  10 px  0,011  ->  7,0 mm
 *   rodapé    62 px  0,067  ->  43,2 mm
 * Sobre a silhueta inteira da foto (1002 px, de y 99 a y 1101), as mesmas faixas dão 0,128, 0,716, 0,010 e 0,062. Medidas usadas:
 * painel 89 mm, rodapé 43 mm e borracha 10 mm (a imagem mostra 7 mm de linha preta), com a porta de 498 mm no que sobra dos 640 mm
 * (a imagem pede 499 mm). Mudança pedida pela pessoa: a borracha passou de 20 para 10 mm e a porta de 488 para 498 mm, que
 * cresce para baixo, até y 53, enquanto o rodapé continua com 43 mm.
 * O painel, a porta, o rodapé e a borracha formam a camada da frente, com 30 mm de espessura e a mesma face da frente, em z 315.
 * Mudança pedida pela pessoa: a face da frente da caixa recuou 20 mm, de z 305 para z 285, e a camada da frente cresceu 20 mm
 * para dentro, de 10 para 30 mm, de modo que a profundidade do corpo continua 650 mm e a camada encosta na nova face da caixa.
 * O centro do puxador sai 37,7 mm da porta, até z 352,7, o ponto mais à frente do conjunto. Largura: a porta, o rodapé e a borracha têm 504 mm,
 * e o painel e a caixa 512 mm (na imagem a porta tem 783 px e o painel, 800 px). O painel passou de 508 para 512 mm para o lado
 * dele ficar no mesmo plano da lateral da caixa, e o contorno arredondado do topo seguir contínuo da caixa para o painel.
 * Os botões e os pontos usam a imagem painel.png (1038 por 181 px, que corresponde a 508 por 89 mm): posição de cada um em px
 * convertida por 0,49 mm/px, a partir do meio do painel em x e da borda de cima em y.
 *
 * Simplificações em relação à imagem:
 *  - a caixa é um bloco simples. O recuo (degrau) da traseira perto da base e o pequeno ressalto da frente do topo, que aparecem
 *    em medidas.png, ficam de fora.
 *  - o puxador (mudança pedida pela pessoa, com quatro imagens do formato real: puxador-vista-de-cima.png, -perspectiva.png,
 *    -aramado.png e -contorno.png): é UMA extrusão em y de um polígono de planta (x, z), com o fundo reto e a frente em arco
 *    facetado, altura constante de 48 mm (y 493 a 541) e fundo reto em z 309, dentro do rasgo cego da porta (496 por 58 mm,
 *    cantos de 10 mm de raio, 6 mm de fundo, aberto por `subtrair`). Razões medidas em puxador-contorno.png (138 por 671 px;
 *    comprimento 623 px, de y 16 a y 639; fundo em x 31): espessura no centro 56 px (0,0899 do comprimento); nas pontas 13 px
 *    (0,232 da espessura do centro); primeiro chanfro a 0,0112 do comprimento da ponta com 28 px (0,500); segundo chanfro a
 *    0,0385 com 36 px (0,643); aresta intermediária de cada lado a 0,2793 com 51 px (0,911). A pessoa liberou a profundidade:
 *    com 486 mm de comprimento (0,780 mm/px) a espessura do centro é 43,7 mm, e a frente do centro vai a z 352,7. Polígono em
 *    mm (metade direita, a esquerda é o espelho; fundo em z 309): (243; 309), (243; 319,1), (237,6; 330,8), (224,3; 337,1),
 *    (107,3; 348,8), (0; 352,7), todos com z = 309 mais a razão de espessura vezes 43,7 mm. O arredondamento de 2 a 3 mm das
 *    bordas de cima e de baixo NÃO foi feito: `arredondarAresta` em cadeia em torno do polígono inteiro (limite de ângulo de
 *    100 e de 180 graus) não gerou faces, e a cadeia de 20 graus arredondou uma aresta só, sem fechar os cantos. As bordas
 *    ficam vivas.
 *  - arredondamento do topo (mudança pedida pela pessoa): as arestas de cima da caixa (as duas laterais e a de trás) e do painel
 *    (a da frente e as duas laterais) têm 8 mm de raio e 6 painéis, por `arredondarAresta` com `sel.onde`. A caixa e o painel
 *    passaram de `chamferBox` para `cubo`, porque o chanfro já ocupa a aresta que o arredondamento troca; as outras arestas
 *    deles ficam vivas. A aresta de cima da frente da caixa não é arredondada: o painel a cobre, e arredondá-la abriria um
 *    sulco de 8 mm entre o painel e o topo da caixa. Com isso o topo da caixa e o painel formam um contorno contínuo.
 *  - as pecinhas em L são duas extrusões de perfil em L, em planta, com 4 mm de espessura, 120 mm de altura e 60 mm de aba na
 *    caixa, dos quais 30 mm encostam na caixa depois do recuo da frente (em isometrica.png a peça da direita tem cerca de
 *    150 mm de altura; a altura usada é menor). A aba curta de 4 mm fecha na lateral do rodapé, da borracha e da porta.
 *  - o vidro da porta, o espelhamento e os frisos da foto não são modelados.
 *
 * Texto que a imagem escreve e que NÃO entra como geometria, porque o núcleo não modela texto. Fica para uma futura etiqueta
 * (decalque): a marca de serviços "8 SERVIÇOS" na direita do painel; "PROGRAMAS" com "Dia a Dia", "Pesado", "Delicado", "Rápido"
 * e "Econômico", cada um com um ícone; "ETAPAS" com "Lavando", "Enxaguando" e "Secando"; "Selecionar Programa" sob o botão
 * quadrado da direita; "INICIAR | DESLIGAR" sob o botão redondo; o nome de função sob o botão quadrado da esquerda; e os ícones
 * dentro dos três botões. Fica sem nome de fabricante no repositório.
 */

export const TABELA = {
  largura_total: 520,
  altura_total: 640,
  profundidade_base: 650,

  pecinha_espessura: 4,
  pecinha_comprimento: 60,
  pecinha_altura: 120,
  pecinha_aba: 4,

  frente_espessura: 30,
  frente_recuo: 10,

  topo_raio: 8,
  topo_paineis: 6,

  painel_altura: 89,
  painel_largura: 512,

  borracha_altura: 10,

  rodape_altura: 43,
  rodape_largura: 504,
  rodape_chanfro: 1.5,

  porta_largura: 504,
  porta_chanfro: 2,

  rasgo_largura: 496,
  rasgo_altura: 58,
  rasgo_raio: 10,
  rasgo_fundo: 6,
  rasgo_recuo_topo: 5,
  rasgo_segmentos: 8,

  puxador_largura: 486,
  puxador_altura: 48,
  puxador_centro_t: 0.0899,
  puxador_ponta_t: 0.232,
  puxador_chanfro1_u: 0.0112,
  puxador_chanfro1_t: 0.5,
  puxador_chanfro2_u: 0.0385,
  puxador_chanfro2_t: 0.643,
  puxador_inter_u: 0.2793,
  puxador_inter_t: 0.911,

  botao_altura: 3,
  botao_quadrado_largura: 19,
  botao_quadrado_altura: 14,
  botao_quadrado_chanfro: 1.2,
  botao_quadrado_x_esq: -89,
  botao_quadrado_x_dir: -63,
  botao_y_desce: 57.5,
  botao_redondo_x: 72,
  botao_redondo_raio: 8,
  botao_redondo_lados: 32,

  ponto_altura: 1.5,
  ponto_raio: 1.2,
  ponto_lados: 12,
  ponto_esq_x: -89,
  ponto_esq_y_desce: 39,
  ponto_etapa_y_desce: 69,
  ponto_etapa_x1: -18,
  ponto_etapa_x2: 4.5,
  ponto_etapa_x3: 27,
};

/* Retângulo de cantos arredondados em (x, y) relativos ao centro, em milímetro, com `seg` segmentos por canto. */
export function retanguloArredondado(largura, altura, raio, seg) {
  const pts = [];
  const cx = largura / 2 - raio;
  const cy = altura / 2 - raio;
  for (const [sx, sy, a0] of [[1, 1, 0], [-1, 1, 90], [-1, -1, 180], [1, -1, 270]]) {
    for (let k = 0; k <= seg; k += 1) {
      const a = ((a0 + (90 * k) / seg) * Math.PI) / 180;
      pts.push([sx * cx + Math.cos(a) * raio, sy * cy + Math.sin(a) * raio]);
    }
  }
  return pts;
}

/* Caixas em milímetro. Cada uma tem `forma` (chamferBox, cubo, cilindro, extrusao ou extrusaoY), `material` e as medidas da forma.
 * `arredonda` lista as arestas de cima que o `arredondarAresta` arredonda, e `rasgo` o rasgo cego que a porta recebe. Todo número
 * aqui sai da tabela. */
export function derivar(T) {
  const caixas = [];
  const meiaTotal = T.largura_total / 2;
  const meiaCaixa = meiaTotal - T.pecinha_espessura;
  const zFrenteTotal = T.profundidade_base / 2;
  const zPuxador0 = zFrenteTotal - T.frente_recuo;
  const zFrente = zPuxador0;
  const zCaixa1 = zFrente - T.frente_espessura;
  const zCaixa0 = -zFrenteTotal;

  const rodapeY1 = T.rodape_altura;
  const borrachaY1 = rodapeY1 + T.borracha_altura;
  const painelY0 = T.altura_total - T.painel_altura;
  const portaY0 = borrachaY1;
  const portaY1 = painelY0;

  /* caixa: o bloco principal, do chão ao topo plano, com a frente em z 285 e o fundo em z -325; o topo arredonda nas laterais e atrás */
  caixas.push({
    nome: 'caixa', forma: 'cubo', x0: -meiaCaixa, x1: meiaCaixa, y0: 0, y1: T.altura_total, z0: zCaixa0, z1: zCaixa1,
    arredonda: [{ eixo: 'x', lado: 'max' }, { eixo: 'x', lado: 'min' }, { eixo: 'z', lado: 'min' }], material: 'branco',
  });

  /* porta: a folha da frente, entre a borracha e o painel, com o rasgo do puxador no topo */
  const rasgoY1 = portaY1 - T.rasgo_recuo_topo;
  const rasgoYc = rasgoY1 - T.rasgo_altura / 2;
  caixas.push({
    nome: 'porta', forma: 'chamferBox', x0: -T.porta_largura / 2, x1: T.porta_largura / 2, y0: portaY0, y1: portaY1,
    z0: zCaixa1, z1: zFrente, chanfro: T.porta_chanfro, material: 'branco',
    rasgo: { yc: rasgoYc, z0: zFrente - T.rasgo_fundo, z1: zFrente + 2, perfil: retanguloArredondado(T.rasgo_largura, T.rasgo_altura, T.rasgo_raio, T.rasgo_segmentos) },
  });

  /* painel: a faixa de cima da frente, sobre a porta, com a mesma frente; o topo arredonda na frente e nas laterais */
  caixas.push({
    nome: 'painel', forma: 'cubo', x0: -T.painel_largura / 2, x1: T.painel_largura / 2, y0: painelY0,
    y1: T.altura_total, z0: zCaixa1, z1: zFrente,
    arredonda: [{ eixo: 'x', lado: 'max' }, { eixo: 'x', lado: 'min' }, { eixo: 'z', lado: 'max' }], material: 'branco',
  });

  /* rodapé: a faixa de baixo da frente, do chão à borracha */
  caixas.push({
    nome: 'rodape', forma: 'chamferBox', x0: -T.rodape_largura / 2, x1: T.rodape_largura / 2, y0: 0, y1: rodapeY1,
    z0: zCaixa1, z1: zFrente, chanfro: T.rodape_chanfro, material: 'branco',
  });

  /* pecinhas: perfil em L, em planta. A aba maior encosta na lateral da caixa e a aba curta fecha na lateral do rodapé. */
  for (const [lado, s] of [['Esq', -1], ['Dir', 1]]) {
    const xi = T.rodape_largura / 2;
    const xc = meiaCaixa;
    const xe = meiaTotal;
    const zf = zFrente;
    const zl = zf - T.pecinha_comprimento;
    const zb = zf - T.pecinha_aba;
    const perfil = [[xc, zl], [xe, zl], [xe, zf], [xi, zf], [xi, zb], [xc, zb]].map(([x, z]) => [s * x, z]);
    caixas.push({ nome: `pecinhaRodape${lado}`, forma: 'extrusao', y0: 0, altura: T.pecinha_altura, perfil, material: 'branco' });
  }

  /* puxador: barra de aço dentro do rasgo no topo da porta. Vista de cima, o fundo é reto em z 309 e a frente é um arco em
     facetas retas: o centro sai até z 325, e a frente desce pelas arestas intermediárias e pelos dois chanfros até as pontas.
     `u` é a distância à ponta em fração do comprimento e `t` a espessura em fração da espessura do centro (z 309 a 325). */
  const pz0 = zFrente - T.rasgo_fundo;
  const pTc = T.puxador_centro_t * T.puxador_largura;
  const pMeia = T.puxador_largura / 2;
  const pontoDoLado = (u, t, s) => [s * (pMeia - u * T.puxador_largura), pz0 + t * pTc];
  const metade = [[0, T.puxador_ponta_t], [T.puxador_chanfro1_u, T.puxador_chanfro1_t], [T.puxador_chanfro2_u, T.puxador_chanfro2_t],
    [T.puxador_inter_u, T.puxador_inter_t], [0.5, 1]];
  const frenteDir = metade.map(([u, t]) => pontoDoLado(u, t, 1));
  const frenteEsq = metade.slice(0, -1).reverse().map(([u, t]) => pontoDoLado(u, t, -1));
  const puxY1 = rasgoYc + T.puxador_altura / 2;
  caixas.push({
    nome: 'puxador', forma: 'extrusaoY', y0: puxY1 - T.puxador_altura, altura: T.puxador_altura,
    perfil: [[pMeia, pz0], ...frenteDir, ...frenteEsq, [-pMeia, pz0]], material: 'aco',
  });

  /* borracha: a tira preta entre o rodapé e a porta */
  caixas.push({
    nome: 'borracha', forma: 'cubo', x0: -T.rodape_largura / 2, x1: T.rodape_largura / 2, y0: rodapeY1, y1: borrachaY1,
    z0: zCaixa1, z1: zFrente, material: 'preto',
  });

  /* botões quadrados, com chanfro, e botão redondo de ligar, sobre a face da frente do painel */
  const yBotao = T.altura_total - T.botao_y_desce;
  for (const [nome, x] of [['botaoQuadradoEsq', T.botao_quadrado_x_esq], ['botaoQuadradoDir', T.botao_quadrado_x_dir]]) {
    caixas.push({
      nome, forma: 'chamferBox', x0: x - T.botao_quadrado_largura / 2, x1: x + T.botao_quadrado_largura / 2,
      y0: yBotao - T.botao_quadrado_altura / 2, y1: yBotao + T.botao_quadrado_altura / 2, z0: zFrente, z1: zFrente + T.botao_altura,
      chanfro: T.botao_quadrado_chanfro, material: 'cinzaClaro',
    });
  }
  caixas.push({
    nome: 'botaoLiga', forma: 'cilindro', cx: T.botao_redondo_x, y: yBotao, z0: zFrente, raio: T.botao_redondo_raio,
    comprimento: T.botao_altura, lados: T.botao_redondo_lados, material: 'cinzaClaro',
  });

  /* pontos indicadores: um à esquerda e três sob "etapas" */
  for (const [nome, x, desce] of [
    ['pontoEsq', T.ponto_esq_x, T.ponto_esq_y_desce],
    ['pontoEtapa1', T.ponto_etapa_x1, T.ponto_etapa_y_desce],
    ['pontoEtapa2', T.ponto_etapa_x2, T.ponto_etapa_y_desce],
    ['pontoEtapa3', T.ponto_etapa_x3, T.ponto_etapa_y_desce],
  ]) {
    caixas.push({
      nome, forma: 'cilindro', cx: x, y: T.altura_total - desce, z0: zFrente, raio: T.ponto_raio, comprimento: T.ponto_altura,
      lados: T.ponto_lados, material: 'indicador',
    });
  }

  return caixas;
}

const m = (mm) => mm / 1000;

const NORMAL_CIMA = [0, 1, 0];
const NORMAL_FRENTE = [0, 0, 1];

/* Os ids dos passos: a forma da parte `i` (de 1) leva `i`; o resto de cada parte sai de blocos separados, sem colisão. */
const idForma = (i) => i;
const idArredonda = (i, k) => 100 + 10 * i + k;
const idRasgo = (i) => 1000 + i;
const idCorte = (i) => 2000 + i;

/* A forma que a seleção da parte pega: o cilindro inteiro é a lateral mais as duas tampas; a forma com arredondamento é a forma
 * mais as faixas que o arredondamento cria; a porta com rasgo é o resultado do `subtrair`. */
function origemDaParte(c, i) {
  if (c.forma === 'cilindro') return { alias: `${c.nome}Inteiro` };
  if (c.arredonda) return { alias: `${c.nome}Inteiro` };
  if (c.rasgo) return { origem: { op: 'subtrair', id: idCorte(i) } };
  return { origem: { op: c.forma === 'extrusaoY' ? 'extrusao' : c.forma, id: idForma(i) } };
}

export const ALIASES = derivar(TABELA).flatMap((c, i0) => {
  const i = i0 + 1;
  if (c.forma === 'cilindro') {
    return [[`${c.nome}Inteiro`, { unir: [
      { origem: { op: 'cilindro', id: i } },
      { origem: { op: 'cilindro', id: i, tampa: 'fundo' } },
      { origem: { op: 'cilindro', id: i, tampa: 'topo' } },
    ] }]];
  }
  if (c.arredonda) {
    return [[`${c.nome}Inteiro`, { unir: [
      { origem: { op: c.forma, id: i } },
      ...c.arredonda.map((_, k) => ({ origem: { op: 'arredondarAresta', id: idArredonda(i, k) } })),
    ] }]];
  }
  return [];
});

/* A extrusão em y tem o perfil em (u, v) com u = x - centro e v = z - centro, e `em` é o centro em x e z com a base em y. */
function extrusaoEmPlanta(perfil) {
  const xs = perfil.map((p) => p[0]);
  const zs = perfil.map((p) => p[1]);
  const xc = (Math.min(...xs) + Math.max(...xs)) / 2;
  const zc = (Math.min(...zs) + Math.max(...zs)) / 2;
  return { xc, zc, perfil: perfil.map(([x, z]) => [m(x - xc), m(z - zc)]) };
}

/** Os PASSOS: uma forma por parte, em metro, com a `parte` e o `material` logo depois. `em` é o centro em x e z e a base em y;
 *  no cilindro, é o centro da face de trás, com o eixo em z. */
export function gerarPassos(T) {
  const passos = [];
  derivar(T).forEach((c, i0) => {
    const i = i0 + 1;
    const id = idForma(i);
    const sel = origemDaParte(c, i);
    if (c.forma === 'extrusao') {
      const e = extrusaoEmPlanta(c.perfil);
      passos.push(['extrusao', {
        origemId: id, eixo: 'y', altura: m(c.altura), perfil: e.perfil, em: [m(e.xc), m(c.y0), m(e.zc)],
      }]);
    } else if (c.forma === 'extrusaoY') {
      const e = extrusaoEmPlanta(c.perfil);
      passos.push(['extrusao', {
        origemId: id, eixo: 'y', altura: m(c.altura), perfil: e.perfil, em: [m(e.xc), m(c.y0), m(e.zc)],
      }]);
    } else if (c.forma === 'cilindro') {
      passos.push(['cilindro', {
        origemId: id, raio: m(c.raio), altura: m(c.comprimento), lados: c.lados, eixo: 'z', em: [m(c.cx), m(c.y), m(c.z0)],
      }]);
    } else if (c.forma === 'cubo') {
      passos.push(['cubo', {
        origemId: id, larg: m(c.x1 - c.x0), alt: m(c.y1 - c.y0), prof: m(c.z1 - c.z0),
        em: [m((c.x0 + c.x1) / 2), m(c.y0), m((c.z0 + c.z1) / 2)],
      }]);
      (c.arredonda ?? []).forEach((a, k) => {
        passos.push(['arredondarAresta', {
          origemId: idArredonda(i, k), raio: m(T.topo_raio), paineis: T.topo_paineis,
          sel: {
            origem: { op: 'cubo', id },
            onde: { alvo: 'aresta', normal: { dir: NORMAL_CIMA, ate: 5 }, extremo: { eixo: a.eixo, lado: a.lado } },
          },
        }]);
      });
    } else {
      passos.push(['chamferBox', {
        origemId: id, larg: m(c.x1 - c.x0), alt: m(c.y1 - c.y0), prof: m(c.z1 - c.z0), chanfro: m(c.chanfro),
        em: [m((c.x0 + c.x1) / 2), m(c.y0), m((c.z0 + c.z1) / 2)],
      }]);
    }
    if (c.rasgo) {
      passos.push(['extrusao', {
        origemId: idRasgo(i), eixo: 'z', altura: m(c.rasgo.z1 - c.rasgo.z0),
        perfil: c.rasgo.perfil.map(([x, y]) => [m(x), m(y)]), em: [0, m(c.rasgo.yc), m(c.rasgo.z0)],
      }]);
      passos.push(['subtrair', {
        origemId: idCorte(i), solidos: [{ origem: { op: 'chamferBox', id } }, { origem: { op: 'extrusao', id: idRasgo(i) } }],
      }]);
    }
    passos.push(['parte', { nome: c.nome, sel }]);
    passos.push(['material', { sel, usa: c.material }]);
    if (c.arredonda) passos.push(['liso', { angulo: 30, sel }]);
  });
  return passos;
}

/* Os contatos: cada par se toca pela face indicada no motivo. A frente (porta, painel, rodapé e borracha) encosta na face da
 * frente da caixa, em z 285, e as faixas se encostam entre si por y. Os botões e os pontos assentam na face da frente do painel,
 * em z 315. As pecinhas encostam na lateral da caixa, em x 256, e na lateral do rodapé, em x 252. */
const BOTOES_E_PONTOS = ['botaoQuadradoEsq', 'botaoQuadradoDir', 'botaoLiga', 'pontoEsq', 'pontoEtapa1', 'pontoEtapa2', 'pontoEtapa3'];
export const CONTATOS = [
  { par: ['caixa', 'porta'], motivo: 'a face de trás da porta encosta na face da frente da caixa, em z 285, sem atravessá-la' },
  { par: ['caixa', 'painel'], motivo: 'a face de trás do painel encosta na face da frente da caixa, na faixa de cima, em z 285' },
  { par: ['caixa', 'rodape'], motivo: 'a face de trás do rodapé encosta na face da frente da caixa, na faixa de baixo, em z 285' },
  { par: ['caixa', 'borracha'], motivo: 'a face de trás da borracha encosta na face da frente da caixa, entre a porta e o rodapé' },
  { par: ['porta', 'painel'], motivo: 'a face de cima da porta encosta na face de baixo do painel, em y 551, sem folga' },
  { par: ['porta', 'borracha'], motivo: 'a face de baixo da porta encosta na face de cima da borracha, em y 53, sem folga' },
  { par: ['borracha', 'rodape'], motivo: 'a face de baixo da borracha encosta na face de cima do rodapé, em y 43, sem folga' },
  { par: ['puxador', 'porta'], motivo: 'a face de trás reta do puxador assenta no fundo do rasgo da porta, em z 309, com 6 mm do puxador dentro do rasgo e vão em volta' },
  ...BOTOES_E_PONTOS.map((b) => ({ par: [b, 'painel'], motivo: 'a base do botão ou do ponto assenta na face da frente do painel, em z 315' })),
  ...['Esq', 'Dir'].flatMap((lado) => [
    { par: [`pecinhaRodape${lado}`, 'caixa'], motivo: 'a aba maior da pecinha encosta na lateral da caixa, em x 256 ou -256' },
    { par: [`pecinhaRodape${lado}`, 'rodape'], motivo: 'a aba curta da pecinha encosta na lateral do rodapé, em x 252 ou -252' },
    { par: [`pecinhaRodape${lado}`, 'borracha'], motivo: 'a aba curta da pecinha encosta na lateral da borracha, em x 252 ou -252, entre y 43 e 53' },
    { par: [`pecinhaRodape${lado}`, 'porta'], motivo: 'a aba curta da pecinha encosta na lateral da porta, em x 252 ou -252, de y 53 a 120' },
  ]),
];

/* Os pontos declarados, em milímetro, saem da mesma tabela que a malha. */
export function pontosDeclarados(T = TABELA) {
  const meia = T.largura_total / 2;
  const zFrenteTotal = T.profundidade_base / 2;
  const zFrente = zFrenteTotal - T.frente_recuo;
  const zCaixa1 = zFrente - T.frente_espessura;
  const rodapeY1 = T.rodape_altura;
  const portaY0 = rodapeY1 + T.borracha_altura;
  const painelY0 = T.altura_total - T.painel_altura;
  const tol = 0.5;
  return [
    { nome: 'canto de trás, embaixo, da caixa', parte: 'caixa', medida: 'minimo', em: [-(meia - T.pecinha_espessura), 0, -zFrenteTotal], toleranciaMm: tol },
    { nome: 'canto da frente, em cima, da caixa', parte: 'caixa', medida: 'maximo', em: [meia - T.pecinha_espessura, T.altura_total, zCaixa1], toleranciaMm: tol },
    { nome: 'canto de baixo da pecinha esquerda, na lateral', parte: 'pecinhaRodapeEsq', medida: 'minimo', em: [-meia, 0, zFrente - T.pecinha_comprimento], toleranciaMm: tol },
    { nome: 'canto da frente da pecinha direita, na lateral', parte: 'pecinhaRodapeDir', medida: 'maximo', em: [meia, T.pecinha_altura, zFrente], toleranciaMm: tol },
    { nome: 'canto de cima da frente da porta', parte: 'porta', medida: 'maximo', em: [T.porta_largura / 2, painelY0, zFrente], toleranciaMm: tol },
    { nome: 'canto de baixo, atrás, da porta', parte: 'porta', medida: 'minimo', em: [-T.porta_largura / 2, portaY0, zCaixa1], toleranciaMm: tol },
    { nome: 'canto de cima da frente do painel', parte: 'painel', medida: 'maximo', em: [T.painel_largura / 2, T.altura_total, zFrente], toleranciaMm: tol },
    { nome: 'canto de baixo, atrás, do painel', parte: 'painel', medida: 'minimo', em: [-T.painel_largura / 2, painelY0, zCaixa1], toleranciaMm: tol },
    { nome: 'canto de cima da frente do rodapé', parte: 'rodape', medida: 'maximo', em: [T.rodape_largura / 2, rodapeY1, zFrente], toleranciaMm: tol },
    { nome: 'canto de baixo, atrás, da borracha', parte: 'borracha', medida: 'minimo', em: [-T.rodape_largura / 2, rodapeY1, zCaixa1], toleranciaMm: tol },
    { nome: 'canto de cima da frente da borracha', parte: 'borracha', medida: 'maximo', em: [T.rodape_largura / 2, portaY0, zFrente], toleranciaMm: tol },
    { nome: 'ponta da frente do puxador', parte: 'puxador', medida: 'maximo', em: [T.puxador_largura / 2, painelY0 - T.rasgo_recuo_topo - (T.rasgo_altura - T.puxador_altura) / 2, zFrente - T.rasgo_fundo + T.puxador_centro_t * T.puxador_largura], toleranciaMm: tol },
  ];
}

export const PASSOS = gerarPassos(TABELA);

const receita = {
  meta: { nome: 'lava-loucas-compacta-branca', desc: 'lava-louças compacta branca, com caixa, porta, painel de controle com botões e pontos, puxador de aço, borracha, rodapé e duas pecinhas em L' },
  PARAMS: TABELA,
  MATERIAIS: {
    branco: { tipo: 'liso', cor: '#f1f0ea' },
    aco: { tipo: 'metal', cor: '#b9bdc3', acabamento: 'escovado' },
    preto: { tipo: 'liso', cor: '#17181b' },
    cinzaClaro: { tipo: 'liso', cor: '#c9cbcf' },
    indicador: { tipo: 'liso', cor: '#5a5f66' },
  },
  TOPO: { origem: 'chão, no meio do aparelho em x e em z; y para cima e a frente do aparelho em +z' },
  PLANO: {
    objeto: 'lava-louças compacta branca de 520 mm de largura, 640 mm de altura e 677,7 mm de profundidade, com caixa, porta, painel de controle com botões e pontos, puxador de aço escovado, borracha, rodapé e duas pecinhas em L',
    referencias: ['referencias/alvo.md'],
    escala: { medida: 'altura total do aparelho', milimetros: 640 },
    familia: 'movel-de-caixa',
    partes: [
      { nome: 'caixa', forma: 'bloco de 512 por 640 por 610 mm, do chão a y 640, de z -325 a 285, com as arestas de cima das laterais e de trás arredondadas em 8 mm', tecnica: 'cubo no chão com arredondarAresta escolhida por sel.onde, sem o recuo da traseira da imagem' },
      { nome: 'porta', forma: 'folha de 504 por 498 por 30 mm, chanfro de 2 mm, de y 53 a 551, com a frente em z 315 e um rasgo cego de 496 por 58 mm, cantos de 10 mm de raio e 6 mm de fundo, no topo', tecnica: 'chamferBox com a face de trás na face da frente da caixa, menos uma extrusão de perfil arredondado por subtrair' },
      { nome: 'painel', forma: 'faixa de 512 por 89 por 30 mm, de y 551 a 640, com a frente em z 315 e as arestas de cima da frente e das laterais arredondadas em 8 mm', tecnica: 'cubo sobre a porta, com a face de trás na face da frente da caixa, e arredondarAresta escolhida por sel.onde' },
      { nome: 'rodape', forma: 'faixa de 504 por 43 por 30 mm, chanfro de 1,5 mm, do chão a y 43, com a frente em z 315', tecnica: 'chamferBox com a face de trás na face da frente da caixa' },
      { nome: 'pecinhaRodapeEsq', forma: 'suporte em L de 4 mm de espessura e 120 mm de altura, na lateral esquerda, aba de 60 mm na caixa e aba de 4 mm no rodapé', tecnica: 'extrusao em y de um perfil em L em planta' },
      { nome: 'pecinhaRodapeDir', forma: 'suporte em L de 4 mm de espessura e 120 mm de altura, na lateral direita, aba de 60 mm na caixa e aba de 4 mm no rodapé', tecnica: 'extrusao em y de um perfil em L em planta' },
      { nome: 'puxador', forma: 'barra de aço escovado de 486 por 48 mm (y 493 a 541) no rasgo da porta, fundo reto em z 309 e frente em arco facetado até z 352,7 no centro', tecnica: 'uma extrusão em y de um polígono de planta (x, z)' },
      { nome: 'borracha', forma: 'tira preta de 504 por 10 por 30 mm, de y 43 a 53, com a frente em z 315', tecnica: 'cubo entre o rodapé e a porta' },
      { nome: 'botaoQuadradoEsq', forma: 'botão quadrado de 19 por 14 por 3 mm, chanfro de 1,2 mm, em x -89 e y 582,5', tecnica: 'chamferBox assentado na face da frente do painel' },
      { nome: 'botaoQuadradoDir', forma: 'botão quadrado de 19 por 14 por 3 mm, chanfro de 1,2 mm, em x -63 e y 582,5', tecnica: 'chamferBox assentado na face da frente do painel' },
      { nome: 'botaoLiga', forma: 'botão redondo de 16 mm de diâmetro e 3 mm de altura, em x 72 e y 582,5', tecnica: 'cilindro de eixo z assentado na face da frente do painel' },
      { nome: 'pontoEsq', forma: 'ponto de 2,4 mm de diâmetro e 1,5 mm de altura, em x -89 e y 601', tecnica: 'cilindro de eixo z assentado na face da frente do painel' },
      { nome: 'pontoEtapa1', forma: 'ponto de 2,4 mm de diâmetro e 1,5 mm de altura, em x -18 e y 571', tecnica: 'cilindro de eixo z assentado na face da frente do painel' },
      { nome: 'pontoEtapa2', forma: 'ponto de 2,4 mm de diâmetro e 1,5 mm de altura, em x 4,5 e y 571', tecnica: 'cilindro de eixo z assentado na face da frente do painel' },
      { nome: 'pontoEtapa3', forma: 'ponto de 2,4 mm de diâmetro e 1,5 mm de altura, em x 27 e y 571', tecnica: 'cilindro de eixo z assentado na face da frente do painel' },
    ],
    criteriosDeReprovacao: [
      'o conjunto não mede 520 por 640 por 677,7 mm, ou não toca o chão pelo rodapé e pela caixa',
      'a frente da porta, do painel, do rodapé e da borracha não fica no mesmo plano z',
      'o painel não fica sobre a porta sem folga, ou a borracha não fica entre a porta e o rodapé sem folga ou entrada',
      'uma pecinha não encosta na lateral da caixa e no rodapé, ou as duas não são espelho uma da outra',
      'um botão ou ponto não assenta na face da frente do painel',
      'o puxador não é um polígono de fundo reto e frente em arco facetado, dentro do rasgo da porta, com o centro a z 352,7',
      'o topo da caixa e o painel não formam um contorno arredondado contínuo nas laterais',
      'um lado do aparelho difere do outro em medida ou posição de peça simétrica',
    ],
  },
  contatos: CONTATOS,
  PONTOS: pontosDeclarados(TABELA),
  ALIASES,
  PASSOS,
};

export default receita;
