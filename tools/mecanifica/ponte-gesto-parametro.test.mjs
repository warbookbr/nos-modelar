/* ponte-gesto-parametro.test.mjs — RETRATO DO ESTADO ANTES DA PONTE.
 *
 * Plano ativo: `docs/mecanifica/planos/2026-09-10-ponte-do-gesto-ao-parametro.md`.
 *
 * A bancada vai ganhar punhos para o usuário arrastar. O destino do arrasto
 * precisa ser um número declarado da receita, e não um passo novo com id
 * literal de vértice — que é como o editor do `brigsd/nos` grava
 * (`PASSOS.push(['moveV', { v: selecionado, d }])`) e é a referência que o
 * `CLAUDE.md` proíbe persistir.
 *
 * Este arquivo mede três coisas ANTES de a ponte existir, para que a mudança
 * possa ser provada em vez de afirmada:
 *
 *   1. a receita já declara as entradas reais em `PARAMS`, e mexer numa delas
 *      move a geometria;
 *   2. o painel de parâmetros da bancada oferece exatamente as entradas de
 *      `PARAMS` — antes da segunda fatia ele varria argumentos de passo atrás
 *      de nomes como `raio`, e na bicicleta esses argumentos são RESULTADOS da
 *      derivação;
 *   3. não existe caminho de escrita: nada na bancada grava valor de parâmetro
 *      na receita.
 *
 * Quando a ponte existir, os dois últimos casos mudam de resposta e este
 * arquivo é reescrito junto. É esse o ponto: ele obriga a atualização.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parametrosDoPainel } from '../../src/bancada/parametros/painel-parametros.js';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { caixasPorParte } from '../../src/autoria/descrever-partes.js';
import receita from '../../prototipos/procedural/v3/pecas/bicicleta-quadro.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(AQUI, '../..');
const ARQUIVO_RECEITA = resolve(REPO, 'prototipos/procedural/v3/pecas/bicicleta-quadro.js');

/* `PASSOS` é um GETTER que lê `this.PARAMS`, então espalhar a receita com
   `{...receita}` AVALIA o getter uma vez com a tabela velha e congela o
   resultado. Copiar por descritores preserva o getter, e é assim que o serviço
   de escrita vai ter de fazer também. */
function comParametro(base, chave, valor) {
  const copia = Object.defineProperties({}, Object.getOwnPropertyDescriptors(base));
  copia.PARAMS = { ...base.PARAMS, [chave]: valor };
  return copia;
}

/* `caixasPorParte` devolve um Map de caixas em metros. O retrato compara as
   caixas de TODAS as partes: olhar só a altura do quadro esconde parâmetro que
   move um tubo sem mudar o ponto mais alto, e foi o que aconteceu na primeira
   escrita deste teste. */
function caixasComoTexto(qualquerReceita) {
  const { neutro } = executarReceita(qualquerReceita);
  const { caixas } = caixasPorParte(neutro);
  return [...caixas.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([nome, caixa]) => `${nome}:${caixa.min.map((n) => n.toFixed(4))}|${caixa.max.map((n) => n.toFixed(4))}`)
    .join('\n');
}

describe('ponte do gesto ao parâmetro — retrato antes', () => {
  it('a receita declara as entradas reais em PARAMS, e mexer numa delas move a geometria', () => {
    const chaves = Object.keys(receita.PARAMS);
    expect(chaves).toContain('tuboSelimComprimento');
    expect(chaves.length).toBeGreaterThan(20);

    const antes = caixasComoTexto(receita);
    const depois = caixasComoTexto(comParametro(receita, 'tuboSelimComprimento', receita.PARAMS.tuboSelimComprimento + 60));
    /* Se a geometria não se mexer, `PARAMS` é decoração e a ponte não tem onde
       escrever — é o segundo risco declarado no plano. */
    expect(depois).not.toBe(antes);
  });

  it('o painel oferece exatamente as entradas declaradas em PARAMS', () => {
    const oferecidos = parametrosDoPainel(receita).map((p) => p.id);
    const declarados = Object.keys(receita.PARAMS).filter(
      (chave) => typeof receita.PARAMS[chave] === 'number',
    );

    /* Era aqui que o painel oferecia `raio_101` e companhia: raios de tubo já
       calculados pela derivação, número de saída oferecido como entrada. */
    expect(oferecidos).toEqual(declarados);
    expect(oferecidos).toContain('tuboSelimComprimento');
    expect(oferecidos.some((chave) => /^raio_\d+$/.test(chave))).toBe(false);
  });

  it('peça que não declara PARAMS não ganha controle inventado', () => {
    const semDeclaracao = { PASSOS: [['cubo', { larg: 2, alt: 3, raio: 5, origemId: 10 }]] };
    expect(parametrosDoPainel(semDeclaracao)).toEqual([]);
  });

  it('RETRATO: não existe caminho que escreva parâmetro na receita', async () => {
    const antes = readFileSync(ARQUIVO_RECEITA, 'utf8');

    const modulos = await Promise.allSettled([
      import('../../src/bancada/parametros/escrever-parametro.js'),
    ]);
    expect(modulos[0].status).toBe('rejected');

    /* O `atualizarParametro` do sincronizador é a coisa mais parecida com
       escrita que existe hoje, e ele só mexe em memória e avisa por broadcast. */
    const { criarSincronizadorSessao } = await import('../../src/bancada/sessao/sincronizador.js');
    const sincronizador = criarSincronizadorSessao({ intervaloPolling: 1e9 });
    sincronizador.atualizarParametro('tuboSelimComprimento', 999);
    expect(sincronizador.obterEstado().parametros.tuboSelimComprimento).toBe(999);
    expect(readFileSync(ARQUIVO_RECEITA, 'utf8')).toBe(antes);
    sincronizador.destruir();
  });
});
