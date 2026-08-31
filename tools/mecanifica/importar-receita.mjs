/* importar-receita.mjs — import dinâmico de receita SEM cache obsoleto.

   O loader ESM do Node guarda todo módulo já importado pela URL. Num processo
   de vida curta (as CLIs) isso é invisível: cada execução é um processo novo.
   No servidor MCP, que fica vivo entre chamadas, o cache faz `exportar_obj`,
   `descrever_peca` e `ativar_bancada` responderem com a versão da receita que
   existia na PRIMEIRA chamada — a receita muda no disco e a saída não muda.

   A correção é sufixar a URL com a assinatura do arquivo (mtime + tamanho):
   arquivo intocado mantém a mesma URL e reusa o cache; arquivo editado gera
   URL nova e força releitura. Determinístico e sem custo quando nada mudou. */
import { statSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function assinaturaDoArquivo(caminhoAbsoluto) {
  const { mtimeMs, size } = statSync(caminhoAbsoluto);
  return `${Math.trunc(mtimeMs)}-${size}`;
}

export async function importarReceita(caminhoAbsoluto) {
  const url = pathToFileURL(caminhoAbsoluto);
  url.searchParams.set('v', assinaturaDoArquivo(caminhoAbsoluto));
  return import(url.href);
}

export default importarReceita;
