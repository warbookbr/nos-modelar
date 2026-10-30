/* barra-superior.js — a barra de cima da bancada: os botões Abrir, Controles e Estado, cada um com a sua janela, o selo e o aviso que aparecem só quando algo está ruim.
 *
 * Cada botão da barra abre uma janela modal. Ela fecha pelo X, pelo fundo ou
 * por Esc, e não por clique em qualquer lugar: quem está marcando duas caixas
 * seguidas ou escolhendo tecla não pode perder a janela no meio do gesto.
 *
 * O aviso de estado lê do estado central `sessao` e `faceSemIdentidade`. As três coisas que ele cobre eram indicadores
 * fixos no alto da tela, dizendo "tudo bem" durante todo o tempo em que nada acontecia; agora aparecem só quando estão
 * ruins, e o modal de Estado mostra o resumo e a sequência de eventos. */
import { montarMenuAbrir } from './menu-abrir.js';
import { montarMenuControles } from './menu-controles.js';
import { montarMenuEstado } from './menu-estado.js';

/** Os problemas que o aviso de estado mostra, na ordem em que aparecem. */
export function problemasDoEstado({ sessao, faceSemIdentidade }) {
  const problemas = [];
  if (sessao === 'erro') problemas.push('Erro de sincronia com a sessão');
  if (faceSemIdentidade > 0) problemas.push(`${faceSemIdentidade} faces sem identidade`);
  return problemas;
}

export function montarBarraSuperior({
  elementos, corpo, estado, registroDeEventos, registroAtalhos, comandos, entradasDoAcervo, abrirDoAcervo,
  janela = globalThis,
}) {
  const { selo, avisoEstado } = elementos;
  const janelas = elementos.janelas.filter(({ botao, janela: modal }) => botao && modal);

  function fecharJanelas() {
    for (const { botao, janela: modal } of janelas) {
      modal.hidden = true;
      botao.setAttribute('aria-expanded', 'false');
    }
    corpo.classList.remove('modal-aberto');
  }

  montarMenuAbrir({
    listaAcervo: elementos.listaAcervo,
    entradas: entradasDoAcervo,
    aoEscolher(entrada) {
      fecharJanelas();
      abrirDoAcervo(entrada);
    },
  });
  montarMenuControles({
    listaAtalhos: elementos.listaAtalhos,
    avisoAtalho: elementos.avisoAtalho,
    btnRestaurarAtalhos: elementos.btnRestaurarAtalhos,
    estado,
    comandos,
    registroAtalhos,
    janela,
  });
  const menuEstado = montarMenuEstado({
    resumoEstado: elementos.resumoEstado,
    listaEventos: elementos.listaEventos,
    btnLimparEventos: elementos.btnLimparEventos,
    estado,
    registroDeEventos,
  });

  function alternarJanela({ chave, botao, janela: modal }) {
    const abrir = modal.hidden;
    fecharJanelas();
    if (!abrir) return;
    if (chave === 'estado') menuEstado.desenharEstado();
    modal.hidden = false;
    botao.setAttribute('aria-expanded', 'true');
    corpo.classList.add('modal-aberto');
    modal.querySelector('.btn-fechar-modal')?.focus();
  }

  avisoEstado?.addEventListener('click', () => {
    const doEstado = janelas.find(({ chave }) => chave === 'estado');
    if (doEstado) alternarJanela(doEstado);
  });

  for (const entrada of janelas) {
    entrada.botao.addEventListener('click', () => alternarJanela(entrada));
    for (const gatilho of entrada.janela.querySelectorAll('[data-fechar-modal]')) {
      gatilho.addEventListener('click', () => fecharJanelas());
    }
  }

  janela.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape' && !registroAtalhos.capturando) fecharJanelas();
  });

  estado.assinar(['sessao', 'faceSemIdentidade'], (valores) => {
    if (!avisoEstado) return;
    const problemas = problemasDoEstado(valores);
    avisoEstado.hidden = problemas.length === 0;
    avisoEstado.textContent = problemas.join(' · ');
    if (selo) selo.hidden = problemas.length === 0;
  });

  return { fecharJanelas };
}
