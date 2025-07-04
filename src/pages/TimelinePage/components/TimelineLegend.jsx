import React from 'react';
import { Typography, Box, Checkbox, FormControlLabel } from '@mui/material';
import { BASE_THEMATIC_COLORS } from '../../Game/constants/thematicColors';
import { THEMATIC_GROUP_MAPPING, ENGLISH_GROUP_NAMES, EVENT_TYPES, PERIOD_LEGEND } from '../constants/timelinePeriods';
import { processFilesData, createFileColorScale } from '../utils/timelineUtils';

/**
 * Timeline Legend Component
 * Displays all legends on a single line with controls
 */
const TimelineLegend = ({ 
  data, 
  files,
  showPersonas, 
  setShowPersonas, 
  showEvents, 
  setShowEvents, 
  showBackgrounds, 
  setShowBackgrounds,
  showFiles,
  setShowFiles
}) => {
  // Process files data to get categories
  const filesWithDates = files ? processFilesData(files) : [];
  const fileColorScale = createFileColorScale();
  const fileCategories = [...new Set(filesWithDates.map(f => f.category))];

  return (
    <>
      {/* Title */}
      <Box sx={{ mb: 1 }}>
        <Typography variant="h5" sx={{ 
          fontSize: '1rem', 
          fontWeight: 'bold', 
          color: '#ffffff',
          mb: 1,
          textAlign: 'left'
        }}>
          Joshua Life Timeline
        </Typography>
      </Box>
      
      {/* All legends on single line */}
      <Box sx={{ mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
          {/* Thematic groups */}
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.8rem' }}>
                Groups:
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={showPersonas}
                    onChange={(e) => setShowPersonas(e.target.checked)}
                    size="small"
                    sx={{ 
                      color: 'white', 
                      '&.Mui-checked': { color: '#4ecdc4' },
                      '& .MuiSvgIcon-root': { fontSize: 16 }
                    }}
                  />
                }
                label=""
                sx={{ m: 0, ml: -0.5 }}
              />
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {[...new Set(data.map(d => d.thematicGroup))].map((group) => {
                const mappedGroup = THEMATIC_GROUP_MAPPING[group] || group;
                const displayName = ENGLISH_GROUP_NAMES[group] || group;
                
                return (
                  <Box key={group} sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        backgroundColor: BASE_THEMATIC_COLORS[mappedGroup] || '#666666',
                        opacity: 0.7,
                        borderRadius: 0.25
                      }}
                    />
                    <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>{displayName}</Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>

          {/* Separator 1 */}
          <Box sx={{ 
            width: '1px', 
            height: '35px', 
            backgroundColor: 'rgba(255,255,255,0.15)', 
            alignSelf: 'center',
            mx: 0.5
          }} />

          {/* Timeline events */}
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.8rem' }}>
                Events:
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={showEvents}
                    onChange={(e) => setShowEvents(e.target.checked)}
                    size="small"
                    sx={{ 
                      color: 'white', 
                      '&.Mui-checked': { color: '#ff6b6b' },
                      '& .MuiSvgIcon-root': { fontSize: 16 }
                    }}
                  />
                }
                label=""
                sx={{ m: 0, ml: -0.5 }}
              />
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {EVENT_TYPES.map((eventType) => (
                <Box key={eventType.type} sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      backgroundColor: eventType.color,
                      opacity: 0.7,
                      borderRadius: 0.25
                    }}
                  />
                  <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>{eventType.label}</Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Separator 2 */}
          <Box sx={{ 
            width: '1px', 
            height: '35px', 
            backgroundColor: 'rgba(255,255,255,0.15)', 
            alignSelf: 'center',
            mx: 0.5
          }} />

          {/* Files */}
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.8rem' }}>
                Files:
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={showFiles}
                    onChange={(e) => setShowFiles(e.target.checked)}
                    size="small"
                    sx={{ 
                      color: 'white', 
                      '&.Mui-checked': { color: '#e74c3c' },
                      '& .MuiSvgIcon-root': { fontSize: 16 }
                    }}
                  />
                }
                label=""
                sx={{ m: 0, ml: -0.5 }}
              />
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {fileCategories.map((category) => (
                <Box key={category} sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      backgroundColor: fileColorScale(category),
                      opacity: 0.8,
                      borderRadius: '50%'
                    }}
                  />
                  <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>{category}</Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Separator 3 */}
          <Box sx={{ 
            width: '1px', 
            height: '35px', 
            backgroundColor: 'rgba(255,255,255,0.15)', 
            alignSelf: 'center',
            mx: 0.5
          }} />

          {/* Life periods */}
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.8rem' }}>
                Periods:
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={showBackgrounds}
                    onChange={(e) => setShowBackgrounds(e.target.checked)}
                    size="small"
                    sx={{ 
                      color: 'white', 
                      '&.Mui-checked': { color: '#96ceb4' },
                      '& .MuiSvgIcon-root': { fontSize: 16 }
                    }}
                  />
                }
                label=""
                sx={{ m: 0, ml: -0.5 }}
              />
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {PERIOD_LEGEND.map((period) => (
                <Box key={period.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      backgroundColor: period.color,
                      border: `1px dashed ${period.color.replace('0.3', '0.6')}`,
                      borderRadius: 0.25
                    }}
                  />
                  <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>{period.name}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default TimelineLegend; 