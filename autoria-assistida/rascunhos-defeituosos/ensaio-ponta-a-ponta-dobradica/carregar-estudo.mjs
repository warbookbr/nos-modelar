/* Adaptador privado que usa somente portas oficiais de autoria e leitura. */
import { readFileSync } from 'node:fs';
import {
  REGISTRO_OPERACOES,
  criarRegistroComExtensoes,
  criarRegistroComposicoes,
} from '../../../prototipos/procedural/v3/motor/oficina.js';
import { MANIFESTO } from '../../../prototipos/procedural/v3/extensoes/prisma-triangular/manifesto.js';
import { implementar } from '../../../prototipos/procedural/v3/extensoes/prisma-triangular/implementacao.js';
import { resolverMontagemPersistida } from '../../../src/autoria/resolver-montagem-persistida.js';
import { descreverPecaReutilizavel } from '../../../tools/mecanifica/descrever-peca.mjs';
import { exportarPeca, lerPecaResolvida } from '../../../tools/mecanifica/exportar-peca.mjs';
import { COMPOSICOES } from './composicoes.js';

export const REFERENCIAS = Object.freeze(['folha-batente', 'folha-porta', 'parafuso-central']);

export function criarConfiguracaoDobradica() {
  const registroOperacoes = criarRegistroComExtensoes({
    registroBase: REGISTRO_OPERACOES,
    extensoes: [{ manifesto: MANIFESTO, implementacao: implementar }],
  });
  const registroComposicoes = criarRegistroComposicoes({
    composicoes: COMPOSICOES,
    resolverOperacao: registroOperacoes.resolver,
  });
  return { registroOperacoes, registroComposicoes };
}

export async function carregarPecaDobradica(ref, configuracao = criarConfiguracaoDobradica()) {
  if (!REFERENCIAS.includes(ref)) throw new Error(`peça da dobradiça desconhecida: ${ref}`);
  const modulo = await import(new URL(`./receitas/${ref}.js`, import.meta.url));
  const opcoes = { modulo, ...configuracao };
  const medida = await descreverPecaReutilizavel({
    peca: ref,
    estrito: true,
    ...opcoes,
  });
  if (!medida.ok) throw new Error(`${ref}: ${medida.stderr.trim()}`);
  const exportacao = await exportarPeca(ref, opcoes);
  const neutroLido = lerPecaResolvida(exportacao.dado);
  return { ref, modulo, medida, exportacao, neutroLido };
}

export async function carregarEstudoDobradica() {
  const configuracao = criarConfiguracaoDobradica();
  const pecas = new Map();
  for (const ref of REFERENCIAS) {
    pecas.set(ref, await carregarPecaDobradica(ref, configuracao));
  }
  const autoria = JSON.parse(readFileSync(new URL('./montagem.json', import.meta.url), 'utf8'));
  const montagem = await resolverMontagemPersistida(autoria, {
    carregarPeca: async (ref) => pecas.get(ref)?.exportacao.dado,
  });
  return { configuracao, pecas, montagem };
}
