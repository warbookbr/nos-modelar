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
 *   3. a escrita na receita existe, é transacional, e recusar não altera o
 *      arquivo — antes da terceira fatia nada gravava parâmetro em lugar
 *      nenhum.
 *
 * Quando a ponte existir, os dois últimos casos mudam de resposta e este
 * arquivo é reescrito junto. É esse o ponto: ele obriga a atualização.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parametrosDoPainel } from '../../src/bancada/parametros/painel-parametros.js';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { escreverParametro, escreverParametros } from '../../src/autoria/escrever-parametro.js';
import { criarHistoricoParametros } from '../../src/bancada/controles/historico-parametros.js';
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
    /* Número solto e casa de coordenada: `pontoSelimTopo` é o ponto de solda
       medido, e as duas casas dele são as entradas que mais movem o tubo do
       selim. Curva, como as bordas do tubo inferior, fica de fora. */
    const declarados = Object.entries(receita.PARAMS).flatMap(([chave, valor]) => {
      if (typeof valor === 'number') return [chave];
      if (Array.isArray(valor) && valor.every((n) => typeof n === 'number')) {
        return valor.map((_, i) => `${chave}.${i}`);
      }
      return [];
    });

    /* Era aqui que o painel oferecia `raio_101` e companhia: raios de tubo já
       calculados pela derivação, número de saída oferecido como entrada. */
    expect(oferecidos).toEqual(declarados);
    expect(oferecidos).toContain('tuboSelimComprimento');
    expect(oferecidos).toContain('pontoSelimTopo.1');
    expect(oferecidos.some((chave) => /^raio_\d+$/.test(chave))).toBe(false);
  });

  it('peça que não declara PARAMS não ganha controle inventado', () => {
    const semDeclaracao = { PASSOS: [['cubo', { larg: 2, alt: 3, raio: 5, origemId: 10 }]] };
    expect(parametrosDoPainel(semDeclaracao)).toEqual([]);
  });

  it('escreve na receita real e volta ao original byte a byte', async () => {
    const original = readFileSync(ARQUIVO_RECEITA, 'utf8');
    /* A prova roda numa cópia: teste que mexe no acervo e falha no meio deixa a
       peça de trabalho alterada, e ninguém descobre pelo teste que falhou. */
    const area = mkdtempSync(join(tmpdir(), 'ponte-bicicleta-'));
    const copia = join(area, 'bicicleta-quadro.js');
    writeFileSync(copia, original, 'utf8');

    try {
      const ida = await escreverParametro(copia, 'tuboSelimComprimento', 455);
      expect(ida).toMatchObject({ estado: 'aplicado', de: 422, para: 455 });
      expect(readFileSync(copia, 'utf8')).not.toBe(original);

      const volta = await escreverParametro(copia, 'tuboSelimComprimento', 422);
      expect(volta).toMatchObject({ estado: 'aplicado', de: 455, para: 422 });
      /* Byte a byte: é o que o gate de saída do plano exige do desfazer. */
      expect(readFileSync(copia, 'utf8')).toBe(original);
    } finally {
      rmSync(area, { recursive: true, force: true });
    }

    expect(readFileSync(ARQUIVO_RECEITA, 'utf8')).toBe(original);
  });

  /* O desfazer da sessão, provado onde ele importa: no arquivo. A bancada
     mantém a pendência só enquanto o valor difere do que a receita tem, e é
     essa regra que este caso repete, porque é ela que faz o desfazer completo
     não deixar nada para salvar. */
  it('desfazer devolve a sessão ao arquivo, e desfazer além do início não escreve nada', async () => {
    const original = readFileSync(ARQUIVO_RECEITA, 'utf8');
    const area = mkdtempSync(join(tmpdir(), 'ponte-desfazer-'));
    const copia = join(area, 'bicicleta-quadro.js');
    writeFileSync(copia, original, 'utf8');

    const declarado = (chave) => receita.PARAMS[chave];
    const historico = criarHistoricoParametros({ valorDeOrigem: declarado });
    const pendentes = new Map();
    const aplicar = (chave, valor) => {
      if (Object.is(valor, declarado(chave))) pendentes.delete(chave);
      else pendentes.set(chave, valor);
    };
    const mexer = (chave, valor) => { historico.registrar(chave, valor); aplicar(chave, valor); };

    try {
      mexer('tuboSelimComprimento', 440);
      historico.separar();
      mexer('tuboSelimComprimento', 455);
      historico.separar();
      mexer('anguloDirecao', 70);
      expect([...pendentes.keys()].sort()).toEqual(['anguloDirecao', 'tuboSelimComprimento']);

      /* Um gesto por desfazer: o arrasto que passou por 440 e 455 conta dois
         passos porque houve dois gestos, e não um por quadro. */
      for (const passo of [1, 2, 3]) {
        const desfeito = historico.desfazer();
        expect(desfeito, `passo ${passo}`).not.toBe(null);
        aplicar(desfeito.chave, desfeito.valor);
      }
      expect(historico.vazio).toBe(true);
      expect(pendentes.size).toBe(0);

      /* Além do início da sessão não existe passo anterior, e o arquivo não é
         tocado nem por engano. */
      expect(historico.desfazer()).toBe(null);
      expect(readFileSync(copia, 'utf8')).toBe(original);

      /* E o caminho completo: mexer, salvar, desfazer tudo e salvar de novo
         devolve o texto da receita byte a byte ao que estava na abertura. */
      mexer('tuboSelimComprimento', 455);
      expect((await escreverParametros(copia, Object.fromEntries(pendentes))).estado).toBe('aplicado');
      expect(readFileSync(copia, 'utf8')).not.toBe(original);

      pendentes.clear();
      const volta = historico.desfazer();
      aplicar(volta.chave, volta.valor);
      expect(volta).toEqual({ chave: 'tuboSelimComprimento', valor: 422, naOrigem: true });
      expect((await escreverParametros(copia, { [volta.chave]: volta.valor })).estado).toBe('aplicado');
      expect(readFileSync(copia, 'utf8')).toBe(original);
    } finally {
      rmSync(area, { recursive: true, force: true });
    }

    expect(readFileSync(ARQUIVO_RECEITA, 'utf8')).toBe(original);
  });

  it('a escrita recusada não altera o arquivo e diz qual parâmetro', async () => {
    const original = readFileSync(ARQUIVO_RECEITA, 'utf8');
    const area = mkdtempSync(join(tmpdir(), 'ponte-recusa-'));
    const copia = join(area, 'bicicleta-quadro.js');
    writeFileSync(copia, original, 'utf8');

    try {
      const r = await escreverParametro(copia, 'comprimentoQueNaoExiste', 10);
      expect(r.estado).toBe('falha-recuperavel');
      expect(r.motivo).toMatch(/comprimentoQueNaoExiste/);
      expect(readFileSync(copia, 'utf8')).toBe(original);
    } finally {
      rmSync(area, { recursive: true, force: true });
    }
  });
});
