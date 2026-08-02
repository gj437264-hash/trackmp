import time
import logging
import functools

def retry(exceptions, attempts=3, base_delay=2):
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            log = logging.getLogger(fn.__module__)
            for attempt in range(1, attempts + 1):
                try:
                    return fn(*args, **kwargs)
                except exceptions as e:
                    if attempt == attempts:
                        log.error(f"{fn.__name__} failed after {attempts} attempts: {e}")
                        raise
                    delay = base_delay * (2 ** (attempt - 1))
                    log.warning(f"{fn.__name__} failed (attempt {attempt}/{attempts}): {e} — retrying in {delay}s")
                    time.sleep(delay)
        return wrapper
    return decorator
