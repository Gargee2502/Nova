import logging
from apscheduler.schedulers.background import BackgroundScheduler
from backend.agents.agent4 import followup_agent

logger = logging.getLogger("nova.scheduler")

class SchedulerService:
    def __init__(self):
        self.scheduler = BackgroundScheduler()
        self._started = False

    def start(self):
        if not self._started:
            try:
                # Add interval job to check reminders every 60 minutes
                self.scheduler.add_job(
                    func=followup_agent.check_and_send_scheduled_reminders,
                    trigger="interval",
                    minutes=60,
                    id="auto_followup_check",
                    replace_existing=True
                )
                self.scheduler.start()
                self._started = True
                logger.info("APScheduler background service started.")
            except Exception as e:
                logger.warning(f"Could not start APScheduler: {e}")

    def shutdown(self):
        if self._started:
            try:
                self.scheduler.shutdown(wait=False)
                self._started = False
                logger.info("APScheduler stopped.")
            except Exception as e:
                logger.error(f"Error shutting down scheduler: {e}")

scheduler_service = SchedulerService()
