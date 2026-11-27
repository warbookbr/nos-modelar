# Medidas avulsas: quando usar cada uma

Estas ferramentas medem uma coisa só e nenhum outro documento de uso as apresenta. Cada parágrafo diz em que momento do trabalho a ferramenta serve e o comando que a chama; as opções saem do próprio comando com `--ajuda` ou do cabeçalho do arquivo. Todas imprimem números que ordenam o trabalho, e nenhuma aprova forma.

## Montagem

Use `npm run proporcoes -- --proporcoes=<proporcoes.json>` quando as medidas de uma montagem estão escritas em mais de um lugar e é preciso saber se o andaime e os números marcados das receitas seguem a fonte única; com `--escrever` ele reescreve os dois a partir dela.

Use `npm run planejado -- --montagem=<montagem.json>` depois de executar as partes de uma montagem por etapas, para comparar a caixa e as portas de cada parte com o volume que o andaime planejou.

Use `npm run sobra:partes -- <esboço> --dentro=<contida>:<continente>` quando uma parte deveria ficar dentro do contorno de outra, como o vidro dentro da moldura, para medir vista por vista o quanto ela aparece para fora.

Use `npm run descrever:montagem -- <piloto>` para ler o diagnóstico de encaixe de um dos quatro pilotos de montagem (`pino-e-luva`, `anel-e-faixa`, `roda-no-freio` e `aro-no-pneu`); a montagem persistida de um objeto se descreve com `npm run descrever:montagem:persistida`.

## Superfície de chapa

Use `npm run zebra -- <receita>` quando a superfície lisa de uma chapa parece ondular no reflexo e é preciso um número por região: ele conta as ilhas de reflexo e os laços fechados de listra, por faixa de comprimento de onda.

Use `npm run distancia:pele -- <receita>` quando a receita declara a pele analítica (`PELE`) e é preciso saber, por região, quanto a superfície limite da chapa se afasta dela; com `--zebra` o veredito se junta ao da zebra.

Use `npm run preenchimento:rede -- <receita>` quando o miolo de uma rede de curvas sai torto depois de alisar, para ver como o preenchimento usou as curvas vizinhas em cada rede.

## Contra a imagem de referência

Use `npm run casamento:vista -- <esboço ou peça> --vista=<vista> --referencia=<png>` quando há imagem de referência de uma vista e é preciso saber em que regiões o material e as divisas do modelo se afastam dela.

Use `npm run perfil:cor -- --imagem=<png> --caixa=<x0,y0,x1,y1> --cores=<nome:#rrggbb,...>` quando a medida que falta está na imagem: ele classifica os pixels pela cor de cada material e dá a largura de cada cor em cada altura.

Use `npm run silhueta:pedida -- --esboco <arquivo> --parte <nome> --vistas <export>` quando um corpo foi pedido pelas vistas (`lacosPelasVistas`) e é preciso saber, faixa por faixa de altura, quanto a malha da parte se afasta do corpo pedido.

## Malha e execução

Use `npm run costura:registrada -- <peça>` quando o arredondamento de uma costura (`arredondarCostura`) acaba em dentes ou não fecha, para saber se o `unir` registrou a costura inteira: ele mede cada `unir` com a receita cortada logo depois dele e sai com 1 quando há aresta perdida ou de sobra.

Use `npm run reguas:malha:acervo -- <peça> [<peça> ...]` para ter numa linha por peça a face degenerada, o triângulo fino e o serrilhado da costura; sem peça ele mede o acervo inteiro, o que leva minutos, e com `--json=<arquivo>` grava os números.

Use `npm run perfil:execucao -- <peça> --perfil` quando a receita demora e é preciso saber em que passo e em que operação o tempo vai; `--executar` dá só o tempo da execução num processo novo, e `--acervo` lista o grafo de leitura e as sequências de subtrair de todas as peças, sem executar nada.

## O que pertence a uma peça

Use `npm run material -- <peça>` antes de mover, renomear ou apagar uma peça, para ver tudo que pertence a ela e em que pasta está, com o que a receita declara separado do que só existe por convenção de nome.
