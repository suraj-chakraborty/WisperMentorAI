from fastapi import FastAPI, UploadFile, File, HTTPException, Header, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
try:
    from faster_whisper import WhisperModel
except ImportError:
    WhisperModel = None

try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    SentenceTransformer = None

from pydantic import BaseModel
import shutil
import os
import tempfile
import logging
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai-service")

# CORS Configuration (Restrict to configured origins, avoiding wildcard + credentials vulnerability)
cors_env = os.getenv("CORS_ORIGIN", "http://localhost:3001,http://localhost:5173")
CORS_ORIGINS = [origin.strip() for origin in cors_env.split(",") if origin.strip()]

# Shared secret verification between backend and AI service
INTERNAL_TOKEN = os.getenv("AI_SERVICE_INTERNAL_TOKEN", "whispermentor_internal_service_secret_token")

def verify_internal_token(x_internal_token: str = Header(None, alias="X-Internal-Token")):
    if INTERNAL_TOKEN:
        if not x_internal_token or x_internal_token != INTERNAL_TOKEN:
            raise HTTPException(
                status_code=401,
                detail="Unauthorized: Invalid or missing X-Internal-Token header",
            )
    return True

# Load Whisper Model (Global)
# Use "tiny" or "base" for speed on CPU. "small" is better but slower.
# device="cpu" and compute_type="int8" are safe defaults for most machines.
from concurrent.futures import ThreadPoolExecutor
import asyncio

MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "tiny")
DEVICE = os.getenv("WHISPER_DEVICE", "cpu")
COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "int8")
WHISPER_WORKERS = max(1, int(os.getenv("WHISPER_WORKERS", "2")))
WHISPER_CPU_THREADS = max(1, int(os.getenv("WHISPER_CPU_THREADS", "4")))

logger.info(f"Loading Whisper model: {MODEL_SIZE} on {DEVICE} ({COMPUTE_TYPE}) with {WHISPER_WORKERS} workers...")
try:
    model = WhisperModel(
        MODEL_SIZE, 
        device=DEVICE, 
        compute_type=COMPUTE_TYPE,
        cpu_threads=WHISPER_CPU_THREADS,
        num_workers=WHISPER_WORKERS
    )
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

from contextlib import asynccontextmanager

# Concurrency management: Dedicated ThreadPoolExecutor + Semaphore allowing concurrent worker inference
# without starving the asyncio event loop or overloading CPU with unbounded threads
whisper_executor = ThreadPoolExecutor(max_workers=WHISPER_WORKERS, thread_name_prefix="whisper-worker")
whisper_semaphore = asyncio.Semaphore(WHISPER_WORKERS)

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    whisper_executor.shutdown(wait=False)

app = FastAPI(title="WhisperMentor AI Service", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS if CORS_ORIGINS else ["http://localhost:3001", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Internal-Token"],
)

class EmbedRequest(BaseModel):
    text: str | None = None
    texts: list[str] | None = None

@app.get("/")
def health_check():
    return {"status": "ok", "model": MODEL_SIZE, "device": DEVICE}

@app.post("/transcribe", dependencies=[Depends(verify_internal_token)])
async def transcribe_audio(
    file: UploadFile = File(...),
    task: str = "transcribe"
):
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
        
        # We need to wrap the call to pass 'task'
        def run_model():
            logger.info(f"Processing transcription for path: {tmp_path} (Task: {task})")
            import wave
            speaker = "Meeting" # Default
            
            # Speaker Detection (Stereo RMS) - Same as before
            try:
                with wave.open(tmp_path, 'rb') as wf:
                    if wf.getnchannels() == 2:
                        frames = wf.readframes(wf.getnframes())
                        audio = np.frombuffer(frames, dtype=np.int16)
                        if len(audio) > 0:
                            audio = audio.reshape(-1, 2)
                            left = audio[:, 0].astype(np.float32)
                            right = audio[:, 1].astype(np.float32)
                            if len(left) > 0 and len(right) > 0:
                                rms_left = np.sqrt(np.mean(left**2))
                                rms_right = np.sqrt(np.mean(right**2))
                                if rms_right > 500 and (rms_right > rms_left * 0.2): 
                                    speaker = "You"
                                elif rms_right > rms_left:
                                     speaker = "You"
            except Exception as e:
                logger.error(f"Diarization failed: {e}")

            # Transcribe with Task
            segments, info = model.transcribe(
                tmp_path, 
                beam_size=1, 
                vad_filter=True,
                vad_parameters=dict(min_silence_duration_ms=500),
                initial_prompt="Live mentoring session. Technical discussion.",
                condition_on_previous_text=False,
                repetition_penalty=1.2,
                task=task 
            )
            
            text = " ".join([segment.text for segment in segments])
            return text, info, speaker

        async with whisper_semaphore:
            start_time = asyncio.get_event_loop().time()
            full_text, info, speaker = await loop.run_in_executor(whisper_executor, run_model)
            end_time = asyncio.get_event_loop().time()
            logger.info(f"Transcription finished in {end_time - start_time:.2f}s for {tmp_path}")

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

@app.post("/embed", dependencies=[Depends(verify_internal_token)])
async def embed_text(request: EmbedRequest):
    if not embed_model:
        raise HTTPException(status_code=503, detail="Embedding model not loaded")
    
    try:
        import asyncio
        loop = asyncio.get_running_loop()

        # Batch embedding mode
        if request.texts is not None:
            if not request.texts:
                return {"embeddings": []}
            embeddings = await loop.run_in_executor(None, lambda: embed_model.encode(request.texts).tolist())
            return {"embeddings": embeddings}

        # Single embedding mode
        if not request.text or not request.text.strip():
            return {"embedding": []}
        
        embedding = await loop.run_in_executor(None, lambda: embed_model.encode(request.text).tolist())
        return {"embedding": embedding}
    except Exception as e:
        logger.error(f"Embedding failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/translate", dependencies=[Depends(verify_internal_token)])
async def translate_text(request: EmbedRequest):
    try:
        # Fallback to a small dictionary of common technical terms if deep-translator is missing
        # This keeps the "AI on 8000" alive even if disk is full.
        tech_dict = {
            "application": "aplicación",
            "backend": "backend",
            "frontend": "frontend",
            "database": "base de datos",
            "server": "servidor",
            "client": "cliente",
            "authentication": "autenticación",
            "authorization": "autorización"
        }
        
        text_lower = request.text.lower().strip()
        if text_lower in tech_dict:
            return {"translation": tech_dict[text_lower], "warning": "Local Dictionary Match"}
            
        from deep_translator import GoogleTranslator
        translated = GoogleTranslator(source='auto', target='en').translate(request.text)
        return {"translation": translated}
    except Exception as e:
        logger.error(f"Local translation failed: {e}")
        return {"translation": request.text, "warning": "Local Pass-through (Offline/Full Disk)"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
