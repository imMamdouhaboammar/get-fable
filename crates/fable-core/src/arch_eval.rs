use regex::{Regex, RegexSet};
use serde::{Deserialize, Serialize};
use std::sync::LazyLock;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum TechStackCategory {
    A,
    B,
    C,
    D,
    E,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TechStackAssignment {
    pub category: TechStackCategory,
    pub language: String,
    pub framework: String,
    pub framework_options: Vec<String>,
    pub runtime: String,
    pub competency: String,
    pub role: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ArchitectureVectorScores {
    pub scale_and_load: f64,
    pub domain_decoupling: f64,
    pub resource_intensity: f64,
    pub composite_score: f64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DecomposedService {
    pub name: String,
    pub domain: String,
    pub scenario: u8,
    pub stack: TechStackAssignment,
    pub description: String,
    pub port: u16,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub grpc_port: Option<u16>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NorthSouthContract {
    pub protocol: String,
    pub schema_standard: String,
    pub tls_version: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EastWestContract {
    pub protocol: String,
    pub transport: String,
    pub prohibit_http_json: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MicroserviceCommunicationContract {
    pub north_south: NorthSouthContract,
    pub east_west: EastWestContract,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ArchitectureEvaluationResult {
    pub verdict: String,
    pub allow_monolith: bool,
    pub vectors: ArchitectureVectorScores,
    pub reasons: Vec<String>,
    pub services: Vec<DecomposedService>,
    pub communication: MicroserviceCommunicationContract,
    pub manifest_toon: String,
}

static SCALE_LOAD_REGEXES: LazyLock<Vec<Regex>> = LazyLock::new(|| {
    vec![
        Regex::new(r"(?i)\b(\d{4,}|\d+k|\d+m)\s*(?:persistent\s+)?(?:concurrent|rps|req/s|tps|users|connections|events/s|websockets?)\b").unwrap(),
        Regex::new(r"(?i)\b(?:hundreds of thousands|tens of thousands|millions)\s+of\s+(?:persistent\s+)?(?:connections|websockets?|users|events|messages)\b").unwrap(),
        Regex::new(r"(?i)\b(?:high|extreme|massive|strict)\s+(?:concurrency|throughput|load|scale)\b").unwrap(),
        Regex::new(r"(?i)\bmillions of (?:messages|requests|events|records|packets)\b").unwrap(),
        Regex::new(r"(?i)\bpersistent\s+(?:web\s*sockets?|connections)\b").unwrap(),
        Regex::new(r"(?i)\b(?:low latency|sub[- ](?:10|20|50)ms|p99|sla)\b").unwrap(),
        Regex::new(r"(?i)\bhorizontal(?:ly)?\s+scal(?:e|ing|able)\b").unwrap(),
        Regex::new(r"(?i)\bdistributed\s+(?:traffic|load|routing)\b").unwrap(),
        Regex::new(r"(?i)\bstateless\s+(?:message|event|request)\s+routing\b").unwrap(),
    ]
});

static KILO_CONCURRENCY_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\b(\d+)\s*(?:k|kilo)\s*(?:persistent\s+)?(?:web\s*sockets?|concurrent|users|rps|connections|clients)\b").unwrap()
});

static RAW_CONCURRENCY_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\b(\d{4,})\s*(?:persistent\s+)?(?:web\s*sockets?|concurrent|users|rps|connections|clients)\b").unwrap()
});

static ULTRA_CONCURRENCY_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\bhundreds of thousands of (?:persistent\s+)?(?:web\s*sockets?|connections|users)").unwrap()
});

static DOMAIN_SET: LazyLock<RegexSet> = LazyLock::new(|| {
    RegexSet::new([
        r"(?i)\b(?:auth|identity|oauth|sso|credentials|rbac|abac|jwt|session)\b",
        r"(?i)\b(?:payment|billing|stripe|invoice|subscription|checkout|transaction)\b",
        r"(?i)\b(?:api gateway|gateway|reverse proxy|ingress|bff|orchestration)\b",
        r"(?i)\b(?:transcod(?:e|ing)|heavy math|cryptography|binary stream|encryption pipeline|signal processing)\b",
        r"(?i)\b(?:ai inference|llm routing|deep learning|predictive model|embeddings|neural network|rag pipeline)\b",
        r"(?i)\b(?:kafka|rabbitmq|message broker|event stream|pubsub|event bus)\b",
        r"(?i)\b(?:analytics|telemetry|metrics aggregation|data warehouse|olap)\b",
        r"(?i)\b(?:notification|webhook|email delivery|push notification|sms dispatch)\b",
        r"(?i)\b(?:websocket|web sockets?|real[- ]time|live view|liveview|presence|chat room|zero[- ]downtime|fault[- ]tolerant|actor model|beam|elixir|phoenix)\b",
        r"(?i)\b(?:crud|product catalog|user management|order management|inventory)\b",
    ])
    .expect("valid domain RegexSet")
});

const DOMAIN_META: &[(&str, &str)] = &[
    ("auth", "Identity & Authentication"),
    ("billing", "Payments & Billing"),
    ("gateway", "API Gateway & Ingress"),
    ("compute", "Computational Kernel"),
    ("ai", "AI & Inference Engine"),
    ("messaging", "Message Broker & Streaming"),
    ("analytics", "Analytics & Telemetry"),
    ("notifications", "Notifications & Webhooks"),
    ("realtime", "Real-Time Streaming & WebSockets"),
    ("crud", "Core Business Entity CRUD"),
];

static RESOURCE_SET: LazyLock<RegexSet> = LazyLock::new(|| {
    RegexSet::new([
        // 0: CPU bound
        r"(?i)\b(?:transcoding|video encoding|heavy math|cryptography|encryption|binary parsing|sub-millisecond|neural net|model inference|matrix multiplication|compression)\b",
        // 1: I/O bound
        r"(?i)\b(?:crud|api gateway|rest endpoint|database query|http handler|webhook|json api|user session|admin panel|file upload|websocket)\b",
    ])
    .expect("valid resource RegexSet")
});

static TECH_DOMAIN_SET: LazyLock<RegexSet> = LazyLock::new(|| {
    RegexSet::new([
        // 0: scenario 5 domain
        r"websocket|real[- ]time|chat|presence|liveview|elixir|phoenix|fault[- ]tolerant|zero[- ]downtime",
        // 1: scenario 5 context
        r"(?i)websocket|web sockets?|real[- ]time (?:messaging|orchestration|pipeline)|hundreds of thousands of (?:persistent )?(?:connections|websockets)|zero[- ]downtime(?: tolerance)?|presence channel",
        // 2: scenario 3 domain
        r"transcoding|video|crypto|math|binary|encryption|kernel|compression",
        // 3: scenario 3 context
        r"(?i)transcod(?:e|ing)|heavy math|cryptography|binary stream|encryption pipeline",
        // 4: scenario 4 domain
        r"ai|llm|ml|data-science|inference|embedding|predictive",
        // 5: scenario 4 context
        r"(?i)ai inference|llm routing|deep learning|predictive model",
        // 6: scenario 2 domain
        r"throughput|stateless|routing|cluster|network|broker|proxy|dispatch",
        // 7: scenario 2 context
        r"(?i)stateless message|internal cluster|routing millions|high throughput",
    ])
    .expect("valid tech domain RegexSet")
});

fn format_thousands(n: u64) -> String {
    let s = n.to_string();
    let mut out = String::new();
    let len = s.len();
    for (i, ch) in s.chars().enumerate() {
        if i > 0 && (len - i) % 3 == 0 {
            out.push(',');
        }
        out.push(ch);
    }
    out
}

pub fn tech_stack_for_category(cat: TechStackCategory, role: &str) -> TechStackAssignment {
    match cat {
        TechStackCategory::A => TechStackAssignment {
            category: TechStackCategory::A,
            language: "Go".to_string(),
            framework: "Fiber".to_string(),
            framework_options: vec![
                "Fiber".to_string(),
                "Gin".to_string(),
                "Go-Kit".to_string(),
            ],
            runtime: "Go 1.23+".to_string(),
            competency: "High-Concurrency APIs & Distributed Networking".to_string(),
            role: role.to_string(),
        },
        TechStackCategory::B => TechStackAssignment {
            category: TechStackCategory::B,
            language: "TypeScript".to_string(),
            framework: "NestJS".to_string(),
            framework_options: vec![
                "NestJS".to_string(),
                "Fastify".to_string(),
                "Elysia".to_string(),
            ],
            runtime: "Node.js 22+ / Bun".to_string(),
            competency: "I/O Intensive, Rapid API Gateway & Orchestration".to_string(),
            role: role.to_string(),
        },
        TechStackCategory::C => TechStackAssignment {
            category: TechStackCategory::C,
            language: "Rust".to_string(),
            framework: "Axum".to_string(),
            framework_options: vec!["Axum".to_string(), "Actix-web".to_string()],
            runtime: "Rust 1.80+ (native binary)".to_string(),
            competency:
                "High-Performance Computational Kernels, Media Processing, Systems Engineering"
                    .to_string(),
            role: role.to_string(),
        },
        TechStackCategory::D => TechStackAssignment {
            category: TechStackCategory::D,
            language: "Python".to_string(),
            framework: "FastAPI".to_string(),
            framework_options: vec![
                "FastAPI".to_string(),
                "PyTorch/TensorFlow integrations".to_string(),
            ],
            runtime: "Python 3.12+".to_string(),
            competency: "Artificial Intelligence, Data Engineering, & Machine Learning".to_string(),
            role: role.to_string(),
        },
        TechStackCategory::E => TechStackAssignment {
            category: TechStackCategory::E,
            language: "Elixir".to_string(),
            framework: "Phoenix".to_string(),
            framework_options: vec![
                "Phoenix".to_string(),
                "LiveView".to_string(),
                "Cowboy/Bandit".to_string(),
                "GenStage".to_string(),
            ],
            runtime: "Erlang/OTP 26+ / BEAM".to_string(),
            competency: "Ultra-High Concurrency, Fault-Tolerant Real-Time Systems & WebSockets"
                .to_string(),
            role: role.to_string(),
        },
    }
}

pub fn evaluate_scale_and_load(text: &str) -> (f64, Vec<String>) {
    let mut score: f64 = 0.0;
    let mut reasons = Vec::new();

    for re in SCALE_LOAD_REGEXES.iter() {
        if let Some(m) = re.find(text) {
            score += 2.5;
            reasons.push(format!("Detected scale/load indicator: \"{}\"", m.as_str()));
        }
    }

    if let Some(caps) = KILO_CONCURRENCY_RE.captures(text) {
        if let Ok(n) = caps[1].parse::<u64>() {
            let count = n * 1000;
            if count >= 5000 {
                score = score.max(8.5);
                reasons.push(format!(
                    "Explicit high concurrency target: {} concurrent units",
                    format_thousands(count)
                ));
            }
        }
    }

    if let Some(caps) = RAW_CONCURRENCY_RE.captures(text) {
        if let Ok(count) = caps[1].parse::<u64>() {
            if count >= 5000 {
                score = score.max(8.5);
                reasons.push(format!(
                    "Explicit high concurrency target: {} concurrent units",
                    format_thousands(count)
                ));
            }
        }
    }

    if ULTRA_CONCURRENCY_RE.is_match(text) {
        score = score.max(9.0);
        reasons.push(
            "Explicit ultra-high concurrency target: hundreds of thousands of persistent connections"
                .to_string(),
        );
    }

    let bounded = ((score.clamp(0.0, 10.0)) * 10.0).round() / 10.0;
    (bounded, reasons)
}

pub fn evaluate_domain_decoupling(text: &str) -> (f64, Vec<(String, String)>, Vec<String>) {
    let matches = DOMAIN_SET.matches(text);
    let mut identified = Vec::new();
    let mut reasons = Vec::new();

    for (idx, (id, name)) in DOMAIN_META.iter().enumerate() {
        if matches.matched(idx) {
            identified.push(((*id).to_string(), (*name).to_string()));
            reasons.push(format!("Identified operational domain boundary: {}", name));
        }
    }

    let score = match identified.len() {
        n if n >= 4 => 9.0,
        3 => 8.0,
        2 => 7.0,
        1 => 3.5,
        _ => 1.0,
    };

    (score, identified, reasons)
}

pub fn evaluate_resource_intensity(text: &str) -> (f64, bool, bool, Vec<String>) {
    let matches = RESOURCE_SET.matches(text);
    let is_cpu_bound = matches.matched(0);
    let is_io_bound = matches.matched(1);
    let mut reasons = Vec::new();

    let score = if is_cpu_bound && is_io_bound {
        reasons.push("Mixed workload detected: CPU-bound computation kernels co-existing with I/O-bound API/CRUD pipelines".to_string());
        8.5
    } else if is_cpu_bound {
        reasons.push("Predominantly CPU-bound computational workload".to_string());
        5.5
    } else if is_io_bound {
        reasons.push("Predominantly I/O-bound standard API workload".to_string());
        3.0
    } else {
        reasons.push("Uniform or standard resource workload".to_string());
        1.0
    };

    (score, is_cpu_bound, is_io_bound, reasons)
}

pub fn assign_tech_stack_for_domain(domain_id: &str, text_context: &str) -> (u8, TechStackAssignment) {
    let lower_domain = domain_id.to_lowercase();
    let lower_ctx = text_context.to_lowercase();
    let dom_matches = TECH_DOMAIN_SET.matches(&lower_domain);
    let ctx_matches = TECH_DOMAIN_SET.matches(&lower_ctx);

    if lower_domain == "realtime"
        || lower_domain == "websocket"
        || lower_domain == "presence"
        || dom_matches.matched(0)
        || ctx_matches.matched(1)
    {
        return (
            5,
            tech_stack_for_category(TechStackCategory::E, "realtime-systems-engineer"),
        );
    }

    if lower_domain == "compute" || dom_matches.matched(2) || ctx_matches.matched(3) {
        return (
            3,
            tech_stack_for_category(TechStackCategory::C, "systems-kernel-engineer"),
        );
    }

    if lower_domain == "ai" || dom_matches.matched(4) || ctx_matches.matched(5) {
        return (
            4,
            tech_stack_for_category(TechStackCategory::D, "ai-inference-engineer"),
        );
    }

    if lower_domain == "messaging"
        || lower_domain == "networking"
        || dom_matches.matched(6)
        || ctx_matches.matched(7)
    {
        return (
            2,
            tech_stack_for_category(TechStackCategory::A, "distributed-network-engineer"),
        );
    }

    let role = if lower_domain == "gateway" {
        "gateway-orchestrator"
    } else {
        "crud-engineer"
    };
    (1, tech_stack_for_category(TechStackCategory::B, role))
}

pub fn get_communication_contract(is_microservices: bool) -> MicroserviceCommunicationContract {
    MicroserviceCommunicationContract {
        north_south: NorthSouthContract {
            protocol: "REST HTTP/JSON".to_string(),
            schema_standard: "OpenAPI 3.1".to_string(),
            tls_version: "TLS 1.3".to_string(),
        },
        east_west: EastWestContract {
            protocol: "gRPC".to_string(),
            transport: "HTTP/2 + Protobuf".to_string(),
            prohibit_http_json: is_microservices,
        },
    }
}

pub fn format_architecture_manifest_toon(
    verdict: &str,
    vectors: &ArchitectureVectorScores,
    services: &[DecomposedService],
    communication: &MicroserviceCommunicationContract,
) -> String {
    let mut lines = vec![
        "architecture_manifest: {verdict, allow_monolith, scale_score, domain_score, resource_score, composite_score}".to_string(),
        format!(
            "  {}, {}, {}, {}, {}, {}",
            verdict,
            verdict == "monolith",
            vectors.scale_and_load,
            vectors.domain_decoupling,
            vectors.resource_intensity,
            vectors.composite_score
        ),
        String::new(),
        "communication_standards: {boundary, protocol, transport, http_json_prohibited}".to_string(),
        format!(
            "  North-South (Client -> Gateway), {}, TLS 1.3 (OpenAPI 3.1), false",
            communication.north_south.protocol
        ),
        format!(
            "  East-West (Service -> Service), {}, {}, {}",
            communication.east_west.protocol,
            communication.east_west.transport,
            communication.east_west.prohibit_http_json
        ),
        String::new(),
        format!(
            "services [{}]: {{name, domain, scenario, language, framework, runtime, role, port, grpc_port}}",
            services.len()
        ),
    ];

    for s in services {
        lines.push(format!(
            "  {}, {}, {}, {}, {}, {}, {}, {}, {}",
            s.name,
            s.domain,
            s.scenario,
            s.stack.language,
            s.stack.framework,
            s.stack.runtime,
            s.stack.role,
            s.port,
            s.grpc_port.unwrap_or(0)
        ));
    }

    lines.join("\n")
}

pub fn evaluate_architecture(spec: &str) -> Result<ArchitectureEvaluationResult, String> {
    let text = spec.trim();
    if text.is_empty() {
        return Err("Project specification text must not be empty".to_string());
    }

    let (scale_score, scale_reasons) = evaluate_scale_and_load(text);
    let (domain_score, identified_domains, domain_reasons) = evaluate_domain_decoupling(text);
    let (resource_score, is_cpu_bound, _is_io_bound, resource_reasons) =
        evaluate_resource_intensity(text);

    let composite_score =
        (((scale_score * 0.35) + (domain_score * 0.40) + (resource_score * 0.25)) * 10.0).round()
            / 10.0;

    let vectors = ArchitectureVectorScores {
        scale_and_load: scale_score,
        domain_decoupling: domain_score,
        resource_intensity: resource_score,
        composite_score,
    };

    let is_microservices =
        scale_score >= 7.0 || domain_score >= 7.0 || resource_score >= 7.0 || composite_score >= 6.0;

    let verdict = if is_microservices {
        "microservices".to_string()
    } else {
        "monolith".to_string()
    };
    let allow_monolith = !is_microservices;

    let mut all_reasons = Vec::new();
    if is_microservices {
        all_reasons.push(format!(
            "[ARCHITECTURE ENFORCEMENT] Microservices Architecture mandatory (scale={}, domains={}, resource={}, composite={}). Scaffold-building monolith is LOCKED OUT.",
            scale_score, domain_score, resource_score, composite_score
        ));
    } else {
        all_reasons.push(format!(
            "[ARCHITECTURE ENFORCEMENT] Specification scale and domains remain within monolithic boundaries (composite={}). Monolithic scaffolding allowed.",
            composite_score
        ));
    }
    all_reasons.extend(scale_reasons);
    all_reasons.extend(domain_reasons);
    all_reasons.extend(resource_reasons);

    let mut services = Vec::new();
    let mut base_http_port: u16 = 8080;
    let mut base_grpc_port: u16 = 50051;

    if is_microservices {
        let (gw_scenario, gw_stack) = assign_tech_stack_for_domain("gateway", "api gateway bff");
        services.push(DecomposedService {
            name: "api-gateway".to_string(),
            domain: "API Gateway & Ingress Orchestration".to_string(),
            scenario: gw_scenario,
            stack: gw_stack,
            description:
                "Public-facing REST API Gateway, routing, authentication translation, and rate limiting"
                    .to_string(),
            port: base_http_port,
            grpc_port: Some(base_grpc_port),
        });
        base_http_port += 1;
        base_grpc_port += 1;

        for (id, name) in &identified_domains {
            if id == "gateway" {
                continue;
            }
            let (scenario, stack) = assign_tech_stack_for_domain(id, text);
            services.push(DecomposedService {
                name: format!("{}-service", id),
                domain: name.clone(),
                scenario,
                stack,
                description: format!("Decoupled domain service for {}", name),
                port: base_http_port,
                grpc_port: Some(base_grpc_port),
            });
            base_http_port += 1;
            base_grpc_port += 1;
        }

        if services.len() < 3 {
            let extra_domain = if is_cpu_bound { "compute" } else { "crud" };
            let extra_name = if is_cpu_bound {
                "compute-kernel-service"
            } else {
                "business-core-service"
            };
            let (scenario, stack) = assign_tech_stack_for_domain(extra_domain, text);
            let desc = format!("Dedicated {} worker service", stack.competency);
            services.push(DecomposedService {
                name: extra_name.to_string(),
                domain: if is_cpu_bound {
                    "Computational Kernel".to_string()
                } else {
                    "Core Business Entities".to_string()
                },
                scenario,
                stack,
                description: desc,
                port: base_http_port,
                grpc_port: Some(base_grpc_port),
            });
        }
    } else {
        services.push(DecomposedService {
            name: "monolith-app".to_string(),
            domain: "Unified Monolithic Application".to_string(),
            scenario: 1,
            stack: tech_stack_for_category(TechStackCategory::B, "full-stack-engineer"),
            description: "Unified application process containing all routes and business logic"
                .to_string(),
            port: 3000,
            grpc_port: None,
        });
    }

    let communication = get_communication_contract(is_microservices);
    let manifest_toon =
        format_architecture_manifest_toon(&verdict, &vectors, &services, &communication);

    Ok(ArchitectureEvaluationResult {
        verdict,
        allow_monolith,
        vectors,
        reasons: all_reasons,
        services,
        communication,
        manifest_toon,
    })
}
