# Alvo do braço direito do robô humanoide

As duas imagens de referência foram geradas por IA e ficam fora do repositório, em `locais/frontal.jpg` e `locais/traseira.jpg`, pasta que o git ignora. Elas valem como caráter da forma e nunca como medida: as medidas são as da tabela do `../ALINHAMENTO.md`, fixadas pela pessoa para um robô de 1.750 mm de altura. Na máquina em que as imagens faltarem, as ferramentas avisam uma vez e seguem.

O que as imagens mostram do braço, de cima para baixo. O ombro é um disco de junta escuro, de eixo lateral, com anéis concêntricos e tampa central, preso ao lado do tronco. O braço é uma casca cinza de parede fina, mais larga junto ao ombro, com um painel escuro na face de dentro e de trás, separado da casca por uma costura. O cotovelo é uma dobradiça com um cilindro de eixo lateral e discos de tampa nas duas faces. O antebraço é uma casca cinza sobre o lado de fora, aberta por dentro, onde aparecem duas hastes paralelas. O punho é um anel curto no eixo do antebraço. A mão tem a palma em placa, quatro dedos de três falanges separadas por juntas visíveis e o polegar saindo da borda da palma, fora do plano dos outros dedos.

Na vista frontal o braço direito do robô aparece à esquerda da imagem, levemente aberto para fora, com o cotovelo um pouco dobrado. Essa é a pose de repouso, de 10 graus de abdução e 10 graus de cotovelo. O esqueleto `../andaime.json` está na pose zero, com o braço pendente na vertical.

Em 2026-11-17 a pessoa trouxe sete imagens novas do robô, também geradas por IA e com o mesmo valor de caráter da forma: `corpo-frontal.jpg`, `corpo-traseira.jpg` e `corpo-tres-quartos.jpg`, com o corpo inteiro, e `braco-vistas.jpg`, `tronco-vistas.jpg`, `perna-vistas.jpg` e `cabeca-vistas.jpg`, cada uma com as vistas de uma parte. Elas moram em `locais/` como as duas primeiras e ficam guardadas no ramo `referencias` do repositório, fora da história da main; o README desse ramo diz como restaurá-las numa cópia nova.

