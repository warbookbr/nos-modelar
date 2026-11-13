/* pagina.js — a página única do manual: HTML com o CSS embutido, sem script e sem recurso de rede. As imagens entram
   embutidas (data URI de PNG) quando o passo traz os bytes; sem eles, o passo sai com a lista e sem imagem. */

import { parametrosEmTexto } from './lista-de-pecas.js';

const escapar = (texto) => String(texto).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const CSS = `
:root { color-scheme: light; --fundo: #f6f7f5; --tinta: #1d2421; --suave: #5a6560; --linha: #cfd5d1; --destaque: #e8590c; }
* { box-sizing: border-box; }
body { margin: 0; padding: 24px 16px 48px; background: var(--fundo); color: var(--tinta); font: 16px/1.5 system-ui, sans-serif; }
main { max-width: 860px; margin: 0 auto; }
h1 { font-size: 1.7rem; margin: 0 0 4px; }
h2 { font-size: 1.2rem; margin: 0 0 8px; }
p.nota { color: var(--suave); margin: 0 0 24px; }
table { width: 100%; border-collapse: collapse; margin: 8px 0 16px; font-size: 0.95rem; }
th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--linha); vertical-align: top; }
th.n, td.n { text-align: right; font-variant-numeric: tabular-nums; }
section.passo { background: #fff; border: 1px solid var(--linha); border-radius: 8px; padding: 16px; margin: 20px 0; break-inside: avoid; }
section.passo h2 span { color: var(--destaque); }
section.passo figure { margin: 8px 0 0; }
section.passo figcaption { color: var(--suave); font-size: 0.85rem; margin-top: 4px; }
section.passo img { display: block; width: 100%; height: auto; border-radius: 4px; margin-top: 8px; }
.instrucao { margin: 0 0 8px; }
.avisos { margin: 0 0 8px; padding-left: 20px; color: var(--suave); }
.ids { color: var(--suave); font-size: 0.85rem; }
@media (prefers-color-scheme: dark) {
  :root { color-scheme: dark; --fundo: #151a18; --tinta: #e6ebe8; --suave: #9aa6a0; --linha: #34403a; }
  section.passo { background: #1c2320; }
}
@media print { body { background: #fff; color: #000; } section.passo { border-color: #999; } }
`;

function tabela(lista) {
  const linhas = lista.pecas.map((peca) => {
    const rotulo = escapar(peca.nomeExibido ?? peca.nome);
    const nome = peca.parametros ? `${rotulo} <span class="ids">(${escapar(peca.parametrosExibidos ?? parametrosEmTexto(peca.parametros))})</span>` : rotulo;
    const { largura, altura, profundidade } = peca.caixaMm;
    return `<tr><td>${nome}</td><td class="n">${peca.quantidade}</td><td class="n">${largura} × ${altura} × ${profundidade}</td><td>${escapar(peca.materiais.join(', ') || '—')}</td></tr>`;
  }).join('\n');
  return `<table><thead><tr><th>Peça</th><th class="n">Quantidade</th><th class="n">Caixa (mm)</th><th>Materiais</th></tr></thead><tbody>\n${linhas}\n</tbody></table>`;
}

/**
 * `manual` traz { montagem, lista, passos: [{ numero, nome, quantidade, lista, instrucoes?, avisos?, imagem?: Buffer, imagemDetalhe?: Buffer }], foraDasEtapas }; a lista e os passos já trazem os nomes de exibição.
 */
export function paginaDoManual(manual) {
  const passos = manual.passos.map((passo) => {
    const titulo = passo.quantidade > 1 ? `${passo.quantidade} × ${passo.nome}` : passo.nome;
    const alt = `Passo ${passo.numero}: ${escapar(titulo)}, em laranja o que entra neste passo`;
    const figura = (dados, legenda, texto) => `<figure><img alt="${alt}${texto ? ', ' + texto : ''}" src="data:image/png;base64,${Buffer.from(dados).toString('base64')}">${legenda ? `<figcaption>${legenda}</figcaption>` : ''}</figure>`;
    const comDetalhe = Boolean(passo.imagem && passo.imagemDetalhe);
    const imagem = [
      passo.imagem ? figura(passo.imagem, comDetalhe ? 'Onde vão' : '', '') : '',
      comDetalhe ? figura(passo.imagemDetalhe, 'Detalhe de uma delas', 'detalhe da primeira') : '',
    ].join('');
    const instrucoes = (passo.instrucoes ?? []).map((texto) => `<p class="instrucao">${escapar(texto)}</p>`).join('\n');
    const avisos = passo.avisos?.length ? `<ul class="avisos">${passo.avisos.map((texto) => `<li>${escapar(texto)}</li>`).join('')}</ul>` : '';
    return `<section class="passo" id="passo-${passo.numero}">
<h2><span>Passo ${passo.numero}.</span> ${escapar(titulo)}</h2>
${instrucoes}
${avisos}
${tabela(passo.lista)}
${imagem}
</section>`;
  }).join('\n');
  const fora = manual.foraDasEtapas.length
    ? `<p class="nota">Instâncias que a montagem não lista em suas etapas, e que ficam sem passo: ${escapar(manual.foraDasEtapas.join(', '))}.</p>` : '';
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Manual: ${escapar(manual.montagem)}</title>
<style>${CSS}</style>
</head>
<body>
<main>
<h1>Manual: ${escapar(manual.montagem)}</h1>
<p class="nota">${manual.lista.totalDeInstancias} instâncias em ${manual.lista.pecas.length} peças distintas, em ${manual.passos.length} passos. Em cada imagem, o que entra no passo está em laranja e as já montadas, esmaecidas.</p>
${fora}
<h2>Lista de peças</h2>
${tabela(manual.lista)}
${passos}
</main>
</body>
</html>
`;
}
