/* imagem-na-cena.js — a imagem de referência da peça posta na cena: o plano, o alinhamento que o painel e o punho escrevem, a imagem que a pasta da peça declara e a troca de peça.
 *
 * Saiu de `main.js` sem mudar de comportamento. O painel das referências (`painel-referencias.js`) recebe o contêiner da
 * aba "Imagem REF" que o mapa de elementos lhe dá; a imagem que chega por URL é lida pelo `carregarImagem` que o componente
 * dos arquivos da página passa, e este módulo não toca a página.
 *
 * A IMAGEM DECLARADA PELA PEÇA NÃO ENTRA NA CENA SOZINHA. Ao abrir o furgão, a folha de quatro vistas que a receita
 * declara virava um plano encostado na lateral, entre a câmera e a peça, e cobria o furgão na vista em que a bancada abre.
 * A folha de vistas não se sobrepõe a modelo nenhum, e uma foto lateral só serve sobreposta quando a pessoa vai alinhar
 * por ela: quem decide é a pessoa. A imagem da peça aparece na aba da referência, com a miniatura e a chave "Na cena", e
 * só vira plano quando a chave é ligada. A imagem que a própria pessoa escolhe entra na cena na hora, porque escolher é o
 * gesto de pedir. Na cena, o plano nasce fora da caixa da peça, atrás dela (`criarAlinhamentoInicial`). A chave e o
 * ajuste ficam guardados no navegador por peça, e a imagem volta à cena na próxima abertura só se estava na cena. */
import * as THREE from 'three';
import { criarGerenciadorReferencias3D } from './prancha-overlay.js';
import { criarPainelReferencias } from './painel-referencias.js';
import { criarPunhoDaImagem } from './punho-da-imagem.js';
import { criarArmazenamentoImagem } from './armazenamento-imagem.js';
import { criarAlinhamentoInicial, imagemAoTrocarDePeca, normalizarImagemReferencia } from './imagem-referencia.js';
import { urlDaReferencia } from './imagens-da-peca.js';

function carregarTexturaDoNavegador(url) {
  return new Promise((resolver, rejeitar) => new THREE.TextureLoader().load(url, resolver, undefined, rejeitar));
}

export function criarImagemNaCena({
  ambiente, canvas, cena, containerReferencias, carregarImagem,
  carregarTextura = carregarTexturaDoNavegador,
  armazenamentoImagem = criarArmazenamentoImagem(),
  urlDaImagemDaPeca = urlDaReferencia,
}) {
  const gerenciadorReferencias3D = criarGerenciadorReferencias3D({ cena: ambiente.scene });
  let alvoReferenciaAtual = null;
  /* As imagens que a peça aberta tem à mão, pelo id: a que a receita declara e a que a pessoa trouxe. No máximo uma
     está na cena; as outras esperam na aba com o último ajuste delas. */
  const imagens = new Map();
  const urlsLocais = new Map();

  const naCenaId = () => gerenciadorReferencias3D.obterImagemReferencia()?.id ?? null;

  /* O arquivo que a pessoa envia vira um endereço local, um por imagem da lista, e trocar o arquivo da mesma imagem
     troca o endereço: o endereço antigo mostraria a foto anterior na miniatura e no plano. */
  function urlDe(entrada) {
    if (!entrada.blob) return entrada.url ?? null;
    const local = urlsLocais.get(entrada.id);
    if (local?.blob === entrada.blob) return local.url;
    esquecerUrlLocal(entrada.id);
    const url = URL.createObjectURL(entrada.blob);
    urlsLocais.set(entrada.id, { blob: entrada.blob, url });
    return url;
  }

  function esquecerUrlLocal(id) {
    if (!urlsLocais.has(id)) return;
    URL.revokeObjectURL(urlsLocais.get(id).url);
    urlsLocais.delete(id);
  }

  function refletirImagens() {
    painelReferencias?.refletirImagens?.();
    punhoDaImagem.refletir();
  }

  /* O registro guardado é o descritor com a chave "Na cena"; o endereço local de um arquivo enviado não sobrevive à
     página, e o arquivo vai junto no registro. */
  async function guardar(descritor, naCena) {
    if (!alvoReferenciaAtual) return;
    await armazenamentoImagem.salvar(alvoReferenciaAtual, { ...descritor, naCena });
  }

  async function colocarNaCena(entrada) {
    if (!cena.modelo || !alvoReferenciaAtual) return null;
    const normalizada = normalizarImagemReferencia({ ...entrada, alinhamento: entrada.alinhamento ?? {} });
    if (!normalizada) return null;
    const id = normalizada.id;
    const url = urlDe({ ...entrada, id });
    if (!url) return null;
    const imagem = await carregarImagem(url).catch(() => null);
    if (!imagem) return null;
    const caixa = cena.caixaDoVisivel();
    const inicial = criarAlinhamentoInicial({ caixa, larguraImagem: imagem.naturalWidth, alturaImagem: imagem.naturalHeight, lado: entrada.alinhamento?.lado });
    const ajustes = Object.fromEntries(Object.entries(entrada.alinhamento ?? {}).filter(([, valor]) => valor !== null));
    const descritor = normalizarImagemReferencia({ ...entrada, url, alinhamento: { ...inicial, ...ajustes } });
    if (!descritor) return null;
    const textura = await carregarTextura(url).catch(() => null);
    if (!textura) return null;
    textura.colorSpace = THREE.SRGBColorSpace;
    gerenciadorReferencias3D.definirImagemReferencia(descritor, { textura, possuiTextura: true });
    const declarada = imagens.get(descritor.id)?.declarada ?? false;
    imagens.set(descritor.id, { ...entrada, ...descritor, declarada });
    /* O painel e o punho só sabem da foto quando alguém avisa: sem isto a miniatura ficava vazia e a chave desligada
       numa bancada que já estava mostrando a referência na cena. */
    painelReferencias?.refletirAlinhamento?.(descritor.alinhamento);
    refletirImagens();
    await guardar(descritor, true);
    return descritor;
  }

  /* Tirar da cena guarda o ajuste em que a imagem estava: ligar a chave de novo a devolve ao mesmo lugar. */
  async function tirarDaCena(id) {
    const atual = gerenciadorReferencias3D.obterImagemReferencia();
    if (!atual || atual.id !== id) return;
    const entrada = imagens.get(id);
    if (entrada) imagens.set(id, { ...entrada, alinhamento: { ...atual.alinhamento } });
    gerenciadorReferencias3D.removerImagemReferencia();
    refletirImagens();
    await guardar(atual, false);
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
    await guardar({ ...atual, alinhamento: atualizado }, true);
  }

  const painelReferencias = criarPainelReferencias({
    container: containerReferencias,
    aoAlternarPrancha: (id, visivel) => gerenciadorReferencias3D.alternarVisibilidade(id, visivel),
    aoGerarPlano: colocarNaCena,
    aoAtualizarAlinhamento: aplicarAlinhamentoDaImagem,
    imagensCarregadas: () => listar(),
    aoMostrarNaCena: async (imagem, ligada) => {
      if (!ligada) { await tirarDaCena(imagem.id); return null; }
      const entrada = imagens.get(imagem.id);
      return entrada ? colocarNaCena(entrada) : null;
    },
    aoRemoverImagem: async (imagem) => {
      const entrada = imagens.get(imagem.id);
      if (naCenaId() === imagem.id) gerenciadorReferencias3D.removerImagemReferencia();
      /* A imagem da peça é da receita e continua oferecida, sem o ajuste; a que a pessoa trouxe sai da lista. */
      if (entrada?.declarada) imagens.set(imagem.id, { fonte: entrada.fonte, id: entrada.id, url: entrada.url, rotulo: entrada.rotulo, declarada: true });
      else { imagens.delete(imagem.id); esquecerUrlLocal(imagem.id); }
      refletirImagens();
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

  /** As imagens da peça para a aba, a que está na cena primeiro. */
  function listar() {
    const naCena = naCenaId();
    return [...imagens.values()]
      .map((entrada) => ({ id: entrada.id, url: urlDe(entrada), rotulo: entrada.rotulo, declarada: Boolean(entrada.declarada), naCena: entrada.id === naCena }))
      .sort((a, b) => Number(b.naCena) - Number(a.naCena));
  }

  /* A imagem vem da PASTA DA PEÇA, e não de uma cópia em `public/`. A receita
     declara quais imagens são dela, e a primeira declarada que for imagem é a
     oferecida. Antes disso a foto vinha do estado local da sessão, que não é
     versionado: quem abrisse a peça num navegador limpo não via referência
     nenhuma e não tinha como descobrir que ela existia. Oferecer é pôr na aba,
     e não na cena. */
  function oferecerSobreposicaoDaPeca(peca, receita) {
    const declaradas = receita?.PLANO?.referencias ?? [];
    /* A imagem chamada `sobreposicao` vem primeiro quando existe. Sem isso, a
       escolha caía na ordem da lista do plano, e mudar a ordem das referências
       — que é decisão de leitura, não de bancada — trocaria a imagem oferecida. */
    const ordenadas = [...declaradas].sort(
      (a, b) => Number(/sobreposicao/i.test(b)) - Number(/sobreposicao/i.test(a)),
    );
    for (const referencia of ordenadas) {
      const url = urlDaImagemDaPeca(peca, referencia);
      if (!url) continue;
      const id = `${peca}:${referencia}`;
      imagens.set(id, { ...(imagens.get(id) ?? {}), fonte: 'url', id, url, rotulo: referencia, declarada: true });
      refletirImagens();
      return;
    }
  }

  return {
    gerenciador: gerenciadorReferencias3D,
    painel: painelReferencias,
    punho: punhoDaImagem,
    oferecerSobreposicaoDaPeca,
    /** Liga ou desliga a imagem `id` na cena, como a chave "Na cena" da aba. */
    mostrarNaCena: (id, ligada) => (ligada ? (imagens.has(id) ? colocarNaCena(imagens.get(id)) : null) : tirarDaCena(id)),
    /** A peça da sessão mudou (`novoModelo`) ou não: as imagens da peça anterior saem da cena e da aba, e a chave passa à nova. */
    trocarDePeca(estadoDaSessao, novoModelo) {
      if (novoModelo) {
        const troca = imagemAoTrocarDePeca({
          chaveAnterior: alvoReferenciaAtual,
          peca: novoModelo.nome,
          alvo: estadoDaSessao.alvo?.id,
          imagemNaCena: Boolean(gerenciadorReferencias3D.obterImagemReferencia()),
        });
        if (troca.tirarDaCena) gerenciadorReferencias3D.removerImagemReferencia();
        if (troca.chave !== alvoReferenciaAtual) {
          for (const id of urlsLocais.keys()) esquecerUrlLocal(id);
          imagens.clear();
        }
        alvoReferenciaAtual = troca.chave;
        refletirImagens();
      } else {
        alvoReferenciaAtual = alvoReferenciaAtual ?? estadoDaSessao.alvo?.id ?? null;
      }
    },
    /** A imagem que esta peça tinha da última vez, guardada no navegador, volta à aba, e à cena se estava nela. */
    async restaurarDaPeca() {
      const salva = alvoReferenciaAtual ? await armazenamentoImagem.ler(alvoReferenciaAtual) : null;
      if (!salva?.id) return;
      const { naCena, ...entrada } = salva;
      imagens.set(entrada.id, { ...entrada, declarada: imagens.get(entrada.id)?.declarada ?? false });
      /* Só a chave ligada devolve a imagem à cena. O registro sem a chave é de antes dela, quando a imagem da peça
         entrava sozinha, e não diz que a pessoa a quis ali. */
      if (naCena === true) await colocarNaCena(imagens.get(entrada.id));
      else refletirImagens();
    },
    /** A imagem como está na cena, ou a oferecida fora dela, para a ponte da captura. */
    descreverNaCena() {
      const descritor = gerenciadorReferencias3D.obterImagemReferencia();
      if (!descritor) {
        const oferecida = [...imagens.values()].sort((a, b) => Number(Boolean(b.declarada)) - Number(Boolean(a.declarada)))[0];
        return oferecida ? {
          id: oferecida.id, rotulo: oferecida.rotulo, url: oferecida.url ?? null,
          naCena: false, visivel: false, comTextura: false, largura: null, altura: null,
        } : null;
      }
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
  };
}
