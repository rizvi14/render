// Project lineage data. Names are domain-level, not internal table names.
// Each node: { id, layer, label, kind, desc }. Edges: [fromId, toId].
// kind drives the node colour: source | model | rule | mart | output | orchestration

export const layers = ['Sources', 'Staging', 'Intermediate', 'Marts', 'Consumers'];

export const projects = [
  {
    id: 'nova-credit',
    company: 'Nova Credit',
    title: 'Product launch monitoring',
    dates: '2026 — present',
    stack: ['dbt Core', 'SQL', 'Grafana', 'Python'],
    summary:
      'Every product launch used to be watched through a pile of one-off Grafana queries — each with its own definition of "a request" and "success". This model gives launches one tested path from raw events to a monitoring dashboard, so the same numbers show up in launch reviews, GTM reporting and Finance.',
    highlight: 'fct_health',
    nodes: [
      { id: 'src_events', layer: 0, kind: 'source', label: 'Product events', desc: 'Application and API events emitted by the product. One row per event; the raw material for adoption and health.' },
      { id: 'src_requests', layer: 0, kind: 'source', label: 'Report requests', desc: 'Every credit-data request made through the platform, with outcome and timing.' },
      { id: 'src_accounts', layer: 0, kind: 'source', label: 'Customer accounts', desc: 'Customer and contract records from the CRM — who is live on which product.' },
      { id: 'src_launches', layer: 0, kind: 'source', label: 'Launch registry', desc: 'Product-owned list of launches: name, cohort, go-live date, success criteria.' },

      { id: 'stg_events', layer: 1, kind: 'model', label: 'stg_events', desc: 'Typed, deduplicated events with a stable event taxonomy. Tests: unique event id, not-null timestamps, accepted event types.' },
      { id: 'stg_requests', layer: 1, kind: 'model', label: 'stg_requests', desc: 'One row per request with normalised outcome codes and latency in ms.' },
      { id: 'stg_accounts', layer: 1, kind: 'model', label: 'stg_accounts', desc: 'Current-state customer dimension with product entitlements.' },
      { id: 'stg_launches', layer: 1, kind: 'model', label: 'stg_launches', desc: 'Launch registry with parsed cohort definitions and effective windows.' },

      { id: 'int_cohorts', layer: 2, kind: 'model', label: 'int_launch_cohorts', desc: 'Which customers belong to which launch cohort, and from when. The join that used to be re-derived in every bespoke query.' },
      { id: 'int_outcomes', layer: 2, kind: 'model', label: 'int_request_outcomes', desc: 'Requests classified as success / partial / failure with reason codes, joined to the customer and launch.' },
      { id: 'int_usage', layer: 2, kind: 'model', label: 'int_account_usage_daily', desc: 'Daily usage per account per product: requests, active users, first-use date.' },

      { id: 'fct_health', layer: 3, kind: 'mart', label: 'fct_request_health', desc: 'Grain: launch × customer × day. Volume, success rate, p50/p95 latency, error mix. The table the monitoring dashboard reads.' },
      { id: 'fct_adoption', layer: 3, kind: 'mart', label: 'fct_launch_adoption', desc: 'Grain: launch × day. Cohort size, activated accounts, time-to-first-use, retention of usage after week 1.' },
      { id: 'dim_launch', layer: 3, kind: 'mart', label: 'dim_launch', desc: 'One row per launch with cohort, dates and success thresholds — drives the dashboard filters.' },

      { id: 'out_grafana', layer: 4, kind: 'output', label: 'Grafana dashboards', desc: 'One dashboard per launch, templated off dim_launch: health, adoption, and the error breakdown that used to take a custom query.' },
      { id: 'out_alerts', layer: 4, kind: 'output', label: 'Health alerts', desc: 'Threshold alerts on success rate and latency, evaluated against fct_request_health.' },
      { id: 'out_gtm', layer: 4, kind: 'output', label: 'GTM & Finance views', desc: 'Adoption and usage feed downstream GTM and Finance analytics — same definitions, no re-derivation.' },
    ],
    edges: [
      ['src_events', 'stg_events'], ['src_requests', 'stg_requests'], ['src_accounts', 'stg_accounts'], ['src_launches', 'stg_launches'],
      ['stg_accounts', 'int_cohorts'], ['stg_launches', 'int_cohorts'],
      ['stg_requests', 'int_outcomes'], ['int_cohorts', 'int_outcomes'],
      ['stg_events', 'int_usage'], ['stg_accounts', 'int_usage'],
      ['int_outcomes', 'fct_health'], ['int_cohorts', 'fct_health'],
      ['int_usage', 'fct_adoption'], ['int_cohorts', 'fct_adoption'],
      ['stg_launches', 'dim_launch'],
      ['fct_health', 'out_grafana'], ['fct_adoption', 'out_grafana'], ['dim_launch', 'out_grafana'],
      ['fct_health', 'out_alerts'],
      ['fct_adoption', 'out_gtm'], ['int_usage', 'out_gtm'],
    ],
  },

  {
    id: 'oracle',
    company: 'Oracle',
    title: 'Cost of Cloud — SVP reporting',
    dates: '2025 — 2026',
    stack: ['PL/SQL', 'SQL Developer', 'Oracle Analytics Cloud', 'SharePoint'],
    summary:
      'Teams across the org submitted cloud-savings claims through SharePoint; leadership needed one trustworthy number. The model validates every submission against warehouse cost data, suppresses and flags what does not hold up, and publishes views that power 12 recurring SVP reviews and a self-serve MBR — replacing a full day of manual aggregation.',
    highlight: 'v_scorecard',
    nodes: [
      { id: 'src_sharepoint', layer: 0, kind: 'source', label: 'SharePoint submissions', desc: 'Savings initiatives submitted by teams: owner, org, claimed savings, period, evidence link.' },
      { id: 'src_horizon', layer: 0, kind: 'source', label: 'Horizon DW cost & usage', desc: 'Cloud cost and usage at service × tenancy × day, the independent source of truth for spend.' },
      { id: 'src_org', layer: 0, kind: 'source', label: 'Org hierarchy', desc: 'Reporting lines from team up to SVP, effective-dated.' },
      { id: 'src_targets', layer: 0, kind: 'source', label: 'FY targets', desc: 'Savings targets by org and quarter, set at planning.' },

      { id: 'stg_submissions', layer: 1, kind: 'model', label: 'stg_submissions', desc: 'Submissions parsed into a fixed schema; free-text org names resolved to org ids.' },
      { id: 'stg_cost', layer: 1, kind: 'model', label: 'stg_cost_usage', desc: 'Cost and usage rolled to org × service × month with currency normalised.' },
      { id: 'stg_org', layer: 1, kind: 'model', label: 'stg_org_hierarchy', desc: 'Flattened hierarchy with a path from team to SVP for roll-ups.' },

      { id: 'int_flags', layer: 2, kind: 'rule', label: 'int_submission_flags', desc: 'Rule layer: duplicate claims, out-of-window periods, missing evidence, claimed savings exceeding observed cost change. Each rule is a named flag.' },
      { id: 'int_validated', layer: 2, kind: 'model', label: 'int_savings_validated', desc: 'Submissions joined to observed cost deltas; suppressed rows are kept with their suppression reason, never deleted.' },
      { id: 'int_attainment', layer: 2, kind: 'model', label: 'int_target_attainment', desc: 'Validated savings against FY targets by org and quarter.' },

      { id: 'v_savings', layer: 3, kind: 'mart', label: 'v_savings_by_org', desc: 'Monthly validated savings by org at every level of the hierarchy, with flagged and suppressed amounts shown separately.' },
      { id: 'v_scorecard', layer: 3, kind: 'mart', label: 'v_kpi_scorecard', desc: 'The SVP view: attainment %, run-rate, top initiatives, and a data-quality strip showing what was suppressed and why.' },
      { id: 'v_mbr', layer: 3, kind: 'mart', label: 'v_mbr_summary', desc: 'Month-over-month summary shaped for the MBR deck — the view that replaced a day of manual aggregation.' },

      { id: 'out_oac', layer: 4, kind: 'output', label: 'SVP review (OAC)', desc: 'Oracle Analytics Cloud data blends over the views; the custom end-to-end SVP experience, run 12 times.' },
      { id: 'out_mbr', layer: 4, kind: 'output', label: 'MBR self-serve', desc: 'Always-current MBR view any org lead can open — no more chasing spreadsheets.' },
      { id: 'out_dq', layer: 4, kind: 'output', label: 'DQ feedback to owners', desc: 'Flagged submissions routed back to owners with the rule that fired.' },
    ],
    edges: [
      ['src_sharepoint', 'stg_submissions'], ['src_horizon', 'stg_cost'], ['src_org', 'stg_org'],
      ['stg_submissions', 'int_flags'], ['stg_cost', 'int_flags'],
      ['stg_submissions', 'int_validated'], ['int_flags', 'int_validated'], ['stg_cost', 'int_validated'],
      ['int_validated', 'int_attainment'], ['src_targets', 'int_attainment'], ['stg_org', 'int_attainment'],
      ['int_validated', 'v_savings'], ['stg_org', 'v_savings'],
      ['int_attainment', 'v_scorecard'], ['v_savings', 'v_scorecard'], ['int_flags', 'v_scorecard'],
      ['v_savings', 'v_mbr'], ['int_attainment', 'v_mbr'],
      ['v_scorecard', 'out_oac'], ['v_savings', 'out_oac'],
      ['v_mbr', 'out_mbr'],
      ['int_flags', 'out_dq'],
    ],
  },

  {
    id: 'stripe',
    company: 'Stripe',
    title: 'Customer health scorecard',
    dates: '2022 — 2025',
    stack: ['SQL (Presto)', 'Airflow', 'Google Sheets', 'Tableau Server'],
    summary:
      'Customer Success managed 120 strategic accounts with no shared view of account health. The scorecard combines 15+ product and payments KPIs into a monthly score per account, with thresholds the CS team owns in a sheet, orchestrated daily by Airflow and read in Tableau.',
    highlight: 'fct_health',
    nodes: [
      { id: 'src_usage', layer: 0, kind: 'source', label: 'Product usage', desc: 'Feature adoption and API usage per account per day.' },
      { id: 'src_payments', layer: 0, kind: 'source', label: 'Payments performance', desc: 'Volume, authorisation rates, dispute and refund rates per account.' },
      { id: 'src_sfdc', layer: 0, kind: 'source', label: 'Salesforce accounts', desc: 'Account tier, owner, renewal dates, open opportunities.' },
      { id: 'src_sheet', layer: 0, kind: 'source', label: 'CSM inputs (GSheets)', desc: 'KPI thresholds and manual health overrides owned by Customer Success, read as a source.' },

      { id: 'stg_usage', layer: 1, kind: 'model', label: 'stg_usage', desc: 'Usage normalised to a KPI-per-account-per-month shape.' },
      { id: 'stg_payments', layer: 1, kind: 'model', label: 'stg_payments_perf', desc: 'Payments KPIs with consistent denominators across products.' },
      { id: 'stg_sfdc', layer: 1, kind: 'model', label: 'stg_sfdc_accounts', desc: 'The 120 strategic accounts, with a stable account key mapped across systems.' },
      { id: 'stg_thresholds', layer: 1, kind: 'model', label: 'stg_kpi_thresholds', desc: 'Sheet rows validated: every KPI has a green/amber/red band and a weight.' },

      { id: 'int_kpis', layer: 2, kind: 'model', label: 'int_account_kpis_monthly', desc: 'Grain: account × month × KPI. The 15+ KPIs in one long table with the value and its month-over-month change.' },
      { id: 'int_scores', layer: 2, kind: 'rule', label: 'int_kpi_scores', desc: 'Each KPI banded against its threshold and weighted; overrides applied with a reason.' },

      { id: 'fct_health', layer: 3, kind: 'mart', label: 'fct_account_health', desc: 'Grain: account × month. Composite score, band, the three KPIs driving the change, and a trend flag.' },
      { id: 'dim_account', layer: 3, kind: 'mart', label: 'dim_strategic_account', desc: 'Account attributes for slicing: tier, segment, CSM owner, renewal quarter.' },

      { id: 'orch', layer: 2, kind: 'orchestration', label: 'Airflow — daily DAG', desc: 'Refreshes the sheet snapshot, runs the SQL in dependency order, and publishes the Tableau extract.' },

      { id: 'out_tableau', layer: 4, kind: 'output', label: 'Tableau — Account Health', desc: 'Portfolio view and per-account drill-down for CS leadership; the source for weekly reviews.' },
      { id: 'out_playbooks', layer: 4, kind: 'output', label: 'CSM playbooks', desc: 'Accounts that drop a band trigger a playbook — the "actionable" half of actionable insight.' },
    ],
    edges: [
      ['src_usage', 'stg_usage'], ['src_payments', 'stg_payments'], ['src_sfdc', 'stg_sfdc'], ['src_sheet', 'stg_thresholds'],
      ['stg_usage', 'int_kpis'], ['stg_payments', 'int_kpis'], ['stg_sfdc', 'int_kpis'],
      ['int_kpis', 'int_scores'], ['stg_thresholds', 'int_scores'],
      ['int_scores', 'fct_health'], ['stg_sfdc', 'fct_health'],
      ['stg_sfdc', 'dim_account'],
      ['orch', 'fct_health'],
      ['fct_health', 'out_tableau'], ['dim_account', 'out_tableau'],
      ['fct_health', 'out_playbooks'],
    ],
  },
];
