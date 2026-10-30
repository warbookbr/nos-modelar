/* menu-abrir.js — a janela Abrir da barra superior: a lista das receitas do acervo em trabalho, com as de ensaio marcadas.
 *
 * A janela `Abrir` lista o acervo em trabalho, que é diferente do catálogo
 * homologado: o catálogo diz o que foi validado e publicado, e o acervo diz o
 * que existe para modelar agora. Escolher aqui troca a peça da cena sem
 * recarregar a página e sem desligar a sessão ativa, que continua chegando
 * pela IA e sobrescreve quando chegar. */

export function montarMenuAbrir({ listaAcervo, entradas, aoEscolher }) {
  if (!listaAcervo) return;
  const documento = listaAcervo.ownerDocument;
  if (!entradas.length) {
    const vazio = documento.createElement('div');
    vazio.className = 'linha';
    vazio.textContent = 'O acervo não tem receita nenhuma.';
    listaAcervo.replaceChildren(vazio);
    return;
  }
  listaAcervo.replaceChildren(...entradas.map((entrada) => {
    const linha = documento.createElement('button');
    linha.type = 'button';
    linha.className = 'linha';
    linha.dataset.receita = entrada.id;
    const nome = documento.createElement('span');
    nome.textContent = entrada.id;
    const tipo = documento.createElement('kbd');
    tipo.textContent = entrada.montagem ? 'montagem' : 'peça';
    linha.append(nome, tipo);
    /* ENSAIO APARECE COMO ENSAIO. As receitas de `tools/fixtures/acervo/`
       entram nesta lista para as guardas de navegador terem o que abrir, e
       vinham sem marca nenhuma, sob um cabeçalho que chama tudo de acervo:
       não havia como distinguir material de teste de peça de verdade. */
    if (entrada.ensaio) {
      const marca = documento.createElement('kbd');
      marca.className = 'marca-ensaio';
      marca.textContent = 'ensaio';
      linha.append(marca);
    }
    linha.addEventListener('click', () => aoEscolher(entrada));
    return linha;
  }));
}
