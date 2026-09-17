/* main.js — bancada interativa de co-modelagem (Humano + IA): 3D, referências, parâmetros e feedback. */
import './styles.css';
import * as THREE from 'three';
import { carregarPeca } from './carregar-peca.js';
import { CATALOGO_HOMOLOGADO, idsDoCatalogo } from '../autoria/catalogo-pecas.js';
import { listarAcervo } from './acervo-receitas.js';
import { comCaminho, receitaComParametros } from '../autoria/parametros-vivos.js';
import { criarPunhosDeJunta } from './controles/punhos-de-junta.js';
import { aplicarAjusteDeJunta, detectarJuntas } from '../autoria/ajuste-de-junta.js';
import { capturarAlvo } from '../autoria/alvo-do-ajuste.js';
import { descreverGesto } from '../autoria/descricao-do-gesto.js';
import { adaptarThree } from '../autoria/adaptar-three.js';
import { caixasPorParte, portasPublicadas } from '../autoria/descrever-partes.js';
import { criarAmbienteBancada, posicionarNoEstudio } from './criar-ambiente.js';
import { criarControladorPartes } from './controlar-partes.js';
import { criarSelecaoBancada } from './criar-selecao.js';
import { criarCamadaEdicaoDeMalha } from './edicao-de-malha.js';
import { criarSincronizadorSessao } from './sessao/sincronizador.js';
import { criarGerenciadorReferencias3D } from './referencias/prancha-overlay.js';
import { criarPainelReferencias } from './referencias/painel-referencias.js';
import { criarPunhoDaImagem } from './referencias/punho-da-imagem.js';
import { apagar, criarFace, duplicar, escalar, extrudar, rotacionar } from '../autoria/topologia-da-malha.js';
import { criarArmazenamentoImagem } from './referencias/armazenamento-imagem.js';
import { criarAlinhamentoInicial, normalizarImagemReferencia } from './referencias/imagem-referencia.js';
import { urlDaReferencia } from './referencias/imagens-da-peca.js';
import { criarPreferenciasBancada } from './preferencias/estado-local.js';
import { criarRegistroAtalhos, normalizarCombinacao } from './controles/atalhos.js';
import { criarHistoricoParametros } from './controles/historico-parametros.js';
import { criarGerenciadorAnotacoes3D } from './anotacoes/pinos-anotacoes.js';
import { criarRegistroDeEventos } from './sessao/registro-de-eventos.js';
import {
  alvosDeEnquadramento,
  escreverEstadoNaUrl,
  lerEstadoDaUrl,
} from './estado-bancada.js';

const DEMO_RECEITA = {
  meta: { nome: 'Engrenagem Cônica de Demonstração' },
  PASSOS: [
    ['cilindro', { origemId: 10, raio: 1.2, alt: 0.35, segmentos: 32 }],
    ['cilindro', { origemId: 20, raio: 0.7, alt: 0.7, segmentos: 32, em: [0, 0.35, 0] }],
    ['furo', { de: { op: 'cilindro', id: 20, face: 'topo' }, raio: 0.28, ate: 1.1, segmentos: 24 }],
    ['parte', { nome: 'coroa-dentada', sel: { origem: { op: 'cilindro', id: 10 } } }],
    ['parte', { nome: 'cubo-central', sel: { origem: { op: 'cilindro', id: 20 } } }],
    ['publicarPorta', {
      id: 'eixoCentral',
      rotulo: 'Eixo de Rotação',
      de: { op: 'cilindro', id: 20, face: 'topo' },
      interface: {
        forma: 'cilindro', papel: 'interna', eixo: [0, 1, 0], centro: [0, 0, 0],
        raio: 0.28, inicio: 0, fim: 1.1, referencia: [1, 0, 0],
      },
    }],
  ],
};

function formatarNome(nome) {
  if (!nome) return '';
  return nome
    .replace(/([a-zá-ú])([A-Z])/g, '$1 $2')
    .replaceAll('-', ' ')
    .replace(/^./, (letra) => letra.toUpperCase());
}

function mostrarErro(erro) {
  const elemento = document.getElementById('erro');
  if (!elemento) return;
  elemento.hidden = false;
  elemento.textContent = String(erro?.stack || erro?.message || erro);
}

function mostrarAviso(texto) {
  const elemento = document.getElementById('aviso');
  if (!elemento) return;
  elemento.textContent = texto;
  elemento.hidden = false;
  clearTimeout(mostrarAviso.timeout);
  mostrarAviso.timeout = setTimeout(() => { elemento.hidden = true; }, 2200);
}

export async function iniciar({ catalogo = CATALOGO_HOMOLOGADO } = {}) {
  const params = new URLSearchParams(location.search);
  const pecaPedida = params.get('peca');
  const nomesDisponiveis = idsDoCatalogo(catalogo);

  const canvas = document.getElementById('cenaBancada');
  let vistaAtual = 'isometrica';
  let inicializando = true;
  let ultimaQuery = null;
  let controlador = null;
  let selecao3d = null;
  let edicaoDeMalha = null;
  let parInspecionado = null;
  let modeloAtual = null;
  let nomePecaAtual = pecaPedida ?? 'sessao-ativa';

  /* O que a barra de Estado responde. Estas três coisas eram indicadores fixos
     no alto da tela, dizendo "tudo bem" durante todo o tempo em que nada
     acontecia. Agora ficam guardadas aqui, aparecem como aviso só quando estão
     ruins, e o modal de Estado mostra o resumo e a sequência de eventos. */
  const registroDeEventos = criarRegistroDeEventos();
  const estadoDaBancada = { sessao: 'desconectado', faceSemIdentidade: 0, peca: null, origem: null };

  /* Quem escolheu a peça manda. A bancada relê `sessao-ativa.json` a cada
     segundo e meio, e até aqui qualquer leitura trocava o modelo em cena. Quem
     acabava de abrir uma peça em `Abrir` a via ser substituída pela peça do
     arquivo sem tocar em nada, e perdia a seleção, o enquadramento e os
     parâmetros em prévia junto. A entrega da sessão continua chegando: fica
     guardada e aparece como oferta, que carrega num clique. */
  let escolhaManual = false;
  let entregaDaSessaoEmEspera = null;

  function oferecerEntregaDaSessao(nome) {
    const oferta = document.getElementById('avisoSessaoNova');
    if (!oferta) return;
    oferta.hidden = entregaDaSessaoEmEspera === null;
    oferta.textContent = `A sessão da IA trouxe ${nome}. Carregar.`;
  }

  function atualizarAvisoDeEstado() {
    const aviso = document.getElementById('avisoEstado');
    const selo = document.getElementById('selo-estado');
    if (!aviso) return;
    const problemas = [];
    if (estadoDaBancada.sessao === 'erro') problemas.push('Erro de sincronia com a sessão');
    if (estadoDaBancada.faceSemIdentidade > 0) problemas.push(`${estadoDaBancada.faceSemIdentidade} faces sem identidade`);
    aviso.hidden = problemas.length === 0;
    aviso.textContent = problemas.join(' · ');
    if (selo) selo.hidden = problemas.length === 0;
  }
  /* Identidade endereçável da peça, que não é o nome de exibição. `?peca=` só
     reabre o que o acervo sabe resolver, e o rótulo do modelo muda com a
     receita, então guardar o rótulo na URL produz endereço que não abre nada.
     Vale para a peça pedida na URL e para a escolhida em `Abrir`; a sessão
     enviada pela IA não é endereçável e limpa isto. */
  let idNaUrl = pecaPedida ?? null;
  const marcadoresDoPar = [];

  function mesmosNomes(a, b) {
    return a.length === b.length && a.every((nome, indice) => nome === b[indice]);
  }

  function limparMarcadoresDoPar() {
    for (const marcador of marcadoresDoPar.splice(0)) {
      marcador.removeFromParent();
      marcador.geometry.dispose();
      marcador.material.dispose();
    }
    parInspecionado = null;
  }

  function marcarParInspecionado(nomes) {
    limparMarcadoresDoPar();
    if (!modeloAtual) return;
    const partes = [...new Set(nomes)].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const cores = ['#ffb000', '#39c6ff'];
    partes.forEach((nome, indice) => {
      const grupo = modeloAtual.partes.get(nome);
      grupo?.traverse((malha) => {
        if (!malha.isMesh || !malha.geometry) return;
        const geometria = new THREE.EdgesGeometry(malha.geometry, 28);
        const material = new THREE.LineBasicMaterial({
          color: cores[indice], transparent: true, opacity: 0.92, depthTest: false,
        });
        const contorno = new THREE.LineSegments(geometria, material);
        contorno.name = '__contorno_inspecao_par__';
        contorno.renderOrder = 3;
        malha.add(contorno);
        marcadoresDoPar.push(contorno);
      });
    });
    parInspecionado = partes;
  }

  function atualizarBotoesVista() {
    for (const botao of document.querySelectorAll('[data-vista]')) {
      botao.classList.toggle('ativa', botao.dataset.vista === vistaAtual);
    }
  }

  const ambiente = criarAmbienteBancada(canvas, {
    aoMudarVista(vista) {
      vistaAtual = vista;
      atualizarBotoesVista();
      if (!inicializando && controlador) salvarEstadoNaUrl(controlador.estado());
    },
    aoMudarCameraLivre() {
      if (!inicializando && controlador) salvarEstadoNaUrl(controlador.estado());
    },
  });

  const lista = document.getElementById('listaPartes');
  const filtroPartes = document.getElementById('filtroPartes');
  const resumoFiltro = document.getElementById('resumoFiltro');
  const resumo = document.getElementById('selecaoResumo');
  const botoesModo = {
    todas: document.getElementById('btnTodas'),
    contexto: document.getElementById('btnContexto'),
    isolar: document.getElementById('btnIsolar'),
  };
  const explosao = document.getElementById('explosao');
  const valorExplosao = document.getElementById('valorExplosao');
  const btnFocar = document.getElementById('btnFocarSelecao');
  const btnSelecionarConjunto = document.getElementById('btnSelecionarConjunto');
  const btnWireframeSelecao = document.getElementById('btnWireframeSelecao');
  const opacidadeSelecao = document.getElementById('opacidadeSelecao');
  const valorOpacidadeSelecao = document.getElementById('valorOpacidadeSelecao');
  const eixosReferencia = document.getElementById('eixosReferencia');
  const barraReferencia = document.getElementById('barraReferencia');
  const valorReferencia = document.getElementById('valorReferencia');
  const estadoCatalogoVazio = document.getElementById('estadoCatalogoVazio');
  let quadroReferencia = 0;

  function aplicarFiltroPartes() {
    const termo = filtroPartes?.value.trim().toLocaleLowerCase('pt-BR') ?? '';
    let visiveis = 0;
    const linhas = lista.querySelectorAll('.parte-linha');
    for (const linha of linhas) {
      const nome = linha.querySelector('.nome')?.textContent?.toLocaleLowerCase('pt-BR') ?? '';
      const corresponde = !termo || nome.includes(termo);
      linha.hidden = !corresponde;
      if (corresponde) visiveis += 1;
    }
    if (resumoFiltro) {
      resumoFiltro.textContent = termo ? `${visiveis} de ${linhas.length} componentes` : `${linhas.length} componentes`;
    }
  }

  filtroPartes?.addEventListener('input', aplicarFiltroPartes);
  addEventListener('keydown', (evento) => {
    const alvo = evento.target;
    const campoEditavel = alvo instanceof HTMLInputElement
      || alvo instanceof HTMLTextAreaElement
      || alvo instanceof HTMLSelectElement
      || alvo?.isContentEditable;
    if (evento.key === '/' && !campoEditavel) {
      evento.preventDefault();
      filtroPartes?.focus();
    }
  });

  // Gerenciadores visuais 3D auxiliares
  const gerenciadorReferencias3D = criarGerenciadorReferencias3D({ cena: ambiente.scene });
  const armazenamentoImagem = criarArmazenamentoImagem();
  let alvoReferenciaAtual = null;
  let urlLocalReferencia = null;
  async function gerarPlanoReferencia(entrada) {
    if (!modeloAtual || !alvoReferenciaAtual) return null;
    if (urlLocalReferencia) { URL.revokeObjectURL(urlLocalReferencia); urlLocalReferencia = null; }
    const url = entrada.blob ? (urlLocalReferencia = URL.createObjectURL(entrada.blob)) : entrada.url;
    if (!url) return null;
    const imagem = await new Promise((resolver, rejeitar) => {
      const elemento = new Image();
      elemento.onload = () => resolver(elemento);
      elemento.onerror = rejeitar;
      elemento.src = url;
    }).catch(() => null);
    if (!imagem) return null;
    const caixa = new THREE.Box3().setFromObject(modeloAtual.raiz);
    const inicial = criarAlinhamentoInicial({ caixa, larguraImagem: imagem.naturalWidth, alturaImagem: imagem.naturalHeight, lado: entrada.alinhamento?.lado });
    const ajustes = Object.fromEntries(Object.entries(entrada.alinhamento ?? {}).filter(([, valor]) => valor !== null));
    const descritor = normalizarImagemReferencia({ ...entrada, url, alinhamento: { ...inicial, ...ajustes } });
    if (!descritor) return null;
    const textura = await new Promise((resolver, rejeitar) => new THREE.TextureLoader().load(url, resolver, undefined, rejeitar)).catch(() => null);
    if (!textura) return null;
    textura.colorSpace = THREE.SRGBColorSpace;
    gerenciadorReferencias3D.definirImagemReferencia(descritor, { textura, possuiTextura: true });
    /* O painel e o punho só sabem da foto quando alguém avisa. A imagem também
       chega sozinha, declarada pela peça, e sem este aviso a miniatura ficava
       vazia numa bancada que já estava mostrando a referência na cena. */
    painelReferencias?.refletirAlinhamento?.(descritor.alinhamento);
    punhoDaImagem.refletir();
    await armazenamentoImagem.salvar(alvoReferenciaAtual, descritor);
    return descritor;
  }
  /* UMA PORTA SÓ para o alinhamento da imagem. O painel e o punho escrevem a
     mesma coisa, e duas escritas separadas sairiam de sincronia: o número no
     campo diria uma posição e a foto estaria em outra. */
  async function aplicarAlinhamentoDaImagem(alinhamento) {
    const atual = gerenciadorReferencias3D.obterImagemReferencia();
    if (!atual || !alvoReferenciaAtual) return;
    const atualizado = { ...atual.alinhamento, ...alinhamento };
    gerenciadorReferencias3D.atualizarImagemReferencia(atualizado);
    painelReferencias?.refletirAlinhamento?.(atualizado);
    await armazenamentoImagem.salvar(alvoReferenciaAtual, { ...atual, alinhamento: atualizado });
  }

  const painelReferencias = criarPainelReferencias({
    container: document.getElementById('containerReferencias'),
    aoAlternarPrancha: (id, visivel) => gerenciadorReferencias3D.alternarVisibilidade(id, visivel),
    aoGerarPlano: gerarPlanoReferencia,
    aoAtualizarAlinhamento: aplicarAlinhamentoDaImagem,
    imagensCarregadas: () => {
      const atual = gerenciadorReferencias3D.obterImagemReferencia();
      return atual?.url ? [atual] : [];
    },
    aoRemoverImagem: async () => {
      gerenciadorReferencias3D.removerImagemReferencia();
      punhoDaImagem.refletir();
      if (alvoReferenciaAtual) await armazenamentoImagem.remover(alvoReferenciaAtual);
    },
  });

  /* O PUNHO DA IMAGEM. As três barras de posição no painel fazem a pessoa
     procurar às cegas: ela olha o modelo e arrasta um número no canto da tela.
     O punho põe o gesto onde ela está olhando, e o painel continua refletindo o
     número — os dois escrevem o mesmo alinhamento. */
  const punhoDaImagem = criarPunhoDaImagem({
    cena: ambiente.scene,
    canvas,
    cameraAtual: () => ambiente.camera,
    alinhamentoAtual: () => gerenciadorReferencias3D.obterImagemReferencia()?.alinhamento ?? null,
    aoArrastar: (parcial) => { aplicarAlinhamentoDaImagem(parcial); },
  });

  let sincronizador = null;

  /* A receita que a bancada tem em mãos, quando a peça veio do acervo. É dela
     que sai a prévia: mexer o controle monta uma receita equivalente com o
     valor novo e reexecuta, em vez de deformar a malha na tela. */
  let receitaAberta = null;

  /* PARÂMETRO SAIU DA BANCADA. A aba de parâmetros, as setas por eixo e o botão
     de gravar existiam para a pessoa digitar um número medido da receita sem
     abrir código. Na prática o autor não os usava, e a IA nunca usou o painel —
     ela edita o arquivo da receita direto, onde vê o contexto inteiro. Dois
     caminhos para a mesma coisa, um deles sem uso, e os dois disputando a tela
     com o gizmo de mover.
     Agora a bancada é o lugar de desenhar, e o número medido é assunto da
     receita. O que a pessoa desenha sai como alvo e a rodada de absorção
     escreve. O histórico continua aqui porque o Ctrl+Z da malha usa ele. */
  /* A malha como ela veio do arquivo. É o piso do desfazer: Ctrl+Z devolve o que
     esta sessão desenhou e para aqui, porque abaixo disto não existe estado
     anterior que ela tenha produzido.
     Guarda `V` E `F`, e não só as posições. Enquanto o gesto era só mover, as
     faces nunca mudavam e o desfazer podia trocar coordenadas no lugar. Com
     extrudar e apagar, desfazer sem as faces devolvia a peça sem a parte que a
     pessoa tinha acabado de recuperar — medido: apagar o tubo do selim e
     desfazer deixava a peça com sete partes. */
  let origemDaMalha = null;
  const fotografarMalha = (neutro) => ({
    V: new Map([...neutro.V].map(([id, p]) => [id, [...p]])),
    F: new Map([...neutro.F].map(([id, f]) => [id, { ...f, vs: [...f.vs] }])),
  });
  /* O que o controlador de câmera usa fora do modo de edição, guardado para ser
     devolvido na saída. */
  const BOTOES_DE_CAMERA_PADRAO = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
  const historicoParametros = criarHistoricoParametros({
    valorDeOrigem: (chave) => {
      if (chave === '__edicao_de_malha__') return origemDaMalha;
      /* Sem junta puxada é o fundo da pilha do ajuste por junta: desfazer além
         daí não inventa deslocamento que ninguém fez. */
      if (chave === '__ajuste_de_junta__') return ORIGEM_DAS_JUNTAS;
      return undefined;
    },
  });

  /* Ctrl+Z devolve o que esta sessão desenhou na malha e para no estado que veio
     do arquivo: com a pilha vazia, o comando não faz nada e não inventa estado
     anterior. */
  function desfazerDesenho() {
    const passo = historicoParametros.desfazer();
    if (!passo) return false;
    /* O ajuste por junta é um estado só — o mapa inteiro de deslocamentos — e
       voltar a ele é repor o mapa e reconstruir. Antes ele não passava por aqui:
       arrastar um punho não registrava nada, Ctrl+Z não tinha o que desfazer, e
       o único jeito de voltar era um botão de descartar que jogava fora todos os
       arrastos de uma vez. */
    if (passo.chave === '__ajuste_de_junta__') {
      reporAjustesDeJunta(passo.valor ?? ORIGEM_DAS_JUNTAS);
      mostrarAviso(passo.naOrigem || !(passo.valor ?? []).length
        ? 'Desfeito: as juntas voltaram ao que veio do arquivo.'
        : 'Desfeito o último arrasto de junta.');
      return true;
    }
    if (passo.chave !== '__edicao_de_malha__' || !edicaoDeMalha || !passo.valor) return false;
    /* Duas formas de voltar, e a diferença é o custo. Se só as posições mudaram,
       trocar coordenadas na geometria desenhada basta e é instantâneo. Se as
       FACES mudaram, a malha desenhada tem outra forma e precisa ser refeita. */
    const viva = edicaoDeMalha.malha();
    const mesmasFaces = viva.F.size === passo.valor.F.size
      && [...passo.valor.F.keys()].every((id) => viva.F.has(id));
    if (mesmasFaces) edicaoDeMalha.restaurar(passo.valor.V);
    else {
      const estadoAtual = edicaoDeMalha.estado();
      reconstruirMalhaEditada({ ...viva, V: passo.valor.V, F: passo.valor.F }, {
        partes: edicaoDeMalha.partesEditadas,
        desenharMalha: edicaoDeMalha.desenhaMalha,
        modo: estadoAtual.modo,
        selecionados: [],
      });
    }
    refletirAjusteDeJunta();
    mostrarAviso(historicoParametros.vazio
      ? 'Desfeito: a malha voltou ao que veio do arquivo.'
      : 'Desfeito o último movimento.');
    return true;
  }
  /* AJUSTE DE JUNTA — o gesto que não passa por parâmetro.
   *
   * A seta acima escreve um número declarado no instante do arrasto, e num
   * quadro em treliça isso não alcança o que a pessoa quer: puxar o balanço
   * pelo comprimento estica os quatro balanços, porque todos terminam no mesmo
   * eixo traseiro. Aqui a pessoa pega o canto e arrasta. A malha deforma, a
   * receita não é tocada, e o que fica guardado é um deslocamento por junta.
   *
   * Quem transforma esse deslocamento em receita organizada é a rodada de
   * absorção, que lê o alvo salvo. Durante o gesto ninguém precisa saber que
   * número existe. */
  let neutroDoArquivo = null;
  let juntasDaPeca = null;
  let materiaisDaPeca = {};
  const ajustesDeJunta = new Map();
  /* O fundo da pilha do desfazer para as juntas: nenhuma puxada. */
  const ORIGEM_DAS_JUNTAS = [];
  let arrastoDeJunta = null;
  let modoJuntas = false;
  const btnJuntas = document.getElementById('btnJuntas');
  const rodapeJuntas = document.getElementById('rodapeJuntas');
  const resumoJuntas = document.getElementById('resumoJuntas');
  const btnSalvarAjusteDeJunta = document.getElementById('btnSalvarAjusteDeJunta');

  const somar = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

  const punhosDeJunta = criarPunhosDeJunta({
    cena: ambiente.scene,
    canvas,
    cameraAtual: () => ambiente.camera,
    escalaDoModelo: () => modeloAtual?.raiz?.scale?.x ?? 1,
    aoArrastar(junta, deslocamento) {
      /* O punho informa o deslocamento desde que o ponteiro desceu. Somar isso
         ao que a junta já acumulava exige guardar o ponto de partida, senão o
         segundo arrasto na mesma junta apagaria o primeiro. */
      if (arrastoDeJunta?.junta !== junta) {
        arrastoDeJunta = { junta, partida: ajustesDeJunta.get(junta) ?? [0, 0, 0] };
      }
      ajustesDeJunta.set(junta, somar(arrastoDeJunta.partida, deslocamento));
      reconstruirComAjuste();
    },
    aoSoltar() {
      arrastoDeJunta = null;
      /* UM PASSO POR ARRASTO, e não um por quadro: o registro acontece quando o
         ponteiro sobe, então cada Ctrl+Z desfaz um arrasto inteiro. */
      historicoParametros.registrar('__ajuste_de_junta__', listaDeAjustes());
      historicoParametros.separar();
      refletirAjusteDeJunta();
    },
  });

  function reporAjustesDeJunta(lista) {
    ajustesDeJunta.clear();
    for (const { junta, deslocamento } of lista ?? []) ajustesDeJunta.set(junta, [...deslocamento]);
    arrastoDeJunta = null;
    reconstruirComAjuste();
    refletirAjusteDeJunta();
  }

  function listaDeAjustes() {
    return [...ajustesDeJunta]
      .filter(([, d]) => d.some((c) => Math.abs(c) > 1e-9))
      .map(([junta, deslocamento]) => ({ junta, deslocamento }));
  }

  /** A malha que a pessoa está vendo: a do arquivo com as juntas arrastadas. */
  function neutroAjustado() {
    if (!neutroDoArquivo) return null;
    const ajustes = listaDeAjustes();
    if (!ajustes.length) return neutroDoArquivo;
    return aplicarAjusteDeJunta(neutroDoArquivo, ajustes, { juntas: juntasDaPeca });
  }

  function reconstruirComAjuste() {
    const deformado = neutroAjustado();
    if (!deformado) return;
    const rotulo = modeloAtual?.rotulo ?? nomePecaAtual;
    const { caixas, facesSemParte } = caixasPorParte(deformado);
    const adaptado = adaptarThree(deformado, { nome: rotulo, materiais: materiaisDaPeca });
    const selecionadasAntes = controlador ? [...controlador.selecionadas] : [];
    aplicarModelo({
      nome: modeloAtual?.nome ?? nomePecaAtual,
      rotulo,
      medida: { partes: caixas, facesSemParte, portas: portasPublicadas(deformado) },
      neutro: deformado,
      materiais: materiaisDaPeca,
      ...adaptado,
    }, { preservarCamera: true, deAjuste: true });
    if (selecionadasAntes.length && controlador) controlador.selecionarMuitas(selecionadasAntes);
    refletirAjusteDeJunta();
  }

  function refletirAjusteDeJunta() {
    const quantas = listaDeAjustes().length;
    const mudou = malhaMudouDesdeOArquivo(malhaParaSalvar());
    if (rodapeJuntas) {
      /* O rodapé é o único lugar com o botão de salvar, então ele aparece
         sempre que existe algo a salvar, e não só no modo de junta. */
      rodapeJuntas.hidden = !modoJuntas && !mudou;
      rodapeJuntas.classList.toggle('tem-pendencia', quantas > 0);
    }
    if (resumoJuntas) {
      resumoJuntas.textContent = quantas > 0
        ? `${quantas} ${quantas === 1 ? 'junta movida' : 'juntas movidas'}`
        : (mudou ? 'malha editada' : 'nenhuma junta movida');
    }
    /* Salvar depende da malha ter mudado, e não de ter junta puxada: editar
       vértice, aresta ou face é mudança tanto quanto arrastar um punho, e
       enquanto a contagem de juntas governava este botão a edição livre não
       tinha como sair da bancada. */
    if (btnSalvarAjusteDeJunta) btnSalvarAjusteDeJunta.disabled = !mudou;
    if (modoJuntas && juntasDaPeca && modeloAtual && !punhosDeJunta.arrastando) {
      modeloAtual.raiz.updateMatrixWorld(true);
      /* O punho tem de ficar onde o canto está AGORA, e não onde ele estava no
         arquivo: redesenhar na posição original fazia o punho voltar para trás
         assim que a pessoa soltava o ponteiro, e o segundo arrasto partia do
         lugar errado. O canto anda exatamente o que foi acumulado nele. */
      const movidas = juntasDaPeca.map((junta) => {
        const d = ajustesDeJunta.get(junta.nome);
        return d ? { ...junta, posicao: somar(junta.posicao, d) } : junta;
      });
      punhosDeJunta.mostrar(movidas, modeloAtual.raiz.matrixWorld);
    }
  }

  function definirModoJuntas(ligado) {
    modoJuntas = Boolean(ligado);
    btnJuntas?.setAttribute('aria-pressed', String(modoJuntas));
    btnJuntas?.classList.toggle('ativo', modoJuntas);
    if (!modoJuntas) {
      punhosDeJunta.esconder();
      if (rodapeJuntas) rodapeJuntas.hidden = true;
      return;
    }
    if (!neutroDoArquivo) {
      mostrarAviso('Sem peça aberta para ajustar.');
      modoJuntas = false;
      btnJuntas?.setAttribute('aria-pressed', 'false');
      btnJuntas?.classList.remove('ativo');
      return;
    }
    if (!juntasDaPeca) juntasDaPeca = detectarJuntas(neutroDoArquivo);
    registroDeEventos.registrar('informacao', 'Ajuste de junta ligado', `${juntasDaPeca.length} juntas`);
    refletirAjusteDeJunta();
  }

  /* O QUE VAI PARA O ARQUIVO é a malha que está na tela, e não só a que os
     punhos de junta deformaram. Enquanto esta função lia apenas
     `neutroAjustado`, uma sessão inteira de edição de vértice, aresta e face
     não chegava ao alvo: salvar exigia ter puxado uma junta, e quem editasse a
     malha livremente saía sem arquivo nenhum. `modeloAtual.neutro` é a malha
     viva — a camada de edição escreve nela, e a reconstrução por topologia a
     substitui — então é dela que o alvo sai. */
  function malhaParaSalvar() {
    return modeloAtual?.neutro ?? neutroAjustado();
  }

  function malhaMudouDesdeOArquivo(malha) {
    if (!neutroDoArquivo || !malha) return false;
    if (malha.F.size !== neutroDoArquivo.F.size || malha.V.size !== neutroDoArquivo.V.size) return true;
    for (const [id, ponto] of malha.V) {
      const original = neutroDoArquivo.V.get(id);
      if (!original) return true;
      for (let i = 0; i < 3; i += 1) if (Math.abs(ponto[i] - original[i]) > 1e-9) return true;
    }
    for (const id of malha.F.keys()) if (!neutroDoArquivo.F.has(id)) return true;
    return false;
  }

  function salvarAlvoDoAjuste() {
    const deformado = malhaParaSalvar();
    if (!deformado || !malhaMudouDesdeOArquivo(deformado)) {
      mostrarAviso('Nada para salvar: a malha está como veio do arquivo.');
      return;
    }
    const alvo = {
      ...capturarAlvo(deformado, { peca: nomePecaAtual, base: modeloAtual?.rotulo ?? nomePecaAtual }),
      /* O que a pessoa fez, ao lado de onde ela chegou. A rodada de absorção
         mede pelo alvo; os gestos existem para ela saber o que perguntar quando
         duas leituras couberem na mesma medida. */
      gestos: listaDeAjustes(),
      /* DE QUAL RECEITA A PEÇA VEIO, pelo nome que resolve um arquivo. O campo
         `peca` guarda o nome do modelo carregado, que pode ser o rótulo em
         prosa da peça, e com ele `descrever:gesto` e `absorver` não acham
         receita nenhuma para reexecutar. */
      receitaDeOrigem: pecaPedida ?? nomePecaAtual,
      /* A DESCRIÇÃO NASCE AQUI, e não em quem lê o arquivo depois, porque aqui
         as duas malhas ainda têm os mesmos vértices e ninguém precisa adivinhar
         qual virou qual. Fora daqui só sobram duas nuvens de pontos, e quando o
         movimento tem o tamanho do espaçamento entre pontos — o que acontece na
         bicicleta, com o anel de dezoito lados a dezessete milímetros de raio —
         nenhum emparelhamento por posição resolve a ambiguidade.
         Ela guarda palavras e números, e nenhum identificador de vértice. */
      descricaoDoGesto: neutroDoArquivo ? descreverGesto(neutroDoArquivo, deformado) : null,
    };
    const texto = JSON.stringify(alvo, null, 2);
    const url = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
    const ligacao = document.createElement('a');
    ligacao.href = url;
    ligacao.download = `ajuste-${nomePecaAtual}.json`;
    ligacao.click();
    URL.revokeObjectURL(url);
    registroDeEventos.registrar('informacao', 'Ajuste salvo',
      `${alvo.gestos.length} junta(s), ${alvo.descricaoDoGesto?.mexidas.length ?? 0} parte(s) mexida(s)`);
    mostrarAviso('Ajuste salvo. Leve o arquivo para a rodada de absorção.');
  }

  btnJuntas?.addEventListener('click', () => definirModoJuntas(!modoJuntas));
  btnSalvarAjusteDeJunta?.addEventListener('click', salvarAlvoDoAjuste);

  /* O punho tem tamanho constante na tela, então ele precisa reagir à câmera a
     cada quadro. O ambiente não publica gancho de quadro, e abrir um só para
     isto seria mudar o visor por causa de um controle. */
  (function acompanharCamera() {
    punhosDeJunta.atualizarEscala();
    edicaoDeMalha?.acompanharCamera?.();
    punhoDaImagem.acompanharCamera();
    requestAnimationFrame(acompanharCamera);
  }());

  const gerenciadorAnotacoes3D = criarGerenciadorAnotacoes3D({
    canvas,
    cena: ambiente.scene,
    cameraAtual: () => ambiente.camera,
    aoCriarAnotacao: (novaAnotacao) => {
      sincronizador?.enviarAnotacao(novaAnotacao);
      mostrarAviso('Ponto de revisão registrado para a IA.');
    },
  });

  function renderizarListaAnotacoes(anotacoes) {
    const listaEl = document.getElementById('listaAnotacoes');
    if (!listaEl) return;
    listaEl.replaceChildren();

    if (!Array.isArray(anotacoes) || anotacoes.length === 0) {
      const msg = document.createElement('p');
      msg.className = 'sem-parametros';
      msg.textContent = 'Nenhuma anotação registrada nesta sessão.';
      listaEl.appendChild(msg);
      return;
    }

    for (const an of anotacoes) {
      const item = document.createElement('div');
      item.className = 'item-anotacao';
      item.dataset.id = an.id;

      const temPonto3D = Array.isArray(an.posicao) && an.posicao.length === 3;
      const tipoTag = temPonto3D
        ? '<span class="tag-anotacao tag-3d">3D</span>'
        : '<span class="tag-anotacao tag-geral">Geral</span>';

      item.innerHTML = `
        <div class="item-anotacao-cabecalho">
          <div class="item-anotacao-info">
            ${tipoTag}
            <span>${an.autor || 'Operador'} · ${an.componente || 'Geral'}</span>
          </div>
          <div class="item-anotacao-acoes">
            <button type="button" class="btn-acao-anotacao btn-editar-anotacao" title="Editar anotação">Editar</button>
            <button type="button" class="btn-acao-anotacao excluir btn-excluir-anotacao" title="Excluir anotação">✕</button>
          </div>
        </div>
        <p class="item-anotacao-texto"></p>
        <div class="item-anotacao-editor" hidden>
          <textarea></textarea>
          <div class="item-anotacao-editor-botoes">
            <button type="button" class="botao texto btn-cancelar-edicao">Cancelar</button>
            <button type="button" class="botao primaria btn-salvar-edicao">Salvar</button>
          </div>
        </div>
      `;

      const textoEl = item.querySelector('.item-anotacao-texto');
      textoEl.textContent = an.texto;

      const editorEl = item.querySelector('.item-anotacao-editor');
      const textareaEl = editorEl.querySelector('textarea');
      const btnEditar = item.querySelector('.btn-editar-anotacao');
      const btnExcluir = item.querySelector('.btn-excluir-anotacao');
      const btnSalvar = item.querySelector('.btn-salvar-edicao');
      const btnCancelar = item.querySelector('.btn-cancelar-edicao');

      btnEditar.addEventListener('click', () => {
        textareaEl.value = an.texto;
        textoEl.hidden = true;
        editorEl.hidden = false;
        textareaEl.focus();
      });

      btnCancelar.addEventListener('click', () => {
        editorEl.hidden = true;
        textoEl.hidden = false;
      });

      btnSalvar.addEventListener('click', () => {
        const novoTexto = textareaEl.value.trim();
        if (novoTexto && novoTexto !== an.texto) {
          sincronizador?.editarAnotacao(an.id, novoTexto);
          mostrarAviso('Anotação atualizada.');
        } else {
          editorEl.hidden = true;
          textoEl.hidden = false;
        }
      });

      btnExcluir.addEventListener('click', () => {
        sincronizador?.excluirAnotacao(an.id);
        mostrarAviso('Anotação excluída.');
      });

      listaEl.appendChild(item);
    }
  }

  // Navegação de Abas do Painel Direito
  const abasBotoes = document.querySelectorAll('.aba-btn');
  const abasConteudos = {
    inspecao: document.getElementById('abaConteudoInspecao'),
    parametros: document.getElementById('abaConteudoParametros'),
    referencias: document.getElementById('abaConteudoReferencias'),
    anotacoes: document.getElementById('abaConteudoAnotacoes'),
  };

  abasBotoes.forEach((btn) => {
    btn.addEventListener('click', () => {
      const abaAlvo = btn.dataset.aba;
      abasBotoes.forEach((b) => {
        const ativa = b.dataset.aba === abaAlvo;
        b.classList.toggle('ativa', ativa);
        b.setAttribute('aria-selected', String(ativa));
      });
      Object.entries(abasConteudos).forEach(([nome, el]) => {
        if (!el) return;
        el.hidden = nome !== abaAlvo;
        el.classList.toggle('ativa', nome === abaAlvo);
      });
    });
  });

  document.getElementById('btnAdicionarAnotacaoGeral')?.addEventListener('click', () => {
    const texto = prompt('Digite sua anotação ou instrução geral para a IA:');
    if (texto && texto.trim()) {
      sincronizador?.enviarAnotacao({
        texto: texto.trim(),
        componente: 'Geral',
        posicao: null,
      });
      mostrarAviso('Anotação geral registrada para a IA.');
    }
  });

  document.getElementById('btnAdicionarAnotacao')?.addEventListener('click', () => {
    gerenciadorAnotacoes3D.ativarModoAdicionar(true);
    mostrarAviso('Clique na superfície 3D onde deseja adicionar a nota.');
  });

  canvas.addEventListener('click', (evento) => {
    if (gerenciadorAnotacoes3D.isModoAdicionar() && modeloAtual) {
      gerenciadorAnotacoes3D.tratarCliqueCanvas(evento, [modeloAtual.raiz]);
    }
  });

  function salvarEstadoNaUrl(estado) {
    if (inicializando || !nomePecaAtual) return;
    const saida = new URLSearchParams();
    if (idNaUrl) saida.set('peca', idNaUrl);
    const estadoDaVista = escreverEstadoNaUrl({
      ...estado,
      vista: vistaAtual,
      projecao: ambiente.projecao,
      cameraLivre: ambiente.cameraLivre(),
      inspecao: parInspecionado ? 'par' : null,
    });
    for (const [chave, valor] of new URLSearchParams(estadoDaVista)) saida.set(chave, valor);
    const query = saida.toString();
    if (query === ultimaQuery) return;
    ultimaQuery = query;
    history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}`);
  }

  function refletirEstado(estado) {
    if (!controlador) return;
    if (parInspecionado && (estado.modo !== 'isolar' || !mesmosNomes(estado.selecionadas, parInspecionado))) {
      limparMarcadoresDoPar();
    }
    const selecionadas = new Set(estado.selecionadas);
    for (const linha of lista.querySelectorAll('.parte-linha')) {
      const ativa = selecionadas.has(linha.dataset.parte);
      linha.classList.toggle('ativa', ativa);
      linha.setAttribute('aria-pressed', String(ativa));
      linha.querySelector('.check').textContent = ativa ? '✓' : '';
    }
    prepararMoverParte(estado.selecionadas);
    const temSelecao = estado.selecionadas.length > 0;
    resumo.textContent = temSelecao
      ? estado.selecionadas.length === 1
        ? formatarNome(estado.selecionadas[0])
        : `${estado.selecionadas.length} componentes: ${estado.selecionadas.map(formatarNome).join(', ')}`
      : 'Selecione componentes para inspecionar.';
    botoesModo.contexto.disabled = !temSelecao;
    botoesModo.isolar.disabled = !temSelecao;
    btnFocar.disabled = !temSelecao;
    btnWireframeSelecao.disabled = !temSelecao;
    opacidadeSelecao.disabled = !temSelecao;
    btnWireframeSelecao.classList.toggle('ativa', estado.wireframeSelecao);
    btnSelecionarConjunto.disabled = !temSelecao || !controlador.temDescendentesNaSelecao();
    for (const [nome, botao] of Object.entries(botoesModo)) {
      botao.classList.toggle('ativa', nome === estado.modo);
    }
    explosao.value = String(Math.round(estado.explosao * 100));
    valorExplosao.value = `${Math.round(estado.explosao * 100)}%`;
    opacidadeSelecao.value = String(Math.round(estado.opacidadeSelecao * 100));
    valorOpacidadeSelecao.value = `${Math.round(estado.opacidadeSelecao * 100)}%`;
    ambiente.definirExplosao(estado.explosao);
    salvarEstadoNaUrl(estado);
  }

  function atualizarReferenciaMetrica() {
    const referencia = ambiente.referenciaMetrica();
    const medidas = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1];
    const metros = medidas.reduce((melhor, candidata) => (
      Math.abs(candidata * referencia.pixelsPorMetro - 88)
        < Math.abs(melhor * referencia.pixelsPorMetro - 88) ? candidata : melhor
    ), medidas[0]);
    const pixels = Math.round(metros * referencia.pixelsPorMetro);
    eixosReferencia.textContent = referencia.eixos;
    barraReferencia.style.width = `${Math.min(128, Math.max(42, pixels))}px`;
    valorReferencia.textContent = `${referencia.aproximada ? '≈ ' : ''}${metros < 1 ? `${metros * 100} cm` : '1 m'} · ${Math.round(referencia.pixelsPorMetro)} px/m`;
    quadroReferencia = requestAnimationFrame(atualizarReferenciaMetrica);
  }

  /* O CONTATO ENTRE DUAS PARTES, e não a união delas. `focarSelecao` enquadra
     tudo o que está selecionado, o que responde "onde isto está" e não "este
     encaixe fecha". Numa pá, cabo mais empunhadura dá a caixa do cabo inteiro:
     o encaixe some num canto e o defeito passa. Foi assim que um cabo
     atravessando a empunhadura teve de ser diagnosticado pelos números da
     receita, porque nenhuma vista conseguia mostrá-lo.

     A caixa aqui é a INTERSEÇÃO das duas, folgada o suficiente para mostrar de
     onde cada uma vem. Se elas não se tocam, isso é a resposta — e sai como
     recusa, porque enquadrar a união em silêncio devolveria uma imagem bonita
     para uma pergunta que ninguém respondeu. */
  const FOLGA_DO_CONTATO = 1.5;

  function focarContato(nomes) {
    if (!controlador || !modeloAtual) return { valida: false, motivo: 'Sem modelo carregado.' };
    const partes = [...new Set(Array.isArray(nomes) ? nomes : controlador.selecionadas)];
    if (partes.length !== 2 || partes.some((nome) => !controlador.nomes.includes(nome))) {
      return { valida: false, motivo: 'O foco de contato exige exatamente duas partes existentes.' };
    }
    const caixas = partes.map((nome) => {
      const grupo = controlador.grupoDe(nome);
      const caixa = new THREE.Box3();
      if (grupo) caixa.expandByObject(grupo);
      return caixa;
    });
    if (caixas.some((caixa) => caixa.isEmpty())) {
      return { valida: false, motivo: 'Uma das partes não tem geometria visível neste modo.' };
    }
    /* SOBREPOSIÇÃO OU FOLGA, e as duas servem. Recusar quando as caixas não se
       cruzam foi a primeira versão, e estava errada pela própria pergunta do
       modo: um encaixe que NÃO fecha é exatamente o que se quer ver de perto.
       Sem sobreposição, a região a enquadrar é o vão entre as duas — a caixa
       que vai da face mais próxima de uma à face mais próxima da outra. */
    const cruzam = caixas[0].intersectsBox(caixas[1]);
    const contato = cruzam
      ? caixas[0].clone().intersect(caixas[1])
      : new THREE.Box3(
        new THREE.Vector3(...[0, 1, 2].map((e) => Math.min(caixas[0].max.getComponent(e), caixas[1].max.getComponent(e)))),
        new THREE.Vector3(...[0, 1, 2].map((e) => Math.max(caixas[0].min.getComponent(e), caixas[1].min.getComponent(e)))),
      );
    /* O vão pode sair invertido em eixos onde as caixas se cobrem; normalizar é
       o que transforma "min/max trocados" numa caixa de verdade. */
    for (const eixo of [0, 1, 2]) {
      if (contato.min.getComponent(eixo) > contato.max.getComponent(eixo)) {
        const a = contato.min.getComponent(eixo), b = contato.max.getComponent(eixo);
        contato.min.setComponent(eixo, b);
        contato.max.setComponent(eixo, a);
      }
    }
    const tamanho = contato.getSize(new THREE.Vector3());
    /* A FOLGA SAI DO MENOR LADO, e não do maior. Com o maior, duas chapas largas
       separadas por um vão fino ganhavam uma folga do tamanho da largura — e o
       "foco" enquadrava MAIS que a peça inteira, afastando em vez de aproximar.
       O menor lado é a espessura do encontro, que é a escala da pergunta. */
    const menorLado = Math.min(tamanho.x, tamanho.y, tamanho.z);
    const folga = Math.max(0.01, menorLado * FOLGA_DO_CONTATO);
    /* A folga nunca sai da união das duas partes: focar o contato jamais pode
       enquadrar MAIS do que enquadrar as duas inteiras. Sem este corte, um
       encontro largo com folga somada saía um pouco maior que o par, e o
       comando "aproximar" afastava — pouco, e ainda assim ao contrário. */
    const uniao = caixas[0].clone().union(caixas[1]);
    ambiente.enquadrarCaixa(contato.expandByScalar(folga).intersect(uniao),
      { instantaneo: true, reproduzivel: true });
    return {
      valida: true, tocam: cruzam, partes,
      contato: { centro: contato.getCenter(new THREE.Vector3()).toArray(), tamanho: tamanho.toArray() },
      caixas: partes.map((nome, i) => ({ nome, tamanho: caixas[i].getSize(new THREE.Vector3()).toArray() })),
    };
  }

  function focarSelecao() {
    if (!controlador || !modeloAtual) return;
    const grupos = controlador.gruposSelecionados();
    ambiente.enquadrar(alvosDeEnquadramento({
      raiz: modeloAtual.raiz,
      selecionados: grupos,
      modo: controlador.modo,
    }), { reproduzivel: true });
  }

  /* inspecionarPar — RESTAURADA. Ela existia até `bb2e79a` e se perdeu na
     reescrita da bancada do PR #58: os dois consumidores (`olhar-bancada` e
     `guarda-inspecao-par`) continuaram chamando `window.__mecanificaBancada
     .inspecionarPar`, que virou `undefined`, e o gate `guarda:par` passou a
     falhar em toda execução. Ninguém viu porque o CI parou de rodar na mesma
     semana.

     Ela escolhe, entre as sete vistas canônicas, aquela em que a MENOR das duas
     partes ocupa mais pixels realmente visíveis — a medida vem do depth buffer,
     não da caixa envolvente, senão uma parte escondida atrás da outra contaria
     como legível. */
  function inspecionarPar(nomes) {
    if (!controlador || !modeloAtual) {
      return { valida: false, motivo: 'Nenhuma peça carregada na bancada.' };
    }
    const pedidos = Array.isArray(nomes) ? nomes : controlador.selecionadas;
    const partes = [...new Set(pedidos)].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    if (partes.length !== 2 || partes.some((nome) => !controlador.nomes.includes(nome))) {
      return {
        valida: false,
        motivo: 'A inspeção de par exige exatamente duas partes semânticas existentes.',
      };
    }
    controlador.selecionarMuitas(partes);
    controlador.definirModo('isolar');
    const grupos = controlador.gruposSelecionados();
    const candidatas = ['frontal', 'traseira', 'direita', 'esquerda', 'superior', 'inferior', 'isometrica'];
    const medidas = candidatas.map((vista, ordem) => {
      ambiente.definirVista(vista, { instantaneo: true });
      ambiente.enquadrar(grupos, { instantaneo: true });
      const pixels = ambiente.medirPixelsVisiveisPorParte(grupos);
      return {
        vista,
        ordem,
        pixels,
        menor: Math.min(...pixels.map((item) => item.pixels)),
        total: pixels.reduce((soma, item) => soma + item.pixels, 0),
      };
    });
    medidas.sort((a, b) => b.menor - a.menor || b.total - a.total || a.ordem - b.ordem);
    const escolhida = medidas[0];
    ambiente.definirVista(escolhida.vista, { instantaneo: true });
    ambiente.enquadrar(grupos, { instantaneo: true, reproduzivel: true });
    marcarParInspecionado(partes);
    salvarEstadoNaUrl(controlador.estado());
    return {
      valida: true,
      partes,
      vistaEscolhida: escolhida.vista,
      pixels: escolhida.pixels,
      /* 64 pixels no buffer de prova evita chamar um ponto residual de leitura
         legível, sem exigir que a ferramenta altere a peça para passar. */
      legivel: escolhida.menor >= 64,
      candidatas: medidas.map(({ vista, pixels, menor, total }) => ({ vista, pixels, menor, total })),
    };
  }

  function enquadrarMontagem() {
    if (!modeloAtual) return;
    ambiente.enquadrar(alvosDeEnquadramento({ raiz: modeloAtual.raiz, alvo: 'montagem' }));
  }

  /* Onde a peça foi encaixada no estúdio, para a prévia não reencaixar.
     `posicionarNoEstudio` centraliza e redimensiona para caber num tamanho fixo,
     então qualquer mudança de parâmetro que altere a caixa da peça movia TODAS
     as partes: um arrasto de seta de 120 px chegou a deslocar as oito partes da
     bicicleta os mesmos 51,9 mm, juntas, e o movimento pedido pelo gesto ficava
     brigando com esse reencaixe. Enquanto a mesma peça está na tela, a colocação
     em vigor é reaproveitada; peça nova encaixa de novo. */
  let colocacaoNoEstudio = null;

  function colocarNoEstudio(convertido) {
    const peca = convertido.nome ?? 'sessao-ativa';
    if (colocacaoNoEstudio && colocacaoNoEstudio.peca === peca) {
      convertido.raiz.position.fromArray(colocacaoNoEstudio.posicao);
      convertido.raiz.scale.setScalar(colocacaoNoEstudio.escala);
      convertido.raiz.updateMatrixWorld(true);
      return;
    }
    posicionarNoEstudio(convertido.raiz);
    colocacaoNoEstudio = {
      peca,
      posicao: convertido.raiz.position.toArray(),
      escala: convertido.raiz.scale.x,
    };
  }

  function criarCamadaDeEdicao(modelo, partes, { desenharMalha = true } = {}) {
    return criarCamadaEdicaoDeMalha({
      canvas,
      cameraAtual: () => ambiente.camera,
      raiz: modelo.raiz,
      neutro: modelo.neutro,
      partes,
      desenharMalha,
      aoMudar(estadoEdicao) {
        if (estadoEdicao.ativo) {
          mostrarAviso(`Edição de malha: ${estadoEdicao.modo}. ${estadoEdicao.selecionados.length} selecionado(s).`);
        }
      },
      aoConfirmarMovimento({ depois }) {
        /* `depois` são as posições que o gesto produziu; as faces são as da
           malha viva, que o movimento não muda. */
        historicoParametros.registrar('__edicao_de_malha__', { V: depois, F: modelo.neutro.F });
        historicoParametros.separar();
        mostrarAviso('Movimento de malha confirmado. Ctrl+Z desfaz.');
        refletirAjusteDeJunta();
      },
    });
  }

  /* A CAMADA É RECRIADA A CADA ENTRADA NO MODO, com as partes que estão
     selecionadas naquele instante. Criada uma vez por peça, ela punha os 502
     vértices da bicicleta inteira na tela para quem queria mexer num tubo só, e
     um clique podia cair em vértice de outra peça. Recriar é barato e não
     atrapalha o desfazer, que guarda cópias de `V` e não depende da camada.

     Enquanto o modo está ligado, o botão esquerdo pertence à seleção, então a
     órbita do controlador de câmera passa para o botão do meio e o arrasto para
     o direito — a mesma divisão que o Blender usa. Sair devolve o padrão. */
  /* MOVER A PARTE INTEIRA. É o gesto que o autor pediu depois de testar: escolher
     uma parte na cena e deslocá-la como corpo, sem entrar na malha. Não é outra
     máquina — é a mesma camada de edição, restrita às partes escolhidas, com
     tudo selecionado e sem os vértices na frente. Por isso o ímã, o gizmo, o
     eixo travado, o valor digitado e o Ctrl+Z valem igual, e o que sai é o mesmo
     alvo medido.
     `G` sem estar no modo de edição é o que o Blender faz no modo objeto. */
  /* O GIZMO DE MOVER APARECE AO ESCOLHER A PEÇA, e não só depois do `G`. Era o
     que o autor esperava do clique: escolher a peça e ter o punho ali. O `G`
     continua valendo para quem prefere teclado, e arrastar a seta faz o mesmo. */
  function prepararMoverParte(selecionadas) {
    if (edicaoDeMalha?.estado?.().ativo && edicaoDeMalha.desenhaMalha) return;
    if (edicaoDeMalha?.movendo) return;
    if (!modeloAtual?.neutro || !selecionadas?.length) {
      if (edicaoDeMalha && !edicaoDeMalha.desenhaMalha) {
        edicaoDeMalha.destruir();
        edicaoDeMalha = null;
      }
      return;
    }
    edicaoDeMalha?.destruir();
    edicaoDeMalha = criarCamadaDeEdicao(modeloAtual, [...selecionadas], { desenharMalha: false });
    edicaoDeMalha.alternar();
    edicaoDeMalha.selecionarTudo();
  }

  function moverParteInteira() {
    const selecionadas = controlador ? [...controlador.selecionadas] : [];
    if (!modeloAtual?.neutro || selecionadas.length === 0) {
      mostrarAviso('Selecione uma parte antes de mover.');
      return false;
    }
    if (!edicaoDeMalha?.estado?.().ativo || edicaoDeMalha.desenhaMalha) {
      prepararMoverParte(selecionadas);
    }
    if (!edicaoDeMalha?.iniciarMovimento()) {
      return false;
    }
    mostrarAviso(`Movendo ${selecionadas.join(', ')}. X/Y/Z travam o eixo, Ctrl gruda, Esc cancela.`);
    return true;
  }

  /* TOPOLOGIA. Extrudar, duplicar, apagar e criar face mudam as FACES, e não só
     as posições — a malha desenhada precisa ser reconstruída, e a camada de
     edição só sabe mexer em posição. Por isso a operação roda aqui: pega a malha
     viva da camada, chama a conta no núcleo, reconstrói o modelo e recria a
     camada com a seleção que a operação produziu.
     Girar e escalar não mudam topologia, mas passam pelo mesmo caminho: é um
     estado novo da malha, e tratar os dois iguais evita dois desfazeres
     diferentes para gestos que a pessoa vê como um só. */
  const OPERACOES_DE_MALHA = { extrudar, duplicar, apagar, criarFace };

  function aplicarNaMalha(qual, argumentos = null) {
    if (!edicaoDeMalha?.estado?.().ativo || edicaoDeMalha.movendo) return false;
    const viva = edicaoDeMalha.malha();
    const estadoAtual = edicaoDeMalha.estado();
    const operacao = OPERACOES_DE_MALHA[qual] ?? ({ rotacionar, escalar }[qual]);
    if (!operacao) return false;

    const resultado = argumentos
      ? operacao(viva, estadoAtual, argumentos)
      : operacao(viva, estadoAtual);
    if (!resultado.mudou) {
      mostrarAviso(resultado.motivo ? `Não deu: ${resultado.motivo}.` : 'Nada para fazer com esta seleção.');
      return false;
    }

    const partes = edicaoDeMalha.partesEditadas;
    const selecao = resultado.selecionados ?? estadoAtual.selecionados;
    const modo = OPERACOES_DE_MALHA[qual] && qual !== 'apagar' ? 'face' : estadoAtual.modo;

    reconstruirMalhaEditada(resultado.neutro, {
      partes,
      desenharMalha: edicaoDeMalha.desenhaMalha,
      modo: qual === 'criarFace' ? 'face' : modo,
      selecionados: selecao,
    });
    historicoParametros.registrar('__edicao_de_malha__', fotografarMalha(edicaoDeMalha.malha()));
    historicoParametros.separar();
    refletirAjusteDeJunta();
    return true;
  }

  /* A malha mudou de faces, então o modelo inteiro é refeito. É o mesmo caminho
     do ajuste por junta, e o custo é uma execução de `adaptarThree` por
     operação — não por quadro. */
  function reconstruirMalhaEditada(novoNeutro, { partes, desenharMalha, modo, selecionados }) {
    const rotulo = modeloAtual?.rotulo ?? nomePecaAtual;
    const { caixas, facesSemParte } = caixasPorParte(novoNeutro);
    const adaptado = adaptarThree(novoNeutro, { nome: rotulo, materiais: materiaisDaPeca });
    edicaoDeMalha?.destruir();
    edicaoDeMalha = null;
    aplicarModelo({
      nome: modeloAtual?.nome ?? nomePecaAtual,
      rotulo,
      medida: { partes: caixas, facesSemParte, portas: portasPublicadas(novoNeutro) },
      neutro: novoNeutro,
      materiais: materiaisDaPeca,
      ...adaptado,
    }, { preservarCamera: true, deAjuste: true });

    edicaoDeMalha = criarCamadaDeEdicao(modeloAtual, partes, { desenharMalha });
    edicaoDeMalha.alternar();
    edicaoDeMalha.definirModo(modo);
    edicaoDeMalha.selecionar(selecionados);
  }

  function alternarEdicaoDeMalha() {
    if (!modeloAtual?.neutro) return;
    /* Sair do modo peça com Tab é entrar no de edição, e não desligar tudo: a
       camada do modo peça está ativa, mas não é o modo que o Tab governa. */
    if (edicaoDeMalha?.estado?.().ativo && !edicaoDeMalha.desenhaMalha) {
      edicaoDeMalha.destruir();
      edicaoDeMalha = null;
    }
    if (edicaoDeMalha?.estado?.().ativo) {
      edicaoDeMalha.alternar();
      ambiente.controls.mouseButtons = { ...BOTOES_DE_CAMERA_PADRAO };
      return;
    }
    const selecionadas = controlador ? [...controlador.selecionadas] : [];
    edicaoDeMalha?.destruir();
    edicaoDeMalha = criarCamadaDeEdicao(modeloAtual, selecionadas);
    edicaoDeMalha.alternar();
    ambiente.controls.mouseButtons = {
      LEFT: null,
      MIDDLE: THREE.MOUSE.ROTATE,
      RIGHT: THREE.MOUSE.PAN,
    };
    mostrarAviso(selecionadas.length
      ? `Editando ${selecionadas.join(', ')}. Botão do meio gira, direito arrasta.`
      : 'Editando a peça inteira. Selecione uma parte antes do Tab para limitar.');
  }

  function aplicarModelo(convertido, { preservarCamera = false, deAjuste = false } = {}) {
    if (modeloAtual) {
      modeloAtual.raiz.removeFromParent();
      limparMarcadoresDoPar();
      if (controlador) controlador.destruir();
      if (selecao3d) selecao3d.destruir();
      if (edicaoDeMalha) edicaoDeMalha.destruir();
    }

    modeloAtual = convertido;
    nomePecaAtual = convertido.nome ?? 'sessao-ativa';

    /* A base do ajuste é a peça COMO ELA VEIO DO ARQUIVO. Uma reconstrução
       causada pelo próprio arrasto não vira base nova: se virasse, cada
       movimento do ponteiro passaria a contar a partir do movimento anterior e
       o deslocamento acumulado dobraria a cada quadro. */
    if (!deAjuste) {
      /* CÓPIA, e não a mesma malha. Guardar a referência viva fazia desta base
         e da malha editada o mesmo objeto: a camada de edição escreve nos
         vértices, os dois lados mudavam juntos, e comparar um com o outro
         nunca acusava diferença nenhuma. Com isso o botão de salvar ficava
         desativado por mais que a pessoa editasse, e a descrição do gesto sairia
         comparando a malha consigo mesma. */
      neutroDoArquivo = convertido.neutro ? fotografarMalha(convertido.neutro) : null;
      materiaisDaPeca = convertido.materiais ?? {};
      juntasDaPeca = null;
      ajustesDeJunta.clear();
      arrastoDeJunta = null;
      if (modoJuntas) definirModoJuntas(Boolean(neutroDoArquivo));
    }
    document.getElementById('fixtureAtual').textContent = formatarNome(convertido.rotulo);
    estadoDaBancada.peca = formatarNome(convertido.rotulo);
    registroDeEventos.registrar('informacao', 'Peça carregada', formatarNome(convertido.rotulo));

    colocarNoEstudio(convertido);
    ambiente.scene.add(convertido.raiz);

    if (!preservarCamera) {
      ambiente.definirObjeto(convertido.raiz);
    }

    if (estadoCatalogoVazio) {
      estadoCatalogoVazio.hidden = true;
    }

    controlador = criarControladorPartes({
      raiz: convertido.raiz,
      partes: convertido.partes,
      hierarquia: convertido.raiz.userData?.hierarquia,
      aoMudar: refletirEstado,
      aoEstabilizarExplosao(_estado, { enquadrar = true } = {}) {
        if (enquadrar) ambiente.enquadrar(controlador.gruposVisiveis());
      },
    });

    edicaoDeMalha = convertido.neutro ? criarCamadaDeEdicao(convertido, null) : null;
    if (!deAjuste && edicaoDeMalha) origemDaMalha = fotografarMalha(edicaoDeMalha.malha());

    btnSelecionarConjunto.hidden = !controlador.temHierarquia();

    /* SELEÇÃO DA URL, reaplicada aqui. `lerEstadoDaUrl` roda uma vez na subida
       da página, quando o controlador ainda pode não existir — a peça da sessão
       ativa chega segundos depois pelo polling — e ali `nomesDisponiveis` é uma
       lista vazia, então toda seleção pedida na URL é descartada em silêncio.
       O sintoma: recarregar um link de inspeção devolvia a montagem inteira,
       sem seleção, sem isolamento e sem os contornos do par. É o que o gate
       `guarda:par` cobra e é a mesma raiz do argumento `--selecionadas` que o
       `olhar-bancada` precisava reaplicar pela ponte. */
    const daUrl = lerEstadoDaUrl(params, controlador.nomes);
    if (daUrl.selecionadas.length) {
      controlador.selecionarMuitas(daUrl.selecionadas);
      controlador.definirModo(daUrl.modo);
      if (daUrl.inspecao === 'par' && daUrl.selecionadas.length === 2) {
        marcarParInspecionado(daUrl.selecionadas);
      }
    }

    // Renderiza lista de partes
    lista.replaceChildren();
    for (const nome of controlador.nomes) {
      const grupo = convertido.partes.get(nome);
      const pai = grupo?.userData?.paiSemantico;
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'parte-linha';
      botao.dataset.parte = nome;
      botao.setAttribute('aria-pressed', 'false');
      botao.innerHTML = `
        <span class="check" aria-hidden="true"></span>
        <span class="nome">${formatarNome(nome)}${pai ? ` <small>de ${formatarNome(pai)}</small>` : ''}</span>
        <span class="faces">${grupo?.userData?.faces?.length ?? 0}F</span>
      `;
      botao.addEventListener('click', () => controlador.selecionar(nome, { aditiva: true }));
      lista.append(botao);
    }
    /* O contador redondo do cabeçalho dizia o mesmo número que "N componentes"
       logo abaixo. Some da bancada; o harness de captura ainda tem o elemento e
       continua sendo alimentado. */
    const contagem = document.getElementById('contagemPartes');
    if (contagem) contagem.textContent = String(controlador.nomes.length);
    if (filtroPartes) filtroPartes.value = '';
    aplicarFiltroPartes();

    // Diagnóstico semântico
    const semParte = convertido.medida?.facesSemParte?.length ?? 0;
    const diagnostico = document.getElementById('diagnostico');
    /* A integridade semântica não ocupa mais espaço fixo no alto da tela. Ela
       continua no bloco de diagnóstico da aba Inspeção, com detalhe, e vira
       aviso visível apenas quando há face sem parte. */
    estadoDaBancada.faceSemIdentidade = semParte;
    if (semParte) registroDeEventos.registrar('alerta', `${semParte} faces sem identidade`, formatarNome(convertido.rotulo));
    atualizarAvisoDeEstado();
    if (semParte) {
      diagnostico.classList.remove('ok');
      diagnostico.classList.add('alerta');
      diagnostico.querySelector('p').textContent =
        `${semParte} faces não pertencem a uma parte semântica.`;
    } else {
      diagnostico.classList.remove('alerta');
      diagnostico.classList.add('ok');
      diagnostico.querySelector('p').textContent =
        `${convertido.medida?.partes?.size ?? controlador.nomes.length} componentes: nenhuma superfície sem identidade.`;
    }

    // Portas publicadas
    const portas = convertido.medida?.portas ?? [];
    const blocoPortas = document.getElementById('portasPublicadas');
    if (blocoPortas) {
      blocoPortas.hidden = portas.length === 0;
      if (portas.length) {
        document.getElementById('resumoPortas').textContent =
          `${portas.length} ${portas.length === 1 ? 'publicada' : 'publicadas'}`;
        const listaPortas = document.getElementById('listaPortas');
        listaPortas.replaceChildren(...portas.map((porta) => {
          const item = document.createElement('li');
          const nome = document.createElement('b');
          nome.textContent = porta.rotulo;
          const origem = document.createElement('small');
          origem.textContent = `${porta.id} · ${porta.origem}`;
          item.append(nome, origem);
          return item;
        }));
      }
    }

    // Seleção 3D por raycast
    selecao3d = criarSelecaoBancada({
      canvas,
      cameraAtual: () => ambiente.camera,
      raiz: convertido.raiz,
      nomeDoObjeto: controlador.nomeDoObjeto,
      aoSelecionar(nome, opcoes) {
        if (nome) controlador.selecionar(nome, opcoes);
        else if (!opcoes.aditiva) controlador.limpar();
      },
      aoFocar(nome) {
        controlador.selecionar(nome);
        focarSelecao();
      },
    });

    refletirEstado(controlador.estado());
  }

  // Event listeners de navegação e atalhos
  for (const botao of document.querySelectorAll('[data-vista]')) {
    botao.addEventListener('click', () => ambiente.definirVista(botao.dataset.vista));
  }

  const btnProjecao = document.getElementById('btnProjecao');
  function refletirProjecao() {
    btnProjecao.querySelector('span').textContent =
      ambiente.projecao === 'ortografica' ? 'Ortográfica' : 'Perspectiva';
    btnProjecao.classList.toggle('ativa', ambiente.projecao === 'ortografica');
  }
  btnProjecao.addEventListener('click', () => {
    ambiente.definirProjecao(ambiente.projecao === 'ortografica' ? 'perspectiva' : 'ortografica');
    refletirProjecao();
    if (controlador) salvarEstadoNaUrl(controlador.estado());
  });

  document.getElementById('btnEnquadrar').addEventListener('click', enquadrarMontagem);
  document.getElementById('btnFocarSelecao').addEventListener('click', focarSelecao);
  btnSelecionarConjunto.addEventListener('click', () => controlador?.selecionarSubarvores());
  document.getElementById('btnLimpar').addEventListener('click', () => controlador?.limpar());
  for (const [modo, botao] of Object.entries(botoesModo)) {
    botao.addEventListener('click', () => controlador?.definirModo(modo));
  }
  explosao.addEventListener('input', () => controlador?.definirExplosao(Number(explosao.value) / 100));
  btnWireframeSelecao.addEventListener('click', () => controlador?.definirWireframeSelecao(!controlador.estado().wireframeSelecao));
  opacidadeSelecao.addEventListener('input', () => controlador?.definirOpacidadeSelecao(Number(opacidadeSelecao.value) / 100));

  document.getElementById('btnCopiarEstado').addEventListener('click', async () => {
    if (controlador) salvarEstadoNaUrl(controlador.estado());
    try {
      await navigator.clipboard.writeText(location.href);
      mostrarAviso('Vista copiada. Outra pessoa ou IA abrirá exatamente o mesmo estado.');
    } catch {
      mostrarAviso('A vista já está registrada na URL do navegador.');
    }
  });

  /* Comandos de teclado: nome, o que fazem e a tecla que vem de fábrica. A
     tabela é a fonte única — a lista do menu, a resolução da tecla e a
     persistência do remapeamento leem daqui, então comando novo aparece no
     menu sozinho. `Esc` fica fora porque cancela captura e seleção, e não pode
     ser remapeado para dentro de outra coisa. */
  const COMANDOS = [
    { id: 'vista-frontal', rotulo: 'Frente', grupo: 'Câmera', padrao: '1', executar: () => ambiente.definirVista('frontal') },
    { id: 'vista-traseira', rotulo: 'Trás', grupo: 'Câmera', padrao: 'Shift+1', executar: () => ambiente.definirVista('traseira') },
    { id: 'vista-direita', rotulo: 'Direita', grupo: 'Câmera', padrao: '3', executar: () => ambiente.definirVista('direita') },
    { id: 'vista-esquerda', rotulo: 'Esquerda', grupo: 'Câmera', padrao: 'Shift+3', executar: () => ambiente.definirVista('esquerda') },
    { id: 'vista-superior', rotulo: 'Cima', grupo: 'Câmera', padrao: '7', executar: () => ambiente.definirVista('superior') },
    { id: 'vista-inferior', rotulo: 'Baixo', grupo: 'Câmera', padrao: 'Shift+7', executar: () => ambiente.definirVista('inferior') },
    { id: 'vista-isometrica', rotulo: 'Isométrica', grupo: 'Câmera', padrao: '0', executar: () => ambiente.definirVista('isometrica') },
    { id: 'projecao', rotulo: 'Projeção', grupo: 'Vista', padrao: '5', executar: () => btnProjecao.click() },
    { id: 'enquadrar', rotulo: 'Enquadrar tudo', grupo: 'Vista', padrao: 'f', executar: () => enquadrarMontagem() },
    { id: 'alternar-grade', rotulo: 'Grade', grupo: 'Vista', padrao: 'h', executar: () => alternarPreferenciaCena('grade') },
    { id: 'isolar', rotulo: 'Isolar', grupo: 'Seleção', padrao: 'i', executar: () => controlador?.selecionadas.length && controlador.definirModo('isolar') },
    { id: 'contexto', rotulo: 'Contexto fantasma', grupo: 'Seleção', padrao: 'g', executar: () => controlador?.selecionadas.length && controlador.definirModo('contexto') },
    { id: 'wireframe-selecao', rotulo: 'Wireframe', grupo: 'Seleção', padrao: 'w', executar: () => controlador?.selecionadas.length && controlador.definirWireframeSelecao(!controlador.estado().wireframeSelecao) },
  ];
  const porComando = new Map(COMANDOS.map((c) => [c.id, c]));
  const registroAtalhos = criarRegistroAtalhos({
    padrao: Object.fromEntries(COMANDOS.map((c) => [c.id, c.padrao])),
  });

  /* Ctrl+Z fica FORA da tabela remapeável: é a combinação que todo editor usa
     para desfazer, e deixá-la disponível para remapeamento abriria a porta para
     alguém prender o desfazer numa tecla e ficar sem saída no meio de um
     ajuste. Ela também não passa por `comandoDaCombinacao`, que só entende
     tecla simples e Shift. */
  function atalhoDesfazer(evento) {
    const combinacao = (evento.ctrlKey || evento.metaKey) && !evento.shiftKey
      && typeof evento.key === 'string' && evento.key.toLowerCase() === 'z';
    if (!combinacao) return;
    if (registroAtalhos.deveIgnorar(evento.target)) return;
    evento.preventDefault();
    if (!desfazerDesenho()) {
      mostrarAviso('Nada para desfazer nesta sessão.');
    }
  }
  addEventListener('keydown', atalhoDesfazer);

  function atalhoVista(evento) {
    const campoEditavel = registroAtalhos.deveIgnorar(evento.target);
    if (evento.key.toLowerCase() === 'g' && !campoEditavel && !evento.ctrlKey && !evento.metaKey
      && !(edicaoDeMalha?.estado?.().ativo && edicaoDeMalha.desenhaMalha)
      && !edicaoDeMalha?.movendo && modeloAtual?.neutro) {
      evento.preventDefault();
      moverParteInteira();
      return;
    }
    if (evento.key === 'Tab' && !campoEditavel && modeloAtual?.neutro) {
      evento.preventDefault();
      alternarEdicaoDeMalha();
      return;
    }
    if (edicaoDeMalha?.estado().ativo && !campoEditavel
      && (edicaoDeMalha.desenhaMalha || edicaoDeMalha.movendo)) {
      /* O TECLADO DO MOVIMENTO VEM PRIMEIRO. Com os níveis antes dele, digitar o
         valor do deslocamento era interpretado como troca de nível: escrever
         "0.2" mandava o "2" para o modo aresta, a entrada ficava em "0." e o
         movimento saía zero. A pessoa digitava um número e a peça não andava. */
      if (edicaoDeMalha.movendo) {
        if (['x', 'y', 'z'].includes(evento.key.toLowerCase())) {
          evento.preventDefault();
          edicaoDeMalha.travarEixo(evento.key);
          return;
        }
        if (/^[0-9.-]$/.test(evento.key)) {
          evento.preventDefault();
          edicaoDeMalha.digitarValor(evento.key);
          return;
        }
        if (evento.key === 'Enter' || evento.key === 'Return' || evento.code === 'Enter') { evento.preventDefault(); edicaoDeMalha.confirmarMovimento(); return; }
      }
      if (evento.key === '1') { evento.preventDefault(); edicaoDeMalha.definirModo('vertice'); return; }
      if (evento.key === '2') { evento.preventDefault(); edicaoDeMalha.definirModo('aresta'); return; }
      if (evento.key === '3') { evento.preventDefault(); edicaoDeMalha.definirModo('face'); return; }
      if (evento.key.toLowerCase() === 'a' && evento.altKey) { evento.preventDefault(); edicaoDeMalha.limpar(); return; }
      if (evento.key.toLowerCase() === 'a') { evento.preventDefault(); edicaoDeMalha.selecionarTudo(); return; }
      if (evento.key.toLowerCase() === 'l') { evento.preventDefault(); edicaoDeMalha.selecionarIlha(); return; }
      /* AS TECLAS DO BLENDER. E extruda, Shift+D duplica, X apaga, F faz face,
         R gira e S escala. Extrudar e duplicar não movem: a cópia nasce no lugar
         e o G seguinte é que a leva, como lá. */
      if (evento.key.toLowerCase() === 'e') { evento.preventDefault(); aplicarNaMalha('extrudar'); return; }
      if (evento.key.toLowerCase() === 'd' && evento.shiftKey) { evento.preventDefault(); aplicarNaMalha('duplicar'); return; }
      if (evento.key.toLowerCase() === 'x') { evento.preventDefault(); aplicarNaMalha('apagar'); return; }
      if (evento.key.toLowerCase() === 'f') { evento.preventDefault(); aplicarNaMalha('criarFace'); return; }
      if (evento.key.toLowerCase() === 'r') {
        evento.preventDefault();
        /* Um quarto de volta por toque, no eixo vertical. Girar com o ponteiro
           pede outro gesto contínuo e o plano não pediu isso; o passo fixo já
           cobre o que a peça precisa e é conferível. */
        aplicarNaMalha('rotacionar', { eixo: 1, angulo: Math.PI / 2 });
        return;
      }
      if (evento.key.toLowerCase() === 's') {
        evento.preventDefault();
        aplicarNaMalha('escalar', { fator: evento.shiftKey ? 1 / 1.1 : 1.1 });
        return;
      }
      if (evento.key.toLowerCase() === 'g') {
        evento.preventDefault();
        if (edicaoDeMalha.iniciarMovimento()) mostrarAviso('Mover: aponte, use X/Y/Z ou digite um valor; clique confirma.');
        return;
      }
    }
    if (evento.key === 'Escape') {
      if (registroAtalhos.capturando) return;
      if (edicaoDeMalha?.cancelarMovimento()) {
        mostrarAviso('Movimento de malha cancelado.');
        return;
      }
      controlador?.limpar();
      return;
    }
    if (registroAtalhos.deveIgnorar(evento.target)) return;
    const comando = registroAtalhos.comandoDaCombinacao(normalizarCombinacao(evento));
    if (!comando) return;
    evento.preventDefault();
    porComando.get(comando)?.executar();
  }
  addEventListener('keydown', atalhoVista);

  /* ---------- barra de controles ---------- */

  /* A janela `Abrir` lista o acervo em trabalho, que é diferente do catálogo
     homologado: o catálogo diz o que foi validado e publicado, e o acervo diz o
     que existe para modelar agora. Escolher aqui troca a peça da cena sem
     recarregar a página e sem desligar a sessão ativa, que continua chegando
     pela IA e sobrescreve quando chegar. */
  const listaAcervo = document.getElementById('listaAcervo');

  /* A sobreposição vem da PASTA DA PEÇA, e não de uma cópia em `public/`. A
     receita declara quais imagens são dela, e a primeira declarada que for
     imagem serve de sobreposição. Antes disso a foto vinha do estado local da
     sessão, que não é versionado: quem abrisse a peça num navegador limpo não
     via referência nenhuma e não tinha como descobrir que ela existia. */
  async function oferecerSobreposicaoDaPeca(peca, receita) {
    if (gerenciadorReferencias3D.obterImagemReferencia()) return;
    const declaradas = receita?.PLANO?.referencias ?? [];
    /* A imagem chamada `sobreposicao` vem primeiro quando existe. Sem isso, a
       escolha caía na ordem da lista do plano, e mudar a ordem das referências
       — que é decisão de leitura, não de bancada — trocaria a imagem que
       aparece sobre o modelo. */
    const ordenadas = [...declaradas].sort(
      (a, b) => Number(/sobreposicao/i.test(b)) - Number(/sobreposicao/i.test(a)),
    );
    for (const referencia of ordenadas) {
      const url = urlDaReferencia(peca, referencia);
      if (!url) continue;
      await gerarPlanoReferencia({ fonte: 'url', id: `${peca}:${referencia}`, url, rotulo: referencia });
      return;
    }
  }

  async function abrirDoAcervo(entrada) {
    try {
      mostrarAviso(`Abrindo ${entrada.id}…`);
      const receita = await entrada.carregar();
      /* O mesmo caminho da sessão ativa, e não um segundo: assim a peça aberta
         à mão e a peça enviada pela IA chegam à cena pela mesma porta, com a
         mesma medição e o mesmo tratamento de erro. */
      idNaUrl = entrada.id;
      receitaAberta = receita;
      /* Peça nova, sessão nova: o piso do desfazer passa a ser o que veio do
         arquivo desta peça, e a pilha da anterior não pode sobreviver. */
      historicoParametros.limpar();
      origemDaMalha = null;
      escolhaManual = true;
      /* Abrir é peça nova mesmo quando é a mesma peça: quem abre espera vê-la
         enquadrada, e não na colocação herdada da sessão anterior. */
      colocacaoNoEstudio = null;
      entregaDaSessaoEmEspera = null;
      oferecerEntregaDaSessao('');
      sincronizador.definirPayload({ alvo: { nome: entrada.id }, receita });
      if (controlador) salvarEstadoNaUrl(controlador.estado());
      await oferecerSobreposicaoDaPeca(entrada.id, receita);
    } catch (erro) {
      mostrarErro(erro);
    }
  }

  function desenharAcervo() {
    if (!listaAcervo) return;
    const entradas = listarAcervo();
    if (!entradas.length) {
      const vazio = document.createElement('div');
      vazio.className = 'linha';
      vazio.textContent = 'O acervo não tem receita nenhuma.';
      listaAcervo.replaceChildren(vazio);
      return;
    }
    listaAcervo.replaceChildren(...entradas.map((entrada) => {
      const linha = document.createElement('button');
      linha.type = 'button';
      linha.className = 'linha';
      linha.dataset.receita = entrada.id;
      const nome = document.createElement('span');
      nome.textContent = entrada.id;
      const tipo = document.createElement('kbd');
      tipo.textContent = entrada.montagem ? 'montagem' : 'peça';
      linha.append(nome, tipo);
      linha.addEventListener('click', () => {
        fecharJanelas();
        abrirDoAcervo(entrada);
      });
      return linha;
    }));
  }

  desenharAcervo();
  const preferenciasBancada = criarPreferenciasBancada();
  const prefGrade = document.getElementById('prefGrade');
  const prefChao = document.getElementById('prefChao');
  const avisoAtalho = document.getElementById('avisoAtalho');
  const listaAtalhos = document.getElementById('listaAtalhos');

  function aplicarPreferenciasCena(parcial) {
    const proximo = preferenciasBancada.salvar(parcial);
    ambiente.definirPreferenciasCena(proximo);
    if (prefGrade) prefGrade.checked = proximo.grade;
    if (prefChao) prefChao.checked = proximo.chao;
    return proximo;
  }

  function alternarPreferenciaCena(qual) {
    const atual = preferenciasBancada.ler();
    aplicarPreferenciasCena({ [qual]: !atual[qual] });
  }

  aplicarPreferenciasCena({});
  prefGrade?.addEventListener('change', () => aplicarPreferenciasCena({ grade: prefGrade.checked }));
  prefChao?.addEventListener('change', () => aplicarPreferenciasCena({ chao: prefChao.checked }));

  let mensagemAtalho = null;
  function dizerSobreAtalho(texto) {
    if (avisoAtalho) avisoAtalho.textContent = texto ?? '';
    clearTimeout(mensagemAtalho);
    if (texto) mensagemAtalho = setTimeout(() => { if (avisoAtalho) avisoAtalho.textContent = ''; }, 4000);
  }

  /* A lista é agrupada por família porque treze linhas de peso igual não têm
     hierarquia: a pessoa lê todas para achar uma. Câmera, Vista e Seleção são
     os três assuntos, e dentro de cada um o nome é curto e paralelo — 'Grade' e
     'Projeção', não 'Mostrar ou esconder a grade' ao lado de 'Alternar
     projeção'. */
  function desenharAtalhos() {
    if (!listaAtalhos) return;
    const atual = registroAtalhos.obter();
    const grupos = [];
    for (const comando of COMANDOS) {
      const ultimo = grupos[grupos.length - 1];
      if (ultimo?.nome === comando.grupo) ultimo.itens.push(comando);
      else grupos.push({ nome: comando.grupo, itens: [comando] });
    }

    listaAtalhos.replaceChildren(...grupos.flatMap(({ nome, itens }) => {
      const titulo = document.createElement('h4');
      titulo.className = 'secao-modal';
      titulo.textContent = nome;
      const caixa = document.createElement('div');
      caixa.className = 'linhas';
      caixa.append(...itens.map((comando) => {
        const linha = document.createElement('button');
        linha.type = 'button';
        linha.className = 'linha';
        linha.dataset.comando = comando.id;
        const rotulo = document.createElement('span');
        rotulo.textContent = comando.rotulo;
        const tecla = document.createElement('kbd');
        tecla.textContent = atual[comando.id];
        linha.append(rotulo, tecla);
        linha.addEventListener('click', () => capturarTeclaPara(comando, linha, tecla));
        return linha;
      }));
      return [titulo, caixa];
    }));
  }

  /* Captura escuta UMA vez. Enquanto ela está aberta o registro manda ignorar
     todo atalho global, então a tecla escolhida não dispara o comando que
     estava nela enquanto a pessoa a escolhe. */
  function capturarTeclaPara(comando, linha, tecla) {
    if (registroAtalhos.capturando) return;
    registroAtalhos.iniciarCaptura();
    linha.classList.add('capturando');
    tecla.textContent = 'aperte uma tecla';
    dizerSobreAtalho(`Escolhendo tecla para ${comando.rotulo}. Esc cancela.`);

    const ouvir = (evento) => {
      evento.preventDefault();
      evento.stopPropagation();
      if (evento.key === 'Escape') return encerrar('Captura cancelada.');
      const combinacao = normalizarCombinacao(evento);
      if (!combinacao) return;
      const r = registroAtalhos.atribuir(comando.id, combinacao);
      if (r.ok) return encerrar(`${comando.rotulo}: ${combinacao}.`);
      if (r.motivo === 'ocupado') {
        const ocupante = porComando.get(r.comandoOcupante)?.rotulo ?? r.comandoOcupante;
        dizerSobreAtalho(`${combinacao} já é de "${ocupante}". Escolha outra tecla.`);
        return;
      }
      dizerSobreAtalho('Essa tecla não serve como atalho.');
    };

    function encerrar(mensagem) {
      removeEventListener('keydown', ouvir, true);
      registroAtalhos.cancelarCaptura();
      linha.classList.remove('capturando');
      desenharAtalhos();
      dizerSobreAtalho(mensagem);
    }

    addEventListener('keydown', ouvir, true);
  }

  desenharAtalhos();
  document.getElementById('btnRestaurarAtalhos')?.addEventListener('click', () => {
    registroAtalhos.restaurarPadroes();
    desenharAtalhos();
    dizerSobreAtalho('Atalhos de volta ao padrão.');
  });

  /* Cada botão da barra abre uma janela modal. Ela fecha pelo X, pelo fundo ou
     por Esc, e não por clique em qualquer lugar: quem está marcando duas caixas
     seguidas ou escolhendo tecla não pode perder a janela no meio do gesto. */
  const janelas = [
    ['btnMenuAbrir', 'menuAbrir'],
    ['btnMenuAtalhos', 'menuAtalhos'],
    ['btnMenuEstado', 'menuEstado'],
  ].map(([idBotao, idJanela]) => ({
    botao: document.getElementById(idBotao),
    janela: document.getElementById(idJanela),
  })).filter(({ botao, janela }) => botao && janela);

  function fecharJanelas() {
    for (const { botao, janela } of janelas) {
      janela.hidden = true;
      botao.setAttribute('aria-expanded', 'false');
    }
    document.body.classList.remove('modal-aberto');
  }

  /* O painel de Estado é desenhado na abertura, e não a cada evento: manter uma
     lista escondida em dia custa trabalho a cada quadro para ninguém ver. */
  function desenharEstado() {
    const resumo = document.getElementById('resumoEstado');
    const lista = document.getElementById('listaEventos');
    if (!resumo || !lista) return;
    const linhas = [
      /* `__VERSAO_DA_BANCADA__` é trocado por texto na construção. O `typeof`
         existe porque o harness e os testes carregam este módulo sem passar
         pelo Vite, e ali o identificador não existe. */
      ['Versão', typeof __VERSAO_DA_BANCADA__ === 'string' ? __VERSAO_DA_BANCADA__ : 'fora de construção'],
      ['Peça', estadoDaBancada.peca ?? 'nenhuma carregada'],
      ['Origem', estadoDaBancada.origem ?? (idNaUrl ? `acervo: ${idNaUrl}` : 'sessão ativa')],
      ['Sessão', ROTULOS_DE_SESSAO[estadoDaBancada.sessao] ?? estadoDaBancada.sessao],
      ['Semântica', estadoDaBancada.faceSemIdentidade
        ? `${estadoDaBancada.faceSemIdentidade} faces sem identidade`
        : 'nenhuma face sem identidade'],
    ];
    resumo.replaceChildren(...linhas.map(([nome, valor]) => {
      const linha = document.createElement('div');
      linha.className = 'linha';
      const rotulo = document.createElement('span');
      rotulo.textContent = nome;
      const conteudo = document.createElement('kbd');
      conteudo.textContent = valor;
      linha.append(rotulo, conteudo);
      return linha;
    }));

    const eventos = registroDeEventos.listarRecentesPrimeiro();
    if (eventos.length === 0) {
      const vazio = document.createElement('p');
      vazio.className = 'modal-descricao';
      vazio.textContent = 'Nada aconteceu desde que a página abriu.';
      lista.replaceChildren(vazio);
      return;
    }
    lista.replaceChildren(...eventos.map((evento) => {
      const item = document.createElement('div');
      item.className = `evento evento-${evento.gravidade}`;
      const hora = document.createElement('time');
      hora.dateTime = evento.quando;
      hora.textContent = new Date(evento.quando).toLocaleTimeString('pt-BR');
      const texto = document.createElement('span');
      texto.textContent = evento.detalhe ? `${evento.assunto} — ${evento.detalhe}` : evento.assunto;
      item.append(hora, texto);
      if (evento.repeticoes > 1) {
        const vezes = document.createElement('small');
        vezes.textContent = `${evento.repeticoes}×`;
        item.append(vezes);
      }
      return item;
    }));
  }

  document.getElementById('btnLimparEventos')?.addEventListener('click', () => {
    registroDeEventos.limpar();
    desenharEstado();
  });
  document.getElementById('avisoEstado')?.addEventListener('click', () => {
    document.getElementById('btnMenuEstado')?.click();
  });

  for (const { botao, janela } of janelas) {
    botao.addEventListener('click', () => {
      const abrir = janela.hidden;
      fecharJanelas();
      if (!abrir) return;
      if (janela.id === 'menuEstado') desenharEstado();
      janela.hidden = false;
      botao.setAttribute('aria-expanded', 'true');
      document.body.classList.add('modal-aberto');
      janela.querySelector('.btn-fechar-modal')?.focus();
    });
    for (const gatilho of janela.querySelectorAll('[data-fechar-modal]')) {
      gatilho.addEventListener('click', () => fecharJanelas());
    }
  }

  addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape' && !registroAtalhos.capturando) fecharJanelas();
  });

  /* Recolher esconde o corpo do painel e deixa a aba de borda. Nada do estado
     do painel é reinicializado: seleção, aba ativa e listas continuam onde
     estavam, e reabrir devolve a mesma tela. */
  for (const botao of document.querySelectorAll('[data-recolher]')) {
    const painel = document.querySelector(`.painel[data-painel="${botao.dataset.recolher}"]`);
    if (!painel) continue;
    const seta = botao.querySelector('[aria-hidden="true"]');
    const paraDentro = painel.classList.contains('painel-partes') ? '‹' : '›';
    const paraFora = painel.classList.contains('painel-partes') ? '›' : '‹';
    botao.addEventListener('click', () => {
      const recolhido = painel.classList.toggle('recolhido');
      botao.setAttribute('aria-expanded', String(!recolhido));
      if (seta) seta.textContent = recolhido ? paraFora : paraDentro;
      ambiente.redimensionar?.();
    });
  }

  // Inicializa o Sincronizador de Sessão Ativa
  const ROTULOS_DE_SESSAO = {
    desconectado: 'Sessão local',
    conectado: 'Sessão da IA conectada',
    sincronizando: 'Sincronizando…',
    erro: 'Erro de sincronia',
  };

  function atualizarStatusUI(status) {
    if (estadoDaBancada.sessao === status) return;
    estadoDaBancada.sessao = status;
    registroDeEventos.registrar(status === 'erro' ? 'erro' : 'informacao', ROTULOS_DE_SESSAO[status] ?? status);
    atualizarAvisoDeEstado();
  }

  /* O corpo da entrega saiu do retorno de chamada para poder ser executado
     também quando a pessoa aceita uma entrega que ficou em espera. */
  async function aplicarEntregaDaSessao(estado, novoModelo, fonte) {
      alvoReferenciaAtual = estado.alvo?.id ?? alvoReferenciaAtual;
      if (novoModelo) {
        /* Preservar a câmera existe para não arrancar o enquadramento de quem
           está editando ao vivo. Na PRIMEIRA entrega da sessão não há câmera a
           preservar: o enquadramento em vigor foi calculado com a cena vazia, e
           mantê-lo deixava a peça cortada e minúscula na revisão headless. */
        aplicarModelo(novoModelo, { preservarCamera: fonte !== 'manual' && modeloAtual !== null });
        const salva = alvoReferenciaAtual ? await armazenamentoImagem.ler(alvoReferenciaAtual) : null;
        if (salva) await gerarPlanoReferencia(salva);
      }
      /* Os painéis são OPCIONAIS: as fábricas devolvem null quando o container
         não existe, e no harness headless ele não existe mesmo. Sem o `?.` a
         primeira entrega de sessão estourava 'reading renderizar', o
         sincronizador caía e a seleção pedida por --selecionadas nunca chegava a
         ser aplicada — a captura saía com a montagem inteira e sem foco. */
      painelReferencias?.renderizar({
        referencias: estado.referencias,
      });
      gerenciadorReferencias3D.sincronizarComSessao(estado.referencias);
      gerenciadorAnotacoes3D.sincronizarAnotacoes(estado.anotacoes);
      renderizarListaAnotacoes(estado.anotacoes);
  }

  sincronizador = criarSincronizadorSessao({
    aoMudarStatus: atualizarStatusUI,
    async aoAtualizar(estado, novoModelo, { fonte }) {
      if (novoModelo && escolhaManual && fonte === 'arquivo') {
        const nome = formatarNome(novoModelo.rotulo);
        entregaDaSessaoEmEspera = { estado, novoModelo };
        registroDeEventos.registrar('alerta', 'Entrega da sessão em espera', nome);
        oferecerEntregaDaSessao(nome);
        return;
      }
      await aplicarEntregaDaSessao(estado, novoModelo, fonte);
    },
    aoErro(erro) {
      console.error('Erro na sessão ativa:', erro);
      mostrarAviso(`Erro na sincronização: ${erro.message}`);
    },
  });

  document.getElementById('avisoSessaoNova')?.addEventListener('click', async () => {
    if (!entregaDaSessaoEmEspera) return;
    const { estado, novoModelo } = entregaDaSessaoEmEspera;
    entregaDaSessaoEmEspera = null;
    escolhaManual = false;
    oferecerEntregaDaSessao('');
    registroDeEventos.registrar('informacao', 'Entrega da sessão aceita', formatarNome(novoModelo.rotulo));
    await aplicarEntregaDaSessao(estado, novoModelo, 'arquivo');
  });

  // Listener para botão de demonstração
  const btnDemo = document.getElementById('btnCarregarExemplo');
  btnDemo?.addEventListener('click', () => {
    sincronizador.definirPayload({
      alvo: { nome: DEMO_RECEITA.meta.nome },
      receita: DEMO_RECEITA,
      referencias: {
        pranchas: [
          {
            id: 'corte-plano-xy',
            rotulo: 'Envelope Teórico do Eixo',
            plano: 'XY',
            offset: 0,
            pontos: [[-1.2, -0.35], [1.2, -0.35], [1.2, 0.35], [-1.2, 0.35]],
            cor: '#39c6ff',
            grade: true,
          },
        ],
        criterios: [
          { id: 'crit-1', texto: 'Furo central Ø 0.56 com folga para rolamento', status: 'aprovado' },
          { id: 'crit-2', texto: 'Espessura da coroa ≥ 0.35 mm', status: 'aprovado' },
          { id: 'crit-3', texto: 'Ângulo cônico padrão 45°', status: 'pendente' },
        ],
      },
      parametros: {
        raio_10: 1.2,
        alt_10: 0.35,
        raio_20: 0.7,
        alt_20: 0.7,
      },
    });
  });

  /* `?peca=` procura primeiro no acervo em trabalho, que é de onde a janela
     `Abrir` tira a lista: sem isso o endereço copiado depois de abrir uma peça
     não devolveria a mesma peça ao recarregar. O catálogo homologado continua
     valendo como segunda tentativa. */
  const noAcervo = pecaPedida ? listarAcervo().find((entrada) => entrada.id === pecaPedida) : null;
  if (noAcervo) {
    await abrirDoAcervo(noAcervo);
  } else if (pecaPedida && catalogo.length > 0) {
    try {
      const inicialConvertido = await carregarPeca(pecaPedida, { catalogo });
      escolhaManual = true;
      aplicarModelo(inicialConvertido, { preservarCamera: false });
    } catch (erro) {
      mostrarErro(erro);
    }
  } else {
    // Sem peça estática: mostra a bancada pronta e inicia escuta da sessão
    document.getElementById('fixtureAtual').textContent = 'Aguardando modelo…';
    if (estadoCatalogoVazio) estadoCatalogoVazio.hidden = false;
    sincronizador.iniciarPolling();
  }

  // Restaura estado inicial de câmera da URL
  const inicial = lerEstadoDaUrl(params, controlador ? controlador.nomes : []);
  ambiente.definirProjecao(inicial.projecao);
  refletirProjecao();
  ambiente.definirVista(inicial.vista, { instantaneo: true });
  if (inicial.cameraLivre) ambiente.restaurarCameraLivre(inicial.cameraLivre);
  vistaAtual = ambiente.vista;

  inicializando = false;
  atualizarBotoesVista();
  atualizarReferenciaMetrica();

  // API unificada da Bancada para testes e automações
  window.__mecanificaBancada = {
    ready: true,
    peca: () => nomePecaAtual,
    pecasDisponiveis: nomesDisponiveis,
    /* Leitura headless (olhar-bancada / renderizar_vistas).
       São GETTERS, não valores fixos: a ponte é montada uma vez no fim da
       inicialização, mas o modelo troca depois — a peça da sessão ativa chega
       pelo polling do sincronizador, segundos após a página subir. Como
       valores congelados, `estatisticas` era sempre null e a revisão visual
       quebrava em TODA peça, de fixture a sessão. */
    get nomePeca() { return nomePecaAtual; },
    get carregado() { return modeloAtual !== null; },
    get partes() {
      if (!modeloAtual) return [];
      return [...modeloAtual.partes.keys()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    },
    get estatisticas() { return modeloAtual?.estatisticas ?? null; },
    /* A imagem de referência COMO ESTÁ NA CENA, e não a requisição que a
       trouxe. A guarda da pasta da peça afirmava só que o navegador pediu o
       arquivo e recebeu 200; com isso, a sobreposição podia falhar em virar
       plano na cena — textura recusada, alinhamento inválido, malha não
       adicionada — e a prova continuaria verde. É a mesma classe de defeito que
       o painel de portas já teve: verde pelo motivo errado. */
    get imagemReferencia() {
      const descritor = gerenciadorReferencias3D.obterImagemReferencia();
      if (!descritor) return null;
      const malha = ambiente.scene.getObjectByName('__imagem_referencia__');
      return {
        id: descritor.id,
        rotulo: descritor.rotulo,
        url: descritor.url ?? null,
        naCena: Boolean(malha),
        visivel: Boolean(malha?.visible),
        comTextura: Boolean(malha?.material?.map),
        largura: malha?.geometry?.parameters?.width ?? null,
        altura: malha?.geometry?.parameters?.height ?? null,
      };
    },
    get diagnosticos() {
      if (!modeloAtual) return null;
      return { facesSemParte: modeloAtual.medida?.facesSemParte ?? [] };
    },
    get selecaoIgnorada() {
      if (!controlador) return [];
      const pedidas = (params.get('selecionadas') ?? '').split(',').map((n) => n.trim()).filter(Boolean);
      const conhecidas = new Set(controlador.nomes);
      return pedidas.filter((nome) => !conhecidas.has(nome));
    },
    controlador: () => controlador,
    ambiente: () => ambiente,
    /* O estado da edição de malha, para a guarda de navegador poder afirmar o
       que a pessoa vê: modo corrente, quantos itens selecionados e se um
       movimento está em curso. Sem isto a guarda teria de adivinhar a seleção
       pela cor dos pontos desenhados. */
    edicaoDeMalha: () => edicaoDeMalha?.estado?.() ?? null,
    edicaoDeMalhaDesenhaMalha: () => Boolean(edicaoDeMalha?.desenhaMalha),
    sincronizador: () => sincronizador,
    selecionar: (nomes) => controlador?.selecionarMuitas(Array.isArray(nomes) ? nomes : [nomes]),
    modo: (modo) => controlador?.definirModo(modo),
    vista: (vista) => ambiente.definirVista(vista),
    projecao: (projecao) => ambiente.definirProjecao(projecao),
    explosao: (valor) => controlador?.definirExplosao(valor),
    focar: () => focarSelecao(),
    focarContato: (nomes) => focarContato(nomes),
    inspecionarPar: (nomes) => inspecionarPar(nomes),
    enquadrar: () => enquadrarMontagem(),
    /* Métrica de câmera consumida pela revisão headless: a bancada já sabe
       medir a silhueta projetada; faltava publicar isso na ponte. */
    enquadramento: () => ambiente.medirEnquadramento(),
    /* AUDITORIA — a imagem feita para ser lida, não para ser usada.
       Tira o cromo da interface, o piso, a grade e a sombra, e opcionalmente
       pinta uma cor por parte. Devolve a LEGENDA, porque imagem colorida sem
       legenda troca um problema de leitura por outro: quem audita precisa saber
       qual cor é qual peça sem deduzir pela posição. */
    auditoria: ({ cores = false, arame = false } = {}) => {
      document.body.classList.add('auditoria');
      ambiente.definirAuditoria(true);
      const legenda = controlador?.definirCoresPorParte(cores) ?? [];
      controlador?.definirArame?.(arame);
      ambiente.redimensionar?.();
      return { auditoria: true, cores: Boolean(cores), arame: Boolean(arame), legenda };
    },
    semAuditoria: () => {
      document.body.classList.remove('auditoria');
      ambiente.definirAuditoria(false);
      controlador?.definirCoresPorParte(false);
      controlador?.definirArame?.(false);
      ambiente.redimensionar?.();
      return { auditoria: false };
    },
    carregarPayloadSessao: (payload) => sincronizador.definirPayload(payload),
    estado: () => ({
      peca: nomePecaAtual,
      ...(controlador ? controlador.estado() : {}),
      vista: vistaAtual,
      projecao: ambiente.projecao,
      cameraLivre: ambiente.cameraLivre(),
      /* `inspecao` também sumiu no PR #58. Sem ela, recarregar um link de par
         devolvia um estado que PARECIA certo — seleção e modo corretos — sem
         dizer que aquilo é uma inspeção de par, que é o que o consumidor usa
         para saber se a marca na tela corresponde ao que a URL prometeu. */
      inspecao: parInspecionado ? 'par' : null,
    }),
    /* Também perdida no PR #58, e é o que o gate usa para provar que a
       inspeção deixou marca visível em vez de só devolver números. */
    marcadoresDePar: () => marcadoresDoPar.length,
    url: () => location.href,
  };

  addEventListener('pagehide', () => {
    removeEventListener('keydown', atalhoVista);
    removeEventListener('keydown', atalhoDesfazer);
    sincronizador.destruir();
    if (selecao3d) selecao3d.destruir();
    if (edicaoDeMalha) edicaoDeMalha.destruir();
    if (controlador) controlador.destruir();
    gerenciadorReferencias3D.destruir();
    gerenciadorAnotacoes3D.destruir();
    limparMarcadoresDoPar();
    ambiente.destruir();
    cancelAnimationFrame(quadroReferencia);
  }, { once: true });
}
