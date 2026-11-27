# Reduzir polígonos: a malha exportada com menos faces e desvio medido, e as peças pequenas densas na origem

**Estado:** ativo

**Núcleo:** não

**Território:** `tools/modelar/reduzir-malha.mjs`, `tools/modelar/reduzir-malha.test.mjs`, `tools/modelar/exportar-obj.mjs`, `tools/modelar/descrever-peca.mjs`, `tools/modelar/descrever-densidade.test.mjs`, `procedural/pecas/furgao-realista/`, `docs/modelar/banco-de-provas/reduzir-poligonos-2026-11-27/`.

Ativado pela pessoa em 2026-11-27 ("sim, vamos criar o plano"), sobre a recomendação de seguir a análise independente da contagem de polígonos, com teto de 0,05 mm e 2 graus.

**Responsável:** a IA da sessão implementa e mede; a ferramenta nova passa por revisão adversarial, e a forma das peças reduzidas na origem é aprovada pela pessoa por imagem.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-27.

## Problema observado

O furgão realista tem 262.947 faces (cerca de 522 mil triângulos, GLB de 23 MB) e o carro quadrado 135.157 faces (cerca de 262 mil triângulos, GLB de 10 MB), só a carroceria, sem interior nem rodas, medidos com `node tools/modelar/descrever-peca.mjs` em 2026-11-27 (furgão no commit 8c6f3a57, carro no ramo `envio/carro-quadrado-forma`, c51bd9d3). De 49% a 63% da área das chapas é plana e subdividida como a curva, e peças pequenas carregam milhares de faces (o refletor lateral do furgão tem 2.720 faces em 24 × 52 × 144 mm, e cada saia 5 mil). Baixar o nível de subdivisão deforma (até 5,1 mm no carro), e a decimação por quádricas de biblioteca relata um erro menor que o medido (pedidos 0,05 mm, medidos 3,3 mm). Um protótipo de colapso de aresta com teto explícito de distância e de normal, conferido por código separado, levou as duas peças a 41% dos triângulos com desvio máximo medido de 0,05 a 0,09 mm (banco de provas da análise, no scratchpad da sessão, a trazer para a pasta deste plano). Nada no `descrever` avisa densidade nem fração plana.

## Resultado

Um redutor de malha que gera um derivado da malha final para a exportação, com teto de 0,05 mm e 2 graus conferido por medida independente, sem tocar a malha que o núcleo usa para medir, recortar e resolver portas; o `descrever` avisando densidade e fração plana por parte; e as peças pequenas densas do furgão reduzidas na receita, com a forma aprovada pela pessoa.

## Filtro Agent-First

REFATORAR: a densidade sem função custa tempo de execução, tamanho de arquivo e memória a cada rodada de agente e a cada exportação, e a medida que a revela não existe.

## Incluído

- o redutor como função pura sobre a malha neutra: só remove vértices (nenhuma posição nova), trava borda, quina acima de um ângulo, divisa de parte e de material, recusa o colapso que passa do teto de distância ou de normal, triangula pela triangulação do núcleo com guarda de lasca, e é determinístico (a mesma entrada dá o mesmo sha256);
- a conferência independente do redutor: desvio máximo nos dois sentidos por parte, desvio de normal, borda e casca fechada, e o par de imagens de `vistas:superficie` original e reduzida com a diferença;
- o redutor como opção de `exportar:obj`, com a tolerância declarada no comando ou na receita; o `exportar:gltf` está no território do plano dos cabos, que tem prioridade, e recebe a opção depois que esse plano fechar ou por pedido a ele;
- o aviso de densidade (faces por decímetro quadrado) e de fração plana por parte no `descrever`;
- a redução na receita das peças pequenas densas do furgão (refletores, copos, pneus e saias), cada uma com a imagem antes e depois levada à pessoa.

## Excluído

- a subdivisão adaptativa no núcleo, que muda ids de face e o que as booleanas recebem, fica para plano próprio, se o tempo de execução virar o problema;
- o redutor dentro dos `PASSOS` ou na malha que a bancada mede;
- o carro quadrado, enquanto o ramo dele não estiver na main: as borrachas dele entram quando o ramo entrar.

## Invariantes

A malha que o núcleo entrega, as medidas, as portas e o retrato do acervo não mudam; o derivado nunca passa do teto declarado, medido por código que não é o do redutor.

## Gate de saída

1. O redutor com teste nos dois sentidos (o colapso que passaria do teto é recusado; o plano exato reduz sem desvio) e a mesma saída em duas execuções.
2. O furgão exportado reduzido perto de 369 mil triângulos, pela decisão da pessoa de 2026-11-27, com desvio máximo medido até 0,05 mm por parte e 2 graus de normal, e a luz rasante da bancada lado a lado levada à pessoa.
3. O aviso de densidade no `descrever`, testado.
4. As peças pequenas do furgão reduzidas na receita com a forma aprovada pela pessoa, e a contagem antes e depois no banco de provas.
5. Revisão adversarial sem bloqueio; `npm run gates` verde e o CI verde.

## Fatias

1. O redutor e a conferência independente, com o protótipo da análise como ponto de partida, e a medida no furgão.
2. O redutor na exportação e o aviso de densidade no `descrever`.
3. As peças pequenas do furgão na receita, com a pessoa, e o fechamento.

## Riscos e parada

Se o redutor não chegar ao teto com ganho de pelo menos 30% nas chapas, ou se a luz rasante mostrar faceta que a pessoa reprova, ele para e volta à pessoa com as medidas e as imagens. O tempo do protótipo (48 a 148 s) precisa cair para a exportação ser usável; acima de 30 s por peça na exportação, volta à pessoa.

## Decisão da pessoa

Decidido pela pessoa em 2026-11-27 ("sim, vamos criar o plano"): o plano segue a ordem da análise independente, com o redutor como derivado na exportação com teto de 0,05 mm e 2 graus, o aviso de densidade, a redução das peças pequenas na receita e a subdivisão adaptativa para depois.

Decidido pela pessoa em 2026-11-27 ("aceito os 369 mil, pode seguir e enviar"), depois da fatia 1: o furgão reduzido com os dois tetos medidos de verdade fica em 369 mil triângulos, e não nos 215 mil que o protótipo prometia porque deixava a normal passar do teto; o gate de saída 2 passa a ser esse número, e o ganho que falta vem da fatia 3, nas peças pequenas da receita.

## Andamento

Fatia 1, em 2026-11-27 (não fechada: o alvo de 215 mil triângulos não foi alcançado com 2 graus medidos, e volta à pessoa). O redutor `tools/modelar/reduzir-malha.mjs` e a conferência independente (`conferir-reducao.mjs`, no banco de provas) estão feitos e testados nos dois sentidos (`tools/modelar/reduzir-malha.test.mjs`, 9 testes). No furgão, 521.976 triângulos viram 369.202 (29,3% a menos) em 30 s, a mesma saída em duas execuções, desvio máximo de posição 0,0484 mm em todas as 127 partes e normal até 1,55 graus em 126 delas, com a exceção de `refletorLanternaEsquerda` a 3,9 graus; a carroceria cai 52%. A luz rasante, original e reduzida lado a lado, e as medidas por parte estão em [`docs/modelar/banco-de-provas/reduzir-poligonos-2026-11-27/`](../banco-de-provas/reduzir-poligonos-2026-11-27/README.md). A parada de "ganho de 30% nas chapas" não dispara (a carroceria dá 52%), e a de tempo também não (30 s no furgão inteiro); o que fica para a pessoa é decidir entre afrouxar o teto de normal (4 graus dão 357 mil, 6 graus 341 mil triângulos) e reduzir na receita as peças pequenas densas (fatia 3).

## Fechamento
