import React, { useState, useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faExpand,
  faCompress,
  faSearchPlus,
  faSearchMinus,
  faTimes,
  faChevronDown,
} from "@fortawesome/free-solid-svg-icons";
import styles from "./ImagePreview.module.css";

const ImagePreview = ({
  imageUrl,
  metadata,
  alt = "Uploaded image",
  showControls = true,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isZoomEnabled, setIsZoomEnabled] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(5);
  const [showZoomMenu, setShowZoomMenu] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isMouseOverImage, setIsMouseOverImage] = useState(false);
  const imageRef = useRef(null);
  const fullscreenImageRef = useRef(null);
  const containerRef = useRef(null);
  const fullscreenRef = useRef(null);
  const zoomMenuRef = useRef(null);
  const fullscreenZoomMenuRef = useRef(null);
  const controlsRef = useRef(null);
  const fullscreenControlsRef = useRef(null);

  const normalZoomLevels = [2, 3, 4, 5];
  const fullscreenZoomLevels = [2, 3, 4, 5, 6, 8, 10, 12, 15];
  const zoomLevels = isFullscreen ? fullscreenZoomLevels : normalZoomLevels;

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    // Adjust zoom level when exiting fullscreen if current level is too high
    if (!isFullscreen && zoomLevel > 5) {
      setZoomLevel(5);
    }
  }, [isFullscreen, zoomLevel]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is inside either zoom control container (normal or fullscreen)
      const isInsideNormalMenu =
        zoomMenuRef.current && zoomMenuRef.current.contains(event.target);
      const isInsideFullscreenMenu =
        fullscreenZoomMenuRef.current &&
        fullscreenZoomMenuRef.current.contains(event.target);

      // Check if click is inside the controls container (includes toggle button)
      const isInsideControls =
        (controlsRef.current && controlsRef.current.contains(event.target)) ||
        (fullscreenControlsRef.current &&
          fullscreenControlsRef.current.contains(event.target));

      if (isInsideNormalMenu || isInsideFullscreenMenu || isInsideControls) {
        return;
      }

      // Click is outside, close the menu
      setShowZoomMenu(false);
    };

    if (showZoomMenu) {
      // Use a small timeout to allow button onClick handlers to execute first
      const timeoutId = setTimeout(() => {
        document.addEventListener("click", handleClickOutside);
      }, 0);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener("click", handleClickOutside);
      };
    }
  }, [showZoomMenu]);

  const handleFullscreen = () => {
    if (!fullscreenRef.current) return;

    if (!isFullscreen) {
      if (fullscreenRef.current.requestFullscreen) {
        fullscreenRef.current.requestFullscreen();
      } else if (fullscreenRef.current.webkitRequestFullscreen) {
        fullscreenRef.current.webkitRequestFullscreen();
      } else if (fullscreenRef.current.msRequestFullscreen) {
        fullscreenRef.current.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  };

  const handleMouseMove = (e) => {
    // Use the appropriate image ref based on fullscreen state
    const currentImageRef = isFullscreen
      ? fullscreenImageRef.current
      : imageRef.current;
    if (!currentImageRef || !isZoomEnabled) return;

    const rect = currentImageRef.getBoundingClientRect();

    // Calculate position relative to the image
    const imageX = e.clientX - rect.left;
    const imageY = e.clientY - rect.top;

    // Get the actual image dimensions
    const imageWidth = rect.width;
    const imageHeight = rect.height;

    // Check if mouse is within image bounds
    if (
      imageX < 0 ||
      imageX > imageWidth ||
      imageY < 0 ||
      imageY > imageHeight
    ) {
      setIsMouseOverImage(false);
      return;
    }

    // Calculate percentage position (0-100) for background positioning
    // This represents where on the actual image the cursor is
    const x = (imageX / imageWidth) * 100;
    const y = (imageY / imageHeight) * 100;

    // Clamp values between 0 and 100
    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));

    setMousePosition({ x: e.clientX, y: e.clientY });
    setZoomPosition({ x: clampedX, y: clampedY });
    setIsMouseOverImage(true);
  };

  // Calculate background position for magnifier
  const getBackgroundPosition = () => {
    // Get the current image ref to calculate proper positioning
    const currentImageRef = isFullscreen
      ? fullscreenImageRef.current
      : imageRef.current;

    if (!currentImageRef) {
      return `${zoomPosition.x}% ${zoomPosition.y}%`;
    }

    // When backgroundSize is zoomLevel * 100%, CSS makes the background zoomLevel times larger
    // To center the cursor point in the magnifier, we use this formula:
    // bgX = cursorX% - (50% / zoomLevel)
    // This accounts for CSS's backgroundPosition calculation when background is larger than container
    const offsetX = 50 / zoomLevel;
    const offsetY = 50 / zoomLevel;

    const bgX = zoomPosition.x - offsetX;
    const bgY = zoomPosition.y - offsetY;

    // Clamp to valid range (0-100)
    const clampedX = Math.max(0, Math.min(100, bgX));
    const clampedY = Math.max(0, Math.min(100, bgY));

    return `${clampedX}% ${clampedY}%`;
  };

  const handleMouseLeave = () => {
    setIsMouseOverImage(false);
    setZoomPosition({ x: 0, y: 0 });
  };

  const handleMouseEnter = () => {
    if (isZoomEnabled) {
      setIsMouseOverImage(true);
    }
  };

  const magnifierSize = 200;

  if (!imageUrl) {
    return (
      <div className={styles.container}>
        <p className={styles.noImage}>No image to display</p>
      </div>
    );
  }

  return (
    <>
      <div className={styles.container} ref={containerRef}>
        <div className={styles.imageWrapper} ref={fullscreenRef}>
          {showControls && (
            <div className={styles.controls} ref={controlsRef}>
              <div className={styles.zoomControl} ref={zoomMenuRef}>
                <button
                  className={`${styles.controlButton} ${
                    isZoomEnabled ? styles.active : ""
                  }`}
                  onClick={() => setIsZoomEnabled(!isZoomEnabled)}
                  title={isZoomEnabled ? "Disable Zoom" : "Enable Zoom"}
                >
                  <FontAwesomeIcon
                    icon={isZoomEnabled ? faSearchMinus : faSearchPlus}
                  />
                  {isZoomEnabled && (
                    <span className={styles.zoomLevelBadge}>×{zoomLevel}</span>
                  )}
                </button>
                {isZoomEnabled && (
                  <div
                    className={`${styles.zoomMenu} ${
                      showZoomMenu ? styles.show : ""
                    }`}
                  >
                    <div className={styles.zoomMenuHeader}>Zoom Level</div>
                    {zoomLevels.map((level) => (
                      <button
                        key={level}
                        className={`${styles.zoomOption} ${
                          zoomLevel === level ? styles.selected : ""
                        }`}
                        onClick={() => {
                          setZoomLevel(level);
                          setShowZoomMenu(false);
                        }}
                      >
                        ×{level}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                className={styles.controlButton}
                onClick={() => {
                  setShowZoomMenu(!showZoomMenu);
                }}
                style={{ display: isZoomEnabled ? "flex" : "none" }}
                title="Change Zoom Level"
              >
                <FontAwesomeIcon icon={faChevronDown} />
              </button>
              <button
                className={styles.controlButton}
                onClick={handleFullscreen}
                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              >
                <FontAwesomeIcon icon={isFullscreen ? faCompress : faExpand} />
              </button>
            </div>
          )}

          <div
            className={styles.imageContainer}
            onMouseMove={showControls ? handleMouseMove : undefined}
            onMouseLeave={showControls ? handleMouseLeave : undefined}
            onMouseEnter={showControls ? handleMouseEnter : undefined}
          >
            <img
              ref={imageRef}
              src={imageUrl}
              alt={alt}
              className={`${styles.image} ${
                showControls && isZoomEnabled ? styles.zoomEnabled : ""
              } ${isFullscreen ? styles.fullscreenActive : ""}`}
            />

            {showControls &&
              isZoomEnabled &&
              isMouseOverImage &&
              (isFullscreen
                ? fullscreenImageRef.current
                : imageRef.current) && (
                <div
                  className={styles.magnifier}
                  style={{
                    left: `${mousePosition.x - magnifierSize / 2}px`,
                    top: `${mousePosition.y - magnifierSize / 2}px`,
                    backgroundImage: `url(${imageUrl})`,
                    backgroundSize: `${zoomLevel * 100}%`,
                    backgroundPosition: getBackgroundPosition(),
                    backgroundRepeat: "no-repeat",
                  }}
                >
                  <div className={styles.zoomLabel}>×{zoomLevel}</div>
                </div>
              )}
          </div>
        </div>

        {metadata && (
          <div className={styles.metadata}>
            <div className={styles.metadataItem}>
              <span className={styles.label}>Dimensions:</span>
              <span className={styles.value}>
                {metadata.width} × {metadata.height} px
              </span>
            </div>
            <div className={styles.metadataItem}>
              <span className={styles.label}>Format:</span>
              <span className={styles.value}>{metadata.format}</span>
            </div>
            {metadata.file_size && (
              <div className={styles.metadataItem}>
                <span className={styles.label}>Size:</span>
                <span className={styles.value}>
                  {(metadata.file_size / 1024).toFixed(2)} KB
                </span>
              </div>
            )}
            {metadata.aspect_ratio && (
              <div className={styles.metadataItem}>
                <span className={styles.label}>Aspect Ratio:</span>
                <span className={styles.value}>{metadata.aspect_ratio}:1</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fullscreen overlay */}
      {showControls && isFullscreen && (
        <div className={styles.fullscreenOverlay}>
          <div
            className={styles.fullscreenControls}
            ref={fullscreenControlsRef}
          >
            <div
              className={styles.fullscreenZoomControl}
              ref={fullscreenZoomMenuRef}
            >
              <button
                className={`${styles.fullscreenControlButton} ${
                  isZoomEnabled ? styles.active : ""
                }`}
                onClick={() => setIsZoomEnabled(!isZoomEnabled)}
                title={isZoomEnabled ? "Disable Zoom" : "Enable Zoom"}
              >
                <FontAwesomeIcon
                  icon={isZoomEnabled ? faSearchMinus : faSearchPlus}
                />
                <span>
                  {isZoomEnabled ? `Zoom ×${zoomLevel}` : "Enable Zoom"}
                </span>
              </button>
              {isZoomEnabled && (
                <div
                  className={`${styles.zoomMenu} ${
                    showZoomMenu ? styles.show : ""
                  }`}
                >
                  <div className={styles.zoomMenuHeader}>Zoom Level</div>
                  {zoomLevels.map((level) => (
                    <button
                      key={level}
                      className={`${styles.zoomOption} ${
                        zoomLevel === level ? styles.selected : ""
                      }`}
                      onClick={() => {
                        setZoomLevel(level);
                        setShowZoomMenu(false);
                      }}
                    >
                      ×{level}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              className={styles.fullscreenControlButton}
              onClick={() => {
                setShowZoomMenu(!showZoomMenu);
              }}
              style={{ display: isZoomEnabled ? "flex" : "none" }}
              title="Change Zoom Level"
            >
              <FontAwesomeIcon icon={faChevronDown} />
            </button>
            <button
              className={styles.fullscreenControlButton}
              onClick={handleFullscreen}
              title="Exit Fullscreen"
            >
              <FontAwesomeIcon icon={faTimes} />
              <span>Exit Fullscreen</span>
            </button>
          </div>
          <div
            className={styles.fullscreenImageContainer}
            onMouseMove={showControls ? handleMouseMove : undefined}
            onMouseLeave={showControls ? handleMouseLeave : undefined}
            onMouseEnter={showControls ? handleMouseEnter : undefined}
          >
            <img
              ref={fullscreenImageRef}
              src={imageUrl}
              alt={alt}
              className={`${styles.fullscreenImage} ${
                showControls && isZoomEnabled ? styles.zoomEnabled : ""
              }`}
            />

            {showControls &&
              isZoomEnabled &&
              isMouseOverImage &&
              fullscreenImageRef.current && (
                <div
                  className={styles.magnifier}
                  style={{
                    left: `${mousePosition.x - magnifierSize / 2}px`,
                    top: `${mousePosition.y - magnifierSize / 2}px`,
                    backgroundImage: `url(${imageUrl})`,
                    backgroundSize: `${zoomLevel * 100}%`,
                    backgroundPosition: getBackgroundPosition(),
                    backgroundRepeat: "no-repeat",
                  }}
                >
                  <div className={styles.zoomLabel}>×{zoomLevel}</div>
                </div>
              )}
          </div>
        </div>
      )}
    </>
  );
};

export default ImagePreview;
