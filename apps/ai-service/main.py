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

def process_transcription(path):
    logger.info(f"Processing transcription for path: {path}")
    import wave
    speaker = "Meeting" # Default
    
    # Speaker Detection (Stereo RMS)
    try:
        with wave.open(path, 'rb') as wf:
            if wf.getnchannels() == 2:
                frames = wf.readframes(wf.getnframes())
                audio = np.frombuffer(frames, dtype=np.int16)
                if len(audio) > 0:
                    audio = audio.reshape(-1, 2)
                    left = audio[:, 0].astype(np.float32)  # System
                    right = audio[:, 1].astype(np.float32) # Mic
                    
                    if len(left) > 0 and len(right) > 0:
                        rms_left = np.sqrt(np.mean(left**2))
                        rms_right = np.sqrt(np.mean(right**2))
                        
                        logger.info(f"Diarization RMS - Left (Sys): {rms_left:.4f}, Right (Mic): {rms_right:.4f}")
                        
                        # Threshold: if Mic is significant (ratio > 0.2) and active (> 500)
                        # We allow Mic to be quieter than System because System is often full-volume.
                        if rms_right > 500 and (rms_right > rms_left * 0.2): 
                            speaker = "You"
                        elif rms_right > rms_left: # Fallback
                             speaker = "You"
    except Exception as e:
        logger.error(f"Diarization failed: {e}")

    # Transcribe
    segments, info = model.transcribe(
        path, 
        beam_size=5, 
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=500),
        initial_prompt="Live mentoring session. Technical discussion.",
        condition_on_previous_text=False,
        repetition_penalty=1.2
    )
    
    # Consume generator
    text = " ".join([segment.text for segment in segments])
    return text, info, speaker

@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    if not model:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        # Faster-Whisper needs a file path
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        # Run in threadpool
        import asyncio
        loop = asyncio.get_running_loop()
        full_text, info, speaker = await loop.run_in_executor(None, process_transcription, tmp_path)

        # Cleanup
        os.remove(tmp_path)

        return {
            "text": full_text.strip(),
            "language": info.language,
            "probability": info.language_probability,
            "speaker": speaker
        }

    except Exception as e:
        logger.error(f"Transcription failed: {e}")
        if 'tmp_path' in locals() and os.path.exists(tmp_path):
            os.remove(tmp_path)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/embed")
async def embed_text(request: EmbedRequest):
    if not embed_model:
        raise HTTPException(status_code=503, detail="Embedding model not loaded")
    
    try:
        if not request.text.strip():
            return {"embedding": []}
        
        # Generate embedding (run in threadpool to avoid blocking)
        import asyncio
        loop = asyncio.get_running_loop()
        embedding = await loop.run_in_executor(None, lambda: embed_model.encode(request.text).tolist())
        
        return {"embedding": embedding}
    except Exception as e:
        logger.error(f"Embedding failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
