/* coluna-forma — os laços da peça de teste "coluna sobre disco" do plano dos limites do sólido por laços: um disco de eixo z e um
 * cilindro de eixo y que sobe dele, cortados em planos y = constante, ao longo do eixo do cilindro. A forma está na TABELA; nenhum
 * dado vem de referência externa e a peça não cita nenhuma outra.
 *
 * A FORMA. O disco tem raio de 78 mm e espessura de 156 mm (z de 0 a 156), com o eixo em y = 0 e x = 0. O cilindro tem 156 mm de
 * diâmetro (o mesmo do disco), eixo em x = 0 e z = 78, e sobe do eixo do disco até y = 399, de modo que o topo fica a 477 mm do
 * fundo do disco (y = -78). As duas faces do disco ficam tangentes ao cilindro. A borda do disco tem chanfro de 2 mm nas duas
 * faces (de raio 76 na face a 78 a 2 mm dela), o topo do cilindro tem chanfro de 2 mm (de raio 78 a 76), e o encontro do cilindro
 * com o disco tem filete de raio nominal 12 mm, que some onde as duas superfícies ficam tangentes (y = 0).
 *
 * OS LAÇOS. O contorno no plano y, em [x, z], tem 18 trechos na ordem da volta (começa na face z = 0 e anda para +x): a face de
 * baixo, o chanfro, a parede do disco, o filete, a parede do cilindro, o filete de cima, a parede do disco, o chanfro e a face
 * de cima (lado D), e a volta do lado E, espelhada. Abaixo do eixo do disco só há o disco: o cilindro, os filetes e a parede de
 * cima e de baixo ficam sem comprimento, num ponto. Acima de y = 78 só há o cilindro, e os trechos do disco ficam sem comprimento
 * nos extremos do círculo. A seção em y = -78 é um segmento (o fundo do disco), de área zero. O filete é uma quádrica tangente à
 * parede do disco e ao círculo do cilindro no plano de corte, com tangente de `raioDoEncontro * tg(metade da dobra no plano)`,
 * limitada ao que cabe na parede do disco. */
import { gaiolaPorLacos } from '../../../procedural/nucleo/gaiola-por-lacos.js';

export const TABELA = {
  raio: 78,
  alturaTotal: 477,
  chanfro: 2,
  raioDoEncontro: 12,
  /* passo, em graus, dos planos em volta do disco (y = raio * sen), de -60 a 60; os de ±raio são os extremos do disco, e os de
     `planosDaPontaDoDisco` (y em mm) fecham as pontas com planos a 2,5 mm um do outro, o mínimo entre planos */
  passoDosPlanosDoDisco: 10,
  planosDaPontaDoDisco: [75.5, 72.9],
  /* os planos do cilindro, em mm acima do eixo do disco; o último antes do topo é o do chanfro (topo - chanfro) */
  planosDoCilindro: [86, 98, 114, 136, 166, 205, 250, 295, 338, 368, 387],
  /* a tangente do filete no plano de corte que não vale a pena: abaixo disto o trecho some (o ajudante o funde) */
  filete: { pontos: 7, comprimentoMinimo: 2.5, razao: 2 },
  pontos: { face: 5, chanfro: 2, parede: 6, parede_razao: 0.07, parede_some: 1.5, cilindro: 11, cilindro_razao: 5 },
  /* os trechos que a compensação leva para a superfície limite passar por eles: o cilindro, a parede do disco e os chanfros */
  compensar: ['filB_D', 'filT_D', 'filT_E', 'filB_E', 'col_D1', 'col_D2', 'col_E1', 'col_E2', 'aroB_D', 'aroT_D', 'aroB_E', 'aroT_E', 'chB_D', 'chT_D', 'chT_E', 'chB_E'],
  niveis: 2,
};

const graus = (g) => (g * Math.PI) / 180;
const espelho = (poli) => poli.map(([x, z]) => [-x, z]).reverse();

/** planosDeCorte(t) -> as posições y dos laços, em mm: o fundo do disco, os planos em volta do disco, o eixo, o cilindro, o chanfro do topo. */
export function planosDeCorte(t = TABELA) {
  const R = t.raio;
  const angulos = [];
  for (let g = -t.passoDosPlanosDoDisco * Math.floor(60 / t.passoDosPlanosDoDisco); g <= 60 + 1e-9; g += t.passoDosPlanosDoDisco) angulos.push(g);
  const meio = angulos.map((g) => R * Math.sin(graus(g)));
  const pontas = [...t.planosDaPontaDoDisco].sort((a, b) => b - a);
  const disco = [-R, ...pontas.map((y) => -y), ...meio, ...[...pontas].reverse(), R];
  const topo = t.alturaTotal - R;
  return [...disco, ...t.planosDoCilindro, topo - t.chanfro, topo];
}

/* o filete entre a parede x = w do disco (que sobe) e o círculo do cilindro (centro [0, R], raio rc), na dobra de psi = asin(y / rc) */
function filete(w, y, rc, R, r, zMinimo, pontos) {
  const psi = Math.asin(Math.min(1, y / rc));
  const monta = (tl) => {
    const phi2 = -psi + tl / rc;
    const ctrlZ = R + (rc - w * Math.cos(phi2)) / Math.sin(phi2);
    const p2 = [rc * Math.cos(phi2), R + rc * Math.sin(phi2)];
    const dtan = Math.hypot(p2[0] - w, p2[1] - ctrlZ);
    return { phi2, ctrl: [w, ctrlZ], p1: [w, ctrlZ - dtan], p2 };
  };
  let tl = r * Math.tan(psi / 2);
  let f = monta(tl);
  for (let k = 0; k < 60 && (f.phi2 > -0.15 * psi || f.p1[1] < zMinimo); k++) { tl *= 0.9; f = monta(tl); }
  const bez = Array.from({ length: pontos }, (_, k) => {
    const s = k / (pontos - 1);
    return [(1 - s) ** 2 * f.p1[0] + 2 * (1 - s) * s * f.ctrl[0] + s * s * f.p2[0], (1 - s) ** 2 * f.p1[1] + 2 * (1 - s) * s * f.ctrl[1] + s * s * f.p2[1]];
  });
  return { bez, phi2: f.phi2, p1: f.p1, p2: f.p2 };
}

/** lacoNoPlano(t, y) -> { em, trechos }: o contorno da peça no plano y, em [x, z] mm. */
export function lacoNoPlano(t, y) {
  const R = t.raio; const c = t.chanfro; const esp = 2 * R;
  const topo = t.alturaTotal - R;
  const rc = y > topo - c + 1e-9 ? R - (c * (y - (topo - c))) / c : R;
  const ay = Math.abs(y);
  const lacos = {};
  const arco = (de, ate, n) => Array.from({ length: n }, (_, k) => { const a = de + ((ate - de) * k) / (n - 1); return [rc * Math.cos(a), R + rc * Math.sin(a)]; });
  let D;
  if (y >= R - 1e-9) {
    /* só o cilindro: os trechos do disco ficam sem comprimento nos extremos do círculo */
    const b = [0, R - rc]; const a = [0, R + rc];
    D = { chB: [b], aroB: [b], filB: [b], col: arco(-Math.PI / 2, Math.PI / 2, 41), filT: [a], aroT: [a], chT: [a] };
    return { em: y, trechos: reunir(D, [0, R - rc], [0, R + rc]) };
  }
  const w = Math.sqrt(R * R - y * y);
  const xf = ay < R - c ? Math.sqrt((R - c) ** 2 - y * y) : 0;
  const z0 = ay < R - c ? 0 : ay - (R - c);
  if (y <= 0) {
    const m = [w, R];
    D = { chB: [[xf, z0], [w, c]], aroB: [[w, c], m], filB: [m], col: [m], filT: [m], aroT: [m, [w, esp - c]], chT: [[w, esp - c], [xf, esp - z0]] };
    return { em: y, trechos: reunir(D, [xf, z0], [xf, esp - z0]) };
  }
  const zMinimo = c + 0.3;
  const fil = filete(w, y, R, R, t.raioDoEncontro, zMinimo, t.filete.pontos);
  const baixo = fil.bez;
  const cima = baixo.map(([x, z]) => [x, esp - z]).reverse();
  const phi = fil.phi2;
  /* a parede do cilindro, de uma ponta de filete à outra, passando por [R, R] */
  const col = Array.from({ length: 41 }, (_, k) => { const a = phi + ((-2 * phi) * k) / 40; return [rc * Math.cos(a), R + rc * Math.sin(a)]; });
  D = {
    chB: [[xf, z0], [w, c]], aroB: [[w, c], fil.p1], filB: baixo, col, filT: cima,
    aroT: [[w, esp - fil.p1[1]], [w, esp - c]], chT: [[w, esp - c], [xf, esp - z0]],
  };
  return { em: y, trechos: reunir(D, [xf, z0], [xf, esp - z0]) };
}

/* junta o lado D e o espelho dele, na ordem da volta */
function reunir(D, inicioDaFace, fimDaFace) {
  /* a parede do cilindro vai em duas metades, do filete de baixo ao meio e do meio ao filete de cima, cada uma com o passo a crescer para o meio */
  const metades = (c) => (c.length > 1 ? [c.slice(0, 21), c.slice(20)] : [c, c]);
  const E = { chT: espelho(D.chT), aroT: espelho(D.aroT), filT: espelho(D.filT), col: espelho(D.col), filB: espelho(D.filB), aroB: espelho(D.aroB), chB: espelho(D.chB) };
  return {
    faceB: [[-inicioDaFace[0], inicioDaFace[1]], [inicioDaFace[0], inicioDaFace[1]]],
    chB_D: D.chB, aroB_D: D.aroB, filB_D: D.filB, col_D1: metades(D.col)[0], col_D2: metades(D.col)[1], filT_D: D.filT, aroT_D: D.aroT, chT_D: D.chT,
    faceT: [[fimDaFace[0], fimDaFace[1]], [-fimDaFace[0], fimDaFace[1]]],
    chT_E: E.chT, aroT_E: E.aroT, filT_E: E.filT, col_E1: metades(E.col)[0], col_E2: metades(E.col)[1], filB_E: E.filB, aroB_E: E.aroB, chB_E: E.chB,
  };
}

const NOMES = ['faceB', 'chB_D', 'aroB_D', 'filB_D', 'col_D1', 'col_D2', 'filT_D', 'aroT_D', 'chT_D', 'faceT', 'chT_E', 'aroT_E', 'filT_E', 'col_E1', 'col_E2', 'filB_E', 'aroB_E', 'chB_E'];

/** argumentosDaGaiola(t) -> o que a peça passa a `gaiolaPorLacos`. */
export function argumentosDaGaiola(t = TABELA) {
  const p = t.pontos;
  const ys = planosDeCorte(t);
  const topo = ys.length - 1;
  const aoDisco = ys.findIndex((y) => y >= t.raio - 1e-9);
  /* a parede do disco anda do chanfro ao filete com o passo a encurtar: o primeiro segmento é longo e o último mede `parede_razao` dele */
  const razaoDaParede = { aroB_D: p.parede_razao, aroT_E: p.parede_razao, aroT_D: 1 / p.parede_razao, aroB_E: 1 / p.parede_razao };
  const trechos = NOMES.map((nome) => {
    if (nome.startsWith('face')) return { nome, pontos: p.face };
    if (nome.startsWith('col')) return { nome, pontos: p.cilindro, razao: nome.endsWith('1') ? p.cilindro_razao : 1 / p.cilindro_razao };
    if (nome.startsWith('ch')) return { nome, pontos: p.chanfro };
    if (nome.startsWith('aro')) return { nome, pontos: p.parede, razao: razaoDaParede[nome], some: p.parede_some };
    /* o filete anda da parede ao cilindro com o passo a crescer (na volta de baixo do lado D e de cima do lado E) ou ao contrário */
    return { nome, pontos: t.filete.pontos, razao: nome === 'filB_D' || nome === 'filT_E' ? t.filete.razao : 1 / t.filete.razao, some: t.filete.comprimentoMinimo };
  });
  const viva = (nome, entre) => ({ nome, entre, lacos: ['l0', `l${aoDisco}`], nitidez: 'viva' });
  const ultimo = `l${topo}`;
  return {
    nome: 'c', eixo: 'y', trechos, tampa: { de: 'faceB', ate: 'faceT' },
    lacos: ys.map((y) => lacoNoPlano(t, y)),
    /* as seis linhas do chanfro do disco vão do fundo do disco ao extremo dele, e o topo do cilindro leva o vinco da volta inteira nos dois planos do chanfro */
    vincos: [
      viva('faceBeiraDireita', ['faceB', 'chB_D']), viva('chanfroBaixoDireita', ['chB_D', 'aroB_D']),
      viva('chanfroCimaDireita', ['aroT_D', 'chT_D']), viva('faceCimaDireita', ['chT_D', 'faceT']),
      viva('faceCimaEsquerda', ['faceT', 'chT_E']), viva('chanfroCimaEsquerda', ['chT_E', 'aroT_E']),
      viva('chanfroBaixoEsquerda', ['aroB_E', 'chB_E']), viva('faceBeiraEsquerda', ['chB_E', 'faceB']),
      { nome: 'topo', laco: 'ultimo', nitidez: 'viva' }, { nome: 'chanfroDoTopo', laco: `l${topo - 1}`, nitidez: 'viva' },
    ],
    compensar: { trechos: t.compensar, pontas: true },
    /* o disco é o que não é parede do cilindro (as faces, os chanfros, a parede do disco e os filetes do encontro), e o cilindro é a parede
       dele, de cima a baixo, com a tampa do topo; a parede do cilindro abaixo do topo do disco fica no cilindro e não no disco */
    grupos: [
      { nome: 'pe', trechos: NOMES.filter((n) => !n.startsWith('col')) },
      { nome: 'coluna', unir: [{ trechos: NOMES.filter((n) => n.startsWith('col')) }, { lacos: [ultimo, ultimo] }] },
    ],
  };
}

export function derivar(t = TABELA, ajudante = gaiolaPorLacos, extra = {}) {
  const a = { ...argumentosDaGaiola(t), ...extra };
  return ajudante(a);
}
