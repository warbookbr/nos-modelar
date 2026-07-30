/* main.js — composição da bancada: fixture procedural, estúdio, inspeção e estado reproduzível. */
import './styles.css';
import { carregarPeca, PECA_PADRAO, PECAS_DISPONIVEIS } from './carregar-peca.js';
import { criarAmbienteBancada, posicionarNoEstudio } from './criar-ambiente.js';
import { criarControladorPartes } from './controlar-partes.js';
import { criarSelecaoBancada } from './criar-selecao.js';
import {
  escreverEstadoNaUrl,
  lerEstadoDaUrl,
  VISTAS_BANCADA,
} from './estado-bancada.js';

function formatarNome(nome) {
  return nome
    .replace(/([a-zá-ú])([A-Z])/g, '$1 $2')
    .replaceAll('-', ' ')
    .replace(/^./, (letra) => letra.toUpperCase());
}

function mostrarErro(erro) {
  const elemento = document.getElementById('erro');
  elemento.hidden = false;
  elemento.textContent = String(erro?.stack || erro?.message || erro);
}

function mostrarAviso(texto) {
  const elemento = document.getElementById('aviso');
  elemento.textContent = texto;
  elemento.hidden = false;
  clearTimeout(mostrarAviso.timeout);
  mostrarAviso.timeout = setTimeout(() => { elemento.hidden = true; }, 2200);
}

async function iniciar() {
  const params = new URLSearchParams(location.search);
  const pecaPedida = params.get('peca');
  const nomePeca = pecaPedida ?? PECA_PADRAO;
  const convertido = await carregarPeca(nomePeca);
  document.getElementById('fixtureAtual').textContent = formatarNome(convertido.rotulo);

  const canvas = document.getElementById('cenaBancada');
  let vistaAtual = 'isometrica';
  let inicializando = true;
  let ultimaQuery = null;
  let controlador;

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
  });
  posicionarNoEstudio(convertido.raiz);
  ambiente.scene.add(convertido.raiz);
  ambiente.definirObjeto(convertido.raiz);

  const lista = document.getElementById('listaPartes');
  const resumo = document.getElementById('selecaoResumo');
  const botoesModo = {
    todas: document.getElementById('btnTodas'),
    contexto: document.getElementById('btnContexto'),
    isolar: document.getElementById('btnIsolar'),
  };
  const explosao = document.getElementById('explosao');
  const valorExplosao = document.getElementById('valorExplosao');
  const btnFocar = document.getElementById('btnFocarSelecao');

  function salvarEstadoNaUrl(estado) {
    if (inicializando) return;
    /* `peca` vem antes do estado de vista: é a fixture, não uma opção de câmera.
       Sem isto, a primeira mudança de estado apagaria a peça da URL. */
    const saida = new URLSearchParams();
    if (nomePeca !== PECA_PADRAO) saida.set('peca', nomePeca);
    const estadoDaVista = escreverEstadoNaUrl({
      ...estado,
      vista: VISTAS_BANCADA[vistaAtual] ? vistaAtual : 'isometrica',
      projecao: ambiente.projecao,
    });
    for (const [chave, valor] of new URLSearchParams(estadoDaVista)) saida.set(chave, valor);
    const query = saida.toString();
    if (query === ultimaQuery) return;
    ultimaQuery = query;
    history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}`);
  }

  function refletirEstado(estado) {
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
    for (const [nome, botao] of Object.entries(botoesModo)) {
      botao.classList.toggle('ativa', nome === estado.modo);
    }
    explosao.value = String(Math.round(estado.explosao * 100));
    valorExplosao.value = `${Math.round(estado.explosao * 100)}%`;
    salvarEstadoNaUrl(estado);
  }

  controlador = criarControladorPartes({
    raiz: convertido.raiz,
    partes: convertido.partes,
    aoMudar: refletirEstado,
  });

  for (const nome of controlador.nomes) {
    const grupo = convertido.partes.get(nome);
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'parte-linha';
    botao.dataset.parte = nome;
    botao.setAttribute('aria-pressed', 'false');
    botao.innerHTML = `
      <span class="check" aria-hidden="true"></span>
      <span class="nome">${formatarNome(nome)}</span>
      <span class="faces">${grupo.userData.faces.length}F</span>
    `;
    botao.addEventListener('click', () => controlador.selecionar(nome, { aditiva: true }));
    lista.append(botao);
  }
  document.getElementById('contagemPartes').textContent = String(controlador.nomes.length);

  /* o painel de diagnóstico conta partes e faces sem identidade pelo módulo
     neutro `descrever-partes.js` — a mesma medida que `npm run descrever`
     imprime. O total de faces continua vindo das estatísticas do adaptador
     porque lá ele já é `neutro.F.size`, e não uma segunda contagem. */
  const semParte = convertido.medida.facesSemParte.length;
  const estadoSemantica = document.getElementById('estadoSemantica');
  const diagnostico = document.getElementById('diagnostico');
  if (semParte) {
    estadoSemantica.classList.add('erro-semantic');
    estadoSemantica.querySelector('span').textContent = `${semParte} faces sem identidade`;
    diagnostico.classList.add('alerta');
    diagnostico.querySelector('p').textContent =
      `${semParte} faces não pertencem a uma parte semântica. A bancada mantém o objeto visível, mas a fixture não está pronta para publicação.`;
  } else {
    estadoSemantica.classList.add('ok');
    estadoSemantica.querySelector('span').textContent = 'Semântica íntegra';
    diagnostico.classList.add('ok');
    diagnostico.querySelector('p').textContent =
      `${convertido.medida.partes.size} componentes e ${convertido.estatisticas.facesNeutras} faces: nenhuma superfície sem identidade.`;
  }

  function focarSelecao() {
    const grupos = controlador.gruposSelecionados();
    ambiente.enquadrar(grupos.length ? grupos : [convertido.raiz]);
  }

  const selecao3d = criarSelecaoBancada({
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
    salvarEstadoNaUrl(controlador.estado());
  });

  document.getElementById('btnEnquadrar').addEventListener('click', focarSelecao);
  document.getElementById('btnFocarSelecao').addEventListener('click', focarSelecao);
  document.getElementById('btnLimpar').addEventListener('click', () => controlador.limpar());
  for (const [modo, botao] of Object.entries(botoesModo)) {
    botao.addEventListener('click', () => controlador.definirModo(modo));
  }
  explosao.addEventListener('input', () => controlador.definirExplosao(Number(explosao.value) / 100));

  document.getElementById('btnCopiarEstado').addEventListener('click', async () => {
    salvarEstadoNaUrl(controlador.estado());
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
      focarSelecao();
    } else if (evento.code === 'KeyI' && controlador.selecionadas.length) {
      evento.preventDefault();
      controlador.definirModo('isolar');
    } else if (evento.code === 'KeyG' && controlador.selecionadas.length) {
      evento.preventDefault();
      controlador.definirModo('contexto');
    } else if (evento.key === 'Escape') {
      controlador.limpar();
    }
  }
  addEventListener('keydown', atalhoVista);

  const inicial = lerEstadoDaUrl(params, controlador.nomes);
  const selecaoIgnorada = (params.get('selecionadas') ?? '')
    .split(',')
    .filter((nome) => nome && !inicial.selecionadas.includes(nome));
  controlador.selecionarMuitas(inicial.selecionadas);
  controlador.definirModo(inicial.modo);
  controlador.definirExplosao(inicial.explosao);
  ambiente.definirProjecao(inicial.projecao);
  refletirProjecao();
  ambiente.definirVista(inicial.vista, { instantaneo: true });
  vistaAtual = inicial.vista;
  inicializando = false;
  refletirEstado(controlador.estado());
  atualizarBotoesVista();

  if (selecaoIgnorada.length) {
    mostrarAviso(
      `Ignorei ${selecaoIgnorada.length} nome(s) que não existem nesta peça: ${selecaoIgnorada.join(', ')}.`,
    );
  }

  window.__mecanificaBancada = {
    ready: true,
    peca: nomePeca,
    pecasDisponiveis: PECAS_DISPONIVEIS,
    selecaoIgnorada,
    diagnosticos: convertido.diagnosticos,
    estatisticas: convertido.estatisticas,
    partes: controlador.nomes,
    selecionar: (nomes) => controlador.selecionarMuitas(Array.isArray(nomes) ? nomes : [nomes]),
    modo: (modo) => controlador.definirModo(modo),
    vista: (vista) => ambiente.definirVista(vista),
    projecao: (projecao) => ambiente.definirProjecao(projecao),
    explosao: (valor) => controlador.definirExplosao(valor),
    focar: () => focarSelecao(),
    estado: () => ({
      peca: nomePeca,
      ...controlador.estado(),
      vista: vistaAtual,
      projecao: ambiente.projecao,
    }),
    url: () => location.href,
  };

  addEventListener('pagehide', () => {
    removeEventListener('keydown', atalhoVista);
    selecao3d.destruir();
    controlador.destruir();
    ambiente.destruir();
  }, { once: true });
}

iniciar().catch((erro) => {
  window.__mecanificaBancada = { ready: false, erro: String(erro?.message || erro) };
  mostrarErro(erro);
  console.error(erro);
});
