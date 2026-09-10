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
import { comoTexto, trocarNoTexto } from './texto-parametro.js';

function falha(motivo, extra = {}) {
  return { estado: 'falha-recuperavel', motivo, ...extra };
}

async function importarDoArquivo(caminho) {
  const modulo = await import(`${pathToFileURL(caminho).href}?v=${Date.now()}-${Math.random()}`);
  return modulo.default ?? modulo;
}

/**
 * Troca o valor de um parâmetro declarado no arquivo da receita.
 *
 * Devolve `{ estado: 'aplicado', id, de, para }` ou
 * `{ estado: 'falha-recuperavel', motivo }` — e neste segundo caso o arquivo
 * fica byte a byte como estava.
 */
export async function escreverParametro(caminhoArquivo, id, valor) {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) {
    return falha(`valor de '${id}' precisa ser número finito`);
  }

  let receita;
  try {
    receita = await importarDoArquivo(caminhoArquivo);
  } catch (erro) {
    return falha(`não consegui carregar a receita: ${erro.message}`);
  }

  const declarado = parametroDeclarado(receita, id);
  if (!declarado) {
    return falha(`'${id}' não é parâmetro declarado desta peça`, {
      declarados: listarParametrosDeclarados(receita).map((p) => p.id),
    });
  }
  /* `pontoSelimTopo.1` é chave mais casa de coordenada, e a escrita sabe fazer.
     `secao.raio` é objeto dentro de objeto, e não sabe. */
  const [chave, segundo, ...resto] = declarado.caminho;
  const indice = segundo === undefined ? null : Number(segundo);
  if (resto.length > 0 || (segundo !== undefined && !Number.isInteger(indice))) {
    return falha(`'${id}' é aninhado em objeto, e a escrita cirúrgica só endereça chave de primeiro nível e casa de coordenada`);
  }

  const original = readFileSync(caminhoArquivo, 'utf8');
  const troca = trocarNoTexto(original, chave, indice, valor);
  if (troca.erro) return falha(troca.erro);
  if (troca.texto === original) return { estado: 'aplicado', id, de: declarado.valor, para: valor, semMudanca: true };

  /* O ensaio mora ao lado do original, no mesmo sistema de arquivos, para que a
     troca final seja um `rename` e não uma cópia pela metade. */
  const ensaio = `${caminhoArquivo}.ensaio-${process.pid}-${Date.now()}.js`;
  try {
    writeFileSync(ensaio, troca.texto, 'utf8');
    const candidata = await importarDoArquivo(ensaio);

    const depois = new Map(listarParametrosDeclarados(candidata).map((p) => [p.id, p.valor]));
    if (depois.get(id) !== Number(comoTexto(valor))) {
      return falha(`a troca não pegou: '${id}' continua ${depois.get(id)}`);
    }
    for (const antes of listarParametrosDeclarados(receita)) {
      if (antes.id === id) continue;
      if (depois.get(antes.id) !== antes.valor) {
        return falha(`a troca mexeu em '${antes.id}' também, de ${antes.valor} para ${depois.get(antes.id)}`);
      }
    }

    const execucao = executarReceita(candidata);
    if (!execucao?.neutro) return falha(`a receita com '${id}' = ${valor} não executa`);

    /* Órfão é face ou vértice que ficou sem dono depois da execução, e o motor
       o relata sem interromper. Um valor que introduz órfão passa por qualquer
       teste de "executou" e produz peça furada, então a comparação é contra o
       que o valor ANTIGO já produzia: piorar reprova, empatar passa. */
    const orfaosAntes = executarReceita(receita).neutro.orfaos?.length ?? 0;
    const orfaosDepois = execucao.neutro.orfaos?.length ?? 0;
    if (orfaosDepois > orfaosAntes) {
      return falha(`'${id}' = ${valor} deixa ${orfaosDepois} órfão(s), contra ${orfaosAntes} antes`);
    }

    renameSync(ensaio, caminhoArquivo);
    return { estado: 'aplicado', id, de: troca.de, para: Number(comoTexto(valor)) };
  } catch (erro) {
    return falha(`a receita com '${id}' = ${valor} não executa: ${erro.message}`);
  } finally {
    rmSync(ensaio, { force: true });
  }
}
