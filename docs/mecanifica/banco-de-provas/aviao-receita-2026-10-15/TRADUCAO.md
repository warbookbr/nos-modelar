# O esboço do avião traduzido para o andaime

Fatia 1 do plano [o avião do esboço à receita](../../planos/2026-10-15-o-aviao-do-esboco-a-receita.md),
em 2026-10-15. O esboço aprovado, o [mestre da segunda
rodada](../aviao-2026-10-11/esboco-r2/aviao.esboco.json), foi traduzido para o andaime
da forma global N2 pelo tradutor do nível zero (`src/autoria/tradutor-nivel-zero.js`),
o mesmo que o Condutor e o Envelope por receita usam. O relatório inteiro está em
[`traducao.txt`](traducao.txt), e a [blocagem](andaime-composta.png) é a do comando:

```bash
npm run esboco -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/aviao.esboco.json --composta --nivel-zero
```

O andaime tem 110 volumes. Das 115 formas visíveis, 63 entram aproximadas e 5 ficam
sem equivalente, e as 25 formas ocultas (cortadores e guias) ficam fora, como
devem.

| parte | formas | aproximadas | sem equivalente | com recorte perdido | pior erro de envelope |
|---|---|---|---|---|---|
| fuselagem | 13 | 12 | 1 | 2 | 0 mm |
| motor | 4 | 4 | 0 | 4 | 0,06 mm |
| hélice | 6 | 1 | 4 | 0 | 0 mm |
| asas | 20 | 16 | 0 | 4 | 5321 mm (ponta) |
| empenagem horizontal | 12 | 10 | 0 | 2 | 464 mm (estabilizador) |
| empenagem vertical | 10 | 9 | 0 | 1 | 1965 mm (deriva) |
| trem do nariz | 18 | 5 | 0 | 1 | 0 mm |
| trens principais | 32 | 6 | 0 | 0 | 0 mm |

A maior parte das aproximações não muda a forma. A caixa de canto arredondado vira a
extrusão do mesmo contorno, e o loft vira o casco das seções, com erro de volume
abaixo de um milésimo. O que muda a forma vem de três perdas.

O recorte não tem equivalente, porque a N2 não subtrai um volume de outro, e o
andaime leva a forma inteira, sem o vão. Na fuselagem isso tira a porta e as
janelas, e o volume sobe 0,47%, sem mudar o envelope. Nas superfícies que o esboço
fez cortando uma forma maior, o andaime fica com a forma de antes do corte. A ponta
da asa é a asa inteira cortada pela ponta, e o volume dela no andaime tem a caixa da
asa inteira, 5,3 m além da ponta. O mesmo vale para a deriva, cortada na raiz e no
vão do leme, que fica 1965 mm além do esboço, e para o estabilizador, de que o
profundor foi recortado e que fica 464 mm além.

A forma de família vira o casco convexo das seções dela. O furo, as cavidades e as
partes somem: a roda fica um sólido só, 61 a 65% mais volumosa, e a asa 22%.

Cinco formas não se traduzem, porque giram em dois eixos e a N2 não inclina o
sólido: as quatro pás da hélice e o montante do para-brisa.

## O que isso diz ao plano

O `REFINA` confere cada parte da receita dentro do envelope, a caixa, do volume que
ela refina. Para a fuselagem, o motor e os trens, o envelope do andaime é o do
esboço, e a conferência diz se a receita segue o esboço. Para as asas, as
empenagens e a hélice, não diz. Uma ponta de asa feita em qualquer lugar da caixa da
asa inteira passaria, e as pás nem têm volume para conferir. A fuselagem, que é a
primeira parte da montagem, segue como piloto da fatia 1. As outras superfícies
esperam a decisão da pessoa sobre o que falta ao contrato, como o risco do plano
prevê.

Há também uma divergência entre as duas leituras do mesmo andaime. O tradutor põe as
asas e a deriva no andaime como cascos aproximados, e o desenho da blocagem as deixa
de fora da imagem, porque a forma de família com furo descoberto acima de 0,1% da
silhueta não é desenhada. Por isso a blocagem mostra o avião sem o corpo das asas e
sem a deriva. Quem lê só a imagem acha que essas partes não existem no andaime, e
quem lê só o relatório acha que elas existem inteiras.
