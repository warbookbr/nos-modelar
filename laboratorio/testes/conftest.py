"""Põe `src/` no caminho de import para os testes rodarem sem instalação prévia.

Sem isto, `npm run lab:test` só funciona se alguém tiver criado e instalado uma
venv antes — e o script original assumia isso com um caminho fixo de Windows
(`laboratorio\\.venv\\Scripts\\python.exe`), que não existe em Linux, macOS nem
no CI. Um teste que depende de um passo manual não documentado é um teste que
não roda.
"""
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))
