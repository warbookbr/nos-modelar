# Pergunta 5: tempo por operação nas peças mais pesadas

Medido em 2026-11-13 numa máquina de quatro núcleos, com outros agentes trabalhando ao mesmo tempo, o que deixa todo número com folga para cima. Cada execução foi feita sozinha, uma por vez, com limite de 15 minutos (nenhuma chegou perto). O que se mediu é só `executarReceita` com o registro cronometrado de `tools/modelar/descrever-peca.mjs`; réguas de malha, auditoria, contatos e Blender ficaram de fora. Por isso o descrever do furgão (cerca de 170 s) é maior que a execução medida aqui (84 s): a diferença é a medida das partes e as réguas, que esta pergunta não cobre.

## Como reproduzir

O script mora fora do repositório, em `/tmp/claude-0/-home-user-nos-modelar/a45881b0-884a-5495-8d79-e44b78fae420/scratchpad/inventario-5c/medir.mjs` (e `analisar.mjs`, na mesma pasta). O essencial dele é este.

```
const { registroCronometrado } = await import('tools/modelar/descrever-peca.mjs');
const receita = receitaDoModulo(await importarReceita(caminho));
const tempos = new Map();
const { registro, fechar } = registroCronometrado(REGISTRO_OPERACOES, { total: receita.PASSOS.length, tempos });
const { entrada, neutro } = executarReceita(receita, { registroOperacoes: registro });
fechar(entrada.PASSOS);   // tempos: índice do passo -> { op, ms }
```

Comandos, rodados da raiz do repositório e em série, com `S` a pasta acima: `node $S/medir.mjs procedural/pecas/furgao-realista/receita.js $S/furgao-realista.json`, o mesmo com `procedural/pecas/sedan-chassi-e-lataria/partes/carroceria/receita.js` e com `procedural/pecas/instalacao-solar/partes/casa/receita.js`, e `node $S/analisar.mjs furgao-realista.json sedan-carroceria.json casa.json` para as tabelas. O cronômetro mede o passo k da consulta k ao registro até a consulta k+1, então o tempo de um passo inclui o que o núcleo faz em volta da operação (leitura da seleção, conferências, gravação no estado). Todos os passos de cada peça voltaram com tempo, sem descarte.

## Escolha das três peças

O nome "furgão" tem duas receitas: `furgao` (131 passos) executa em 0,1 s, e quem leva o descrever de 170 s é `furgao-realista` (637 passos, 254 mil faces), que é a medida aqui. Para a terceira, executei sozinha cada receita de parte do acervo e cada receita de peça com mais de 180 passos. A mais lenta depois da carroceria do sedã foi a casa da instalação solar (15 s), seguida da carcaça da empilhadeira (4,7 s, 181 passos, 31 mil faces). A empilhadeira inteira só abre por montagem, que não faz parte desta medida. A telha da instalação solar tem o maior número de passos do acervo (823) e executa em 1,3 s. As demais com mais de 180 passos executam em 0,1 a 0,3 s.

## Resultado por peça

| Peça | Passos | Faces | Tempo total | Soma dos passos |
|---|---|---|---|---|
| furgao-realista | 637 | 254 332 | 84,2 s | 82,7 s |
| sedan-chassi-e-lataria/carroceria | 299 | 174 593 | 171,4 s (outra rodada: 178,7 s) | 171,3 s |
| instalacao-solar/casa | 157 | 8 112 | 15,0 s | 15,0 s |

Tempo somado por operação e número de chamadas (as oito mais caras de cada peça), em segundos.

| Furgão realista | s | chamadas | Carroceria do sedã | s | chamadas | Casa | s | chamadas |
|---|---|---|---|---|---|---|---|---|
| aberturaPorContorno | 25,4 | 17 | aparar | 75,5 | 15 | extrusao | 14,7 | 9 |
| rotaciona | 13,2 | 37 | subtrair | 34,6 | 1 | rotaciona | 0,2 | 45 |
| transladar | 13,0 | 35 | limparLascas | 16,3 | 34 | transladar | 0,1 | 22 |
| subtrair | 10,7 | 18 | parte | 15,6 | 55 | parte | 0,0 | 29 |
| arranja | 4,6 | 12 | pincel | 11,5 | 55 | material | 0,0 | 29 |
| unir | 3,0 | 6 | intersectar | 8,5 | 29 | publicarPorta | 0,0 | 3 |
| lathe | 2,4 | 47 | unir | 3,3 | 10 | cubo | 0,0 | 20 |
| subdivisao | 2,4 | 32 | subdivisao | 1,7 | 35 | | | |

As três operações mais caras somam 62,5% do tempo no furgão (aberturaPorContorno, rotaciona, transladar), 73,8% na carroceria (aparar, subtrair, limparLascas) e 99,4% na casa (extrusao, rotaciona, transladar, com a extrusão sozinha em 98%).

## As dez chamadas mais lentas de cada peça

Furgão realista (índice do passo, operação, segundos): 91 e 92 aberturaPorContorno com 2,3 cada; 274 com 2,2; 280 e 262 e 111 com 1,7; 256 com 1,6; 240 com 1,4; 112 e 268 com 1,3. Todas são aberturaPorContorno, recortes numa chapa subdividida; as dez somam 17,5 s, 21% do total. Fora delas, rotaciona e transladar custam até 0,57 s numa chamada só (passos 229, 624, 499, 498), e as 72 chamadas somam 26 s.

Carroceria do sedã: o passo 13 é um subtrair de 13 chapas subdivididas de uma vez e leva 34,6 s, 20% do total numa chamada. Os outros nove são aparar, entre 4,96 e 5,70 s: passos 213 (5,70), 151 (5,54), 146 (5,49), 218 (5,48), 124 (5,46), 119 (5,11), 141 (5,11), 171 (5,02), 198 (4,96). As 15 chamadas de aparar variam de 4,2 a 5,7 s.

Casa: passo 51 extrusao 6,3 s (altura 5,05, perfil de dezenas de pontos); 117 e 147 extrusao com 3,9 cada; 87 extrusao com 0,5. Os outros seis dos dez ficam abaixo de 0,03 s, e quatro extrusões somam 14,6 dos 15,0 s. Não li o código da extrusão, então não digo por que essas quatro custam o que custam.

## Agregado das três peças

Soma de 269,1 s de execução em 1 093 passos: aparar 75,5 s (28,1%, 15 chamadas), subtrair 45,2 s (16,8%, 19 chamadas), aberturaPorContorno 25,4 s (9,4%, 17), extrusao 17,3 s (6,4%, 62), parte 16,9 s (6,3%, 228), limparLascas 16,3 s (6,1%, 34), rotaciona 13,4 s (5,0%, 82), transladar 13,1 s (4,9%, 57). As três mais caras somam 54,3%. Nas duas peças grandes, as operações de booleana e de recorte (aparar, subtrair, aberturaPorContorno, intersectar, unir) levam mais da metade do tempo com poucas dezenas de chamadas de 0,3 a 5 s, e as de movimento e de rótulo, que são centenas, custam 0,01 a 0,4 s cada.

## Leitura do código das duas operações mais caras (leitura minha, não medida)

Aparar (`procedural/nucleo/operacoes/booleanas.js`, função `aparar`, linhas 2396 a 2455). Cada chamada refaz o molde de dentro da chapa (`moldeDeDentro`, que espessa a superfície refinada e fecha por paredes e tampa) e, com duas chapas, une os moldes na Manifold; em seguida passa o sólido inteiro por `nucleoBooleano` e por `limparNoEstado`. No sedã as 15 chamadas que li (passos 151 e 213 conferidos) usam as mesmas duas chapas (subdivisão 1 e 17), a mesma folga (0,0005) e os mesmos planos de fecho (y = 0,3 e y = 0,95), e o tempo por chamada é quase constante. Isso indica que o custo vem do que se repete a cada chamada: o molde, que não depende do sólido, e a booleana sobre o sólido atual, que cresce com a malha. A divisão entre os dois não foi medida e pede um perfil de CPU de uma chamada. O custo cresce com o número de chamadas (o molde é refeito igual) e com o tamanho da malha aparada (a booleana lê todas as faces dela).

Subtrair (função `nucleoBooleano`, linhas 243 em diante). Cada chamada solda os cantos coincidentes por chave de texto de coordenada, confere se cada operando é fechado montando um mapa de arestas dirigidas com chaves de texto, monta uma Manifold por operando, calcula a diferença e depois reclassifica as faces do resultado contra as de entrada. O trabalho é linear nas faces dos operandos, com constante alta (mapas de texto em vez de índices), mais o custo da própria diferença. Um trecho cresce com o número de ferramentas: para cada uma que não deixou face, refaz duas Manifolds sem a grade e intersecta com a peça (linhas 656 a 690), mas só no caso do aviso. O passo 13 do sedã subtrai 13 chapas de uma vez e leva 34,6 s, enquanto as 18 chamadas de subtrair do furgão somam 10,7 s (0,6 s em média); isso sugere custo ligado ao tamanho dos operandos e não ao número de chamadas, mas a medida não separa os dois.

## Quanto a IA espera e o que poderia ser reaproveitado (leitura minha)

Somando só a execução, uma rodada que reexecuta as três peças espera cerca de 270 s, 4,5 minutos, dos quais a carroceria do sedã é 64%. Uma rodada só do sedã espera cerca de 175 s de execução (carroceria 171 s, frente e traseira 1,5 s, rodas 0,8 s, vidros e acessórios 0,1 s), e a montagem do sedã leva cerca de 4 minutos para abrir, de modo que perto de 1 minuto é de outra coisa que não a execução das receitas das partes. Uma rodada do furgão realista espera 84 s de execução, dentro dos cerca de 170 s do descrever.

O que poderia ser reaproveitado entre rodadas, só apontado. Primeiro, o estado do núcleo depois do passo k depende apenas dos passos 0 a k; os 15 aparos da carroceria estão entre os passos 119 e 218, e um ajuste depois deles refaz hoje os 171 s inteiros mesmo com o prefixo intacto. Um cache de prefixo por serialização exata dos passos, no molde do `memoria-de-pura.js` que o núcleo já usa em `subdivisao`, atacaria isso, e o custo dele é guardar o estado inteiro (174 mil faces). Segundo, os aparos da carroceria repetem o mesmo molde, que uma memória por chapa, folga e plano de fecho calcularia uma vez. Terceiro, o subtrair do passo 13 depende só das 13 chapas, é o primeiro custo grande da receita e portanto faz sempre parte do prefixo reaproveitável.

## O que não consegui medir

Não separei, dentro do passo, o tempo da Manifold, o do molde, o da limpeza e o da gravação no estado, porque isso exigiria perfil de CPU, fora do que se pediu. Não medi o descrever inteiro nem a abertura da montagem, só as execuções das receitas, e por isso os 4 minutos da montagem do sedã ficam só em parte explicados (175 s de execução). A única repetição foi a carroceria (171,4 e 178,7 s, variação de 4%); as outras duas peças tiveram uma rodada só, e o efeito dos outros agentes na máquina não foi isolado. A empilhadeira inteira não foi medida, só a carcaça dela, e o código da extrusão e da abertura por contorno não foi lido.
