/* levantar-leitura.mjs — o que cada operação lê de fato da malha, passo a passo, pelo registro de leitura do núcleo (fatia 2 do plano do
 * cache por passo). Executa cada peça com `OPCOES.aoLer` e soma por operação quantos passos leram 'nada', 'citados' ou 'malha' em
 * vértices e faces, fora da resolução da seleção, e quantos tinham seleção que varre a malha. É daqui que saem as declarações de
 * `procedural/nucleo/planejador/leitura-declarada.js`. Não mede tempo.
 * Uso, da raiz: node --max-old-space-size=8192 <este arquivo> <peça> [<peça> ...]   (uma linha JSON por peça e uma com a soma)
 *               node <este arquivo> --operacoes <peça> [...]                       (só quais operações cada peça usa, sem executar)
 *               node --max-old-space-size=8192 <este arquivo> --conferir <peça> [...] (com `leitura: 'conferido'`: a recusa de cada peça, ou ok) */
import { importarReceita, receitaDoModulo } from '../../../../tools/modelar/importar-receita.mjs';
import { resolverCaminhoReceita } from '../../../../tools/modelar/resolver-caminho-receita.mjs';
import { REGISTRO_DA_RECEITA, entradaDaReceita } from '../../../../src/autoria/executar-receita.js';
import { nucleo } from '../../../../procedural/nucleo/entrada.js';
import { niveisDoPasso } from '../../../../procedural/nucleo/planejador/leitura-do-passo.js';

const args = process.argv.slice(2);
const soOperacoes = args[0] === '--operacoes';
const conferir = args[0] === '--conferir';
const pecas = soOperacoes || conferir ? args.slice(1) : args;
const soma = new Map();
const somar = (alvo, op, niveis, exemplo) => {
  const r = alvo.get(op) ?? { passos: 0, V: { nada: 0, citados: 0, malha: 0 }, F: { nada: 0, citados: 0, malha: 0 }, selecaoVarreu: 0, exemplos: [] };
  r.passos += 1; r.V[niveis.V] += 1; r.F[niveis.F] += 1; if (niveis.selecaoVarreu) r.selecaoVarreu += 1;
  if ((niveis.V === 'malha' || niveis.F === 'malha') && r.exemplos.length < 3) r.exemplos.push(exemplo);
  alvo.set(op, r);
};
for (const peca of pecas) {
  const entrada = entradaDaReceita(receitaDoModulo(await importarReceita(resolverCaminhoReceita(peca))));
  if (soOperacoes) { console.log(JSON.stringify({ peca, operacoes: [...new Set(entrada.PASSOS.map((p) => p[0]))].sort() })); continue; }
  if (conferir) {
    try {
      nucleo(entrada.PASSOS, entrada.PARAMS, entrada.TOPO, entrada.MATERIAIS, entrada.ESQUELETO, entrada.ALIASES, { registroOperacoes: REGISTRO_DA_RECEITA, leitura: 'conferido' });
      console.log(JSON.stringify({ peca, conferida: true }));
    } catch (erro) { console.log(JSON.stringify({ peca, conferida: false, erro: erro.message })); }
    continue;
  }
  const daPeca = new Map();
  nucleo(entrada.PASSOS, entrada.PARAMS, entrada.TOPO, entrada.MATERIAIS, entrada.ESQUELETO, entrada.ALIASES, {
    registroOperacoes: REGISTRO_DA_RECEITA,
    aoLer: (i, op, resumo) => {
      const niveis = niveisDoPasso(resumo);
      const o = resumo.operacao;
      const exemplo = { peca, passo: i, V: niveis.V === 'malha' ? { varreu: o.V.varreu, tamanho: o.V.tamanho, lidos: o.V.lidos.length, citados: resumo.citados.V.length } : undefined, F: niveis.F === 'malha' ? { varreu: o.F.varreu, tamanho: o.F.tamanho, lidos: o.F.lidos.length, citados: resumo.citados.F.length } : undefined };
      somar(daPeca, op, niveis, exemplo); somar(soma, op, niveis, exemplo);
    },
  });
  console.log(JSON.stringify({ peca, operacoes: Object.fromEntries([...daPeca].map(([op, r]) => [op, { ...r, exemplos: undefined }])) }));
}
if (!soOperacoes && !conferir) console.log(JSON.stringify({ soma: Object.fromEntries([...soma].sort()) }));
