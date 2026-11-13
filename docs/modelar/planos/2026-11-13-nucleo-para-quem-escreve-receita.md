# Núcleo para quem escreve receita: erro na hora, menos passos e rodada mais curta

**Estado:** pronto

**Território:** nenhum (aguarda aprovação)

**Responsável:** a IA da sessão do furgão; as mudanças foram aprovadas pela pessoa em 2026-11-13, e o plano espera o território.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-13.

## Problema observado

Medido pela [revisão do projeto](../banco-de-provas/revisao-do-projeto-2026-11-13/RELATORIO.md). Dezoito das 42 operações não declaram argumento obrigatório, e um cilindro de raio negativo e dois lados executa sem recusa; o nome de parâmetro errado aborta a peça sem dizer o passo; a operação com nome errado é recusada sem sugestão. `parte` e `material` repetem o mesmo seletor em 2.363 pares, 52% dos 9.042 passos do acervo. A carroceria do sedã leva 171 s por execução, com 15 chamadas de aparar que refazem o mesmo molde. Quarenta e uma de 43 receitas de topo não importam nada e reescrevem a conversão de milímetro (48 peças) e a área e o sentido do contorno (23 peças).

## Resultado

A IA que escreve uma receita recebe a recusa no passo errado, com o valor e o limite; escreve a parte e o material num passo; e não espera de novo o trecho da receita que não mudou.

## Por que espera

Os arquivos `procedural/nucleo/uso-operacoes.js`, `procedural/nucleo/nucleo.js`, `procedural/nucleo/operacoes/estruturais.js` e `procedural/nucleo/operacoes/booleanas.js` são território do [plano das costuras](2026-11-09-costuras-e-furos-limpos.md), que tem prioridade e espera a aprovação de imagem da pessoa para fechar. Este plano ativa quando o das costuras fechar ou a pessoa passar os arquivos.

## Incluído, em fatias pela ordem de execução

1. Recusa na hora. Toda primitiva declara os argumentos sem os quais não há forma e recusa valor não positivo, com passo, valor e limite; o resolvedor de expressões devolve o erro com passo, operação, chave e os nomes de parâmetro mais próximos; a operação desconhecida ganha a sugestão que a chave desconhecida já tem; as cinco recusas que dizem `'undefined'` dizem o campo que faltou. Um gate confere que toda operação com argumento essencial o declara. Prova: as receitas mínimas erradas do [inventário de erros](../banco-de-provas/revisao-do-projeto-2026-11-13/pergunta-5-erros-nomes-e-argumentos.md), cada uma recusada com o passo.
2. `parte` aceita `material`. Os dois passos separados continuam valendo, e nenhuma receita do acervo é reescrita por este plano. Prova: a mesma peça escrita dos dois jeitos dá o mesmo neutro, bit a bit.
3. Os auxiliares que as receitas copiam (milímetro para metro, área com sinal, sentido anti-horário, espelhar) saem de um módulo do núcleo, com teste. As receitas existentes não mudam.
4. A execução guarda o estado do prefixo de passos que não mudou e o molde do aparar por chapa, folga e plano. Prova: a carroceria do sedã, com um passo mudado depois do último aparar, reexecuta em menos de um terço dos 171 s e dá o mesmo neutro, bit a bit, que a execução sem memória.

## Excluído

Trocar nome de argumento (`de`, `eixo`, `lado`), que quebra receita e pede plano próprio; tirar operação sem uso; a forma por duas vistas como operação, que espera medir se a gaiola já a cobre.

## Invariantes

O núcleo não conhece veículo. Toda receita do acervo dá o mesmo neutro de antes, conferido pelo retrato do acervo. A memória de execução nunca muda o resultado: a prova é bit a bit.

## Gate de saída

As quatro provas passam, o retrato do acervo não muda e `npm run gates` fica verde. O revisor adversarial tenta quebrar as fatias 1 e 4 antes da integração.

## Riscos e parada

A recusa nova reprovar receita do acervo que hoje passa com valor degenerado: cada caso é listado e decidido antes de a recusa entrar, e não se afrouxa a recusa para a peça passar. A memória de prefixo guardar estado errado: sem a prova bit a bit, a fatia 4 não entra.

## Fechamento

Preencher ao concluir ou cancelar.
