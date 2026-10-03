"""
email_queue.py — Asynchronous delivery queue for non-critical emails.

Guarantees:
- API responses (e.g. creating expenses or settlements) do not block on SMTP latency.
- Security-critical flows (like OTPs) can still be sent synchronously when required.
- In test environments, tasks can run synchronously to allow deterministic test assertions.
"""
import logging
from concurrent.futures import ThreadPoolExecutor
from django.conf import settings

logger = logging.getLogger('splitmate.email')

_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix='splitmate-email-worker')


def queue_email(task_fn, *args, **kwargs):
    """
    Queue an email delivery task asynchronously using a background thread pool.
    If EMAIL_QUEUE_SYNCHRONOUS is True or TESTING is active, execute synchronously.
    """
    is_sync = getattr(settings, 'EMAIL_QUEUE_SYNCHRONOUS', False) or getattr(settings, 'TESTING', False)

    if is_sync:
        try:
            return task_fn(*args, **kwargs)
        except Exception as e:
            logger.warning("Synchronous email task failed: %s", e)
            return None

    def _safe_wrapper():
        try:
            task_fn(*args, **kwargs)
        except Exception as e:
            logger.error("Async email delivery task encountered an error: %s", e, exc_info=True)

    return _executor.submit(_safe_wrapper)
