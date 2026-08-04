# AUT-2026-18 — consulta de subárvore para IA

**Estado:** concluído

**Responsável:** Codex

**Repositório e base:** `warbookbr/nos-mecanifica`, branch
`codex/concluir-pendencias-autoria`, base `8c7852d`.

## Problema observado

`AUT-2026-17` deixa uma pessoa selecionar uma subárvore na bancada, mas uma IA
headless ainda precisa descobrir os filhos, montar uma lista e construir a URL
de inspeção por conta própria. Isso duplica conhecimento e permite que um filho
fique fora da revisão.

## Resultado

`npm run descrever -- <peça> --subarvore=<raiz>` devolve a raiz e seus
descendentes, mede apenas esse conjunto e imprime a URL publicada da bancada
com a mesma seleção.

## Incluído

- uma opção explícita, estrita e incompatível com `--partes`;
- resolução pela árvore semântica já validada;
- descrição filtrada e URL determinística para a bancada;
- prova de raiz, folha, nome inválido e ambiguidade de argumentos.

## Excluído

- nova API de montagem, transformação herdada, persistência, exportação ou
  solver;
- abrir navegador, capturar imagem ou alterar a cena pela consulta;
- inferir descendentes por nomes, geometria ou proximidade.

## Gate de saída

1. pedir `pinca` devolve exatamente pinça, duas pastilhas e pistão;
2. a URL contém a mesma seleção e reabre a bancada;
3. raiz inválida, valor vazio e mistura com `--partes` falham claramente;
4. a consulta não muda peças sem hierarquia nem o formato existente;
5. testes, documentação e gates do repositório passam.

## Fatias

1. fixar contrato e plano;
2. expor a consulta no CLI e testar saída/recusas;
3. documentar para a IA, validar e encerrar.

## Riscos e parada

Se a consulta precisar salvar uma montagem, controlar a câmera ou mudar a
geometria, ela para. Isso pertencerá a planos de estado ou apresentação, não a
uma leitura headless.

## Fechamento

**Concluído em 3 de agosto de 2026.**

O CLI `descrever` aceita `--subarvore=<raiz>`, usa a árvore semântica validada
para resolver o conjunto e imprime a descrição filtrada junto da URL publicada
da bancada. `pinca` resolve quatro partes; `pistao` resolve somente a folha.
Valor vazio, raiz ausente e mistura com `--partes` falham antes de imprimir uma
inspeção ambígua. A consulta não cria ou salva estado de montagem.

Gates: 46 arquivos / 1.020 testes, tipos, build, gabarito, IDs crus,
exportação, guardas de portas e câmera passaram. A ferramenta de bancada abriu
a URL resultante em isométrica e frontal, com as quatro partes isoladas e sem
nome ignorado. Pose, persistência, exportação de árvore e solver continuam
fora do recorte.
