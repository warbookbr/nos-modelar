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

  // --- LANTERNAS TRASEIRAS (acompanham a inclinação da tampa e envolvem o canto, com moldura, divisórias e frisos de lente) ---
  const lt = t.lanterna;
  /* posição Z aproximada da pele traseira em função de (x, y), acompanhando a rampa da tampa e a curva do canto */
  const zPele = (x, y) => {
    const tY = Math.max(0, (y - 560) / 395);
    const zBase = -2024 + 70 * tY;
    const tX = Math.max(0, (x - 715) / 65);
    return zBase + 16 * tX * tX;
  };
  const xExt = (y) => 772 - 22 * Math.max(0, Math.min(1, (y - 535) / 280));

  /* gera um bloco trapezoidal chanfrado que segue a inclinação zPele(x, y) da tampa, sem sobrar no topo nem abrir fresta */
  const blocoInclinado = (id, x0, x1a, x1b, y0, y1, avancoMm, recuoMm, chanfroMm = 0) => {
    const pt = (x, y, dz) => [m(x), m(y), m(zPele(x, y) + dz)];
    /* 0..3: traseira (enterrada dentro da chapa); 4..7: face frontal */
    const verts = [
      pt(x0, y0, recuoMm), pt(x1a, y0, recuoMm), pt(x1b, y1, recuoMm), pt(x0, y1, recuoMm),
      pt(x0, y0, -avancoMm), pt(x1a, y0, -avancoMm), pt(x1b, y1, -avancoMm), pt(x0, y1, -avancoMm),
    ];
    if (chanfroMm > 0) {
      const c = chanfroMm;
      verts.push(
        pt(x0 + c, y0 + c, -(avancoMm + c * 0.7)),
        pt(x1a - c, y0 + c, -(avancoMm + c * 0.7)),
        pt(x1b - c, y1 - c, -(avancoMm + c * 0.7)),
        pt(x0 + c, y1 - c, -(avancoMm + c * 0.7)),
      );
      return ['subdivisao', {
        origemId: id,
        niveis: 0,
        vertices: verts,
        faces: [
          [0, 1, 2, 3],
          [11, 10, 9, 8],
          [0, 4, 5, 1], [1, 5, 6, 2], [2, 6, 7, 3], [3, 7, 4, 0],
          [4, 8, 9, 5], [5, 9, 10, 6], [6, 10, 11, 7], [7, 11, 8, 4],
        ],
      }];
    }
    return ['subdivisao', {
      origemId: id,
      niveis: 0,
      vertices: verts,
      faces: [
        [0, 1, 2, 3], [7, 6, 5, 4],
        [0, 4, 5, 1], [1, 5, 6, 2], [2, 6, 7, 3], [3, 7, 4, 0],
      ],
    }];
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

  /* 1. Moldura/guarnição preta perimetral acompanhando a inclinação da tampa (veda 100% do vão) */
  emitirPar((id) => blocoInclinado(id, lt.x0 - 6, xExt(lt.yRe[0] - 6) + 5, xExt(lt.ySeta[1] + 6) + 5, lt.yRe[0] - 6, lt.ySeta[1] + 6, 4, 28, 2.5), 'plasticoPreto');

  /* 2. Quatro câmaras de lente chanfradas e niveladas com a rampa da tampa */
  const camaras = [
    { x0: lt.x0 + 1, x1a: lt.x0 + 54, x1b: lt.x0 + 54, y0: lt.yRe[0] + 1, y1: lt.yRe[1] - 2.5, mat: 'lanternaRe' },
    { x0: lt.x0 + 57, x1a: xExt(lt.yRe[0]) - 1, x1b: xExt(lt.yRe[1]) - 1, y0: lt.yRe[0] + 1, y1: lt.yRe[1] - 2.5, mat: 'lanternaFreio' },
    { x0: lt.x0 + 1, x1a: xExt(lt.yFreio[0]) - 1, x1b: xExt(lt.yFreio[1]) - 1, y0: lt.yFreio[0] + 2, y1: lt.yFreio[1] - 2.5, mat: 'lanternaFreio' },
    { x0: lt.x0 + 1, x1a: xExt(lt.ySeta[0]) - 1, x1b: xExt(lt.ySeta[1]) - 1, y0: lt.ySeta[0] + 2, y1: lt.ySeta[1] - 1, mat: 'lanternaSeta' },
  ];
  for (const cm of camaras) {
    emitirPar((id) => blocoInclinado(id, cm.x0, cm.x1a, cm.x1b, cm.y0, cm.y1, 9, 10, 3), cm.mat);
  }

  /* 3. Frisos horizontais finos nas lentes (textura prismática clássica de lanterna) */
  const frisosY = [572, 642, 672, 702, 760, 785];
  for (const fy of frisosY) {
    emitirPar((id) => blocoInclinado(id, lt.x0 + 4, xExt(fy) - 4, xExt(fy + 2) - 4, fy, fy + 2, 11.2, 4, 0), 'plasticoFosco');
  }

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
