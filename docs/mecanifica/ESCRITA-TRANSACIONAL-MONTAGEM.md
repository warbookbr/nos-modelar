# Escrita transacional de montagem

## Estado

**Contrato local aprovado.** Existe repositório interno de revisões imutáveis e
perfil MCP de autoria opt-in para montagem; API e Git remoto não existem.

## Contrato necessário

Uma escrita local só poderá publicar autoria se, antes da visibilidade do
destino, ela validar bytes canônicos, identidade, referências, versão e todas as
pré-condições. Falha, destino concorrente, symlink ou confirmação divergente
devem preservar o estado anterior byte a byte. Sobrescrita nunca é implícita.

O retorno precisa distinguir `planejado`, `aplicado`, `destino-existente` e
`falha-recuperavel`; não pode chamar uma publicação parcial de sucesso.

## Limite anterior

O experimento de autoria controlada (PR #25, não mergeado) demonstrou que a API
portátil de `fs` do Node não prova, para diretórios, uma transição única de um
conjunto completo com `no-clobber` contra destino concorrente. Criar o destino
exclusivamente e mover arquivos depois deixa uma janela observável e pode
persistir estado parcial sob término abrupto.

## Decisão

Foi escolhido um protocolo de commit/visibilidade com armazenamento revisado:

1. o conteúdo completo vira um objeto canônico identificado por SHA-256;
2. objeto e commit são escritos e sincronizados em temporários irmãos;
3. `fs.link` publica cada arquivo completo sem substituir destino existente;
4. somente o commit publicado torna a revisão visível aos leitores;
5. revisões são imutáveis e nomeadas pelo próprio hash;
6. dois filhos do mesmo pai são conflito explícito, nunca sobrescrita.

Uma queda antes do commit pode deixar objeto órfão, mas nenhuma revisão parcial
visível. Limpeza de órfãos pode ser feita depois sem afetar o histórico. A API
oficial do Node confirma que `open` com `wx` recusa caminho existente e que
`fsPromises.link` cria um novo nome para um arquivo já completo; o protocolo não
depende de rename de diretório.

O recorte suporta sistema de arquivos local comum. Filesystem de rede não é
prometido porque exclusividade pode variar por implementação.

O perfil MCP `autoria` reutiliza este serviço quando o host fornece catálogo e
repositório autorizados. Ele planeja, inspeciona e aplica por identidade
semântica, confirmação e revisão observada; o cliente não recebe nem fornece
caminhos locais. API, Git remoto, receita, múltiplos hosts e filesystem de rede
permanecem fora. A existência dessa porta não restringe futuras interfaces que
ofereçam garantia equivalente ou superior.
