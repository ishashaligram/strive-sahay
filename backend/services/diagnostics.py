"""Request/model timing only. Never log submitted text or credentials."""
import logging
from contextvars import ContextVar

request_id=ContextVar('diagnostic_request_id',default='-')
logger=logging.getLogger('uvicorn.error')

def model_stage(system):
    text=system.lower()
    if 'verify field-to-evidence' in text:return 'evidence-verification'
    if 'extract' in text:return 'fact-extraction'
    if 'detect the language' in text:return 'language-detection'
    if 'question' in text:return 'question-generation'
    if 'rate all eight' in text:return 'scoring'
    return 'structured-generation'
