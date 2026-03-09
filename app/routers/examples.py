# app/routers/examples.py
"""Example sentence test endpoints."""

from fastapi import APIRouter, Depends, Query
from typing import List, Optional, Dict, Any
import random

from ..deps import require_auth
from ..models import WordEntry, ExampleSentence
from ..services import load_words

router = APIRouter(prefix="/api/examples", tags=["examples"])


@router.get("/next")
async def get_next_example(
    tags: Optional[List[str]] = Query(None),
    last_example_id: Optional[str] = Query(None, alias="lastExampleId"),
    u: dict = Depends(require_auth)
) -> Dict[str, Any]:
    """
    Get a random example sentence for testing.
    
    Returns an example with the target word removed for fill-in-the-blank testing.
    Supports tag filtering and avoids returning the same example consecutively.
    
    Args:
        tags: Optional list of tags to filter words
        last_example_id: Optional ID of the last shown example to avoid repetition
    """
    user_id = u["userId"]
    words_file = load_words(user_id)
    
    # Filter by tags if specified
    if tags:
        words = [w for w in words_file.words if any(t in w.tags for t in tags)]
    else:
        words = words_file.words
    
    # Collect all examples from all words
    examples_pool: List[Dict[str, Any]] = []
    for word in words:
        if word.examples:
            for example in word.examples:
                examples_pool.append({
                    "word": word,
                    "example": example
                })
    
    if not examples_pool:
        return {"example": None}
    
    # Filter out last example if there are alternatives
    available_examples = examples_pool
    if last_example_id and len(examples_pool) > 1:
        filtered = [item for item in examples_pool if item["example"].id != last_example_id]
        if filtered:
            available_examples = filtered
    
    # Pick random example
    selected = random.choice(available_examples)
    selected_word: WordEntry = selected["word"]
    selected_example: ExampleSentence = selected["example"]

    # Return example with word info
    return {
        "example": {
            "id": selected_example.id,
            "en": selected_example.en,
            "ja": selected_example.ja,
            "source": selected_example.source,
            "word": {
                "id": selected_word.id,
                "headword": selected_word.headword,
                "pos": selected_word.pos,
                "meaningJa": selected_word.meaningJa,
                "tags": selected_word.tags
            }
        }
    }


@router.get("/tags")
async def get_all_tags_for_examples(
    u: dict = Depends(require_auth)
) -> Dict[str, List[str]]:
    """
    Get all tags from words that have examples.
    """
    user_id = u["userId"]
    words_file = load_words(user_id)
    
    # Get tags from words that have examples
    all_tags = set()
    for word in words_file.words:
        if word.examples:
            all_tags.update(word.tags)
    
    return {"tags": sorted(list(all_tags))}
