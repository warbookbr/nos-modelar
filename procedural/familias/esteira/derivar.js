/* derivar.js — dos parâmetros da esteira (milímetro) à chamada de composição (metro). O vão do dente da motriz sai girado
   para cair na primeira bucha do enrolamento dela. */
import { ID_DA_ESTEIRA } from './composicoes.js';
import { geometriaDaEsteira } from './geometria.js';

const m = (mm) => mm / 1000;
const em = ([x, z], y = 0) => [m(x), m(y), m(z)];

export function derivar(q) {
  const g = geometriaDaEsteira(q);
  const a = {
    raioDaBucha: m(q.diametroDaBucha / 2), meiaLargura: m(q.larguraInterna / 2), menosMeiaLargura: -m(q.larguraInterna / 2), espessuraDoElo: m(q.espessuraDoElo),
    larguraDaSapata: m(q.larguraDaSapata), emSapata: [0, -m(q.larguraDaSapata / 2), 0],
    coroaMotriz: m(g.raioDaCoroa), meiaLarguraDaRoda: m(g.larguraDaRoda / 2), menosMeiaLarguraDaRoda: -m(g.larguraDaRoda / 2), meiaLarguraDoDente: m(g.larguraDoDente / 2), menosMeiaLarguraDoDente: -m(g.larguraDoDente / 2), alturaDoVao: m(g.larguraDoDente + 2), emVao: [0, -m(g.larguraDoDente / 2 + 1), 0],
    dentes: q.dentes, passoAngular: 360 / q.dentes, raioDaGuia: m(g.raioDaGuia), centroDaGuia: [m(g.distancia), 0, 0], giroDaGuia: g.giroDaGuia,
    raioDoRolete: m(g.raioDoRolete), centroDoRolete: g.centroDoRolete.map(m), roletes: q.roletes, passoDosRoletes: g.passoDosRoletes.map(m),
  };
  const ang = g.alfa; // o vão 0 vai para o ângulo α no plano [x, z]
  g.vao.forEach(([u, v], k) => { a[`vaou${k}`] = m(u * Math.cos(ang) - v * Math.sin(ang)); a[`vaov${k}`] = m(u * Math.sin(ang) + v * Math.cos(ang)); });
  g.trechos.forEach((t, s) => {
    const reto = t.tipo === 'reto';
    if (!reto) a[`t${s}Centro`] = t.centro.map(m);
    const repetir = (nome) => { a[`${nome}Total`] = t.elos; if (reto) a[`${nome}Passo`] = t.passo.map(m); else a[`${nome}Graus`] = t.graus; };
    a[`t${s}buchaEm`] = em(t.inicio); repetir(`t${s}bucha`);
    t.elo.forEach(([u, v], k) => { a[`t${s}elou${k}`] = m(u); a[`t${s}elov${k}`] = m(v); });
    t.sapata.forEach(([u, v], k) => { a[`t${s}sapatau${k}`] = m(u); a[`t${s}sapatav${k}`] = m(v); });
    g.yTrilho.forEach((y, lado) => { a[`t${s}trilho${lado}Em`] = [0, m(y), 0]; repetir(`t${s}trilho${lado}`); });
    repetir(`t${s}sapata`);
  });
  return { composicao: ID_DA_ESTEIRA, argumentos: a };
}
