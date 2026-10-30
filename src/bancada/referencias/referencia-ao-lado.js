/* referencia-ao-lado.js — a referência da mesa do tema Revisão: a imagem que a aba de referência tem, as vistas dela e a câmera da peça posta na câmera da vista escolhida.
 *
 * A imagem é a que a aba de imagem de referência mostra (`imagem-na-cena.js`, a declarada pela peça ou a que a pessoa
 * pôs), lida a cada quadro do gerenciador das referências; este módulo não escolhe imagem nenhuma. Quando ela é a folha
 * de vistas da fonte (`referencias/fonte-vistas.png`, com o `fonte-partes.json` da mesma pasta), as quatro vistas da
 * folha têm câmera conhecida (`autoria/quadro-da-fonte.js`): a mesa mostra um quadro de cada vez, e com a mesma câmera
 * ligada a peça vai para a câmera daquele quadro, ortográfica, no mesmo centro e na mesma escala. Lado a lado as duas
 * metades têm o mesmo tamanho, e a peça e o quadro saem do mesmo tamanho e no mesmo lugar de cada metade; sobreposta, o
 * quadro cai em cima da peça. Imagem sem câmera conhecida aparece inteira, e a mesma câmera fica sem efeito.
 *
 * O vínculo vale nos dois sentidos: escolher a vista da referência leva a peça para ela, e escolher na peça uma vista
 * que a folha tem (pelo cubo, pela tecla ou pela busca) troca o quadro da referência. Girar a peça à mão não muda a
 * referência. Enquanto a mesa está na tela, a imagem e as pranchas na cena 3D ficam escondidas: a referência mora no
 * lado dela, e a prancha posta ao lado da peça cobriria a peça na vista lateral.
 *
 * Escreve `imagemDaReferencia` e `comparacao` no estado central e não toca a página; a mesa (`componentes/mesa-de-revisao.js`)
 * desenha. */
import * as THREE from 'three';
import { QUADRO_DA_FONTE, VISTAS_DA_FONTE, enquadramentoDaFonte } from '../../autoria/quadro-da-fonte.js';
import { VISTAS_BANCADA } from '../estado-bancada.js';
import { temaPorId } from '../temas/temas.js';

/* O `fonte-partes.json` de cada peça que tem um, pelo endereço que o Vite publica: só é lido quando a imagem da mesa é a
   folha de vistas daquela peça. As duas raízes são as mesmas de `imagens-da-peca.js`. */
const PARTES_DA_FONTE = {
  ...import.meta.glob('../../../procedural/pecas/*/referencias/fonte-partes.json', { query: '?url', import: 'default', eager: true }),
  ...import.meta.glob('../../../tools/fixtures/acervo/*/referencias/fonte-partes.json', { query: '?url', import: 'default', eager: true }),
};

/** O componente da mesa no tema: o tema que dá lugar a ele mostra a peça e a referência lado a lado. */
export const MOVEL_DA_MESA = 'mesa-comparacao';

const ARQUIVO_DA_FOLHA = /^(.+?):(?:.*\/)?fonte-vistas\.png$/;

const igual = (a, b) => a.every((valor, indice) => Math.abs(valor - b[indice]) < 1e-9);
const normal = (v) => { const n = Math.hypot(...v); return v.map((x) => x / n); };

/* O nome da vista da bancada que olha da mesma direção que a câmera de um quadro, ou `null`. A lateral, a frontal e a
   de cima são as da bancada; a isométrica da folha olha de um pouco mais à frente que a da bancada. */
function vistaDaBancadaNaDirecao(direcao) {
  const procurada = normal(direcao);
  return Object.entries(VISTAS_BANCADA).find(([, vista]) => igual(normal([...vista.direcao]), procurada))?.[0] ?? null;
}

const ROTULOS = ['Isométrica', 'Lateral direita', 'Frontal', 'De cima'];

/** As vistas de uma folha da fonte, na ordem dos quadros: o id (o nome da vista da bancada que a segue), o rótulo, o quadro e se a câmera é a da vista da bancada. */
export const VISTAS_DA_FOLHA = Object.freeze(VISTAS_DA_FONTE.map(([, direcao], quadro) => {
  const exata = vistaDaBancadaNaDirecao(direcao);
  return Object.freeze({ id: exata ?? 'isometrica', rotulo: ROTULOS[quadro], quadro, exata: Boolean(exata) });
}));
/** A imagem inteira, sem quadro: a única vista de uma imagem sem câmera conhecida, e a folha toda de uma vez. */
export const VISTA_INTEIRA = Object.freeze({ id: 'inteira', rotulo: 'Imagem inteira', quadro: null, exata: false });

/** Onde fica o quadro `indice` numa folha de dois por dois, em fração da imagem (coluna e linha). */
export function recorteDoQuadro(indice) {
  if (indice === null || indice === undefined) return null;
  return { coluna: indice % 2, linha: Math.floor(indice / 2) };
}

/**
 * A folha de vistas da fonte por trás de uma imagem de referência, ou `null`: a imagem tem de ser a `fonte-vistas.png`
 * declarada por uma peça (o id que a aba dá a ela é `<peça>:<caminho>`) e a peça tem de ter o `fonte-partes.json`.
 */
export function folhaDaFonte(descritor, partes = PARTES_DA_FONTE) {
  const casamento = String(descritor?.id ?? '').match(ARQUIVO_DA_FOLHA);
  if (!casamento) return null;
  const peca = casamento[1];
  const url = Object.entries(partes).find(([caminho]) => caminho.endsWith(`/${peca}/referencias/fonte-partes.json`))?.[1];
  return url ? { peca, urlDasPartes: url } : null;
}

/**
 * A câmera de um quadro da folha na cena da bancada: o centro, a direção e o alto da câmera da fonte, e a meia altura e
 * a meia largura do quadro, em unidades da cena. `paraCena` leva um ponto da peça à cena, e `escala` é quanto a peça foi
 * aumentada para caber no estúdio. A fonte (`fonte-partes.json`) e a peça executada estão as duas em metro; as
 * ferramentas que passam a milímetro (a folha comparativa) multiplicam as duas pelo mesmo fator.
 */
export function cameraDoQuadro({ total, quadro, paraCena, escala }) {
  const [, direcao, acima] = VISTAS_DA_FONTE[quadro];
  const { centro, raio } = enquadramentoDaFonte(total);
  const meiaAltura = raio * QUADRO_DA_FONTE.folga * escala;
  return {
    centro: paraCena(centro),
    direcao: [...direcao],
    acima: [...acima],
    meiaAltura,
    meiaLargura: (meiaAltura * QUADRO_DA_FONTE.W) / QUADRO_DA_FONTE.H,
  };
}

export function criarReferenciaAoLado({ ambiente, cena, imagemNaCena, estado, alternarProjecao, carregarJson }) {
  let chave = null;
  let total = null;
  let pedido = 0;
  let alinhando = false;
  let escondidaNaCena = false;
  let gizmoDaImagem = null;

  const ativa = () => Boolean(temaPorId(estado.obter('tema')).lugares[MOVEL_DA_MESA]);
  const comparacao = () => estado.obter('comparacao');
  const mudarComparacao = (parcial) => estado.definir({ comparacao: { ...comparacao(), ...parcial } });

  function vistasDaImagem() {
    return estado.obter('imagemDaReferencia')?.vistas ?? [];
  }

  /** Põe a câmera da peça na da vista da referência em vigor, quando o vínculo vale e a vista tem câmera. */
  function alinhar({ instantaneo = false } = {}) {
    const { modo, vista, mesmaCamera } = comparacao();
    if (!ativa() || !mesmaCamera || modo === 'escondida' || !total || !cena.modelo || estado.obter('inicializando')) return false;
    const escolhida = VISTAS_DA_FOLHA.find((cada) => cada.id === vista);
    if (!escolhida) return false;
    alinhando = true;
    try {
      if (ambiente.projecao !== 'ortografica') alternarProjecao();
      const { raiz } = cena.modelo;
      raiz.updateMatrixWorld(true);
      const camera = cameraDoQuadro({
        total,
        quadro: escolhida.quadro,
        paraCena: (ponto) => raiz.localToWorld(new THREE.Vector3(...ponto)).toArray(),
        escala: raiz.getWorldScale(new THREE.Vector3()).x,
      });
      ambiente.olharComoReferencia({ ...camera, vista: escolhida.exata ? escolhida.id : 'livre', instantaneo });
    } finally {
      alinhando = false;
    }
    if (!comparacao().alinhada) mudarComparacao({ alinhada: true });
    return true;
  }

  /* Alinha de novo, ou marca que a câmera da peça já não é a da referência. */
  function realinhar(opcoes) {
    if (!alinhar(opcoes) && comparacao().alinhada) mudarComparacao({ alinhada: false });
  }

  async function trocarDeImagem(descritor) {
    const meu = ++pedido;
    total = null;
    if (!descritor?.url) {
      estado.definir({ imagemDaReferencia: null });
      return;
    }
    const folha = folhaDaFonte(descritor);
    const partes = folha ? await carregarJson(folha.urlDasPartes).catch(() => null) : null;
    if (meu !== pedido) return;
    total = partes?.total ?? null;
    const vistas = total ? [...VISTAS_DA_FOLHA, VISTA_INTEIRA] : [VISTA_INTEIRA];
    estado.definir({ imagemDaReferencia: { url: descritor.url, rotulo: descritor.rotulo ?? 'Imagem de referência', folha: Boolean(total), vistas } });
    const atual = comparacao().vista;
    if (vistas.some((cada) => cada.id === atual)) realinhar();
    else mudarComparacao({ vista: vistas[0].id });
  }

  function esconderDaCena(esconder) {
    const grupo = imagemNaCena.gerenciador.grupo;
    if (esconder || escondidaNaCena) grupo.visible = !esconder;
    escondidaNaCena = esconder;
    if (!esconder) return;
    gizmoDaImagem ??= ambiente.scene.getObjectByName('__gizmo_da_imagem__') ?? null;
    if (gizmoDaImagem) gizmoDaImagem.visible = false;
  }

  let anterior = comparacao();
  estado.assinar(['comparacao'], ({ comparacao: atual }) => {
    const antes = anterior;
    anterior = atual;
    const ligou = atual.mesmaCamera && !antes.mesmaCamera;
    const voltou = atual.modo !== 'escondida' && antes.modo === 'escondida';
    if (atual.vista !== antes.vista || ligou || voltou) realinhar();
  });
  estado.assinar(['tema'], () => {
    if (ativa()) alinhar({ instantaneo: true });
    else esconderDaCena(false);
  });
  estado.assinar(['inicializando'], ({ inicializando }) => {
    if (!inicializando) alinhar({ instantaneo: true });
  });

  return {
    /** A cada quadro: a imagem que a aba tem agora, e a referência na cena escondida enquanto a mesa está na tela. */
    acompanhar() {
      const descritor = imagemNaCena.gerenciador.obterImagemReferencia();
      const nova = descritor ? `${descritor.id}|${descritor.url ?? ''}` : null;
      if (nova !== chave) {
        chave = nova;
        trocarDeImagem(descritor);
      }
      if (ativa() || escondidaNaCena) esconderDaCena(ativa());
    },
    /**
     * A vista da peça mudou (pelo cubo, pela tecla, pela busca, pelo foco ou à mão). Com a mesma câmera, escolher outra
     * vista que a folha tem troca o quadro da referência, e a peça vai para a câmera dele. Enquadrar, focar, girar ou
     * pedir de novo a vista que a referência já mostra mexem só na peça, que deixa de estar alinhada.
     */
    aoMudarVista(vista) {
      if (alinhando || !ativa()) return;
      const { mesmaCamera, vista: daReferencia, alinhada } = comparacao();
      const segue = mesmaCamera && vista !== daReferencia
        && vistasDaImagem().some((cada) => cada.id === vista && cada.quadro !== null);
      if (segue) mudarComparacao({ vista });
      else if (alinhada) mudarComparacao({ alinhada: false });
    },
    alinhar,
  };
}
