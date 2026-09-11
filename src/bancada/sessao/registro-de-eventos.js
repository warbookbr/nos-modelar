/* registro-de-eventos.js — a memória curta da bancada.
 *
 * A bancada relata estado de duas formas que se apagam: o indicador do topo
 * mostra só o AGORA, e quem estava olhando a cena não vê a troca acontecer. Se
 * a sincronização caiu e voltou, se o modelo chegou duas vezes, se uma face
 * ficou sem identidade e depois foi corrigida, nada disso sobrevive ao próximo
 * quadro. Este registro guarda a sequência, que é o que permite responder "o
 * que aconteceu antes disso dar errado".
 *
 * Não é arquivo nem histórico: vive na sessão do navegador e morre com ela.
 * Guardar em disco faria dele estado persistido, e estado persistido precisa de
 * formato versionado, o que este assunto não justifica.
 */

export const LIMITE_DE_EVENTOS = 200;

export const GRAVIDADES = ['informacao', 'alerta', 'erro'];

export function criarRegistroDeEventos({ agora = () => new Date(), limite = LIMITE_DE_EVENTOS } = {}) {
  const eventos = [];

  function registrar(gravidade, assunto, detalhe = '') {
    if (!GRAVIDADES.includes(gravidade)) throw new Error(`gravidade desconhecida: ${gravidade}`);
    const texto = String(assunto).trim();
    if (!texto) throw new Error('evento sem assunto');
    /* Repetição consecutiva do mesmo assunto vira contagem. Sem isso um erro
       que se repete a cada quadro enche o limite e empurra para fora a causa,
       que é justamente o que interessa ler. */
    const ultimo = eventos[eventos.length - 1];
    if (ultimo && ultimo.gravidade === gravidade && ultimo.assunto === texto && ultimo.detalhe === String(detalhe)) {
      ultimo.repeticoes += 1;
      ultimo.quando = agora().toISOString();
      return ultimo;
    }
    const evento = {
      gravidade,
      assunto: texto,
      detalhe: String(detalhe),
      quando: agora().toISOString(),
      repeticoes: 1,
    };
    eventos.push(evento);
    if (eventos.length > limite) eventos.splice(0, eventos.length - limite);
    return evento;
  }

  return {
    registrar,
    listar: () => eventos.map((evento) => ({ ...evento })),
    /* O mais recente primeiro é a ordem de quem está procurando o que acabou de
       acontecer, que é a única razão de abrir este painel. */
    listarRecentesPrimeiro: () => eventos.map((evento) => ({ ...evento })).reverse(),
    contarPorGravidade: (gravidade) => eventos.filter((evento) => evento.gravidade === gravidade).length,
    limpar: () => { eventos.length = 0; },
  };
}
