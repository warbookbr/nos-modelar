#!/usr/bin/env node
/* Resumo reproduzível do estudo privado R10. */
import { auditarIntersecoesMontagem } from '../../../src/autoria/auditar-intersecoes-montagem.js';
import { descreverMontagemResolvida } from '../../../src/autoria/descrever-montagem-resolvida.js';
import { carregarEstudoR10 } from './carregar-estudo.mjs';

const { pecas, montagem } = await carregarEstudoR10();
const contexto = descreverMontagemResolvida(montagem);
const auditoria = auditarIntersecoesMontagem(montagem);

const resumo = {
  estudo: montagem.id,
  pecas: [...pecas.values()].map(({ ref, familia, bruto, expansao }) => ({
    id: ref,
    familia,
    vertices: bruto.V.size,
    faces: bruto.F.size,
    partes: [...bruto.procedencia.partes].map(([id]) => id),
    composicao: expansao?.chamadas ?? [],
    operacoes: bruto.procedencia.passos.map(({ operacao }) => operacao),
  })),
  contexto: { totais: contexto.totais, cobertura: contexto.cobertura },
  auditoria,
};

process.stdout.write(`${JSON.stringify(resumo, null, 2)}\n`);
