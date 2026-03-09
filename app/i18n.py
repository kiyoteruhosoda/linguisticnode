# app/i18n.py
"""
Internationalization support for error messages.
"""

import json
from pathlib import Path
from typing import Any, Dict, Optional

# Load message resources
_RESOURCES: Dict[str, Dict] = {}


def load_resources():
    """Load i18n resources from JSON files"""
    global _RESOURCES
    
    resources_dir = Path(__file__).parent / "resources"
    for lang_file in resources_dir.glob("*.json"):
        lang_code = lang_file.stem  # e.g., "ja", "en"
        with open(lang_file, "r", encoding="utf-8") as f:
            _RESOURCES[lang_code] = json.load(f)


def get_message(message_key: str, lang: str = "ja") -> str:
    """
    Get localized message by key.
    
    Args:
        message_key: Dot-separated message key (e.g., "auth.invalid")
        lang: Language code (default "ja")
        
    Returns:
        Localized message string
    """
    if not _RESOURCES:
        load_resources()
    
    # Fallback to English if language not found
    messages = _RESOURCES.get(lang, _RESOURCES.get("en", {}))
    
    # Navigate nested dict with dot notation
    keys = message_key.split(".")
    value: Any = messages
    for key in keys:
        if isinstance(value, dict):
            value = value.get(key)
        else:
            return message_key  # Fallback to key itself
    
    return value if isinstance(value, str) else message_key


# Load resources on import
load_resources()
