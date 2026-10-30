/* main.js — bancada interativa de co-modelagem (Humano + IA): monta o estado central, a cena e os componentes da tela, e não toca a página.
 *
 * Cada área da tela é um componente em `componentes/`, que recebe os elementos dele (de `lerElementosDaPagina`, o único
 * lugar que procura elementos) e o estado central (`estado/estado-central.js`), que os painéis leem e escrevem e cuja
 * mudança assinam. A peça em cena, a edição dela, a imagem de referência e a sessão são módulos sem DOM. A ordem da
 * montagem é a da subida antiga, porque a ordem em que os objetos entram na cena e os ouvintes se registram decide a
 * imagem e quem responde primeiro a uma tecla. */
import './sistema-visual.css';
import './styles.css';
import { CATALOGO_HOMOLOGADO, idsDoCatalogo } from '../autoria/catalogo-pecas.js';
import { listarParaBancada } from './acervo-receitas.js';
import { criarAmbienteBancada } from './criar-ambiente.js';
import { arquivoDaSessaoNaUrl } from './sessao/sincronizador.js';
import { criarSessaoDaBancada } from './sessao/sessao-da-bancada.js';
import { criarRegistroDeEventos } from './sessao/registro-de-eventos.js';
import { criarPreferenciaDeTema, criarPreferenciaDeVisao, criarPreferenciasBancada } from './preferencias/estado-local.js';
import { TEMAS, TEMA_PADRAO } from './temas/temas.js';
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
import { montarCaixaDaVisao } from './componentes/caixa-da-visao.js';
import { montarTema } from './componentes/tema.js';
import { montarBuscaDeComandos } from './componentes/busca-de-comandos.js';
import { montarPaineisDoTema } from './componentes/paineis-do-tema.js';
import { montarCartaoDaSelecao, MARGENS_DO_CARTAO } from './componentes/cartao-da-selecao.js';
import { montarCuboDeOrientacao } from './componentes/cubo-de-orientacao.js';
import { montarBarraDeEdicao } from './componentes/barra-de-edicao.js';
import { montarBarraDeEstado } from './componentes/barra-de-estado.js';
import { montarNomeDaPeca } from './componentes/nome-da-peca.js';
import { montarPopoverDaCena } from './componentes/popover-da-cena.js';
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
    /* a caixa sobre a cena e os ganchos da página das visões de superfície */
    pagina: montarCaixaDaVisao({ canvas }),
    aoMudar(visao) {
      preferenciaDeVisao.salvar(visao);
      estado.definir({ visao });
    },
  });
  const preferenciaDeTema = criarPreferenciaDeTema({ conhecidos: TEMAS.map((tema) => tema.id), padrao: TEMA_PADRAO });
  const estado = criarEstadoCentral(estadoInicialDaBancada({
    pecaPedida, visao: seletorDeVisao.atual, tema: preferenciaDeTema.ler(),
  }));
  /* O tema vem antes de tudo o que desenha, para a página nascer arrumada; a cena dele chega ao ambiente quando o
     ambiente existe. */
  let cenaDoTema = null;
  let aplicarCenaDoTema = () => {};
  const tema = montarTema({
    elementos: elementos.tema,
    estado,
    preferencia: preferenciaDeTema,
    aoMudarCena(cenaNova) {
      cenaDoTema = cenaNova;
      aplicarCenaDoTema(cenaNova);
    },
  });

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

  /* A cena do tema: o fundo, a grade e a sombra vão para o ambiente, e o contorno
     da seleção toma o lugar da tinta verde quando o tema o pede. */
  aplicarCenaDoTema = (cenaNova) => {
    ambiente.definirCenaDoTema(cenaNova);
    ambiente.definirContorno(cenaNova?.contornoDaSelecao
      ? { cor: cenaNova.contornoDaSelecao, grupos: () => cena.gruposDoContorno() }
      : null);
    cena.definirTintaDaSelecao(!cenaNova?.contornoDaSelecao);
  };
  aplicarCenaDoTema(cenaDoTema);

  montarPainelComponentes({
    elementos: elementos.painelComponentes,
    estado,
    selecionar: (nome) => cena.controlador.selecionar(nome, { aditiva: true }),
    limpar: () => cena.controlador?.limpar(),
    /* Isolar pela linha é escolher só aquela parte e isolá-la; de novo na mesma linha volta à montagem. */
    isolar(nome) {
      const controlador = cena.controlador;
      if (!controlador) return;
      if (controlador.modo === 'isolar' && controlador.selecionadas.length === 1 && controlador.selecionadas[0] === nome) {
        controlador.definirModo('todas');
        return;
      }
      controlador.selecionarMuitas([nome]);
      controlador.definirModo('isolar');
    },
    alternarOculta: (nome) => cena.alternarOculta(nome),
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

  let paineisDoTema = null;
  /* As ações sobre a peça olhada, as mesmas para o painel da direita, a busca de comandos e o cartão da seleção. */
  const acoesDaPeca = {
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
  };
  const painelInspecao = montarPainelInspecao({
    elementos: elementos.painelInspecao,
    estado,
    aoRecolher: redimensionar,
    acoes: acoesDaPeca,
    aoEscolherAba: () => paineisDoTema?.abrir('inspecao'),
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
  const barraSuperior = montarBarraSuperior({
    elementos: elementos.barraSuperior,
    corpo: elementos.corpo,
    estado,
    registroDeEventos,
    registroAtalhos,
    comandos,
    entradasDoAcervo: listarParaBancada(),
    abrirDoAcervo: (entrada) => sessao.abrirDoAcervo(entrada),
  });

  /* A busca de comandos lista, além dos comandos de teclado e das partes, as ações da tela que não têm tecla própria. */
  const temPeca = () => Boolean(cena.modelo);
  const extrasDaBusca = [
    { id: 'abrir', grupo: 'Peça', rotulo: 'Abrir peça do acervo', executar: () => barraSuperior.abrirJanela('abrir') },
    { id: 'copiar-vista', grupo: 'Peça', rotulo: 'Copiar vista', executar: () => acoesDaPeca.copiarVista() },
    { id: 'editar-juntas', grupo: 'Peça', rotulo: 'Editar juntas', ligado: () => estado.obter('juntas').modo, executar: () => temPeca() && edicao.alternarModoJuntas() },
    { id: 'editar-malha', grupo: 'Peça', rotulo: 'Editar malha', tecla: 'Tab', executar: () => temPeca() && edicao.alternarEdicaoDeMalha() },
    { id: 'grade', grupo: 'Cena', rotulo: 'Grade', tecla: 'h', ligado: () => preferenciasBancada.ler().grade, executar: () => vista.alternarPreferenciaCena('grade') },
    { id: 'chao', grupo: 'Cena', rotulo: 'Chão', ligado: () => preferenciasBancada.ler().chao, executar: () => vista.alternarPreferenciaCena('chao') },
    {
      id: 'explosao', grupo: 'Cena', rotulo: 'Explosão da montagem',
      valor: () => `${Math.round((estado.obter('selecao')?.explosao ?? 0) * 100)}%`,
      executar: () => acoesDaPeca.definirExplosao((estado.obter('selecao')?.explosao ?? 0) > 0 ? 0 : 0.5),
    },
    { id: 'painel-partes', grupo: 'Painéis', rotulo: 'Partes', ligado: () => Boolean(estado.obter('paineis').partes), executar: () => paineisDoTema.alternar('partes') },
    { id: 'painel-detalhes', grupo: 'Painéis', rotulo: 'Detalhes da seleção', ligado: () => Boolean(estado.obter('paineis').inspecao), executar: () => paineisDoTema.abrir('inspecao', { aba: 'inspecao' }) },
    { id: 'painel-referencia', grupo: 'Painéis', rotulo: 'Imagem de referência', executar: () => abrirAbaDoPainel('referencias') },
    { id: 'painel-notas', grupo: 'Painéis', rotulo: 'Anotações', valor: () => String(estado.obter('anotacoes')?.length ?? 0), executar: () => abrirAbaDoPainel('anotacoes') },
    { id: 'estado', grupo: 'Painéis', rotulo: 'Estado da sessão e eventos', executar: () => barraSuperior.abrirJanela('estado') },
    { id: 'controles', grupo: 'Painéis', rotulo: 'Controles e atalhos', executar: () => barraSuperior.abrirJanela('controles') },
    ...TEMAS.map((cada) => ({
      id: `tema-${cada.id}`, grupo: 'Tema', rotulo: cada.rotulo, escolhido: () => estado.obter('tema') === cada.id, executar: () => tema.escolher(cada.id),
    })),
  ];
  /* Abrir uma aba do painel da direita abre o painel no tema que o deixa fechado. */
  function abrirAbaDoPainel(aba) {
    paineisDoTema.abrir('inspecao');
    painelInspecao.abrirAba(aba);
  }
  paineisDoTema = montarPaineisDoTema({
    elementos: elementos.paineisDoTema, estado, abrirAba: (aba) => painelInspecao.abrirAba(aba),
  });
  montarNomeDaPeca({ elementos: elementos.nomeDaPeca, estado });
  montarPopoverDaCena({ elementos: elementos.popoverDaCena });
  montarCuboDeOrientacao({ elementos: elementos.cuboDeOrientacao, orientacao: () => ambiente.camera.matrixWorldInverse.elements });
  montarCartaoDaSelecao({
    elementos: elementos.cartaoDaSelecao,
    estado,
    acoes: {
      ...acoesDaPeca,
      limpar: () => cena.controlador?.limpar(),
      ocultarSelecao() {
        const selecionadas = cena.controlador?.selecionadas ?? [];
        cena.definirOcultas([...new Set([...estado.obter('ocultas'), ...selecionadas])]);
        cena.controlador?.limpar();
      },
      abrirDetalhes: () => paineisDoTema.abrir('inspecao', { aba: 'inspecao' }),
    },
    caixaNaTela: () => cena.caixaDaSelecaoNaTela(),
    medidas: () => cena.medidasDaSelecao(),
    /* O cartão não cobre a árvore das partes quando ela está aberta. */
    margens: () => ({
      ...MARGENS_DO_CARTAO,
      esquerda: MARGENS_DO_CARTAO.esquerda + (estado.obter('paineis').partes ? 240 + 16 : 0),
    }),
  });
  montarBarraDeEdicao({
    elementos: elementos.barraDeEdicao,
    estado,
    corpo: elementos.corpo,
    acoes: {
      alternarModoJuntas: () => temPeca() && edicao.alternarModoJuntas(),
      alternarEdicaoDeMalha: () => temPeca() && edicao.alternarEdicaoDeMalha(),
      desfazer: () => edicao.desfazerDesenho() || avisar('Nada para desfazer nesta sessão.'),
      descartar: () => edicao.descartarDesenho(),
    },
  });
  montarBarraDeEstado({
    elementos: elementos.barraDeEstado,
    estado,
    medidasDaPeca: () => cena.medidasDaPeca(),
    acoes: {
      alternarPreferenciaCena: (qual) => vista.alternarPreferenciaCena(qual),
      abrirControles: () => barraSuperior.abrirJanela('controles'),
    },
  });
  montarBuscaDeComandos({
    elementos: elementos.buscaDeComandos,
    fontes: () => ({
      extras: extrasDaBusca,
      comandos,
      teclas: registroAtalhos.obter(),
      partes: estado.obter('partes') ?? [],
      selecionar: (nome) => cena.controlador?.selecionar(nome),
    }),
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
