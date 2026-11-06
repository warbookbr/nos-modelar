/* tres-camadas.js — peça de teste do plano da abertura em qualquer direção: o corpo de várias camadas na mesma reta, com `sentido`.
 *
 * A chapa de 2 mm de espessura e 600 mm de largura em y é uma folha dobrada em S: o perfil, em [x, z], vai de (0, 300) a (500, 300),
 * dá meia volta de raio `entre / 2` mm, volta de (500, 300 - entre) a (100, 300 - entre), dá meia volta pelo outro lado e vai de
 * (100, 300 - 2 entre) a (600, 300 - 2 entre): três camadas empilhadas em z, `entre` mm uma da outra, que a reta do eixo z atravessa
 * três vezes. Com `camadas: 2` a folha se dobra em U, com duas camadas. O vão é um retângulo de 200 por 200 mm na vista z, entre x de
 * 200 a 400 e y de 200 a 400. Nada vem de referência externa. */
import { chapaDobrada, dosPassos, passoDaAbertura, receitaDe, retangulo } from './chapas.js';

/** A altura da camada k em x: planas separadas por `entre` mm ou, com `ondas` (a amplitude da de cima, em mm), a de cima afundando
 *  `ondas` mm no meio (x = 300) e a de baixo, 80 mm, subindo para as pontas: as camadas não se tocam (20 mm nas pontas), e com `ondas`
 *  acima de 60 a de baixo, em x = 200, passa da profundidade a que a de cima chega no meio, de modo que nenhum plano z as separa. */
const dobra = (x) => (x < 100 || x > 500 ? 0 : (1 - Math.cos((2 * Math.PI * (x - 100)) / 400)) / 2);
const alturaDa = (k, x, entre, ondas) => (ondas ? [300 - ondas * dobra(x), 280 - 80 * dobra(x)][k] : 300 - k * entre);

/** O perfil em [x, z] mm de `camadas` camadas separadas por `entre` mm, com `retas` pontos em cada trecho reto e `arco` por meia volta. */
export function perfil({ camadas = 3, entre = 100, retas = 6, arco = 8, ondas = 0 } = {}) {
  const p = [];
  const empurra = (q) => { const u = p[p.length - 1]; if (!u || Math.hypot(u[0] - q[0], u[1] - q[1]) > 1e-9) p.push(q); };
  for (let k = 0; k < camadas; k++) {
    const paraDireita = k % 2 === 0;
    const de = k === 0 ? 0 : paraDireita ? 100 : 500;
    const ate = k === camadas - 1 ? (paraDireita ? 600 : 0) : paraDireita ? 500 : 100;
    const n = ondas ? 24 : retas;
    for (let s = 0; s <= n; s++) { const x = de + ((ate - de) * s) / n; empurra([x, alturaDa(k, x, entre, ondas)]); }
    if (k === camadas - 1) break;
    const raio = (alturaDa(k, ate, entre, ondas) - alturaDa(k + 1, ate, entre, ondas)) / 2;
    const cx = ate; const cz = alturaDa(k, ate, entre, ondas) - raio;
    for (let s = 0; s <= arco; s++) {
      const t = paraDireita ? Math.PI / 2 - (Math.PI * s) / arco : Math.PI / 2 + (Math.PI * s) / arco;
      empurra([cx + raio * Math.cos(t), cz + raio * Math.sin(t)]);
    }
  }
  return p;
}

export const VAO = retangulo(200, 200, 400, 400);

/** Os passos da folha dobrada (`camadas`, `entre`) com o vão dado: `abertura` leva `sentido`, `vista` e o que mais o passo aceitar. */
export function passosDe({ camadas = 3, entre = 100, ondas = 0, espessura = 2, abertura = {} } = {}) {
  const c = chapaDobrada({ perfil: perfil({ camadas, entre, ondas }), ny: 7, passoY: 100, espessura, niveis: 2 });
  const passos = [['subdivisao', { origemId: 1, ...c.passo }]];
  if (abertura) passos.push(passoDaAbertura(2, dosPassos('subdivisao', 1), { vista: 'z', contorno: VAO, ...abertura }));
  return { TOPO: c.TOPO, PASSOS: passos };
}

const padrao = passosDe({ abertura: { sentido: '+' } });
export default receitaDe({ nome: 'tres-camadas', desc: 'folha dobrada em S, três camadas na mesma reta, com um vão só na camada de cima (sentido +)' }, padrao.TOPO, padrao.PASSOS, { lentes: [2] });
