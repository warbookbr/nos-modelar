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
