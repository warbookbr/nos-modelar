# Referência e crítica visual — protocolo de modelagem

Este documento organiza como uma IA transforma imagens de referência em
critérios verificáveis, revisa uma peça durante a modelagem e distingue falha de
execução de capacidade ausente na linguagem. Ele é um protocolo experimental,
não uma skill e não abre sozinho trabalho de implementação.

## Princípio

Uma referência visual não deve virar uma ordem genérica como “faça mais
realista”. Antes de modelar, ela vira um **briefing da peça**: um artefato curto,
específico daquela tarefa, com regiões, relações e enquadramentos observáveis.

## Contrato mínimo de achado reexecutável

`mecanifica.critica-modelagem` continua sendo o formato histórico de crítica
ligado a uma revisão de peça e a um checklist. Para observações que precisam
atravessar peças, montagens e domínios, o mesmo módulo oferece o contrato puro
`mecanifica.achados-critica-visual` (`versao: 1`). Ele não abre a bancada, não
conhece o domínio do alvo e não guarda caminho de arquivo, UUID, índice ou
relógio.

Cada item declara somente:

```json
{
  "alvo": {"tipo": "montagem", "id": "conjunto-neutro"},
  "vista": "direita",
  "severidade": "alta",
  "observacao": "A transição entre os dois volumes perde continuidade visível na vista lateral.",
  "evidencia": {"tipo": "render", "hash": "sha256:..."},
  "decisao": "corrigir",
  "estado": "aberto",
  "vinculo": {"antes": "sha256:...", "depois": null}
}
```

`evidencia` e seu `hash` são opcionais; quando ausente, a validação devolve
`evidencia: null`. O vínculo antes/depois é obrigatório e exige ao menos um
hash SHA-256 do marco comparado — por exemplo, render, imagem ou assinatura de
modelo. Vistas precisam pertencer ao conjunto oficial informado pelo host (as
sete vistas da bancada são o padrão); alvo, decisão, estado, severidade e tipo
de evidência têm vocabulário fechado. Observações vagas, hashes inválidos,
alvos não semânticos, campos extras, duplicatas e vínculos vazios são recusados.

`validarCriticaVisual` canonicaliza todos os objetos e ordena os achados por
alvo, vista e observação. Assim, duas execuções sobre a mesma evidência
produzem o mesmo JSON, mesmo que o agente tenha enviado os itens em ordem
diferente. Os hashes `antes`/`depois` relacionam a crítica a marcos comparáveis
sem transformar uma crítica em autorização automática de alteração.

Instruções ajudam a IA a notar um problema; não substituem uma operação
geométrica que a linguagem ainda não possui. Toda divergência encontrada é
classificada como:

1. **ajuste:** a capacidade existe e bastam parâmetros ou proporções;
2. **remodelagem local:** a capacidade existe, mas a região precisa ser refeita;
3. **capacidade ausente:** a intenção não é expressável de forma editável,
   semântica e determinística no vocabulário atual.

Só a terceira classe pode justificar mudança na linguagem de autoria.

## Papéis

### Orquestrador

- separa verdade técnica de aparência;
- escolhe vistas comparáveis e o perfil de autoria;
- propõe o briefing e, quando útil, o debate com o usuário;
- mantém o checklist curto e priorizado;
- não transforma cada detalhe observado em requisito obrigatório.

### Modelador

- constrói e refina por região, preservando identidade semântica;
- produz as mesmas vistas canônicas em cada marco;
- responde ao checklist com evidência;
- informa quando uma correção depende de capacidade ausente.

### Crítico visual

Recebe as referências, os renders atuais nas mesmas vistas e o nível de
realismo desejado. Na primeira passada, não recebe justificativas nem o histórico
de construção: avalia o resultado, não a narrativa do modelador.

O crítico aponta no máximo cinco divergências prioritárias. Para cada uma,
informa:

- região e vista em que aparece;
- evidência visual observável;
- impacto em silhueta, proporção, profundidade, transição ou fabricação;
- classificação provável: ajuste, remodelagem local ou capacidade ausente;
- condição visual de aceite, sem prescrever uma sequência rígida de comandos.

Uma segunda passada opcional pode receber o vocabulário disponível para revisar
a classificação de viabilidade. O crítico não edita a peça.

## Pergunta-base para o crítico

> Compare a peça atual com as referências considerando silhueta, proporções,
> continuidade entre superfícies, espessura, profundidade, acabamento de bordas
> e detalhes funcionais. Liste no máximo cinco divergências que mais impedem
> atingir o nível de realismo solicitado. Para cada uma, indique a região
> visual, a evidência observável, a condição de aceite e se a correção parece
> exigir ajuste, remodelagem local ou capacidade ausente.

Uma crítica sem referência pode ser usada depois para perguntar o que parece
artificial, desconectado ou estruturalmente improvável. Ela não substitui a
comparação principal.

## Fluxo

1. Fixar perfil de autoria, distância mínima e orçamento.
2. Reunir referência técnica e referência de aparência separadamente.
3. Gerar briefing com no máximo oito itens e vistas de prova.
4. Permitir revisão do usuário quando o resultado visual for subjetivo.
5. Modelar envelope e interfaces; depois, uma região por vez.
6. Renderizar vistas canônicas equivalentes às referências.
7. Rodar crítica intermediária, limitada às cinco maiores divergências.
8. Classificar cada divergência e corrigir somente as prioritárias.
9. Repetir uma vez; nova rodada exige evidência de ganho ou bloqueio real.
10. Integrar somente depois dos gates semânticos, geométricos e visuais.

O fluxo tem limite: checklist e crítica não crescem indefinidamente. Divergência
não prioritária vai para backlog da peça.

## Aplicação à roda dianteira

As imagens analisadas justificam observar:

- afunilamento e curvatura dos raios;
- transição raio–cubo sem degrau seco;
- transição raio–aro com abertura gradual;
- rebaixos do miolo e assentamentos dos fixadores;
- bordas controladas: nem infinitamente afiadas, nem polidas por inteiro;
- profundidade comprovada nas vistas lateral e perspectiva;
- equivalência entre instâncias radiais.

Isso não autoriza implementar capacidades novas. Arranjo radial, orientação,
furos e revisão visual já têm contratos próprios. Qualquer lacuna restante deve
entrar no backlog com uma prova e um limite explícito.

“Auto polimento” global não é capacidade candidata. Se a prova exigir
acabamento, a hipótese é filete ou bevel **seletivo**, endereçado semanticamente,
para preservar arestas mecânicas e encaixes.

## Quando isso pode virar skill

O briefing de uma roda continua sendo artefato da roda. Um guia só vira skill
depois de o mesmo padrão:

- funcionar em pelo menos duas peças de famílias diferentes;
- ser usado por outra sessão ou agente;
- produzir crítica acionável sem depender do histórico desta conversa;
- separar orientação útil de capacidade geométrica ausente;
- ter comandos, saídas e armadilhas estáveis.

Antes disso, manter o protocolo em documentação evita congelar cedo demais uma
receita específica de objeto.
