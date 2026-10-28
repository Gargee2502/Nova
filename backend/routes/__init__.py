from backend.routes.meetings import router as meetings_router
from backend.routes.tasks import router as tasks_router
from backend.routes.reviews import router as reviews_router
from backend.routes.activities import router as activities_router
from backend.routes.analytics import router as analytics_router
from backend.routes.settings import router as settings_router

__all__ = [
    "meetings_router",
    "tasks_router",
    "reviews_router",
    "activities_router",
    "analytics_router",
    "settings_router"
]
