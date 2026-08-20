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

- `fastback-1965-silhueta.json` — silhueta lateral, topo e base, de um cupê
  fastback de 1965. Calibrada por entre-eixos de 2743 mm; resíduo de −1,9% no
  comprimento e +1,8% na altura.
- `roda-realista-alvo.png` — alvo visual da roda dianteira, anterior a esta
  convenção.
