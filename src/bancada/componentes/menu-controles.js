/* menu-controles.js — a janela Controles da barra superior: os comandos de teclado agrupados por assunto, a troca de tecla de cada um e a volta aos padrões.
 *
 * Escreve no estado central `atalhos`, o mapa das teclas em vigor, toda vez que redesenha a lista, e é por ele que a lista
 * das visões da barra das vistas mostra as mesmas teclas. */
import { normalizarCombinacao } from '../controles/atalhos.js';

/** Os comandos em grupos consecutivos pelo assunto, na ordem da tabela. */
export function agruparComandos(comandos) {
  const grupos = [];
  for (const comando of comandos) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo?.nome === comando.grupo) ultimo.itens.push(comando);
    else grupos.push({ nome: comando.grupo, itens: [comando] });
  }
  return grupos;
}

export function montarMenuControles({
  listaAtalhos, avisoAtalho, btnRestaurarAtalhos, estado, comandos, registroAtalhos, janela = globalThis,
}) {
  const porComando = new Map(comandos.map((c) => [c.id, c]));

  let mensagemAtalho = null;
  function dizerSobreAtalho(texto) {
    if (avisoAtalho) avisoAtalho.textContent = texto ?? '';
    clearTimeout(mensagemAtalho);
    if (texto) mensagemAtalho = setTimeout(() => { if (avisoAtalho) avisoAtalho.textContent = ''; }, 4000);
  }

  /* A lista é agrupada por família porque treze linhas de peso igual não têm
     hierarquia: a pessoa lê todas para achar uma. Câmera, Vista e Seleção são
     os três assuntos, e dentro de cada um o nome é curto e paralelo — 'Grade' e
     'Projeção', não 'Mostrar ou esconder a grade' ao lado de 'Alternar
     projeção'. */
  function desenharAtalhos() {
    if (!listaAtalhos) return;
    const atual = registroAtalhos.obter();
    const documento = listaAtalhos.ownerDocument;

    listaAtalhos.replaceChildren(...agruparComandos(comandos).flatMap(({ nome, itens }) => {
      const titulo = documento.createElement('h4');
      titulo.className = 'secao-modal';
      titulo.textContent = nome;
      const caixa = documento.createElement('div');
      caixa.className = 'linhas';
      caixa.append(...itens.map((comando) => {
        const linha = documento.createElement('button');
        linha.type = 'button';
        linha.className = 'linha';
        linha.dataset.comando = comando.id;
        const rotulo = documento.createElement('span');
        rotulo.textContent = comando.rotulo;
        const tecla = documento.createElement('kbd');
        tecla.textContent = atual[comando.id];
        linha.append(rotulo, tecla);
        linha.addEventListener('click', () => capturarTeclaPara(comando, linha, tecla));
        return linha;
      }));
      return [titulo, caixa];
    }));
    estado.definir({ atalhos: atual });
  }

  /* Captura escuta UMA vez. Enquanto ela está aberta o registro manda ignorar
     todo atalho global, então a tecla escolhida não dispara o comando que
     estava nela enquanto a pessoa a escolhe. */
  function capturarTeclaPara(comando, linha, tecla) {
    if (registroAtalhos.capturando) return;
    registroAtalhos.iniciarCaptura();
    linha.classList.add('capturando');
    tecla.textContent = 'aperte uma tecla';
    dizerSobreAtalho(`Escolhendo tecla para ${comando.rotulo}. Esc cancela.`);

    const ouvir = (evento) => {
      evento.preventDefault();
      evento.stopPropagation();
      if (evento.key === 'Escape') return encerrar('Captura cancelada.');
      const combinacao = normalizarCombinacao(evento);
      if (!combinacao) return;
      const r = registroAtalhos.atribuir(comando.id, combinacao);
      if (r.ok) return encerrar(`${comando.rotulo}: ${combinacao}.`);
      if (r.motivo === 'ocupado') {
        const ocupante = porComando.get(r.comandoOcupante)?.rotulo ?? r.comandoOcupante;
        dizerSobreAtalho(`${combinacao} já é de "${ocupante}". Escolha outra tecla.`);
        return;
      }
      dizerSobreAtalho('Essa tecla não serve como atalho.');
    };

    function encerrar(mensagem) {
      janela.removeEventListener('keydown', ouvir, true);
      registroAtalhos.cancelarCaptura();
      linha.classList.remove('capturando');
      desenharAtalhos();
      dizerSobreAtalho(mensagem);
    }

    janela.addEventListener('keydown', ouvir, true);
  }

  desenharAtalhos();
  btnRestaurarAtalhos?.addEventListener('click', () => {
    registroAtalhos.restaurarPadroes();
    desenharAtalhos();
    dizerSobreAtalho('Atalhos de volta ao padrão.');
  });
}
