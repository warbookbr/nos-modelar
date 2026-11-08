/* tubos-fatiados — a peça de prova dos tubos (`tubos.js`) fatiada na horizontal, com laços ao longo de y: da base ao fundo do tubo deitado o laço é o
 * círculo inteiro do tubo em pé, redondo e rente ao disco, e acima dele é a união do círculo com a fatia do tubo deitado. A forma e os laços estão em
 * `tubos-fatiados-forma.js`. As medidas são as de `tubos.js`: tubos de 156 mm, folga de 39 mm sobre o disco, tubo deitado de 175 mm. */
import { TABELA, derivar } from './tubos-fatiados-forma.js';
import { PLANO as PLANO_DOS_TUBOS } from './tubos.js';

export { TABELA };

const m = (mm) => mm / 1000;

export function gerarPassos(T = TABELA) {
  const { passo } = derivar(T);
  return [
    ['subdivisao', { origemId: 1, ...passo, niveis: T.niveis }],
    ['parte', { nome: 'tuboEmPe', sel: { tudo: true } }],
    ['parte', { nome: 'tuboDeitado', sel: { regiao: { min: [-1, m(T.alturaDoEixo), -1], max: [1, 1, 1] } }, substituir: true }],
    ['lathe', {
      origemId: 2, lados: 96, eixo: 'y', em: [0, -m(T.alturaDoDisco), 0],
      perfil: [[0, 0], [m(T.raio - T.chanfro), 0], [m(T.raio), m(T.chanfro)], [m(T.raio), m(T.alturaDoDisco)], [0, m(T.alturaDoDisco)]],
    }],
    ['parte', { nome: 'disco', sel: { origem: { op: 'lathe', id: 2 } } }],
  ];
}

export default {
  meta: { nome: 'tubos-fatiados', desc: 'dois tubos que se cruzam sobre um disco, fatiados na horizontal: base redonda inteira e parede vertical até o tubo deitado' },
  TABELA,
  PARAMS: TABELA,
  get TOPO() { return { origem: 'centro da face de baixo do tubo em pé; y para cima, a saída para +x', ...derivar(this.PARAMS).pontos }; },
  get PASSOS() { return gerarPassos(this.PARAMS); },
  PLANO: PLANO_DOS_TUBOS,
  contatos: [],
};
