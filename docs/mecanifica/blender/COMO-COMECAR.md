# Como começar com o Blender

Esta página é para a IA que vai usar o Blender pela primeira vez neste repositório. Leia antes `CLAUDE.md` e confira com a pessoa se o objeto tem uma forma de referência, porque o caminho depende disso.

Primeiro verifique se o Blender existe na máquina com `blender --version`. Se não existir, a instalação está em [`INSTALAR-E-CONVERTER.md`](INSTALAR-E-CONVERTER.md) e deve ser feita fora do repositório, por exemplo em `/tmp/blender` ou `~/blender`. Se o ambiente não deixar baixar, o fluxo continua sem o Blender, desde que a fonte já venha em glb, obj ou fbx.

Com forma de referência em formato que não seja glb, obj ou fbx, converta para GLB com o script de `INSTALAR-E-CONVERTER.md`. Depois siga as etapas de [`FLUXO-GENERICO.md`](FLUXO-GENERICO.md), que começam pela conferência de licença e pelo registro da origem em `referencias/alvo.md` da peça.

Sem forma de referência, use o Blender só para bloquear a forma e medir (caixa, proporções, perfil), exporte as medidas e escreva tudo em receita. A malha do Blender nunca vai para o repositório nem para a receita. O esboço detalhado é a alternativa opcional, e só entra por escolha da pessoa.

Em qualquer caminho valem quatro regras. A licença da fonte é conferida antes de abrir o arquivo. Nenhum `.blend`, `.obj`, `.mtl` nem o próprio Blender é versionado. Nenhuma ferramenta nova para o Blender é criada sem plano. A forma só está aprovada quando a pessoa a aprova em imagem, e nenhuma métrica a aprova sozinha.

Ao terminar, rode `npm run descrever -- <peça>` e os comandos de `CLAUDE.md` que couberem à tarefa. O Blender não aparece em nenhum deles.
