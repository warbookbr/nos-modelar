/* main.js — composição da bancada: fixture procedural, estúdio, inspeção e estado reproduzível. */
import './styles.css';
import * as THREE from 'three';
import { carregarPeca } from './carregar-peca.js';
import { CATALOGO_HOMOLOGADO, idsDoCatalogo } from './catalogo-pecas.js';
import { criarAmbienteBancada, posicionarNoEstudio } from './criar-ambiente.js';
import { criarControladorPartes } from './controlar-partes.js';
import { criarSelecaoBancada } from './criar-selecao.js';
import {
  alvosDeEnquadramento,
  escreverEstadoNaUrl,
  lerEstadoDaUrl,
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

export async function iniciar({ catalogo = CATALOGO_HOMOLOGADO } = {}) {
  const params = new URLSearchParams(location.search);
  const pecaPedida = params.get('peca');
  const nomesDisponiveis = idsDoCatalogo(catalogo);
  if (catalogo.length === 0) {
    if (pecaPedida) throw new Error(`bancada: peça '${pecaPedida}' não está publicada; o catálogo está vazio.`);
    document.getElementById('fixtureAtual').textContent = 'Nenhuma peça homologada';
    document.getElementById('estadoSemantica').classList.add('ok');
    document.getElementById('estadoSemantica').querySelector('span').textContent = 'Catálogo vazio';
    document.getElementById('estadoCatalogoVazio').hidden = false;
    window.__mecanificaBancada = {
      ready: true,
      catalogoVazio: true,
      peca: null,
      pecasDisponiveis: [],
      estado: () => ({ peca: null, catalogo: 'vazio', selecionadas: [], modo: 'todas' }),
      url: () => location.href,
    };
    return;
  }
  if (!pecaPedida) throw new Error(`bancada: informe ?peca=ID; não existe peça padrão. Disponíveis: ${nomesDisponiveis.join(', ')}`);
  const nomePeca = pecaPedida;
  const convertido = await carregarPeca(nomePeca, { catalogo });
  document.getElementById('fixtureAtual').textContent = formatarNome(convertido.rotulo);

  const canvas = document.getElementById('cenaBancada');
  let vistaAtual = 'isometrica';
  let inicializando = true;
  let ultimaQuery = null;
  let controlador;
  let parInspecionado = null;
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

  /* Contornos são uma camada de leitura, não material, transformação ou nova
     geometria da peça. No par, duas superfícies parecidas podem ser visíveis e
     ainda assim parecer uma forma só; as cores distintas tornam o limite entre
     elas observável sem sacrificar o acabamento no isolamento comum. */
  function marcarParInspecionado(nomes) {
    limparMarcadoresDoPar();
    const partes = [...new Set(nomes)].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const cores = ['#ffb000', '#39c6ff'];
    partes.forEach((nome, indice) => {
      const grupo = convertido.partes.get(nome);
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
  const btnSelecionarConjunto = document.getElementById('btnSelecionarConjunto');
  const eixosReferencia = document.getElementById('eixosReferencia');
  const barraReferencia = document.getElementById('barraReferencia');
  const valorReferencia = document.getElementById('valorReferencia');
  let quadroReferencia = 0;

  function salvarEstadoNaUrl(estado) {
    if (inicializando) return;
    /* `peca` vem antes do estado de vista: é a fixture, não uma opção de câmera.
       Sem isto, a primeira mudança de estado apagaria a peça da URL. */
    const saida = new URLSearchParams();
    saida.set('peca', nomePeca);
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

  controlador = criarControladorPartes({
    raiz: convertido.raiz,
    partes: convertido.partes,
    hierarquia: convertido.raiz.userData.hierarquia,
    aoMudar: refletirEstado,
    aoEstabilizarExplosao(_estado, { enquadrar = true } = {}) {
      /* A câmera da montagem fechada corta a explosão. Esperar a animação
         terminar evita que ela persiga cada quadro e enquadra a caixa real. */
      if (enquadrar) ambiente.enquadrar(controlador.gruposVisiveis());
    },
  });
  /* Peça plana não ganha uma ação permanentemente desabilitada: a hierarquia
     é ajuda contextual, não mais um controle para a IA ignorar. */
  btnSelecionarConjunto.hidden = !controlador.temHierarquia();

  for (const nome of controlador.nomes) {
    const grupo = convertido.partes.get(nome);
    const pai = grupo.userData.paiSemantico;
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'parte-linha';
    botao.dataset.parte = nome;
    botao.setAttribute('aria-pressed', 'false');
    botao.innerHTML = `
      <span class="check" aria-hidden="true"></span>
      <span class="nome">${formatarNome(nome)}${pai ? ` <small>de ${formatarNome(pai)}</small>` : ''}</span>
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

  /* A-20: a porta publicada aparece aqui, no mesmo painel onde se confere a
     identidade das faces, e vinda do mesmo módulo neutro. Peça sem porta não
     mostra bloco nenhum — a régua não vira poluição nas peças que não publicam. */
  const portas = convertido.medida.portas ?? [];
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
        /* a origem DECLARADA, não as faces resolvidas — a mesma coluna que
           `npm run descrever` imprime, pelo mesmo motivo. */
        const origem = document.createElement('small');
        origem.textContent = `${porta.id} · ${porta.origem}`;
        item.append(nome, origem);
        return item;
      }));
    }
  }

  function focarSelecao() {
    const grupos = controlador.gruposSelecionados();
    ambiente.enquadrar(alvosDeEnquadramento({
      raiz: convertido.raiz,
      selecionados: grupos,
      modo: controlador.modo,
    }), { reproduzivel: true });
  }

  /* A inspeção de par é uma ferramenta de revisão, não uma relação de
     montagem. Ela recebe duas identidades já declaradas, isola sem reposicionar
     nada e compara somente as sete vistas canônicas. A medição vem de um render
     de IDs com depth buffer; uma parte escondida não ganha pontos por ter caixa
     projetada ou por parecer próxima pelo nome. */
  function inspecionarPar(nomes) {
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
    ambiente.enquadrar(alvosDeEnquadramento({ raiz: convertido.raiz, alvo: 'montagem' }));
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

  document.getElementById('btnEnquadrar').addEventListener('click', enquadrarMontagem);
  document.getElementById('btnFocarSelecao').addEventListener('click', focarSelecao);
  btnSelecionarConjunto.addEventListener('click', () => controlador.selecionarSubarvores());
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
      enquadrarMontagem();
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
  controlador.definirExplosao(inicial.explosao, { enquadrar: false });
  ambiente.definirProjecao(inicial.projecao);
  refletirProjecao();
  ambiente.definirVista(inicial.vista, { instantaneo: true });
  if (inicial.cameraLivre) ambiente.restaurarCameraLivre(inicial.cameraLivre);
  vistaAtual = ambiente.vista;
  if (inicial.inspecao === 'par' && inicial.modo === 'isolar' && inicial.selecionadas.length === 2) {
    marcarParInspecionado(inicial.selecionadas);
  }
  inicializando = false;
  refletirEstado(controlador.estado());
  atualizarBotoesVista();
  atualizarReferenciaMetrica();

  if (selecaoIgnorada.length) {
    mostrarAviso(
      `Ignorei ${selecaoIgnorada.length} nome(s) que não existem nesta peça: ${selecaoIgnorada.join(', ')}.`,
    );
  }

  window.__mecanificaBancada = {
    ready: true,
    peca: nomePeca,
    pecasDisponiveis: nomesDisponiveis,
    selecaoIgnorada,
    diagnosticos: convertido.diagnosticos,
    estatisticas: convertido.estatisticas,
    partes: controlador.nomes,
    selecionar: (nomes) => controlador.selecionarMuitas(Array.isArray(nomes) ? nomes : [nomes]),
    selecionarConjunto: (nomes) => controlador.selecionarSubarvores(
      nomes === undefined ? undefined : (Array.isArray(nomes) ? nomes : [nomes]),
    ),
    modo: (modo) => controlador.definirModo(modo),
    vista: (vista) => ambiente.definirVista(vista),
    projecao: (projecao) => ambiente.definirProjecao(projecao),
    explosao: (valor) => controlador.definirExplosao(valor),
    focar: () => focarSelecao(),
    inspecionarPar: (nomes) => inspecionarPar(nomes),
    enquadrar: () => enquadrarMontagem(),
    enquadramento: () => ambiente.medirEnquadramento(
      alvosDeEnquadramento({
        raiz: convertido.raiz,
        selecionados: controlador.gruposSelecionados(),
        modo: controlador.modo,
      }),
    ),
    estado: () => ({
      peca: nomePeca,
      ...controlador.estado(),
      vista: vistaAtual,
      projecao: ambiente.projecao,
      cameraLivre: ambiente.cameraLivre(),
      inspecao: parInspecionado ? 'par' : null,
    }),
    marcadoresDePar: () => marcadoresDoPar.length,
    url: () => location.href,
  };

  addEventListener('pagehide', () => {
    removeEventListener('keydown', atalhoVista);
    selecao3d.destruir();
    controlador.destruir();
    limparMarcadoresDoPar();
    ambiente.destruir();
    cancelAnimationFrame(quadroReferencia);
  }, { once: true });
}
