/* escrever-parametro.js — troca UM número declarado na receita, no arquivo.
 *
 * A receita não é dado, é programa: tabela medida, derivação e geração de
 * passos, com o motivo de cada número escrito ao lado dele. Regerar o arquivo a
 * partir de uma estrutura perderia justamente os comentários que sustentam a
 * peça, então a troca é CIRÚRGICA no texto: uma linha, um número.
 *
 * O que torna isso seguro não é a expressão de busca, é a conferência depois.
 * O texto novo é gravado num arquivo vizinho, importado de lá, e só substitui o
 * original se o parâmetro pedido tiver o valor pedido, TODOS os outros
 * continuarem iguais, e a receita ainda executar. Expressão que acertou a linha
 * errada é reprovada por essa conferência, e o original não é tocado.
 *
 * O vocabulário de retorno segue `docs/mecanifica/ESCRITA-TRANSACIONAL-MONTAGEM.md`:
 * `aplicado` e `falha-recuperavel`, e escrita parcial nunca é chamada de
 * sucesso. */

import { readFileSync, writeFileSync, renameSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { executarReceita } from './executar-receita.js';
import { listarParametrosDeclarados, parametroDeclarado } from './parametros-declarados.js';
import { aplicarTrocas, comoTexto } from './texto-parametro.js';

function falha(motivo, extra = {}) {
  return { estado: 'falha-recuperavel', motivo, ...extra };
}

async function importarDoArquivo(caminho) {
  const modulo = await import(`${pathToFileURL(caminho).href}?v=${Date.now()}-${Math.random()}`);
  return modulo.default ?? modulo;
}

/**
 * Troca VÁRIOS parâmetros declarados no arquivo da receita, de uma vez.
 *
 * Uma conferência e uma gravação para o lote inteiro. Troca inválida reprova
 * tudo: gravar metade deixaria a peça num estado que ninguém pediu.
 *
 * Devolve `{ estado: 'aplicado', aplicadas: [{ id, de, para }] }` ou
 * `{ estado: 'falha-recuperavel', motivo }` — e neste segundo caso o arquivo
 * fica byte a byte como estava.
 */
export async function escreverParametros(caminhoArquivo, mudancas) {
  const pedidos = Object.entries(mudancas ?? {});
  if (pedidos.length === 0) return falha('não veio mudança nenhuma');

  let receita;
  try {
    receita = await importarDoArquivo(caminhoArquivo);
  } catch (erro) {
    return falha(`não consegui carregar a receita: ${erro.message}`);
  }

  const original = readFileSync(caminhoArquivo, 'utf8');
  const troca = aplicarTrocas(original, mudancas, (id) => parametroDeclarado(receita, id));
  if (troca.erro) {
    return falha(troca.erro, { declarados: listarParametrosDeclarados(receita).map((p) => p.id) });
  }
  if (troca.texto === original) {
    return { estado: 'aplicado', aplicadas: troca.aplicadas, semMudanca: true };
  }

  /* O ensaio mora ao lado do original, no mesmo sistema de arquivos, para que a
     troca final seja um `rename` e não uma cópia pela metade. */
  const ensaio = `${caminhoArquivo}.ensaio-${process.pid}-${Date.now()}.js`;
  try {
    writeFileSync(ensaio, troca.texto, 'utf8');
    const candidata = await importarDoArquivo(ensaio);

    const esperado = new Map(troca.aplicadas.map((a) => [a.id, a.para]));
    const depois = new Map(listarParametrosDeclarados(candidata).map((p) => [p.id, p.valor]));
    for (const [id, para] of esperado) {
      if (depois.get(id) !== para) return falha(`a troca não pegou: '${id}' continua ${depois.get(id)}`);
    }
    for (const antes of listarParametrosDeclarados(receita)) {
      if (esperado.has(antes.id)) continue;
      if (depois.get(antes.id) !== antes.valor) {
        return falha(`a troca mexeu em '${antes.id}' também, de ${antes.valor} para ${depois.get(antes.id)}`);
      }
    }

    const execucao = executarReceita(candidata);
    if (!execucao?.neutro) return falha('a receita com os valores novos não executa');

    /* Órfão é face ou vértice que ficou sem dono, e o motor o relata sem
       interromper. Valor que introduz órfão passa por qualquer teste de
       "executou" e produz peça furada; a comparação é contra o que os valores
       ANTIGOS já produziam, então piorar reprova e empatar passa. */
    const orfaosAntes = executarReceita(receita).neutro.orfaos?.length ?? 0;
    const orfaosDepois = execucao.neutro.orfaos?.length ?? 0;
    if (orfaosDepois > orfaosAntes) {
      return falha(`os valores novos deixam ${orfaosDepois} órfão(s), contra ${orfaosAntes} antes`);
    }

    renameSync(ensaio, caminhoArquivo);
    return { estado: 'aplicado', aplicadas: troca.aplicadas };
  } catch (erro) {
    return falha(`a receita com os valores novos não executa: ${erro.message}`);
  } finally {
    rmSync(ensaio, { force: true });
  }
}

/**
 * Troca o valor de UM parâmetro declarado. Casca fina de `escreverParametros`,
 * mantida porque o atendente da bancada e as provas falam de um número por vez.
 */
export async function escreverParametro(caminhoArquivo, id, valor) {
  const resultado = await escreverParametros(caminhoArquivo, { [id]: valor });
  if (resultado.estado !== 'aplicado') return resultado;
  const [aplicada] = resultado.aplicadas;
  return { estado: 'aplicado', id, de: aplicada?.de, para: aplicada?.para, ...(resultado.semMudanca ? { semMudanca: true } : {}) };
}
