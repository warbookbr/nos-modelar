# Aparelhos de caixa — uma família gera eletrodomésticos e eletrônicos de caixa, provada no forninho elétrico

**Estado:** concluído

**Responsável:** Claude, com a pessoa aprovando forma

**Repositório e base:** `warbookbr/nos-mecanifica`, ramo `claude/revisar-plano-ativo-cyj8c3`

## Problema observado

A classe "construído e equipamento" da [lista de famílias](../../FAMILIAS-DE-OBJETOS.md) tem uns vinte grupos, e modelar cada objeto pelo
caminho do avião custa caro: cada peça dele levou de 400 mil a 1,5 milhão de tokens até o aceite
([plano do avião](2026-10-15-o-aviao-do-esboco-a-receita.md)), porque passou por alinhamento, esboço com crítico unidade por
unidade, receita e várias rodadas de crítico visual. Um forninho elétrico pelo mesmo caminho custaria uma fração disso só por ser mais
simples, e a lista tem centenas de objetos. Em 2026-10-16, uma mesa traduzida do Infinigen virou família com as medidas da original por
250 a 300 mil tokens ([importar objeto de código](2026-10-15-importar-objeto-de-codigo.md)): a família custa uma vez e cada
objeto dela sai como perfil. Boa parte dos eletrodomésticos e eletrônicos tem o mesmo esqueleto, uma caixa com uma frente (porta ou
tampa, visor, botões, puxador, pés), e o `movel-de-caixa` já resolve caixa com portas, gavetas e pés para móveis.

A pessoa decidiu em 2026-10-16: famílias em vez de objetos; um processo leve para objeto simples; estilo realista nas medidas e na forma,
com detalhe médio, sem parafuso, peça interna escondida nem marca; e começar pelos eletrodomésticos e eletrônicos de caixa, com o
forninho elétrico como primeira prova.

## Resultado

Uma família de aparelho de caixa, aprovada pela pessoa no forninho elétrico e em mais três aparelhos gerados como perfis dela, com o custo
de cada etapa medido e um processo leve de modelagem escrito para objeto simples.

## Filtro Agent-First

- **`movel-de-caixa`:** REFATORAR ou ENVOLVER, decidido na fatia 1. Se a frente de aparelho (visor, botões, painel de comando, puxador
  de barra) couber como opção declarada dele sem torná-lo confuso, ele ganha a opção; senão a família nova reaproveita a geometria dele
  e declara só o que é de aparelho. A correção geral vai para a ferramenta, e o que é só de aparelho entra como opção declarada.
- **Contrato da família e `familias:check`:** USAR DIRETO, como estão ([contrato](../../CONTRATO-DA-FAMILIA.md)).
- **Laço de modelagem completo:** ADIAR para objeto complexo. O processo leve usa um modelador, a família e uma ou duas rodadas do
  crítico visual sobre os perfis, sem esboço unidade por unidade, e para na terceira rodada como o laço completo.
- **Referência:** USAR DIRETO o que existe para imagem de referência (contorno, prancha) só se a pessoa trouxer foto; sem foto, as
  medidas vêm de faixas de produtos reais, sem marca, declaradas na família.

## Incluído

- a decisão entre opção do `movel-de-caixa` e família nova, com o motivo;
- a família (ou a opção) com corpo, porta com visor de vidro, puxador, painel de comando com botões giratórios e de pressão, pés e o
  interior visível pelo visor (cavidade e grelha), com faixas de medida realistas;
- o perfil do forninho elétrico, levado pelo processo leve até a aprovação de forma da pessoa;
- mais três perfis da mesma família, a escolher na fatia 3 entre micro-ondas, air fryer de forno, cafeteira de caixa, roteador, caixa de
  som e gabinete de computador, aprovados pela pessoa;
- o processo leve escrito como opção declarada da skill de modelagem, com quando usá-lo e quando não;
- o custo em tokens e em chamadas de cada etapa, ao lado do custo das peças do avião.

## Excluído

- materiais, cor, textura e PBR, que o acordo do repositório deixa fora;
- marca, logotipo e cópia de produto comercial reconhecível;
- mecanismo interno escondido (resistência, placa, motor), parafuso e detalhe que não aparece de fora nem pelo visor;
- os demais grupos da classe (móveis, instalações, ferramentas e outros), que vêm em planos seguintes se o custo fechar.

## Invariantes

A família é determinística, versionada e aprovada pelo `familias:check`; IDs internos não são identidade; o núcleo continua sem
Three.js; quem aprova forma é a pessoa.

## Gate de saída

1. a família aprovada mecanicamente (`familias:check`) e o forninho e os três outros aparelhos aprovados em forma pela pessoa;
2. o custo de cada etapa medido: família, cada perfil e o processo leve, e comparado ao de uma peça do avião;
3. o processo leve escrito e citado pelo roteiro de modelagem;
4. `npm run gates` verde, e `--completo` antes do envio à main.

## Fatias

1. **Família.** A decisão entre opção e família nova, a geometria, os parâmetros e as faixas, a aprovação mecânica e uma imagem dos três
   pontos da família para a pessoa.
2. **Forninho pelo processo leve.** O perfil do forninho, o modelador e o crítico até a aprovação da pessoa, com o custo medido; o que o
   processo leve revelar de geral vai para a ferramenta ou para a instrução.
3. **Mais três aparelhos.** A pessoa escolhe os três; cada um sai como perfil, com o custo medido.
4. **Fechamento.** O processo leve escrito, as medidas e a decisão sobre os próximos grupos da classe.

## Riscos e parada

Para e volta à pessoa se a família ficar tão cheia de opções que o modelador erre mais do que acerta; se o forninho custar pelo processo
leve mais da metade de uma peça do avião; ou se a pessoa não reconhecer os aparelhos como realistas depois de três rodadas.

## Fechamento

Concluído em 2026-10-19. A família `aparelho-de-caixa` (contrato 1.2.0) gera corpo com cantos arredondados, porta com janela e vidro em peça
própria, cavidade e grelha, painel lateral ou superior, botões giratórios e de pressão, puxador horizontal ou vertical e pés. Os quatro perfis, forninho
elétrico, micro-ondas, air fryer de forno e lava-louças compacta, foram aprovados em forma pela pessoa em 2026-10-16, e a prancha está em
`docs/mecanifica/banco-de-provas/aparelhos-2026-10-16/aparelho-de-caixa-prancha.png`. A decisão da fatia 1 foi família nova, e não opção do
`movel-de-caixa`.

Custo medido: a família levou cerca de 294 mil tokens e 91 chamadas (100 mil só de leitura), os ajustes do forninho 285 mil e 104 chamadas (45 de
leitura), e os três perfis seguintes 184 mil e 60 chamadas. Uma peça do avião custou de 400 mil a 1,5 milhão. O forninho pelo processo leve custou
bem menos da metade de uma peça do avião, então o limite de parada não foi atingido. O processo leve está escrito em
`.claude/skills/laco-de-modelagem/SKILL.md` e o roteiro `modelar/peca` o aponta.

Achados, e se o processo os teria pego: (1) a tolerância de 1 mm do exportador de OBJ recusa os triângulos pequenos dos cantos arredondados;
o processo não pegou, e a correção entrou na fatia do exportador do plano de material e textura. (2) A porta tem chanfro e não arredondamento
verdadeiro, porque a união falhou; está no backlog. (3) Mudar uma faixa de opção esvazia a aprovação da pessoa; o processo pegou, porque o
hash a esvaziou, e a instrução agora manda terminar as faixas antes de pedir o aceite.

Os próximos grupos da classe (móveis, instalações, ferramentas) não abrem sem a decisão da pessoa. A recomendação é repetir a receita em
móveis e em aparelhos sem porta, como caixa de som e roteador. Os objetos do projeto externo, que a pessoa trouxe depois, seguem pelo
[plano de material e textura](../2026-10-19-receitas-com-material-e-textura.md) e pelo backlog.
