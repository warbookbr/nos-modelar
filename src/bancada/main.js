/* main.js — bancada interativa de co-modelagem (Humano + IA): monta o estado central, a cena e os componentes da tela, e não toca a página.
 *
 * Cada área da tela é um componente em `componentes/`, que recebe os elementos dele (de `lerElementosDaPagina`, o único
 * lugar que procura elementos) e o estado central (`estado/estado-central.js`), que os painéis leem e escrevem e cuja
 * mudança assinam. A peça em cena, a edição dela, a imagem de referência e a sessão são módulos sem DOM. A ordem da
 * montagem é a da subida antiga, porque a ordem em que os objetos entram na cena e os ouvintes se registram decide a
 * imagem e quem responde primeiro a uma tecla. */
import './styles.css';
import { CATALOGO_HOMOLOGADO, idsDoCatalogo } from '../autoria/catalogo-pecas.js';
import { listarParaBancada } from './acervo-receitas.js';
import { criarAmbienteBancada } from './criar-ambiente.js';
import { arquivoDaSessaoNaUrl } from './sessao/sincronizador.js';
import { criarSessaoDaBancada } from './sessao/sessao-da-bancada.js';
import { criarRegistroDeEventos } from './sessao/registro-de-eventos.js';
import { criarPreferenciaDeVisao, criarPreferenciasBancada } from './preferencias/estado-local.js';
import { VISOES, VISAO_PADRAO, criarSeletorDeVisao, visaoDisponivel } from './visoes/registro-de-visoes.js';
import { criarRegistroAtalhos } from './controles/atalhos.js';
import { criarComandos } from './controles/comandos.js';
import { criarGerenciadorAnotacoes3D } from './anotacoes/pinos-anotacoes.js';
import { criarImagemNaCena } from './referencias/imagem-na-cena.js';
import { criarEstadoCentral, estadoInicialDaBancada } from './estado/estado-central.js';
import { criarPecaEmCena } from './cena/peca-em-cena.js';
import { criarEdicaoDaPeca } from './cena/edicao-da-peca.js';
import { criarVistaDaCena } from './cena/vista-da-cena.js';
import { lerElementosDaPagina } from './componentes/elementos-da-pagina.js';
import { montarAvisos } from './componentes/avisos.js';
import { montarEndereco } from './componentes/endereco.js';
import { criarArquivosDaPagina } from './componentes/arquivos-da-pagina.js';
import { aCadaQuadro, aoSairDaPagina } from './componentes/ciclo-da-pagina.js';
import { montarPainelComponentes } from './componentes/painel-componentes.js';
import { montarPainelInspecao } from './componentes/painel-inspecao.js';
import { montarAbaAnotacoes } from './componentes/aba-anotacoes.js';
import { montarRodapeJuntas } from './componentes/rodape-juntas.js';
import { montarBarraDasVistas } from './componentes/barra-das-vistas.js';
import { montarBarraSuperior } from './componentes/barra-superior.js';
import { montarTeclado } from './componentes/teclado.js';
import { montarSessaoAtiva } from './componentes/sessao-ativa.js';
import { montarReferenciaMetrica } from './componentes/referencia-metrica.js';
import { criarPonteDaCaptura, publicarPonte } from './componentes/ponte-da-captura.js';

/* `sessaoPorUrl` deixa a URL escolher o arquivo de sessão (`?sessao=<caminho>`), em vez do `sessao-ativa.json` compartilhado: só o
   harness das capturas headless o liga, para cada captura ler a peça que pediu mesmo com outra captura rodando ao lado. A bancada
   publicada não o liga e continua lendo a sessão ativa. */
export async function iniciar({ catalogo = CATALOGO_HOMOLOGADO, sessaoPorUrl = false } = {}) {
  const elementos = lerElementosDaPagina();
  const avisos = montarAvisos(elementos.avisos);
  const { avisar, mostrarErro } = avisos;
  const endereco = montarEndereco();
  const params = endereco.parametros;
  const pecaPedida = params.get('peca');
  const arquivoDaSessao = sessaoPorUrl ? arquivoDaSessaoNaUrl(params.get('sessao')) : null;
  const canvas = elementos.canvas;

  /* A VISÃO DA PEÇA (sólida, arame, raio X...) vive no seletor, e não no
     controlador das partes, porque o controlador é refeito a cada peça, junta
     arrastada ou operação de malha, e a visão escolhida tem de sobreviver a
     todos eles. `aplicarModelo` prende a visão em cada controlador novo. */
  const preferenciaDeVisao = criarPreferenciaDeVisao({
    conhecidas: VISOES.filter(visaoDisponivel).map((visao) => visao.id),
    padrao: VISAO_PADRAO,
  });
  const seletorDeVisao = criarSeletorDeVisao({
    inicial: preferenciaDeVisao.ler(),
    aoMudar(visao) {
      preferenciaDeVisao.salvar(visao);
      estado.definir({ visao });
    },
  });
  const estado = criarEstadoCentral(estadoInicialDaBancada({ pecaPedida, visao: seletorDeVisao.atual }));

  /* O que a barra de Estado responde: a sessão, as faces sem identidade e a
     sequência de eventos desde que a página abriu. */
  const registroDeEventos = criarRegistroDeEventos();

  /* O ambiente avisa a cena da troca de vista, e a cena nasce depois dele. */
  let cena = null;
  const salvarUrlForaDaSubida = () => {
    if (!estado.obter('inicializando') && cena.controlador) cena.salvarEstadoNaUrl(cena.controlador.estado());
  };
  const ambiente = criarAmbienteBancada(canvas, {
    aoMudarVista(vista) {
      estado.definir({ vista });
      salvarUrlForaDaSubida();
    },
    aoMudarCameraLivre: salvarUrlForaDaSubida,
  });

  /* A edição da peça nasce depois da imagem de referência, como na subida
     antiga, e a cena a lê na hora de cada chamada. */
  let edicao = null;
  cena = criarPecaEmCena({
    ambiente, canvas, estado, registroDeEventos, seletorDeVisao, parametros: params, endereco, edicao: () => edicao,
  });
  const redimensionar = () => ambiente.redimensionar?.();

  montarPainelComponentes({
    elementos: elementos.painelComponentes,
    estado,
    selecionar: (nome) => cena.controlador.selecionar(nome, { aditiva: true }),
    limpar: () => cena.controlador?.limpar(),
    aoRecolher: redimensionar,
  });

  const arquivos = criarArquivosDaPagina();
  const imagemNaCena = criarImagemNaCena({
    ambiente, canvas, cena,
    containerReferencias: elementos.painelInspecao.containerReferencias,
    carregarImagem: arquivos.carregarImagem,
  });

  edicao = criarEdicaoDaPeca({
    ambiente, canvas, estado, registroDeEventos, cena, avisar, receitaDeOrigem: pecaPedida,
  });
  montarRodapeJuntas({
    elementos: elementos.rodapeJuntas, estado, salvar: edicao.salvarAlvoDoAjuste, baixar: arquivos.baixar,
  });

  /* O punho de junta e o punho da imagem têm tamanho constante na tela, então
     precisam reagir à câmera a cada quadro. O ambiente não publica gancho de
     quadro, e abrir um só para isto seria mudar o visor por causa de um controle. */
  aCadaQuadro(() => {
    edicao.acompanharCamera();
    imagemNaCena.punho.acompanharCamera();
  });

  let sessao = null;
  const anotacoes3D = criarGerenciadorAnotacoes3D({
    canvas,
    cena: ambiente.scene,
    cameraAtual: () => ambiente.camera,
    aoCriarAnotacao: (novaAnotacao) => {
      sessao?.sincronizador.enviarAnotacao(novaAnotacao);
      avisar('Ponto de revisão registrado para a IA.');
    },
  });

  const preferenciasBancada = criarPreferenciasBancada();
  const vista = criarVistaDaCena({
    ambiente, estado, cena, seletorDeVisao, preferenciasBancada, avisar, parametros: params,
  });

  const painelInspecao = montarPainelInspecao({
    elementos: elementos.painelInspecao,
    estado,
    aoRecolher: redimensionar,
    acoes: {
      focarSelecao: () => cena.focarSelecao(),
      selecionarConjunto: () => cena.controlador?.selecionarSubarvores(),
      definirModo: (modo) => cena.controlador?.definirModo(modo),
      definirExplosao: (valor) => cena.controlador?.definirExplosao(valor),
      alternarWireframeSelecao: () => cena.controlador?.definirWireframeSelecao(!cena.controlador.estado().wireframeSelecao),
      definirOpacidadeSelecao: (valor) => cena.controlador?.definirOpacidadeSelecao(valor),
      async copiarVista() {
        if (cena.controlador) cena.salvarEstadoNaUrl(cena.controlador.estado());
        try {
          await endereco.copiar();
          avisar('Vista copiada. Outra pessoa ou IA abrirá exatamente o mesmo estado.');
        } catch {
          avisar('A vista já está registrada na URL do navegador.');
        }
      },
      alternarModoJuntas: () => edicao.alternarModoJuntas(),
      aplicarPreferenciasCena: (parcial) => vista.aplicarPreferenciasCena(parcial),
    },
  });
  montarAbaAnotacoes({
    elementos: elementos.painelInspecao.anotacoes,
    estado,
    canvas,
    anotacoes3D,
    sincronizador: () => sessao?.sincronizador,
    modeloEmCena: () => cena.modelo,
    avisar,
  });

  montarBarraDasVistas({
    elementos: elementos.barraDasVistas,
    estado,
    definirVista: (qual) => ambiente.definirVista(qual),
    alternarProjecao: vista.alternarProjecao,
    enquadrar: () => cena.enquadrarMontagem(),
    escolherVisao: vista.escolherVisao,
    aoRefletirVisao: painelInspecao.refletirVisao,
  });

  const comandos = criarComandos({
    definirVista: (qual) => ambiente.definirVista(qual),
    alternarProjecao: vista.alternarProjecao,
    enquadrar: () => cena.enquadrarMontagem(),
    alternarPreferenciaCena: vista.alternarPreferenciaCena,
    escolherVisao: vista.escolherVisao,
    controlador: () => cena.controlador,
    visaoAtual: () => seletorDeVisao.atual,
  });
  const registroAtalhos = criarRegistroAtalhos({
    padrao: Object.fromEntries(comandos.map((c) => [c.id, c.padrao])),
  });
  const teclado = montarTeclado({
    edicao,
    temPecaEditavel: () => Boolean(cena.modelo?.neutro),
    limparSelecao: () => cena.controlador?.limpar(),
    registroAtalhos,
    comandos,
    avisar,
  });

  vista.aplicarPreferenciasCena({});
  montarBarraSuperior({
    elementos: elementos.barraSuperior,
    corpo: elementos.corpo,
    estado,
    registroDeEventos,
    registroAtalhos,
    comandos,
    entradasDoAcervo: listarParaBancada(),
    abrirDoAcervo: (entrada) => sessao.abrirDoAcervo(entrada),
  });

  sessao = criarSessaoDaBancada({
    estado, cena, edicao, imagemNaCena, anotacoes3D, registroDeEventos, avisar, mostrarErro, arquivoDaSessao,
  });
  montarSessaoAtiva({
    elementos: elementos.sessaoAtiva,
    estado,
    aceitarEntrega: () => sessao.aceitarEntrega(),
    carregarDemonstracao: () => sessao.carregarDemonstracao(),
  });
  const referenciaMetrica = montarReferenciaMetrica({
    elementos: elementos.referenciaMetrica, estado, referenciaMetrica: () => ambiente.referenciaMetrica(),
  });

  await sessao.abrirInicial({ pecaPedida, catalogo, acervo: pecaPedida ? listarParaBancada() : [] });
  vista.restaurarCameraDaUrl();

  // API unificada da Bancada para testes e automações
  publicarPonte(criarPonteDaCaptura({
    estado,
    pecasDisponiveis: idsDoCatalogo(catalogo),
    cena,
    ambiente,
    edicao,
    imagemNaCena,
    sincronizador: sessao.sincronizador,
    seletorDeVisao,
    parametros: params,
    corpo: elementos.corpo,
    endereco,
  }));

  aoSairDaPagina(() => {
    teclado.destruir();
    sessao.sincronizador.destruir();
    cena.destruir();
    imagemNaCena.gerenciador.destruir();
    anotacoes3D.destruir();
    ambiente.destruir();
    referenciaMetrica.parar();
  });
}
