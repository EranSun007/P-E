/**
 * Preset templates for common CI/CD and monitoring tools
 * These populate the RuleBuilderDialog form to jump-start rule creation
 *
 * Note: Selectors are generic starting points. Users should customize
 * based on their specific instance's DOM structure.
 */

export const PRESET_TEMPLATES = {
  jenkins: {
    name: 'Jenkins Build Status',
    url_pattern: '*jenkins*',
    description: 'Extract build status from Jenkins job pages',
    selectors: [
      {
        field_name: 'job_name',
        selector: '#main-panel h1',
        type: 'text',
        required: true
      },
      {
        field_name: 'build_status',
        selector: '#buildHistory .build-row:first-child .build-status-icon__wrapper',
        type: 'attribute',
        attribute: 'title',
        required: true
      },
      {
        field_name: 'build_number',
        selector: '#buildHistory .build-row:first-child .build-link',
        type: 'text',
        required: false
      },
      {
        field_name: 'build_url',
        selector: '#buildHistory .build-row:first-child .build-link',
        type: 'href',
        required: false
      }
    ]
  },

  grafana: {
    name: 'Grafana Dashboard',
    url_pattern: '*grafana*',
    description: 'Extract dashboard info from Grafana',
    selectors: [
      {
        field_name: 'dashboard_title',
        selector: '[data-testid="data-testid dashboard-scene-title"], .navbar-page-btn',
        type: 'text',
        required: true
      },
      {
        field_name: 'dashboard_url',
        selector: 'link[rel="canonical"]',
        type: 'href',
        required: false
      }
    ]
  },

  concourse: {
    name: 'Concourse Pipeline',
    url_pattern: '*concourse*',
    description: 'Extract pipeline status from Concourse CI',
    selectors: [
      {
        field_name: 'pipeline_name',
        selector: '.pipeline-name, [data-pipeline-name]',
        type: 'text',
        required: true
      },
      {
        field_name: 'job_name',
        selector: '.job-name, .build-header__job-name',
        type: 'text',
        required: false
      },
      {
        field_name: 'build_status',
        selector: '.build-header, [class*="status"]',
        type: 'attribute',
        attribute: 'class',
        required: false
      },
      {
        field_name: 'build_number',
        selector: '.build-header__build-name, .build-number',
        type: 'text',
        required: false
      }
    ]
  },

  dynatrace: {
    name: 'Dynatrace Problem',
    url_pattern: '*dynatrace*',
    description: 'Extract problem details from Dynatrace',
    selectors: [
      {
        field_name: 'problem_title',
        selector: '[data-testid="problem-title"], .problem-title',
        type: 'text',
        required: true
      },
      {
        field_name: 'severity',
        selector: '[data-testid="problem-severity"], .severity',
        type: 'text',
        required: false
      },
      {
        field_name: 'affected_entities',
        selector: '[data-testid="affected-entities"], .affected-entity-count',
        type: 'text',
        required: false
      },
      {
        field_name: 'status',
        selector: '[data-testid="problem-status"], .problem-status',
        type: 'text',
        required: false
      }
    ]
  }
};

// Template keys for dropdown
export const TEMPLATE_OPTIONS = [
  { value: 'jenkins', label: 'Jenkins Build Status' },
  { value: 'grafana', label: 'Grafana Dashboard' },
  { value: 'concourse', label: 'Concourse Pipeline' },
  { value: 'dynatrace', label: 'Dynatrace Problem' },
];
