# Forma exata antes da malha: medidas e estudo

Pasta do plano [forma exata antes da malha](../../decisoes/PLANOS-ENCERRADOS.md), ativo desde 2026-11-13. Aqui entram a medida de partida, o estudo do método com o protótipo, e o custo de cada fatia.

## A medida de partida: a primeira forma da kukri

Um modelador fez a primeira forma da kukri em 8 minutos e 36 chamadas de ferramenta, numa receita de 9 passos e 260 linhas, sem abrir código do núcleo. O que ele relatou, que este plano usa como ponto de partida:

- procurou uma operação de chapa com chanfro que acompanha uma curva e não achou; resolveu com cinco laços empilhados numa gaiola, depois de cerca de 10 minutos pensando num contorno;
- o furo passante do cabo, feito por `subtrair` de um cilindro, deixou 5 faces finas, e o cilindro precisou de um alias para ser aceito como sólido fechado;
- levantou o contorno da foto com um script próprio de pixels, sem usar o módulo de contorno da imagem;
- comparou o resultado com a foto a olho, sem sobreposição nem medida de desvio, e entregou sabendo de seis diferenças;
- a vista que mostra o perfil da faca saiu espelhada em relação à referência.

## O estudo do método

- [Estudo do método: a forma exata antes da malha, medida em três casos](ESTUDO-DO-METODO.md): o protótipo de `procedural/nucleo/forma-exata/`, os três casos com os números do método atual e do protótipo, o que o método cobre e não cobre, e o custo de levar cada operação.
