import io
import os
import requests
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from PIL import Image, ImageOps
from dotenv import load_dotenv
import replicate

load_dotenv()

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_DIM = 2048

@app.post("/api/inpaint")
async def inpaint(
    image: UploadFile = File(...),
    mask: UploadFile = File(...),
    prompt: str = Form(""),
    negative_prompt: str = Form(""),
    steps: int = Form(30),
    guidance: float = Form(7.0),
    seed: int = Form(0),
):
    image_bytes = await image.read()
    img = Image.open(io.BytesIO(image_bytes))
    img = ImageOps.exif_transpose(img)
    if max(img.size) > MAX_DIM:
        scale = MAX_DIM / max(img.size)
        new_size = (int(img.width * scale), int(img.height * scale))
        img = img.resize(new_size, Image.LANCZOS)

    mask_bytes = await mask.read()
    m = Image.open(io.BytesIO(mask_bytes)).convert("L")
    m = ImageOps.exif_transpose(m)
    if m.size != img.size:
        m = m.resize(img.size, Image.NEAREST)

    img_buffer = io.BytesIO()
    img.save(img_buffer, format="PNG")
    img_buffer.seek(0)

    mask_buffer = io.BytesIO()
    m.save(mask_buffer, format="PNG")
    mask_buffer.seek(0)

    client = replicate.Client(api_token=os.getenv("REPLICATE_API_TOKEN"))
    output = client.run(
        "stability-ai/stable-diffusion-xl-1.0-inpainting-0.1",
        input={
            "image": img_buffer,
            "mask": mask_buffer,
            "prompt": prompt,
            "negative_prompt": negative_prompt,
            "num_inference_steps": steps,
            "guidance_scale": guidance,
            "seed": seed,
        },
    )

    if isinstance(output, list):
        image_url = output[0]
    else:
        image_url = output

    res = requests.get(image_url)
    res.raise_for_status()
    return Response(content=res.content, media_type="image/png")
