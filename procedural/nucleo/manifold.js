/* manifold.js — o ÚNICO ponto onde o núcleo toca a biblioteca Manifold
   (`manifold-3d`, WebAssembly). As booleanas (`unir`, `subtrair`,
   `intersectar`) ENVOLVEM o cálculo dela: o núcleo converte a malha na entrada
   e na saída e grava a identidade; o corte robusto é da biblioteca.

   O WebAssembly carrega de forma ASSÍNCRONA, e o executor roda a lista de
   passos de forma SÍNCRONA. A fatia 2 do plano pedia que cada ferramenta
   chamasse `carregarManifold()` na abertura; a fatia 5 mostrou o custo disso:
   são dezenas de consumidores (descrever, exportar, etapas, guardas, MCP,
   bancada, visor), e cada um esquecido cairia no grito só quando uma receita
   com booleana chegasse nele. Por isso o carregamento é feito AQUI, por
   `await` no topo do módulo: quem importa o núcleo, em Node ou no navegador,
   só recebe o módulo com a Manifold pronta. Nenhum consumidor precisa lembrar,
   e o executor continua síncrono.

   Se o carregamento falhar (WebAssembly bloqueado, arquivo .wasm ausente no
   servidor), o núcleo carrega mesmo assim: só as booleanas gritam, com a
   causa, e todo o resto funciona. `carregarManifold()` continua exportada e
   devolve a mesma instância; chamá-la é inofensivo. */
let instancia = null;
let carregando = null;
let erroDeCarga = null;

/** Carrega a Manifold uma vez; chamadas seguintes devolvem a mesma instância. */
export async function carregarManifold() {
  if (instancia) return instancia;
  if (!carregando) {
    carregando = import('manifold-3d').then(async (modulo) => {
      const wasm = await modulo.default();
      wasm.setup();
      instancia = wasm;
      erroDeCarga = null;
      return wasm;
    });
  }
  return carregando;
}

/** A instância carregada, ou null se o carregamento falhou. */
export function manifoldCarregada() { return instancia; }

/** A causa da falha de carregamento, para o grito da operação. */
export function erroDaCargaDaManifold() { return erroDeCarga; }

try { await carregarManifold(); } catch (erro) { erroDeCarga = erro; carregando = null; }
