import logging
import logging.config
from pythonjsonlogger import jsonlogger

def setup_logging():
    logger = logging.getLogger(__name__)
    
    formatter = jsonlogger.JsonFormatter(
        fmt="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    
    logging.basicConfig(
        level=logging.INFO,
        handlers=[console_handler]
    )
    
    return logger

logger = setup_logging()