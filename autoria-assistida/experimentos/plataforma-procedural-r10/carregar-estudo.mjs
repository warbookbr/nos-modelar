/* Adaptador confinado do estudo R10. Nenhuma fixture entra no catálogo público. */
import { readFileSync } from 'node:fs';
import {
  REGISTRO_OPERACOES,
  criarRegistroComExtensoes,
  criarRegistroComposicoes,
  expandirChamadasDeComposicao,
  neutroCanonico,
  nucleo,
} from '../../../prototipos/procedural/v3/motor/oficina.js';
import { MANIFESTO } from '../../../prototipos/procedural/v3/extensoes/prisma-triangular/manifesto.js';
import { implementar } from '../../../prototipos/procedural/v3/extensoes/prisma-triangular/implementacao.js';
import { FORMATO, VERSAO, parteDaFace } from '../../../src/autoria/ler-peca-resolvida.js';
import { resolverMontagemPersistida } from '../../../src/autoria/resolver-montagem-persistida.js';
import { COMPOSICOES } from './composicoes.js';

export const REFERENCIAS = Object.freeze([
  'apoio-prismatico',
  'nervura-triangular',
  'pino-circular',
]);

export function criarConfiguracaoR10() {
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

function dadoResolvido(ref, modulo, bruto) {
  const canonico = neutroCanonico(bruto);
  return {
    formato: FORMATO,
    versao: VERSAO,
    peca: ref,
    receita: 'plataforma-procedural-r10',
    meta: { nome: modulo.meta.nome },
    materiais: modulo.MATERIAIS ?? {},
    partes: [...new Set(canonico.F.map(parteDaFace).filter(Boolean))].sort(),
    portas: [...bruto.portas.values()],
    V: canonico.V,
    F: canonico.F,
  };
}

export async function carregarPecaR10(ref, configuracao = criarConfiguracaoR10()) {
  if (!REFERENCIAS.includes(ref)) throw new Error(`peça R10 desconhecida: ${ref}`);
  const modulo = await import(new URL(`./receitas/${ref}.js`, import.meta.url));
  const expansao = modulo.CHAMADAS_COMPOSICOES
    ? expandirChamadasDeComposicao(configuracao.registroComposicoes, modulo.CHAMADAS_COMPOSICOES)
    : null;
  const passos = expansao?.passos ?? modulo.PASSOS;
  const bruto = nucleo(
    passos,
    modulo.PARAMS ?? {},
    modulo.TOPO ?? {},
    modulo.MATERIAIS ?? {},
    null,
    modulo.ALIASES ?? [],
    { registroOperacoes: configuracao.registroOperacoes },
  );
  if (bruto.orfaos.length) throw new Error(`${ref}: ${bruto.orfaos.length} órfão(s).`);
  return {
    ref,
    familia: modulo.FAMILIA,
    dado: dadoResolvido(ref, modulo, bruto),
    bruto,
    expansao,
  };
}

export async function carregarEstudoR10() {
  const configuracao = criarConfiguracaoR10();
  const pecas = new Map();
  for (const ref of REFERENCIAS) pecas.set(ref, await carregarPecaR10(ref, configuracao));
  const autoria = JSON.parse(readFileSync(new URL('./montagem.json', import.meta.url), 'utf8'));
  const montagem = await resolverMontagemPersistida(autoria, {
    carregarPeca: async (ref) => pecas.get(ref)?.dado,
  });
  return { configuracao, pecas, montagem };
}
