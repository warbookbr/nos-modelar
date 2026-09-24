/* sem-sessao-no-pacote.mjs — a sessão ativa não vai para `dist/`.

   `public/sessao-ativa.json` é estado de quem está trabalhando: diz qual peça
   a bancada local mostra. O Vite copia `public/` inteiro para o pacote, e a
   sessão ia junto. As guardas de navegador servem `dist/`, e a bancada
   recebia pela sessão a última peça aberta por alguém, por cima da peça que a
   guarda tinha escolhido: `guarda:edicao` falhou no ímã porque o modelador do
   anel da cintura tinha aberto o anel na bancada. A página publicada também
   levava a peça de quem publicou. */
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

export const ARQUIVO_DA_SESSAO = 'sessao-ativa.json';

export function semSessaoNoPacote({ saida = 'dist' } = {}) {
  return {
    name: 'mecanifica-sem-sessao-no-pacote',
    apply: 'build',
    closeBundle() {
      const arquivo = join(saida, ARQUIVO_DA_SESSAO);
      if (existsSync(arquivo)) rmSync(arquivo);
    },
  };
}
