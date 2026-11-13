# Regras comuns a todo agente despachado

Quem conduz cita este arquivo no pedido, em vez de copiar a lista. Valem para todo agente, além do que a definição dele diz.

1. Trabalhe só na cópia isolada (worktree) e no ramo que o pedido der. Não rode `git reset`, `git checkout` de outro ramo, `git stash`, `git push` nem `git merge`.
2. Rode cada comando git sozinho, com `git -C <pasta da cópia>`, sem `cd` para outra pasta e sem encadear com `&&`.
3. Grave um commit ao fim de cada etapa que funciona, mesmo com o trabalho incompleto, com a mensagem dizendo o que falta. Trabalho sem commit se perde se o agente parar.
4. Não rode `npm run gates`, `npm test` nem a bateria inteira. Rode só `npx vitest run <arquivos tocados>` e os gates de documento que o pedido citar.
5. Uma carga pesada por vez: a máquina tem quatro núcleos e outros agentes trabalham ao lado. Nada de execuções em paralelo dentro do agente.
6. Não rode `pkill`, `kill`, `find /` nem comando que varra o disco fora do repositório.
7. Teste novo que leva mais de 12 s sozinho entra em `TESTES_LENTOS`, em `tools/testes-lentos.mjs`.
8. Mexa só nos arquivos do pedido. Se a tarefa pedir outro arquivo, pare e relate.
9. A mensagem de commit é em pt-BR, sem nome de modelo, e termina com as linhas de atribuição que o pedido trouxer.
10. Nenhuma imagem de terceiro, marca, nome de fabricante ou dado pessoal entra no repositório.
11. O relatório final é curto: o que foi feito, os números medidos com o comando, o hash do último commit, o que ficou de fora e cada atrito, com o comando que o reproduz.
