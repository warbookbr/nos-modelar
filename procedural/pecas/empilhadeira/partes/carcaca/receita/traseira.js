/* empilhadeira/carcaca, receita/traseira.js — a traseira da carcaça: capô, grade, fundo da grade, tampa, contrapeso, os rebaixos
 * dele, o pino e o trinco, escritos em mm num estado { passos, topo, origem } com as medidas de `TABELA.traseira`.
 *
 * O contorno lateral de cada parte vem da lateral de caráter (`CONTORNOS_DA_LATERAL`). A meia largura em cada altura e os vãos foram
 * medidos por cor na vista de trás (`referencias/carcaca-tras.ia.png`), linha a linha, em px dela; a altura dá a escala (topo da tampa
 * a 1.152 mm na linha 272, 4,03 mm/px). A planta é a curva da traseira medida na vista de cima. Os corpos saem de `lacosPelasVistas`:
 * laços horizontais em que a ponta de trás acompanha a planta em toda altura. O porquê de cada medida está ao lado dela, na TABELA. */
import { ferramentas, lado, interpolar } from './ferramentas.js';

/* a face da frente de cada corpo é plana e fica escondida no conjunto: as duas quinas dela levam vinco */
export const QUINAS = { vincos: [{ nome: 'quinaDireita', entre: ['direita', 'fim'], nitidez: 'viva' }, { nome: 'quinaEsquerda', entre: ['fim', 'esquerda'], nitidez: 'viva' }] };

/** As medidas derivadas da vista de trás: a conversão de px em mm, a planta da traseira e as vistas do capô. */
export function derivarTraseira(T, contornos) {
  const R = T.traseira;
  const MM = R.vista.mmPorPx;
  const FIM = R.fim;
  const H = (ypx) => Math.round((R.vista.topo - (ypx - R.vista.linhaDoTopo) * MM) * 10) / 10;
  const perfil = (meias) => meias.map(([y, w]) => [H(y), w * MM]);
  const simetrico = (meias) => [...meias.map(([y, w]) => [w * MM, H(y)]), ...[...meias].reverse().map(([y, w]) => [-w * MM, H(y)])];
  const ARRED = R.arredondamento;
  const plantaTraseira = (meia, frente) => {
    const d = [[meia, -frente], ...ARRED.map(([dz, f]) => [meia * f, -(FIM - dz)])];
    return [...d, ...[...d].reverse().map(([x, z]) => [-x, z])];
  };
  const zDaTraseira = (x, meia) => {
    const f = Math.min(1, Math.abs(x) / meia);
    const pts = ARRED.map(([dz, ff]) => [ff, dz]).sort((a, b) => a[0] - b[0]);
    for (let i = 1; i < pts.length; i += 1) {
      if (f >= pts[i - 1][0] && f <= pts[i][0]) return -(FIM - (pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * (f - pts[i - 1][0]) / ((pts[i][0] - pts[i - 1][0]) || 1)));
    }
    return -FIM;
  };
  const C = R.capo;
  const meiaCapo = C.meiaPx * MM;
  const recuoDaPlanta = (x) => FIM + zDaTraseira(x, meiaCapo);
  const VAO = [...R.grade.vao, ...C.vaoAcimaDaGrade];
  const meiaDoVao = (y) => interpolar(perfil(VAO), y);
  const secaoDoMeio = ([z, y]) => (z > C.secaoDoMeio.zDe && y >= C.secaoDoMeio.yDe
    ? [Math.min(z + recuoDaPlanta(meiaDoVao(y) + C.bordaDoVaoPx * MM), C.pontaDoBico + C.secaoDoMeio.alemDoBico), y] : [z, y]);
  const vistasDoCapo = {
    lado: lado(contornos.capo, ([z, y]) => secaoDoMeio([z, y > C.ombroAcimaDe ? C.topo : y])),
    perfil: perfil(C.perfil), planta: plantaTraseira(meiaCapo, C.frentePlanta),
    estacoes: C.estacoes,
  };
  return { MM, H, perfil, simetrico, plantaTraseira, zDaTraseira, meiaCapo, VAO, vistasDoCapo };
}

/** Monta a traseira no estado e devolve as meias larguras usadas. `pocoDaRoda` é o cilindro do pneu traseiro com a folga, quando a
 *  carcaça monta as rodas: { z, y, r, de }. */
export function montarTraseira(estado, T, contornos, { pocoDaRoda = null } = {}) {
  const R = T.traseira; const COR = T.cores;
  const D = derivarTraseira(T, contornos);
  const { MM, H, perfil, simetrico, plantaTraseira, zDaTraseira, meiaCapo, VAO } = D;
  const { extX: extrusaoX, extY, extZ, booleana, parte, corpo } = ferramentas(estado);
  const C = R.capo; const G = R.grade;

  /* capô: o casco laranja, com o vão da grade e a borda rebaixada em volta dele */
  const VINCOS_DO_CAPO = { vincos: [...QUINAS.vincos, { nome: 'base', laco: 'primeiro', nitidez: C.nitidezDaBase }, { nome: 'ombro', laco: 'ultimo', nitidez: C.nitidezDoOmbro }] };
  let capo = corpo('capo', D.vistasDoCapo, VINCOS_DO_CAPO);
  const BORDA = C.bordaDoVaoPx; const BORDA_MM = C.fundoDaBorda;
  const FUNDO_DO_VAO = C.fundoDoVao;
  const recuado = corpo('capoRecuado', { ...D.vistasDoCapo, lado: D.vistasDoCapo.lado.map(([c, a]) => [c < -C.recuoDaBordaAte ? c + BORDA_MM : c, a]) }, VINCOS_DO_CAPO);
  const vaoAlargado = extZ(simetrico(VAO.map(([y, w]) => [y > C.bordaDeBaixoAbaixoDe ? y + BORDA : y, w + BORDA])), FUNDO_DO_VAO, R.alemDaTraseira);
  /* a quina do bico sob o vão, tirada atrás da curva em S da silhueta lateral */
  const QS = C.quinaDaSoleira;
  const curvaDaQuina = Array.from({ length: QS.trechos + 1 }, (_, k) => {
    const t = k / QS.trechos;
    return [QS.z[0] - (QS.z[0] - QS.z[1]) * (3 * t * t - 2 * t * t * t), QS.y[0] + (QS.y[1] - QS.y[0]) * t];
  });
  const alem = -R.alemDaTraseira;
  const quina = extrusaoX([[alem, QS.y[0]], ...curvaDaQuina, [QS.z[1], QS.ate], [alem, QS.ate]].map(([z, y]) => [-z, y]), -QS.meia, QS.meia);
  capo = booleana('subtrair', [capo, booleana('subtrair', [vaoAlargado, recuado]), extZ(simetrico(VAO.map(([y, w]) => [y, w + 1])), FUNDO_DO_VAO, R.alemDaTraseira), quina]);
  parte('capo', capo, COR.laranja);

  /* grade: a moldura cinza em U apoiada na rampa do vão, que acompanha a curva da planta do capô, e o fundo escuro */
  const [zAlto, yAlto, zBaixo, yBaixo] = G.rampa;
  const rampa = (de, ate) => [[-(zAlto + de), yAlto], [-(zAlto + ate), yAlto], [-(zBaixo + ate), yBaixo], [-(zBaixo + de), yBaixo]];
  const placa = (nome, de, ate) => corpo(nome, { lado: rampa(de, ate), perfil: perfil([G.soleira, ...G.vao]), planta: plantaTraseira(meiaCapo, C.frentePlanta),
    estacoes: G.estacoes, curto: 'inicio', espessuraMinima: G.espessuraMinima }, QUINAS);
  const furos = G.furos.map((f) => extZ(f.map(([x, y]) => [x * MM, H(y)]), G.furosDe, R.alemDaTraseira));
  parte('grade', booleana('subtrair', [placa('grade', ...G.moldura), ...furos]), COR.cinzaClaro);
  parte('fundoGrade', placa('fundoGrade', ...G.fundo), COR.escuro);

  /* tampa: o painel central com a aba de trás */
  const TA = R.tampa;
  const meiaTampa = TA.meiaPx * MM;
  const bordaDaTampa = TA.fracoes.map((f) => [f, TA.ponta - TA.recuo * f * f - (f === 1 ? TA.recuoDoCanto : 0)]);
  const plantaDaTampa = [[meiaTampa, -TA.frente], ...[...bordaDaTampa].reverse().map(([f, z]) => [meiaTampa * f, -z]),
    ...bordaDaTampa.slice(1).map(([f, z]) => [-meiaTampa * f, -z]), [-meiaTampa, -TA.frente]];
  const tampa = corpo('tampa', {
    lado: lado(contornos.tampa, ([z, y]) => [z, y > TA.topoAcimaDe ? TA.topo : (y > TA.ombro[0] && y < TA.ombro[1] ? C.topo : y)]),
    perfil: perfil(TA.perfil), planta: plantaDaTampa,
    estacoes: TA.estacoes, curto: 'inicio',
  }, QUINAS);
  parte('tampa', tampa, COR.cinzaClaro);

  /* contrapeso: a faixa de cima larga e os lados côncavos */
  const CP = R.contrapeso;
  const meiaContra = CP.meiaPx * MM;
  const [zCunha, yCunha, zCunhaAte, yTopoAcima, yPeAbaixo] = CP.ajusteDoLado;
  let contra = corpo('contrapeso', {
    lado: lado(contornos.contrapeso, ([z, y]) => [z > zCunha && y > yCunha ? zCunhaAte : z, y > yTopoAcima || (z > zCunha && y > yCunha) ? CP.topo : (y < yPeAbaixo ? CP.pe : y)]),
    perfil: perfil(CP.perfil), planta: plantaTraseira(meiaContra, CP.frentePlanta),
    estacoes: CP.estacoes,
  }, { vincos: [...QUINAS.vincos, { nome: 'faixa', laco: CP.lacoDaFaixa, nitidez: 'viva' }] });
  /* os rebaixos, em px da vista de trás com x medido do centro (+ é o +x do modelo): o contorno de cantos redondos é cortado ao longo de
     z, do fundo do rebaixo para fora, a partir da borda da planta naquele x */
  function arredondado(x0, x1, y0, y1, r) {
    const pts = [];
    for (const [cx, cy, a0] of [[x1 - r, y1 + r, 270], [x1 - r, y0 - r, 0], [x0 + r, y0 - r, 90], [x0 + r, y1 + r, 180]]) {
      for (let k = 0; k <= 4; k += 1) { const a = (a0 + 22.5 * k) * Math.PI / 180; pts.push([(cx + r * Math.cos(a)) * MM, H(cy + r * Math.sin(a))]); }
    }
    return pts;
  }
  const meiaLua = (cx, base, r) => Array.from({ length: 13 }, (_, k) => [(cx + r * Math.cos(Math.PI * k / 12)) * MM, H(base - r * Math.sin(Math.PI * k / 12))]);
  const REBAIXOS = Object.fromEntries(Object.entries(CP.rebaixos).map(([nome, v]) => [nome, {
    contorno: v.meiaLua
      ? [...meiaLua(...v.meiaLua), ...v.base.map(([x, y]) => [x * MM, H(y)])]
      : arredondado(...v.caixa),
    x: v.x, fundo: v.fundo,
  }]));
  const cortar = (v, de, ate) => { const z = zDaTraseira(v.x * MM, meiaContra); return extZ(v.contorno, z + de, ate === null ? R.alemDaTraseira : z + ate); };
  const pocos = !pocoDaRoda ? [] : [1, -1].map((s) => {
    const p = pocoDaRoda; const n = T.ladosDoCirculo;
    const c = Array.from({ length: n }, (_, k) => [p.z + p.r * Math.cos(2 * Math.PI * k / n), p.y + p.r * Math.sin(2 * Math.PI * k / n)]);
    return extrusaoX(c, s > 0 ? p.de : -T.alemDoLado, s > 0 ? T.alemDoLado : -p.de);
  });
  contra = booleana('subtrair', [contra, ...Object.values(REBAIXOS).map((v) => cortar(v, v.fundo, null)), ...pocos]);
  parte('contrapeso', contra, COR.cinza);
  parte('fundoRasgo', cortar(REBAIXOS.rasgo, REBAIXOS.rasgo.fundo, REBAIXOS.rasgo.fundo - CP.espessuraDoFundo), COR.escuro);
  parte('fundoNicho', cortar(REBAIXOS.nicho, REBAIXOS.nicho.fundo, REBAIXOS.nicho.fundo - CP.espessuraDoFundo), COR.escuro);
  const PI = CP.pino;
  parte('pino', extY([[-PI.meia, -PI.z[0]], [PI.meia, -PI.z[0]], [PI.meia, -PI.z[1]], [-PI.meia, -PI.z[1]]], H(PI.linhas[0]), H(PI.linhas[1])), COR.cinza);
  const TR = CP.trinco;
  parte('trinco', extY([[-TR.meiaPx * MM, -TR.z[0]], [TR.meiaPx * MM, -TR.z[0]], [TR.meiaPx * MM, -TR.z[1]], [-TR.meiaPx * MM, -TR.z[1]]], H(TR.linhas[0]), H(TR.linhas[1])), COR.cinza);
  return { meiaCapo, meiaTampa, meiaContra };
}
