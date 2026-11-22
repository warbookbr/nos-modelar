/* derivar.js — dos parâmetros do fixador (milímetro) à chamada de composição (metro). A peça, a cabeça e a haste escolhem a
   composição. */
import { HASTES, ID_DA_ARRUELA, ID_DA_PORCA, idDoParafuso } from './composicoes.js';
import { geometriaDoFixador, sextavado } from './geometria.js';

const m = (mm) => mm / 1000;
const comSextavado = (argumentos, prefixo, chave) => sextavado(chave).forEach(([x, z], k) => { argumentos[`${prefixo}x${k}`] = m(x); argumentos[`${prefixo}z${k}`] = m(z); });

export function derivar(parametros) {
  const g = geometriaDoFixador(parametros);
  const a = {};
  if (g.peca === 'porca') {
    comSextavado(a, 'porca', g.chave);
    Object.assign(a, { alturaDaPorca: m(g.altura), furo: m(g.furo) });
    return { composicao: ID_DA_PORCA, argumentos: a };
  }
  if (g.peca === 'arruela') return { composicao: ID_DA_ARRUELA, argumentos: { externo: m(g.externo), furo: m(g.furo), alturaDaArruela: m(g.altura) } };

  const c = g.cabeca;
  a.alturaDaCabeca = m(c.altura);
  if (c.tipo === 'sextavada') comSextavado(a, 'cabeca', c.chave);
  else {
    a.raioDaCabeca = m(c.raio);
    comSextavado(a, 'recesso', c.chaveInterna);
    a.alturaDoRecesso = m(c.fundo + 0.5);
    a.emRecesso = [0, m(c.altura - c.fundo), 0];
    if (c.tipo === 'abaulada') {
      /* o domo: a borda reta até 15% da altura e três pontos da curva até o topo no eixo */
      Object.assign(a, { domo0: m(0.15 / 0.55 * c.altura), domo1: m(0.4 / 0.55 * c.altura), domo2: m(0.53 / 0.55 * c.altura), domoRaio1: m(0.75 / 0.875 * c.raio), domoRaio2: m(0.45 / 0.875 * c.raio) });
    }
  }
  if (g.haste) Object.assign(a, { raioDaHaste: m(g.haste.raio), alturaDaHaste: m(g.haste.ate - g.haste.de), emHaste: [0, m(g.haste.de), 0] });
  if (g.roscada) {
    const f = g.filete;
    Object.assign(a, {
      raioDoNucleo: m(g.nucleo.raio), alturaDoNucleo: m(g.nucleo.ate - g.nucleo.de), emNucleo: [0, m(g.nucleo.de), 0], fechamento: m(f.fechamento),
      raioDoFilete: m(f.raio), passo: m(f.passo), voltas: f.voltas, centroDoFilete: f.centro.map(m),
    });
    f.perfil.forEach(([u, v], k) => { a[`fileteU${k}`] = m(u); a[`fileteV${k}`] = m(v); });
  }
  const haste = !g.roscada ? 'lisa' : g.haste ? 'parcial' : 'roscada';
  if (!HASTES.includes(haste)) throw new Error(`fixador: haste ${haste} sem composição`);
  return { composicao: idDoParafuso(c.tipo, haste), argumentos: a };
}
