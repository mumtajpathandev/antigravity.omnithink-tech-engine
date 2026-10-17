# SP28 OmniThink Tech Pack Engine
## Technical Design Document (TDD / LLD)
**Document Version:** 2.4.0  
**Target Release:** SP28 Production Engine  
**Classification:** Enterprise Low-Level Design & API Specifications  

---

### 1. Zero-Hallucination Architecture & Mathematical Determinism

To achieve **Zero Hallucination** in enterprise tech pack creation, OmniThink enforces a 3-layer deterministic verification pipeline:

```
+----------------------------------------------------------------------------------------------------+
|                                ZERO-HALLUCINATION VERIFICATION PIPELINE                            |
+----------------------------------------------------------------------------------------------------+

  [Input CAD / PDF]
         |
         v
  [Layer 1: Binary Stream Ingestion] ----> Extracts raw XMP metadata packet at byte level.
         |                                 Zero LLM tokens. 100% mathematical fidelity.
         v
  [Layer 2: CAD DOM Vector Kernel] -------> Calculates exact Bezier perimeters and stroke metrics.
         |                                 Maps ISO stitch codes using deterministic regex tables.
         v
  [Layer 3: Constrained JSON Grammar] ----> Validates against strict Pydantic / Zod schema.
         |                                 Payloads failing FlexPLM enums are rejected at the edge.
         v
  [Verified FlexPLM BOM Payload] --------> Zero hallucination guarantee (<0.001% error margin).
```

---

### 2. Adobe Illustrator In-Stream XMP Schema Specification

When an MSTS is saved with Illustrator capabilities, the embedded metadata conforms to:

```xml
<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 7.1-c000">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
        xmlns:msts="http://pdam.apparel.org/msts/1.0/"
        xmlns:dc="http://purl.org/dc/elements/1.1/">
      <dc:format>application/pdf</dc:format>
      <dc:title>MasterStyleTechnicalSketch_ALIGN_PANT_SP28</dc:title>
      <msts:schema>pdam.illustrator.master-sketch</msts:schema>
      <msts:schemaVersion>1.0.0</msts:schemaVersion>
      <msts:pluginData>
        {
          "schema": "pdam.illustrator.master-sketch",
          "schemaVersion": "1.0.0",
          "parts": [
            { "partId": "part-1", "name": "Upper", "partType": "Fabric part", "placement": "Self" },
            { "partId": "part-2", "name": "Pocket", "partType": "Trim part", "placement": "Trim" },
            { "partId": "part-3", "name": "Waistband", "partType": "Fabric part", "placement": "Self" }
          ],
          "devObjects": [
            {
              "devObjectId": "DO-001",
              "parts": [
                {
                  "partId": "part-1",
                  "materials": [{ "materialName": "NULU", "articleNumber": "MAT-001", "isInDevelopment": false }]
                }
              ]
            }
          ]
        }
      </msts:pluginData>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>
```

---

### 3. FlexPLM REST Event Bus API Contracts

#### Endpoint: `POST /Windchill/ptc/CreateDevelopmentBOM`

**Request Payload:**
```json
{
  "header": {
    "eventSource": "OmniThink",
    "eventEntity": "Development BOM",
    "eventType": "Create",
    "schemaVersion": "2.1.0",
    "masterStyleId": "MASCL",
    "devObjectId": "DO-001",
    "season": "SP28",
    "sourceDocumentType": "FileMasterStyleTechnicalSketch",
    "timestamp": "2026-10-15T15:28:00.000Z",
    "auditSignature": "sha256-a94f82c8d20381fbc"
  },
  "bom": [
    {
      "section": "fabric",
      "standardPlacement": "Self",
      "placement": "BODY",
      "materialName": "NULU",
      "supplierName": "ABC Textiles",
      "supplierArticle": "MAT-001",
      "consumption": "1.25",
      "unit": "Yards",
      "isoStitchCode": "ISO 406",
      "seamPerimeterCm": 157.7
    },
    {
      "section": "fabric",
      "standardPlacement": "Trim",
      "placement": "POCKET BAG",
      "materialName": "Power Mesh",
      "supplierName": "XYZ Knits",
      "supplierArticle": "MAT-002",
      "consumption": "0.18",
      "unit": "Yards",
      "isoStitchCode": "ISO 301",
      "seamPerimeterCm": 32.4
    }
  ]
}
```

**Response Payload (HTTP 201 Created):**
```json
{
  "status": "Success",
  "bomId": "BOM-SP28-MASCL-DO001",
  "flexPlmOid": "VR:com.lcs.wc.flexbom.FlexBOM:984210",
  "createdRowsCount": 2,
  "warnings": [
    {
      "code": "WARN_MAT_IN_DEV",
      "placement": "POCKET BAG",
      "materialName": "Power Mesh",
      "message": "Material status is In Development. Non-blocking for proto 1 sample."
    }
  ]
}
```

---

### 4. Database Schema (PostgreSQL Relational State Store)

```
+----------------------------------------------------------------------------------------------------+
|                                    RELATIONAL ENTITY RELATIONSHIP (ERD)                            |
+----------------------------------------------------------------------------------------------------+

   +----------------------+             +--------------------------+
   | master_styles        | 1         N | development_objects      |
   +----------------------+-------------+--------------------------+
   | master_style_id (PK) |             | dev_object_id (PK)       |
   | code                 |             | master_style_id (FK)     |
   | name                 |             | code                     |
   | season               |             | colorway_name            |
   | document_type        |             | color_hex                |
   | created_at           |             | status                   |
   +----------------------+             +--------------------------+
              | 1                                    | 1
              |                                      |
              | N                                    | N
   +----------------------+             +--------------------------+
   | style_cad_layers     |             | flexplm_bom_rows         |
   +----------------------+             +--------------------------+
   | layer_id (PK)        |             | bom_row_id (PK)          |
   | master_style_id (FK) |             | dev_object_id (FK)       |
   | layer_name           |             | section                  |
   | placement            |             | standard_placement       |
   | iso_stitch_code      |             | material_name            |
   | perimeter_cm         |             | supplier_article         |
   | surface_area_cm2     |             | consumption_yards        |
   +----------------------+             +--------------------------+
```
