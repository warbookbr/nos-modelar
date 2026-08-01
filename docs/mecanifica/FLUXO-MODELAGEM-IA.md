# Fluxo de modelagem assistida por IA v1

Este documento fecha o contrato do ciclo operacional que transforma um pedido
de modelagem em uma tarefa curta, reproduzível e criticável por outra IA. Ele
coordena ferramentas existentes; não adiciona geometria ao núcleo da Oficina e
não conhece Three.js nem o domínio automotivo.

## Resultado esperado

O fluxo oficial será:

```text
preparar pacote → modelar fonte procedural → descrever → revisar na bancada
→ crítica estruturada → ajustar → comparar revisões → aceitar ou registrar bloqueio
```

Uma IA modeladora recebe somente o briefing e os guias selecionados. Uma IA
crítica recebe referências, revisão atual e checklist; na primeira passada, não
recebe a justificativa do modelador. A Oficina visual herdada e `npm run peca`
não entram no caminho principal.

## Escopo incluído

- pacote de modelagem versionado e determinístico;
- referências por localizador e hash, sem binário ou caminho local da máquina;
- guias curtos e combináveis por forma, material e processo;
- preparação e validação por CLI;
- relatório JSON da bancada com quatro vistas canônicas, medidas e semântica;
- crítica limitada a observações verificáveis;
- comparação estrutural entre duas revisões;
- uma prova não automotiva e uma prova numa peça existente.

## Escopo excluído

- geração automática de geometria a partir de imagem;
- visão computacional que tenta decidir realismo por diferença de pixels;
- agente crítico alterando a peça ou o núcleo;
- download ou incorporação de referências externas;
- uma skill rígida por objeto;
- novas operações geométricas, filete composto e mudanças na apresentação ao
  cliente.

## Estrutura dos artefatos

```text
autoria-assistida/
├── guias/
│   ├── forma/
│   ├── material/
│   └── processo/
└── pacotes/<id>/
    ├── briefing.json
    ├── referencias.json
    ├── revisoes/r001/
    │   ├── revisao.json
    │   ├── critica.json
    │   └── vistas/
    └── tentativas/<assinatura-do-modelo>/
        ├── tentativa.json
        ├── relatorio-bancada.json
        └── vistas/
```

O briefing usa o formato `mecanifica.pacote-modelagem`, versão 1. Ele declara
alvo, modo (`refinamento` ou `criacao`), objetivo, perfil de autoria, partes
esperadas, guias, checklist e provas. Refinamento deriva as partes da fonte
existente; criação declara as partes antes de a fonte existir e passa a
conferi-las assim que ela aparece.
Identidade é sempre um nome semântico estável. São proibidos UUIDs, índices de
face, corpo ou passo, caminhos absolutos, timestamps, `data:` URI e base64.

`revisao.json` usa versão 2 para incluir aparência semântica. Revisões v1 já
gravadas continuam legíveis e estritas, mas não ganham aparência retroativamente;
uma revisão nova sempre nasce v2. Isso preserva evidência histórica sem fingir
que sabemos reconstruir material a partir de PNG.

As referências usam `https://` ou `repo://`. Hash SHA-256 é obrigatório quando
a referência sustenta medida ou aceite. Em `repo://`, o validador exige arquivo
regular interno e confere o conteúdo contra o hash; em `https://`, o hash é um
compromisso externo, pois este fluxo deliberadamente não baixa a rede. O pacote
nunca copia o binário.

## Limites de contexto

- pacote completo: no máximo 24 KiB, sem imagens;
- referências: de uma a quatro, ou ausência declarada;
- guias: no máximo quatro;
- checklist: no máximo oito itens ordenados por prioridade;
- crítica: no máximo cinco divergências prioritárias;
- evidências visuais: quatro vistas canônicas e até três recortes pedidos pelo
  checklist.

Guias são perguntas, sinais e armadilhas, não passo a passo. Uma roda pode
combinar `superficie-de-revolucao`, `repeticao-e-arranjo`, `borracha` e
`fundicao` sem ganhar uma skill exclusiva de roda.

Antes de despachar o pacote, o orquestrador confere se dois itens do checklist
não exigem resultados incompatíveis. Medida e legibilidade precisam caber ao
mesmo tempo: uma altura máxima que deixa milímetros de saliência não pode exigir
que essa saliência seja evidente numa vista distante.

## Comandos do ciclo

```bash
npm run preparar:modelagem -- <pacote> --peca=<peca>
npm run preparar:modelagem -- <pacote> --peca=<peca-nova> --modo=criacao --partes=base,corpo
npm run validar:modelagem -- <pacote>
npm run revisar:modelagem -- <pacote> --revisao=r001
npm run comparar:revisao -- <revisao-anterior> <revisao-atual>
npm run validar:critica -- <critica.json> <revisao.json> <briefing.json>
```

`preparar:modelagem` cria somente a estrutura mínima e nunca sobrescreve; o
modo padrão é refinamento, e criação exige a lista semântica de partes.
`validar:modelagem` confere schema, canonicalização, limites, caminhos, hashes e
nomes existentes. `revisar:modelagem` reutiliza a descrição neutra e a bancada;
não mantém uma segunda régua geométrica e recusa faces, partes ou materiais que
ultrapassem o orçamento declarado. `comparar:revisao` compara assinaturas,
partes, caixas, relações, portas, aparência e contagens; as imagens continuam
sendo lidas por uma IA ou pessoa nas mesmas câmeras.

Uma revisão aceita continua nascendo por promoção atômica e nunca é
sobrescrita. Uma recusa não some mais: fica em `tentativas/`, identificada pela
assinatura semântica do modelo. `tentativa.json` separa `camera`, `modelo` e
`ferramenta`; repetir o mesmo estado não duplica artefato. Falha de câmera manda
reenquadrar, não alterar geometria. A bancada calcula o frustum por vista e
repete uma vez a abertura que expirar antes de declarar falha de ferramenta.

## Contrato da crítica

Cada observação cita:

- item do checklist;
- parte ou região;
- vista que sustenta a leitura;
- categoria: `forma`, `proporcao`, `transicao`, `encaixe`, `material` ou
  `apresentacao`;
- evidência observável;
- condição objetiva de aceite;
- viabilidade: `ajuste`, `remodelagem_local` ou `capacidade_ausente`.

Além das divergências, `estadosChecklist` cobre **todos** os itens, na ordem do
briefing. Cada estado `divergente` corresponde exatamente a uma observação e
vice-versa; assim uma lista vazia não pode significar ao mesmo tempo “atendido”
e “não revisei”. O arquivo inteiro é JSON canônico e todos os campos são
obrigatórios.

“Deixar mais realista” é inválido. “Na vista direita, a transição entre as
partes A e B termina em uma quina; aceite quando houver continuidade sem mudar
a folga declarada” é válido.

O briefing nasce `aberto`. A crítica usa `atendido`, `divergente`,
`bloqueado_capacidade` ou `adiado`. Uma crítica anterior fica `obsoleta` na
comparação quando a assinatura semântica — geometria **ou aparência** — muda.

## Implementação em quatro marcos

1. **Concluído — contrato e preparação:** schemas, canonicalização, guias mínimos, comandos
   `preparar:modelagem` e `validar:modelagem`.
2. **Concluído — revisão:** `revisao.json`, vistas canônicas, medidas e assinaturas sem
   estado do runtime.
3. **Concluído — crítica e comparação:** validação de `critica.json`, obsolescência e diff
   estrutural entre revisões.
4. **Concluído — prova de fluxo:** agente modelador e agente crítico trabalham com pacotes
   limitados, primeiro numa fixture não automotiva e depois numa peça existente,
   sem ler a Oficina legada.

## Gate de encerramento

O ciclo encerra quando:

1. a mesma entrada produz pacotes e relatórios JSON byte-idênticos;
2. referências frágeis, identidade posicional, parte/vista inexistente e
   excesso de contexto são recusados;
3. a bancada gera quatro vistas úteis e a descrição confirma zero face sem
   identidade e zero órfão na prova;
4. uma IA nova recebe briefing, guias, revisão e no máximo sete imagens, sem
   precisar ler o repositório inteiro;
5. o crítico devolve no máximo cinco correções com parte, vista, categoria,
   evidência e aceite;
6. uma segunda revisão mostra ganhos e regressões estruturais sem inferência por
   pixels;
7. o mesmo contrato passa numa fixture não automotiva e numa peça existente.

O filete v2 permanece pausado no Escopo A durante este ciclo. O trabalho do
canto composto só volta depois da comparação com a frente paralela do
repositório de origem.

## Fechamento — 1º de agosto de 2026

As sete condições foram atendidas. O ciclo completo foi executado sobre
`_caixote-filetado`: revisão `r001`, crítica cega com duas divergências, ajuste
por outro agente, comparação estrutural e revisão `r002`. O puxador passou de
672 para 896 faces e a peça inteira de 679 para 903, dentro do orçamento de
2.000 faces; duas partes, relação de contato, zero face sem identidade e zero
órfão foram preservados. Um segundo crítico cego recebeu apenas o pacote e a
`r002`: confirmou a transição como atendida, mas manteve honestamente a leitura
de material como divergente. Esse falso “zero” encontrado pela revisão
adversarial originou a cobertura obrigatória de todo checklist. `freio-disco`
gerou quatro vistas e relatório pelo mesmo contrato, provando que o fluxo não
ficou preso à fixture.

As provas `r001`/`r002` permanecem v1 por serem evidência histórica. `r003` foi
gerada pelo contrato v2 sobre a mesma geometria de `r002`: o diff acrescenta
somente aparência semântica, e uma nova crítica cega v2 cobre 4/4 itens, mantendo
material divergente. Testes de mutação provam ainda que trocar somente cor ou
aspereza muda a assinatura e aparece no diff, sem recorrer a pixel ou ID de
face.

Artefatos de prova:

- `autoria-assistida/pacotes/prova-caixote/` — três revisões, quatro vistas por
  revisão e as críticas canônicas; `r003` prova o contrato atual v2;
- `autoria-assistida/pacotes/prova-freio/` — pacote e revisão de compatibilidade
  numa peça existente;
- `tools/modelagem/` — CLIs e módulos puros do contrato;
- `autoria-assistida/guias/` — três guias curtos, combináveis pelo briefing.

O resultado não promete julgamento fotorealista, continuidade matemática por
imagem nem correção automática. A ferramenta organiza contexto, evidência e
iteração; conclusão do ciclo significa que o processo é executável e honesto,
não que toda divergência da peça de prova foi corrigida. Quando a linguagem não
consegue produzir a correção, a crítica deve marcar `capacidade_ausente` em vez
de esconder o bloqueio.

## Medição A/B posterior ao fechamento

O ciclo provou que o processo funciona; não havia provado que ele fazia um
modelador produzir forma melhor ou mais depressa. Em 1º de agosto de 2026, dois
Sols modelaram a mesma dobradiça inédita, um com este fluxo e outro sem ele. Dois
Terra e um árbitro avaliaram os resultados às cegas.

A mediana empatou em 14/16. O fluxo assistido respeitou o envelope, publicou
três portas e completou quatro vistas válidas, mas precisou de oito tentativas
visuais contra três na condição crua. Pela regra fixada antes do teste, não há
evidência de ganho líquido. A conclusão correta é mais estreita: o fluxo ajuda
a IA a entregar algo verificável e retomável; ainda não demonstrou ajudá-la a
modelar visualmente melhor ou com menos esforço.

Protocolo, fontes congeladas, imagens e pareceres:
[`EXPERIMENTO-AB-FLUXO-IA.md`](EXPERIMENTO-AB-FLUXO-IA.md).

## Revisão visual econômica v1 — fechamento

**Concluída em 1º de agosto de 2026.** O recorte nasceu das oito execuções da
condição assistida no A/B. Sete tinham produzido quatro imagens, mas o gate as
apagou por enquadramento; a última expirou. A correção não acrescentou instrução
de forma nem operação geométrica.

Entregas:

- enquadramento ortográfico calculado para o envelope projetado de cada vista,
  com área segura entre os painéis da bancada;
- uma repetição automática quando a página não sinaliza prontidão no prazo;
- relatório escrito também na recusa, com categoria, código, vista e ação;
- tentativa recusada preservada por assinatura do modelo, sem timestamp,
  caminho local ou duplicação do mesmo estado;
- revisão válida continua separada e promovida atomicamente somente depois dos
  quatro PNGs, relatório, orçamento e contrato passarem;
- o guia de iteração agora vale “uma hipótese por mudança” somente depois da
  primeira revisão, não durante cada microajuste da criação.

Prova nas peças congeladas, sem mudar um vértice: a condição assistida passou
`r002` em **uma execução**, e a condição crua, cuja vista superior era recusada,
passou `r001` também em **uma execução**. `_caixote-filetado` e `freio-disco`
continuam passando nas quatro vistas. Testes cobrem preservação, deduplicação,
classificação, promoção posterior e enquadramento por vista.
