# Auditoria de interseções em montagens

**Estado:** concluído

**Responsável:** agente executor a designar

**Base:** `warbookbr/nos-mecanifica`, `main` em `08b19cb`.

## Objetivo verificável

Entregar uma auditoria neutra e determinística que encontre interseções entre
peças finais de uma montagem resolvida, diferencie resultado provado de caso
inconclusivo e alimente `revisar_montagem`, sem mover peças, inferir intenção
mecânica ou chamar distância direcional de colisão.

Ao encerrar, uma revisão completa deve conseguir afirmar quais pares foram
verificados, quais interpenetram, quais apenas encostam e quais não puderam ser
decididos. A ausência de achados só vale dentro do escopo e da cobertura
declarados.

## Hipótese e decisão de abertura

Hoje as relações declaradas podem passar enquanto duas peças sem relação se
atravessam. Imagens e caixas mundiais não fecham essa lacuna. A hipótese é que
uma auditoria de malha, executada depois da resolução, reduz falsos aceites e
eleva a confiabilidade da IA sem criar dependência de produto ou solver.

A abertura foi autorizada em 18 de agosto de 2026. Foi recusado usar caixas
como veredito, calcular folga universal ou corrigir poses automaticamente.

## Execução atual

R00–R06 estão implementados neste recorte: a decisão foi manter o núcleo de
predicados neutro próprio e reutilizar somente `earcut`, já dependência direta,
para triangular faces. As provas cobrem invasão, contenção, contato, anel com
pino no furo, malha aberta, foco, montagem recursiva e ordem determinística.
V4 valida e transporta expectativas sem suprimi-las; `revisar_montagem` expõe a
auditoria ao MCP e `descrever_montagem` continua sem custo geométrico implícito.
O benchmark de 64 peças/2.016 pares teve média de 5,49 ms, com cobertura
completa. O ensaio MCP provou os estados livre, interpenetrando e inconclusivo;
as vistas isométrica e direita do ensaio permaneceram válidas.

## Contratos do recorte

1. Serviço puro `auditarIntersecoesMontagem(montagemResolvida, opcoes)` em
   `src/autoria/`, sem filesystem, Three.js ou domínio automotivo.
2. A unidade auditada é cada instância-folha de peça, identificada pelo caminho
   semântico completo. Submontagens são expandidas, não tratadas como sólidos.
3. Sem `caminho`, o escopo contém todos os pares de folhas da raiz. Com foco,
   contém todo par entre uma folha do foco e qualquer folha da mesma raiz;
   pares externos ao foco entre si ficam declaradamente omitidos.
4. Caixas alinhadas aos eixos eliminam pares seguramente separados. Pares
   restantes passam por teste de malha; caixa sobreposta nunca vira colisão.
5. O teste estreito cobre cruzamento de superfícies e contenção total. Testar
   somente triângulo contra triângulo não basta.
6. A saída versionada ordena pares e informa `separadas`, `encostam`,
   `interpenetram` ou `inconclusivo`, além de método, tolerância, contagens,
   omissões e cobertura. Índice, UUID e identidade de runtime são proibidos.
7. Malha aberta, não orientável, degenerada ou numericamente ambígua não recebe
   um falso “sem colisão”: o par ou a peça fica `inconclusivo`, com causa e ação.
8. Interseção esperada é anotação explícita de um par semântico, nunca
   supressão de evidência nem aprovação. Ela exige motivo e continua aparecendo
   no resultado. Uma relação existente não cria essa expectativa por inferência.
9. Como v1–v3 estão fechadas, persistir expectativas exige
   `mecanifica.montagem` v4. V1–v3 continuam legíveis e semanticamente iguais.
10. `revisar_montagem` incorpora a auditoria e só marca colisão global como
    verificada quando todos os pares do escopo foram decididos. Descrição barata
    continua disponível sem executar auditoria por implicação.

## Representação e decisão de dependência

A fonte geométrica são `V`, `F` e `poseMundo` das peças resolvidas. Faces são
trianguladas por uma porta neutra e determinística. O descritor cilíndrico
histórico `meta.colisao` não participa: ele não é transportado e não representa
furos, concavidades ou formas gerais.

R00 deve comparar uma implementação neutra pequena com bibliotecas dedicadas.
Uma dependência só entra se for sem Three.js, mantida, licenciada, determinística
nas fixtures, capaz de cruzamento e contenção e materialmente menor em risco que
manter o algoritmo local. Sem candidato que passe, o plano para antes de
incorporar uma solução parcial apresentada como exata.

## Invariantes

- nenhuma geometria, pose, relação, material, câmera ou revisão é alterada;
- resolver montagem continua separado de auditá-la;
- v1–v3 e suas saídas atuais permanecem cobertas por regressão;
- contato dentro da tolerância não é interpenetração;
- expectativa declarada não transforma interpenetração em sucesso;
- resultado é igual para entrada equivalente em ordem diferente;
- custo e cobertura são explícitos; timeout não vira “sem colisão”;
- núcleo e serviço neutros não importam Three.js, MCP ou filesystem.

## Fatias executivas

1. **R00 — régua e prova adversarial.** Congelar vocabulário, tolerância,
   topologia aceita, limite de escala e decisão de dependência. Fixtures mínimas:
   caixas separadas, contato, invasão, sólido contido, pino dentro de anel sem
   invasão, malha aberta, face degenerada e montagem recursiva.
2. **R01 — contrato v4.** Ler, normalizar e resolver expectativas por pares de
   caminhos-folha; recusar duplicidade, autorreferência, caminho ausente,
   montagem como endpoint e motivo vazio. Preservar v1–v3.
3. **R02 — preparação geométrica.** Extrair folhas, compor poses, triangular,
   validar topologia e produzir caixas e estrutura espacial sem mutar a entrada.
4. **R03 — auditor puro.** Implementar fase ampla, cruzamento, contato,
   contenção, ordenação e saída versionada. Provar falsos positivos e negativos
   das fixtures, inclusive concavidade e aninhamento.
5. **R04 — contexto e revisão.** Integrar a auditoria ao serviço de revisão,
   ajustar cobertura e mensagens claras e manter `descrever_montagem` barato.
6. **R05 — MCP e autoria.** Transportar v4 nas portas já autorizadas, expor os
   achados em `revisar_montagem` e provar que leitura/autoria não confundem
   acesso, expectativa, validação e homologação.
7. **R06 — escala e campo.** Medir montagem pequena e montagem recursiva maior,
   verificar timeout/cancelamento sem conclusão falsa, inspecionar em duas vistas
   e registrar decisão `aprovar`, `corrigir` ou `cancelar`.

## Arquivos e identidades previstos

- `src/autoria/`: leitor/resolvedor v4, preparação e auditoria neutra;
- `tools/mecanifica/`: fixtures, testes e eventual CLI confinada de prova;
- `tools/mcp/`: contrato e integração de `revisar_montagem` e autoria v4;
- `docs/mecanifica/`: contratos v4, contexto, arquitetura e encerramento;
- novos formatos: `mecanifica.montagem` v4 e
  `mecanifica.auditoria-intersecoes` v1.

O executor deve consultar a inbox e reservar os arquivos concretos antes de
cada fatia. Este plano não reserva antecipadamente arquivos de implementação.

## Provas obrigatórias

1. Caixa sobreposta no caso anel–pino não gera colisão falsa.
2. Cruzamento de superfícies e contenção sem cruzamento são detectados.
3. Contato, interpenetração e ambiguidade numérica são distintos.
4. Malha aberta ou inválida produz `inconclusivo`, nunca aprovação.
5. Expectativa ausente, presente e inválida é rastreável e não oculta achado.
6. Árvore recursiva usa caminhos estáveis e audita cada par exatamente uma vez.
7. Foco audita o alvo contra toda a raiz e declara pares externos omitidos.
8. Ordem de instâncias/faces não altera saída canônica.
9. V1–v3, relações, contexto sem auditoria e peças atuais não regridem.
10. MCP informa resultado, cobertura e limitações em português claro.
11. Limite de tempo ou escala falha fechado, com custo medido e ação possível.

## Gates

Além dos gates completos do `INDEX.md`:

```text
testes focados de leitor v4, topologia, auditor, revisão e MCP
benchmark reproduzível das fixtures pequena e maior
auditoria de imports do serviço neutro
ensaio MCP ponta a ponta com colisão, sem colisão e inconclusivo
inspeção da fixture em pelo menos duas vistas
git diff --check
```

## Fora do recorte

- solver, reposicionamento ou correção automática;
- distância mínima ou folga universal entre todos os pares;
- movimento, cinemática, espaço varrido, deformação ou física;
- profundidade de penetração tratada como tolerância de fabricação;
- colisão entre partes internas da mesma peça;
- aprovação, homologação ou promoção automática de revisão;
- alteração do motor procedural, das receitas, materiais ou câmera.

## Paradas e encerramento

Parar se a única solução disponível usar caixa como veredito, depender de
Three.js no núcleo, não detectar contenção, esconder malha inconclusiva ou
exigir solver. Desempenho insuficiente abre correção de estrutura espacial, não
redução silenciosa de cobertura.

O plano só conclui com provas 1–11, gates verdes, contrato e MCP coerentes e
estudo de campo registrado. `aprovar` exige zero falsos positivos/negativos nas
fixtures adversariais; caso contrário a decisão é `corrigir` ou `cancelar`, sem
publicar a auditoria como garantia global.

## Fechamento

As provas 1–11 passaram. A auditoria não usa caixas como veredito, detecta
cruzamento e contenção, distingue contato, preserva inconclusivos e não permite
que expectativas escondam achados. V1–v3 continuam legíveis, v4 é explícita,
`revisar_montagem` integra o resultado e o MCP instrui a IA sobre seu
significado.

Passaram 72 arquivos de teste, 995 testes e 2 ignorados, typecheck, build,
porteiro, bancada vazia, guardas visuais, mapa, links, TOC, planos, exportação,
MCP e ensaio ponta a ponta.

**Decisão: `aprovar`.** Solver, folga universal, movimento, espaço varrido,
deformação e colisão entre partes internas da mesma peça permanecem fora.
