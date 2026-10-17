# SP28 OmniThink Tech Pack Engine
## System Architecture Document (SAD / HLD)
**Document Version:** 2.4.0  
**Target Architecture:** Self-Hosted Air-Gapped Microservices & Agentic DAG  
**Classification:** Enterprise System Design  

---

### 1. Architectural Principles

1. **Deterministic-First Principle:** If pattern geometry, layer naming, or XMP metadata exists in authoring CAD, parse it deterministically in <5ms using mathematical kernels (0 tokens, 100% precision). Only invoke multimodal vision models for untagged legacy flats.
2. **Strict Air-Gapped Containment:** Zero network egress to public AI SaaS endpoints. All perception, reasoning, and vector indexing runs within the enterprise private cloud VPC on dedicated NVIDIA GPUs.
3. **Decoupled Event-Driven Sourcing:** Master Style ingestion, Development Object fan-out, and FlexPLM payload dispatch communicate asynchronously over an AMQP message broker (RabbitMQ) with at-least-once delivery guarantees.

---

### 2. C4 Model - Level 1: System Context Diagram

```
+----------------------------------------------------------------------------------------------------+
|                                    C4 LEVEL 1: SYSTEM CONTEXT                                      |
+----------------------------------------------------------------------------------------------------+

   [Technical Designers]             [Materials Developers]             [Costing Engineers]
            |                                  |                                  |
            +----------------------------------+----------------------------------+
                                               |
                                               v
                          +------------------------------------------+
                          |   OMNITHINK TECH PACK ENGINE PLATFORM    |
                          | (Self-Hosted Private VPC Environment)    |
                          +------------------------------------------+
                               /              |             \
                              /               |              \
                             v                v               v
               +--------------------+  +--------------+  +--------------------+
               |   PDAM Repository  |  | PTC FlexPLM  |  | Keystone Product   |
               | (Technical Sketches|  | (Enterprise  |  | Master Catalog     |
               |   & Vector CAD)    |  |  PLM System) |  | (GLP Taxonomy)     |
               +--------------------+  +--------------+  +--------------------+
```

---

### 3. C4 Model - Level 2: Container Architecture (Air-Gapped Stack)

```
+----------------------------------------------------------------------------------------------------+
|                                C4 LEVEL 2: CONTAINER ARCHITECTURE                                 |
+----------------------------------------------------------------------------------------------------+

   +-----------------------------------------------------------------------------------------------+
   | ENTERPRISE PRIVATE VPC / AIR-GAPPED KUBERNETES CLUSTER                                        |
   |                                                                                               |
   |   [ Web Client UI (React 19 / TypeScript / Vite / Tailwind) ]                                 |
   |                               |                                                               |
   |                               v (HTTPS / REST / WebSocket)                                    |
   |   [ OmniThink API Gateway & Orchestrator (FastAPI / LangGraph) ]                              |
   |                               |                                                               |
   |        +----------------------+----------------------+-------------------------+              |
   |        |                      |                      |                         |              |
   |        v                      v                      v                         v              |
   |  [Native CAD DOM]    [RabbitMQ Broker]       [Qdrant Vector DB]       [PostgreSQL DB]         |
   |  (Rust / WASM)       (DO Fan-Out Queues)     (Historical BOM Memory)  (PLM Cache & Audit)     |
   |        |                      |                      |                         |              |
   |        +----------------------+----------------------+-------------------------+              |
   |                               |                                                               |
   |                               v (Internal Local IPC)                                          |
   |   +---------------------------------------------------------------------------------------+   |
   |   | LOCAL GPU INFERENCE PODS (vLLM Engine with Tensor Parallelism)                        |   |
   |   |                                                                                       |   |
   |   |   [ DeepSeek-R1-Distill-32B ]         [ Qwen2.5-VL-7B-Instruct ]                      |   |
   |   |   (Reasoning, Costing & SAM)          (Multimodal Vision Fallback)                    |   |
   |   +---------------------------------------------------------------------------------------+   |
   |                               |                                                               |
   |                               v (Private Mutual TLS)                                          |
   |   [ MinIO S3 Object Store ] -----> Stores raw .pdf sketches, SVG vector assets, and BOM JSON  |
   +-----------------------------------------------------------------------------------------------+
                                   |
                                   v (Enterprise Firewalled REST)
   +-----------------------------------------------------------------------------------------------+
   | PTC FLEXPLM WINDCHILL SERVER (On-Premise / Enterprise Core Network)                            |
   |   Endpoints: POST /Windchill/ptc/CreateBOMHeader  |  POST /Windchill/ptc/CreateBOMRows        |
   +-----------------------------------------------------------------------------------------------+
```

---

### 4. C4 Model - Level 3: Multi-Agent Processing Pipeline & State Graph

```
+----------------------------------------------------------------------------------------------------+
|                            C4 LEVEL 3: MULTI-AGENT STATE GRAPH (DAG)                               |
+----------------------------------------------------------------------------------------------------+

               [ Incoming MSTS PDF File ]
                           |
                           v
              +---------------------------+
              |     Supervisor Agent      | <----+ (Consensus Gating & State Loop)
              +---------------------------+      |
                           |                     |
            +--------------+--------------+      |
            |                             |      |
            v                             v      |
   +------------------+         +--------------------+
   | Ingestion Agent  |         |   Geometry Agent   |
   | (Native XMP DOM) |         | (Bezier Perimeters)|
   +------------------+         +--------------------+
            |                             |      |
            +--------------+--------------+      |
                           |                     |
                           v                     |
              +---------------------------+      |
              | Material Resolution Agent | -----+
              | (DO Fan-Out: DO-001..003) |
              +---------------------------+
                           |
            +--------------+--------------+
            |                             |
            v                             v
   +------------------+         +--------------------+
   | Compliance Agent |         |   Costing Agent    |
   | (FlexPLM & RSL)  |         | (Nesting & SAM min)|
   +------------------+         +--------------------+
            |                             |
            +--------------+--------------+
                           |
                           v
              +---------------------------+
              | Continuous Learning Agent |
              | (Qdrant Historical RAG)   |
              +---------------------------+
                           |
                           v
              [ FlexPLM Ready Payload ]
```

---

### 5. Detailed End-to-End Sequence Diagram

```
+----------------------------------------------------------------------------------------------------+
|                                 END-TO-END EXECUTION SEQUENCE DIAGRAM                              |
+----------------------------------------------------------------------------------------------------+

 Designer / PDAM         OmniThink Engine        Native CAD Parser        vLLM / Reasoning      PTC FlexPLM
       |                        |                        |                       |                   |
       |--- 1. Upload MSTS --->|                        |                       |                   |
       |    Technical Sketch    |--- 2. Stream Buffer -->|                       |                   |
       |                        |    (Raw PDF Bytes)     |                       |                   |
       |                        |                        |-- 3. Scan XMP Marker -|                   |
       |                        |                        |   Extract msts:plugin |                   |
       |                        |<-- 4. Validated Parts -|                       |                   |
       |                        |    (Upper, Pocket...)  |                       |                   |
       |                        |                                                |                   |
       |                        |--- 5. Resolve DO Fan-Out (DO-001, 002, 003) ->|                   |
       |                        |    Execute SAM Costing & Marker Nesting        |                   |
       |                        |<-- 6. Emitted BOM rows & Yield Efficiency ----|                   |
       |                        |                                                                    |
       |                        |--- 7. Dispatch CreateDevelopmentBOM Payload --------------------->|
       |                        |                                                                    |
       |<-- 8. BOM Created -----|<-- 9. HTTP 201 Created (BOM Record Key: BOM-98214) ---------------|
       |    In FlexPLM (<5s)    |
```

---

### 6. Network Security & Air-Gapped Safeguards

1. **Zero Outbound Internet Rule:** All container egress ports (`80/443`) are strictly blocked at the Kubernetes NetworkPolicy layer.
2. **Mutual TLS (mTLS):** All inter-service gRPC and HTTP communication utilizes Istio service mesh with ephemeral SPIFFE/SPIRE certificates.
3. **Data Loss Prevention (DLP):** Raw Illustrator files remain encrypted at rest in MinIO using customer-managed AES-256 keys.
