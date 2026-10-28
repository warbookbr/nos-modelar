/* leitura-obrigatoria.mjs — quanto cada intenção precisa LER antes de começar.
 *
 * O número existe porque a intuição erra para os dois lados. Documento é barato
 * de escrever e caro de ler, e o custo não aparece em lugar nenhum: cada
 * sessão nova paga o acervo inteiro de novo, em silêncio, antes de produzir
 * qualquer coisa. Medido na abertura do plano de 2026-09-07: 119.826 bytes para
 * criar uma peça.
 *
 * As listas moram nos roteiros por intenção, em
 * `docs/modelar/roteiros/roteiros.json`: cada roteiro diz o que se lê antes
 * de começar (soma no orçamento) e o que se abre só quando a condição aparece
 * (não soma). A lista é explícita de propósito. Derivá-la de links
 * transformaria o número no tamanho do grafo inteiro, que é justamente a
 * métrica que não queremos: o que pesa é o que se lê, não o que se poderia
 * alcançar.
 *
 * O gate confere, para cada roteiro, que todo arquivo e todo comando citado
 * existe e que a leitura cabe no orçamento, e confere que o ROTEIROS.md e os
 * blocos do CLAUDE.md (os invariantes e a lista de roteiros) estão gerados do
 * JSON. O orçamento só desce. A linha de base é a leitura de 2026-10-08: a
 * leitura de cada roteiro precisa ficar abaixo dela, o que o gate de saída do
 * plano o caminho curto da IA pede.
 */
import { pathToFileURL } from 'node:url';
import { carregarRoteiros, CAMINHO_JSON, MARCADORES, medirRoteiro, paginasDesatualizadas, RAIZ, validarRoteiros } from './roteiros.mjs';

export function conferirLeituraObrigatoria(raiz = RAIZ) {
  const dados = carregarRoteiros(raiz);
  const problemas = validarRoteiros(dados, raiz);
  const roteiros = dados.roteiros.map((r) => {
    const { arquivos, total } = medirRoteiro(r, raiz);
    const linhaDeBase = r.linhaDeBase?.bytes;
    return { id: r.id, arquivos, total, orcamento: r.orcamentoBytes, linhaDeBase, dentro: total <= r.orcamentoBytes, abaixoDaBase: total < linhaDeBase };
  });
  for (const r of roteiros.filter((x) => !x.dentro)) {
    problemas.push(`roteiro ${r.id}: a leitura tem ${r.total} bytes, ${r.total - r.orcamento} acima do orçamento de ${r.orcamento}. Cortar significa mover para "sobDemanda" ou para zona consultável com ponteiro, nunca apagar lição.`);
  }
  for (const r of roteiros.filter((x) => Number.isInteger(x.linhaDeBase) && !x.abaixoDaBase)) {
    const corte = r.total - r.linhaDeBase + 1;
    problemas.push(`roteiro ${r.id}: a leitura tem ${r.total} bytes e precisa ficar abaixo da linha de base de ${r.linhaDeBase}; corte pelo menos ${corte} ${corte === 1 ? 'byte' : 'bytes'}. Cortar significa mover para "sobDemanda" ou para zona consultável com ponteiro, nunca apagar lição.`);
  }
  const desatualizadas = paginasDesatualizadas(dados, raiz);
  const semMarcador = desatualizadas.filter((p) => p.esperado === null).map((p) => p.relativo);
  if (semMarcador.length > 0) problemas.push(`${semMarcador.join(' e ')} perdeu um marcador de bloco gerado (${Object.values(MARCADORES).flat().join(', ')}): ponha de volta onde o bloco deve ficar e rode npm run roteiros:gerar.`);
  const divergentes = desatualizadas.filter((p) => p.esperado !== null).map((p) => p.relativo);
  if (divergentes.length > 0) problemas.push(`${divergentes.join(' e ')} ${divergentes.length === 1 ? 'não bate' : 'não batem'} com ${CAMINHO_JSON}: rode npm run roteiros:gerar.`);
  return { roteiros, problemas };
}

function executar() {
  const { roteiros, problemas } = conferirLeituraObrigatoria();
  for (const r of roteiros) {
    const base = r.linhaDeBase ? `, linha de base ${r.linhaDeBase}` : '';
    console.log(`${String(r.total).padStart(7)}  ${r.id} (orçamento ${r.orcamento}${base}, ${r.arquivos.length} arquivos)`);
  }
  if (problemas.length > 0) {
    console.error(`\nleitura:obrigatoria FALHOU\n${problemas.map((p) => `- ${p}`).join('\n')}`);
    process.exitCode = 1;
    return;
  }
  console.log('\nleitura:obrigatoria ok');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) executar();
