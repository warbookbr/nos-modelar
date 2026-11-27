/* derivar.js — dos parâmetros do atuador (milímetro) à chamada de composição (metro). */
import { ID_POR_FORMA } from './composicoes.js';
import { geometriaDoAtuador } from './geometria.js';
import { geometriaDoServo } from './servo.js';

const m = (mm) => mm / 1000;
/* os parâmetros da porta `cabo`: o plano da ponta livre do cilindro de saída do cabo, com o ponto no centro dela, a normal para fora e a extensão do diâmetro do cilindro */
const portaDoCabo = ({ porta }) => ({ centroDoCabo: porta.centro.map(m), eixoDoCabo: porta.eixo, extensaoDoCabo: m(2 * porta.raio) });

export function derivar(q) {
  if ((q.forma ?? 1) === 2) return derivarServo(q);
  const g = geometriaDoAtuador(q);
  const a = {
    emCabo: g.cabo.em.map(m), ...portaDoCabo(g.cabo), emFuroF: g.furosDoFlange.em.map(m), emFuroS: g.furosDaSaida.em.map(m),
    furosF: g.furosDoFlange.total, grausF: g.furosDoFlange.graus, furosS: g.furosDaSaida.total, grausS: g.furosDaSaida.graus,
    diametroF: m(q.diametroDoFuroDoFlange), raioF: m(q.circuloDoFlange / 2), anguloF: g.furosDoFlange.anguloInicial,
    diametroS: m(q.diametroDoFuroDaSaida), raioS: m(q.circuloDaSaida / 2), anguloS: g.furosDaSaida.anguloInicial, topo: [0, m(g.topo), 0],
  };
  for (const [prefixo, pts] of [['c', g.carcaca], ['s', g.saida], ['k', g.cabo.perfil], ['ff', g.furosDoFlange.perfil], ['fs', g.furosDaSaida.perfil]]) pts.forEach(([r, y], k) => { a[`${prefixo}r${k}`] = m(r); a[`${prefixo}y${k}`] = m(y); });
  Object.assign(a, { centroDoEixo: [0, m(q.comprimento), 0], raioDoEixo: m(q.diametro / 2), raioDoEixoDaSaida: m(q.diametroDaSaida / 2), inicioDoEixo: -m(q.comprimento - q.espessuraDoFlange), fimDoEixoDaSaida: m(q.espessuraDaSaida) });
  return { composicao: ID_POR_FORMA[1], argumentos: a };
}

function derivarServo(q) {
  const g = geometriaDoServo(q);
  const a = {
    emTorre: g.torre.em.map(m), emCabo: g.cabo.em.map(m), ...portaDoCabo(g.cabo), emHorn: g.horn.em.map(m), emFuroH: g.furoDoHorn.em.map(m), pivoH: [m(g.xs), 0, 0],
    diametroA: m(q.diametroDoFuroDaAba), planoA: g.centrosDaAba[0].map(m), diametroH: m(g.furoDoHorn.diametro), raioH: m(g.furoDoHorn.raio), topo: [m(g.xs), m(g.topo), 0],
  };
  for (const [nome, b] of [['caixa', g.caixa], ['aba', g.aba]]) Object.assign(a, { [`${nome}Largura`]: m(b.largura), [`${nome}Profundidade`]: m(b.profundidade), [`${nome}Cantos`]: m(b.cantos), [`${nome}Altura`]: m(b.altura), [`${nome}Em`]: [0, m(b.y ?? 0), 0] });
  g.furosDaAba.forEach((f, k) => { a[`emFuroA${k}`] = f.em.map(m); a[`centroA${k}`] = g.centrosDaAba[k].map(m); });
  for (const [prefixo, pts] of [['t', g.torre.perfil], ['k', g.cabo.perfil], ['h', g.horn.perfil], ['fh', g.furoDoHorn.perfil], ['fa', g.furosDaAba[0].perfil]]) pts.forEach(([r, y], k) => { a[`${prefixo}r${k}`] = m(r); a[`${prefixo}y${k}`] = m(y); });
  Object.assign(a, { centroDoEixo: [m(g.xs), m(g.eixo.y), 0], raioDoEixo: m(g.eixo.raio), raioDoEixoDaSaida: m(q.diametroDoHorn / 2), inicioDoEixo: -m(g.eixo.y - q.alturaDaCaixa), fimDoEixoDaSaida: m(q.espessuraDoHorn) });
  return { composicao: ID_POR_FORMA[2], argumentos: a };
}
