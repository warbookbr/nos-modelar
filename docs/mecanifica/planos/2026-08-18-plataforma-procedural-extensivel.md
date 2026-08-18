# Plataforma procedural extensível e descobrível

**Estado:** ativo

**Responsável:** agente executor a designar por rodada

**Base:** `warbookbr/nos-mecanifica`, `main` em `b9c3f64`.

**Execução:** R00: baseline em `BASELINE-MOTOR-R00.md`; R01: fachada e camadas;
R02: registro explícito; R03: operações fora do núcleo; R04: artefato, efeitos,
identidade, procedência e grafo, sem mudar receita ou canônico; R05: catálogo,
busca, explicação, hipergrafo e projeções geradas do registro.

## Objetivo verificável

Transformar o motor procedural numa plataforma modular que uma IA consiga
descobrir, combinar, estender, testar e manter sem ler um monólito ou depender
de documentação manual duplicada. O fechamento exige núcleo pequeno, registro
versionado, contratos executáveis, grafo derivado de capacidades, procedência,
subgrafos reutilizáveis, SDK de extensões nativas, diagnóstico de lacunas e
acesso Agent-First por serviço neutro e MCP.

## Evidência e abertura

`motor/oficina.js` possui 5.948 linhas e concentra infraestrutura geométrica,
identidade, seleção, triangulação, 32 operações, execução, canônico, adaptação
visual, animação, skinning e colisão simplificada. O bloco de operações ocupa
cerca de 2.900 linhas; `furo`, `loft` e `arredondarAresta` já têm tamanho de
módulos próprios. `OPS` lista nomes, mas argumentos, efeitos e limites são
duplicados no código, no contrato procedural e na skill.

A abertura foi autorizada em 18 de agosto de 2026. Git é o histórico: não
haverá cópia `legacy`, pasta `old` nem segundo executor. Código movido sai da
origem na mesma transição. Uma fachada pequena pode permanecer como entrada
canônica, sem conter implementação duplicada.

## Arquitetura-alvo

```text
IA · MCP · CLI · serviços
          ↓
catálogo e grafo de capacidades
          ↓
receita / subgrafo ── diagnóstico de lacuna ── SDK
          ↓                                  ↙
executor + registro explícito ← módulos versionados
          ↓
artefato neutro + procedência
          ↓
revisão · exportação · bancada · adaptadores
```

Três grafos permanecem distintos e conectados: **capacidades** responde o que
o motor oferece e exige; **procedimento/procedência** responde como a peça foi
construída; **montagem** continua em `src/autoria/` e responde como instâncias e
relações formam sistemas. Todos derivam de dados executáveis, nunca de diagrama
manual como fonte exclusiva.

## Contratos

1. **Módulo:** ID, namespace, versão, capacidades fornecidas e exigidas,
   operações, artefatos, interfaces e proveniência. Registro explícito, sem
   autorregistro global por `import`.
2. **Operação:** ID qualificado, versão, nome curto opcional, categoria, schema
   de entrada, artefatos consumidos/produzidos, pré-condições, efeitos, política
   de identidade, diagnósticos, custo, exemplos, validação e execução.
3. **Contexto:** serviços versionados para geometria, expressões, seleções,
   origens, transação local, procedência, diagnóstico, orçamento e cancelamento;
   extensão não recebe acesso irrestrito ao estado.
4. **Artefato:** `mecanifica.malha-poligonal@1` nomeia o neutro atual. Tipos
   posteriores entram por módulos; conversões são operações explícitas.
5. **Registro:** produz manifesto canônico, resolve nomes sem ambiguidade,
   negocia versões, valida o DAG, explica disponibilidade e assina a
   configuração reproduzível do motor.
6. **Subgrafo:** `mecanifica.composicao-procedural` v1 agrupa operações como
   unidade declarativa, parametrizável, versionada e recursiva sem ciclos,
   preservando identidade externa e procedência interna.
7. **Extensão nativa:** pacote de código do repositório com manifesto, contrato,
   implementação, fixtures e testes; receitas continuam dados sem JavaScript.
8. **Lacuna:** `mecanifica.lacuna-capacidade` v1 registra objetivo, tipos
   esperados, candidatas, requisito ausente, contorno/custo e classificação
   `composicao`, `operacao-nativa` ou `representacao`.
9. **Planejador:** busca determinística por tipos, interfaces, requisitos e
   custo; explica cadeias estruturalmente válidas sem fingir validação estética.
10. **MCP:** recursos de catálogo/grafo e ferramentas de busca, descrição,
    combinação, validação, lacuna, planejamento e verificação. Escrita fica em
    perfil opt-in, repositório explícito, confirmação dos bytes e gates.

Schemas, documentação, skill, busca e MCP derivam dos contratos das operações.
Projeções geradas podem ser publicadas, mas não viram segunda fonte manual.

## Invariantes e migração

- núcleo, contratos e grafos não importam Three.js, MCP, filesystem ou domínio
  automotivo;
- receita equivalente preserva geometria, identidade, portas, partes,
  diagnósticos e canônico salvo mudança funcional explicitamente aberta;
- registro e execução independem da ordem de imports;
- identidade persistida não usa UUID, índice de array ou runtime;
- falha não publica estado parcial; extensão não contorna gates ou orçamento;
- configuração mínima funciona sem catálogo, peça publicada ou bancada;
- uma função movida é removida da origem na mesma mudança;
- `oficina.js` pode reexportar a API, mas não guardar segunda implementação;
- consumidor interno muda junto com o contrato; ponte temporária declara
  rodada e remoção objetiva.

## Filtro Agent-First

- **REFATORAR:** organização interna, pois o monólito impede descoberta e
  extensão local confiáveis.
- **ENVOLVER:** operações existentes por contrato, contexto e registro comuns;
  autoria atual por execução registrada e procedência; MCP sobre serviços.
- **USAR DIRETO:** matemática provada, identidade, determinismo e falha fechada.
- **ADIAR:** novas famílias geométricas, exceto uma operação neutra necessária
  para provar o SDK.

## Rodadas executivas

1. **R00 — mapa e baseline.** Mapear imports, exports, consumidores e
   dependências; congelar a superfície usada; criar corpus sintético das 32
   operações e medir canônico, diagnósticos, tempo, memória, bundle e contexto.
2. **R01 — núcleo e fachada.** Extrair estado, resolução comum, identidade,
   diagnóstico, canônico e executor; separar adaptador e animação; migrar
   imports e provar equivalência sem cópia do motor.
3. **R02 — registro.** Implementar contratos de módulo/operação e configuração
   explícita; registrar as 32 operações; substituir despacho direto; provar
   duplicidade, ausência, versão, ordem e assinatura.
4. **R03 — pacotes.** Separar operações por responsabilidade, extrair somente
   interfaces compartilhadas medidas, remover cada corpo do monólito na mesma
   transição e gatear imports laterais.
5. **R04 — artefatos e procedência.** Tipar malha, declarar entradas, saídas,
   efeitos e identidade; derivar grafo da execução sem trocar por implicação o
   formato de receita; ligar entidades finais às operações responsáveis.
6. **R05 — catálogo e grafo.** Derivar DAG/hipergrafo, busca e explicações;
   gerar schemas, índice, documentação e referência da skill; substituir gates
   por regex e remover manutenção manual duplicada.
7. **R06 — subgrafos.** Implementar composição procedural v1, parâmetros, nós
   semânticos, recursão sem ciclo, orçamento e diagnóstico; provar três
   composições neutras reutilizadas por receitas diferentes.
8. **R07 — SDK nativo.** Gerar pacote, restringir interfaces, gatear contrato,
   determinismo, finitude, identidade, topologia e custo; criar uma operação de
   prova, usá-la em receita/subgrafo e provar diagnóstico após removê-la.
9. **R08 — lacunas e planejamento.** Persistir lacunas, buscar cadeias
   compatíveis, classificar extensão e medir recorrência/custo de contornos sem
   promoção automática.
10. **R09 — serviços e MCP.** Expor busca, descrição, combinação, validação,
    lacuna e extensão por serviços puros; publicar recursos/ferramentas MCP e
    provar fluxo caixa-preta completo em perfil autorizado.
11. **R10 — limpeza e campo.** Remover pontes e tabelas substituídas; auditar
    duplicação; modelar três peças de famílias diferentes e uma montagem com
    subgrafo e extensão; comparar baseline e encerrar.

Cada rodada termina verde antes da seguinte. O executor consulta coordenação e
reserva apenas os arquivos concretos da rodada.

## Provas e gates

1. As 32 operações aparecem exatamente uma vez e preservam o corpus canônico.
2. Configuração mínima, ordem permutada e remoção de módulo têm saída explícita.
3. Dependência ausente, duplicada, cíclica ou incompatível falha antes da malha.
4. Documentação e schemas reproduzem-se a partir dos contratos.
5. A IA encontra uma operação sem carregar a referência completa.
6. Subgrafo válido compõe; ciclo e tipo incompatível apontam caminho e ação.
7. Extensão não acessa estado fora do contexto e funciona em receita,
   procedência, exportação e bancada.
8. Remover a extensão produz lacuna, nunca sucesso parcial.
9. Planejador explica cadeia e descartes; MCP usa os mesmos serviços e schemas.
10. Ensaio caixa-preta e estudo final cobrem descoberta, composição, extensão,
    duas vistas por peça e revisão da montagem.
11. Não resta executor, implementação ou manifesto paralelo.
12. Tempo e memória não regridem materialmente sem decisão explícita.

Além dos gates completos do `INDEX.md`: corpus diferencial, guardas de imports
e unicidade, schemas/manifestos, geração limpa, configuração mínima, ordem
permutada, subgrafos, extensão removível, ensaio MCP, benchmark e
`git diff --check`. R01–R04 recusam diferença geométrica/canônica sem nova
autorização.

## Limites, parada e encerramento

Materiais canônicos, física, solver, cinemática e espaço varrido permanecem em
recortes próprios. A extensão de prova valida o SDK sem abrir campanha
geométrica; o plano não executa código arbitrário vindo de receita, não
substitui o grafo de montagem e não promete escolher sozinho a forma correta.

Parar se extensão precisar de estado irrestrito, registro depender de ordem ou
mutação global, contrato/grafo exigir manutenção manual, migração exigir dois
executores, canônico mudar sem escopo ou desempenho regredir sem causa medida.

O plano conclui somente com R00–R10, provas e gates registrados; motor anterior
integralmente substituído sem duplicata; ensaio por IA sem leitura da
implementação; e estudo de campo aprovado. A decisão final é `aprovar`,
`corrigir` ou `cancelar`.

## Fechamento

A preencher após R10.
