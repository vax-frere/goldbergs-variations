/**
 * Define the 6 major periods of Joshua's life for background visualization
 */
export const createLifePeriods = (minDate, maxDate) => [
  {
    name: "Beginning",
    startDate: minDate, // Actual timeline start
    endDate: new Date('2013-12-31'),
    color: 'rgba(100, 149, 237, 0.1)', // Light blue
  },
  {
    name: "Acceleration", 
    startDate: new Date('2014-01-01'),
    endDate: new Date('2015-04-30'), // Until the call to attack Draw Mohammed
    color: 'rgba(255, 165, 0, 0.15)', // Orange
  },
  {
    name: "Terrorist Escalation",
    startDate: new Date('2015-05-01'), // Call to attack Draw Mohammed
    endDate: new Date('2015-09-09'), // Until arrest
    color: 'rgba(255, 0, 0, 0.2)', // Bright red
  },
  {
    name: "Arrest - Proceedings - Sentence",
    startDate: new Date('2015-09-10'), // Arrest
    endDate: new Date('2018-06-24'), // Day before imprisonment
    color: 'rgba(220, 20, 60, 0.15)', // Red
  },
  {
    name: "Prison",
    startDate: new Date('2018-06-25'), // 10-year sentence
    endDate: new Date('2024-03-31'), // Day before release
    color: 'rgba(128, 0, 128, 0.15)', // Purple
  },
  {
    name: "Post-prison",
    startDate: new Date('2024-04-01'), // Release
    endDate: maxDate, // Actual timeline end
    color: 'rgba(34, 139, 34, 0.1)', // Green
  }
];

/**
 * Mapping French thematic group names to English keys
 */
export const THEMATIC_GROUP_MAPPING = {
  "Libertariens et Libéraux": "Libertarians",
  "Anti-système et Provocateurs": "Antisystem", 
  "Conservateurs et Traditionalistes": "Conservatives",
  "Extrême-droite et Nationalisme": "Nationalists",
  "Radicalismes religieux et identitaires": "Religious",
  "Culture": "Culture",
  "Social justice": "Social justice", // Already in English
  "Gauche et Justice sociale": "Social justice" // French version to translate
};

/**
 * English display names for thematic groups (shorter versions for legend)
 */
export const ENGLISH_GROUP_NAMES = {
  "Libertariens et Libéraux": "Libertarians",
  "Anti-système et Provocateurs": "Anti-system", 
  "Conservateurs et Traditionalistes": "Conservatives",
  "Extrême-droite et Nationalisme": "Far-right",
  "Radicalismes religieux et identitaires": "Religious",
  "Culture": "Culture",
  "Social justice": "Social Justice", // Already in English, just capitalize
  "Gauche et Justice sociale": "Left & Social Justice" // French version to translate
};

/**
 * Event type configurations
 */
export const EVENT_TYPES = [
  { type: 'legal', color: '#ff6b6b', label: 'Legal' },
  { type: 'persona', color: '#4ecdc4', label: 'Persona' },
  { type: 'activity', color: '#45b7d1', label: 'Activity' },
  { type: 'event', color: '#96ceb4', label: 'Event' }
];

/**
 * Life period configurations for legend (shortened names)
 */
export const PERIOD_LEGEND = [
  { name: "Begin", color: 'rgba(100, 149, 237, 0.3)' },
  { name: "Accel", color: 'rgba(255, 165, 0, 0.3)' },
  { name: "Terror", color: 'rgba(255, 0, 0, 0.3)' },
  { name: "Arrest", color: 'rgba(220, 20, 60, 0.3)' },
  { name: "Prison", color: 'rgba(128, 0, 128, 0.3)' },
  { name: "Post", color: 'rgba(34, 139, 34, 0.3)' }
]; 