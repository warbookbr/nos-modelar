# Fontes da tabela de materiais

Cada valor da tabela cita uma destas chaves. Fonte aqui é **procedência**, não
prova: dizer de onde veio um número não o torna certo, torna-o conferível.

## Domínio público, consultado diretamente

- `FPL-GTR-190` — *Wood Handbook — Wood as an Engineering Material*, USDA Forest
  Service, Forest Products Laboratory, 2010. Domínio público (obra do governo
  dos EUA). É a referência canônica de propriedade mecânica de madeira, e já
  corrigiu um erro deste laboratório: eu usava 75 MPa para eucalipto, valor de
  madeira **verde**, quando cabo de ferramenta é madeira **seca** e a tabela
  5-5a dá 111,7 MPa a 12% de umidade.

## Aberto, com licença que permite uso

- `MATERIALS-PROJECT` — Materials Project, Lawrence Berkeley National
  Laboratory. CC-BY-4.0, com API pública. Cobre composto inorgânico cristalino:
  metal, liga, cerâmica. **Quase tudo ali é calculado por DFT, não medido**, e
  DFT erra de forma sistemática e conhecida. Entra por `bancos.py`, que obriga a
  etiqueta do método. Não cobre nada de origem biológica.

## Literatura, cada uma citada no seu lugar

- `LIT-SISAL-PU` — compósitos de sisal com poliuretano de mamona; ver
  `estudos/bibliografia_cabo.py`. Usados no estudo do cabo de pá.

## Memória, e é o que mais existe aqui

- `MEMORIA` — valor de manual lembrado, **não conferido contra fonte primária
  neste ambiente**. É a origem mais comum da tabela hoje, e por isso ela é
  marcada em cada linha em vez de ficar num aviso geral no topo que ninguém lê.
  Substituir `MEMORIA` por fonte de verdade é o trabalho permanente aqui.

## O que não pode entrar

MatWeb e Granta/CES (Ansys) são as tabelas de engenharia mais completas que
existem e são **proprietárias**. Podem ser consultadas por quem tem licença;
não podem ser copiadas para este repositório.
