# Laboratório computacional para IA

Este diretório contém o laboratório experimental isolado da Mecanifica. O
pacote Python vive em `src/laboratorio`; testes ficam em `testes`; artefatos de
execução e o ambiente virtual local ficam, respectivamente, em `.lab/` e
`.venv/`, ambos fora do Git.

Use Python 3.12 e instale o pacote em modo editável:

```powershell
python -m venv laboratorio/.venv
laboratorio/.venv/Scripts/python -m pip install -e "laboratorio[test]"
npm run lab:check
```

A fronteira é direcional: a Mecanifica não importa o laboratório. Integrações
do laboratório com portas da Mecanifica ficam exclusivamente em
`laboratorio/adaptadores/mecanifica-node/`.
