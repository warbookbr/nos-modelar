#!/usr/bin/env node
/* Executor reproduzível da fixture, sem publicar receitas no catálogo. */
import { readFileSync } from 'node:fs';
import { nucleo, neutroCanonico } from '../../../prototipos/fps/v3/motor/oficina.js';
import { FORMATO, VERSAO, parteDaFace } from '../../../src/autoria/ler-peca-resolvida.js';
import { resolverMontagemPersistida } from '../../../src/autoria/resolver-montagem-persistida.js';
import { derivarImpactoMontagem } from '../../../src/autoria/derivar-impacto-montagem.js';

const args = new Map(process.argv.slice(2).map((item) => item.split('=', 2)));
const fim = args.has('--fim-eixo') ? Number(args.get('--fim-eixo')) : 0.015;
if (!Number.isFinite(fim) || fim <= -0.04) throw new Error('--fim-eixo precisa ser finito e maior que -0.040.');
const montagem = JSON.parse(readFileSync(new URL('./montagem.json', import.meta.url), 'utf8'));
async function carregarPeca(ref) {
  const modulo = await import(new URL(`./receitas/${ref}.js`, import.meta.url));
  const params = ref === 'eixo-guia' ? { ...modulo.PARAMS, fim, comprimento: fim - modulo.PARAMS.inicio } : modulo.PARAMS;
  const bruto = nucleo(modulo.PASSOS, params, modulo.TOPO ?? {}, modulo.MATERIAIS ?? {}, null, modulo.ALIASES ?? []);
  if (bruto.orfaos.length) throw new Error(`${ref}: ${bruto.orfaos.length} órfão(s).`);
  const neutro = neutroCanonico(bruto);
  return { formato: FORMATO, versao: VERSAO, peca: ref, receita: 'autoria-geometrica-do-zero', meta: { nome: modulo.meta.nome }, materiais: modulo.MATERIAIS, partes: [...new Set(neutro.F.map(parteDaFace).filter(Boolean))].sort(), portas: [...bruto.portas.values()], V: neutro.V, F: neutro.F };
}
const resolvida = await resolverMontagemPersistida(montagem, { carregarPeca });
const relacoes = resolvida.relacoes.map(({ id, tipo, satisfeita, diagnosticos }) => ({ id, tipo, satisfeita, diagnosticos }));
const resultado = { estudo: resolvida.id, fimEixo: fim, relacoes, satisfeitas: relacoes.filter((item) => item.satisfeita).length, impacto: derivarImpactoMontagem(resolvida, { caminho: ['eixo'] }) };
process.stdout.write(`${JSON.stringify(args.has('--resumo') ? { estudo: resultado.estudo, fimEixo: fim, relacoes, satisfeitas: resultado.satisfeitas } : resultado, null, 2)}\n`);
