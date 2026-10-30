/* arquivos-da-pagina.test.js — baixar põe o texto num link com o nome do arquivo, e a imagem lida resolve ou rejeita. */
import { describe, expect, it } from 'vitest';
import { criarPagina } from './dom-de-teste.js';
import { criarArquivosDaPagina } from './arquivos-da-pagina.js';

describe('arquivos da página', () => {
  it('baixar clica num link com o nome do arquivo', () => {
    const { documento } = criarPagina('');
    const clicados = [];
    const criar = documento.createElement;
    documento.createElement = (etiqueta) => {
      const elemento = criar(etiqueta);
      elemento.click = () => clicados.push({ download: elemento.download, href: elemento.href });
      return elemento;
    };
    criarArquivosDaPagina({ documento }).baixar('ajuste-furgao.json', '{"gestos":[]}');
    expect(clicados).toHaveLength(1);
    expect(clicados[0].download).toBe('ajuste-furgao.json');
    expect(clicados[0].href).toMatch(/^blob:/);
  });

  it('carregarImagem resolve com a imagem carregada e rejeita a que falha', async () => {
    class ImagemFalsa {
      set src(url) { queueMicrotask(() => (url.includes('falha') ? this.onerror(new Error(url)) : this.onload())); }
    }
    const arquivos = criarArquivosDaPagina({ documento: {}, ImagemDaPagina: ImagemFalsa });
    await expect(arquivos.carregarImagem('/sobreposicao.png')).resolves.toBeInstanceOf(ImagemFalsa);
    await expect(arquivos.carregarImagem('/falha.png')).rejects.toThrow('/falha.png');
  });
});
