import React, { useState } from 'react';
import { Container, CircularProgress } from '@mui/material';
import { useTimelineData } from './hooks/useTimelineData';
import { TimelineLegend, TimelineVisualization } from './components';

/**
 * Main Timeline Page Component
 * Manages state and orchestrates child components
 */
function TimelinePage() {
  // Load data using custom hook
  const { data, events, files, loading } = useTimelineData();
  
  // États pour contrôler la visibilité des layers
  const [showPersonas, setShowPersonas] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [showBackgrounds, setShowBackgrounds] = useState(true);
  const [showFiles, setShowFiles] = useState(true);

  if (loading || !data || !events) {
    return (
      <Container maxWidth={false} sx={{ 
        minHeight: '100vh', 
        backgroundColor: '#1a1a1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <CircularProgress sx={{ color: '#ffffff' }} />
      </Container>
    );
  }

  return (
    <Container maxWidth={false} sx={{ 
      minHeight: '100vh', 
      backgroundColor: '#1a1a1a',
      color: '#ffffff',
      py: 2
    }}>
      {/* Legend Component */}
      <TimelineLegend 
        data={data}
        files={files}
        showPersonas={showPersonas}
        setShowPersonas={setShowPersonas}
        showEvents={showEvents}
        setShowEvents={setShowEvents}
        showBackgrounds={showBackgrounds}
        setShowBackgrounds={setShowBackgrounds}
        showFiles={showFiles}
        setShowFiles={setShowFiles}
      />
      
      {/* Visualization Component */}
      <TimelineVisualization 
        data={data}
        events={events}
        files={files}
        showPersonas={showPersonas}
        showEvents={showEvents}
        showBackgrounds={showBackgrounds}
        showFiles={showFiles}
      />
    </Container>
  );
}

export default TimelinePage; 