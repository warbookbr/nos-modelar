/* composicoes.js — as composições procedurais da família `aparelho-de-caixa`, geradas por laço porque a quantidade de botões,
   a presença do painel, do visor e o tipo de puxador mudam a quantidade de passos e a composição v1 só substitui valores.

   Uma composição por combinação (painel, botões giratórios, botões de pressão, puxador, visor): `planoDoAparelho` monta os
   passos e os argumentos dela a partir da geometria em milímetro, e é a mesma função que o `derivar` chama com os
   parâmetros da chamada, de modo que os nomes dos argumentos (e portanto o que a composição declara) saem do mesmo código.
   Cada peça do aparelho é um sólido com parte própria (corpo, porta, vidro, grelha, painel, botão, indicador, puxador, pé),
   e os sólidos se fundem numa peça só no fim. Os que não se tocam (o vidro, dentro do furo da porta) continuam como sólidos
   separados, e cada face leva o nome da parte que a criou. O id de origem de cada passo é um número sequencial na composição. */
import { FORMATO_COMPOSICAO_PROCEDURAL } from '../../nucleo/entrada.js';
import {
  ALTURA_DA_SAIA, ALTURA_DO_BOTAO_DE_PRESSAO, ALTURA_DO_GIRATORIO, ALTURA_DO_PUXADOR, CHANFRO_DA_PORTA, ESPESSURA_DA_GRELHA,
  ESPESSURA_DO_INDICADOR, ESPESSURA_DO_VIDRO, FOLGA_DO_VIDRO, LADOS_DO_BOTAO, LADOS_DO_PE, PROFUNDIDADE_DO_PUXADOR,
  PROFUNDIDADE_DO_SUPORTE, RAIO_DO_BOTAO_DE_PRESSAO, RAIO_DO_GIRATORIO, RAIO_DO_PE, RECUO_DO_PAINEL, RECUO_DO_PE,
  RECUO_DO_PUXADOR_EM_CIMA, SAIA_DO_GIRATORIO, SUPORTE_DO_PUXADOR, VAO_DA_GRELHA, geometriaDoAparelho, posicaoDoBotao,
} from './geometria.js';

const MALHA = 'mecanifica.malha-poligonal@1';
const PARTE = 'mecanifica.parte@1';
const MM = 0.001;
/* por quarto de volta: as quinas arredondadas do corpo e da cavidade. Com 6, a face de cima tem triângulos de leque de menos de
   1 mm² junto da origem do leque, e o exportador reprova a face por área; com 3 (30° por trecho) os triângulos passam de 1 mm² */
const SEGMENTOS_DO_CANTO = 3;
const metro = (mm) => Number((mm * MM).toPrecision(12));
const p = (nome) => ({ parametro: nome });

/* Os botões ficam em 1 a 4 giratórios (todo aparelho tem ao menos um comando) e 0 a 2 de pressão; o painel, em 1 (à direita)
   ou 2 (em cima). Sem painel não há botão, e o painel é a faixa onde os botões ficam. */
export const FAIXA_DE_BOTOES = Object.freeze({ giratorios: { minimo: 1, maximo: 4 }, pressao: { minimo: 0, maximo: 2 } });

export const idDoAparelho = ({ painel, giratorios, pressao, puxador, visor }) =>
  `aparelho-de-caixa.p${painel}-g${giratorios}-b${pressao}-t${puxador}-v${visor}`;

/** As combinações que a família chama: todo ponto tem painel e ao menos um botão giratório; porta e visor são sempre da frente. */
export function combinacoes() {
  const lista = [];
  for (let painel = 1; painel <= 2; painel += 1) {
    for (let giratorios = FAIXA_DE_BOTOES.giratorios.minimo; giratorios <= FAIXA_DE_BOTOES.giratorios.maximo; giratorios += 1) {
      for (let pressao = FAIXA_DE_BOTOES.pressao.minimo; pressao <= FAIXA_DE_BOTOES.pressao.maximo; pressao += 1) {
        for (let puxador = 1; puxador <= 2; puxador += 1) {
          for (let visor = 0; visor <= 1; visor += 1) {
            lista.push({ painel, giratorios, pressao, puxador, visor });
          }
        }
      }
    }
  }
  return lista;
}

/**
 * Os passos e os argumentos de uma combinação, com a geometria `g` em milímetro. Cada valor que depende dos parâmetros vira um
 * argumento com nome; os que não dependem (as constantes de construção) entram como literal.
 */
export function planoDoAparelho(combo, g) {
  const args = {};
  const nos = [];
  let ultimo = 0;
  const valor = (nome, v) => { args[nome] = v; return p(nome); };
  const mm = (nome, x) => valor(nome, metro(x));
  const vetor = (nome, [x, y, z]) => valor(nome, [metro(x), metro(y), metro(z)]);
  const ref = (op, id) => ({ origem: { op, id } });
  const novoId = () => { ultimo += 1; return ultimo; };
  const primitiva = (op, argumentos) => {
    const id = novoId();
    nos.push({ id: `no-${id}`, operacao: op, argumentos: { origemId: id, ...argumentos } });
    return ref(op, id);
  };
  const operacao = primitiva;
  const passo = (id, operacaoNome, argumentos) => nos.push({ id, operacao: operacaoNome, argumentos });
  let parte = 0;
  const nomear = (nome, sel) => { parte += 1; passo(`parte-${parte}`, 'parte', { nome, sel }); };

  /* o corpo: uma extrusão de retângulo de quinas arredondadas, de y = pés até o topo, menos a cavidade, que sai pela frente
     e deixa a parede de cada lado. As quinas são as arestas verticais; as de cima e de baixo ficam vivas */
  const corpo = primitiva('extrusao', {
    perfil: { retangulo: { largura: mm('larguraDoCorpo', g.W), profundidade: mm('profundidadeDoCorpo', g.D), cantos: mm('raioDoCorpo', g.raio) } },
    altura: mm('alturaDoCorpo', g.H - g.pes), em: vetor('posicaoDoCorpo', [0, g.pes, 0]), segmentosArco: SEGMENTOS_DO_CANTO,
  });
  /* a cavidade é um retângulo de quinas de raio (raio do corpo menos a parede), com as quinas de trás concêntricas às de fora,
     para a parede de trás e as laterais terem a mesma espessura. Ela passa `raio` além da face da frente, e as quinas da frente
     ficam inteiras fora do corpo: a parede lateral só cruza a quina externa, e não há cantos internos dentro da parede */
  const cavidade = primitiva('extrusao', {
    perfil: { retangulo: { largura: mm('larguraDaCavidade', g.W - 2 * g.parede), profundidade: mm('profundidadeDaCavidade', g.D + g.raio - g.parede), cantos: mm('raioDaCavidade', Math.max(g.raio - g.parede, 0.5)) } },
    altura: mm('alturaDaCavidade', g.H - g.pes - 2 * g.parede), em: vetor('posicaoDaCavidade', [0, g.pes + g.parede, (g.raio + g.parede) / 2]), segmentosArco: SEGMENTOS_DO_CANTO,
  });
  const corpoOco = operacao('subtrair', { solidos: [corpo, cavidade] });
  nomear('corpo', corpoOco);

  /* os pés: quatro cilindros curtos sob os cantos, que entram no corpo 1,5 mm. São de revolução (`lathe`) e não `cilindro`,
     porque a seleção de um cilindro inteiro não leva as tampas, e um sólido sem tampa não se une. A altura visível é a dos
     pés, de 8 a 15 mm, porque o corpo começa em y = pés. */
  const pesDoCorpo = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], k) => {
    const alturaDoPe = valor('alturaDoPe', metro(g.pes + 1.5));
    const pe = primitiva('lathe', {
      perfil: [[0, 0], [metro(RAIO_DO_PE), 0], [metro(RAIO_DO_PE), alturaDoPe], [0, alturaDoPe]], lados: LADOS_DO_PE,
      em: vetor(`posicaoDoPe${k}`, [sx * (g.W / 2 - RECUO_DO_PE), 0, sz * (g.D / 2 - RECUO_DO_PE)]),
    });
    nomear('pes', pe);
    return pe;
  });

  /* a grelha: duas barras que atravessam a cavidade e se prendem às laterais, visíveis pelo visor */
  const grelha = g.visor ? g.grelhas.map((barra, j) => {
    const pe = primitiva('cubo', {
      larg: mm('larguraDaGrelha', g.W - 2 * g.parede + 2), alt: metro(VAO_DA_GRELHA), prof: metro(ESPESSURA_DA_GRELHA),
      em: vetor(`posicaoDaGrelha${j}`, [0, barra.yBase, 0]),
    });
    nomear('grelha', pe);
    return pe;
  }) : [];

  /* a porta: uma caixa de arestas chanfradas que fecha a frente, com o furo passante do visor cortado nela. O furo é a
     abertura e a moldura é a própria porta em volta dele; o vidro é outra peça, dentro desse furo */
  const porta = primitiva('chamferBox', {
    larg: mm('larguraDaPorta', g.Dx), alt: mm('alturaDaPorta', g.Dy), prof: mm('espessuraDaPortaComFolga', g.esp + 1),
    chanfro: metro(CHANFRO_DA_PORTA), em: vetor('posicaoDaPorta', [g.cx, g.y0, g.D / 2 - 1 + (g.esp + 1) / 2]),
  });
  let portaFechada = porta;
  let vidro = null;
  if (g.visor) {
    const janela = primitiva('cubo', {
      larg: mm('larguraDoVisor', g.Vw), alt: mm('alturaDoVisor', g.Vh), prof: mm('espessuraDoRecorte', g.esp + 4),
      em: vetor('posicaoDoVisor', [g.cx, g.vy0, g.D / 2 - 2 + (g.esp + 4) / 2]),
    });
    portaFechada = operacao('subtrair', { solidos: [porta, janela] });
    /* o vidro: uma placa fina, menor que o furo em folga de meio milímetro por lado, recuada `rec` da frente da porta. Sem
       contato com a porta, é um sólido à parte, com a parte `vidro` na exportação */
    vidro = primitiva('cubo', {
      larg: mm('larguraDoVidro', g.Vw - 2 * FOLGA_DO_VIDRO), alt: mm('alturaDoVidro', g.Vh - 2 * FOLGA_DO_VIDRO), prof: metro(ESPESSURA_DO_VIDRO),
      em: vetor('posicaoDoVidro', [g.cx, g.vy0 + FOLGA_DO_VIDRO, g.zF - g.rec - ESPESSURA_DO_VIDRO / 2]),
    });
    nomear('vidro', vidro);
  }
  nomear('porta', portaFechada);

  /* o painel de comando: uma placa na frente do corpo, à direita ou em cima */
  let painel = null;
  if (g.painel) {
    const m = g.painelMm;
    painel = primitiva('cubo', {
      larg: mm('larguraDoPainel', m.x1 - m.x0), alt: mm('alturaDoPainel', m.y1 - m.y0), prof: metro(RECUO_DO_PAINEL + 1),
      em: vetor('posicaoDoPainel', [(m.x0 + m.x1) / 2, m.y0, g.D / 2 + 1]),
    });
    nomear('painel', painel);
  }

  /* os botões: giratórios são cilindros deitados que saem do painel, com uma saia na base e um indicador no topo; de pressão
     são discos baixos. A saia é o próprio perfil de revolução (um degrau mais largo na base), e não um sólido a mais */
  const sairDoPainel = g.D / 2 + RECUO_DO_PAINEL - 1;
  const saidas = [];
  for (let i = 0; i < g.botoes; i += 1) {
    const [x, y] = posicaoDoBotao(g, i);
    const giratorio = i < g.giratorios;
    const raio = giratorio ? RAIO_DO_GIRATORIO : RAIO_DO_BOTAO_DE_PRESSAO;
    const altura = giratorio ? ALTURA_DO_GIRATORIO : ALTURA_DO_BOTAO_DE_PRESSAO;
    const perfil = giratorio
      ? [[0, 0], [metro(raio + SAIA_DO_GIRATORIO), 0], [metro(raio + SAIA_DO_GIRATORIO), metro(ALTURA_DA_SAIA)], [metro(raio), metro(ALTURA_DA_SAIA)], [metro(raio), metro(altura)], [0, metro(altura)]]
      : [[0, 0], [metro(raio), 0], [metro(raio), metro(altura)], [0, metro(altura)]];
    const cilindro = primitiva('lathe', { perfil, lados: LADOS_DO_BOTAO });
    passo(`girar-botao-${i}`, 'rotaciona', { eixo: 'x', graus: 90, pivo: [0, 0, 0], sel: cilindro });
    passo(`posicionar-botao-${i}`, 'transladar', { d: vetor(`posicaoDoBotao${i}`, [x, y, sairDoPainel]), sel: cilindro });
    nomear(giratorio ? 'botao' : 'botaoDePressao', cilindro);
    saidas.push(cilindro);
    if (giratorio) {
      /* o indicador é uma risca no topo do botão: a metade dele sai 1,5 mm do cilindro */
      const indicador = primitiva('cubo', {
        larg: metro(2.4), alt: metro(7), prof: metro(ESPESSURA_DO_INDICADOR),
        em: vetor(`posicaoDoIndicador${i}`, [x, y + 4, sairDoPainel + altura]),
      });
      nomear('indicador', indicador);
      saidas.push(indicador);
    }
  }

  /* o puxador: uma barra afastada da porta pelos suportes das pontas, na horizontal em cima ou na vertical na borda esquerda.
     A barra fica em `RECUO_DO_PUXADOR_DA_PORTA` da face, e cada suporte vai da face até a barra */
  const puxadores = [];
  if (g.puxador === 1) {
    const barra = primitiva('cubo', {
      larg: mm('larguraDoPuxador', g.faixaDoPuxadorHorizontal), alt: metro(ALTURA_DO_PUXADOR),
      prof: metro(PROFUNDIDADE_DO_PUXADOR), em: vetor('posicaoDoPuxador', [g.cx, g.y1 - RECUO_DO_PUXADOR_EM_CIMA, g.zDoPuxador]),
    });
    puxadores.push(barra);
    [-1, 1].forEach((sinal, j) => puxadores.push(primitiva('cubo', {
      larg: metro(SUPORTE_DO_PUXADOR), alt: metro(ALTURA_DO_PUXADOR - 2), prof: metro(PROFUNDIDADE_DO_SUPORTE),
      em: vetor(`posicaoDoSuporte${j}`, [g.cx + sinal * (g.faixaDoPuxadorHorizontal / 2 - SUPORTE_DO_PUXADOR), g.y1 - RECUO_DO_PUXADOR_EM_CIMA + 1, g.zDoSuporte]),
    })));
  } else if (g.puxador === 2) {
    const base = g.cy - g.alturaDoPuxadorVertical / 2;
    const barra = primitiva('cubo', {
      larg: metro(ALTURA_DO_PUXADOR), alt: mm('alturaDoPuxadorVertical', g.alturaDoPuxadorVertical),
      prof: metro(PROFUNDIDADE_DO_PUXADOR), em: vetor('posicaoDoPuxador', [g.xDoPuxadorVertical, base, g.zDoPuxador]),
    });
    puxadores.push(barra);
    [0, 1].forEach((j) => puxadores.push(primitiva('cubo', {
      larg: metro(SUPORTE_DO_PUXADOR), alt: metro(SUPORTE_DO_PUXADOR), prof: metro(PROFUNDIDADE_DO_SUPORTE),
      em: vetor(`posicaoDoSuporte${j}`, [g.xDoPuxadorVertical, j === 0 ? base + 1 : base + g.alturaDoPuxadorVertical - SUPORTE_DO_PUXADOR - 1, g.zDoSuporte]),
    })));
  }
  if (puxadores.length) nomear('puxador', puxadores[0]);
  puxadores.slice(1).forEach((pedaco) => nomear('puxador', pedaco));

  /* a união: os sólidos que se tocam viram uma peça; o vidro, que não toca a porta, sai como sólido à parte */
  const solidos = [corpoOco, portaFechada, ...grelha, ...pesDoCorpo, ...saidas, ...puxadores];
  if (vidro) solidos.push(vidro);
  if (painel) solidos.push(painel);
  const uniao = operacao('unir', { solidos });
  passo('solido-da-peca', 'solido', { sel: uniao });
  return { nos, argumentos: args };
}

/** Os parâmetros de uma composição: o nome de cada argumento e o tipo (vetor de três para os que são posição). */
const parametrosDe = (argumentos) => Object.fromEntries(Object.entries(argumentos).map(([nome, valor]) => [nome, { tipo: Array.isArray(valor) ? 'vetor3' : 'numero' }]));

function composicaoDe(combo) {
  /* a geometria de exemplo dá os nomes e os tipos; os valores não entram na composição */
  const exemplo = geometriaDoAparelho({
    largura: 480, altura: 290, profundidade: 380, alturaDosPes: 15, espessuraDaPorta: 22, recessoDoVidro: 5, parede: 2, faixaDoPainel: 80,
    raioDoCorpo: 8, painelDeComando: combo.painel, botoesGiratorios: combo.giratorios, botoesDePressao: combo.pressao, tipoDePuxador: combo.puxador, comVisor: combo.visor,
  });
  const { nos, argumentos } = planoDoAparelho(combo, exemplo);
  return Object.freeze({
    formato: FORMATO_COMPOSICAO_PROCEDURAL, id: idDoAparelho(combo), versao: '1.0.0', parametros: parametrosDe(argumentos),
    artefatos: { entra: [], sai: [MALHA, PARTE] }, nos,
  });
}

export const COMPOSICOES = Object.freeze(combinacoes().map(composicaoDe));
