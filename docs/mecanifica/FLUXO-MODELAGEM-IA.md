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
    └── revisoes/r001/
        ├── revisao.json
        ├── critica.json
        └── vistas/
```

O briefing usa o formato `mecanifica.pacote-modelagem`, versão 1. Ele declara
alvo, objetivo, perfil de autoria, partes esperadas, guias, checklist e provas.
Identidade é sempre um nome semântico estável. São proibidos UUIDs, índices de
face, corpo ou passo, caminhos absolutos, timestamps, `data:` URI e base64.

As referências usam `https://` ou `repo://`. Hash SHA-256 é obrigatório quando
a referência sustenta medida ou aceite. O pacote nunca copia o binário.

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

## Comandos do ciclo

```bash
npm run preparar:modelagem -- <pacote> --peca=<peca>
npm run validar:modelagem -- <pacote>
npm run revisar:modelagem -- <pacote> --revisao=r001
npm run comparar:revisao -- <revisao-anterior> <revisao-atual>
```

`preparar:modelagem` cria somente a estrutura mínima e nunca sobrescreve.
`validar:modelagem` confere schema, canonicalização, limites, caminhos, hashes e
nomes existentes. `revisar:modelagem` reutiliza a descrição neutra e a bancada;
não mantém uma segunda régua geométrica. `comparar:revisao` compara assinaturas,
partes, caixas, relações, portas e contagens; as imagens continuam sendo lidas
por uma IA ou pessoa nas mesmas câmeras.

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

“Deixar mais realista” é inválido. “Na vista direita, a transição entre as
partes A e B termina em uma quina; aceite quando houver continuidade sem mudar
a folga declarada” é válido.

Estados de checklist: `aberto`, `atendido`, `divergente`,
`bloqueado_capacidade`, `adiado` e `obsoleto`. Uma crítica fica obsoleta quando
a assinatura do modelo muda depois dela.

## Implementação em quatro marcos

1. **Contrato e preparação:** schemas, canonicalização, guias mínimos, comandos
   `preparar:modelagem` e `validar:modelagem`.
2. **Revisão:** `revisao.json`, vistas canônicas, medidas e assinaturas sem
   estado do runtime.
3. **Crítica e comparação:** validação de `critica.json`, obsolescência e diff
   estrutural entre revisões.
4. **Prova de fluxo:** agente modelador e agente crítico trabalham com pacotes
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
