use crate::registry::get_skill_entry;
use crate::types::*;
use regex::RegexSet;
use std::collections::HashMap;
use std::sync::LazyLock;

pub const RECOVERY_FAILURE_THRESHOLD: u32 = 2;
const PARALLEL_SIGNAL_FLOOR: f64 = 6.0;
const MAX_PARALLEL_CANDIDATES: usize = 3;

static SUPPRESSION_SET: LazyLock<RegexSet> = LazyLock::new(|| {
    RegexSet::new([
        // 0: suppress_external_research
        r"(?:external|web) research (?:is )?not needed|do not (?:use|do|perform) (?:external|web) research|no (?:external|web) research",
        // 1: suppress_release
        r"do not (?:ship|publish|release|tag)|don't (?:ship|publish|release|tag)|not ready to (?:ship|publish|release)|(?:ship|publish|release) (?:is )?out of scope",
        // 2: suppress_security
        r"no security (?:behavior|boundary|logic|change)s?|security (?:work|review) (?:is )?not (?:needed|required)|not (?:a )?security (?:change|task|review)",
        // 3: suppress_tdd
        r"no [^.]{0,40}behavior changes?|without (?:changing|a change to) behavior|not (?:a )?behavior change",
        // 4: suppress_plan
        r"do not plan|don't plan|no planning|planning (?:is )?out of scope|skip (?:the )?plan",
        // 5: suppress_review
        r"do not review|don't review|no (?:code )?review|review (?:is )?out of scope|skip (?:the )?review",
        // 6: suppress_delegation
        r"do not delegate|don't delegate|no delegation|without subagents?|single agent|single worker",
    ])
    .expect("valid suppression RegexSet")
});

static SIGNAL_SET: LazyLock<RegexSet> = LazyLock::new(|| {
    RegexSet::new([
        // 0: fable-recover
        r"failed twice|fails twice|same (?:test|command|fix|failure)|retry(?:ing|ied)?|still fail|keeps? failing|doesn['’]?t work|didn['’]?t work|stale|cache|wrong branch|wrong build|no effect",
        // 1: fable-security
        r"\bsecurity\b|\bvulnerab(?:ility|ilities)\b|threat model|\bauthentication\b|\bauthorization\b|\boauth\b|\bsecrets?\b|untrusted input|\binjection\b|\bxss\b|\bcsrf\b|\bssrf\b",
        // 2: fable-redteam
        r"(?i)\bredteam\b|\bpentest\b|penetration test|offensive security|security audit|attack graph|idor probe|vulnerability discovery",
        // 3: fable-heal
        r"(?i)\bheal\b|\bauto-heal\b|remediate(?:\s+vulnerability)?|security(?:\s+remediation|\s+patch|\s+fix)|patch(?:\s+vulnerability|\s+security)",
        // 4: fable-release
        r"\brelease\b|\bpublish\b|\bship\b|\btag\b|ready (?:to|for) (?:merge|release|publish)|merge (?:this|now|the pr)|open (?:a )?pr|create (?:a )?pull request|ready for pr|pull request readiness",
        // 5: fable-handoff
        r"\bhandoff\b|continue later|next session|resume later|context transfer|pass this to another agent",
        // 6: fable-eval
        r"\beval\b|\bevaluate\b|\bbenchmark\b|holdout|self[- ]improv|prompt quality|skill quality|agent control|regression suite for (?:prompt|skill|agent)",
        // 7: fable-learning
        r"(?i)\bconvo[- ]learn\b|extract learnings?|synthesize learnings?|what did we learn|playbook generation|session learnings?|analyze (?:this )?conversation|learning synthesis|\bfable-learning\b|\bfable-convo-learn\b|session realities|compound solution|extract (?:decisions|lessons|patterns|surprises)|failure[- ]lessons?|failure knowledge|convert session into durable|durable project learnings?|rules we now enforce|lesson behind the bug|testing and verification lessons|postmortem lessons?|capture engineering failures?",
        // 8: fable-review
        r"code review|review (?:the |this )?(?:diff|branch|commit|pr)|standards review|spec review|review changed files|independently critique|critique (?:the )?changed files",
        // 9: fable-verify
        r"\bverify\b|\bvalidate\b|\bprove\b|ready to ship|is this correct|acceptance check|regression check|completion evidence",
        // 10: fable-research
        r"official (?:api )?docs|primary source|current api|current version|current official behavior[^.]{0,80}(?:external )?api|official behavior[^.]{0,80}api|latest (?:official )?(?:api )?(?:docs|documentation|release|version|behavior)|external documentation|release notes|web research",
        // 11: fable-discover
        r"\binspect\b|\bexplore\b|\btrace\b|find where|understand the repo|understand (?:why|how)[^.]{0,100}repository|current repository (?:behavior|behaves)|unknown|without knowing|not knowing|repository behavior|execution path",
        // 12: fable-discover (strong subpattern)
        r"inspect (?:this |the |a )?(?:local )?repository|trace[^.]{0,80}repository|execution path|understand (?:why|how)[^.]{0,100}repository",
        // 13: fable-delegate
        r"\bdelegate\b|\bsubagents?\b|parallel agents|parallel workers|multi[- ]agent|independent tasks|independent work items|disjoint ownership|proceed in parallel|split across agents",
        // 14: fable-plan
        r"\bplan\b|\bdesign\b|\barchitecture\b|\bmigration\b|\brefactor\b|multi[- ]file|end to end|modular|restructure|redesign",
        // 15: fable-dataviz
        r"\bchart\b|\bgraph\b|\bplot\b|\bdataviz\b|\bvisualization\b|\bdashboard\b|\bmetric tile\b|\bkpi row\b|\bheatmap\b",
        // 16: fable-artifact
        r"\bartifact\b|\bdiagram\b|\bmermaid\b|\barchitecture diagram\b|\binteractive component\b",
        // 17: fable-simplify
        r"\bsimplify\b|\bclean up\b|\bdead code\b|\bdeduplicate\b|\baltitude\b",
        // 18: fable-loop
        r"\bloop\b|\brecurring\b|\bbabysit\b|\binterval\b|\bpoll\b",
        // 19: fable-run
        r"\brun app\b|\brun the app\b|\bstart server\b|\blaunch app\b|\blive smoke test\b",
        // 20: fable-memory
        r"\bmemory\b|\bremember\b|\buser preference\b|memory\.md|\brecall fact",
        // 21: fable-config
        r"\bsettings\.json\b|\bkeybindings\b|\ballowlist\b|\bconfigure hooks\b|\bharness\b",
        // 22: fable-simulator
        r"\bsimulator\b|independent oracle|derive contract|headless browser|causal evidence matrix",
        // 23: fable-cowork
        r"\bcowork\b|autonomous (?:mode|task|execution)|background mode|clean tool",
        // 24: fable-spark
        r"\bspark\b|predict (?:the )?next move|situational awareness|smallest action",
        // 25: fable-skill-creator
        r"\bfable-skill-creator\b|\bskill-creator\b|create (?:a )?skill|author skill|benchmark skill|optimize skill description|eval suite",
        // 26: fable-architecture
        r"(?i)\b(?:microservices?|distributed architecture|decoupled (?:services|domains)|tech stack matrix|architecture enforcement|evaluate architecture|scaffold microservices|grpc east[- ]west)\b",
        // 27: fable-eco
        r"(?i)\b(?:fable-eco|eco\b|capability provisioning|curated capabilities|provision capabilities|plan capabilities|install capabilities|discover environment|update capabilities|repair capabilities|reproducible locks)\b",
        // 28: fable-context-thrift
        r"(?i)\bcontext thrift\b|token budget|conserve context|batch (?:reads|lookups)|too much context|targeted read",
        // 29: fable-finish-your-turn
        r"(?i)\bfinish (?:your )?turn\b|complete (?:the )?turn|do not stop|finish what you started|premature stop|upward delegation",
        // 30: fable-native-code
        r"(?i)\bnative code\b|match idiom|strip (?:defensive )?comments|no defensive bloat|codebase idiom|clean diff idiom",
        // 31: fable-outcome-first
        r"(?i)\boutcome[- ]first\b|first sentence answer|direct answer|strip sycophancy|outcome summary|answer directly",
        // 32: fable-prove-it
        r"(?i)\bprove[- ]it\b|\bthree-rung\b|verification rung|should work is rung zero|claim verification|written runs verified|\bclaim only your rung\b",
        // 33: fable-scope-discipline
        r"(?i)\bscope discipline\b|prevent scope creep|no scope creep|surgical diff|no drive-bys|adjacency is not scope",
        // 34: fable-domain
        r"(?i)\bfable-domain\b|domain adapter|sector workflow|trap fixture|generate domain skill",
        // 35: fable-judge
        r"(?i)\bfable-judge\b|judge (?:this )?work|adversarial verification|hunt frauds|detect weakened tests|verify what it did",
        // 36: fable-method
        r"(?i)\bfable-method\b|fable method|the fable method|think act prove",
        // 37: fable-council
        r"(?i)\bcouncil\b|fable-council|convene (?:the )?council|consult (?:the )?other agents|deliberate before planning|second opinion from other agents",
        // 38: fable-tend
        r"(?i)\btend\b|fable-tend|ci-fix|triage ci|resolve (?:git )?conflicts|junior maintainer|nightly sweep",
        // 39: fable-wise
        r"(?i)\bfable-wise\b|paperthin|re0\b|ssotize|autobahn\b|feynman check|strip slop|debloat artifact|contrarian objection",
        // 40: fable-tdd
        r"\btdd\b|test[- ]first|red[- ]green|regression test|failing test[^.]{0,100}(?:before|first)|\bregressed\b|\bbug fix\b|fix the bug|\bfix\b[^.]{0,80}\b(?:error|exception|regression)\b|behavior change|add a feature|implement a feature",
        // 41: fable-execute
        r"\bimplement\b|\bfix\b|\badd\b|\bupdate\b|\bchange\b|\bbuild\b|\bremove\b|\brename\b",
        // 42: bug-fix shape helper
        r"\bbug\b|\bfix\b|broken|regression|fails?",
    ])
    .expect("valid signal RegexSet")
});

fn task_shape_for(skill: &str, is_bug_fix: bool) -> FableTaskShape {
    match skill {
        "fable-research" | "fable-memory" | "fable-context-thrift" => FableTaskShape::Research,
        "fable-plan"
        | "fable-artifact"
        | "fable-config"
        | "fable-spark"
        | "fable-architecture"
        | "fable-eco"
        | "fable-council"
        | "fable-wise" => FableTaskShape::Architecture,
        "fable-delegate" => FableTaskShape::Delegation,
        "fable-review"
        | "fable-verify"
        | "fable-run"
        | "fable-simulator"
        | "fable-judge"
        | "fable-prove-it" => FableTaskShape::Review,
        "fable-security" | "fable-redteam" | "fable-heal" => FableTaskShape::Security,
        "fable-release" | "fable-tend" => FableTaskShape::Release,
        "fable-handoff" | "fable-outcome-first" => FableTaskShape::Handoff,
        "fable-eval" | "fable-loop" | "fable-learning" => FableTaskShape::Eval,
        "fable-simplify" | "fable-native-code" | "fable-scope-discipline" | "fable-execute" => {
            FableTaskShape::BoundedChange
        }
        "fable-dataviz"
        | "fable-cowork"
        | "fable-skill-creator"
        | "fable-domain"
        | "fable-method"
        | "fable-finish-your-turn" => FableTaskShape::Feature,
        "fable-tdd" => {
            if is_bug_fix {
                FableTaskShape::BugFix
            } else {
                FableTaskShape::Feature
            }
        }
        _ => FableTaskShape::Unknown,
    }
}

fn active_continuation_skill(state: Option<&FableState>) -> Option<&str> {
    let st = state?;
    let current = st.current_skill.as_deref()?;
    if matches!(
        st.phase,
        FablePhase::Idle | FablePhase::Complete | FablePhase::Blocked
    ) {
        return None;
    }
    Some(current)
}

pub fn route_task(
    task: &str,
    state: Option<&FableState>,
    registry: &SkillRegistry,
) -> Result<RoutingDecision, String> {
    let text = task.trim().to_lowercase();
    if text.is_empty() {
        return Err("Task text must not be empty".to_string());
    }

    let mut scores: HashMap<String, f64> = HashMap::with_capacity(registry.skills.len());
    let mut reasons: HashMap<String, Vec<String>> = HashMap::with_capacity(registry.skills.len());

    for skill in &registry.skills {
        scores.insert(
            skill.id.clone(),
            if skill.id == "fable-execute" {
                1.0
            } else {
                0.0
            },
        );
        reasons.insert(skill.id.clone(), Vec::new());
    }

    let mut add_signal = |skill: &str, weight: f64, reason: &str| {
        if let Some(s) = scores.get_mut(skill) {
            *s += weight;
        }
        if let Some(r) = reasons.get_mut(skill) {
            r.push(reason.to_string());
        }
    };

    // Single-pass DFA over suppression and positive signal sets
    let sup = SUPPRESSION_SET.matches(&text);
    let suppress_external_research = sup.matched(0);
    let suppress_release = sup.matched(1);
    let suppress_security = sup.matched(2);
    let suppress_tdd = sup.matched(3);
    let suppress_plan = sup.matched(4);
    let suppress_review = sup.matched(5);
    let suppress_delegation = sup.matched(6);

    let sig = SIGNAL_SET.matches(&text);

    if let Some(st) = state {
        if st.failure_streak >= RECOVERY_FAILURE_THRESHOLD {
            add_signal(
                "fable-recover",
                8.0,
                "project state records repeated failure",
            );
        }
        if st.phase == FablePhase::Recovering {
            add_signal("fable-recover", 6.0, "project state is already recovering");
        }
        if st.phase == FablePhase::Verifying {
            add_signal("fable-verify", 3.0, "project state is already verifying");
        }
    }

    if let Some(continuation) = active_continuation_skill(state) {
        if continuation != "get-fable" {
            add_signal(
                continuation,
                2.0,
                &format!("project state is already active in {}", continuation),
            );
        }
    }

    if sig.matched(0) {
        add_signal(
            "fable-recover",
            9.0,
            "task describes repeated or stale failure",
        );
    }

    if !suppress_security && sig.matched(1) {
        add_signal(
            "fable-security",
            9.0,
            "task crosses an explicit security or trust boundary",
        );
    }

    if sig.matched(2) {
        add_signal(
            "fable-redteam",
            10.0,
            "task asks for offensive security testing, penetration testing, or red teaming",
        );
    }

    if sig.matched(3) {
        add_signal(
            "fable-heal",
            11.0,
            "task asks to heal or remediate security vulnerabilities",
        );
    }

    if !suppress_release && sig.matched(4) {
        add_signal(
            "fable-release",
            8.0,
            "task asks for delivery or release readiness",
        );
    }

    if sig.matched(5) {
        add_signal(
            "fable-handoff",
            12.0,
            "task asks for durable continuation state",
        );
    }

    if sig.matched(6) {
        add_signal(
            "fable-eval",
            8.0,
            "task evaluates or changes agent-control behavior",
        );
    }

    if sig.matched(7) {
        add_signal(
            "fable-learning",
            12.0,
            "task extracts or synthesizes durable learnings from session or conversation",
        );
    }

    if !suppress_review && sig.matched(8) {
        let is_security_review = !suppress_security && sig.matched(1);
        let review_weight = if is_security_review { 8.0 } else { 12.0 };
        add_signal(
            "fable-review",
            review_weight,
            "task requests an independent code or diff review",
        );
    }

    if sig.matched(9) {
        add_signal(
            "fable-verify",
            7.0,
            "task explicitly asks for behavior verification",
        );
    }

    if !suppress_external_research && sig.matched(10) {
        add_signal(
            "fable-research",
            8.0,
            "task depends on current external facts",
        );
    }

    if sig.matched(11) {
        let discovery_weight = if sig.matched(12) { 10.0 } else { 6.0 };
        add_signal(
            "fable-discover",
            discovery_weight,
            "task depends on repository discovery or execution-path evidence",
        );
    }

    if !suppress_delegation && sig.matched(13) {
        add_signal(
            "fable-delegate",
            8.0,
            "task explicitly requests bounded parallel work",
        );
    }

    if !suppress_plan && sig.matched(14) {
        add_signal(
            "fable-plan",
            6.0,
            "task has broad design or decomposition scope",
        );
    }

    if sig.matched(15) {
        add_signal(
            "fable-dataviz",
            10.0,
            "task creates or modifies data visualizations",
        );
    }

    if sig.matched(16) {
        add_signal(
            "fable-artifact",
            12.0,
            "task designs artifacts or architecture diagrams",
        );
    }

    if sig.matched(17) {
        add_signal(
            "fable-simplify",
            10.0,
            "task requests code simplification and altitude cleanup",
        );
    }

    if sig.matched(18) {
        add_signal("fable-loop", 10.0, "task requests recurring loop execution");
    }

    if sig.matched(19) {
        add_signal(
            "fable-run",
            10.0,
            "task requests live application runtime execution",
        );
    }

    if sig.matched(20) {
        add_signal(
            "fable-memory",
            10.0,
            "task interacts with persistent project memory",
        );
    }

    if sig.matched(21) {
        add_signal(
            "fable-config",
            12.0,
            "task configures agent harness settings",
        );
    }

    if sig.matched(22) {
        add_signal(
            "fable-simulator",
            10.0,
            "task requests simulator verification and independent oracles",
        );
    }

    if sig.matched(23) {
        add_signal(
            "fable-cowork",
            10.0,
            "task requests autonomous cowork execution",
        );
    }

    if sig.matched(24) {
        add_signal(
            "fable-spark",
            10.0,
            "task invokes situational awareness next-move prediction",
        );
    }

    if sig.matched(25) {
        add_signal(
            "fable-skill-creator",
            12.0,
            "task creates or optimizes an autonomous skill package",
        );
    }

    if sig.matched(26) {
        add_signal(
            "fable-architecture",
            13.0,
            "task requests architecture evaluation or microservices enforcement",
        );
    }

    if sig.matched(27) {
        add_signal(
            "fable-eco",
            12.0,
            "task requests capability provisioning or ecosystem management",
        );
    }

    if sig.matched(28) {
        add_signal(
            "fable-context-thrift",
            11.0,
            "task requests context conservation or token thrift",
        );
    }

    if sig.matched(29) {
        add_signal(
            "fable-finish-your-turn",
            11.0,
            "task enforces complete turn discipline without premature surrender",
        );
    }

    if sig.matched(30) {
        add_signal(
            "fable-native-code",
            11.0,
            "task enforces codebase idiom matching and zero defensive bloat",
        );
    }

    if sig.matched(31) {
        add_signal(
            "fable-outcome-first",
            11.0,
            "task enforces outcome-first reporting with direct answers",
        );
    }

    if sig.matched(32) {
        add_signal(
            "fable-prove-it",
            11.0,
            "task enforces three-rung proof and verified evidence",
        );
    }

    if sig.matched(33) {
        add_signal(
            "fable-scope-discipline",
            11.0,
            "task enforces scope discipline and atomic diffs",
        );
    }

    if sig.matched(34) {
        add_signal(
            "fable-domain",
            12.0,
            "task generates a domain workflow adapter and trap fixture",
        );
    }

    if sig.matched(35) {
        add_signal(
            "fable-judge",
            12.0,
            "task requests adversarial verification and fraud detection",
        );
    }

    if sig.matched(36) || (text.contains("classify the ask") && text.contains("define done")) {
        add_signal(
            "fable-method",
            12.0,
            "task requests execution through the canonical Fable method loop",
        );
    }

    if sig.matched(37) {
        add_signal(
            "fable-council",
            12.0,
            "task convenes a multi-agent deliberation council",
        );
    }

    if sig.matched(38) {
        add_signal(
            "fable-tend",
            12.0,
            "task invokes repository maintenance or CI repair",
        );
    }

    if sig.matched(39) {
        add_signal(
            "fable-wise",
            12.0,
            "task requests Paperthin low-level agentic patterns or slop reduction",
        );
    }

    if !suppress_tdd && sig.matched(40) {
        add_signal("fable-tdd", 10.0, "task describes a testable behavior change");
    }

    if sig.matched(41) {
        add_signal("fable-execute", 3.0, "task requests a concrete code change");
    }

    // Rank skills
    let mut ranked: Vec<(&SkillRegistryEntry, f64)> = registry
        .skills
        .iter()
        .filter(|s| s.id != "get-fable")
        .map(|s| (s, *scores.get(&s.id).unwrap_or(&0.0)))
        .collect();

    ranked.sort_by(|a, b| {
        b.1.partial_cmp(&a.1)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then_with(|| a.0.order.cmp(&b.0.order))
            .then_with(|| a.0.id.cmp(&b.0.id))
    });

    let mut selected_skill = if ranked[0].1 > 0.0 {
        ranked[0].0.id.clone()
    } else {
        "fable-execute".to_string()
    };

    if scores.get("fable-recover").copied().unwrap_or(0.0) >= 8.0 {
        selected_skill = "fable-recover".to_string();
    }

    let selected_score = *scores.get(&selected_skill).unwrap_or(&0.0);
    let second_score = ranked
        .iter()
        .find(|(s, _)| s.id != selected_skill)
        .map(|(_, score)| *score)
        .unwrap_or(0.0);

    let raw_conf = 0.56 + selected_score * 0.025 + (selected_score - second_score).max(0.0) * 0.035;
    let confidence = (raw_conf.clamp(0.51, 0.99) * 100.0).round() / 100.0;

    let selected_entry = get_skill_entry(&selected_skill, registry)?;
    let default_reason = vec![
        "bounded execution is the default when no stronger routing signal is present".to_string(),
    ];
    let selected_reasons = reasons
        .get(&selected_skill)
        .filter(|r| !r.is_empty())
        .unwrap_or(&default_reason)
        .clone();

    let allowed_next: std::collections::HashSet<&str> =
        selected_entry.next.iter().map(|s| s.as_str()).collect();

    let parallel_candidates: Vec<String> = ranked
        .iter()
        .filter(|(s, score)| {
            s.id != selected_skill
                && *score >= PARALLEL_SIGNAL_FLOOR
                && allowed_next.contains(s.id.as_str())
                && s.parallel_safe
        })
        .take(MAX_PARALLEL_CANDIDATES)
        .map(|(s, _)| s.id.clone())
        .collect();

    let requires_plan = selected_skill == "fable-plan"
        || selected_skill == "fable-architecture"
        || selected_skill == "fable-discover"
        || selected_skill == "fable-research"
        || (!suppress_plan && *scores.get("fable-plan").unwrap_or(&0.0) >= 4.0);

    Ok(RoutingDecision {
        selected_skill: selected_skill.clone(),
        selected_pack: selected_entry.pack.clone(),
        task_shape: task_shape_for(&selected_skill, sig.matched(42)),
        confidence,
        reasons: selected_reasons,
        requires_plan,
        required_gates: selected_entry.gates.clone(),
        fallback_skill: selected_entry.fallback.clone(),
        parallel_candidates,
        next_skills: selected_entry.next.clone(),
        scores,
    })
}

