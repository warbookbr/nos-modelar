# Chassi realista — maturação do plano de implementação

**Estado:** rascunho

**Responsável:** Codex

**Dossiê:**
[`../ANALISE-CHASSI-REALISTA-KERNEL-GEOMETRICO.md`](../ANALISE-CHASSI-REALISTA-KERNEL-GEOMETRICO.md).

## Objetivo desta fase

Definir com evidência o problema que impede a Mecanifica de produzir uma
carroceria exterior realista e editável por IA. Comparar representações e
kernels antes de escolher arquitetura. Este rascunho não autoriza código de
produto, dependência nova, promoção da carroceria ou atualização de snapshots.

O plano e o dossiê serão iterados em várias rodadas: conteúdo poderá ser
criticado, corrigido, ampliado, reduzido ou removido. Só uma versão posterior,
aprovada explicitamente, poderá mudar para `pronto` e detalhar implementação.

## Problema atual

A plataforma já produz malhas determinísticas, partes semânticas, montagens,
exportação e vistas reproduzíveis. Entretanto, não existe hoje um caminho
demonstrado para uma IA definir, editar e validar uma carroceria F3 com controle
local de forma, continuidade, recortes, espessura e história semântica.

A carroceria atual cai na **armadilha do envelope longitudinal**: um loft ou
`inflate` varia largura e altura ao longo do comprimento, como um tubo de pasta
de dente deformável. Aumentar seções ou polígonos refina esse tubo; não cria
controle independente sobre capô, para-lamas, caixas de roda, cintura, teto,
colunas, painéis e suas transições.

O protótipo rejeitado comprovou o limite: carroceria de três envelopes elevou a
peça de 86/96 para 1.014/1.056 vértices/faces e o export total de 372.939 para
642.757 bytes. A leitura virou protótipo de corrida, não supercarro realista.
Mais densidade não corrigiu a abstração.

Há ainda dois problemas independentes:

- uma única referência em perspectiva não determina a forma 3D esperada;
- gates estruturais anteriores passaram sem um limiar vinculante de qualidade
  visual, continuidade ou semelhança.

## Hipótese de mecanismo Agent-First

A IA não deveria esculpir centenas de vértices nem ampliar envelopes globais.
Ela precisa trabalhar em níveis de intenção:

```text
dimensões + landmarks + curvas mestras
→ pele editável por regiões e continuidade
→ trims, cavidades, painéis e detalhes em camadas
→ validação da representação rica
→ tesselação/LOD determinísticos
→ mecanifica.malha-poligonal@1
```

Exemplos de controles semânticos: eixo das rodas, linha de ombro, arco da caixa
de roda, queda do capô, cintura, base do para-brisa e transição
capô–para-lama. A malha final deve manter procedência até esses controles.

Essa hipótese não escolhe tecnologia. B-rep/NURBS, SubD com booleanas robustas,
backend DCC e uma pilha híbrida serão comparados no mesmo recorte.

## Alternativas em análise

1. **SubD + booleanas de malha:** forte para ativo de jogo e edição de cage;
   riscos em cortes, precisão, retopologia e identidade.
2. **B-rep/OCCT:** maior teto para superfícies paramétricas, trims, shell,
   booleans e CAD; custo alto de integração, bundle, API e naming.
3. **Blender/DCC headless:** teto visual e ferramentas de jogo disponíveis;
   custo de runtime externo, estado, distribuição e identidade.
4. **SDF/implícito:** composição e cavidades robustas; fraco para painéis,
   vincos, gaps e superfície automotiva controlada.
5. **Híbrido:** curvas/pele para forma, B-rep ou mesh kernel para recursos e
   compilação para jogo; maior teto e maior complexidade.
6. **Kernel próprio completo:** controle teórico máximo, risco e tempo hoje
   desproporcionais.

A hipótese de maior teto é híbrida, mas escolher diretamente seria prematuro.

## Invariantes

- núcleo e contratos não recebem vocabulário automotivo;
- identidade persistida permanece semântica;
- a representação rica não é achatada cedo em IDs de vértice/faces;
- falha, perda de procedência e tolerância ficam visíveis;
- receitas atuais e baseline continuam compatíveis;
- estrutura, geometria, forma visual e apresentação têm decisões separadas;
- o catálogo público permanece vazio durante investigação.

## Rodadas de maturação

### P0 — alvo e referência

Resolver `chassi` versus `carroceria`, perfil, plataforma, distância, uso,
dimensões e referências ortográficas. Definir rejeições antes de modelar.

### P1 — capacidade existente

Provar, num quarto dianteiro, o que as operações atuais conseguem. Separar
ausência de representação, operação e workflow.

### P2 — bake-off

Modelar o mesmo quarto dianteiro em B-rep, SubD/mesh e backend externo. Exigir
arco de roda aberto, capô, para-lama, linha de caráter, recorte de farol,
continuidade declarada e identidades até a malha.

### P3 — IR e identidade

Definir o menor grafo de features e resolver procedência/topological naming,
replay, diff e alteração por outra sessão.

### P4 — integração

Comparar Node, WASM/browser, worker e processo externo. Medir dependência,
licença, bundle, memória, cache, falha e distribuição.

### P5 — plano executivo

Escolher arquitetura, fatias reversíveis, migração, gates, rollback e condição
de encerramento. Solicitar aprovação antes de implementar.

## Evidências e métricas a definir

- pranchas/câmeras calibradas, dimensões e landmarks;
- erro de silhueta por vista e landmarks projetados;
- continuidade G0/G1/G2 e mapas zebra/curvatura;
- manifold, gaps, overlaps, self-intersections e espessura;
- procedência após trim, booleana e tesselação;
- tempo, tokens, operações e correções até aceite;
- determinismo, faces, bytes, bundle, memória e geração;
- alteração local reexecutada por outra IA.

Os limiares ainda não existem e não serão inventados nesta rodada.

## Gate para virar `pronto`

- alvo e fidelidade inequívocos;
- referências calibradas suficientes;
- duas ou mais abordagens comparadas no mesmo spike;
- representação escolhida e rejeições justificadas;
- estratégia de identidade e procedência;
- contrato de compilação para a malha atual;
- execução, licença e distribuição medidas;
- gates geométricos e visuais com limiares;
- migração e rollback que preservem o existente;
- destino explícito do protótipo local rejeitado.

Nenhum item está completo. Portanto, não há plano ativo de implementação.

## Fora desta versão

Implementação, instalação de kernel, schema definitivo, cronograma, réplica de
fabricante, interior, monocoque estrutural, suspensão, física e fabricação.

## Registro

- **V0 — 2026-08-18:** problema, evidência, armadilha do envelope, alternativas,
  hipótese Agent-First e processo iterativo registrados.
- **Próxima revisão:** confirmar o significado e o nível de `chassi realista`,
  depois decidir quais candidatos entram no bake-off.
