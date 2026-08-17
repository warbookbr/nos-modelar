# Análise — estado e grandes melhorias

**Data:** 2026-08-14

## Veredito

A Mecanifica já é uma base forte para autoria procedural assistida por IA em
recortes explícitos: receitas determinísticas, identidade semântica, montagem
recursiva, relações mensuráveis, vistas reproduzíveis, revisão imutável e
publicação condicionada existem e foram provadas em conjunto.

O principal limite não estava em gerar mais uma forma. Estava no ciclo de
trabalho: uma revisão publicada não voltava ao catálogo usado para descrição,
vista e revalidação, e o perfil de autoria perdia as ferramentas de leitura.
Isso tornava a continuidade entre sessões mais fraca que a própria autoria.

Esse gargalo foi corrigido pelo plano de continuidade de autoria ativa. Em
seguida, as R00–R03 do mapa canônico fixaram universo, snapshot, derivação e
consulta direcionada de impacto.

## Leitura por capacidade

| Capacidade | Estado depois deste recorte | Limite principal |
|---|---|---|
| Gerar peça procedural | forte no contrato declarativo v1 | não cobre todo módulo JS histórico nem todas as formas desejadas |
| Inspecionar peça | forte | diagnóstico visual ainda não liga toda crítica a uma ação semântica |
| Compor montagens | forte no catálogo explícito e relações v1–v3 | consulta global direcionada provada; MCP ainda fora |
| Medir e revalidar | forte para relações e raízes conhecidas | cobertura depende da lista explícita do host; cascata ainda não existe |
| Publicar com segurança | forte para receita e montagem autorizadas | não há rollback/promocão de revisão anterior nem variantes simultâneas |
| Continuar em outra sessão | forte no catálogo configurado após este recorte | não atravessa catálogos ou hosts não declarados |
| Escalar para carro completo | fundação correta, ainda incompleta | descoberta global, orçamento de contexto e revalidação em cascata faltam |

## Melhoria grande executada

O MCP v4 passa a usar uma única visão operacional:

```text
base estática autorizada
        +
revisão imutável ativa por ID
        ↓
catálogo resolvido único
        ↓
descrição · relações · vistas · revalidação · nova autoria
```

- montagem ativa sobrepõe a raiz de mesmo ID;
- receita ativa é executada pelo núcleo e sobrepõe a peça de mesmo ID;
- ausência de revisão mantém a base estática byte-equivalente;
- revisão inválida falha fechada, sem esconder corrupção com fallback;
- o perfil de autoria contém as oito ferramentas de leitura e as oito de
  autoria;
- `mecanifica://autoria` anuncia revisão e fonte ativa sem expor caminhos;
- uma nova sessão de leitura usa a revisão já publicada quando o host conserva
  a mesma autorização.

A prova caixa-preta publicou uma montagem com separação de 0,025 m e a releu
por `descrever_montagem`. Depois publicou um `eixo-guia` com fim em 0,010 m,
releu a caixa geométrica pela ferramenta comum e abriu outro processo, que
observou o mesmo máximo em X de 0,010 m.

## Próximas melhorias grandes, em ordem

### 1. Mapa canônico global de dependências

Está provado até a consulta direcionada. O próximo recorte é consumir o mapa
por MCP, preservando identidade, proveniência e o universo declarado.

### 2. Revalidação em cascata com estado persistido

Sobre o mapa canônico, cada publicação deve produzir um registro consultável:
dependentes encontrados, gates executados, aprovados, falhos e fora de
cobertura. Isso transforma “precisa revalidar” em trabalho retomável por outra
IA, sem criar um solver geral.

### 3. Alteração semântica compacta de receitas e montagens

Hoje o agente envia o documento completo para mudar um parâmetro. Uma proposta
de alteração por identidade e campo semântico pode reduzir contexto e erros,
desde que o serviço sempre reconstitua o documento completo, mostre o diff e
confirme os bytes finais. Índice de array ou JSON Patch posicional não deve virar
identidade persistida.

Executado por [`planos/2026-08-17-alteracao-compacta.md`](planos/2026-08-17-alteracao-compacta.md):
`planejar_alteracao_montagem` recebe alvo e campo semântico, reconstitui o
documento a partir da revisão ativa e devolve o diff. Endereço posicional é
recusado com código próprio. Montagem apenas; receita segue em aberto.

### 4. Histórico operacional: comparar, reativar e ramificar

Snapshots são imutáveis, mas falta uma interface segura para comparar revisões
de autoria, restaurar conteúdo anterior como nova transição e manter variantes
nomeadas. A solução deve preservar revisão observada e nunca mover o estado
ativo sem confirmação e revalidação atuais.

### 5. Fechar lacunas geométricas por experimentos

Costuras de `lathe`, endereço de grupo linear e abertura oblonga limitam peças
reais. Devem entrar uma por vez, com peça de prova, identidade, topologia,
determinismo e duas vistas. Uma reescrita ampla do núcleo não é recomendada pela
evidência atual.

A abertura oblonga foi a primeira a entrar, por
[`planos/2026-08-17-abertura-oblonga.md`](planos/2026-08-17-abertura-oblonga.md):
`furo` ganhou `ate` e o anel virou estádio, sem op nova e sem família de
endereço nova. O endereço de grupo linear entrou em seguida por
[`planos/2026-08-17-nome-de-copia.md`](planos/2026-08-17-nome-de-copia.md):
`arranja` aceita `nomes` e a origem cita `nome`. A costura de `lathe` continua
aberta, sem abertura automática.

### 6. Materiais canônicos

Um contrato genérico permitiria editar aparência sem acoplar receita, bancada e
renderizador. Ele vem depois das identidades e do mapa, e não deve importar PBR
ou paleta por implicação.

## Direção recomendada

Consumir em seguida a consulta de impacto global por MCP em escopo somente
leitura e depois ligá-la à revalidação persistida. Esse par transforma a
base atual — excelente para um conjunto explícito — em infraestrutura capaz de
manter sistemas grandes sem exigir que a IA carregue ou conheça o carro inteiro.

Esse avanço já foi aberto em
[`2026-08-14-mapa-canonico-dependencias.md`](planos/2026-08-14-mapa-canonico-dependencias.md).
A R00 fixou o contrato, a R01 o snapshot, a R02 a derivação e a R03 a consulta;
o consumo MCP começa na R04.

Novas operações geométricas continuam válidas quando um estudo de campo as
colocar no caminho crítico; elas não devem competir automaticamente com a
continuidade e o controle de dependências.

## Evidência de fechamento

Os gates completos passaram com 75 arquivos de teste, 1.242 testes aprovados e
2 ignorados. Também passaram typecheck, build, porteiro 7/7, gabarito de seleção
para 36 peças, guardas de identidade, portas, câmera e pares, inventário, links,
planos, exportação e criação de `_viga`. **Decisão do recorte: aprovar.**
