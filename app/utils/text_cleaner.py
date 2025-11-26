import re


ARTIFACT_PATTERNS = [
    re.compile(r"async\.call\.result\.err\.err", re.IGNORECASE),
    re.compile(r"result\.err(?:\.err)?", re.IGNORECASE),
    re.compile(r"\(CiWeer.*?\)", re.IGNORECASE),
    re.compile(r"\basaresult\b", re.IGNORECASE),
    re.compile(r"CiWeer[`\"']?", re.IGNORECASE),
]

PREFIX_TOKENS = [
    "here's the extracted text",
    "here’s the extracted text",
    "here's the text extracted",
    "here’s the text extracted",
    "here is the text extracted",
    "here's the extracted information",
    "here’s the extracted information",
    "here is the extracted information",
    "here is the information extracted from the image",
    "here's the information extracted from the image",
    "here’s the information extracted from the image",
    "here's the text information extracted from the image",
    "here’s the text information extracted from the image",
    "here is the text information extracted from the image",
    "here is the text information extracted",
    "here's the text information extracted",
    "here’s the text information extracted",
    "here's the text extraction",
    "here’s the text extraction",
    "here is the text extraction",
    "here's the text extraction from the image",
    "here’s the text extraction from the image",
    "here is the text extraction from the image",
    "here is the requested information",
    "here's the information requested",
    "here’s the information requested",
    "here is the requested text extraction",
    "here's the requested text extraction",
    "here’s the requested text extraction",
]

LINE_TOKEN_SUBSTRINGS = [
    "visible text content",
    "requested details",
    "text extraction must",
    "you should only return",
    "real text physically present",
    "text locations (approximate)",
    "text is located",
    "text located near",
    "code-related text",
    "exact sizes are hard to determine",
    "missing semicolon",
    "text visible in the image",
    "font style description",
    "font size description",
    "serif font",
    "sans-serif font",
    "codes present",
    "numbers or codes",
    "numbers, dates, or codes",
    "numbers or dates",
    "handwritten text",
    "[no_text]",
    "no_text",
]

NOISE_SENTENCE_PATTERNS = [
    re.compile(r"^text locations", re.IGNORECASE),
    re.compile(r"^text is located", re.IGNORECASE),
    re.compile(r"^text located", re.IGNORECASE),
    re.compile(r"^code[-\s]?related text", re.IGNORECASE),
    re.compile(r"^the code[-\s]?related", re.IGNORECASE),
    re.compile(r"^the exact sizes", re.IGNORECASE),
    re.compile(r"^approximate", re.IGNORECASE),
    re.compile(r"^here'?s the extracted", re.IGNORECASE),
    re.compile(r"^here'?s the text extracted", re.IGNORECASE),
    re.compile(r"^here'?s the text extraction", re.IGNORECASE),
    re.compile(r"^here is the extracted", re.IGNORECASE),
    re.compile(r"^here is the text extracted", re.IGNORECASE),
    re.compile(r"^here is the text extraction", re.IGNORECASE),
    re.compile(r"^here is the requested information", re.IGNORECASE),
    re.compile(r"^here is the requested text extraction", re.IGNORECASE),
    re.compile(r"^here'?s the requested text extraction", re.IGNORECASE),
    re.compile(r"^requested details", re.IGNORECASE),
    re.compile(r"^this corresponds", re.IGNORECASE),
    re.compile(r"^text visible in the image", re.IGNORECASE),
    re.compile(r"^font.*appears", re.IGNORECASE),
    re.compile(r"^the size appears", re.IGNORECASE),
    re.compile(r"^the font", re.IGNORECASE),
    re.compile(r"^within a light", re.IGNORECASE),
    re.compile(r"^serif font", re.IGNORECASE),
    re.compile(r"^sans[-\s]?serif", re.IGNORECASE),
    re.compile(r"^codes? present", re.IGNORECASE),
    re.compile(r"^handwritten text", re.IGNORECASE),
    re.compile(r"^numbers?,?\s+dates?,?\s+or codes?", re.IGNORECASE),
]

ARTIFACT_SENTENCE_PATTERNS = [
    re.compile(r"Text locations[^.]*\.", re.IGNORECASE),
    re.compile(r"Code[-\s]?related text[^.]*\.", re.IGNORECASE),
    re.compile(r"The exact sizes[^.]*\.", re.IGNORECASE),
]


def _strip_prompt_prefix(value: str) -> str:
    """
    Remove prompt fragments before real OCR text (e.g., "Here's the extracted text: ...").
    """
    if not value:
        return ""

    output = value
    for token in PREFIX_TOKENS:
        lower = output.lower()
        token_lower = token.lower()
        idx = lower.find(token_lower)
        if idx != -1:
            remainder = output[idx + len(token):]
            colon_idx = remainder.find(":")
            if colon_idx != -1:
                trailing = remainder[colon_idx + 1 :].strip()
                if trailing:
                    output = trailing
                    continue
            output = output[:idx].strip()
    return output.strip()


def clean_ocr_text(text: str) -> str:
    """
    Normalize OCR output by removing prompt artifacts, duplicated lines, and helper commentary.
    """
    if not text:
        return ""

    normalized = text
    normalized = normalized.replace("\u2019", "'")
    normalized = re.sub(r"\*\*", "", normalized)
    normalized = re.sub(r"```[\s\S]*?```", "", normalized)
    normalized = re.sub(r"`([^`]+)`", r"\1", normalized)
    normalized = re.sub(r"Parsing error:.*?\)", "", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"\d+:\s*Parsing error:.*?\)", "", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"\d+:\d+\s*", "", normalized)
    normalized = re.sub(r"^\d+\.\s*", "", normalized, flags=re.MULTILINE)
    normalized = re.sub(
        r"Here'?s the breakdown of the text extracted from the image:?",
        "",
        normalized,
        flags=re.IGNORECASE,
    )
    normalized = re.sub(
        r"Here'?s the information extracted from (?:the )?image:?",
        "",
        normalized,
        flags=re.IGNORECASE,
    )
    normalized = re.sub(
        r"Here\s+is\s+the\s+information\s+extracted\s+from\s+(?:the\s+)?image:?",
        "",
        normalized,
        flags=re.IGNORECASE,
    )
    normalized = re.sub(
        r"Here'?s?\s+the\s+text\s+information\s+extracted\s+from\s+(?:the\s+)?image:?",
        "",
        normalized,
        flags=re.IGNORECASE,
    )
    normalized = re.sub(
        r"Here\s+is\s+the\s+text\s+information\s+extracted:?",
        "",
        normalized,
        flags=re.IGNORECASE,
    )
    normalized = re.sub(
        r"Here\s+is\s+the\s+text\s+extraction\s+from\s+the\s+image:?",
        "",
        normalized,
        flags=re.IGNORECASE,
    )
    normalized = re.sub(
        r"Here'?s\s+the\s+text\s+extraction\s+from\s+the\s+image:?",
        "",
        normalized,
        flags=re.IGNORECASE,
    )
    normalized = re.sub(r"UPC`", "UPC", normalized)

    for pattern in ARTIFACT_PATTERNS:
        normalized = pattern.sub("", normalized)

    normalized = re.sub(r"([a-zA-Z])\.([A-Za-z])", r"\1. \2", normalized)
    normalized = re.sub(r"([a-zA-Z]),([A-Za-z])", r"\1, \2", normalized)
    normalized = re.sub(r"\s{2,}", " ", normalized)

    for pattern in ARTIFACT_SENTENCE_PATTERNS:
        normalized = pattern.sub(".", normalized)

    seen_lines = set()
    cleaned_lines = []

    for raw_line in normalized.splitlines():
        line = _strip_prompt_prefix(raw_line)
        line = re.sub(r"^[\s*•-]+(?=\w)", "", line)
        line = re.sub(r"\*+$", "", line).strip()
        if not line:
            continue

        lower = line.lower()
        if (
            "parsing error" in lower
            or re.match(r"^\d+:\d+$", lower)
            or lower.startswith("error:")
            or any(token in lower for token in LINE_TOKEN_SUBSTRINGS)
            or any(pattern.search(lower) for pattern in NOISE_SENTENCE_PATTERNS)
        ):
            continue

        fingerprint = re.sub(r"[^a-z0-9]+", "", lower)
        if not fingerprint or fingerprint in seen_lines:
            continue

        seen_lines.add(fingerprint)
        cleaned_lines.append(line)

    return "\n".join(cleaned_lines).strip()


__all__ = ["clean_ocr_text"]

