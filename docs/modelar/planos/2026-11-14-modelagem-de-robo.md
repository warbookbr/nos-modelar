# Modelagem de robô humanoide: o que já serve, o que falta na montagem e por onde começar

**Estado:** ativo

**Território:** `procedural/pecas/robo-humanoide/`, `docs/modelar/banco-de-provas/robo-humanoide-2026-11-14/`, `tools/modelar/planejado-contra-executado.mjs`

Os arquivos de montagem de `src/autoria/` só entram no território depois do ponto de decisão da fatia 3, por emenda aprovada pela pessoa.

**Responsável:** a IA da sessão conduz e mede, e a pessoa julga a forma por imagem. Ativado pela pessoa em 2026-11-14, numa vaga livre de plano ativo, como quarto na ordem de prioridade.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-14.

## Problema observado

A pessoa quer modelar um robô humanoide de corpo inteiro e não sabe se o caminho é um módulo de apoio para robôs ou investimento no núcleo. As duas imagens de referência (frente e costas) foram geradas por IA, valem como caráter da forma e ficam fora do repositório. O objeto tem cabeça com rosto humano, pescoço de cilindros, peito e costas em placas de casca com costura, cintura de vértebras com cabos e hastes, pélvis em casca, juntas de disco nos ombros e nos quadris, coxas, canelas e antebraços em casca com painéis escuros, cotovelos e joelhos de mecanismo, mãos de dedos articulados e pés.

O inventário feito em 2026-11-14 mostra que a forma de quase todas as partes já sai das operações que existem, e que as lacunas estão na composição do conjunto. O que existe para a forma: `subdivisao` com `espessura` faz casca de forma livre fechada em sólido, com gaiola vinda de `gaiolaPorEstacoes`, `gaiolaPorRede` ou `gaiolaPorLacos`; `paineisPorVaos` divide a casca em painéis com vão constante; `aberturaPorContorno` abre vãos; `lathe`, `furo`, `arranja` radial, `unir`, `subtrair` e `arredondarCostura` fazem discos, garfos e carcaças; `gaiolaVarrida` faz tubo por trilho com raio nos cantos; `corpoDeSecaoVariavel` faz corpo de seção oval que engrossa e afina. O que existe para o conjunto: a montagem v5 com etapas, vínculos de medida e posição por porta, as relações `assentaAnular`, `encaixaCilindrico`, `assentaPlano`, `encaixaPadraoFuros` e `encaixaTrilho`, a extensão `articulacao` de revolução e prismática com o curso conferido contra as peças, a auditoria de interseções e o apoio no chão. O braço robótico industrial do acervo (`procedural/pecas/braco-robotico/`, doze partes, plano das partes do braço concluído em 2026-11-12) prova a cadeia de juntas rotativas com anéis, carcaças e flange.

Uma prova barata desta pesquisa confirmou a casca tubular: uma receita de dois passos com `gaiolaPorLacos` aberta nas duas pontas e `subdivisao` com espessura de 3 mm deu um tubo oval de 400 mm que afina, fechado, com 2.112 faces, sem aviso das réguas de malha e em menos de 1 s no `npm run descrever`. A receita ficou em `tmp/robo-prova/`, fora do repositório.

As lacunas medidas, todas gerais, são cinco. A pose de instância da montagem aceita só rotação própria, e `src/autoria/transformacao-rigida.js` recusa reflexão; como a instância só recebe parâmetro por vínculo de porta, cada parte que tem par esquerdo e direito pede hoje uma segunda receita, e o robô tem perto de metade das partes em par. O ângulo de uma junta não é valor declarado: a posição por porta alinha os eixos e tira o giro das referências das portas, e a `articulacao` confere uma junta de cada vez com as outras paradas, de modo que a pose de braços abertos e de dedos curvados, que a referência mostra, seria escrita peça a peça. O cabo liga portas de peças diferentes, e nenhum vínculo leva a posição de uma porta a um parâmetro de receita (os vínculos levam raio, início e fim); o braço industrial deixou o cabo de fora por esse motivo, registrado no alinhamento dele. A família `cilindro-hidraulico` começa em êmbolo de 32 mm e segue faixas da ISO 6020-2, e as hastes da cintura e do antebraço do robô têm perto de 10 a 16 mm. O rosto humano é forma orgânica, que a lista de famílias de objetos põe na fase posterior, e nenhuma ferramenta de hoje carrega intenção regional de rosto.

Dois limites não foram medidos. A maior montagem do acervo tem 62 instâncias e o robô passa de 100 (só as mãos têm 30 falanges), e o tempo da auditoria de interseções nessa escala é desconhecido. O `paineisPorVaos` foi provado em chapa aberta e em cuba, e o corte de painel numa casca tubular fechada em volta, como a coxa, não foi medido.

Um achado de processo: `docs/modelar/pesquisas/FERRAMENTAS-POR-OBJETO.md` diz que casca de forma livre não existe, e a `subdivisao` com `espessura` a entrega. O `ferramentas:check` confere que todo objeto tem ferramentas, e não confere a coluna do que já existe contra o catálogo; a correção do dado e a conferência que falta vão ao backlog por este plano.

## Resultado

O robô humanoide inteiro montado na bancada como montagem v5, com cada junta declarada e o curso conferido, começando por um braço completo que mede, antes de qualquer ferramenta nova, quais das cinco lacunas travam o trabalho.

## Veredito: onde investir

A recomendação é a combinação, em ordem: modelar com o que existe, corrigir a camada de montagem onde a medida mandar, e só depois promover formas recorrentes a famílias.

Investir no núcleo de formas não se sustenta nos fatos: nenhuma parte do robô, fora o rosto, ficou sem operação, e `procedural/nucleo/operacoes/` é território do plano ativo do núcleo para quem escreve receita. O custo seria alto e o risco é construir operação sem peça que a peça.

Um módulo de robôs também não se sustenta como primeiro passo. O que falta (instância espelhada, ângulo de junta com cadeia, cabo entre portas) serve a veículos, máquinas e móveis tanto quanto a robôs: a pesquisa de ferramentas por objeto conta articulações em 95 objetos e cabo em 49. Resolver isso dentro de um módulo de robô poria numa pasta de domínio o que a regra do contrato manda para a ferramenta geral. O custo de começar seria baixo e o risco é duplicar a montagem.

O que é próprio de mecanismo antropomorfo entra como família, com nome geral, depois de feito à mão duas vezes: a junta de disco (ombro e quadril), o elo articulado em série (falange e vértebra) e o atuador fino como opção declarada da família `cilindro-hidraulico`. As famílias do acervo nasceram assim, e a prova das famílias de desenho de 2026-10-14 mostrou que uma referência só não basta para fixar a faixa de uma família.

## Decomposição em formas recorrentes

| Forma | Onde aparece | Com que se faz hoje | Qualidade esperada | O que falta |
|---|---|---|---|---|
| Casca ou placa | peito, costas, pélvis, coxa, canela, braço, antebraço, crânio | gaiola (`gaiolaPorEstacoes`, `gaiolaPorLacos`) e `subdivisao` com `espessura`; `paineisPorVaos`; `aberturaPorContorno` | boa, a mesma técnica da lataria do sedã e do furgão | o rebaixo de fundo fechado dos painéis do peito e das costas depende do plano do rebaixo por contorno, em rascunho; painel em casca tubular não medido |
| Junta de disco | ombro, quadril, laterais do cotovelo e do joelho | `lathe`, `furo`, `arranja` radial, portas de cilindro e anel, `articulacao` de revolução | boa, provada nos anéis do braço industrial | ângulo declarado e cadeia; família só depois de duas juntas feitas |
| Mecanismo de garfo | cotovelo, joelho, punho, tornozelo | `unir`, `subtrair`, `arredondarCostura`, `furoPassante`, `gaiolaPorLacos` | boa, com custo alto de passos por peça | nada de forma |
| Atuador linear | hastes da cintura, do antebraço e da canela | família `cilindro-hidraulico`, ou `lathe` de camisa e haste | boa em 32 mm ou mais | opção de diâmetro fino na família; ligar as duas pontas a portas |
| Elo repetido | vértebras, falanges, anéis do pescoço | uma receita e uma instância por elo na montagem | boa, com a montagem escrita à mão | repetição de instância ao longo de uma linha; cadeia de juntas |
| Cabo | cintura, pescoço, ombro | `gaiolaVarrida` com trilho de pontos e raio, seção fechada | boa como tubo de pontas digitadas | pontas presas a portas de duas peças, feixe e terminal |
| Rosto | cabeça | `gaiolaPorRede` com curvas de feição, olhos por `lathe` | incerta; nenhuma peça orgânica foi feita | decisão da pessoa sobre o nível; ferramenta orgânica é da fase posterior |
| Par esquerdo e direito | braços, pernas, mãos, pés, placas | segunda receita com a tabela espelhada, ou `espelha` dentro da receita | funciona, com pasta duplicada por parte | instância espelhada na montagem |

Material: as cascas claras e as peças escuras usam materiais lisos escolhidos por peça na receita. O trançado de fibra de carbono seria textura nova e fica fora, à espera do plano da ferramenta de material.

## Duas ideias da pessoa, com o veredito

A primeira ideia é começar por um esqueleto simples, com as juntas e a caixa aproximada de cada parte tiradas da altura total, iterar a proporção nele, fazer cada parte nascer amarrada às juntas e comparar a cada rodada o planejado com o executado. O veredito é ajustar: a ideia entra, sobre o que já existe, sem lista nova. O repositório já tem esse esqueleto com outro nome, o andaime da forma global N2 (`docs/modelar/contratos/CONTRATO-FORMA-GLOBAL-N2.md`): um arquivo com envelope, pontos de referência, um volume por parte e portas. A receita declara em `REFINA.partes` qual volume cada parte refina, e o `npm run descrever` e a `guarda:acervo` recusam a parte que sai da caixa do volume e a porta que a peça moveu ou deixou de publicar. O avião do acervo foi feito assim, com um `andaime.json` de 110 volumes para as partes todas. `RAZOES` na receita confere proporções entre medidas, e o esboço 2.0 mostra opções de proporção lado a lado para a pessoa escolher. A montagem v5 dá a outra metade: a parte nasce na porta da vizinha pelas `posicoes` e herda a medida pelos `vinculos`.

Faltam três coisas, medidas nesta pesquisa. O gerador do andaime saiu com o esboço antigo em 2026-11-05, e hoje o arquivo é escrito à mão; para o robô ele sairia de uma tabela de proporções vezes a altura. A caixa do volume limita a parte só por cima, como o próprio guia de autoria registra, e por isso a parte pequena demais dentro da caixa passa; a comparação pedida precisa medir o desvio da caixa executada contra a planejada nos dois sentidos. A conferência é por receita, e não li nenhuma que acuse, no conjunto, o volume do andaime que nenhuma parte da montagem refina, que é a parte esquecida; esse ponto fica a confirmar na fatia 2 antes de escrever a régua. O ajuste em relação à proposta de usar a própria montagem v5 como esqueleto é pequeno: a montagem v5 não guarda caixa, e o andaime guarda caixa e porta e já tem quem o confira, de modo que o esqueleto é o andaime e a régua nova cruza os volumes dele com as etapas da montagem.

O custo é baixo a médio e fica em `tools/modelar/` e na pasta da peça, sem tocar no núcleo: o `andaime.json` do braço escrito na fatia 1, e a régua do planejado contra o executado (caixa nos dois sentidos, posição de cada junta, volume sem parte) na fatia 2, como validação do braço. O gerador por tabela de proporções só vira ferramenta geral na fatia 4, se o braço mostrar que escrever o andaime à mão custa. O risco é a proporção vir de imagem de IA, que não vale como medida, e por isso a tabela é declarada e aprovada pela pessoa nas opções lado a lado. O esqueleto é conferência e ponto de partida de posição, e não base de forma: a blocagem como base de carroceria foi reprovada no registro de 2026-11-13 e não volta por aqui.

A segunda ideia é a pré-modelagem para robôs futuros, com famílias paramétricas de componentes e esqueletos-modelo. O veredito é aceitar o mecanismo e ajustar o momento e a lista. O mecanismo é o de `procedural/familias/`, com contrato próprio (`docs/modelar/contratos/CONTRATO-DA-FAMILIA.md`), teste e aprovação da pessoa por família. O momento é a segunda ocorrência do componente feito à mão, para os parâmetros saírem de duas peças medidas e não de suposição. O dedo de falanges chega à segunda ocorrência dentro do próprio braço, que tem cinco, e pode virar família no fim da fatia 2. A junta de disco chega no quadril e a vértebra no pescoço, ambas na fatia 5. O atuador linear já é família, e o que entra é a opção de diâmetro fino. O cabo é ferramenta geral de montagem, tratada na fatia 4, e não família. A placa de armadura com costura fica recusada como família: cada placa tem forma livre própria, e o que se repete é a técnica (gaiola, `subdivisao` com espessura e `paineisPorVaos`), que cabe numa ficha de capacidade ou num trecho do guia de autoria. Dos esqueletos-modelo, o humanoide sai deste robô como a tabela de proporções com o andaime, depois de aprovado. O de braço e o de quadrúpede ficam recusados por agora, porque nenhum objeto em plano os pede e o backlog não autoriza implementação. O custo é médio por família (declaração, derivação, geometria, teste e aprovação), e o risco é fixar a faixa de parâmetros cedo demais, o que a regra da segunda ocorrência reduz.

## Filtro Agent-First

- `subdivisao` com `espessura`, `gaiolaPorLacos`, `gaiolaPorEstacoes`, `paineisPorVaos`, `lathe`, booleanas e `gaiolaVarrida`: USAR DIRETO. A intenção já se escreve em medidas e a recusa diz o passo.
- Posição por porta e `articulacao`: USAR DIRETO na fatia 2, com o ângulo de cada junta resolvido pelas referências das portas, para medir o custo. Se a medida confirmar, REFATORAR na fatia 4 para o ângulo ser campo declarado e a junta de jusante acompanhar.
- Pose de instância: REFATORAR na fatia 4 para aceitar a instância espelhada, com o determinante declarado e a normal das faces conferida, se a fatia 2 mostrar a duplicação de receitas.
- Cabo entre portas: ENVOLVER `gaiolaVarrida` num vínculo de posição de porta, na fatia 4, ou ADIAR com o cabo de pontas digitadas se o braço não o pedir.
- Andaime N2 com `REFINA`: USAR DIRETO como esqueleto do braço; a régua do planejado contra o executado é ENVOLVER sobre ele e sobre as etapas da montagem.
- Família de dedo, de junta de disco e de vértebra: ADIAR até a segunda ocorrência feita à mão.
- Operação nova de forma no núcleo e módulo de domínio para robôs: ADIAR sem data; nenhum fato os pede.

## Incluído

A rodada de alinhamento com a pessoa pela skill `alinhar-modelagem`, com a escala, a lista de partes, a pose e o nível do rosto. O braço direito completo, do disco do ombro à mão, como montagem v5 em `procedural/pecas/robo-humanoide/`, com as ferramentas de hoje. O relatório de atritos do braço em `docs/modelar/banco-de-provas/robo-humanoide-2026-11-14/`, com passos, tempos e o que foi escrito à mão. As correções gerais de montagem que o relatório confirmar, cada uma com fixture neutra em `tools/fixtures/`. As linhas de backlog do achado de processo sobre a pesquisa de ferramentas por objeto.

## Excluído

Operação nova de forma no núcleo. Módulo ou pasta de domínio para robôs fora de `procedural/pecas/`. Textura de fibra de carbono e qualquer material fora da paleta. Solver de cinemática, espaço varrido contínuo e dinâmica. Rosto humano realista antes da decisão da pessoa. Tronco, pernas e cabeça, que entram por continuação deste plano depois do ponto de decisão da fatia 3. Qualquer imagem de referência dentro do repositório.

## Invariantes

O núcleo não conhece robô nem outro objeto. Toda montagem do acervo resolve com o mesmo resultado de antes, e a montagem sem os campos novos é lida igual. A mesma receita dá a mesma malha. A forma é aprovada pela pessoa por imagem, e nenhuma medida a aprova sozinha.

## Fatias

1. Alinhamento e esqueleto. A pessoa fixa a altura do robô, que vira a escala, a lista de partes, a pose de repouso e o nível do rosto, e escolhe a proporção entre opções de esqueleto mostradas lado a lado pelo esboço 2.0. O esqueleto aprovado do braço é gravado como `andaime.json`, com um volume em caixa por parte e uma porta por junta. As proporções saem de uma tabela declarada em milímetro, porque a imagem de IA não vale como medida. Saída: o `ALINHAMENTO.md` da peça.
2. Braço com o que existe. Disco do ombro, casca do braço, cotovelo de garfo e discos, casca do antebraço com as hastes, punho, palma e os cinco dedos de três falanges, cada parte numa receita, com portas publicadas, montagem v5 e uma `articulacao` por junta. Nenhuma ferramenta de forma nem de montagem muda. Cada receita declara em `REFINA.partes` o volume do esqueleto que refina, e a régua do planejado contra o executado (caixa nos dois sentidos, posição de cada junta e volume sem parte) entra em `tools/modelar/` depois de conferido o que o `descrever` já acusa. Validações: essa régua a cada rodada, `guarda:acervo` na pasta, `npm run etapas -- <montagem> --auditar` sem invasão não declarada, o curso de cada junta conferido, a régua de espessura do `descrever` nas cascas, `vaoEntrePartes` nos painéis e a aprovação da pessoa por imagem a cada etapa. Saída: o braço aprovado e o relatório de atritos.
3. Ponto de decisão. A pessoa lê o relatório e decide quais lacunas de montagem entram, com a recomendação do relatório.
4. Montagem geral, só o que a fatia 3 aprovar. Instância espelhada, com a prova de que o braço esquerdo sai da mesma receita e de que as normais ficam para fora; ângulo de junta declarado com as peças de jusante acompanhando, com a prova de que a pose de repouso do braço sai de seis números; cabo com as pontas em portas de duas instâncias. Cada item pede fixture neutra, teste, recusa com a medida, e o revisor adversarial antes de integrar, porque mexe em formato salvo.
5. Continuação, em plano ou emenda aprovada pela pessoa: tronco com placas, vértebras, atuadores e cabos; pélvis, pernas e pés com apoio no chão; pescoço e cabeça. A promoção a família vem na segunda ocorrência de cada componente: o dedo de falanges no fim da fatia 2, a junta de disco no quadril e a vértebra no pescoço. O esqueleto-modelo de humanoide sai da tabela de proporções aprovada, no fim.

## Gate de saída

1. O braço direito inteiro resolve como montagem v5, com todas as etapas fixas pela pessoa, sem par não declarado em invasão e com o curso de cada junta conferido.
2. O relatório de atritos traz, por lacuna, a medida que a confirma ou descarta: receitas duplicadas por espelho, números escritos à mão por pose, tempo da auditoria por número de instâncias.
3. Cada correção de montagem que entrar tem fixture sem domínio, teste, recusa com a medida e as montagens do acervo com o mesmo resultado.
4. Cada achado do relatório responde se o processo o teria pego sozinho, e o que faltar vira gate, campo ou instrução.
5. `npm run gates` verde e a decisão Agent-First registrada para cada interface tocada.

## Riscos e parada

O número de instâncias pode tornar a auditoria de interseções lenta demais; se a mão sozinha, com 16 instâncias, passar de 60 s na auditoria, a fatia 2 para e o tempo vira a primeira correção. O painel em casca tubular pode recusar no `paineisPorVaos`; nesse caso a casca do braço sai em duas metades de chapa aberta e o achado vai à ferramenta. A instância espelhada muda o formato salvo da montagem e inverte o sentido das faces; sem a prova de normais para fora e de leitura igual das montagens antigas, ela não entra e o par continua em duas receitas. O rosto pode não fechar em forma aceitável com subdivisão; se duas rodadas do laço não convergirem, ele fica como máscara lisa e a forma orgânica volta ao backlog. O plano para se a fatia 2 pedir operação nova de forma no núcleo, porque isso contradiz o inventário e pede revisão do veredito com a pessoa.

## Decisões da pessoa

Decidido em 2026-11-14, com as seis recomendações aprovadas. O robô tem 1.750 mm de altura, e as proporções saem de uma tabela declarada em milímetro. O rosto é máscara lisa com olhos e linhas de painel, e o rosto humano fica fora deste plano. A pose de repouso é a de braços levemente abertos, como na referência. As mãos entram com os cinco dedos articulados já no primeiro braço. O painel escuro fica em material liso até o plano da ferramenta de material. O plano foi ativado agora.

Duas decisões continuam pendentes, e a pessoa ainda não as viu. A primeira é se a régua do planejado contra o executado entra já na fatia 2 ou se o braço usa só a conferência de caixa que existe; a recomendação é entrar já, porque é ela que acusa a parte pequena demais e a parte esquecida. A segunda é se o dedo de falanges vira família no fim do braço; a recomendação é que sim, porque o braço dá cinco ocorrências medidas. Até a resposta, a fatia 2 começa pelas partes e não escreve a régua nem a família.

## Fechamento

Preencher somente ao concluir ou cancelar.
