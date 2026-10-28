import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.config import settings
from backend.database import db
from backend.services.scheduler_service import scheduler_service
from backend.routes.meetings import router as meetings_router
from backend.routes.tasks import router as tasks_router
from backend.routes.reviews import router as reviews_router
from backend.routes.activities import router as activities_router
from backend.routes.analytics import router as analytics_router
from backend.routes.settings import router as settings_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("nova")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start background scheduler
    logger.info("Initializing Nova Meeting Follow-Up System backend...")
    if not settings.TESTING:
        scheduler_service.start()
    yield
    # Shutdown: Stop scheduler
    logger.info("Shutting down Nova services...")
    if not settings.TESTING:
        scheduler_service.shutdown()

app = FastAPI(
    title="Nova — AI-Powered Meeting Follow-Up API",
    description="Multi-Agent LangGraph Workflow for Meeting Summaries, Decisions, Action Items & Follow-Ups",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
allowed_origins = [
    settings.FRONTEND_URL,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://*.vercel.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global error handler for unhandled exceptions
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error processing {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": str(exc),
            "path": str(request.url.path)
        }
    )

# Health endpoint
@app.get("/api/health", tags=["System"])
def health_check():
    return {
        "status": "healthy",
        "service": "Nova AI Backend",
        "version": "1.0.0",
        "gemini": {
            "configured": settings.is_gemini_configured,
            "model": settings.GEMINI_MODEL
        },
        "database": {
            "connected": db.is_connected,
            "status": db.status_message
        },
        "confidence_threshold": settings.CONFIDENCE_THRESHOLD,
        "max_upload_size_mb": settings.MAX_UPLOAD_SIZE_MB
    }

# Register API Routers
app.include_router(meetings_router, prefix="/api")
app.include_router(tasks_router, prefix="/api")
app.include_router(reviews_router, prefix="/api")
app.include_router(activities_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(settings_router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host=settings.BACKEND_HOST, port=settings.BACKEND_PORT, reload=True)
