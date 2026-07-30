# Melhorias reaproveitáveis pelo NÓS

Este documento acompanha capacidades criadas na Mecanifica que podem voltar ao
repositório original [`brigsd/nos`](https://github.com/brigsd/nos).

Ele não é uma lista de desejos. Uma entrada só avança para “pronta” depois de
implementação, testes e uso em uma peça real.

## Regra de extração

Uma melhoria candidata:

- não importa Three.js;
- não contém conceitos automotivos;
- funciona em modo headless;
- preserva ou migra formatos anteriores explicitamente;
- possui testes independentes da interface;
- fica em commit separado das mudanças de produto;
- documenta arquivos e dependências necessários para cherry-pick.

O remoto Git `source` aponta para o NÓS original. Antes de preparar uma
contribuição, compare a implementação com o estado recente desse remoto e leve a
mudança para um fork verdadeiro de `brigsd/nos`.

## Estados

- **observada:** problema confirmado, sem solução escolhida;
- **em prova:** hipótese sendo exercitada;
- **provada:** usada com sucesso e coberta por testes;
- **pronta para upstream:** isolada, documentada e sem dependências da Mecanifica.

## Escopo de domínio e geometria

O freio a disco foi a prova real desta rodada, mas não é o domínio embutido no
núcleo. Antes de extrair uma capacidade, separe a **ferramenta geral** da
**interpretação mecânica** que a prova usou:

- Identidade estrutural, aliases, parâmetros derivados, posicionamento de
  primitivas, hierarquia de partes, portas semânticas, diagnósticos de referência,
  o gate de ID cru e argumentos estritos não sabem o que é um freio. São
  candidatos gerais para objetos rígidos, orgânicos ou abstratos.
- Caixa por parte, dimensões e componentes conexos também são medidas gerais.
  Elas descrevem geometria; não dizem sozinhas se uma peça está correta.
- A classificação `folga`, `encosta` e `interpenetra` entre caixas é uma régua
  **opt-in para montagem rígida**. Ela foi calibrada para pares com contato
  funcional esperado, como disco/pastilha, pistão/pastilha e suporte/pinça.
  Não é um validador universal de malha nem uma prova de colisão exata.
- Em objetos orgânicos, sobreposição pode ser intencional (pele, folhas, pelos,
  músculos, detalhes encaixados), a forma pode deformar por esqueleto ou animação
  e a continuidade, curvatura e silhueta podem importar mais que uma folga
  positiva. Aplicar essa régua como gate automático produziria falsos defeitos.
  Nesses casos, use-a apenas como relatório, declare pares rígidos específicos ou
  crie métricas próprias de topologia, deformação e aparência.

Portanto, o que não deve subir como capacidade geral é a peça
`freio-disco.js`, suas proporções, a convenção de eixos do veículo e os testes
de contato daquele sistema. O que pode subir é o mecanismo neutro, desde que sua
semântica e seus limites sejam declarados.

## Registro

| ID | Capacidade | Estado | Evidência | Valor para o NÓS |
|---|---|---|---|---|
| UP-001 | Identidade semântica sem dependência de posição do passo | observada | O formato herdado ainda usa blocos `posição × 1000`; uma corrida registrou 234 órfãos | Inserir ou reordenar operações sem quebrar referências |
| UP-002 | Relações espaciais declarativas (`alinhar`, `centralizar`, `encostar`) | observada | A autoria herdada não expressa “encoste A em B”; no freio a disco os 4 contatos viraram soma de espessuras e só um teste guarda a intenção (ATRITOS-AUTORIA A-6) | Compor objetos por intenção, sem calcular coordenadas manualmente; contato deve declarar se é rígido, flexível ou apenas visual |
| UP-003 | Expressões validadas entre parâmetros | observada | Passos aceitam nomes simples, mas não relações gerais entre parâmetros; 21 dos 61 parâmetros do freio são derivados em JS fora do envelope e ficam ineditáveis pela Oficina (ATRITOS-AUTORIA A-5) | Reduzir números duplicados e permitir refinamento paramétrico |
| UP-004 | Verificação de cobertura de nomes agregados | observada | O drone mostrou que um nome pode resolver menos elementos do que promete sem falha técnica | Evitar semântica aparentemente válida, porém incompleta |
| UP-005 | Adaptador neutro para grafos de cena | provada | O drone herdado foi convertido em 23 partes selecionáveis; teste headless e build passaram | Tornar explícita a separação entre autoria e renderizador |
| UP-006 | Gate para faces sem identidade + seleções estruturais no drone | provada | A bancada encontrou 6 faces da lente sem nome e 6 classificadas como pouso; a correção por `origemId` zerou ambas | Impedir que seleções espaciais sobrepostas corrompam nomes sem gerar órfãos |
| UP-007 | Mapa determinístico entre Windows e Linux | provada | Normalização CRLF/LF e ordenação por ponto de código fecharam o CI nos dois ambientes | Evitar mapas diferentes conforme o sistema operacional |
| UP-008 | `origem` estrutural em TODO gerador | observada | O freio a disco mediu: só `cubo`, `cilindro`, `lathe` e `loft` publicam origem; `chamferBox` responde `op de origem 'chamferBox' desconhecida` e deixa 26 faces sem identidade (ATRITOS-AUTORIA A-9) | Metade do vocabulário de geradores hoje não é endereçável por nome, e a forma da peça passa a ser escolhida pela ferramenta |
| UP-009 | Posicionar/orientar na criação da primitiva | observada | 16 dos 52 passos do freio a disco só transportam primitivas da origem até o lugar (ATRITOS-AUTORIA A-4) | Tirar 30% de burocracia de qualquer montagem com eixo diferente de Y |
| UP-010 | Alias de conjunto resolvido tarde (ou diagnóstico de completude) | em prova | 6 órfãos na 1ª execução do freio: alias citado antes da última primitiva que o compõe existir (ATRITOS-AUTORIA A-7). R2/O-11 implementou o ramo DIAGNÓSTICO em `motor/oficina.js` (`completudeDoAlias`, sem Three.js e sem conceito automotivo): a citação precoce passa a dizer em que passo o alias fecha e o que falta; 3 testes em `tools/oficina/oficina.test.ts`. A resolução TARDE (a outra metade da capacidade) segue não feita | O autor pensa em conjuntos; a ferramenta exige ordem de construção |
| UP-011 | Parâmetro de tipo ponto (e caminho) | observada | 18 dos 61 parâmetros do freio existem só para nomear 6 pontos do caminho da mangueira (ATRITOS-AUTORIA A-8) | Qualquer peça com trajeto — cabo, tubo, correia, trilho |
| UP-012 | Hierarquia pai/filho de partes | observada | O freio expõe 8 partes irmãs e não sabe dizer que a pastilha mora na pinça (ATRITOS-AUTORIA A-11) | Regra 3 do contrato de autoria; navegação de montagem em qualquer projeto |
| UP-013 | Relato de caixa por parte e escala na inspeção headless | em prova | 4 leituras de PNG do freio para responder "o eixo está em X?"; a resposta veio de medição feita fora da bancada (ATRITOS-AUTORIA A-13). R2/O-1 extraiu a medição para `src/autoria/descrever-partes.js` (neutro: sem Three.js, sem conceito automotivo) e publicou `npm run descrever`, que mede os 4 encaixes do freio em número; 12 testes em `tools/mecanifica/descrever-partes.test.ts`. A revisão adversarial (ALTA-1) achou que a relação medida FACE A FACE não alcançava `interpenetra` — face plana tem espessura zero na sua normal —, e a medida passou a ser CORPO A CORPO (componente conexo), com o mesmo classificador de `relacaoEntreCaixas`: uma verdade só, e `folga`/`encosta` nunca escondem invasão. Falta o lado da FOTO — escala px/m, gnômon e régua na imagem | Caixa e escala valem para qualquer inspetor 3D; `folga`/`encosta`/`interpenetra` é interpretação opt-in de montagem rígida, não gate para orgânicos |
| UP-014 | Catraca de id posicional: dívida herdada congelada com nome e número | provada | R2/O-4 fundou a catraca; a revisão adversarial da R2 achou que ela media a coisa errada duas vezes. (a) MEDIA-5: cobria 3 formas de coleção e afirmava que eram todas — o núcleo tem 6 (`faces:[ids]`, `sel:{v}`, `sel:{f}`, `vs:[ids]` do `pesar`, `pontos:[{f}]` do pincel livre, `de:[ids]` do `mescla`, esta última declarada como singular sendo coleção); `_oficina-esqueleto` já tinha 24 ids de vértice invisíveis para o gate. (b) MEDIA-6: contava PASSO, então `faces:[0,1]` e `faces:[0..19]` davam o mesmo número e a dívida podia decuplicar sem sair do teto. Corrigido: 6 formas, contagem de ID, e o inventário travado por teste que varre `a.<chave>` dentro de `OPS` — chave nova no núcleo quebra o teste e obriga a classificar. Medido agora: 8244 ids em 13 das 18 peças com `PASSOS`, contra 0 no freio a disco e 0 na peça de exercício do O-14. `tools/bancadas/id-cru.mjs` (sem Three.js e sem conceito automotivo) reprova peça nova, congela a contagem exata em `id-cru-herdado.json` (lista ORDENADA, não mapa: nome que parece inteiro reordena no motor e no `JSON.parse`, e o arquivo se autoinvalidava — BAIXA-11) e só encolhe; 42 testes em `tools/bancadas/id-cru.test.ts`, ligado ao CI. Fora de escopo, declarado e completo: as formas SINGULARES `face`, `v`, `a`/`b`, `para` (`vira` só aceita `face:<id>`) | Toda base herdada tem dívida grande demais para migrar de uma vez; a catraca separa dívida antiga de dívida nova sem migração de risco. E a lição de medição é geral: um gate que conta a unidade errada mente com número, que é a mentira mais convincente |
| UP-015 | Vocabulário DECLARADO de linha de comando: bandeira desconhecida falha | provada | A revisão adversarial da R2 (MEDIA-7) mediu: `--estrit` (uma letra a menos que `--estrito`) saía 0 sem uma linha de aviso e o gate sumia por um typo; `--parte=` imprimia a peça inteira enquanto o autor achava que tinha filtrado; duas peças de uma vez mediam a primeira calado — nos DOIS CLIs irmãos, com validações diferentes. `tools/mecanifica/argumentos.mjs` (sem Three.js e sem conceito automotivo) declara opções, bandeiras e o argumento solto, e recusa nome desconhecido, opção sem valor, bandeira com valor, repetição ambígua e argumento solto a mais, sugerindo o nome certo por distância de edição; 9 testes em `tools/mecanifica/argumentos.test.ts` | A lei do núcleo — referência inválida grita, nunca vira no-op — vale igual na borda: um CLI que engole typo transforma gate em decoração, e o NÓS tem uma dúzia deles em `tools/bancadas/` com o mesmo desenho |

## UP-005 — fronteira de renderização provada

**Problema observado:** `oficina.js` já separava `nucleo()` de `adaptarV3()`,
mas só existia um consumidor real. Isso deixava a independência do núcleo como
uma intenção arquitetural ainda não exercitada por outro motor.

**Solução geral:** `src/autoria/adaptar-three.js` consome apenas o estado neutro
(`V`, `F`, atributos e partes) e produz um grafo de cena. O núcleo herdado não
importa Three.js e não foi alterado.

**Provas:** `tools/mecanifica/adaptar-three.test.ts` verifica preservação de
identidade semântica, ausência de UUID persistido, triangulação e falha antes do
render quando há órfãos. O drone da Fase 4 foi convertido no navegador com 23
partes selecionáveis.

**Como aproveitar no NÓS:** o código Three.js não é candidato direto. A
contribuição útil é transformar a fronteira já existente em contrato explícito
e testável para múltiplos adaptadores. Ainda falta isolar tipos do estado neutro
e documentar quais atributos todo adaptador deve suportar.

**Limites:** a primeira ponte não cobre atlas pintável, suavização compartilhada,
skinning nem animações do adaptador v3. Esses recursos só serão generalizados
quando uma peça real da Mecanifica os exigir.

## UP-006 — semântica do drone provada pela bancada

**Problema observado:** a lente e o pouso eram nomeados por regiões sobrepostas
na origem. O replay permanecia tecnicamente válido, mas seis laterais do
cilindro viravam `pouso`, seis ficavam sem parte e apenas as tampas eram
`lente`.

**Solução geral:** cilindro, cubos e saídas de espelhamento são selecionados por
origem estrutural. O adaptador também publica a contagem de faces sem parte como
diagnóstico explícito.

**Provas:** `tools/mecanifica/drone-semantica.test.ts` conta a cobertura de cada
parte e exige zero faces sem identidade. A bancada reproduziu o defeito,
isolou os lotes contaminados e validou a correção nas mesmas vistas.

**Como aproveitar no NÓS:** a troca das seleções do
`prototipos/fps/v3/pecas/drone-inspecao.js` e o teste de cobertura são
candidatos diretos. O painel Three.js não é necessário para o cherry-pick.

**Limites:** o gate atual detecta ausência de nome; ainda não prova sozinho que
um nome existente significa o conjunto correto. UP-004 continua aberto.

## UP-013 — descrição geométrica com interpretação rígida opcional

**Problema observado:** a inspeção visual do freio não tinha escala nem eixo.
Quatro leituras de PNG foram necessárias para confirmar uma geometria que um
relatório numérico deveria responder diretamente.

**Solução geral:** `src/autoria/descrever-partes.js` calcula, a partir do estado
neutro, caixas, centros, dimensões, faces e componentes conexos por parte. Isso
não importa Three.js, carro ou freio. A relação entre duas partes é derivada da
caixa de cada corpo conectado, não de IDs ou de faces isoladas.

**Escopo:** caixa, dimensão e decomposição em componentes são observações de
geometria. A leitura `folga`/`encosta`/`interpenetra` é uma convenção para corpos
rígidos com portas de montagem declaradas; ela foi provada no freio, não em
malha orgânica deformável.

**Como aproveitar no NÓS:** extraia primeiro a medição neutra e seu
determinismo. Exponha a classificação de relação como consulta ou regra
explicitamente habilitada por par de partes, nunca como reprovação implícita de
qualquer objeto. Um consumidor orgânico pode usar as mesmas caixas para orientar
uma câmera, sem interpretar a sobreposição como defeito.

**Limites:** AABB é uma aproximação conservadora: folga comprovada é segura, mas
interpenetração pode ser apenas das caixas. Não substitui colisão de sólidos,
contato em superfície curva, análise de continuidade, validação de pele ou
deformação por esqueleto. Antes de chamar esta capacidade de pronta para upstream,
prove-a também em uma peça não mecânica e registre quais relações, se houver,
são esperadas.

## Modelo de entrada futura

Ao concluir uma capacidade, acrescente:

```text
ID:
estado:
problema observado:
solução geral:
arquivos:
testes:
compatibilidade:
como extrair:
escopo geométrico:
limites:
```

O histórico detalhado pode viver em um relatório próprio; esta página continua
sendo o índice curto para quem mantém o NÓS.
