/* chapa-de-reflexo-de-prova/receita.js — a chapa de `tools/blender/chapa-com-amassado-de-prova.mjs` como peça da bancada, para provar
 * a captura das visões de reflexo (zebra, luz rasante, curvatura) por comando.
 *
 * É a mesma superfície do OBJ: 1000 por 600 mm abaulada em x (raio 6 m) e, nesta, com o amassado declarado (AMASSADO do arquivo de prova: 1,2 mm de fundo e 80 mm de raio). A gaiola amostra `alturaDeFora` a cada 25 mm e a subdivisão a suaviza; `chapa-lisa-de-reflexo-de-prova` é a mesma
 * chapa sem o amassado. Dado de teste: fora do acervo publicado, como as outras receitas desta pasta. */
import { ALTURA, AMASSADO, LARGURA, alturaDeFora } from '../../../blender/chapa-com-amassado-de-prova.mjs';

const PASSO = 0.025;
const nome = (i, j) => `p${i}_${j}`;

export function chapaDeReflexo({ amassado, nomeDaPeca, desc }) {
  const nx = Math.round(LARGURA / PASSO);
  const ny = Math.round(ALTURA / PASSO);
  const TOPO = {};
  const vertices = [];
  const faces = [];
  for (let i = 0; i <= nx; i++) {
    for (let j = 0; j <= ny; j++) {
      const x = i * PASSO;
      const y = j * PASSO;
      TOPO[nome(i, j)] = [x, y, alturaDeFora(x, y, amassado)];
      vertices.push(nome(i, j));
    }
  }
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) faces.push([nome(i, j), nome(i + 1, j), nome(i + 1, j + 1), nome(i, j + 1)]);
  return {
    meta: { nome: nomeDaPeca, desc },
    PARAMS: {},
    TOPO: { origem: 'canto da chapa em x = 0 e y = 0, com y para cima, x ao longo da chapa e z para fora da pele', ...TOPO },
    PASSOS: [
      ['subdivisao', { origemId: 1, vertices, faces, cantos: [nome(0, 0), nome(nx, 0), nome(nx, ny), nome(0, ny)], borda: 'cantos', espessura: 0.002, niveis: 1 }],
      ['parte', { nome: 'chapa', sel: { origem: { op: 'subdivisao', id: 1 } } }],
    ],
    /* O PLANO não fala do amassado: o pedido do crítico sai dele, e o crítico cego da chapa de prova precisa achar o amassado pelas
       imagens, sem que o pedido o anuncie (gate do plano do reflexo). */
    PLANO: {
      objeto: 'chapa abaulada de 1000 por 600 mm e 2 mm de espessura, lisa',
      /* a altura declarada é a referência da chapa: o plano exige uma, e esta é o arquivo que a define (o pacote do crítico a lista
         entre as que não são imagem) */
      referencias: ['tools/blender/chapa-com-amassado-de-prova.mjs'],
      escala: { medida: 'largura da chapa em x', milimetros: 1000 },
      partes: [{ nome: 'chapa', forma: 'chapa abaulada em x, lisa, com raio de 6 m', tecnica: 'subdivisao sobre a altura declarada' }],
      criteriosDeReprovacao: ['a chapa tem ondulação que a altura declarada não tem'],
    },
  };
}

export default chapaDeReflexo({ amassado: AMASSADO, nomeDaPeca: 'chapa-de-reflexo-de-prova', desc: 'chapa abaulada com um amassado declarado, para provar as visões de reflexo da captura' });
