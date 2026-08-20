#!/usr/bin/env python3
"""R1 descartável: mede o que OpenCV extrai de uma prancha sintética.

Não é dependência do produto nem porta de autoria. Rode apenas com OpenCV em
PYTHONPATH, por exemplo:
  PYTHONPATH=/tmp/mecanifica-r1-opencv python3 tools/mecanifica/prancha-r1-opencv.py

O mesmo PNG é lido pelo leitor Node no relatório R1. O objetivo é comparar
extração de pixels, não converter automaticamente uma referência em verdade.
"""

import json
import sys
from pathlib import Path

try:
    import cv2
    import numpy as np
except ModuleNotFoundError as exc:
    raise SystemExit("R1 requer OpenCV temporário; não instale esta dependência no repositório") from exc


OUT = Path("/tmp/mecanifica-r1-opencv-prancha.png")
W, H = 760, 360
TOPO = np.array([[80, 240], [130, 160], [310, 110], [520, 125], [650, 185], [680, 240]], np.int32)
BASE = np.array([[680, 240], [80, 240]], np.int32)


def principal():
    img = np.full((H, W), 255, np.uint8)
    cv2.polylines(img, [TOPO, BASE], True, 0, 2, cv2.LINE_AA)
    for centro in [(210, 240), (540, 240)]:
        cv2.circle(img, centro, 40, 0, 2, cv2.LINE_AA)
    # Linha interna deliberada: é detalhe, não silhueta; o traçador não sabe isso.
    cv2.line(img, (280, 180), (500, 170), 0, 2, cv2.LINE_AA)
    cv2.imwrite(str(OUT), img)

    _, binaria = cv2.threshold(img, 200, 255, cv2.THRESH_BINARY_INV)
    contornos, hierarquia = cv2.findContours(binaria, cv2.RETR_TREE, cv2.CHAIN_APPROX_NONE)
    dados = []
    for i, c in enumerate(contornos):
        x, y, w, h = cv2.boundingRect(c)
        perimetro = cv2.arcLength(c, True)
        aprox = cv2.approxPolyDP(c, 0.01 * perimetro, True)
        dados.append({
            "indice": i,
            "bbox": [int(x), int(y), int(w), int(h)],
            "area": round(float(cv2.contourArea(c)), 1),
            "verticesAproximados": int(len(aprox)),
            "pai": int(hierarquia[0][i][3]),
        })
    dados.sort(key=lambda d: d["area"], reverse=True)
    print(json.dumps({
        "png": str(OUT),
        "escala": {"entreEixosPx": 330, "mmPorPxEsperado": 8},
        "contornos": dados,
        "leitura": "OpenCV devolve fronteiras de tinta; não distingue silhueta, roda e detalhe sem regras externas.",
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    principal()
