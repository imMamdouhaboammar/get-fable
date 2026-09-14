#!/usr/bin/env python3
"""get-fable Inception & Pre-Tool Architecture Enforcement Guard.

Evaluates project specifications at inception (SessionStart / Step One)
across Scale & Load, Domain Decoupling, and Resource Intensity vectors.
When thresholds are met, locks out monolithic scaffolding and enforces
a distributed microservices execution paradigm.

Fail-open on unexpected errors.
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _fable_common import (  # noqa: E402
    read_hook_input,
    start_dir,
    find_fable_dir,
    read_state,
)

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
    "realtime": r"\b(?:websocket|web sockets?|real[- ]time|live view|liveview|presence|chat room|zero[- ]downtime|fault[- ]tolerant|actor model|beam|elixir|phoenix)\b",
    "crud": r"\b(?:crud|product catalog|user management|order management)\b",
}

CPU_PATTERNS = [r"\b(?:transcoding|video encoding|heavy math|cryptography|encryption|binary parsing|neural net|model inference)\b"]
IO_PATTERNS = [r"\b(?:crud|api gateway|rest endpoint|database query|http handler|webhook|json api)\b"]


def evaluate_vectors(text: str):
    lower = text.lower()

    scale_score = 0.0
    for pat in SCALE_PATTERNS:
        if re.search(pat, lower):
            scale_score += 2.5
    scale_score = min(10.0, scale_score)

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

    return {
        "is_microservices": is_microservices,
        "scale": scale_score,
        "domain": domain_score,
        "resource": resource_score,
        "composite": composite,
        "identified": identified,
    }


def extract_prompt_text(data):
    # Check possible prompt locations across hosts
    for key in ("prompt", "user_prompt", "task", "input", "initial_prompt"):
        val = data.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip()

    ctx = data.get("context") or {}
    if isinstance(ctx, dict):
        for key in ("prompt", "userPrompt", "task", "intent"):
            val = ctx.get(key)
            if isinstance(val, str) and val.strip():
                return val.strip()

    return ""


def main():
    data = read_hook_input()
    event_name = data.get("hook_event_name") or data.get("event") or ""

    prompt_text = extract_prompt_text(data)

    if event_name in ("SessionStart", "PreInvocation", ""):
        if not prompt_text:
            return 0
        eval_res = evaluate_vectors(prompt_text)
        if eval_res["is_microservices"]:
            context_msg = (
                "[fable-architecture] Microservices Architecture mandatory (scale=%.1f, domain=%.1f, resource=%.1f, composite=%.1f). "
                "Single-process monolith scaffolding is LOCKED OUT. Decompose into decoupled services using TOON manifest, "
                "North-South REST (OpenAPI 3.1) and East-West gRPC/Message Broker."
                % (eval_res["scale"], eval_res["domain"], eval_res["resource"], eval_res["composite"])
            )
            print(json.dumps({
                "hookSpecificOutput": {
                    "hookEventName": "SessionStart",
                    "additionalContext": context_msg,
                }
            }, ensure_ascii=False))
        return 0

    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        sys.stderr.write("[get-fable] architecture guard error (ignored): %r\n" % exc)
        sys.exit(0)
