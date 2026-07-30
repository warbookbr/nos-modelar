# Melhorias reaproveitáveis pelo NÓS

Este documento acompanha capacidades criadas na Mecanifica que podem voltar ao
repositório original [`brigsd/nos`](https://github.com/brigsd/nos).

Ele não é uma lista de desejos. Uma entrada só avança para “pronta” depois de
implementação, testes e uso em uma peça real.

## Regra de extração

Uma melhoria candidata:

- não importa Three.js;
- não contém conceitos automotivos;
- funciona em modo headless;
- preserva ou migra formatos anteriores explicitamente;
- possui testes independentes da interface;
- fica em commit separado das mudanças de produto;
- documenta arquivos e dependências necessários para cherry-pick.

O remoto Git `source` aponta para o NÓS original. Antes de preparar uma
contribuição, compare a implementação com o estado recente desse remoto e leve a
mudança para um fork verdadeiro de `brigsd/nos`.

## Estados

- **observada:** problema confirmado, sem solução escolhida;
- **em prova:** hipótese sendo exercitada;
- **provada:** usada com sucesso e coberta por testes;
- **pronta para upstream:** isolada, documentada e sem dependências da Mecanifica.

## Registro

| ID | Capacidade | Estado | Evidência | Valor para o NÓS |
|---|---|---|---|---|
| UP-001 | Identidade semântica sem dependência de posição do passo | observada | O formato herdado ainda usa blocos `posição × 1000`; uma corrida registrou 234 órfãos | Inserir ou reordenar operações sem quebrar referências |
| UP-002 | Relações espaciais declarativas (`alinhar`, `centralizar`, `encostar`) | observada | A autoria herdada não expressa “encoste A em B”; no freio a disco os 4 contatos viraram soma de espessuras e só um teste guarda a intenção (ATRITOS-AUTORIA A-6) | Compor objetos por intenção, sem calcular coordenadas manualmente |
| UP-003 | Expressões validadas entre parâmetros | observada | Passos aceitam nomes simples, mas não relações gerais entre parâmetros; 21 dos 61 parâmetros do freio são derivados em JS fora do envelope e ficam ineditáveis pela Oficina (ATRITOS-AUTORIA A-5) | Reduzir números duplicados e permitir refinamento paramétrico |
| UP-004 | Verificação de cobertura de nomes agregados | observada | O drone mostrou que um nome pode resolver menos elementos do que promete sem falha técnica | Evitar semântica aparentemente válida, porém incompleta |
| UP-005 | Adaptador neutro para grafos de cena | provada | O drone herdado foi convertido em 23 partes selecionáveis; teste headless e build passaram | Tornar explícita a separação entre autoria e renderizador |
| UP-006 | Gate para faces sem identidade + seleções estruturais no drone | provada | A bancada encontrou 6 faces da lente sem nome e 6 classificadas como pouso; a correção por `origemId` zerou ambas | Impedir que seleções espaciais sobrepostas corrompam nomes sem gerar órfãos |
| UP-007 | Mapa determinístico entre Windows e Linux | provada | Normalização CRLF/LF e ordenação por ponto de código fecharam o CI nos dois ambientes | Evitar mapas diferentes conforme o sistema operacional |
| UP-008 | `origem` estrutural em TODO gerador | observada | O freio a disco mediu: só `cubo`, `cilindro`, `lathe` e `loft` publicam origem; `chamferBox` responde `op de origem 'chamferBox' desconhecida` e deixa 26 faces sem identidade (ATRITOS-AUTORIA A-9) | Metade do vocabulário de geradores hoje não é endereçável por nome, e a forma da peça passa a ser escolhida pela ferramenta |
| UP-009 | Posicionar/orientar na criação da primitiva | observada | 16 dos 52 passos do freio a disco só transportam primitivas da origem até o lugar (ATRITOS-AUTORIA A-4) | Tirar 30% de burocracia de qualquer montagem com eixo diferente de Y |
| UP-010 | Alias de conjunto resolvido tarde (ou diagnóstico de completude) | em prova | 6 órfãos na 1ª execução do freio: alias citado antes da última primitiva que o compõe existir (ATRITOS-AUTORIA A-7). R2/O-11 implementou o ramo DIAGNÓSTICO em `motor/oficina.js` (`completudeDoAlias`, sem Three.js e sem conceito automotivo): a citação precoce passa a dizer em que passo o alias fecha e o que falta; 3 testes em `tools/oficina/oficina.test.ts`. A resolução TARDE (a outra metade da capacidade) segue não feita | O autor pensa em conjuntos; a ferramenta exige ordem de construção |
| UP-011 | Parâmetro de tipo ponto (e caminho) | observada | 18 dos 61 parâmetros do freio existem só para nomear 6 pontos do caminho da mangueira (ATRITOS-AUTORIA A-8) | Qualquer peça com trajeto — cabo, tubo, correia, trilho |
| UP-012 | Hierarquia pai/filho de partes | observada | O freio expõe 8 partes irmãs e não sabe dizer que a pastilha mora na pinça (ATRITOS-AUTORIA A-11) | Regra 3 do contrato de autoria; navegação de montagem em qualquer projeto |
| UP-013 | Relato de caixa por parte e escala na inspeção headless | em prova | 4 leituras de PNG do freio para responder "o eixo está em X?"; a resposta veio de medição feita fora da bancada (ATRITOS-AUTORIA A-13). R2/O-1 extraiu a medição para `src/autoria/descrever-partes.js` (neutro: sem Three.js, sem conceito automotivo) e publicou `npm run descrever`, que mede os 4 encaixes do freio em número; 9 testes em `tools/mecanifica/descrever-partes.test.ts`. Falta o lado da FOTO — escala px/m, gnômon e régua na imagem | Inspeção headless sem escala obriga perícia de pixel; vale para qualquer inspetor 3D |

## UP-005 — fronteira de renderização provada

**Problema observado:** `oficina.js` já separava `nucleo()` de `adaptarV3()`,
mas só existia um consumidor real. Isso deixava a independência do núcleo como
uma intenção arquitetural ainda não exercitada por outro motor.

**Solução geral:** `src/autoria/adaptar-three.js` consome apenas o estado neutro
(`V`, `F`, atributos e partes) e produz um grafo de cena. O núcleo herdado não
importa Three.js e não foi alterado.

**Provas:** `tools/mecanifica/adaptar-three.test.ts` verifica preservação de
identidade semântica, ausência de UUID persistido, triangulação e falha antes do
render quando há órfãos. O drone da Fase 4 foi convertido no navegador com 23
partes selecionáveis.

**Como aproveitar no NÓS:** o código Three.js não é candidato direto. A
contribuição útil é transformar a fronteira já existente em contrato explícito
e testável para múltiplos adaptadores. Ainda falta isolar tipos do estado neutro
e documentar quais atributos todo adaptador deve suportar.

**Limites:** a primeira ponte não cobre atlas pintável, suavização compartilhada,
skinning nem animações do adaptador v3. Esses recursos só serão generalizados
quando uma peça real da Mecanifica os exigir.

## UP-006 — semântica do drone provada pela bancada

**Problema observado:** a lente e o pouso eram nomeados por regiões sobrepostas
na origem. O replay permanecia tecnicamente válido, mas seis laterais do
cilindro viravam `pouso`, seis ficavam sem parte e apenas as tampas eram
`lente`.

**Solução geral:** cilindro, cubos e saídas de espelhamento são selecionados por
origem estrutural. O adaptador também publica a contagem de faces sem parte como
diagnóstico explícito.

**Provas:** `tools/mecanifica/drone-semantica.test.ts` conta a cobertura de cada
parte e exige zero faces sem identidade. A bancada reproduziu o defeito,
isolou os lotes contaminados e validou a correção nas mesmas vistas.

**Como aproveitar no NÓS:** a troca das seleções do
`prototipos/fps/v3/pecas/drone-inspecao.js` e o teste de cobertura são
candidatos diretos. O painel Three.js não é necessário para o cherry-pick.

**Limites:** o gate atual detecta ausência de nome; ainda não prova sozinho que
um nome existente significa o conjunto correto. UP-004 continua aberto.

## Modelo de entrada futura

Ao concluir uma capacidade, acrescente:

```text
ID:
estado:
problema observado:
solução geral:
arquivos:
testes:
compatibilidade:
como extrair:
limites:
```

O histórico detalhado pode viver em um relatório próprio; esta página continua
sendo o índice curto para quem mantém o NÓS.
