# ambiente.py — lê uma variável de ambiente pelo nome novo (MODELAR_*) e aceita o antigo (MECANIFICA_*) com aviso. É o par em
# Python de tools/ambiente.mjs (doAmbiente). Fica num arquivo próprio, sem bpy, porque comparar-cortes.py e comparar-vincos.py
# rodam no Python do sistema; comum.py o reexporta para quem roda dentro do Blender.
import os
import sys

_AVISADOS = set()


def do_ambiente(sufixo, padrao=None):
    """O valor de MODELAR_<sufixo>; sem ele, o de MECANIFICA_<sufixo> (nome antigo, que vale até o fechamento do plano seguinte
    ao da renomeação) com um aviso por nome na saída de erro; sem nenhum dos dois, `padrao`. Valor vazio conta como ausente."""
    novo = os.environ.get(f'MODELAR_{sufixo}')
    if novo:
        return novo
    antigo = os.environ.get(f'MECANIFICA_{sufixo}')
    if not antigo:
        return padrao
    if sufixo not in _AVISADOS:
        _AVISADOS.add(sufixo)
        print(f'aviso: MECANIFICA_{sufixo} é o nome antigo; use MODELAR_{sufixo} (o antigo deixa de valer no fechamento do plano '
              f'seguinte ao da renomeação).', file=sys.stderr)
    return antigo
