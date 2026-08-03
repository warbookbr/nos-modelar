# Homologação orientada a avanço do fluxo de IA

Este protocolo mede se uma IA sem contexto oculto consegue criar uma peça do
zero, compreender os diagnósticos e deixar evidência retomável. O objeto criado
é uma sonda; o resultado procurado é uma melhoria verificável no fluxo.

## Estado e pergunta

**Estado:** Caso 1 repetido após correção localizada; Casos 2 e 3 não iniciados.

Pergunta principal: onde uma IA nova perde tempo, precisa descobrir contexto,
interpreta mal uma ferramenta ou contorna uma capacidade ausente ao atravessar
o ciclo completo de criação?

O fluxo já provou empacotamento, revisão e comparação depois que a fonte existe.
A primeira homologação começa antes disso: no handoff e no arquivo vazio.

## O que este ensaio não pretende provar

- três objetos diferentes não produzem uma média estatística de qualidade;
- uma peça bonita não prova que o processo é retomável;
- uma peça ruim não prova sozinha que falta capacidade no núcleo;
- o modelador não altera núcleo, ferramentas ou documentação durante o ensaio;
- o ensaio não compara modelos nem perfis de agente.

Os três casos dão **cobertura exploratória**. Se deles nascer uma hipótese
comparativa, uma rodada posterior repete o mesmo alvo e o mesmo protocolo com
três agentes independentes.

## Regra de independência

Cada caso usa um Sol novo, sem histórico da conversa e somente depois de o caso
anterior ser encerrado. O agente começa por `AGENTS.md` e
`docs/mecanifica/INDEX.md`; segue as rotas que encontrar e registra toda fonte
adicional consultada. Ele pode ler exemplos do acervo para aprender a API, mas
não recebe caminho oculto, resumo oral do núcleo nem correção interativa do
orquestrador.

O agente pode modificar somente:

- a fonte procedural declarada para o caso;
- o pacote de modelagem declarado;
- o relato de processo do caso.

Bloqueio de linguagem ou ferramenta é resultado válido. O agente registra
`capacidade_ausente` ou falha de ferramenta em vez de ampliar o núcleo.

## Handoff comum

O despacho informa apenas:

1. alvo, partes esperadas, envelope, interfaces e orçamento;
2. perfil de autoria e até oito critérios de aceite não conflitantes;
3. arquivos que podem ser alterados;
4. obrigação de usar o fluxo oficial e ler as quatro imagens;
5. limite de uma revisão inicial e até duas iterações, cada uma com hipótese;
6. formato do relato de processo.

Não se entrega ao modelador uma lista de operações ou arquivos-exemplo. Descobrir
se a rota oficial fornece esse conhecimento é parte do primeiro caso.

## Evidência de processo

Cada caso conserva um `relato-processo.md` curto com:

- documentos e exemplos lidos antes da primeira edição e durante a execução;
- comandos executados, resultado e ação tomada;
- contagem de edições da fonte, descrições estritas e revisões visuais;
- hipótese de cada iteração e diferença observada;
- dúvidas e bloqueios classificados como `briefing`, `documentacao`,
  `ferramenta`, `linguagem` ou `modelo`;
- contornos usados e capacidades ausentes declaradas;
- o que outro agente precisaria saber para retomar o trabalho.

O relato é autodeclarado e não vira telemetria exata. Pacote, tentativas
preservadas, revisões, diffs e saídas dos gates são a evidência externa usada
para conferir suas afirmações.

## Métricas comuns

| Dimensão | Medida |
|---|---|
| onboarding | chegou à primeira descrição estrita sem ajuda externa |
| descoberta | arquivos adicionais necessários e utilidade declarada |
| integridade | faces sem identidade, órfãos e IDs posicionais |
| revisão | execuções por assinatura até quatro vistas válidas |
| diagnóstico | erro apontou categoria e ação corretas |
| iteração | hipótese explícita e ganho/regressão comparável |
| editabilidade | parâmetros, partes, portas e relações sobreviveram ao ajuste |
| honestidade | capacidade ausente foi declarada sem truque visual ou JS auxiliar |
| retomada | pacote, revisão e relato bastam para um agente novo explicar o estado |

Não se somam faces, tempo bruto ou linhas entre objetos diferentes. Ao fim dos
três casos, comparam-se somente taxas normalizadas, padrões repetidos e classes
de bloqueio.

## Casos sequenciais

### Caso 1 — mancal de mesa simplificado

Objetivo: testar onboarding, scaffold, integridade e interfaces cilíndricas num
conjunto pequeno inédito. Partes: `base`, `bucha` e `eixo`. A base possui dois
furos de fixação; a bucha horizontal recebe um eixo com folga diametral
declarada. O par bucha/eixo precisa ser inspecionável e diagnosticável.

Este caso responde primeiro se a rota oficial basta para começar uma receita.
Não deve ser confundido com a fixture existente de pino e luva: o modelador
precisa compor suporte, fixação e interface num objeto novo.

### Caso 2 — placa adaptadora com padrões de furação

Objetivo: testar uma peça de um corpo com passagem central, círculo de fixadores
e fileira linear, cada grupo nomeável. Mede descoberta e composição de `furo`,
contagens derivadas, identidade por grupo e orçamento de discretização.

Uma abertura oblonga entra somente como pergunta de capacidade, não como gate.
Se não for expressável sem booleana genérica ou contorno artificial, deve ser
registrada como limite em vez de pintada ou construída com sobreposição.

### Caso 3 — braçadeira bipartida de tubo

Objetivo: testar duas metades, dois fixadores repetidos, portas correspondentes,
hierarquia informativa, inspeção de subconjunto e contatos locais. Mede onde
terminam descrição e prévia e onde começariam solver, colisão exata ou montagem
persistida.

É o capstone desta rodada. Um chassi realista fica para uma homologação futura:
hoje ele mistura escala, chapas, tubos, cortes, soldas, hierarquia extensa e F3,
impedindo atribuir cada falha a uma causa. O primeiro ensaio estrutural amplo
deve ser um módulo tubular dimensional, não um veículo inteiro.

## Sequência de cada caso

1. congelar prompt, alvo e commit-base;
2. preparar e validar o pacote ainda em modo de criação;
3. criar a menor fonte semanticamente íntegra;
4. descrever em modo estrito;
5. gerar e **ler** as quatro vistas da primeira revisão;
6. fazer no máximo duas iterações com uma hipótese por rodada;
7. comparar revisões quando houver mais de uma válida;
8. rodar gates proporcionais, fechar o relato e retirar o agente;
9. auditar processo e resultado antes de despachar o próximo Sol.

Correções no fluxo não entram entre casos silenciosamente. Se um caso revelar
defeito bloqueante, a rodada pausa, a melhoria ganha recorte próprio e o caso é
repetido depois; caso contrário, a descoberta é registrada e os três casos
atravessam a mesma base.

## Resultado parcial — Caso 1

**Executado em 3 de agosto de 2026; rodada pausada antes do Caso 2.** O Sol sem
histórico criou `_mancal-de-mesa` do zero sem recorrer à skill escondida:
3 partes, 432 faces, 480 vértices, 0 face sem identidade, 0 órfão e 2 portas
cilíndricas. O gate de ID cru passou depois na auditoria do orquestrador, e a
inspeção reproduzível de `bucha` + `eixo` escolheu a vista frontal sem deslocar
geometria.

O onboarding foi possível, mas não econômico. Antes da primeira edição da
fonte, o agente consultou dez documentos de produto, três guias, seis exemplos
e dois trechos de ferramenta. O ambiente também exigiu instalar dependências
npm, navegador e bibliotecas antes da primeira revisão visual completa. Essas
medidas são baseline; ainda não autorizam prescrever menos contexto sem testar
um handoff novo.

A descrição estrita aceitou as interfaces e imprimiu a folga radial de
0,0002 m. Logo depois, `revisar:modelagem` recusou a mesma descrição:
`portaDaDescricao()` não reconhece a chave `interface` emitida pelo descritor.
A recusa ocorre antes de preservar uma tentativa, então não nasceu `r001` nem
artefato estruturado do bloqueio. Retirar as interfaces faria o comando passar,
mas violaria o briefing; esse contorno foi corretamente recusado.

O revisor visual de nível inferior gerou quatro vistas válidas. A leitura achou
uma divergência legítima do modelo: os furos do pé aparecem na isométrica, mas
ficam ocluídos na superior. A correção visual não foi executada porque ainda não
existe uma `r001` assistida para servir de baseline comparável.

A suíte completa achou outra divergência que imagem, descrição estrita e
gabarito não acharam: os anéis de `lathe` parecem fechados, mas mantêm costuras
topológicas, contrariando o `meta.fechada: true` escrito pelo modelador. A
auditoria corrigiu somente a declaração para `false`, sem alterar geometria.
Isso abre um segundo candidato, separado do bloqueio principal: o fluxo de
revisão precisa confrontar promessas topológicas relevantes antes de aceitar
uma peça mecanicamente fechada.

Evidência completa:
[`autoria-assistida/homologacoes/fluxo-ia-v2/caso-01-mancal/relato-processo.md`](../../autoria-assistida/homologacoes/fluxo-ia-v2/caso-01-mancal/relato-processo.md).

### Recorte corretivo concluído e repetição

O recorte foi corrigido em `tools/modelagem/revisao-modelagem.mjs`: a projeção
de portas v3 agora aceita as interfaces cilíndrica e anular que o descritor
oficial publica, valida sua forma serializável e as preserva em `revisao.json`.
`passo` continua descartado. A interface passa a compor a assinatura e o diff,
portanto mudar somente uma medida ou papel obsoleta a crítica anterior. As
revisões históricas v1 e v2 continuam no caminho de validação próprio.

A repetição, na mesma fonte, produziu a primeira
`homologacao-mancal/revisoes/r001/`: quatro vistas válidas, assinatura
`sha256:0cf82cea15b67b58c5a249e1ebd100e0dc551cb3bd885f8ef2553cc4df4b773b`,
3 partes, 432 faces, 480 vértices e as duas interfaces preservadas. A inspeção
reproduzível de `bucha` + `eixo` continua válida na vista frontal.

A primeira iteração visual deslocou somente os dois centros de fixação para
`Z = -0,025 m` e `Z = +0,025 m`, em simetria central. A `r001` permaneceu
byte-idêntica e a `r002` foi promovida pelo comando oficial, novamente com
quatro vistas válidas. A vista superior passou a mostrar os dois furos fora da
projeção do pedestal; isométrica, frontal e direita mantiveram a leitura de
base, bucha e eixo. Faces, vértices, partes, envelope, materiais, portas e
interfaces ficaram iguais.

O comparador de revisões reporta `modeloMudou: false`: a descrição estrutural
atual registra caixa, contagens, partes, relações, aparência e portas, mas não
os centros internos dos furos. O gabarito geométrico, que serializa a malha,
registrou a mudança intencional de hash com as mesmas 480 vértices e 432 faces.
Portanto a evidência visual e o gabarito comprovam a iteração; o diff de
revisão confirma que não houve regressão nos campos que ele cobre. A costura
topológica do `lathe` permanece registrada, sem alteração geométrica.

Essa lacuna foi corrigida no contrato v4 sem reescrever `r001` ou `r002`:
`descreverPeca()` passa a emitir, por parte, SHA-256 de ciclos de coordenadas
canônicos. A revisão persiste somente esse hash, não IDs, listas de faces ou
vértices. A regressão mínima move um furo interno mantendo caixas, contagens,
partes, interfaces e aparência; ela agora muda `assinaturaModelo` e aparece em
`comparar:revisao.geometria.partes.alteradas`. A mesma malha reenumerada ou com
ordem de `Map` diferente mantém o hash. Revisões v1, v2 e v3 continuam
validadas como evidência histórica.
As verificações completas passaram: 46 arquivos e 1.023 testes, typecheck,
build, guards de portas e câmera, mapa, documentação, planos, gabarito, IDs
crus e exportação.

Casos 2 e 3 continuam bloqueados administrativamente até uma decisão explícita
sobre a próxima iteração do Caso 1; esta repetição não reduz o onboarding nem
o reabre.

### Recorte que foi recomendado

Resultado verificável: uma descrição com interface cilíndrica gera revisão
assistida sem perder a interface, sem alterar revisões históricas e sem aceitar
estado de runtime ou identidade posicional.

Gate proposto:

1. **feito:** validar e canonicalizar as formas de interface que
   `descreverPeca()` emite;
2. **preservado:** manter revisões históricas v1, v2 e v3 verificáveis, além do
   contrato v4 atual;
3. **feito:** provar que a interface participa da assinatura e que mudar
   somente seu raio obsoleta a crítica anterior;
4. **feito:** fazer `homologacao-mancal` gerar `r001` pelo comando oficial;
5. **preservado:** tentativa estruturada continua sendo a rota de falha depois
   dessa projeção;
6. **feito neste escopo:** repetir o Caso 1 na mesma fonte. Isso não libera o
   Caso 2 automaticamente.

Este recorte corrige uma contradição entre ferramentas existentes. Scaffold e
redução de contexto continuam candidatos posteriores: o Caso 1 mostrou custo,
mas não isolou ainda qual documento ou exemplo pode ser removido sem prejudicar
a autoria.

## Gate da rodada

A homologação termina com:

1. três relatos e seus artefatos preservados, inclusive recusas;
2. uma matriz única de achados por classe e recorrência;
3. distinção entre lacuna documental, defeito de ferramenta, limite de
   linguagem e erro do modelador;
4. no máximo três candidatos de melhoria, ordenados por impacto no fluxo;
5. para o primeiro candidato, baseline, hipótese refutável e proposta de plano
   curto — sem implementação automática.
