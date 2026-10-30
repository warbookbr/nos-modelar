/* formatar.js — como a bancada escreve nomes de parte e teclas de atalho na tela; contas puras, sem DOM. */

/** 'caixaRodaFrente' e 'caixa-roda-frente' viram 'Caixa Roda Frente'. */
export function formatarNome(nome) {
  if (!nome) return '';
  return nome
    .replace(/([a-zá-ú])([A-Z])/g, '$1 $2')
    .replaceAll('-', ' ')
    .replace(/^./, (letra) => letra.toUpperCase());
}

/** 'Shift+m' vira '⇧M', como as teclas que a fileira das vistas já mostra. */
export function formatarTecla(combinacao) {
  if (!combinacao) return '';
  const [shift, tecla] = combinacao.startsWith('Shift+') ? ['⇧', combinacao.slice(6)] : ['', combinacao];
  return `${shift}${tecla.length === 1 ? tecla.toUpperCase() : tecla}`;
}
