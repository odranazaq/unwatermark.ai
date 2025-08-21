# unwatermark.ai

Minimal watermark remover web app.

## Setup

### Backend
```bash
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

The backend reads `REPLICATE_API_TOKEN` from a `.env` file. In development CORS is open for all origins.
