# Modal Component Usage Examples

## Import the Modal

```javascript
import Modal from "../../components/UI/Modal/Modal";
import { faTrash, faWarning, faInfoCircle } from "@fortawesome/free-solid-svg-icons";
```

## Basic Setup

```javascript
const [modalOpen, setModalOpen] = useState(false);

const handleCriticalAction = () => {
  setModalOpen(true);
};

const confirmAction = () => {
  // Perform your critical action here
  console.log("Action confirmed!");
};
```

## Example 1: Delete Confirmation (Danger - Red)

```jsx
<Modal
  isOpen={deleteModalOpen}
  onClose={() => setDeleteModalOpen(false)}
  onConfirm={confirmDelete}
  title="Delete Session"
  message="Are you sure you want to delete this session? This action cannot be undone."
  confirmText="Delete"
  cancelText="Cancel"
  type="danger"
  icon={faTrash}
/>
```

## Example 2: Warning Action (Warning - Yellow/Orange)

```jsx
<Modal
  isOpen={warningModalOpen}
  onClose={() => setWarningModalOpen(false)}
  onConfirm={confirmOverwrite}
  title="Overwrite Existing File"
  message="A file with this name already exists. Do you want to overwrite it?"
  confirmText="Overwrite"
  cancelText="Cancel"
  type="warning"
  icon={faWarning}
/>
```

## Example 3: Info/Confirmation (Info - Green)

```jsx
<Modal
  isOpen={infoModalOpen}
  onClose={() => setInfoModalOpen(false)}
  onConfirm={confirmExport}
  title="Export Data"
  message="Your data will be exported in CSV format. This may take a few moments."
  confirmText="Export"
  cancelText="Cancel"
  type="info"
  icon={faDownload}
/>
```

## Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | boolean | - | Controls modal visibility (required) |
| `onClose` | function | - | Called when modal is closed (required) |
| `onConfirm` | function | - | Called when confirm button is clicked (required) |
| `title` | string | - | Modal title (required) |
| `message` | string | - | Modal message/description (required) |
| `confirmText` | string | "Confirm" | Text for confirm button |
| `cancelText` | string | "Cancel" | Text for cancel button |
| `type` | string | "danger" | Visual style: "danger", "warning", or "info" |
| `icon` | icon | faTriangleExclamation | FontAwesome icon to display |

## Full Implementation Example

```javascript
import React, { useState } from "react";
import Modal from "../../components/UI/Modal/Modal";
import { faTrash } from "@fortawesome/free-solid-svg-icons";

const MyComponent = () => {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const handleDeleteClick = (itemId) => {
    setItemToDelete(itemId);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    // Perform delete action
    console.log("Deleting item:", itemToDelete);
    // API call or state update here
    setItemToDelete(null);
  };

  return (
    <>
      <button onClick={() => handleDeleteClick(123)}>
        Delete Item
      </button>

      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Item"
        message="Are you sure you want to delete this item? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        icon={faTrash}
      />
    </>
  );
};
```

## Features

- ✅ Backdrop click to close
- ✅ ESC key support (built-in)
- ✅ Smooth animations
- ✅ Mobile responsive
- ✅ Matches app's dark theme
- ✅ Three color variants (danger/warning/info)
- ✅ Custom icons support
- ✅ Prevents accidental clicks with overlay

