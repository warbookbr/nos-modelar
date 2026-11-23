# Ponte com a mecatrônica: a ficha do objeto exportada, as portas elétricas declaradas e o pedido que volta conferido

**Estado:** ativo

**Território:** `modulos/ficha-do-objeto/`, `procedural/familias/componente-eletronico/portas-eletricas.js`, `procedural/familias/componente-eletronico/portas-eletricas.test.js`, `procedural/pecas/braco-robotico/ponte.json`, `tools/modelar/exportar-ficha.mjs`, `tools/modelar/exportar-ficha.test.mjs`, `tools/modelar/conferir-pedido.mjs`, `tools/modelar/conferir-pedido.test.mjs`, `docs/modelar/banco-de-provas/ponte-mecatronica-2026-11-23/`. A placa e a base do braço ficam com o plano das trilhas.

Ativado pela pessoa em 2026-11-23, que deixou o curso e a redução das juntas do braço à recomendação da IA, como estimativa.

**Responsável:** a IA da sessão implementa; a pessoa decide o que muda o contrato com a mecatrônica, os valores declarados do braço (curso e redução das juntas, densidades) e o que fazer com pedido que mude forma aprovada.

**Repositório e base:** `warbookbr/nos-modelar`, main na ativação; o outro lado do contrato é `warbookbr/nos-mecatronica`, pelo contrato da ponte (`ponte/README.md` de lá) e pelas decisões 0001 (forma separada da simulação) e 0004 (cópia de referência dos esquemas) de lá.

Gerado pelo plano-raiz [o lado Modelar da mecatrônica](2026-11-16-eletronica-no-modelar.md), fatia 2. Revisto em 2026-11-23 contra o que a mecatrônica entregou depois do rascunho: os esquemas da ficha e do pedido na versão 1.0, aprovados pela pessoa nos exemplos do braço de prova, o conferidor `ponte:conferir` e a conversão para o MuJoCo.

## Problema observado

A simulação de ligações, circuito, programa e física de um objeto do Modelar mora no nos-mecatronica, que nunca edita geometria: ele lê a ficha do objeto que o Modelar exporta e devolve um pedido que o Modelar cumpre e confere. Os esquemas dos dois arquivos já existem lá na versão 1.0 (`ponte/esquemas/`), com o SHA-256 de cada versão em `versoes.json`, e um braço de prova escrito à mão mostra o formato. Do lado do Modelar nada existe: não há cópia dos esquemas, a ficha não é exportada, as portas dos componentes não dizem o tipo elétrico, nenhum material tem densidade, a montagem do braço (`procedural/pecas/braco-robotico/montagem.json`) declara os doze anéis assentados mas não diz quais peças giram juntas nem por qual eixo, e nenhum leitor confere um pedido. Na matriz da mecatrônica, as linhas `ponte-ficha-exportada`, `ponte-portas-eletricas`, `ponte-massa-e-inercia`, `ponte-pedido-cumprido` e `ponte-verificacao-no-modelar` têm o Modelar como dono e estão em falta, e tudo o que a mecatrônica faz depois (ligações, circuito, física) espera uma ficha de verdade.

A ficha 1.0 pede mais do que o rascunho previa: as juntas com eixo, curso, redução e o motor que a aciona, os conjuntos com massa, centro de massa e inércia, a malha em glTF binário e a tensão de cada porta. Todo valor leva a origem (medido, declarado ou estimativa), e o que o Modelar não sabe vai como `{ ausente: true, motivo }`, que o contrato aceita.

## Resultado

O Modelar exporta por comando a ficha do braço robótico, igual byte a byte em duas exportações e aceita pela cópia conferida do esquema de lá e pelas regras de referência do contrato, e lê um pedido da mecatrônica, escrevendo em cada item a resposta (`cumprido` com a revisão da ficha, ou `nao-cumprido` com o motivo).

## Filtro Agent-First

Cópia dos esquemas: USAR DIRETO os arquivos de lá, copiados byte a byte para `modulos/ficha-do-objeto/esquemas/`, com um teste que confere o SHA-256 contra o `versoes.json` copiado junto, como manda a decisão 0004. A validação é pelo `ajv` (dependência do repositório, modo 2020-12), mais as regras de referência que o JSON Schema não exprime, as mesmas do `ponte:conferir` de lá.

Exportação da ficha: CRIAR em `modulos/ficha-do-objeto/` e o comando `exportar-ficha`. Ela lê a montagem resolvida (instâncias, poses e portas), a placa declarada e a declaração da ponte do objeto, mede o que a geometria dá (caixa, faces, volume, posição e eixo dos anéis) e escreve a malha pelo exportador glTF que o Modelar já tem.

Declaração da ponte do objeto: CRIAR `procedural/pecas/<objeto>/ponte.json` com o que a ficha pede e a montagem não tem: os conjuntos (quais instâncias giram juntas), as juntas (o anel de cada uma, o curso, a redução e o motor, que no braço é nulo porque ele não modela motor) e a densidade de cada material, cada valor com a fonte. Foi descartado pôr esses campos no `montagem.json`, que mudaria o formato salvo da montagem semântica e as montagens do acervo.

Portas elétricas: CRIAR uma tabela geral por encapsulamento na família de componentes (`portas-eletricas.js`), que dá a cada terminal o tipo e a tensão nominal quando o encapsulamento a fixa; a placa declarada leva as portas à ficha no referencial da montagem pela pose dela. O núcleo não ganha nada de eletrônica.

Massa e inércia: ENVOLVER o volume da malha fechada de cada peça, multiplicado pela densidade declarada, como estimativa; o conjunto soma as peças dele. Peça sem densidade sai ausente, com o motivo.

Pedido: CRIAR o leitor e o conferidor no mesmo módulo, com as réguas que o Modelar já tem (caixa, contato, abertura) e o conferidor de cobre do plano das trilhas para o item `ligacoes`.

## O que é do Modelar e o que não é

Os esquemas são da mecatrônica, e o Modelar só copia e confere a cópia; campo novo no contrato é proposto daqui e mudado lá. As ligações, o circuito, o programa e toda simulação moram no nos-mecatronica. O pedido nunca muda a forma sozinho: cumpri-lo é mudar a receita da peça pelo fluxo normal, e a pessoa aprova a forma.

## O que precisa mudar no contrato (decisão da pessoa, lá)

Os pinos de componente passivo (resistor, capacitor, LED, cerâmico) não cabiam em nenhum tipo de porta da ficha 1.0, e o pedido 1.0 não tinha onde levar a lista de redes das trilhas. A pessoa aprovou em 2026-11-23 o plano da versão 1.1 lá, com o tipo de porta `passivo` e o item `ligacoes`, e a 1.1 entrou na main da mecatrônica no mesmo dia, aceitando também arquivo 1.0. A fatia 1 copiou a 1.1.

## Incluído

- a cópia dos esquemas da última versão de lá (1.1) com o SHA-256 conferido, e o validador (esquema e referências);
- o comando `exportar-ficha` e a ficha do braço: a malha glTF, os conjuntos e as peças (as instâncias da montagem e os componentes da placa, com família e variante), a posição e a orientação em eixo e ângulo no referencial da montagem, as juntas com o eixo medido no anel, as portas, e `volumesLivres` vazio;
- a tabela das portas elétricas por encapsulamento na família de componentes;
- a massa, o centro de massa e a inércia por peça e por conjunto onde houver densidade, como estimativa;
- o comando `conferir-pedido`, que recusa versão desconhecida e referência inexistente e responde, item a item, espaço (a caixa pedida livre de malha dentro da peça), posição (a peça no lugar pedido dentro da tolerância), saída de ar (a abertura da peça com a área pedida), ligações (pelo conferidor de cobre) e passagem (não cumprida com o motivo enquanto o Modelar não modela chicote);
- um pedido de prova escrito à mão para o braço, com um item cumprido, um não cumprido e um recusado, e o banco de provas.

## Excluído

- a mudança do contrato, feita lá pelo fluxo da mecatrônica;
- o chicote modelado e a passagem conferida pela geometria, que pedem a ferramenta de cabo e plano próprio;
- volumes livres medidos, que entram quando um pedido de espaço não puder ser conferido sem eles;
- mudar a forma aprovada do braço para cumprir pedido sem a aprovação da pessoa.

## Gate de saída

1. A cópia dos esquemas confere com o SHA-256 da última versão de lá, e um teste falha se um byte mudar.
2. A ficha do braço exportada duas vezes sai igual byte a byte e passa no esquema e nas regras de referência; uma ficha com campo ausente, versão desconhecida ou porta de peça inexistente é recusada com o caminho do campo e a versão.
3. A ficha do braço passa também no `ponte:conferir` de lá, rodado sobre uma cópia local do outro repositório, e o relatório diz quantas portas ficaram de fora por falta de tipo.
4. O pedido de prova é lido e respondido item a item, com o motivo de cada não cumprido e o identificador de cada recusado.
5. O retrato do acervo e as etapas fixas do braço não mudam, e nenhum arquivo do núcleo menciona eletrônica, porta elétrica ou simulação.
6. A nota de uso no catálogo de módulos e no guia de montagens, e a proposta do tipo `passivo` entregue à mecatrônica, com o estado dela no fechamento.

## Fatias

1. Feita em 2026-11-23. A cópia dos esquemas 1.1 com o SHA-256 e o validador (`modulos/ficha-do-objeto/`); a declaração da ponte do braço (`procedural/pecas/braco-robotico/ponte.json`, sete conjuntos e seis juntas, com o curso e a redução recomendados pela IA e marcados como estimativa); a ficha mínima por `npm run exportar:ficha -- braco-robotico` (malha com um nó por peça, 12 peças, juntas com o eixo medido na porta do anel, portas vazias, massa ausente com o motivo), igual em duas exportações, aceita pela cópia do esquema e pelo `ponte:conferir` da mecatrônica na 1.1, que também a converteu para o MuJoCo.
2. As portas elétricas: a tabela por encapsulamento, as portas dos componentes da placa na ficha pela pose dela, e o texto da proposta do tipo `passivo`.
3. A massa, o centro de massa e a inércia, com as densidades declaradas pela pessoa.
4. O leitor e o conferidor do pedido, com o pedido de prova.
5. O primeiro pedido real da mecatrônica para o braço, se chegar; senão, o fechamento com o pedido de prova, a documentação e o banco de provas.

## Riscos e parada

Se algum campo obrigatório da ficha só puder sair conhecendo a simulação, o plano para e a pergunta volta à decisão 0001 de lá. Se o exportador glTF não der um nó por peça com o identificador da ficha, o plano para antes de mudar o exportador, que é de outro módulo. 

## Fechamento

A preencher.
