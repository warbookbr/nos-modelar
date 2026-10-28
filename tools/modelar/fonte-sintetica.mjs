/* fonte-sintetica.mjs — monta, no Node e sem navegador, um `partes.json` no formato de `modelo-de-referencia.mjs` a partir dos triângulos de uma receita.

   Serve de fixture: os testes das ferramentas que comparam uma receita com uma fonte (`comparar-silhueta`, `folha-comparativa`, `medidas-da-fonte`)
   precisam de uma fonte pequena e exata, e a malha de terceiros não entra no repositório. As fatias seguem o mesmo cálculo (48 em z, 24 em y, pela
   superfície). A frente declarada é +z. A unidade do resultado é metro, como a do `modelo-de-referencia`. */
import { extensoesPorFatia, fatiasIguais } from './silhueta-da-superficie.mjs';
import { triangulosDaReceita } from './triangulos-da-receita.mjs';

const arred = (v) => +v.toFixed(4);

/** `fonteDeReceita(receita)` devolve o objeto que `modelo-de-referencia.mjs` grava em `partes.json`. `semFrente: true` omite o campo `frente` (para testar a recusa). */
export function fonteDeReceita(receita, { nz = 48, ny = 24, semFrente = false, nome = 'sintetica' } = {}) {
  const { tris } = triangulosDaReceita(receita);
  const m = tris.map(({ p }) => p.map((v) => v.map((x) => x / 1000)));
  const todos = m.flat();
  const minimo = [0, 1, 2].map((i) => Math.min(...todos.map((v) => v[i]))); const maximo = [0, 1, 2].map((i) => Math.max(...todos.map((v) => v[i])));
  const fat = (eixo, lo, hi, n, campos) => {
    const fs = fatiasIguais(lo, hi, n); const ex = extensoesPorFatia(m, eixo, fs);
    return fs.map((f, i) => ({ de: arred(f.de), ate: arred(f.ate), ...Object.fromEntries(campos.map(([k, tipo, e]) => [k, ex[i] ? arred(ex[i][tipo][e]) : null])) }));
  };
  return {
    arquivo: nome, comprimentoMetros: null,
    ...(semFrente ? {} : { frente: { lado: '+z', origem: 'declarada', evidencia: 'fonte sintética', girarGraus: 0, declarada: '+z' } }),
    escala: 1,
    total: { minimo: minimo.map(arred), maximo: maximo.map(arred), tamanho: [0, 1, 2].map((i) => arred(maximo[i] - minimo[i])) },
    partes: [{ nome: 'sintetica', minimo: minimo.map(arred), maximo: maximo.map(arred), triangulos: m.length }],
    silhueta: {
      metodo: 'superficie',
      porFatiaEmZ: fat(2, minimo[2], maximo[2], nz, [['ymin', 'min', 1], ['ymax', 'max', 1], ['xmin', 'min', 0], ['xmax', 'max', 0]]),
      porFatiaEmY: fat(1, minimo[1], maximo[1], ny, [['xmin', 'min', 0], ['xmax', 'max', 0], ['zmin', 'min', 2], ['zmax', 'max', 2]]),
    },
  };
}
