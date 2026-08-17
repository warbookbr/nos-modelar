/* executar-receita.js — fronteira pura para executar uma receita já carregada.
 *
 * Este módulo não conhece catálogo, caminho, CLI, bancada ou produto. O
 * adaptador que resolve um arquivo carrega um módulo e entrega-o aqui; testes
 * podem entregar uma receita mínima diretamente. Assim, o núcleo recebe dados
 * explícitos e não transforma o catálogo em contrato de execução.
 */
import { nucleo } from '../../prototipos/procedural/v3/motor/oficina.js';

export function validarReceita(modulo) {
  if (!modulo || typeof modulo !== 'object' || Array.isArray(modulo)) {
    throw new TypeError('receita: módulo precisa ser um objeto já carregado.');
  }
  if (!Array.isArray(modulo.PASSOS)) {
    throw new TypeError('receita: módulo precisa exportar PASSOS como lista.');
  }
}

export function entradaDaReceita(modulo, { paramsExtra = null } = {}) {
  validarReceita(modulo);
  const PARAMS = paramsExtra ? { ...(modulo.PARAMS ?? {}), ...paramsExtra } : (modulo.PARAMS ?? {});
  return {
    PASSOS: modulo.PASSOS,
    PARAMS,
    TOPO: modulo.TOPO ?? {},
    MATERIAIS: modulo.MATERIAIS ?? {},
    ESQUELETO: modulo.ESQUELETO ?? null,
    ALIASES: modulo.ALIASES ?? [],
  };
}

export function executarReceita(modulo, opcoes = {}) {
  const entrada = entradaDaReceita(modulo, opcoes);
  const neutro = nucleo(
    entrada.PASSOS,
    entrada.PARAMS,
    entrada.TOPO,
    entrada.MATERIAIS,
    entrada.ESQUELETO,
    entrada.ALIASES,
  );
  return { entrada, neutro };
}
