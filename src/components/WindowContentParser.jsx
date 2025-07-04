import React from 'react';

const WindowContentParser = ({ content }) => {
  // Si c'est déjà un composant React, on le retourne tel quel
  if (React.isValidElement(content)) {
    return content;
  }

  // Si c'est un objet avec des propriétés spéciales
  if (typeof content === 'object' && content.type) {
    return parseContentObject(content);
  }

  // Si c'est une string, on la parse
  if (typeof content === 'string') {
    return parseStringContent(content);
  }

  return <div>{content}</div>;
};

const parseContentObject = (contentObj) => {
  switch (contentObj.type) {
    case 'mixed':
      return (
        <div>
          {contentObj.elements.map((element, index) => (
            <div key={index}>
              <WindowContentParser content={element} />
            </div>
          ))}
        </div>
      );

    case 'image':
      return (
        <div style={{ textAlign: contentObj.align || 'center', margin: '10px 0' }}>
          <img
            src={contentObj.src}
            alt={contentObj.alt || 'Image'}
            style={{
              maxWidth: contentObj.maxWidth || '100%',
              height: contentObj.height || 'auto',
              border: contentObj.border ? '1px solid #ffffff' : 'none',
              filter: contentObj.blackAndWhite ? 'grayscale(100%)' : 'none'
            }}
          />
          {contentObj.caption && (
            <div style={{ 
              fontSize: '10px', 
              fontStyle: 'italic', 
              marginTop: '5px',
              color: '#cccccc'
            }}>
              {contentObj.caption}
            </div>
          )}
        </div>
      );

    case 'text':
      return (
        <div style={{ 
          fontSize: contentObj.size || '12px',
          fontWeight: contentObj.bold ? 'bold' : 'normal',
          fontStyle: contentObj.italic ? 'italic' : 'normal',
          textAlign: contentObj.align || 'left',
          color: contentObj.color || '#ffffff',
          margin: '5px 0'
        }}>
          {contentObj.content}
        </div>
      );

    case 'title':
      const TitleTag = contentObj.level ? `h${contentObj.level}` : 'h3';
      return React.createElement(TitleTag, {
        style: { 
          marginTop: contentObj.marginTop || 0,
          color: '#ffffff',
          fontSize: contentObj.size || 'inherit'
        }
      }, contentObj.content);

    case 'list':
      const ListTag = contentObj.ordered ? 'ol' : 'ul';
      return React.createElement(ListTag, {
        style: { color: '#ffffff', margin: '10px 0' }
      }, contentObj.items.map((item, index) => (
        <li key={index}>{item}</li>
      )));

    case 'separator':
      return (
        <hr style={{
          border: 'none',
          borderTop: '1px solid #ffffff',
          margin: '15px 0',
          opacity: 0.5
        }} />
      );

    case 'code':
      return (
        <pre style={{
          backgroundColor: '#333333',
          color: '#ffffff',
          padding: '10px',
          border: '1px solid #ffffff',
          fontFamily: 'monospace',
          fontSize: '11px',
          overflow: 'auto',
          margin: '10px 0'
        }}>
          {contentObj.content}
        </pre>
      );

    default:
      return <div>{JSON.stringify(contentObj)}</div>;
  }
};

const parseStringContent = (str) => {
  // Parsing simple de balises custom
  const parts = str.split(/(\[img:.*?\]|\[title:.*?\]|\[separator\])/g);
  
  return (
    <div>
      {parts.map((part, index) => {
        if (part.startsWith('[img:')) {
          const imgData = part.slice(5, -1); // Enlève [img: et ]
          const [src, ...options] = imgData.split('|');
          const opts = {};
          
          options.forEach(opt => {
            const [key, value] = opt.split('=');
            if (key && value) opts[key] = value;
          });

          return (
            <div key={index} style={{ textAlign: 'center', margin: '10px 0' }}>
              <img
                src={src.trim()}
                alt={opts.alt || 'Image'}
                style={{
                  maxWidth: opts.width || '100%',
                  height: opts.height || 'auto',
                  border: '1px solid #ffffff',
                  filter: 'grayscale(100%)'
                }}
              />
              {opts.caption && (
                <div style={{ 
                  fontSize: '10px', 
                  fontStyle: 'italic', 
                  marginTop: '5px',
                  color: '#cccccc'
                }}>
                  {opts.caption}
                </div>
              )}
            </div>
          );
        }
        
        if (part.startsWith('[title:')) {
          const title = part.slice(7, -1);
          return <h3 key={index} style={{ color: '#ffffff', marginTop: 0 }}>{title}</h3>;
        }
        
        if (part === '[separator]') {
          return <hr key={index} style={{
            border: 'none',
            borderTop: '1px solid #ffffff',
            margin: '15px 0',
            opacity: 0.5
          }} />;
        }
        
        // Texte normal
        return part.split('\n').map((line, lineIndex) => (
          <div key={`${index}-${lineIndex}`} style={{ color: '#ffffff' }}>
            {line}
          </div>
        ));
      })}
    </div>
  );
};

export default WindowContentParser; 