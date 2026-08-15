// Config-driven definition of the "simple reference modules" from the
// spec (Section 3.3–3.10). Each entry drives both the member-facing
// submission form and the admin table/export for that data type.
export const MODULES = {
  schools: {
    table: 'schools',
    label: 'Schools',
    singular: 'School',
    fields: [
      { key: 'school_name', label: 'School Name', type: 'text', required: true },
      { key: 'level', label: 'Level', type: 'select', options: ['Primary', 'Secondary', 'Tertiary'], required: true },
      { key: 'district', label: 'District', type: 'district', required: true },
    ],
  },
  commissioners: {
    table: 'commissioners',
    label: 'Commissioners',
    singular: 'Commissioner',
    fields: [
      { key: 'full_name', label: 'Name of Commissioner', type: 'text', required: true },
      { key: 'district', label: 'District', type: 'district', required: true },
      { key: 'email', label: 'Email', type: 'email' },
    ],
  },
  woodbadge: {
    table: 'woodbadge',
    label: 'Woodbadge',
    singular: 'Woodbadge Entry',
    fields: [
      { key: 'full_name', label: 'Name', type: 'text', required: true },
      { key: 'district', label: 'District', type: 'district', required: true },
      { key: 'participation_type', label: 'Attending', type: 'select', options: ['Woodbadge', 'Training'], required: true },
    ],
  },
  scout_leaders: {
    table: 'scout_leaders',
    label: 'Scout Leaders',
    singular: 'Scout Leader',
    fields: [
      { key: 'full_name', label: 'Name', type: 'text', required: true },
      { key: 'district', label: 'District', type: 'district', required: true },
      { key: 'contact', label: 'Contact', type: 'text' },
      { key: 'email', label: 'Email', type: 'email' },
    ],
  },
  rover_scouts: {
    table: 'rover_scouts',
    label: 'Rover Scouts',
    singular: 'Rover Scout',
    fields: [
      { key: 'full_name', label: 'Name', type: 'text', required: true },
      { key: 'district', label: 'District', type: 'district', required: true },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'contact', label: 'Contact', type: 'text' },
    ],
  },
  donors: {
    table: 'donors',
    label: 'Donors',
    singular: 'Donor',
    fields: [
      { key: 'donor_name', label: "Donor's Name / Organization", type: 'text', required: true },
      { key: 'purpose', label: 'Purpose or Project', type: 'text' },
      { key: 'in_charge_or_district', label: 'In Charge / District', type: 'text' },
    ],
  },
  district_leadership: {
    table: 'district_leadership',
    label: 'District Leadership',
    singular: 'District Leader',
    fields: [
      { key: 'full_name', label: 'Name', type: 'text', required: true },
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'district', label: 'District', type: 'district', required: true },
    ],
  },
  district_subscriptions: {
    table: 'district_subscriptions',
    label: 'District Annual Subscriptions',
    singular: 'Subscription',
    fields: [
      { key: 'district', label: 'District', type: 'district', required: true },
      { key: 'amount', label: 'Amount Paid (UGX)', type: 'number', required: true },
    ],
  },
}

export const MODULE_KEYS = Object.keys(MODULES)
