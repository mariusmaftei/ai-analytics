# Testing PDF Upload 🧪

## ✅ Server is Running!

Your PDF processing endpoints are ready to use!

---

## 📝 Quick Test

### Create a Test PDF (if you don't have one)

You can use any PDF file, or create a simple text file and convert it online.

### Test with PowerShell

**Replace `C:\path\to\your\file.pdf` with your actual PDF path:**

```powershell
# Test 1: Basic upload
$file = "C:\path\to\your\file.pdf"
$form = @{
    file = Get-Item -Path $file
}

$response = Invoke-RestMethod -Uri "http://localhost:8080/api/pdf/upload" -Method Post -Form $form

# View results
Write-Host "Filename: $($response.filename)"
Write-Host "Pages: $($response.page_count)"
Write-Host "Words: $($response.word_count)"
Write-Host "First 200 characters:"
Write-Host $response.text.Substring(0, [Math]::Min(200, $response.text.Length))
```

### Test 2: With AI Summary

```powershell
$file = "C:\path\to\your\file.pdf"
$form = @{
    file = Get-Item -Path $file
    analysis_type = "summary"
}

$response = Invoke-RestMethod -Uri "http://localhost:8080/api/pdf/upload" -Method Post -Form $form

# View AI summary
Write-Host "`nAI Summary:"
Write-Host $response.ai_analysis.result
```

### Test 3: Save to Database

```powershell
$file = "C:\path\to\your\file.pdf"
$form = @{
    file = Get-Item -Path $file
    save_to_db = "true"
}

$response = Invoke-RestMethod -Uri "http://localhost:8080/api/pdf/upload" -Method Post -Form $form

Write-Host "✅ Saved to database with ID: $($response.db_id)"
```

---

## 🎯 Expected Response

```json
{
  "status": "success",
  "filename": "your-document.pdf",
  "text": "Full extracted text here...",
  "page_count": 5,
  "character_count": 12543,
  "word_count": 2156,
  "metadata": {
    "title": "Document Title",
    "author": "Author Name",
    "subject": "",
    "creator": "Microsoft Word",
    "creation_date": "D:20240101120000"
  },
  "extracted_at": "2024-11-08T10:30:00.123456"
}
```

---

## 🔧 Troubleshooting

### Error: "Cannot find path"
- Check your file path is correct
- Use full absolute path: `C:\Users\...\document.pdf`
- Make sure file exists

### Error: "Invalid file type"
- Only `.pdf` files are accepted
- Check file extension

### Error: "Failed to extract PDF"
- PDF might be encrypted
- PDF might be corrupted
- Try with a different PDF

### No text extracted (empty string)
- PDF might be scanned images (needs OCR)
- PDF might have only images, no text

---

## 📊 What Gets Extracted

✅ **Plain text** from PDF
✅ **Metadata** (title, author, dates)
✅ **Page count**
✅ **Word/character counts**
✅ **Page-by-page** breakdown
❌ Images (not yet - can add if needed)
❌ Tables as structured data (plain text only)

---

## 🚀 Next: Integrate with Frontend

Ready to connect this to your React app? Just let me know!

The frontend would:
1. Have file upload button
2. Send to `/api/pdf/upload`
3. Display extracted text
4. Show AI analysis
5. Allow user to chat about the PDF content

---

**Server Running**: ✅
**Endpoints Ready**: ✅
**Ready to Test**: ✅

Try uploading a PDF now! 🎉

