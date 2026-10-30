/* estado-central.js — o estado da bancada num lugar só, que os painéis leem e escrevem e cuja mudança eles assinam.
 *
 * Antes deste módulo o estado da tela morava em variáveis soltas de `main.js` (a vista em vigor, o status da sessão, a
 * peça em cena, o modo de juntas), e cada painel era redesenhado por quem lembrasse de chamá-lo. Aqui o estado é um
 * objeto de chaves de primeiro nível; quem muda escreve só as chaves que mudou, e quem desenha assina as chaves que lê.
 *
 * O aviso sai quando o valor da chave muda pela identidade (`Object.is`), e não pela escrita: escrever o mesmo status de
 * sessão duas vezes não redesenha nada. Quem precisa de redesenho a cada escrita escreve um objeto novo, como a seleção,
 * que é a fotografia do controlador das partes a cada mudança.
 *
 * O módulo não conhece o DOM nem a peça: guarda valores e avisa, na ordem em que as assinaturas foram feitas, de forma
 * síncrona, para a tela ficar igual à de quando cada painel era chamado direto. */

/** Cria o estado com os valores `inicial`. Chave que não está em `inicial` não pode ser escrita depois. */
export function criarEstadoCentral(inicial = {}) {
  const valores = { ...inicial };
  const assinaturas = [];

  function definir(parcial) {
    const mudadas = [];
    for (const [chave, valor] of Object.entries(parcial ?? {})) {
      if (!Object.prototype.hasOwnProperty.call(valores, chave)) {
        throw new Error(`estado-central: a chave '${chave}' não existe no estado da bancada.`);
      }
      if (Object.is(valores[chave], valor)) continue;
      valores[chave] = valor;
      mudadas.push(chave);
    }
    if (!mudadas.length) return mudadas;
    /* Cópia da lista: quem cancela a assinatura dentro do aviso não tira o vizinho da rodada em curso. */
    for (const assinatura of assinaturas.slice()) {
      if (!assinatura.ativa) continue;
      if (assinatura.chaves && !mudadas.some((chave) => assinatura.chaves.has(chave))) continue;
      assinatura.aoMudar(valores, mudadas);
    }
    return mudadas;
  }

  /** `chaves` nulo assina tudo. Devolve a função que cancela a assinatura. */
  function assinar(chaves, aoMudar) {
    const assinatura = { chaves: chaves ? new Set(chaves) : null, aoMudar, ativa: true };
    for (const chave of assinatura.chaves ?? []) {
      if (!Object.prototype.hasOwnProperty.call(valores, chave)) {
        throw new Error(`estado-central: não há chave '${chave}' para assinar.`);
      }
    }
    assinaturas.push(assinatura);
    return () => {
      assinatura.ativa = false;
      const indice = assinaturas.indexOf(assinatura);
      if (indice >= 0) assinaturas.splice(indice, 1);
    };
  }

  return {
    /** O objeto vivo dos valores, só para leitura: escrever nele não avisa ninguém. */
    ler: () => valores,
    obter: (chave) => valores[chave],
    definir,
    assinar,
  };
}

/**
 * As chaves do estado da bancada e o valor de cada uma na subida da página. `null` quer dizer "ainda não escrito": o
 * painel que lê a chave não desenha nada até a primeira escrita, e a página fica como o HTML a trouxe.
 */
export function estadoInicialDaBancada({ pecaPedida = null, visao, tema = 'foco' }) {
  return {
    /* verdadeiro até a câmera ser restaurada da URL; enquanto isso a URL não é reescrita */
    inicializando: true,
    vista: 'isometrica',
    projecao: null,
    /* o nome do modelo em cena, e o id que reabre a peça pela URL (`?peca=`), que a sessão enviada pela IA não tem */
    nomePeca: pecaPedida ?? 'sessao-ativa',
    idNaUrl: pecaPedida ?? null,
    rotuloPeca: null,
    aguardandoModelo: false,
    catalogoVazio: false,
    sessao: 'desconectado',
    faceSemIdentidade: 0,
    origem: null,
    /* a fotografia do controlador das partes: selecionadas, modo, explosão, opacidade, wireframe e descendentes */
    selecao: null,
    temHierarquia: null,
    partes: null,
    diagnostico: null,
    portas: null,
    visao,
    /* o tema da tela (`temas/temas.js`), que só decide a aparência e onde cada componente fica */
    tema,
    menuVisoesAberto: false,
    preferenciasCena: null,
    atalhos: null,
    juntas: { modo: false, quantas: 0, mudou: false, rodapeVisivel: false },
    /* a camada de edição de malha ligada (Tab), que a barra do modo de edição mostra */
    malhaEmEdicao: false,
    /* as partes escondidas uma a uma pela árvore */
    ocultas: [],
    /* os painéis do tema que estão abertos, por nome (`partes`, `inspecao`) */
    paineis: {},
    /* a peça e a referência na mesa do tema Revisão: a referência ao lado, sobreposta ou escondida, a vista dela, se a
       câmera da peça segue a da referência, se a câmera está agora na da referência, e a transparência da sobreposta
       (`referencias/referencia-ao-lado.js`) */
    comparacao: { modo: 'ao-lado', vista: null, mesmaCamera: true, alinhada: false, opacidade: 0.5 },
    /* a imagem de referência que a mesa mostra, com as vistas que ela tem, ou null quando a peça não tem imagem */
    imagemDaReferencia: null,
    ofertaDaSessao: null,
    anotacoes: null,
  };
}
