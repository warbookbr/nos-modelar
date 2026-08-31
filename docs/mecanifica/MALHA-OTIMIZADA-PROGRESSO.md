# Malha otimizada e prova por objeto — progresso

Documento auxiliar do plano
[`planos/2026-08-31-malha-otimizada-e-prova-por-objeto.md`](planos/2026-08-31-malha-otimizada-e-prova-por-objeto.md).
Aqui ficam o estado de cada fatia, as medições e os atritos anotados na hora em
que aparecem — que é o produto real das fatias de modelagem.

## Estado das fatias

| fatia | o que faz | estado |
| --- | --- | --- |
| H0 | dividir o `AUTORIA-IA` | em curso |
| H1 | a cadeira | concluída |
| H2 | redução de vértice | pendente |
| H3 | organizador de topologia | pendente |
| H4 | preparação para micropolígono | pendente |
| H5 | armas brancas | pendente |
| H6 | colher os atritos | pendente |

## H1 — a cadeira

Modelada por `PASSOS` declarativos, sem `construir(ctx)`. Lê como cadeira de
jantar nas quatro vistas: pernas, assento, travessas de canela, encosto com três
ripas e travessa de topo.

Duas economias declaradas e uma entrega que faltava:

- perna, travessa e ripa são `chamferBox`, não cilindro. Madeira serrada não tem
  curva, e o chanfro dá a quebra de luz a um custo que 16 lados não dariam;
- o lado esquerdo vem de `espelha`, então uma correção na direita não pode
  divergir da esquerda — economia de erro antes de economia de vértice;
- o cabeçalho prometia curva real na quina do assento e no topo do encosto e a
  geometria não tinha nenhuma das duas. Entregues por `arredondarAresta` depois
  de **medir** qual índice de aresta é o da frente, provando as quatro.

Seis atritos anotados abaixo, todos encontrados fazendo, nenhum deles previsto.

## Atritos encontrados

Anotados na hora, com o que estava tentando fazer quando apareceram.

| # | atrito | onde | custo do conserto |
| --- | --- | --- | --- |
| A1 | A skill `criar-peca` afirma que "não existe modelo de receita no acervo atual". Existem várias desde o PR #58 — prensa, cutelo, gabarito. A frase manda a IA não olhar exatamente o que ajudaria. | `.claude/skills/criar-peca/SKILL.md` | baixo: corrigir a frase |
| A2 | `sel.grupos` (plural) não existe e não é recusado como chave desconhecida: vira "seleção vazia", que manda caçar grupo vazio quando o problema é o nome da chave. | `nucleo.js`, resolução de `sel` | baixo: recusar chave desconhecida com a lista das aceitas |
| A3 | O modo estrutural de `espelha` exige `origemId`, `derivaDe` e `sel:{origem}` juntos, e o erro revela **um requisito por vez**: corrigi três vezes para descobrir os três. | `transformacoes.js` | médio: enunciar o contrato inteiro no primeiro erro |
| A4 | `em` é centro em X e Z mas **base** em Y. Supor centro nos três põe a peça a meia altura no ar. Não está no schema, que só diz "em". | schema de `cubo`/`chamferBox` | baixo: descrever a convenção no schema |
| A5 | Parte **sem material** renderiza cinza e nada acusa. O diagnóstico diz "nenhuma superfície sem identidade" — identidade de parte, não cobertura de material. Parece escolha estética. | diagnóstico da bancada | baixo: contar parte sem material |
| A6 | A barra de vistas cobre o topo do objeto enquadrado. Em objeto alto, o topo raspa a barra na imagem de evidência. | enquadramento da bancada | baixo: descontar a faixa da barra |

## Medições

| fatia | medida | valor |
| --- | --- | --- |
| H1 | cadeira: vértices | 292 |
| H1 | cadeira: faces | 304 |
| H1 | cadeira: triângulos | 532 |
| H1 | cadeira: partes nomeadas / órfãs | 8 / 0 |
| H1 | cadeira: caixa (m) | 0,440 × 0,880 × 0,420, apoiada em y=0 |
