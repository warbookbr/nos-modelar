/* par-de-engrenagens.mjs — o par de retas de módulo 1 com 20 e 40 dentes e o pinhão de 20 dentes sobre a cremalheira, a
 * prova da fatia 5 do plano de engrenagem, polia e correia. As peças entram pelo `instanciaDeFamilia`, nas posições e giros
 * que `engrenamento.js` dá; `phi` gira a motora e `x` avança a cremalheira, para amostrar o engrenamento, e `folga` muda a
 * folga entre flancos (a negativa é a sonda que aperta o par até os dentes se atravessarem). */
import { instanciaDeFamilia } from '../../modelar/instancia-de-familia.mjs';
import { ENGRENAGEM } from '../../../procedural/familias/engrenagem/index.js';
import { CREMALHEIRA } from '../../../procedural/familias/cremalheira/index.js';
import { parDeEngrenagens, pinhaoECremalheira } from '../../../procedural/familias/engrenagem/engrenamento.js';

const completos = (familia, perfil) => ({
  ...Object.fromEntries(Object.entries(familia.contrato.parametros).map(([nome, d]) => [nome, d.padrao])),
  ...familia.contrato.perfis[perfil].parametros,
});
const m = (mm) => mm / 1000;
const meioDaCoroa = (p) => p.comprimentoDoCubo + p.largura / 2;

export function receitaDoParDeEngrenagens({ perfis = ['reta-m1-z20', 'reta-m1-z40'], phi = 0, folga } = {}) {
  const [p1, p2] = perfis.map((perfil) => completos(ENGRENAGEM, perfil));
  const par = parDeEngrenagens(p1, p2, folga === undefined ? {} : { folga });
  const [g1, g2] = par.giros(phi);
  const motora = instanciaDeFamilia({ familia: 'engrenagem', perfil: perfis[0], nomes: 'motora', id: 'motora', portaPrefixo: 'motora', portas: true, pose: { posicao: [0, 0, 0], giro: { eixo: 'y', graus: g1 } } });
  const movida = instanciaDeFamilia({
    familia: 'engrenagem', perfil: perfis[1], nomes: 'movida', id: 'movida', portaPrefixo: 'movida', portas: true, base: motora.origem,
    pose: { posicao: [m(par.distanciaEntreCentros), m(meioDaCoroa(p1) - meioDaCoroa(p2)), 0], giro: { eixo: 'y', graus: g2 } },
  });
  return { receita: { meta: { nome: 'par-de-engrenagens' }, PASSOS: [...motora.passos, ...movida.passos] }, par };
}

export function receitaDoPinhao({ pinhao = 'reta-m1-z20', cremalheira = 'm1-30', x = 0, folga } = {}) {
  const pp = completos(ENGRENAGEM, pinhao);
  const pc = completos(CREMALHEIRA, cremalheira);
  const par = pinhaoECremalheira(pp, pc, folga === undefined ? {} : { folga });
  /* a cremalheira com um vão em x = 0: o primeiro vão da família fica na ponta, então ela recua meio comprimento em passos inteiros */
  const passo = Math.PI * pc.modulo;
  const recuo = Math.floor(pc.dentes / 2) * passo;
  const barra = instanciaDeFamilia({ familia: 'cremalheira', perfil: cremalheira, nomes: 'barra', id: 'barra', pose: { posicao: [m(x - recuo), m(meioDaCoroa(pp) - pc.largura / 2), 0] } });
  const roda = instanciaDeFamilia({
    familia: 'engrenagem', perfil: pinhao, nomes: 'pinhao', id: 'pinhao', portaPrefixo: 'pinhao', portas: true, base: barra.origem,
    pose: { posicao: [0, 0, m(par.alturaDoCentro)], giro: { eixo: 'y', graus: par.giro(x) } },
  });
  return { receita: { meta: { nome: 'pinhao-e-cremalheira' }, PASSOS: [...barra.passos, ...roda.passos] }, par };
}
