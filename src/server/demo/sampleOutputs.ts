import { SolutionOption, ScheduleAction } from '../../types.js';

export const SAMPLE_BREAKDOWNS: Record<string, any> = {
  default: {
    domain: "Financial Technology / Scalable Payments",
    coreProblem: "High latency and frequent database contention during peak transaction hours, leading to user checkout timeouts and abandoned carts.",
    stakeholders: ["Engineering Team", "Product Managers", "CISO Security Team", "End Customers"],
    constraints: ["Must handle 10,000 requests/sec", "99.99% availability required", "Compliance with PCI-DSS", "No increase in database licensing fees"],
    keyRequirements: [
      "Sub-100ms API response time",
      "Transactional consistency (ACID) for ledger updates",
      "Scalable queuing for message peaks",
      "Comprehensive audit trail for operations"
    ]
  }
};

export function getSampleOptions(proposalId: string): SolutionOption[] {
  return [
    {
      id: 'opt_serverless_event_driven',
      proposalId,
      title: 'Option A: Serverless Event-Driven Microservices Architecture',
      summary: 'Leverages Google Cloud Run, Cloud Pub/Sub, and Firestore to decouple transactional ingestion from downstream ledger updates, ensuring seamless horizontal scaling during high peak traffic.',
      architecture: 'Client Requests -> Cloud Load Balancer -> Cloud Run (Ingress) -> Cloud Pub/Sub Queue -> Cloud Run (Ledger Processor) -> Firestore (NoSQL, transactional writes) + Cloud SQL Read Replica.',
      pros: [
        'Zero-maintenance scalability; scales down to zero when idle.',
        'Extremely cost-efficient for variable workloads.',
        'High fault-tolerance with pub/sub microservice decoupling.'
      ],
      cons: [
        'Potential for cold starts affecting critical API endpoints (though mitigated by minimum instances).',
        'Complex transaction-across-services pattern required (Saga Pattern).'
      ],
      complexity: 'MEDIUM',
      techStack: ['TypeScript', 'Node.js', 'Google Cloud Run', 'Cloud Pub/Sub', 'Firestore', 'Terraform']
    },
    {
      id: 'opt_distributed_cache_aside',
      proposalId,
      title: 'Option B: Distributed Cache-Aside Kubernetes Cluster',
      summary: 'Maintains an active-active deployment in Google Kubernetes Engine (GKE) using Redis Enterprise as an ultra-fast in-memory cache layer to intercept 95% of database read operations.',
      architecture: 'Client Requests -> GKE Ingress Gateway -> GKE Pods (Go microservices) -> Redis Cluster (Cache layer) -> PostgreSQL (Transactional primary database with master-replica setup).',
      pros: [
        'Sub-10ms response times for cached operations.',
        'Highly predictable performance under sustained heavy load.',
        'Complete control over network security rules and routing.'
      ],
      cons: [
        'High baseline infrastructure costs (non-zero minimum pod configuration).',
        'Cache invalidation complexity and race condition risks.'
      ],
      complexity: 'HIGH',
      techStack: ['Go', 'GKE', 'Kubernetes', 'Redis Enterprise', 'PostgreSQL', 'Helm']
    },
    {
      id: 'opt_hybrid_monolith_optimized',
      proposalId,
      title: 'Option C: Optimized Modern Monolith with Connection Pooling',
      summary: 'An elegant, simplified deployment using a Dockerized Node.js app on a high-CPU Compute Engine instance, utilizing pgBouncer connection pooling and optimized database indexing.',
      architecture: 'Client Requests -> Nginx Reverse Proxy -> Node.js VM -> pgBouncer -> PostgreSQL (Single high-spec instance).',
      pros: [
        'Extremely simple developer workflow; no distributed microservices overhead.',
        'Fastest deployment timeline (1-2 days).',
        'No distributed tracing or serialization lag.'
      ],
      cons: [
        'Single point of failure on the VM instance.',
        'Vertical scalability limits; cannot scale infinitely during global traffic spike.'
      ],
      complexity: 'LOW',
      techStack: ['Node.js', 'Express', 'pgBouncer', 'PostgreSQL', 'Compute Engine', 'Docker']
    }
  ];
}

export const SAMPLE_DOCUMENTS: Record<string, string> = {
  opt_serverless_event_driven: `
# ARIA Generated Architectural Shortlist - Serverless Event-Driven Architecture

## 1. Executive Summary
This proposal describes a cloud-native, event-driven solution to solve transaction ingestion latency and database contention. By using Google Cloud Run paired with Cloud Pub/Sub, the system achieves maximum elasticity, decoupling raw payments from ledger writes.

## 2. Solution Architecture Details
Clients hit a global Load Balancer which routes requests to a lightweight Cloud Run API. This service validates the request format and immediately publishes a "transaction_initiated" event to Cloud Pub/Sub, returning an HTTP 202 Accepted. A secondary subscriber service pulls events, processes payments, and performs transactional ACID writes inside Google Firestore.

### Network Diagram Topology
\`\`\`
[Clients] -> [Cloud Load Balancer] -> [Cloud Run Ingress] 
                                            |
                                            v
                                    [Cloud Pub/Sub]
                                            |
                                            v
                                 [Cloud Run Ledger Worker] -> [Firestore DB]
\`\`\`

## 3. Governance and Security Controls
- **Identity & Access Management:** Google Cloud IAM Service Accounts with Least Privilege.
- **Data Protection:** Encryption at rest using Customer-Managed Encryption Keys (CMEK) and in transit via TLS 1.3.
- **Robust Guardrails:** SQL and prompt injection filters on the Ingress boundary.
- **Audit Logging:** Every state transition is written to Cloud Logging (immutable format).

## 4. Implementation Timeline & Next Steps
1. Week 1: Establish GCP project architecture and Terraform definitions.
2. Week 2: Write Ingress API, pub/sub schemas, and configure local emulator tests.
3. Week 3: Deploy to staging, execute load tests mimicking 10k requests/sec.
4. Week 4: Perform security audit, set up Cloud Monitoring, and complete production deployment.
`,
  opt_distributed_cache_aside: `
# ARIA Generated Architectural Shortlist - Distributed Cache-Aside Kubernetes

## 1. Executive Summary
This proposal addresses performance bottlenecks by placing a distributed Redis cache in front of a PostgreSQL database, managed in GKE. It is ideal for read-heavy transactional pipelines where extreme performance consistency is needed.

## 2. Solution Architecture Details
Requests are processed by Go microservices running inside a highly available Google Kubernetes Engine (GKE) cluster. Before querying the relational database, services query a Redis cluster. Read misses are populated back into Redis with a 5-minute Time-To-Live (TTL).

### Topology
\`\`\`
[Clients] -> [GKE Ingress] -> [GKE Microservices]
                                   |         |
                                   v (Check) v (Miss)
                             [Redis Cache]  [PostgreSQL Primary]
\`\`\`

## 3. Governance and Security Controls
- **Network Isolation:** Private Kubernetes Cluster with VPC Service Controls.
- **Credentials:** HashiCorp Vault integration with GKE Workload Identity.
- **Audit Log:** Custom pgAudit logging enabled on PostgreSQL to track modifications.

## 4. Implementation Timeline
- Week 1-2: Setup GKE Autopilot, Redis Enterprise VPC, and Postgres databases.
- Week 3: Implement cache invalidation patterns in Go microservices.
- Week 4: Stress testing and continuous security scanning of Docker containers.
`,
  opt_hybrid_monolith_optimized: `
# ARIA Generated Architectural Shortlist - Optimized Modern Monolith

## 1. Executive Summary
A high-performance monolithic application hosted on a Compute Engine instance utilizing pgBouncer connection pooling. It is optimized for teams prioritizing quick developer cycles and low operational complexity.

## 2. Solution Architecture Details
An Express application bundled into a single Docker container, running behind Nginx. It connects to PostgreSQL via pgBouncer to handle large pools of transient client connections without leaking database resources.

### Topology
\`\`\`
[Clients] -> [Nginx] -> [Node.js VM] -> [pgBouncer] -> [PostgreSQL]
\`\`\`

## 3. Governance and Security Controls
- **Host Security:** OSLogin enabled with automatic security patches on VM.
- **DB Security:** pgBouncer SSL connection requirement, restricting external DB access.

## 4. Implementation Timeline
- Week 1: Develop and optimize Postgres indexes, deploy Docker to staging VM.
- Week 2: Load testing, logging configuration, production DNS rollover.
`
};

export const SAMPLE_REVIEWS: Record<string, any> = {
  opt_serverless_event_driven: {
    score: 89,
    feedback: "High structural alignment. Security controls are well specified. Excellent separation of ingestion and execution concerns. Saga pattern complexity should be clearly documented for engineers.",
    strengths: ["Highly elastic topology", "Clear CMEK and IAM setup", "Confluence-friendly formatting"],
    improvements: ["Provide visual sequence diagram representing Saga orchestration.", "Elaborate on dead-letter queue (DLQ) configuration for payment retries."]
  },
  opt_distributed_cache_aside: {
    score: 91,
    feedback: "Highly robust for enterprise read-peaks. Redis and pgAudit policies are solid. Cache invalidation policies should be detailed to prevent stale billing displays.",
    strengths: ["Excellent network security constraints", "Predictable latencies", "Workload Identity use"],
    improvements: ["Detailed Redis cluster eviction policies under memory pressure."]
  },
  opt_hybrid_monolith_optimized: {
    score: 82, // Starts below 85 to demonstrate the revision loop if needed!
    feedback: "Simple and robust, but lacks details on backup strategies and high availability setup. Under high peaks, single-node setup represents a critical business risk.",
    strengths: ["Fast implementation time", "Reduced network hop latency"],
    improvements: ["Add secondary database replica architecture.", "Include automated hourly DB snapshot procedures."]
  }
};

export const SAMPLE_GOVERNANCE: Record<string, any> = {
  opt_serverless_event_driven: {
    status: "PASS",
    risks: [],
    checklist: [
      { rule: "Encryption-at-Rest using KMS", status: "COMPLIANT" },
      { rule: "IAM Principle of Least Privilege", status: "COMPLIANT" },
      { rule: "SQL/Prompt Injection Guards", status: "COMPLIANT" },
      { rule: "Audit Logs Immutable Stream", status: "COMPLIANT" }
    ]
  },
  opt_distributed_cache_aside: {
    status: "PASS",
    risks: [],
    checklist: [
      { rule: "VPC Service Controls Setup", status: "COMPLIANT" },
      { rule: "Vault Secrets Masking", status: "COMPLIANT" },
      { rule: "pgAudit Logging Policy", status: "COMPLIANT" }
    ]
  },
  opt_hybrid_monolith_optimized: {
    status: "FAIL", // Starts as FAIL to show revision loop!
    risks: [
      { severity: "HIGH", description: "Single point of failure on monolithic Compute Engine instance. No failover capability." },
      { severity: "MEDIUM", description: "Lack of backup and snapshot recovery policy inside document." }
    ],
    checklist: [
      { rule: "High Availability Redundancy", status: "NON_COMPLIANT" },
      { rule: "Automated Backup Policy", status: "NON_COMPLIANT" },
      { rule: "Least Privilege DB Access", status: "COMPLIANT" }
    ]
  }
};

export const REVISED_MONOLITH_DOCUMENT = `
# ARIA Generated Architectural Shortlist - Optimized Modern Monolith (REVISED)

## 1. Executive Summary
A high-performance monolithic application hosted on Google Compute Engine, now updated with robust High Availability (HA) secondary failover and automated backup policy to satisfy strict security requirements.

## 2. Solution Architecture & High Availability Setup
An Express application bundled into Docker, running behind a Cloud Load Balancer with active-passive Compute Engine VM instances. The primary VM replicates its state, and pgBouncer handles transactions smoothly.

### Updated Topology
\`\`\`
[Clients] -> [Cloud Load Balancer] -> [Primary VM (Active)]
                                             |  (Heartbeat/Failover)
                                             v
                                     [Replica VM (Passive)]
                                             |
                                             v
                                   [pgBouncer Connection Pool]
                                             |
                                             v
                                 [Highly Available PostgreSQL]
                                 (Primary + Read Replica)
\`\`\`

## 3. Governance, High Availability and Security Controls
- **Host Security:** OSLogin enabled with automatic security patches on VM.
- **Failover & Replication:** Database runs in a Multi-Zone Cloud SQL setup with automated failover and synchronous replication.
- **Automated Backup Policy:** Daily automated snapshots retained for 30 days, replicated across multiple regions for disaster recovery.
- **DB Security:** pgBouncer SSL connection requirement, restricting external DB access.

## 4. Implementation Timeline
- Week 1: Develop and optimize Postgres indexes, deploy Multi-Zone HA database.
- Week 2: Load testing, VM heartbeat configuration, backup recovery dry-run, DNS rollover.
`;

export const REVISED_MONOLITH_REVIEW = {
  score: 87, // Now passes (>= 85)
  feedback: "Significant improvement in governance compliance. Monolith now includes detailed Multi-Zone replication and pgBouncer configurations. Backup policy meets organizational disaster recovery metrics.",
  strengths: ["Added database Multi-Zone HA and pgBouncer setup", "Defined clear snapshot retention policy"],
  improvements: ["Monitor pgBouncer connection queues to ensure correct configuration tuning."]
};

export const REVISED_MONOLITH_GOVERNANCE = {
  status: "PASS",
  risks: [],
  checklist: [
    { rule: "High Availability Redundancy", status: "COMPLIANT" },
    { rule: "Automated Backup Policy", status: "COMPLIANT" },
    { rule: "Least Privilege DB Access", status: "COMPLIANT" }
  ]
};

export function getSampleSchedule(proposalId: string, optionId: string): ScheduleAction[] {
  return [
    {
      id: 'act_1',
      proposalId,
      title: 'Setup Cloud Infrastructure Project Structure',
      description: 'Initialize terraform workspace, configure central VCS triggers, and deploy cloud resource billing rules.',
      assignee: 'Lead Devops Engineer',
      timeline: 'Days 1-3',
      priority: 'HIGH'
    },
    {
      id: 'act_2',
      proposalId,
      title: 'Define IAM Roles and Permissions Policy',
      description: 'Implement the principle of least privilege. Create specific service accounts for ingress and background storage nodes.',
      assignee: 'Cloud Security Architect',
      timeline: 'Days 4-5',
      priority: 'HIGH'
    },
    {
      id: 'act_3',
      proposalId,
      title: 'Configure Ingress Routing and Security Guardrails',
      description: 'Implement Cloud Armor rules, web application firewall (WAF) policies, and configure rate limit constraints.',
      assignee: 'Network Specialist',
      timeline: 'Days 6-8',
      priority: 'MEDIUM'
    },
    {
      id: 'act_4',
      proposalId,
      title: 'Build Proof-of-Concept Solution Codebase',
      description: 'Develop prototype endpoints, wire up databases, and execute stress-testing profiles under simulated heavy load.',
      assignee: 'Principal Software Engineer',
      timeline: 'Days 9-14',
      priority: 'HIGH'
    }
  ];
}
