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
- [x] validar a publicação real após o primeiro push.

**Critério de saída:** a mesma definição procedural produz um objeto visível,
selecionável e identificável no Three.js sem depender de IDs do runtime.

**Critério de parada:** se o núcleo precisar importar Three.js ou conhecer a cena,
redesenhar a fronteira antes de avançar.

## Fase 2 — bancada de autoria e inspeção

**Objetivo:** criar um ambiente reproduzível para modelar e revisar peças antes
de colocá-las na experiência do cliente.

- [x] estúdio neutro e iluminação previsível;
- [x] vistas ortogonais, isométrica e alternância de projeção;
- [x] seleção múltipla e enquadramento;
- [x] contexto fantasma e isolamento;
- [x] explosão automática suave;
- [x] estado reproduzível pela URL;
- [x] diagnóstico de superfícies sem identidade;
- [x] provar o fluxo encontrando e corrigindo a lente e o pouso do drone.

**Critério de saída:** outra sessão abre a mesma seleção e vista, isola peças
conectadas e identifica defeitos de forma ou semântica sem manipulação manual
imprecisa.

## Fase 3 — freio a disco paramétrico

**Objetivo:** criar o primeiro sistema mecânico por partes compreensíveis.

- [x] prancha de referência multivista
  ([`docs/mecanifica/PRANCHA-FREIO-DISCO.md`](PRANCHA-FREIO-DISCO.md));
- [x] disco, cubo, pinça, suporte, pistão, pastilhas e flexível
  (`prototipos/fps/v3/pecas/freio-disco.js`);
- [x] encaixes semânticos — as quatro relações de contato são derivadas de
  parâmetro e travadas por teste;
- [ ] hierarquia — `f.parte` é uma lista PLANA; não há pai/filho
  (ATRITOS-AUTORIA A-11);
- [x] materiais básicos (7 materiais por parte);
- [x] vista montada e explodida — a explodida só é legível até ≈0,12 e não
  separa o miolo do freio (ATRITOS-AUTORIA A-12);
- [x] revisão visual em vários ângulos (3 ortogonais + isométrica + seleções em
  contexto);
- [x] medidas e testes de integridade
  (`tools/mecanifica/freio-disco-integridade.test.ts`, 7 casos).

**Critério de saída:** outro agente localiza e altera qualquer componente pelo
nome, sem procurar índices de vértices, faces ou objetos.

**Estado:** ATENDIDO para localizar e alterar — 8 partes nomeadas, 17 aliases,
180 faces com identidade, 0 órfãos, nenhum id de vértice/face/objeto no arquivo.
A hierarquia navegável fica em aberto e depende de uma capacidade nova; ela não
bloqueia a Fase 4, mas bloqueia a árvore de sistemas da apresentação. As
dificuldades da rodada, com as capacidades que elas justificam, estão em
[`docs/mecanifica/ATRITOS-AUTORIA.md`](ATRITOS-AUTORIA.md) (A-4 a A-14).

## Fase 4 — contexto do veículo e galpão mínimo

**Objetivo:** localizar o primeiro sistema dentro do carro e criar o contexto
navegável da demonstração.

- carroceria externa simplificada e proporcional;
- registro de sistemas selecionáveis;
- carro fantasma com sistema realçado em verde;
- foco contextual e isolamento do sistema;
- explosão autoral por caminho de montagem;
- piso, paredes, cobertura e iluminação do galpão;
- caminhada e transição para inspeção orbital;
- interface responsiva para mouse, teclado e toque.

**Critério de saída:** o usuário entende onde o freio está no veículo, aproxima,
isola e explode o sistema sem perder sua orientação espacial.

## Fase 5 — narrativa de desgaste

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

## Fase 6 — autoria assistida por IA

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

O freio a disco existe e está validado na bancada, então a Fase 4 está
liberada: carroceria simplificada, registro de sistemas e galpão mínimo.

Antes (ou junto) dela, as capacidades de autoria que a Rodada 1 justificou com
evidência medida — em ordem de retrabalho observado: `derivarParametro` (A-5),
`origem` para todo gerador (A-9), `encostar`/`alinhar` (A-4 e A-6), caixa por
parte e escala na foto da bancada (A-13). Nenhuma delas é especulativa; todas
saíram de dificuldade contada em
[`docs/mecanifica/ATRITOS-AUTORIA.md`](ATRITOS-AUTORIA.md).
