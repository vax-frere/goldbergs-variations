import * as d3 from 'd3';

/**
 * Calculate posting frequency for a timeRange
 * @param {Object} persona - Persona object with posts
 * @param {Object} timeRange - Time range object
 * @param {number} numBins - Number of bins for frequency calculation
 * @returns {Array} Array of frequency data points
 */
export const calculatePostingFrequency = (persona, timeRange, numBins = 20) => {
  // Check if posts exist
  if (!persona.posts || !Array.isArray(persona.posts)) {
    return [];
  }

  // Filter posts within this timeRange
  const postsInRange = persona.posts.filter(post => 
    post.creationDate >= timeRange.firstPost && 
    post.creationDate <= timeRange.lastPost
  );

  if (postsInRange.length === 0) return [];

  // Create time bins
  const duration = timeRange.lastPost - timeRange.firstPost;
  const binSize = duration / numBins;
  const frequencies = [];

  for (let i = 0; i < numBins; i++) {
    const binStart = timeRange.firstPost + (i * binSize);
    const binEnd = timeRange.firstPost + ((i + 1) * binSize);
    const postsInBin = postsInRange.filter(post => 
      post.creationDate >= binStart && post.creationDate < binEnd
    ).length;
    
    frequencies.push({
      binIndex: i,
      timestamp: binStart + (binSize / 2), // Middle of bin
      count: postsInBin,
      normalizedX: i / (numBins - 1) // 0 to 1 for SVG positioning
    });
  }

  // Normalize frequencies to 0-1 range for Y positioning
  const maxCount = Math.max(...frequencies.map(f => f.count));
  if (maxCount > 0) {
    frequencies.forEach(f => {
      f.normalizedY = f.count / maxCount;
    });
  }

  return frequencies;
};

/**
 * Process persona data and convert timestamps to dates
 * @param {Array} data - Raw persona data
 * @returns {Array} Processed data with dates and frequencies
 */
export const processPersonaData = (data) => {
  return data.map(persona => ({
    ...persona,
    // Convert all timeRanges to dates
    timeRangesWithDates: persona.timeRanges.map((timeRange, rangeIndex) => {
      const frequencies = calculatePostingFrequency(persona, timeRange);
      return {
        rangeIndex,
        startDate: new Date(timeRange.firstPost * 1000),
        endDate: new Date(timeRange.lastPost * 1000),
        duration: timeRange.lastPost - timeRange.firstPost,
        frequencies // Add frequency data
      };
    }),
    // Global start date for sorting
    globalStartDate: new Date(Math.min(...persona.timeRanges.map(tr => tr.firstPost)) * 1000)
  })).sort((a, b) => a.globalStartDate - b.globalStartDate);
};

/**
 * Process events data and convert dates
 * @param {Array} events - Raw events data
 * @returns {Array} Processed events with proper date objects
 */
export const processEventsData = (events) => {
  return events.map(e => ({
    ...e,
    eventDate: e.date ? new Date(e.date) : null,
    eventStartDate: e.startDate ? new Date(e.startDate) : null,
    eventEndDate: e.endDate ? new Date(e.endDate) : null
  }));
};

/**
 * Calculate timeline date boundaries with margin
 * @param {Array} dataWithDates - Processed persona data
 * @param {Array} eventsWithDates - Processed events data
 * @param {Array} filesWithDates - Processed files data
 * @returns {Object} Object with minDate and maxDate
 */
export const calculateDateBoundaries = (dataWithDates, eventsWithDates, filesWithDates = []) => {
  const allDates = [
    ...dataWithDates.flatMap(d => d.timeRangesWithDates.map(tr => tr.startDate)),
    ...dataWithDates.flatMap(d => d.timeRangesWithDates.map(tr => tr.endDate)),
    ...eventsWithDates.filter(e => e.eventDate).map(e => e.eventDate),
    ...eventsWithDates.filter(e => e.eventStartDate).map(e => e.eventStartDate),
    ...eventsWithDates.filter(e => e.eventEndDate).map(e => e.eventEndDate),
    ...filesWithDates.filter(f => f.fileDate).map(f => f.fileDate)
  ];
  
  const dataMinDate = d3.min(allDates);
  const dataMaxDate = d3.max(allDates);
  
  // Add substantial margin to the timeline - extend by 2 years on each side
  const timelineMargin = 2 * 365 * 24 * 60 * 60 * 1000; // 2 years in milliseconds
  const minDate = new Date(dataMinDate.getTime() - timelineMargin);
  const maxDate = new Date(dataMaxDate.getTime() + timelineMargin);
  
  return { minDate, maxDate };
};

/**
 * Create D3 scales for the timeline
 * @param {Date} minDate - Minimum date
 * @param {Date} maxDate - Maximum date
 * @param {number} width - SVG width
 * @param {number} height - SVG height
 * @param {Array} dataWithDates - Processed persona data
 * @returns {Object} Object with xScale and yScale
 */
export const createScales = (minDate, maxDate, width, height, dataWithDates) => {
  const xScale = d3.scaleTime()
    .domain([minDate, maxDate])
    .range([0, width]);

  const yScale = d3.scaleBand()
    .domain(dataWithDates.map((d, i) => i))
    .range([0, height])
    .padding(0.05);

  return { xScale, yScale };
};

/**
 * Create color scale for thematic groups
 * @param {Array} dataWithDates - Processed persona data
 * @param {Object} thematicGroupMapping - Mapping object
 * @param {Object} BASE_THEMATIC_COLORS - Color constants
 * @returns {Function} D3 color scale function
 */
export const createColorScale = (dataWithDates, thematicGroupMapping, BASE_THEMATIC_COLORS) => {
  const thematicGroups = [...new Set(dataWithDates.map(d => d.thematicGroup))];
  return d3.scaleOrdinal()
    .domain(thematicGroups)
    .range(thematicGroups.map(group => {
      const mappedGroup = thematicGroupMapping[group] || group;
      return BASE_THEMATIC_COLORS[mappedGroup] || '#666666';
    }));
};

/**
 * Create event color scale
 * @returns {Function} D3 color scale function
 */
export const createEventColorScale = () => {
  return d3.scaleOrdinal()
    .domain(['legal', 'persona', 'activity', 'event'])
    .range(['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4']);
};

/**
 * Process files data and extract dates from filenames
 * @param {Array} files - Raw files data
 * @returns {Array} Processed files with proper date objects and categories
 */
export const processFilesData = (files) => {
  if (!files || !Array.isArray(files)) return [];

  return files.map(file => {
    // Extract date from filename format: MM-DD-YY_CATEGORY_TITLE.EXT
    const filename = file.name;
    const dateMatch = filename.match(/^(\d{2})-(\d{2})-(\d{2})_(.+)$/);
    
    if (dateMatch) {
      const [, month, day, year] = dateMatch;
      const fullYear = parseInt(year) < 50 ? 2000 + parseInt(year) : 1900 + parseInt(year); // Assume 00-49 is 2000s, 50-99 is 1900s
      const fileDate = new Date(fullYear, parseInt(month) - 1, parseInt(day));
      
      // Extract category from the part after the date
      const afterDate = dateMatch[4];
      const categoryMatch = afterDate.match(/^([^_]+)_/);
      const category = categoryMatch ? categoryMatch[1] : 'other';
      
      // Extract title (everything after category and before extension)
      const titleMatch = afterDate.match(/^[^_]+_(.+)\.[^.]+$/);
      const title = titleMatch ? titleMatch[1].replace(/-/g, ' ') : afterDate;
      
      return {
        ...file,
        fileDate,
        category,
        title,
        sortableDate: fileDate.getTime()
      };
    }
    
    // If date parsing fails, return null (will be filtered out)
    return null;
  }).filter(Boolean).sort((a, b) => a.sortableDate - b.sortableDate);
};

/**
 * Create file category color scale
 * @returns {Function} D3 color scale function
 */
export const createFileColorScale = () => {
  return d3.scaleOrdinal()
    .domain(['news', 'court-listener', 'interview', 'joshua-medium', 'trolling-consequences', 'others', 'ginger-gorman', 'elise-potaka-luke-mc-mahon', 'other'])
    .range(['#e74c3c', '#9b59b6', '#3498db', '#e67e22', '#f39c12', '#95a5a6', '#2ecc71', '#1abc9c', '#34495e']);
}; 