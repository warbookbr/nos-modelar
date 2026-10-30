/* imagem-na-cena.js — a imagem de referência da peça posta na cena: o plano, o alinhamento que o painel e o punho escrevem, a imagem que a pasta da peça declara e a troca de peça.
 *
 * Saiu de `main.js` sem mudar de comportamento. O painel das referências (`painel-referencias.js`) recebe o contêiner da
 * aba "Imagem REF" que o mapa de elementos lhe dá; a imagem que chega por URL é lida pelo `carregarImagem` que o componente
 * dos arquivos da página passa, e este módulo não toca a página. */
import * as THREE from 'three';
import { criarGerenciadorReferencias3D } from './prancha-overlay.js';
import { criarPainelReferencias } from './painel-referencias.js';
import { criarPunhoDaImagem } from './punho-da-imagem.js';
import { criarArmazenamentoImagem } from './armazenamento-imagem.js';
import { criarAlinhamentoInicial, imagemAoTrocarDePeca, normalizarImagemReferencia } from './imagem-referencia.js';
import { urlDaReferencia } from './imagens-da-peca.js';

export function criarImagemNaCena({ ambiente, canvas, cena, containerReferencias, carregarImagem }) {
  const gerenciadorReferencias3D = criarGerenciadorReferencias3D({ cena: ambiente.scene });
  const armazenamentoImagem = criarArmazenamentoImagem();
  let alvoReferenciaAtual = null;
  let urlLocalReferencia = null;

  async function gerarPlanoReferencia(entrada) {
    if (!cena.modelo || !alvoReferenciaAtual) return null;
    if (urlLocalReferencia) { URL.revokeObjectURL(urlLocalReferencia); urlLocalReferencia = null; }
    const url = entrada.blob ? (urlLocalReferencia = URL.createObjectURL(entrada.blob)) : entrada.url;
    if (!url) return null;
    const imagem = await carregarImagem(url).catch(() => null);
    if (!imagem) return null;
    const caixa = cena.caixaDoVisivel();
    const inicial = criarAlinhamentoInicial({ caixa, larguraImagem: imagem.naturalWidth, alturaImagem: imagem.naturalHeight, lado: entrada.alinhamento?.lado });
    const ajustes = Object.fromEntries(Object.entries(entrada.alinhamento ?? {}).filter(([, valor]) => valor !== null));
    const descritor = normalizarImagemReferencia({ ...entrada, url, alinhamento: { ...inicial, ...ajustes } });
    if (!descritor) return null;
    const textura = await new Promise((resolver, rejeitar) => new THREE.TextureLoader().load(url, resolver, undefined, rejeitar)).catch(() => null);
    if (!textura) return null;
    textura.colorSpace = THREE.SRGBColorSpace;
    gerenciadorReferencias3D.definirImagemReferencia(descritor, { textura, possuiTextura: true });
    /* O painel e o punho só sabem da foto quando alguém avisa. A imagem também
       chega sozinha, declarada pela peça, e sem este aviso a miniatura ficava
       vazia numa bancada que já estava mostrando a referência na cena. */
    painelReferencias?.refletirAlinhamento?.(descritor.alinhamento);
    punhoDaImagem.refletir();
    await armazenamentoImagem.salvar(alvoReferenciaAtual, descritor);
    return descritor;
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
    await armazenamentoImagem.salvar(alvoReferenciaAtual, { ...atual, alinhamento: atualizado });
  }

  const painelReferencias = criarPainelReferencias({
    container: containerReferencias,
    aoAlternarPrancha: (id, visivel) => gerenciadorReferencias3D.alternarVisibilidade(id, visivel),
    aoGerarPlano: gerarPlanoReferencia,
    aoAtualizarAlinhamento: aplicarAlinhamentoDaImagem,
    imagensCarregadas: () => {
      const atual = gerenciadorReferencias3D.obterImagemReferencia();
      return atual?.url ? [atual] : [];
    },
    aoRemoverImagem: async () => {
      gerenciadorReferencias3D.removerImagemReferencia();
      punhoDaImagem.refletir();
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

  return {
    gerenciador: gerenciadorReferencias3D,
    painel: painelReferencias,
    punho: punhoDaImagem,
    oferecerSobreposicaoDaPeca,
    /** A peça da sessão mudou (`novoModelo`) ou não: a imagem da peça anterior sai da cena e a chave passa à nova. */
    trocarDePeca(estadoDaSessao, novoModelo) {
      if (novoModelo) {
        const troca = imagemAoTrocarDePeca({
          chaveAnterior: alvoReferenciaAtual,
          peca: novoModelo.nome,
          alvo: estadoDaSessao.alvo?.id,
          imagemNaCena: Boolean(gerenciadorReferencias3D.obterImagemReferencia()),
        });
        if (troca.tirarDaCena) {
          gerenciadorReferencias3D.removerImagemReferencia();
          punhoDaImagem.refletir();
        }
        alvoReferenciaAtual = troca.chave;
      } else {
        alvoReferenciaAtual = alvoReferenciaAtual ?? estadoDaSessao.alvo?.id ?? null;
      }
    },
    /** A imagem que esta peça tinha da última vez, guardada no navegador, volta para a cena. */
    async restaurarDaPeca() {
      const salva = alvoReferenciaAtual ? await armazenamentoImagem.ler(alvoReferenciaAtual) : null;
      if (salva) await gerarPlanoReferencia(salva);
    },
    /** A imagem como está na cena, para a ponte da captura. */
    descreverNaCena() {
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
  };
}
