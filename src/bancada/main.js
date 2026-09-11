/* main.js — bancada interativa de co-modelagem (Humano + IA): 3D, referências, parâmetros e feedback. */
import './styles.css';
import * as THREE from 'three';
import { carregarPeca } from './carregar-peca.js';
import { CATALOGO_HOMOLOGADO, idsDoCatalogo } from './catalogo-pecas.js';
import { listarAcervo } from './acervo-receitas.js';
import { comCaminho, receitaComParametros } from '../autoria/parametros-vivos.js';
import { parametroDeclarado } from '../autoria/parametros-declarados.js';
import { ligarPartesAParametros, parametrosDaParte } from '../autoria/ligacao-parte-parametro.js';
import { escolherSetas } from '../autoria/setas-por-eixo.js';
import { criarSetasDeParametro } from './controles/setas-de-parametro.js';
import {
  gravarParametrosNoGitHub, lerConfiguracaoRepositorio, salvarConfiguracaoRepositorio,
} from './repositorio/gravar-no-github.js';
import { criarAmbienteBancada, posicionarNoEstudio } from './criar-ambiente.js';
import { criarControladorPartes } from './controlar-partes.js';
import { criarSelecaoBancada } from './criar-selecao.js';
import { criarSincronizadorSessao } from './sessao/sincronizador.js';
import { criarGerenciadorReferencias3D } from './referencias/prancha-overlay.js';
import { criarPainelReferencias } from './referencias/painel-referencias.js';
import { criarArmazenamentoImagem } from './referencias/armazenamento-imagem.js';
import { criarAlinhamentoInicial, normalizarImagemReferencia } from './referencias/imagem-referencia.js';
import { urlDaReferencia } from './referencias/imagens-da-peca.js';
import { criarPainelParametros } from './parametros/painel-parametros.js';
import { criarPreferenciasBancada } from './preferencias/estado-local.js';
import { criarRegistroAtalhos, normalizarCombinacao } from './controles/atalhos.js';
import { criarHistoricoParametros } from './controles/historico-parametros.js';
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
    await armazenamentoImagem.salvar(alvoReferenciaAtual, descritor);
    return descritor;
  }
  const painelReferencias = criarPainelReferencias({
    container: document.getElementById('containerReferencias'),
    aoAlternarPrancha: (id, visivel) => gerenciadorReferencias3D.alternarVisibilidade(id, visivel),
    aoGerarPlano: gerarPlanoReferencia,
    aoAtualizarAlinhamento: async (alinhamento) => {
      const atual = gerenciadorReferencias3D.obterImagemReferencia();
      if (!atual || !alvoReferenciaAtual) return;
      const atualizado = { ...atual.alinhamento, ...alinhamento };
      gerenciadorReferencias3D.atualizarImagemReferencia(atualizado);
      await armazenamentoImagem.salvar(alvoReferenciaAtual, { ...atual, alinhamento: atualizado });
    },
    aoRemoverImagem: async () => {
      gerenciadorReferencias3D.removerImagemReferencia();
      if (alvoReferenciaAtual) await armazenamentoImagem.remover(alvoReferenciaAtual);
    },
  });

  let sincronizador = null;

  /* A receita que a bancada tem em mãos, quando a peça veio do acervo. É dela
     que sai a prévia: mexer o controle monta uma receita equivalente com o
     valor novo e reexecuta, em vez de deformar a malha na tela. */
  let receitaAberta = null;

  /* O que a pessoa mexeu e ainda não salvou. A prévia aplica TODAS as pendentes
     a cada quadro: aplicar só a última desfaria as anteriores na tela, e a peça
     mostraria um estado que não é nem o gravado nem o pedido. */
  const pendentes = new Map();

  /* Os valores que a peça tinha quando foi aberta, lidos do arquivo. São o piso
     do desfazer: Ctrl+Z devolve o que a sessão mexeu e para aqui, porque abaixo
     disto não existe estado anterior que esta sessão tenha produzido. */
  let origemDosParametros = new Map();
  const historicoParametros = criarHistoricoParametros({
    valorDeOrigem: (chave) => (origemDosParametros.has(chave)
      ? origemDosParametros.get(chave)
      : parametroDeclarado(receitaAberta, chave)?.valor),
  });

  function anotarOrigem(chave) {
    if (origemDosParametros.has(chave)) return;
    const declarado = parametroDeclarado(receitaAberta, chave);
    if (declarado) origemDosParametros.set(chave, declarado.valor);
  }

  /* Aplica o valor e redesenha, SEM registrar no histórico: é por aqui que o
     próprio desfazer devolve o valor, senão desfazer viraria mais um passo e a
     pilha nunca esvaziaria. */
  function aplicarValor(chave, valor) {
    if (!receitaAberta) return;
    const declarado = parametroDeclarado(receitaAberta, chave);
    if (!declarado) return;
    /* Pendente é o que difere do arquivo. Quando o valor volta a ser o que a
       receita já tem, a pendência sai da lista: mantê-la faria o salvar
       reescrever o mesmo número, e o texto da receita deixaria de voltar byte a
       byte ao que estava. */
    if (Object.is(valor, declarado.valor)) pendentes.delete(chave);
    else pendentes.set(chave, valor);
    refletirPendencias();

    let params = receitaAberta.PARAMS;
    for (const [id, v] of pendentes) {
      const alvo = parametroDeclarado(receitaAberta, id);
      if (alvo) params = comCaminho(params, alvo.caminho, v);
    }
    /* A prévia reconstrói o modelo, e reconstruir destrói o controlador junto
       com a seleção — no meio de um arrasto de seta isso apagava a seleção e
       fazia as próprias setas sumirem. A seleção da bancada é por NOME, então
       ela sobrevive à reconstrução: basta devolvê-la depois. */
    const selecionadasAntes = controlador ? [...controlador.selecionadas] : [];
    sincronizador?.definirPayload({
      alvo: { nome: idNaUrl ?? nomePecaAtual },
      receita: receitaComParametros(receitaAberta, params),
    });
    if (selecionadasAntes.length && controlador) {
      controlador.selecionarMuitas(selecionadasAntes);
    }
  }

  function previaDeParametro(chave, valor) {
    if (!receitaAberta || !parametroDeclarado(receitaAberta, chave)) return;
    anotarOrigem(chave);
    historicoParametros.registrar(chave, valor);
    aplicarValor(chave, valor);
  }

  /* Ctrl+Z devolve o valor anterior de um parâmetro mexido nesta sessão e para
     no estado que veio do arquivo: com a pilha vazia, o comando não faz nada e
     não inventa passo anterior. */
  function desfazerParametro() {
    const passo = historicoParametros.desfazer();
    if (!passo) return false;
    aplicarValor(passo.chave, passo.valor);
    painelParametros?.refletirValor?.(passo.chave, passo.valor);
    mostrarAviso(historicoParametros.vazio
      ? 'Desfeito: a peça voltou ao que veio do arquivo.'
      : `Desfeito ${passo.chave}.`);
    return true;
  }

  /* Duas portas para o mesmo destino, e o destino é sempre o arquivo da receita.
     Quem roda a bancada a partir do repositório tem o atendente local, que
     escreve direto no disco. Quem abre o endereço publicado não tem arquivo
     nenhum, e aí a gravação vai pela API do GitHub com o token da própria
     pessoa, virando um commit. Sem nenhuma das duas, o valor vale como prévia
     nesta sessão e a bancada diz isso.

     UM SALVAR, UMA GRAVAÇÃO. Gravar a cada gesto encheria o histórico de
     estados intermediários que ninguém escolheu, dispararia a integração
     contínua a cada arrasto, e abriria uma janela por gesto para outra pessoa
     commitar no meio da sequência. */
  const CAMINHO_ACERVO = 'prototipos/procedural/v3/pecas';
  const rodapeParametros = document.getElementById('rodapeParametros');
  const resumoPendentes = document.getElementById('resumoPendentes');
  const btnSalvarParametros = document.getElementById('btnSalvarParametros');

  function refletirPendencias() {
    if (!rodapeParametros) return;
    const quantas = pendentes.size;
    rodapeParametros.hidden = !receitaAberta;
    rodapeParametros.classList.toggle('tem-pendencia', quantas > 0);
    btnSalvarParametros.disabled = quantas === 0;
    resumoPendentes.textContent = quantas === 0
      ? 'nada para salvar'
      : `${quantas} ${quantas === 1 ? 'alteração' : 'alterações'} sem salvar`;
  }

  async function gravarNoAtendenteLocal(mudancas) {
    const resposta = await fetch('/api/parametro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ peca: idNaUrl, mudancas }),
    });
    return resposta.json();
  }

  async function salvarPendentes() {
    if (pendentes.size === 0) return;
    if (!idNaUrl) {
      mostrarAviso('Esta peça veio da sessão da IA; abra pelo acervo para gravar no arquivo.');
      return;
    }

    const mudancas = Object.fromEntries(pendentes);
    btnSalvarParametros.disabled = true;
    mostrarAviso(`Salvando ${pendentes.size} alteração(ões)…`);

    let resultado = null;
    try {
      resultado = await gravarNoAtendenteLocal(mudancas);
    } catch {
      resultado = null;
    }

    if (!resultado) {
      const config = lerConfiguracaoRepositorio();
      if (!config) {
        mostrarAviso('O valor vale como prévia: configure o repositório em Configurações para gravar.');
        refletirPendencias();
        return;
      }
      resultado = await gravarParametrosNoGitHub({
        config,
        caminhoNoRepo: `${CAMINHO_ACERVO}/${idNaUrl}.js`,
        mudancas,
      });
    }

    if (resultado.estado === 'aplicado') {
      for (const { id, para } of resultado.aplicadas ?? []) {
        const alvo = parametroDeclarado(receitaAberta, id);
        if (receitaAberta && alvo) {
          receitaAberta.PARAMS = comCaminho(receitaAberta.PARAMS, alvo.caminho, para);
        }
      }
      pendentes.clear();
      refletirPendencias();
      const quantas = resultado.aplicadas?.length ?? 0;
      mostrarAviso(`${quantas} salva(s)${resultado.commit ? ' num commit' : ' na receita'}.`);
      return;
    }

    refletirPendencias();
    mostrarAviso(`Não salvei: ${resultado.motivo}`);
  }

  btnSalvarParametros?.addEventListener('click', () => { salvarPendentes(); });

  /* As setas por eixo na parte selecionada. A ligação entre parte e parâmetro
     custa uma execução por parâmetro — dois segundos na bicicleta —, então ela
     é calculada UMA vez por peça aberta e guardada. Calcular a cada seleção
     travaria a bancada a cada clique. */
  let ligacaoDaPeca = null;

  const setasDeParametro = criarSetasDeParametro({
    cena: ambiente.scene,
    canvas,
    cameraAtual: () => ambiente.camera,
    valorAtual: (id) => (pendentes.has(id)
      ? pendentes.get(id)
      : parametroDeclarado(receitaAberta, id)?.valor ?? 0),
    passoDe: (id) => parametroDeclarado(receitaAberta, id)?.passo ?? 1,
    aoArrastar: previaDeParametro,
    aoSoltar: () => { historicoParametros.separar(); refletirPendencias(); },
  });

  function garantirLigacao() {
    if (ligacaoDaPeca || !receitaAberta) return ligacaoDaPeca;
    try {
      ligacaoDaPeca = ligarPartesAParametros(receitaAberta);
    } catch (erro) {
      console.warn('não consegui ligar partes a parâmetros', erro);
      ligacaoDaPeca = { porParte: {}, porParametro: {}, inertes: [], partes: [] };
    }
    return ligacaoDaPeca;
  }

  function refletirSetas(selecionadas) {
    /* Uma parte por vez: com duas selecionadas não existe centro nem parâmetro
       comum, e uma seta que aparece no meio de duas peças diria uma ligação que
       ninguém mediu. */
    if (!receitaAberta || selecionadas.length !== 1) return setasDeParametro.esconder();

    const ligacao = garantirLigacao();
    const caixa = modeloAtual?.medida?.partes?.get?.(selecionadas[0]);
    if (!caixa) return setasDeParametro.esconder();

    return setasDeParametro.mostrar({
      centro: new THREE.Vector3(...caixa.centro),
      ligacoes: escolherSetas(parametrosDaParte(ligacao, selecionadas[0])),
    });
  }

  /* A seta tem tamanho constante na tela, então ela precisa reagir à câmera a
     cada quadro. O ambiente não publica gancho de quadro, e abrir um só para
     isto seria mudar o visor por causa de um controle. */
  (function acompanharCamera() {
    setasDeParametro.atualizarEscala();
    requestAnimationFrame(acompanharCamera);
  }());

  const painelParametros = criarPainelParametros({
    container: document.getElementById('containerParametros'),
    aoArrastar: previaDeParametro,
    /* Assentar o valor não grava: confirma a pendência e FECHA o gesto, para
       que o arrasto inteiro conte como um único desfazer. Quem grava é o
       botão. */
    aoSoltar: (chave, valor) => {
      previaDeParametro(chave, valor);
      historicoParametros.separar();
    },
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
    refletirSetas(estado.selecionadas);
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
    if (!desfazerParametro()) {
      mostrarAviso('Nada para desfazer nesta sessão.');
    }
  }
  addEventListener('keydown', atalhoDesfazer);

  function atalhoVista(evento) {
    if (evento.key === 'Escape') {
      if (registroAtalhos.capturando) return;
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

  /* A configuração do repositório mora no navegador de quem digitou, e o campo
     do token nunca é preenchido de volta: mostrar segredo guardado na tela não
     ajuda ninguém a conferir e ajuda quem passa por trás. */
  const camposRepo = {
    dono: document.getElementById('repoDono'),
    repo: document.getElementById('repoNome'),
    ramo: document.getElementById('repoRamo'),
    token: document.getElementById('repoToken'),
  };

  function refletirRepositorio() {
    const config = lerConfiguracaoRepositorio();
    if (!config) return;
    camposRepo.dono.value = config.dono;
    camposRepo.repo.value = config.repo;
    camposRepo.ramo.value = config.ramo;
    camposRepo.token.placeholder = 'guardado neste navegador';
  }

  refletirRepositorio();
  document.getElementById('btnSalvarRepo')?.addEventListener('click', () => {
    const guardado = lerConfiguracaoRepositorio();
    const config = salvarConfiguracaoRepositorio({
      dono: camposRepo.dono.value.trim(),
      repo: camposRepo.repo.value.trim(),
      ramo: camposRepo.ramo.value.trim() || 'main',
      token: camposRepo.token.value.trim() || guardado?.token || '',
    });
    camposRepo.token.value = '';
    mostrarAviso(config
      ? `Gravação ligada em ${config.dono}/${config.repo}, ramo ${config.ramo}.`
      : 'Faltou dono, repositório ou token.');
    refletirRepositorio();
  });

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
      ligacaoDaPeca = null;
      pendentes.clear();
      /* Peça nova, sessão nova: o piso do desfazer passa a ser o que veio do
         arquivo desta peça, e a pilha da anterior não pode sobreviver. */
      historicoParametros.limpar();
      origemDosParametros = new Map();
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
    ['btnMenuConfiguracoes', 'menuConfiguracoes'],
    ['btnMenuAtalhos', 'menuAtalhos'],
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

  for (const { botao, janela } of janelas) {
    botao.addEventListener('click', () => {
      const abrir = janela.hidden;
      fecharJanelas();
      if (!abrir) return;
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
    async aoAtualizar(estado, novoModelo, { fonte }) {
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
        intencaoIA: estado.intencaoIA,
        referencias: estado.referencias,
      });
      gerenciadorReferencias3D.sincronizarComSessao(estado.referencias);
      painelParametros?.renderizar({
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
    if (controlador) controlador.destruir();
    gerenciadorReferencias3D.destruir();
    gerenciadorAnotacoes3D.destruir();
    limparMarcadoresDoPar();
    ambiente.destruir();
    cancelAnimationFrame(quadroReferencia);
  }, { once: true });
}
