/* derivar.js — dos parâmetros do cabo (milímetro) à chamada de composição (metro). O plano (`plano.js`) escolhe a composição pelo
   número de estações; as pontas viram as portas `ponta-a` e `ponta-b`. */
import { ID_DO_CABO } from './composicoes.js';
import { planejar } from './plano.js';

const m = (mm) => mm / 1000;
const vm = (v) => v.map(m);

function anelNosArgumentos(argumentos, pre, a) {
  a.pontos.forEach((q, k) => { argumentos[`${pre}Q${k}`] = vm(q); });
  argumentos[`${pre}QN`] = [...a.normal]; argumentos[`${pre}QFio`] = m(a.fio);
}

export function derivar(parametros) {
  const plano = planejar(parametros);
  const argumentos = { raio: m(plano.raio), segmentosArco: plano.lados / 4 };
  plano.pontos.forEach((q, k) => { argumentos[`p${k}`] = vm(q); argumentos[`n${k}`] = [...plano.normais[k]]; });
  argumentos.aCentro = vm(plano.A); argumentos.aEixo = [...plano.dA]; argumentos.aFim = m(plano.trechoA);
  argumentos.bCentro = vm(plano.B); argumentos.bEixo = [...plano.dB]; argumentos.bFim = m(plano.trechoB);
  const { terminais, bracadeiras } = plano.acessorios;
  const tipoDe = (lado) => terminais.find((t) => t.lado === lado)?.tipo ?? 0;
  for (const t of terminais) {
    const pre = `t${t.lado}`;
    argumentos[`${pre}P0`] = vm(t.capa.p0); argumentos[`${pre}P1`] = vm(t.capa.p1); argumentos[`${pre}N`] = [...t.capa.normal]; argumentos[`${pre}Raio`] = m(t.capa.raio);
    if (t.tipo === 2) anelNosArgumentos(argumentos, pre, t.anel);
  }
  bracadeiras.forEach((b, i) => anelNosArgumentos(argumentos, `b${i + 1}`, b));
  const composicao = ID_DO_CABO(plano.estacoes, tipoDe('a'), tipoDe('b'), bracadeiras.length);
  return { composicao, argumentos };
}
