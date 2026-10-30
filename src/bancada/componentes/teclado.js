/* teclado.js — o teclado da bancada sobre a cena: o Ctrl+Z, as teclas da edição de malha à moda do Blender, o Esc e os comandos remapeáveis da tabela.
 *
 * Ouve a janela inteira, e não a cena, porque os atalhos valem com o ponteiro em qualquer lugar. O que cada tecla faz na
 * peça é da edição (`cena/edicao-da-peca.js`) e da tabela dos comandos (`controles/comandos.js`); aqui fica só a
 * decisão de qual tecla vai para onde, na ordem em que o corpo único de `main.js` a tomava. */
import { normalizarCombinacao } from '../controles/atalhos.js';

export function montarTeclado({
  edicao, temPecaEditavel, limparSelecao, registroAtalhos, comandos, avisar, janela = globalThis,
}) {
  const porComando = new Map(comandos.map((c) => [c.id, c]));

  /* Ctrl+Z fica FORA da tabela remapeável: é a combinação que todo editor usa
     para desfazer, e deixá-la disponível para remapeamento abriria a porta para
     alguém prender o desfazer numa tecla e ficar sem saída no meio de um
     ajuste. Ela também não passa por `comandoDaCombinacao`, que só entende
     tecla simples e Shift. */
  function atalhoDesfazer(evento) {
    const combinacao = (evento.ctrlKey || evento.metaKey) && !evento.shiftKey
      && typeof evento.key === 'string' && evento.key.toLowerCase() === 'z';
    if (!combinacao) return;
    if (registroAtalhos.deveIgnorar(evento.target)) return;
    evento.preventDefault();
    if (!edicao.desfazerDesenho()) {
      avisar('Nada para desfazer nesta sessão.');
    }
  }

  function atalhoVista(evento) {
    const edicaoDeMalha = edicao.camada;
    const campoEditavel = registroAtalhos.deveIgnorar(evento.target);
    if (evento.key.toLowerCase() === 'g' && !campoEditavel && !evento.ctrlKey && !evento.metaKey
      && !(edicaoDeMalha?.estado?.().ativo && edicaoDeMalha.desenhaMalha)
      && !edicaoDeMalha?.movendo && temPecaEditavel()) {
      evento.preventDefault();
      edicao.moverParteInteira();
      return;
    }
    if (evento.key === 'Tab' && !campoEditavel && temPecaEditavel()) {
      evento.preventDefault();
      edicao.alternarEdicaoDeMalha();
      return;
    }
    if (edicaoDeMalha?.estado().ativo && !campoEditavel
      && (edicaoDeMalha.desenhaMalha || edicaoDeMalha.movendo)) {
      /* O TECLADO DO MOVIMENTO VEM PRIMEIRO. Com os níveis antes dele, digitar o
         valor do deslocamento era interpretado como troca de nível: escrever
         "0.2" mandava o "2" para o modo aresta, a entrada ficava em "0." e o
         movimento saía zero. A pessoa digitava um número e a peça não andava. */
      if (edicaoDeMalha.movendo) {
        if (['x', 'y', 'z'].includes(evento.key.toLowerCase())) {
          evento.preventDefault();
          edicaoDeMalha.travarEixo(evento.key);
          return;
        }
        if (/^[0-9.-]$/.test(evento.key)) {
          evento.preventDefault();
          edicaoDeMalha.digitarValor(evento.key);
          return;
        }
        if (evento.key === 'Enter' || evento.key === 'Return' || evento.code === 'Enter') { evento.preventDefault(); edicaoDeMalha.confirmarMovimento(); return; }
      }
      if (evento.key === '1') { evento.preventDefault(); edicaoDeMalha.definirModo('vertice'); return; }
      if (evento.key === '2') { evento.preventDefault(); edicaoDeMalha.definirModo('aresta'); return; }
      if (evento.key === '3') { evento.preventDefault(); edicaoDeMalha.definirModo('face'); return; }
      if (evento.key.toLowerCase() === 'a' && evento.altKey) { evento.preventDefault(); edicaoDeMalha.limpar(); return; }
      if (evento.key.toLowerCase() === 'a') { evento.preventDefault(); edicaoDeMalha.selecionarTudo(); return; }
      if (evento.key.toLowerCase() === 'l') { evento.preventDefault(); edicaoDeMalha.selecionarIlha(); return; }
      /* AS TECLAS DO BLENDER. E extruda, Shift+D duplica, X apaga, F faz face,
         R gira e S escala. Extrudar e duplicar não movem: a cópia nasce no lugar
         e o G seguinte é que a leva, como lá. */
      if (evento.key.toLowerCase() === 'e') { evento.preventDefault(); edicao.aplicarNaMalha('extrudar'); return; }
      if (evento.key.toLowerCase() === 'd' && evento.shiftKey) { evento.preventDefault(); edicao.aplicarNaMalha('duplicar'); return; }
      if (evento.key.toLowerCase() === 'x') { evento.preventDefault(); edicao.aplicarNaMalha('apagar'); return; }
      if (evento.key.toLowerCase() === 'f') { evento.preventDefault(); edicao.aplicarNaMalha('criarFace'); return; }
      if (evento.key.toLowerCase() === 'r') {
        evento.preventDefault();
        /* Um quarto de volta por toque, no eixo vertical. Girar com o ponteiro
           pede outro gesto contínuo e o plano não pediu isso; o passo fixo já
           cobre o que a peça precisa e é conferível. */
        edicao.aplicarNaMalha('rotacionar', { eixo: 1, angulo: Math.PI / 2 });
        return;
      }
      if (evento.key.toLowerCase() === 's') {
        evento.preventDefault();
        edicao.aplicarNaMalha('escalar', { fator: evento.shiftKey ? 1 / 1.1 : 1.1 });
        return;
      }
      if (evento.key.toLowerCase() === 'g') {
        evento.preventDefault();
        if (edicaoDeMalha.iniciarMovimento()) avisar('Mover: aponte, use X/Y/Z ou digite um valor; clique confirma.');
        return;
      }
    }
    if (evento.key === 'Escape') {
      if (registroAtalhos.capturando) return;
      if (edicaoDeMalha?.cancelarMovimento()) {
        avisar('Movimento de malha cancelado.');
        return;
      }
      limparSelecao();
      return;
    }
    if (registroAtalhos.deveIgnorar(evento.target)) return;
    const comando = registroAtalhos.comandoDaCombinacao(normalizarCombinacao(evento));
    if (!comando) return;
    evento.preventDefault();
    porComando.get(comando)?.executar();
  }

  janela.addEventListener('keydown', atalhoDesfazer);
  janela.addEventListener('keydown', atalhoVista);

  return {
    destruir() {
      janela.removeEventListener('keydown', atalhoVista);
      janela.removeEventListener('keydown', atalhoDesfazer);
    },
  };
}
