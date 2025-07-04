import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Box } from '@mui/material';
import { BASE_THEMATIC_COLORS } from '../../Game/constants/thematicColors';
import { 
  processPersonaData, 
  processEventsData, 
  processFilesData,
  calculateDateBoundaries, 
  createScales, 
  createColorScale, 
  createEventColorScale,
  createFileColorScale
} from '../utils/timelineUtils';
import { createLifePeriods, THEMATIC_GROUP_MAPPING } from '../constants/timelinePeriods';

/**
 * Timeline Visualization Component
 * Contains all D3 logic for rendering the timeline
 */
const TimelineVisualization = ({ 
  data, 
  events, 
  files,
  showPersonas, 
  showEvents, 
  showBackgrounds,
  showFiles
}) => {
  const svgRef = useRef();

  useEffect(() => {
    if (!data || data.length === 0 || !events) return;

    // Clear previous SVG
    d3.select(svgRef.current).selectAll("*").remove();

    // Create tooltip
    const tooltip = d3.select('body').selectAll('.timeline-tooltip')
      .data([0])
      .enter()
      .append('div')
      .attr('class', 'timeline-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('padding', '8px')
      .style('border-radius', '4px')
      .style('font-size', '12px')
      .style('font-family', 'Arial, sans-serif')
      .style('pointer-events', 'none')
      .style('z-index', '1000');

    // Dimensions - use more available space
    const margin = { top: 20, right: 30, bottom: 40, left: 30 };
    const containerWidth = window.innerWidth - 100; // Dynamic width based on window
    const width = Math.max(1200, containerWidth) - margin.left - margin.right;
    const height = Math.max(600, data.length * 20) - margin.bottom - margin.top;

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.bottom + margin.top);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Process data
    const dataWithDates = processPersonaData(data);
    const eventsWithDates = processEventsData(events);
    const filesWithDates = files ? processFilesData(files) : [];
    
    // Calculate date boundaries
    const { minDate, maxDate } = calculateDateBoundaries(dataWithDates, eventsWithDates, filesWithDates);
    
    // Create scales
    const { xScale, yScale } = createScales(minDate, maxDate, width, height, dataWithDates);
    
    // Create life periods
    const lifePeriods = createLifePeriods(minDate, maxDate);
    
    // Create color scales
    const colorScale = createColorScale(dataWithDates, THEMATIC_GROUP_MAPPING, BASE_THEMATIC_COLORS);
    const eventColorScale = createEventColorScale();
    const fileColorScale = createFileColorScale();

    // Zoom and pan configuration
    const zoom = d3.zoom()
      .scaleExtent([1.0, 5]) // Zoom from 100% (no unzoom below initial) to 500%
      .translateExtent([[0, 0], [width + margin.left + margin.right, height + margin.top + margin.bottom]]) // Pan limits for full SVG
      .on('zoom', function(event) {
        const { transform } = event;
        
        // Update X scale with transformation
        const newXScale = transform.rescaleX(xScale);
        
        // Update X axis
        g.select('.x-axis').call(d3.axisBottom(newXScale).tickFormat(d3.timeFormat('%Y')));
        
        // Update all elements that depend on xScale
        updateVisualization(newXScale);
      });

    // Apply zoom to SVG to avoid conflicts with group translation
    svg.call(zoom);

    // Function to update visualization with new scale
    function updateVisualization(newXScale) {
      // Update layer visibility
      g.select('.persona-layer').style('display', showPersonas ? 'block' : 'none');
      g.select('.events').style('display', showEvents ? 'block' : 'none');
      g.select('.files').style('display', showFiles ? 'block' : 'none');
      g.selectAll('.period-background').style('display', showBackgrounds ? 'block' : 'none');
      
      // Update period background zones
      g.selectAll('.period-background')
        .attr('x', d => Math.round(Math.max(0, newXScale(d.startDate))))
        .attr('width', d => {
          const startX = Math.round(Math.max(0, newXScale(d.startDate)));
          const endX = Math.round(Math.min(width, newXScale(d.endDate)));
          return Math.max(0, endX - startX);
        });

      // Update event lines
      g.selectAll('.event-line')
        .attr('x1', d => Math.round(newXScale(d.eventDate)))
        .attr('x2', d => Math.round(newXScale(d.eventDate)));

      // Update event label outlines
      g.selectAll('.event-label-outline')
        .attr('x', d => Math.round(newXScale(d.eventDate)) + 8);

      // Update event labels
      g.selectAll('.event-label')
        .attr('x', d => Math.round(newXScale(d.eventDate)) + 8);

      // Update period event rectangles
      g.selectAll('.period-event-rect')
        .attr('x', d => Math.round(newXScale(d.eventStartDate)))
        .attr('width', d => Math.max(2, Math.round(newXScale(d.eventEndDate)) - Math.round(newXScale(d.eventStartDate))));

      // Update period event labels
      g.selectAll('.period-event-label')
        .attr('x', d => {
          const x1 = Math.round(newXScale(d.eventStartDate));
          const x2 = Math.round(newXScale(d.eventEndDate));
          return x1 + (x2 - x1) / 2;
        });

      // Update file points
      g.selectAll('.file-point')
        .attr('cx', d => Math.round(newXScale(d.fileDate)));

      // Update persona segments
      g.selectAll('.timeline-segment')
        .attr('x', d => Math.round(newXScale(d.startDate)))
        .attr('width', d => Math.max(2, Math.round(newXScale(d.endDate)) - Math.round(newXScale(d.startDate))));

      // Update frequency curves and areas
      g.selectAll('.persona-group').each(function(persona, personaIndex) {
        const group = d3.select(this);
        
        // Update frequency curves
        group.selectAll('.frequency-curve')
          .attr('d', function() {
            const timeRange = d3.select(this).datum();
            if (!timeRange || !timeRange.frequencies || timeRange.frequencies.length === 0) return null;
            
            const rectWidth = Math.max(2, Math.round(newXScale(timeRange.endDate)) - Math.round(newXScale(timeRange.startDate)));
            const rectHeight = yScale.bandwidth() - 2; // Match the reduced rectangle height
            const rectY = yScale(personaIndex) + 1; // Match the centered rectangle position
            
            if (rectWidth > 10) { // Show curves for segments wider than 10px
              const line = d3.line()
                .x(d => Math.round(newXScale(timeRange.startDate)) + (d.normalizedX * rectWidth))
                .y(d => rectY + rectHeight - (d.normalizedY * rectHeight * 0.8))
                .curve(d3.curveCardinal.tension(0.3));
              return line(timeRange.frequencies);
            }
            return null;
          });

        // Update frequency areas
        group.selectAll('.frequency-area')
          .attr('d', function() {
            const timeRange = d3.select(this).datum();
            if (!timeRange || !timeRange.frequencies || timeRange.frequencies.length === 0) return null;
            
            const rectWidth = Math.max(2, newXScale(timeRange.endDate) - newXScale(timeRange.startDate));
            const rectHeight = yScale.bandwidth() - 2; // Match the reduced rectangle height
            const rectY = yScale(personaIndex) + 1; // Match the centered rectangle position
            
            if (rectWidth > 30) {
              const area = d3.area()
                .x(d => newXScale(timeRange.startDate) + (d.normalizedX * rectWidth))
                .y0(rectY + rectHeight)
                .y1(d => rectY + rectHeight - (d.normalizedY * rectHeight * 0.8))
                .curve(d3.curveCardinal.tension(0.3));
              return area(timeRange.frequencies);
            }
            return null;
          });
      });

      // Update persona labels
      g.selectAll('.persona-label')
        .attr('x', d => {
          const firstSegment = d.timeRangesWithDates[0];
          return newXScale(firstSegment.startDate) - 8;
        });

      // Update event lines and labels
      g.selectAll('.event-line')
        .attr('x1', d => newXScale(d.eventDate))
        .attr('x2', d => newXScale(d.eventDate));

      g.selectAll('.event-label-outline, .event-label')
        .attr('x', d => newXScale(d.eventDate) + 8);

      // Update period event rectangles and labels
      g.selectAll('.period-event-rect')
        .attr('x', d => newXScale(d.eventStartDate))
        .attr('width', d => Math.max(2, newXScale(d.eventEndDate) - newXScale(d.eventStartDate)));

      g.selectAll('.period-event-label')
        .attr('x', d => {
          const x1 = newXScale(d.eventStartDate);
          const x2 = newXScale(d.eventEndDate);
          return x1 + (x2 - x1) / 2;
        });

      // Update post counts
      g.selectAll('.post-count')
        .attr('x', function() {
          const persona = d3.select(this.parentNode).datum();
          const firstTimeRange = persona.timeRangesWithDates[0];
          if (firstTimeRange) {
            const rectWidth = Math.max(2, newXScale(firstTimeRange.endDate) - newXScale(firstTimeRange.startDate));
            return rectWidth > 50 ? newXScale(firstTimeRange.startDate) + 5 : null;
          }
          return null;
        })
        .text(function() {
          const persona = d3.select(this.parentNode).datum();
          const firstTimeRange = persona.timeRangesWithDates[0];
          if (firstTimeRange) {
            const rectWidth = Math.max(2, newXScale(firstTimeRange.endDate) - newXScale(firstTimeRange.startDate));
            return rectWidth > 50 ? persona.totalPosts : '';
          }
          return '';
        })
        .style('display', function() {
          const persona = d3.select(this.parentNode).datum();
          const firstTimeRange = persona.timeRangesWithDates[0];
          if (firstTimeRange) {
            const rectWidth = Math.max(2, newXScale(firstTimeRange.endDate) - newXScale(firstTimeRange.startDate));
            return rectWidth > 50 ? 'block' : 'none';
          }
          return 'none';
        });
    }

    // X axis (time)
    const xAxis = d3.axisBottom(xScale)
      .tickFormat(d3.timeFormat('%Y'));

    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${height})`)
      .call(xAxis)
      .selectAll('text')
      .style('text-anchor', 'middle')
      .attr('dy', '1.2em')
      .style('fill', '#ffffff')
      .style('font-size', '16px');

    // Style axis lines
    g.selectAll('.domain, .tick line')
      .style('stroke', '#ffffff');

    // LAYER 1: Background zones for major periods (background)
    const periodBackgrounds = g.selectAll('.period-background')
      .data(lifePeriods)
      .enter()
      .append('rect')
      .attr('class', 'period-background')
      .attr('x', 0) // Will be set by updateVisualization
      .attr('y', 0)
      .attr('width', 0) // Will be set by updateVisualization
      .attr('height', height)
      .attr('fill', d => d.color)
      .style('display', showBackgrounds ? 'block' : 'none');

    // Zebra striping for alternating persona lines (subtle background)
    const zebraStripes = g.selectAll('.zebra-stripe')
      .data(dataWithDates.filter((d, i) => i % 2 === 1)) // Only odd lines
      .enter()
      .append('rect')
      .attr('class', 'zebra-stripe')
      .attr('x', 0)
      .attr('y', (d, i) => yScale((i * 2) + 1)) // Position on odd indices
      .attr('width', width)
      .attr('height', yScale.bandwidth())
      .attr('fill', 'rgba(255, 255, 255, 0.03)') // Very subtle white background
      .attr('opacity', 0.8);

    // LAYER 2: Events
    const eventsGroup = g.append('g')
      .attr('class', 'events')
      .style('display', showEvents ? 'block' : 'none');

    // Sort events by date for proper chronological ordering
    const sortedEvents = eventsWithDates.filter(e => e.eventDate).sort((a, b) => a.eventDate - b.eventDate);

    // Event vertical lines (point events)
    const eventLines = eventsGroup.selectAll('.event-line')
      .data(sortedEvents)
      .enter()
      .append('line')
      .attr('class', 'event-line')
      .attr('x1', 0) // Will be set by updateVisualization
      .attr('x2', 0) // Will be set by updateVisualization
      .attr('y1', 0)
      .attr('y2', height)
      .attr('stroke', d => eventColorScale(d.type))
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5')
      .attr('opacity', 0.8);

    // Event labels (point events) - positioned on alternating persona lines
    // First create the text outline (border effect)
    const eventLabelOutlines = eventsGroup.selectAll('.event-label-outline')
      .data(sortedEvents)
      .enter()
      .append('text')
      .attr('class', 'event-label-outline')
      .attr('x', 0) // Will be set by updateVisualization
      .attr('y', (d, i) => {
        // Position on alternating persona lines (every 2 lines), starting from top
        const lineIndex = (i * 2) % dataWithDates.length;
        return yScale(lineIndex) + yScale.bandwidth() / 2;
      })
      .attr('dy', '0.35em')
      .attr('fill', 'none')
      .attr('stroke', 'rgba(0, 0, 0, 0.4)') // Semi-transparent white border
      .attr('stroke-width', '2px')
      .style('font-size', '11px')
      .style('font-weight', 'bold')
      .style('text-anchor', 'start')
      .text(d => d.name);
    
    // Then create the main text on top
    const eventLabels = eventsGroup.selectAll('.event-label')
      .data(sortedEvents)
      .enter()
      .append('text')
      .attr('class', 'event-label')
      .attr('x', 0) // Will be set by updateVisualization
      .attr('y', (d, i) => {
        // Position on alternating persona lines (every 2 lines), starting from top
        const lineIndex = (i * 2) % dataWithDates.length;
        return yScale(lineIndex) + yScale.bandwidth() / 2;
      })
      .attr('dy', '0.35em')
      .attr('fill', d => eventColorScale(d.type)) // Use event color instead of white
      .style('font-size', '11px')
      .style('font-weight', 'bold')
      .style('text-anchor', 'start') // Left-aligned from the x position
      .text(d => d.name);

    // Period events (with start and end dates)
    const periodEventRects = eventsGroup.selectAll('.period-event-rect')
      .data(eventsWithDates.filter(e => e.eventStartDate && e.eventEndDate))
      .enter()
      .append('rect')
      .attr('class', 'period-event-rect')
      .attr('x', 0) // Will be set by updateVisualization
      .attr('y', height - 10)
      .attr('width', 0) // Will be set by updateVisualization
      .attr('height', 10)
      .attr('fill', d => eventColorScale(d.type))
      .attr('opacity', 0.7);

    const periodEventLabels = eventsGroup.selectAll('.period-event-label')
      .data(eventsWithDates.filter(e => e.eventStartDate && e.eventEndDate))
      .enter()
      .append('text')
      .attr('class', 'period-event-label')
      .attr('x', 0) // Will be set by updateVisualization
      .attr('y', height - 12)
      .attr('fill', '#ffffff')
      .style('font-size', '10px')
      .style('text-anchor', 'middle')
      .text(d => d.name);

    // LAYER 2.5: Files
    const filesGroup = g.append('g')
      .attr('class', 'files')
      .style('display', showFiles ? 'block' : 'none');

    // File points (circles) - distributed across persona lines
    const filePoints = filesGroup.selectAll('.file-point')
      .data(filesWithDates)
      .enter()
      .append('circle')
      .attr('class', 'file-point')
      .attr('cx', 0) // Will be set by updateVisualization
      .attr('cy', (d, i) => {
        // Distribute files cyclically across persona lines
        const personaIndex = i % dataWithDates.length;
        return yScale(personaIndex) + yScale.bandwidth() / 2;
      })
      .attr('r', 6) // Larger radius for easier clicking
      .attr('fill', d => fileColorScale(d.category))
      .attr('opacity', 0.9)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        // Show tooltip
        const tooltipContent = `
          <strong>${d.title}</strong><br/>
          <strong>Category:</strong> ${d.category}<br/>
          <strong>Date:</strong> ${d.fileDate.toLocaleDateString()}<br/>
          <strong>Click to open</strong>
        `;
        
        tooltip
          .style('visibility', 'visible')
          .html(tooltipContent)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mousemove', function(event) {
        // Follow mouse
        tooltip
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', function() {
        // Hide tooltip
        tooltip.style('visibility', 'hidden');
      })
      .on('click', function(event, d) {
        // Open the file URL in a new tab
        window.open(d.url, '_blank');
      });

    // LAYER 3: Timeline personas (foreground)
    const personaLayer = g.append('g')
      .attr('class', 'persona-layer')
      .style('display', showPersonas ? 'block' : 'none');

    // Create persona groups
    const personaGroups = personaLayer.selectAll('.persona-group')
      .data(dataWithDates)
      .enter()
      .append('g')
      .attr('class', 'persona-group');

    // Timeline segments for each persona's time ranges
    personaGroups.each(function(persona, personaIndex) {
      const group = d3.select(this);

      // Create segments for each time range
      const segments = group.selectAll('.timeline-segment')
        .data(persona.timeRangesWithDates)
        .enter()
        .append('rect')
        .attr('class', 'timeline-segment')
        .attr('x', 0) // Will be set by updateVisualization
        .attr('y', yScale(personaIndex) + 1) // Offset by 1px for centering
        .attr('width', 0) // Will be set by updateVisualization
        .attr('height', yScale.bandwidth() - 2) // Reduce height by 2px (1px each side)
        .attr('fill', colorScale(persona.thematicGroup))
        .attr('opacity', 0.8)
        .on('mouseover', function(event, d) {
          // Show tooltip
          const tooltipContent = `
            <strong>${persona.displayName}</strong><br/>
            <strong>Group:</strong> ${persona.thematicGroup}<br/>
            <strong>Period:</strong> ${d.startDate.toLocaleDateString()} - ${d.endDate.toLocaleDateString()}<br/>
            <strong>Duration:</strong> ${Math.round((d.endDate - d.startDate) / (1000 * 60 * 60 * 24))} days<br/>
            <strong>Total Posts:</strong> ${persona.totalPosts}
          `;
          
          tooltip
            .style('visibility', 'visible')
            .html(tooltipContent)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
        })
        .on('mousemove', function(event) {
          // Follow mouse
          tooltip
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', function() {
          // Hide tooltip
          tooltip.style('visibility', 'hidden');
        });

      // Add frequency curves to segments (if data exists and segment is wide enough)
      persona.timeRangesWithDates.forEach(timeRange => {
        if (timeRange.frequencies && timeRange.frequencies.length > 0) {
          const rectHeight = yScale.bandwidth() - 2; // Match the reduced rectangle height
          const rectY = yScale(personaIndex) + 1; // Match the centered rectangle position

          // Create placeholders - will be updated by updateVisualization
          // Add area first (behind the line)
          group.append('path')
            .datum(timeRange)
            .attr('class', 'frequency-area')
            .attr('d', null) // Will be set by updateVisualization
            .attr('fill', 'rgba(255, 255, 255, 0.1)')
            .attr('opacity', 0.6);

          // Add line
          group.append('path')
            .datum(timeRange)
            .attr('class', 'frequency-curve')
            .attr('d', null) // Will be set by updateVisualization
            .attr('fill', 'none')
            .attr('stroke', 'rgba(255, 255, 255, 0.6)')
            .attr('stroke-width', 1.5)
            .attr('opacity', 0.8);
        }
      });

      // Persona name (left side, first segment only)
      const firstSegment = persona.timeRangesWithDates[0];
      if (firstSegment) {
        group.append('text')
          .attr('class', 'persona-label')
          .attr('x', 0) // Will be set by updateVisualization
          .attr('y', yScale(personaIndex) + yScale.bandwidth() / 2)
          .attr('dy', '0.35em')
          .attr('fill', '#ffffff')
          .style('font-size', '11px')
          .style('font-weight', 'bold')
          .style('text-anchor', 'end')
          .text(persona.displayName);

        // Post count (only for first segment if wide enough)
        group.append('text')
          .attr('class', 'post-count')
          .attr('x', 0) // Will be set by updateVisualization
          .attr('y', yScale(personaIndex) + yScale.bandwidth() / 2)
          .attr('dy', '0.35em')
          .attr('fill', '#ffffff')
          .style('font-size', '10px')
          .style('font-weight', 'bold')
          .text('') // Will be set by updateVisualization
          .style('display', 'none'); // Will be set by updateVisualization
      }
    });

    // Initial positioning - use identity transform to avoid offset
    updateVisualization(xScale);

    // Cleanup function
    return () => {
      d3.select('body').selectAll('.timeline-tooltip').remove();
    };

  }, [data, events, files, showPersonas, showEvents, showBackgrounds, showFiles]);

  return (
    <Box sx={{ 
      overflowX: 'auto',
      width: '100%',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 1,
      p: 1
    }}>
      <svg ref={svgRef}></svg>
    </Box>
  );
};

export default TimelineVisualization; 