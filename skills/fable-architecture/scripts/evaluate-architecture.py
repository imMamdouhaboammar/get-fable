#!/usr/bin/env python3
"""Deterministic Architecture Vector Evaluation Script for get-fable.

Evaluates an input specification across:
1. Scale & Load
2. Domain Decoupling
3. Resource Intensity
Outputs a JSON evaluation result and sets exit code 0.
"""
import json
import re
import sys

SCALE_PATTERNS = [
    r"\b(\d{4,}|\d+k|\d+m)\s*(?:concurrent|rps|req\/s|tps|users|connections)\b",
    r"\b(?:high|extreme|massive|strict)\s+(?:concurrency|throughput|load|scale)\b",
    r"\bmillions of (?:messages|requests|events|records)\b",
    r"\b(?:low latency|sub[- ](?:10|20|50)ms|p99|sla)\b",
    r"\bhorizontal(?:ly)?\s+scal(?:e|ing|able)\b",
]

DOMAINS = {
    "auth": r"\b(?:auth|identity|oauth|sso|credentials|rbac|jwt)\b",
    "billing": r"\b(?:payment|billing|stripe|invoice|subscription|checkout)\b",
    "gateway": r"\b(?:api gateway|gateway|reverse proxy|ingress|bff)\b",
    "compute": r"\b(?:transcod(?:e|ing)|heavy math|cryptography|binary stream|encryption)\b",
    "ai": r"\b(?:ai inference|llm routing|deep learning|predictive model|embeddings)\b",
    "messaging": r"\b(?:kafka|rabbitmq|message broker|event stream|pubsub)\b",
    "crud": r"\b(?:crud|product catalog|user management|order management)\b",
}

CPU_PATTERNS = [r"\b(?:transcoding|video encoding|heavy math|cryptography|encryption|binary parsing|neural net|model inference)\b"]
IO_PATTERNS = [r"\b(?:crud|api gateway|rest endpoint|database query|http handler|webhook|json api)\b"]


def evaluate(text: str):
    lower = text.lower()

    # Vector 1: Scale & Load
    scale_score = 0.0
    for pat in SCALE_PATTERNS:
        if re.search(pat, lower):
            scale_score += 2.5
    scale_score = min(10.0, scale_score)

    # Vector 2: Domain Decoupling
    identified = [name for name, pat in DOMAINS.items() if re.search(pat, lower)]
    if len(identified) >= 4:
        domain_score = 9.0
    elif len(identified) == 3:
        domain_score = 8.0
    elif len(identified) == 2:
        domain_score = 7.0
    elif len(identified) == 1:
        domain_score = 3.5
    else:
        domain_score = 1.0

    # Vector 3: Resource Intensity
    has_cpu = any(re.search(p, lower) for p in CPU_PATTERNS)
    has_io = any(re.search(p, lower) for p in IO_PATTERNS)
    if has_cpu and has_io:
        resource_score = 8.5
    elif has_cpu:
        resource_score = 5.5
    elif has_io:
        resource_score = 3.0
    else:
        resource_score = 1.0

    composite = round((scale_score * 0.35) + (domain_score * 0.40) + (resource_score * 0.25), 1)

    is_microservices = scale_score >= 7.0 or domain_score >= 7.0 or resource_score >= 7.0 or composite >= 6.0
    verdict = "microservices" if is_microservices else "monolith"

    return {
        "verdict": verdict,
        "allowMonolith": not is_microservices,
        "vectors": {
            "scaleAndLoad": scale_score,
            "domainDecoupling": domain_score,
            "resourceIntensity": resource_score,
            "compositeScore": composite,
        },
        "identifiedDomains": identified,
        "communicationStandards": {
            "northSouth": "REST HTTP/JSON (OpenAPI 3.1)",
            "eastWest": "gRPC (HTTP/2 + Protobuf) or Message Broker",
            "prohibitInternalHttpJson": is_microservices,
        },
    }


def main():
    text = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else sys.stdin.read()
    if not text.strip():
        print(json.dumps({"error": "Empty input"}), file=sys.stderr)
        sys.exit(1)
    result = evaluate(text)
    print(json.dumps(result, indent=2))
    sys.exit(0)


if __name__ == "__main__":
    main()
