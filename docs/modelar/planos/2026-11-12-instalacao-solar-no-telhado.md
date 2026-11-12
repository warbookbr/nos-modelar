# Instalação solar no telhado: um caso prático de montagem real, do telhado de fibrocimento aos painéis presos nos trilhos

**Estado:** ativo

**Território:** `procedural/pecas/instalacao-solar/`, `docs/modelar/banco-de-provas/instalacao-solar-2026-11-12/`

**Responsável:** a IA da sessão do furgão, com as decisões técnicas delegadas pela pessoa; a pessoa é a crítica por imagem e
traz as medidas do telhado.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-12.

## Problema observado

A pessoa vai instalar quatro painéis solares sobre trilhos de alumínio num telhado de fibrocimento ondulado com vigas de
madeira, e quer ver e conferir a instalação antes de subir no telhado. O acervo tem objetos de forma (veículos, braço,
empilhadeira) e nenhum caso de montagem real, de compra e obra, em que as medidas venham de peças que existem e a montagem
precise responder se as contas fecham. As contas da instalação já mostram dois problemas que só aparecem no lugar de cada peça:
com o trilho cortado em 4,55 m e a primeira e a última haste a 30 cm das pontas, quatro hastes ficam a 1,32 m, e não a 1,40 m;
e o grampo intermediário, que aperta dois painéis com uma peça, não serve entre a moldura de 40 mm e a de 30 mm.

## Resultado

A instalação inteira sai das receitas na ordem da obra (vigas, telhado, hastes, suportes, trilhos com emendas, grampos e
painéis), cada peça tirando posição e medida da anterior, e a montagem responde por medida onde vai cada haste, cada grampo e
cada painel, quanto trilho cortar e se os trilhos caem sobre as vigas; o caso fica no acervo como exemplo prático de estudo.

## Filtro Agent-First

USAR DIRETO: receitas, montagem v5 com etapas e vínculos de medida, bancada e `descrever`; o caso não pede operação nova. O que
o caso achar faltando no núcleo vai ao backlog, salvo se bloquear o resultado.

## Incluído

- o alinhamento: objeto, escala, partes, contatos e critérios, com as medidas e quantidades da instalação e sem marca, modelo,
  dados pessoais ou parte elétrica; as fotos da pessoa e a imagem do catálogo do kit ficam fora do repositório;
- o telhado de fibrocimento de cima, sem a casa: as vigas de madeira e as telhas onduladas na inclinação medida, com a
  sobreposição das fileiras;
- as peças do kit: haste rosca dupla de 250 mm com vedação, suporte em L, perfil de alumínio de 1,35 m, emenda, grampo
  intermediário e grampo de ponta de 30 a 35 mm e de 40 mm, com medidas típicas marcadas como a confirmar até a pessoa medir;
- os quatro painéis em pé, lado a lado: três de 1812 × 1046 × 40 mm e um de 1722 × 1134 × 30 mm numa posição do meio, preso dos
  dois lados por grampos de ponta, e os vizinhos dele por grampos de ponta de 40 mm;
- a montagem com as etapas na ordem da obra e as conferências: trilho sobre viga, haste dentro do trilho e na crista da onda,
  espaçamento das hastes, comprimento de trilho, folga entre painéis e posição dos trilhos em cada painel.

## Excluído

- a parte elétrica, o inversor, a bateria, os cabos e a tela antigranizo;
- a casa abaixo do telhado e o telhado metálico de baixo;
- sombra e geração de energia.

## Medidas e quantidades da obra

Do documento da pessoa (2026-11-11), sem marca nem modelo; o que está "a confirmar" é medida ou regra que a pessoa ainda vai
conferir, e entra na receita marcado assim.

- Painéis: quatro, em pé, lado a lado numa fileira só, sobre duas linhas de trilho horizontais. Três de 1812 × 1046 mm com
  moldura de 40 mm; um de 1722 × 1134 mm com moldura de 30 mm, numa das posições do meio, com um de 40 mm em cada ponta da fileira:
  `[40] [40] [30] [40]`.
- Grampos: entre os dois painéis de 40 mm vizinhos, um grampo intermediário em cada trilho; dos dois lados do painel de 30 mm,
  grampos de ponta de 30 a 35 mm nele (os 4 do kit) e grampos de ponta de 40 mm nos vizinhos de 40 mm (4 dos 8 comprados); nas
  duas pontas da fileira, grampos de ponta de 40 mm (os outros 4). Folga de cerca de 2 cm onde fica o grampo intermediário; onde
  dois grampos de ponta ficam lado a lado, a folga é a dos dois, a medir na peça.
- Trilhos: cada um a cerca de 45 cm das pontas dos painéis de 1812 mm, os dois a cerca de 90 cm um do outro; com os painéis
  centrados na fileira, no painel de 1722 mm eles ficam a cerca de 41 cm das pontas, a conferir na faixa de grampo permitida
  pelo fabricante dele. Os trilhos passam sobre as vigas de madeira, onde as hastes entram.
- Kit: 8 perfis de alumínio de 1,35 m, 4 por linha (5,40 m), cortados para cerca de 4,55 m; 6 emendas, 3 por linha; 8 hastes
  rosca dupla de 250 mm com borracha de vedação, 4 por linha; 8 suportes em L, um por haste; 6 grampos intermediários; 4 grampos
  de ponta de 30 a 35 mm; 8 grampos de ponta de 40 mm.
- Hastes: a cada 1,40 m, com a primeira e a última a 30 cm das pontas do trilho, furadas na parte alta da onda da telha e
  rosqueadas na viga. A conta não fecha: com o trilho em 4,55 m e quatro hastes, o espaçamento é de 1,32 m; com 1,40 m, o
  trilho teria 4,80 m. A montagem mostra as duas e a escolha é da pessoa.
- Fileira: cerca de 4,33 m de painéis com folgas de 2 cm, e cerca de 4,45 m com os grampos de ponta lado a lado dos dois lados do
  painel de 30 mm; a conferir contra o trilho de 4,55 m.
- Pendentes da pessoa: a inclinação do telhado, a distância entre as vigas e quantas são da beirada à cumeeira, e as medidas do
  perfil visto de ponta, do suporte em L e dos grampos.

## Gate de saída

1. A montagem passa nas conferências de medida, e o relato dela diz o comprimento de trilho, a posição de cada haste e de cada
   grampo e a folga entre os painéis.
2. Cada peça tem PLANO com critérios de reprovação e passa no `guarda:acervo`; as medidas a confirmar estão marcadas na receita.
3. A pessoa aprova a instalação por imagem, com o telhado e os painéis, e as etapas da montagem ficam fixas com o aceite dela.

## Fatias

1. O alinhamento e o telhado com as vigas, com a inclinação e o espaçamento das vigas medidos pela pessoa.
2. As peças do kit e os painéis.
3. A montagem na ordem da obra e as conferências de medida.
4. Fechamento.

## Riscos e parada

Sem a distância entre as vigas e a inclinação, o telhado não sai; a fatia 1 espera essas duas medidas. Se uma conferência
mostrar que a instalação como planejada não cabe (trilho fora das vigas, haste fora da crista, grampo fora da faixa permitida
pelo fabricante do painel), o achado vai à pessoa antes de qualquer ajuste, porque a decisão é da obra dela.

## Fechamento

Preencher ao concluir ou cancelar.
