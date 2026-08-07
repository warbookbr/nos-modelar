# Filtro Agent-First

## Objetivo

Este documento fixa o critério usado para avaliar capacidades da Mecanifica sob
a ótica do agente que vai modelar, compor, inspecionar, corrigir e manter
sistemas mecânicos 3D.

A pergunta central é:

> **Esta capacidade apenas funciona, ou funciona do melhor jeito razoável para
> uma IA, com baixo custo de contexto, baixo risco de erro e controle suficiente
> para verificar e corrigir o resultado?**

O filtro vale para núcleo procedural, autoria, montagem, persistência, inspeção,
medição, materiais, revisão, documentação, CLI, API e MCP.

## Os seis critérios

### 1. Intenção

A IA deve conseguir expressar o que quer sem precisar conhecer detalhes internos
que não fazem parte da decisão mecânica ou geométrica.

Uma abstração de alto nível é preferível quando reduz passos e ambiguidades sem
retirar controle necessário. Acesso de baixo nível pode continuar existindo
como escape hatch ou ferramenta de diagnóstico.

### 2. Contexto

A capacidade deve exigir o menor contexto suficiente para operar corretamente.

Prefira contratos descobríveis, consultas sob demanda, alvos reduzidos e retornos
estruturados. Evite exigir que a IA carregue documentação extensa, estado visual
irrelevante ou detalhes de implementação apenas para executar uma operação.

### 3. Determinismo e verificabilidade

Entradas equivalentes devem produzir resultados previsíveis e reproduzíveis.
Quando houver variação legítima, ela deve ser explícita.

A IA precisa conseguir verificar o estado resultante por dados, testes,
medições ou inspeções reproduzíveis, e não apenas por aparência ou memória da
sessão.

### 4. Diagnóstico

Falhas devem informar, de forma estruturada sempre que possível:

- o que falhou;
- onde falhou;
- qual contrato foi violado;
- quais dados ajudam a corrigir o problema.

Mensagens que só dizem que uma operação falhou são insuficientes quando o
sistema possui informação para apontar a causa.

### 5. Composição

A capacidade deve combinar com outras sem criar acoplamento desnecessário.

Prefira serviços e dados neutros que possam ser reutilizados por bancada, CLI,
API ou MCP. A porta usada pelo agente não deve definir o núcleo nem obrigar o
restante do sistema a conhecer detalhes daquela porta.

### 6. Identidade e estado

A IA deve conseguir reencontrar, comparar e alterar alvos por identidade estável.

Não use como autoria persistida índices de renderização, UUIDs temporários,
ordem de criação de objetos, posição de câmera ou qualquer identidade que possa
mudar sem alteração semântica do objeto.

Estado parcial, ambíguo ou inválido não deve ser publicado como resultado válido.

## Decisão após aplicar o filtro

Toda capacidade avaliada deve terminar em uma destas decisões:

- **USAR DIRETO** — o contrato atual já é adequado para o agente;
- **ENVOLVER** — o núcleo é adequado, mas a IA deve receber uma interface mais
  semântica, menor ou mais segura;
- **REFATORAR** — o próprio contrato interno impede uma interface agent-first
  confiável;
- **ADIAR** — o problema existe, mas não justifica mudança no recorte atual.

A decisão não é permanente. Evidência nova pode reclassificar a capacidade.

## Agent-First não significa esconder tudo

Reduzir esforço cognitivo não significa retirar precisão ou impedir operações de
baixo nível.

Uma boa interface para IA oferece uma rota semântica comum e, quando necessário,
permite inspeção detalhada, diagnóstico e controle explícito. O objetivo é
retirar complexidade acidental, não capacidade real.

## Regra para MCP, CLI e API

MCP, CLI e API são portas sobre capacidades do sistema.

Antes de expor uma feature por uma dessas portas, pergunte se o serviço interno
possui contrato estável e se a exposição realmente reduz custo ou ambiguidade
para o agente. Não crie uma operação MCP apenas porque uma função interna existe.

Quando possível, a ordem preferida é:

```text
capacidade interna estável
→ contrato neutro e testável
→ interface adequada ao agente
→ MCP/CLI/API somente quando houver benefício claro
```

## Regra para documentação

Documentação voltada à IA deve ser fonte de verdade útil, descobrível e
proporcional à tarefa.

Atualize, compacte, mova para histórico ou remova da leitura principal material
que aumente contexto sem melhorar decisão ou execução. Comportamento importante
que existe apenas implicitamente no código deve ser promovido a contrato quando
necessário para o agente operar corretamente.

## Aplicação em planos e revisões

Todo plano executivo novo deve declarar como o recorte passa pelo Filtro
Agent-First e, para interfaces relevantes, registrar a decisão **USAR DIRETO**,
**ENVOLVER**, **REFATORAR** ou **ADIAR**.

Isso não autoriza uma reescrita geral do sistema. Capacidades existentes são
auditoradas de forma incremental conforme entram no caminho crítico de peças,
montagens, sistemas automotivos e, depois, robótica.

Uma revisão agent-first pode preservar integralmente um núcleo existente e
concluir que apenas sua interface para o agente precisa mudar.

## Regra central

> **Não basta uma capacidade funcionar. Ela deve reduzir o esforço cognitivo e
> o risco de erro do agente sem esconder informação necessária para controle,
> verificação e correção.**
