-- ============================================================
-- Migration: 20260827100000_seed_historical_boq_dev_data.sql
-- Description: Seed private development datasets from synthetic engineering benchmarks:
--              1. VECTORIS LABS — Power Distribution & Data Center Demand
--              2. VECTORIS LABS — Precision Air Conditioning & Thermal Infrastructure
--              3. ISOLATED TENANT TEST ORG (Tenant Isolation Verification)
-- ============================================================

DO $$
DECLARE
    v_user_a_id UUID := '11111111-1111-1111-1111-111111111111';
    v_user_b_id UUID := '22222222-2222-2222-2222-222222222222';
    
    v_org_a_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    v_org_b_id UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    
    v_proj_pwr_id UUID := '33333333-3333-3333-3333-333333333333';
    v_proj_pac_id UUID := '44444444-4444-4444-4444-444444444444';
    v_proj_isolated_id UUID := '55555555-5555-5555-5555-555555555555';
    
    v_doc_pwr_boq UUID := 'd1111111-1111-1111-1111-111111111111';
    v_doc_pwr_sld UUID := 'd1111111-1111-1111-1111-222222222222';
    v_doc_pac_pdf UUID := 'd2222222-2222-2222-2222-111111111111';
    v_doc_pac_xlsx UUID := 'd2222222-2222-2222-2222-222222222222';
    
    v_sheet_pwr_calc UUID := 'e1111111-1111-1111-1111-111111111111';
    v_sheet_pwr_elec UUID := 'e1111111-1111-1111-1111-222222222222';
    v_sheet_pwr_sld UUID := 'e1111111-1111-1111-1111-333333333333';
    v_sheet_pac_piping UUID := 'e2222222-2222-2222-2222-111111111111';
    v_sheet_pac_elec UUID := 'e2222222-2222-2222-2222-222222222222';
    
    v_run_pwr UUID := 'f1111111-1111-1111-1111-111111111111';
    v_run_pac UUID := 'f2222222-2222-2222-2222-111111111111';

    v_sess_pwr UUID := 'c1111111-1111-1111-1111-111111111111';
    v_sess_pac UUID := 'c2222222-2222-2222-2222-111111111111';
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
        (v_proj_pwr_id, v_org_a_id, 'BENCHMARK — High-Density Power Distribution', 'Synthetic electrical distribution model: 400kW UPS demand calculation, IEC 61439 LT switchgear panels, and feeder infrastructure.', 'Data Center Infrastructure', v_user_a_id, NOW(), NOW()),
        (v_proj_pac_id, v_org_a_id, 'BENCHMARK — Precision Cooling Infrastructure', 'Synthetic precision cooling model: dual hot gas & liquid lines, 3C/4C control cabling, and outdoor/indoor equipment fabrication.', 'Precision Air Conditioning', v_user_a_id, NOW(), NOW()),
        (v_proj_isolated_id, v_org_b_id, 'ISOLATED TENANT TEST PROJECT', 'Private test project under Tenant B to verify strict organizational RLS isolation.', 'Commercial MEP', v_user_b_id, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, updated_at = NOW();

    -- 5. Project Memberships
    INSERT INTO public.project_members (project_id, user_id, role, assigned_at)
    VALUES 
        (v_proj_pwr_id, v_user_a_id, 'owner', NOW()),
        (v_proj_pac_id, v_user_a_id, 'owner', NOW()),
        (v_proj_isolated_id, v_user_b_id, 'owner', NOW())
    ON CONFLICT (project_id, user_id) DO NOTHING;

    -- 6. Documents
    INSERT INTO public.documents (id, project_id, filename, format, upload_status, storage_mode, local_reference, uploaded_by, uploaded_at)
    VALUES 
        (v_doc_pwr_boq, v_proj_pwr_id, 'Synthetic_Power_Distribution_Schedule.xlsx', 'xlsx', 'complete', 'local', 'data/synthetic/Synthetic_Power_Distribution_Schedule.xlsx', v_user_a_id, NOW()),
        (v_doc_pwr_sld, v_proj_pwr_id, 'Synthetic_Single_Line_Diagram.pdf', 'pdf', 'complete', 'local', 'data/synthetic/Synthetic_Single_Line_Diagram.pdf', v_user_a_id, NOW()),
        (v_doc_pac_pdf, v_proj_pac_id, 'Synthetic_HVAC_Piping_Schedule.pdf', 'pdf', 'complete', 'local', 'data/synthetic/Synthetic_HVAC_Piping_Schedule.pdf', v_user_a_id, NOW()),
        (v_doc_pac_xlsx, v_proj_pac_id, 'Synthetic_Commercial_Cooling_Takeoff.xlsx', 'xlsx', 'complete', 'local', 'data/synthetic/Synthetic_Commercial_Cooling_Takeoff.xlsx', v_user_a_id, NOW())
    ON CONFLICT (id) DO NOTHING;

    -- 7. Sheets
    INSERT INTO public.sheets (id, document_id, sheet_index, classification, created_at)
    VALUES 
        (v_sheet_pwr_calc, v_doc_pwr_boq, 1, 'schedule', NOW()),
        (v_sheet_pwr_elec, v_doc_pwr_boq, 2, 'schedule', NOW()),
        (v_sheet_pwr_sld, v_doc_pwr_sld, 1, 'single_line', NOW()),
        (v_sheet_pac_piping, v_doc_pac_pdf, 1, 'schedule', NOW()),
        (v_sheet_pac_elec, v_doc_pac_pdf, 2, 'schedule', NOW())
    ON CONFLICT (id) DO NOTHING;

    -- 8. Takeoff Runs
    INSERT INTO public.takeoff_runs (id, project_id, triggered_by, model_version, status, started_at, completed_at)
    VALUES 
        (v_run_pwr, v_proj_pwr_id, v_user_a_id, 'v2.4-native', 'complete', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '50 minutes'),
        (v_run_pac, v_proj_pac_id, v_user_a_id, 'v2.4-native', 'complete', NOW() - INTERVAL '40 minutes', NOW() - INTERVAL '30 minutes')
    ON CONFLICT (id) DO NOTHING;

    -- 9. Line Items — Benchmark Power Distribution
    INSERT INTO public.line_items (project_id, source, item_code, name, category, current_value, unit_of_measure, status, created_at, updated_at)
    VALUES 
        (v_proj_pwr_id, 'ai_detection', 'PWR-PNL-01', 'LT Switchgear Main Panel (MCCB 800A 415V 4P 35kA, 630A Cu Busbar)', 'Power Distribution', 2, 'NOS', 'approved', NOW(), NOW()),
        (v_proj_pwr_id, 'ai_detection', 'PWR-UPS-01', 'UPS Output Sub-Distribution Panel (MCCB 800A 4P 35kA, 12-way sub-feeders)', 'Power Distribution', 2, 'NOS', 'approved', NOW(), NOW()),
        (v_proj_pwr_id, 'ai_detection', 'PWR-ATS-01', 'Automatic Transfer Switch 32A 4P with Wall Enclosure', 'Automatic Transfer Switches', 1, 'NOS', 'proposed', NOW(), NOW()),
        (v_proj_pwr_id, 'ai_detection', 'PWR-ATS-02', 'Automatic Transfer Switch 16A DP with Enclosure', 'Automatic Transfer Switches', 2, 'NOS', 'proposed', NOW(), NOW()),
        (v_proj_pwr_id, 'ai_detection', 'PWR-MCCB-01', '630A 4P 35kA Molded Case Circuit Breaker Module', 'Power Distribution', 1, 'NOS', 'approved', NOW(), NOW()),
        (v_proj_pwr_id, 'ai_detection', 'PWR-SOCK-01', 'Industrial Interlocked Socket 32A 3P+N+E IP67', 'Receptacles & Sockets', 6, 'NOS', 'proposed', NOW(), NOW()),
        (v_proj_pwr_id, 'ai_detection', 'PWR-SOCK-02', 'Industrial Interlocked Socket 63A 3P+N+E IP67', 'Receptacles & Sockets', 16, 'NOS', 'proposed', NOW(), NOW()),
        (v_proj_pwr_id, 'ai_detection', 'PWR-CBL-01', '4C x 150 sq.mm Aluminium Armoured XLPE 1.1kV Power Cable', 'Power Cables', 110, 'RM', 'proposed', NOW(), NOW()),
        (v_proj_pwr_id, 'ai_detection', 'PWR-CBL-02', '1C x 150 sq.mm Flexible Copper Power Conductor', 'Power Cables', 420, 'RM', 'proposed', NOW(), NOW()),
        (v_proj_pwr_id, 'ai_detection', 'PWR-CBL-03', '4C x 10 sq.mm Flexible Copper Equipment Cable', 'Power Cables', 40, 'RM', 'proposed', NOW(), NOW()),
        (v_proj_pwr_id, 'ai_detection', 'PWR-CBL-04', '3C x 4 sq.mm Copper Control & Power Cable', 'Power Cables', 40, 'RM', 'proposed', NOW(), NOW()),
        (v_proj_pwr_id, 'ai_detection', 'PWR-CBL-05', '5C x 16 sq.mm Heavy Duty Copper Feeder Cable', 'Power Cables', 320, 'RM', 'proposed', NOW(), NOW()),
        (v_proj_pwr_id, 'ai_detection', 'PWR-GLD-01', 'Double Compression Gland Kit for 4C 150 sq.mm Cable', 'Cable Accessories', 8, 'NOS', 'proposed', NOW(), NOW()),
        (v_proj_pwr_id, 'ai_detection', 'PWR-GLD-02', 'Double Compression Gland Kit for 1C 150 sq.mm Cable', 'Cable Accessories', 34, 'NOS', 'proposed', NOW(), NOW()),
        (v_proj_pwr_id, 'ai_detection', 'PWR-GLD-03', 'Double Compression Gland Kit for 5C 16 sq.mm Cable', 'Cable Accessories', 32, 'NOS', 'proposed', NOW(), NOW()),
        (v_proj_pwr_id, 'ai_detection', 'PWR-TRY-01', 'Perforated Cable Tray 300 x 100 mm (2.0mm Galvanized Sheet)', 'Cable Trays', 60, 'RM', 'proposed', NOW(), NOW()),
        (v_proj_pwr_id, 'ai_detection', 'PWR-TRY-02', 'Perforated Cable Tray 450 x 100 mm (2.0mm Galvanized Sheet)', 'Cable Trays', 40, 'RM', 'proposed', NOW(), NOW()),
        (v_proj_pwr_id, 'ai_detection', 'PWR-GND-01', '32 x 6 mm GI Grounding Conductor Strip', 'Earthing & Grounding', 30, 'RM', 'proposed', NOW(), NOW()),
        (v_proj_pwr_id, 'ai_detection', 'PWR-GND-02', '25 x 3 mm Bare Copper Grounding Bus Strip', 'Earthing & Grounding', 20, 'RM', 'proposed', NOW(), NOW()),
        (v_proj_pwr_id, 'ai_detection', 'PWR-GND-03', '1C x 6 sq.mm Insulated Copper Earth Bonding Wire', 'Earthing & Grounding', 30, 'RM', 'proposed', NOW(), NOW()),
        (v_proj_pwr_id, 'ai_detection', 'PWR-GND-04', '1C x 25 sq.mm Main Earthing Lead Conductor', 'Earthing & Grounding', 30, 'RM', 'proposed', NOW(), NOW())
    ON CONFLICT DO NOTHING;

    -- 10. Line Items — Benchmark Precision Cooling
    INSERT INTO public.line_items (project_id, source, item_code, name, category, current_value, unit_of_measure, status, created_at, updated_at)
    VALUES 
        (v_proj_pac_id, 'ai_detection', 'HVAC-PIPE-01', 'Refrigerant Hot Gas Line (7/8", 18G Copper)', 'Refrigerant Piping', 270, 'MTR', 'proposed', NOW(), NOW()),
        (v_proj_pac_id, 'ai_detection', 'HVAC-PIPE-02', 'Refrigerant Liquid Line (5/8", 18G Copper)', 'Refrigerant Piping', 270, 'MTR', 'proposed', NOW(), NOW()),
        (v_proj_pac_id, 'ai_detection', 'HVAC-CAB-01', 'Condenser Control Interconnect Cable (3C x 2.5 sq.mm)', 'Control Cabling', 279, 'MTR', 'proposed', NOW(), NOW()),
        (v_proj_pac_id, 'ai_detection', 'HVAC-CAB-02', 'Cooling Unit Main Power Cable (4C x 16 sq.mm)', 'Power Cabling', 22.5, 'MTR', 'proposed', NOW(), NOW()),
        (v_proj_pac_id, 'ai_detection', 'HVAC-INS-01', 'Closed-Cell Elastomeric Nitrile Pipe Insulation', 'Thermal Insulation', 270, 'MTR', 'proposed', NOW(), NOW()),
        (v_proj_pac_id, 'ai_detection', 'HVAC-STR-01', 'Structural Steel Mounting Base for Outdoor Heat Exchangers', 'Structural Fabrication', 3, 'NOS', 'approved', NOW(), NOW()),
        (v_proj_pac_id, 'ai_detection', 'HVAC-STR-02', 'Structural Steel Vibration Isolation Base for Indoor Units', 'Structural Fabrication', 3, 'NOS', 'approved', NOW(), NOW()),
        (v_proj_pac_id, 'ai_detection', 'HVAC-DRN-01', '40 mm UPVC Insulated Gravity Condensate Drain Pipe', 'Condensate Drainage', 26, 'MTR', 'proposed', NOW(), NOW()),
        (v_proj_pac_id, 'ai_detection', 'HVAC-GAS-01', 'Eco-Friendly Refrigerant R-410A Initial System Charge', 'Refrigerants & Chemicals', 220, 'KGS', 'proposed', NOW(), NOW()),
        (v_proj_pac_id, 'ai_detection', 'HVAC-VAL-01', 'Extended Piping Valve Assembly (Check Valve, Solenoid, Oil Trap)', 'Extended Piping', 3, 'NOS', 'proposed', NOW(), NOW()),
        (v_proj_pac_id, 'ai_detection', 'HVAC-TRY-01', 'Galvanized Perforated Cable Tray 350 x 50 mm', 'Cable Trays', 25, 'MTR', 'proposed', NOW(), NOW()),
        (v_proj_pac_id, 'ai_detection', 'HVAC-WTR-01', '25 mm High-Pressure UPVC Humidifier Supply Line', 'Humidification Water', 46, 'MTR', 'proposed', NOW(), NOW()),
        (v_proj_pac_id, 'ai_detection', 'HVAC-WTR-02', 'Humidifier Isolation & Metering Ball Valve Assembly', 'Valves & Fittings', 3, 'NOS', 'proposed', NOW(), NOW()),
        (v_proj_pac_id, 'ai_detection', 'HVAC-COMM-01', 'Testing, Nitrogen Pressure Hold (450 PSI), Evacuation & Commissioning', 'Equipment Commissioning', 3, 'NOS', 'approved', NOW(), NOW()),
        (v_proj_pac_id, 'ai_detection', 'HVAC-PMP-01', 'Automatic High-Lift Condensate Removal Pump with Safety Switch', 'Drainage Equipment', 6, 'NOS', 'proposed', NOW(), NOW()),
        (v_proj_pac_id, 'ai_detection', 'HVAC-OIL-01', 'Synthetic Polyolester (POE) Refrigeration Compressor Lubricant', 'Refrigerants & Chemicals', 6, 'LTR', 'proposed', NOW(), NOW()),
        (v_proj_pac_id, 'ai_detection', 'HVAC-TRY-02', 'Cable Tray with Solid Snap-On Cover (350 x 50 mm)', 'Cable Trays', 30, 'MTR', 'proposed', NOW(), NOW()),
        (v_proj_pac_id, 'ai_detection', 'HVAC-TRY-03', 'Control Wire Raceway Channel (25 x 50 x 25 mm)', 'Cable Trays', 25, 'MTR', 'proposed', NOW(), NOW())
    ON CONFLICT DO NOTHING;

    -- 11. Initial Audit and Correction Events
    INSERT INTO public.correction_events (line_item_id, ai_value, human_value, delta, correction_type, correction_reason, user_id, model_version, is_training_candidate, created_at)
    SELECT id, 'proposed', 'approved', 'status: proposed -> approved', 'manual_override', 'Verified against standard engineering benchmarks and IEC 61439 specification.', v_user_a_id, 'v2.4-native', true, NOW()
    FROM public.line_items
    WHERE item_code IN ('PWR-PNL-01', 'PWR-UPS-01', 'HVAC-STR-01', 'HVAC-STR-02', 'HVAC-COMM-01')
    ON CONFLICT DO NOTHING;

    -- 12. Investigation Workshop Sessions & Persistent Evidence Traces
    INSERT INTO public.chat_sessions (id, project_id, title, created_by, created_at, updated_at)
    VALUES 
        (v_sess_pwr, v_proj_pwr_id, 'Synthetic Power Benchmark — IT UPS & Feeder Sizing Analysis', v_user_a_id, NOW() - INTERVAL '20 minutes', NOW()),
        (v_sess_pac, v_proj_pac_id, 'Synthetic HVAC Benchmark — Thermal Piping & Refrigerant Audit', v_user_a_id, NOW() - INTERVAL '15 minutes', NOW())
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.messages (session_id, role, content, evidence_links, created_at)
    VALUES 
        (v_sess_pwr, 'user', 'What is the total IT UPS demand and proposed capacity calculated for the high-density racks?', '[]'::jsonb, NOW() - INTERVAL '20 minutes'),
        (v_sess_pwr, 'agent', '### Engineering Investigation Analysis: Power Distribution Demand

Based on the verified calculations in **`Synthetic_Power_Distribution_Schedule.xlsx`** (`Sheet1`):

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
- **Total Electrical Sizing Load:** **386.60 kW** (415V, 0.9 PF, 125% NEC overcurrent factor)', '[{"doc_name":"Synthetic_Power_Distribution_Schedule.xlsx","sheet":"Sheet1","region":"IT Distribution Schedule"}]'::jsonb, NOW() - INTERVAL '19 minutes'),
        (v_sess_pac, 'user', 'What are the specifications for the refrigerant piping and compressor cabling for the cooling units?', '[]'::jsonb, NOW() - INTERVAL '15 minutes'),
        (v_sess_pac, 'agent', '### Engineering Investigation Analysis: Precision Cooling Infrastructure

Based on **`Synthetic_HVAC_Piping_Schedule.pdf`**:

#### ❄️ Refrigerant & Fluid Circuit
- **Hot Gas Line:** 7/8", 18G Copper Pipe — **270 MTR** (`HVAC-PIPE-01`)
- **Liquid Line:** 5/8", 18G Copper Pipe — **270 MTR** (`HVAC-PIPE-02`)
- **Thermal Insulation:** Nitrile rubber insulation for hot gas & liquid lines — **270 MTR** (`HVAC-INS-01`)
- **Initial Refrigerant Charge:** R-410A Gas — **220 KGS** (`HVAC-GAS-01`)
- **Extended Piping Kit:** 3 Sets with check valves, solenoid valves, and U-traps (`HVAC-VAL-01`)

#### ⚡ Electrical & Control Interconnections
- **Condenser Cabling:** 3C × 2.5 sq.mm Copper Cable (Indoor-to-Outdoor) — **279 MTR** (`HVAC-CAB-01`)
- **Main Power Cabling:** 4C × 16 sq.mm Copper Cable — **22.5 MTR** (`HVAC-CAB-02`)
- **Drainage:** 40mm UPVC pipe with nitrile insulation (**26 MTR**) + 6x condensate drain pumps.', '[{"doc_name":"Synthetic_HVAC_Piping_Schedule.pdf","sheet":"Page 1","region":"Mechanical & Electrical Interconnect"}]'::jsonb, NOW() - INTERVAL '14 minutes')
    ON CONFLICT DO NOTHING;

END $$;
