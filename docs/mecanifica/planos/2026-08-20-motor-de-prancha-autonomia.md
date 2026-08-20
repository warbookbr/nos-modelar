# Motor de Prancha — autonomia verificável

**Estado:** ativo

**Responsável:** Codex

**Repositório e base:** `warbookbr/nos-mecanifica`, `5ac6201`

## Mandato

Evoluir integralmente o Motor de Prancha para que uma IA possa criar e manter
uma prancha ortográfica confiável antes da geometria 3D. O usuário não precisa
levantar defeitos, escolher features, comparar bibliotecas nem decidir
arquitetura. O agente responsável descobre os problemas, pesquisa, experimenta,
decide, implementa, remove o que atrapalha e prova o resultado.

## Ponto de partida, não premissa

Motor de SVG, skill, métricas, coerência entre vistas, leitura rasterizada,
sobreposição e crítico visual já existem em `tools/mecanifica/`, `.claude/skills/`
e `docs/mecanifica/`. São candidatos a serem úteis, não compromissos de
preservação: cada um pode ser mantido, corrigido, substituído ou removido por
evidência de intenção, contexto, determinismo, diagnóstico, composição e identidade.

## Problema verificável

Uma IA que desenha e aceita sozinha o próprio contorno pode transformar erro de
interpretação, referência ambígua ou defeito de representação em falsa verdade
geométrica. A modelagem subsequente converge para a prancha errada com cada vez
mais confiança.

Ao encerrar este plano, uma tarefa sem diagnóstico prévio do usuário deve:

1. determinar se há informação suficiente para começar e recusar falsa precisão
   quando não houver;
2. construir ou corrigir contorno vetorial de quatro vistas por intenção
   geométrica, não por ajuste cego de pixels;
3. registrar procedência, landmarks, incerteza e relações entre vistas;
4. detectar os defeitos conhecidos e classes adversariais equivalentes;
5. receber crítica que não repita a narrativa de quem desenhou;
6. provar que a prancha melhora uma modelagem 3D comparável, em vez de apenas
   gerar um desenho agradável.

## Filtro Agent-First

Motor, skill, métricas, coerência e crítico atuais começam em **REFATORAR**:
permanecem só se agente novo os usar com pouco contexto e eles discriminarem
defeito real. Referência e sobreposição ficam em **ENVOLVER**, expondo
procedência, resíduo e incerteza. Editor, biblioteca, MCP ou skill externo fica
em **ADIAR** até superar o caminho atual no mesmo caso preservando autoria
editável. Núcleo procedural e cage também ficam em **ADIAR**; necessidade
comprovada abre plano próprio.

## Invariantes

- Prancha é autoria vetorial, semântica, versionável e determinística; imagem
  gerada não vira verdade sem conversão, procedência e validação explícitas.
- Medida independente, mutação adversarial e crítico frio são distintos de quem
  desenha; ambiguidade gera diagnóstico, confiança limitada ou bloqueio.
- Motor segue neutro, material de terceiro não entra, e dependência externa só
  vale por licença, portabilidade, determinismo, contexto, manutenção e vetor
  editável. P2, núcleo, receitas, câmera e geometria 3D permanecem intocados.

## Escopo e autonomia

O responsável pode pesquisar a internet, auditar código e documentação, criar
fixtures e protótipos privados, alterar ou substituir ferramentas de prancha,
skills, validadores, testes, documentos e artefatos de referência derivados.
Pode incorporar, adaptar ou rejeitar soluções externas e remover mecanismos que
tenham evidência de atrapalhar o agente.

Nenhuma escolha entre alternativas é devolvida ao usuário por comodidade. Quando
duas hipóteses forem plausíveis, a resposta é experimento comparativo com
critérios publicados. O agente para apenas diante de conflito com invariantes ou
de alteração que ultrapasse este escopo; nesses casos registra evidência e abre
recorte sucessor, sem simular capacidade ausente.

## Rodadas

### R0 — linha de base e mapa de risco

Executar o fluxo existente como IA nova o encontraria e auditar cada mecanismo:
entradas, saídas, contexto, decisões implícitas, falhas silenciosas e pontos em
que o mesmo agente é juiz de si.

Criar corpus mínimo de defeitos reproduzíveis: contorno aberto, auto-interseção,
inversão/ondulação de curvatura, assimetria, landmark deslocado, discordância
entre vistas, referência mal calibrada, detalhe fora do contorno, confiança
forjada e desvio entre prancha e modelo. Cada caso demonstra qual defesa atual o
pega ou por que ainda passa.

**Aceite:** concluído — [relatório de linha de base R0](../RELATORIO-MOTOR-DE-PRANCHA-R0.md)
reproduzível; nenhuma lacuna é inferida apenas por opinião.

### R1 — pesquisa externa e provas curtas

Pesquisar, em fontes primárias, editores vetoriais dirigíveis por agente,
extração de contorno, vetorização, ajuste de curvas, rasterização diferenciável,
MCPs ou skills. Cada candidato se liga a lacuna medida em R0, não à popularidade.

Para candidatos promissores, montar protótipo mínimo e reversível contra o mesmo
caso do corpus. Medir qualidade do vetor editável, preservação semântica,
determinismo, diagnóstico, instalação/licença, custo de contexto e capacidade de
rejeitar erro. Solução que apenas gere pixels bonitos é recusada.

**Aceite:** concluído — [relatório comparativo R1](../RELATORIO-MOTOR-DE-PRANCHA-R1.md)
com fontes, custo e veredito; linha atual e alternativa plausível foram comparadas no mesmo caso.

### R2 — contrato de autoria confiável

Com base em R0/R1, fechar ou substituir o menor contrato entre intenção, vetor,
referência e julgamento: landmark, simetria, cota, confiança, procedência,
relação de vistas, incerteza e bloqueio. Revisar ou substituir a skill para
consulta curta, não memória longa ou detalhe privado.

Toda métrica do caminho crítico declara o defeito que mata. Métrica que não
separa variante ruim da boa não é gate; pode permanecer só como diagnóstico ou
sair da ferramenta.

**Aceite:** schema, documentação e testes determinísticos do contrato; explicação
curta e consultável suficiente para outro agente executar o fluxo sem ler a
história deste plano.

### R3 — implementação selecionada

Implementar somente mecanismos cujo ganho foi demonstrado: reescrita do motor,
camada nova de validação, adaptador externo, representação vetorial nova, skill
mais curta ou remoção de falsa segurança. Cada fatia mantém replay, diagnóstico e
caminho de reversão.

**Aceite:** todo defeito obrigatório de R0 tem resultado explícito: recusado,
sinalizado com confiança/causa, ou declarado fora de escopo por limite real; não
há classe silenciosamente aceita.

### R4 — prova independente de autoria e impacto 3D

Uma IA sem contexto da implementação usa só documentação e portas oficiais para
produzir prancha inédita; outra, sem receita ou raciocínio do autor, revisa os
artefatos. Injetar mutações e verificar que os gates as rejeitam ou diagnosticam.
A mesma prancha orienta modelagem 3D comparável, avaliada por sobreposição e
crítico visual independente.

Comparar contra a linha de base de R0 com briefing, referência e orçamento
equivalentes. A comparação registra ganho ou, se não houver ganho, causa e
correção/reversão tomada; “a ferramenta mudou” não é evidência.

**Aceite:** agente novo conclui fluxo sem contexto oculto; crítico e testes
adversariais encontram as mutações; modelagem orientada pela prancha melhora em
métrica vinculante sem regressão nas demais, ou hipótese implementada é removida
e seu limite fica explícito.

### R5 — fechamento e continuidade

Consolidar apenas o que passou em R4. Atualizar contratos, skill, referências,
gates e índice; remover protótipos descartados ou registrá-los como evidência
histórica. Registrar limites honestos, candidatos para plano próprio e condições
para reativar P2 do chassi.

## Gates de saída

1. `npm test`, typecheck, build e gates de `docs/mecanifica/INDEX.md` passam;
2. replay determinístico e corpus adversarial demonstram que cada gate discrimina
   mutação concreta;
3. referência insuficiente, baixa confiança ou calibração ruim não é alvo preciso;
4. IA sem histórico produz e corrige prancha; crítico independente recebe só o
   visual necessário;
5. sobreposição e métricas demonstram impacto positivo — ou hipótese fracassada
   foi retirada, com evidência preservada;
6. quatro vistas e sobreposição são inspecionadas sem corte, e documentação
   explica operação e limites sem depender deste plano.

## Fora deste plano

- promover cage, Catmull-Clark ou módulo de P2 ao núcleo;
- construir carroceria completa, interior, física ou veículo funcional;
- aceitar imagem generativa como especificação geométrica sem contrato vetorial;
- copiar pranchas de terceiros para o repositório;
- manter integração externa por demonstração ou moda, sem ganho mensurado;
- aprovação estética pelo próprio autor ou por teste verde isolado.

## Riscos e parada

- Se referência não permite inferir dimensões ou quatro vistas coerentes, o
  resultado correto é registrar insuficiência e pedir ou derivar dados melhores,
  não preencher lacunas com imaginação.
- Se dependência externa não mantiver vetor editável, determinismo ou licença
  compatível, é descartada mesmo que a imagem pareça melhor.
- Se ganho não sobreviver à comparação controlada de R4, mudança é revertida ou
  isolada como experimento; não é promovida por esforço já gasto.
- Se alteração necessária alcançar núcleo procedural ou P2 congelada, a rodada
  para nesse limite e abre plano próprio com evidência, sem expansão silenciosa.

## Registro

- **V1 — 2026-08-20:** plano aberto por decisão do usuário. P2 do chassi foi
  congelado em `pronto` para que autoria e validação do alvo sejam auditadas antes
  de nova geometria. O usuário delegou diagnóstico, pesquisa, decisão,
  implementação e validação ao responsável; não há lista prévia de defeitos nem
  feature externa preescolhida.
