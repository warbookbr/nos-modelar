/* versao-publicada.mjs — de qual commit veio a página que está aberta.
 *
 * A bancada é publicada num endereço só e atualizada por cima. Quem olha a tela
 * não tem como saber se está vendo a construção de hoje ou a do mês passado
 * guardada pelo navegador, e a resposta muda o que fazer diante de um defeito:
 * corrigir código ou recarregar a página. O commit resolve isso porque é a
 * única identidade que a construção carrega e o repositório também conhece.
 *
 * A leitura é injetável para a prova poder exercitar o repositório sem commit,
 * o `git` ausente e a árvore suja sem depender do estado real de quem roda.
 */

export const SEM_VERSAO = 'desconhecida';

export function lerVersaoPublicada({ executar } = {}) {
  if (typeof executar !== 'function') return { commit: SEM_VERSAO, data: null, sujo: false };
  const tentar = (comando) => {
    try {
      const saida = executar(comando);
      return typeof saida === 'string' ? saida.trim() : '';
    } catch {
      return '';
    }
  };

  const commit = tentar('git rev-parse --short HEAD');
  if (!commit) return { commit: SEM_VERSAO, data: null, sujo: false };
  const data = tentar('git log -1 --format=%cI') || null;
  /* Árvore suja significa que a construção contém trabalho que não está em
     commit nenhum, então o commit sozinho passaria a mentir sobre o que está na
     tela. */
  const sujo = tentar('git status --porcelain').length > 0;
  return { commit, data, sujo };
}

export function descreverVersao({ commit, data, sujo }) {
  if (!commit || commit === SEM_VERSAO) return SEM_VERSAO;
  const dia = data ? new Date(data).toISOString().slice(0, 10) : null;
  return `${commit}${dia ? ` · ${dia}` : ''}${sujo ? ' · alterações locais' : ''}`;
}
