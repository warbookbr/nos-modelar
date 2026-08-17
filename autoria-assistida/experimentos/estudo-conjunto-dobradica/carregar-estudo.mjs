/* carregar-estudo.mjs — adaptador confinado das receitas para montagem resolvida. */
import { readFileSync } from 'node:fs';
import { neutroCanonico } from '../../../prototipos/procedural/v3/motor/oficina.js';
import { FORMATO, VERSAO, parteDaFace } from '../../../src/autoria/ler-peca-resolvida.js';
import { resolverMontagemPersistida } from '../../../src/autoria/resolver-montagem-persistida.js';
import { descreverPecaReutilizavel } from '../../../tools/mecanifica/descrever-peca.mjs';

export const REFERENCIAS = Object.freeze(['folha-fixa', 'folha-movel', 'pino-dobradica']);

export async function carregarDefinicao(ref) {
  if (!REFERENCIAS.includes(ref)) throw new Error(`peça desconhecida: ${ref}`);
  const modulo = await import(new URL(`./receitas/${ref}.js`, import.meta.url));
  const medida = await descreverPecaReutilizavel({ peca: ref, modulo, estrito: true });
  if (!medida.ok) throw new Error(`${ref}: ${medida.stderr.trim()}`);
  const bruto = medida.resultado.neutro;
  const neutro = neutroCanonico(bruto);
  const partes = [...new Set([...neutro.F.values()].map(parteDaFace).filter(Boolean))].sort();
  return {
    formato: FORMATO,
    versao: VERSAO,
    peca: ref,
    receita: 'estudo-conjunto-dobradica',
    meta: { nome: modulo.meta.nome },
    materiais: modulo.MATERIAIS,
    partes,
    portas: [...bruto.portas.values()],
    V: neutro.V,
    F: neutro.F,
  };
}

export async function carregarMontagemDoEstudo() {
  const montagem = JSON.parse(readFileSync(new URL('./montagem.json', import.meta.url), 'utf8'));
  return resolverMontagemPersistida(montagem, { carregarPeca: carregarDefinicao });
}
