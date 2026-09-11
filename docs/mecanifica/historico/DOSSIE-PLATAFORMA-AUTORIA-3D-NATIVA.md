# Dossiê — plataforma nativa de autoria 3D para IA

## Papel e autoridade

Este dossiê detalha a arquitetura vinculante do plano
[`2026-08-23-arquitetura-hibrida-familias-modelagem-ia.md`](../planos/encerrados/2026-08-23-arquitetura-hibrida-familias-modelagem-ia.md).
Ele não autoriza implementação fora das fatias do plano. Em divergência, o
plano ativo e os contratos executáveis prevalecem.

## Resultado pretendido

A Mecanifica deve funcionar como um único ambiente nativo no qual uma IA
descobre capacidades, define o alvo, cria e edita a fonte 3D, inspeciona o
resultado, corrige defeitos, monta sistemas e publica revisões. O ambiente pode
ter vários provedores internos, mas oferece uma experiência operacional
coerente e uma única verdade de identidade, dependência e revisão.

Qualidade extrema significa forma reconhecível, superfície controlada,
integração verificável e capacidade de correção localizada. Não significa
quantidade ilimitada de polígonos, operações ou subsistemas.

## Ativos existentes a preservar

| Ativo | Papel no programa |
|---|---|
| registro das 32 operações | vocabulário dimensional inicial |
| subgrafos e extensões nativas | expansão confinada de capacidades |
| neutro resolvido e procedência | produto comum dos compiladores |
| partes, portas e intenção | semântica editável e interfaces |
| montagens v1–v4 | composição recursiva entre fontes |
| mapa, impacto e revalidação | propagação segura de mudanças |
| revisões imutáveis e autoria opt-in | publicação observada e reversível |
| bancada, vistas e foco | inspeção comum às famílias |
| achados visuais | defeitos reproduzíveis por revisão |
| MCP procedural/revisão/montagem | acesso Agent-First existente |

Receitas privadas defeituosas são evidência, não biblioteca de formas.

## Arquitetura lógica

1. **Pedido de autoria:** família, intenção, referência, restrições e nível de
   qualidade esperado.
2. **Planejador:** consulta capacidades, identifica lacunas e propõe um plano de
   operações e verificações sem escrever.
3. **Fonte autoral:** receita procedural, andaime, superfície semântica,
   montagem ou combinação versionada desses elementos.
4. **Compiladores:** validam a fonte e produzem malha neutra, regiões, portas,
   caixas, landmarks, procedência e diagnósticos.
5. **Contexto resolvido:** combina peças e submontagens sem copiar sua autoria.
6. **Validadores:** executam contratos estruturais, geométricos, de interface,
   superfície, contexto, estado e aparência.
7. **Revisão:** agrega resultados e imagens sem converter ausência de cobertura
   em passe.
8. **Publicação:** materializa somente proposta observada, confirmada e aprovada.

## Contratos comuns obrigatórios

Todo tipo de fonte deve declarar:

- `formato`, versão, ID semântico, família e revisão-pai;
- intenção, eixos, unidade, escala e sistema de coordenadas;
- parâmetros e fonte editável, sem depender de estado de renderização;
- regiões, landmarks e interfaces que sobrevivam à recompilação;
- dependências explícitas e impacto esperado;
- compilador e versão usados;
- artefato neutro derivado, assinatura e proveniência;
- capacidades suportadas, limites e diagnósticos acionáveis;
- critérios de aceite aplicáveis e estado de cada verificação.

A câmera, UUID de runtime, índice de array e ordem casual de carregamento não
são identidade. A representação interna pode usar índices, mas precisa projetar
endereçamento semântico estável na fronteira.

## Fontes e produtos

São fontes: receita declarativa, parâmetros, andaime, grafo de superfície,
regiões, interfaces, montagem e estados. São produtos derivados: malha densa,
triangulação, normais, caches, imagens, medições e exports resolvidos.

Produto derivado pode ser apagado e recompilado. Fonte não pode ser reconstruída
manualmente a partir do produto como rotina normal. Alteração de compilador
invalida derivados e abre revalidação; não reescreve silenciosamente a fonte.

## Ciclo de uma capacidade ausente

1. buscar e combinar capacidades existentes;
2. registrar a lacuna com caso, evidência e gate bloqueado;
3. classificar: composição, operação nativa, representação ou validador;
4. executar prova mínima com alternativas e orçamento;
5. rejeitar a alternativa que não muda o resultado observável;
6. implementar contrato e executor de forma transacional;
7. integrar descoberta, schemas, documentação, testes e MCP quando útil;
8. reexecutar corpus e prova de família antes de promoção.

Nenhuma lacuna autoriza automaticamente uma nova operação. Nenhum limite
documentado vira veto quando uma capacidade é essencial ao objetivo.

## Orquestração Agent-First

O serviço de orquestração deve oferecer operações pequenas e composicionais:
observar estado, explicar alvo, planejar alteração, compilar proposta, renderizar
contexto, validar, comparar, registrar decisão e aplicar. Chamadas separam
leitura, planejamento, inspeção e escrita.

MCP é uma porta preferencial quando reduz contexto e torna schemas descobríveis.
Não deve duplicar a regra de negócio nem receber caminhos arbitrários, shell,
Git ou JavaScript do agente. CLI e testes usam os mesmos serviços puros.

## Garantias não funcionais

- determinismo para a mesma fonte, parâmetros, compilador e versão;
- falha fechada, sem documento ou revisão parcial;
- diagnóstico com campo, causa, impacto e próximo passo;
- edição localizada com diff semântico e dependentes conhecidos;
- orçamento explícito de tempo, memória, polígonos e contexto;
- cache apenas como otimização observável e invalidável;
- migração versionada e reversível de contratos;
- testes de metamorfose para simetria, escala, recomposição e recompilação;
- corpus com sucessos, falhas e contraexemplos visuais preservados.

## Registro de incertezas

Cada fatia mantém uma tabela com pergunta, hipótese, alternativas, prova,
resultado, decisão e condição de reabertura. Uma pergunta essencial sem prova
bloqueia a fatia que depende dela; não pode reaparecer no final como surpresa.

O programa não promete prever todo problema. Ele promete tornar cada incerteza
visível cedo, limitar o investimento anterior à prova e preservar uma rota de
correção ou descarte.

## Critério de maturidade

A plataforma só é considerada integrada quando uma IA externa ao código consegue
descobrir o fluxo, criar ou alterar uma fonte, interpretar diagnósticos, rever o
objeto em contexto, localizar impacto e publicar uma revisão sem acesso oculto
à implementação. A prova deve incluir uma peça dimensional, uma superfície
estilizada e uma montagem híbrida.

