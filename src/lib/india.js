/**
 * Shared reference data.
 *
 * The state list lives here rather than in a page because a citizen who lives in
 * Chandigarh or Puducherry must be able to file a transparency report, not just
 * someone in a state. Keeping one list stops the two forms from drifting apart.
 *
 * Values are the exact strings the backend persists, so they are sent verbatim.
 */
export const INDIAN_STATES = [
  'Uttar Pradesh', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh', 'Jammu and Kashmir',
  'Ladakh', 'Lakshadweep', 'Puducherry',
]

/**
 * Mirrors `ReportCategory` on the backend. The wire value is what is posted;
 * the human label comes from the translation catalogue so it can be localised.
 */
export const REPORT_CATEGORIES = [
  'BRIBE_DEMAND',
  'UNAUTHORIZED_FEE',
  'DOCUMENT_HOARDING',
  'APPLICATION_DELAY',
  'MIDDLEMAN_EXPLOITATION',
  'SERVICE_DENIAL',
  'OTHER',
]

/**
 * Mirrors the event types `LifeEventSignalExtractionService` can emit. Anything
 * unexpected is rendered as-is rather than dropped, so a backend addition
 * degrades to a readable raw value instead of an empty chip.
 */
export const LIFE_EVENT_TYPES = [
  'GENERAL_LIFE_EVENT',
  'HIGHER_EDUCATION',
  'FARMING_AGRICULTURE',
  'JOB_LOSS_UNEMPLOYMENT',
  'CHILDBIRTH_MATERNITY',
  'MARRIAGE',
  'LIVELIHOOD_ARTISAN',
  'HEALTHCARE_EMERGENCY',
  'SENIOR_CITIZEN_RETIREMENT',
]
