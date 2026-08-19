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

A causa raiz está lida no código, não inferida: a carroceria rejeitada é um único
`loft` de nove seções elípticas com doze lados — 86 vértices. Uma varredura de
elipse ao longo do comprimento. O protótipo seguinte, com três envelopes
sobrepostos e 1.014 vértices, confirmou que densidade não corrige abstração.

Dois problemas independentes acompanham:

- uma referência única em perspectiva não determina a forma 3D esperada;
- a sonda declarava perfil `F2 conceitual, orcamentoFaces 1400` e foi julgada
  contra expectativa F3, sem limiar vinculante que impedisse o fechamento.

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
declarado; resolve os sintomas por topologia e não por sobreposição; entrega o
requisito de otimização, porque poucos controles geram superfície suave; resolve a
linhagem de identidade por aritmética, já que cada face da cage gera filhas
determinísticas por nível; respeita `BLOCO = 1000` sem esticá-lo; e custa um
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
- o catálogo público permanece vazio durante a investigação.

## Rodadas

### P0 — alvo, referência e limiares

Fixar antes de qualquer modelagem:

- dimensões rígidas: entre-eixos, bitola, diâmetro de roda, balanços, altura;
- perfil de autoria esperado, declarado explicitamente como `F3`;
- referência calibrada: vistas, câmeras, escala e landmarks com confiança;
- limiares numéricos dos oito eixos de validação;
- condições de rejeição visual, escritas antes de existir geometria.

Sem P0 não há como julgar P2. Foi a ausência desta rodada que produziu o falso
positivo de 2026-08-18.

### P1 — contrato da cage

- formato da malha de controle: quads, vincos, loops nomeados;
- regra de linhagem `face da cage → faces do nível k`;
- contrato entre cage e `mecanifica.malha-poligonal@1`;
- política de diff que distinga mudança de forma de mudança de topologia.

### P2 — prova decisiva, descartável

Um quarto dianteiro, em zona privada, contendo obrigatoriamente:

- plano de simetria;
- capô, para-lama e lateral como regiões da mesma superfície;
- arco de roda realmente aberto, com retorno de borda;
- transição capô–para-lama sem corpo sobreposto;
- uma linha de caráter por vinco semi-agudo;
- recorte de farol conformado;
- identidades preservadas da cage até a malha compilada;
- a alteração `elevar a crista 25 mm` reexecutada por outra sessão.

Medir: faces da cage, faces por nível, bytes, tempo de avaliação, erro de
silhueta, pontos extraordinários visíveis e custo de contexto da alteração.

Também produzir uma forma não automotiva — casco, carenagem ou eletrodoméstico —
para provar que a representação não carrega vocabulário de carro.

**Critério de descarte, declarado antes:** a decisão é reaberta se a cage exigir
mais de aproximadamente 800 quads para o quarto dianteiro, se o arco de roda não
puder ser aberto sem booleana, ou se a alteração local exigir tocar mais de um
loop nomeado.

### P3 — integração e operação

- onde a subdivisão executa: núcleo, e o que isso custa em `bancada.html`;
- impacto medido em bundle, memória, tempo e bytes exportados;
- relação com registro de capacidades, extensão nativa e MCP;
- preview em nível baixo e publicação em nível alto.

### P4 — plano executivo

- fatias reversíveis, migração, gates, rollback e condição de encerramento;
- aprovação explícita antes de alterar o produto.

## Validação

Oito eixos independentes, com limiares fixados em P0: integridade, dimensão,
silhueta, superfície, topologia, semântica, apresentação e aceite. O erro anterior
foi deixar integridade, dimensão e apresentação aprovarem por silhueta, superfície
e aceite.

Métricas a instrumentar: IoU e Hausdorff de silhueta por vista, desvio de
landmarks projetados, zebra e curvatura sobre a superfície limite, inventário de
pontos extraordinários visíveis, razão entre faces da cage e faces compiladas,
gaps e self-intersections, estabilidade de hash sob replay.

## Gate para virar `pronto`

- alvo e fidelidade inequívocos, com perfil declarado antes de modelar;
- referências calibradas e limiares numéricos fixados;
- prova P2 executada com todas as medidas registradas;
- critério de descarte avaliado, com resultado `manter` ou `reabrir`;
- contrato entre cage e malha compilada escrito;
- política de identidade para edição de cage e features secundárias;
- impacto de execução e distribuição medido;
- migração que preserve receitas e baseline existentes;
- destino do protótipo rejeitado decidido.

Nenhum item está completo. Não há plano ativo de implementação.

## Fora desta versão

Implementação de produto, dependência geométrica nova, schema definitivo,
cronograma, réplica de fabricante, interior, monocoque estrutural, suspensão,
física, UV, baking e fabricação.

## Registro

- **V0 — 2026-08-18:** problema, evidência, armadilha do envelope, seis
  alternativas e processo iterativo registrados, sem decisão.
- **V1 — 2026-08-19:** representação decidida — cage de quads com vincos e
  subdivisão Catmull-Clark nativa. OCCT, Blender headless, SDF e kernel próprio
  rejeitados com motivo e condição de reabertura. Bake-off de três rotas
  substituído por prova única com critério de descarte. Unidade editável definida
  como loop de aresta nomeado. Booleana proibida na pele primária. `BLOCO = 1000`
  registrado como restrição de arquitetura. Causa raiz citada do código.
- **Próxima revisão:** executar P0 — dimensões rígidas, referência calibrada,
  perfil `F3` declarado e limiares numéricos, antes de qualquer modelagem.
