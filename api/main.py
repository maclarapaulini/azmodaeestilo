from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import Response, HTMLResponse
from rembg import remove, new_session
from PIL import Image
import io

app = FastAPI(docs_url=None)  # desativa o Swagger

@app.get("/docs", response_class=HTMLResponse)
def redoc():
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>API Docs</title>
        <meta charset="utf-8"/>
        <script src="https://cdn.jsdelivr.net/npm/redoc/bundles/redoc.standalone.js"></script>
    </head>
    <body>
        <redoc spec-url='/openapi.json'></redoc>
        <script>Redoc.init('/openapi.json')</script>
    </body>
    </html>
    """

session = new_session("isnet-general-use")

MAX_BYTES = 8 * 1024 * 1024

@app.post("/api/garments/remove-background")
async def remove_background(file: UploadFile = File(...)):
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "Imagem muito grande")
    try:
        img = Image.open(io.BytesIO(data))
        img.verify()                       # valida que é imagem de verdade
        img = Image.open(io.BytesIO(data)).convert("RGB")
    except Exception:
        raise HTTPException(400, "Arquivo inválido")

    img.thumbnail((2000, 2000))            # limita custo de CPU
    out = remove(img, session=session)     # retorna RGBA com alpha

    buf = io.BytesIO()
    out.save(buf, format="WEBP", lossless=False, quality=90)
    return Response(buf.getvalue(), media_type="image/webp")