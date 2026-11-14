/* sessao-da-bancada.js — de onde vem a peça da bancada: a sessão ativa que a IA envia, a peça aberta do acervo, a do catálogo e a entrega que espera quando a pessoa escolheu outra.
 *
 * Saiu de `main.js` sem mudar de comportamento. O módulo não toca a página: o status da sessão, a oferta da entrega em
 * espera, a espera por modelo e as anotações da sessão vão para o estado central, e a sessão ativa
 * (`componentes/sessao-ativa.js`) e os painéis desenham. */
import { carregarPeca } from '../carregar-peca.js';
import { formatarNome } from '../formatar.js';
import { ROTULOS_DE_SESSAO } from '../componentes/menu-estado.js';
import { criarSincronizadorSessao } from './sincronizador.js';
import { abrirMontagemDoAcervo } from './montagem-em-dados.js';
import { processarReceitaSessao } from './carregar-sessao.js';
import { textoDaExecucao } from '../cache-da-execucao.js';

export const DEMO_RECEITA = {
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

/* O pacote que o botão de demonstração carrega quando a bancada abre sem peça. */
export const PAYLOAD_DE_DEMONSTRACAO = {
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
  parametros: {
    raio_10: 1.2,
    alt_10: 0.35,
    raio_20: 0.7,
    alt_20: 0.7,
  },
};

/* O aviso de peça pedida em `?peca=` que não existe: o nome recebido, onde se procurou e os nomes parecidos. */
export function textoDePecaNaoEncontrada(pecaPedida, { acervo = [], catalogo = [] } = {}) {
  const parecidas = acervo.map((entrada) => entrada.id)
    .filter((id) => id.includes(pecaPedida) || pecaPedida.includes(id) || id.slice(0, 5) === pecaPedida.slice(0, 5))
    .slice(0, 8);
  return [
    `Peça '${pecaPedida}' não encontrada (pedida em ?peca=${pecaPedida}).`,
    'Procurei em:',
    `  1. acervo de receitas (procedural/pecas e tools/fixtures/acervo): ${acervo.length} entradas`,
    `  2. catálogo homologado: ${catalogo.length} entradas`,
    ...(parecidas.length ? [`Nomes parecidos no acervo: ${parecidas.join(', ')}.`] : []),
    'Abra uma peça pelo menu Abrir, ou corrija o nome no endereço.',
  ].join('\n');
}

export function criarSessaoDaBancada({
  estado, cena, edicao, imagemNaCena, anotacoes3D, registroDeEventos, avisar, mostrarErro, arquivoDaSessao,
  criarSincronizador = criarSincronizadorSessao,
  /* A lista do acervo, de onde a montagem em dados tira as receitas das peças que cita. */
  acervo = () => [],
  /* `(entrada, receita) => Promise<{ neutro, origem, ms }>`: executa a receita do acervo pelo cache da malha. Sem ele, a receita executa na
     hora, dentro do processamento do payload, como sempre. */
  executarDoAcervo = null,
}) {
  /* Quem escolheu a peça manda. A bancada relê `sessao-ativa.json` a cada
     segundo e meio, e até aqui qualquer leitura trocava o modelo em cena. Quem
     acabava de abrir uma peça em `Abrir` a via ser substituída pela peça do
     arquivo sem tocar em nada, e perdia a seleção, o enquadramento e os
     parâmetros em prévia junto. A entrega da sessão continua chegando: fica
     guardada e aparece como oferta, que carrega num clique. */
  let escolhaManual = false;
  let entregaDaSessaoEmEspera = null;

  function oferecerEntregaDaSessao(nome) {
    estado.definir({ ofertaDaSessao: { emEspera: entregaDaSessaoEmEspera !== null, nome } });
  }

  function atualizarStatusUI(status) {
    if (estado.obter('sessao') === status) return;
    estado.definir({ sessao: status });
    registroDeEventos.registrar(status === 'erro' ? 'erro' : 'informacao', ROTULOS_DE_SESSAO[status] ?? status);
  }

  /* O corpo da entrega saiu do retorno de chamada para poder ser executado
     também quando a pessoa aceita uma entrega que ficou em espera. */
  async function aplicarEntregaDaSessao(estadoDaSessao, novoModelo, fonte) {
    imagemNaCena.trocarDePeca(estadoDaSessao, novoModelo);
    if (novoModelo) {
      /* Preservar a câmera existe para não arrancar o enquadramento de quem
         está editando ao vivo. Na PRIMEIRA entrega da sessão não há câmera a
         preservar: o enquadramento em vigor foi calculado com a cena vazia, e
         mantê-lo deixava a peça cortada e minúscula na revisão headless. */
      cena.aplicarModelo(novoModelo, { preservarCamera: fonte !== 'manual' && cena.modelo !== null });
      await imagemNaCena.restaurarDaPeca();
    }
    /* Os painéis são OPCIONAIS: as fábricas devolvem null quando o container
       não existe, e no harness headless ele não existe mesmo. Sem o `?.` a
       primeira entrega de sessão estourava 'reading renderizar', o
       sincronizador caía e a seleção pedida por --selecionadas nunca chegava a
       ser aplicada — a captura saía com a montagem inteira e sem foco. */
    imagemNaCena.painel?.renderizar({
      referencias: estadoDaSessao.referencias,
    });
    imagemNaCena.gerenciador.sincronizarComSessao(estadoDaSessao.referencias);
    anotacoes3D.sincronizarAnotacoes(estadoDaSessao.anotacoes);
    estado.definir({ anotacoes: { lista: estadoDaSessao.anotacoes } });
  }

  const sincronizador = criarSincronizador({
    ...(arquivoDaSessao ? { arquivo: arquivoDaSessao } : {}),
    aoMudarStatus: atualizarStatusUI,
    async aoAtualizar(estadoDaSessao, novoModelo, { fonte }) {
      if (novoModelo && escolhaManual && fonte === 'arquivo') {
        const nome = formatarNome(novoModelo.rotulo);
        entregaDaSessaoEmEspera = { estado: estadoDaSessao, novoModelo };
        registroDeEventos.registrar('alerta', 'Entrega da sessão em espera', nome);
        oferecerEntregaDaSessao(nome);
        return;
      }
      await aplicarEntregaDaSessao(estadoDaSessao, novoModelo, fonte);
    },
    aoErro(erro) {
      console.error('Erro na sessão ativa:', erro);
      avisar(`Erro na sincronização: ${erro.message}`);
    },
  });

  /* De onde veio a malha e quanto custou: o aviso passageiro, o registro de eventos e o estado, que a barra de baixo lê. */
  function mostrarExecucao(id, { origem, ms }) {
    const texto = textoDaExecucao({ origem, ms });
    estado.definir({ execucao: { id, origem, ms, texto } });
    registroDeEventos.registrar('informacao', `${id}: ${texto}`);
    avisar(`${id}: ${texto}`);
  }

  async function abrirDoAcervo(entrada) {
    try {
      avisar(`Abrindo ${entrada.id}…`);
      const carregado = await entrada.carregar();
      /* A montagem em dados (`<objeto>/montagem.json`) não é receita: resolve-se pelo leitor da autoria, com as peças nas
         posições da montagem, e entra pela mesma porta com o modelo pronto. */
      const receita = entrada.emDados ? null : carregado;
      const modeloDaMontagem = entrada.emDados ? await abrirMontagemDoAcervo(carregado, acervo()) : null;
      /* O mesmo caminho da sessão ativa, e não um segundo: assim a peça aberta
         à mão e a peça enviada pela IA chegam à cena pela mesma porta, com a
         mesma medição e o mesmo tratamento de erro. */
      estado.definir({ idNaUrl: entrada.id });
      /* Peça nova, sessão nova: o piso do desfazer passa a ser o que veio do
         arquivo desta peça, e a pilha da anterior não pode sobreviver. */
      edicao.esquecerHistorico();
      escolhaManual = true;
      cena.esquecerColocacao();
      entregaDaSessaoEmEspera = null;
      oferecerEntregaDaSessao('');
      if (modeloDaMontagem?.semGeometria.length) {
        const nomes = modeloDaMontagem.semGeometria.map((item) => item.caminho).join(', ');
        registroDeEventos.registrar('alerta', `${entrada.id} abriu sem ${nomes}`, modeloDaMontagem.semGeometria.map((item) => `${item.caminho}: ${item.motivo}`).join(' | '));
        avisar(`${entrada.id} abriu sem: ${nomes}. A janela Estado traz o motivo.`);
      }
      if (modeloDaMontagem) sincronizador.definirPayload({ alvo: { nome: entrada.id, tipo: 'montagem' }, montagem: carregado }, { modelo: modeloDaMontagem });
      else if (receita && executarDoAcervo) {
        const execucao = await executarDoAcervo(entrada, receita);
        const modelo = processarReceitaSessao(receita, { nome: entrada.id, neutro: execucao.neutro });
        mostrarExecucao(entrada.id, execucao);
        sincronizador.definirPayload({ alvo: { nome: entrada.id }, receita }, { modelo });
      } else sincronizador.definirPayload({ alvo: { nome: entrada.id }, receita });
      if (cena.controlador) cena.salvarEstadoNaUrl(cena.controlador.estado());
      if (receita) await imagemNaCena.oferecerSobreposicaoDaPeca(entrada.id, receita);
    } catch (erro) {
      mostrarErro(erro);
    }
  }

  return {
    sincronizador,
    abrirDoAcervo,
    async aceitarEntrega() {
      if (!entregaDaSessaoEmEspera) return;
      const { estado: estadoDaSessao, novoModelo } = entregaDaSessaoEmEspera;
      entregaDaSessaoEmEspera = null;
      escolhaManual = false;
      oferecerEntregaDaSessao('');
      registroDeEventos.registrar('informacao', 'Entrega da sessão aceita', formatarNome(novoModelo.rotulo));
      await aplicarEntregaDaSessao(estadoDaSessao, novoModelo, 'arquivo');
    },
    carregarDemonstracao() {
      sincronizador.definirPayload(PAYLOAD_DE_DEMONSTRACAO);
    },
    /* `?peca=` procura primeiro no acervo em trabalho, que é de onde a janela
       `Abrir` tira a lista: sem isso o endereço copiado depois de abrir uma peça
       não devolveria a mesma peça ao recarregar. O catálogo homologado continua
       valendo como segunda tentativa. */
    async abrirInicial({ pecaPedida, catalogo, acervo }) {
      const noAcervo = pecaPedida ? acervo.find((entrada) => entrada.id === pecaPedida) : null;
      if (noAcervo) {
        await abrirDoAcervo(noAcervo);
      } else if (pecaPedida && !catalogo.some((entrada) => entrada.id === pecaPedida)) {
        /* Peça pedida que não existe em lugar nenhum: diz o nome recebido e onde procurou, em vez de abrir vazia. */
        const texto = textoDePecaNaoEncontrada(pecaPedida, { acervo, catalogo });
        registroDeEventos.registrar('erro', `Peça '${pecaPedida}' não encontrada`, texto);
        mostrarErro(texto);
        estado.definir({ aguardandoModelo: true, catalogoVazio: true });
        sincronizador.iniciarPolling();
      } else if (pecaPedida) {
        try {
          const inicialConvertido = await carregarPeca(pecaPedida, { catalogo });
          escolhaManual = true;
          cena.aplicarModelo(inicialConvertido, { preservarCamera: false });
        } catch (erro) {
          mostrarErro(erro);
        }
      } else {
        // Sem peça estática: mostra a bancada pronta e inicia escuta da sessão
        estado.definir({ aguardandoModelo: true, catalogoVazio: true });
        sincronizador.iniciarPolling();
      }
    },
  };
}
