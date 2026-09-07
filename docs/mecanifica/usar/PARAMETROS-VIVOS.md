# Parâmetro vivo e parâmetro decorativo

Consulta rápida, não leitura de partida. Vale abrir quando você for **alterar
um valor numérico** de uma receita e quiser saber, antes de gastar a rodada, se
mexer ali muda alguma coisa.

## O comando

```bash
npm run parametros -- <receita>
```

```bash
npm run parametros -- --acervo
```

O primeiro diagnostica uma receita; o segundo faz o retrato do acervo inteiro em
alguns segundos. `--completo` lista os inertes um a um em vez de resumir.

## O que ele responde

Para cada número dentro de `PARAMS`, o comando sonda um valor vizinho, mede a
peça e compara com a base. O parâmetro sai como:

- **vivo** — alterar mudou a forma ou o contato medido; é liberdade real;
- **vivo (recusado)** — o valor chegou ao motor e foi rejeitado. Também é
  ligação: o parâmetro está no caminho da execução;
- **inerte** — a peça medida saiu idêntica. O parâmetro está declarado e não
  entra na conta de nada.

Quando **nenhum** parâmetro é vivo, o comando diz isso em voz alta. Não é uma
peculiaridade rara: hoje é o caso da maioria do acervo.

## Por que isso existe

Uma receita pode trazer `PASSOS` como lista de números literais, fixada quando o
módulo carrega, e `PARAMS` ao lado, sem nenhuma ligação:

```js
const P = { chapa: { comprimento: 0.140 } };

export const receita = {
  PARAMS: P,
  PASSOS: [                                  // ← literais, avaliados uma vez
    ['inflate', { origemId: 1, divisoes: P.malha.divisoes }],
  ],
};
```

Trocar `receita.PARAMS.chapa.comprimento` depois disso não muda um vértice: o
array já guardou o número. Quem lê o cabeçalho vê nove liberdades, escolhe uma,
altera, remede — e encontra exatamente a mesma peça, sem nenhuma mensagem
dizendo o que aconteceu. A rodada foi gasta numa liberdade que não existia.

A forma que liga de verdade deriva os passos dos parâmetros a cada leitura:

```js
export const receita = {
  PARAMS: P,
  get PASSOS() { return gerarPassos(this.PARAMS); },   // ← recalcula
};
```

## O que ele NÃO responde

- **se o valor atual é bom.** Ele diz que o parâmetro está ligado, não que está
  certo;
- **quanto** um parâmetro move um critério. Isso é a varredura de sensibilidade,
  e depende desta resposta: não adianta medir a derivada de um enfeite;
- **nada sobre forma.** Vale aqui o mesmo limite de
  [`METODO-DIAGNOSTICO-E-SEU-LIMITE.md`](METODO-DIAGNOSTICO-E-SEU-LIMITE.md):
  medida não aprova aparência.

Se a receita executa mas não publica nenhuma parte — sem o passo `parte` —, o
comando recusa diagnosticar em vez de chamar tudo de inerte. Sem parte medida,
toda sonda compara vazio com vazio, e "inerte" seria uma resposta precisa para
a pergunta errada.

## Como ele mede

Sonda `×1,1` e, em parâmetro inteiro, também `±1` — receita que conta coisas
trunca a fração, e sondar 5,5 ripas devolveria a mesma peça. A comparação é
exata, sem arredondar: a execução é determinística, então parâmetro que não
entra na conta produz resultado idêntico bit a bit, e qualquer diferença é
efeito real. O comando também repete a medida da base e avisa se ela variar —
enquanto isso acontecer, "mudou" não separa efeito de ruído.

Nada é escrito: as variantes vivem em memória e o arquivo da receita não é
tocado.

## Depois: quanto cada parâmetro move

Saber que um parâmetro está ligado não diz o quanto ele importa. Para isso:

```bash
npm run varrer -- <receita> --criterio=menor-folga
```

Sensibilidade: sonda cada parâmetro para baixo e para cima (±10%, mude com
`--delta`) e responde quais movem o critério, quanto, e **o que cada movimento
custa**. Na cadeira, de 21 parâmetros, um só move a menor folga — encolher a
seção da perna abre 6,07 mm e cria quatro interpenetrações; engordar abre
2,00 mm sem quebrar nada.

```bash
npm run varrer -- <receita> --livres=perna.secaoTopo:0.036..0.05:8 --maximizar
```

Lote: mede a grade declarada, separa o que sobrevive do que quebra, e ordena
pelo objetivo — `--maximizar`, `--minimizar` ou `--alvo=<valor>`. Sem objetivo
declarado a lista sai na ordem da grade, porque ordenar sem critério é escolher
no lugar de quem perguntou.

### Critérios aceitos

`menor-folga`, `interpenetracoes`, `contatos`, `folga:<a>,<b>`,
`dimensao:<parte>:<x|y|z>`, `envelope:<x|y|z>`. Vocabulário fechado de
propósito: uma linguagem de expressão sobre a descrição obrigaria a aprender uma
gramática nova só para perguntar a folga entre duas partes. Critério que a peça
não tem devolve `—`, não zero.

### Limites que valem ler antes de confiar

- **Nada é aplicado.** A saída é candidato medido; escolher continua sendo do
  autor, e o aviso está no rodapé de toda execução.
- **A previsão é local.** Um parâmetro por vez não vê interação entre dois, e
  ±10% não diz nada sobre ±100%. Remeça o candidato escolhido de verdade.
- **Leia o custo, não só o número.** Todo candidato traz quantas relações
  pioraram — contato que virou folga, folga que cresceu, interpenetração nova.
  Medido na cadeira: o candidato que zera a fresta entre duas saias abre dez
  outras relações, e um que para em 1,41 mm abre uma. O melhor número quase
  nunca é a melhor peça.
- **Orçamento declarado.** A varredura recusa antes de rodar se passar de 200
  variantes; `--orcamento` levanta o teto de propósito, em vez de o comando
  sumir por minutos.
- **Ruído não é efeito.** Diferença abaixo de 1 nm é aritmética de ponto
  flutuante, não geometria, e não entra na lista dos que movem o critério. Isto
  não contradiz a comparação exata do diagnóstico acima: lá a pergunta é "este
  parâmetro entra na conta?", e parâmetro que não entra produz resultado
  idêntico bit a bit, então qualquer diferença responde sim. Aqui a pergunta é
  "quanto ele move?", e 28 femtômetros respondem nada.
- **Métrica não aprova forma.** Otimizar um critério inadequado só encontra uma
  solução inadequada mais rápido; vale
  [`METODO-DIAGNOSTICO-E-SEU-LIMITE.md`](METODO-DIAGNOSTICO-E-SEU-LIMITE.md).
