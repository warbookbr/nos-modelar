/* perfis.js — os perfis [raio, altura, concordância] em milímetro da família `peca-de-revolucao`, e a casca que os fecha.

   Convenção de todos os perfis: o raio é a distância ao eixo de revolução (y), a altura é y, e o terceiro número, opcional, é o
   raio de concordância do canto (0 é canto vivo). Um contorno percorre de baixo para cima e de dentro para fora, com a parede à
   ESQUERDA de quem anda: no copo, o contorno de fora sobe pela parede e a parede de dentro fica do lado do eixo. É essa
   convenção que garante o sentido do deslocamento: `deslocarPerfil(pontos, d)` com d positivo leva cada ponto para a esquerda do
   sentido, e com d negativo para a direita (o prato percorre a face de cima, e a face de baixo fica à direita).

   `casca(externo, opcoes)` é a casca opcional: recebe só o contorno de fora e a espessura da parede, e devolve o contorno de dentro
   já ordenado para fechar a seção (a face de dentro nunca é escrita pelo chamador). O chamador junta `[...externo, ...interno]`.
   Cada função `perfilDo<Objeto>` monta a seção fechada de um objeto a partir dos parâmetros da família, que citam o objeto no nome
   (`copoAltura`) quando a medida só vale para ele e não têm prefixo quando valem para mais de um (`parede`, `raioBoca`). O que não
   é revolução (rosca da garrafa, recortes do pé do vaso, armação do abajur) não está aqui: continua na receita da peça. */

const GRAUS = Math.PI / 180;

/* Constantes de projeto herdadas das receitas aprovadas, com o nome do que são. */
export const PONTOS_DA_CUPULA_DA_GARRAFA = 6; /* amostras da cúpula do fundo, do centro ao anel de apoio */
export const PONTOS_DO_OMBRO_DA_GARRAFA = 10; /* amostras do quarto de elipse do ombro */
export const RAIO_DO_COLAR_DA_GARRAFA = 1; /* concordância dos dois cantos do colar */
export const AFINAMENTO_DO_COLAR_DA_GARRAFA = 2; /* o colar volta ao gargalo 2 mm acima do topo dele */
export const RAIO_MINIMO_DE_CONCORDANCIA = 0.05; /* concordância menor que isto vira canto vivo */

/** Os nomes das formas, na ordem do parâmetro `forma`. O nome é o da parte que a família publica. */
export const FORMAS = Object.freeze(['copo', 'garrafa', 'vaso', 'prato', 'base', 'haste', 'soquete', 'cupula']);

/**
 * Desloca uma polilinha [raio, altura, concordância] em `d` mm perpendicularmente ao sentido em que é percorrida: d positivo para
 * a esquerda de quem anda, d negativo para a direita. Os vértices vão por meia-esquadria (a distância cresce no vértice na razão
 * de 1 sobre o cosseno da meia volta, limitada a 2) e as pontas pela normal do segmento vizinho. A concordância acompanha a
 * curva: numa curva para o lado do deslocamento o raio encolhe `d`, e na curva para o outro lado cresce `d`; o que passa a menos
 * de 0,05 mm vira canto vivo.
 */
export function deslocarPerfil(pontos, d) {
  const n = pontos.length;
  const normal = (p, q) => {
    const dx = q[0] - p[0];
    const dy = q[1] - p[1];
    const comprimento = Math.hypot(dx, dy) || 1;
    return [-dy / comprimento, dx / comprimento];
  };
  return pontos.map((b, i) => {
    const antes = pontos[Math.max(i - 1, 0)];
    const depois = pontos[Math.min(i + 1, n - 1)];
    const n1 = i === 0 ? normal(b, depois) : normal(antes, b);
    const n2 = i === n - 1 ? normal(antes, b) : normal(b, depois);
    let nx = n1[0] + n2[0];
    let ny = n1[1] + n2[1];
    const comprimento = Math.hypot(nx, ny) || 1;
    nx /= comprimento;
    ny /= comprimento;
    const k = Math.min(1 / Math.max(nx * n1[0] + ny * n1[1], 0.5), 2);
    let concordancia = 0;
    if (b[2] && i > 0 && i < n - 1) {
      const d1 = [b[0] - antes[0], b[1] - antes[1]];
      const d2 = [depois[0] - b[0], depois[1] - b[1]];
      const giro = Math.sign(d1[0] * d2[1] - d1[1] * d2[0]); /* positivo: curva para a esquerda */
      const raio = b[2] - d * giro;
      concordancia = raio > RAIO_MINIMO_DE_CONCORDANCIA ? raio : 0;
    }
    return [b[0] + nx * d * k, b[1] + ny * d * k, concordancia];
  });
}

/* O ponto da reta por `a` e `b` na altura `y` (extrapola além dos extremos). Segmento horizontal não tem ponto: devolve `b`. */
function naAltura(a, b, y) {
  if (a[1] === b[1]) return [b[0], b[1]];
  const t = (y - a[1]) / (b[1] - a[1]);
  return [a[0] + (b[0] - a[0]) * t, y];
}

/**
 * A casca de um contorno de fora. `externo` sobe de baixo para cima com a parede à esquerda; o contorno de dentro é o dele
 * deslocado `parede` mm para a esquerda, com as duas pontas cortadas no plano da altura da ponta de fora correspondente (a borda
 * da boca e, quando a casca é aberta, a de baixo ficam planas, e a espessura da borda é a da parede).
 *
 * Opções: `parede` (mm); `raioBoca`, a concordância dos dois cantos da borda de cima; `fechaNoEixo` (padrão verdadeiro), que
 * fecha o fundo de dentro no eixo, em `fundo` mm de altura quando dado (o fundo maciço do copo) e na altura que a parede dá
 * quando não, e põe em `raioFundoInterno` a concordância do canto de dentro do fundo; com `fechaNoEixo` falso a casca fica aberta
 * embaixo (a cúpula do abajur). Devolve `{ externo, interno }`: o externo é o recebido com a concordância da borda posta no
 * último ponto, e o interno vem de cima para baixo, pronto para vir depois dele.
 */
export function casca(externo, { parede, raioBoca = 0, fechaNoEixo = true, fundo = null, raioFundoInterno = 0 }) {
  if (!(parede > 0)) throw new Error(`casca: a parede precisa ser positiva (recebi ${parede})`);
  const fora = externo.map((p, i) => [p[0], p[1], i === externo.length - 1 ? raioBoca : (p[2] ?? 0)]);
  let dentro = deslocarPerfil(externo, parede);
  const n = dentro.length;
  dentro[n - 1] = [...naAltura(dentro[n - 2], dentro[n - 1], externo[n - 1][1]), raioBoca];
  if (fechaNoEixo) {
    if (fundo !== null && fundo > dentro[0][1]) {
      let i = 1;
      while (i < dentro.length - 1 && dentro[i][1] < fundo) i += 1;
      dentro = [[0, fundo, 0], [...naAltura(dentro[i - 1], dentro[i], fundo), raioFundoInterno], ...dentro.slice(i)];
    } else {
      /* o fundo de dentro é o da parede: o primeiro ponto desce ao eixo */
      dentro[0] = [0, dentro[0][1], 0];
    }
  } else {
    dentro[0] = [...naAltura(dentro[0], dentro[1], externo[0][1]), 0];
  }
  return { externo: fora, interno: dentro.reverse() };
}

/** O copo: casca com o fundo de dentro plano e maciço, parede reta que afina da boca à base. */
export function perfilDoCopo(p) {
  const rBoca = p.copoDiametroBoca / 2;
  const rBase = p.copoDiametroBase / 2;
  const externo = [[0, 0, 0], [rBase, 0, p.raioCanto], [rBoca, p.copoAltura, p.raioBoca]];
  const { externo: fora, interno } = casca(externo, {
    parede: p.parede, raioBoca: p.raioBoca, fundo: p.copoFundo, raioFundoInterno: p.copoRaioCantoFundoDentro,
  });
  return [...fora, ...interno];
}

/** O contorno de fora da garrafa sem o colar: cúpula do fundo, anel de apoio, corpo, ombro em quarto de elipse e gargalo. */
export function contornoDaGarrafa(p) {
  const pontos = [];
  const nC = PONTOS_DA_CUPULA_DA_GARRAFA;
  for (let i = 0; i <= nC; i++) {
    const t = i / nC;
    pontos.push([p.garrafaRaioApoioInterno * t, p.garrafaCupula * (1 - t * t * (3 - 2 * t)), 0]);
  }
  pontos.push([p.garrafaRaioApoioExterno - p.raioCanto, 0, 0]);
  pontos.push([p.garrafaRaioCorpo, p.raioCanto * 2, 0]);
  pontos.push([p.garrafaRaioCorpo, p.garrafaAlturaCorpo, 0]);
  const a = p.garrafaRaioCorpo - p.garrafaRaioGargalo;
  const b = p.garrafaAlturaGargalo - p.garrafaAlturaCorpo;
  const nO = PONTOS_DO_OMBRO_DA_GARRAFA;
  for (let i = 1; i <= nO; i++) {
    const t = (i / nO) * (Math.PI / 2);
    pontos.push([p.garrafaRaioGargalo + a * Math.cos(t), p.garrafaAlturaCorpo + b * Math.sin(t), 0]);
  }
  pontos.push([p.garrafaRaioGargalo, p.garrafaAltura, 0]);
  return pontos;
}

/** A garrafa: casca do contorno de fora, com o colar saliente só na face de fora; a rosca não é revolução e fica na receita. */
export function perfilDaGarrafa(p) {
  const { externo, interno } = casca(contornoDaGarrafa(p), { parede: p.parede, raioBoca: p.raioBoca });
  const topo = externo[externo.length - 1];
  const subida = externo.slice(0, -1);
  subida.push(
    [p.garrafaRaioGargalo, p.garrafaColarY, 0],
    [p.garrafaColarRaio, p.garrafaColarY, RAIO_DO_COLAR_DA_GARRAFA],
    [p.garrafaColarRaio, p.garrafaColarY + p.garrafaColarAltura, RAIO_DO_COLAR_DA_GARRAFA],
    [p.garrafaRaioGargalo, p.garrafaColarY + p.garrafaColarAltura + AFINAMENTO_DO_COLAR_DA_GARRAFA, 0],
    topo,
  );
  return [...subida, ...interno];
}

/** O contorno de fora do vaso do pé até o topo do lábio: saia, barriga em elipse, pescoço e lábio virado. */
export function contornoDoVaso(p) {
  const Rb = p.vasoBarrigaDiametro / 2;
  const Rp = p.vasoPeDiametro / 2;
  const Rn = p.vasoPescocoDiametro / 2;
  const Rl = p.vasoBocaDiametro / 2;
  const elipse = [];
  for (let i = 0; i <= p.vasoPassosBarriga; i++) {
    const t = (p.vasoAnguloInicioBarriga + ((p.vasoAnguloFimBarriga - p.vasoAnguloInicioBarriga) * i) / p.vasoPassosBarriga) * GRAUS;
    elipse.push([Rb * Math.sin(t), p.vasoBarrigaAltura - p.vasoBarrigaSemieixoY * Math.cos(t), 0]);
  }
  const yPesc = p.vasoPescocoAltura;
  const yTopo = p.vasoAltura;
  const yLab = yTopo - p.vasoLabioAltura;
  /* o pé é uma saia levemente aberta para baixo (raio Rp na borda de baixo) */
  const saia = [[Rp, 0, 0], [Rp - 3, p.vasoPeAltura * 0.55, 0], [elipse[0][0], p.vasoPeAltura + 2, 0]];
  const externo = [
    ...saia, ...elipse,
    [Rn + 3, yPesc - 12, 0], [Rn, yPesc, 0], [Rn, yLab - 12, 0],
    [Rn + (Rl - Rn) * 0.45, yLab - 5, 0], [Rl, yLab, 0], [Rl, yTopo, 0],
  ];
  return { externo, saia: saia.length };
}

/** O vaso: a parede inteira (oca até a boca), com o fundo do pé rebaixado; os arcos do pé são recorte e ficam na receita. */
export function perfilDoVaso(p) {
  const { externo, saia } = contornoDoVaso(p);
  const Rp = p.vasoPeDiametro / 2;
  /* a parede de dentro é a do trecho do corpo (do fim da saia ao lábio) deslocada para o eixo, do topo para baixo */
  const dentro = deslocarPerfil(externo.slice(saia - 1), p.parede).reverse();
  const pisoY = dentro[dentro.length - 1][1];
  const raioInternoPe = Rp - p.parede;
  return [
    [0, p.vasoRebaixoDoPe, 0], [raioInternoPe, p.vasoRebaixoDoPe, 0], [raioInternoPe, 0, 0],
    ...externo, ...dentro, [0, pisoY, 0],
  ];
}

/** O prato: a face de cima percorrida do eixo à borda (fundo plano, arco côncavo, parede, ombro convexo, aba), a borda em meia-volta,
 *  a face de baixo como a de cima deslocada para a direita, e o anel de apoio, que só existe por baixo. */
export function perfilDoPrato(p) {
  const e = p.parede;
  const a = p.pratoAbaInclinacao * GRAUS;
  const rb = e / 2;
  const R = p.pratoDiametro / 2;
  const yf = p.pratoAltura - p.pratoPocoProfundidade;
  const bx = R - rb;
  const by = p.pratoAltura - rb;
  const topo = [bx - rb * Math.sin(a), by + rb * Math.cos(a)];
  const sx = R - rb - p.pratoAbaLargura;
  const sy = topo[1] - (topo[0] - sx) * Math.tan(a);
  const cx = sx + p.pratoRaioOmbro * Math.sin(a);
  const cy = sy - p.pratoRaioOmbro * Math.cos(a);
  const paredeX = cx - p.pratoRaioOmbro;
  const x0 = paredeX - p.pratoRaioFundo;
  const yc = yf + p.pratoRaioFundo;
  const N = p.pratoPassosArco;
  const arco = (cxx, cyy, r, g0, g1) => Array.from({ length: N + 1 }, (_, i) => {
    const g = g0 + ((g1 - g0) * i) / N;
    return [cxx + r * Math.cos(g), cyy + r * Math.sin(g), 0];
  });
  const cima = [[0, yf, 0], ...arco(x0, yc, p.pratoRaioFundo, -Math.PI / 2, 0), ...arco(cx, cy, p.pratoRaioOmbro, Math.PI, Math.PI / 2 + a), [...topo, 0]];
  const borda = arco(bx, by, rb, Math.PI / 2 + a, a - Math.PI / 2);
  const baixo = deslocarPerfil(cima, -e).reverse().slice(0, -1); /* sem o ponto do eixo, que o anel refaz */
  const re = p.pratoAnelDiametro / 2;
  const yb = yf - e;
  const anel = [[re, yb, 0], [re, yb - p.pratoAnelAltura, 0], [re - p.pratoAnelLargura, yb - p.pratoAnelAltura, 0], [re - p.pratoAnelLargura, yb, 0], [0, yb, 0]];
  const todos = [...cima, ...borda, ...baixo, ...anel];
  return todos.filter((q, i) => i === 0 || Math.hypot(q[0] - todos[i - 1][0], q[1] - todos[i - 1][1]) > 1e-6);
}

/** A base do abajur: disco de dois degraus com as bordas chanfradas. */
export function perfilDaBase(p) {
  const r = p.baseRaioBorda;
  return [[0, 0, 0], [p.baseRaio - r, 0, 0], [p.baseRaio, r / 2, 0], [p.baseRaio, p.baseDegrauAltura - r, 0], [p.baseRaio - r, p.baseDegrauAltura, 0],
    [p.baseDegrauRaio + r, p.baseDegrauAltura, 0], [p.baseDegrauRaio, p.baseDegrauAltura + r / 2, 0], [p.baseDegrauRaio, p.baseAltura - r, 0],
    [p.baseDegrauRaio - r, p.baseAltura, 0], [0, p.baseAltura, 0]];
}

/** O cilindro maciço (a haste e o soquete): perfil retangular sobre o eixo. */
export function perfilDoCilindro(p) {
  const y1 = p.cilindroY0 + p.cilindroAltura;
  return [[0, p.cilindroY0, 0], [p.cilindroRaio, p.cilindroY0, 0], [p.cilindroRaio, y1, 0], [0, y1, 0]];
}

/** A cúpula do abajur: casca aberta nas duas pontas, tronco de cone mais largo embaixo, com as bordas planas. */
export function perfilDaCupula(p) {
  const y1 = p.cupulaY + p.cupulaAltura;
  const { externo, interno } = casca([[p.cupulaRaioBaixo, p.cupulaY, 0], [p.cupulaRaioCima, y1, 0]], { parede: p.parede, fechaNoEixo: false });
  return [...externo, ...interno];
}

/** O perfil fechado de uma forma, a partir dos parâmetros completos. Devolve `{ nome, perfil, anel }`: `anel` é verdadeiro quando a
 *  seção não toca o eixo (a cúpula) e a revolução gera um anel, sem fechar no eixo. */
export function perfilDaForma(p) {
  const nome = FORMAS[p.forma];
  const perfil = {
    copo: perfilDoCopo, garrafa: perfilDaGarrafa, vaso: perfilDoVaso, prato: perfilDoPrato, base: perfilDaBase,
    haste: perfilDoCilindro, soquete: perfilDoCilindro, cupula: perfilDaCupula,
  }[nome](p);
  return { nome, perfil, anel: nome === 'cupula' };
}
