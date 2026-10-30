/* edicao-da-peca.js — o que a pessoa desenha na peça da bancada: o ajuste por junta, a edição de malha, o desfazer e o alvo que sai para a rodada de absorção.
 *
 * Saiu de `main.js` sem mudar de comportamento. O módulo não toca a página: o rodapé das juntas e o botão do modo leem
 * o estado `juntas` do estado central, que este módulo escreve a cada reflexo, e o arquivo do alvo sai pelo `baixar`
 * que o rodapé lhe passa. A peça em cena (`peca-em-cena.js`) chama os três ganchos de `aplicarModelo` na ordem em que o
 * corpo único fazia cada coisa: `antesDeTrocarDeModelo`, `receberPecaDoArquivo` e `criarCamadaDoModelo`. */
import * as THREE from 'three';
import { aplicarAjusteDeJunta, detectarJuntas } from '../../autoria/ajuste-de-junta.js';
import { capturarAlvo } from '../../autoria/alvo-do-ajuste.js';
import { descreverGesto } from '../../autoria/descricao-do-gesto.js';
import { adaptarThree } from '../../autoria/adaptar-three.js';
import { caixasPorParte, portasPublicadas } from '../../autoria/descrever-partes.js';
import { apagar, criarFace, duplicar, escalar, extrudar, rotacionar } from '../../autoria/topologia-da-malha.js';
import { criarPunhosDeJunta } from '../controles/punhos-de-junta.js';
import { criarHistoricoParametros } from '../controles/historico-parametros.js';
import { criarCamadaEdicaoDeMalha } from '../edicao-de-malha.js';

/* `portas` segue junto, sem cópia: é o contrato que a receita declarou (id, rótulo,
   operação de origem), não geometria, e deformar ou editar a malha não o altera.
   Sem ele, `neutroDoArquivo` e tudo o que se reconstrói a partir dele publicavam
   lista vazia, e o painel de portas sumia depois do primeiro gesto. */
export const fotografarMalha = (neutro) => ({
  V: new Map([...neutro.V].map(([id, p]) => [id, [...p]])),
  F: new Map([...neutro.F].map(([id, f]) => [id, { ...f, vs: [...f.vs] }])),
  ...(neutro.portas === undefined ? {} : { portas: neutro.portas }),
});

/** Se a malha na tela deixou de ser a do arquivo: vértice movido, vértice ou face a mais ou a menos. */
export function malhaMudouDesdeOArquivo(neutroDoArquivo, malha) {
  if (!neutroDoArquivo || !malha) return false;
  if (malha.F.size !== neutroDoArquivo.F.size || malha.V.size !== neutroDoArquivo.V.size) return true;
  for (const [id, ponto] of malha.V) {
    const original = neutroDoArquivo.V.get(id);
    if (!original) return true;
    for (let i = 0; i < 3; i += 1) if (Math.abs(ponto[i] - original[i]) > 1e-9) return true;
  }
  for (const id of malha.F.keys()) if (!neutroDoArquivo.F.has(id)) return true;
  return false;
}

/* O que o controlador de câmera usa fora do modo de edição, guardado para ser
   devolvido na saída. */
const BOTOES_DE_CAMERA_PADRAO = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };

/* TOPOLOGIA. Extrudar, duplicar, apagar e criar face mudam as FACES, e não só
   as posições — a malha desenhada precisa ser reconstruída, e a camada de
   edição só sabe mexer em posição. Por isso a operação roda aqui: pega a malha
   viva da camada, chama a conta no núcleo, reconstrói o modelo e recria a
   camada com a seleção que a operação produziu.
   Girar e escalar não mudam topologia, mas passam pelo mesmo caminho: é um
   estado novo da malha, e tratar os dois iguais evita dois desfazeres
   diferentes para gestos que a pessoa vê como um só. */
const OPERACOES_DE_MALHA = { extrudar, duplicar, apagar, criarFace };

export function criarEdicaoDaPeca({
  ambiente, canvas, estado, registroDeEventos, cena, avisar, receitaDeOrigem,
}) {
  /* PARÂMETRO SAIU DA BANCADA. A aba de parâmetros, as setas por eixo e o botão
     de gravar existiam para a pessoa digitar um número medido da receita sem
     abrir código. Na prática o autor não os usava, e a IA nunca usou o painel —
     ela edita o arquivo da receita direto, onde vê o contexto inteiro. Dois
     caminhos para a mesma coisa, um deles sem uso, e os dois disputando a tela
     com o gizmo de mover.
     Agora a bancada é o lugar de desenhar, e o número medido é assunto da
     receita. O que a pessoa desenha sai como alvo e a rodada de absorção
     escreve. O histórico continua aqui porque o Ctrl+Z da malha usa ele. */
  /* A malha como ela veio do arquivo. É o piso do desfazer: Ctrl+Z devolve o que
     esta sessão desenhou e para aqui, porque abaixo disto não existe estado
     anterior que ela tenha produzido.
     Guarda `V` E `F`, e não só as posições. Enquanto o gesto era só mover, as
     faces nunca mudavam e o desfazer podia trocar coordenadas no lugar. Com
     extrudar e apagar, desfazer sem as faces devolvia a peça sem a parte que a
     pessoa tinha acabado de recuperar — medido: apagar o tubo do selim e
     desfazer deixava a peça com sete partes. */
  let origemDaMalha = null;
  let edicaoDeMalha = null;

  /* AJUSTE DE JUNTA — o gesto que não passa por parâmetro.
   *
   * A seta acima escreve um número declarado no instante do arrasto, e num
   * quadro em treliça isso não alcança o que a pessoa quer: puxar o balanço
   * pelo comprimento estica os quatro balanços, porque todos terminam no mesmo
   * eixo traseiro. Aqui a pessoa pega o canto e arrasta. A malha deforma, a
   * receita não é tocada, e o que fica guardado é um deslocamento por junta.
   *
   * Quem transforma esse deslocamento em receita organizada é a rodada de
   * absorção, que lê o alvo salvo. Durante o gesto ninguém precisa saber que
   * número existe. */
  let neutroDoArquivo = null;
  let juntasDaPeca = null;
  let materiaisDaPeca = {};
  const ajustesDeJunta = new Map();
  /* O fundo da pilha do desfazer para as juntas: nenhuma puxada. */
  const ORIGEM_DAS_JUNTAS = [];
  let arrastoDeJunta = null;
  let modoJuntas = false;

  const historicoParametros = criarHistoricoParametros({
    valorDeOrigem: (chave) => {
      if (chave === '__edicao_de_malha__') return origemDaMalha;
      /* Sem junta puxada é o fundo da pilha do ajuste por junta: desfazer além
         daí não inventa deslocamento que ninguém fez. */
      if (chave === '__ajuste_de_junta__') return ORIGEM_DAS_JUNTAS;
      return undefined;
    },
  });

  const somar = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const nomePecaAtual = () => estado.obter('nomePeca');

  const punhosDeJunta = criarPunhosDeJunta({
    cena: ambiente.scene,
    canvas,
    cameraAtual: () => ambiente.camera,
    escalaDoModelo: () => cena.modelo?.raiz?.scale?.x ?? 1,
    aoArrastar(junta, deslocamento) {
      /* O punho informa o deslocamento desde que o ponteiro desceu. Somar isso
         ao que a junta já acumulava exige guardar o ponto de partida, senão o
         segundo arrasto na mesma junta apagaria o primeiro. */
      if (arrastoDeJunta?.junta !== junta) {
        arrastoDeJunta = { junta, partida: ajustesDeJunta.get(junta) ?? [0, 0, 0] };
      }
      ajustesDeJunta.set(junta, somar(arrastoDeJunta.partida, deslocamento));
      reconstruirComAjuste();
    },
    aoSoltar() {
      arrastoDeJunta = null;
      /* UM PASSO POR ARRASTO, e não um por quadro: o registro acontece quando o
         ponteiro sobe, então cada Ctrl+Z desfaz um arrasto inteiro. */
      historicoParametros.registrar('__ajuste_de_junta__', listaDeAjustes());
      historicoParametros.separar();
      refletirAjusteDeJunta();
    },
  });

  /* Ctrl+Z devolve o que esta sessão desenhou na malha e para no estado que veio
     do arquivo: com a pilha vazia, o comando não faz nada e não inventa estado
     anterior. */
  function desfazerDesenho() {
    const passo = historicoParametros.desfazer();
    if (!passo) return false;
    /* O ajuste por junta é um estado só — o mapa inteiro de deslocamentos — e
       voltar a ele é repor o mapa e reconstruir. Antes ele não passava por aqui:
       arrastar um punho não registrava nada, Ctrl+Z não tinha o que desfazer, e
       o único jeito de voltar era um botão de descartar que jogava fora todos os
       arrastos de uma vez. */
    if (passo.chave === '__ajuste_de_junta__') {
      reporAjustesDeJunta(passo.valor ?? ORIGEM_DAS_JUNTAS);
      avisar(passo.naOrigem || !(passo.valor ?? []).length
        ? 'Desfeito: as juntas voltaram ao que veio do arquivo.'
        : 'Desfeito o último arrasto de junta.');
      return true;
    }
    if (passo.chave !== '__edicao_de_malha__' || !edicaoDeMalha || !passo.valor) return false;
    /* Duas formas de voltar, e a diferença é o custo. Se só as posições mudaram,
       trocar coordenadas na geometria desenhada basta e é instantâneo. Se as
       FACES mudaram, a malha desenhada tem outra forma e precisa ser refeita. */
    const viva = edicaoDeMalha.malha();
    const mesmasFaces = viva.F.size === passo.valor.F.size
      && [...passo.valor.F.keys()].every((id) => viva.F.has(id));
    if (mesmasFaces) edicaoDeMalha.restaurar(passo.valor.V);
    else {
      const estadoAtual = edicaoDeMalha.estado();
      reconstruirMalhaEditada({ ...viva, V: passo.valor.V, F: passo.valor.F }, {
        partes: edicaoDeMalha.partesEditadas,
        desenharMalha: edicaoDeMalha.desenhaMalha,
        modo: estadoAtual.modo,
        selecionados: [],
      });
    }
    refletirAjusteDeJunta();
    avisar(historicoParametros.vazio
      ? 'Desfeito: a malha voltou ao que veio do arquivo.'
      : 'Desfeito o último movimento.');
    return true;
  }

  function reporAjustesDeJunta(lista) {
    ajustesDeJunta.clear();
    for (const { junta, deslocamento } of lista ?? []) ajustesDeJunta.set(junta, [...deslocamento]);
    arrastoDeJunta = null;
    reconstruirComAjuste();
    refletirAjusteDeJunta();
  }

  function listaDeAjustes() {
    return [...ajustesDeJunta]
      .filter(([, d]) => d.some((c) => Math.abs(c) > 1e-9))
      .map(([junta, deslocamento]) => ({ junta, deslocamento }));
  }

  /** A malha que a pessoa está vendo: a do arquivo com as juntas arrastadas. */
  function neutroAjustado() {
    if (!neutroDoArquivo) return null;
    const ajustes = listaDeAjustes();
    if (!ajustes.length) return neutroDoArquivo;
    return aplicarAjusteDeJunta(neutroDoArquivo, ajustes, { juntas: juntasDaPeca });
  }

  function reconstruirComAjuste() {
    const deformado = neutroAjustado();
    if (!deformado) return;
    const modeloAtual = cena.modelo;
    const rotulo = modeloAtual?.rotulo ?? nomePecaAtual();
    const { caixas, facesSemParte } = caixasPorParte(deformado);
    const adaptado = adaptarThree(deformado, { nome: rotulo, materiais: materiaisDaPeca });
    const controlador = cena.controlador;
    const selecionadasAntes = controlador ? [...controlador.selecionadas] : [];
    cena.aplicarModelo({
      nome: modeloAtual?.nome ?? nomePecaAtual(),
      rotulo,
      medida: { partes: caixas, facesSemParte, portas: portasPublicadas(deformado) },
      neutro: deformado,
      materiais: materiaisDaPeca,
      ...adaptado,
    }, { preservarCamera: true, deAjuste: true });
    if (selecionadasAntes.length && cena.controlador) cena.controlador.selecionarMuitas(selecionadasAntes);
    refletirAjusteDeJunta();
  }

  function refletirAjusteDeJunta() {
    const quantas = listaDeAjustes().length;
    const mudou = malhaMudouDesdeOArquivo(neutroDoArquivo, malhaParaSalvar());
    /* O rodapé é o único lugar com o botão de salvar, então ele aparece
       sempre que existe algo a salvar, e não só no modo de junta.
       Salvar depende da malha ter mudado, e não de ter junta puxada: editar
       vértice, aresta ou face é mudança tanto quanto arrastar um punho, e
       enquanto a contagem de juntas governava este botão a edição livre não
       tinha como sair da bancada. */
    estado.definir({ juntas: { modo: modoJuntas, quantas, mudou, rodapeVisivel: modoJuntas || mudou } });
    const modeloAtual = cena.modelo;
    if (modoJuntas && juntasDaPeca && modeloAtual && !punhosDeJunta.arrastando) {
      modeloAtual.raiz.updateMatrixWorld(true);
      /* O punho tem de ficar onde o canto está AGORA, e não onde ele estava no
         arquivo: redesenhar na posição original fazia o punho voltar para trás
         assim que a pessoa soltava o ponteiro, e o segundo arrasto partia do
         lugar errado. O canto anda exatamente o que foi acumulado nele. */
      const movidas = juntasDaPeca.map((junta) => {
        const d = ajustesDeJunta.get(junta.nome);
        return d ? { ...junta, posicao: somar(junta.posicao, d) } : junta;
      });
      punhosDeJunta.mostrar(movidas, modeloAtual.raiz.matrixWorld);
    }
  }

  function definirModoJuntas(ligado) {
    modoJuntas = Boolean(ligado);
    if (!modoJuntas) {
      punhosDeJunta.esconder();
      /* Desligar esconde o rodapé sem recontar o que há a salvar; o próximo
         reflexo o devolve se a malha estiver mudada. */
      estado.definir({ juntas: { ...estado.obter('juntas'), modo: false, rodapeVisivel: false } });
      return;
    }
    if (!neutroDoArquivo) {
      avisar('Sem peça aberta para ajustar.');
      modoJuntas = false;
      estado.definir({ juntas: { ...estado.obter('juntas'), modo: false } });
      return;
    }
    estado.definir({ juntas: { ...estado.obter('juntas'), modo: true } });
    if (!juntasDaPeca) juntasDaPeca = detectarJuntas(neutroDoArquivo);
    registroDeEventos.registrar('informacao', 'Ajuste de junta ligado', `${juntasDaPeca.length} juntas`);
    refletirAjusteDeJunta();
  }

  /* O QUE VAI PARA O ARQUIVO é a malha que está na tela, e não só a que os
     punhos de junta deformaram. Enquanto esta função lia apenas
     `neutroAjustado`, uma sessão inteira de edição de vértice, aresta e face
     não chegava ao alvo: salvar exigia ter puxado uma junta, e quem editasse a
     malha livremente saía sem arquivo nenhum. `modeloAtual.neutro` é a malha
     viva — a camada de edição escreve nela, e a reconstrução por topologia a
     substitui — então é dela que o alvo sai. */
  function malhaParaSalvar() {
    return cena.modelo?.neutro ?? neutroAjustado();
  }

  /** Monta o alvo do ajuste e o entrega a `baixar(nomeDoArquivo, texto)`, que é do rodapé das juntas. */
  function salvarAlvoDoAjuste(baixar) {
    const deformado = malhaParaSalvar();
    if (!deformado || !malhaMudouDesdeOArquivo(neutroDoArquivo, deformado)) {
      avisar('Nada para salvar: a malha está como veio do arquivo.');
      return;
    }
    const nomePeca = nomePecaAtual();
    const alvo = {
      ...capturarAlvo(deformado, { peca: nomePeca, base: cena.modelo?.rotulo ?? nomePeca }),
      /* O que a pessoa fez, ao lado de onde ela chegou. A rodada de absorção
         mede pelo alvo; os gestos existem para ela saber o que perguntar quando
         duas leituras couberem na mesma medida. */
      gestos: listaDeAjustes(),
      /* DE QUAL RECEITA A PEÇA VEIO, pelo nome que resolve um arquivo. O campo
         `peca` guarda o nome do modelo carregado, que pode ser o rótulo em
         prosa da peça, e com ele `descrever:gesto` e `absorver` não acham
         receita nenhuma para reexecutar. */
      receitaDeOrigem: receitaDeOrigem ?? nomePeca,
      /* A DESCRIÇÃO NASCE AQUI, e não em quem lê o arquivo depois, porque aqui
         as duas malhas ainda têm os mesmos vértices e ninguém precisa adivinhar
         qual virou qual. Fora daqui só sobram duas nuvens de pontos, e quando o
         movimento tem o tamanho do espaçamento entre pontos — o que acontece na
         bicicleta, com o anel de dezoito lados a dezessete milímetros de raio —
         nenhum emparelhamento por posição resolve a ambiguidade.
         Ela guarda palavras e números, e nenhum identificador de vértice. */
      descricaoDoGesto: neutroDoArquivo ? descreverGesto(neutroDoArquivo, deformado) : null,
    };
    baixar(`ajuste-${nomePeca}.json`, JSON.stringify(alvo, null, 2));
    registroDeEventos.registrar('informacao', 'Ajuste salvo',
      `${alvo.gestos.length} junta(s), ${alvo.descricaoDoGesto?.mexidas.length ?? 0} parte(s) mexida(s)`);
    avisar('Ajuste salvo. Leve o arquivo para a rodada de absorção.');
  }

  function criarCamadaDeEdicao(modelo, partes, { desenharMalha = true } = {}) {
    return criarCamadaEdicaoDeMalha({
      canvas,
      cameraAtual: () => ambiente.camera,
      raiz: modelo.raiz,
      neutro: modelo.neutro,
      partes,
      desenharMalha,
      aoMudar(estadoEdicao) {
        if (estadoEdicao.ativo) {
          avisar(`Edição de malha: ${estadoEdicao.modo}. ${estadoEdicao.selecionados.length} selecionado(s).`);
        }
      },
      aoConfirmarMovimento({ depois }) {
        /* `depois` são as posições que o gesto produziu; as faces são as da
           malha viva, que o movimento não muda. */
        historicoParametros.registrar('__edicao_de_malha__', { V: depois, F: modelo.neutro.F });
        historicoParametros.separar();
        avisar('Movimento de malha confirmado. Ctrl+Z desfaz.');
        refletirAjusteDeJunta();
      },
    });
  }

  /* A CAMADA É RECRIADA A CADA ENTRADA NO MODO, com as partes que estão
     selecionadas naquele instante. Criada uma vez por peça, ela punha os 502
     vértices da bicicleta inteira na tela para quem queria mexer num tubo só, e
     um clique podia cair em vértice de outra peça. Recriar é barato e não
     atrapalha o desfazer, que guarda cópias de `V` e não depende da camada.

     Enquanto o modo está ligado, o botão esquerdo pertence à seleção, então a
     órbita do controlador de câmera passa para o botão do meio e o arrasto para
     o direito — a mesma divisão que o Blender usa. Sair devolve o padrão. */
  /* MOVER A PARTE INTEIRA. É o gesto que o autor pediu depois de testar: escolher
     uma parte na cena e deslocá-la como corpo, sem entrar na malha. Não é outra
     máquina — é a mesma camada de edição, restrita às partes escolhidas, com
     tudo selecionado e sem os vértices na frente. Por isso o ímã, o gizmo, o
     eixo travado, o valor digitado e o Ctrl+Z valem igual, e o que sai é o mesmo
     alvo medido.
     `G` sem estar no modo de edição é o que o Blender faz no modo objeto. */
  /* O GIZMO DE MOVER APARECE AO ESCOLHER A PEÇA, e não só depois do `G`. Era o
     que o autor esperava do clique: escolher a peça e ter o punho ali. O `G`
     continua valendo para quem prefere teclado, e arrastar a seta faz o mesmo. */
  function prepararMoverParte(selecionadas) {
    if (edicaoDeMalha?.estado?.().ativo && edicaoDeMalha.desenhaMalha) return;
    if (edicaoDeMalha?.movendo) return;
    const modeloAtual = cena.modelo;
    if (!modeloAtual?.neutro || !selecionadas?.length) {
      if (edicaoDeMalha && !edicaoDeMalha.desenhaMalha) {
        edicaoDeMalha.destruir();
        edicaoDeMalha = null;
      }
      return;
    }
    edicaoDeMalha?.destruir();
    edicaoDeMalha = criarCamadaDeEdicao(modeloAtual, [...selecionadas], { desenharMalha: false });
    edicaoDeMalha.alternar();
    edicaoDeMalha.selecionarTudo();
  }

  function moverParteInteira() {
    const controlador = cena.controlador;
    const selecionadas = controlador ? [...controlador.selecionadas] : [];
    if (!cena.modelo?.neutro || selecionadas.length === 0) {
      avisar('Selecione uma parte antes de mover.');
      return false;
    }
    if (!edicaoDeMalha?.estado?.().ativo || edicaoDeMalha.desenhaMalha) {
      prepararMoverParte(selecionadas);
    }
    if (!edicaoDeMalha?.iniciarMovimento()) {
      return false;
    }
    avisar(`Movendo ${selecionadas.join(', ')}. X/Y/Z travam o eixo, Ctrl gruda, Esc cancela.`);
    return true;
  }

  function aplicarNaMalha(qual, argumentos = null) {
    if (!edicaoDeMalha?.estado?.().ativo || edicaoDeMalha.movendo) return false;
    const viva = edicaoDeMalha.malha();
    const estadoAtual = edicaoDeMalha.estado();
    const operacao = OPERACOES_DE_MALHA[qual] ?? ({ rotacionar, escalar }[qual]);
    if (!operacao) return false;

    const resultado = argumentos
      ? operacao(viva, estadoAtual, argumentos)
      : operacao(viva, estadoAtual);
    if (!resultado.mudou) {
      avisar(resultado.motivo ? `Não deu: ${resultado.motivo}.` : 'Nada para fazer com esta seleção.');
      return false;
    }

    const partes = edicaoDeMalha.partesEditadas;
    const selecao = resultado.selecionados ?? estadoAtual.selecionados;
    const modo = OPERACOES_DE_MALHA[qual] && qual !== 'apagar' ? 'face' : estadoAtual.modo;

    reconstruirMalhaEditada(resultado.neutro, {
      partes,
      desenharMalha: edicaoDeMalha.desenhaMalha,
      modo: qual === 'criarFace' ? 'face' : modo,
      selecionados: selecao,
    });
    historicoParametros.registrar('__edicao_de_malha__', fotografarMalha(edicaoDeMalha.malha()));
    historicoParametros.separar();
    refletirAjusteDeJunta();
    return true;
  }

  /* A malha mudou de faces, então o modelo inteiro é refeito. É o mesmo caminho
     do ajuste por junta, e o custo é uma execução de `adaptarThree` por
     operação — não por quadro. */
  function reconstruirMalhaEditada(novoNeutro, { partes, desenharMalha, modo, selecionados }) {
    const modeloAtual = cena.modelo;
    const rotulo = modeloAtual?.rotulo ?? nomePecaAtual();
    const { caixas, facesSemParte } = caixasPorParte(novoNeutro);
    const adaptado = adaptarThree(novoNeutro, { nome: rotulo, materiais: materiaisDaPeca });
    edicaoDeMalha?.destruir();
    edicaoDeMalha = null;
    cena.aplicarModelo({
      nome: modeloAtual?.nome ?? nomePecaAtual(),
      rotulo,
      medida: { partes: caixas, facesSemParte, portas: portasPublicadas(novoNeutro) },
      neutro: novoNeutro,
      materiais: materiaisDaPeca,
      ...adaptado,
    }, { preservarCamera: true, deAjuste: true });

    edicaoDeMalha = criarCamadaDeEdicao(cena.modelo, partes, { desenharMalha });
    edicaoDeMalha.alternar();
    edicaoDeMalha.definirModo(modo);
    edicaoDeMalha.selecionar(selecionados);
  }

  function alternarEdicaoDeMalha() {
    const modeloAtual = cena.modelo;
    if (!modeloAtual?.neutro) return;
    /* Sair do modo peça com Tab é entrar no de edição, e não desligar tudo: a
       camada do modo peça está ativa, mas não é o modo que o Tab governa. */
    if (edicaoDeMalha?.estado?.().ativo && !edicaoDeMalha.desenhaMalha) {
      edicaoDeMalha.destruir();
      edicaoDeMalha = null;
    }
    if (edicaoDeMalha?.estado?.().ativo) {
      edicaoDeMalha.alternar();
      ambiente.controls.mouseButtons = { ...BOTOES_DE_CAMERA_PADRAO };
      estado.definir({ malhaEmEdicao: false });
      return;
    }
    const controlador = cena.controlador;
    const selecionadas = controlador ? [...controlador.selecionadas] : [];
    edicaoDeMalha?.destruir();
    edicaoDeMalha = criarCamadaDeEdicao(modeloAtual, selecionadas);
    edicaoDeMalha.alternar();
    ambiente.controls.mouseButtons = {
      LEFT: null,
      MIDDLE: THREE.MOUSE.ROTATE,
      RIGHT: THREE.MOUSE.PAN,
    };
    estado.definir({ malhaEmEdicao: true });
    avisar(selecionadas.length
      ? `Editando ${selecionadas.join(', ')}. Botão do meio gira, direito arrasta.`
      : 'Editando a peça inteira. Selecione uma parte antes do Tab para limitar.');
  }

  return {
    /** A camada de edição de malha em vigor, ou null; o teclado a consulta a cada tecla. */
    get camada() { return edicaoDeMalha; },
    get modoJuntas() { return modoJuntas; },
    desfazerDesenho,
    definirModoJuntas,
    alternarModoJuntas: () => definirModoJuntas(!modoJuntas),
    salvarAlvoDoAjuste,
    prepararMoverParte,
    moverParteInteira,
    aplicarNaMalha,
    alternarEdicaoDeMalha,
    /* O punho de junta tem tamanho constante na tela e a camada de edição
       acompanha a câmera, então os dois precisam reagir a cada quadro. */
    acompanharCamera() {
      punhosDeJunta.atualizarEscala();
      edicaoDeMalha?.acompanharCamera?.();
    },
    /** Desfaz tudo o que esta sessão desenhou, até a peça voltar ao que veio do arquivo. */
    descartarDesenho() {
      let passos = 0;
      while (passos < 10000 && desfazerDesenho()) passos += 1;
      avisar(passos ? 'Descartado: a peça voltou ao que veio do arquivo.' : 'Nada para descartar nesta sessão.');
      return passos;
    },
    /** Peça nova vai entrar: a camada da anterior sai junto com ela. */
    antesDeTrocarDeModelo() {
      if (edicaoDeMalha) edicaoDeMalha.destruir();
      estado.definir({ malhaEmEdicao: false });
    },
    /** A peça que veio do arquivo vira a base do ajuste e do desfazer. */
    receberPecaDoArquivo(convertido) {
      /* CÓPIA, e não a mesma malha. Guardar a referência viva fazia desta base
         e da malha editada o mesmo objeto: a camada de edição escreve nos
         vértices, os dois lados mudavam juntos, e comparar um com o outro
         nunca acusava diferença nenhuma. Com isso o botão de salvar ficava
         desativado por mais que a pessoa editasse, e a descrição do gesto sairia
         comparando a malha consigo mesma. */
      neutroDoArquivo = convertido.neutro ? fotografarMalha(convertido.neutro) : null;
      materiaisDaPeca = convertido.materiais ?? {};
      juntasDaPeca = null;
      ajustesDeJunta.clear();
      arrastoDeJunta = null;
      if (modoJuntas) definirModoJuntas(Boolean(neutroDoArquivo));
    },
    /** A camada de edição de uma peça que acabou de entrar na cena. */
    criarCamadaDoModelo(convertido, { deAjuste }) {
      edicaoDeMalha = convertido.neutro ? criarCamadaDeEdicao(convertido, null) : null;
      if (!deAjuste && edicaoDeMalha) origemDaMalha = fotografarMalha(edicaoDeMalha.malha());
    },
    /** Peça nova, sessão nova: o piso do desfazer passa a ser o que veio do arquivo desta peça. */
    esquecerHistorico() {
      historicoParametros.limpar();
      origemDaMalha = null;
    },
    destruir() {
      if (edicaoDeMalha) edicaoDeMalha.destruir();
    },
  };
}
