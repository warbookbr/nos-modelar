# Plano vigente da Mecanifica

Este é o roteiro ativo do projeto. Os planos em `docs/rumo/` descrevem o NÓS
herdado e não comandam a Mecanifica.

## Regra de evolução

Cada rodada deve entregar uma prova visível ou mensurável. Capacidades gerais de
autoria nascem de dificuldades observadas na criação do galpão e dos freios, não
de uma lista especulativa de operações.

## Fase 0 — separar rumo e legado

**Objetivo:** impedir que pessoas e agentes confundam o roteiro do NÓS com o da
Mecanifica.

- [x] registrar visão, arquitetura e plano próprios;
- [x] definir regras de autoria para IA;
- [x] criar trilha de melhorias reaproveitáveis pelo NÓS;
- [x] atualizar README, instruções e metadados;
- [x] registrar baseline executável e visual do Atelier;
- [x] substituir templates e alinhar a automação temporária do Pages.

**Saída:** uma sessão nova identifica corretamente o produto, o legado e a
próxima tarefa.

## Fase 1 — prova Three.js

**Objetivo:** provar que o núcleo procedural pode alimentar a nova camada visual.

- [x] instalar Three.js e Vite;
- [x] criar a estrutura modular da aplicação;
- [x] implementar um `adaptarThree()` mínimo;
- [x] renderizar o drone procedural herdado;
- [x] preservar identidade semântica na seleção;
- [x] validar desenvolvimento local e build;
- [x] preparar o workflow do GitHub Pages;
- [x] manter o Atelier acessível em `/legado/atelier/`;
- [ ] validar a publicação real após o primeiro push.

**Critério de saída:** a mesma definição procedural produz um objeto visível,
selecionável e identificável no Three.js sem depender de IDs do runtime.

**Critério de parada:** se o núcleo precisar importar Three.js ou conhecer a cena,
redesenhar a fronteira antes de avançar.

## Fase 2 — galpão mínimo

**Objetivo:** criar o contexto navegável da primeira demonstração.

- piso, paredes, cobertura e iluminação;
- elevador ou bancada de demonstração;
- caminhada por mouse, teclado e toque;
- modo de inspeção orbital;
- seleção e destaque de componentes;
- interface responsiva mínima.

**Critério de saída:** o usuário entra no galpão, aproxima-se da demonstração e
assume controle da câmera de inspeção.

## Fase 3 — freio a disco paramétrico

**Objetivo:** criar o primeiro sistema mecânico por partes compreensíveis.

- prancha de referência multivista;
- disco, cubo, pinça, suporte, pistão, pastilhas e flexível;
- hierarquia e encaixes semânticos;
- materiais básicos;
- vista montada e explodida;
- revisão visual em vários ângulos;
- medidas e testes de integridade.

**Critério de saída:** outro agente localiza e altera qualquer componente pelo
nome, sem procurar índices de vértices, faces ou objetos.

## Fase 4 — narrativa de desgaste

**Objetivo:** transformar o modelo em uma explicação útil para clientes.

- estado normal;
- desgaste progressivo;
- limite crítico;
- contato metal com metal;
- dano ao disco e perda de eficiência;
- estado reparado;
- textos curtos de causa, consequência e recomendação;
- controle de linha do tempo.

**Critério de saída:** a demonstração comunica o problema sem depender de
explicação técnica externa.

## Fase 5 — autoria assistida por IA

**Objetivo:** provar criação e refinamento sem chuva de IDs.

- formato versionado e schema;
- relações espaciais gerais;
- expressões entre parâmetros;
- diagnósticos de referências;
- descrição headless da peça;
- criação por um agente e refinamento por outro;
- registro das capacidades gerais candidatas ao NÓS.

**Critério de saída:** uma crítica como “aproxime a pastilha interna do disco e
reduza sua espessura” altera a definição existente sem regenerar o conjunto.

## Próximo passo

Publicar e validar a Fase 1 no Pages. Em seguida, iniciar o galpão mínimo da
Fase 2 sem ampliar o adaptador antes de um caso real exigir.
