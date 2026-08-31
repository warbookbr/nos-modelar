/* main.js — bancada interativa de co-modelagem (Humano + IA): 3D, referências, parâmetros e feedback. */
import './styles.css';
import * as THREE from 'three';
import { carregarPeca } from './carregar-peca.js';
import { CATALOGO_HOMOLOGADO, idsDoCatalogo } from './catalogo-pecas.js';
import { criarAmbienteBancada, posicionarNoEstudio } from './criar-ambiente.js';
import { criarControladorPartes } from './controlar-partes.js';
import { criarSelecaoBancada } from './criar-selecao.js';
import { criarSincronizadorSessao } from './sessao/sincronizador.js';
import { criarGerenciadorReferencias3D } from './referencias/prancha-overlay.js';
import { criarPainelReferencias } from './referencias/painel-referencias.js';
import { criarPainelParametros } from './parametros/painel-parametros.js';
import { criarGerenciadorAnotacoes3D } from './anotacoes/pinos-anotacoes.js';
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
  let parInspecionado = null;
  let modeloAtual = null;
  let nomePecaAtual = pecaPedida ?? 'sessao-ativa';
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
  const painelReferencias = criarPainelReferencias({
    container: document.getElementById('containerReferencias'),
    aoAlternarPrancha: (id, visivel) => gerenciadorReferencias3D.alternarVisibilidade(id, visivel),
  });

  let sincronizador = null;

  const painelParametros = criarPainelParametros({
    container: document.getElementById('containerParametros'),
    aoMudarParametro: (chave, valor) => sincronizador?.atualizarParametro(chave, valor),
  });

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
    if (pecaPedida) saida.set('peca', nomePecaAtual);
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
    const temSelecao = estado.selecionadas.length > 0;
    resumo.textContent = temSelecao
      ? estado.selecionadas.length === 1
        ? formatarNome(estado.selecionadas[0])
        : `${estado.selecionadas.length} componentes: ${estado.selecionadas.map(formatarNome).join(', ')}`
      : 'Selecione componentes para inspecionar.';
    botoesModo.contexto.disabled = !temSelecao;
    botoesModo.isolar.disabled = !temSelecao;
    btnFocar.disabled = !temSelecao;
    btnSelecionarConjunto.disabled = !temSelecao || !controlador.temDescendentesNaSelecao();
    for (const [nome, botao] of Object.entries(botoesModo)) {
      botao.classList.toggle('ativa', nome === estado.modo);
    }
    explosao.value = String(Math.round(estado.explosao * 100));
    valorExplosao.value = `${Math.round(estado.explosao * 100)}%`;
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

  function focarSelecao() {
    if (!controlador || !modeloAtual) return;
    const grupos = controlador.gruposSelecionados();
    ambiente.enquadrar(alvosDeEnquadramento({
      raiz: modeloAtual.raiz,
      selecionados: grupos,
      modo: controlador.modo,
    }), { reproduzivel: true });
  }

  function enquadrarMontagem() {
    if (!modeloAtual) return;
    ambiente.enquadrar(alvosDeEnquadramento({ raiz: modeloAtual.raiz, alvo: 'montagem' }));
  }

  function aplicarModelo(convertido, { preservarCamera = false } = {}) {
    if (modeloAtual) {
      modeloAtual.raiz.removeFromParent();
      limparMarcadoresDoPar();
      if (controlador) controlador.destruir();
      if (selecao3d) selecao3d.destruir();
    }

    modeloAtual = convertido;
    nomePecaAtual = convertido.nome ?? 'sessao-ativa';
    document.getElementById('fixtureAtual').textContent = formatarNome(convertido.rotulo);

    posicionarNoEstudio(convertido.raiz);
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

    btnSelecionarConjunto.hidden = !controlador.temHierarquia();

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
    document.getElementById('contagemPartes').textContent = String(controlador.nomes.length);
    if (filtroPartes) filtroPartes.value = '';
    aplicarFiltroPartes();

    // Diagnóstico semântico
    const semParte = convertido.medida?.facesSemParte?.length ?? 0;
    const estadoSemantica = document.getElementById('estadoSemantica');
    const diagnostico = document.getElementById('diagnostico');
    if (semParte) {
      estadoSemantica.classList.remove('ok');
      estadoSemantica.classList.add('erro-semantic');
      estadoSemantica.querySelector('span').textContent = `${semParte} faces sem identidade`;
      diagnostico.classList.remove('ok');
      diagnostico.classList.add('alerta');
      diagnostico.querySelector('p').textContent =
        `${semParte} faces não pertencem a uma parte semântica.`;
    } else {
      estadoSemantica.classList.remove('erro-semantic');
      estadoSemantica.classList.add('ok');
      estadoSemantica.querySelector('span').textContent = 'Semântica íntegra';
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

  document.getElementById('btnCopiarEstado').addEventListener('click', async () => {
    if (controlador) salvarEstadoNaUrl(controlador.estado());
    try {
      await navigator.clipboard.writeText(location.href);
      mostrarAviso('Vista copiada. Outra pessoa ou IA abrirá exatamente o mesmo estado.');
    } catch {
      mostrarAviso('A vista já está registrada na URL do navegador.');
    }
  });

  function atalhoVista(evento) {
    if (evento.target instanceof HTMLInputElement) return;
    const codigo = evento.code.replace('Numpad', 'Digit');
    let vista = null;
    if (codigo === 'Digit0') vista = 'isometrica';
    if (codigo === 'Digit1') vista = evento.shiftKey ? 'traseira' : 'frontal';
    if (codigo === 'Digit3') vista = evento.shiftKey ? 'esquerda' : 'direita';
    if (codigo === 'Digit7') vista = evento.shiftKey ? 'inferior' : 'superior';
    if (vista) {
      evento.preventDefault();
      ambiente.definirVista(vista);
    } else if (codigo === 'Digit5') {
      evento.preventDefault();
      btnProjecao.click();
    } else if (evento.code === 'KeyF') {
      evento.preventDefault();
      enquadrarMontagem();
    } else if (evento.code === 'KeyI' && controlador?.selecionadas.length) {
      evento.preventDefault();
      controlador.definirModo('isolar');
    } else if (evento.code === 'KeyG' && controlador?.selecionadas.length) {
      evento.preventDefault();
      controlador.definirModo('contexto');
    } else if (evento.key === 'Escape') {
      controlador?.limpar();
    }
  }
  addEventListener('keydown', atalhoVista);

  // Inicializa o Sincronizador de Sessão Ativa
  const statusEl = document.getElementById('statusSessao');
  const textoStatusEl = document.getElementById('textoStatusSessao');
  const pontoStatusEl = statusEl?.querySelector('.ponto-status');

  function atualizarStatusUI(status) {
    if (!pontoStatusEl || !textoStatusEl) return;
    pontoStatusEl.className = `ponto-status ${status}`;
    const rotulos = {
      desconectado: 'Sessão Local',
      conectado: 'IA Conectada',
      sincronizando: 'Sincronizando…',
      erro: 'Erro de Sincronia',
    };
    textoStatusEl.textContent = rotulos[status] ?? status;
  }

  sincronizador = criarSincronizadorSessao({
    aoMudarStatus: atualizarStatusUI,
    aoAtualizar(estado, novoModelo, { fonte }) {
      if (novoModelo) {
        /* Preservar a câmera existe para não arrancar o enquadramento de quem
           está editando ao vivo. Na PRIMEIRA entrega da sessão não há câmera a
           preservar: o enquadramento em vigor foi calculado com a cena vazia, e
           mantê-lo deixava a peça cortada e minúscula na revisão headless. */
        aplicarModelo(novoModelo, { preservarCamera: fonte !== 'manual' && modeloAtual !== null });
      }
      painelReferencias.renderizar({
        intencaoIA: estado.intencaoIA,
        referencias: estado.referencias,
      });
      gerenciadorReferencias3D.sincronizarComSessao(estado.referencias);
      painelParametros.renderizar({
        receita: novoModelo?.receita ?? estado.receita,
        parametros: estado.parametros,
      });
      gerenciadorAnotacoes3D.sincronizarAnotacoes(estado.anotacoes);
      renderizarListaAnotacoes(estado.anotacoes);
    },
    aoErro(erro) {
      console.error('Erro na sessão ativa:', erro);
      mostrarAviso(`Erro na sincronização: ${erro.message}`);
    },
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
      intencaoIA: {
        titulo: 'Engrenagem Cônica de Demonstração',
        resumo: 'Modelagem paramétrica baseada no padrão de acionamento mecânico.',
        checklist: [
          { id: 'c1', descricao: 'Gerar cilindro base da coroa', concluido: true },
          { id: 'c2', descricao: 'Extrudar cubo central de engate', concluido: true },
          { id: 'c3', descricao: 'Executar furo passante do eixo', concluido: true },
          { id: 'c4', descricao: 'Publicar interface de acoplamento', concluido: true },
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

  // Se uma peça estática foi pedida na URL, carrega-a
  if (pecaPedida && catalogo.length > 0) {
    try {
      const inicialConvertido = await carregarPeca(pecaPedida, { catalogo });
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
    sincronizador: () => sincronizador,
    selecionar: (nomes) => controlador?.selecionarMuitas(Array.isArray(nomes) ? nomes : [nomes]),
    modo: (modo) => controlador?.definirModo(modo),
    vista: (vista) => ambiente.definirVista(vista),
    projecao: (projecao) => ambiente.definirProjecao(projecao),
    explosao: (valor) => controlador?.definirExplosao(valor),
    focar: () => focarSelecao(),
    enquadrar: () => enquadrarMontagem(),
    /* Métrica de câmera consumida pela revisão headless: a bancada já sabe
       medir a silhueta projetada; faltava publicar isso na ponte. */
    enquadramento: () => ambiente.medirEnquadramento(),
    carregarPayloadSessao: (payload) => sincronizador.definirPayload(payload),
    estado: () => ({
      peca: nomePecaAtual,
      ...(controlador ? controlador.estado() : {}),
      vista: vistaAtual,
      projecao: ambiente.projecao,
      cameraLivre: ambiente.cameraLivre(),
    }),
    url: () => location.href,
  };

  addEventListener('pagehide', () => {
    removeEventListener('keydown', atalhoVista);
    sincronizador.destruir();
    if (selecao3d) selecao3d.destruir();
    if (controlador) controlador.destruir();
    gerenciadorReferencias3D.destruir();
    gerenciadorAnotacoes3D.destruir();
    limparMarcadoresDoPar();
    ambiente.destruir();
    cancelAnimationFrame(quadroReferencia);
  }, { once: true });
}
