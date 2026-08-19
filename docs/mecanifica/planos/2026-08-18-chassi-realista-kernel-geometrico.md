# Chassi realista — representação de superfície para carroceria

**Estado:** rascunho

**Responsável:** Codex

**Dossiê:**
[`../ANALISE-CHASSI-REALISTA-KERNEL-GEOMETRICO.md`](../ANALISE-CHASSI-REALISTA-KERNEL-GEOMETRICO.md).

## Objetivo desta fase

Fixar o alvo, calibrar a referência e executar uma prova descartável que confirme
ou reabra a representação escolhida no dossiê. Este rascunho não autoriza código
de produto, dependência nova, promoção da carroceria nem atualização de snapshots.

A representação de autoria já está decidida no dossiê. O que falta é evidência de
que ela resolve o caso difícil, e o alvo dimensional contra o qual julgar.

## Problema

A plataforma produz malhas determinísticas, partes semânticas, montagens,
exportação e vistas reproduzíveis. Não existe caminho demonstrado para uma IA
definir, editar e validar uma carroceria exterior F3 com controle local de forma,
continuidade, aberturas reais e história semântica, dentro de um orçamento de
polígonos justificável.

A causa raiz está lida no código: a carroceria rejeitada é um único `loft` de
nove seções elípticas — 86 vértices. O protótipo seguinte, com três envelopes
sobrepostos e 1.014 vértices, confirmou que densidade não corrige abstração.

Dois problemas independentes acompanham:

- uma referência única em perspectiva não determina a forma 3D esperada;
- a sonda declarava perfil `F2 conceitual, orcamentoFaces 1400` e foi julgada
  contra expectativa F3, sem limiar vinculante que impedisse o fechamento.
Ambos foram resolvidos em P0.

## Decisão de representação

A superfície exterior passa a ser autorada como:

> **malha de controle de quadriláteros com vincos, avaliada por subdivisão
> Catmull-Clark determinística, implementada no núcleo, sem dependência externa.**

A malha entregue a `mecanifica.malha-poligonal@1` é produto compilado num nível
de subdivisão declarado. A cage é o artefato autoral e versionado.

A unidade editável é o **loop de aresta nomeado**, com domínio finito: linha de
ombro, arco da caixa de roda, crista do para-lama, cintura, base do para-brisa.
Uma linha de caráter é um vinco semi-agudo sobre um loop, não uma fileira extra
de geometria.

Motivos completos no dossiê, seção 7. Em resumo: é o método padrão para o alvo
declarado; resolve os sintomas por topologia, não por sobreposição; poucos
controles geram superfície suave, o que atende o requisito de otimização; a
linhagem de identidade sai por aritmética; respeita `BLOCO = 1000`; e custa um
algoritmo local em JavaScript puro, não um kernel.

### Rejeições registradas

| Alternativa | Decisão | Motivo curto | Reabertura |
|---|---|---|---|
| OCCT / B-rep | rejeitada | requisito CAD ausente; saída ruim para jogo; custo de bundle; API contrária ao Agent-First | requisito real de STEP ou fabricação |
| Blender headless | rejeitada como backend | quebra determinismo, procedência e distribuição | nenhuma; mantido como referência visual |
| SDF / implícito | rejeitada | ruim em painel fino, vinco e gap | formas orgânicas sem requisito de painel |
| kernel próprio de B-rep | rejeitada | risco desproporcional | nenhuma prevista |
| booleana de malha (Manifold) | adiada | pele primária não sofre booleana | feature secundária que a topologia da cage não resolva |
| bake-off de três kernels | eliminado | duas rotas já eram elimináveis por análise | se a prova P2 acionar o critério de descarte |
| `loft` / envelope varrido como base da pele | rejeitado | não abre para-brisa, vidro nem vão de porta sem booleana; acopla capô, para-lama e túnel; converge para tubo | nenhuma para a pele exterior; segue válido em peças varridas |

## Invariantes

- núcleo e contratos não recebem vocabulário automotivo: a operação é
  `subdividir` sobre malha de quads, e `paralama` vive na receita;
- identidade persistida permanece semântica;
- a malha densa é produto compilado, nunca passo posicional — `BLOCO = 1000`
  é respeitado, não esticado;
- a representação rica não é achatada cedo em ids de vértice;
- falha, perda de procedência e tolerância ficam visíveis;
- receitas atuais e baseline continuam byte a byte compatíveis;
- estrutura, geometria, forma visual e apresentação têm decisões separadas;
- a pele primária não sofre booleana;
- a pele exterior não é autorada por `loft` nem por qualquer envelope varrido —
  aberturas são loops fechados na cage, e `loft` fica restrito a peças
  genuinamente varridas;
- o catálogo público permanece vazio durante a investigação.

## Rodadas

### P0 — alvo, referência e limiares — **fechada**

Executada em [`../CHASSI-P0-ALVO-E-LIMIARES.md`](../CHASSI-P0-ALVO-E-LIMIARES.md).

Entregou perfil `realistaApresentacao / F3 / dimensional` declarado antes de
modelar, envelope e quinze landmarks, cinco curvas mestras, limiares dos oito
eixos, oito condições de rejeição visual e orçamento por nível. Duas decisões
valem registro aqui:

- **Referência.** Não existe prancha calibrável, e o carro é ficcional — não há
  original contra o qual medir erro. A referência vinculante passa a ser a
  prancha ortográfica derivada dos landmarks de P0; a imagem em perspectiva fica
  como direção estética, fora de todo gate.
- **`BLOCO = 1000` virou limiar.** A cage completa, teto de 2800 quads, não cabe
  num passo: é emitida por regiões, 900 vértices e 900 faces cada.

### P1 — contrato da cage

- formato da malha de controle: quads, vincos, loops nomeados;
- **seção transversal como contrato**, nas cinco estações da curva mestra 4 de
  P0. Ela é entrada da cage, não recurso de desenho: fixá-la no motor de prancha
  criaria um formato que esta rodada teria de refazer;
- regra de linhagem `face da cage → faces do nível k`;
- contrato entre cage e `mecanifica.malha-poligonal@1`;
- política de diff que distinga mudança de forma de mudança de topologia.

### P2 — prova decisiva, descartável

Um quarto dianteiro, em zona privada, contendo obrigatoriamente:

- plano de simetria e capô, para-lama e lateral como regiões da mesma superfície;
- arco de roda realmente aberto, com retorno de borda;
- transição capô–para-lama sem corpo sobreposto;
- uma linha de caráter por vinco semi-agudo;
- recorte de farol conformado;
- início do vão envidraçado: base do para-brisa e canto dianteiro da janela
  lateral abertos por loop fechado, com moldura de retorno — sem booleana;
- identidades preservadas da cage até a malha compilada;
- a alteração `elevar a crista 25 mm` reexecutada por outra sessão.

Medir: faces da cage, faces por nível, bytes, tempo de avaliação, erro de
silhueta, pontos extraordinários visíveis e custo de contexto da alteração.
Produzir também uma forma não automotiva, para provar que a representação não
carrega vocabulário de carro.

**Critério de descarte, declarado antes:** a decisão reabre se a cage exigir mais
de ~800 quads no quarto dianteiro, se o arco não puder ser aberto sem booleana,
ou se a alteração local exigir tocar mais de um loop nomeado.

### P3 — integração e operação

- onde a subdivisão executa: núcleo, e o que custa em `bancada.html`;
- impacto medido em bundle, memória, tempo e bytes exportados;
- registro de capacidades, extensão nativa, MCP, preview baixo e publicação alta.

### P4 — plano executivo

- fatias reversíveis, migração, gates, rollback, condição de encerramento e
  aprovação explícita antes de alterar o produto.

## Validação

Oito eixos independentes — integridade, dimensão, silhueta, superfície,
topologia, semântica, apresentação e aceite — com limiares e métricas já fixados
em P0. O erro anterior foi deixar integridade, dimensão e apresentação aprovarem
por silhueta, superfície e aceite.

## Gate para virar `pronto`

- ~~alvo e fidelidade inequívocos, com perfil declarado antes de modelar~~ —
  fechado em P0;
- ~~referência resolvida e limiares numéricos fixados~~ — fechado em P0;
- prova P2 executada com todas as medidas registradas;
- critério de descarte avaliado, com resultado `manter` ou `reabrir`;
- contrato entre cage e malha compilada escrito;
- política de identidade para edição de cage e features secundárias;
- impacto de execução e distribuição medido;
- migração que preserve receitas e baseline existentes;
- destino do protótipo rejeitado decidido.

Dois itens fechados em P0; os demais seguem abertos. Não há plano ativo de
implementação.

## Fora desta versão

Implementação de produto, dependência geométrica nova, schema definitivo,
cronograma, réplica de fabricante, interior, monocoque, suspensão, física, UV,
baking e fabricação.

## Registro

- **V0 — 2026-08-18:** problema, evidência, armadilha do envelope, seis
  alternativas e processo iterativo registrados, sem decisão.
- **V1 — 2026-08-19:** representação decidida — cage de quads com vincos e
  subdivisão Catmull-Clark nativa. OCCT, Blender headless, SDF e kernel próprio
  rejeitados com motivo e condição de reabertura. Bake-off de três rotas
  substituído por prova única com critério de descarte. Unidade editável definida
  como loop de aresta nomeado. Booleana proibida na pele primária. `BLOCO = 1000`
  registrado como restrição de arquitetura. Causa raiz citada do código.
- **V2 — 2026-08-19:** `loft` e envelopes varridos rejeitados explicitamente como
  base da pele exterior, com o argumento de aberturas envidraçadas registrado no
  dossiê, seção 8.7. `loft` mantido sem alteração para peças varridas. Prova P2
  passa a exigir vão envidraçado aberto por topologia.
- **V3 — 2026-08-19:** P0 executada e fechada em
  `../CHASSI-P0-ALVO-E-LIMIARES.md`. Referência resolvida por prancha
  ortográfica derivada, com a imagem em perspectiva declarada não vinculante.
  `BLOCO = 1000` convertido em limiar de 900 ids por passo de cage.
- **V4 — 2026-08-19:** seção transversal encaixada em P1 como entrada da cage, e
  mantida fora do motor de prancha para não criar formato que P1 refaria.
- **Próxima revisão:** executar P1 — contrato da cage: formato de quads e
  vincos, seção transversal, loops nomeados, linhagem e política de diff.
