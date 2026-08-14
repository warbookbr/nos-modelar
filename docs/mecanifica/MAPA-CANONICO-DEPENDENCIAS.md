# Mapa canônico de dependências

Este documento fixa o contrato das R00–R02. Ele não é o mapa gerado: a fonte de
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

## Mapa derivado da R02

`mecanifica.mapa-dependencias`, versão `1`, é derivado somente de um snapshot
completo. Ele contém `entidades` com proveniência, `composicao` para declarações
diretas, `ocorrencias` para cada caminho semântico desde uma raiz, `usos` para
o índice reverso e `relacoes` para declarações e suas ocorrências. `raizes` e
`cobertura` preservam o universo ao qual a alegação de completude se refere.

Uma montagem compartilhada aparece uma vez como entidade e declaração, mas cada
instância e cada caminho desde uma raiz aparece como ocorrência. Endpoints de
relação são convertidos para IDs e passos semânticos; nenhum índice de array,
UUID, caminho local ou malha é exportado. Todas as listas são ordenadas por
identidade e caminho, e a mesma autoria em ordem equivalente produz os mesmos
bytes JSON.

## Consulta de impacto da R03

`mecanifica.impacto-global`, versão `1`, recebe somente `{ tipo, id }` e um
mapa completo. Retorna dependentes diretos e transitivos, raízes afetadas e não
afetadas, caminhos do alvo, relações tocadas e `roteiroRevalidacao` ordenado.
O roteiro aponta montagens e proveniência, mas não executa gates, altera autoria
ou promete aprovação. Alvo ausente, mapa incompleto ou entidade fora do universo
falham fechadamente. A consulta não infere dependência por geometria.

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

## Consumo MCP da R04

O servidor MCP anuncia sempre `mecanifica://dependencias`. Quando o host ainda
não definiu um universo, o recurso responde apenas que ele não está
configurado. Para habilitar a leitura global, o host define
`MECANIFICA_UNIVERSO_DEPENDENCIAS` como caminho absoluto para um arquivo comum
com este contrato local:

```json
{
  "formato": "mecanifica.universo-mcp-dependencias",
  "versao": 1,
  "universo": "universo.json",
  "raizMontagens": "montagens",
  "raizPecas": "pecas-resolvidas"
}
```

Os caminhos são resolvidos pelo host relativamente ao arquivo de configuração;
nunca são recebidos do agente nem devolvidos pela interface. O recurso público
retorna somente identidade do universo, contagens, raízes, hash `sha256:` do
mapa derivado e cobertura. Ele não devolve documentos, composição, ocorrências
ou o mapa completo.

`consultar_impacto_global` recebe exclusivamente `{ "tipo": "peca" |
"montagem", "id": "slug-semantico" }` e devolve
`mecanifica.impacto-global` v1 reduzido. A ferramenta é somente leitura: ela
reconstrói um snapshot consistente, não executa revalidação, não altera autoria
e não promete aprovação. Com autoria ativa configurada pelo host, as revisões
ativas autorizadas alimentam o mesmo snapshot; a ausência delas mantém o
fallback estático.

A superfície MCP passou para `mecanifica.mcp.revisao.v5` e o servidor
`mecanifica-mcp` 0.5.0. O contrato anterior v4 não anuncia essa ferramenta nem
o recurso de dependências.

## Continuidade e escala da R05

A prova de continuidade publica, em repositório temporário de autoria, uma
revisão ativa de `sistema-a` que remove o uso compartilhado. Após encerrar o
cliente MCP e abrir outro, o hash do mapa muda e a consulta de
`peca-compartilhada` passa de `sistema-a` e `sistema-b` para somente
`sistema-b`; a consulta de `sistema-a` preserva a proveniência
`revisao-ativa`. Assim, a nova sessão não depende de cache do cliente.

O adaptador permite fixar a quantidade de tentativas apenas para provas de
concorrência. Quando o estado observado muda durante uma captura, ele propaga
`universo-alterado` e não devolve resumo nem mapa parcial. Em operação normal,
mantém as duas tentativas otimistas do snapshot v1.

A mesma prova mede, em bytes UTF-8 serializados, o impacto direcionado da peça
contra a soma dos três contextos completos das raízes do universo e exige que o
primeiro seja menor. A métrica é calculada na execução, não congelada como
tamanho de protocolo: mudanças legítimas no contexto não tornam uma medida
histórica uma restrição artificial.

## Fronteira

R00 valida o universo e suas referências de composição. R01 acrescenta o
snapshot de fontes, revisões ativas, hashes e recusa de concorrência. R02 deriva
arestas, ocorrências, relações e usos reversos. R03 consulta esse mapa. R04 o
expõe de forma reduzida no MCP. Este contrato não executa revalidação, não prova
colisão e não altera autoria.
