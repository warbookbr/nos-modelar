# Por que cada regra da skill `criar-peca` existe

Consulta, e não leitura de partida. Cada regra da skill custou uma peça errada
antes de virar regra; este arquivo guarda o motivo, para que ninguém a apague
por parecer arbitrária.

**A peça é uma pasta.** Peça em arquivo solto deixava referências, âncoras e
rodadas espalhadas por quatro árvores do repositório, e documento de peça
apagada ficava descrevendo uma receita que ninguém podia abrir.

**Receita antiga não é molde.** Em 2026-09-08 a varredura de contato achou
defeito real em duas receitas do acervo: uma tratava `em` como canto mínimo de
um cubo que é centrado, e outra tinha um tubo atravessando outra peça. Quem
aprendesse convenção lendo aquelas receitas copiaria o defeito. A fonte da
convenção é o catálogo.

**Nenhuma posição digitada no passo.** Número solto deixa de corresponder à
tabela assim que ela muda, e as partes se atravessam sem que nenhuma medida da
própria peça acuse.

**`PASSOS` é getter, e a cópia é por descritores.** O espalhamento avalia o
getter uma vez com a tabela velha e guarda o resultado; o parâmetro novo não
tem efeito e a peça parece insensível a ele.

**A tabela da rotação.** Sem o sentido escrito, girar para levar uma revolução
de Y para X é chute com metade de chance de espelhar o conjunto, e espelho não
aparece na foto nem na descrição, porque a peça espelhada continua simétrica e
plausível.

**Bancada sem interface e com `--cores`.** A captura com a interface deixava a
peça numa faixa estreita no meio da imagem, e partes do mesmo material liam
como um borrão só, escondendo a junção entre elas.

**`isolar` sozinho não basta.** Uma parte pode estar perfeita isolada e não
caber no vizinho; peça com vizinho conclui em `contexto`.

**O pacote do crítico sai de `vistas:critica`.** Uma captura da bancada mandada
ao crítico tinha o objeto ocupando um quarto do quadro, e ele deu como ausente
um flange que existia na malha.

**Foto de terceiro fica fora do repositório.** O repositório guarda o que é
nosso: a prancha desenhada e as coordenadas derivadas dela.
