import React, { useState, useMemo, useEffect } from "react";
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
  const [visibleBoxes, setVisibleBoxes] = useState(new Set()); // Track which boxes are visible
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

        // Get the actual rendered size and position of the image (natural size when no constraints)
        const imgRect = img.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        // Calculate position relative to container
        setImageRect({
          width: imgRect.width,
          height: imgRect.height,
          left: imgRect.left - containerRect.left,
          top: imgRect.top - containerRect.top,
        });

        console.log("[ImageRect] Updated:", {
          imgRect: {
            width: imgRect.width,
            height: imgRect.height,
            left: imgRect.left,
            top: imgRect.top,
          },
          containerRect: {
            width: containerRect.width,
            height: containerRect.height,
            left: containerRect.left,
            top: containerRect.top,
          },
          relative: {
            width: imgRect.width,
            height: imgRect.height,
            left: imgRect.left - containerRect.left,
            top: imgRect.top - containerRect.top,
          },
          natural: imageDimensions,
        });
      }
    };

    // Update on resize
    window.addEventListener("resize", updateImageRect);

    // Update after image loads and after a short delay to ensure layout is complete
    if (imageRef.current) {
      const timeout = setTimeout(updateImageRect, 100);
      const timeout2 = setTimeout(updateImageRect, 500); // Also update after a longer delay
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

  const parseObjects = () => {
    const objects = [];

    // First, try to parse JSON from rawText
    if (rawText) {
      try {
        let jsonText = rawText.trim();
        console.log(
          "[parseObjects] Raw text input:",
          jsonText.substring(0, 200)
        );

        // Remove markdown code fences if present
        if (jsonText.startsWith("```")) {
          jsonText = jsonText
            .replace(/```json?/gi, "")
            .replace(/```/g, "")
            .trim();
        }

        // Try to find and extract JSON array - be more aggressive
        let arrayStart = jsonText.indexOf("[");
        let arrayEnd = jsonText.lastIndexOf("]");

        // If no closing bracket, try to find the last complete object
        if (arrayStart !== -1 && arrayEnd === -1) {
          // Find all complete objects by looking for closing braces
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
            // Reconstruct array from found objects
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
          console.log(
            "[parseObjects] Extracted JSON:",
            jsonText.substring(0, 300)
          );

          const parsed = JSON.parse(jsonText);
          if (Array.isArray(parsed) && parsed.length > 0) {
            console.log(
              "[parseObjects] Found JSON array with",
              parsed.length,
              "objects"
            );
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
              console.log(
                "[parseObjects] Successfully parsed",
                objects.length,
                "objects with coordinates"
              );
              return objects;
            }
          }
        }
      } catch (e) {
        console.log("[parseObjects] JSON parse failed:", e.message);
        console.log(
          "[parseObjects] Attempting to extract objects from corrupted JSON..."
        );

        // Try to extract individual objects from corrupted JSON
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
            console.log(
              "[parseObjects] Extracted",
              objects.length,
              "objects using regex fallback"
            );
            return objects;
          }
        } catch (regexError) {
          console.log(
            "[parseObjects] Regex extraction also failed:",
            regexError.message
          );
        }
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
      console.log(
        "[parseObjects] Searching for objects in raw text, length:",
        text.length
      );

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

          console.log(
            `[parseObjects] Found object: ${label}, coords:`,
            coords,
            "text after:",
            textAfter.substring(0, 200)
          );

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
                console.log(
                  `[parseObjects] Found coords for ${obj.label} in full text:`,
                  coords
                );
                obj.location = coords;
                obj.rawLocation = `x=${coords.x} y=${coords.y} w=${coords.w} h=${coords.h}`;
              }
            }
          }
        });
      }

      if (objects.length === 0 && rawText) {
        console.log(
          "[parseObjects] No objects found, trying alternative parsing on full text"
        );
        const allCoords = extractCoordinates(rawText);
        if (allCoords.x !== null) {
          console.log(
            "[parseObjects] Found coordinates in full text:",
            allCoords
          );
        }
      }
    }

    return objects;
  };

  const objects = useMemo(() => {
    const parsed = parseObjects();
    console.log("[ImageObjectDetection] Parsed objects:", parsed);
    console.log(
      "[ImageObjectDetection] Detections section:",
      detectionsSection
    );
    console.log("[ImageObjectDetection] Raw text (full):", rawText);
    console.log(
      "[ImageObjectDetection] Raw text (first 1000 chars):",
      rawText?.substring(0, 1000)
    );
    console.log("[ImageObjectDetection] Object count:", parsed.length);

    parsed.forEach((obj, idx) => {
      console.log(`[ImageObjectDetection] Object ${idx}:`, {
        label: obj.label,
        confidence: obj.confidence,
        location: obj.location,
        hasCoords: obj.location.x !== null && obj.location.y !== null,
      });
    });

    return parsed;
  }, [detectionsSection, rawText]);

  // Initialize all boxes as visible when objects change
  useEffect(() => {
    if (objects.length > 0) {
      const allIds = objects.map((obj) => obj.id);
      setVisibleBoxes(new Set(allIds));
    }
  }, [objects.length]);

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

  // Calculate largest object by bounding box area
  const largestObject =
    objects.length > 0
      ? objects.reduce((largest, obj) => {
          const currentArea = (obj.location.w || 0) * (obj.location.h || 0);
          const largestArea =
            (largest.location.w || 0) * (largest.location.h || 0);
          return currentArea > largestArea ? obj : largest;
        })
      : null;

  // Find most confident object
  const mostConfidentObject =
    objects.length > 0
      ? objects.reduce((most, obj) => {
          const currentConf = obj.confidence || 0;
          const mostConf = most.confidence || 0;
          return currentConf > mostConf ? obj : most;
        })
      : null;

  // Calculate largest object area percentage
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
          <div ref={containerRef} className={styles.imageContainer}>
            <img
              ref={imageRef}
              src={displayImageUrl}
              alt="Image with detected objects"
              className={styles.detectionImage}
              onLoad={(e) => {
                const img = e.target;
                const naturalWidth = img.naturalWidth || img.offsetWidth;
                const naturalHeight = img.naturalHeight || img.offsetHeight;
                setImageDimensions({
                  width: naturalWidth,
                  height: naturalHeight,
                });

                // Update image rect after a short delay to ensure layout is complete
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
                const overlayLeft = imgRect.left - containerRect.left;
                const overlayTop = imgRect.top - containerRect.top;

                return (
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
                        return null; // Skip objects without coordinates
                      }

                      // Skip rendering if box is hidden
                      if (!visibleBoxes.has(obj.id)) {
                        return null;
                      }

                      // Calculate aspect ratios
                      const naturalAspect =
                        imageDimensions.width / imageDimensions.height;
                      const renderedAspect = imgRect.width / imgRect.height;

                      // Calculate actual visible image size (accounting for object-fit: contain)
                      let visibleImageWidth,
                        visibleImageHeight,
                        offsetX = 0,
                        offsetY = 0;

                      if (Math.abs(naturalAspect - renderedAspect) > 0.01) {
                        // Aspect ratios differ - image is letterboxed or pillarboxed
                        if (naturalAspect > renderedAspect) {
                          // Image is wider - letterboxed (bars top/bottom)
                          visibleImageWidth = imgRect.width;
                          visibleImageHeight = imgRect.width / naturalAspect;
                          offsetY = (imgRect.height - visibleImageHeight) / 2;
                        } else {
                          // Image is taller - pillarboxed (bars left/right)
                          visibleImageHeight = imgRect.height;
                          visibleImageWidth = imgRect.height * naturalAspect;
                          offsetX = (imgRect.width - visibleImageWidth) / 2;
                        }
                      } else {
                        // Aspect ratios match - no letterboxing
                        visibleImageWidth = imgRect.width;
                        visibleImageHeight = imgRect.height;
                      }

                      // Calculate scale factor from natural image to visible rendered image
                      const scaleX = visibleImageWidth / imageDimensions.width;
                      const scaleY =
                        visibleImageHeight / imageDimensions.height;

                      // Debug logging
                      console.log(`[BoundingBox] ${obj.label}:`, {
                        natural: {
                          w: imageDimensions.width,
                          h: imageDimensions.height,
                        },
                        imgElement: { w: imgRect.width, h: imgRect.height },
                        visible: {
                          w: visibleImageWidth,
                          h: visibleImageHeight,
                        },
                        offset: { x: offsetX, y: offsetY },
                        scale: { x: scaleX, y: scaleY },
                        coords: obj.location,
                        naturalAspect: (
                          imageDimensions.width / imageDimensions.height
                        ).toFixed(3),
                        renderedAspect: (
                          imgRect.width / imgRect.height
                        ).toFixed(3),
                      });

                      // Convert pixel coordinates from natural image to rendered pixel positions
                      // Position relative to the overlay (which matches the img element position)
                      const left = obj.location.x * scaleX + offsetX;
                      const top = obj.location.y * scaleY + offsetY;
                      const width = obj.location.w * scaleX;
                      const height = obj.location.h * scaleY;

                      // Ensure bounding box stays within the actual image area (not in black bars)
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

                      // Only render if box is within the actual image area
                      if (
                        clampedLeft < offsetX ||
                        clampedTop < offsetY ||
                        clampedLeft + clampedWidth >
                          offsetX + visibleImageWidth ||
                        clampedTop + clampedHeight >
                          offsetY + visibleImageHeight
                      ) {
                        console.log(
                          `[BoundingBox] ${obj.label} - Box outside image bounds, skipping`
                        );
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
                  // Toggle box visibility on click
                  toggleBoxVisibility(obj.id);
                  // Also select/deselect the object
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
