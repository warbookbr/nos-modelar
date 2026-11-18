#!/usr/bin/env node
/* medir-arvore-para-migracao.mjs — o filho da migração dos registros de etapas: mede a montagem na árvore onde está (a de um commit
 * antigo, extraída numa pasta temporária) e imprime o medido em JSON. É copiado para dentro da árvore antiga e usa só os módulos dela
 * (`src/autoria` e `tools/modelar` do commit), por caminho relativo; por isso não importa nada do código de agora e repete, em
 * pequeno, o que `medirAgora` de `etapas-da-montagem.mjs` faz: a forma assinada, os parâmetros derivados, a pose no mundo, as juntas
 * por etapa e a interface no mundo das portas citadas. Uso: node medir-arvore-para-migracao.mjs <montagem.json> */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const aqui = (relativo) => import(new URL(relativo, import.meta.url).href);
const [{ lerMontagemPersistida }, { resolverMontagemPersistida }, { juntasPorEtapa }, { assinaturaDaForma }, { interfaceNoMundo }, { carregadoresDeReceitas }, { resolverCaminhoReceita }] = await Promise.all([
  aqui('../../src/autoria/ler-montagem-persistida.js'), aqui('../../src/autoria/resolver-montagem-persistida.js'), aqui('../../src/autoria/etapas-de-construcao.js'),
  aqui('../../src/autoria/assinatura-da-forma.js'), aqui('../../src/autoria/posicao-por-porta.js'), aqui('./peca-com-parametros.mjs'), aqui('./resolver-caminho-receita.mjs'),
]);

const arquivo = resolve(process.argv[2]);
const dado = JSON.parse(readFileSync(arquivo, 'utf8'));
const montagem = lerMontagemPersistida(dado);
const receitas = {};
for (const { alvo } of montagem.instancias) {
  if (alvo.tipo !== 'peca' || receitas[alvo.ref]) continue;
  const modulo = await import(pathToFileURL(resolverCaminhoReceita(alvo.ref)).href);
  receitas[alvo.ref] = modulo.default ?? modulo.receita;
}
/* a montagem cortada antes da primeira receita sem passo */
const refDe = new Map(montagem.instancias.map((item) => [item.id, item.alvo.ref]));
const vazia = montagem.etapas.findIndex((id) => (receitas[refDe.get(id)]?.PASSOS ?? []).length === 0);
const construidas = vazia < 0 ? montagem.etapas : montagem.etapas.slice(0, vazia);
const topo = (lado) => lado?.caminho?.[0];
const fica = new Set(construidas);
const parcial = vazia < 0 ? dado : (() => {
  const { auditoriaIntersecoes, apoioNoChao, ...resto } = dado;
  return {
    ...resto,
    ...(auditoriaIntersecoes ? { auditoriaIntersecoes: { ...auditoriaIntersecoes, expectativas: auditoriaIntersecoes.expectativas.filter((e) => fica.has(topo(e.a)) && fica.has(topo(e.b))) } } : {}),
    instancias: dado.instancias.filter((item) => fica.has(item.id)), etapas: construidas,
    relacoes: (dado.relacoes ?? []).filter((r) => fica.has(topo(r.referencia)) && fica.has(topo(r.movel))),
    vinculos: (dado.vinculos ?? []).filter((v) => fica.has(v.alvo.instancia) && fica.has(v.de.instancia)),
    posicoes: (dado.posicoes ?? []).filter((p) => fica.has(p.instancia) && fica.has(p.em.instancia)),
  };
})();
const resolvida = construidas.length ? await resolverMontagemPersistida(parcial, carregadoresDeReceitas(receitas)) : null;
const juntas = new Map((resolvida ? juntasPorEtapa(resolvida, construidas) : []).map((e) => [e.instancia, e.juntas]));
/* as portas citadas: por relação, vínculo ou posição, de etapa anterior (a porta de dentro de submontagem fica fora) */
const ordem = new Map(montagem.etapas.map((id, k) => [id, k]));
const depois = (a, b) => ordem.has(a) && ordem.has(b) && ordem.get(b) > ordem.get(a);
const citacoes = [];
for (const relacao of montagem.relacoes ?? []) {
  for (const [ponta, outra] of [[relacao.referencia, relacao.movel], [relacao.movel, relacao.referencia]]) {
    if (!depois(ponta.caminho[0], outra.caminho[0])) continue;
    const profunda = ponta.caminho.length > 1;
    citacoes.push({ etapa: ponta.caminho[0], porta: profunda ? `${ponta.caminho.slice(1).join('/')}:${ponta.porta}` : ponta.porta, posterior: outra.caminho[0], por: `relação ${relacao.id}`, relacao: relacao.id, ...(profunda ? { profunda } : {}) });
  }
}
for (const vinculo of montagem.vinculos ?? []) if (depois(vinculo.de.instancia, vinculo.alvo.instancia)) citacoes.push({ etapa: vinculo.de.instancia, porta: vinculo.de.porta, posterior: vinculo.alvo.instancia, por: `vínculo ${vinculo.id}` });
for (const posicao of montagem.posicoes ?? []) if (depois(posicao.em.instancia, posicao.instancia)) citacoes.push({ etapa: posicao.em.instancia, porta: posicao.em.porta, posterior: posicao.instancia, por: `posição ${posicao.id}` });
const etapas = {};
const portas = {};
for (const id of montagem.etapas) {
  etapas[id] = { juntas: juntas.get(id) ?? [] };
  const instancia = resolvida?.instancias.find((item) => item.id === id);
  const neutro = instancia?.definicao?.neutro;
  if (!neutro) continue;
  etapas[id].forma = assinaturaDaForma(neutro);
  etapas[id].parametros = (instancia.parametrosDerivados ?? []).map(({ param, valor, unidade }) => ({ param, valor, unidade }));
  etapas[id].pose = instancia.poseMundo;
  for (const nome of new Set(citacoes.filter((c) => c.etapa === id && !c.profunda).map((c) => c.porta))) {
    const porta = neutro.portas?.get?.(nome);
    if (porta?.interface) (portas[id] ??= {})[nome] = interfaceNoMundo(porta.interface, instancia.poseMundo);
  }
}
process.stdout.write(`${JSON.stringify({ medido: { montagem: montagem.id, ordem: [...montagem.etapas], etapas, citacoes, portas } })}\n`);
