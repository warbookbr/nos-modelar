# Backlog aberto

Este arquivo lista candidatos. Nenhum item é autorização de implementação.
Candidatos ligados à direção de autoria precisam respeitar as invariantes de
[`AUTORIA-IA.md`](../AUTORIA-IA.md) e
[`MONTAGENS-SEMANTICAS.md`](../MONTAGENS-SEMANTICAS.md).

| Candidato | Estado / próximo recorte |
|---|---|
| Separação espacial e impacto local | concluído na montagem v3; relação direcional genérica + mapa derivado, sem colisão geral |
| Caso 3 da homologação | retirado; a pergunta foi respondida com evidência mais forte |
| Formato canônico de montagem recursiva | definir o menor formato que instancia peças e montagens, preserva identidade e não copia autoria geométrica |
| Mapa de composição e dependências | concluído e aprovado: universo explícito, mapa derivado, impacto global MCP, continuidade ativa e recusa concorrente |
| Contexto de trabalho da IA | contexto estrutural, visual e roteiro de revalidação concluídos |
| Revalidação de dependentes | concluída no plano `2026-08-14-revalidacao-cascata-persistida.md`; promoção automática de dependentes permanece fora |
| Escrita transacional de receitas e montagens | concluída para montagem e receita declarativa; continuidade no catálogo aprovada no MCP v5 |
| Leitura e auditoria de montagem por MCP | concluído: aprovar; descoberta explícita, contexto, revalidação, catálogo e vistas sem escrita |
| Autoria por MCP | montagem e receita declarativa concluídas em perfil opt-in; módulos JS históricos permanecem fora |
| Experimento de autoria geométrica do zero | concluído: correção publicada por autoria declarativa; decisão final aprovar |
| Autoria segura de receitas | concluída para contrato declarativo v1 e MCP opt-in; revisão ativa já alimenta o catálogo, módulos JS históricos permanecem fora |
| Alteração semântica compacta | candidato posterior ao mapa: mudar por ID/campo, recompor documento completo e confirmar bytes finais |
| Histórico operacional e variantes | comparar, reativar como nova transição e ramificar sem mover estado ativo implicitamente |
| Onboarding e custo de contexto | medir leitura e inspeção com o MCP aprovado, sem confundir economia de contexto com capacidade de autoria |
| Seleção de contexto pela IA | medir como a IA escolhe alvos, pares, subárvores e conjuntos sem carregar o sistema inteiro |
| Diagnóstico visual estruturado | ligar medidas e falhas a entidades visíveis por identidade semântica |
| Costuras topológicas de `lathe` | investigação de núcleo, sem alterar receita por atalho |
| Endereço único para grupo linear | capacidade semântica aberta |
| Abertura oblonga | ainda não expressável; não simular com pintura |
| Contrato genérico de materiais | capacidade futura, sem PBR ou paleta nova por implicação |
| Movimento e espaço varrido | futuro; exige montagem, pose e relações persistidas antes de solver ou cinemática geral |
| A-4, A-6, A-7, A-8, A-16 e A-29 | capacidades abertas comprovadas, sem inventar IDs novos |

## Ordem lógica, não ordem executiva

Algumas dependências já podem ser afirmadas sem abrir plano:

1. montagem persistida depende de identidade estável de peça e instância;
2. mapa de dependências depende de composição e relações persistidas;
3. contexto de trabalho depende do mapa;
4. revalidação automática depende de relações mensuráveis;
5. escrita por qualquer porta reutiliza um serviço interno transacional;
6. MCP pode avançar no mesmo plano assim que esse contrato for executável e
   verificável, sem virar uma barreira temporal permanente.

Essa ordem não escolhe o primeiro plano nem autoriza implementação automática.

## Candidatos medidos e recusados por falta de evidência

Medido em 2026-08-17, no acervo inteiro. Os três apareciam como "candidatos sem
plano" e foram testados pela mesma régua que retirou os seletores relacionais,
o A-16 e o Caso 3: **capacidade entra quando há evidência de que ela está
travando alguém, não quando é plausível**.

| candidato | medida | decisão |
|---|---|---|
| `alinhar` (centragem derivada) | 3 de 95 `transladar` têm cara de centragem, e os três já usam parâmetro nomeado (`centroBuchaY`), não conta na mão | recusado |
| `loft` fechado | 0 de 22 — **medida inválida**, ver abaixo | **implementado** |
| variantes nomeadas de revisão | nenhuma ramificação ocorreu; a cadeia de autoria é linear e a escrita concorrente é recusada, não ramificada | recusado |

A comparação que decide: `em`/`eixo` entrou com **128 de 853 passos** (15%) em
transporte puro, e o ponto nomeado com **18 de 61 parâmetros** do freio
existindo só para nomear 6 pontos. Essa é a ordem de grandeza de um atrito real.
Três ocorrências que já usam nome, e zero ocorrências, não são.

**A medida por uso não serve para capacidade ausente, e isto foi um erro meu.**
Contar quantas peças usam algo só mede ATRITO — o rastro que uma solução de
contorno deixa. Capacidade que não existe não deixa rastro: ninguém escreve o
que o motor recusa. O rasgo e o `lathe` fechado, entregues no mesmo dia, também
tinham **zero** uso anterior, e não foram recusados por isso — a pergunta certa
para eles foi "é forma mecânica real que hoje é impossível?".

O `loft` fechado responde sim a essa pergunta: mangueira em anel, aro fechado e
tubo em laço são formas reais, e o caminho que volta em si produzia uma costura
não soldada. Ele foi implementado.

`alinhar` continua recusado, e ali a medida **vale**: centrar já é possível hoje
escrevendo a conta, então o atrito deixaria rastro — e o rastro é 3 em 95, já
com nome. Variantes seguem sem evidência dos dois tipos.

Reabrir os recusados exige **evidência nova de campo** — uma peça ou uma
sessão em que a falta atrapalhou —, não a lembrança de que já estiveram na
lista. Enquanto isso, `alinhar` e `loft` fechado permanecem descritos aqui como
forma conhecida, para que ninguém precise redescobri-los do zero quando a
evidência aparecer.
