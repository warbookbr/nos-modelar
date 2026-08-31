# MCP — avaliação consolidada por agente consumidor

**Estado:** concluído

**Responsável:** GPT (coordenação e revisão) e Claude/brigsd (operação e teste)

**Repositório e base:** `warbookbr/nos-mecanifica`, `b5d0c2f0823be394f16663b7034167b12e783621`

**Programa:** `docs/mecanifica/planos/mcp/INDEX.md`

**Canal de evidências:** [issue #18](https://github.com/warbookbr/nos-mecanifica/issues/18)

**Arquivos reservados:** este plano, `docs/mecanifica/planos/README.md` e
`docs/mecanifica/planos/mcp/INDEX.md`. A avaliação não reserva nem autoriza
alterações em `tools/mcp/` ou no núcleo da Mecanifica.

## Problema observado

Os consumidores automatizados já provaram transporte, schemas, limites,
segurança e limpeza do servidor MCP. Ainda falta provar que um agente novo,
sem conhecer a implementação, consegue descobrir as capacidades e concluir uma
revisão útil usando somente o protocolo.

O onboarding caixa-preta na issue #18 conectou na primeira tentativa, encontrou
4 ferramentas e 2 recursos e não precisou de fallback. Essa evidência permite
abrir a avaliação formal, mas ainda não fecha a qualidade de uso.

## Resultado

Decidir, com evidência reproduzível de um agente consumidor, se o Módulo 1 de
modelagem e revisão pode ser aprovado, precisa de correções delimitadas ou deve
ser redesenhado antes de abrir autoria.

## Hipótese

Um agente com acesso apenas aos documentos de onboarding, aos dois recursos e
às ferramentas MCP consegue inspecionar peças, validar pacotes, receber as
quatro vistas oficiais e descobrir entradas válidas para comparação de revisões,
sem ler dados diretamente, usar CLIs paralelas, gravar arquivos ou recorrer a
fallback fora do MCP.

## Incluído

- uso do MCP em modo caixa-preta por agente consumidor;
- uma revisão completa de `_mancal-de-mesa`;
- repetição da revisão em `_placa-adaptadora`;
- tentativa de descobrir e executar uma comparação de revisões usando somente
  informações publicadas pelo MCP;
- registro de chamadas, falhas, fallbacks, escritas, duração e atritos de uso;
- classificação dos achados como bloqueadores, contratuais, documentais ou não
  bloqueadores;
- decisão final de aprovar, corrigir ou interromper.

## Excluído

- leitura inicial da implementação em `tools/mcp/`;
- mudanças de código, schemas ou documentação durante os cenários;
- autoria, materiais, Git pelo MCP, HTTP, autenticação ou múltiplos clientes;
- correções oportunistas descobertas durante a avaliação;
- avaliação estética subjetiva fora das vistas oficiais entregues.

## Invariantes

- os cenários só começam depois do merge deste plano na `main`;
- antes de cada cenário, o agente sincroniza a `main` e registra o commit-base;
- o agente não lê diretamente arquivos ou dados das peças;
- nenhuma CLI alternativa substitui uma ferramenta MCP;
- nenhuma revisão, PNG ou outro artefato é gravado pelo teste;
- ausência de informação deve ser registrada como lacuna de descoberta, não
  contornada por inspeção do repositório;
- modo diagnóstico só começa após decisão explícita na issue #18.

## Cenários

### 1. Revisão completa do mancal

O agente lê os dois recursos e usa `descrever_peca`, `validar_pacote` e
`renderizar_vistas` para produzir uma síntese técnica de `_mancal-de-mesa`.
Deve confirmar a presença e a ordem das vistas isométrica, frontal, direita e
superior.

### 2. Repetição na placa

O agente repete o fluxo para `_placa-adaptadora`, registrando se os mesmos nomes,
schemas e resultados permanecem claros e consistentes sem instrução adicional.

### 3. Comparação de revisões

O agente tenta identificar, somente pelo MCP, um pacote e duas revisões válidas
para `comparar_revisoes`. Se isso não for descobrível, encerra o cenário sem
consultar o repositório e registra a lacuna como resultado.

## Evidência por cenário

Cada resposta na issue #18 usa `[RESULTADO]` e inclui:

- commit-base e ambiente;
- recursos lidos e ferramentas chamadas, na ordem;
- sucesso ou falha de cada chamada;
- resumo técnico produzido;
- fallbacks e escritas observados;
- duração aproximada;
- atritos de descoberta, nomes, schemas, mensagens ou imagens;
- veredito do cenário.

## Gate de saída

1. onboarding do agente registrado na issue #18;
2. cenários 1 e 2 concluídos sem leitura direta, fallback ou escrita;
3. quatro vistas oficiais disponíveis e identificáveis em ambos os casos;
4. cenário 3 concluído ou lacuna de descoberta registrada sem contorno;
5. achados classificados por severidade e responsabilidade;
6. decisão final explícita: `aprovar`, `corrigir` ou `interromper`;
7. plano, README e painel atualizados no encerramento.

## Riscos e parada

Parar a rodada e registrar `[BLOQUEIO]` se o servidor não iniciar, se uma tarefa
exigir acesso direto aos dados, se ocorrer escrita inesperada, se a resposta não
for reproduzível ou se o agente precisar conhecer a implementação para escolher
uma ferramenta ou preencher uma entrada essencial.

Achados que exigirem mudança de código não ampliam este plano. Eles recebem uma
decisão separada e, quando aprovados, uma branch e um plano próprios.

## Encerramento

**Decisão:** `corrigir`.

A avaliação foi concluída na issue #18 com três cenários e diagnóstico limitado:

- `descrever_peca` passou em `_mancal-de-mesa` e `_placa-adaptadora`;
- `renderizar_vistas` passou nas duas peças, com 4/4 vistas oficiais, nenhuma
  escrita e nenhum fallback;
- `validar_pacote` não pôde ser usado de ponta a ponta por um consumidor novo;
- `comparar_revisoes` não pôde ser chamado sem adivinhar pacote e revisões;
- o achado `AVAL-01` foi classificado como contratual/de descoberta;
- o diagnóstico da rodada R02 confirmou que os schemas aceitam slugs abertos,
  enquanto nenhum recurso ou ferramenta publica os valores oficiais existentes.

A hipótese foi parcialmente confirmada: inspeção e prova visual são utilizáveis,
mas validação e comparação não são autodescobríveis. A correção aprovada como
próxima etapa é um recurso somente leitura para catalogar pacotes e revisões,
sem alterar as quatro ferramentas existentes.

O trabalho corretivo não pertence a este plano. Ele está autorizado somente pelo
plano separado `2026-08-05-mcp-correcao-descoberta.md`. Autoria, materiais e
distribuição permanecem bloqueados.
