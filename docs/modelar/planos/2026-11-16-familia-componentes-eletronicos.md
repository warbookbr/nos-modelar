# Família de componentes eletrônicos: as peças por encapsulamento e a placa declarada, provadas no braço robótico

**Estado:** concluído

**Território:** `procedural/familias/componente-eletronico/`, `procedural/familias/index.js`, `procedural/pecas/braco-robotico/partes/base/`, `docs/modelar/banco-de-provas/componentes-eletronicos-2026-11-16/`

Ativado pela pessoa em 2026-11-16, ao ver as pranchas da placa do Eletrifica, como o caminho para a placa em 3D com os componentes.

**Responsável:** a IA da sessão implementa; Tiago aprova por imagem.

**Repositório e base:** `warbookbr/nos-modelar`, main na ativação.

Gerado pelo plano-raiz [o lado Modelar da mecatrônica](2026-11-16-eletronica-no-modelar.md), fatia 1. Objeto-alvo escolhido pela pessoa em 2026-11-16: o braço robótico.

## Problema observado

O braço robótico (`procedural/pecas/braco-robotico/`) tem, pelo [alinhamento](../../../procedural/pecas/braco-robotico/ALINHAMENTO.md), uma caixa colada no lado esquerdo da base, e os objetos com eletrônica do acervo (o braço, os eletrodomésticos, o furgão) mostram caixas ou nada onde haveria placa e componentes. O Modelar não tem família de peça eletrônica nem placa de circuito como peça, e uma placa feita à mão em cada receita repetiria o mesmo trabalho de medidas e de forma.

O Eletrifica (`brigsd/Eletrifica`, commit 64b62f0) já reconstrói uma placa em 3D: `modulos/pcb/render_3d.py` tem a tabela `BODIES` (corpo por peça: caixa, TO-220, módulo, com largura, profundidade, altura e cor típicas do encapsulamento) e `MODULES` (os módulos de placa como o ESP32 e o driver A4988), e põe cada peça na posição e no giro tirados dos pads. Ele declara que o corpo é estimativa e a posição é fato; aqui não há Gerber, e a posição vem da receita.

## Resultado

Uma família `componente-eletronico` gera, por parâmetros, as peças eletrônicas comuns pelo encapsulamento, e uma placa declarada na receita (contorno, espessura, furos e a lista de peças com posição e giro) monta a placa com essas peças; o braço robótico passa a ter, na caixa lateral da base, uma placa de controle com os drivers dos motores das juntas, a alimentação e o conector, no lugar da caixa vazia.

## Filtro Agent-First

Família de encapsulamentos: CRIAR em `procedural/familias/componente-eletronico/`, com o mesmo formato das famílias que existem (`familia.json`, `derivar.js`, `composicoes.js`, `aprovacao.json`, teste), um tipo por encapsulamento e as medidas típicas como parâmetros com faixa. A intenção do autor é "um capacitor eletrolítico de 10 mm por 16 mm aqui", sem desenhar o cilindro.

Placa: ENVOLVER a família numa composição de placa (ou num ajudante declarado na família) que recebe o contorno, a espessura, os furos e a lista `{ tipo, parametros, posicao: [x, y], giro, lado }` e devolve a placa com as peças, cada peça na própria parte para a montagem poder citá-la depois (é o que a ficha do [plano da ponte](2026-11-16-ponte-com-a-mecatronica.md) vai citar).

Núcleo: USAR DIRETO o que existe (`extrusao` com furos para a placa, `lathe`, `loft`, `cubo`, `arranja` para pinos repetidos). Se faltar uma capacidade, ela entra com nome geral e plano próprio; este plano não muda o núcleo.

Leitor de Gerber: fora, no nos-mecatronica.

## Incluído

- a família com os encapsulamentos: resistor axial, capacitor eletrolítico radial, capacitor cerâmico de disco, LED de 3 e 5 mm, TO-220 (regulador, transistor), TO-92, DIP de 8 a 40 pinos, SOIC de 8 a 16, conector de pinos em barra (1 a 40 vias, 1 ou 2 fileiras), borne de parafuso (2 e 3 vias), jack de alimentação, módulo de placa (a placa filha com pinos, para o driver de passo e o microcontrolador em módulo), e o dissipador do TO-220;
- as medidas típicas de cada encapsulamento, declaradas como estimativa e com a fonte (a tabela do Eletrifica onde ela já tiver o valor, e a medida de mercado onde não);
- a placa declarada, com a face superior e a inferior, os furos de fixação e os terminais que atravessam a placa;
- a cor das peças por escolha na receita, com os materiais que a receita declara (sem paleta nova de projeto);
- no braço robótico: a caixa lateral da base com tampa ou aberta para mostrar a placa de controle, com um driver por motor das juntas, a entrada de alimentação, o regulador, o microcontrolador em módulo e o conector que sai para os motores;
- o banco de provas com as imagens e as medidas.

## Excluído

- portas elétricas e a ficha do objeto, que são do plano da ponte, e ligações elétricas, fios e verificação de circuito, que são do nos-mecatronica;
- trilhas de cobre desenhadas como caminho, que ficam como textura ou relevo simples da face, sem significado elétrico;
- o leitor de Gerber e a reconstrução de placa existente, que são do nos-mecatronica;
- foto de componente com marca no repositório.

## Gate de saída

1. A família passa no teste de família do projeto (`procedural/familias/familias.test.js` e o teste próprio), com cada encapsulamento gerado no mínimo, no padrão e no máximo da faixa, malha fechada e medidas conferidas contra os parâmetros.
2. Uma prancha com todos os encapsulamentos lado a lado, ao lado de fotos de componentes reais parecidos (locais, fora do repositório), aprovada pela pessoa.
3. Uma placa de prova declarada, com uma peça de cada tipo, gera sem recusa, com cada peça na posição e no giro declarados (conferido por teste) e cada peça numa parte própria.
4. O braço robótico com a placa de controle na caixa lateral, de perto e no conjunto, aprovado pela pessoa, e `node tools/modelar/guardas/guarda-acervo.mjs braco-robotico` sem reprovação nova.
5. A malha das outras peças do acervo inalterada, pelo retrato do acervo.
6. A nota de uso da família no catálogo e na skill de criar peça.

## Fatias

1. Feita em 2026-11-16, aprovada pela pessoa: a família com cinco encapsulamentos de forma diferente (resistor axial, eletrolítico, TO-220, DIP, conector em barra), com teste e a prancha para a pessoa.
2. Feita em 2026-11-17, aprovada pela pessoa: os encapsulamentos restantes e o dissipador (treze perfis novos, medidas de fonte primária).
3. Feita e aprovada pela pessoa em 2026-11-17 ("sobe a placa"): a placa declarada (`placa.js`, `terminais.js`), com a placa de prova de 16 componentes, furos e ilhas, componentes nas duas faces e as peças publicadas com os nomes de campo da ficha 1.0 da ponte.
4. Feita e aprovada pela pessoa em 2026-11-17 ("Esta boa sim, aprovada!"): a placa de controle do braço robótico na caixa lateral da base, com a tampa fumê, a borda chanfrada e os parafusos de aço escuro.
5. Feita em 2026-11-17: a nota de uso, a prova de cada item do gate de saída no banco de provas e o fechamento.

## Riscos e parada

Se a família precisar de capacidade nova no núcleo (por exemplo, terminal dobrado que nenhuma operação faz bem), a fatia para e a capacidade vira plano ou é simplificada com a pessoa. Se a caixa lateral do braço não comportar uma placa plausível, a pessoa decide entre aumentar a caixa e pôr a placa na base. Se a malha do acervo mudar fora do braço, o plano para.

## Fechamento

Fechado em 2026-11-17, com os seis itens do gate de saída conferidos (a prova de cada um está no [README do banco de provas](../../../docs/modelar/banco-de-provas/componentes-eletronicos-2026-11-16/README.md)).

Entregou a família `componente-eletronico` com treze encapsulamentos (resistor axial, eletrolítico, cerâmico de disco, LED de 3 e 5 mm, TO-220, TO-92, DIP, SOIC, barra de pinos, borne, jack, módulo de placa e dissipador do TO-220), a placa declarada (`placa.js`, `terminais.js`) com os componentes nas duas faces, furos, ilhas e uma parte por componente, e a placa de controle do braço robótico na caixa lateral da base, com a tampa fumê. Os testes da família passam (125 testes em 4 arquivos), a guarda do acervo passa nas treze partes do braço, e o retrato de 121 peças mostra 120 iguais e a base do braço como a única mudada, de propósito. As fatias 1 e 2 (pranchas) e as fatias 3 e 4 (placa de prova e placa de controle) foram aprovadas pela pessoa por imagem.

Ficam fora, sem decisão da pessoa pendente: as três limitações da reabertura de etapas, que fecham no plano [etapas pela impressão do aceite](2026-11-17-etapas-pela-impressao-do-aceite.md); a guarda do acervo só aceita o nome de peça (`braco-robotico/base`) e não o da pasta do objeto, o que o item 4 do gate escreveu errado; e a base de comparação do retrato, que num ramo com ramos irmãos juntados precisa ser montada à mão. As trilhas e a validação da placa seguem no plano [trilhas e validação da placa](2026-11-17-trilhas-e-validacao-da-placa.md).
