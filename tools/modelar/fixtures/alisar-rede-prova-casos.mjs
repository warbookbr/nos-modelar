#!/usr/bin/env node
/* alisar-rede-prova-casos.mjs — os casos independentes do teste do alisamento sobre a rede, rodados em processo à parte.
 *
 * Cada caso lê a chapa de prova, roda a ferramenta e escreve o resultado em JSON na saída padrão. O teste
 * (`tools/modelar/alisar-rede.test.mjs`) os dispara ao mesmo tempo, em processos separados, porque nenhum depende do
 * outro e cada um é só CPU: em série eles somavam três quartos do tempo do arquivo.
 *
 *   antes      a leitura de ondulação da chapa com o erro plantado, sem alisar ({ falhas })
 *   dobra      o alisamento da forma com a dobra real e sem vinco declarado, com uma regularização só
 *   sem-falha  o alisamento da chapa sem erro plantado
 *
 * Uso: node tools/modelar/fixtures/alisar-rede-prova-casos.mjs <caso>[,<caso>...]; vários casos saem como um objeto
 * com o nome de cada um. */
import { alisarReceita } from '../alisar-a-superficie.mjs';
import { ondulacaoDaSuperficie, superficiesDaReceita } from '../ondulacao-da-superficie.mjs';
import { receitaDeProva } from './alisar-rede-prova.js';

const CASOS = {
  antes() {
    const { receita } = receitaDeProva({ ruido: 1.5 });
    return { falhas: ondulacaoDaSuperficie(superficiesDaReceita(receita)[0]).falhas };
  },
  dobra() {
    /* Uma regularização só: o caso da dobra prova que a ferramenta diz "não alisável" com as falhas que sobram, e com as três
       regularizações do padrão ou com uma a conclusão, as falhas e os pontos que impedem saem os mesmos (medido em 2026-10-27). */
    const d = receitaDeProva({ dobra: true });
    return alisarReceita({ receita: d.receita, tabela: d.TABELA }, { toleranciaMm: 1, regularizacoes: [0.03] });
  },
  'sem-falha'() {
    const { receita, TABELA } = receitaDeProva({ ruido: 0 });
    return alisarReceita({ receita, tabela: TABELA });
  },
};

const pedidos = (process.argv[2] ?? '').split(',').filter(Boolean);
if (!pedidos.length || pedidos.some((nome) => !CASOS[nome])) {
  console.error(`uso: alisar-rede-prova-casos.mjs <caso>[,<caso>...], com caso em ${Object.keys(CASOS).join(', ')}`);
  process.exit(2);
}
const saida = Object.fromEntries(pedidos.map((nome) => [nome, CASOS[nome]()]));
process.stdout.write(JSON.stringify(saida));
