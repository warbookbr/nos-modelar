/* carro-quadrado/lataria/receita/frente-traseira.js — grade, faróis, setas, lanternas, placas, puxador, fechadura e escapamento. */
import { m } from './chapa.js';

function caixa(op, id, x0, x1, y0, y1, z0, z1, chanfro) {
  const args = {
    origemId: id,
    larg: m(x1 - x0),
    alt: m(y1 - y0),
    prof: m(z1 - z0),
    em: [m((x0 + x1) / 2), m(y0), m((z0 + z1) / 2)],
  };
  if (op === 'chamferBox') args.chanfro = m(chanfro);
  return [op, args];
}

export const ID_FECHADURA = 900;
export const ID_ESCAPAMENTO = 901;

export const ALIASES_FRENTE_TRASEIRA = [
  ['fechaduraTampaInteiro', {
    unir: [
      { origem: { op: 'cilindro', id: ID_FECHADURA } },
      { origem: { op: 'cilindro', id: ID_FECHADURA, tampa: 'fundo' } },
      { origem: { op: 'cilindro', id: ID_FECHADURA, tampa: 'topo' } },
    ],
  }],
  ['escapamentoInteiro', {
    unir: [
      { origem: { op: 'cilindro', id: ID_ESCAPAMENTO } },
      { origem: { op: 'cilindro', id: ID_ESCAPAMENTO, tampa: 'fundo' } },
      { origem: { op: 'cilindro', id: ID_ESCAPAMENTO, tampa: 'topo' } },
    ],
  }],
];

export function passosFrenteTraseira(T, proxId) {
  const passos = [];
  const f = T.frentePecas;
  const t = T.traseiraPecas;
  const marcar = (nome, material, sel) => passos.push(['parte', { nome, material, sel }]);

  // --- GRADE FRONTAL ---
  const idGradeFundo = proxId();
  passos.push(caixa('cubo', idGradeFundo, -f.grade.meiaLarg, f.grade.meiaLarg, f.grade.y0 - 12, f.grade.y1 + 12, f.grade.zFundo0, f.grade.zFundo1));
  const idGradeTopo = proxId();
  passos.push(caixa('cubo', idGradeTopo, -f.grade.meiaLarg, f.grade.meiaLarg, f.grade.y1 - 12, f.grade.y1, f.grade.zFundo1, f.grade.zMoldura));
  const idGradeBase = proxId();
  passos.push(caixa('cubo', idGradeBase, -f.grade.meiaLarg, f.grade.meiaLarg, f.grade.y0, f.grade.y0 + 12, f.grade.zFundo1, f.grade.zMoldura));
  const idLamina = proxId();
  const passoLam = (f.grade.lamY1 - f.grade.lamY0) / (f.grade.laminas - 1);
  passos.push(caixa('cubo', idLamina, -f.grade.meiaLarg + 6, f.grade.meiaLarg - 6, f.grade.lamY0, f.grade.lamY0 + f.grade.lamAlt, f.grade.zFundo1, f.grade.zLamina));
  const idLaminas = proxId();
  const oLamina = { op: 'cubo', id: idLamina };
  passos.push(['arranja', {
    modo: 'linear',
    total: f.grade.laminas,
    d: [0, m(passoLam), 0],
    origemId: idLaminas,
    derivaDe: oLamina,
    sel: { origem: oLamina },
  }]);
  for (const origem of [
    { op: 'cubo', id: idGradeFundo },
    { op: 'cubo', id: idGradeTopo },
    { op: 'cubo', id: idGradeBase },
    oLamina,
    { op: 'arranja', id: idLaminas, de: oLamina },
  ]) {
    marcar('gradeFrontal', 'plasticoFosco', { origem });
  }

  // --- FARÓIS (esquerdo e direito) ---
  const idFarolCarc = proxId();
  const oFarolCarc = { op: 'cubo', id: idFarolCarc };
  passos.push(caixa('cubo', idFarolCarc, f.farol.x0, f.farol.x1, f.farol.y0 - 12, f.farol.y1 + 12, f.farol.zCarc0, f.farol.zCarc1));
  const idFarolCarcE = proxId();
  passos.push(['espelha', { eixo: 'x', origemId: idFarolCarcE, derivaDe: oFarolCarc, sel: { origem: oFarolCarc } }]);
  marcar('farol', 'plasticoFosco', { origem: oFarolCarc });
  marcar('farol', 'plasticoFosco', { origem: { op: 'espelha', id: idFarolCarcE, de: oFarolCarc } });

  const idFarolLente = proxId();
  const oFarolLente = { op: 'chamferBox', id: idFarolLente };
  passos.push(caixa('chamferBox', idFarolLente, f.farol.x0 + 5, f.farol.x1 - 4, f.farol.y0 + 5, f.farol.y1 - 5, f.farol.zLente0, f.farol.zLente1, 6));
  const idFarolLenteE = proxId();
  passos.push(['espelha', { eixo: 'x', origemId: idFarolLenteE, derivaDe: oFarolLente, sel: { origem: oFarolLente } }]);
  marcar('farol', 'lenteFarol', { origem: oFarolLente });
  marcar('farol', 'lenteFarol', { origem: { op: 'espelha', id: idFarolLenteE, de: oFarolLente } });

  // --- SETAS DIANTEIRAS (esquerda e direita) ---
  const idSeta = proxId();
  const oSeta = { op: 'chamferBox', id: idSeta };
  passos.push(caixa('chamferBox', idSeta, f.seta.x0, f.seta.x1, f.seta.y0, f.seta.y1, f.seta.z0, f.seta.z1, 10));
  const idSetaE = proxId();
  passos.push(['espelha', { eixo: 'x', origemId: idSetaE, derivaDe: oSeta, sel: { origem: oSeta } }]);
  marcar('setaDianteira', 'setaAmbar', { origem: oSeta });
  marcar('setaDianteira', 'setaAmbar', { origem: { op: 'espelha', id: idSetaE, de: oSeta } });

  // --- PLACA DIANTEIRA ---
  const idPlacaD = proxId();
  const pD = f.placa;
  passos.push(caixa('chamferBox', idPlacaD, -pD.larg / 2, pD.larg / 2, pD.yCentro - pD.alt / 2, pD.yCentro + pD.alt / 2, pD.z0, pD.z1, 3));
  marcar('placaDianteira', 'placa', { origem: { op: 'chamferBox', id: idPlacaD } });

  // --- FARÓIS DE NEBLINA + ENTRADA DE AR INFERIOR ---
  const idNeb = proxId();
  const oNeb = { op: 'chamferBox', id: idNeb };
  const neb = f.neblina;
  passos.push(caixa('chamferBox', idNeb, neb.xCentro - neb.larg / 2, neb.xCentro + neb.larg / 2, neb.yCentro - neb.alt / 2, neb.yCentro + neb.alt / 2, neb.z0, neb.z1, 5));
  const idNebE = proxId();
  passos.push(['espelha', { eixo: 'x', origemId: idNebE, derivaDe: oNeb, sel: { origem: oNeb } }]);
  marcar('farolNeblina', 'lenteNeblina', { origem: oNeb });
  marcar('farolNeblina', 'lenteNeblina', { origem: { op: 'espelha', id: idNebE, de: oNeb } });

  const idEntFundo = proxId();
  passos.push(caixa('cubo', idEntFundo, -(neb.xCentro - neb.larg / 2 - 6), neb.xCentro - neb.larg / 2 - 6, neb.yCentro - 26, neb.yCentro + 26, neb.z0 - 4, neb.z1 - 4));
  marcar('parachoqueDianteiro', 'plasticoFosco', { origem: { op: 'cubo', id: idEntFundo } });
  const idEntLam = proxId();
  const oEntLam = { op: 'cubo', id: idEntLam };
  passos.push(caixa('cubo', idEntLam, -(neb.xCentro - neb.larg / 2 - 12), neb.xCentro - neb.larg / 2 - 12, neb.yCentro - 16, neb.yCentro - 10, neb.z1 - 6, neb.z1 + 1));
  const idEntLams = proxId();
  passos.push(['arranja', { modo: 'linear', total: 3, d: [0, m(14), 0], origemId: idEntLams, derivaDe: oEntLam, sel: { origem: oEntLam } }]);
  marcar('parachoqueDianteiro', 'plasticoPreto', { origem: oEntLam });
  marcar('parachoqueDianteiro', 'plasticoPreto', { origem: { op: 'arranja', id: idEntLams, de: oEntLam } });

  // --- LANTERNAS TRASEIRAS (envolventes 3D na lateral, sem moldura preta grossa, 2 faixas âmbar + sulco em V + rubi + ré embutida) ---
  const interpTabela = (tab, y) => {
    if (y <= tab[0][0]) return tab[0][1];
    for (let i = 1; i < tab.length; i += 1) {
      if (y <= tab[i][0]) {
        const f = (y - tab[i - 1][0]) / (tab[i][0] - tab[i - 1][0]);
        return tab[i - 1][1] + (tab[i][1] - tab[i - 1][1]) * f;
      }
    }
    return tab[tab.length - 1][1];
  };
  /* curvas reais medidas na pele da chapa (Curva 1 traseira, Curva 3 bojo lateral, Curva 4 inclinação interna) */
  const tabZRear = [[526, -1996.5], [620, -2011.6], [735, -2021.1], [795, -2022.4], [848, -2019.0]];
  const tabXSide = [[526, 792.0], [620, 799.0], [735, 802.0], [795, 797.0], [848, 785.0]];
  const tabZSide = [[526, -1928.0], [620, -1941.0], [735, -1954.0], [795, -1961.0], [848, -1968.0]];
  const xInt = (y) => 632 + 32 * Math.max(0, Math.min(1, (y - 526) / (848 - 526)));

  const amostrarPele = (u, y, offsetMm = 0) => {
    const zR = interpTabela(tabZRear, y);
    const xS = interpTabela(tabXSide, y);
    const zS = interpTabela(tabZSide, y);
    const x0 = xInt(y);
    const xC = xS - 54;
    const zC = zR + 42;
    let x; let z; let nx; let nz;
    if (u <= 0.50) {
      const s = u / 0.50;
      x = x0 + (xC - x0) * s;
      z = zR + 10 * s * s;
      const len = Math.hypot(0.14 * s, -1);
      nx = (0.14 * s) / len;
      nz = -1 / len;
    } else if (u <= 0.80) {
      const a = ((u - 0.50) / 0.30) * (Math.PI / 2);
      x = xC + (xS - xC) * Math.sin(a);
      z = zC - (zC - (zR + 10)) * Math.cos(a);
      nx = Math.sin(a);
      nz = -Math.cos(a);
    } else {
      const s = (u - 0.80) / 0.20;
      x = xS;
      z = zC + (zS - zC) * s;
      nx = 1;
      nz = 0;
    }
    /* na borda dianteira da lateral (u -> 1), suaviza o offset para a lente morrer rente à lataria */
    const taper = offsetMm > 0 && u > 0.86 ? 1 - 0.45 * ((u - 0.86) / 0.14) : 1;
    const off = offsetMm * taper;
    return [m(x + nx * off), m(y), m(z + nz * off)];
  };

  /* gera uma faixa curva fechada em 3 camadas (trás, ombro, frente chanfrada), 100% quad e manifold */
  const faixaCurva = (id, u0, u1, y0, y1, offFora, offTras, chanfroU = 0.015, chanfroY = 2.0, cols = 8, curvaTopo = false) => {
    const verts = [];
    const usBase = [];
    const usFrente = [];
    for (let i = 0; i <= cols; i += 1) {
      const f = i / cols;
      usBase.push(u0 + (u1 - u0) * f);
      const uF0 = u0 + chanfroU;
      const uF1 = u1 - chanfroU;
      usFrente.push(uF0 + (uF1 - uF0) * f);
    }
    const yTopo = (u, yBase) => {
      if (!curvaTopo || u <= 0.72) return yBase;
      const k = (u - 0.72) / 0.28;
      return yBase - 14 * k * k;
    };
    const offBase = offFora > 0 ? Math.max(0.6, offFora - 2.4) : offFora;
    const idx = (camada, linha, col) => (camada * 2 + linha) * (cols + 1) + col;
    const camadas = [
      { us: usBase, dy0: 0, dy1: 0, off: offTras },
      { us: usBase, dy0: 0, dy1: 0, off: offBase },
      { us: usFrente, dy0: chanfroY, dy1: -chanfroY, off: offFora },
    ];
    for (const c of camadas) {
      for (let linha = 0; linha < 2; linha += 1) {
        for (let i = 0; i <= cols; i += 1) {
          const u = c.us[i];
          const y = linha === 0 ? y0 + c.dy0 : yTopo(u, y1) + c.dy1;
          verts.push(amostrarPele(u, y, c.off));
        }
      }
    }
    const faces = [];
    for (let i = 0; i < cols; i += 1) {
      /* face traseira (enterrada) */
      faces.push([idx(0, 0, i), idx(0, 0, i + 1), idx(0, 1, i + 1), idx(0, 1, i)]);
      /* face frontal/externa (visível) */
      faces.push([idx(2, 0, i), idx(2, 1, i), idx(2, 1, i + 1), idx(2, 0, i + 1)]);
      /* bordas inferior e superior entre camadas 0->1 e 1->2 */
      for (let k = 0; k < 2; k += 1) {
        faces.push([idx(k, 0, i), idx(k + 1, 0, i), idx(k + 1, 0, i + 1), idx(k, 0, i + 1)]);
        faces.push([idx(k, 1, i), idx(k, 1, i + 1), idx(k + 1, 1, i + 1), idx(k + 1, 1, i)]);
      }
    }
    /* borda interna (i = 0) e borda lateral dianteira (i = cols) */
    for (let k = 0; k < 2; k += 1) {
      faces.push([idx(k, 0, 0), idx(k, 1, 0), idx(k + 1, 1, 0), idx(k + 1, 0, 0)]);
      faces.push([idx(k, 0, cols), idx(k + 1, 0, cols), idx(k + 1, 1, cols), idx(k, 1, cols)]);
    }
    return ['subdivisao', { origemId: id, niveis: 0, vertices: verts, faces }];
  };

  const emitirPar = (passoFn, mat) => {
    const id = proxId();
    const passo = passoFn(id);
    const o = { op: passo[0], id };
    passos.push(passo);
    const idE = proxId();
    passos.push(['espelha', { eixo: 'x', origemId: idE, derivaDe: o, sel: { origem: o } }]);
    marcar('lanternaTraseira', mat, { origem: o });
    marcar('lanternaTraseira', mat, { origem: { op: 'espelha', id: idE, de: o } });
  };

  /* 1. Carcaça interna preta e vedação perimetral ultrafina (sem moldura grossa na lateral) */
  emitirPar((id) => faixaCurva(id, 0.0, 0.995, 526, 847, 1.8, -24, 0.008, 1.0, 10, true), 'plasticoPreto');

  /* 2. Refletor metálico cromado atrás das lentes translúcidas (dá profundidade óptica real através dos prismas) */
  emitirPar((id) => faixaCurva(id, 0.04, 0.72, 534, 839, 1.9, -4, 0.01, 1.0, 6, true), 'refletorLanterna');

  /* 3. Duas faixas âmbar no topo separadas pelo sulco contínuo em V alinhado ao vinco horizontal da lateral (y = 794..800) */
  emitirPar((id) => faixaCurva(id, 0.012, 1.0, 800, 845, 5.2, -6, 0.014, 2.2, 14, true), 'lanternaSeta');
  emitirPar((id) => faixaCurva(id, 0.012, 1.0, 793.5, 800.5, 2.8, -6, 0.008, 0.5, 10, false), 'lanternaSulco');
  emitirPar((id) => faixaCurva(id, 0.012, 1.0, 736, 794, 5.2, -6, 0.014, 2.0, 10, false), 'lanternaSeta');

  /* 4. Faixa vermelha central (freio/posição) envolvendo todo o canto até a lateral */
  emitirPar((id) => faixaCurva(id, 0.012, 1.0, 621, 734, 5.2, -6, 0.014, 2.0, 10, false), 'lanternaFreio');

  /* 5. Faixa inferior: vermelho envolvendo a lateral, a base sob a ré e a borda interna, com a luz de ré cristal embutida */
  emitirPar((id) => faixaCurva(id, 0.012, 1.0, 528, 543, 5.2, -6, 0.014, 1.6, 10, false), 'lanternaFreio');
  emitirPar((id) => faixaCurva(id, 0.012, 0.095, 542, 619, 5.2, -6, 0.008, 1.6, 2, false), 'lanternaFreio');
  emitirPar((id) => faixaCurva(id, 0.44, 1.0, 542, 619, 5.2, -6, 0.014, 1.8, 7, false), 'lanternaFreio');
  emitirPar((id) => faixaCurva(id, 0.10, 0.435, 544, 617, 5.1, -6, 0.010, 1.8, 4, false), 'lanternaRe');

  // --- PLACA TRASEIRA ---
  const idPlacaT = proxId();
  const pT = t.placa;
  passos.push(caixa('chamferBox', idPlacaT, -pT.larg / 2, pT.larg / 2, pT.yCentro - pT.alt / 2, pT.yCentro + pT.alt / 2, pT.z0, pT.z1, 3));
  marcar('placaTraseira', 'placa', { origem: { op: 'chamferBox', id: idPlacaT } });

  // --- PUXADOR DA TAMPA ---
  const idPux = proxId();
  const pux = t.puxador;
  passos.push(caixa('chamferBox', idPux, -pux.larg / 2, pux.larg / 2, pux.yCentro - pux.alt / 2, pux.yCentro + pux.alt / 2, pux.z0, pux.z1, 4));
  marcar('puxadorTampa', 'plasticoPreto', { origem: { op: 'chamferBox', id: idPux } });

  // --- FECHADURA DA TAMPA ---
  const fech = t.fechadura;
  passos.push(['cilindro', {
    origemId: ID_FECHADURA, raio: m(fech.raio), altura: m(fech.z1 - fech.z0), lados: 20, eixo: 'z',
    em: [0, m(fech.yCentro), m(fech.z0)],
  }]);
  marcar('fechaduraTampa', 'plasticoPreto', { alias: 'fechaduraTampaInteiro' });

  // --- ESCAPAMENTO ---
  const esc = t.escapamento;
  passos.push(['cilindro', {
    origemId: ID_ESCAPAMENTO, raio: m(esc.raio), altura: m(esc.z1 - esc.z0), lados: 20, eixo: 'z',
    em: [m(esc.x), m(esc.y), m(esc.z0)],
  }]);
  marcar('escapamento', 'escapamento', { alias: 'escapamentoInteiro' });

  return passos;
}
