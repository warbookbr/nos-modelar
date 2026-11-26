# Esqueleto de proporção: bolas nas juntas e bastões nos membros, em 3D, antes de modelar o robô

**Estado:** rascunho

**Núcleo:** não

**Território:** `tools/modelar/esqueleto.mjs`, `tools/modelar/esqueleto.test.mjs`, `tools/fixtures/esqueleto/`, `procedural/pecas/esqueleto-humanoide/`, `docs/modelar/banco-de-provas/esqueleto-de-proporcao-2026-11-26/`, `docs/modelar/ferramentas-por-objeto.json`, `package.json`.

**Responsável:** a IA da sessão ou o agente despachado de cada fatia; a pessoa aprova a proporção por imagem e decide o que está em Decisão da pessoa.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-26.

## Problema observado

Num robô, o erro que custa caro é o de proporção: cada peça sai certa, mas o braço fica comprido, o joelho alto ou o ombro atrás do tronco, e isso só aparece quando as peças se juntam. O plano congelado da [modelagem de robô](congelados/2026-11-14-modelagem-de-robo.md) já pedia começar por um esqueleto e iterar a proporção nele, e deixou parte do caminho pronto: `proporcoes.json` é a fonte única das medidas e gera o `andaime.json` (`npm run proporcoes`), o andaime aceita esfera e cilindro como volume e publica as portas das juntas, `articulacoes.json` declara o curso de cada junta, e `npm run planejado` cruza o andaime com a montagem executada. Falta o que a pessoa pediu em 2026-11-26: escrever o esqueleto de forma fácil, como uma árvore de juntas e comprimentos de membro, e vê-lo em 3D. Hoje o andaime do braço foi escrito à mão, volume por volume, com as coordenadas de cada caixa calculadas fora, e não há como mexer a pose para ver se o pé alcança o chão ou se o braço bate no tronco.

## Resultado

A IA escreve o esqueleto de um robô como uma árvore de juntas (cada uma com o pai, o comprimento e a direção do membro na pose zero, o raio da bola e do bastão e o curso da junta, por número ou por fórmula sobre as medidas de `proporcoes.json`), e um comando gera dali a peça 3D de bolas e bastões, o `andaime.json` com uma porta por junta e o `articulacoes.json`, mostra as vistas em duas ou mais poses e acusa o membro que atravessa outro numa pose declarada; o esqueleto aprovado vira a medida de que o elo entre juntas, as peças do robô e a simulação da mecatrônica leem a posição das juntas e o comprimento dos membros.

## Filtro Agent-First

- `proporcoes.json` e `npm run proporcoes`: ENVOLVER. O esqueleto é mais uma seção dessa fonte única, com as fórmulas que ela já resolve, e não um arquivo de medidas novo.
- `andaime.json` (forma-global N2, com `esfera` e `cilindro`) e `planejado-contra-executado`: USAR DIRETO. O esqueleto gera o andaime; a régua continua comparando o planejado com o executado sem mudança.
- `articulacoes.json` e a extensão de articulação: USAR DIRETO para o curso de cada junta e para pôr o esqueleto numa pose.
- `esbocar-opcoes`: USAR DIRETO para mostrar duas ou três proporções lado a lado quando houver dúvida.
- A peça de bolas e bastões: uma receita que lê o esqueleto gerado e faz esferas e cilindros com as operações de hoje, sem operação nova no núcleo.
- Gerador por tabela de proporções vezes a altura (a proporção humana média como ponto de partida): ADIAR. A pessoa ou a IA escrevem os comprimentos ou as fórmulas; a tabela pronta vem se dois robôs a pedirem.

## Incluído

- o formato da árvore de juntas dentro de `proporcoes.json`, com recusa que diz o campo, o recebido e o esperado;
- `npm run esqueleto`, que confere a árvore, gera o andaime e as articulações e escreve a peça de bolas e bastões;
- as vistas em pose zero e nas poses que o esqueleto declara (sentado, braço erguido, passo), e o aviso de membro que atravessa outro, ou que passa do chão, em cada pose;
- a simetria declarada (o lado esquerdo espelha o direito), para não escrever as medidas duas vezes;
- a prova numa fixture geral de duas juntas e no esqueleto do humanoide inteiro, aprovado pela pessoa por imagem.

## Excluído

- a forma das peças do robô, que é do elo entre juntas, do atuador e das receitas de cada parte;
- a tabela de proporções humanas pronta;
- massa, torque e escolha de motor, que são da mecatrônica e leem o esqueleto aprovado;
- descongelar o plano da modelagem de robô, que só volta com a palavra da pessoa.

## Gate de saída

1. A fixture de duas juntas gera andaime, articulações e peça iguais bit a bit em duas execuções, e a árvore inválida (pai que não existe, ciclo, comprimento negativo, fórmula com medida que não existe) é recusada com o campo e o comando que conserta.
2. Mudar um comprimento em `proporcoes.json` e rodar `npm run esqueleto` move a junta filha e tudo o que pende dela, e `npm run proporcoes` sem `--escrever` acusa o andaime que ficou para trás.
3. Numa pose em que o antebraço atravessa o tronco, o comando avisa o par e a pose; na pose zero do esqueleto aprovado, nenhum aviso.
4. O esqueleto do humanoide inteiro tem a aprovação da pessoa por imagem, em pose zero e em duas poses.
5. `npm run gates` e o CI verdes, e a main andou com cada envio.

## Fatias

1. O formato da árvore, o comando que gera andaime e articulações, e a fixture de duas juntas com os testes de recusa e de determinismo.
2. A peça de bolas e bastões, as vistas por pose e o aviso de membro que atravessa outro ou passa do chão.
3. O esqueleto do humanoide inteiro, com as opções de proporção lado a lado e a aprovação da pessoa por imagem.
4. O banco de provas, a linha do mapa de ferramentas por objeto e o fechamento.

## Decisão da pessoa

1. A ordem com o elo entre juntas. Recomendação: este plano entra antes da fatia 3 do elo (a perna de prova), e a perna passa a tirar a posição das juntas do esqueleto aprovado; as fatias 1 e 2 do elo (o elo reto e o elo com desvio) não dependem dele e podem correr junto.
2. A altura do humanoide de prova. Recomendação: 1.750 mm, a do braço que já existe em `procedural/pecas/robo-humanoide/proporcoes.json`, cujas medidas o esqueleto reaproveita.

## Riscos e parada

Se o andaime N2 não aceitar a árvore inteira de um humanoide sem mudar o formato do andaime (`mecanifica.andaime-global@2`), o plano para e volta à pessoa antes de mudar formato salvo. Se o aviso de membro atravessado der falso positivo nas juntas, onde bola e bastão se tocam por construção, os pares vizinhos na árvore ficam fora da conta, e isso se declara no comando.

## Andamento

## Fechamento

Preencher ao concluir ou cancelar: estado final, commit e PR, gates, resultado observado e candidatos devolvidos ao backlog.
