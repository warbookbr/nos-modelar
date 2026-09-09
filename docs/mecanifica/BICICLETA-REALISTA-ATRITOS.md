# Bicicleta realista: diário de atrito da rodada

Diário ABERTO de uma rodada de modelagem que corre com dois objetivos ao mesmo
tempo: entregar a peça, e medir o Mecanifica de dentro enquanto ele é usado.

**Por que ele é escrito durante, e não no fim.** Atrito lembrado depois vira
opinião sobre o processo; atrito anotado no momento traz o comando que falhou, a
mensagem que veio e o que foi preciso fazer no lugar. A diferença aparece no
`ATRITOS-AUTORIA.md`: os itens que viraram capacidade são os que tinham
evidência anexada.

**O que entra aqui.** Operação que faltou e o contorno que foi usado. Mensagem de
erro que não disse o que fazer. Conta feita à mão que a ferramenta poderia ter
derivado. Comando repetido três vezes com o mesmo argumento. Rodada gasta num
defeito que uma medida já existente teria pego mais cedo. Documento consultado
que estava errado ou desatualizado.

**O que não entra.** Defeito da peça, que vive na receita e no veredito.

## Contrato da rodada

- Alvo: bicicleta nova, receita própria. `bicicleta-urbana` fica intocada: ela
  carrega o defeito `rodaDianteiraPneu ↔ tuboInferior`, e herdar isso
  contaminaria a medição.
- Referência: três fotos de produto de terceiros, entregues na sessão. **Elas não
  entram no repositório em hipótese alguma.** Só coordenadas derivadas, em
  `docs/mecanifica/referencias/`.
- Ordem: prancha alvo primeiro, depois geometria por módulo. Módulo aprovado é
  módulo que passou em `contexto`, nunca só em `isolar`.
- Cada módulo declara `contatos` ANTES de medir.

## Módulos previstos

| módulo | referência | estado |
|---|---|---|
| tabela dimensional | valores públicos do formato | **feita**, em `prancha-bicicleta-29.mjs` |
| vistas de caráter | `referencias/bicicleta-29/` | **recortadas**, uma por vista |
| quadro | prancha lateral | não começado |
| garfo de suspensão | foto frontal do garfo | não começado |
| roda | foto lateral | não começado |
| guidão e freios | foto de cima | não começado |
| transmissão | foto lateral | não começado |

## Atritos

Um por bloco, na ordem em que aconteceram. Formato: o que eu tentava fazer, o
que a ferramenta respondeu, o que eu fiz no lugar, e o que teria resolvido.

### 1. Referência que chega pela conversa PARECE não entrar no laço — e entra

**CORRIGIDO NO MESMO DIA, e o erro era meu.** O registro abaixo, escrito antes,
afirmava que a imagem não existia em disco. Ela existe: a transcrição da sessão
guarda os bytes em base64, em blocos `{"type":"image"}` dentro do `.jsonl` do
projeto, e basta decodificar. Eu tinha procurado por ARQUIVOS de imagem
recentes, não achei, e concluí impossibilidade a partir de uma busca que nunca
cobriu o lugar certo. Insisti três vezes nessa conclusão antes de um subagente
achar em quarenta e nove segundos.

**A lição não é sobre a ferramenta.** É que "procurei e não achei" virou "não
existe" sem que eu tivesse verificado o caminho pelo qual a coisa chega. O
mesmo erro que este projeto já mediu em outra forma: documento descreve a
intenção, e só o código diz o que acontece.

**A capacidade que falta.** Extrair anexo da sessão para disco hoje é script
manual. Deveria ser comando, e o alvo natural é `docs/mecanifica/referencias/`.
Enquanto não existir, toda sessão redescobre isto do zero — ou, como aqui,
conclui que é impossível.

**O registro original, mantido porque a lição está no erro:**

### 1-a. O que eu tinha escrito antes de descobrir

**O que eu tentava fazer.** Calibrar a prancha contra as três fotos de produto,
como manda o passo 1 da skill, e comparar por região com
`prancha-referencia.mjs`.

**O que aconteceu.** A ferramenta lê um PNG do disco. As fotos chegaram pela
conversa e eu não tenho como gravá-las em arquivo. O caminho oficial de
"comparar com a referência por número" ficou indisponível, e o que sobrava era
estimar proporção olhando a foto — que a mesma skill proíbe no passo 1, e que já
custou doze rodadas neste repositório.

**O que fiz no lugar.** Troquei a fonte do alvo: geometria de bicicleta é
publicada como TABELA (entre-eixos, ângulos, balanço, diâmetro de roda), e
tabela não depende do meu olho. As fotos passaram a informar só caráter. Está
declarado em `autoria.procedencias` da prancha, com a incerteza
`sem-comparacao-por-numero`.

**O que eu disse que resolveria.** "Um jeito de materializar em disco uma
imagem que chega pela sessão." Existia o tempo todo, dentro da própria
transcrição.

### 2. O motor de prancha assume objeto com casca; bicicleta é esqueleto

**O que eu tentava fazer.** Usar as duas verificações mais fortes do motor:
`contornoFechado`, que encadeia os trechos num anel e acusa silhueta aberta, e a
coerência entre vistas, que compara lateral e frontal pelos eixos que elas
compartilham.

**O que aconteceu.** As duas dependem de um anel fechado. Bicicleta não tem
silhueta fechada — é quadro, garfo e rodas — e `medirCoerencia` pula a vista
quando `m.caixa` é nula, que é o caso sem anel. Perdi fechamento e coerência de
uma vez, sem nenhum alerta avisando que perdi.

**O que fiz no lugar.** Deixei sem contorno e declarei a incerteza
`esqueleto-sem-silhueta`. Declarar um contorno fechado para recuperar as
verificações seria ficção, e a skill nomeia esse movimento no checklist como o
pior defeito da lista.

**O que teria resolvido.** O motor aceitar envelope declarado como base da
coerência quando não há anel, em vez de silenciar. Hoje a ausência de
verificação é indistinguível de verificação que passou.

### 3. `imprimirRelatorio` devolve texto e não imprime

**O que aconteceu.** Chamei `imprimirRelatorio(relatorio)` e rodei; a saída veio
sem relatório nenhum. Só percebi porque estranhei o vazio.

**O que teria resolvido.** O nome dizer o que a função faz. A skill até escreve
"o script deve imprimir `imprimirRelatorio(relatorio)`", mas a frase só se lê
depois de já ter caído.

### 4. O recorte do painel é achado na mão, e texto dentro dele passa por geometria

**O que eu tentava fazer.** Calibrar a vista lateral da folha gerada com
`calibrarPorRodas`, que acha as duas manchas de contato das rodas com o solo.

**O que aconteceu.** Meu recorte pegou a legenda "VISTA GERAL LATERAL" logo
abaixo do desenho. As letras são a tinta mais baixa do recorte, então viraram o
"solo", e as duas manchas largas encontradas foram grupos de letras a 68 pixels
de distância. A escala saiu 16,7 mm por pixel numa bicicleta que ocupa 430
pixels. **Nada reprovou.** Só percebi porque o pneu deu 3030 mm de altura e o
número era absurdo demais para passar.

**O que fiz no lugar.** Cortei acima da linha de legenda, em y=285, e a
calibração passou a dar 4,18 mm por pixel com as rodas a 270 pixels.

**O que teria resolvido.** Duas coisas independentes. `acharPaineis` devolveu
uma faixa só de 35 a 997 para a folha inteira, porque as linhas de cota do
guidão atravessam os vãos entre painéis — então o recorte teve de ser achado no
olho, que é justamente o que a esteira existe para evitar. E `calibrarPorRodas`
não tem defesa contra texto: um chão que é uma fileira de letras produz escala
absurda sem um alerta.

### 4. O recorte do painel é achado na mão, e texto dentro dele passa por geometria

**O que aconteceu.** Meu primeiro recorte da vista lateral pegou a legenda
"VISTA GERAL LATERAL" logo abaixo do desenho. As letras eram a tinta mais baixa,
então viraram o "solo", e `calibrarPorRodas` achou duas manchas de letras a 68
pixels uma da outra. A escala saiu 16,7 mm por pixel numa bicicleta que ocupa
430. **Nada reprovou.** Só percebi porque o pneu deu 3030 mm de altura.

**O que fiz no lugar.** Cortei acima da legenda, em y=285, e a calibração passou
a dar 4,18 mm por pixel com as rodas a 270 pixels.

**O que teria resolvido.** Duas coisas. `acharPaineis` devolveu uma faixa só,
de 35 a 997, para a folha inteira, porque as linhas de cota do guidão atravessam
os vãos entre painéis; o recorte teve de ser achado no olho, que é o que a
esteira existe para evitar. E `calibrarPorRodas` não tem defesa contra texto: um
chão feito de letras produz escala absurda sem um alerta.

### 5. A prancha SVG foi retirada: motor de casca não mede esqueleto

**O que aconteceu.** A prancha desenhou, o relatório passou sem alertas, e o
resultado não era utilizável como alvo. Sem `contorno: true` o motor não confere
fechamento, não acusa ponto fora e não cruza as vistas — as três coisas que
fazem uma prancha valer mais que um desenho. Declarar contorno fechado para
recuperá-las seria ficção, e o próprio checklist da skill chama isso de pior
defeito da lista.

**O que fiz no lugar.** Retirei o desenho e fiquei com a TABELA e `derivar()`,
que são os números que viram `PARAMS`. O caráter passou a vir das vistas
recortadas.

**O que teria resolvido.** O motor aceitar `envelope` declarado como base da
coerência quando não há anel, em vez de silenciar. Ausência de verificação hoje
é indistinguível de verificação que passou.

## Acertos que valem registrar

O que funcionou melhor do que eu esperava também é medida do projeto, e some se
ninguém escrever.

### 2. A comparação por número contradisse a tabela, e a tabela estava errada

Com a folha em disco, a conferência mediu o selim a 1128 mm do chão contra os
914 mm que a minha tabela derivava. 914 é indefensável para uma 29 de quadro
médio, onde o selim fica entre 1000 e 1100. O canote exposto subiu de 180 para
380 mm e o selim foi para 1105.

O mesmo cruzamento mediu o pneu em 777 mm contra os 734 da tabela, e aqui eu
mantive a tabela: 734 é valor publicado, e imagem gerada por IA não é fonte
dimensional. A mesma comparação acusou os dois lados, e decidir qual lado cede
depende da procedência, não do tamanho do desvio.

### 2. A comparação por número contradisse a tabela, e a tabela cedeu

A conferência mediu o selim a 1128 mm do chão contra os 914 que a tabela
derivava. 914 é indefensável para uma 29 de quadro médio. O tubo do selim foi
para 480 e o canote exposto para 360, e o selim ficou em 1105.

A mesma medição deu 777 mm de pneu contra 734, e aí a tabela ficou: 734 é valor
publicado, e imagem gerada por IA não é fonte dimensional. A mesma comparação
acusou os dois lados, e quem cede se decide pela procedência, não pelo tamanho
do desvio.

### 1. O contrato de autoria da prancha cobrou o que eu ia deixar implícito

`validarAutoriaPrancha` recusa a prancha sem fonte, evidência, confiança e
incerteza declaradas. Eu tinha as duas limitações acima na cabeça e teria
seguido sem escrevê-las; o contrato obrigou a escrever, e elas viraram os dois
atritos acima. Exigência estrutural produziu registro que a boa intenção não
produziria.
