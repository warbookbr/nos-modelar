/* endereco.js — o endereço da página como estado reproduzível da bancada: os parâmetros lidos na subida, a escrita do estado na URL sem recarregar e a cópia do endereço.
 *
 * Quem decide o que vai na URL é a peça em cena (`cena/peca-em-cena.js`); este componente só lê e escreve o endereço, e
 * não reescreve o histórico quando a consulta não mudou. */

export function montarEndereco({ local = globalThis.location, historico = globalThis.history, navegador = globalThis.navigator } = {}) {
  let ultimaQuery = null;
  return {
    parametros: new URLSearchParams(local.search),
    escrever(query) {
      if (query === ultimaQuery) return;
      ultimaQuery = query;
      historico.replaceState(null, '', `${local.pathname}${query ? `?${query}` : ''}`);
    },
    href: () => local.href,
    /** Copia o endereço para a área de transferência; rejeita quando o navegador não deixa. */
    copiar: () => navegador.clipboard.writeText(local.href),
  };
}
