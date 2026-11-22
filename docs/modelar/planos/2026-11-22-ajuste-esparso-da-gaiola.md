# Ajuste esparso da gaiola: a subdivisão de uma chapa grande em segundos e sem estourar a memória

**Estado:** ativo

**Território:** `procedural/nucleo/subdivisao.js`, `procedural/nucleo/algebra-esparsa.js`, `procedural/nucleo/algebra-esparsa.test.mjs`, `procedural/nucleo/subdivisao.test.mjs`, `procedural/nucleo/medidas-com-peso.test.mjs`, `procedural/nucleo/operador-das-medidas.test.mjs`, `procedural/nucleo/subdivisao-energia-de-curvatura.test.mjs`, `procedural/nucleo/memoria-de-pura.test.mjs`, `procedural/nucleo/operacoes/subdivisao.js`, `procedural/nucleo/uso-operacoes.js`, `tools/testes-lentos.mjs`, `tools/fixtures/ajuste-esparso/`, `docs/modelar/banco-de-provas/ajuste-esparso-2026-11-22/`

Ativado pela pessoa em 2026-11-22, depois da revisão adversarial do rascunho, cujas correções estão no texto. O plano da [superfície de produção (G2)](2026-11-22-superficie-de-producao-g2.md) vem depois deste, porque muda o mesmo arquivo do núcleo.

**Responsável:** a IA da sessão implementa e mede; a pessoa decide os pontos marcados nas fatias.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-22.

## Problema observado

A `subdivisao` ajusta a gaiola às medidas das curvas num sistema linear montado e fatorado como matriz densa (`ajustarComPesoSemMemoria`, `ajustarGaiolaAsMedidas` e `operadorDasMedidas` em `procedural/nucleo/subdivisao.js`, com `fatorarLU` e `resolverLU`). O ensaio de escala do carro (`docs/modelar/banco-de-provas/carro-fastback-2026-11-14/`) mediu, na lataria do quarto traseiro com a rede cada vez mais densa, o tempo crescendo com expoente 3,1 sobre os vértices e a memória com 2,0. A pessoa escolheu em 2026-11-22 manter a chapa só e trocar o ajuste por um solver esparso, em vez de partir a lataria nas frestas.

O perfil da execução com passo 70 (30 s) põe 55% do tempo em `resolverLU` e 23% no laço que soma as colunas, os dois na conferência do ganho, que resolve o sistema uma vez por medida; a fatoração leva 10%. A revisão mediu a estrutura desse sistema. Com passo 70 são 4.255 incógnitas na gaiola espelhada, 4.255 medidas, todas com peso 1, e nenhuma cota exata nem energia de curvatura. A matriz é H = I + Σ W̃ᵀW̃, simétrica, com 24 não nulos por linha, estritamente diagonal dominante (margem mínima 0,475), e o pivô parcial não troca nenhuma linha: ela é positiva definida.

O expoente 3,1 vem da ordem dos vértices que a `gaiolaPorRede` entrega, com as imagens do espelho no fim, o que deixa a banda em 4.107 de 4.255. Uma grade comum do mesmo tamanho resolve em 5,8 s contra 27 s. A memória quadrática vem da matriz montada cheia, do vetor denso de `sensibilidade` guardado por medida, das colunas guardadas da conferência, da `inversa` do ajuste exato e das matrizes densas do operador.

## Resultado

O quarto traseiro com passo 35 (5.162 vértices na meia gaiola, 10.220 incógnitas), que tem o tamanho que o carro inteiro terá com o passo de hoje, executa a subdivisão em menos de 60 s. O ajuste acrescenta menos de 400 MB ao pico da mesma execução sem medidas, que é de 1.208 MB. A gaiola ajustada é a do solver denso dentro da tolerância declarada abaixo, e as recusas são as mesmas.

## Filtro Agent-First

USAR DIRETO a assinatura de `ajustarGaiolaAsMedidas`, `ajustarGaiolaAsMedidasComPeso` e `operadorDasMedidas`: quem escreve receita não muda nada. REFATORAR a montagem e a fatoração para uma álgebra esparsa num módulo próprio do núcleo, determinística e sem dependência nova. `fatorarLU` e `resolverLU` continuam exportados, porque `limiteDoDardo`, as fixtures de correção de superfície e um teste bit a bit os usam. ADIAR qualquer opção nova de receita: a conferência do ganho continua obrigatória e com as mesmas recusas.

## Incluído

- a álgebra esparsa: matriz por linhas, ordenação de grau mínimo com desempate por índice, Cholesky esparso para o sistema positivo definido e substituição que aproveita o lado direito esparso;
- a montagem esparsa e a `sensibilidade` esparsa (as linhas p·W̃ᵢ e os vetores unitários) nas três funções do ajuste;
- a conferência do ganho pela cota superior rigorosa de Varah para matriz estritamente diagonal dominante, ‖A⁻¹‖∞ ≤ 1/minₖ(|aₖₖ| − Σⱼ|aₖⱼ|), em tempo linear nos não nulos. Com a cota até `GANHO_MAXIMO_DAS_MEDIDAS`, a recusa é impossível e a conta exata é dispensada; acima dela roda a conta exata, e os pontos da recusa saem de uma resolução com a transposta na linha do pior vértice. No carro com passo 70 a cota dá 3,25, contra o ganho exato de 0,716 e o limite de 100. O campo `ganho` devolvido passa a ser a cota quando a conta exata não roda, e isso é declarado na ficha;
- o sistema de ponto de sela (cotas exatas, sem diagonal nas linhas delas) e o ajuste só com cotas exatas, não simétrico, por LU esparso com pivô por limiar ou por complemento de Schur, decidido pela medida da fatia 3;
- a fixture neutra de gaiola grande gerada pela própria `gaiolaPorRede`, com `simetria: 'x'` e todo ponto medido com peso, que reproduz a ordem e a banda do carro;
- o teste de escala, que conta operações (as visitas da ordenação e os não nulos do fator vezes as resoluções) entre dois tamanhos da fixture e reprova acima do expoente declarado de 2,3, o gate que faltou e que pegaria o problema;
- o ensaio do carro refeito.

## Excluído

- partir a lataria nas frestas e qualquer mudança na receita do carro, que segue no plano do carro;
- a ondulação da chapa (G2), que é do plano da superfície de produção;
- os vãos e as regiões da lataria, que refazem a booleana da chapa inteira: ficam medidos no ensaio e, se forem o próximo gargalo, vão ao backlog com o número;
- trocar o funcional do ajuste, porque o sistema resolvido é o mesmo;
- converter as fixtures de protótipo que usam `fatorarLU`, que continuam densas.

## Invariantes

Sem energia de curvatura, a gaiola ajustada é a do denso a 1e-9 m em toda fixture, teste e peça do acervo com subdivisão. Com energia, o próprio denso muda além disso quando só a ordem dos índices muda: renumerando uma grade de 24 por 20, a diferença foi 7,3e-13 m com a onda padrão, 1,3e-9 m com 16 passos e 6,2e-6 m com 64 passos. A tolerância ali é dez vezes o piso medido do denso contra o denso renumerado no mesmo caso, e as cotas exatas continuam a `TOLERANCIA_DAS_MEDIDAS`.

As recusas por ganho e por cota fora da tolerância nomeiam os mesmos pontos. A recusa por sistema singular passa a nomear a união de uma base inteira do núcleo do sistema. Hoje os pontos nomeados dependem da ordem de eliminação: com dois cubos de vértices todos exatos, a ordem natural nomeia de 0 a 7 e a trocada de 8 a 15. A mudança é declarada na ficha e travada pelo teste dos dois cubos. A saída é determinística, bit a bit, em qualquer máquina com o mesmo Node, porque o desempate da ordenação é por índice e não há soma paralela. A memoização por argumentos (`memoizarPura`) continua.

## Gate de saída

1. No quarto traseiro com passo 35 (pelo ensaio com a variante da receita) a subdivisão executa em menos de 60 s, e o ajuste acrescenta menos de 400 MB sobre o pico da mesma execução sem medidas, medidos no banco de provas.
2. A igualdade com o denso, nas tolerâncias das invariantes, passa nos testes da subdivisão, das medidas com peso, do operador, da energia de curvatura e do friso. O `retrato:acervo` gravado antes da fatia 2 compara igual depois, nas peças com subdivisão e medidas.
3. O teste de escala entra no gate, contando operações, e reprova o solver denso.
4. Na lataria do carro com passo 70, o denso e o esparso dão a mesma superfície na mesma receita: a medida da rodada passa sem mudar os `PONTOS`, e a malha difere abaixo de 1e-9 m.
5. `npm run gates` verde e o CI verde.

## Fatias

1. Linha de base. A fixture gerada pela `gaiolaPorRede`, com o expoente medido perto de 3,1 no denso. O teste do piso de ruído por renumeração e o dos dois cubos. A razão entre os não nulos do fator e os da matriz, medida para calibrar a parada. O `retrato:acervo --gravar`. Saída: a lei de custo da fixture e o retrato gravado.
2. O caminho positivo definido, que é o do carro: montagem e sensibilidade esparsas, Cholesky esparso com ordenação de grau mínimo e o ganho pela cota de Varah, com a conta exata e a resolução pela transposta quando a cota passa do limite. Saída: a igualdade a 1e-9 m e o quarto traseiro com passo 35 medido.
3. O ponto de sela e o ajuste só com exatas: LU com pivô por limiar ou complemento de Schur, pela medida do preenchimento na fixture com cotas exatas. A `inversa`, as matrizes do operador e o `vetorNulo` passam a esparsos, e a recusa do singular passa a nomear a base do núcleo.
4. A prova no carro: o ensaio refeito, o denso contra o esparso na mesma receita e o retrato comparado. Ponto de decisão da pessoa se a lataria mudar além da tolerância em algum lugar.
5. Fechamento: o teste de escala no gate, antes e depois no banco de provas, a ficha da subdivisão com o custo e com o novo sentido do `ganho` e da recusa do singular, e o plano do carro avisado de que a chapa inteira cabe.

## Riscos e parada

A parada pelo preenchimento é calibrada na fatia 1: se no ponto de sela o fator passar de três vezes a razão medida no caso positivo definido, a fatia 3 usa complemento de Schur. Se a igualdade com o denso não chegar à tolerância declarada numa peça do acervo, parar e levar o caso à pessoa, sem relaxar a tolerância. Se a memória do quarto com passo 35 passar do limite com o fator esparso, parar antes da fatia 3 e medir onde está o pico. O CI roda de duas a três vezes mais devagar que a máquina local, e o teste de escala conta operações para não depender do relógio.

## Andamento

Fatia 1 feita em 2026-11-22, com as medidas em `docs/modelar/banco-de-provas/ajuste-esparso-2026-11-22/`. A gaiola de prova gerada pela rede reproduz a banda do carro, que cresce na proporção das incógnitas, e o custo absoluto dele (26,7 s com 4.845 incógnitas). O expoente do ajuste dá 2,6 a 2,8 contra o 3,1 que o carro mediu no passo inteiro da subdivisão. Como o gate mede o carro direto, a diferença fica registrada sem mudar a fatia 2. O preenchimento da eliminação de hoje vai de 17 a 41 vezes os não nulos de H. Os testes do piso de ruído pela ordem e dos dois cubos estão em `procedural/nucleo/subdivisao.test.mjs`, e o retrato das doze peças com subdivisão está gravado. A linha do limite (`linhasDoLimite`) passou a ser exportada pelo núcleo, para medir a estrutura do sistema.

Fatia 2 feita em 2026-11-22. O ajuste com peso sem cota exata e o operador no mesmo caso passaram ao Cholesky esparso de `procedural/nucleo/algebra-esparsa.js`, com a eliminação densa como reserva quando o Cholesky para. A ordenação é o grau mínimo aproximado do AMD, sem supervariáveis, porque a de grau exato levava 95% do ajuste com 10.795 incógnitas e crescia com expoente perto de 2,8. O ganho sai da cota de Varah quando ela fica até o limite, e o resultado traz `ganhoPelaCota`. A referência densa ficou exportada como `ajustarGaiolaAsMedidasComPesoDenso`, para os testes e para o teste de escala da fatia 5. A gaiola difere da densa em até 5e-18 m na gaiola de prova, os testes de igualdade com e sem energia estão em `subdivisao.test.mjs` e o retrato das doze peças comparou igual. No carro com passo 35 a subdivisão leva 10,6 s e o pico não sobe, e o gate 1 passa. O preenchimento do caso positivo definido, que calibra a parada da fatia 3, vai de 4,7 a 8,4 vezes a metade de baixo de H.

O custo da ordenação de grau exato não seria pego pelo teste de escala como a fatia 5 o descrevia, porque ele contava só os não nulos do fator vezes as resoluções. O teste passa a contar também o trabalho da ordenação (as visitas às listas de variáveis e de elementos), além das operações do fator.

Fatia 3 feita em 2026-11-22. A medida da parada decidiu o complemento de Schur para o ponto de sela, porque o LU esparso do sistema inteiro encheu de 6,5 a 20 vezes a razão do caso positivo definido. O ajuste só com exatas e o operador exato passaram ao LU esparso com pivô por limiar, que ali enche como o Cholesky. Com a energia de curvatura o Schur pedia dois passos de refinamento iterativo para ficar nas tolerâncias. A recusa do singular nomeia a base do núcleo, e o teste dos dois cubos perdeu a marca CONHECIDA. A eliminação densa ficou só como reserva para quando o Cholesky de H para e como referência dos testes. Só duas peças do acervo usam o ajuste, o carro e a carenagem de prova, e nenhuma usa o ponto de sela, cujo ganho exato é o próximo gargalo (4,6 s com 3.577 incógnitas), medido no banco de provas e não atacado.

Fatia 4 feita em 2026-11-22. Na lataria do carro, a mesma receita pelo esparso e pelo denso dá gaiolas a 1e-14 m e malhas a 6e-15 m, a medição da rodada passou sem mudar os `PONTOS` e a ferramenta reconhece a malha que o crítico julgou na rodada 7. O retrato das doze peças comparou igual. O ponto de decisão da pessoa não chegou a ser preciso, porque nada mudou além da tolerância.

## Fechamento

Preencher ao concluir ou cancelar: estado final, commit e PR, gates, resultado observado e candidatos devolvidos ao backlog.
