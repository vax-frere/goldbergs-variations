import { useState, useEffect } from 'react';
import { getDataPath } from '../../../utils/assetLoader';

/**
 * Custom hook to load and manage timeline data
 * @returns {Object} Hook return object with data, events, files, loading state
 */
export const useTimelineData = () => {
  const [data, setData] = useState(null);
  const [events, setEvents] = useState(null);
  const [files, setFiles] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load JSON data in parallel - using full database with posts for frequency curves
    Promise.all([
      fetch(getDataPath('database.data.json')).then(response => response.json()),
      fetch(getDataPath('timeline.data.json')).then(response => response.json()),
      fetch(getDataPath('timeline_files.data.json')).then(response => response.json())
    ])
      .then(([personas, timelineEvents, timelineFiles]) => {
        // Filter personas that have timeRanges
        const personasWithTimeRanges = personas.filter(p => p.timeRanges && p.timeRanges.length > 0);
        setData(personasWithTimeRanges);
        setEvents(timelineEvents);
        setFiles(timelineFiles);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading data:', error);
        setLoading(false);
      });
  }, []);

  return { data, events, files, loading };
}; 