-- ============================================================
-- Migration: 20260827100000_seed_historical_boq_dev_data.sql
-- Description: Seed private development datasets from real historical BOQs:
--              1. VECTORIS DEVELOPMENT — GB 300 (Electrical & Data Center Power)
--              2. VECTORIS DEVELOPMENT — EMERSON PAC (Precision Cooling & Piping)
--              3. ISOLATED TENANT TEST ORG (Tenant Isolation Verification)
-- ============================================================

DO $$
DECLARE
    v_user_a_id UUID := '11111111-1111-1111-1111-111111111111';
    v_user_b_id UUID := '22222222-2222-2222-2222-222222222222';
    
    v_org_a_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    v_org_b_id UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    
    v_proj_gb300_id UUID := '33333333-3333-3333-3333-333333333333';
    v_proj_emerson_id UUID := '44444444-4444-4444-4444-444444444444';
    v_proj_isolated_id UUID := '55555555-5555-5555-5555-555555555555';
    
    v_doc_gb300_boq UUID := 'd1111111-1111-1111-1111-111111111111';
    v_doc_gb300_sld UUID := 'd1111111-1111-1111-1111-222222222222';
    v_doc_emerson_pdf UUID := 'd2222222-2222-2222-2222-111111111111';
    v_doc_emerson_xlsx UUID := 'd2222222-2222-2222-2222-222222222222';
    
    v_sheet_gb300_calc UUID := 'e1111111-1111-1111-1111-111111111111';
    v_sheet_gb300_elec UUID := 'e1111111-1111-1111-1111-222222222222';
    v_sheet_gb300_sld UUID := 'e1111111-1111-1111-1111-333333333333';
    v_sheet_emerson_piping UUID := 'e2222222-2222-2222-2222-111111111111';
    v_sheet_emerson_elec UUID := 'e2222222-2222-2222-2222-222222222222';
    
    v_run_gb300 UUID := 'f1111111-1111-1111-1111-111111111111';
    v_run_emerson UUID := 'f2222222-2222-2222-2222-111111111111';

    v_sess_gb300 UUID := 'c1111111-1111-1111-1111-111111111111';
    v_sess_emerson UUID := 'c2222222-2222-2222-2222-111111111111';
BEGIN
    -- 1. Development Users (Insert into auth.users if not present)
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES 
        (v_user_a_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'estimator@vectoris-dev.internal', '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Lead Estimator (Dev)"}', NOW(), NOW()),
        (v_user_b_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'auditor@isolated-tenant.internal', '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"External Auditor (Dev)"}', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- 2. Organizations
    INSERT INTO public.organizations (id, name, owner_id, settings, created_at, updated_at)
    VALUES 
        (v_org_a_id, 'Vectoris Engineering Labs (Dev)', v_user_a_id, '{"environment":"development","tier":"enterprise"}', NOW(), NOW()),
        (v_org_b_id, 'Isolated Tenant Test Org (Dev)', v_user_b_id, '{"environment":"development","tier":"standard"}', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW();

    -- 3. Organization Memberships
    INSERT INTO public.org_members (organization_id, user_id, role, joined_at)
    VALUES 
        (v_org_a_id, v_user_a_id, 'owner', NOW()),
        (v_org_b_id, v_user_b_id, 'owner', NOW())
    ON CONFLICT (organization_id, user_id) DO NOTHING;

    -- 4. Projects
    INSERT INTO public.projects (id, organization_id, name, description, verified_type, created_by, created_at, updated_at)
    VALUES 
        (v_proj_gb300_id, v_org_a_id, 'VECTORIS DEVELOPMENT — GB 300', 'High-density data center power distribution, 400kW IT UPS demand calculation, IEC 61439 LT switchgear panels, and feeder infrastructure.', 'Data Center Infrastructure', v_user_a_id, NOW(), NOW()),
        (v_proj_emerson_id, v_org_a_id, 'VECTORIS DEVELOPMENT — EMERSON PAC', 'Precision air conditioning infrastructure, dual hot gas & liquid refrigerant lines, 3C/4C cabling, and outdoor/indoor MS fabrication.', 'Precision Air Conditioning', v_user_a_id, NOW(), NOW()),
        (v_proj_isolated_id, v_org_b_id, 'ISOLATED TENANT TEST PROJECT', 'Private test project under Tenant B to verify strict organizational RLS isolation.', 'Commercial MEP', v_user_b_id, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, updated_at = NOW();

    -- 5. Project Memberships
    INSERT INTO public.project_members (project_id, user_id, role, assigned_at)
    VALUES 
        (v_proj_gb300_id, v_user_a_id, 'owner', NOW()),
        (v_proj_emerson_id, v_user_a_id, 'owner', NOW()),
        (v_proj_isolated_id, v_user_b_id, 'owner', NOW())
    ON CONFLICT (project_id, user_id) DO NOTHING;

    -- 6. Documents
    INSERT INTO public.documents (id, project_id, filename, format, upload_status, storage_mode, local_reference, uploaded_by, uploaded_at)
    VALUES 
        (v_doc_gb300_boq, v_proj_gb300_id, 'BOQ for GB 300 -R1.xlsx', 'xlsx', 'complete', 'local', 'Research Folder/Sample BOQ/BOQ for GB 300 -R1.xlsx', v_user_a_id, NOW()),
        (v_doc_gb300_sld, v_proj_gb300_id, 'GB 300 Electrical Single Line Diagram.pdf', 'pdf', 'complete', 'local', 'Research Folder/Sample BOQ/GB 300 Electrical Single Line Diagram.pdf', v_user_a_id, NOW()),
        (v_doc_emerson_pdf, v_proj_emerson_id, 'BOQ. Emerson Climate Technologies.pdf', 'pdf', 'complete', 'local', 'Research Folder/Sample BOQ/BOQ. Emerson Climate Technologies.pdf', v_user_a_id, NOW()),
        (v_doc_emerson_xlsx, v_proj_emerson_id, '1862-V9-Final CS-Emerson Noida-24.08.2026.xlsx', 'xlsx', 'complete', 'local', 'Research Folder/1862-V9-Final CS-Emerson Noida-24.08.2026.xlsx', v_user_a_id, NOW())
    ON CONFLICT (id) DO NOTHING;

    -- 7. Sheets
    INSERT INTO public.sheets (id, document_id, sheet_index, classification, created_at)
    VALUES 
        (v_sheet_gb300_calc, v_doc_gb300_boq, 1, 'schedule', NOW()),
        (v_sheet_gb300_elec, v_doc_gb300_boq, 2, 'schedule', NOW()),
        (v_sheet_gb300_sld, v_doc_gb300_sld, 1, 'single_line', NOW()),
        (v_sheet_emerson_piping, v_doc_emerson_pdf, 1, 'schedule', NOW()),
        (v_sheet_emerson_elec, v_doc_emerson_pdf, 2, 'schedule', NOW())
    ON CONFLICT (id) DO NOTHING;

    -- 8. Takeoff Runs
    INSERT INTO public.takeoff_runs (id, project_id, triggered_by, model_version, status, started_at, completed_at)
    VALUES 
        (v_run_gb300, v_proj_gb300_id, v_user_a_id, 'v2.4-native', 'complete', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '50 minutes'),
        (v_run_emerson, v_proj_emerson_id, v_user_a_id, 'v2.4-native', 'complete', NOW() - INTERVAL '40 minutes', NOW() - INTERVAL '30 minutes')
    ON CONFLICT (id) DO NOTHING;

    -- 9. Line Items — GB 300 (All Authentic Quantities & Specs from Historical BOQ)
    INSERT INTO public.line_items (project_id, source, item_code, name, category, current_value, unit_of_measure, status, created_at, updated_at)
    VALUES 
        (v_proj_gb300_id, 'ai_detection', 'LT-01', 'LT Switchgear Panel-1 & 2 (MCCB 800A 415V 4P 35kA, 630A Cu Busbar, 3x 630A 4P Outgoing)', 'Power Distribution', 2, 'NOS', 'approved', NOW(), NOW()),
        (v_proj_gb300_id, 'ai_detection', 'LT-02', 'UPS Output Panel (MCCB 800A 4P 35kA x2, 4x 32A 4P, 9x 63A 4P)', 'Power Distribution', 2, 'NOS', 'approved', NOW(), NOW()),
        (v_proj_gb300_id, 'ai_detection', 'ATS-01', '32A 4P ATS with Enclosure for CDU', 'Automatic Transfer Switches', 1, 'NOS', 'proposed', NOW(), NOW()),
        (v_proj_gb300_id, 'ai_detection', 'ATS-02', '16A DP ATS with Enclosure for Motorised Valve', 'Automatic Transfer Switches', 2, 'NOS', 'proposed', NOW(), NOW()),
        (v_proj_gb300_id, 'ai_detection', 'PANEL-01', 'Supply & Commissioning of 630A 4P 35kA MCCB in Existing Panel', 'Power Distribution', 1, 'NOS', 'approved', NOW(), NOW()),
        (v_proj_gb300_id, 'ai_detection', 'SOCK-01', 'IEC 60309 32A, 3P+N+E Interlocked Socket with Enclosure', 'Receptacles & Sockets', 6, 'NOS', 'proposed', NOW(), NOW()),
        (v_proj_gb300_id, 'ai_detection', 'SOCK-02', 'IEC 60309 63A, 3P+N+E Interlocked Socket with Enclosure', 'Receptacles & Sockets', 16, 'NOS', 'proposed', NOW(), NOW()),
        (v_proj_gb300_id, 'ai_detection', 'CBL-01', '4C x 150 sq.mm Aluminium Armoured XLPE 1100V Power Cable', 'Power Cables', 110, 'RM', 'proposed', NOW(), NOW()),
        (v_proj_gb300_id, 'ai_detection', 'CBL-02', '1C x 150 sq.mm Copper Flexible Power Cable', 'Power Cables', 420, 'RM', 'proposed', NOW(), NOW()),
        (v_proj_gb300_id, 'ai_detection', 'CBL-03', '4C x 10 sq.mm Copper Flexible Power Cable', 'Power Cables', 40, 'RM', 'proposed', NOW(), NOW()),
        (v_proj_gb300_id, 'ai_detection', 'CBL-04', '3C x 4 sq.mm Copper Flexible Power Cable', 'Power Cables', 40, 'RM', 'proposed', NOW(), NOW()),
        (v_proj_gb300_id, 'ai_detection', 'CBL-05', '5C x 16 sq.mm Copper Flexible Power Cable', 'Power Cables', 320, 'RM', 'proposed', NOW(), NOW()),
        (v_proj_gb300_id, 'ai_detection', 'GLD-01', 'Double Compression Gland & Lug for 4C x 150 sq.mm Al Cable', 'Cable Accessories', 8, 'NOS', 'proposed', NOW(), NOW()),
        (v_proj_gb300_id, 'ai_detection', 'GLD-02', 'Double Compression Gland & Lug for 1C x 150 sq.mm Cu Cable', 'Cable Accessories', 34, 'NOS', 'proposed', NOW(), NOW()),
        (v_proj_gb300_id, 'ai_detection', 'GLD-03', 'Double Compression Gland & Lug for 5C x 16 sq.mm Cu Cable', 'Cable Accessories', 32, 'NOS', 'proposed', NOW(), NOW()),
        (v_proj_gb300_id, 'ai_detection', 'TRAY-01', '300 x 100 mm Powder Coated Perforated Cable Tray (2mm sheet)', 'Cable Trays', 60, 'RM', 'proposed', NOW(), NOW()),
        (v_proj_gb300_id, 'ai_detection', 'TRAY-02', '450 x 100 mm Powder Coated Perforated Cable Tray (2mm sheet)', 'Cable Trays', 40, 'RM', 'proposed', NOW(), NOW()),
        (v_proj_gb300_id, 'ai_detection', 'EARTH-01', '32 x 6 mm GI Earthing Strip', 'Earthing & Grounding', 30, 'RM', 'proposed', NOW(), NOW()),
        (v_proj_gb300_id, 'ai_detection', 'EARTH-02', '25 x 3 mm Copper Earthing Strip', 'Earthing & Grounding', 20, 'RM', 'proposed', NOW(), NOW()),
        (v_proj_gb300_id, 'ai_detection', 'EARTH-03', '1C x 6 sq.mm Copper Earthing Cable', 'Earthing & Grounding', 30, 'RM', 'proposed', NOW(), NOW()),
        (v_proj_gb300_id, 'ai_detection', 'EARTH-04', '1C x 25 sq.mm Copper Earthing Cable', 'Earthing & Grounding', 30, 'RM', 'proposed', NOW(), NOW())
    ON CONFLICT DO NOTHING;

    -- 10. Line Items — EMERSON PAC (All Authentic Quantities & Specs from Historical BOQ)
    INSERT INTO public.line_items (project_id, source, item_code, name, category, current_value, unit_of_measure, status, created_at, updated_at)
    VALUES 
        (v_proj_emerson_id, 'ai_detection', 'EM-01A', 'Copper Hot Gas Line (7/8", 18G) between Indoor & Outdoor Units', 'Refrigerant Piping', 270, 'MTR', 'proposed', NOW(), NOW()),
        (v_proj_emerson_id, 'ai_detection', 'EM-01B', 'Copper Liquid Line (5/8", 18G) between Indoor & Outdoor Units', 'Refrigerant Piping', 270, 'MTR', 'proposed', NOW(), NOW()),
        (v_proj_emerson_id, 'ai_detection', 'EM-02', 'Condenser Copper Cabling between Indoor & Outdoor (3C x 2.5 sq.mm)', 'Control Cabling', 279, 'MTR', 'proposed', NOW(), NOW()),
        (v_proj_emerson_id, 'ai_detection', 'EM-03', 'PAC Main Power Cabling (4C x 16 sq.mm)', 'Power Cabling', 22.5, 'MTR', 'proposed', NOW(), NOW()),
        (v_proj_emerson_id, 'ai_detection', 'EM-04', 'Copper Pipe Nitrile Thermal Insulation for Hot Gas & Liquid Lines', 'Thermal Insulation', 270, 'MTR', 'proposed', NOW(), NOW()),
        (v_proj_emerson_id, 'ai_detection', 'EM-05', 'MS Structural Fabrication for Outdoor Condenser Units', 'Structural Fabrication', 3, 'NOS', 'approved', NOW(), NOW()),
        (v_proj_emerson_id, 'ai_detection', 'EM-06', 'MS Structural Fabrication for Indoor PAC Units', 'Structural Fabrication', 3, 'NOS', 'approved', NOW(), NOW()),
        (v_proj_emerson_id, 'ai_detection', 'EM-07', '40 mm UPVC Hard Drain Piping with Nitrile Insulation', 'Condensate Drainage', 26, 'MTR', 'proposed', NOW(), NOW()),
        (v_proj_emerson_id, 'ai_detection', 'EM-08', 'Refrigerant Gas R-410A Initial Charge', 'Refrigerants & Chemicals', 220, 'KGS', 'proposed', NOW(), NOW()),
        (v_proj_emerson_id, 'ai_detection', 'EM-09', 'Extended Piping Kit with Check Valves, Solenoid Valves, U-Trap & Cabling', 'Extended Piping', 3, 'NOS', 'proposed', NOW(), NOW()),
        (v_proj_emerson_id, 'ai_detection', 'EM-10', 'GI Perforated Cable Tray 350 x 50 mm (Hall Area)', 'Cable Trays', 25, 'MTR', 'proposed', NOW(), NOW()),
        (v_proj_emerson_id, 'ai_detection', 'EM-11', 'Potable Water UPVC Hard Pipe for Humidifier 25 mm', 'Humidification Water', 46, 'MTR', 'proposed', NOW(), NOW()),
        (v_proj_emerson_id, 'ai_detection', 'EM-12', 'Humidifier Water Inlet Valve', 'Valves & Fittings', 3, 'NOS', 'proposed', NOW(), NOW()),
        (v_proj_emerson_id, 'ai_detection', 'EM-13', 'Installation, Testing & Commissioning of PAC Units with Nitrogen Pressure Test', 'Equipment Commissioning', 3, 'NOS', 'approved', NOW(), NOW()),
        (v_proj_emerson_id, 'ai_detection', 'EM-14', 'Condensate Drain Pump', 'Drainage Equipment', 6, 'NOS', 'proposed', NOW(), NOW()),
        (v_proj_emerson_id, 'ai_detection', 'EM-15', 'Compressor Refrigerant Lubricant Oil', 'Refrigerants & Chemicals', 6, 'LTR', 'proposed', NOW(), NOW()),
        (v_proj_emerson_id, 'ai_detection', 'EM-16', 'Perforated Cable Tray with Cover (350 x 50 mm)', 'Cable Trays', 30, 'MTR', 'proposed', NOW(), NOW()),
        (v_proj_emerson_id, 'ai_detection', 'EM-17', 'Cable Tray with Cover (25 x 50 x 25 mm)', 'Cable Trays', 25, 'MTR', 'proposed', NOW(), NOW())
    ON CONFLICT DO NOTHING;

    -- 11. Initial Audit and Correction Events
    INSERT INTO public.correction_events (line_item_id, ai_value, human_value, delta, correction_type, correction_reason, user_id, model_version, is_training_candidate, created_at)
    SELECT id, 'proposed', 'approved', 'status: proposed -> approved', 'manual_override', 'Verified against IEC 61439 FTTA switchgear specification.', v_user_a_id, 'v2.4-native', true, NOW()
    FROM public.line_items
    WHERE item_code IN ('LT-01', 'LT-02', 'EM-05', 'EM-06', 'EM-13')
    ON CONFLICT DO NOTHING;

    -- 12. Investigation Workshop Sessions & Persistent Evidence Traces
    INSERT INTO public.chat_sessions (id, project_id, title, created_by, created_at, updated_at)
    VALUES 
        (v_sess_gb300, v_proj_gb300_id, 'GB 300 — IT UPS & Power Distribution Audit', v_user_a_id, NOW() - INTERVAL '20 minutes', NOW()),
        (v_sess_emerson, v_proj_emerson_id, 'Emerson PAC — Refrigerant & Hot Gas Piping Investigation', v_user_a_id, NOW() - INTERVAL '15 minutes', NOW())
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.messages (session_id, role, content, evidence_links, created_at)
    VALUES 
        (v_sess_gb300, 'user', 'What is the total IT UPS demand and proposed capacity calculated for the high-density racks in GB 300?', '[]'::jsonb, NOW() - INTERVAL '20 minutes'),
        (v_sess_gb300, 'agent', '### Engineering Investigation Analysis: GB 300 IT Load Demand

Based on the verified calculations in **`BOQ for GB 300 -R1.xlsx`** (`Sheet1`):

#### ⚡ IT Distribution Demand Breakdown
- **High Density Racks:** 2 Units × 155 kW density = **310.0 kW**
- **Network Racks:** 3 Units × 14 kW density = **42.0 kW**
- **MCDU:** 1 Unit × 7 kW = **7.0 kW**
- **Motorised Valves:** 2 Units × 0.3 kW = **0.6 kW**
- **Total IT UPS Demand:** **359.6 kW**

#### 🔋 Capacity & System Sizing
- **Proposed UPS Capacity:** **400.0 kW** (Operating load factor: 89.9%)
- **System Load with 3% UPS Losses:** 370.39 kW
- **Battery Charging Load:** 16.21 kW
- **Total Electrical Sizing Load:** **386.60 kW** (415V, 0.9 PF, 125% NEC overcurrent factor)

> **Scope Boundary Note:** Earth pit and earth pit-to-data-hall earthing conductors are explicitly noted as in customer scope.', '[{"doc_name":"BOQ for GB 300 -R1.xlsx","sheet":"Sheet1","region":"IT Distribution Schedule"}]'::jsonb, NOW() - INTERVAL '19 minutes'),
        (v_sess_emerson, 'user', 'What are the specifications for the refrigerant piping and compressor cabling for the Emerson PAC units?', '[]'::jsonb, NOW() - INTERVAL '15 minutes'),
        (v_sess_emerson, 'agent', '### Engineering Investigation Analysis: Emerson PAC Infrastructure

Based on **`BOQ. Emerson Climate Technologies.pdf`**:

#### ❄️ Refrigerant & Fluid Circuit
- **Hot Gas Line:** 7/8", 18G Copper Pipe — **270 MTR** (`EM-01A`)
- **Liquid Line:** 5/8", 18G Copper Pipe — **270 MTR** (`EM-01B`)
- **Thermal Insulation:** Nitrile rubber insulation for hot gas & liquid lines — **270 MTR** (`EM-04`)
- **Initial Refrigerant Charge:** R-410A Gas — **220 KGS** (`EM-08`)
- **Extended Piping Kit:** 3 Sets with check valves, solenoid valves, and U-traps (`EM-09`)

#### ⚡ Electrical & Control Interconnections
- **Condenser Cabling:** 3C × 2.5 sq.mm Copper Cable (Indoor-to-Outdoor) — **279 MTR** (`EM-02`)
- **Main Power Cabling:** 4C × 16 sq.mm Copper Cable — **22.5 MTR** (`EM-03`)
- **Drainage:** 40mm UPVC pipe with nitrile insulation (**26 MTR**) + 6x condensate drain pumps.', '[{"doc_name":"BOQ. Emerson Climate Technologies.pdf","sheet":"Page 1","region":"Mechanical & Electrical Interconnect"}]'::jsonb, NOW() - INTERVAL '14 minutes')
    ON CONFLICT DO NOTHING;

END $$;
