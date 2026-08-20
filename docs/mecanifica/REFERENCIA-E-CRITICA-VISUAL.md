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

> **O crítico é uma sessão separada, despachada, sem contexto.** Papel separado
> dentro da mesma sessão é ficção: quem modelou *tem* a narrativa e não consegue
> não tê-la. O orquestrador despacha um subagente e passa apenas o artefato, as
> vistas e o critério — nunca o próprio raciocínio.

Isto não é preciosismo de processo. O modo de falha documentado não é
incapacidade, é **apego à própria narrativa**: numa comparação de silhueta, o
autor afirmou que o defeito grave era a linha do teto; a medida mostrou desvio de
17 mm no teto e de 112 mm na traseira, que ele não havia apontado. Um crítico frio
não herda a expectativa de quem desenhou.

### Antes de despachar: OLHE você mesmo

O crítico existe porque quem modelou não consegue não ter a narrativa. Ele
**não** existe para substituir o ato de olhar. Rasterize as vistas e abra a
imagem:

```
node tools/mecanifica/olhar.mjs saida.png vista-a.svg vista-b.svg
```

e leia o PNG como imagem. SVG entregue ao usuário e nunca aberto por quem
desenhou é o modo de falha real desta investigação: um nariz aberto de
600 x 370 mm ficou várias rodadas visível na vista frontal e só foi achado por
um script que contava laços de borda. Medição só pega o defeito que alguém já
imaginou; olhar pega o resto.

### O crítico recebe IMAGEM

O que se despacha ao crítico é a **imagem**, e a pergunta é sobre o que ela
mostra. Não se despacha receita, código, passos, contrato nem relatório para
revisão: isso é revisão de código, tem outro dono, e um crítico lendo a receita
volta a julgar a intenção em vez do resultado — que é exatamente o defeito que o
papel existe para cobrir.

Três formas de despacho, da mais forte para a mais fraca:

1. **Legibilidade cega.** Entregue só o PNG, sem dizer o que é, e pergunte
   "o que é isto?". Se a resposta não bate com a intenção, é achado — e o teste
   não exige gosto nenhum, só verifica se a forma comunica. É a forma padrão.
2. **Condições de rejeição sobre a imagem.** Entregue o PNG e a lista de
   condições de rejeição declaradas, e pergunte quais estão violadas **no que se
   vê**. Omita o motivo de cada escolha: o motivo é justamente o que ancora.
3. **Reinterpretação da medida.** Entregue o relatório numérico junto do PNG e
   peça a leitura independente. Pega o caso em que o autor explica um alerta em
   vez de corrigir. É a forma mais fraca porque reintroduz números.

Limites do papel, que valem mais que os achados:

- **produz achado, nunca aprovação.** Silêncio do crítico não é evidência de
  qualidade, e não pode ser registrado como aceite. Aprovação de forma é do
  usuário;
- **legibilidade cega roda sempre que uma forma vai ao usuário.** É barata e é
  a única defesa contra entregar algo que o autor já não consegue enxergar. As
  formas 2 e 3, essas sim, rodam em marco e depois da medida limpa: são caras e
  gastá-las no que a medida já reprova é desperdício;
- **cada despacho é partida fria** e reconstrói contexto;
- **não edita.** Aponta e prova; quem corrige é o modelador.

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

Para legibilidade cega, sem referência e sem dizer o que é:

> Descreva o que você vê nesta imagem. Que objeto é este, de que família, e o
> que na forma sustenta essa leitura? Se algo na imagem contradiz a leitura que
> você deu, aponte.

Para comparação contra referência:

> Compare a peça atual com as referências considerando silhueta, proporções,
> continuidade entre superfícies, espessura, profundidade, acabamento de bordas
> e detalhes funcionais. Liste no máximo cinco divergências que mais impedem
> atingir o nível de realismo solicitado. Para cada uma, indique a região
> visual, a evidência observável, a condição de aceite e se a correção parece
> exigir ajuste, remodelagem local ou capacidade ausente.

Uma crítica sem referência pode ser usada depois para perguntar o que parece
artificial, desconectado ou estruturalmente improvável. Ela não substitui a
comparação principal.

## O laço obrigatório: abrir o alvo, sobrepor, despachar com os dois

Escrito depois de uma prova inteira feita sem ele, e o custo foi este: o quarto
dianteiro do chassi foi modelado por doze rodadas sem que o desenho de
referência do P0 fosse aberto **uma única vez**, e o crítico visual recebeu
sempre o render sozinho. A única pergunta que ele podia responder era "isso
parece um carro?", e a resposta foi 3/10 duas vezes seguidas sem que ninguém
pudesse apontar contra o quê. Quando a sobreposição finalmente existiu, ela
mostrou em cinco segundos que o nariz do modelo era uma parede vertical onde o
alvo enrola para baixo, e que a planta do modelo era 500 mm mais larga que o
alvo na ponta.

Três passos, em ordem, e nenhum é opcional:

1. **Abrir o alvo antes de modelar.** `npm run olhar -- alvo.png desenho.svg`,
   e então LER a imagem. Não basta a existência do desenho no repositório: o
   desenho do P0 existia desde a primeira rodada e nunca foi aberto.
2. **Sobrepor a cada rodada.** `npm run comparar:alvo -- cmp.svg malha.json`
   põe a silhueta do modelo sobre as curvas do alvo, em milímetros, na mesma
   origem. Cinza é alvo, azul é modelo: onde só há cinza falta forma, onde só
   há azul sobra.
3. **Despachar o crítico com os dois.** O agente `critico-visual` recebe o
   caminho do alvo, o do modelo e o da sobreposição, e a pergunta deixa de ser
   "parece um carro?" para virar "bate com o alvo?". Crítico que recebe só o
   render dá opinião, não crítica.

Se não houver alvo desenhado para a peça, **desenhe primeiro** — a skill
`desenhar-prancha` existe para isso. Modelar contra a própria intuição e depois
medir foi o que produziu doze rodadas de correção em círculo: mudei a largura do
nariz de 300 para 806 mm por achismo, e o alvo dizia 300.

## Fluxo

1. Fixar perfil de autoria, distância mínima e orçamento.
2. Reunir referência técnica e referência de aparência separadamente.
3. Gerar briefing com no máximo oito itens e vistas de prova.
4. Permitir revisão do usuário quando o resultado visual for subjetivo.
5. Modelar envelope e interfaces; depois, uma região por vez.
6. Renderizar vistas canônicas equivalentes às referências, **e sobrepor ao
   alvo** com `comparar:alvo` antes de julgar qualquer coisa.
7. Rodar crítica intermediária **por despacho** — subagente `critico-visual`,
   sem contexto, recebendo alvo, modelo e sobreposição,
   limitado às cinco maiores divergências — depois que a prova determinística
   estiver limpa.
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
