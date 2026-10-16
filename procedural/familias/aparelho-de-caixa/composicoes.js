/* composicoes.js — as composições procedurais da família `aparelho-de-caixa`, geradas por laço porque a quantidade de botões,
   a presença do painel, do visor e o tipo de puxador mudam a quantidade de passos e a composição v1 só substitui valores.

   Uma composição por combinação (painel, botões giratórios, botões de pressão, puxador, visor): `planoDoAparelho` monta os
   passos e os argumentos dela a partir da geometria em milímetro, e é a mesma função que o `derivar` chama com os
   parâmetros da chamada, de modo que os nomes dos argumentos (e portanto o que a composição declara) saem do mesmo código.
   Cada peça do aparelho é um sólido com parte própria (corpo, porta, vidro, grelha, painel, botão, indicador, puxador, pé),
   e os sólidos se fundem numa peça só no fim. O id de origem de cada passo é um número sequencial dentro da composição. */
import { FORMATO_COMPOSICAO_PROCEDURAL } from '../../nucleo/entrada.js';
import {
  ALTURA_DO_BOTAO_DE_PRESSAO, ALTURA_DO_GIRATORIO, ALTURA_DO_PUXADOR, CHANFRO_DO_CORPO, ESPESSURA_DA_GRELHA,
  LADOS_DO_BOTAO, LADOS_DO_PE, PROFUNDIDADE_DO_PUXADOR, RAIO_DO_BOTAO_DE_PRESSAO, RAIO_DO_GIRATORIO, RAIO_DO_PE,
  RECUO_DO_PAINEL, RECUO_DO_PE, RECUO_DO_PUXADOR_EM_CIMA, SUPORTE_DO_PUXADOR, VAO_DA_GRELHA, geometriaDoAparelho, posicaoDoBotao,
} from './geometria.js';

const MALHA = 'mecanifica.malha-poligonal@1';
const PARTE = 'mecanifica.parte@1';
const MM = 0.001;
const metro = (mm) => Number((mm * MM).toPrecision(12));
const p = (nome) => ({ parametro: nome });

/* Os botões ficam em 0 a 4 giratórios e 0 a 2 de pressão; o painel, em 0 (sem), 1 (à direita) ou 2 (em cima). */
export const FAIXA_DE_BOTOES = Object.freeze({ giratorios: { minimo: 0, maximo: 4 }, pressao: { minimo: 0, maximo: 2 } });

export const idDoAparelho = ({ painel, giratorios, pressao, puxador, visor }) =>
  `aparelho-de-caixa.p${painel}-g${giratorios}-b${pressao}-t${puxador}-v${visor}`;

/** As combinações que a família chama. Sem painel não há botão, então a combinação só tem o painel 0 com botões 0. */
export function combinacoes() {
  const lista = [];
  for (let painel = 0; painel <= 2; painel += 1) {
    for (let giratorios = FAIXA_DE_BOTOES.giratorios.minimo; giratorios <= FAIXA_DE_BOTOES.giratorios.maximo; giratorios += 1) {
      for (let pressao = FAIXA_DE_BOTOES.pressao.minimo; pressao <= FAIXA_DE_BOTOES.pressao.maximo; pressao += 1) {
        for (let puxador = 0; puxador <= 2; puxador += 1) {
          for (let visor = 0; visor <= 1; visor += 1) {
            if (painel === 0 && (giratorios || pressao)) continue;
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

  /* o corpo: uma caixa chanfrada menos a cavidade, que sai pela frente e deixa a parede de cada lado */
  const corpo = primitiva('chamferBox', {
    larg: mm('larguraDoCorpo', g.W), alt: mm('alturaDoCorpo', g.H - g.pes), prof: mm('profundidadeDoCorpo', g.D),
    chanfro: metro(CHANFRO_DO_CORPO), em: vetor('posicaoDoCorpo', [0, g.pes, 0]),
  });
  const cavidade = primitiva('cubo', {
    larg: mm('larguraDaCavidade', g.W - 2 * g.parede), alt: mm('alturaDaCavidade', g.H - g.pes - 2 * g.parede),
    prof: mm('profundidadeDaCavidade', g.D - g.parede + 1), em: vetor('posicaoDaCavidade', [0, g.pes + g.parede, (g.parede + 1) / 2]),
  });
  const corpoOco = operacao('subtrair', { solidos: [corpo, cavidade] });
  nomear('corpo', corpoOco);

  /* os pés: quatro cilindros curtos sob os cantos, que entram no corpo 1 mm. São de revolução (`lathe`) e não `cilindro`,
     porque a seleção de um cilindro inteiro não leva as tampas, e um sólido sem tampa não se une */
  const pesDoCorpo = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], k) => {
    /* 1,5 mm acima do pé do corpo: entre o chanfro da base (1 mm) e a face de cima da cavidade (a parede, 2 mm ou mais), sem plano coincidente */
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

  /* a porta: uma caixa chanfrada que fecha a frente, com o visor cortado nela */
  const porta = primitiva('cubo', {
    larg: mm('larguraDaPorta', g.Dx), alt: mm('alturaDaPorta', g.Dy), prof: mm('espessuraDaPortaComFolga', g.esp + 1),
    em: vetor('posicaoDaPorta', [g.cx, g.y0, g.D / 2 - 1 + (g.esp + 1) / 2]),
  });
  let portaFechada = porta;
  let vidro = null;
  if (g.visor) {
    const janela = primitiva('cubo', {
      larg: mm('larguraDoVisor', g.Vw), alt: mm('alturaDoVisor', g.Vh), prof: mm('espessuraDoRecorte', g.esp + 4),
      em: vetor('posicaoDoVisor', [g.cx, g.vy0, g.D / 2 - 2 + (g.esp + 4) / 2]),
    });
    portaFechada = operacao('subtrair', { solidos: [porta, janela] });
    /* o vidro: uma placa que cobre o visor com 1 mm de sobra dentro da moldura, recuada dentro da espessura da porta */
    vidro = primitiva('cubo', {
      larg: mm('larguraDoVidro', g.Vw + 2), alt: mm('alturaDoVidro', g.Vh + 2), prof: metro(2),
      em: vetor('posicaoDoVidro', [g.cx, g.vy0 - 1, g.zF - g.rec - 1]),
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

  /* os botões: giratórios são cilindros deitados que saem do painel, com um indicador no topo; de pressão são discos baixos */
  const sairDoPainel = g.D / 2 + RECUO_DO_PAINEL - 1;
  const saidas = [];
  for (let i = 0; i < g.botoes; i += 1) {
    const [x, y] = posicaoDoBotao(g, i);
    const giratorio = i < g.giratorios;
    const raio = giratorio ? RAIO_DO_GIRATORIO : RAIO_DO_BOTAO_DE_PRESSAO;
    const altura = giratorio ? ALTURA_DO_GIRATORIO : ALTURA_DO_BOTAO_DE_PRESSAO;
    const cilindro = primitiva('lathe', { perfil: [[0, 0], [metro(raio), 0], [metro(raio), metro(altura)], [0, metro(altura)]], lados: LADOS_DO_BOTAO });
    passo(`girar-botao-${i}`, 'rotaciona', { eixo: 'x', graus: 90, pivo: [0, 0, 0], sel: cilindro });
    passo(`posicionar-botao-${i}`, 'transladar', { d: vetor(`posicaoDoBotao${i}`, [x, y, sairDoPainel]), sel: cilindro });
    nomear(giratorio ? 'botao' : 'botaoDePressao', cilindro);
    saidas.push(cilindro);
    if (giratorio) {
      const indicador = primitiva('cubo', {
        larg: metro(2.4), alt: metro(7), prof: metro(2),
        em: vetor(`posicaoDoIndicador${i}`, [x, y + 4, sairDoPainel + altura]),
      });
      nomear('indicador', indicador);
      saidas.push(indicador);
    }
  }

  /* o puxador: uma barra com dois suportes presos à porta, na horizontal em cima ou na vertical na borda esquerda */
  const puxadores = [];
  if (g.puxador === 1) {
    const barra = primitiva('cubo', {
      larg: mm('larguraDoPuxador', g.faixaDoPuxadorHorizontal), alt: metro(ALTURA_DO_PUXADOR),
      prof: metro(PROFUNDIDADE_DO_PUXADOR), em: vetor('posicaoDoPuxador', [g.cx, g.y1 - RECUO_DO_PUXADOR_EM_CIMA, g.zF + 12]),
    });
    puxadores.push(barra);
    [-1, 1].forEach((sinal, j) => puxadores.push(primitiva('cubo', {
      larg: metro(SUPORTE_DO_PUXADOR), alt: metro(ALTURA_DO_PUXADOR - 2), prof: metro(9),
      em: vetor(`posicaoDoSuporte${j}`, [g.cx + sinal * (g.faixaDoPuxadorHorizontal / 2 - SUPORTE_DO_PUXADOR), g.y1 - RECUO_DO_PUXADOR_EM_CIMA + 1, g.zF + 3.5]),
    })));
  } else if (g.puxador === 2) {
    const base = g.cy - g.alturaDoPuxadorVertical / 2;
    const barra = primitiva('cubo', {
      larg: metro(ALTURA_DO_PUXADOR), alt: mm('alturaDoPuxadorVertical', g.alturaDoPuxadorVertical),
      prof: metro(PROFUNDIDADE_DO_PUXADOR), em: vetor('posicaoDoPuxador', [g.xDoPuxadorVertical, base, g.zF + 12]),
    });
    puxadores.push(barra);
    [0, 1].forEach((j) => puxadores.push(primitiva('cubo', {
      larg: metro(SUPORTE_DO_PUXADOR), alt: metro(SUPORTE_DO_PUXADOR), prof: metro(9),
      em: vetor(`posicaoDoSuporte${j}`, [g.xDoPuxadorVertical, j === 0 ? base + 1 : base + g.alturaDoPuxadorVertical - SUPORTE_DO_PUXADOR - 1, g.zF + 3.5]),
    })));
  }
  if (puxadores.length) nomear('puxador', puxadores[0]);
  puxadores.slice(1).forEach((pedaco) => nomear('puxador', pedaco));

  /* a união: todos os sólidos viram uma peça, e a superfície dela é a da peça */
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
    painelDeComando: combo.painel, botoesGiratorios: combo.giratorios, botoesDePressao: combo.pressao, tipoDePuxador: combo.puxador, comVisor: combo.visor,
  });
  const { nos, argumentos } = planoDoAparelho(combo, exemplo);
  return Object.freeze({
    formato: FORMATO_COMPOSICAO_PROCEDURAL, id: idDoAparelho(combo), versao: '1.0.0', parametros: parametrosDe(argumentos),
    artefatos: { entra: [], sai: [MALHA, PARTE] }, nos,
  });
}

export const COMPOSICOES = Object.freeze(combinacoes().map(composicaoDe));
