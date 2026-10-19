/** Erro de entrada ou de tipo de material que o gerador ainda não cobre. */
export class ErroDeTextura extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = 'ErroDeTextura';
  }
}
