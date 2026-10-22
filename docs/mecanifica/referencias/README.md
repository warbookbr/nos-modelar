# Referências de forma

Medidas derivadas de pranchas de referência, usadas para julgar desenho por
número em vez de por impressão.

## Regra de procedência

Este repositório é público e MIT. Prancha de terceiro **não entra aqui**: entram
apenas as **coordenadas derivadas** dela, que são fato sobre proporção e não
cópia do desenho.

Consequência aceita: os arquivos derivados não são regeneráveis pelo CI, porque a
imagem de origem não está versionada. Cada arquivo declara sua origem, o método
de calibração e o resíduo, para que a medida possa ser conferida por quem tiver
a prancha em mãos.

## A exceção escrita: imagem gerada entra, e não vale como dimensão

Imagem gerada por IA a pedido do dono do repositório pode ser versionada aqui, e
a regra acima continua de pé, porque ela não é prancha de terceiro. Ela entra
como alvo de CARÁTER de uma rodada de modelagem: que partes existem e que forma
cada uma tem. Quando há mais de uma vista, cada uma fica em seu arquivo, para que
a parte isolada na bancada tenha a vista correspondente sem procurar na folha.

**Imagem gerada não vale como fonte dimensional.** Medir proporção nela é medir
o que outro modelo inventou. A dimensão vem da `TABELA` medida da receita, e
quando as duas divergirem, a tabela manda.

Como uma imagem dessas chega ao disco também vale registrar, porque custou uma
conclusão errada: anexo de sessão vive em base64 dentro da transcrição do
projeto, em `~/.claude/projects/**/**.jsonl`, e sai de lá por decodificação.
Procurar por arquivo de imagem recente não acha nada e leva a concluir que a
imagem não existe.

## Como um derivado é produzido

Com `tools/mecanifica/prancha-referencia.mjs`, que decodifica o PNG em Node puro,
acha os painéis com tinta, extrai o envelope, calibra pixel→milímetro por uma
medida conhecida e converte para a convenção da Mecanifica.

A calibração usa o **entre-eixos** entre as manchas de contato das rodas com o
solo, e devolve como resíduo o erro contra duas medidas independentes —
comprimento e altura. O resíduo é a honestidade da escala: ele diz o quanto a
prancha está fora de esquadro antes de qualquer conclusão.

## Limite medido

Variando a janela de suavização de 1 a 41 px numa prancha de 736 px de largura:

| grandeza | comportamento | serve? |
|---|---|---|
| desvio absoluto médio de silhueta | move de 46 para 39 mm | **sim**, é estável |
| inversões de curvatura | vai de 31 a 51, sem convergir | **não**, é ruído |
| retidão | oscila entre 0,14 e 0,26 | não |

Ou seja: compare **proporção e posição** contra uma referência rasterizada.
Não conclua nada sobre caráter de superfície a partir da curvatura dela.

## Conteúdo

O repositório não guarda hoje nenhum conjunto derivado nem folha de peça: as
imagens de alvo visual das peças já modeladas foram apagadas junto com elas, e o
que cada rodada ensinou continua nos relatórios de texto.
