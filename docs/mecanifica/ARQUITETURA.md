# Arquitetura atual

## Fronteira

Este repositório mantém a autoria mecânica para IA: executa receitas procedurais
determinísticas, adapta a geometria para inspeção, publica a bancada neutra e
concentra as ferramentas que medem, validam e comparam o conteúdo criado.

A arquitetura é avaliada pelo quanto ajuda a IA a criar, localizar, alterar,
isolar, medir, corrigir e manter peças e sistemas mecânicos. Interface humana,
narrativa, jogo e apresentação externa não definem esta arquitetura.

A Oficina humana, a aplicação jogável e o som não existem nesta árvore.

## Camadas que existem hoje

1. **Receita**: módulos em `prototipos/fps/v3/pecas/` exportam `meta` e
   `construir`, ou `PASSOS`, `PARAMS`, `TOPO` e contratos auxiliares.
2. **Núcleo**: `prototipos/fps/v3/motor/oficina.js` resolve parâmetros,
   topologia, identidades, portas, materiais declarados e malha neutra sem
   conhecer Three.js.
3. **Adaptadores de inspeção**: convertem o neutro para visualização sem mudar o
   formato persistido da autoria.
4. **Bancada**: `bancada.html` oferece seleção semântica, isolamento, contexto
   fantasma, explosão, hierarquia, subárvore e URLs reproduzíveis.
5. **Medição e revisão**: serviços em `tools/` descrevem peças, renderizam
   vistas, validam pacotes, preservam revisões e comparam resultados.
6. **Exportação resolvida**: `tools/mecanifica/exportar.mjs` valida e produz uma
   representação derivada da receita, útil para provas e consumidores sem
   carregar o núcleo procedural.
7. **Acesso MCP atual**: o perfil disponível expõe principalmente leitura,
   auditoria, comparação e vistas sobre os serviços existentes. Ele não é o
   núcleo de autoria e ainda não oferece o ciclo completo de escrita.

## Direção arquitetural

A evolução para carros completos e, depois, robôs deve acrescentar camadas sem
fundir todos os objetos em uma receita única.

1. **Peça**: unidade geométrica editável, gerada por uma receita responsável.
2. **Montagem**: composição de instâncias de peças e de outras montagens, com
   posição, identidade e relações declaradas.
3. **Mapa canônico**: fonte estruturada de composição, interfaces, dependências
   e impacto de alterações. Documentos e diagramas podem ser gerados dele, mas
   não substituí-lo.
4. **Contexto de trabalho**: separa alvo editável, componentes visíveis somente
   como contexto, dependências afetadas e validações obrigatórias.
5. **Validação de sistemas**: combina integridade estrutural, geometria,
   interfaces, montagem, movimento e inspeção visual.
6. **Serviços de autoria**: criam e alteram receitas, montagens e relações com
   escrita transacional, versionamento e falha segura.
7. **Portas de acesso**: MCP, CLI, API ou edição assistida podem expor essas
   capacidades. Nenhuma dessas portas define a estrutura interna.

A regra de direção é:

> **Peças são geradas por receitas. Conjuntos são organizados por montagens.
> Montagens podem conter outras montagens.**

Carro e motor são montagens recursivas. Não são receitas monolíticas.

## Invariantes

- O domínio automotivo não entra como caso especial no núcleo geométrico.
- Identidade persistida é semântica, nunca UUID de renderizador, índice de
  array, câmera ou posição casual de carregamento.
- A mesma receita e os mesmos parâmetros produzem o mesmo neutro e o mesmo
  resultado resolvido.
- Referência inválida, ambígua ou vazia falha com diagnóstico.
- Uma montagem não copia silenciosamente para si toda a autoria das peças.
- Isolamento visual não remove relações, dependências ou contexto estrutural.
- O alvo que pode ser alterado é distinto dos objetos exibidos somente para
  comparação.
- Alterar uma peça exige descobrir e revalidar os dependentes relevantes.
- Escrita inválida não pode publicar receita, montagem ou relação parcial.
- Medição e contratos mecânicos básicos não podem ser substituídos apenas por
  uma imagem convincente.
- Materiais permanecem declarativos, mas o contrato genérico de materiais ainda
  não existe.

## Estado operacional

Casos 1 e 2 estão homologados; o Caso 3 não foi iniciado. O contrato
`mecanifica.montagem` v1 e a pose rígida persistida já existem nesta
implementação; o plano v2 de relações locais está ativo somente em R00
documental.

O Módulo 1 do MCP, somente leitura e auditoria, foi aprovado. A primeira
tentativa de autoria controlada foi encerrada com decisão `interromper`; o PR
#25 foi fechado sem merge. Uma futura escrita, via MCP ou outra porta, precisa
de plano próprio e deve respeitar o modelo de autoria e as garantias de
transação descritos em [`AUTORIA-IA.md`](AUTORIA-IA.md).

O servidor estático local ainda falha ao resolver o import bare `earcut`; esta é
uma pendência da ferramenta de servir e inspecionar, não uma decisão de
geometria.

## O que ainda não existe

Ainda não existem:

- relações persistidas gerais em montagens;
- mapa completo de composição e dependências;
- contexto de trabalho derivado automaticamente desse mapa;
- camada de escrita de receitas e montagens para IA;
- solver geral de encaixe;
- validação de movimento e espaço varrido de sistemas completos;
- contrato genérico de materiais.

Esses itens são capacidades futuras da autoria. Não devem ser simulados por
posições de câmera, UUIDs do Three.js, arquivos gigantes ou documentação manual.

## Fora desta arquitetura

Ficam fora:

- interface de modelagem voltada exclusivamente a humanos;
- jogo e navegação;
- narrativa e explicação para público externo;
- áudio não relacionado ao ciclo de autoria;
- regras específicas de uma aplicação consumidora;
- qualquer recurso que não melhore criação, inspeção, validação ou manutenção
  pela IA.

A definição completa de autoria está em [`AUTORIA-IA.md`](AUTORIA-IA.md). O
estado e a direção das montagens estão em
[`MONTAGENS-SEMANTICAS.md`](MONTAGENS-SEMANTICAS.md).
