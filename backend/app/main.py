import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="UK Wind Power Forecasting & Accuracy Analytics Platform for day-ahead electricity procurement decision support.",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS for local development and production frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix=settings.API_PREFIX)


@app.get("/")
def root():
    return {
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "documentation": "/docs",
        "endpoints": {
            "health": f"{settings.API_PREFIX}/health",
            "actuals": f"{settings.API_PREFIX}/actuals?delivery_date=2026-01-16",
            "forecasts": f"{settings.API_PREFIX}/forecasts?decision_date=2026-01-15",
            "evaluation": f"{settings.API_PREFIX}/evaluation?decision_date=2026-01-15",
            "accuracy": f"{settings.API_PREFIX}/accuracy?decision_date=2026-01-15",
            "vintages": f"{settings.API_PREFIX}/vintages?delivery_time=2026-01-16T12:00:00Z&decision_date=2026-01-15",
            "methodology": f"{settings.API_PREFIX}/methodology"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
