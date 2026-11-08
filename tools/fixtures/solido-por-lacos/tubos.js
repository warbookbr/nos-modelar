/* tubos — a peça de prova do plano "trecho que some entre laços" (`docs/modelar/planos/encerrados/2026-11-08-trecho-que-some-entre-lacos.md`): um tubo em
 * pé e outro deitado, de 156 mm de diâmetro, que o cruza no alto e passa 19 mm à frente dele, numa malha só por `gaiolaPorLacos`, com o
 * filete do encontro sumindo na tangente da parede do tubo em pé com o plano de corte. Esta é a técnica nova: a faixa do tubo em pé
 * (filete, parede, chanfro e pé) encolhe até um ponto do círculo do tubo deitado numa faixa de laços a 2,5 mm um do outro (`encolhe` nos
 * trechos) e o vinco do chanfro perde a nitidez na mesma faixa (`esvai`). `tubos-hoje.js` é a mesma peça pela técnica anterior aos dois
 * campos (dois laços a 0,2 mm, vinco 'viva' de laço inteiro e uma rampa de laços), que deixa a aba torta com uma aresta fina. A forma e os
 * laços estão em `tubos-forma.js`. Nenhum dado vem de referência externa. */
import { TABELA, derivar, tabelaDe } from './tubos-forma.js';

export { TABELA };

const m = (mm) => mm / 1000;

export function gerarPassos(T = tabelaDe('nova'), tecnica = 'nova') {
  const { passo } = derivar(T, tecnica);
  return [
    ['subdivisao', { origemId: 1, ...passo, niveis: T.niveis }],
    ['parte', { nome: 'tuboEmPe', sel: { tudo: true } }],
    ['parte', { nome: 'tuboDeitado', sel: { regiao: { min: [-1, m(T.alturaDoEixo), -1], max: [1, 1, 1] } }, substituir: true }],
    /* o disco sob o tubo em pé, do mesmo diâmetro, com o topo liso em y = 0 e o chanfro só na face de baixo */
    ['lathe', {
      origemId: 2, lados: 96, eixo: 'y', em: [0, -m(T.alturaDoDisco), 0],
      perfil: [[0, 0], [m(T.raio - T.chanfro), 0], [m(T.raio), m(T.chanfro)], [m(T.raio), m(T.alturaDoDisco)], [0, m(T.alturaDoDisco)]],
    }],
    ['parte', { nome: 'disco', sel: { origem: { op: 'lathe', id: 2 } } }],
  ];
}

export const PLANO = {
  objeto: 'peça de prova: tubo de 156 mm em pé, cruzado no alto por um tubo deitado de mesmo diâmetro que passa 19 mm à frente dele, numa malha só, com o filete do encontro sumindo na tangente',
  referencias: ['referencias/alvo-dos-tubos.md'],
  escala: { medida: 'diâmetro dos dois tubos', milimetros: 156 },
  partes: [
    { nome: 'tuboEmPe', forma: 'cilindro reto de 156 mm de diâmetro e eixo vertical, com a face de baixo plana e chanfro de 2 mm, concordância no encontro com o tubo deitado, uma peça só', tecnica: 'gaiolaPorLacos de eixo X, malha única com o tubo deitado: faixa do tubo em pé no laço, filete do encontro nos pontos do laço, trechos da faixa que encolhem até um ponto na tangente, vinco do chanfro que esvai' },
    { nome: 'disco', forma: 'disco de 156 mm de diâmetro e 25 mm de altura sob o tubo em pé, com o topo plano em y = 0, rente à parede do tubo em pé, sem degrau, e chanfro de 2 mm na face de baixo', tecnica: 'lathe de eixo y, parte própria' },
    { nome: 'tuboDeitado', forma: 'cilindro reto de 156 mm de diâmetro e 175 mm de comprimento, eixo horizontal a 117 mm, ponta de trás rente às costas do tubo em pé, face da frente plana com chanfro de 2 mm', tecnica: 'mesma malha única por gaiolaPorLacos: círculo do tubo deitado em cada laço, tampas planas nas duas pontas com chanfro em vinco' },
  ],
  criteriosDeReprovacao: [
    'aba, degrau ou aresta fina no pé do filete, na frente do tubo em pé, onde o filete some',
    'dobra de diedro agudo fora de vinco declarado',
    'face fina, triângulo sem área ou malha aberta',
    'diâmetro dos tubos ou do disco diferente de 156 mm, ou comprimento do tubo deitado diferente de 175 mm',
    'degrau entre o disco e o tubo em pé',
  ],
};

export function receitaDe(tecnica) {
  return {
    meta: { nome: tecnica === 'nova' ? 'tubos' : 'tubos-hoje', desc: `dois tubos que se cruzam, o filete do encontro sumindo na tangente, pela técnica ${tecnica === 'nova' ? 'nova (encolhe e esvai)' : 'de hoje (laços a 0,2 mm e rampa)'}` },
    TABELA: tabelaDe(tecnica),
    PARAMS: tabelaDe(tecnica),
    get TOPO() { return { origem: 'centro da face de baixo do tubo em pé; y para cima, a saída para +x', ...derivar(this.PARAMS, tecnica).pontos }; },
    get PASSOS() { return gerarPassos(this.PARAMS, tecnica); },
    PLANO,
    contatos: [],
  };
}

export default receitaDe('nova');
