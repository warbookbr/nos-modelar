/* mesa-de-revisao.js — a mesa do tema Revisão: o cabeçalho da peça, o lado da referência com o cabeçalho dela (a vista, ao lado ou sobreposta, a transparência, a mesma câmera e esconder) e a referência sobreposta à peça.
 *
 * Lê do estado central `tema`, `comparacao`, `imagemDaReferencia`, `vista`, `projecao`, `juntas`, `malhaEmEdicao` e
 * `anotacoes`, e escreve `comparacao` pelos controles. A imagem, as vistas dela e a câmera são de
 * `referencias/referencia-ao-lado.js`; aqui elas viram página. A mesa só aparece no tema que lhe dá lugar
 * (`lugares['mesa-comparacao']`, em `temas/temas.js`); nos outros ela fica na casa escondida da página.
 *
 * O modo vai para `data-comparacao` na mesa (`ao-lado`, `sobreposta`, `escondida` ou `sem-referencia`), e a folha de
 * estilo do tema arruma a cena por ele: ao lado, a peça fica com a metade da mesa e a referência com a outra; nos
 * outros modos a peça fica com a mesa inteira. O quadro da referência é um recorte da imagem (`--aspecto` é a proporção
 * dela, que num quadro de dois por dois é a mesma da folha) que cabe inteiro no lado dele, como a câmera da peça faz o
 * quadro caber inteiro no canvas; por isso os dois saem do mesmo tamanho e no mesmo lugar. */
import { VISTAS_BANCADA } from '../estado-bancada.js';
import { temaPorId } from '../temas/temas.js';
import { MOVEL_DA_MESA, recorteDoQuadro } from '../referencias/referencia-ao-lado.js';

/** O modo que a mesa mostra: o escolhido, ou `sem-referencia` quando a peça não tem imagem. */
export function modoDaMesa({ comparacao, imagemDaReferencia }) {
  return imagemDaReferencia ? comparacao.modo : 'sem-referencia';
}

/** 'Direita · ortográfica', ou 'Lateral direita da referência · ortográfica' com a câmera na da referência. */
export function textoDaVistaDaPeca({ vista, projecao, comparacao, imagemDaReferencia }) {
  const daReferencia = comparacao?.alinhada
    ? imagemDaReferencia?.vistas.find((cada) => cada.id === comparacao.vista)?.rotulo ?? null
    : null;
  const nome = daReferencia ? `${daReferencia} da referência` : VISTAS_BANCADA[vista]?.nome ?? 'Câmera livre';
  return `${nome} · ${projecao === 'ortografica' ? 'ortográfica' : 'perspectiva'}`;
}

export function montarMesaDeRevisao({ elementos, estado, acoes = {}, documento = globalThis.document }) {
  const {
    mesa, vistaDaPeca, edicaoDaPeca, notasDaPeca, btnMostrar, btnVista, nomeVista, menuVistas, modos = [],
    opacidade, valorOpacidade, btnMesmaCamera, btnEsconder, imagemAoLado, imagemSobreposta, carga,
  } = elementos;
  if (!mesa) return {};

  const comparacao = () => estado.obter('comparacao');
  const mudar = (parcial) => estado.definir({ comparacao: { ...comparacao(), ...parcial } });
  const vistaEscolhida = () => (estado.obter('imagemDaReferencia')?.vistas ?? []).find((cada) => cada.id === comparacao().vista) ?? null;

  function pintarQuadro(caixa, url, vista) {
    if (!caixa) return;
    const recorte = recorteDoQuadro(vista?.quadro);
    caixa.style.backgroundImage = url ? `url("${url}")` : '';
    caixa.style.backgroundSize = recorte ? '200% 200%' : '100% 100%';
    caixa.style.backgroundPosition = recorte ? `${recorte.coluna * 100}% ${recorte.linha * 100}%` : '0% 0%';
    caixa.dataset.quadro = recorte ? String(vista.quadro) : 'inteira';
  }

  function desenharMenu(vistas, atual) {
    if (!menuVistas) return;
    menuVistas.replaceChildren(...vistas.map((vista) => {
      const item = documento.createElement('button');
      item.type = 'button';
      item.className = 'item-vista-referencia';
      item.dataset.vistaReferencia = vista.id;
      item.setAttribute('role', 'menuitemradio');
      item.setAttribute('aria-checked', String(vista.id === atual));
      item.textContent = vista.rotulo;
      item.addEventListener('click', () => {
        abrirMenu(false);
        mudar({ vista: vista.id });
      });
      return item;
    }));
  }

  function refletir(valores) {
    const ativa = Boolean(temaPorId(valores.tema).lugares[MOVEL_DA_MESA]);
    const imagem = valores.imagemDaReferencia;
    const { modo, mesmaCamera, opacidade: transparencia } = valores.comparacao;
    mesa.dataset.comparacao = modoDaMesa(valores);
    if (vistaDaPeca) vistaDaPeca.textContent = textoDaVistaDaPeca(valores);
    if (edicaoDaPeca) {
      const editando = valores.malhaEmEdicao ? 'Editando malha' : valores.juntas?.modo ? 'Editando juntas' : '';
      edicaoDaPeca.textContent = editando;
      edicaoDaPeca.hidden = !editando;
    }
    if (notasDaPeca) {
      const quantas = valores.anotacoes?.length ?? 0;
      notasDaPeca.hidden = quantas === 0;
      notasDaPeca.textContent = `${quantas} ${quantas === 1 ? 'nota' : 'notas'}`;
    }
    const vista = vistaEscolhida();
    if (nomeVista) nomeVista.textContent = vista?.rotulo ?? 'Imagem inteira';
    if (btnVista) btnVista.disabled = (imagem?.vistas.length ?? 0) < 2;
    desenharMenu(imagem?.vistas ?? [], valores.comparacao.vista);
    for (const botao of modos) botao.setAttribute('aria-pressed', String(botao.dataset.comparar === modo));
    if (opacidade) opacidade.value = String(Math.round(transparencia * 100));
    if (valorOpacidade) valorOpacidade.textContent = `${Math.round(transparencia * 100)}%`;
    const temCamera = Boolean(vista && vista.quadro !== null && imagem?.folha);
    if (btnMesmaCamera) {
      btnMesmaCamera.disabled = !temCamera;
      btnMesmaCamera.setAttribute('aria-pressed', String(mesmaCamera && temCamera));
      btnMesmaCamera.title = temCamera
        ? `Mesma câmera: ${mesmaCamera ? 'ligada' : 'desligada'}`
        : 'Mesma câmera: esta vista da referência não tem câmera conhecida';
    }
    if (carga && imagem?.url && carga.getAttribute('src') !== imagem.url) carga.setAttribute('src', imagem.url);
    pintarQuadro(imagemAoLado, ativa ? imagem?.url : null, vista);
    pintarQuadro(imagemSobreposta, ativa ? imagem?.url : null, vista);
    if (imagemSobreposta) imagemSobreposta.style.opacity = String(transparencia);
  }

  /* A proporção da imagem chega quando ela carrega; o quadro de dois por dois tem a mesma da folha. */
  carga?.addEventListener('load', () => {
    const aspecto = carga.naturalWidth / Math.max(1, carga.naturalHeight);
    for (const caixa of [imagemAoLado, imagemSobreposta]) caixa?.style.setProperty?.('--aspecto', String(aspecto));
  });

  function abrirMenu(aberto) {
    if (!menuVistas) return;
    menuVistas.hidden = !aberto;
    btnVista?.setAttribute('aria-expanded', String(aberto));
  }
  btnVista?.addEventListener('click', () => abrirMenu(Boolean(menuVistas?.hidden)));
  /* A lista fecha com um clique fora dela ou com Esc. */
  documento.addEventListener?.('pointerdown', (evento) => {
    if (menuVistas && !menuVistas.hidden && !evento.target?.closest?.('.escolha-vista-referencia')) abrirMenu(false);
  });
  documento.addEventListener?.('keydown', (evento) => {
    if (evento.key === 'Escape' && menuVistas && !menuVistas.hidden) abrirMenu(false);
  });
  for (const botao of modos) botao.addEventListener('click', () => mudar({ modo: botao.dataset.comparar }));
  opacidade?.addEventListener('input', () => mudar({ opacidade: Number(opacidade.value) / 100 }));
  btnMesmaCamera?.addEventListener('click', () => mudar({ mesmaCamera: !comparacao().mesmaCamera }));
  btnEsconder?.addEventListener('click', () => mudar({ modo: 'escondida' }));
  btnMostrar?.addEventListener('click', () => mudar({ modo: 'ao-lado' }));
  notasDaPeca?.addEventListener('click', () => acoes.abrirNotas?.());

  estado.assinar(
    ['tema', 'comparacao', 'imagemDaReferencia', 'vista', 'projecao', 'juntas', 'malhaEmEdicao', 'anotacoes'],
    (valores) => refletir(valores),
  );
  refletir(estado.ler());
  return {};
}
