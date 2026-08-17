# Registro — estudo de autoria de um conjunto simples

**Estado:** concluído — decisão `corrigir`

**Conjunto:** dobradiça didática com folha fixa, folha móvel e pino.

**Perfil assumido:** `tecnicoDidatico`, F2, precisão mecânica e interação de
montagem. A escolha segue o padrão de `PERFIS-DE-AUTORIA.md` porque o pedido não
fixou outra direção visual.

## Método

1. ler apenas as fontes indicadas para autoria de peça e montagem;
2. escrever três receitas confinadas, sem código geométrico livre;
3. exigir identidade semântica, partes, portas e zero faces sem parte;
4. resolver uma montagem v3 com três relações cilíndricas mensuráveis;
5. capturar cada peça e o conjunto em vista isométrica e frontal;
6. classificar cada achado como ajuste, limite deliberado, capacidade ausente,
   erro ou documentação insuficiente/desatualizada;
7. explicar a causa e o histórico disponível antes de recomendar ação.

## Diário de execução

### D0 — entrada e escolha da fixture

- O conjunto eixo–suporte–anel já havia sido executado e aprovado; repeti-lo
  não produziria evidência nova.
- A dobradiça foi escolhida porque exige três peças físicas separáveis,
  repetição de olhais, um eixo comum e inspeção clara em vistas ortogonais.
- O experimento permanece fora do catálogo e de `prototipos/procedural/v3/pecas/`.

## Achados

### A1 — o caminho estrutural básico funciona bem

**Classificação:** capacidade disponível e adequada.

As três receitas executaram sem órfãos e sem faces anônimas. A folha fixa
produziu 200 vértices, 198 faces, três partes e duas portas; a móvel, 104
vértices, 102 faces, duas partes e uma porta; o pino, 98 vértices, 120 faces,
uma parte e três portas. As três relações `encaixaCilindrico` passaram com
folga radial medida de 0,0002 m e sobreposição axial de 0,04 m.

`origemId`, aliases, partes, portas e endpoints por caminho foram suficientes
para modelar e medir sem UUID, índice de array ou ID literal de face. `em` nos
geradores e pontos nomeados evitaram passos de transporte.

### A2 — folha com olhal não vira um único corpo topológico

**Classificação:** capacidade ausente, com fronteira arquitetural deliberada.

A folha fixa tem três componentes topológicos e a móvel tem dois. Chapa e
olhais se sobrepõem e parecem unidos no render, mas não compartilham vértices
nem uma casca. Isso é insuficiente se a intenção for uma peça monolítica
fabricável; seria aceitável apenas se a receita declarasse um conjunto soldado
ou uma peça multicorpo, conceito que hoje não tem contrato próprio.

Não é correto resumir o achado como “falta união”. O núcleo evita CSG geral: o
próprio `inflate` usa voxels para garantir fechamento por construção, e `furo`
é uma subtração restrita a faces nomeadas para preservar consumo, proveniência
e endereço das superfícies. Uma união geral teria de decidir como soldar
interseções, eliminar faces internas, manter manifold e transferir identidade,
partes, materiais e portas. Fazer apenas uma booleana visual quebraria as
invariantes Agent-First.

**Recomendação:** antes de implementar geometria, definir se receitas podem ser
multicorpo e como isso aparece nos gates. Se peça monolítica for requisito,
abrir prova própria de união determinística com proveniência; esta fixture é
uma evidência válida, mas não autoriza escolher o algoritmo.

### A3 — a montagem valida o pino, mas não descreve uma dobradiça móvel

**Classificação:** capacidade ausente por escopo explícito.

A montagem prova três encaixes estáticos. Ela não consegue declarar “a folha
móvel gira em torno do pino”, ângulo mínimo/máximo ou espaço varrido. Os
contratos v2/v3 aceitam somente `encaixaCilindrico`, `assentaAnular` e
`mantemSeparacaoDirecional`; eles recusam inferência por proximidade e não são
solver.

O motivo é maior que adicionar um nome de relação. Movimento exige eixo e pivô
persistidos, referencial, limites, estado ou faixa de poses, representação de
colisão e política de amostragem/solver. Sem isso, “gira em torno de” seria
prosa sem validação ou uma animação visual confundida com contrato mecânico.

**Recomendação:** manter fora deste recorte. Quando uma tarefa exigir abrir e
fechar a dobradiça, usar esta montagem como caso mínimo de um plano de
cinemática, incluindo espaço varrido e diagnósticos mensuráveis.

### A4 — receitas confinadas não passam pelo CLI oficial de peça

**Classificação:** atrito de ferramenta e instrução incompleta.

Comando reproduzível:

```text
npm run descrever -- folha-fixa --estrito
```

Resultado: código 2, porque `descrever-peca.mjs` aceita somente nomes em
`prototipos/procedural/v3/pecas/`. A bancada de peça segue o mesmo catálogo. Para não
publicar a fixture por localização, o estudo precisou repetir o adaptador já
usado pelo experimento anterior: importar módulo, executar `nucleo`, montar a
forma resolvida e chamar a captura de montagem em memória.

O confinamento é correto: caminho arbitrário e publicação implícita seriam
ruins para autoria segura. O problema é a falta de uma porta reutilizável para
uma receita já carregada ou uma raiz explicitamente autorizada. Cada estudo
escreve seu próprio carregador, com risco de esquecer aliases, materiais ou o
formato resolvido.

**Recomendação:** extrair um serviço puro “descrever módulo/receita em memória”
e permitir raiz explícita confinada nas CLIs experimentais. O catálogo padrão
pode continuar fechado em `prototipos/procedural/v3/pecas/`.

### A5 — o template indicado para peça procedural é o template errado

**Classificação:** erro de documentação.

`.claude/skills/criar-peca/SKILL.md` primeiro recomenda um exemplo procedural
próximo, mas depois manda copiar `_modelo.js` para começar. `_modelo.js` tem o
selo obrigatório, porém é uma peça JavaScript pura antiga: não exporta
`PARAMS`, `TOPO` ou `PASSOS` e constrói diretamente com `ctx.geo`. Copiá-lo
ensina justamente o caminho que a mesma skill diz evitar para autoria
reexecutável.

A causa provável é histórica: `_modelo.js` continuou sendo o “olá mundo” do
visor e recebeu o selo comum quando todas as peças viraram exemplos, mas não
foi convertido no molde do envelope procedural. A exigência do selo e a
exigência de `PASSOS` foram então ligadas ao mesmo arquivo por conveniência.

**Recomendação:** criar um `_modelo-procedural.js` mínimo ou converter
`_modelo.js`; até lá, a instrução deve mandar copiar o selo byte a byte e usar
`_tampa-de-caixa.js` somente como estrutura técnica.

### A6 — a referência operacional atual está presa a uma skill de outro agente

**Classificação:** documentação insuficiente e parcialmente desatualizada.

`docs/uso/oficina-referencia.md` é apenas um aviso de compatibilidade.
`docs/uso/oficina-contrato.md` é longo, preserva interface humana removida e
não contém as formas atuais de `encostar`, pose de criação (`em`/`eixo`) nem
nomes de cópia do `arranja`. Essas instruções estão consolidadas em
`.claude/skills/criar-peca/references/operacoes-procedurais.md`, fora da rota
normal de um agente Codex.

O gate de `npm run criar` compara nomes de operações entre núcleo e documentos,
mas não compara assinaturas ou campos. Portanto consegue afirmar que `lathe`
ou `arranja` estão documentados mesmo quando a forma documentada está antiga.
Neste estudo, `npm run criar -- _viga` reprovou a `main` com a mensagem
`op(s) no núcleo SEM linha FEITO em docs/uso/oficina-contrato.md: encostar`.
Assim, a ausência de `encostar` não é apenas leitura crítica: o gate canônico a
reproduz.

**Recomendação:** promover a referência de operações a documento neutro,
derivado ou validado por schema compartilhado. Skills de agentes devem apontar
para essa fonte, não ser a única fonte atual.

### A7 — documentos arquiteturais ainda descrevem capacidades concluídas como futuras

**Classificação:** documentação desatualizada.

O índice atual registra mapa canônico global dentro de universo explícito,
autoria transacional opt-in e revalidação em cascata persistida concluídos.
Porém `ARQUITETURA.md` ainda lista mapa, contexto derivado e escrita como
inexistentes; `MONTAGENS-SEMANTICAS.md` marca os níveis 6 a 8 como não
implementados; `AUTORIA-IA.md` ainda afirma ausência de mapa global e cascata.

Há nuances legítimas que precisam sobreviver à correção: não existe descoberta
fora do universo explícito, correção/publicação automática de dependentes nem
solver geral. O problema é usar “não existe” para a família inteira, apagando o
recorte que já foi provado.

**Recomendação:** atualizar as tabelas de estado para nomear o que existe e o
limite exato, mantendo planos encerrados apenas como evidência.

### A8 — o enquadramento reprova uma peça pequena e naturalmente fina sem saída operacional

**Classificação:** erro/limite da captura, com instrução ambígua.

Conjunto e folhas passaram em isométrica e frontal sem corte. O pino não foi
cortado e é legível em isométrica e frontal, mas todas as vistas receberam
`enquadramento.valida: false`: isométrica com largura 0,0480, frontal com
largura 0,0319 e superior com área 0,00247.

A causa está em `visor-montagem.js`: a distância usa o raio da esfera da peça,
mas força mínimo de 0,1 m; depois exige largura e altura projetadas de ao menos
0,05. O piso evita câmera degenerada e estabiliza objetos minúsculos, mas reduz
artificialmente peças mecânicas legítimas abaixo dessa escala. Na vista
superior, o ajuste continua baseado no comprimento 3D do pino, embora esse
comprimento esteja alinhado com a câmera e não ajude a projeção.

`FLUXO-MODELAGEM-IA.md` diz que vistas pequenas são recusadas e que vistas
finas naturais podem passar, sem explicar quem autoriza a exceção. A API só
retorna um booleano e não oferece foco, escala ou motivo “naturalmente fina”.

**Recomendação:** ajustar por limites projetados de cada vista ou retornar
diagnóstico estruturado que permita aceitar a dimensão fina quando outra vista
prova comprimento e silhueta. Não remover o gate nem distorcer a câmera para
esta fixture.

### A9 — “sem contrato genérico de materiais” não significa “sem materiais”

**Classificação:** limite corretamente preservado, mas fácil de interpretar mal.

As três receitas declararam materiais locais e as cores apareceram nas vistas.
O que falta é identidade e semântica compartilhada entre peças — catálogo,
propriedades canônicas e validação portátil — não a capacidade de atribuir um
material local por nome. O estudo não precisou nem justificaria criar PBR ou
paleta global.

## Evidência visual

Cada alvo foi lido em mais de um enquadramento. As imagens são saídas do visor
privado de montagem, sem alteração de câmera ou geometria:

- conjunto: `evidencias/conjunto-isometrica.png` e
  `evidencias/conjunto-frontal.png`;
- folha fixa: `evidencias/folha-fixa-isometrica.png` e
  `evidencias/folha-fixa-frontal.png`;
- folha móvel: `evidencias/folha-movel-isometrica.png` e
  `evidencias/folha-movel-frontal.png`;
- pino: `evidencias/pino-isometrica.png`, `evidencias/pino-frontal.png` e
  `evidencias/pino-superior.png`.

O conjunto e as folhas tiveram `enquadramento.valida: true` nas duas vistas e
nenhum corte. O pino foi visualmente inspecionado, mas as três vistas tiveram
`valida: false` pelo problema descrito em A8.

## Gates executados

- `node autoria-assistida/experimentos/estudo-conjunto-dobradica/executar-estudo.mjs` — passou: três peças, 0 faces sem parte, 3/3 relações;
- `node autoria-assistida/experimentos/estudo-conjunto-dobradica/auditar-visual.mjs` — executou nove capturas sem erro de página;
- `npm test` — 91 arquivos, 1.458 testes passaram e 2 foram ignorados;
- `npm run typecheck`, `npm run build`, `npm run porteiro` — passaram;
- `npm run gabarito:selecao:check`, `npm run id-cru:check`,
  `npm run guarda:portas`, `npm run guarda:camera`, `npm run guarda:par` — passaram;
- `npm run mapa:check`, `npm run docs:toc:check`,
  `npm run docs:links:check`, `npm run planos:check`,
  `npm run exportar:check` — passaram após regenerar o mapa pela ferramenta;
- `npm run criar -- _viga` — reprovou somente o manifesto documental de
  `encostar`; estado, render, seis vistas e gabarito da peça passaram.

## Resultado

O conjunto foi modelado, medido e inspecionado sem alterar o núcleo. A autoria
de forma simples e as relações estáticas são suficientes; os principais
atritos estão na união topológica de corpos, no movimento ainda fora do
contrato, no consumo de receitas confinadas e na documentação/câmera.

**Decisão: `corrigir`.** O experimento cumpriu o objetivo e sua geometria fica
confinada. O fluxo não deve ser declarado integralmente verde enquanto o gate
canônico reprovar a referência operacional e a câmera não oferecer uma saída
mensurável para peças pequenas e naturalmente finas. As correções precisam de
recortes próprios; nenhuma foi implementada aqui.

## Correção posterior — 17 de agosto de 2026

O plano `2026-08-17-correcoes-fluxo-dobradica.md` corrigiu os atritos A4–A8
que tinham ação local clara. A receita confinada passou a consumir a medição
reutilizável por módulo já carregado; a CLI pública continua restrita ao
catálogo oficial. `encostar`, pose de criação e cópias nomeadas passaram a ter
referência operacional neutra, e o molde indicado é procedural.

O visor privado agora calcula a distância pelo envelope projetado de cada
vista. A nova captura deixou o pino válido em isométrica (6,51% × 59,39%),
frontal (4,23% × 63,60%) e superior (43,19% × 76,78%), sem corte. A vista
superior não é uma exceção artificial: ela mostra a seção circular com área
real e, por isso, deve passar quando está legível. A regra ainda recusa uma
projeção quase unidimensional.

A2 (união topológica), A3 (cinemática) e A9 (materiais genéricos) permanecem
fora, pois exigem definição de contrato e não uma correção local.
