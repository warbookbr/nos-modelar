# Bancada e apresentação

## Papel atual

`bancada.html` é a superfície visual da autoria. Hoje ela abre uma peça isolada,
mede o neutro, mostra vistas canônicas e registra uma URL reproduzível.

Sua função é ajudar a IA a observar, localizar, comparar e criticar o resultado
do núcleo. Ela não é uma vitrine, uma cena narrativa nem uma interface de
modelagem humana.

## Consulta atual

A bancada mostra hierarquia informativa, partes, grupos e portas da peça
carregada. Seleção semântica, isolamento, contexto fantasma, explosão e consulta
de subárvore já existem. A régua e o painel de portas respondem ao conteúdo
executado, não a uma constante global.

O isolamento atual reduz ruído visual, mas não deve ser interpretado como modelo
de montagem persistida. A bancada ainda não possui um mapa canônico de carro,
motor ou sistema composto.

## Direção para sistemas compostos

Quando montagens recursivas existirem, a bancada deve continuar sendo a camada
visual de inspeção da IA. Ela não deve virar a fonte de verdade da composição.

O contexto de inspeção precisa separar:

1. **alvo de edição** — entidade que pode ser alterada;
2. **contexto visual** — entidades mostradas somente para comparação;
3. **dependências afetadas** — relações e montagens que precisam ser
   revalidadas;
4. **vistas e medições obrigatórias** — prova mínima da tarefa.

A IA deve conseguir pedir contextos como:

```text
somente a roda
roda + cubo
roda + eixo
capô + dobradiças
pistão + biela + virabrequim
motor + cofre do motor
suspensão + roda + caixa de roda
```

Mostrar apenas roda e eixo não pode apagar o fato de que ambos pertencem a
montagens maiores. Isolamento visual reduz o que aparece na imagem; não remove
relações, dependências nem obrigações de validação.

A seleção futura deve aceitar peça, montagem, parte interna, subárvore e conjunto
arbitrário de entidades relacionadas, sempre por identidade semântica estável.

## Retorno visual para a IA

Use as quatro vistas canônicas quando a tarefa exigir revisão. A IA deve ler os
PNGs e conferir:

- enquadramento;
- cortes acidentais;
- legibilidade;
- proporção;
- identidade das partes;
- detalhes escondidos;
- coerência com referências visuais.

`porteiro` verifica abertura, erros de página e quadro degenerado.
`revisar:modelagem` conserva tentativas e revisões sem criação manual de
evidência.

Para sistemas compostos, a revisão visual precisa ocorrer em mais de uma escala:

- peça isolada;
- interfaces importantes em pares ou pequenos conjuntos;
- montagem local;
- contexto maior quando proporção ou interferência depender dele.

Uma imagem bonita não prova encaixe. Vistas complementam medidas de dimensão,
centro, eixo, folga, contato e interferência.

## Relação com medição e validação

A bancada mostra. Outros serviços medem e validam.

Ela deve receber e representar diagnósticos estruturados, por exemplo:

```text
alvo: aro-dianteiro
relação: fixação-no-cubo
estado: inválida
causa: centros desalinhados
medida: 2.4 mm
```

A IA precisa conseguir ligar o diagnóstico numérico ao componente visível sem
procurar por UUID, índice de face ou posição casual.

## Limites atuais

A bancada ainda não:

- persiste montagem;
- deriva contexto de um mapa de dependências;
- resolve encaixes;
- valida movimento ou espaço varrido;
- distingue formalmente alvo editável de contexto somente leitura;
- publica alterações de receita ou montagem.

O servidor estático local ainda não resolve o import bare `earcut`; não contorne
isso alterando câmera ou peça.

## Critério de saída atual

Uma revisão de peça só é aceita depois de passar:

- execução e integridade;
- identidade semântica;
- medições aplicáveis;
- gates de câmera e portas;
- leitura visual das vistas exigidas;
- comparação com a revisão anterior, quando houver.

Quando montagens persistidas existirem, o critério também deverá exigir
revalidação das relações e dos dependentes afetados. Essa capacidade ainda não
está implementada.

A definição ampla está em [`AUTORIA-IA.md`](AUTORIA-IA.md), e a direção das
montagens em [`MONTAGENS-SEMANTICAS.md`](MONTAGENS-SEMANTICAS.md).
