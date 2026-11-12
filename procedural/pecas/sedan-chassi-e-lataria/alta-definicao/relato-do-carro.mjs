#!/usr/bin/env node
/* relato-do-carro.mjs: o relato de contatos no modo estrito sobre o carro montado pelas cinco receitas (`carro-pela-receita.mjs`), com os contatos que o esboço do carro
 * inteiro declara e a aba do painel de trás: o mesmo relato que `npm run esboco:nucleo -- <esboço> --so-montar --estrito` dá sobre o esboço (travessia não declarada,
 * contato esperado que a malha não dá, par Dir e Esq que mede diferente), lido do `neutro` que as receitas dão. Sai 1 se há problema.
 *
 * Uso: node procedural/pecas/sedan-chassi-e-lataria/alta-definicao/relato-do-carro.mjs [<arquivo de receita>] */
import { lerEntrada } from '../../../../tools/modelar/vao-entre-partes.mjs';
import { relatoDeContatos, textoDoRelato } from '../../../../modulos/esboco-nucleo/src/contatos.js';
import { CONTATOS_DO_CARRO } from './carro-pela-receita.mjs';

const arquivo = process.argv[2] ?? new URL('./carro-pela-receita.mjs', import.meta.url).pathname;
const { neutro } = await lerEntrada(arquivo);
const r = relatoDeContatos(neutro, [], { contatos: CONTATOS_DO_CARRO });
console.log(`${arquivo}: ${neutro.F.size} faces`);
console.log(textoDoRelato(r));
const problemas = r.naoDeclaradas.length + r.faltam.length + (r.assimetricas?.length ?? 0);
console.log(problemas ? `RECUSADO pelo modo estrito: ${problemas} item(ns)` : 'modo estrito: nada a recusar');
process.exitCode = problemas ? 1 : 0;
