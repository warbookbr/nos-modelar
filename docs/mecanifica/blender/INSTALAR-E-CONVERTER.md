# Instalar o Blender e converter para GLB

## Instalação verificada

A sessão que originou estes documentos instalou o Blender 4.2 LTS a partir do tarball oficial para Linux x64, em https://download.blender.org/release/Blender4.2/blender-4.2.23-linux-x64.tar.xz. O arquivo tem 350 MB e ocupa 1,6 GB depois de descompactado. O proxy do ambiente deixa passar o domínio download.blender.org. A instalação por `pip install bpy` não foi concluída e não está provada.

O Blender se extrai fora do repositório, por exemplo em `/tmp/blender` ou em `~/blender`, porque nenhum arquivo dele pode ser versionado.

```text
mkdir -p /tmp/blender
curl -sSL -o /tmp/blender/blender.tar.xz https://download.blender.org/release/Blender4.2/blender-4.2.23-linux-x64.tar.xz
tar -xf /tmp/blender/blender.tar.xz -C /tmp/blender --strip-components=1
/tmp/blender/blender --version
```

Se o download falhar por TLS ou por proxy, leia `/root/.ccr/README.md` e nunca desligue a verificação de certificado.

A execução sem janela segue este formato, em que tudo depois de `--` chega ao script em `sys.argv`:

```text
blender -b <arquivo> --python <script> -- <args>
```

## Conversão verificada para GLB

O script abaixo foi o usado na conversão provada. Guarde-o fora do repositório (por exemplo no diretório temporário da sessão), porque ele é só um meio de trabalho.

```python
import bpy, sys
args = sys.argv[sys.argv.index('--')+1:]
bpy.ops.export_scene.gltf(filepath=args[0], export_format='GLB', export_apply=True)
```

Chamada, com o script salvo como `exportar-glb.py`:

```text
blender -b modelo.blend --python exportar-glb.py -- saida.glb
```

O parâmetro `export_apply=True` aplica os modificadores antes de exportar. Depois da conversão o GLB entra no fluxo de referência já existente:

```text
node tools/mecanifica/modelo-de-referencia.mjs saida.glb --saida <pasta> --frente +z
```

O comando gera `vistas.png` e `partes.json` na pasta de saída. O valor de `--frente` declara em que lado a frente fica na malha endireitada e é obrigatório quando a malha é uma peça só. A ferramenta recusa e diz o giro que falta quando a frente não fecha em +z.

## O que não entra no repositório

Nem o Blender, nem o tarball, nem `.blend`, `.obj`, `.mtl` ou GLB de terceiros são versionados. Entram só as imagens de referência e as medidas em JSON que o Mecanifica gera, como já faz o acervo de veículos.
