# Onde vão os tokens do esbocista (2026-10-07)

Medição da fatia 1 de [o caminho curto da IA](../planos/2026-10-07-o-caminho-curto-da-ia.md),
feita sobre as transcrições dos quatro esbocistas do [banco de provas](BANCO-DE-PROVAS.md)
(carrinho de mão, cadeira de rodas, guarda-roupa e cadeira, nível médio, modo
objeto, Sonnet). O script lê cada transcrição, soma o uso que a API informa por
turno e atribui o conteúdo de cada resultado de ferramenta à ferramenta e ao
comando que o produziu, a cerca de 3,5 caracteres por token e 1.600 tokens por
imagem; as parcelas são estimativa, e os totais por turno são os da API.

## O que pesa

Antes de qualquer trabalho, cada esbocista já começa com 42,5 mil tokens de
contexto: instruções do sistema, ferramentas, `CLAUDE.md`, a definição do agente
e a lista de skills. Esse piso é igual nos quatro e se repete em todo turno.

Sobre o piso, o que a IA trouxe para o contexto nos quatro objetos somou cerca de
216 mil tokens, assim divididos:

| Parcela | Tokens | Parte |
|---|---|---|
| leitura do `modulos/esboco/README.md` (135 KB, lido em 2 a 4 pedaços por objeto) | 94 mil | 44% |
| imagens abertas (2 a 20 por objeto) | 59 mil | 27% |
| saída do gate e da leitura padrão do comando | 18 mil | 8% |
| leitura da skill `esboco-detalhado` | 14 mil | 6% |
| `--descrever` | 8 mil | 4% |
| escrita do JSON | 7 mil | 3% |
| texto da própria IA | 5 mil | 2% |
| `--analise`, `--condutor`, `--vista`, `--editar` e o resto | 10 mil | 5% |

## O que multiplica

O custo real é o contexto multiplicado pelos turnos, porque todo turno reenvia o
contexto inteiro. Os quatro objetos levaram 15, 16, 27 e 44 turnos, com contexto
final de 105 mil a 192 mil tokens, e a entrada somada de todos os turnos foi de
1,4 milhão (cadeira) a 6,3 milhões (guarda-roupa) de tokens, quase toda em cache.
O guarda-roupa custou mais por ter tido mais turnos (três rodadas, a segunda
contornando o defeito do desenho) e mais imagens (20).

## O que isso diz

A escrita do esboço, que é o trabalho, é 3% do que entra no contexto. O que pesa
é o README do módulo, que o agente usa como referência do JSON e lê quase
inteiro em todo objeto, e as imagens, abertas inteiras a cada conferência. Cortar
esses dois e o número de turnos é o que barateia o esboço; a skill e os comandos
pesam pouco.
