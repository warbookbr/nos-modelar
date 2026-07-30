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
| UP-002 | Relações espaciais declarativas (`alinhar`, `centralizar`, `encostar`) | observada | A autoria herdada não expressa “encoste A em B” | Compor objetos por intenção, sem calcular coordenadas manualmente |
| UP-003 | Expressões validadas entre parâmetros | observada | Passos aceitam nomes simples, mas não relações gerais entre parâmetros | Reduzir números duplicados e permitir refinamento paramétrico |
| UP-004 | Verificação de cobertura de nomes agregados | observada | O drone mostrou que um nome pode resolver menos elementos do que promete sem falha técnica | Evitar semântica aparentemente válida, porém incompleta |
| UP-005 | Adaptador neutro para grafos de cena | provada | O drone herdado foi convertido em 23 partes selecionáveis; teste headless e build passaram | Tornar explícita a separação entre autoria e renderizador |

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
