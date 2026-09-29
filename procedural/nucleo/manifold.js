/* manifold.js — o ÚNICO ponto onde o núcleo toca a biblioteca Manifold
   (`manifold-3d`, WebAssembly). As booleanas (`unir`, `subtrair`,
   `intersectar`) ENVOLVEM o cálculo dela: o núcleo converte a malha na entrada
   e na saída e grava a identidade; o corte robusto é da biblioteca.

   POR QUE UM CARREGADOR SEPARADO: o WebAssembly carrega de forma ASSÍNCRONA, e
   o executor roda a lista de passos de forma SÍNCRONA — mesma lista, mesmo
   objeto, sem `await` no meio. Em vez de tornar o executor assíncrono (o que
   mudaria a assinatura de todo consumidor), quem vai executar receita com
   booleana chama `carregarManifold()` UMA vez na abertura, e a operação usa a
   instância já pronta. Sem carregar, a operação GRITA dizendo exatamente isto,
   e o passo aborta com 0 V/0 F — nunca devolve a peça pela metade.

   O `import` é DINÂMICO de propósito: quem nunca chama o carregador (a
   bancada no navegador, as receitas sem booleana) não baixa nem compila o
   WebAssembly. */
let instancia = null;
let carregando = null;

/** Carrega a Manifold uma vez; chamadas seguintes devolvem a mesma instância. */
export async function carregarManifold() {
  if (instancia) return instancia;
  if (!carregando) {
    carregando = import('manifold-3d').then(async (modulo) => {
      const wasm = await modulo.default();
      wasm.setup();
      instancia = wasm;
      return wasm;
    });
  }
  return carregando;
}

/** A instância carregada, ou null se `carregarManifold()` ainda não terminou. */
export function manifoldCarregada() { return instancia; }
