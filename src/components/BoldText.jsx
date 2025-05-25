import React from "react";

const BoldText = ({ text }) => {
  // Split the text by the custom tags <b> and </b>
  const parts = text.split(/(<b>.*?<\/b>)/g);

  return (
    <>
      {parts.map((part, index) => {
        // Check if the part is wrapped in <b> tags
        if (part.startsWith("<b>") && part.endsWith("</b>")) {
          // Remove the tags and render the content in bold
          const boldContent = part.slice(3, -4); // Remove <b> and </b>
          return <strong key={index}>{boldContent}</strong>;
        }
        // Return regular text
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </>
  );
};

export default BoldText;
