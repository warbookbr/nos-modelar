# Mapa canônico de dependências

Este documento fixa o contrato da R00. Ele não é o mapa gerado: a fonte de
verdade continua sendo o manifesto e as montagens persistidas autorizadas.

## Universo de autoria v1

Formato: `mecanifica.universo-autoria`, versão `1`.

```json
{
  "formato": "mecanifica.universo-autoria",
  "versao": 1,
  "id": "universo-principal",
  "pecas": [{ "id": "disco", "ref": "disco" }],
  "montagens": [{ "id": "freio", "ref": "freio" }],
  "raizes": ["freio"]
}
```

`id` é a identidade semântica. `ref` é somente a referência que um carregador
confiável usa; não é caminho público. Cada ID e cada referência deve ser único.
As raízes precisam apontar para montagens enumeradas.

O universo é completo apenas dentro da lista declarada. O contrato não autoriza
varrer diretórios, inferir entidades por nome de arquivo ou tratar Markdown como
fonte de verdade.

## Validação estrutural da R00

O leitor deve recusar:

- universo vazio, chave extra, formato ou versão desconhecidos;
- ID ou referência fora do slug semântico;
- ID duplicado, referência duplicada ou raiz repetida;
- raiz, peça ou montagem referenciada que não esteja enumerada;
- montagem carregada cujo `id` diverge do ID do manifesto;
- ciclo entre montagens.

O leitor devolve cópia canônica, ordenada por ID, sem mutar o documento de
autoria. A validação aceita um carregador de montagens injetado pelo host; o
carregador recebe somente `ref`. Caminhos, filesystem, Git, MCP e peças reais
ficam fora desta camada.

## Snapshot confinado da R01

`mecanifica.snapshot-universo-autoria`, versão `1`, é produzido somente depois
de carregar todas as peças e montagens enumeradas. Cada fonte informa apenas
`id`, `ref`, `fonte` (`base-estatica` ou `revisao-ativa`), `revisao` e hash
`sha256:` do documento canônico. O snapshot também preserva os documentos
capturados para as etapas derivadas, mas nunca inclui caminhos locais.

O serviço puro recebe carregadores e o hash do host por injeção. O adaptador da
bancada confina referências a arquivos comuns sob as raízes declaradas e chama
revisões ativas por ID antes do fallback estático por `ref`. A revisão ativa
inválida não é escondida pelo fallback.

Para provar consistência, o serviço captura duas visões completas. Ele recusa
mudança de estado durante uma captura e compara hashes, fontes e revisões entre
as duas visões; uma tentativa adicional pode ser feita antes do diagnóstico
`universo-alterado`. Nenhuma visão parcial é publicada.

## Fixture de prova

`tools/mecanifica/fixtures/mapa-dependencias/` contém:

```text
sistema-a ─┐
            ├─ subconjunto-compartilhado ─ peça-compartilhada
sistema-b ─┘

sistema-isolado ─ peça-isolada
```

As duas primeiras raízes compartilham uma submontagem e uma peça. A terceira é
um ramo não afetado. Os testes derivados também cobrem referência ausente,
duplicidade, identidade divergente e ciclo.

## Fronteira

R00 valida o universo e suas referências de composição. R01 acrescenta o
snapshot de fontes, revisões ativas, hashes e recusa de concorrência. R02
derivará arestas, relações e usos reversos. Este contrato não executa
revalidação, não prova colisão e não altera autoria.
