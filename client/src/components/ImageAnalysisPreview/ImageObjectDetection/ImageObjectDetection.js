import React, { useState, useMemo, useEffect, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckCircle, faEye } from "@fortawesome/free-solid-svg-icons";
import styles from "./ImageObjectDetection.module.css";

const ImageObjectDetection = ({
  data = {},
  rawText = "",
  imageUrl = null,
  imageFile = null,
}) => {
  const sections = data?.sections || [];
  const [selectedObject, setSelectedObject] = useState(null);
  const [visibleBoxes, setVisibleBoxes] = useState(new Set());
  const [imageDimensions, setImageDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [displayImageUrl, setDisplayImageUrl] = useState(imageUrl);
  const [imageRect, setImageRect] = useState({
    width: 0,
    height: 0,
    left: 0,
    top: 0,
  });
  const [cursorCoords, setCursorCoords] = useState({ x: null, y: null });
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const imageRef = React.useRef(null);
  const containerRef = React.useRef(null);

  useEffect(() => {
    if (imageUrl) {
      setDisplayImageUrl(imageUrl);
    } else if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setDisplayImageUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [imageUrl, imageFile]);

  useEffect(() => {
    const updateImageRect = () => {
      if (imageRef.current && containerRef.current) {
        const img = imageRef.current;
        const container = containerRef.current;

        const imgRect = img.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        setImageRect({
          width: imgRect.width,
          height: imgRect.height,
          left: imgRect.left - containerRect.left,
          top: imgRect.top - containerRect.top,
        });
      }
    };

    window.addEventListener("resize", updateImageRect);

    if (imageRef.current) {
      const timeout = setTimeout(updateImageRect, 100);
      const timeout2 = setTimeout(updateImageRect, 500);
      return () => {
        window.removeEventListener("resize", updateImageRect);
        clearTimeout(timeout);
        clearTimeout(timeout2);
      };
    }
  }, [displayImageUrl, imageDimensions]);

  const detectionsSection = sections.find(
    (section) =>
      section?.name?.toLowerCase().includes("object") ||
      section?.name?.toLowerCase().includes("detection")
  );

  const extractCoordinates = (text) => {
    if (!text) return { x: null, y: null, w: null, h: null };

    const patterns = [
      /Location:\s*x[=:]?\s*(\d+).*?y[=:]?\s*(\d+).*?w[=:]?\s*(\d+).*?h[=:]?\s*(\d+)/i,
      /x[=:]?\s*(\d+).*?y[=:]?\s*(\d+).*?w[=:]?\s*(\d+).*?h[=:]?\s*(\d+)/i,
      /x:\s*(\d+).*?y:\s*(\d+).*?w:\s*(\d+).*?h:\s*(\d+)/i,
      /(\d+)[,\s]+(\d+)[,\s]+(\d+)[,\s]+(\d+)/,
      /\[(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\]/,
      /\((\d+),\s*(\d+),\s*(\d+),\s*(\d+)\)/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return {
          x: parseInt(match[1]),
          y: parseInt(match[2]),
          w: parseInt(match[3]),
          h: parseInt(match[4]),
        };
      }
    }

    return { x: null, y: null, w: null, h: null };
  };

  const parseObjects = useCallback(() => {
    const objects = [];

    if (rawText) {
      try {
        let jsonText = rawText.trim();

        if (jsonText.startsWith("```")) {
          jsonText = jsonText
            .replace(/```json?/gi, "")
            .replace(/```/g, "")
            .trim();
        }

        let arrayStart = jsonText.indexOf("[");
        let arrayEnd = jsonText.lastIndexOf("]");

        if (arrayStart !== -1 && arrayEnd === -1) {
          const braceMatches = [];
          let depth = 0;
          let startPos = arrayStart;

          for (let i = arrayStart; i < jsonText.length; i++) {
            if (jsonText[i] === "{") {
              if (depth === 0) startPos = i;
              depth++;
            } else if (jsonText[i] === "}") {
              depth--;
              if (depth === 0) {
                braceMatches.push({ start: startPos, end: i + 1 });
              }
            }
          }

          if (braceMatches.length > 0) {
            const objectsStr = braceMatches
              .map((m) => jsonText.substring(m.start, m.end))
              .join(",");
            jsonText = "[" + objectsStr + "]";
            arrayStart = 0;
            arrayEnd = jsonText.length - 1;
          }
        }

        if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
          jsonText = jsonText.substring(arrayStart, arrayEnd + 1);

          const parsed = JSON.parse(jsonText);
          if (Array.isArray(parsed) && parsed.length > 0) {
            parsed.forEach((obj, idx) => {
              if (obj && obj.name && obj.x !== undefined && obj.x !== null) {
                objects.push({
                  id: idx,
                  label: obj.name,
                  confidence:
                    obj.confidence !== undefined
                      ? parseFloat(obj.confidence)
                      : null,
                  color: obj.color || null,
                  size: obj.size || null,
                  location: {
                    x: parseInt(obj.x),
                    y: parseInt(obj.y),
                    w: parseInt(obj.w),
                    h: parseInt(obj.h),
                  },
                  rawLocation: `x=${obj.x} y=${obj.y} w=${obj.w} h=${obj.h}`,
                });
              }
            });
            if (objects.length > 0) {
              return objects;
            }
          }
        }
      } catch (e) {
        try {
          const objectPattern =
            /\{"name":\s*"([^"]+)",\s*"confidence":\s*([\d.]+),\s*"color":\s*"([^"]+)",\s*"size":\s*"([^"]+)",\s*"x":\s*(\d+),\s*"y":\s*(\d+),\s*"w":\s*(\d+),\s*"h":\s*(\d+)\}/g;
          let match;
          let objIdx = 0;

          while ((match = objectPattern.exec(rawText)) !== null) {
            objects.push({
              id: objIdx++,
              label: match[1],
              confidence: parseFloat(match[2]),
              color: match[3],
              size: match[4],
              location: {
                x: parseInt(match[5]),
                y: parseInt(match[6]),
                w: parseInt(match[7]),
                h: parseInt(match[8]),
              },
              rawLocation: `x=${match[5]} y=${match[6]} w=${match[7]} h=${match[8]}`,
            });
          }

          if (objects.length > 0) {
            return objects;
          }
        } catch (regexError) {}
      }
    }

    if (detectionsSection?.items?.length) {
      detectionsSection.items.forEach((item, idx) => {
        const label =
          item.label || item.name || item.key || `Object ${idx + 1}`;
        const confidence = item.confidence || item.score || item.value || null;
        const location = item.position || item.location || item.text || "";

        let coords = extractCoordinates(location);

        if (item.x !== undefined && item.y !== undefined) {
          coords = {
            x: item.x,
            y: item.y,
            w: item.w || item.width || 100,
            h: item.h || item.height || 100,
          };
        }

        objects.push({
          id: idx,
          label,
          confidence: confidence ? parseFloat(confidence) : null,
          location: coords,
          rawLocation: location,
        });
      });
    }

    if (objects.length === 0 && rawText) {
      const text = rawText;

      const objectPattern =
        /\*\*([^*]+?)\*\*\s*(?:\(confidence:\s*([\d.]+)\)|\(([\d.]+)\))?/gi;
      let match;
      let objIdx = 0;

      while ((match = objectPattern.exec(text)) !== null) {
        const label = match[1].trim();
        const confidence =
          match[2] || match[3] ? parseFloat(match[2] || match[3]) : null;

        if (label && label.length > 1 && !label.match(/^\d+$/)) {
          const matchEnd = match.index + match[0].length;
          const nextMatch = objectPattern.exec(text);
          const textAfter = nextMatch
            ? text.substring(matchEnd, nextMatch.index)
            : text.substring(matchEnd, matchEnd + 500);

          const coords = extractCoordinates(textAfter);

          objects.push({
            id: objIdx++,
            label,
            confidence,
            location: coords,
            rawLocation:
              coords.x !== null
                ? `x=${coords.x} y=${coords.y} w=${coords.w} h=${coords.h}`
                : "",
            fullText: textAfter,
          });

          if (nextMatch) {
            objectPattern.lastIndex = nextMatch.index;
          }
        }
      }

      if (objects.length === 0) {
        const boldPattern = /\*\*([^*]+?)\*\*:?\s*([^**]*?)(?=\*\*|$)/g;
        let match2;

        while ((match2 = boldPattern.exec(text)) !== null) {
          const label = match2[1].trim();
          const description = match2[2].trim();

          if (label && label.length > 1 && !label.match(/^\d+$/)) {
            const confidenceMatch =
              description.match(/\(confidence:\s*([\d.]+)\)/i) ||
              description.match(/\(([\d.]+)\)/) ||
              text.match(
                new RegExp(
                  `${label.replace(
                    /[.*+?^${}()|[\]\\]/g,
                    "\\$&"
                  )}[^:]*\\(([\\d.]+)\\)`
                )
              );

            const locationMatch =
              description.match(
                /Location:\s*x[=:]?\s*(\d+).*?y[=:]?\s*(\d+).*?w[=:]?\s*(\d+).*?h[=:]?\s*(\d+)/i
              ) ||
              description.match(
                /x[=:]?\s*(\d+).*?y[=:]?\s*(\d+).*?w[=:]?\s*(\d+).*?h[=:]?\s*(\d+)/i
              ) ||
              description.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)[,\s]+(\d+)/);

            let x = null,
              y = null,
              w = null,
              h = null;
            if (locationMatch) {
              x = parseInt(locationMatch[1]);
              y = parseInt(locationMatch[2]);
              w = parseInt(locationMatch[3]);
              h = parseInt(locationMatch[4]);
            }

            const confidence = confidenceMatch
              ? parseFloat(confidenceMatch[1])
              : null;

            objects.push({
              id: objIdx++,
              label,
              confidence,
              location: { x, y, w, h },
              rawLocation: locationMatch ? locationMatch[0] : "",
              description,
            });
          }
        }
      }

      if (objects.length === 0) {
        const lines = text.split(/\n/);
        let currentObject = null;

        lines.forEach((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return;

          const boldMatch = trimmed.match(/\*\*([^*]+?)\*\*/);
          const colonMatch = trimmed.match(/^([A-Z][A-Za-z\s]+?):/);

          if (boldMatch || colonMatch) {
            if (currentObject && currentObject.label) {
              objects.push(currentObject);
            }

            const label = boldMatch
              ? boldMatch[1].trim()
              : colonMatch[1].trim();

            if (
              label &&
              label.length > 1 &&
              !label.match(/^\d+$/) &&
              label.length < 50
            ) {
              const confidenceMatch =
                trimmed.match(/\(confidence:\s*([\d.]+)\)/i) ||
                trimmed.match(/\(([\d.]+)\)/);

              currentObject = {
                id: objIdx++,
                label,
                confidence: confidenceMatch
                  ? parseFloat(confidenceMatch[1])
                  : null,
                location: { x: null, y: null, w: null, h: null },
                rawLocation: "",
                fullText: trimmed,
              };
            }
          } else if (currentObject) {
            const locationMatch =
              trimmed.match(
                /Location:\s*x[=:]?\s*(\d+).*?y[=:]?\s*(\d+).*?w[=:]?\s*(\d+).*?h[=:]?\s*(\d+)/i
              ) ||
              trimmed.match(
                /x[=:]?\s*(\d+).*?y[=:]?\s*(\d+).*?w[=:]?\s*(\d+).*?h[=:]?\s*(\d+)/i
              ) ||
              trimmed.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)[,\s]+(\d+)/);

            if (locationMatch) {
              currentObject.location = {
                x: parseInt(locationMatch[1]),
                y: parseInt(locationMatch[2]),
                w: parseInt(locationMatch[3]),
                h: parseInt(locationMatch[4]),
              };
              currentObject.rawLocation = locationMatch[0];
            }

            currentObject.fullText += " " + trimmed;
          }
        });

        if (currentObject && currentObject.label) {
          objects.push(currentObject);
        }
      }

      if (objects.length > 0) {
        objects.forEach((obj) => {
          if (!obj.location.x && !obj.location.y && obj.fullText) {
            const coords = extractCoordinates(obj.fullText);
            if (coords.x !== null) {
              obj.location = coords;
              obj.rawLocation = `x=${coords.x} y=${coords.y} w=${coords.w} h=${coords.h}`;
            }
          }

          if (!obj.location.x && !obj.location.y && rawText) {
            const labelPattern = new RegExp(
              `\\*\\*${obj.label.replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
              )}\\*\\*[\\s\\S]{0,500}`,
              "i"
            );
            const match = rawText.match(labelPattern);
            if (match) {
              const coords = extractCoordinates(match[0]);
              if (coords.x !== null) {
                obj.location = coords;
                obj.rawLocation = `x=${coords.x} y=${coords.y} w=${coords.w} h=${coords.h}`;
              }
            }
          }
        });
      }
    }

    return objects;
  }, [rawText, detectionsSection, sections, data]);

  const objects = useMemo(() => {
    return parseObjects();
  }, [parseObjects]);

  useEffect(() => {
    if (objects.length > 0) {
      const allIds = objects.map((obj) => obj.id);
      setVisibleBoxes(new Set(allIds));
    }
  }, [objects]);

  const toggleBoxVisibility = (objectId) => {
    setVisibleBoxes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(objectId)) {
        newSet.delete(objectId);
      } else {
        newSet.add(objectId);
      }
      return newSet;
    });
  };

  const objectCount = objects.length;
  const avgConfidence =
    objects.length > 0
      ? objects.reduce((sum, obj) => sum + (obj.confidence || 0), 0) /
        objects.length
      : null;

  const confidenceLevel = avgConfidence
    ? avgConfidence >= 0.8
      ? "High"
      : avgConfidence >= 0.6
      ? "Medium"
      : "Low"
    : "Unknown";

  const largestObject =
    objects.length > 0
      ? objects.reduce((largest, obj) => {
          const currentArea = (obj.location.w || 0) * (obj.location.h || 0);
          const largestArea =
            (largest.location.w || 0) * (largest.location.h || 0);
          return currentArea > largestArea ? obj : largest;
        })
      : null;

  const mostConfidentObject =
    objects.length > 0
      ? objects.reduce((most, obj) => {
          const currentConf = obj.confidence || 0;
          const mostConf = most.confidence || 0;
          return currentConf > mostConf ? obj : most;
        })
      : null;

  const largestAreaPercent =
    largestObject && imageDimensions.width > 0 && imageDimensions.height > 0
      ? (
          (((largestObject.location.w || 0) * (largestObject.location.h || 0)) /
            (imageDimensions.width * imageDimensions.height)) *
          100
        ).toFixed(1)
      : null;

  const getCategoryColor = (label) => {
    const lower = label.toLowerCase();
    if (
      lower.includes("person") ||
      lower.includes("human") ||
      lower.includes("man") ||
      lower.includes("woman")
    ) {
      return "#3b82f6";
    }
    if (
      lower.includes("animal") ||
      lower.includes("cat") ||
      lower.includes("dog") ||
      lower.includes("bird")
    ) {
      return "#10b981";
    }
    if (
      lower.includes("vehicle") ||
      lower.includes("car") ||
      lower.includes("truck") ||
      lower.includes("bike")
    ) {
      return "#f59e0b";
    }
    if (
      lower.includes("furniture") ||
      lower.includes("chair") ||
      lower.includes("table") ||
      lower.includes("desk")
    ) {
      return "#8b5cf6";
    }
    if (
      lower.includes("electronic") ||
      lower.includes("laptop") ||
      lower.includes("phone") ||
      lower.includes("screen")
    ) {
      return "#ec4899";
    }
    return "#6366f1";
  };

  if (objectCount === 0 && !rawText.trim()) {
    return <div className={styles.emptyState}>No objects detected yet.</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.summaryBanner}>
        <div className={styles.summaryContent}>
          <div className={styles.summaryIcon}>
            <FontAwesomeIcon icon={faEye} />
          </div>
          <div className={styles.summaryText}>
            <h2 className={styles.summaryTitle}>Object Detection Summary</h2>
            <p className={styles.summaryDescription}>
              This analysis identifies all recognizable objects, items, and
              entities found in the image.
            </p>
          </div>
        </div>
        <div className={styles.summaryStats}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Detected objects</span>
            <strong className={styles.statValue}>{objectCount}</strong>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Detection Confidence</span>
            <strong className={styles.statValue}>{confidenceLevel}</strong>
          </div>
        </div>
      </div>

      {objects.length > 0 && (
        <div className={styles.insightsSection}>
          <div className={styles.insightsHeader}>
            <h3 className={styles.insightsTitle}>Key Insights</h3>
          </div>
          <div className={styles.insightsGrid}>
            {largestObject && (
              <div className={styles.insightCard}>
                <div
                  className={styles.insightIcon}
                  style={{
                    backgroundColor:
                      getCategoryColor(largestObject.label) + "20",
                    color: getCategoryColor(largestObject.label),
                  }}
                >
                  <FontAwesomeIcon icon={faCheckCircle} />
                </div>
                <div className={styles.insightContent}>
                  <span className={styles.insightLabel}>Largest Object</span>
                  <strong className={styles.insightValue}>
                    {largestObject.label}
                  </strong>
                  {largestAreaPercent && (
                    <span className={styles.insightMeta}>
                      {largestAreaPercent}% of image
                    </span>
                  )}
                </div>
              </div>
            )}
            {mostConfidentObject && mostConfidentObject.confidence !== null && (
              <div className={styles.insightCard}>
                <div
                  className={styles.insightIcon}
                  style={{
                    backgroundColor:
                      getCategoryColor(mostConfidentObject.label) + "20",
                    color: getCategoryColor(mostConfidentObject.label),
                  }}
                >
                  <FontAwesomeIcon icon={faCheckCircle} />
                </div>
                <div className={styles.insightContent}>
                  <span className={styles.insightLabel}>Most Confident</span>
                  <strong className={styles.insightValue}>
                    {mostConfidentObject.label}
                  </strong>
                  <span className={styles.insightMeta}>
                    {(mostConfidentObject.confidence * 100).toFixed(1)}%
                    confidence
                  </span>
                </div>
              </div>
            )}
            {avgConfidence !== null && (
              <div className={styles.insightCard}>
                <div
                  className={styles.insightIcon}
                  style={{
                    backgroundColor: "rgba(59, 130, 246, 0.2)",
                    color: "#3b82f6",
                  }}
                >
                  <FontAwesomeIcon icon={faCheckCircle} />
                </div>
                <div className={styles.insightContent}>
                  <span className={styles.insightLabel}>
                    Average Confidence
                  </span>
                  <strong className={styles.insightValue}>
                    {(avgConfidence * 100).toFixed(1)}%
                  </strong>
                  <span className={styles.insightMeta}>
                    {confidenceLevel} quality
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {displayImageUrl && (
        <div className={styles.imageSection}>
          <div 
            ref={containerRef} 
            className={styles.imageContainer}
            onMouseMove={(e) => {
              if (!imageRef.current || !containerRef.current) return;
              
              const img = imageRef.current;
              const container = containerRef.current;
              const imgRect = img.getBoundingClientRect();
              const containerRect = container.getBoundingClientRect();
              
              const mouseX = e.clientX - imgRect.left;
              const mouseY = e.clientY - imgRect.top;
              
              if (
                mouseX >= 0 &&
                mouseX <= imgRect.width &&
                mouseY >= 0 &&
                mouseY <= imgRect.height
              ) {
                const naturalAspect = imageDimensions.width / imageDimensions.height;
                const renderedAspect = imgRect.width / imgRect.height;
                
                let visibleImageWidth, visibleImageHeight, offsetX = 0, offsetY = 0;
                
                if (Math.abs(naturalAspect - renderedAspect) > 0.01) {
                  if (naturalAspect > renderedAspect) {
                    visibleImageWidth = imgRect.width;
                    visibleImageHeight = imgRect.width / naturalAspect;
                    offsetY = (imgRect.height - visibleImageHeight) / 2;
                  } else {
                    visibleImageHeight = imgRect.height;
                    visibleImageWidth = imgRect.height * naturalAspect;
                    offsetX = (imgRect.width - visibleImageWidth) / 2;
                  }
                } else {
                  visibleImageWidth = imgRect.width;
                  visibleImageHeight = imgRect.height;
                }
                
                const relativeX = mouseX - offsetX;
                const relativeY = mouseY - offsetY;
                
                if (
                  relativeX >= 0 &&
                  relativeX <= visibleImageWidth &&
                  relativeY >= 0 &&
                  relativeY <= visibleImageHeight
                ) {
                  const scaleX = imageDimensions.width / visibleImageWidth;
                  const scaleY = imageDimensions.height / visibleImageHeight;
                  
                  const actualX = Math.round(relativeX * scaleX);
                  const actualY = Math.round(relativeY * scaleY);
                  
                  setCursorCoords({ x: actualX, y: actualY });
                  setMousePosition({ 
                    x: e.clientX - containerRect.left, 
                    y: e.clientY - containerRect.top 
                  });
                  setIsHovering(true);
                } else {
                  setIsHovering(false);
                }
              } else {
                setIsHovering(false);
              }
            }}
            onMouseLeave={() => {
              setIsHovering(false);
              setCursorCoords({ x: null, y: null });
            }}
          >
            <img
              ref={imageRef}
              src={displayImageUrl}
              alt="Detected objects"
              className={styles.detectionImage}
              onLoad={(e) => {
                const img = e.target;
                const naturalWidth = img.naturalWidth || img.offsetWidth;
                const naturalHeight = img.naturalHeight || img.offsetHeight;
                setImageDimensions({
                  width: naturalWidth,
                  height: naturalHeight,
                });

                setTimeout(() => {
                  if (imageRef.current && containerRef.current) {
                    const imgRect = img.getBoundingClientRect();
                    const containerRect =
                      containerRef.current.getBoundingClientRect();
                    setImageRect({
                      width: imgRect.width,
                      height: imgRect.height,
                      left: imgRect.left - containerRect.left,
                      top: imgRect.top - containerRect.top,
                    });
                  }
                }, 50);
              }}
            />
            {imageRect.width > 0 &&
              imageRect.height > 0 &&
              imageDimensions.width > 0 &&
              imageDimensions.height > 0 &&
              imageRef.current &&
              (() => {
                const imgElement = imageRef.current;
                const imgRect = imgElement.getBoundingClientRect();
                const containerRect =
                  containerRef.current.getBoundingClientRect();
                
                const naturalAspect =
                  imageDimensions.width / imageDimensions.height;
                const renderedAspect = imgRect.width / imgRect.height;

                let visibleImageWidth, visibleImageHeight, offsetX = 0, offsetY = 0;

                if (Math.abs(naturalAspect - renderedAspect) > 0.01) {
                  if (naturalAspect > renderedAspect) {
                    visibleImageWidth = imgRect.width;
                    visibleImageHeight = imgRect.width / naturalAspect;
                    offsetY = (imgRect.height - visibleImageHeight) / 2;
                  } else {
                    visibleImageHeight = imgRect.height;
                    visibleImageWidth = imgRect.height * naturalAspect;
                    offsetX = (imgRect.width - visibleImageWidth) / 2;
                  }
                } else {
                  visibleImageWidth = imgRect.width;
                  visibleImageHeight = imgRect.height;
                }

                const overlayLeft = imgRect.left - containerRect.left;
                const overlayTop = imgRect.top - containerRect.top;

                return (
                  <>
                    {isHovering && cursorCoords.x !== null && cursorCoords.y !== null && (
                      <div
                        className={styles.coordinateDisplay}
                        style={{
                          position: "absolute",
                          left: `${mousePosition.x + 15}px`,
                          top: `${mousePosition.y - 35}px`,
                          pointerEvents: "none",
                          zIndex: 1000,
                        }}
                      >
                        x: {cursorCoords.x} y: {cursorCoords.y}
                      </div>
                    )}
                    <div
                      className={styles.boundingBoxesOverlay}
                      style={{
                        position: "absolute",
                        left: `${overlayLeft}px`,
                        top: `${overlayTop}px`,
                        width: `${imgRect.width}px`,
                        height: `${imgRect.height}px`,
                        pointerEvents: "none",
                      }}
                    >
                    {objects.map((obj) => {
                      const color = getCategoryColor(obj.label);

                      if (
                        obj.location.x === null ||
                        obj.location.y === null ||
                        obj.location.w === null ||
                        obj.location.h === null
                      ) {
                        return null;
                      }

                      if (!visibleBoxes.has(obj.id)) {
                        return null;
                      }

                      const scaleX = visibleImageWidth / imageDimensions.width;
                      const scaleY = visibleImageHeight / imageDimensions.height;

                      // YOLO provides accurate coordinates, no adjustment needed
                      // Only apply small adjustment for Gemini fallback (if confidence is very low, it might be Gemini)
                      const isLowConfidence = obj.confidence !== null && obj.confidence < 0.6;
                      const offsetAdjustmentX = isLowConfidence ? Math.max(2, scaleX * 0.5) : 0;
                      const offsetAdjustmentY = isLowConfidence ? Math.max(2, scaleY * 0.5) : 0;

                      const left = obj.location.x * scaleX + offsetX + offsetAdjustmentX;
                      const top = obj.location.y * scaleY + offsetY + offsetAdjustmentY;
                      const width = obj.location.w * scaleX;
                      const height = obj.location.h * scaleY;

                      const clampedLeft = Math.max(
                        offsetX,
                        Math.min(offsetX + visibleImageWidth - width, left)
                      );
                      const clampedTop = Math.max(
                        offsetY,
                        Math.min(offsetY + visibleImageHeight - height, top)
                      );
                      const clampedWidth = Math.min(
                        width,
                        offsetX + visibleImageWidth - clampedLeft
                      );
                      const clampedHeight = Math.min(
                        height,
                        offsetY + visibleImageHeight - clampedTop
                      );

                      if (
                        clampedLeft < offsetX ||
                        clampedTop < offsetY ||
                        clampedLeft + clampedWidth > offsetX + visibleImageWidth ||
                        clampedTop + clampedHeight > offsetY + visibleImageHeight
                      ) {
                        return null;
                      }

                      return (
                        <div
                          key={obj.id}
                          className={`${styles.boundingBox} ${
                            selectedObject === obj.id ? styles.selectedBox : ""
                          }`}
                          style={{
                            position: "absolute",
                            left: `${clampedLeft}px`,
                            top: `${clampedTop}px`,
                            width: `${clampedWidth}px`,
                            height: `${clampedHeight}px`,
                            borderColor: "#ffffff",
                            backgroundColor: "rgba(255, 255, 255, 0.1)",
                            pointerEvents: "all",
                          }}
                          onClick={() =>
                            setSelectedObject(
                              selectedObject === obj.id ? null : obj.id
                            )
                          }
                        >
                          <div
                            className={styles.boundingLabel}
                            style={{
                              backgroundColor: color,
                              color: "white",
                            }}
                          >
                            {obj.label}{" "}
                            {obj.confidence !== null &&
                              `(${obj.confidence.toFixed(2)})`}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  </>
                );
              })()}
          </div>
        </div>
      )}

      <div className={styles.objectsSection}>
        <div className={styles.sectionHeader}>
          <h3>Detected Objects</h3>
          <span className={styles.sectionHint}>
            {objectCount} object{objectCount !== 1 ? "s" : ""} found
          </span>
        </div>
        <div className={styles.objectsList}>
          {objects.map((obj) => {
            const isVisible = visibleBoxes.has(obj.id);
            return (
              <div
                key={obj.id}
                className={`${styles.objectCard} ${
                  selectedObject === obj.id ? styles.selected : ""
                } ${!isVisible ? styles.hidden : ""}`}
                onClick={(e) => {
                  toggleBoxVisibility(obj.id);
                  setSelectedObject(selectedObject === obj.id ? null : obj.id);
                }}
              >
                <div className={styles.objectHeader}>
                  <h4 className={styles.objectLabel}>
                    {obj.label}
                    {!isVisible && (
                      <span
                        className={styles.hiddenIndicator}
                        title="Bounding box hidden"
                      >
                        👁️‍🗨️
                      </span>
                    )}
                  </h4>
                  {obj.confidence !== null && (
                    <span
                      className={styles.confidenceBadge}
                      style={{
                        backgroundColor: getCategoryColor(obj.label) + "20",
                        color: getCategoryColor(obj.label),
                      }}
                    >
                      {obj.confidence.toFixed(2)}
                    </span>
                  )}
                </div>
                <div className={styles.objectDetails}>
                  {obj.confidence !== null && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Confidence:</span>
                      <span className={styles.detailValue}>
                        {obj.confidence.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {(obj.location.x !== null || obj.rawLocation) && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Location:</span>
                      <span className={styles.detailValue}>
                        {obj.location.x !== null
                          ? `x=${obj.location.x} y=${obj.location.y} w=${obj.location.w} h=${obj.location.h}`
                          : obj.rawLocation || "Not specified"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {objects.length === 0 && rawText.trim() && (
        <div className={styles.fallbackSection}>
          <div className={styles.sectionHeader}>
            <h3>AI Analysis</h3>
            <span>Raw detection response</span>
          </div>
          <pre className={styles.rawText}>{rawText}</pre>
        </div>
      )}
    </div>
  );
};

export default ImageObjectDetection;
