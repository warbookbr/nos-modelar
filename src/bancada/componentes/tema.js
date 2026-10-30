/* tema.js — o tema da bancada na página: os atributos da raiz que a folha de estilo usa, os componentes levados para os lugares do tema, os rótulos que mudam de nome e a escolha do tema no menu Controles.
 *
 * Lê do estado central `tema` e escreve nele pela escolha da pessoa, que fica guardada como preferência local. Um tema
 * é a declaração de `temas/temas.js`; aqui ela vira página. A raiz recebe `data-tema`, `data-cores` (o conjunto de
 * cores do sistema visual) e `data-arrumacao` (a arrumação da folha de estilo). Cada componente móvel (`data-movel`)
 * vai para o lugar (`data-lugar`) que o tema lhe dá, na ordem em que o tema os cita, e volta para onde a página o pôs
 * quando o tema seguinte não o cita: um marcador guarda a casa dele. Mover não refaz o componente, então os ouvintes,
 * o texto e o estado de cada controle seguem com ele. Os rótulos (`data-rotulo`) trocam de texto e voltam ao da página.
 * Um rótulo pode ter um texto por caso da tela (`casoDaTela`: a peça sem nada escolhido, uma parte escolhida ou o modo de
 * edição ligado), e então este componente também lê `selecao`, `juntas` e `malhaEmEdicao` e o troca quando o caso muda.
 *
 * A cena 3D não é página: `aoMudarCena` recebe o que o tema declara para ela, com as cores já lidas das variáveis do
 * sistema visual, para a cor do fundo e do contorno sair do mesmo lugar que a cor dos painéis. */
import { TEMAS, temaPorId } from '../temas/temas.js';

/** O caso da tela que escolhe o texto de um rótulo com um texto por caso: `edicao`, `parte` ou `peca`. */
export function casoDaTela({ selecao, juntas, malhaEmEdicao }) {
  if (juntas?.modo || malhaEmEdicao) return 'edicao';
  return selecao?.selecionadas?.length ? 'parte' : 'peca';
}

export function montarTema({
  elementos, estado, preferencia, aoMudarCena = () => {}, lerVariavel = null, janela = globalThis,
}) {
  const { raiz, escolha, moveis = [], lugares = [], rotulaveis = [] } = elementos;
  const documento = raiz.ownerDocument ?? janela.document;
  const lugarPorNome = new Map(lugares.map((lugar) => [lugar.dataset.lugar, lugar]));
  const casas = new Map(moveis.map((movel) => {
    const marcador = documento.createComment(`casa de ${movel.dataset.movel}`);
    movel.parentNode?.insertBefore(marcador, movel);
    return [movel, marcador];
  }));
  const textosDaPagina = new Map(rotulaveis.map((elemento) => [elemento, elemento.textContent]));
  const ler = lerVariavel
    ?? ((nome) => janela.getComputedStyle?.(raiz)?.getPropertyValue(nome)?.trim() || null);

  function arrumar(tema) {
    const moveisPorNome = new Map(moveis.map((movel) => [movel.dataset.movel, movel]));
    const levados = new Set();
    for (const [nome, destino] of Object.entries(tema.lugares)) {
      const movel = moveisPorNome.get(nome);
      const lugar = lugarPorNome.get(destino);
      if (!movel || !lugar) continue;
      lugar.append(movel);
      levados.add(movel);
    }
    for (const movel of moveis) {
      if (levados.has(movel)) continue;
      const marcador = casas.get(movel);
      marcador?.parentNode?.insertBefore(movel, marcador);
    }
  }

  function rotular(tema) {
    const caso = casoDaTela(estado.ler());
    for (const elemento of rotulaveis) {
      const rotulo = tema.rotulos[elemento.dataset.rotulo];
      const texto = (typeof rotulo === 'object' && rotulo !== null ? rotulo[caso] : rotulo) ?? textosDaPagina.get(elemento);
      /* A seleção é um objeto novo a cada mudança; o texto só é escrito quando muda. */
      if (elemento.textContent !== texto) elemento.textContent = texto;
    }
  }

  /** A declaração da cena do tema com as variáveis do sistema visual trocadas pelas cores que elas valem agora. */
  function cenaDoTema(tema) {
    if (!tema.cena) return null;
    const resolvida = {};
    for (const [chave, valor] of Object.entries(tema.cena)) {
      resolvida[chave] = typeof valor === 'string' && valor.startsWith('--') ? ler(valor) : valor;
    }
    return resolvida;
  }

  function desenharEscolha(atual) {
    if (!escolha) return;
    escolha.replaceChildren(...TEMAS.map((tema) => {
      const botao = documento.createElement('button');
      botao.type = 'button';
      botao.className = 'opcao-tema';
      botao.dataset.tema = tema.id;
      botao.setAttribute('role', 'radio');
      botao.setAttribute('aria-checked', String(tema.id === atual));
      botao.title = tema.descricao;
      botao.textContent = tema.rotulo;
      botao.addEventListener('click', () => escolher(tema.id));
      return botao;
    }));
  }

  function aplicar(id) {
    const tema = temaPorId(id);
    raiz.dataset.tema = tema.id;
    raiz.dataset.cores = tema.cores;
    raiz.dataset.arrumacao = tema.arrumacao;
    arrumar(tema);
    rotular(tema);
    desenharEscolha(tema.id);
    aoMudarCena(cenaDoTema(tema), tema);
  }

  function escolher(id) {
    const tema = temaPorId(id);
    preferencia?.salvar(tema.id);
    estado.definir({ tema: tema.id });
    return tema.id;
  }

  estado.assinar(['tema'], ({ tema }) => aplicar(tema));
  estado.assinar(['selecao', 'juntas', 'malhaEmEdicao'], ({ tema }) => rotular(temaPorId(tema)));
  aplicar(estado.obter('tema'));

  return { escolher, get atual() { return temaPorId(estado.obter('tema')); } };
}
