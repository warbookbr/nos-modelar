# Gotchas de autoria visual

**Estado:** regra operacional obrigatória para qualquer família cuja qualidade
seja julgada visualmente (veículos, robôs humanoides e peças mecânicas). Este
documento existe porque uma geometria estruturalmente válida pode ser, ainda
assim, uma forma visualmente absurda.

## Regra zero: o absurdo visual veta o avanço

Se uma imagem individual não é reconhecível como o objeto pretendido, a rodada
está **reprovada**. Não importa que a receita execute, a malha seja fechada, os
hashes coincidam ou uma métrica local esteja verde. Um carro que parece cápsula
com rodas, uma cabeça que parece objeto solto, ou um robô com membros sem
ligação interrompem a execução naquele ponto.

O usuário não é gatilho de revisão. O sistema deve fazer essa checagem antes de
anunciar êxito, solicitar aprovação ou abrir a etapa seguinte.

## O que falhou e não pode se repetir

| Gotcha | Por que engana | Bloqueio obrigatório |
| --- | --- | --- |
| Malha fechada tratada como objeto bom | Topologia não mede caráter, proporção nem reconhecimento. | Nunca promover por fechamento/manifold. |
| IoU/silhueta global verde | Pode esconder cabine, arcos, frente, traseira e conexões erradas. | Métrica é diagnóstico; não aprova sem veredito visual por vista. |
| Painel/mosaico | Miniaturas escondem desconexões, faces invertidas e proporções ruins. | Abrir referência, render e comparação separadamente em tamanho nativo. |
| Volume genérico parametrizado | Estações ou primitivas suaves tendem a gerar cápsulas, caixas ou bonecos articulados. | Usar gramática da família antes de gerar a primeira forma. |
| Peças feitas isoladamente | Uma peça aceitável pode falhar ao ser montada. | Validar encaixe, oclusão e silhueta do conjunto em cada alteração. |
| Perspectiva bonita compensando ortográfica ruim | Uma câmera pode esconder erros fundamentais. | As vistas ortográficas críticas têm veto independente; perspectiva é auxiliar. |
| Mudança por métrica sem reabertura visual | Um número melhora enquanto a forma piora. | Toda alteração que muda geometria regenera e reinspeciona todas as vistas afetadas. |

## Pipeline mínimo que vem antes de modelar

1. **Contrato da família.** Declarar os componentes que tornam o objeto
   reconhecível, suas relações e as vistas que revelam cada relação.
2. **Alvo por vista.** Vincular cada referência individual a hash, enquadramento
   e pergunta visual. Não usar uma prancha como evidência.
3. **Crítico visual bloqueante.** Para cada vista, extrair e comparar marcos
   semânticos da referência e do render. O crítico deve emitir `aprovar`,
   `reprovar` ou `indeterminado`; `indeterminado` bloqueia promoção.
4. **Bloco semântico inteiro.** Criar o corpo conectado do objeto, não uma
   coleção de primitivos. Para veículo: carroceria, cabine, quatro rodas dentro
   dos arcos, frente e traseira diferentes. Para humanoide: tronco, pescoço,
   membros e juntas com continuidade espacial. Para peça: volume funcional,
   interfaces e vazios requeridos.
5. **Evidência pareada.** Gerar para cada vista: referência, render, diferença
   e registro textual dos achados. Cada arquivo é aberto individualmente.
6. **Veto e correção localizada.** Um reprovado identifica o marco e a vista
   que falharam; corrige-se esse contrato, não se aplica “suavização” global.
7. **Aprovação humana somente depois.** O usuário valida direção e intenção
   após o crítico automático não encontrar veto. A aprovação não substitui o
   histórico de evidências.

## Crítico visual: responsabilidades e limites

O crítico não tenta decidir se a arte está bonita. Ele bloqueia defeitos
observáveis e incontestáveis antes que contaminem as etapas seguintes.

| Família | Marcos mínimos bloqueantes |
| --- | --- |
| Veículo/carro | quatro rodas associadas aos arcos; cabine integrada; silhueta baixa e larga; frente e traseira distinguíveis; planta não retangular; sem partes flutuantes. |
| Robô humanoide | cabeça ligada ao pescoço/tronco; tórax com volume; ombro–braço–antebraço–mão e quadril–perna–pé em cadeia contínua; simetria declarada quando esperada; sem membros isolados. |
| Peça mecânica | volume principal; interfaces de montagem; vazios/furos funcionais; espessura mínima; eixos e simetrias declarados; sem interseção ou folga não intencional. |

Um avaliador não pode aprovar por “parece razoável” se faltar um marco. Ele
precisa anexar a evidência da vista, os marcos encontrados/ausentes e a razão
do veredito. Métricas de distância, IoU, diedro ou continuidade complementam o
diagnóstico, mas não recebem permissão de promoção.

## Política de parada e rastreabilidade

- Toda rodada começa `em-avaliação`; não existe sucesso implícito por gerar
  arquivos.
- Qualquer veto visual muda a rodada para `reprovada` e bloqueia as etapas
  dependentes.
- A tentativa reprovada permanece rastreável, mas não é reutilizada como base
  geométrica sem uma decisão explícita que identifique o defeito corrigido.
- Um novo gerador ou uma nova família começa com um caso canário pequeno, mas
  completo, e precisa passar os marcos mínimos em vistas individuais antes de
  receber mais detalhe.
- “Sem evidência” e “não foi possível avaliar” significam `indeterminado`, não
  aprovação condicional.

## Aplicação imediata a N6

A primeira prova isolada de N6.1, em
`autoria-assistida/experimentos/blocagem-multivista-n6/`, está **reprovada** e
não é base de continuidade: a carroceria resultou em cápsula, a frente e a
traseira não tinham leitura automotiva e a perspectiva não corrigia as vistas
ortográficas. Nenhuma métrica ou teste daquele experimento autoriza promoção.

N6 fica bloqueada até existir o crítico visual bloqueante e uma gramática de
bloco automotivo que passe os marcos desta página. O próximo trabalho não é
“ajustar números” daquela malha; é implementar esse contrato de avaliação e o
modelador específico que ele exige.

## Registro consolidado de problemas já encontrados

Este é o registro vivo do programa de autoria. Ele cobre os problemas que
afetaram criar, avaliar ou promover objetos mecânicos; não transforma erros
históricos em capacidade atual. Cada linha usa um destes estados:

- **corrigido e provado:** há mudança e evidência específica que a exerce;
- **reprovado e encerrado:** a hipótese foi testada e não pode voltar como base;
- **aberto:** a lacuna permanece e bloqueia uma promoção que dependa dela;
- **histórico não revalidado:** foi registrado, mas não foi medido de novo no
  estado atual do repositório.

| ID | Problema observado | Estado | O que realmente foi feito / limite atual |
| --- | --- | --- | --- |
| V-01 | Cinco tentativas de carro trocaram ferramenta, modelo ou malha, mas mantiveram seções manuais: `loft` elíptico, três envelopes sobrepostos, cage direta, R2/R2B e Cupê livre. | **reprovado e encerrado** | A assinatura comum foi reconhecida: números de seções não carregam intenção regional. Nenhuma dessas geometrias pode virar base de novo carro. |
| V-02 | `loft`/envelope longitudinal gera cápsula/barco; capô, ombro, teto e caixa de roda ficam acoplados. | **reprovado e encerrado** para pele exterior | O `loft` continua legítimo para peças adequadas, mas não para carroceria exterior. Uma cage derivada de seções também reintroduz a falha. |
| V-03 | Rodas pareciam externas; para-lamas, cabine, portas e dutos pareciam volumes/placas pousados. | **aberto** para veículo completo | A causa é ausência de topologia regional e de aberturas reais. O contrato de cage define a direção, mas ainda não entregou uma carroceria aprovada. |
| V-04 | Mais polígonos não trouxeram realismo; a densidade foi gasta em anéis, não em decisões de forma. | **reprovado e encerrado** como estratégia | O orçamento passa a precisar justificar regiões e landmarks; densidade isolada não é sinal de qualidade. |
| V-05 | A primeira N2 mostrava roda traseira sobre a cabine por ordenação SVG, embora a geometria não tivesse mudado. | **corrigido e provado** | O adaptador de vistas foi corrigido e imagens foram regeneradas. Isso só corrige evidência N2; não torna a blocagem um carro. |
| V-06 | G01 de N2 podia passar por envelope/silhueta mesmo sem crítica independente e sem aceite do usuário. | **corrigido como bloqueio; capacidade segue aberta** | G02 permaneceu bloqueado por desenho. N2 não autoriza detalhe, integração nem promoção automotiva. |
| V-07 | Painel lado a lado e cor plana por triângulo foram aceitos como prova C1; triangulação e costuras pareciam defeitos de superfície. | **corrigido e provado** | N3 foi revogada e revalidada com raster de normal interpolada, z-buffer, 42 arquivos individuais e hashes de inspeção. |
| V-08 | Um corte inicial de 18° marcava um toro sintético sadio como irregular por 0,068°. | **corrigido e provado** | A calibração foi refeita em 19° com controles sadios. Ela valida somente o canal C1, não estética ou reconhecimento. |
| V-09 | Suavização pós-modelagem parecia uma possível correção para a carroceria ruim. | **reprovado e encerrado** | N3.5 reduziu P95 global só marginalmente, piorou a parcela abrupta e não gerou ganho visual. A malha foi descartada. |
| V-10 | P95 escondia uma crista central C0 no capô de N4. | **corrigido e provado** no caso sintético | O aceite foi revogado; a base passou a ter tangentes nulas e C1 exige diedro máximo além de P95/parcela abrupta. Não prova carroceria. |
| V-11 | Busca de parâmetros poderia ser confundida com escolha de estilo ou modelagem de carro. | **limitado e provado apenas no sintético** | N5 demonstrou uma liberdade (`bojoRelativo`) e objetivo medido. Não escolhe design, proporção ou reconhecimento de veículo. |
| V-12 | Valores estruturais de veículo podiam ser declarados manualmente sem origem. | **corrigido e provado** para o contrato N3 | `procedencia:check` veta campos estruturais declarados e limita o restante; ainda falta derivar os landmarks de um alvo automotivo real para a nova modelagem. |
| V-13 | A referência podia ser uma prancha inteira e a perspectiva podia esconder falhas das ortográficas. | **corrigido e provado** no alvo N6 | A prancha foi recortada, cada vista recebeu hash e o pareamento vista↔vista tornou-se obrigatório; perspectiva é auxiliar. |
| V-14 | Autor julgava a própria narrativa em vez do resultado; um nariz aberto ficou visível em frontal por várias rodadas e só foi descoberto por script de bordas. | **aberto** | A regra de crítica cega está documentada, mas o orquestrador ainda não entrega um crítico sem contexto que bloqueie automaticamente cada promoção. |
| V-15 | “Não há achado” do crítico podia ser tratado como aprovação de qualidade. | **corrigido como regra; aberto como automação** | O crítico produz achados, nunca aprovação; aprovação é humana. Falta implementar a execução obrigatória e o estado `indeterminado` bloqueante. |
| V-16 | O robô humanoide ficou low-poly, com tórax sem volume humanoide/mecânico, cabeça sem leitura e membros desconectados. | **aberto** | O experimento histórico é rascunho defeituoso, não baseline. Não existe ainda gramática de esqueleto, volumes regionais e encaixe de juntas que passe crítica visual. |
| V-17 | O primeiro experimento N6.1 repetiu uma carroceria cápsula com rodas, frente/traseira sem leitura e perspectiva inconsistente. | **reprovado e encerrado** | A pasta isolada é somente evidência do erro. Nem malha fechada, nem teste, nem IoU autorizam reutilização. |
| V-18 | Na primeira execução N6.1, o projetor recebeu coordenadas erradas; depois rodas não possuíam face externa e janelas vazavam pelo lado oculto. | **corrigido localmente, experimento ainda reprovado** | Esses bugs de render foram corrigidos para entender a falha, mas a forma resultante continuou ruim. A correção técnica não reabilita a hipótese de modelagem. |
| V-19 | Frontais/traseiras e topo da N6.1 não comunicavam veículo apesar de métricas de silhueta numéricas. | **aberto** | Falta crítico semântico bloqueante e modelador automotivo por regiões; IoU deve ficar apenas como diagnóstico. |
| V-20 | Suite agregada e `mcp:check` já tiveram falhas passivas fora de N2/N3 (paths `repo://`, guarda histórica `fps`, importação isolada do perfil MCP e timeouts de ensaio). | **histórico não revalidado** | Esses problemas não podem ser usados para declarar o núcleo bom ou ruim sem nova medição. Não são explicação para a forma ruim, mas impedem alegar saúde total da suíte. |
| V-21 | Uma referência completa era ampla demais para orientar uma correção local, enquanto separar frente, centro e traseira como objetos causaria nova montagem desconexa. | **planejado, ainda não provado** | N6.1 passa a testar recortes regionais rastreáveis e edição regional na mesma carroceria contínua, sempre com regressão do carro completo. |

## O que já existe e não deve ser descartado

Há capacidades efetivamente provadas que são úteis, mas nenhuma equivale a
modelagem automotiva ou humanoide completa: identidade semântica, receitas
determinísticas, montagem/revisão, câmeras reprodutíveis, evidência com hash,
procedência, verificações de envelope/interseção e ferramentas de percepção C1.
O registro de atritos de autoria confirma A-1 a A-10, A-12 a A-14, A-17 a A-31
e A-33 a A-38 como **resolvidos**, A-11 como **parcial**, e A-15, A-16 e A-32
como escopo **retirado**, não como capacidade faltante. A lista detalhada e a
evidência de cada identificador permanecem em
[`ATRITOS-AUTORIA.md`](ATRITOS-AUTORIA.md); esta seção impede que essas
capacidades sejam confundidas com a lacuna de forma.

## Lacunas que realmente bloqueiam o objetivo atual

1. **Gramática por família implementada.** Veículo precisa de regiões e
   aberturas topológicas; humanoide precisa de esqueleto, volumes conectados e
   juntas; peça precisa de interfaces e função. O núcleo compartilhado não
   substitui essas gramáticas.
2. **Modelador correspondente.** A cage quad com vincos e subdivisão é uma
   direção arquitetural documentada, não uma carroceria pronta. Ela não pode ser
   declarada solução antes de produzir um caso canário reconhecível.
3. **Crítico visual automático e independente.** Precisa receber somente a
   referência pareada, o render e critérios de rejeição; deve registrar marcos
   encontrados/ausentes e bloquear `reprovar` ou `indeterminado`.
4. **Contrato mensurável de landmarks por alvo.** Cabine, arcos, rodas,
   nariz, ombros e traseira devem vir de medida/derivação por vista, não de
   números escolhidos para fazer uma malha passar.
5. **Canário completo por família.** Um carro, um humanoide e uma peça precisam
   passar os marcos mínimos em vistas individuais antes de qualquer receita
   “final”, superfície livre ou ampliação de escopo.

## Regra de manutenção deste documento

Toda nova falha observada entra neste registro antes da próxima promoção. A
entrada deve conter: artefato e vista, sintoma observável, causa conhecida ou
hipótese marcada como tal, estado, evidência e o limite da correção. Não é
permitido substituir uma falha por uma frase genérica como “melhorado”, nem
mudar `aberto` para `corrigido` sem teste e inspeção visual compatíveis.
