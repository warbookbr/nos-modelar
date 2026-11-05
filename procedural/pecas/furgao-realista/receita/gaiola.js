/* furgao-realista, receita/gaiola.js — a gaiola da chapa (`derivar`): os anéis com as colunas, as faces, a cobertura
 * do teto, o espelho, as voltas das portas e dos vãos, as regiões, a fresta, os cristais, as lentes, os vincos, o plástico e as rodas.
 */

import { cruz, dot, entre, esc, grau, lerp, m, soma, sub, suave, unit } from './geometria.js';
import { aneisDoOmbro, aneisHorizontais, forma, pontoFrente, pontoLado, pontoNoCaminho, pontoQuinaTras, pontoTras, projetarNaSecao, secaoHorizontal } from './forma.js';
import { derivarPlastico } from './plastico.js';
import { chamadaDaRoda } from './rodas.js';

/* ---------- a gaiola ---------- */

/**
 * derivar(T) -> a gaiola da chapa, o plástico, o forro e as chamadas das rodas, em milímetro e em metro.
 *   pontos: os pontos nomeados da gaiola, em metro, que entram em TOPO;
 *   passo: os campos do passo `subdivisao` (vertices, faces, vincos, cantos), só com nomes;
 *   aneis: os anéis, com a lista de pontos de cada um por coluna, para o teste e a etapa seguinte citarem a gaiola por nome;
 *   portas, vidros: as voltas de cada porta (nos nomes da carroceria) e de cada vão de vidro;
 *   abasDosArcos: a linha de cada arco de roda, para a aba;
 *   rodas: as quatro rodas, com o sufixo, o centro e a chamada da família roda-pneu.
 */
export function derivar(T) {
  const f = forma(T);
  const fresta = T.fresta;
  const rArcoPorta = T.arco_raio + T.porta_folga_arco;
  const yBase = T.porta_base_y;
  const yTopoArco = f.rPneu + rArcoPorta;
  const margem = T.margem_coluna;
  /* a distância mínima de um ponto da gaiola a uma linha de porta: a meia fresta, a tira da borda e uma folga */
  const tiraDaFresta = fresta / 2 + T.fresta_borda_largura + T.folga_entre_aneis;

  /* os anéis: os horizontais e os do ombro, cada um com a seção */
  const horizontais = aneisHorizontais(T, f).map((a) => ({ ...a, sec: secaoHorizontal(T, f, a.y), horizontal: true }));
  const ombro = aneisDoOmbro(T, f).map((a) => ({ ...a, y: a.sec.yS, horizontal: false }));
  const aneis = [...horizontais, ...ombro];
  for (const a of horizontais) {
    if (Math.abs(a.y - yTopoArco) < 5) throw new Error(`furgao-realista: o anel ${a.nome} fica a menos de 5 mm do alto do arco da porta (${yTopoArco})`);
  }

  /* as colunas da frente: x por anel. Do para-choque até o topo da porta da cabine, em partes iguais entre o meio e o começo da quina
     (o vão do para-brisa sai pela coluna q3 da quina, e não por uma coluna da frente); acima do topo da porta, as partes iguais passam
     às linhas das nervuras, iguais às da traseira, para as linhas da cobertura saírem retas. */
  const w = T.nervura_meia_largura;
  const nervuras = [T.nervura_1_x, T.nervura_2_x];
  const linhasDoTeto = [0, (nervuras[0] - w) / 2, nervuras[0] - w, nervuras[0], nervuras[0] + w, (nervuras[0] + w + nervuras[1] - w) / 2, nervuras[1] - w, nervuras[1], nervuras[1] + w];
  const secTeto = ombro.at(-1).sec;
  const xFimTeto = secTeto.xS - secTeto.rF;
  const xTrasTeto = secTeto.xS - secTeto.rB;
  const XT = [...linhasDoTeto, ...entre(linhasDoTeto.at(-1), xFimTeto, (xFimTeto - linhasDoTeto.at(-1)) / 2 + 1e-6), xFimTeto];
  const nF = XT.length - 1;
  const RT = [...linhasDoTeto, ...entre(linhasDoTeto.at(-1), xTrasTeto, (xTrasTeto - linhasDoTeto.at(-1)) / 5 + 1e-6), xTrasTeto];
  const nR = RT.length - 1;
  const fracUniforme = Array.from({ length: nF + 1 }, (_, k) => k / nF);
  const fracTeto = XT.map((x) => x / xFimTeto);
  const colunasFrente = (an) => {
    const s = an.sec; const xFim = s.xS - s.rF;
    let fr;
    if (!an.horizontal) fr = fracTeto;
    else if (an.y <= T.para_brisa_topo_y) fr = fracUniforme;
    else {
      const t = suave((an.y - T.para_brisa_topo_y) / (T.ombro_y - T.para_brisa_topo_y));
      fr = fracUniforme.map((u, k) => lerp(u, fracTeto[k], t));
    }
    return fr.map((u) => u * xFim);
  };
  /* as colunas da traseira: no corpo, a borda de dentro e a de fora dos vidros traseiros; no ombro e no teto, as das nervuras */
  const colunasTras = (an) => {
    const s = an.sec; const xTras = s.xS - s.rB;
    const pt = T.vao_canto_passo_traseiro; const kk = T.vao_canto_degraus;
    const dentro = T.vidro_traseiro_x_dentro;
    /* a borda de fora do vidro fica 45 mm dentro da borda de fora da porta, que acompanha a lateral, e não passa de 820 */
    const corpo = (xt, y) => {
      const fora = Math.min(T.vidro_traseiro_x_fora, f.xBordaTraseira(y) - T.vidro_traseiro_folga_fora);
      const cantoDentro = Array.from({ length: kk }, (_, j) => dentro + (j + 1) * pt);
      const cantoFora = Array.from({ length: kk }, (_, j) => fora - (kk - j) * pt);
      const miolo = entre(cantoDentro.at(-1), cantoFora[0], (cantoFora[0] - cantoDentro.at(-1)) / (10 - 2 * kk) + 1e-6);
      return [0, dentro, ...cantoDentro, ...miolo, ...cantoFora, fora, ...entre(fora, xt, (xt - fora) / 2 + 1e-6), xt];
    };
    if (an.horizontal) return corpo(xTras, an.y);
    const ref = horizontais.at(-1);
    const base = corpo(ref.sec.xS - ref.sec.rB, ref.y).map((x, k, l) => x / l.at(-1));
    return base.map((u, k) => lerp(u, RT[k] / xTrasTeto, an.t) * xTras);
  };
  if (colunasTras(horizontais[0]).length !== nR + 1) throw new Error('furgao-realista: a traseira e o teto pedem o mesmo número de colunas');

  /* A coluna da fresta da frente da porta da cabine (D), por anel: no caminho da quina para a lateral, onde a vista de lado dá a
     linha da prancha; acima do topo da porta, no mesmo ângulo de quina do topo. */
  const sQuina = (sec) => sec.rF * Math.PI / 2;
  const caminhoDeZ = (sec, z) => {
    const zLado = sec.zF - sec.rF;
    if (z <= zLado) return sQuina(sec) + (zLado - z);
    return sec.rF * Math.acos(Math.min(1, Math.max(-1, 1 - (sec.zF - z) / sec.rF)));
  };
  const secTopoPorta = secaoHorizontal(T, f, T.porta_cabine_topo_y);
  const aTopoPorta = caminhoDeZ(secTopoPorta, f.zFrestaFrente(T.porta_cabine_topo_y)) / secTopoPorta.rF;
  const yD = f.rPneu + Math.sqrt(rArcoPorta ** 2 - (f.pePorta[0] - f.zD) ** 2);
  const yDQuina = f.rPneu + Math.sqrt(rArcoPorta ** 2 - (f.pePortaQuina[0] - f.zD) ** 2);
  const secTopoQuina = secaoHorizontal(T, f, T.para_brisa_topo_y);
  const aTopoQuina = caminhoDeZ(secTopoQuina, f.zFrestaQuina(T.para_brisa_topo_y)) / secTopoQuina.rF;
  const caminhoQuina = (an) => (an.horizontal && an.y <= T.para_brisa_topo_y ? caminhoDeZ(an.sec, f.zFrestaQuina(an.y)) : an.sec.rF * aTopoQuina);
  const caminhoD = (an) => {
    if (an.horizontal && an.y <= T.porta_cabine_topo_y) return caminhoDeZ(an.sec, f.zFrestaFrente(an.y));
    /* Acima do topo da porta a coluna D não tem mais a fresta a seguir. Com a fresta a 122 mm do perfil ela fica quase no fim da quina,
       longe de E: ela volta, até o topo do vão do para-brisa, para a posição que tinha com a fresta a quina_fresta_ref, a mesma do teto da
       etapa 2; com ela parada em 2035 a curva do teto saía com calombo de 2,9 mm no ombro. */
    const t = suave((an.y - T.porta_cabine_topo_y) / (T.para_brisa_topo_y - T.porta_cabine_topo_y));
    return lerp(an.sec.rF * aTopoPorta, caminhoQuina(an), t);
  };

  /* os arcos: os ângulos dos pontos do arco da porta (raio rArcoPorta), comuns a todos os anéis que o cortam */
  const theta380 = Math.asin((yBase - f.rPneu) / rArcoPorta);
  const arcos = [{ id: 'arcoD', zc: f.zD }, { id: 'arcoT', zc: f.zT }].map((arco) => {
    const lista = [{ th: theta380, col: `${arco.id}_f`, tipo: 'juncao' }, { th: Math.PI - theta380, col: `${arco.id}_t`, tipo: 'juncao' }];
    horizontais.forEach((a, i) => {
      if (a.y > yBase && a.y < yTopoArco) {
        const th = Math.asin((a.y - f.rPneu) / rArcoPorta);
        lista.push({ th, col: `${arco.id}_j${i}f`, tipo: 'juncao' }, { th: Math.PI - th, col: `${arco.id}_j${i}t`, tipo: 'juncao' });
      }
    });
    if (arco.id === 'arcoD') lista.push({ th: Math.acos((f.pePorta[0] - arco.zc) / rArcoPorta), col: 'D', tipo: 'D' });
    lista.sort((a, b) => a.th - b.th);
    const passo = T.passo_arco_graus * grau;
    const comFill = [lista[0]];
    for (let k = 1; k < lista.length; k += 1) {
      const a = lista[k - 1].th; const b = lista[k].th;
      entre(a, b, passo).forEach((th) => comFill.push({ th, tipo: 'fill' }));
      comFill.push(lista[k]);
    }
    comFill.forEach((p, k) => {
      if (!p.col) p.col = `${arco.id}_c${k}`;
      p.nome = `${arco.id}_${k}`;
      p.z = arco.zc + rArcoPorta * Math.cos(p.th);
      p.y = f.rPneu + rArcoPorta * Math.sin(p.th);
    });
    return { ...arco, pontos: comFill };
  });

  /* as colunas da lateral: as linhas das portas e as de enchimento entre elas, a passo_lado */
  const zCabTras = T.porta_cabine_tras_z;
  const zCorrerFrente = zCabTras - T.coluna_do_meio;
  const zCorrerTras = zCorrerFrente - T.porta_correr_largura;
  const zVidroCabTras = zCabTras + T.moldura_vidro_cabine;
  const zFimLado = f.zR(f.ys) + T.raio_planta_tras;
  const zComecoLado = f.zF(f.ys) - f.raioFrente(f.ys);
  const ancoras = [
    { col: 'portaCorrerTras', z: zCorrerTras }, { col: 'portaCorrerFrente', z: zCorrerFrente }, { col: 'portaCabineTras', z: zCabTras },
    { col: 'vidroCabineTras', z: zVidroCabTras },
  ];
  const quebras = [zFimLado, zCorrerTras, zCorrerFrente, zCabTras, zVidroCabTras, f.pePortaQuina[0], zComecoLado];
  const enchimento = [];
  for (let k = 0; k + 1 < quebras.length; k += 1) entre(quebras[k], quebras[k + 1], T.passo_lado).forEach((z) => enchimento.push({ col: `l${Math.round(z)}`, z }));
  const colunasLado = [...ancoras, ...enchimento].sort((a, b) => b.z - a.z);

  /* ---- os pontos de cada anel, na metade x >= 0 ---- */
  const P = new Map(); const SEC = new Map(); const EXTRA = new Map();
  const nomeE = (base) => `${base}_e`;
  const registrar = (nome, p, sec) => { if (!P.has(nome)) { P.set(nome, p); SEC.set(nome, sec); } return nome; };
  const ehCostura = (col) => col === 'f0' || col === 'r0';
  const nomePonto = (anel, col) => (ehCostura(col) ? `${anel}_${col}` : nomeE(`${anel}_${col}`));
  const secArco = secaoHorizontal(T, f, yBase);

  const cinturaH = (sec, z) => {
    const zIni = sec.zF - sec.rF - T.cintura_recuo; const zFim = sec.zR + sec.rB + T.cintura_recuo;
    return T.cintura_profundidade * suave((zIni - z) / T.cintura_rampa) * suave((z - zFim) / T.cintura_rampa);
  };

  /* o grupo da quina da frente e da coluna D, por anel: q1..q3, E, e D, b1, b2, S0 quando existem; cada um com o caminho s */
  const grupoQuina = (an) => {
    const sec = an.sec; const sq = sQuina(sec);
    const temD = an.y >= yD - 1e-9;
    const sD = temD ? caminhoD(an) : null;
    const temB = temD && (sD - sq) <= T.inicio_colunas_porta;
    const sE = an.y >= yDQuina - 1e-9 ? Math.min(sq, caminhoQuina(an) - T.recuo_quina_porta) : sq;
    const g = [1, 2, 3].map((k) => ({ col: `q${k}`, s: (k / 4) * sE }));
    g.push({ col: 'E', s: sE });
    /* Entre E e D a quina fica sem coluna quando a fresta recua (a face vira corda de um arco de raio 160 e sai com barriga a menos, uma
       mancha afundada na curvatura). A coluna p1 fica onde a D da etapa 2 ficava (a fresta a quina_fresta_ref), de modo que o encontro do teto
       com a coluna do para-brisa tem a mesma malha de antes, e p2 em diante dividem o resto até a D nova, a passo_p uma da outra. Isso vale de
       p_inicio_y até o ombro, que tem as mesmas colunas do teto, cuja cobertura conta as que vêm antes de D. */
    if (temD && an.horizontal && an.y >= T.p_inicio_y && an.y < T.ombro_y) {
      const sR = caminhoQuina(an);
      if (sR > sE + 1 && sR < sD - 1) {
        g.push({ col: 'p1', s: sR });
        const n = Math.floor((sD - sR) / T.passo_p);
        for (let k = 1; k < n; k += 1) g.push({ col: `p${k + 1}`, s: sR + ((sD - sR) * k) / n });
      }
    }
    if (temD) g.push({ col: 'D', s: sD });
    if (temB) {
      const L = Math.max(sq - sD, T.alcance_coluna_porta);
      [1, 2, 3].forEach((k) => g.push({ col: k === 3 ? 'S0' : `b${k}`, s: sD + (k * L) / 3 }));
    }
    return g;
  };

  /* No ombro (e no anel em que ele começa) a lateral é curva, e as colunas de enchimento são as mesmas em todos os anéis: as que
     cabem entre o começo e o fim da lateral em todos eles. */
  const ehTopoDe = (an) => !an.horizontal || an.nome === 'ombro';
  /* onde a lateral começa para as colunas de enchimento: no fim da quina, ou, no ombro, depois da coluna S0 quando ela passa da quina */
  const comecoDe = (an) => {
    const sec = an.sec; const sq = sQuina(sec);
    const s0 = grupoQuina(an).find((g) => g.col === 'S0' && g.s > sq + 1e-9);
    return Math.min(sec.zF - sec.rF, s0 ? sec.zF - sec.rF - (s0.s - sq) : Infinity);
  };
  const topos = aneis.filter(ehTopoDe);
  const zComecoTopo = Math.min(...topos.map(comecoDe)) - margem;
  const zFimTopo = Math.max(...topos.map((an) => an.sec.zR + an.sec.rB)) + margem;
  /* no ombro a primeira coluna de enchimento fica logo atrás da S0 mais recuada, e o vão até a seguinte se divide a passo_lado */
  {
    const seguinte = Math.max(...colunasLado.filter((c) => c.z < zComecoTopo - margem).map((c) => c.z));
    [zComecoTopo - 1e-6, ...entre(seguinte, zComecoTopo, T.passo_lado)].forEach((z) => colunasLado.push({ col: `l${Math.round(z)}`, z }));
    colunasLado.sort((a, b) => b.z - a.z);
  }

  /* A coroa da frente: a flecha, por altura, é quanto a coluna q3 da quina (a ponta do vão do para-brisa) fica abaixo do meio da
     frente. Do zero na boca do capô ela cresce até a da base do vão (a coroa do capô), passa à da borda de cima do vão e some até o
     teto plano. Em cada anel, um ponto da frente ou da quina desce a flecha vezes (x / x de q3)², e dali até a coluna D da fresta a
     descida some, de modo que a porta, a lateral e o teto plano ficam onde estavam. Só o y muda: na quina, que é parede vertical, o
     ponto escorrega pela parede; no capô e no para-brisa ele afunda um pouco, e a borda do vão sai em arco, mais baixa nas pontas. */
  const flechaEm = (y) => {
    if (y <= f.boca[1]) return 0;
    if (y <= T.para_brisa_base_y) return T.flecha_capo_base * suave((y - f.boca[1]) / (T.para_brisa_base_y - f.boca[1]));
    if (y <= T.para_brisa_topo_y) return lerp(T.flecha_capo_base, T.flecha_vidro_topo, (y - T.para_brisa_base_y) / (T.para_brisa_topo_y - T.para_brisa_base_y));
    return T.flecha_vidro_topo * (1 - suave((y - T.para_brisa_topo_y) / (T.altura - T.para_brisa_topo_y)));
  };
  const listas = [];
  aneis.forEach((an) => {
    const sec = an.sec; const lista = [];
    const add = (col, p, nome = null) => { const n = nome ?? nomePonto(an.nome, col); registrar(n, p, sec); lista.push({ col, nome: n }); return n; };
    /* frente */
    const grupo = grupoQuina(an);
    const xDoCaminho = (s) => pontoNoCaminho(sec, s)[0];
    const xQ3 = xDoCaminho(grupo.find((g) => g.col === 'q3').s);
    /* o abaulamento acaba onde a coluna D acabava com a fresta a quina_fresta_ref (a fresta da porta recuou, e o abaulamento do para-brisa não) */
    const xFimDaCoroa = Math.max(xQ3 + 1, an.y >= yDQuina - 1e-9 ? xDoCaminho(caminhoQuina(an)) : sec.xS);
    const coroa = (p) => {
      const x = Math.abs(p[0]);
      const g = x <= xQ3 ? (x / xQ3) ** 2 : 1 - suave((x - xQ3) / (xFimDaCoroa - xQ3));
      return [p[0], p[1] - flechaEm(p[1]) * g, p[2]];
    };
    colunasFrente(an).forEach((x, k) => add(`f${k}`, coroa(pontoFrente(sec, x))));
    /* quina da frente e grupo da coluna D */
    const sq = sQuina(sec);
    const naQuina = grupo.filter((g) => g.s <= sq + 1e-9);
    const naLateral = grupo.filter((g) => g.s > sq + 1e-9);
    naQuina.forEach((g) => add(g.col, coroa(pontoNoCaminho(sec, g.s))));
    const zComeco = comecoDe(an);
    const zFim = sec.zR + sec.rB;
    /* lateral: pontos estruturais (as linhas das portas, os arcos, as tampas dos arcos) e as colunas de enchimento */
    const itens = naLateral.map((g) => ({ col: g.col, z: sec.zF - sec.rF - (g.s - sq), y: sec.yS }));
    const zonas = [];
    if (an.horizontal) {
      const iH = horizontais.indexOf(an);
      const yAntes = iH > T.tampas_aneis - 1 ? horizontais[iH - T.tampas_aneis].y : -Infinity;
      for (const arco of arcos) {
        const pts = arco.pontos;
        if (an.y <= yBase + 1e-9) {
          const r = lerp(T.arco_raio, rArcoPorta, (an.y - f.ys) / (yBase - f.ys));
          const thj = Math.asin((an.y - f.rPneu) / r);
          if (Math.abs(an.y - yBase) < 1e-9) pts.forEach((p) => itens.push({ col: p.col, z: p.z, y: p.y, nome: nomeE(p.nome), sec: secArco }));
          else {
            itens.push({ col: pts[0].col, z: arco.zc + r * Math.cos(thj), y: an.y });
            /* abaixo do eixo (thj < 0) o primeiro ponto do anel fica em -thj, e os pontos do arco que vêm antes dele em ângulo sairiam
               do outro lado dele em z; eles ficam de fora desses anéis */
            const dentroDoAngulo = (p) => thj >= 0 || (p.th >= -thj && p.th <= Math.PI + thj);
            pts.slice(1, -1).filter(dentroDoAngulo).forEach((p) => itens.push({ col: p.col, z: arco.zc + r * Math.cos(p.th), y: f.rPneu + r * Math.sin(p.th) }));
            itens.push({ col: pts.at(-1).col, z: arco.zc - r * Math.cos(thj), y: an.y });
          }
          zonas.push([arco.zc - r * Math.cos(thj) - margem, arco.zc + r * Math.cos(thj) + margem]);
        } else if (an.y < yTopoArco) {
          const thj = Math.asin((an.y - f.rPneu) / rArcoPorta);
          pts.filter((p) => p.th >= thj - 1e-9 && p.th <= Math.PI - thj + 1e-9).forEach((p) => itens.push({ col: p.col, z: p.z, y: p.y, nome: nomeE(p.nome), sec: secArco }));
          zonas.push([arco.zc - rArcoPorta * Math.cos(thj) - margem, arco.zc + rArcoPorta * Math.cos(thj) + margem]);
        }
        /* as tampas: o ponto do arco que não é de anel nem da coluna D ganha uma coluna até o primeiro anel acima dele */
        pts.filter((p) => p.tipo === 'fill' && p.y > yAntes && p.y <= an.y && Math.hypot(p.z - arco.zc, an.y - f.rPneu) - rArcoPorta >= tiraDaFresta)
          .forEach((p) => itens.push({ col: p.col, z: p.z, y: an.y }));
      }
    }
    /* nos anéis do vidro da porta da cabine, as colunas dos cantos do vão, a vao_canto_passo_cabine uma da outra a partir de cada
       borda lateral dele (S1 e S2 na frente, T1 e T2 atrás) */
    if (an.horizontal && an.y >= T.vidro_cabine_base_y - 1e-6 && an.y <= T.vidro_cabine_topo_y + 1e-6) {
      const zS0 = itens.find((it) => it.col === 'S0')?.z ?? sec.zF - sec.rF;
      for (let j = 1; j <= T.vao_canto_degraus; j += 1) {
        itens.push({ col: `S${j}`, z: zS0 - j * T.vao_canto_passo_cabine, y: sec.yS }, { col: `T${j}`, z: zVidroCabTras + j * T.vao_canto_passo_cabine, y: sec.yS });
      }
    }
    /* No capô e no para-lama, onde a quina acaba mais para trás a cada anel, as colunas de enchimento da lateral ficam em z fixo e a
       primeira delas ao lado do fim da quina (E) se afasta e some a cada poucos anéis: a face ao lado de E oscila de 40 a 150 mm e a
       luz rasante mostra a beira do capô em degraus. Colunas_do_capo colunas sobem junto com E, a colunas_do_capo_passo uma da outra, e as de z fixo
       que cairiam perto delas saem (são estruturais). */
    if (an.horizontal && an.y >= T.colunas_do_capo_y && itens.length > 0) {
      const zE = sec.zF - sec.rF;
      const zProximo = Math.max(...itens.map((it) => it.z));
      for (let j = 1; j <= T.colunas_do_capo; j += 1) {
        const z = zE - j * T.colunas_do_capo_passo;
        if (z > zProximo + T.margem_coluna + 5) itens.push({ col: `F${j}`, z, y: sec.yS });
      }
    }
    const estruturais = [...itens];
    const ehTopo = ehTopoDe(an);
    for (const c of colunasLado) {
      const fixa = ancoras.some((a) => a.col === c.col);
      if (ehTopo) { if (c.z < zComecoTopo && c.z > zFimTopo) itens.push({ col: c.col, z: c.z, y: sec.yS }); continue; }
      if (c.z >= zComeco - margem || c.z <= zFim + margem) continue;
      if (zonas.some(([a, b]) => c.z > a && c.z < b)) continue;
      if (!fixa && estruturais.some((e) => Math.abs(e.z - c.z) < margem)) continue;
      if (fixa && estruturais.some((e) => Math.abs(e.z - c.z) < 1)) continue;
      itens.push({ col: c.col, z: c.z, y: sec.yS });
    }
    itens.sort((a, b) => b.z - a.z);
    for (const it of itens) {
      const p = it.nome ? null : (an.horizontal && it.y !== sec.yS ? [f.xs(it.y), it.y, it.z] : pontoLado(sec, it.z));
      if (it.nome) { registrar(it.nome, [f.xs(it.y), it.y, it.z], it.sec); lista.push({ col: it.col, nome: it.nome }); continue; }
      const n = add(it.col, p);
      if (an.nome === 'cintura') { const h = cinturaH(sec, it.z); if (h > 0) { P.set(n, [p[0] - h, p[1], p[2]]); EXTRA.set(n, [-h, 0, 0]); } }
    }
    /* quina de trás e traseira */
    add('RS', pontoLado(sec, zFim));
    [1, 2, 3].forEach((k) => add(k === 2 ? 'RM' : `rq${k}`, pontoQuinaTras(sec, (k / 4) * (Math.PI / 2))));
    colunasTras(an).reverse().forEach((x, k, l) => add(`r${l.length - 1 - k}`, pontoTras(sec, x)));
    listas.push({ nome: an.nome, y: an.y, sec, horizontal: an.horizontal, lista });
  });

  /* Uma coluna de enchimento que só um anel tem deixaria o ponto dela com duas arestas, entre a face de baixo e a de cima, que
     dividiriam duas arestas; ela sai do anel. */
  for (let mudou = true; mudou;) {
    mudou = false;
    listas.forEach((l, i) => {
      const vizinhas = [listas[i - 1], listas[i + 1]].filter(Boolean).map((v) => new Set(v.lista.map((p) => p.col)));
      const antes = l.lista.length;
      l.lista = l.lista.filter((p) => !/^l-?\d+$/.test(p.col) || vizinhas.some((v) => v.has(p.col)));
      if (l.lista.length !== antes) mudou = true;
    });
  }

  /* o ombro e a ligação dele com a lateral precisam das mesmas colunas, porque ali a lateral é curva */
  const topoColunas = (l) => l.lista.map((p) => p.col).join(',');
  const iOmbro = listas.findIndex((l) => l.nome === 'ombro');
  for (let i = iOmbro + 1; i < listas.length; i += 1) {
    if (topoColunas(listas[i]) !== topoColunas(listas[iOmbro])) throw new Error(`furgao-realista: o anel ${listas[i].nome} não tem as colunas do anel do ombro`);
  }

  /* ---- os cantos dos vãos em diagonal ----
     A volta de um vão que anda pela gaiola dá um canto de 90 graus em cada quina do retângulo, e a subdivisão o arredonda com o raio
     das faces dali, pequeno; cortado em degraus ele ficaria com degraus visíveis. Cada canto é cortado em diagonal: a volta segue, por
     vao_canto_degraus células, a diagonal que liga a coluna de dentro do canto, no anel da borda, à coluna da borda, no anel
     vao_canto_degraus acima, e cada célula dessa diagonal é partida em dois triângulos, um de cada lado dela. A diagonal fica de
     fora do vão e a célula vizinha dela fica na chapa. A partição das células vem logo depois de montadas as faces. */
  const colunasDoCanto = (rs, cF, cMeio, k = T.vao_canto_degraus) => {
    const lista = rs[0].lista.map((q) => q.col);
    const iF = lista.indexOf(cF); const iM = lista.indexOf(cMeio);
    if (iF < 0 || iM < 0) throw new Error(`furgao-realista: o anel ${rs[0].nome} não tem a coluna ${cF} ou ${cMeio}`);
    const passo = iM > iF ? 1 : -1;
    const cols = [cF];
    for (let j = 1; j <= k; j += 1) cols.unshift(lista[iF + passo * j]);
    for (let j = 0; j < k; j += 1) {
      for (const r of [rs[j], rs[j + 1]]) {
        const l = r.lista.map((q) => q.col);
        if (Math.abs(l.indexOf(cols[j]) - l.indexOf(cols[j + 1])) !== 1) throw new Error(`furgao-realista: as colunas ${cols[j]} e ${cols[j + 1]} do canto do vão não são vizinhas no anel ${r.nome}`);
      }
    }
    return cols;
  };
  const aneisEntre = (yb, yt) => listas.filter((x) => x.horizontal && x.y >= yb - 1e-6 && x.y <= yt + 1e-6);
  const iForaTraseiro = 2 + 2 * T.vao_canto_degraus + (9 - 2 * T.vao_canto_degraus); // r0, a borda de dentro, os cantos, o miolo e os cantos de fora
  const meioDoVidroTraseiro = `r${Math.ceil((1 + iForaTraseiro) / 2)}`;
  const meioDoVidroDaCabine = (() => {
    const rs = aneisEntre(T.vidro_cabine_base_y, T.vidro_cabine_topo_y);
    const colunasBaixo = rs[0].lista.map((q) => q.col);
    const [k0, k1] = [colunasBaixo.indexOf('vidroCabineTras'), colunasBaixo.indexOf('S0')].sort((a, b) => a - b);
    const comuns = colunasBaixo.slice(k0 + 1, k1).filter((c) => rs.at(-1).lista.some((q) => q.col === c) && /^l-?\d+$/.test(c));
    return comuns[Math.floor(comuns.length / 2)];
  })();
  const cantosDosVaos = [
    { rs: aneisEntre(T.para_brisa_base_y, T.para_brisa_topo_y), cMeio: 'f0', cantos: ['q3'] },
    { rs: aneisEntre(T.vidro_cabine_base_y, T.vidro_cabine_topo_y), cMeio: meioDoVidroDaCabine, cantos: ['S0', 'vidroCabineTras'] },
    { rs: aneisEntre(T.vidro_traseiro_base_y, T.vidro_traseiro_topo_y), cMeio: meioDoVidroTraseiro, cantos: ['r1', `r${iForaTraseiro}`] },
  ];
  const diagonaisDosCantos = [];
  const arcosDosCantos = [];
  for (const { rs, cMeio, cantos } of cantosDosVaos) {
    const k = T.vao_canto_degraus;
    for (const cF of cantos) {
      for (const sub2 of [rs.slice(0, k + 1), rs.slice(rs.length - k - 1).reverse()]) {
        const cols = colunasDoCanto(sub2, cF, cMeio);
        const nome = (r, c) => r.lista.find((q) => q.col === c).nome;
        for (let j = 0; j < k; j += 1) diagonaisDosCantos.push([nome(sub2[j], cols[j]), nome(sub2[j + 1], cols[j + 1])]);
        arcosDosCantos.push({
          p00: nome(sub2[0], cols[0]), p10: nome(sub2[0], cols[k]), p01: nome(sub2[k], cols[0]), p11: nome(sub2[k], cols[k]),
          cadeia: Array.from({ length: k - 1 }, (_, j) => nome(sub2[j + 1], cols[j + 1])),
        });
      }
    }
  }

  /* ---- as faces entre anéis vizinhos, pelas colunas que os dois têm ---- */
  /* Entre duas colunas comuns, o trecho de baixo e o de cima viram quadriláteros quando têm o mesmo número de pontos, e, onde não
     têm (só na lateral, que é plana), são costurados em quadriláteros e triângulos pela ordem em z: uma face só com muitos lados
     deixaria um ponto de valência alta no meio dela, que a subdivisão espalha em faces finas. */
  const costurar = (baixo0, cima0) => {
    if (baixo0.length === cima0.length) return baixo0.slice(0, -1).map((n, k) => [n, baixo0[k + 1], cima0[k + 1], cima0[k]]);
    /* o ponto que os dois trechos dividem (o arco, onde o anel de cima termina nele) fica só no de baixo: as faces saem em leque
       do anel de cima, e não em triângulo com os três pontos no arco */
    const cima = [...cima0];
    if (cima.length > 1 && cima[0] === baixo0[0]) cima.shift();
    if (cima.length > 1 && cima.at(-1) === baixo0.at(-1)) cima.pop();
    const baixo = baixo0;
    const z = (n) => P.get(n)[2];
    const faces = []; let i = 0; let j = 0;
    while (i < baixo.length - 1 || j < cima.length - 1) {
      if (i === baixo.length - 1) { faces.push([baixo[i], cima[j + 1], cima[j]]); j += 1; continue; }
      if (j === cima.length - 1) { faces.push([baixo[i], baixo[i + 1], cima[j]]); i += 1; continue; }
      const zb = z(baixo[i + 1]); const zc = z(cima[j + 1]);
      const passo = Math.min(Math.abs(z(baixo[i]) - zb), Math.abs(z(cima[j]) - zc));
      if (Math.abs(zb - zc) < 0.35 * passo) { faces.push([baixo[i], baixo[i + 1], cima[j + 1], cima[j]]); i += 1; j += 1; } else if (zb > zc) { faces.push([baixo[i], baixo[i + 1], cima[j]]); i += 1; } else { faces.push([baixo[i], cima[j + 1], cima[j]]); j += 1; }
    }
    return faces;
  };
  const facesE = [];
  for (let i = 0; i + 1 < listas.length; i += 1) {
    const A = listas[i].lista; const B = listas[i + 1].lista;
    const posB = new Map(B.map((p, k) => [p.col, k]));
    const comuns = [];
    A.forEach((p, k) => { if (posB.has(p.col)) comuns.push([k, posB.get(p.col)]); });
    for (let c = 1; c < comuns.length; c += 1) if (comuns[c][1] <= comuns[c - 1][1]) throw new Error(`furgao-realista: as colunas dos anéis ${listas[i].nome} e ${listas[i + 1].nome} se cruzam em ${A[comuns[c][0]].col}`);
    for (let c = 0; c + 1 < comuns.length; c += 1) {
      const [a0, b0] = comuns[c]; const [a1, b1] = comuns[c + 1];
      const baixo = A.slice(a0, a1 + 1).map((p) => p.nome); const cima = B.slice(b0, b1 + 1).map((p) => p.nome);
      costurar(baixo, cima).forEach((poli) => {
        const limpo = poli.filter((n, k) => n !== poli[(k + 1) % poli.length]);
        if (new Set(limpo).size >= 3) facesE.push(limpo);
      });
    }
  }

  /* Os nós de dentro da diagonal de cada canto saem da diagonal e vão para o arco: o bloco de k por k células do canto vira um
     remendo bilinear, com a quina do vão (a coluna de fora no anel da borda) em (1, 0) e o fim da diagonal em (1, 1), e o arco de
     raio 1 tangente à borda no começo da diagonal e à coluna de fora no fim dela passa por esses nós, em (sen a, 1 - cos a), a
     = 90 graus vezes j sobre k. Com a diagonal reta o canto saía em chanfro, de dois cantos de 45 graus. */
  for (const { p00, p10, p01, p11, cadeia } of arcosDosCantos) {
    const k = cadeia.length + 1;
    const [a, b, c, d] = [p00, p10, p01, p11].map((n) => P.get(n));
    cadeia.forEach((n, j) => {
      const ang = (Math.PI / 2) * ((j + 1) / k);
      const u = Math.sin(ang); const w = 1 - Math.cos(ang);
      P.set(n, [0, 1, 2].map((e) => (1 - u) * (1 - w) * a[e] + u * (1 - w) * b[e] + (1 - u) * w * c[e] + u * w * d[e]));
    });
  }
  /* a partição das células das diagonais dos cantos dos vãos */
  for (const [p, q] of diagonaisDosCantos) {
    const i = facesE.findIndex((fc) => fc.includes(p) && fc.includes(q));
    if (i < 0) throw new Error(`furgao-realista: nenhuma face tem a diagonal ${p} -> ${q}`);
    const fc = facesE[i];
    const ip = fc.indexOf(p); const iq = fc.indexOf(q);
    if (fc.length !== 4 || (ip - iq + 4) % 4 !== 2) throw new Error(`furgao-realista: a face da diagonal ${p} -> ${q} não é um quadrilátero com os dois pontos opostos`);
    const r = [...fc.slice(ip), ...fc.slice(0, ip)];
    facesE.splice(i, 1, [r[0], r[1], r[2]], [r[2], r[3], r[0]]);
  }

  /* ---- a cobertura do teto plano: grade de Coons entre o anel do teto e a costura, com as linhas das nervuras retas ---- */
  const teto = listas.at(-1); const tl = teto.lista; const M = tl.length - 1;
  const bc = tl.findIndex((p) => p.col === 'D');
  if (M - bc !== tl.findIndex((p) => p.col === 'RM') || bc !== nF + 5) throw new Error('furgao-realista: a borda do teto não fecha a cobertura');
  const A = M - 2 * bc;
  const F = (b) => P.get(tl[b].nome); const R = (b) => P.get(tl[M - b].nome); const O = (a) => P.get(tl[bc + a].nome);
  const nomeTeto = (a, b) => {
    if (a === 0) return tl[b].nome;
    if (a === A) return tl[M - b].nome;
    if (b === bc) return tl[bc + a].nome;
    return b === 0 ? `cobertura${a}_0` : nomeE(`cobertura${a}_${b}`);
  };
  const zC0 = F(0)[2]; const zC1 = R(0)[2];
  const S = (a) => [0, T.altura, zC0 + ((O(a)[2] - O(0)[2]) / (O(A)[2] - O(0)[2])) * (zC1 - zC0)];
  const zNervuraIni = f.zTetoFrente - T.nervura_recuo; const zNervuraFim = f.zTetoTras + T.nervura_recuo;
  const fundoNervura = (z) => T.nervura_profundidade * suave((zNervuraIni - z) / T.nervura_rampa) * suave((z - zNervuraFim) / T.nervura_rampa);
  const bNervura = new Map([[3, 'centro'], [7, 'centro'], [2, 'borda'], [4, 'borda'], [6, 'borda'], [8, 'borda']]);
  for (let a = 1; a < A; a += 1) {
    for (let b = 0; b < bc; b += 1) {
      const u = b / bc; const v = a / A;
      const p = [0, 1, 2].map((k) => (1 - u) * S(a)[k] + u * O(a)[k] + (1 - v) * F(b)[k] + v * R(b)[k]
        - ((1 - u) * (1 - v) * F(0)[k] + u * (1 - v) * F(bc)[k] + (1 - u) * v * R(0)[k] + u * v * R(bc)[k]));
      if (b <= 8) p[0] = (1 - v) * F(b)[0] + v * R(b)[0];
      p[0] = b === 0 ? 0 : p[0];
      p[1] = T.altura - (bNervura.get(b) === 'centro' ? fundoNervura(p[2]) : 0);
      registrar(nomeTeto(a, b), p, secTeto);
    }
  }
  for (let a = 0; a < A; a += 1) {
    for (let b = 0; b < bc; b += 1) facesE.push([nomeTeto(a, b), nomeTeto(a, b + 1), nomeTeto(a + 1, b + 1), nomeTeto(a + 1, b)]);
  }

  /* ---- espelho: a metade x < 0 ---- */
  const espelho = (n) => (n.endsWith('_e') ? `${n.slice(0, -2)}_d` : n);
  for (const [n, p] of [...P]) {
    if (!n.endsWith('_e')) continue;
    P.set(espelho(n), [-p[0], p[1], p[2]]); SEC.set(espelho(n), SEC.get(n));
    if (EXTRA.has(n)) EXTRA.set(espelho(n), [-EXTRA.get(n)[0], 0, 0]);
  }
  const facesMestre = [...facesE, ...facesE.map((fc) => fc.map(espelho).reverse())];
  const arestas = new Set(); const chave = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  facesMestre.forEach((fc) => fc.forEach((n, k) => arestas.add(chave(n, fc[(k + 1) % fc.length]))));

  /* ---- as voltas das portas e dos vãos, nos nomes da gaiola ---- */
  const anel = (nome) => { const l = listas.find((x) => x.nome === nome); if (!l) throw new Error(`furgao-realista: sem anel ${nome}`); return l; };
  const anelEm = (y) => { const l = listas.find((x) => x.horizontal && Math.abs(x.y - y) < 1e-6); if (!l) throw new Error(`furgao-realista: sem anel na altura ${y}`); return l; };
  const lado = (n, s) => (s === 'd' ? espelho(n) : n);
  const ponto = (l, col, s) => { const p = l.lista.find((q) => q.col === col); if (!p) throw new Error(`furgao-realista: o anel ${l.nome} não tem a coluna ${col}`); return lado(p.nome, s); };
  const trecho = (l, c0, c1, s) => {
    const k0 = l.lista.findIndex((q) => q.col === c0); const k1 = l.lista.findIndex((q) => q.col === c1);
    if (k0 < 0 || k1 < 0) throw new Error(`furgao-realista: o anel ${l.nome} não tem ${c0} ou ${c1}`);
    const t = k0 <= k1 ? l.lista.slice(k0, k1 + 1) : l.lista.slice(k1, k0 + 1).reverse();
    return t.map((q) => lado(q.nome, s));
  };
  const coluna = (col, y0, y1, s) => {
    const sobe = y1 >= y0; const ys = [Math.min(y0, y1), Math.max(y0, y1)];
    const l = listas.filter((x) => x.horizontal && x.y >= ys[0] - 1e-6 && x.y <= ys[1] + 1e-6);
    const c = l.map((x) => ponto(x, col, s));
    return sobe ? c : c.reverse();
  };
  const fechar = (pts) => pts.filter((n, k) => n !== pts[(k + 1) % pts.length]);
  const R380 = anelEm(yBase);
  const portas = [];
  for (const s of ['e', 'd']) {
    const sufixo = s === 'e' ? 'Esquerda' : 'Direita';
    const topo = anelEm(T.porta_cabine_topo_y);
    const colD = listas.filter((x) => x.horizontal && x.y > yD && x.y <= T.porta_cabine_topo_y).map((x) => ponto(x, 'D', s));
    portas.push({
      nome: `portaCabine${sufixo}`,
      volta: fechar([...trecho(R380, 'D', 'D', s), ...colD, ...trecho(topo, 'D', 'portaCabineTras', s),
        ...coluna('portaCabineTras', T.porta_cabine_topo_y, yBase, s), ...trecho(R380, 'portaCabineTras', 'D', s)]),
    });
    /* a porta traseira sobe pelos anéis horizontais e pelos do ombro até o anel do topo dela */
    const iBaseTras = listas.findIndex((x) => x.horizontal && Math.abs(x.y - T.porta_traseira_base_y) < 1e-6);
    const iTopoTras = listas.findIndex((x) => x.nome === `ombro${T.anel_porta_traseira}`);
    const subida = listas.slice(iBaseTras, iTopoTras + 1);
    portas.push({
      nome: `portaTraseira${sufixo}`,
      volta: fechar([...trecho(subida[0], 'r0', `r${nR}`, s), ...subida.map((x) => ponto(x, `r${nR}`, s)),
        ...trecho(subida.at(-1), `r${nR}`, 'r0', s), ...[...subida].reverse().map((x) => ponto(x, 'r0', s))]),
    });
  }
  portas.push({
    nome: 'portaCorrer',
    volta: fechar([...trecho(R380, 'portaCorrerFrente', 'portaCorrerTras', 'd'), ...coluna('portaCorrerTras', yBase, T.porta_correr_topo_y, 'd'),
      ...trecho(anelEm(T.porta_correr_topo_y), 'portaCorrerTras', 'portaCorrerFrente', 'd'), ...coluna('portaCorrerFrente', T.porta_correr_topo_y, yBase, 'd')]),
  });
  /* Os cantos dos vãos. A volta de um vão que anda pela gaiola dá um canto de 90 graus em cada quina do retângulo, e a subdivisão o
     arredonda com o raio das faces dali, pequeno. Cada canto é cortado em diagonal: a volta segue, por vao_canto_degraus células, a
     diagonal que liga a coluna de dentro do canto, no anel da borda, à coluna da borda, no anel vao_canto_degraus acima, e cada
     célula dessa diagonal é partida em dois triângulos, um de cada lado dela (a gaiola foi partida acima, antes da volta ser
     conferida pelas arestas). */
  /* de (rs[0], cMeio0) a (rs.at(-1), cMeio1) pelo lado da coluna de fora cF, com os dois cantos cortados em diagonal */
  const meiaVolta = (rs, cMeio0, cMeio1, cF, s, degraus = T.vao_canto_degraus) => {
    const k = degraus;
    const rsB = rs.slice(0, k + 1); const rsT = rs.slice(rs.length - k - 1).reverse();
    const colsB = colunasDoCanto(rsB, cF, cMeio0, k); const colsT = colunasDoCanto(rsT, cF, cMeio1, k);
    const cadeiaB = rsB.map((r, j) => ponto(r, colsB[j], s)); const cadeiaT = rsT.map((r, j) => ponto(r, colsT[j], s));
    return [
      ...trecho(rsB[0], cMeio0, colsB[0], s), ...cadeiaB.slice(1), ...coluna(cF, rsB[k].y, rsT[k].y, s).slice(1),
      ...[...cadeiaT].reverse().slice(1), ...trecho(rsT[0], colsT[0], cMeio1, s).slice(1),
    ];
  };
  const vidros = [];
  {
    const rs = aneisEntre(T.para_brisa_base_y, T.para_brisa_topo_y);
    const metade = meiaVolta(rs, 'f0', 'f0', 'q3', 'e');
    vidros.push({ nome: 'paraBrisa', linha: 'abaVaoParaBrisa', volta: fechar([...metade, ...[...metade].reverse().map(espelho)]) });
  }
  for (const s of ['e', 'd']) {
    const sufixo = s === 'e' ? 'Esquerda' : 'Direita';
    const rs = aneisEntre(T.vidro_cabine_base_y, T.vidro_cabine_topo_y);
    const meio = meioDoVidroDaCabine;
    const frente = meiaVolta(rs, meio, meio, 'S0', s);
    const tras = meiaVolta(rs, meio, meio, 'vidroCabineTras', s);
    vidros.push({ nome: `vidroPortaCabine${sufixo}`, linha: `abaVaoPortaCabine${sufixo}`, volta: fechar([...frente, ...[...tras].reverse()]) });
    const rt = aneisEntre(T.vidro_traseiro_base_y, T.vidro_traseiro_topo_y);
    const dentroT = meiaVolta(rt, meioDoVidroTraseiro, meioDoVidroTraseiro, 'r1', s);
    const foraT = meiaVolta(rt, meioDoVidroTraseiro, meioDoVidroTraseiro, `r${iForaTraseiro}`, s);
    vidros.push({ nome: `vidroPortaTraseira${sufixo}`, linha: `abaVaoPortaTraseira${sufixo}`, volta: fechar([...foraT, ...[...dentroT].reverse()]) });
  }
  /* as luzes e a grade (etapa 6): voltas de cantos retos pelas arestas da gaiola, sem partir célula; o farol vai da coluna f7 da
     frente até a E, onde a quina vira lateral; a grade, de f5 a f5 passando pelo meio; a lanterna, da coluna rq3 (logo depois da
     borda da porta traseira) até a RS, já na lateral; a seta, no paralama, entre F1 e F3 */
  const luzes = [];
  {
    const rg = aneisEntre(T.farol_base_y, T.farol_topo_y);
    const metade = meiaVolta(rg, 'f0', 'f0', 'f5', 'e', 0);
    luzes.push({ nome: 'grade', linha: 'abaVaoGrade', material: 'grade', volta: fechar([...metade, ...[...metade].reverse().map(espelho)]) });
  }
  for (const s of ['e', 'd']) {
    const o = s === 'e' ? 'Esquerdo' : 'Direito'; const a = s === 'e' ? 'Esquerda' : 'Direita';
    const rf = aneisEntre(T.farol_base_y, T.farol_topo_y);
    const foraF = meiaVolta(rf, 'q1', 'q1', 'E', s, 0); const dentroF = meiaVolta(rf, 'q1', 'q1', 'f7', s, 0);
    luzes.push({ nome: `farol${o}`, linha: `abaVaoFarol${o}`, material: 'farol', volta: fechar([...foraF, ...[...dentroF].reverse()]) });
    const rl = aneisEntre(T.lanterna_base_y, T.lanterna_topo_y);
    const foraL = meiaVolta(rl, 'RM', 'RM', 'RS', s, 0); const dentroL = meiaVolta(rl, 'RM', 'RM', 'rq3', s, 0);
    luzes.push({ nome: `lanterna${a}`, linha: `abaVaoLanterna${a}`, material: 'lanterna', volta: fechar([...foraL, ...[...dentroL].reverse()]) });
    const rsS = aneisEntre(T.seta_base_y, T.seta_topo_y);
    const foraS = meiaVolta(rsS, 'F2', 'F2', 'F1', s, 0); const dentroS = meiaVolta(rsS, 'F2', 'F2', 'F3', s, 0);
    luzes.push({ nome: `seta${a}`, linha: `abaVaoSeta${a}`, material: 'seta', volta: fechar([...foraS, ...[...dentroS].reverse()]) });
  }
  /* a luz de freio alta: os anéis do ombro não são horizontais na traseira, e por isso a volta não passa por `meiaVolta` (que sobe pela
     coluna só nos anéis horizontais); vai pelos dois anéis do ombro, de r0 à coluna de fora e de volta, e o espelho fecha o outro lado */
  {
    const base = anel(`ombro${T.freio_anel_base}`); const topo = anel(`ombro${T.freio_anel_topo}`); const cF = `r${T.freio_coluna}`;
    const metade = [...trecho(base, 'r0', cF, 'e'), ...trecho(topo, cF, 'r0', 'e')];
    luzes.push({ nome: 'luzDeFreio', linha: 'abaVaoLuzDeFreio', material: 'lanterna', volta: fechar([...metade, ...[...metade].reverse().map(espelho)]) });
  }
  for (const v of [...portas, ...vidros, ...luzes]) {
    v.volta.forEach((n, k) => { if (!arestas.has(chave(n, v.volta[(k + 1) % v.volta.length]))) throw new Error(`furgao-realista: a volta ${v.nome} passa fora das arestas entre ${n} e ${v.volta[(k + 1) % v.volta.length]}`); });
  }

  /* cada volta no sentido anti-horário visto de fora: o lado de dentro fica à esquerda de quem anda nela */
  const normalDe = (n) => projetarNaSecao(SEC.get(n), P.get(n)).n;
  const orientar = (volta) => {
    let area = [0, 0, 0]; let nm = [0, 0, 0];
    volta.forEach((n, k) => { area = soma(area, cruz(P.get(n), P.get(volta[(k + 1) % volta.length]))); nm = soma(nm, normalDe(n)); });
    return dot(area, nm) < 0 ? [...volta].reverse() : volta;
  };
  [...portas, ...vidros, ...luzes].forEach((v) => { v.volta = orientar(v.volta); });

  /* ---- as regiões: as faces de dentro de cada volta, pela face à esquerda da primeira aresta e por vizinhança sem cruzar volta ---- */
  const barreira = new Set();
  [...portas, ...vidros, ...luzes].forEach((v) => v.volta.forEach((n, k) => barreira.add(chave(n, v.volta[(k + 1) % v.volta.length]))));
  const facesDaAresta = new Map();
  facesMestre.forEach((fc, i) => fc.forEach((n, k) => { const c = chave(n, fc[(k + 1) % fc.length]); if (!facesDaAresta.has(c)) facesDaAresta.set(c, []); facesDaAresta.get(c).push(i); }));
  const regiao = new Array(facesMestre.length).fill(null);
  const encher = (volta, rotulo) => {
    const [a, b] = volta;
    const semente = facesMestre.findIndex((fc) => fc.some((n, k) => n === a && fc[(k + 1) % fc.length] === b));
    if (semente < 0) throw new Error(`furgao-realista: nenhuma face à esquerda de ${a} -> ${b}`);
    const fila = [semente]; regiao[semente] = rotulo;
    while (fila.length) {
      const i = fila.pop(); const fc = facesMestre[i];
      fc.forEach((n, k) => {
        const c = chave(n, fc[(k + 1) % fc.length]);
        if (barreira.has(c)) return;
        for (const j of facesDaAresta.get(c)) if (regiao[j] === null) { regiao[j] = rotulo; fila.push(j); }
      });
    }
  };
  vidros.forEach((v) => encher(v.volta, `vidro:${v.nome}`));
  luzes.forEach((v) => encher(v.volta, `luz:${v.nome}`));
  portas.forEach((v) => encher(v.volta, `porta:${v.nome}`));

  /* ---- a fresta ----
     Cada ponto de volta de porta se divide, para cada lado da volta (a porta e a carroceria), em dois: o da borda, afastado meia
     fresta pela superfície e baixado fresta_borda_queda para dentro, e o de dentro, fresta_borda_largura além dele, na superfície.
     As faces de cada lado usam o ponto de dentro, e uma tira de faces liga os dois ao longo da volta: a borda de cada lado dobra para
     dentro como a borda de uma porta de verdade, e a fresta se lê como uma linha em qualquer luz, não só onde o fundo aparece por
     ela. O ponto de dentro leva um vinco fracionário, que segura a dobra na tira. */
  const deslocar = (n, d) => {
    const proj = projetarNaSecao(SEC.get(n), soma(sub(P.get(n), EXTRA.get(n) ?? [0, 0, 0]), d));
    return soma(proj.p, EXTRA.get(n) ?? [0, 0, 0]);
  };
  const dentroDe = new Map(); // nome -> [{porta, m}]
  portas.forEach((v) => {
    const L = v.volta.length;
    v.volta.forEach((n, k) => {
      const pa = P.get(v.volta[(k - 1 + L) % L]); const pb = P.get(v.volta[(k + 1) % L]); const p = P.get(n);
      const nrm = normalDe(n);
      const m1 = unit(cruz(nrm, unit(sub(p, pa)))); const m2 = unit(cruz(nrm, unit(sub(pb, p))));
      const mi = esc(soma(m1, m2), 1 / Math.max(0.3, 1 + dot(m1, m2)));
      if (!dentroDe.has(n)) dentroDe.set(n, []);
      dentroDe.get(n).push({ porta: v.nome, m: mi });
    });
  });
  const borda = new Map(); // `${nome}|${regiao}` -> nome do ponto da borda
  const copia = new Map(); // `${nome}|${regiao}` -> nome do ponto de dentro
  const posicoes = new Map(P);
  const largura = T.fresta_borda_largura; const queda = T.fresta_borda_queda;
  const copiar = (n, rot, mi, nomeBorda, nomeDentro) => {
    const nrm = normalDe(n);
    posicoes.set(nomeBorda, soma(deslocar(n, esc(mi, fresta / 2)), esc(nrm, -queda)));
    posicoes.set(nomeDentro, deslocar(n, esc(mi, fresta / 2 + largura)));
    borda.set(`${n}|${rot}`, nomeBorda); copia.set(`${n}|${rot}`, nomeDentro);
  };
  for (const [n, lst] of dentroDe) {
    lst.forEach(({ porta, m: mi }) => copiar(n, `porta:${porta}`, mi, `${n}_${porta}`, `${n}_${porta}_dentro`));
    const media = esc(lst.reduce((acc, x) => soma(acc, x.m), [0, 0, 0]), -1 / lst.length);
    copiar(n, 'carroceria', media, n, `${n}_corpo`);
  }
  const faces = [];
  const regiaoDaAresta = new Map();
  const regiaoDaFace = [];
  facesMestre.forEach((fc, i) => {
    const r = regiao[i];
    if (r && (r.startsWith('vidro:') || r.startsWith('luz:'))) return;
    const rot = r ?? 'carroceria';
    faces.push(fc.map((n) => copia.get(`${n}|${rot}`) ?? n));
    regiaoDaFace.push([fc, rot]);
    fc.forEach((n, k) => regiaoDaAresta.set(chave(n, fc[(k + 1) % fc.length]), rot));
  });
  /* as tiras da borda: para cada aresta de volta de porta e cada face que a tem, uma tira entre a borda e o ponto de dentro, no
     sentido da face */
  const dentroDasTiras = [];
  const arestaDeVolta = new Set();
  portas.forEach((v) => v.volta.forEach((n, k) => arestaDeVolta.add(chave(n, v.volta[(k + 1) % v.volta.length]))));
  regiaoDaFace.forEach(([fc, rot]) => fc.forEach((a, k) => {
    const b = fc[(k + 1) % fc.length];
    if (!arestaDeVolta.has(chave(a, b))) return;
    const B = (n) => borda.get(`${n}|${rot}`); const D = (n) => copia.get(`${n}|${rot}`);
    faces.push([B(a), B(b), D(b), D(a)]);
    dentroDasTiras.push([D(a), D(b)]);
  }));
  const final = (n, rot) => copia.get(`${n}|${rot}`) ?? n;

  /* ---- os cristais ----
     Cada cristal é o mesmo pedaço de superfície que o vão tirou da chapa (as faces da região `vidro:`), com a volta recuada vidro_folga_borda para dentro do
     vão pela superfície, para ficar além da perna da aba (raio + espessura = 5 mm) e deixar uma junta que a borracha cobre. Os pontos de dentro ficam
     onde estão, na superfície da chapa, e por isso o cristal é rente à lataria. */
  const lenteDoVao = (v, rot, folga, sufixo = '_cristal') => {
    const L = v.volta.length;
    const nova = new Map();
    v.volta.forEach((n, k) => {
      if (dentroDe.has(n)) throw new Error(`furgao-realista: o ponto ${n} da volta do vão ${v.nome} é também de uma porta`);
      const pa = P.get(v.volta[(k - 1 + L) % L]); const pb = P.get(v.volta[(k + 1) % L]); const p = P.get(n);
      const nrm = normalDe(n);
      const m1 = unit(cruz(nrm, unit(sub(p, pa)))); const m2 = unit(cruz(nrm, unit(sub(pb, p))));
      const mi = esc(soma(m1, m2), 1 / Math.max(0.3, 1 + dot(m1, m2)));
      nova.set(n, deslocar(n, esc(mi, folga)));
    });
    const nomeDe = (n) => (nova.has(n) ? `${n}${sufixo}` : n);
    const fs = facesMestre.filter((_, i) => regiao[i] === rot).map((fc) => fc.map(nomeDe));
    const posicoesDoCristal = new Map();
    facesMestre.forEach((fc, i) => { if (regiao[i] === rot) fc.forEach((n) => posicoesDoCristal.set(nomeDe(n), nova.get(n) ?? P.get(n))); });
    return { nome: v.nome, faces: fs, vertices: [...posicoesDoCristal.keys()].sort(), posicoes: posicoesDoCristal };
  };
  const cristais = vidros.map((v) => lenteDoVao(v, `vidro:${v.nome}`, T.vidro_folga_borda));
  /* as lentes das luzes: o pedaço de superfície que o vão tirou, recuado logo além da perna da aba, rente à lataria */
  const lentes = luzes.map((v) => ({ ...lenteDoVao(v, `luz:${v.nome}`, T.luz_folga_borda, '_lente'), material: v.material, linha: v.linha }));

  /* ---- vincos ---- */
  const cadeia = (mestres, rotuloDe) => {
    const pedacos = [];
    let atual = [];
    for (let k = 0; k + 1 < mestres.length; k += 1) {
      const c = chave(mestres[k], mestres[k + 1]);
      if (!arestas.has(c)) throw new Error(`furgao-realista: o vinco passa fora das arestas em ${mestres[k]}`);
      const rot = regiaoDaAresta.get(c);
      if (!rot || (rotuloDe && !rotuloDe(k))) { if (atual.length > 1) pedacos.push(atual); atual = []; continue; }
      const a = final(mestres[k], rot); const b = final(mestres[k + 1], rot);
      if (atual.length && atual.at(-1) === a) atual.push(b);
      else { if (atual.length > 1) pedacos.push(atual); atual = [a, b]; }
    }
    if (atual.length > 1) pedacos.push(atual);
    return pedacos;
  };
  const vincos = [];
  const atravessar = (l, c0) => { const meia = trecho(l, c0, l.lista[0].col, 'e').reverse(); return [...meia.slice(1).reverse().map(espelho), ...meia]; };
  for (const [nome, nit] of [['parachoque', T.nitidez_dobra_frente], ['boca', T.nitidez_dobra_frente], ['degrauFrente', 'viva']]) {
    vincos.push({ nome: `dobra_${nome}`, pontos: atravessar(anel(nome), 'q3').reverse(), nitidez: nit });
  }
  for (const nome of ['degrauTras', 'degrauTrasTopo']) {
    const l = anel(nome); const meia = trecho(l, 'rq1', 'r0', 'e');
    vincos.push({ nome: `dobra_${nome}`, pontos: [...meia, ...meia.slice(0, -1).reverse().map(espelho)], nitidez: 'viva' });
  }
  for (const s of ['e', 'd']) {
    const l = anel('cintura');
    const lst = trecho(l, 'E', 'RS', s);
    const temH = lst.map((n) => (EXTRA.get(n)?.[0] ?? 0) !== 0);
    cadeia(lst, (k) => temH[k] || temH[k + 1]).forEach((pts, k) => vincos.push({ nome: `vincoCintura_${s}${k}`, pontos: pts, nitidez: 'viva' }));
  }
  for (const s of ['e', 'd']) {
    for (const b of [2, 3, 4, 6, 7, 8]) {
      const pts = [];
      for (let a = 1; a < A; a += 1) {
        const n = lado(nomeTeto(a, b), s);
        const z = P.get(n)[2];
        if (z <= zNervuraIni + 1 && z >= zNervuraFim - 1) pts.push(n);
      }
      vincos.push({ nome: `nervura${b}_${s}`, pontos: pts, nitidez: T.nervura_nitidez });
    }
  }

  /* o vinco do ponto de dentro de cada tira da fresta, em cadeias ao longo da volta */
  {
    const viz = new Map();
    const liga = (a, b) => { if (!viz.has(a)) viz.set(a, []); viz.get(a).push(b); };
    dentroDasTiras.forEach(([a, b]) => { liga(a, b); liga(b, a); });
    const usada = new Set(); let k = 0;
    const andar = (ini) => {
      const pts = [ini]; let atual = ini;
      for (;;) {
        const prox = viz.get(atual).find((n) => !usada.has(chave(atual, n)));
        if (!prox) break;
        usada.add(chave(atual, prox)); pts.push(prox); atual = prox;
      }
      return pts;
    };
    const inicios = [...viz.keys()].sort((a, b) => (viz.get(a).length === 1 ? -1 : 0) - (viz.get(b).length === 1 ? -1 : 0) || (a < b ? -1 : 1));
    for (const n of inicios) {
      while (viz.get(n).some((m2) => !usada.has(chave(n, m2)))) {
        const pts = andar(n);
        if (pts.length > 1) { vincos.push({ nome: `fresta${k}`, pontos: pts, nitidez: T.fresta_borda_nitidez }); k += 1; }
      }
    }
  }

  /* os cantos: onde o arco de cada roda encontra a soleira */
  const sol = anel('soleira');
  const cantos = ['e', 'd'].flatMap((s) => arcos.flatMap((a) => [ponto(sol, `${a.id}_f`, s), ponto(sol, `${a.id}_t`, s)]));

  /* as linhas das abas dos arcos: a borda de cada arco na soleira, da frente para trás do lado esquerdo e de trás para a frente do
     direito, para a chapa ficar à esquerda de quem anda na linha */
  const abasDosArcos = arcos.flatMap((a) => ['e', 'd'].map((s) => {
    const pts = trecho(sol, `${a.id}_f`, `${a.id}_t`, s);
    return { arco: a.id, lado: s, pontos: s === 'e' ? pts : pts.reverse() };
  }));

  const usados = new Set(faces.flat());
  const vertices = [...usados].sort();
  /* o plástico de baixo, por fora da chapa: os pontos dele entram no TOPO junto com os da gaiola */
  const plastico = derivarPlastico(T, f);
  const pontosMm = new Map([...vertices.map((n) => [n, posicoes.get(n)]), ...plastico.flatMap((pl) => [...pl.posicoes]), ...cristais.flatMap((c) => [...c.posicoes]), ...lentes.flatMap((c) => [...c.posicoes])]);
  const pontos = Object.fromEntries([...pontosMm].map(([n, p]) => [n, p.map(m)]));

  /* as quatro rodas da família `roda-pneu`, no pneu da prancha, na bitola e no entre-eixos, apoiadas no chão: a chamada da família e o centro de cada uma */
  const rodas = [];
  for (const [eixo, zc] of [['Dianteiro', f.zD], ['Traseiro', f.zT]]) {
    for (const [ladoNome, s] of [['Esquerdo', 1], ['Direito', -1]]) {
      rodas.push({ sufixo: `${eixo}${ladoNome}`, s, centro: [s * T.bitola / 2, f.rPneu, zc], chamada: chamadaDaRoda(T, `roda-${eixo.toLowerCase()}-${ladoNome.toLowerCase()}`) });
    }
  }
  return {
    forma: f, aneis: listas.map((l) => ({ nome: l.nome, y: l.y, colunas: l.lista.map((p) => p.col) })), pontos, pontosMm,
    passo: { vertices, faces, vincos, cantos }, plastico, cristais,
    portas: portas.map((v) => ({ nome: v.nome, volta: v.volta })),
    vidros: vidros.map((v) => ({ nome: v.nome, linha: v.linha, volta: v.volta })),
    luzes: luzes.map((v) => ({ nome: v.nome, linha: v.linha, material: v.material, volta: v.volta })), lentes,
    abasDosArcos, rodas,
    bordaDeBaixo: [...sol.lista.map((p) => p.nome), ...sol.lista.slice(1, -1).reverse().map((p) => espelho(p.nome))],
  };
}
