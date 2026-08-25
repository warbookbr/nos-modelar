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
| Métrica que muda com a densidade da malha | Diedro, segunda diferença e curvatura por vértice medem o PASSO da amostragem, não a forma. A mesma superfície troca de veredito só refinando. | Toda métrica angular normaliza pelo comprimento da aresta, ou o corpus é reamostrado para densidade comum antes de comparar. |
| Detector que devolve `passa` fora do seu escopo | Aprovação por vacuidade: o gate fica verde porque não tinha o que medir. | Fora de escopo devolve `naoAvaliavel` com motivo. Nunca `passa`. |
| Crítico recebendo só o render | Sem o alvo ao lado, a única pergunta possível é "isso parece um carro?", e a resposta não aponta contra o quê. | Crítico recebe alvo, modelo e sobreposição, nos três caminhos. |
| Alvo inventado pela IA usado como referência | Um número que a IA escolheu vira "medida" na rodada seguinte e ninguém confere. | Alvo sem procedência medida é `não vinculante` no próprio documento. |
| Método diagnóstico aplicado a problema generativo | Sempre acha um defeito, então dá sensação de progresso enquanto a forma não anda. | Sintoma de parada: os achados encolhem e a nota não sobe. Ver `METODO-DIAGNOSTICO-E-SEU-LIMITE.md`. |

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

O canário posterior de interseção de silhuetas, em
`autoria-assistida/experimentos/canario-casco-visual-n6/`, também está
**reprovado e encerrado**. Ele produziu uma malha única e IoUs numéricos, mas
as imagens individuais revelaram um bloco escalonado. A interseção binária
captura ocupação, não a topologia automotiva; aumentar a resolução, suavizar
ou ajustar o limiar não é uma correção aceita para esse método.

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
| V-08 | Um corte inicial de 18° marcava um toro sintético sadio como irregular por 0,068°; o corte foi movido para 19°. | **REABERTO em 2026-08-24** | A recalibração tratou o sintoma. O braço P95/máximo do canal C1 mede **densidade de malha**, não qualidade: o MESMO toro justo por construção lê `IRREGULAR` com 36×16 (P95 22,6°) e `regular` com 36×20 (18,1°); em 72×72 cai para 5,0°. E o caso `quebra-sintetica`, cujo defeito é conhecido por construção, tem P95 de **1,704°** — abaixo dos três controles sadios. A separação real do corpus vem só de `parcelaAbrupta` (0% nos sadios contra 3,2–20,2% nos reprovados). Ver V-23. |
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
| V-20 | Suíte agregada e `mcp:check` tiveram falhas passivas fora de N2/N3 (`repo://`, guarda histórica `fps` e importação isolada do perfil MCP). | **aberto; revalidado em parte em 2026-08-25** | A nova linha de base passou 1.264/1.277 testes, com 11 falhas e 2 ignorados: nove falhas derivam de `repo://`, uma guarda encontra `prototipos/fps/v3` e uma importação MCP falha apenas no agregado. Não explicam a forma ruim, mas impedem alegar saúde total. |
| V-21 | Uma referência completa era ampla demais para orientar uma correção local, enquanto separar frente, centro e traseira como objetos causaria nova montagem desconexa. | **rota N6.1 encerrada; princípio preservado** | Recorte regional nunca vira peça isolada e toda edição exige regressão do objeto completo. Essa regra pode voltar em P4/P6, após prior e fitting; não autoriza retomar N6.1. |
| V-22 | Interseção de silhuetas binárias das vistas N6 produziu uma malha única com IoU frontal 0,7645, mas frontal/lateral/superior/perspectiva formaram bloco escalonado sem leitura automotiva. | **reprovado e encerrado** | A máscara informa ocupação, não arcos, cabine, entradas, cintura ou topologia. `canario-casco-visual-n6/` é evidência negativa; o sucessor exige marcos semânticos regionais e patches contínuos de fronteira compartilhada. |
| V-23 | Métrica angular usada como sinal de qualidade sem normalizar pela densidade da malha. Aconteceu três vezes: segunda diferença de ondulação que encolhia ~4× por nível de subdivisão; curvatura por vértice que lia um círculo perfeito como giro concentrado; e o P95/máximo de diedro do canal C1. | **aberto** | O conserto conhecido é normalizar pelo comprimento de arco ou da aresta — curvatura discreta ≈ ângulo/comprimento — ou reamostrar o corpus para densidade comum. Enquanto não for feito, o P95 do C1 não é evidência, e os gates de N4/N5 que usam "diedro máximo ≤ 19°" herdam o problema: as seções vencedoras estão em 18,704° e 15,903°, a um passo de malha de reprovar. |
| V-24 | Uma região inteira entrou com a normal invertida e nenhum validador reclamou. Ocorreu em cinco lugares: fáscia dianteira, retorno do arco, moldura do vão, rasgo da forma não automotiva e fundo da grelha. | **corrigido e provado** | O sintoma aparecia longe da causa: o diedro entre pele e fáscia lia 168°, que é 180 menos os 12° reais da quina, e virou caça a facetamento inexistente. `validarCage` ganhou regra de orientação (faces vizinhas percorrem a aresta comum em sentidos opostos) e o módulo neutro ganhou `orientarConsistente`. |
| V-25 | A ferramenta de captura entregou imagem comprimida por três rodadas, e a reclamação do crítico foi descartada como implicância dele. | **corrigido e provado** | `display:flex` sem `width:max-content` fazia o navegador encolher as vistas para caber na janela; recortar pela caixa do elemento não recupera pixel que não foi pintado. Forma foi julgada em imagem cortada nesse período. O crítico passa a ter instrução explícita de reclamar de imagem cortada **antes** de qualquer outro achado. |
| V-26 | O desenho de referência existia no repositório desde a primeira rodada e **nunca foi aberto**; o crítico recebia sempre o render sozinho. | **corrigido e provado** | Quando a sobreposição finalmente existiu, ela mostrou em segundos que o nariz do modelo era parede vertical onde o alvo enrola, e que a planta tinha 740 mm de meia largura na ponta contra 300 do alvo. `comparar-alvo.mjs`, o agente `critico-visual` e o laço obrigatório em `REFERENCIA-E-CRITICA-VISUAL.md` fecham isso. |
| V-27 | Landmarks inventados pela IA foram usados como alvo vinculante por rodadas. | **corrigido e provado** | O P0 punha o alto do nariz a 520 mm; o perfil **medido** de um cupê fastback real põe a 841 mm — 321 mm abaixo, e abaixo do topo do pneu dianteiro. Era a causa do perfil ler como cunha. `CHASSI-P0-ALVO-E-LIMIARES.md` está marcado não vinculante no próprio documento. |
| V-28 | Assumir que três vistas ortográficas determinam a seção transversal. | **reprovado e encerrado** | Medido em `prova-secoes-por-medida/`: **82% das estações ficam escondidas** atrás da envoltória frontal e recebem só dois números, faixa de altura e largura máxima; duas famílias com as três vistas idênticas ainda diferem 28 mm no flanco. Para comparação, a silhueta extraída de prancha rasterizada tem ~40 mm de ruído. Blueprint dá esqueleto, nunca seção. |
| V-29 | Vinco semi-agudo com nitidez fracionária, e vinco sem loop de apoio. | **corrigido e provado** | Nitidez fracionária produzia zigue-zague de período 2: uma crista reta de 200 mm alternava 175/195 mm no nível 2. Nitidez virou inteira e a ondulação caiu de 16,6 para 4,2 mm. Separadamente, adensar estações junto de um vinco sem apoio **piorou** o diedro de 39° para 79° — canto é canto, não amostragem grossa. |
| V-30 | Trocar 80 coordenadas digitadas por 12 parâmetros com nome e tratar isso como avanço. | **reprovado e encerrado** | Os 12 também foram chutados, com nome bonito em cima: `larguraNoOmbro: 0,94`, `bojoSuperior: 34`. Mudou a quantidade, não o ato. Vale também para família de curvas escrita à mão que satisfaz restrições **por construção**: isso não é solver. |
| V-31 | Gastar uma rodada redescobrindo algo já medido e registrado no próprio repositório. | **aberto** | O canário N6 (V-22) chegou a "silhueta não carrega topologia automotiva" construindo um casco por interseção; `prova-secoes-por-medida` já tinha medido isso, e o plano ativo cita esse caminho. Antes de abrir experimento, o passo "identificar o que falta" exige varrer o registro existente. |
| V-32 | Contornar por redação uma condição de encerramento escrita antes. | **aberto — decisão do usuário** | O plano diz: N6 falha no reconhecimento cego com N3/N4/N5 aprovados → conclusão de que está fora de alcance. N6.1 foi reprovada, e a saída usada foi que N4 aprovou só "viabilidade estreita" e N5 só "alvo sintético". Literalmente correto, e é exatamente o mecanismo que a condição existia para bloquear. Sexta tentativa reprovada; a decisão de continuar precisa ser explícita e do usuário, não resolvida por escolha de palavras. |
| V-33 | Promover “a IA compara bem” de observação útil para premissa arquitetural sem teste repetido. | **aberto; plano dependente cancelado** | O plano por seleção dizia que a assimetria estava medida, mas S1 existia justamente porque os mesmos pares nunca tinham sido repetidos com ordem embaralhada. Comparação só volta ao caminho crítico após corpus frio, empates, `indeterminado`, holdout e intervalo de confiança. |
| V-34 | Confinamento `repo://` comparava caminhos Windows com o prefixo textual `${raiz}/`. | **aberto e reproduzido** | A suíte de 2026-08-25 teve nove falhas de aceites/despacho a partir desse defeito compartilhado. A correção deve usar `realpath` + `relative`/`isAbsolute`, com testes de travessia, prefixo irmão e symlink; trocar a barra não é contrato portátil. |
| V-35 | Tratar recortes de uma prancha ImageGen como vistas de um alvo geométrico único. | **limitado a direção estética** | O manifesto N6 prova bytes, recortes e perguntas, não câmeras, escala 3D, profundidade ou correspondências. Ele orienta caráter e rejeições; fitting quantitativo exige alvo do mesmo objeto 3D com calibração, ou devolve `indeterminado`. |
| V-36 | Esperar que busca/seleção encontre forma ausente do gerador. | **reprovado como premissa; plano cancelado** | Caixas, linhas e topologia feitas à mão delimitam o espaço alcançável. Um ranqueador não cria uma cabine, arco ou flanco que esse espaço não representa. O sucessor precisa provar um prior por família contra arquétipo holdout antes de otimizar preferência. |
| V-37 | Confundir fronteira compartilhada e interpolação de Coons com continuidade de qualidade. | **aberto** | Compartilhar posição prova apenas G0. G1/G2 exigem derivadas transversais compatíveis, ribbons e/ou fairing global, medidas em unidade física e independentes da tesselação. |

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

1. **Linha de base confiável.** Os gates portáteis e a suíte agregada precisam
   fechar antes de novos experimentos de forma.
2. **Alvo qualificado.** Direção estética não pode ser promovida a levantamento
   geométrico; fitting exige câmera, escala, correspondências e incerteza.
3. **Prior por família provado em holdout.** Veículo, humanoide e peça usam
   representações diferentes; o núcleo compartilhado não substitui os priors.
4. **Superfície semântica com continuidade real.** Identidade regional, G0/G1/G2
   e fairing precisam sobreviver à compilação sem depender da tesselação.
5. **Crítico calibrado e independente.** Comparação só governa busca depois de
   repetibilidade, controles, holdout e zero promoção de defeito grosseiro.
6. **Canário completo por família.** Reconhecimento em vistas individuais vem
   antes de detalhe, edição ou integração.

## Regra de manutenção deste documento

Toda nova falha observada entra neste registro antes da próxima promoção. A
entrada deve conter: artefato e vista, sintoma observável, causa conhecida ou
hipótese marcada como tal, estado, evidência e o limite da correção. Não é
permitido substituir uma falha por uma frase genérica como “melhorado”, nem
mudar `aberto` para `corrigido` sem teste e inspeção visual compatíveis.
