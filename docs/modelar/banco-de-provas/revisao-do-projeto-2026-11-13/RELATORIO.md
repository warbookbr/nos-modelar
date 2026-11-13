# Relatório da revisão do projeto: o que protege, o que só custa e o que decidir

Escrito em 2026-11-13 pela sessão que ficou com o plano inteiro depois de a outra ser encerrada. Cada grupo traz o número que o sustenta, o arquivo do inventário onde está o comando que o reproduz, e a recomendação. A revisão cruzada entre duas sessões prevista no plano não aconteceu; no lugar dela, cinco números da metade de pastas e núcleo foram refeitos contra o código e bateram, e o resto dela está como a sessão encerrada deixou. Nada aqui foi executado: cada recomendação aprovada vira plano próprio ou correção pontual.

## Grupo A: o que protege e fica como está

A auditoria de interseções, a guarda do acervo por peça e o revisor adversarial pegaram defeito real nesta semana: o grampo sobre a emenda do trilho, a volta de borda sem declaração no farol e três defeitos na troca de canto das costuras ([processo](pergunta-1-2-3-6-processo-documentos-e-agentes.md)). A fronteira do núcleo está limpa em código, com zero imports para fora ([pastas](pergunta-4-pastas-e-modulos.md)). Recomendação: ficam.

## Grupo B: protege, mas devia ser automático

1. A guarda da peça alterada só roda no CI. O único defeito real entre sete reprovações lidas do CI teria sido pego em 2 minutos na máquina, e custou 17 minutos e um reenvio. Recomendação: a bateria local roda a guarda do acervo só das peças que o envio mudou.
2. O mapa gerado conflita em toda junção com trabalho de outra sessão e a lista de planos ativos é escrita à mão em três arquivos. Recomendação: o mapa deixa de ser versionado, ou a junção o regenera sozinha; a lista de planos ativos passa a ser gerada nos três lugares.
3. A mesma lista de proibições foi copiada à mão no pedido a cinco agentes. Recomendação: ela mora num arquivo só, que a definição de cada agente já carrega.
4. A fronteira do núcleo não tem gate para imports de `src`, `tools` e módulos, nem para arquivos `.mjs` e `.ts`. Recomendação: estender a régua que já existe.
5. Duas réguas medem face degenerada com critérios diferentes, e o braço passa numa e deixa 30 de 66 pares inconclusivos na outra. Recomendação: uma só conta, a da auditoria, usada pelas duas; isso já é parte do plano das costuras.

## Grupo C: só custa, e a recomendação é mudar

1. Tetos de tempo fixos. Três das sete reprovações lidas eram teste que passou de um teto posto com uma medida só, com a máquina do CI mais lenta que a local. Recomendação: o teto passa a ser relativo à mediana das últimas execuções, e o estouro isolado vira aviso.
2. Orçamento de leitura sem folga. Quatro roteiros estão a menos de 500 bytes do teto e um está no teto exato. Recomendação: manter o teto, que derrubou a leitura de 62 KB para 15 KB, e dar folga de 10% aos cinco roteiros, para que uma frase nova não obrigue a cortar outra correta.
3. As rodadas antigas do furgão somam 34.375 linhas, um terço do código das peças, e nenhum arquivo as importa. Recomendação: saem do repositório, porque o histórico do git as guarda.
4. Dos 413 documentos, 174 (1,06 MB) só são alcançados pelas páginas de índice, 66 deles planos encerrados. Recomendação: não mexer agora; falta medir o que as sessões abrem de fato antes de cortar.

## Grupo D: o núcleo, para quem escreve receita

1. `parte` e `material` são dois passos com o mesmo seletor em 2.363 pares, 52% de todos os passos do acervo ([operações](pergunta-5-operacoes-e-verbosidade.md)). Recomendação: `parte` aceita o material, e os dois passos continuam valendo.
2. Dezoito operações não declaram argumento obrigatório, e raio negativo ou dois lados passam em silêncio; o nome de parâmetro errado aborta a peça sem dizer o passo ([erros](pergunta-5-erros-nomes-e-argumentos.md)). Recomendação: recusar com passo, valor e limite, e sugerir o nome mais próximo. É a mudança de maior efeito para a IA, porque hoje o erro só aparece na medida, uma rodada depois.
3. A carroceria do sedã leva 171 s por execução, com 15 chamadas de aparar que refazem o mesmo molde e um subtrair de 35 s logo no início ([tempo](pergunta-5-tempo-por-operacao.md)). Recomendação: guardar o estado do prefixo da receita que não mudou e o molde do aparar.
4. Quarenta e uma de 43 receitas não importam nada e reescrevem os mesmos auxiliares (a conversão de milímetro em 48 peças, área e sentido do contorno em 23). Recomendação: o núcleo exporta esses auxiliares.
5. Quatorze operações e as cinco extensões não aparecem em nenhuma receita vigente, e as extensões não entram no catálogo gerado. Recomendação: não tirar nenhuma agora; pôr as extensões no catálogo.

## Grupo E: sessões e agentes

1. Um agente parado deixou o trabalho sem commit e não pôde ser retomado. Recomendação: o agente grava commit parcial na própria worktree a cada etapa.
2. Os oito diários de atrito têm 244 itens em formatos diferentes, e só um deles escreve o destino de cada item. Recomendação: um formato só, com o campo de destino, para que se conte quantos viraram correção.

## Grupo F: para quem o projeto serve

O manual de instalação foi feito de verdade nesta semana, e o projeto deu o modelo e as imagens, mas não a lista de peças nem o passo a passo, escritos à mão ([usos](pergunta-7-para-quem-o-projeto-serve.md)). Recomendação: o primeiro item do roadmap é a saída de manual (lista de peças e imagem por etapa a partir da montagem), porque tem caso real e usuário; as famílias de perfil, grampo e telha vêm junto. Arquitetura e filme animado esperam um caso real.

## Ordem que eu recomendo

Primeiro D2 e B1, que evitam rodadas perdidas todo dia. Depois B2, C1 e C2, que tiram os reenvios sem defeito. Depois D1 e D3. O grupo F entra como plano próprio quando a pessoa quiser retomar o manual.

## O que este relatório não cobre

As quatro reprovações do CI de 2026-11-09 e duas de 2026-11-12 não foram lidas. Quantas vezes cada gate local parou um envio não tem registro. O uso real da leitura por sessão não foi medido. A frente de validação por objetos de prova, fatia 4 do plano, não começou.

## Decisão da pessoa, em 2026-11-13

A pessoa aprovou todas as recomendações de mudança dos grupos B, C, D, E e F, com a ordem recomendada acima. O item C4 (documentos só alcançados por índice) fica sem ação até a medida do que as sessões abrem de fato, que ela também aprovou fazer, junto com trazer para este relatório a comparação com projetos comparáveis. Ela tirou deste plano a validação por objetos de prova: "a modelagem eu vejo depois".

Ela pediu um plano próprio para a revisão das verificações e dos testes, uma por uma, com a medida de estragar o código de propósito e ver quais testes percebem. E pediu que a análise cubra os mecanismos que ficaram de fora: as skills, a bancada com o crítico visual, o servidor de ferramentas, o backlog, o `comecar` e a ficha de capacidade. Para esses, a pergunta é dela: "se melhorássemos isso de alguma maneira, o que aconteceria?". O módulo de pesquisa não entra como mecanismo; é documentação e cai na medida de leitura.

Na mesma conversa, a pessoa aprovou por imagem a [proposta de organização dos documentos](proposta-de-organizacao-dos-documentos.md), que virou o [plano de organização dos documentos](../../planos/2026-11-13-organizacao-dos-documentos.md), e pediu que o trabalho seja organizado com agentes; a orquestração está no plano de revisão.
