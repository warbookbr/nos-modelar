# Ajuste esparso da gaiola: a subdivisão de uma chapa grande em segundos e sem estourar a memória

**Estado:** rascunho

**Território:** a declarar ao ativar: `procedural/nucleo/subdivisao.js`, `procedural/nucleo/algebra-esparsa.js`, `procedural/nucleo/algebra-esparsa.test.mjs`, `procedural/nucleo/subdivisao.test.mjs`, `procedural/nucleo/operador-das-medidas.test.mjs`, `tools/fixtures/ajuste-esparso/`, `docs/modelar/banco-de-provas/ajuste-esparso-2026-11-22/`.

**Responsável:** a IA da sessão implementa e mede; a pessoa ativa o plano e decide os dois pontos marcados nas fatias.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-22.

## Problema observado

A `subdivisao` ajusta a gaiola às medidas das curvas num sistema linear montado e fatorado como matriz densa (`ajustarComPesoSemMemoria`, `ajustarGaiolaAsMedidas` e `operadorDasMedidas` em `procedural/nucleo/subdivisao.js`, com `fatorarLU` e `resolverLU`). O ensaio de escala do carro (`docs/modelar/banco-de-provas/carro-fastback-2026-11-14/`) mediu o custo na lataria do quarto traseiro com a rede cada vez mais densa: o tempo cresce com expoente 3,1 sobre os vértices e a memória com 2,0. A chapa do carro inteiro, de 4.300 a 5.000 vértices na meia gaiola, levaria de 4,3 a 6,8 minutos e de 3,8 a 5,1 GB só na subdivisão, a cada execução que muda a forma. A pessoa escolheu em 2026-11-22 manter a chapa só e trocar o ajuste por um solver esparso, em vez de partir a lataria nas frestas.

O perfil de CPU da execução de 2.161 vértices (30 s) diz onde vai o tempo: 55% em `resolverLU` e 23% no laço que soma as colunas, os dois na conferência do ganho, que resolve o sistema uma vez por medida para achar o pior vértice; a fatoração leva 10%. A matriz `A` é montada cheia, n por n, e as colunas da conferência ficam guardadas inteiras, medida por vértice: as duas dão a memória quadrática. A matriz já é esparsa (cada medida só pesa a estrela do seu ponto, e a energia de curvatura só liga vizinhos), e a fatoração atual pula os zeros, mas elimina na ordem dos índices, sem ordenação que reduza o preenchimento.

## Resultado

A subdivisão da lataria do carro inteiro, com 5.000 vértices na meia gaiola, executa em menos de 60 s e com pico abaixo de 1,5 GB, com a mesma gaiola ajustada que o solver denso dá, a 1e-9 m, e as mesmas recusas de sistema singular, mal condicionado e fora da tolerância.

## Filtro Agent-First

USAR DIRETO a assinatura de `ajustarGaiolaAsMedidas`, `ajustarGaiolaAsMedidasComPeso` e `operadorDasMedidas`: quem escreve receita não muda nada, e a troca fica dentro do núcleo. REFATORAR a montagem e a fatoração, para uma álgebra esparsa num módulo próprio do núcleo, determinística, sem dependência nova, testada contra a densa. ADIAR qualquer opção nova de receita (escolher solver, ligar ou desligar a conferência): a conferência do ganho continua obrigatória. ADIAR o estimador da norma no lugar da conta exata do ganho, que é o segundo ponto de decisão da pessoa.

## Incluído

- a álgebra esparsa do núcleo: matriz por linhas, ordenação que reduz o preenchimento (determinística, por índice no empate), fatoração LU com pivô parcial por limiar e substituição;
- a montagem esparsa nas três funções do ajuste e no sistema da energia de curvatura;
- a conferência do ganho sem guardar as colunas, com a soma das linhas feita enquanto cada coluna sai, e a segunda passada só quando ela reprova, para nomear os pontos;
- uma fixture neutra de gaiola grande e escalável (uma rede de retalhos sobre uma superfície curva, sem objeto), com o teste que compara o esparso ao denso;
- o teste de escala, que reprova quando o custo entre dois tamanhos da fixture cresce mais que o expoente combinado: é o gate que faltou, porque nenhum gate media como o custo cresce;
- o ensaio de escala do carro refeito com o solver novo.

## Excluído

- partir a lataria nas frestas e qualquer mudança na receita do carro, que segue no plano do carro;
- a ondulação da chapa de subdivisão (o G2 de produção), que é outra linha do backlog;
- os vãos e as regiões da lataria, que refazem a booleana da chapa inteira e somam outro tanto de tempo: ficam medidos no ensaio e, se forem o próximo gargalo, voltam ao backlog com o número;
- trocar o algoritmo do ajuste (outro funcional, outra energia): o sistema resolvido é o mesmo.

## Invariantes

A gaiola ajustada é a do solver denso a 1e-9 m em toda fixture e peça do acervo que usa subdivisão. As recusas continuam as mesmas, com os mesmos pontos nomeados: singular, ganho acima de `GANHO_MAXIMO_DAS_MEDIDAS` e medida exata fora de `TOLERANCIA_DAS_MEDIDAS`. A saída é determinística: a mesma entrada dá os mesmos números, bit a bit, em qualquer máquina com o mesmo Node. A memoização por argumentos (`memoizarPura`) continua.

## Gate de saída

1. A subdivisão da fixture grande e a do carro inteiro (pelo ensaio com `--params`) executam com 5.000 vértices na meia gaiola em menos de 60 s e pico abaixo de 1,5 GB, medidas no banco de provas.
2. O teste que compara o esparso ao denso passa a 1e-9 m em todos os testes da subdivisão, do friso, do operador das medidas e da energia de curvatura, e o `guarda:acervo` passa.
3. O teste de escala entra no gate e reprova o solver denso, como prova de que pegaria o problema.
4. A lataria do carro fica com as mesmas imagens: a medida da rodada passa sem mudar os `PONTOS`, e a conferência de refino contra a rodada 7 dá deslocamento abaixo de 0,01 mm.
5. `npm run gates` verde e o CI verde.

## Fatias

1. Linha de base. A fixture neutra de gaiola grande, o ensaio de escala dela no banco de provas com o solver denso, e o teste de escala, que nesta fatia fica marcado como falha esperada. Saída: a lei de custo da fixture, que deve bater com a do carro.
2. A álgebra esparsa e a montagem esparsa nas três funções, com a densa mantida só no teste como referência. Saída: o teste de igualdade a 1e-9 m verde e a fatoração medida na fixture.
3. A conferência do ganho sem guardar colunas. Ponto de decisão da pessoa, só se depois dela a conferência ainda passar de metade do tempo com 5.000 vértices: trocar a conta exata por um estimador da norma (que pode subestimar o ganho por um fator pequeno), ou aceitar o tempo medido.
4. A prova no carro: o ensaio de escala refeito, a medida da rodada da lataria e a conferência de refino contra a rodada 7. Ponto de decisão da pessoa se a lataria mudar além de 0,01 mm em algum lugar.
5. Fechamento: o teste de escala sai de falha esperada, o banco de provas registra antes e depois, a ficha do catálogo da subdivisão diz o custo, e o plano do carro é avisado de que a chapa inteira cabe.

## Riscos e parada

O sistema com medidas exatas é de ponto de sela (as linhas das cotas exatas têm zero na diagonal), e o pivô parcial pode trocar linhas e desfazer a ordenação, enchendo a fatoração. Se na fixture a fatoração esparsa com pivô por limiar passar de 10 vezes os não nulos da matriz, parar e propor eliminar as cotas exatas por complemento de Schur antes de seguir. Se a igualdade com o denso não chegar a 1e-9 m numa peça do acervo, parar e levar o caso à pessoa, sem relaxar a tolerância. Se o retrato do acervo mudar na última casa decimal, ele é regravado só com o desvio medido junto.

## Fechamento

Preencher ao concluir ou cancelar: estado final, commit e PR, gates, resultado observado e candidatos devolvidos ao backlog.
