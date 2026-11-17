/* menu-abrir.js — a janela Abrir da barra superior: a lista das receitas do acervo em trabalho, com busca, filtro por categoria e por situação.
 *
 * A janela `Abrir` lista o acervo em trabalho, que é diferente do catálogo
 * homologado: o catálogo diz o que foi validado e publicado, e o acervo diz o
 * que existe para modelar agora. Escolher aqui troca a peça da cena sem
 * recarregar a página e sem desligar a sessão ativa, que continua chegando
 * pela IA e sobrescreve quando chegar.
 *
 * Acima da lista ficam três coisas que se combinam: o campo de busca por nome (sem diferença de maiúscula nem de acento,
 * filtrando a cada tecla), as categorias com a contagem do que cada uma teria e a situação (em trabalho e de ensaio, com as
 * de ensaio escondidas até alguém pedi-las). Limpar volta à lista completa do estado de abertura. */
import { CATEGORIAS } from '../acervo-receitas.js';

const SITUACOES = [
  { id: 'trabalho', rotulo: 'Em trabalho' },
  { id: 'ensaio', rotulo: 'De ensaio' },
];
const SITUACOES_DE_ABERTURA = ['trabalho'];

/* Minúscula e sem acento, para `acentuação` achar `Acentuacao`. */
export function normalizarBusca(texto) {
  return String(texto ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

/* A entrada sem categoria e sem `classificar` (lista montada à mão) é de `outros`; a que ainda espera `classificar()` fica sem categoria. */
function categoriaDe(entrada) {
  if (entrada.categoria) return entrada.categoria;
  return typeof entrada.classificar === 'function' ? null : 'outros';
}

function situacaoDe(entrada) {
  return entrada.situacao ?? (entrada.ensaio ? 'ensaio' : 'trabalho');
}

export function montarMenuAbrir({ listaAcervo, entradas: todas, aoEscolher }) {
  if (!listaAcervo) return {};
  /* A parte de um objeto de várias partes não é entrada: a entrada é o objeto, que abre a montagem inteira, e a árvore
     de objetos já serve para ver uma parte sozinha. A parte continua abrindo pelo nome no endereço. */
  const entradas = todas.filter((entrada) => !entrada.parteDe);
  const documento = listaAcervo.ownerDocument;
  if (!entradas.length) {
    const vazio = documento.createElement('div');
    vazio.className = 'linha';
    vazio.textContent = 'O acervo não tem receita nenhuma.';
    listaAcervo.replaceChildren(vazio);
    return {};
  }

  const filtro = { busca: '', categoria: null, situacoes: new Set(SITUACOES_DE_ABERTURA) };
  let classificando = false;

  /* ---- os controles, acima da lista ---- */
  const controles = documento.createElement('div');
  controles.className = 'abrir-filtros';
  controles.style.cssText = 'flex: none; display: grid; gap: var(--e2); margin-bottom: var(--e3);';

  const campo = documento.createElement('label');
  campo.className = 'campo-busca';
  campo.innerHTML = '<svg class="icone" aria-hidden="true"><use href="#i-busca"></use></svg>';
  const entrada = documento.createElement('input');
  entrada.type = 'search';
  entrada.id = 'buscaAcervo';
  entrada.setAttribute('placeholder', 'Buscar peça pelo nome');
  entrada.setAttribute('autocomplete', 'off');
  entrada.setAttribute('aria-label', 'Buscar peça pelo nome');
  campo.append(entrada);

  const linhaDeCategorias = documento.createElement('div');
  linhaDeCategorias.setAttribute('role', 'group');
  linhaDeCategorias.setAttribute('aria-label', 'Categoria');
  const linhaDeSituacoes = documento.createElement('div');
  linhaDeSituacoes.setAttribute('role', 'group');
  linhaDeSituacoes.setAttribute('aria-label', 'Situação');
  for (const grupo of [linhaDeCategorias, linhaDeSituacoes]) {
    grupo.style.cssText = 'display: flex; flex-wrap: wrap; align-items: center; gap: var(--e1);';
  }

  const rodape = documento.createElement('div');
  rodape.style.cssText = 'display: flex; align-items: center; justify-content: space-between; gap: var(--e2);';
  const resumo = documento.createElement('span');
  resumo.className = 'resumo';
  resumo.setAttribute('aria-live', 'polite');
  const limpar = documento.createElement('button');
  limpar.type = 'button';
  limpar.className = 'botao texto';
  limpar.textContent = 'Limpar';
  rodape.append(resumo, limpar);

  controles.append(campo, linhaDeCategorias, linhaDeSituacoes, rodape);
  listaAcervo.parentNode?.insertBefore(controles, listaAcervo);

  /* ---- o que passa em cada filtro ---- */
  const passaBusca = (e) => !filtro.busca || normalizarBusca(e.id).includes(filtro.busca);
  const passaSituacao = (e) => filtro.situacoes.has(situacaoDe(e));
  const passaCategoria = (e) => filtro.categoria === null || categoriaDe(e) === filtro.categoria;

  function botaoDeFiltro(texto, ativo, aoClicar, desligado = false) {
    const botao = documento.createElement('button');
    botao.type = 'button';
    botao.className = 'botao';
    botao.textContent = texto;
    botao.setAttribute('aria-pressed', String(ativo));
    if (desligado) botao.setAttribute('data-vazia', 'true');
    botao.addEventListener('click', aoClicar);
    return botao;
  }

  function desenharControles() {
    /* A contagem de cada categoria é a do que a busca e a situação já deixaram, para o número dizer o que o clique mostraria. */
    const base = entradas.filter((e) => passaBusca(e) && passaSituacao(e));
    const botoes = [botaoDeFiltro(`Todas (${base.length})`, filtro.categoria === null, () => escolherCategoria(null))];
    botoes[0].dataset.categoria = 'todas';
    for (const categoria of CATEGORIAS) {
      const quantas = base.filter((e) => categoriaDe(e) === categoria.id).length;
      const botao = botaoDeFiltro(`${categoria.rotulo} (${quantas})`, filtro.categoria === categoria.id, () => escolherCategoria(categoria.id), quantas === 0);
      botao.dataset.categoria = categoria.id;
      botoes.push(botao);
    }
    linhaDeCategorias.replaceChildren(...botoes);

    /* A contagem de cada situação respeita a busca e a categoria, e não a outra situação. */
    const paraSituacao = entradas.filter((e) => passaBusca(e) && passaCategoria(e));
    linhaDeSituacoes.replaceChildren(...SITUACOES.map((situacao) => {
      const quantas = paraSituacao.filter((e) => situacaoDe(e) === situacao.id).length;
      const botao = botaoDeFiltro(`${situacao.rotulo} (${quantas})`, filtro.situacoes.has(situacao.id), () => alternarSituacao(situacao.id), quantas === 0);
      botao.dataset.situacao = situacao.id;
      return botao;
    }));
  }

  function desenharLista() {
    const visiveis = entradas.filter((e) => passaBusca(e) && passaSituacao(e) && passaCategoria(e));
    if (!visiveis.length) {
      const vazio = documento.createElement('div');
      vazio.className = 'linha';
      vazio.dataset.semResultado = 'true';
      vazio.textContent = 'Nenhuma receita bate com a busca e os filtros.';
      listaAcervo.replaceChildren(vazio);
    } else {
      listaAcervo.replaceChildren(...visiveis.map(linhaDa));
    }
    resumo.textContent = `${visiveis.length} de ${entradas.length}${classificando ? ' · classificando as categorias…' : ''}`;
    return visiveis.length;
  }

  function desenhar() {
    desenharControles();
    desenharLista();
  }

  function linhaDa(e) {
    const linha = documento.createElement('button');
    linha.type = 'button';
    linha.className = 'linha';
    linha.dataset.receita = e.id;
    const nome = documento.createElement('span');
    nome.textContent = e.id;
    const tipo = documento.createElement('kbd');
    tipo.textContent = e.montagem ? 'montagem' : 'peça';
    linha.append(nome, tipo);
    /* ENSAIO APARECE COMO ENSAIO. As receitas de `tools/fixtures/acervo/`
       entram nesta lista para as guardas de navegador terem o que abrir, e
       vinham sem marca nenhuma, sob um cabeçalho que chama tudo de acervo:
       não havia como distinguir material de teste de peça de verdade. A marca
       continua quando o filtro de situação as mostra. */
    if (situacaoDe(e) === 'ensaio') {
      const marca = documento.createElement('kbd');
      marca.className = 'marca-ensaio';
      marca.textContent = 'ensaio';
      linha.append(marca);
    }
    linha.addEventListener('click', () => aoEscolher(e));
    return linha;
  }

  function escolherCategoria(id) {
    filtro.categoria = filtro.categoria === id ? null : id;
    desenhar();
  }

  function alternarSituacao(id) {
    if (filtro.situacoes.has(id)) filtro.situacoes.delete(id); else filtro.situacoes.add(id);
    desenhar();
  }

  entrada.addEventListener('input', () => {
    filtro.busca = normalizarBusca(entrada.value);
    desenhar();
  });
  limpar.addEventListener('click', () => {
    entrada.value = '';
    filtro.busca = '';
    filtro.categoria = null;
    filtro.situacoes = new Set(SITUACOES_DE_ABERTURA);
    desenhar();
  });

  /* A CATEGORIA SÓ SE LÊ QUANDO ALGUÉM PRECISA DELA. Ela vem do `PLANO` de cada receita, e ler o `PLANO` baixa a receita:
     fazer isso ao montar a página traria as sessenta receitas para a hora em que a peça inicial ainda está carregando. A
     janela começa a classificar na primeira vez que fica visível (ou quando quem a monta chama `classificar`), e a lista
     já aparece inteira nesse meio-tempo, com as categorias se completando. */
  let pedida = null;
  function classificar() {
    pedida ??= (async () => {
      const pendentes = entradas.filter((e) => categoriaDe(e) === null);
      if (!pendentes.length) return;
      classificando = true;
      desenhar();
      await Promise.all(pendentes.map((e) => e.classificar()));
      classificando = false;
      desenhar();
    })();
    return pedida;
  }

  const janela = listaAcervo.closest?.('[role="dialog"]');
  if (janela && typeof MutationObserver === 'function') {
    const olhar = () => { if (!janela.hidden) classificar(); };
    new MutationObserver(olhar).observe(janela, { attributes: true, attributeFilter: ['hidden'] });
    olhar();
  }

  desenhar();
  return { classificar, filtro };
}
