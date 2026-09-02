#!/usr/bin/env python3
"""Ponto de entrada da linha de comando sem exigir instalação nem venv.

Existe pelo mesmo motivo que o `conftest.py` dos testes: o pacote mora em `src/`,
e um comando que só funciona depois de alguém lembrar de exportar `PYTHONPATH` é
um comando que não roda. Prefixo de variável de ambiente no `package.json`
também resolveria, e quebraria no `cmd` do Windows.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))

from laboratorio.cli import main  # noqa: E402

if __name__ == "__main__":
    raise SystemExit(main())
