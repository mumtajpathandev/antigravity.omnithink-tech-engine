# SP28 OmniThink Tech Pack Engine
## Business Requirements Document (BRD)
**Document Version:** 2.4.0  
**Target Release:** SP28 GTM Evolution  
**Classification:** Enterprise Strategic Technical Blueprint  
**Sponsor:** Global Apparel Product Development & Sourcing Leadership  

---

### 1. Executive Summary

In current apparel product development cycles, technical designers and product developers manually transcribe sketches, bill-of-materials (BOM), material codes, and colorway placements from Adobe Illustrator and PDAM into PTC FlexPLM. This manual process takes **4 to 6 hours per style**, creates high operational friction, results in colorway drift across Development Objects, and causes costly sampling delays (12 to 18 days per proto cycle).

The **SP28 OmniThink Tech Pack Engine** transforms this workflow into an **automated, self-hosted, multi-agent AI pipeline**. By ingesting Master Style Technical Sketches (PDF/AI) with embedded vector metadata, OmniThink deterministically resolves Development Objects, parses pattern geometry, executes compliance checks, calculates cut marker yields, and generates FlexPLM-ready BOM payloads in **less than 5 seconds per style**.

```
+-----------------------------------------------------------------------------------+
|                           BUSINESS IMPACT & ROI SCORECARD                         |
+-----------------------------------------------------------------------------------+
| METRIC                       | HISTORICAL BASELINE (FA26) | SP28 OMNITHINK TARGET |
+------------------------------+----------------------------+-----------------------+
| BOM Creation Cycle Time      | 4.5 hours / style          | < 5 seconds / style   |
| Prototype Lead Time          | 16 business days           | 48 hours              |
| Colorway Fan-Out Consistency | 76% (Manual transcription) | 100% (Mathematical)   |
| Material Status Violations   | 14.2% proto re-work        | < 0.5% (Pre-gated)    |
| Annual Enterprise Savings    | $0 (Manual baseline)       | $1.84M USD / year     |
+-----------------------------------------------------------------------------------+
```

---

### 2. High-Level Business Workflow Diagram

```
+-------------------------------------------------------------------------------------------------------+
|                                    SP28 GTM EVOLUTION BUSINESS PIPELINE                               |
+-------------------------------------------------------------------------------------------------------+

   [Global Line Plan (GLP)]
             |
             v
   [Keystone Product Master] -----> Master Style Taxonomy (e.g. MASCL / ALIGN PANT)
             |
             v
   [PDAM Illustrator Authoring] --> Master Style Technical Sketch (.pdf)
                                         |
                                         | (In-Stream XMP + Vector CAD)
                                         v
                      +--------------------------------------+
                      |      OMNITHINK TECH PACK ENGINE      |
                      +--------------------------------------+
                                         |
     +-------------------+---------------+-------------------+--------------------+
     |                   |                                   |                    |
     v                   v                                   v                    v
[CAD DOM Parser]  [DO Fan-Out Engine]               [RSL & PLM Audit]    [Marker Nesting & SAM]
  (Seams & Trims)   (DO-001, DO-002, DO-003)         (Approved vs Drop)    (Yield: 91.2%, SAM: 14.2m)
     |                   |                                   |                    |
     +-------------------+---------------+-------------------+--------------------+
                                         |
                                         v
                         +-------------------------------+
                         |   FlexPLM Integration Bus     |
                         | (CreateDevelopmentBOM Payload)|
                         +-------------------------------+
                                         |
                                         v
                         +-------------------------------+
                         | Factory Sourcing & Production |
                         +-------------------------------+
```

---

### 3. Core Business Objectives & Key Results (OKRs)

#### Objective 1: Eliminate Manual BOM Transcription
- **KR 1.1:** Achieve **> 85% touchless straight-through processing** for core knitwear and bottoms.
- **KR 1.2:** Reduce time-to-first-BOM from 270 minutes to under 500 milliseconds for deterministic vector inputs.
- **KR 1.3:** Maintain zero data drift between Adobe Illustrator master artboards and FlexPLM commercial style lines.

#### Objective 2: Guarantee Air-Gapped Intellectual Property Protection
- **KR 2.1:** **100% on-premise / private VPC deployment** with zero egress of proprietary sketches or Pantone color formulas to public multi-tenant APIs.
- **KR 2.2:** Support local GPU inference (vLLM) with deterministic fallback parsing (0 API token cost).

#### Objective 3: Accelerate Sustainable Sourcing & ESG Transparency
- **KR 3.1:** Instant calculation of garment carbon footprint (kg CO2e) and Higg Materials Sustainability Index (MSI).
- **KR 3.2:** Automatic warning alerts for non-certified recycled synthetics or dropped raw materials.

---

### 4. Stakeholder Personas & Interaction Matrix

```
+----------------------------------------------------------------------------------------------------+
| USER PERSONA            | PRIMARY WORKFLOW RESPONSIBILITIES       | OMNITHINK ENGINE VALUE ADD     |
+-------------------------+-----------------------------------------+--------------------------------+
| Technical Designer      | Authors CAD flats in Adobe Illustrator;  | Instant validation of named    |
| (Authoring)             | defines stitch codes and seam geometry. | layers (msts:Upper); zero data |
|                         |                                         | re-entry into FlexPLM.         |
+-------------------------+-----------------------------------------+--------------------------------+
| Materials Developer     | Assigns fabric articles, lab approvals, | Automated validation against   |
| (Sourcing & RSL)        | and colorway codes across DOs.          | live PLM status; blocks        |
|                         |                                         | dropped or lab-only items.     |
+-------------------------+-----------------------------------------+--------------------------------+
| Costing Engineer        | Calculates standard allowed minutes     | Real-time 2D marker nesting    |
| (Manufacturing)         | (SAM), cut yield %, and FOB margins.    | efficiency simulation and      |
|                         |                                         | factory labor estimates.       |
+-------------------------+-----------------------------------------+--------------------------------+
| PLM Platform Admin      | Maintains schema contracts and REST     | Standardized JSON event bus    |
| (Enterprise IT)         | endpoints into PTC FlexPLM Windchill.   | payloads with zero schema lag. |
+-------------------------+-----------------------------------------+--------------------------------+
```

---

### 5. Scope Boundaries

- **In Scope (SP28 Release):**
  - Master Style and Development Object hierarchy resolution.
  - In-stream binary PDF/XMP metadata extraction (`msts:pluginData`).
  - Native Vector CAD DOM parser with ISO stitch code detection.
  - Multi-agent orchestration (Supervisor, Ingestion, Geometry, Sourcing, Compliance, Costing, Memory).
  - PTC FlexPLM REST event schema generation (`CreateDevelopmentBOM`).
  - Historical similarity search (FAISS / Qdrant) and learning feedback loop.
- **Out of Scope (Post-SP28 Phase 2):**
  - Direct 3D volumetric avatar physics rendering (deferred to CLO3D live socket).
  - Automated physical factory cutting table CNC machine code export (ISO G-code).
