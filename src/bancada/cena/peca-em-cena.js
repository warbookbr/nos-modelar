/* peca-em-cena.js — a peça que está na cena da bancada: o modelo, o controlador das partes, a seleção por raycast, os enquadramentos e o estado escrito na URL.
 *
 * Saiu de `main.js` sem mudar de comportamento. O módulo não toca a página: o que a tela mostra da peça (a lista de
 * componentes, o diagnóstico, as portas, o resumo da seleção) ele escreve no estado central, e os painéis desenham; o
 * endereço da página ele escreve pelo componente do endereço. A edição da peça (juntas e malha) vive em
 * `edicao-da-peca.js` e entra aqui pelos ganchos de `aplicarModelo`, na mesma ordem em que o corpo único a chamava. */
import * as THREE from 'three';
import { caixaDoVisivel, posicionarNoEstudio } from '../criar-ambiente.js';
import { criarControladorPartes } from '../controlar-partes.js';
import { criarSelecaoBancada } from '../criar-selecao.js';
import { alvosDeEnquadramento, escreverEstadoNaUrl, lerEstadoDaUrl } from '../estado-bancada.js';
import { formatarNome } from '../formatar.js';

function mesmosNomes(a, b) {
  return a.length === b.length && a.every((nome, indice) => nome === b[indice]);
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

/**
 * `edicao` é lido na hora de cada chamada (`() => edicao`), porque a edição da peça é criada depois da cena e precisa dela.
 * `parametros` é o `URLSearchParams` da página na subida, de onde vem a seleção pedida na URL.
 */
export function criarPecaEmCena({
  ambiente, canvas, estado, registroDeEventos, seletorDeVisao, parametros, endereco, edicao = () => null,
}) {
  let controlador = null;
  let selecao3d = null;
  let parInspecionado = null;
  let modeloAtual = null;
  const marcadoresDoPar = [];
  /* Valem para a peça, e não para o controlador, que é refeito a cada junta
     arrastada: as partes escondidas pela árvore e a tinta da seleção, que o
     tema desliga quando marca a seleção pelo contorno. */
  let ocultas = [];
  let tintaDaSelecao = true;

  /** O tamanho e as faces de `grupos`, nas unidades da peça (metros), sem a escala que a pôs no estúdio. */
  function medidasDe(grupos) {
    if (!modeloAtual || !grupos.length) return null;
    const caixa = caixaDoVisivel(grupos);
    if (caixa.isEmpty()) return null;
    const escala = modeloAtual.raiz.getWorldScale(new THREE.Vector3()).x || 1;
    const tamanho = caixa.getSize(new THREE.Vector3()).divideScalar(escala);
    const faces = grupos.reduce((soma, grupo) => soma + (grupo.userData?.faces?.length ?? 0), 0);
    return { tamanho: tamanho.toArray(), faces };
  }

  /* A caixa da seleção vista pela câmera, em coordenadas normalizadas da tela
     (de -1 a 1, y para cima), para o cartão da seleção ficar ao lado da parte.
     Nula sem seleção à vista ou com a caixa atrás da câmera. */
  function caixaDaSelecaoNaTela() {
    if (!controlador || !modeloAtual) return null;
    const grupos = controlador.gruposSelecionadosVisiveis();
    if (!grupos.length) return null;
    const caixa = caixaDoVisivel(grupos);
    if (caixa.isEmpty()) return null;
    const minimo = new THREE.Vector2(Infinity, Infinity);
    const maximo = new THREE.Vector2(-Infinity, -Infinity);
    const canto = new THREE.Vector3();
    for (let i = 0; i < 8; i += 1) {
      canto.set(i & 1 ? caixa.max.x : caixa.min.x, i & 2 ? caixa.max.y : caixa.min.y, i & 4 ? caixa.max.z : caixa.min.z);
      canto.project(ambiente.camera);
      if (canto.z > 1) return null;
      minimo.min(canto);
      maximo.max(canto);
    }
    return { esquerda: minimo.x, direita: maximo.x, base: minimo.y, topo: maximo.y };
  }

  function definirOcultas(nomes) {
    ocultas = controlador ? controlador.definirOcultas(nomes) : [];
    estado.definir({ ocultas });
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

  function salvarEstadoNaUrl(estadoDasPartes) {
    const { inicializando, nomePeca, idNaUrl, vista } = estado.ler();
    if (inicializando || !nomePeca) return;
    const saida = new URLSearchParams();
    if (idNaUrl) saida.set('peca', idNaUrl);
    const estadoDaVista = escreverEstadoNaUrl({
      ...estadoDasPartes,
      vista,
      projecao: ambiente.projecao,
      cameraLivre: ambiente.cameraLivre(),
      inspecao: parInspecionado ? 'par' : null,
    });
    for (const [chave, valor] of new URLSearchParams(estadoDaVista)) saida.set(chave, valor);
    endereco.escrever(saida.toString());
  }

  /* A fotografia da seleção que os painéis desenham. É um objeto novo a cada
     mudança do controlador, então o estado central avisa toda vez, como o
     corpo único redesenhava os painéis a cada chamada. */
  function refletirEstado(estadoDasPartes) {
    if (!controlador) return;
    if (parInspecionado && (estadoDasPartes.modo !== 'isolar' || !mesmosNomes(estadoDasPartes.selecionadas, parInspecionado))) {
      limparMarcadoresDoPar();
    }
    edicao()?.prepararMoverParte(estadoDasPartes.selecionadas);
    estado.definir({
      selecao: {
        ...estadoDasPartes,
        temDescendentes: estadoDasPartes.selecionadas.length > 0 && controlador.temDescendentesNaSelecao(),
      },
    });
    ambiente.definirExplosao(estadoDasPartes.explosao);
    salvarEstadoNaUrl(estadoDasPartes);
  }

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

  /* Onde a peça foi encaixada no estúdio, para a prévia não reencaixar.
     `posicionarNoEstudio` centraliza e redimensiona para caber num tamanho fixo,
     então qualquer mudança de parâmetro que altere a caixa da peça movia TODAS
     as partes: um arrasto de seta de 120 px chegou a deslocar as oito partes da
     bicicleta os mesmos 51,9 mm, juntas, e o movimento pedido pelo gesto ficava
     brigando com esse reencaixe. Enquanto a mesma peça está na tela, a colocação
     em vigor é reaproveitada; peça nova encaixa de novo. */
  let colocacaoNoEstudio = null;

  function colocarNoEstudio(convertido) {
    const peca = convertido.nome ?? 'sessao-ativa';
    if (colocacaoNoEstudio && colocacaoNoEstudio.peca === peca) {
      convertido.raiz.position.fromArray(colocacaoNoEstudio.posicao);
      convertido.raiz.scale.setScalar(colocacaoNoEstudio.escala);
      convertido.raiz.updateMatrixWorld(true);
      return;
    }
    posicionarNoEstudio(convertido.raiz);
    colocacaoNoEstudio = {
      peca,
      posicao: convertido.raiz.position.toArray(),
      escala: convertido.raiz.scale.x,
    };
  }

  function aplicarModelo(convertido, { preservarCamera = false, deAjuste = false } = {}) {
    if (modeloAtual) {
      modeloAtual.raiz.removeFromParent();
      limparMarcadoresDoPar();
      if (controlador) controlador.destruir();
      if (selecao3d) selecao3d.destruir();
      edicao()?.antesDeTrocarDeModelo();
    }

    modeloAtual = convertido;
    estado.definir({ nomePeca: convertido.nome ?? 'sessao-ativa' });

    /* A base do ajuste é a peça COMO ELA VEIO DO ARQUIVO. Uma reconstrução
       causada pelo próprio arrasto não vira base nova: se virasse, cada
       movimento do ponteiro passaria a contar a partir do movimento anterior e
       o deslocamento acumulado dobraria a cada quadro. */
    if (!deAjuste) edicao()?.receberPecaDoArquivo(convertido);
    estado.definir({ rotuloPeca: formatarNome(convertido.rotulo) });
    registroDeEventos.registrar('informacao', 'Peça carregada', formatarNome(convertido.rotulo));

    colocarNoEstudio(convertido);
    ambiente.scene.add(convertido.raiz);

    if (!preservarCamera) {
      ambiente.definirObjeto(convertido.raiz);
    }

    estado.definir({ catalogoVazio: false });

    controlador = criarControladorPartes({
      raiz: convertido.raiz,
      partes: convertido.partes,
      hierarquia: convertido.raiz.userData?.hierarquia,
      aoMudar: refletirEstado,
      aoEstabilizarExplosao(_estado, { enquadrar = true } = {}) {
        if (enquadrar) ambiente.enquadrar(controlador.gruposVisiveis());
      },
    });

    edicao()?.criarCamadaDoModelo(convertido, { deAjuste });
    /* Peça nova volta com todas as partes à vista; a reconstrução pelo ajuste mantém as escondidas. */
    if (!deAjuste) ocultas = [];
    if (ocultas.length) ocultas = controlador.definirOcultas(ocultas);
    if (!tintaDaSelecao) controlador.definirTintaDaSelecao(false);
    estado.definir({ ocultas });

    estado.definir({ temHierarquia: controlador.temHierarquia() });

    /* SELEÇÃO DA URL, reaplicada aqui. `lerEstadoDaUrl` roda uma vez na subida
       da página, quando o controlador ainda pode não existir — a peça da sessão
       ativa chega segundos depois pelo polling — e ali `nomesDisponiveis` é uma
       lista vazia, então toda seleção pedida na URL é descartada em silêncio.
       O sintoma: recarregar um link de inspeção devolvia a montagem inteira,
       sem seleção, sem isolamento e sem os contornos do par. É o que o gate
       `guarda:par` cobra e é a mesma raiz do argumento `--selecionadas` que o
       `olhar-bancada` precisava reaplicar pela ponte. */
    const daUrl = lerEstadoDaUrl(parametros, controlador.nomes);
    if (daUrl.selecionadas.length) {
      controlador.selecionarMuitas(daUrl.selecionadas);
      controlador.definirModo(daUrl.modo);
      if (daUrl.inspecao === 'par' && daUrl.selecionadas.length === 2) {
        marcarParInspecionado(daUrl.selecionadas);
      }
    }

    /* A lista de componentes é um objeto novo a cada modelo, inclusive na
       reconstrução por ajuste, porque o painel limpa o filtro a cada uma. */
    estado.definir({
      partes: controlador.nomes.map((nome) => {
        const grupo = convertido.partes.get(nome);
        return { nome, pai: grupo?.userData?.paiSemantico ?? null, faces: grupo?.userData?.faces?.length ?? 0 };
      }),
    });

    /* A integridade semântica não ocupa mais espaço fixo no alto da tela. Ela
       continua no bloco de diagnóstico da aba Inspeção, com detalhe, e vira
       aviso visível apenas quando há face sem parte. */
    const semParte = convertido.medida?.facesSemParte?.length ?? 0;
    estado.definir({ faceSemIdentidade: semParte });
    if (semParte) registroDeEventos.registrar('alerta', `${semParte} faces sem identidade`, formatarNome(convertido.rotulo));
    estado.definir({
      diagnostico: { semParte, componentes: convertido.medida?.partes?.size ?? controlador.nomes.length },
      portas: convertido.medida?.portas ?? [],
    });

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

    seletorDeVisao.prender({ grupo: convertido.raiz, controlador, ambiente, modelo: convertido });
    refletirEstado(controlador.estado());
  }

  return {
    get modelo() { return modeloAtual; },
    get controlador() { return controlador; },
    get parInspecionado() { return parInspecionado; },
    get marcadoresDoPar() { return marcadoresDoPar.length; },
    aplicarModelo,
    salvarEstadoNaUrl,
    focarSelecao,
    focarContato,
    definirOcultas,
    alternarOculta(nome) {
      definirOcultas(ocultas.includes(nome) ? ocultas.filter((outra) => outra !== nome) : [...ocultas, nome]);
    },
    definirTintaDaSelecao(ligada) {
      tintaDaSelecao = Boolean(ligada);
      controlador?.definirTintaDaSelecao(tintaDaSelecao);
    },
    caixaDaSelecaoNaTela,
    medidasDaSelecao: () => (controlador ? medidasDe(controlador.gruposSelecionados()) : null),
    medidasDaPeca: () => (controlador ? medidasDe(controlador.nomes.map((nome) => controlador.grupoDe(nome)).filter(Boolean)) : null),
    gruposDoContorno: () => controlador?.gruposSelecionadosVisiveis() ?? [],
    inspecionarPar,
    enquadrarMontagem,
    caixaDoVisivel: () => (modeloAtual ? caixaDoVisivel([modeloAtual.raiz]) : null),
    /* Abrir é peça nova mesmo quando é a mesma peça: quem abre espera vê-la
       enquadrada, e não na colocação herdada da sessão anterior. */
    esquecerColocacao() { colocacaoNoEstudio = null; },
    destruir() {
      if (selecao3d) selecao3d.destruir();
      edicao()?.destruir();
      if (controlador) controlador.destruir();
      limparMarcadoresDoPar();
    },
  };
}
