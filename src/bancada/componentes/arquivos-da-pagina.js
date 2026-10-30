/* arquivos-da-pagina.js — o que entra e sai da bancada como arquivo pelo navegador: o texto baixado para a pasta da pessoa e a imagem lida de um endereço. */

export function criarArquivosDaPagina({ documento = globalThis.document, ImagemDaPagina = globalThis.Image } = {}) {
  return {
    /** Baixa `texto` como `nome`, em JSON, pelo clique num link temporário. */
    baixar(nome, texto) {
      const url = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
      const ligacao = documento.createElement('a');
      ligacao.href = url;
      ligacao.download = nome;
      ligacao.click();
      URL.revokeObjectURL(url);
    },
    /** A imagem do endereço, carregada; a promessa rejeita quando ela não carrega. */
    carregarImagem(url) {
      return new Promise((resolver, rejeitar) => {
        const elemento = new ImagemDaPagina();
        elemento.onload = () => resolver(elemento);
        elemento.onerror = rejeitar;
        elemento.src = url;
      });
    },
  };
}
