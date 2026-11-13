# Peças: o que só vale nesta pasta

Vale além do contrato da raiz, para quem cria ou muda uma peça.

- A peça é uma pasta, com `receita.js` e `referencias/`; peça em arquivo solto reprova em `npm run guarda:acervo`. O objeto de várias partes tem `partes/<etapa>/receita.js` e `montagem.json`.
- A receita exporta o `PLANO` (objeto, referências, escala, partes, critérios de reprovação) e os contatos; as medidas ficam na `TABELA`, em milímetro.
- O que a peça revela de errado numa ferramenta ou numa operação se corrige lá, e não com um contorno na receita.
- Imagem de referência com marca, logotipo ou nome de fabricante não entra na pasta, nem prancha de terceiro; entram as coordenadas derivadas.
- `npm run descrever -- <peça>` mede a peça, e `npm run bancada -- <receita> --vistas=frontal,isometrica` tira as vistas; as opções levam `=`.
- A bateria local roda a guarda de cada peça que o envio mudou. Quem aprova a forma é a pessoa, por imagem.
- Em `rodadas/`, o registro `rodada-NN.json` não é reescrito, e só a cópia da receita da última rodada fica.
- O comentário de cabeçalho da receita pode citar um plano encerrado pelo caminho antigo: o gate o aceita quando o nome consta em `docs/modelar/decisoes/PLANOS-ENCERRADOS.md`.
