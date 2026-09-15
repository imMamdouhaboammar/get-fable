use crate::registry::get_skill_entry;
use crate::types::*;
use regex::Regex;
use std::collections::HashMap;

const RECOVERY_FAILURE_THRESHOLD: u32 = 2;
const PARALLEL_SIGNAL_FLOOR: f64 = 6.0;
const MAX_PARALLEL_CANDIDATES: usize = 3;

fn task_shape_for(skill: &str, text: &str) -> FableTaskShape {
    match skill {
        "fable-research" | "fable-memory" => FableTaskShape::Research,
        "fable-plan" | "fable-artifact" | "fable-config" | "fable-spark" | "fable-architecture" => {
            FableTaskShape::Architecture
        }
        "fable-delegate" => FableTaskShape::Delegation,
        "fable-review" | "fable-verify" | "fable-run" | "fable-simulator" => FableTaskShape::Review,
        "fable-security" | "fable-redteam" => FableTaskShape::Security,
        "fable-release" => FableTaskShape::Release,
        "fable-handoff" => FableTaskShape::Handoff,
        "fable-eval" | "fable-loop" | "fable-learning" => FableTaskShape::Eval,
        "fable-simplify" => FableTaskShape::BoundedChange,
        "fable-dataviz" | "fable-cowork" | "fable-skill-creator" => FableTaskShape::Feature,
        "fable-tdd" => {
            let re = Regex::new(r"\bbug\b|\bfix\b|broken|regression|fails?").unwrap();
            if re.is_match(text) {
                FableTaskShape::BugFix
            } else {
                FableTaskShape::Feature
            }
        }
        "fable-execute" => FableTaskShape::BoundedChange,
        _ => FableTaskShape::Unknown,
    }
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

    let mut scores: HashMap<String, f64> = HashMap::new();
    let mut reasons: HashMap<String, Vec<String>> = HashMap::new();

    for skill in &registry.skills {
        scores.insert(
            skill.id.clone(),
            if skill.id == "fable-execute" { 1.0 } else { 0.0 },
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

    let suppress_external_research = Regex::new(r"(?:external|web) research (?:is )?not needed|do not (?:use|do|perform) (?:external|web) research|no (?:external|web) research").unwrap().is_match(&text);
    let suppress_release = Regex::new(r"do not (?:ship|publish|release|tag)|don't (?:ship|publish|release|tag)|not ready to (?:ship|publish|release)|(?:ship|publish|release) (?:is )?out of scope").unwrap().is_match(&text);
    let suppress_security = Regex::new(r"no security (?:behavior|boundary|logic|change)s?|security (?:work|review) (?:is )?not (?:needed|required)|not (?:a )?security (?:change|task|review)").unwrap().is_match(&text);
    let suppress_tdd = Regex::new(r"no [^.]{0,40}behavior changes?|without (?:changing|a change to) behavior|not (?:a )?behavior change").unwrap().is_match(&text);
    let suppress_plan = Regex::new(r"do not plan|don't plan|no planning|planning (?:is )?out of scope|skip (?:the )?plan").unwrap().is_match(&text);
    let suppress_review = Regex::new(r"do not review|don't review|no (?:code )?review|review (?:is )?out of scope|skip (?:the )?review").unwrap().is_match(&text);
    let suppress_delegation = Regex::new(r"do not delegate|don't delegate|no delegation|without subagents?|single agent|single worker").unwrap().is_match(&text);

    if let Some(st) = state {
        if st.failure_streak >= RECOVERY_FAILURE_THRESHOLD {
            add_signal("fable-recover", 8.0, "project state records repeated failure");
        }
        if st.phase == FablePhase::Recovering {
            add_signal("fable-recover", 6.0, "project state is already recovering");
        }
        if st.phase == FablePhase::Verifying {
            add_signal("fable-verify", 3.0, "project state is already verifying");
        }
        if let Some(ref current) = st.current_skill {
            if current != "get-fable" {
                add_signal(current, 2.0, &format!("project state is already active in {}", current));
            }
        }
    }

    if Regex::new(r"failed twice|fails twice|same (?:test|command|fix|failure)|retry(?:ing|ied)?|still fail|keeps? failing|doesn['’]?t work|didn['’]?t work|stale|cache|wrong branch|wrong build|no effect").unwrap().is_match(&text) {
        add_signal("fable-recover", 9.0, "task describes repeated or stale failure");
    }

    if !suppress_security && Regex::new(r"\bsecurity\b|\bvulnerab(?:ility|ilities)\b|threat model|\bauthentication\b|\bauthorization\b|\boauth\b|\bsecrets?\b|untrusted input|\binjection\b|\bxss\b|\bcsrf\b|\bssrf\b").unwrap().is_match(&text) {
        add_signal("fable-security", 9.0, "task crosses an explicit security or trust boundary");
    }

    if Regex::new(r"(?i)\bredteam\b|\bpentest\b|penetration test|offensive security|security audit|attack graph|idor probe|vulnerability discovery").unwrap().is_match(&text) {
        add_signal("fable-redteam", 10.0, "task asks for offensive security testing, penetration testing, or red teaming");
    }

    if !suppress_release && Regex::new(r"\brelease\b|\bpublish\b|\bship\b|\btag\b|ready (?:to|for) (?:merge|release|publish)|merge (?:this|now|the pr)|open (?:a )?pr|create (?:a )?pull request|ready for pr|pull request readiness").unwrap().is_match(&text) {
        add_signal("fable-release", 8.0, "task asks for delivery or release readiness");
    }

    if Regex::new(r"\bhandoff\b|continue later|next session|resume later|context transfer|pass this to another agent").unwrap().is_match(&text) {
        add_signal("fable-handoff", 12.0, "task asks for durable continuation state");
    }

    if Regex::new(r"\beval\b|\bevaluate\b|\bbenchmark\b|holdout|self[- ]improv|prompt quality|skill quality|agent control|regression suite for (?:prompt|skill|agent)").unwrap().is_match(&text) {
        add_signal("fable-eval", 8.0, "task evaluates or changes agent-control behavior");
    }

    if Regex::new(r"(?i)\bconvo[- ]learn\b|extract learnings?|synthesize learnings?|what did we learn|playbook generation|session learnings?|analyze (?:this )?conversation|learning synthesis|\bfable-learning\b|\bfable-convo-learn\b|session realities|compound solution|extract (?:decisions|lessons|patterns|surprises)").unwrap().is_match(&text) {
        add_signal("fable-learning", 12.0, "task extracts or synthesizes durable learnings from session or conversation");
    }

    if !suppress_review && Regex::new(r"code review|review (?:the |this )?(?:diff|branch|commit|pr)|standards review|spec review|review changed files|independently critique|critique (?:the )?changed files").unwrap().is_match(&text) {
        add_signal("fable-review", 8.0, "task requests an independent code or diff review");
    }

    if Regex::new(r"\bverify\b|\bvalidate\b|\bprove\b|ready to ship|is this correct|acceptance check|regression check|completion evidence").unwrap().is_match(&text) {
        add_signal("fable-verify", 7.0, "task explicitly asks for behavior verification");
    }

    if !suppress_external_research && Regex::new(r"official (?:api )?docs|primary source|current api|current version|current official behavior[^.]{0,80}(?:external )?api|official behavior[^.]{0,80}api|latest (?:official )?(?:api )?(?:docs|documentation|release|version|behavior)|external documentation|release notes|web research").unwrap().is_match(&text) {
        add_signal("fable-research", 8.0, "task depends on current external facts");
    }

    if Regex::new(r"\binspect\b|\bexplore\b|\btrace\b|find where|understand the repo|understand (?:why|how)[^.]{0,100}repository|current repository (?:behavior|behaves)|unknown|without knowing|not knowing|repository behavior|execution path").unwrap().is_match(&text) {
        let discovery_weight = if Regex::new(r"inspect (?:this |the |a )?(?:local )?repository|trace[^.]{0,80}repository|execution path|understand (?:why|how)[^.]{0,100}repository").unwrap().is_match(&text) { 10.0 } else { 6.0 };
        add_signal("fable-discover", discovery_weight, "task depends on repository discovery or execution-path evidence");
    }

    if !suppress_delegation && Regex::new(r"\bdelegate\b|\bsubagents?\b|parallel agents|parallel workers|multi[- ]agent|independent tasks|independent work items|disjoint ownership|proceed in parallel|split across agents").unwrap().is_match(&text) {
        add_signal("fable-delegate", 8.0, "task explicitly requests bounded parallel work");
    }

    if !suppress_plan && Regex::new(r"\bplan\b|\bdesign\b|\barchitecture\b|\bmigration\b|\brefactor\b|multi[- ]file|end to end|modular|restructure|redesign").unwrap().is_match(&text) {
        add_signal("fable-plan", 6.0, "task has broad design or decomposition scope");
    }

    if Regex::new(r"\bchart\b|\bgraph\b|\bplot\b|\bdataviz\b|\bvisualization\b|\bdashboard\b|\bmetric tile\b|\bkpi row\b|\bheatmap\b").unwrap().is_match(&text) {
        add_signal("fable-dataviz", 10.0, "task creates or modifies data visualizations");
    }

    if Regex::new(r"\bartifact\b|\bdiagram\b|\bmermaid\b|\barchitecture diagram\b|\binteractive component\b").unwrap().is_match(&text) {
        add_signal("fable-artifact", 12.0, "task designs artifacts or architecture diagrams");
    }

    if Regex::new(r"\bsimplify\b|\bclean up\b|\bdead code\b|\bdeduplicate\b|\baltitude\b").unwrap().is_match(&text) {
        add_signal("fable-simplify", 10.0, "task requests code simplification and altitude cleanup");
    }

    if Regex::new(r"(?i)\b(?:microservices?|distributed architecture|decoupled (?:services|domains)|tech stack matrix|architecture enforcement|evaluate architecture|scaffold microservices|grpc east[- ]west)\b").unwrap().is_match(&text) {
        add_signal("fable-architecture", 13.0, "task requests architecture evaluation or microservices enforcement");
    }

    if !suppress_tdd && Regex::new(r"\btdd\b|test[- ]first|red[- ]green|regression test|failing test[^.]{0,100}(?:before|first)|\bregressed\b|\bbug fix\b|fix the bug|\bfix\b[^.]{0,80}\b(?:error|exception|regression)\b|behavior change|add a feature|implement a feature").unwrap().is_match(&text) {
        add_signal("fable-tdd", 10.0, "task describes a testable behavior change");
    }

    if Regex::new(r"\bimplement\b|\bfix\b|\badd\b|\bupdate\b|\bchange\b|\bbuild\b|\bremove\b|\brename\b").unwrap().is_match(&text) {
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
    let default_reason = vec!["bounded execution is the default when no stronger routing signal is present".to_string()];
    let selected_reasons = reasons.get(&selected_skill).filter(|r| !r.is_empty()).unwrap_or(&default_reason).clone();

    // Parallel candidates
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
        task_shape: task_shape_for(&selected_skill, &text),
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
