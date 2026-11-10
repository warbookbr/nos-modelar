/* empilhadeira/carcaca, receita/ferramentas.js — as ferramentas que escrevem os passos da carcaça em milímetro num estado
 * { passos, topo, origem }, e o contorno lateral simplificado de uma parte.
 *
 * Os passos saem em milímetro porque o rascunho da máquina inteira (`referencias/empilhadeira.esboco.mjs`) monta as outras frentes
 * sobre o mesmo estado, e o esboço 2.0 é em milímetro; a receita converte para metro num lugar só, no `gerarPassos` dela. O contador
 * de origem é do estado, para que vários módulos escrevam na mesma lista sem repetir id.
 *
 * Eixos: x lateral (+x é a esquerda de quem dirige), y altura, z comprimento com a frente em +z. O ponto [z, y] da lateral de
 * referência tem z para trás, e entra no modelo como [-z, y]. */
import { gaiolaPorLacos } from '../../../../../nucleo/gaiola-por-lacos.js';
import { lacosPelasVistas } from '../../../../../nucleo/lacos-pelas-vistas.js';

const SINAL = { x: 1, y: 1, z: -1 };

/* Ramer-Douglas-Peucker sobre o anel, partido no ponto mais distante do primeiro */
function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  const [x1, y1] = pts[0]; const [x2, y2] = pts[pts.length - 1];
  const n = Math.hypot(x2 - x1, y2 - y1) || 1e-9;
  let dmax = 0; let idx = 0;
  for (let i = 1; i < pts.length - 1; i += 1) {
    const d = Math.abs((y2 - y1) * pts[i][0] - (x2 - x1) * pts[i][1] + x2 * y1 - y2 * x1) / n;
    if (d > dmax) { dmax = d; idx = i; }
  }
  return dmax > eps ? [...rdp(pts.slice(0, idx + 1), eps).slice(0, -1), ...rdp(pts.slice(idx), eps)] : [pts[0], pts[pts.length - 1]];
}
/** O contorno simplificado com tolerância `eps` em mm. */
export function simplifica(c, eps = 6) {
  let longe = 0;
  c.forEach((p, i) => { if (Math.hypot(p[0] - c[0][0], p[1] - c[0][1]) > Math.hypot(c[longe][0] - c[0][0], c[longe][1] - c[0][1])) longe = i; });
  return [...rdp(c.slice(0, longe + 1), eps).slice(0, -1), ...rdp([...c.slice(longe), c[0]], eps).slice(0, -1)];
}
export const area = (p) => p.reduce((s, q, i) => s + q[0] * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * q[1], 0) / 2;
export const r1 = (v) => Math.round(v * 10) / 10;
export const interpolar = (tabela, v) => {
  if (v <= tabela[0][0]) return tabela[0][1];
  for (let i = 1; i < tabela.length; i += 1) if (v <= tabela[i][0]) return tabela[i - 1][1] + (tabela[i][1] - tabela[i - 1][1]) * (v - tabela[i - 1][0]) / (tabela[i][0] - tabela[i - 1][0]);
  return tabela[tabela.length - 1][1];
};

/** O contorno lateral de uma parte (em [z da lateral, y], mm) simplificado, em [z do modelo, y]; `ajuste` acerta um ponto [z, y] da
 *  lateral antes da troca de sinal. */
export function lado(contorno, ajuste = (p) => p) {
  const c = simplifica(contorno).map(ajuste);
  return c.filter((p, i) => { const q = c[(i + c.length - 1) % c.length]; return p[0] !== q[0] || p[1] !== q[1]; }).map(([z, y]) => [-z, y]);
}

/** As ferramentas que escrevem passos em mm num estado { passos, topo, origem }. */
export function ferramentas(estado) {
  function extrusao(eixo, perfil, em, altura) {
    estado.origem += 1;
    let p = perfil.map(([u, v]) => [r1(u), r1(v)]);
    if ((area(p) > 0) !== (SINAL[eixo] > 0)) p = p.reverse();
    estado.passos.push(['extrusao', { origemId: estado.origem, eixo, altura: r1(altura), perfil: p, em: em.map(r1) }]);
    return { origem: { op: 'extrusao', id: estado.origem } };
  }
  const extX = (zy, x0, x1) => extrusao('x', zy.map(([z, y]) => [-y, z]), [x0, 0, 0], x1 - x0);
  const extY = (xz, y0, y1) => extrusao('y', xz, [0, y0, 0], y1 - y0);
  const extZ = (xy, z0, z1) => extrusao('z', xy.map(([x, y]) => [x, -y]), [0, 0, Math.min(z0, z1)], Math.abs(z1 - z0));
  function booleana(op, solidos) {
    estado.origem += 1;
    estado.passos.push([op, { origemId: estado.origem, solidos }]);
    return { origem: { op, id: estado.origem } };
  }
  /* a parte, a cor dela e o sombreamento suave com a quina acima de 35 graus nítida */
  function parte(nome, sel, cor) {
    estado.passos.push(['parte', { nome, sel }], ['pincel', { modo: 'face', sel, cor }], ['liso', { sel, angulo: 35 }]);
  }
  /** O corpo de `lacosPelasVistas`, subdividido. Sem `compensar`: nestes laços ela passou de 10 a 30 mm do pedido e ondulou o capô. */
  function corpo(nome, vistas, extra = {}) {
    const { meiaPlanta, avisos, ...lacos } = lacosPelasVistas(vistas);
    const g = gaiolaPorLacos({ nome, eixo: 'y', ...lacos, ...extra });
    Object.assign(estado.topo, g.pontosMm);
    estado.origem += 1;
    estado.passos.push(['subdivisao', { origemId: estado.origem, ...g.passo, niveis: 2 }]);
    return { origem: { op: 'subdivisao', id: estado.origem } };
  }
  return { extrusao, extX, extY, extZ, booleana, parte, corpo };
}
