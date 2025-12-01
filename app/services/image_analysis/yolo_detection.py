"""
YOLO Object Detection Service
Uses YOLOv8 for accurate object detection with precise bounding boxes
"""
import io
import json
from PIL import Image
from typing import List, Dict, Optional

try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False
    print("[WARNING] ultralytics not installed. YOLO detection will not be available.")


# Global model instance (lazy loaded)
_yolo_model = None


def get_yolo_model():
    """Get or initialize YOLO model (lazy loading)"""
    global _yolo_model
    if not YOLO_AVAILABLE:
        raise ImportError("ultralytics package is not installed. Install it with: pip install ultralytics")
    
    if _yolo_model is None:
        try:
            print("[INFO] Loading YOLO model (yolov8n.pt)...")
            # Load YOLOv8 model (will download on first use)
            # Using 'yolov8n.pt' (nano) for speed, can use 'yolov8s.pt', 'yolov8m.pt', 'yolov8l.pt', 'yolov8x.pt' for better accuracy
            _yolo_model = YOLO('yolov8n.pt')  # nano model - fastest, good accuracy
            print("[OK] YOLO model loaded successfully: yolov8n.pt")
        except Exception as e:
            print(f"[ERROR] Failed to load YOLO model: {e}")
            raise
    
    return _yolo_model


def detect_objects_yolo(image_bytes: bytes, confidence_threshold: float = 0.25, 
                        person_only: bool = False) -> List[Dict]:
    """
    Detect objects in image using YOLO
    
    Args:
        image_bytes: Image file bytes
        confidence_threshold: Minimum confidence score (0.0-1.0)
        person_only: If True, only return person detections
    
    Returns:
        List of detected objects with format:
        [
            {
                "name": "person",
                "confidence": 0.95,
                "color": "determined from class",
                "size": "small|medium|large",
                "x": 100,
                "y": 200,
                "w": 150,
                "h": 300
            },
            ...
        ]
    """
    if not YOLO_AVAILABLE:
        raise ImportError("YOLO is not available. Install ultralytics: pip install ultralytics")
    
    try:
        # Load image with memory optimization
        image = Image.open(io.BytesIO(image_bytes))
        width, height = image.size
        
        # Resize large images to reduce memory usage (max 1920x1920)
        # YOLO works well with resized images and uses less memory
        max_size = 1920
        if width > max_size or height > max_size:
            ratio = min(max_size / width, max_size / height)
            new_width = int(width * ratio)
            new_height = int(height * ratio)
            image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
            width, height = new_width, new_height
            print(f"[YOLO] Resized image to {width}x{height} for memory optimization")
        
        # Get YOLO model and run detection
        model = get_yolo_model()
        print("[YOLO] Running detection...")
        results = model(image, conf=confidence_threshold, verbose=False)
        print(f"[YOLO] Detection complete. Processing results...")
        
        # Clean up image from memory
        del image
        
        detected_objects = []
        
        # YOLO class names (COCO dataset)
        class_names = model.names
        
        # Color mapping for common classes
        color_map = {
            'person': 'blue',
            'car': 'red',
            'truck': 'orange',
            'bus': 'yellow',
            'bicycle': 'green',
            'motorcycle': 'purple',
            'dog': 'brown',
            'cat': 'pink',
            'bird': 'cyan',
        }
        
        for result in results:
            boxes = result.boxes
            
            for box in boxes:
                # Get class ID and confidence
                class_id = int(box.cls[0])
                confidence = float(box.conf[0])
                class_name = class_names[class_id]
                
                # Filter for person only if requested
                if person_only and class_name != 'person':
                    continue
                
                # Get bounding box coordinates (YOLO returns center_x, center_y, width, height)
                # Convert to top-left corner format (x, y, w, h)
                x_center, y_center, box_width, box_height = box.xywh[0].tolist()
                
                # Convert from center to top-left
                x = int(x_center - box_width / 2)
                y = int(y_center - box_height / 2)
                w = int(box_width)
                h = int(box_height)
                
                # Ensure coordinates are within image bounds
                x = max(0, min(x, width - 1))
                y = max(0, min(y, height - 1))
                w = max(1, min(w, width - x))
                h = max(1, min(h, height - y))
                
                # Determine size category
                area = w * h
                image_area = width * height
                relative_size = area / image_area
                
                if relative_size < 0.01:
                    size = "small"
                elif relative_size < 0.1:
                    size = "medium"
                else:
                    size = "large"
                
                # Get color
                color = color_map.get(class_name, 'gray')
                
                detected_objects.append({
                    "name": class_name,
                    "confidence": round(confidence, 2),
                    "color": color,
                    "size": size,
                    "x": x,
                    "y": y,
                    "w": w,
                    "h": h
                })
        
        # Sort by confidence (highest first)
        detected_objects.sort(key=lambda x: x['confidence'], reverse=True)
        
        # Limit to top 15 detections
        result = detected_objects[:15]
        print(f"[YOLO] Returning {len(result)} detected objects")
        return result
    
    except Exception as e:
        print(f"[ERROR] YOLO detection failed: {e}")
        import traceback
        traceback.print_exc()
        raise


def is_yolo_available() -> bool:
    """Check if YOLO is available"""
    return YOLO_AVAILABLE

