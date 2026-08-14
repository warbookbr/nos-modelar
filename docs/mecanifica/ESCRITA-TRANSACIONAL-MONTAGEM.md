# Escrita transacional de montagem

## Estado

**Bloqueada por garantia de armazenamento.** Não existe writer publicado para
montagens, receitas ou MCP.

## Contrato necessário

Uma escrita local só poderá publicar autoria se, antes da visibilidade do
destino, ela validar bytes canônicos, identidade, referências, versão e todas as
pré-condições. Falha, destino concorrente, symlink ou confirmação divergente
devem preservar o estado anterior byte a byte. Sobrescrita nunca é implícita.

O retorno precisa distinguir `planejado`, `aplicado`, `destino-existente` e
`falha-recuperavel`; não pode chamar uma publicação parcial de sucesso.

## Bloqueio comprovado

O experimento de autoria controlada (PR #25, não mergeado) demonstrou que a API
portátil de `fs` do Node não prova, para diretórios, uma transição única de um
conjunto completo com `no-clobber` contra destino concorrente. Criar o destino
exclusivamente e mover arquivos depois deixa uma janela observável e pode
persistir estado parcial sob término abrupto.

Portanto, este plano não implementa um writer que finja atomicidade. Retomar
exige escolher e provar uma alternativa:

1. primitivo nativo de rename sem substituição, com plataforma suportada
   explicitamente definida;
2. protocolo de commit/visibilidade com contrato de armazenamento revisado;
3. redução explícita da garantia, aprovada como mudança de produto.

MCP, API, Git remoto e edição de receitas continuam fora até essa decisão.
