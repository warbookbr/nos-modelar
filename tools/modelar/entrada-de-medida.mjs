/* entrada-de-medida.mjs — o resolvedor de entrada das ferramentas de medida: o que o `vao:partes` já lia (esboço 2.0, receita ou
 * montagem persistida) numa função só, para `ondulacao`, `malha:lascas`, `vistas:superficie`, `exportar:obj` e `raio:aresta`.
 *
 * O rascunho de um objeto é um esboço 2.0 (`*.esboco.mjs` ou `.esboco.json`), e a receita do acervo é outra coisa; uma ferramenta que
 * só lia receita obrigava a escrever um arquivo de conversão. Aqui o arquivo é achado como o `resolverCaminhoReceita` acha (caminho,
 * nome curto, pasta da peça) e classificado pelo conteúdo:
 *   - receita: o módulo traz PASSOS ou CHAMADAS_COMPOSICOES; sai a própria receita;
 *   - esboço: JSON, ou módulo sem PASSOS (o `default` ou o `ESBOCO`); a opção `opcao` (de 1) é montada pelo núcleo e sai a receita
 *     em metro dela, com o neutro já executado, de modo que a ferramenta não monta a chapa duas vezes;
 *   - montagem persistida (`mecanifica.montagem`): saem as receitas das peças que ela cita, uma por referência.
 * `executar()` devolve o `{ entrada, neutro }` da receita, executando uma vez só. Nada é escrito e nenhuma receita é alterada. */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { entradaDaReceita, executarReceita } from '../../src/autoria/executar-receita.js';
import { importarReceita, receitaDoModulo } from './importar-receita.mjs';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';

export class ErroDeEntrada extends Error {
  constructor(mensagem) { super(mensagem); this.name = 'ErroDeEntrada'; }
}

const temPassos = (r) => r && typeof r === 'object' && (Array.isArray(r.PASSOS) || Array.isArray(r.CHAMADAS_COMPOSICOES));

/**
 * lerEntradaDeMedida(alvo, { opcao = 1, montagem = true }) -> uma de
 *   { tipo: 'receita', abs, nome, origem, receita, executar }
 *   { tipo: 'esboco', abs, nome, origem, receita, opcao, titulo, opcoes, painel, executar }
 *   { tipo: 'montagem', abs, nome, origem, dado, partes: [{ nome, receita }] }
 * `painel` é o painel de `montarOpcoes` (contatos e apoios declarados incluídos). Com `montagem: false` a montagem é recusada com o
 * motivo, para a ferramenta que só faz sentido sobre uma peça.
 */
export async function lerEntradaDeMedida(alvo, { opcao = 1, montagem = true } = {}) {
  /* o arquivo como foi dado (qualquer pasta, como o `vao:partes` sempre leu), e só então o nome curto da receita */
  let abs = resolve(alvo);
  if (!existsSync(abs) || statSync(abs).isDirectory()) {
    try { abs = resolverCaminhoReceita(alvo); } catch { throw new ErroDeEntrada(`${alvo} não existe, nem como esboço nem como receita`); }
  }
  const nome = basename(abs);
  let modulo = null; let json = null;
  if (/\.(mjs|js)$/.test(abs)) modulo = await importarReceita(abs); else json = JSON.parse(readFileSync(abs, 'utf8'));
  if (json?.formato === 'mecanifica.montagem') {
    if (!montagem) throw new ErroDeEntrada(`${alvo} é uma montagem; esta ferramenta lê uma receita ou um esboço (rode-a sobre a peça)`);
    const { lerMontagemPersistida } = await import('../../src/autoria/ler-montagem-persistida.js');
    const { receitasDaMontagem } = await import('./etapas-da-montagem.mjs');
    let receitas;
    try { receitas = await receitasDaMontagem(lerMontagemPersistida(json)); } catch (e) { throw new ErroDeEntrada(`a montagem não resolve: ${e.message}`); }
    return { tipo: 'montagem', abs, nome, origem: `montagem ${nome}`, dado: json, partes: Object.entries(receitas).map(([ref, receita]) => ({ nome: ref, receita })) };
  }
  const doModulo = modulo ? receitaDoModulo(modulo) : null;
  const receita = modulo ? (temPassos(doModulo) ? doModulo : Object.values(modulo).find(temPassos) ?? null) : null;
  if (receita) {
    let executada = null;
    return { tipo: 'receita', abs, nome, origem: `receita ${nome}`, receita, executar: () => (executada ??= executarReceita(receita)) };
  }
  const esboco = modulo ? (modulo.default ?? modulo.ESBOCO) : json;
  if (!esboco || typeof esboco !== 'object') throw new ErroDeEntrada(`${alvo} não exporta o esboço como default nem é uma receita`);
  const { montarOpcoes } = await import('./esboco-nucleo.mjs');
  let montado;
  try { montado = montarOpcoes(esboco, { nome: nome.replace(/\.[^.]+$/, ''), relato: false }); } catch (e) { throw new ErroDeEntrada(`o esboço ${nome} não monta: ${e.message}`); }
  if (montado.recusas?.length) throw new ErroDeEntrada(`o esboço foi recusado:\n${montado.recusas.map((r) => `- ${r.motivo ?? r}`).join('\n')}`);
  const painel = montado.paineis[opcao - 1];
  if (!painel) throw new ErroDeEntrada(`o esboço tem ${montado.paineis.length} opções e veio --opcao=${opcao}`);
  /* a receita do esboço não traz PARAMS quando a opção não os declara, e as ferramentas leem `receita.PARAMS` sem conferir */
  const receitaDoEsboco = { ...painel.receita, PARAMS: painel.receita.PARAMS ?? {} };
  const executada = { entrada: entradaDaReceita(receitaDoEsboco), neutro: painel.neutro, expansao: null };
  return {
    tipo: 'esboco', abs, nome, origem: `esboço ${nome}, opção ${opcao}`, receita: receitaDoEsboco, opcao, titulo: painel.titulo, opcoes: montado.paineis.length, painel,
    executar: () => executada,
  };
}

/** A opção escolhida na linha de comando (`--opcao=<n>`), de 1, ou 1 quando não veio. */
export function opcaoDaLinha(texto) {
  if (texto === null || texto === undefined) return 1;
  const n = Number(texto);
  if (!Number.isInteger(n) || n < 1) throw new ErroDeEntrada(`--opcao espera um inteiro a partir de 1, e veio '${texto}'`);
  return n;
}
