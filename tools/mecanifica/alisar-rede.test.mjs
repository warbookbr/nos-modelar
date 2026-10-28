/* alisar-rede.test.mjs — a ferramenta de alisamento sobre a gaiola por rede de curvas.
 *
 * A chapa de prova (fixtures/alisar-rede-prova.js) é a da rede de curvas (19 curvas, 10 retalhos, a janela em gota, o arco de roda e a
 * coluna inclinada), com cada ponto-chave na TABELA e um erro de leitura de 1,5 mm plantado em y nos pontos-chave de três ligações
 * (três grupos de três pontos vizinhos, que dão calombos de mais de 0,5 mm). O alisamento tira as falhas acima do limiar com todos os
 * pontos medidos (os das curvas, exatos) a até 2 mm, edita só números da TABELA que movem pontos-chave de curvas e nós, e cita as
 * edições por curva e ponto-chave; dá as mesmas edições em duas execuções (uma pela linha de comando) e devolve a TABELA como estava.
 * Uma forma com uma dobra real, a cintura e a coluna sem o vinco declarado, sai como não alisável dentro da tolerância, com as falhas
 * que sobram. As conferências não usam o modelo da ferramenta: aplicam as edições a uma TABELA nova e rodam a receita e a leitura de
 * ondulação, sem fixar divisão nenhuma.
 *
 * TEMPO (plano da bateria rápida, fatia 1, 2026-10-28). Sozinho, o arquivo levava 174 s (medido em 2026-10-27): o alisamento da chapa, o
 * da dobra, a linha de comando, a leitura da chapa com o erro, a conferência com as edições e o caso sem falha rodavam um depois do
 * outro, e cada um é só CPU. Agora ele leva 49 s e 48 s em duas medidas seguidas, com carga 3 em 4 processadores: o alisamento no
 * processo do teste, a linha de comando, o caso da dobra e a leitura da chapa com o caso sem falha rodam ao mesmo tempo, em quatro
 * processos (`fixtures/alisar-rede-prova-casos.mjs`), e a conferência com as edições segue o alisamento no processo do teste. A
 * ferramenta ficou mais rápida sem mudar o que devolve: o alisamento da chapa passou de 86 s para 32 s e o da dobra de 100 s para 40 s
 * num processo só, e o relatório de cada um sai idêntico ao de antes (verificado com o relatório inteiro, bit a bit). O que mudou:
 * o gradiente conjugado e a montagem do sistema do miolo trabalham sobre vetores de números
 * (`procedural/nucleo/gaiola-por-rede-liso.test.mjs`), a substituição da fatoração LU lê índices contíguos
 * (`procedural/nucleo/subdivisao.test.mjs`), a leitura de ondulação consulta a vizinhança de cada face calculada uma vez, a gaiola por
 * rede guarda as curvas e os monitores que não mudam entre uma sonda e outra, e o ajuste com peso e o refino repetidos na leitura saem
 * da memória (`procedural/nucleo/memoria-de-pura.test.mjs`). Continua conferindo tudo o que está acima, com os mesmos limites. */
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { derivar, receitaDeProva, tabelaDeProva } from './fixtures/alisar-rede-prova.js';
import { alisarReceita } from './alisar-a-superficie.mjs';
import { indiceEspacial } from './alisar-numerico.mjs';
import { ondulacaoDaSuperficie, superficiesDaReceita } from './ondulacao-da-superficie.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const REPO = join(AQUI, '../..');
const MM = 1000;
const PLANTADA = { ruido: 1.5 };

/* aplica as edições a uma TABELA nova e devolve a superfície e a leitura de ondulação */
function lerComEdicoes(opcoes, edicoes) {
  const { receita, TABELA } = receitaDeProva(opcoes);
  for (const e of edicoes) TABELA[e.tabela][e.indice] = e.novo;
  const sup = superficiesDaReceita(receita)[0];
  return { sup, ond: ondulacaoDaSuperficie(sup), TABELA };
}

describe('alisamento da chapa por rede de curvas', () => {
  let antes, relatorio, cli, tabelaDepois, relatorioDobra, lido, semFalha;

  /* Os processos à parte rodam AO MESMO TEMPO que o alisamento no processo do teste: as contas são independentes, e em série elas
     somavam quase todo o tempo do arquivo (medido em 2026-10-27: 64 s a linha de comando e 64 s o alisamento sozinhos). */
  function emProcesso(argumentos) {
    return new Promise((resolver, recusar) => {
      const filho = spawn(process.execPath, argumentos, { cwd: REPO });
      let saida = ''; let erro = '';
      filho.stdout.on('data', (d) => { saida += d; });
      filho.stderr.on('data', (d) => { erro += d; });
      filho.on('close', (codigo) => (codigo === 0 ? resolver(JSON.parse(saida)) : recusar(new Error(`${argumentos.join(' ')} falhou: ${erro}`))));
    });
  }
  const linhaDeComando = () => emProcesso(['tools/mecanifica/alisar-a-superficie.mjs', 'tools/mecanifica/fixtures/alisar-rede-prova.js']);
  const casos = (nomes) => emProcesso(['tools/mecanifica/fixtures/alisar-rede-prova-casos.mjs', nomes]);

  beforeAll(async () => {
    const pelaLinha = linhaDeComando();
    const pelaDobra = casos('dobra');
    const pelosLeves = casos('antes,sem-falha');
    const { receita, TABELA } = receitaDeProva(PLANTADA);
    const copia = JSON.stringify(TABELA);
    relatorio = alisarReceita({ receita, tabela: TABELA });
    tabelaDepois = JSON.stringify(TABELA) === copia;
    /* a conferência com as edições segue o alisamento (depende dele) e roda enquanto os outros processos terminam */
    lido = lerComEdicoes(PLANTADA, relatorio.edicoes);
    cli = await pelaLinha;
    relatorioDobra = (await pelaDobra).dobra;
    const leves = await pelosLeves;
    antes = leves.antes;
    semFalha = leves['sem-falha'];
  }, 900000);

  it('a ondulação plantada passa do limiar, em calombos das três ligações, e a origem dos pontos vem da rede', () => {
    expect(antes.falhas.length).toBeGreaterThanOrEqual(6);
    expect(Math.max(...antes.falhas.map((f) => f.amplitudeMm))).toBeGreaterThan(0.5);
    const curvasCitadas = new Set(antes.falhas.flatMap((f) => f.pontos.map((p) => p.origem?.curva)));
    for (const c of ['ligR', 'ligU2', 'ligL2']) expect(curvasCitadas.has(c), c).toBe(true);
    const tipos = new Set(antes.falhas.flatMap((f) => f.pontos.map((p) => p.origem?.tipo)));
    expect(tipos.has('curva')).toBe(true);
    expect(tipos.has('retalho')).toBe(true);
    expect(relatorio.antes.falhas).toBe(antes.falhas.length);
  });

  it('tira as falhas acima do limiar, e todos os pontos medidos ficam a até 2 mm', () => {
    expect(relatorio.alisavel).toBe(true);
    expect(relatorio.depois.falhas).toBe(0);
    expect(relatorio.edicoes.length).toBeGreaterThan(20);
    /* conferência independente do modelo: as edições numa TABELA nova, a receita rodada e lida, sem fixar divisão nenhuma */
    const { sup, ond, TABELA } = lido;
    expect(ond.falhas).toEqual([]);
    expect(ond.desvioMm.maximo).toBeLessThan(0.3);
    const original = derivar(tabelaDeProva(PLANTADA));
    const editada = derivar(TABELA);
    expect(editada.passo.vertices).toEqual(original.passo.vertices);
    /* a distância de cada ponto medido (a posição declarada, antes das edições) à superfície nova; a superfície sem fixar divisão pode deslizar
       os pontos da curva uns milímetros ao longo dela, e o que a leitura sustenta é a distância à superfície */
    const medidos = original.passo.vertices.filter((n) => original.origens[n].tipo !== 'retalho');
    expect(medidos.length).toBe(240);
    const idx = indiceEspacial(sup.calculados, sup.faces);
    const d = medidos.map((n) => idx.maisPerto(original.pontos[n], 0.05).distancia * MM);
    expect(Math.max(...d)).toBeLessThanOrEqual(2);
    expect(relatorio.medidas.depois.n).toBe(240);
    expect(relatorio.medidas.depois.maximoMm).toBeLessThanOrEqual(2);
    expect(Math.max(...relatorio.edicoes.map((e) => Math.abs(e.deslocamentoMm)))).toBeLessThanOrEqual(4);
  });

  it('as edições citam só números da TABELA que movem pontos-chave de curvas e nós, por curva e ponto-chave, e nunca um ponto da gaiola', () => {
    const { TABELA } = receitaDeProva(PLANTADA);
    for (const e of relatorio.edicoes) {
      expect(e.tabela).toMatch(/^(no_[A-Za-z0-9]+|[A-Za-z0-9]+_\d+)$/);
      expect(TABELA[e.tabela][e.indice]).toBe(e.antigo);
      expect(e.entradas).toHaveLength(1);
      expect(e.entradas[0]).toMatch(/^([A-Za-z0-9]+\[\d+\]|no:[A-Za-z0-9]+)\.(x|y|z)$/);
      expect(e.onde).toHaveLength(1);
      const [o] = e.onde;
      if (o.curva) {
        expect(o.pontoChave).toEqual(expect.any(Number));
        expect(e.tabela).toBe(`${o.curva}_${o.pontoChave}`);
        expect(e.entradas[0]).toBe(`${o.curva}[${o.pontoChave}].${o.eixo}`);
      } else {
        expect(e.tabela).toBe(`no_${o.no}`);
        expect(e.entradas[0]).toBe(`no:${o.no}.${o.eixo}`);
      }
      expect(['x', 'y', 'z'][e.indice]).toBe(o.eixo);
      expect(Math.abs(e.novo - e.antigo)).toBeGreaterThan(0);
      expect(e.deslocamentoMm).toBeCloseTo(e.novo - e.antigo, 1);
    }
    const nomes = new Set(relatorio.edicoes.map((e) => `${e.tabela}[${e.indice}]`));
    expect(nomes.size).toBe(relatorio.edicoes.length);
    /* nenhum nome de ponto da gaiola (curva.k, retalho.i.j) entra nas edições */
    expect(JSON.stringify(relatorio.edicoes)).not.toMatch(/"[A-Za-z0-9]+\.\d+(\.\d+)*"/);
    expect(relatorio.modelo.rastreadas).toBe(true);
    expect(relatorio.modelo.folhasEditaveis).toBe(264);
  });

  it('o ponto de dentro de um retalho não é medida: as medidas são os 240 pontos das curvas', () => {
    expect(relatorio.modelo.pontosMedidos).toBe(240);
  });

  it('duas execuções dão as mesmas edições, a pela linha de comando também, e a TABELA volta como estava', () => {
    const { peca, ...doCli } = cli;
    expect(peca).toBe('tools/mecanifica/fixtures/alisar-rede-prova.js');
    expect(JSON.stringify(doCli)).toBe(JSON.stringify(relatorio));
    expect(tabelaDepois).toBe(true);
  });

  it('a conferência entra no relatório: o modelo linear erra o desvio por menos de 0,05 mm, e a malha sem fixar é a mesma', () => {
    expect(relatorio.modelo.diferencaDoModeloMm).toBeLessThan(0.05);
    expect(relatorio.modelo.violacaoMaximaMm).toBeLessThan(0.05);
    expect(relatorio.malhaNova).toBeUndefined();
  });

  it('a forma com uma dobra real e sem vinco declarado sai como não alisável dentro da tolerância, com as falhas que sobram', () => {
    expect(relatorioDobra.antes.falhas).toBeGreaterThan(0);
    expect(relatorioDobra.alisavel).toBe(false);
    expect(relatorioDobra.motivo).toMatch(/^não alisável dentro da tolerância de 1 mm.*vinco ou estação nova/);
    expect(relatorioDobra.depois.falhas).toBeGreaterThan(0);
    expect(relatorioDobra.sobram.length).toBe(relatorioDobra.depois.falhas);
    const maior = relatorioDobra.sobram[0];
    expect(maior.impedem.length).toBeGreaterThan(0);
    for (const m of maior.impedem) { expect(m.distanciaMm).toBeGreaterThanOrEqual(0.85 * m.limiteMm); expect(m.limiteMm).toBeCloseTo(1, 5); }
    expect(relatorioDobra.medidas.depois.maximoMm).toBeLessThanOrEqual(1.05);
    /* a rede refez a divisão de alguns arcos com as edições, e a malha nova, lida sem fixar nada, mantém as falhas */
    expect(relatorioDobra.malhaNova.malhaIgual).toBe(false);
    expect(relatorioDobra.malhaNova.arcosComOutraDivisao).toBeGreaterThan(0);
    expect(relatorioDobra.malhaNova.falhas).toBeGreaterThan(0);
    /* a falha está junto da dobra: a cintura ou a coluna */
    expect(maior.pontos.some((p) => /^(cintura|colunaB|coluna|baixo|ponta|ligL2|atrasDaColuna)/.test(p))).toBe(true);
  });

  it('a chapa por rede sem falha não edita nada e diz que não há o que alisar', () => {
    expect(semFalha.antes.falhas).toBe(0);
    expect(semFalha.alisavel).toBe(true);
    expect(semFalha.edicoes).toEqual([]);
    expect(semFalha.modelo.semFalhas).toBe(true);
  });
});
