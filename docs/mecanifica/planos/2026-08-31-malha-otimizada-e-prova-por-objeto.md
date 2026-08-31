# Malha otimizada e prova por objeto

**Estado:** ativo

**Responsável:** Claude

**Repositório e base:** `warbookbr/nos-mecanifica`, `main` em
`b97c7bb49524c4fbc7de546fd2a4a01d396c4390`

**Rastreio das fatias:**
[`../MALHA-OTIMIZADA-PROGRESSO.md`](../MALHA-OTIMIZADA-PROGRESSO.md)
(`docs/mecanifica/MALHA-OTIMIZADA-PROGRESSO.md`)

## Problema observado

O repositório tem 5 objetos modelados contra 62 mil linhas de ferramenta e
documentação. A reorganização recém-concluída mediu isso e não resolveu: ela
arrumou o acervo, não provou a capacidade.

Três lacunas concretas, nenhuma delas exercitada por objeto real:

- **densidade de malha escolhida no olho.** O registro de gotchas já traz
  "resolução escolhida sem olhar a silhueta" como falha, e não existe ferramenta
  que meça custo por vértice contra ganho de silhueta;
- **topologia sem dono.** Não há nada que diga a uma IA se a malha que ela
  acabou de gerar tem n-gon, polo ruim, face degenerada ou casca aberta —
  `conferente-topologico` responde manifold e volume, não qualidade de traçado;
- **saída para motor moderno.** O exportador entrega OBJ e STEP. Nada prepara a
  malha para pipelines de micropolígono (Nanite e equivalentes), que têm
  requisitos próprios de fechamento, escala e ausência de degenerado.

## Resultado

Uma cadeira e um conjunto de armas brancas modelados pelo fluxo atual; três
módulos de saída provados ou recusados por medição; e a lista de atritos que
só aparece com a mão na massa.

## Critério de arquitetura, aplicado antes de começar

O `ARQUITETURA.md` já fixa: geometria→número ou veredito cabe no núcleo;
geometria→geometria nova **não**, porque a autoridade de nomear face não se
delega. Isso decide onde cada peça deste plano mora, e a decisão é anterior ao
código:

| capacidade | tipo | onde mora |
| --- | --- | --- |
| medir topologia e reprovar | geometria→veredito | pode ser núcleo/ferramenta |
| reduzir vértice | geometria→geometria | `modulos/`, camada de saída |
| preparar para micropolígono | geometria→geometria | `modulos/`, camada de saída |

Os dois últimos são **preparação de saída**, não autoria — mesma prateleira dos
exportadores, que já vivem em `modulos/`. Nenhum deles pode ser chamado durante
a autoria de peça, e o gate de arquitetura continua proibindo o núcleo de
importá-los.

## Incluído

- dividir `AUTORIA-IA.md` entre uso e desenvolvimento;
- modelar uma cadeira detalhada e um conjunto de armas brancas;
- provar ou recusar os três módulos por medição;
- registrar os atritos encontrados e corrigir o que for barato.

## Excluído

- material, PBR, textura e paleta;
- pipeline de importação para Unreal — o módulo prepara a malha, não integra
  com motor de terceiro;
- reabrir modelagem de carroceria, que é assunto do plano congelado.

## Gates de saída

- **H1 — objeto reconhecível.** Cadeira e armas passam pela inspeção visual em
  vistas ortográficas, sem absurdo de forma. Quem julga aqui sou eu, com o
  registro de gotchas na mão, porque o usuário declarou indisponibilidade.
- **H2 — redução prova ganho sem perda.** A redução só é adotada se, no mesmo
  objeto, cortar vértice mantiver a silhueta dentro de um limiar declarado
  ANTES de medir. Limiar escolhido depois do resultado é resultado inventado.
- **H3 — topologia acusa defeito real.** O organizador precisa reprovar uma
  malha com defeito conhecido por construção e aprovar uma sã. Detector que só
  aprova é aprovação por vacuidade, falha já registrada neste repositório.
- **H4 — preparação declara o que não faz.** O módulo de micropolígono declara
  quais requisitos verifica e quais não verifica. Silêncio sobre o não coberto
  é o mesmo que mentir sobre cobertura.
- **H5 — o de sempre.** Suíte e os dez gates verdes em cada fatia.

## Fatias

Cada fatia entra sozinha e verde. Fatia que não provar seu gate é registrada
como recusa com a medida, não empurrada adiante.

### H0 — dividir o `AUTORIA-IA`

Separar a metade que é contrato de autoria de peça, que vai para `usar/`, da
metade que é decisão e estado de projeto, que fica na raiz. As questões abertas
vão para o backlog. Fecha a exceção pendente na allowlist do G1.

### H1 — a cadeira

Modelar uma cadeira detalhada pelo fluxo atual, usando a skill `criar-peca`
sem atalho. O objeto importa menos que o percurso: **cada atrito encontrado é
anotado na hora**, porque é a única fatia em que o sistema é exercitado por
inteiro por um objeto que ele nunca viu.

Cadeira foi escolhida de propósito: tem simetria parcial, junção de peças
finas, curva em encosto e um assento que precisa de continuidade — exigências
que nem o carro nem a prensa fizeram.

### H2 — redução de vértice

Medir, no objeto da H1, custo por vértice contra ganho de silhueta. O limiar de
H2 é declarado antes. Se a redução não couber no limiar, a recusa é o
resultado, com o número.

### H3 — organizador de topologia

Analisador que responde, sobre uma malha: n-gon, polo de valência ruim, face
degenerada, casca aberta, normal invertida, ilha solta. Devolve **veredito e
lista**, nunca geometria nova — é o que o mantém do lado certo da fronteira e o
torna útil tanto ao modelar quanto ao revisar peça pronta.

### H4 — preparação para micropolígono

Verificar e preparar o que esses pipelines exigem: malha fechada, sem
degenerado, escala declarada, sem face de área nula. O que o módulo não
cobrir fica escrito.

### H5 — armas brancas

Modelar um conjunto de armas brancas detalhadas, agora com os módulos das
fatias anteriores disponíveis. Serve de segundo objeto: se os atritos da H1
sumiram, o conserto valeu; se voltaram, o conserto foi cosmético.

### H6 — colher os atritos

Consolidar o que apareceu, corrigir o barato, registrar o caro no backlog, e
atualizar skill e registro de gotchas com o que se provar geral.

## Condição de parada

Se a H1 não produzir uma cadeira reconhecível depois de três rodadas, a
execução para e o achado vira registro. Três é o teto porque este repositório
já gastou doze rodadas num objeto que nunca ia dar certo, e a falha está
documentada — repetir o padrão seria ignorar evidência própria.

## Passivo declarado

O Actions não aloca runner desde 26/08: cada fatia é provada localmente com a
suíte e os gates completos, e isso fica dito no commit em vez de sugerir que o
CI aprovou.

O usuário declarou que não estará disponível durante a modelagem. Onde o fluxo
pede julgamento humano de forma, quem julga sou eu, e isso fica marcado como
tal — julgamento meu não vira aprovação do usuário por omissão.
