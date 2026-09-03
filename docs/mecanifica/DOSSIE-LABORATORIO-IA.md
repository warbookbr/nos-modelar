# Laboratório computacional para investigação por IA

**Data:** 2026-08-31  
**Estado:** desenho aprovado; incubação oficializada na `main` em 2026-09-01  
**Plano que governa:** [`planos/encerrados/2026-09-01-laboratorio-computacional-ia.md`](planos/encerrados/2026-09-01-laboratorio-computacional-ia.md) (encerrado — o laboratório saiu para `warbookbr/nos-ciencia`)  
**Base:** `origin/main` em `b6367ed`  
**Escopo:** especificação arquitetural; **não autoriza promoção ao núcleo**

> **Mudança de 2026-09-01.** O desenho nasceu restrito à branch
> `experimento/laboratorio-ia`. Por decisão do usuário, a incubação passou a
> viver na `main`, atrás da guarda `arquitetura:lab:check`, porque incubação em
> branch longa não roda nos gates e diverge do núcleo a cada mudança. O que
> mudou foi ONDE se incuba, não o quê: as onze condições de promoção da seção 17
> continuam valendo integralmente e nenhuma está cumprida.

## 1. Decisão

A Mecanifica passa a incubar, em subsistema isolado sob guarda automática, um laboratório
computacional geral para agentes de IA. O laboratório permite formular estudos,
pesquisar evidências, planejar e executar experimentos, acionar instrumentos,
validar modelos, quantificar incerteza e produzir sínteses reproduzíveis.

O laboratório não é um validador de 3D, não se limita a materiais e não vira uma
dependência do núcleo da Mecanifica. A Mecanifica é um instrumento opcional do
laboratório: fornece geometria procedural, medidas, montagens, inspeção e
exportação quando um estudo precisa desses recursos. Uma IA que queira apenas
modelar ou exportar continua usando a Mecanifica sem conhecer o laboratório.

A incubação será híbrida:

- o subsistema nasce no topo do repositório, em `laboratorio/`, com fronteira
  explícita;
- o núcleo científico é Python, para aproveitar o ecossistema numérico;
- contratos versionados e artefatos são independentes de linguagem;
- uma ponte Node mínima consome portas públicas da Mecanifica;
- não há importação do laboratório pelo núcleo da Mecanifica;
- a estrutura admite extração futura para repositório próprio sem reescrever o
  modelo de domínio.

## 2. Por que isso pertence à incubação da Mecanifica

A contribuição não é transformar a Mecanifica em um pacote científico
monolítico. É acrescentar uma camada de investigação capaz de usar modelos 3D
como sistemas mensuráveis e simuláveis, preservando a especialização de cada
lado.

O laboratório amplia o valor da Mecanifica em quatro direções:

1. transforma geometria em entrada rastreável para simulação e experimentação;
2. conecta hipóteses a medidas, condições, resultados e fontes;
3. compara alternativas com incerteza explícita, em vez de produzir somente uma
   forma visual;
4. devolve recomendações auditáveis que podem, mediante ação separada, orientar
   uma nova revisão de autoria.

O laboratório também funciona sem 3D. Estudos estatísticos, modelos analíticos,
pesquisa bibliográfica, otimização, dinâmica, custo, energia, controle e outros
domínios podem usar instrumentos próprios.

## 3. Objetivos e não objetivos

### 3.1 Objetivos

- dar à IA um processo científico explícito, observável e reproduzível;
- separar fatos, hipóteses, modelos, execuções, evidências e conclusões;
- combinar instrumentos heterogêneos por contratos pequenos e versionados;
- validar a aplicação de um modelo dentro de um domínio declarado;
- preservar unidades, parâmetros, sementes, ambiente, código, fontes e hashes;
- representar resultado inconclusivo ou contraditório sem forçar certeza;
- limitar tempo, armazenamento, rede, custo e permissões de cada execução;
- permitir auditoria e reprodução sem depender da conversa original da IA;
- manter a experiência Agent-First e o núcleo atual da Mecanifica intactos.

### 3.2 Não objetivos da incubação

- declarar que uma simulação é verdade física por ter convergido numericamente;
- substituir ensaios físicos, revisão especializada ou requisitos regulatórios;
- executar código arbitrário gerado pela IA;
- instalar dependências ou instrumentos implicitamente durante uma execução;
- oferecer acesso irrestrito à rede, ao sistema de arquivos ou a credenciais;
- editar ou promover objetos da Mecanifica automaticamente;
- suportar todos os domínios científicos na primeira versão;
- criar uma ontologia universal ou um novo gerenciador de pacotes;
- manter compatibilidade retroativa antes da primeira promoção experimental.

## 4. Princípios invariantes

1. **A investigação é a entidade principal.** O 3D serve ao estudo quando útil.
2. **Planejar não é executar.** Toda mutação ou custo exige autorização explícita.
3. **Resultado não é evidência admitida.** Validadores decidem a admissibilidade.
4. **Convergência não é validação.** Verificação numérica e validação do modelo
   são julgamentos separados.
5. **Fonte não é verdade.** Metadados, alegações e evidências ficam separados.
6. **Incerteza não é escondida.** Intervalos, distribuições, sensibilidades e
   limitações acompanham a síntese.
7. **Falha fecha o passo.** Não há sucesso parcial silencioso.
8. **Artefatos são imutáveis.** Conteúdo novo recebe nova identidade por hash.
9. **Capacidades são explícitas.** Importar um módulo não registra instrumento.
10. **A Mecanifica não depende do laboratório.** A direção da ponte é laboratório
    para portas públicas da Mecanifica.
11. **Recomendação não é autoria.** Aplicar uma recomendação é outro fluxo.
12. **Reprodução não depende da memória do agente.** O pacote do estudo é
    suficiente para inspecionar entradas, método e resultados.

## 5. Arquitetura

### 5.1 Planos do sistema

O laboratório é dividido em três planos, conectados apenas por contratos
versionados.

#### Plano de controle

Mantém o ciclo de investigação:

`estudo → hipóteses → protocolo → plano/DAG → execuções → validação → síntese`

Ele resolve estados, dependências, autorização, orçamento e encerramento. Não
contém algoritmos científicos específicos nem detalhes da Mecanifica.

#### Plano de instrumentos

Contém adaptadores capazes de observar ou transformar entradas sob contrato:

- computação científica local;
- pesquisa e recuperação de dados;
- Mecanifica;
- simuladores externos por arquivo ou processo confinado;
- futuras fontes físicas ou remotas.

Um instrumento declara capacidades e limites; ele não decide se sua saída prova
uma hipótese.

#### Plano de evidências

Mantém artefatos imutáveis, proveniência, validações, alegações, fontes,
incertezas e relações de derivação. A síntese lê esse plano e nunca precisa
inferir procedência a partir de nomes de arquivos ou texto livre.

### 5.2 Estrutura de diretórios prevista

```text
laboratorio/
  README.md
  pyproject.toml
  contratos/
    schemas/
    exemplos/
  src/laboratorio/
    dominio/
    controle/
    artefatos/
    proveniencia/
    instrumentos/
    validadores/
    pesquisa/
    sintese/
    portas/
  adaptadores/
    mecanifica-node/
    pesquisa/
    simuladores/
  skills/
  testes/
    contrato/
    canarios/
    diferenciais/
    metamorfos/
    adversariais/
    caixa-preta/
  pilotos/
    cabo-ferramenta/
    sistema-multidisciplinar/
  docs/
```

Arquivos produzidos por execuções ficam fora do Git por padrão. Somente fixtures
pequenas, manifestos, resultados de referência e evidências deliberadamente
promovidas entram no repositório.

### 5.3 Dependências direcionais

```text
skills / CLI / MCP
        ↓
serviços neutros do laboratório
        ↓
controle ──→ contratos ←── validadores
   ↓              ↓              ↓
registro      artefatos      evidências
   ↓
adaptadores de instrumentos ──→ portas públicas externas
                                  └─ Mecanifica
```

São proibidas as seguintes arestas:

- núcleo Mecanifica → laboratório;
- contrato → adaptador concreto;
- validador → interface conversacional;
- instrumento → síntese final;
- pesquisa → autoria Mecanifica;
- resultado mutável → artefato já identificado por hash.

## 6. Modelo de domínio e contratos mínimos

Todos os documentos têm `formato`, `versao`, `id`, `criadoEm`, `produtor` e
referências por identidade estável. JSON Schema valida a forma; regras de domínio
validam relações, unidades e estados. Datas são UTC em RFC 3339. Hashes usam
SHA-256 com serialização canônica definida pelo contrato.

### 6.1 `lab.estudo@1`

É o envelope de uma investigação. Declara pergunta, escopo, contexto, critérios
de encerramento, orçamento, permissões máximas, participantes, hipóteses e estado.

Estados: `rascunho`, `planejado`, `autorizado`, `em-execucao`, `em-avaliacao`,
`encerrado`, `cancelado`.

Uma mudança de pergunta ou critério após autorização cria nova revisão do estudo.

### 6.2 `lab.hipotese@1`

Declara uma proposição testável, variáveis observáveis, domínio de validade,
predições, critério de refutação e relações com outras hipóteses.

Estados de avaliação:

- `nao-testada`;
- `sustentada-no-dominio-testado`;
- `contradita`;
- `inconclusiva`.

Não existe estado `verdadeira`, e não existe um escalar universal de confiança.
Cada avaliação cita evidências, domínio, incertezas e validadores aplicados.

### 6.3 `lab.protocolo@1`

Congela método, variáveis, controles, amostragem, métricas, critérios de aceitação,
análises planejadas, política de sementes, instrumentos permitidos e desvios
aceitáveis. Desvio executado gera ocorrência explícita; não reescreve o protocolo.

### 6.4 `lab.instrumento@1`

Manifesto declarativo com:

- identidade, versão, fornecedor e licença SPDX;
- capacidades e operações;
- esquemas de entrada, saída e artefatos;
- unidades e convenções;
- domínio de validade e exclusões;
- determinismo, sementes e requisitos de reprodução;
- custo estimável, limites e cancelamento;
- maturidade, benchmarks e validadores exigidos;
- permissões de arquivos, processo, rede e credenciais;
- impressão do ambiente e integridade do pacote.

### 6.5 `lab.plano@1`

É um DAG imutável de passos. Cada passo referencia uma operação registrada,
entradas por valor ou hash, saídas esperadas, dependências, limites, política de
repetição e validadores de admissão. O planejador deve provar antes da autorização:

- que o grafo é acíclico;
- que todas as capacidades existem;
- que esquemas e dimensões são compatíveis;
- que permissões cabem no teto do estudo;
- que o custo estimado cabe no orçamento;
- que toda saída consumida tem produtor único;
- que não há referência a versão flutuante.

### 6.6 `lab.execucao@1`

Registra tentativa concreta: plano e passo, estado, timestamps, ambiente,
instrumento resolvido, parâmetros efetivos, sementes, entradas, saídas, logs
estruturados, consumo, cancelamento e erro.

Estados: `preparada`, `autorizada`, `executando`, `concluida`, `falhou`,
`cancelada`, `expirou`.

Repetir um passo cria nova execução, mesmo com entradas idênticas. Igualdade de
resultado é observada por hash, não pela reutilização da identidade da execução.

### 6.7 `lab.evidencia@1`

Relaciona uma alegação ou hipótese a artefatos e avaliações. Declara o tipo de
evidência, direção (`sustenta`, `contradiz`, `limita`, `contextualiza`), domínio,
força justificada por critérios específicos, incertezas, dependências, fonte e
validadores. Evidência derivada preserva toda a cadeia até entradas primárias.

### 6.8 `lab.sintese@1`

Resume o estado do estudo sem apagar dissenso. Contém conclusões por hipótese,
resultados principais, evidências favoráveis e contrárias, limites, incertezas,
desvios, conflitos não resolvidos, reprodutibilidade, recomendações e próximos
experimentos. Toda frase factual relevante referencia IDs de evidência.

### 6.9 `lab.pacote-reproduzivel@1`

Manifesto de exportação que inclui contratos, DAG, execuções, artefatos,
ambiente, licenças e relações de proveniência. A representação interoperável será
um RO-Crate; o formato interno não depende de RO-Crate para executar.

### 6.10 Compatibilidade

- leitores aceitam somente versões major conhecidas;
- campos desconhecidos não alteram semântica silenciosamente;
- migrações são funções puras, testadas e registradas como derivação;
- contratos canônicos não contêm caminhos absolutos da máquina;
- referências externas incluem resolvedor, versão e hash quando disponível.

## 7. Artefatos e proveniência

O armazenamento é endereçado por conteúdo. Um artefato possui hash, tamanho,
tipo de mídia, esquema, produtor, licença, classificação de sensibilidade e
localização física separada de sua identidade.

O modelo de proveniência adota a semântica de W3C PROV:

- **entidade:** contrato, dado, modelo, fonte ou artefato;
- **atividade:** execução, transformação, validação ou síntese;
- **agente:** pessoa, IA, instrumento, organização ou software responsável.

Relações mínimas: `usou`, `gerou`, `foiDerivadoDe`, `foiAtribuidoA`,
`foiAssociadoA`, `especializacaoDe` e `invalidou`.

O sistema registra também:

- commit ou pacote de código;
- versão e hash do instrumento;
- sistema operacional, arquitetura e runtime;
- lockfiles e dependências relevantes;
- variáveis de ambiente permitidas, com segredos apenas como presença/identidade;
- sementes e gerador pseudoaleatório;
- unidades e convenções;
- parâmetros efetivos após defaults;
- stdout/stderr limitados e eventos estruturados;
- tempo, CPU, memória, disco, rede e custo quando mensuráveis.

Segredos, dados pessoais e conteúdo licenciado não são copiados para o pacote
reproduzível por padrão. O manifesto registra uma referência protegida e a razão
da ausência.

## 8. Registro e confinamento de instrumentos

### 8.1 Registro explícito

Instrumentos são habilitados por uma configuração auditável que referencia um
manifesto validado. Importar Python, instalar pacote ou encontrar executável no
`PATH` não concede capacidade. Versões são fixas durante um plano autorizado.

Maturidade é declarada como:

- `experimental`: somente canários e exploração;
- `qualificado`: passou benchmarks publicados para domínio delimitado;
- `validado-localmente`: comparado a referência independente do laboratório;
- `restrito`: requer aprovação especializada ou ambiente específico.

Maturidade não substitui a validação de cada aplicação.

### 8.2 Quatro portões

1. **Descobrir:** consulta somente leitura a manifestos e capacidades.
2. **Planejar:** resolve DAG, esquemas, unidades, orçamento e permissões.
3. **Executar:** usa ambiente confinado, observável, cancelável e limitado.
4. **Admitir evidência:** aplica validadores; saída reprovada continua preservada,
   mas não sustenta automaticamente uma conclusão.

### 8.3 Executor

O executor aceita somente operações previamente registradas. Cada execução recebe
diretório efêmero próprio, entradas montadas como somente leitura quando possível,
saída limitada e identidade sem privilégios. Rede começa negada e é liberada por
destino/operação no protocolo. Processos filhos, tempo, memória e armazenamento
têm tetos. Cancelamento encerra a árvore de processos e registra o estado.

Um instrumento externo pode ser integrado por:

- biblioteca no ambiente científico fixado;
- processo local com protocolo de arquivo/stdin/stdout;
- contêiner ou ambiente equivalente quando disponível;
- serviço remoto com versão, política de dados e resposta preservadas.

Nenhum desses meios muda o contrato de instrumento.

### 8.4 Erros estruturados

Falhas usam `categoria`, `codigo`, `mensagem`, `local`, `causa`, `recuperavel`,
`acaoSugerida` e referências aos artefatos de diagnóstico. Categorias iniciais:
`contrato`, `dominio`, `unidade`, `permissao`, `orcamento`, `execucao`,
`instrumento`, `validacao`, `proveniencia`, `fonte` e `seguranca`.

## 9. Validação científica

A admissibilidade é uma composição de pareceres, nunca um booleano universal.
Cada validador produz `aprovado`, `reprovado`, `inconclusivo` ou `nao-aplicavel`,
com métricas, limites, artefatos e justificativa.

### 9.1 Contrato, unidades e domínio

- esquema e versão;
- completude e intervalos;
- análise dimensional com unidades explícitas;
- convenções de eixo, sinal, referencial e escala;
- domínio declarado pelo instrumento e pelo modelo;
- pré-condições e extrapolações.

Grandezas físicas não trafegam como números nus em interfaces científicas.

### 9.2 Verificação numérica

Responde se a implementação resolve corretamente o modelo declarado:

- solução analítica ou manufaturada quando disponível;
- convergência de malha, passo ou amostragem;
- ordem observada de convergência;
- estabilidade e conservação;
- tolerâncias absolutas e relativas justificadas;
- comparação diferencial com implementação independente;
- invariantes e testes metamórficos.

### 9.3 Validação do modelo

Responde se o modelo representa o fenômeno para o uso pretendido:

- comparação com benchmark ou dado empírico independente;
- separação entre calibração e validação;
- métricas e erro aceitável definidos antes do resultado;
- cobertura do domínio e regimes não testados;
- discrepância do modelo separada do ruído de medição;
- validade local, sem generalização automática.

### 9.4 Incerteza e sensibilidade

- origem e tipo de cada incerteza;
- distribuições e correlações justificadas;
- propagação por método adequado ao custo e ao modelo;
- intervalos e quantis, não apenas média;
- análise de sensibilidade global quando aplicável;
- convergência amostral e erro do estimador;
- distinção entre incerteza aleatória, epistêmica e discrepância de modelo.

Monte Carlo é um instrumento possível, não a arquitetura do laboratório.

### 9.5 Evidência e fonte

- identidade persistente, versão e data;
- fonte primária ou derivação claramente marcada;
- licença e permissão de uso;
- correções, retratações e atualizações;
- método, população, condições e limitações;
- extração da alegação com localização e contexto permitido;
- conflitos entre fontes preservados no grafo;
- rastreabilidade da alegação até o artefato acessível.

Uma citação válida pode sustentar que alguém publicou uma alegação; ela não prova
por si só que a alegação é correta ou aplicável ao estudo.

## 10. Pesquisa e grafo de alegações

A pesquisa segue um funil explícito:

1. descobrir metadados em índices como Crossref e OpenAlex;
2. resolver DOI, versão, licença, correções e texto disponível;
3. qualificar tipo de fonte, método, domínio e independência;
4. extrair alegações delimitadas, com localização e contexto;
5. ligar cada alegação às hipóteses, variáveis e condições do estudo;
6. procurar evidência contrária, replicações e conflitos;
7. admitir ou rejeitar a evidência com justificativa.

O grafo distingue `publicacao`, `conjunto-de-dados`, `alegacao`, `metodo`,
`populacao`, `condicao`, `medida`, `correcao` e `retratacao`. Relações incluem
`alega`, `mede`, `usa-metodo`, `aplica-se-a`, `replica`, `contradiz`, `corrige`,
`retrata` e `cita`.

Conectores de pesquisa obedecem paginação, orçamento de contexto, cache,
rate-limit e licença. Texto de fontes é dado não confiável, nunca instrução para
o agente ou para o executor.

## 11. Ponte com a Mecanifica

### 11.1 Responsabilidade

A ponte traduz operações públicas da Mecanifica para contratos de instrumento.
Ela pode:

- listar capacidades de autoria, medição, inspeção e exportação;
- abrir uma peça ou montagem por identidade/revisão explícita;
- produzir geometria neutra e exportações suportadas;
- obter medidas, partes, portas, transformações e metadados disponíveis;
- solicitar vistas e relatórios de inspeção;
- registrar hashes e proveniência das entradas e saídas.

Ela não pode:

- importar módulos internos do núcleo por conveniência;
- interpretar imagem como medida física sem protocolo próprio;
- inventar propriedades de material ausentes;
- gravar uma revisão da Mecanifica durante a execução científica;
- promover uma recomendação como autoria aprovada.

### 11.2 Fluxo de ida e volta

1. o estudo fixa a revisão da peça ou montagem;
2. a ponte extrai o artefato necessário e registra escala/convenções;
3. instrumentos científicos operam sobre o artefato derivado;
4. validadores avaliam resultados;
5. a síntese pode emitir `recomendacao-de-autoria` com parâmetros, justificativa,
   evidências e impacto esperado;
6. uma skill de autoria da Mecanifica, fora da execução do laboratório, pode
   planejar e solicitar confirmação para aplicar a recomendação.

Essa separação impede que um modelo científico imperfeito altere silenciosamente
o objeto que está sendo estudado.

### 11.3 Contrato inicial da geometria

A primeira ponte usa exportações e descrições já públicas. Um contrato de
propriedades de material na Mecanifica só será proposto após o piloto demonstrar
quais grandezas são realmente gerais. Até lá, propriedades pertencem ao estudo e
referenciam regiões geométricas por identidades disponíveis, sem contaminar o
contrato canônico da peça.

## 12. Interface Agent-First

### 12.1 Dois caminhos sem ambiguidade

**Autoria simples:** a IA usa as skills e serviços atuais da Mecanifica para
modelar, inspecionar ou exportar. Nenhum estudo é criado implicitamente.

**Investigação:** a IA ativa deliberadamente uma skill do laboratório. A partir
daí, pergunta, hipótese, protocolo, plano, autorização e evidência ficam visíveis.

### 12.2 Skills previstas

- `investigar-sistema`: formula e conduz um estudo completo;
- `pesquisar-evidencias`: constrói e qualifica o grafo de fontes e alegações;
- `validar-modelo`: aplica V&V, domínio e incerteza a um modelo/uso;
- `reproduzir-estudo`: verifica pacote, ambiente e resultados sem reinterpretar
  silenciosamente o protocolo.

Skills orquestram serviços; não contêm implementação científica escondida.

### 12.3 Serviços neutros

- `formular_estudo`
- `buscar_evidencias`
- `planejar_experimento`
- `autorizar_execucao`
- `executar_plano`
- `avaliar_evidencias`
- `sintetizar_estudo`
- `exportar_pacote_reproduzivel`

Cada serviço tem entrada e saída estruturadas, paginação quando necessária,
estimativa de custo e erros acionáveis.

### 12.4 Autoridade progressiva

1. **Leitura:** descobrir capacidades e inspecionar estudo/artefatos.
2. **Planejamento:** criar protocolo e DAG sem executar.
3. **Execução opt-in:** autorizar plano fixo dentro de limites explícitos.
4. **Autoria separada:** usar o fluxo próprio da Mecanifica para qualquer mudança.

CLI e MCP são portas finas. O MCP terá perfil de leitura/planejamento e perfil de
execução separados; nenhum perfil amplia a autoridade do serviço subjacente.

## 13. Ecossistema técnico e política de dependências

O núcleo Python começa pequeno, com biblioteca padrão e dependências aprovadas
por função. Candidatos iniciais:

- SciPy para algoritmos científicos gerais, licença BSD;
- Pint para unidades, licença BSD;
- SALib para sensibilidade global, licença MIT;
- scikit-fem para canários e pilotos de elementos finitos, licença BSD-3-Clause;
- OpenMDAO para integração/otimização multidisciplinar quando a fase exigir,
  licença Apache-2.0.

FMI é a fronteira preferida para intercâmbio e co-simulação com ferramentas que
o suportem. CWL é referência para proveniência e portabilidade de workflows; o
DAG interno permanece menor e orientado aos contratos do laboratório. Novas
dependências só entram após prova de necessidade e comparação com alternativa
mais simples.

Política de licença:

- preferir MIT, BSD-2/3-Clause e Apache-2.0;
- registrar SPDX, versão, origem, avisos e dependências transitivas;
- proibir código ou dados sem licença identificada;
- avaliar separadamente copyleft, restrições de uso, modelos e dados;
- manter ferramenta incompatível, se indispensável, como adaptador externo sem
  copiar código, somente após revisão jurídica/técnica específica;
- gerar inventário de componentes e licenças em cada pacote reproduzível.

## 14. Segurança e governança

O modelo de ameaça inclui plano malicioso, fonte com prompt injection, pacote
adulterado, caminho escapando do estudo, symlink, bomba de armazenamento,
processo órfão, exfiltração de segredo, dependência comprometida e resultado
forjado.

Controles mínimos:

- validação fail-closed de contratos e caminhos;
- allowlist de operações, executáveis, rede e tipos de artefato;
- diretórios resolvidos e confinados, sem seguir links não autorizados;
- integridade por hash e lockfiles;
- limites de recursos e tamanho de logs/artefatos;
- segredos fora de contratos e logs;
- conteúdo externo tratado como dado não confiável;
- assinatura ou atestação futura sem ser requisito da primeira fatia;
- trilha imutável de autorização, execução, cancelamento e admissão;
- política de retenção e eliminação explícita para dados sensíveis.

O laboratório produz suporte à decisão, não certificação regulatória. Estudos de
alto risco devem declarar revisão humana/especializada obrigatória antes de uso.

## 15. Programa de implementação

Cada rodada termina com contratos, testes e evidências verdes antes da seguinte.

### R0 — Fronteira e baseline

- criar esqueleto isolado e guardas de dependência;
- fixar contratos, vocabulário, estados e erros;
- registrar a baseline atual, inclusive limitações ambientais;
- provar que build e uso simples da Mecanifica não carregam o laboratório.

**Saída:** contratos validáveis e prova de isolamento, sem executor científico.

### R1 — Artefatos e proveniência

- armazenamento por conteúdo;
- serialização canônica, hashes e manifestos;
- entidades/atividades/agentes e relações;
- exportação RO-Crate mínima;
- reprodução de transformação determinística simples.

**Saída:** pacote auditável de um canário matemático.

### R2 — Registro e executor confinado

- registro explícito de instrumentos;
- validação de plano/DAG;
- orçamento, autorização, cancelamento e erros;
- runner local sem rede por padrão;
- instrumento canário com entradas e saídas tipadas.

**Saída:** plano autorizado executado e cancelado sob limites comprovados.

### R3 — Pesquisa e alegações

- conectores de metadados para Crossref e OpenAlex;
- resolução de versões, licenças, correções e retratações;
- grafo de alegações e fontes conflitantes;
- cache, paginação e proteção contra conteúdo-instrução.

**Saída:** hipótese ligada a fontes favoráveis, contrárias e limitações.

### R4 — V&V, incerteza e sensibilidade

- unidades e análise dimensional;
- validadores numéricos e de domínio;
- propagação de incerteza e sensibilidade;
- canários analíticos e diferenciais;
- síntese sem confiança escalar mágica.

**Saída:** resultado convergente, validado em domínio limitado e reproduzível.

### R5 — Ponte neutra da Mecanifica

- adaptador Node fora do núcleo;
- fixação de revisão e exportação rastreada;
- medidas, vistas e descrições pelas portas públicas;
- recomendação de autoria sem aplicação automática;
- guardas provando ausência de dependência reversa.

**Saída:** geometria da Mecanifica usada como entrada de estudo sem editar a peça.

### R6 — Pilotos verticais

- piloto do cabo de ferramenta do repositório Digital Twin;
- piloto multidisciplinar não centrado em materiais;
- comparação com referências independentes;
- pacotes reproduzíveis e relatórios de limitações.

**Saída:** dois domínios diferentes atravessam o ciclo completo.

### R7 — Experiência Agent-First e avaliação caixa-preta

- skills e documentação de uso;
- portas CLI e perfis MCP separados;
- descoberta econômica de capacidades;
- agente caixa-preta formula, planeja, pede autorização, executa, audita e
  reproduz sem shell nem conhecimento de caminhos internos;
- medição de contexto, tempo, disco, rede e custo.

**Saída:** decisão documentada de promover, extrair ou encerrar a incubação.

## 16. Estratégia de testes

### 16.1 Matriz

- **contrato:** positivos, negativos, versões e migrações;
- **dimensional:** conversões, incompatibilidades e convenções;
- **determinismo:** sementes, hashes, ambiente e repetição;
- **numérico:** convergência, estabilidade, conservação e tolerâncias;
- **diferencial:** solução analítica ou solver independente;
- **metamórfico:** escala, simetria, permutação e invariantes aplicáveis;
- **incerteza:** distribuição, correlação, convergência e sensibilidade;
- **proveniência:** cadeia completa e adulteração detectada;
- **segurança:** fonte maliciosa, unidade errada, path traversal, symlink, plano
  malicioso, estouro de orçamento e cancelamento;
- **caixa-preta:** agente descobre, executa, audita e reproduz pelas portas.

### 16.2 Canários matemáticos

Antes de qualquer piloto complexo, o laboratório resolve problemas com resposta
conhecida: transformações de unidade, funções analíticas, integração simples,
propagação linear de incerteza e problemas numéricos pequenos com convergência
esperada. Um instrumento que falha em canário não participa de piloto.

### 16.3 Piloto 1 — cabo de ferramenta

O caso existente em `ditial-twin-lab-materiais` será preservado como referência e
reexpresso pelos contratos, não copiado cegamente. O ciclo inclui:

- geometria/revisão rastreada da Mecanifica;
- materiais e propriedades com fonte e domínio;
- cargas, condições de contorno e hipóteses explícitas;
- modelo analítico e/ou numérico comparável;
- Monte Carlo com sementes e convergência;
- sensibilidade e fronteira de Pareto;
- validação contra benchmark independente disponível;
- síntese que distingue resistência, massa, custo e incerteza.

O piloto reprova se apenas reproduzir os números do repositório anterior sem
provar unidades, domínio, procedência e estabilidade.

### 16.4 Piloto 2 — sistema multidisciplinar

Uma montagem pequena combina pelo menos geometria, dinâmica/vibração e custo ou
energia. O estudo deve exigir dois instrumentos científicos e uma composição de
resultados. Seu propósito é provar que a arquitetura não foi moldada ao caso de
materiais.

### 16.5 Reprodução independente

Um processo limpo, sem o histórico da conversa, recebe apenas o pacote exportado
e instruções públicas. Deve:

- verificar hashes e licenças;
- reconstruir ambiente suportado;
- executar passos reproduzíveis;
- explicar diferenças toleradas;
- obter o mesmo estado de avaliação das hipóteses.

## 17. Critérios de promoção

Uma proposta de integração à `main` só pode existir quando todos forem verdadeiros:

1. zero regressão funcional ou de contexto no uso atual da Mecanifica;
2. dependência reversa impedida por teste automático;
3. dois pilotos de domínios diferentes concluídos;
4. reprodução independente bem-sucedida;
5. V&V e incerteza aparecem na síntese sem falsa certeza;
6. auditoria de licenças e componentes aprovada;
7. limites de rede, processo, tempo, memória e disco testados;
8. falhas e cancelamentos produzem diagnóstico estruturado;
9. fluxo Agent-First funciona sem shell nem conhecimento interno;
10. custo de contexto e operação medido e aceitável;
11. revisão arquitetural decide explicitamente entre incorporar, extrair para
    repositório próprio ou manter experimental.

A promoção é seletiva. Não se mescla a árvore experimental inteira. Contratos,
serviços, adaptadores e documentação entram em fatias revisáveis; artefatos
efêmeros e dependências não demonstradas ficam fora.

## 18. Rollback e encerramento

Enquanto incubado, remover o diretório `laboratorio/` e os scripts `lab:*`
elimina todo impacto operacional sobre a Mecanifica: nada no núcleo importa o
laboratório, e a guarda `arquitetura:lab:check` é o que prova isso a cada
execução em vez de confiar na promessa. Após eventual promoção, cada adaptador permanece
opt-in e pode ser desabilitado sem alterar os formatos centrais.

A incubação deve ser encerrada, preservando relatório e evidências, se ocorrer
qualquer uma destas condições:

- o segundo domínio exigir reescrever os contratos fundamentais;
- a Mecanifica precisar importar o laboratório para continuar funcionando;
- reprodução depender sistematicamente da conversa ou de estado oculto;
- os custos de confinamento e proveniência superarem o valor experimental;
- não for possível evitar conclusões indevidamente fortes na interface da IA;
- licenças impedirem uma composição sustentável.

## 19. Baseline conhecida

Na criação do worktree em 2026-08-31:

- `npm install` concluiu sem alteração rastreada;
- o instalador reportou três alertas de dependências já presentes: um moderado e
  dois altos; eles não foram alterados automaticamente;
- após instalar o Chromium requerido pelo Playwright, 1.399 de 1.403 testes
  executados passaram e três permaneceram ignorados;
- quatro testes falharam antes de exercitar o comportamento porque o Windows
  negou a criação de links simbólicos com `EPERM`;
- as quatro falhas estão em três arquivos e devem ser reexecutadas em ambiente
  com permissão de symlink antes de qualquer alegação de baseline integral verde.

Essa limitação foi aceita para escrever o desenho e o plano. Ela não autoriza
reduzir, ignorar ou reescrever as provas de segurança.

## 20. Referências normativas e técnicas

- [W3C PROV-O](https://www.w3.org/TR/prov-o/) — modelo interoperável de
  proveniência.
- [RO-Crate 1.3](https://www.researchobject.org/ro-crate/specification.html) —
  empacotamento de objetos de pesquisa e seus metadados.
- [Common Workflow Language](https://www.commonwl.org/specification/) — referência
  para workflows portáveis e reprodutíveis.
- [Functional Mock-up Interface](https://fmi-standard.org/docs/main/) — padrão
  aberto para intercâmbio e co-simulação de modelos dinâmicos.
- [OpenMDAO](https://openmdao.org/what-is-openmdao/) — referência e candidato para
  análise/otimização multidisciplinar.
- [NIST — V&V e quantificação de incerteza](https://www.nist.gov/publications/summary-industrial-verification-validation-and-uncertainty-quantification-procedures)
  — separação de verificação, validação e incerteza.
- [Crossref REST API](https://www.crossref.org/documentation/retrieve-metadata/rest-api/)
  — metadados bibliográficos, atualizações e relações editoriais.
- [OpenAlex API](https://help.openalex.org/api/) — descoberta aberta de trabalhos,
  autores, fontes e relações acadêmicas.

## 21. Decisões fechadas por este desenho

- o laboratório é geral e o 3D é um instrumento;
- a incubação ocorre na `main`, em subsistema extraível sob guarda de independência;
- Python é o núcleo científico e Node é apenas ponte onde necessário;
- contratos e artefatos são independentes de linguagem;
- registro de instrumentos é explícito;
- execução é confinada, orçada, cancelável e autorizada;
- proveniência é obrigatória e alinhada semanticamente a W3C PROV;
- RO-Crate é o formato de exportação reproduzível;
- hipótese não recebe rótulo de verdade nem confiança universal;
- pesquisa separa metadado, fonte, alegação e evidência;
- resultados do laboratório não editam a Mecanifica;
- duas provas verticais, em domínios distintos, antecedem promoção;
- a promoção será seletiva e dependerá de nova decisão explícita.
