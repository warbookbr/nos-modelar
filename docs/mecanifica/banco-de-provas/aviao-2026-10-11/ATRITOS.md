# Avião de pequeno porte: atritos

Cada atrito do plano [o que o avião pede](../../planos/2026-10-11-o-que-o-aviao-pede.md),
com o comando que o reproduz. A classificação (ferramenta nova, correção do
núcleo ou nada) é da fatia 4.

## 1. Reflexo mais claro que o fundo fica sem dono no contorno

Na lateral, logo abaixo da linha escura do topo da fuselagem (linhas 95 e 96 da
imagem), há pixels de reflexo com cinza de 225 a 239, no mesmo tom ou mais claros
que o fundo (232). O watershed só pinta o que fica abaixo do `limiar` (225), então
esses pixels ficam fora da silhueta, como buracos cercados por ela, e nenhuma
semente os alcança. O crítico das rodadas 1 e 2 os apontou como pontos soltos, e o
desenhador não tem como corrigir mexendo só nas sementes. Subir o limiar não
resolve, porque parte deles é mais clara que o fundo.

```bash
python3 -c "from PIL import Image; import numpy as np; a=np.asarray(Image.open('docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/lateral.png').convert('L')); print((a[95:97,180:300]>=225).sum(), 'pixels acima do limiar sob o topo da fuselagem')"
```

O processo pegou o defeito (o crítico o viu), mas a ferramenta não oferece
saída: falta o contorno fechar buracos pequenos cercados pela silhueta.
