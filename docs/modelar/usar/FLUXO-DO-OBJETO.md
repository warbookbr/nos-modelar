# Fluxo do objeto

Um objeto de várias partes, como o braço robótico, a empilhadeira ou um carro, é conduzido por um caminho só, de seis passos, e `npm run fluxo:objeto -- <objeto>` lê a pasta do objeto, diz em que passo ele está, o que falta de cada passo, a ação de cada peça e o comando exato que vem agora. O estado vive nos arquivos da pasta, e não na conversa de quem conduz. `--json` dá a mesma leitura para um agente, e `--medir` mede cada peça de verdade em vez de usar as rodadas gravadas.

O documento do objeto é o `DOSSIE.md` da pasta dele, gerado por `npm run dossie -- <objeto>` do que já está gravado (o `PLANO`, as operações de cada parte, as rodadas com nota, atrito e decisão da pessoa, as tentativas e os atritos dos planos que cobrem a pasta, o aceite do alinhamento, as faces e o tempo), com duas seções à mão por parte, as escolhas de técnica e a dívida conhecida. Fora ele só ficam o `ALINHAMENTO.md`, que o dossiê lê como fonte do aceite, e o que as referências usam em `referencias/`: `npm run dossie:check` recusa qualquer outro `.md` escrito à mão na pasta do objeto.

Há um segundo comando, `npm run objeto -- <objeto>`, e ele não é outro caminho: é o comando do passo 2 quando as referências passam por mapa de partes e prancha de contornos. Ele lê o estado dessas duas conversas com crítico (o mapa e a prancha) e lista o pacote de referência que o modelador e o crítico recebem. Use `fluxo:objeto` para saber o que fazer, e `objeto` para conduzir ou conferir as referências do objeto que as tem mapeadas.

## Os seis passos, na ordem em que o objeto é produzido

### 1. Alinhamento

A pessoa e a IA combinam como o objeto funciona, as partes, a escala, a ordem de montagem e o que fica fora do modelo (skill `alinhar-modelagem`). Sai `ALINHAMENTO.md`, com a tabela de medidas, a seção das partes (cada item da lista é uma peça, com nome de pasta em minúsculas e hífen) e o que reprova o objeto. O `PLANO` de cada peça sai dele, escrito pelo modelador na receita.

O passo só está feito com o aceite da pessoa registrado no próprio arquivo, numa seção `## Aceite` com uma linha por aceite e a data:

```
## Aceite

- alinhamento: aceito pela pessoa em 2026-11-11, "as palavras dela".
- rascunho: aceito pela pessoa em 2026-11-11, "as palavras dela".
- delegação: pela pessoa em 2026-11-11, "as palavras dela" (vale para os dois).
```

O alinhamento que um agente despachado escreve sem a pessoa presente fica como proposto: toda escolha que a referência não decide vai para a seção `## Decisões que dependem da pessoa`, um parágrafo por decisão, com a recomendação, e nenhuma linha de aceite. O fluxo mostra o passo como proposto, aguardando a pessoa, lista as decisões e não manda criar receita. Quem conduz com a pessoa leva as decisões a ela e só então registra o aceite. O objeto que já tem receita não fica preso por falta do registro: o fluxo avisa "sem registro de aceite" e segue, e a delegação ou o combinado com a pessoa que o alinhamento já conta em texto vale como aceite.

### 2. Referências

Imagens de referência em `referencias/`, uma por vista e sem marca nem logotipo, com o contorno por parte quando a conferência pedir. Duas conversas com crítico saem daqui, e `npm run objeto` acompanha as duas.

O mapa de partes. O agente `desenhador-de-contorno` semeia cada parte na imagem, e o `critico-visual` julga o pacote pelo roteiro, divisa por divisa. Nota 9 fecha, abaixo volta, até três rodadas, e depois a pessoa decide (skill `contorno-da-imagem`). Saem, ao lado da imagem, `<imagem>.regioes.json` com as sementes, `<imagem>.contornos.json` com o contorno de cada parte em milímetro, `<imagem>.pacote/` com `mapa-de-partes.png` (cada parte pintada a 20% por cima da imagem, com número e nome) e as folhas de divisa, e `<imagem>.regioes.rodadas/`.

A prancha. O agente `desenhista-de-prancha` escolhe as cotas de cada parte, confere a calibração e anota o que a imagem esconde, e o `critico-visual` julga com a mesma regra (skill `prancha-dos-contornos`). Entra `<imagem>.contornos.json`. Saem `<imagem>.prancha.json`, `<imagem>.prancha.svg` e `.png`, `<imagem>.prancha.pacote/roteiro.md` e `<imagem>.prancha.rodadas/`. O desenhista só corrige defeito do tipo `cota`; defeito de forma de contorno volta para o mapa de partes, porque o contorno vem dele. Medida que a vista esconde vem de outra imagem do mesmo objeto, com contornos próprios. Toda parte declara largura e altura, por `origem` ou `medivel: false` com motivo, e faltando alguma o comando para com código 4 e lista as faltas.

Objeto de lataria. A carroceria, a carenagem e o invólucro que se dividem em painéis têm a prancha desenhada por medida declarada (skill `desenhar-prancha`), com a silhueta, as aberturas e as linhas de painel nas quatro vistas. É nela que as linhas de painel são desenhadas e conferidas, antes do rascunho; o rascunho as leva ao núcleo como as linhas de vão de `paineisPorVaos`, e a técnica está em `modelar-veiculo-em-chassi-e-lataria.md`. Objeto de lataria sem imagem mapeada não passa por `npm run objeto`: a prancha por medida é o alvo.

Referências fora da pasta do objeto. O objeto cujas referências já existem noutra pasta do repositório, citadas pelos registros das rodadas que as produziram, as aponta em `referencias.json`, `{ "pasta": "<caminho relativo à pasta do objeto>", "motivo": "..." }`, em vez de copiá-las; é o caso do avião. O objeto não pode ter as duas coisas.

Papel de cada imagem. Com mais de uma imagem, o arquivo `papeis.json` da pasta `referencias/` declara o papel de cada uma: `{ "imagens": { "<imagem>": { "papel": "principal" | "apoio" | "substituida", "motivo": "...", "por": "..." } } }`. A principal passa pelo mapa e pela prancha. A de apoio passa só pelo mapa e dá medidas à prancha principal por `origem`. A substituída fica fora e declara `por` qual imagem e o `motivo`. Sem o arquivo, toda imagem com regiões é principal. `npm run objeto` lê esse arquivo.

### 3. Rascunho

O rascunho do objeto inteiro em `referencias/<nome>.esboco.mjs`, pelas formas do esboço 2.0 (skill `esbocar-opcoes` quando há escolha de forma), com a configuração da conferência em `<nome>.conferir.json` e o `resumo.json` que `npm run conferir:vistas` grava em `<objeto>/conferencia/<nome>/`. A conferência configurada e não rodada, ou rodada com sobra acima da tolerância, deixa o passo feito com ressalva. O rascunho também precisa do aceite da pessoa, na mesma seção `## Aceite` do alinhamento (`- rascunho: ...`, ou a delegação que vale para os dois), e proposto sem ele fica aguardando a pessoa. Uma família procedural entra no rascunho por uma chamada de `instanciaDeFamilia` (`npm run capacidade -- familia`).

### 4. Receitas

Cada peça da seção das partes, na ordem da montagem, vira `partes/<peça>/receita.js`, pelo laço de modelagem com um modelador novo e o crítico (skills `criar-peca` e `laco-de-modelagem`). Entram o `PLANO` da peça, escrito a partir do alinhamento, as peças já fixas e o pacote de referência. Saem a receita e as rodadas. A `montagem.json` se escreve junto das receitas, porque a peça depois da primeira precisa dela para passar no `guarda:referencial`.

O que várias peças dividem mora em `partes/_comum/`, o módulo comum do objeto: a superfície e as linhas de vão de uma lataria, as ferramentas de um chassi. Ele não é peça, as receitas o importam por caminho relativo, e o fluxo o lista com as receitas que o importam e avisa quando ele mudou depois da última rodada de uma peça que depende dele; nesse caso a peça pede uma rodada nova. O pacote de referência que o modelador e o crítico recebem vem na ordem: a imagem de referência, a prancha limpa (`<imagem>.prancha.png`) e o mapa de partes com as folhas de divisa. A ordem de entrega é diferente da de produção porque a prancha sai dos contornos do mapa; entregar as três ao crítico não fere a regra de não contar como a peça foi feita, porque elas vêm da referência.

A parte cuja receita tem passos e mudou desde a última rodada registrada (o arquivo da receita, a pasta de módulos ao lado dele e, de forma recursiva, o que as fontes importam por caminho relativo dentro da pasta do objeto, como o módulo comum), ou que tem receita com passos e nenhuma rodada, ou cuja receita não importa, é acusada por `npm run fluxo:objeto`: o passo das receitas fica em falta e a linha da peça traz `SEM RODADA`; nos objetos que o envio mudou, o gate `npm run rodadas:check` a recusa também. A saída é registrar a rodada, ou a pessoa declarar a receita sem rodada no arquivo `sem-rodada.json` da pasta de rodadas da peça, no formato do `limite.json`: `{ "receita": "sha256:<do texto de hoje>", "por": "<quem, AAAA-MM-DD: as palavras dela>", "motivo": "..." }`; a declaração vale só para aquele texto da receita e deixa de valer quando ele muda. A declaração é da pessoa, com o nome dela e a data de hoje ou antes: o `por` com o nome de um papel de agente, de um modelo, "a pessoa" sem nome ou data futura não vale. A ferramenta não prova quem escreveu o arquivo; o que o processo cumpre é que o arquivo novo é uma mudança do envio, coberta pelo `territorio:check` (território de plano ativo ou `Fora-do-territorio:` com motivo num commit do envio), e que a pessoa decide ao revisar esse envio.

### 5. Montagem

A pessoa aceita cada etapa, fechada pelo crítico ou, com defeito em aberto, por aceite humano (`npm run etapas -- <montagem.json> --fixar <instância> --por "<quem, data>"`, e `--aceite-humano` com defeito em aberto). Sai `montagem.etapas.json`. Só a pessoa reabre uma etapa fixa, com `--reabrir <instância> --por "<quem, data: motivo>"`; a etapa volta a aberta, o aceite e a receita antigos ficam em `reaberturas`, e as posteriores ficam fixas quando provam que não mudaram (a forma do aceite e as portas da etapa reaberta que elas citam); o comando recusa etapa que não está fixa nem quebrada e posterior que mudou, dizendo qual e o quê, e essa se reabre da última para a primeira. O registro guarda de cada etapa fixa a assinatura da malha; comentário, `meta` e `PLANO` que mudam sem mudar a malha não quebram a etapa, e quando a malha ou uma junta muda a etapa vira `quebrada` e o aceite vai para `reaberturas` com o motivo.

### 6. Fechamento

Todas as etapas fixas. Ficam a auditoria da montagem (`npm run etapas -- <montagem.json> --auditar`) e o custo por peça (`npm run custo:peca -- <objeto>`). Por último, `npm run dossie -- <objeto>` gera o `DOSSIE.md` do objeto, e a pessoa ou o modelador escreve nele as duas seções à mão, as escolhas de técnica com o porquê e a dívida conhecida (o que a peça ainda não cumpre e foi aceito, e por quem); o gate `dossie:check` cobra o dossiê em dia de todo objeto que o envio mudou.

## Regras que valem em todos os passos

Quem produz não julga o próprio resultado, e o crítico não recebe a história da construção. Toda conversa com crítico tem limite de rodadas, e depois dele a decisão é da pessoa. Etapa com defeito em aberto só passa por aceite humano. No mapa de partes e na prancha o aceite é gravado com `--aceite-humano --por="<quem, data: motivo>" --pendencias="<texto>"`, que guarda em `aceite.json` na pasta de rodadas quem aceitou, quando, a última nota, os defeitos em aberto e as pendências; nas etapas da montagem é o `--aceite-humano` de `etapas-da-montagem`. Nenhum agente usa o aceite por conta própria, e o agente despachado que escreveu o alinhamento ou o rascunho registra o que propôs, e não o aceite. A saída de cada passo fica em arquivo na pasta do objeto, para o seguinte ler do disco em vez de depender de quem conduz lembrar.

## A peça: receita e esteira

O que vale para cada peça do objeto, e para a peça avulsa, que é um objeto de uma parte só: a receita de uma peça e a esteira que a valida.

### Documentos e skills

Ao receber um pedido de criação ou modificação geométrica, siga a skill `criar-peca` (um objeto de várias partes é construído parte por parte pelo laço de modelagem) e os documentos do roteiro `modelar/peca`, em especial [`AUTORIA-DE-PECA.md`](AUTORIA-DE-PECA.md) e [`GOTCHAS-AUTORIA-VISUAL.md`](GOTCHAS-AUTORIA-VISUAL.md) antes de definir a geometria.

Antes de escrever à mão o arco de roda, o retângulo de cantos arredondados, a área com sinal ou o recuo de um contorno, rode `npm run capacidade -- <nome>` com `recortarArcoNoPerfil`, `retanguloArredondado`, `areaDoContorno` ou `deslocarContorno`: cada um tem ficha com os limites e um exemplo.


### Anatomia canônica de uma receita procedural

Uma receita de peça reside em `procedural/pecas/<nome-da-peca>/receita.js` e segue a cadeia de [`AUTORIA-DE-PECA.md`](AUTORIA-DE-PECA.md): `TABELA` em milímetros exportada como `PARAMS`, `derivar`, `gerarPassos` e `get PASSOS`. O exemplo mínimo abaixo é executado por `tools/modelar/exemplo-canonico.test.mjs` pelo caminho do acervo. Acima de 1.000 linhas, a receita se divide em `receita/<assunto>.js` só movendo texto, com a `TABELA`, `gerarPassos` e o `PLANO` no arquivo principal e a malha igual antes e depois; `npm run receita:mapa -- <peça>` dá o mapa dela.

```javascript exemplo-canonico
export const TABELA = { base_largura: 120, base_profundidade: 80, base_espessura: 10, coluna_lado: 30, coluna_altura: 90 };

/* Caixas em milímetro: { nome, x0, x1, y0, y1, z0, z1, material }. */
export function derivar(T) {
  const base = { nome: 'base', material: 'aco', x0: -T.base_largura / 2, x1: T.base_largura / 2, y0: 0, y1: T.base_espessura, z0: -T.base_profundidade / 2, z1: T.base_profundidade / 2 };
  const coluna = { nome: 'coluna', material: 'aco', x0: -T.coluna_lado / 2, x1: T.coluna_lado / 2, y0: base.y1, y1: base.y1 + T.coluna_altura, z0: -T.coluna_lado / 2, z1: T.coluna_lado / 2 };
  return [base, coluna];
}

const m = (mm) => mm / 1000;

/** Os PASSOS, já em metro: um `cubo`, a `parte` e o `material` de cada caixa. */
export function gerarPassos(T) {
  const passos = [];
  derivar(T).forEach((c, i) => {
    const sel = { origem: { op: 'cubo', id: i + 1 } };
    passos.push(['cubo', { origemId: i + 1, larg: m(c.x1 - c.x0), alt: m(c.y1 - c.y0), prof: m(c.z1 - c.z0), em: [m((c.x0 + c.x1) / 2), m(c.y0), m((c.z0 + c.z1) / 2)] }]);
    passos.push(['parte', { nome: c.nome, sel }], ['material', { sel, usa: c.material }]);
  });
  return passos;
}

export const CONTATOS = [
  { par: ['base', 'coluna'], motivo: 'a face de cima da base, em y 10, recebe a face de baixo da coluna' },
];

const receita = {
  meta: { nome: 'coluna-sobre-base', desc: 'coluna quadrada de aço sobre uma base retangular, duas caixas retas' },
  PARAMS: TABELA,
  MATERIAIS: { aco: { cor: '#6b737b', metalicidade: 0.8, aspereza: 0.4 } },
  TOPO: { origem: 'centro da face de baixo da base; y para cima e a frente da base em +z' },
  PLANO: {
    objeto: 'coluna quadrada de 30 mm de lado e 90 mm de altura sobre uma base de 120 por 80 por 10 mm',
    referencias: ['referencias/alvo.md'],
    escala: { medida: 'altura total da peça', milimetros: 100 },
    partes: [
      { nome: 'base', forma: 'caixa de 120 por 10 por 80 mm no chão, centrada em x e z', tecnica: 'cubo no chão, de y 0 a 10' },
      { nome: 'coluna', forma: 'caixa de 30 por 90 por 30 mm centrada sobre a base', tecnica: 'cubo sobre a base, de y 10 a 100' },
    ],
    criteriosDeReprovacao: ['a coluna não assenta na face de cima da base, em y 10', 'a coluna sai do centro da base'],
  },
  contatos: CONTATOS,
  get PONTOS() {
    const T = this.PARAMS;
    return [
      { nome: 'junta da coluna na base', entre: ['base', 'coluna'], em: [0, T.base_espessura, 0], toleranciaMm: 0.5 },
      { nome: 'topo da coluna', parte: 'coluna', medida: 'maximo', em: [T.coluna_lado / 2, T.base_espessura + T.coluna_altura, T.coluna_lado / 2], toleranciaMm: 0.5 },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
```

Dois limites que só aparecem quando a peça roda. Cada texto do `PLANO` (o `objeto`, a `forma` e a `tecnica` de cada parte, cada critério) tem até 240 caracteres, e o `descrever` recusa o que passar. E a `medida` de um ponto é sobre a caixa da parte: `'maximo'` e `'minimo'` devolvem o canto da caixa nos três eixos, e não o ponto mais alto ou mais baixo da forma; para um ponto da forma que não é canto da caixa, como a ponta de uma lâmina curva, use `'centro'` com a tolerância que a caixa pede ou um ponto entre duas partes.


A parte do `PLANO` que promete feição de poucos milímetros (raio, rebaixo, friso) declara `dePerto: [{ ponto: [x, y, z], oQue, distancia? }]`, até quatro entradas com o ponto em mm do referencial da peça; o pedido ao crítico ganha uma vista de perto de cada uma, e sem ela a feição não se julga.

A receita que usa uma operação de composição (`furoPassante`, `corpoPorFatias`, `chapaDeContorno`, ...) exporta `COMPOSICOES`, a lista de `{ operacao, resultado, parte? }` do que ela devolveu, e o `descrever` mostra os avisos de cada uma (`resultado.avisos` e a conferência da operação) sem reprovar.

### Regras críticas de seleção e sintaxe

Moram, medidas e travadas por teste, em
[`operacoes-procedurais.md`](../../../.claude/skills/criar-peca/references/operacoes-procedurais.md),
e não são repetidas aqui: a cópia que existia nesta seção ensinava `ALIASES`
como objeto, e o núcleo exige lista de pares. As três que mais pegam:

- `{op:'cilindro', id}` seleciona só as laterais; as tampas pedem citação
  própria (`tampa:'fundo'`, `tampa:'topo'`);
- `ALIASES` é uma lista de pares `[nome, definição]`, cada termo uma origem ou
  um `unir` de origens, e não encadeia;
- toda face precisa de `parte` semântica, e identidade nunca é índice nem UUID.

### Esteira canônica de validação local

A esteira aceita nomes curtos, sem caminho nem `.js`. Execute nesta sequência:

```bash
npm run descrever -- <nome-da-peca>
npm run conferir:juntas -- <nome-da-peca>
npm run ativar:bancada -- <nome-da-peca>
npm run bancada -- <nome-da-peca> --vistas=isometrica,frontal,direita,superior --cores
npm run exportar:step -- <nome-da-peca> --somente-validar
```

1. `descrever` passa com código de saída 0, zero referências órfãs, zero faces sem identidade, nenhum contato fora do que a receita declarou em `contatos`, nenhum grupo de partes solto fora do que ela declarou em `ilhas` (`{ contem, motivo }`), nenhuma abertura de chapa fora de `vaos` (a sem moldura de propósito se declara com `semMoldura: { motivo }`), nenhum vão declarado em `vaos` com a moldura incompleta (trecho da borda sem friso, degrau na emenda ou entalhe no canto; a aba parcial de propósito se declara com `parcial: { motivo }`) e nenhuma parte com forma diferente da prometida. A receita que compõe por `CHAMADAS_COMPOSICOES` precisa do registro (`--composicoes=<módulo>`, o mesmo argumento de `npm run varrer`); sem ele o comando recusa dizendo o que falta.
2. `conferir:juntas` mantém folgas e penetrações dentro da especificação.
3. `ativar:bancada` grava `public/sessao-ativa.json` sem recusa do motor.
4. `bancada` grava os PNG em `tools/bancadas/out/` sem erro de enquadramento.
5. `exportar:step --somente-validar` só valida a malha. O STEP físico (o mesmo comando, sem a bandeira) só se gera a pedido explícito do usuário.

## O pacote de modelagem

Consulta, para quem usa os comandos do pacote de uma peça. Um pacote contém `briefing.json` (peça, partes semânticas, envelope, orçamento, portas, vistas e critérios observáveis), `referencias.json` (caminho, papel e proveniência de cada imagem), as tentativas preservadas e as revisões. Uma revisão traz `revisao.json` e as imagens canônicas, com a assinatura do modelo, as contagens, o envelope, os materiais, os corpos, as portas, os critérios por vista, o diagnóstico e a promoção; a tentativa recusada nunca é sobrescrita. O pacote organiza a evidência da tarefa, não substitui a receita da peça nem serve de formato de montagem.

```text
npm run preparar:modelagem -- <pacote>
npm run validar:modelagem -- <pacote>
npm run revisar:modelagem -- <pacote> --revisao=r001
npm run comparar:revisao -- <pacote> --a=r001 --b=r002
npm run validar:critica -- <pacote> --revisao=r001
```

O fluxo oficial cria a revisão e promove só quando todos os gates passam; não se cria `revisao.json` nem imagem à mão para simular promoção. O ciclo de uma peça é declarar o briefing e as referências, criar ou alterar a receita, executar o núcleo, conferir integridade e identidade, medir partes e interfaces, renderizar as vistas canônicas, registrar a crítica objetiva, preservar a tentativa, promover só o aprovado e comparar com a revisão anterior.

O que o fluxo exige e não relaxa: uma parte tem identidade semântica estável, e UUID, índice de array ou posição de passo não se persistem quando existe caminho semântico melhor; o modelo passa sem órfãos, faces sem identidade, corpos inesperados, envelope ou orçamento excedido e material não declarado; vista cortada ou pequena é recusada, e a vista naturalmente fina só passa quando a dimensão longa sustenta a silhueta e a curta ainda prova área projetável, sem distorcer a câmera; o briefing não exige o que o núcleo não expressa (solver de montagem e materiais genéricos seguem fora); e isolar uma peça na vista não prova encaixe, folga nem alinhamento. O pacote de uma peça não absorve um sistema inteiro para evitar definir montagens.

Depois de uma alteração, o sistema de montagens deriva o alvo de edição, o contexto visual, as dependências afetadas e o escopo de validação do mapa estruturado, e não da memória de quem edita. Reexecutar, validar a integridade, reavaliar as interfaces locais, achar os dependentes, revalidar as relações, separar o que continuou válido do que quebrou e publicar só o estado completo e válido existem para o universo explícito autorizado; a descoberta de dependências fora dele e a correção automática dos dependentes não existem. A crítica separa forma, identidade, orçamento, enquadramento e aderência ao briefing, e divergência se registra, não se corrige por pintura ou sobreposição. Uma escrita por MCP ou outra porta exige alvo explícito, planejamento, confinamento, publicação atômica, nenhuma sobrescrita acidental e revalidação. Para montagem, essas garantias foram provadas em perfil MCP opt-in; a receita e as outras portas de escrita por MCP pedem plano e evidência próprios. As expressões nomeadas resolvem números e vetores sem executar JavaScript livre no arquivo salvo. As montagens estão em [`MONTAGENS-SEMANTICAS.md`](MONTAGENS-SEMANTICAS.md) e o contrato de autoria da peça em [`AUTORIA-DE-PECA.md`](AUTORIA-DE-PECA.md).

## Por que o modelo é assim

Consulta para quem muda o Modelar, e não para quem o usa. O objetivo é uma IA criar, refinar, inspecionar e corrigir objetos mecânicos de complexidade crescente, de peças isoladas a uma máquina inteira, construindo e alterando a definição procedural, e não só produzindo uma malha final ou ajustando números de um molde humano. Quando o vocabulário não expressa a intenção, ela consulta a lacuna, compõe uma capacidade reutilizável ou implementa uma extensão nativa por contrato e gates, que pertence à plataforma versionada e não vira código oculto dentro da receita. O ciclo é entender o alvo, criar ou alterar a definição, executar o núcleo, observar, medir e validar as relações, corrigir e revalidar os conjuntos afetados.

Uma máquina composta não é uma receita monolítica, e essa conclusão vem dos requisitos e não de um teste que compare as duas formas: a receita única dificultaria achar o responsável por uma forma, mudar uma parte sem efeito colateral, reutilizar componentes, trabalhar em paralelo, validar encaixes localmente, trocar uma peça, entender as dependências e passar o trabalho a outra IA. Cada subsistema também é composto, e partes do mesmo subsistema pedem níveis diferentes de decomposição. A unidade geométrica editável é a peça, a de composição é a montagem, e as montagens são recursivas. A árvore de contenção não basta, porque a roda se relaciona com o cubo, o eixo, o freio, a suspensão e a caixa de roda: o modelo completo tem um grafo de relações além da hierarquia (contém, instancia, fixa em, encaixa em, gira em torno de, desliza sobre, apoia em, mantém folga com, permanece alinhado com, depende dimensionalmente de, precisa de revalidação quando muda).

O mapa de composição, dependências e relações é dado do sistema, estruturado e validável, e não um texto escrito à mão que diverge do que roda; documentos, árvores e diagramas saem dele. Ele responde quais peças e montagens existem, onde cada instância aparece, qual receita gera cada peça, quais interfaces cada componente publica, quais montagens dependem de uma peça, quais validações se repetem depois de uma alteração e quais componentes se mostram juntos para avaliar uma relação.

A IA não carrega a máquina inteira em cada tarefa: declara um contexto de trabalho com quatro conjuntos, o alvo de edição (o que pode mudar), o contexto visual (o que se mostra para comparar, em leitura), as dependências afetadas e o escopo de validação. Isolar uma peça na vista não apaga o contexto estrutural dela. Para a IA a bancada é superfície de atenção e inspeção, e não a fonte da verdade sobre o que está montado; para a pessoa é também editor, e o que ela desenha sai de lá como medida num arquivo de ajuste que a rodada de absorção traduz em receita, com a fronteira conferida por gate.

Definições lógicas estabelecem o modelo, e experimentos resolvem as fronteiras ainda incertas dentro dele: quando uma região vira peça separada, quanto contexto a tarefa pede, qual representação de interface acha mais erros, até onde propagar a revalidação, quando compartilhar parâmetro ou duplicar variante. O MCP não é o motor 3D, nem a receita, nem a arquitetura de composição: é uma das portas por onde uma IA alcança capacidades que o sistema já define, e a pergunta é quais capacidades de autoria, navegação, inspeção e validação o sistema oferece, antes de decidir quais vão por MCP. Acrescentar escrita ao MCP sem definir antes peça, montagem, identidade, dependência e transação só transportaria uma arquitetura incompleta. Uma camada de autoria, MCP ou não, respeita alvo de escrita explícito, contexto de leitura separado do alvo, planejamento antes de mudança grande, escrita atômica, nenhuma sobrescrita acidental, resposta estruturada, diagnóstico acionável, revalidação dos dependentes, comparação entre a revisão anterior e a nova e a possibilidade de recusar o resultado sem corromper o estado válido. As fronteiras técnicas, a superfície de inspeção visual e o vocabulário procedural vigente têm contrato próprio, que o índice de `docs/modelar/` lista.
