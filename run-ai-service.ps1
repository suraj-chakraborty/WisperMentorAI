$ErrorActionPreference = "Stop"
cd apps\ai-service

# Create virtual environment if it doesn't exist (on C: drive)
if (-not (Test-Path ".venv")) {
    Write-Host "Creating virtual environment on C: drive..."
    python -m venv .venv
}

# Activate virtual environment
# MSYS2 Python creates 'bin/' instead of 'Scripts/', so check both paths
Write-Host "Activating virtual environment..."
if (Test-Path ".venv\Scripts\Activate.ps1") {
    .\.venv\Scripts\Activate.ps1
} elseif (Test-Path ".venv\bin\Activate.ps1") {
    .\.venv\bin\Activate.ps1
} else {
    Write-Error "Could not find virtual environment activation script!"
    exit 1
}

# Upgrade pip and install dependencies
Write-Host "Installing dependencies..."
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

# Run the service
Write-Host "Starting AI Service..."
python -m uvicorn main:app --port 8000 --reload
