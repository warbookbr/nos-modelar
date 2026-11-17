/* outros-encapsulamentos.js — os passos dos encapsulamentos da fatia 2 da família `componente-eletronico`: o capacitor cerâmico
   de disco, o LED de 3 e 5 mm, o TO-92, o SOIC, o borne de parafuso de 2 e 3 vias, o jack de alimentação, o módulo de placa e o
   dissipador do TO-220.

   Cada construtor recebe o construtor de passos `c` de `composicoes.js` e os parâmetros `q` em milímetro, no mesmo referencial
   dos outros encapsulamentos (y = 0 na face de cima da placa, os terminais descendo até -pernaAbaixoDaPlaca, o centro dos furos
   em x = z = 0, o eixo longo em x). As medidas fixas e a fonte de cada uma estão em `geometria.js`; as que a receita escolhe,
   com faixa e padrão, em `familia.json`. O dissipador fica no referencial do TO-220: com os mesmos parâmetros, a face de
   montagem dele encosta nas costas da aba, e o furo dele fica no x do furo da aba. */
import {
  BORNE, DISCO, DISSIPADOR, JACK, LADOS_DO_FIO, LED, MODULO, PASSO_DE_PINO, SOIC, TO92, comprimentoDoSoic, contornoDoFlange,
  contornoDoTo92, perfilDoDisco, perfilDoLed, pontosDoTerminalDoDisco,
} from './geometria.js';

const metro = (mm) => Number((mm * 0.001).toPrecision(12));

/* um cilindro em pé (revolução em y) de raio `r` entre as alturas `de` e `ate`, com os nomes dos argumentos */
function cilindro(c, nome, { r, de, ate, em, lados }) {
  const raio = c.mm(`raio${nome}`, r);
  const base = c.mm(`base${nome}`, de);
  const topo = c.mm(`topo${nome}`, ate);
  return c.primitiva('lathe', { perfil: [[0, base], [raio, base], [raio, topo], [0, topo]], lados, em: c.vetor(`posicao${nome}`, em) });
}

/* ---------- capacitor cerâmico de disco ---------- */
function ceramicoDeDisco(c, q) {
  const D = q.diametroDoDisco;
  const centro = q.afastamentoDoDisco + D / 2;
  const disco = c.primitiva('lathe', {
    perfil: perfilDoDisco(D, q.espessuraDoDisco).map((ponto, k) => c.ponto2(`perfilDoDisco${k}`, ponto)),
    lados: DISCO.lados, eixo: 'z', em: c.vetor('centroDoDisco', [0, centro, 0]),
  });
  const medidas = { diametro: D, passo: q.passoDoDisco, centro, perna: q.pernaAbaixoDaPlaca };
  const terminais = [-1, 1].map((sinal) => {
    const nome = sinal < 0 ? 'Esquerdo' : 'Direito';
    return c.primitiva('friso', {
      linha: { nome: `terminal-${nome.toLowerCase()}`, pontos: pontosDoTerminalDoDisco(medidas, sinal).map((ponto, k) => c.vetor(`terminal${nome}${k}`, ponto)) },
      perfil: { circulo: { raio: c.mm('raioDoFio', q.diametroDoFio / 2) } }, normal: [0, 0, 1], segmentosArco: LADOS_DO_FIO,
    });
  });
  c.elemento('corpo', 'materialDoCorpo', disco);
  terminais.forEach((terminal) => c.elemento('terminal', 'materialDoTerminal', terminal));
}

/* ---------- LED ---------- */
function led(c, q) {
  const yb = q.afastamentoDoLED;
  const R = q.diametroDoLED / 2;
  const lente = c.primitiva('lathe', {
    perfil: perfilDoLed(q.diametroDoLED, q.diametroDaBordaDoLED, q.alturaDoLED).map((ponto, k) => c.ponto2(`perfilDoLed${k}`, ponto)),
    lados: LED.lados, em: c.vetor('baseDoLed', [0, yb, 0]),
  });
  /* o chanfro da borda do lado do catodo (-x): tira a borda de fora do corpo, a 0,05 mm dele */
  const largura = q.diametroDaBordaDoLED / 2 - R - LED.chanfro + 0.5;
  const corte = c.primitiva('cubo', {
    larg: c.mm('larguraDoChanfro', largura), alt: metro(LED.espessuraDaBorda + 0.2), prof: c.mm('profundidadeDoChanfro', q.diametroDaBordaDoLED + 1),
    em: c.vetor('posicaoDoChanfro', [-(R + LED.chanfro) - largura / 2, yb - 0.1, 0]),
  });
  const corpo = c.primitiva('subtrair', { solidos: [lente, corte] });
  const terminais = [-1, 1].map((sinal) => c.primitiva('cubo', {
    larg: metro(LED.ladoDoTerminal), alt: c.mm('alturaDoTerminal', q.pernaAbaixoDaPlaca + yb + LED.entrada), prof: metro(LED.ladoDoTerminal),
    em: c.vetor(sinal < 0 ? 'terminalDoCatodo' : 'terminalDoAnodo', [sinal * PASSO_DE_PINO / 2, -q.pernaAbaixoDaPlaca, 0]),
  }));
  c.elemento('corpo', 'materialDoCorpo', corpo);
  terminais.forEach((terminal) => c.elemento('terminal', 'materialDoTerminal', terminal));
}

/* ---------- TO-92 ---------- */
function to92(c, q) {
  const yb = q.afastamentoDoTO92;
  const T = TO92;
  const corpo = c.primitiva('extrusao', {
    perfil: contornoDoTo92(q.larguraDoTO92, q.espessuraDoTO92).map((ponto, k) => c.ponto2(`contornoDoCorpo${k}`, ponto)),
    altura: c.mm('alturaDoCorpo', q.alturaDoTO92), em: c.vetor('baseDoCorpo', [0, yb, 0]),
  });
  const meio = c.primitiva('cubo', {
    larg: metro(T.terminalX), alt: c.mm('alturaDoTerminalDoMeio', q.pernaAbaixoDaPlaca + yb + T.entrada), prof: metro(T.terminalZ),
    em: c.vetor('terminalDoMeio', [0, -q.pernaAbaixoDaPlaca, 0]),
  });
  /* os de fora saem do corpo no passo de 1,27 e dobram a 45 graus até o passo de 2,54 da placa */
  const yDobra = yb - T.dobra;
  const fora = [-1, 1].map((sinal) => {
    const nome = sinal < 0 ? 'Esquerdo' : 'Direito';
    const pontos = [
      [sinal * T.saida, yb + T.entrada, 0], [sinal * T.saida, yDobra, 0],
      [sinal * T.passoNaPlaca, yDobra - (T.passoNaPlaca - T.saida), 0], [sinal * T.passoNaPlaca, -q.pernaAbaixoDaPlaca, 0],
    ];
    return c.primitiva('friso', {
      linha: { nome: `terminal-${nome.toLowerCase()}`, pontos: pontos.map((ponto, k) => c.vetor(`terminal${nome}${k}`, ponto)) },
      perfil: { retangulo: { largura: metro(T.terminalX), profundidade: metro(T.terminalZ) } }, normal: [0, 0, 1],
    });
  });
  c.elemento('corpo', 'materialDoCorpo', corpo);
  [meio, ...fora].forEach((terminal) => c.elemento('terminal', 'materialDoTerminal', terminal));
}

/* ---------- SOIC ---------- */
function soic(c, q) {
  const S = SOIC;
  const n = q.pinosPorLadoDoSOIC;
  const L = comprimentoDoSoic(n, q.margemDoCorpoDoSOIC);
  const E = q.larguraDoCorpoDoSOIC;
  const total = q.larguraTotalDoSOIC;
  const hb = q.alturaDoSOIC - S.afastamento;
  const bloco = c.primitiva('chamferBox', {
    larg: c.mm('comprimentoDoCorpo', L), alt: c.mm('alturaDoCorpo', hb), prof: c.mm('larguraDoCorpo', E), chanfro: metro(S.chanfro),
    em: [0, metro(S.afastamento), 0],
  });
  const marca = c.primitiva('lathe', {
    perfil: [[0, 0], [metro(S.marca.raio), 0], [metro(S.marca.raio), 0.001], [0, 0.001]], lados: S.ladosDaMarca,
    em: c.vetor('posicaoDaMarca', [-L / 2 + S.marca.recuo, q.alturaDoSOIC - S.marca.profundidade, E / 2 - S.marca.recuo]),
  });
  const corpo = c.primitiva('subtrair', { solidos: [bloco, marca] });
  /* o terminal em asa de gaivota: sai do meio da altura do corpo, desce e deita o pé na placa até a largura total */
  const x0 = -((n - 1) * S.passo) / 2;
  const e = S.espessuraDoTerminal;
  const ySaida = S.afastamento + hb / 2 - e / 2;
  const zDobra = total / 2 - S.pe;
  const zDentro = E / 2 - S.entrada;
  const lados = [1, -1].map((sinal) => {
    const nome = sinal > 0 ? 'Frente' : 'Tras';
    const saida = c.primitiva('cubo', {
      larg: metro(S.larguraDoTerminal), alt: metro(e), prof: c.mm('vaoDaSaida', zDobra + e / 2 - zDentro),
      em: c.vetor(`saida${nome}`, [x0, ySaida, sinal * (zDentro + zDobra + e / 2) / 2]),
    });
    const descida = c.primitiva('cubo', {
      larg: metro(S.larguraDoTerminal), alt: c.mm('alturaDaDescida', ySaida + e), prof: metro(e),
      em: c.vetor(`descida${nome}`, [x0, 0, sinal * zDobra]),
    });
    const pe = c.primitiva('cubo', {
      larg: metro(S.larguraDoTerminal), alt: metro(e), prof: c.mm('comprimentoDoPe', total / 2 - zDobra + e / 2),
      em: c.vetor(`pe${nome}`, [x0, 0, sinal * (total / 2 + zDobra - e / 2) / 2]),
    });
    const pino = c.primitiva('unir', { solidos: [saida, descida, pe] });
    return [pino, c.copias(pino, { total: c.valor('pinosPorLado', n), d: [metro(S.passo), 0, 0] })];
  });
  c.elemento('corpo', 'materialDoCorpo', corpo);
  for (const [pino, outros] of lados) {
    c.elemento('pino', 'materialDoTerminal', pino);
    c.elemento('pino', 'materialDoTerminal', outros);
  }
}

/* ---------- borne de parafuso ---------- */
function borne(c, q, { vias }) {
  const B = BORNE;
  const zFrente = B.profundidade - B.pinoATras;
  const bloco = c.primitiva('chamferBox', {
    larg: metro(vias * B.passo), alt: metro(B.altura), prof: metro(B.profundidade), chanfro: metro(B.chanfro),
    em: [0, 0, metro((zFrente - B.pinoATras) / 2)],
  });
  const xs = Array.from({ length: vias }, (_, k) => (k - (vias - 1) / 2) * B.passo);
  const bocas = xs.map((x) => c.primitiva('cubo', {
    larg: metro(B.boca.largura), alt: metro(B.boca.ate - B.boca.de), prof: metro(zFrente + 0.5),
    em: [metro(x), metro(B.boca.de), metro((zFrente + 0.5) / 2)],
  }));
  const pocos = xs.map((x, k) => cilindro(c, `DoPoco${k}`, { r: B.poco.raio, de: B.altura - B.poco.fundo, ate: B.altura + 0.5, em: [x, 0, 0], lados: B.lados }));
  const corpo = c.primitiva('subtrair', { solidos: [bloco, ...bocas, ...pocos] });
  const parafusos = xs.map((x, k) => {
    const topo = B.altura - B.parafuso.recuo;
    const cabeca = cilindro(c, `DoParafuso${k}`, { r: B.parafuso.raio, de: B.altura - B.poco.fundo - 0.2, ate: topo, em: [x, 0, 0], lados: B.lados });
    const fenda = c.primitiva('cubo', {
      larg: metro(2 * B.parafuso.raio + 0.4), alt: metro(1), prof: metro(B.parafuso.fenda), em: [metro(x), metro(topo - 0.5), 0],
    });
    return c.primitiva('subtrair', { solidos: [cabeca, fenda] });
  });
  const pinos = xs.map((x) => c.primitiva('cubo', {
    larg: metro(B.pino), alt: c.mm('alturaDoPino', q.pernaAbaixoDaPlaca + B.entrada), prof: metro(B.pino),
    em: [metro(x), c.mm('baseDoPino', -q.pernaAbaixoDaPlaca), 0],
  }));
  c.elemento('corpo', 'materialDoCorpo', corpo);
  parafusos.forEach((parafuso) => c.elemento('parafuso', 'materialDoParafuso', parafuso));
  pinos.forEach((pino) => c.elemento('terminal', 'materialDoTerminal', pino));
}

/* ---------- jack de alimentação ---------- */
function jack(c, q) {
  const J = JACK;
  const xFrente = -J.frente;
  const bloco = c.primitiva('chamferBox', {
    larg: metro(J.comprimento), alt: metro(J.altura), prof: metro(J.largura), chanfro: metro(J.chanfro),
    em: [metro(xFrente + J.comprimento / 2), 0, 0],
  });
  /* a boca do plugue, revolução em x a partir da frente, e o pino central no fundo dela */
  const boca = c.primitiva('lathe', {
    perfil: [[0, 0], [metro(J.boca / 2), 0], [metro(J.boca / 2), metro(J.insercao + 0.5)], [0, metro(J.insercao + 0.5)]],
    lados: J.lados, eixo: 'x', em: [metro(xFrente - 0.5), metro(J.alturaDaBoca), 0],
  });
  const corpo = c.primitiva('subtrair', { solidos: [bloco, boca] });
  const pino = c.primitiva('lathe', {
    perfil: [[0, 0], [metro(J.pino / 2), 0], [metro(J.pino / 2), metro(J.insercao - J.recuoDoPino + 0.5)], [0, metro(J.insercao - J.recuoDoPino + 0.5)]],
    lados: J.lados, eixo: 'x', em: [metro(xFrente + J.recuoDoPino), metro(J.alturaDaBoca), 0],
  });
  /* as lâminas: as do pino e da luva atravessadas no eixo, a da chave na lateral, subindo pela parede do corpo */
  const laminas = J.terminais.map((daFrente) => c.primitiva('cubo', {
    larg: metro(J.espessuraDaLamina), alt: c.mm('alturaDaLamina', q.pernaAbaixoDaPlaca + J.entrada), prof: metro(J.lamina),
    em: [metro(xFrente + daFrente), c.mm('baseDaLamina', -q.pernaAbaixoDaPlaca), 0],
  }));
  const lateral = c.primitiva('cubo', {
    larg: metro(J.lamina), alt: c.mm('alturaDaLateral', q.pernaAbaixoDaPlaca + J.alturaDoLateral), prof: metro(J.espessuraDaLamina),
    em: [0, c.mm('baseDaLamina', -q.pernaAbaixoDaPlaca), metro(J.lateral)],
  });
  c.elemento('corpo', 'materialDoCorpo', corpo);
  c.elemento('pino', 'materialDoTerminal', pino);
  [...laminas, lateral].forEach((lamina) => c.elemento('terminal', 'materialDoTerminal', lamina));
}

/* ---------- módulo de placa ---------- */
function modulo(c, q) {
  const M = MODULO;
  const n = q.pinosPorFileiraDoModulo;
  const f = q.fileiraDoModulo;
  const hs = q.alturaDoEspacadorDoModulo;
  const L = n * PASSO_DE_PINO;
  const placa = c.primitiva('chamferBox', {
    larg: c.mm('comprimentoDaPlaca', L), alt: metro(M.espessuraDaPlaca), prof: c.mm('larguraDaPlaca', f + PASSO_DE_PINO), chanfro: metro(M.chanfro),
    em: c.vetor('baseDaPlaca', [0, hs, 0]),
  });
  const zs = [-f / 2, f / 2];
  const barras = zs.map((z, k) => c.primitiva('chamferBox', {
    larg: c.mm('comprimentoDaPlaca', L), alt: c.mm('alturaDoEspacador', hs), prof: metro(PASSO_DE_PINO), chanfro: metro(M.chanfro),
    em: c.vetor(`barra${k}`, [0, 0, z]),
  }));
  const x0 = -((n - 1) * PASSO_DE_PINO) / 2;
  const pinos = zs.map((z, k) => {
    const pino = c.primitiva('chamferBox', {
      larg: metro(M.pino), alt: c.mm('comprimentoDoPino', q.pernaAbaixoDaPlaca + hs + M.espessuraDaPlaca + M.acimaDaPlaca), prof: metro(M.pino),
      chanfro: metro(M.chanfroDoPino), em: c.vetor(`pino${k}`, [x0, -q.pernaAbaixoDaPlaca, z]),
    });
    return [pino, c.copias(pino, { total: c.valor('pinosPorFileira', n), d: [metro(PASSO_DE_PINO), 0, 0] })];
  });
  const chip = c.primitiva('chamferBox', {
    larg: c.mm('comprimentoDoChip', q.comprimentoDoChipDoModulo), alt: c.mm('alturaDoChip', q.alturaDoChipDoModulo),
    prof: c.mm('larguraDoChip', q.larguraDoChipDoModulo), chanfro: metro(0.1),
    em: c.vetor('baseDoChip', [q.deslocamentoDoChipDoModulo, hs + M.espessuraDaPlaca, 0]),
  });
  c.elemento('placa-filha', 'materialDaPlaca', placa);
  barras.forEach((barra) => c.elemento('base', 'materialDoCorpo', barra));
  for (const grupo of pinos) for (const sel of grupo) c.elemento('pino', 'materialDoTerminal', sel);
  c.elemento('chip', 'materialDoChip', chip);
}

/* ---------- dissipador do TO-220 ---------- */
function dissipador(c, q) {
  const D = DISSIPADOR;
  const W = q.larguraDoDissipador;
  const H = q.alturaDoDissipador;
  const t = q.espessuraDaChapaDoDissipador;
  const face = -q.espessuraDoTO220 / 2;
  /* a chapa de trás, com o furo do parafuso da aba; extrudada em z (na extrusão em z o eixo v do perfil é -y) */
  const chapa = c.primitiva('extrusao', {
    perfil: { retangulo: { largura: c.mm('larguraDoDissipador', W), profundidade: c.mm('alturaDoDissipador', H), centro: [0, c.mm('centroDaChapaV', -H / 2)] } },
    furos: [{ circulo: { raio: metro(D.furo / 2), centro: [0, c.mm('centroDoFuroV', -q.alturaDoFuroDoDissipador)] } }],
    altura: c.mm('espessuraDaChapa', t), eixo: 'z', em: c.vetor('costasDaChapa', [0, 0, face - t]), segmentosArco: 4,
  });
  /* os dois flanges com as fendas, extrudados em x (na extrusão em x o eixo u do perfil é -y e o v é z) */
  const contorno = contornoDoFlange(H, face - q.profundidadeDoDissipador, face - t + D.sobreposicao);
  const flanges = [-1, 1].map((sinal) => c.primitiva('extrusao', {
    perfil: contorno.map((ponto, k) => c.ponto2(`contornoDoFlange${k}`, ponto)),
    altura: c.mm('espessuraDaChapa', t), eixo: 'x', em: c.vetor(sinal < 0 ? 'flangeEsquerdo' : 'flangeDireito', [sinal < 0 ? -W / 2 : W / 2 - t, 0, 0]),
  }));
  const aletas = [-1, 1].map((sinal) => c.primitiva('cubo', {
    larg: metro(D.aleta.espessura), alt: c.mm('alturaDaAleta', q.pernaAbaixoDaPlaca + D.entrada), prof: metro(D.aleta.largura),
    em: c.vetor(sinal < 0 ? 'aletaEsquerda' : 'aletaDireita', [sinal * (W / 2 - t / 2), -q.pernaAbaixoDaPlaca, face - D.aleta.daFace]),
  }));
  [chapa, ...flanges].forEach((peca) => c.elemento('corpo', 'materialDoCorpo', peca));
  aletas.forEach((aleta) => c.elemento('terminal', 'materialDoTerminal', aleta));
}

/** Os construtores pelo tipo de encapsulamento de `ENCAPSULAMENTOS`. */
export const CONSTRUTORES_DE_ENCAPSULAMENTO = Object.freeze({
  'ceramico-de-disco': ceramicoDeDisco, led, 'to-92': to92, soic, 'borne-de-parafuso': borne, 'jack-de-alimentacao': jack,
  'modulo-de-placa': modulo, 'dissipador-to-220': dissipador,
});
