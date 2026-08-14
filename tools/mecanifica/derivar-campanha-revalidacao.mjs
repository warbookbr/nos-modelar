/* derivar-campanha-revalidacao.mjs — ponte R02 entre impacto global e R01. */

import { criarCampanhaRevalidacao } from '../../src/autoria/protocolo-revalidacao.js';
import { persistirCampanhaRevalidacao } from './repositorio-revalidacao.mjs';

export function derivarCampanhaDeImpacto({ mapa, impacto, causa, mapaSha256 } = {}) {
  return criarCampanhaRevalidacao({ mapa, impacto, causa, mapaSha256 });
}

export async function derivarEPersistirCampanhaRevalidacao({
  mapa, impacto, causa, mapaSha256, raiz, pai = null, falhaInjetada, fs, telemetria,
} = {}) {
  const campanha = derivarCampanhaDeImpacto({ mapa, impacto, causa, mapaSha256 });
  const persistida = await persistirCampanhaRevalidacao({ raiz, campanha, pai, falhaInjetada, fs, telemetria });
  return { campanha, persistida };
}
