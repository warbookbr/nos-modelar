/* ponte-da-captura.js — `window.__mecanificaBancada`, o contrato fixo pelo qual a captura automática, as guardas e a revisão headless leem e dirigem a bancada.
 *
 * A superfície é a mesma de quando a ponte morava no fim de `main.js`, chave por chave, e `CHAVES_DA_PONTE` a lista para
 * o teste conferir que nenhuma sumiu: os consumidores (`olhar-bancada`, as guardas de `tools/modelar/guardas/`) chamam
 * estes nomes de fora do repositório da página, e uma chave perdida só aparece quando um deles quebra. */

export const CHAVES_DA_PONTE = Object.freeze([
  'ready', 'peca', 'pecasDisponiveis', 'nomePeca', 'carregado', 'partes', 'estatisticas', 'imagemReferencia',
  'diagnosticos', 'selecaoIgnorada', 'controlador', 'ambiente', 'edicaoDeMalha', 'edicaoDeMalhaDesenhaMalha',
  'sincronizador', 'selecionar', 'modo', 'vista', 'projecao', 'explosao', 'focar', 'focarContato', 'inspecionarPar',
  'enquadrar', 'enquadramento', 'auditoria', 'semAuditoria', 'carregarPayloadSessao', 'estado', 'marcadoresDePar', 'url',
]);

export function criarPonteDaCaptura({
  estado, pecasDisponiveis, cena, ambiente, edicao, imagemNaCena, sincronizador, seletorDeVisao, parametros, corpo,
  endereco,
}) {
  return {
    ready: true,
    peca: () => estado.obter('nomePeca'),
    pecasDisponiveis,
    /* Leitura headless (olhar-bancada / renderizar_vistas).
       São GETTERS, não valores fixos: a ponte é montada uma vez no fim da
       inicialização, mas o modelo troca depois — a peça da sessão ativa chega
       pelo polling do sincronizador, segundos após a página subir. Como
       valores congelados, `estatisticas` era sempre null e a revisão visual
       quebrava em TODA peça, de fixture a sessão. */
    get nomePeca() { return estado.obter('nomePeca'); },
    get carregado() { return cena.modelo !== null; },
    get partes() {
      if (!cena.modelo) return [];
      return [...cena.modelo.partes.keys()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    },
    get estatisticas() { return cena.modelo?.estatisticas ?? null; },
    /* A imagem de referência COMO ESTÁ NA CENA, e não a requisição que a
       trouxe. A guarda da pasta da peça afirmava só que o navegador pediu o
       arquivo e recebeu 200; com isso, a sobreposição podia falhar em virar
       plano na cena — textura recusada, alinhamento inválido, malha não
       adicionada — e a prova continuaria verde. É a mesma classe de defeito que
       o painel de portas já teve: verde pelo motivo errado. */
    get imagemReferencia() { return imagemNaCena.descreverNaCena(); },
    get diagnosticos() {
      if (!cena.modelo) return null;
      return { facesSemParte: cena.modelo.medida?.facesSemParte ?? [] };
    },
    get selecaoIgnorada() {
      const controlador = cena.controlador;
      if (!controlador) return [];
      const pedidas = (parametros.get('selecionadas') ?? '').split(',').map((n) => n.trim()).filter(Boolean);
      const conhecidas = new Set(controlador.nomes);
      return pedidas.filter((nome) => !conhecidas.has(nome));
    },
    controlador: () => cena.controlador,
    ambiente: () => ambiente,
    /* O estado da edição de malha, para a guarda de navegador poder afirmar o
       que a pessoa vê: modo corrente, quantos itens selecionados e se um
       movimento está em curso. Sem isto a guarda teria de adivinhar a seleção
       pela cor dos pontos desenhados. */
    edicaoDeMalha: () => edicao.camada?.estado?.() ?? null,
    edicaoDeMalhaDesenhaMalha: () => Boolean(edicao.camada?.desenhaMalha),
    sincronizador: () => sincronizador,
    selecionar: (nomes) => cena.controlador?.selecionarMuitas(Array.isArray(nomes) ? nomes : [nomes]),
    modo: (modo) => cena.controlador?.definirModo(modo),
    vista: (vista) => ambiente.definirVista(vista),
    projecao: (projecao) => ambiente.definirProjecao(projecao),
    explosao: (valor) => cena.controlador?.definirExplosao(valor),
    focar: () => cena.focarSelecao(),
    focarContato: (nomes) => cena.focarContato(nomes),
    inspecionarPar: (nomes) => cena.inspecionarPar(nomes),
    enquadrar: () => cena.enquadrarMontagem(),
    /* Métrica de câmera consumida pela revisão headless: a bancada já sabe
       medir a silhueta projetada; faltava publicar isso na ponte. */
    enquadramento: () => ambiente.medirEnquadramento(),
    /* AUDITORIA — a imagem feita para ser lida, não para ser usada.
       Tira o cromo da interface, o piso, a grade e a sombra, e opcionalmente
       pinta uma cor por parte. Devolve a LEGENDA, porque imagem colorida sem
       legenda troca um problema de leitura por outro: quem audita precisa saber
       qual cor é qual peça sem deduzir pela posição. */
    auditoria: ({ cores = false, arame = false } = {}) => {
      const controlador = cena.controlador;
      corpo.classList.add('auditoria');
      ambiente.definirAuditoria(true);
      const legenda = controlador?.definirCoresPorParte(cores) ?? [];
      /* A captura escolhe o arame por conta própria e não herda a visão que a
         pessoa deixou escolhida: o seletor fica suspenso até `semAuditoria`. */
      seletorDeVisao.suspender();
      controlador?.definirArame?.(arame);
      controlador?.definirAuditoria?.(true);
      ambiente.redimensionar?.();
      return { auditoria: true, cores: Boolean(cores), arame: Boolean(arame), legenda };
    },
    semAuditoria: () => {
      const controlador = cena.controlador;
      corpo.classList.remove('auditoria');
      ambiente.definirAuditoria(false);
      controlador?.definirCoresPorParte(false);
      controlador?.definirArame?.(false);
      controlador?.definirAuditoria?.(false);
      seletorDeVisao.retomar();
      ambiente.redimensionar?.();
      return { auditoria: false };
    },
    carregarPayloadSessao: (payload) => sincronizador.definirPayload(payload),
    estado: () => ({
      peca: estado.obter('nomePeca'),
      ...(cena.controlador ? cena.controlador.estado() : {}),
      vista: estado.obter('vista'),
      projecao: ambiente.projecao,
      cameraLivre: ambiente.cameraLivre(),
      /* `inspecao` também sumiu no PR #58. Sem ela, recarregar um link de par
         devolvia um estado que PARECIA certo — seleção e modo corretos — sem
         dizer que aquilo é uma inspeção de par, que é o que o consumidor usa
         para saber se a marca na tela corresponde ao que a URL prometeu. */
      inspecao: cena.parInspecionado ? 'par' : null,
    }),
    /* Também perdida no PR #58, e é o que o gate usa para provar que a
       inspeção deixou marca visível em vez de só devolver números. */
    marcadoresDePar: () => cena.marcadoresDoPar,
    url: () => endereco.href(),
  };
}

/** Publica a ponte na janela, que é onde os consumidores a procuram. */
export function publicarPonte(ponte, janela = globalThis) {
  janela.__mecanificaBancada = ponte;
}
