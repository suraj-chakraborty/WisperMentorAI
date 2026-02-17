from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel
from sentence_transformers import SentenceTransformer
from pydantic import BaseModel
import shutil
import os
import tempfile
import logging
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai-service")

app = FastAPI(title="WhisperMentor AI Service")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load Whisper Model (Global)
# Use "tiny" or "base" for speed on CPU. "small" is better but slower.
# device="cpu" and compute_type="int8" are safe defaults for most machines.
MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "small")
DEVICE = os.getenv("WHISPER_DEVICE", "cpu")
COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "int8")

logger.info(f"Loading Whisper model: {MODEL_SIZE} on {DEVICE} ({COMPUTE_TYPE})...")
try:
    model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)
    logger.info("Model loaded successfully.")
except Exception as e:
    logger.error(f"Failed to load model: {e}")
    model = None

# Load Embedding Model
embedding_model_name = "all-MiniLM-L6-v2"
logger.info(f"Loading Embedding model: {embedding_model_name}...")
try:
    embed_model = SentenceTransformer(embedding_model_name)
    logger.info("Embedding model loaded successfully.")
except Exception as e:
    logger.error(f"Failed to load embedding model: {e}")
    embed_model = None

class EmbedRequest(BaseModel):
    text: str

@app.get("/")
def health_check():
    return {"status": "ok", "model": MODEL_SIZE, "device": DEVICE}

@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    if not model:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        # Faster-Whisper needs a file path or binary stream.
        # We can save to temp file or pass bytes if supported.
        # For simplicity/robustness, save to temp file.
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        # Transcribe with VAD and higher beam size for better accuracy
        segments, info = model.transcribe(
            tmp_path, 
            beam_size=5, 
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500),
            initial_prompt="Live mentoring session. Technical discussion.",
            condition_on_previous_text=False,
            repetition_penalty=1.2
        )
        
        full_text = ""
        for segment in segments:
            full_text += segment.text + " "

        # Cleanup
        os.remove(tmp_path)

        return {
            "text": full_text.strip(),
            "language": info.language,
            "probability": info.language_probability
        }

    except Exception as e:
        logger.error(f"Transcription failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/embed")
async def embed_text(request: EmbedRequest):
    if not embed_model:
        raise HTTPException(status_code=503, detail="Embedding model not loaded")
    
    try:
        if not request.text.strip():
            return {"embedding": []}
        
        # Generate embedding
        embedding = embed_model.encode(request.text).tolist()
        return {"embedding": embedding}
    except Exception as e:
        logger.error(f"Embedding failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
