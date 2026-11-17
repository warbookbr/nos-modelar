# Comparar com a referência por comando

Consulta da skill [criar-peca](../SKILL.md): os comandos que substituem os scripts de prancha, de saída e de conferência do motor
que cada rodada reescrevia, e o que continua por script. Origem: as sete rodadas de modelador da bicicleta, em 2026-11-16, em que
42 dos 83 comandos de shell eram essas tarefas; a medida está na
[pasta do plano](../../../../docs/modelar/banco-de-provas/comparar-com-a-referencia-2026-11-16/README.md). As opções de cada
comando estão no `--ajuda` dele.

## A receita gera sem recusa

`npm run descrever -- <peça> --recusas` executa a receita como o `descrever` e lista os órfãos do núcleo, com passo, operação e
motivo, sem medir; sai com 1 quando há órfão e com `SEM RECUSA` e 0 quando não há. Não confira com um script de uma linha
`nucleo(gerarPassos(TABELA)).orfaos`: sem o que a receita exporta além dos passos (`PARAMS`, `TOPO`, `MATERIAIS`, `ESQUELETO`,
`ALIASES`) ele inventa órfãos de ponto e de alias que a peça não tem, 4 na carenagem de prova e 42 na lava-louças.

## A saída da bancada

`npm run bancada -- <peça> ... --saida=<pasta> --sobrescrever` apaga e refaz a pasta que a bancada criou (ela leva o marcador
`.saida-da-bancada`) e recusa, dizendo o caminho, a que ela não criou. Não apague a saída com `rm -rf` antes da captura.

## A prancha modelo e foto

```bash
node tools/modelar/prancha-de-referencia.mjs <peça> --foto=<arquivo> --regua=<x0,y0,x1,y1=mm> \
  [--regiao=<x0,y0,x1,y1|auto>] [--vistas=direita,frontal] [--parte=<parte>] [--copia=x-] [--espelhar=direita] [--disposicao=lado|sobreposto]
```

O comando põe a vista ortográfica da peça, ou da parte isolada e enquadrada, ao lado da foto, as duas na mesma escala em mm: a do
modelo vem da câmera da bancada, e a da foto da régua, uma medida conhecida dela em px e em mm. Grava o PNG e um JSON com as escalas
e as extensões em mm. A foto de terceiro fica fora do repositório (`tmp/`). Cada linha diz para onde os eixos do modelo caem na
vista (na `direita`, +z fica à esquerda); quando a foto mostra a frente do outro lado, use `--espelhar` nessa vista, que é a
inversão que a sessão da bicicleta cometeu à mão no contorno do selim. Com mais de uma vista, foto, régua e região levam um valor
por vista separado por `;`.

## A cópia de uma parte repetida

A parte que tem várias cópias (os dois pedais) isola-se inteira. `--copia=<eixo><+|->`, com `--selecionadas` na bancada ou com
`--parte` na prancha, desenha só a cópia do lado pedido do centro da seleção e enquadra a câmera nela (`x+,z-` separa uma de
quatro). O recorte por `--zoom` não serve para isso, porque amplia os pixels da captura e o pedal continua com os 2 px/mm dela.

## Várias miras numa chamada

`--mirar=x,y,z[,d]/x,y,z[,d]/...` tira cada vista de `--vistas` em cada mira, numa chamada só, com a distância de cada mira no
quarto número; a prancha de 12 miras da família de componentes saiu em uma chamada de uns 65 s no lugar de 36 de uns 15 s cada.

## O que continua por script

A medição livre na foto continua por script: a máscara (por cor, por luminância, pelo primeiro trecho escuro), o sentido da
varredura e o trecho escolhido mudam com a peça, e é essa liberdade que faz a medida servir a cada uma. O script lê a régua e a
região do JSON da prancha em vez de medi-las de novo. O caso de prancha, de saída ou de conferência que os comandos acima não
cobrem também vai por script, e vira atrito no relatório, com o comando que faltou, e não regra nova.

## O pacote do crítico

O pacote sai de `npm run vistas:critica -- <peça>`, nunca de captura avulsa. Quando a peça tem contorno medido, ele leva
`contorno-sobreposto.png`, com o trecho que é encontro com outra parte tracejado e fora da medida. Além do `pedido.md`, ele grava o
pedido por perguntas fechadas nas duas ordens (`pedido-fechado-a.md` e `pedido-fechado-b.md`): quem conduz despacha um crítico para
cada ordem, sem a história, e junta as duas respostas com `node tools/modelar/vistas-para-critica.mjs --juntar=<pasta da rodada>
<resposta A> <resposta B>`, que dá a nota pela regra escrita no pedido, com a pergunta que muda entre as ordens como não
verificável. A regra do laço está em
[O laço do crítico](../../../../docs/modelar/usar/REFERENCIA-E-CRITICA-VISUAL.md#o-laço-do-crítico).
