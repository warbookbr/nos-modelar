# Pergunta 7: para quem o projeto serve (primeiro levantamento)

Levantado em 2026-11-13 sobre a main de `5a972596`. Para cada um dos quatro usos que a pessoa deu, o que o acervo já tem, o que faltou num caso real e onde a falta mora. Só o uso de manual de instalação tem um caso levado até o fim nesta semana; os outros três estão ditos pelo que o acervo contém, sem caso de ponta a ponta.

## O que existe para os quatro

Fato medido. `procedural/familias` tem sete famílias além do exemplo: aparelho de caixa, cadeira, cilindro hidráulico, dobradiça, móvel de caixa, roda com pneu e superfície aerodinâmica. `modulos/` tem três exportadores (CAD, glTF e OBJ). A montagem v5 guarda a ordem de construção em `etapas` e desenha as etapas com `npm run etapas -- <montagem.json> --olhar`.

## Manual de instalação

Fato medido. A instalação solar no telhado (`procedural/pecas/instalacao-solar`, 11 receitas de parte e a montagem) serviu a um manual real nesta semana. O modelo deu as imagens de cada passo e a auditoria de interseções acusou um grampo sobre a emenda do trilho antes de a pessoa ver a imagem. O manual em si, com a ordem dos passos, a lista de peças com quantidade e a tabela de fios, foi escrito à mão numa página fora do repositório, e as imagens foram capturadas uma a uma por script de rascunho. A lista de peças com quantidade não sai da montagem por nenhum comando. Na mesma peça, o cubo de 0,0864 por 0,0004 por 0,165 aparece 120 vezes e o cilindro de raio 0,011 aparece 104 vezes, cada um como passo próprio (medida da pergunta 5), e a telha tem 823 passos.

Leitura minha. O que faltou mora em três lugares. A lista de peças e o passo a passo com imagem por etapa são saída além do objeto, e cabem num módulo ao lado dos exportadores, lendo `etapas` e as instâncias da montagem. Perfil, grampo, emenda e telha são peças padrão reaproveitáveis por medida, e cabem em famílias. A repetição de uma peça modelada uma vez e posicionada muitas é do núcleo ou da montagem, e o caso real já existe.

## Arquitetura

Fato medido. O acervo tem uma casa, a da instalação solar (`partes/casa`, 157 passos, 15 s de execução, 98% do tempo em quatro extrusões), e nenhuma família de parede, telhado, porta ou janela. Leitura minha: falta a família de elementos de construção e a saída de desenho com cotas e corte; o custo da extrusão da casa pede a leitura do código antes de modelar uma segunda.

## Peças automotivas

Fato medido. É o uso com mais acervo: o furgão realista (637 passos), o sedã com chassi e lataria, em partes, e as carrocerias de carro em arquivo único. A carroceria do sedã leva 171 s para executar e a montagem dele, cerca de 4 minutos para abrir. Leitura minha: a capacidade de forma existe; o que limita é o tempo de cada rodada, que é assunto da pergunta 5 (reaproveitar o prefixo da receita e o molde do aparar).

## Filme animado

Fato medido. O braço robótico e a empilhadeira têm juntas com curso declarado, e a extensão `articulacao` existe. A outra sessão registrou que as juntas na montagem ainda não foram provadas num objeto de prova, e a auditoria de interseções do braço deixa 30 dos 66 pares inconclusivos. Não medi se algum exportador leva as poses do curso. Leitura minha: este é o uso mais longe; depende do primeiro ciclo de objetos de prova do plano (mecanismo com juntas) e de medir a exportação com poses.

## Lacunas

Não medi nenhum dos quatro usos com um pedido novo de ponta a ponta além do manual. A afirmação sobre exportação de poses é uma lacuna, não um achado.
