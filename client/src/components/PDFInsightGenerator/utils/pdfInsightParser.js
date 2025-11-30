export const parsePDFInsights = (text) => {
  if (!text || typeof text !== "string") {
    return {
      sections: [],
      metadata: [],
      introText: "",
    };
  }

  const sections = [];
  const metadata = [];
  let introText = "";

  const sectionRegex = /SECTION:\s*([^\n]+)\s*\n([\s\S]*?)(?=\n\s*SECTION:|$)/gi;
  let sectionMatch;

  while ((sectionMatch = sectionRegex.exec(text)) !== null) {
    const sectionName = sectionMatch[1].trim();
    const sectionContent = sectionMatch[2].trim();

    const content = parseSectionContent(sectionContent);

    sections.push({
      name: sectionName,
      content: content,
      text: sectionContent,
    });
  }

  if (sections.length === 0) {
    const lines = text.split("\n").filter((line) => line.trim());
    introText = lines.slice(0, 3).join(" ");

    const content = parseSectionContent(text);
    if (content.length > 0) {
      sections.push({
        name: "Overview",
        content: content,
        text: text,
      });
    }
  }

  return {
    sections,
    metadata,
    introText,
  };
};

const parseSectionContent = (text) => {
  const content = [];
  const lines = text.split("\n").map((line) => line.trim()).filter((line) => line);

  for (const line of lines) {
    if (line.match(/^[-•*]\s+/)) {
      content.push({
        type: "bullet",
        text: line.replace(/^[-•*]\s+/, ""),
      });
    } else if (line.includes(":")) {
      const colonIndex = line.indexOf(":");
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();

      if (key && value) {
        content.push({
          type: "keyValue",
          key: key,
          value: value,
        });
      } else {
        content.push({
          type: "text",
          text: line,
        });
      }
    } else {
      content.push({
        type: "text",
        text: line,
      });
    }
  }

  return content;
};

