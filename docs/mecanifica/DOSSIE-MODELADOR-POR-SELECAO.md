# Dossiê — modelador por seleção

## Papel

Este documento define o modelador de carroceria da Mecanifica. Ele existe porque
seis tentativas de fazer a IA **produzir** a forma falharam do mesmo jeito, e
porque uma assimetria ficou medida na investigação: a IA erra ao criar forma e
acerta ao comparar formas.

O modelador troca o ato de autoria. A IA deixa de escolher valores e passa a
ordenar candidatos. O registro das falhas anteriores está em
[`GOTCHAS-AUTORIA-VISUAL.md`](GOTCHAS-AUTORIA-VISUAL.md) e é leitura obrigatória
antes de abrir qualquer experimento aqui.

## A decisão central: linhas, não pontos

Carroceria não é definida por seções transversais. É definida por um punhado de
**linhas de caráter** no espaço, e a superfície é esticada entre elas. É assim
que a profissão trabalha, e é a razão de todas as tentativas anteriores terem
falhado: elas variavam tabela de seção, que é ruído, enquanto a diferença entre
um carro comum e um bonito mora nas linhas.

Consequência prática: **o gerador varia as linhas.** O espaço de "conjuntos de
linhas plausíveis" é design de verdade; o espaço de "tabelas de seção" não era.

## As camadas

### 1. Estrutura — fixa, e é o que garante que a saída seja carro

A estrutura declara quais linhas existem, onde elas se encontram e quais regiões
de superfície nascem entre elas. Ela não varia, e é por isso que nada do que
sair é bolha.

Linhas longitudinais, na metade em `x >= 0`:

| Linha | O que é |
|---|---|
| `centro` | o perfil no plano de simetria: bico, capô, base do para-brisa, teto, vidro traseiro, tampa e traseira |
| `ombro` | a aresta alta e externa que corre do para-lama dianteiro ao traseiro |
| `cintura` | onde o vidro encontra a lataria, na base das janelas |
| `maxLargura` | a linha mais larga do corpo, que pode ou não coincidir com o ombro |
| `soleira` | a linha baixa, entre as rodas |

Linhas fechadas:

| Linha | O que é |
|---|---|
| `arcoDianteiro`, `arcoTraseiro` | as aberturas das caixas de roda |
| `fasciaDianteira`, `fasciaTraseira` | o contorno da frente e da traseira |
| `envidracado` | o contorno do conjunto de vidros |

Regiões, cada uma limitada por quatro linhas:

- **capô** — entre `centro` e `ombro`, da fáscia dianteira à base do para-brisa;
- **teto** — entre `centro` e `cintura`, da base do para-brisa ao vidro traseiro;
- **flanco** — entre `ombro` e `soleira`, recortado pelos arcos;
- **fáscias** — frente e traseira, entre as pontas das longitudinais;
- **tampa** — entre `centro` e `ombro`, atrás do vidro traseiro.

A estrutura também fixa o que é chassi e não é estilo: roda no chão, entre-eixos,
bitola, altura livre, posição dos eixos. Isso entra como restrição de contorno e
nunca é sorteado.

### 2. Gerador — deliberadamente simples

Cada linha é uma curva suave por poucos pontos de controle. Cada ponto de
controle se move dentro de uma **caixa declarada** — um intervalo por eixo, com
significado, por exemplo "a altura do teto sobre o eixo dianteiro, entre 1.180 e
1.420 mm".

O gerador **sorteia dentro das caixas** e depois **modifica** o que a seleção
escolheu. Ele não sabe o que é bonito e não precisa saber.

As caixas são o espaço alcançável, e elas são desenhadas à mão. Isso é uma
limitação declarada, e a diferença para a armadilha registrada em V-30 é que ali
a IA **escolhia os valores** e chamava aquilo de autoria; aqui ela não escolhe
nenhum.

**A caixa pequena se denuncia sozinha.** Se os melhores candidatos ficam
encostados na borda de uma caixa rodada após rodada, a caixa está apertando a
forma. Isso é medido e reportado, e é o sinal para alargar a caixa — nunca para
a IA mexer no valor.

### 3. Costurador — a pele entre as linhas

Cada região com quatro linhas de contorno vira superfície por interpolação
transfinita: a superfície é esticada entre os quatro limites e concorda com eles
por construção. É matemática fechada e determinística, não pesquisa.

Arcos de roda e vão envidraçado são recortes nas regiões, não peças coladas.

Continuidade entre regiões vizinhas vem de as regiões **compartilharem a mesma
linha de contorno**, que é o que impede painel colado e volume anexo — os dois
sintomas que reprovaram tentativas anteriores.

### 4. Seleção — o único ato da IA

A IA recebe uma leva renderizada e **ordena**. Nunca sugere valor, nunca edita
número, nunca aprova.

Ordenar não é aprovar. Mosaico serve para ordenar e jamais para promover; a
inspeção individual continua obrigatória para qualquer coisa que avance, pela
regra já registrada em V-07.

### 5. Julgador aprendido — o que torna o volume possível

Com a IA ordenando cada leva, uma rodada custa um turno e o laço trava em dezenas
de rodadas. Doze rodadas não é iteração: é uma tentativa dividida em doze.

Então das ordenações da IA se ajusta um **previsor do gosto**: dado um conjunto
de linhas, ele estima a posição que a IA daria. A busca roda centenas de rodadas
contra o previsor, sem custo de turno, e volta à IA periodicamente para corrigir
o rumo.

Duas medidas obrigatórias, porque previsor que ninguém confere vira ficção:

- **acerto fora da amostra** — o previsor prevê ordenações que não viu?
- **coerência da própria IA** — o mesmo par mostrado duas vezes recebe a mesma
  ordem? Se a IA não é consistente consigo mesma, o mecanismo inteiro cai, e é
  melhor saber cedo.

### 6. Variedade e memória

A busca mantém uma população, não um único melhor, e penaliza candidato parecido
demais com o que já está na população. Sem isso ela colapsa cedo num único
jeitão e para de explorar.

O que foi rejeitado fica registrado com o motivo em palavras, para não voltar.

### 7. Entrega — o vencedor é editável, não malha morta

O conjunto de linhas **é** a representação editável. "Baixar o teto" é mover os
pontos de controle da linha do teto; "alongar o capô" é mover a fáscia dianteira.
Alterar por intenção sai de graça, porque a coisa que gera é a mesma coisa que
edita.

Daí em diante valem identidade, peça, montagem, revisão e impacto, que já estão
provados e aprovados no repositório.

## O que este modelador não faz

- não julga se está bonito — quem julga é a IA ordenando e o usuário aprovando;
- não reconhece carro por métrica; nenhuma medida daqui aprova forma;
- não conserta forma ruim depois de pronta, hipótese já reprovada;
- não inventa alvo. Referência medida entra como restrição, nunca como número
  copiado.

## O que pode derrubar o mecanismo

Em ordem de risco, e cada um com o teste que o expõe:

1. **As caixas não alcançam um carro bom.** Gerar cem conjuntos de linhas e
   olhar. É o teste mais barato e vem primeiro, porque conjunto de linhas se
   olha direto, sem nem construir superfície.
2. **A IA não é coerente ao ordenar.** Repetir pares e medir a concordância dela
   consigo mesma.
3. **O previsor não captura o gosto.** Medir acerto fora da amostra.
4. **Linhas boas produzindo superfície ruim.** É o que o canal de percepção
   detecta — como defeito, não como julgamento de beleza. Ele está com o braço
   de diedro reaberto em V-08 e precisa ser normalizado antes de voltar a valer
   como evidência.
5. **A busca colapsa cedo.** Medir a variedade da população ao longo das rodadas.

## Relação com o resto do repositório

Preservado e usado: identidade semântica, peças, montagem, revisão, impacto,
revalidação, câmeras reprodutíveis, evidência com hash, procedência do número,
comparação contra alvo, e o crítico cego.

Substituído: a autoria por restrição como aposta central. Ela sai não por ter
falhado, mas porque as regras que decidem se algo parece um carro não são
escrevíveis. Se um resolvedor de restrições for útil depois, será para manter
candidatos válidos, não para escolher a forma.

Fora deste dossiê: o eixo humanoide, que continua sem especificação e exige
documento próprio.
