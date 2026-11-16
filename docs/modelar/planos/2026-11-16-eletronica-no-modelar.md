# Eletrônica no Modelar: plano-raiz que gera quatro planos a partir do Eletrifica

**Estado:** rascunho

**Tipo:** raiz

**Território:** nenhum. Este plano não muda arquivo de código; ele só gera os quatro planos abaixo, e cada um declara o próprio território ao ser ativado.

**Responsável:** Tiago decide a ordem e aprova cada plano gerado; a IA da sessão escreve os planos filhos.

**Repositório e base:** `warbookbr/nos-modelar`; a fonte é `brigsd/Eletrifica`, commit 64b62f0 (2026-11-16), do mesmo dono.

## Este plano não se ativa

Este é um plano-raiz (`**Tipo:** raiz`). Ele não tem implementação nem gate de código, e não passa a `ativo` nem a `pronto` em momento nenhum; `npm run planos:check` recusa os dois estados num plano-raiz. O que ele produz são quatro planos em `rascunho`, escritos um de cada vez, na ordem da seção Fatias, e cada um passa pelo caminho normal de ativação, com território, gates e fechamento próprios. Ele fecha (`concluído`) quando o quarto plano for escrito, e é cancelado se a pessoa desistir da linha antes disso.

## Problema observado

O Eletrifica é um laboratório de eletrônica em Python com a mesma regra do Modelar: tudo gerado por script. Ele tem duas partes. A primeira é a engenharia reversa de uma placa a partir do Gerber (`modulos/pcb/`): lê o pacote de fabricação, tira a lista de ligações por pino, gera o esquemático KiCad, a lista de peças, os desenhos do layout e uma vista 3D em que a posição das peças é exata e o corpo de cada uma vem de uma tabela por encapsulamento (`BODIES` em `render_3d.py`, declarada como estimativa); duas verificações independentes conferem o esquemático contra a placa e a conectividade pela geometria do cobre, e acharam um defeito real (o transistor do laser sem terra). A segunda é o simulador de uma base modular com fibra óptica (`modulos/conexoes/`, `sistema/`, `energia/`, `termico/`, `optica/`, `dados/`, `rtl/`): lista de ligações do sistema inteiro, salto a salto, um verificador de umas 20 regras (caminho, sentido, energia, banda, temperatura, consumo), um boot em máquina de estados com falhas injetáveis e simuladores físicos.

O Modelar hoje modela a forma e o encaixe mecânico (portas, contatos, vínculos e mecanismos na montagem semântica), mas não tem camada elétrica: um robô, um eletrodoméstico ou o furgão mostram caixas onde deveria haver placa, e nenhuma ferramenta diz se o motor de uma montagem tem alimentação e comando. O Eletrifica já resolveu as partes centrais disso, em outra linguagem e para outro fim.

O Eletrifica usa ferramentas de terceiros que este projeto vai substituir por próprias: o leitor de Gerber (`gerbonara`) e os símbolos de esquemático copiados da instalação do KiCad. A biblioteca 3D do navegador (three.js) o Modelar já tem, e o conversor de SVG (`cairosvg`) só serve à saída em PNG de lá. O Gerber original da placa da CNC fica fora da licença do Eletrifica e não entra no Modelar; a prova dos planos usa Gerber gerado por script.

## Resultado

Quatro planos em rascunho, escritos na ordem abaixo, cada um com o modelo de plano completo; nos três primeiros, a parte do Eletrifica que cada um reaproveita apontada por arquivo e reescrita em JavaScript, nunca copiada como Python; e os três provados no mesmo objeto do acervo.

## Filtro Agent-First

Parte da placa e dos encapsulamentos (`modulos/pcb/`): ENVOLVER, por reescrita. A intenção que entra no Modelar é "ponha nesta peça uma placa com estas peças nestas posições", e a família procedural é a interface; o código Python é referência de medida e de regra, não dependência.

Lista de ligações e verificador (`modulos/conexoes/`): REFATORAR para o domínio do Modelar. A ideia (ligação declarada entre portas, verificador que diz regra a regra o que não fecha, sem consertar) entra; as regras específicas da base óptica não.

Simulador da base óptica, boot, energia, térmico, óptica, dados e RTL: ADIAR. São do conceito da base óptica, e o núcleo do Modelar não conhece domínio de objeto. O quarto plano pode reabrir algum deles com evidência.

## O objeto que usa o resultado

Os três primeiros planos se provam no mesmo objeto do acervo, para a linha não construir estrutura sem uso: uma peça que hoje mostra caixa onde há eletrônica e tem motor ou luz. A pessoa escolheu o braço robótico em 2026-11-16; o plano 1 põe a placa nele, o plano 2 liga e verifica o circuito dele, e o plano 3 desenha o esquemático dele.

## Invariantes para os quatro planos

- O núcleo não conhece eletrônica. Família, ligações e esquemático moram fora dele: a família em `procedural/familias/`, o resto em `modulos/`, como os exportadores e a textura, e o que precisar do núcleo entra como capacidade geral com nome geral.
- Tudo é gerado por script e determinístico; o que é estimativa (corpo de peça, altura) fica declarado como estimativa, como no Eletrifica.
- Sem dependência de terceiro para ler Gerber nem para símbolo de esquemático. Licença do que for reescrito: o Eletrifica é MIT e do mesmo dono.
- Material e cor das peças eletrônicas entram como escolha por peça na receita; paleta nova só com o plano que a pedir.
- Imagem de terceiro (foto de componente com marca) não entra no repositório.
- O formato salvo da montagem semântica só muda com decisão escrita da pessoa no plano que a pedir (o plano 2), com o caminho de migração das montagens já salvas, segundo [`MONTAGENS-SEMANTICAS.md`](../usar/MONTAGENS-SEMANTICAS.md).

## Incluído

- escrever os quatro planos filhos, na ordem, cada um a partir do anterior concluído (o primeiro pode ser escrito já);
- em cada plano filho: o que vem do Eletrifica (arquivo e função), o que é reescrito, o que é nosso, o território provável, os gates e a prova com fixture gerada por script.

## Excluído

- qualquer implementação neste plano;
- o simulador da base óptica e os módulos de física dele, salvo se o quarto plano os trouxer com evidência;
- trazer o Gerber original da CNC ou os símbolos do KiCad para o repositório.

## Os planos que este gera

Quatro planos obrigatórios, na ordem, e um quinto opcional.

### 1. Família de componentes eletrônicos

Uma família procedural de peças eletrônicas por encapsulamento (resistor axial, capacitor eletrolítico, cerâmico, TO-220, SOIC e DIP, LED, conector de pinos, borne, jack, módulo de placa como o ESP32 e o driver de passo), com as medidas típicas de cada encapsulamento declaradas como estimativa, e a placa como peça declarada na receita: contorno, furos, pistas como textura ou relevo, e cada peça com posição e giro na placa. Vem do Eletrifica a tabela `BODIES` e `MODULES` de `modulos/pcb/render_3d.py`. Não há leitor de Gerber neste plano: para modelar um objeto, a placa declarada basta, e o leitor fica no plano 5. Gate candidato: a placa do objeto-alvo montada com a família, ao lado de uma placa real parecida, aprovada pela pessoa, no lugar da caixa que o objeto tem hoje.

### 2. Ligações elétricas na montagem

A camada elétrica da montagem semântica: portas elétricas nas peças (pino, terminal, conector), a ligação declarada entre portas como fio, chicote ou trilha, a lista de ligações gerada da montagem, e um verificador que diz regra a regra o que não fecha (porta sem ligação, alimentação sem fonte, polaridade, sentido de sinal, carga acima do que a fonte dá), sem consertar. Vem do Eletrifica a forma de `modulos/conexoes/netlist.py` e de `verificador.py` (relatório por regra, violação com bloco culpado) e, da parte da placa, `verify_netlist` e `check_copper` como modelo de verificação independente. O plano começa decidindo com a pessoa onde as ligações moram: no formato salvo da montagem (com a migração das montagens existentes) ou num arquivo ao lado dela, que a montagem cita. Gate candidato: uma montagem de prova (fonte, chave, motor, lâmpada) em que o verificador acha cada defeito plantado e passa a montagem correta, e o objeto-alvo com o circuito verificado.

### 3. Esquemático gerado da montagem, com símbolos nossos

O desenho do circuito de uma montagem, gerado da lista de ligações do plano 2, como um tipo de prancha do Modelar, com as ligações por rótulo com o nome do sinal, como o Eletrifica faz (ele não desenha fio), e o roteamento automático de fios fora, como candidato do plano 4, com uma biblioteca de símbolos própria (resistor, capacitor, diodo, LED, transistor, regulador, conector, motor, chave, fonte, terra) e o símbolo retangular gerado para módulo, como `rect_symbol()` do `gen_schematic.py`. Vem do Eletrifica a geração do esquemático a partir da lista de ligações, com os pinos ligados por rótulo, e a verificação de que o esquemático fecha com ela (`verify_netlist`); o posicionamento dos símbolos é nosso, gerado e não escrito à mão como parte do de lá. A exportação para o formato do KiCad fica opcional, escrita por nós. Gate candidato: o esquemático do objeto-alvo, legível e aprovado pela pessoa, e a verificação de que cada rótulo do desenho está na lista de ligações e vice-versa.

### 4. Análise depois dos três

Pesquisa e análise, sem implementação, feitas depois que os planos 1, 2 e 3 estiverem concluídos: o que cada um entregou, medido no uso (quantas peças e montagens usaram a família, as ligações e o esquemático, que atritos o modelador e o crítico registraram); o que pode evoluir em cada um; e o que pode nascer dali para ampliar o projeto como um todo, por exemplo a simulação de energia e calor numa montagem, a pose de mecanismo comandada pela lógica do circuito, o roteamento de chicote pela geometria, o roteamento de fios no esquemático, o leitor de Gerber (plano 5), a exportação para fabricação, ou um módulo do Eletrifica que não entrou. O resultado é um relatório no banco de pesquisa (`modulos/pesquisa/`) e candidatos ao backlog, cada um com a evidência que o justifica; nenhum plano novo sai dele sem a decisão da pessoa.

### 5. Leitor de Gerber próprio, opcional

Ler o pacote de fabricação de uma placa que já existe (contorno, pads, furos, serigrafia e a lista de ligações) com código nosso, no lugar do `gerbonara`, para reconstruir a placa com a família do plano 1 e verificar as ligações com o verificador do plano 2, como o Eletrifica faz com a controladora da CNC. É outro objetivo (reconstruir o que existe, e não modelar um objeto) e o maior trabalho da linha, por isso fica fora dos três primeiros e só é escrito se a pessoa o pedir ou se o plano 4 o recomendar com evidência. A prova usa Gerber gerado por script, nunca o da CNC, que fica fora da licença do Eletrifica.

## Gate de saída

1. Os quatro planos estão escritos em `docs/modelar/planos/`, em `rascunho`, cada um com o modelo completo e com link para este; o plano 5 é escrito só se pedido, e não conta para fechar este.
2. O plano 4 só foi escrito depois que os planos 1, 2 e 3 chegaram a `concluído` ou `cancelado`, e cita o fechamento de cada um.
3. Nenhum código entrou por este plano.

## Fatias

1. Feita em 2026-11-16: o plano 1, [família de componentes eletrônicos](2026-11-16-familia-componentes-eletronicos.md), com o braço robótico como objeto-alvo, escolhido pela pessoa. Pode ser feito já; a ativação dele espera um lugar de plano ativo.
2. Escrever o plano 2, ligações elétricas, depois que o plano 1 for ativado (ele usa a placa e as peças como portadoras das portas).
3. Escrever o plano 3, esquemático, depois que o plano 2 for ativado (ele desenha a lista de ligações do 2).
4. Escrever o plano 4, análise, depois que os três fecharem; e fechar este.

## Riscos e parada

Se as ligações elétricas exigirem mudar o formato salvo da montagem semântica, o plano 2 para e a pessoa decide antes de mudar o formato. Se a pessoa decidir parar a linha, este plano é cancelado e os planos filhos já escritos voltam a ser candidatos no backlog.

## Fechamento

A preencher.
