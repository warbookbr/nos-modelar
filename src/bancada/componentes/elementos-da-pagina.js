/* elementos-da-pagina.js — o único lugar que procura os elementos da bancada na página, entregues agrupados pelo componente que os usa.
 *
 * Cada componente recebe só o grupo dele e não procura nada por conta própria. Elemento que falta vem como `null`: a
 * página publicada (`bancada.html`) e a do harness das capturas (`tools/bancadas/harness.html`) não têm os mesmos, e os
 * componentes já tratam a ausência do jeito que o corpo único de `main.js` tratava. */

export function lerElementosDaPagina(documento = globalThis.document) {
  const id = (nome) => documento.getElementById(nome);
  const recolhivel = (painel) => ({
    botao: documento.querySelector(`[data-recolher="${painel}"]`),
    painel: documento.querySelector(`.painel[data-painel="${painel}"]`),
  });
  return {
    canvas: id('cenaBancada'),
    corpo: documento.body,
    tema: {
      raiz: documento.documentElement,
      escolha: id('escolhaTema'),
      moveis: [...documento.querySelectorAll('[data-movel]')],
      lugares: [...documento.querySelectorAll('[data-lugar]')],
      rotulaveis: [...documento.querySelectorAll('[data-rotulo]')],
    },
    buscaDeComandos: {
      caixa: id('buscaComandos'),
      entrada: id('entradaBusca'),
      resultados: id('resultadosBusca'),
      gatilhos: [...documento.querySelectorAll('[data-abrir-busca]')],
    },
    avisos: { aviso: id('aviso'), erro: id('erro') },
    barraSuperior: {
      /* A ordem é a dos botões na barra, e é a ordem em que as janelas fecham. */
      janelas: [
        ['abrir', 'btnMenuAbrir', 'menuAbrir'],
        ['controles', 'btnMenuAtalhos', 'menuAtalhos'],
        ['estado', 'btnMenuEstado', 'menuEstado'],
      ].map(([chave, idBotao, idJanela]) => ({ chave, botao: id(idBotao), janela: id(idJanela) })),
      selo: id('selo-estado'),
      avisoEstado: id('avisoEstado'),
      listaAcervo: id('listaAcervo'),
      listaAtalhos: id('listaAtalhos'),
      avisoAtalho: id('avisoAtalho'),
      btnRestaurarAtalhos: id('btnRestaurarAtalhos'),
      resumoEstado: id('resumoEstado'),
      listaEventos: id('listaEventos'),
      btnLimparEventos: id('btnLimparEventos'),
    },
    barraDasVistas: {
      botoesDeVista: [...documento.querySelectorAll('[data-vista]')],
      btnProjecao: id('btnProjecao'),
      btnEnquadrar: id('btnEnquadrar'),
      btnVisao: id('btnVisao'),
      nomeVisao: id('nomeVisao'),
      menuVisoes: id('menuVisoes'),
    },
    painelComponentes: {
      lista: id('listaPartes'),
      filtro: id('filtroPartes'),
      resumoFiltro: id('resumoFiltro'),
      fixtureAtual: id('fixtureAtual'),
      contagem: id('contagemPartes'),
      btnLimpar: id('btnLimpar'),
      recolher: recolhivel('partes'),
    },
    painelInspecao: {
      abas: [...documento.querySelectorAll('.aba-btn')],
      conteudosDasAbas: {
        inspecao: id('abaConteudoInspecao'),
        parametros: id('abaConteudoParametros'),
        referencias: id('abaConteudoReferencias'),
        anotacoes: id('abaConteudoAnotacoes'),
      },
      prefGrade: id('prefGrade'),
      prefChao: id('prefChao'),
      resumo: id('selecaoResumo'),
      botoesModo: {
        todas: id('btnTodas'),
        contexto: id('btnContexto'),
        isolar: id('btnIsolar'),
      },
      btnWireframeSelecao: id('btnWireframeSelecao'),
      opacidadeSelecao: id('opacidadeSelecao'),
      valorOpacidadeSelecao: id('valorOpacidadeSelecao'),
      explosao: id('explosao'),
      valorExplosao: id('valorExplosao'),
      btnSelecionarConjunto: id('btnSelecionarConjunto'),
      btnFocarSelecao: id('btnFocarSelecao'),
      btnCopiarEstado: id('btnCopiarEstado'),
      btnJuntas: id('btnJuntas'),
      diagnostico: id('diagnostico'),
      portas: id('portasPublicadas'),
      resumoPortas: id('resumoPortas'),
      listaPortas: id('listaPortas'),
      containerReferencias: id('containerReferencias'),
      recolher: recolhivel('inspecao'),
      anotacoes: {
        lista: id('listaAnotacoes'),
        btnAdicionarGeral: id('btnAdicionarAnotacaoGeral'),
        btnAdicionarNaMalha: id('btnAdicionarAnotacao'),
      },
    },
    rodapeJuntas: {
      rodape: id('rodapeJuntas'),
      resumo: id('resumoJuntas'),
      btnSalvar: id('btnSalvarAjusteDeJunta'),
    },
    sessaoAtiva: {
      oferta: id('avisoSessaoNova'),
      btnDemonstracao: id('btnCarregarExemplo'),
      catalogoVazio: id('estadoCatalogoVazio'),
    },
    referenciaMetrica: {
      eixos: id('eixosReferencia'),
      barra: id('barraReferencia'),
      valor: id('valorReferencia'),
    },
  };
}
