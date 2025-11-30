"""
PDF Analysis Prompts
Contains all prompt building functions for PDF/document analysis types
"""


def build_document_insight_prompt(document_text, metadata, tables=None, analysis_type='overview'):
    """
    Build the insight generation prompt for PDF/other documents
    
    Args:
        document_text: Extracted text from the document
        metadata: Dictionary with metadata about the document
        tables: List of extracted tables (optional)
        analysis_type: Type of analysis to perform ('overview', 'structure', 'content', 'summary', 'keywords')
    
    Returns:
        str: The formatted prompt for document analysis
    """
    category_instruction = ""
    short_description_instruction = ""
    summary_instruction = ""
    content_instruction = ""
    structure_instruction = ""
    keywords_instruction = ""
    
    if analysis_type == 'structure':
        structure_instruction = """IMPORTANT: Format your response EXACTLY as follows. You MUST include all three sections:

SECTION A: STRUCTURAL_MAP
[Provide a hierarchical tree representation of the document structure. Format as a tree with indentation using "├─" and "└─" characters. Show the main sections, subsections, and major document elements.

Example format:
Document
 ├─ Title Page
 ├─ Table of Contents
 ├─ Section 1: Introduction
 ├─ Section 2: Methods
 │    ├─ Subsection A: Methodology
 │    └─ Subsection B: Data Collection
 ├─ Section 3: Results
 │    ├─ Results Overview
 │    └─ Detailed Analysis
 └─ Appendix

List all major sections, subsections, and document elements in hierarchical order.]

SECTION B: PAGE_LAYOUT_DETECTION
[For each page or page range, describe the layout type. You MUST analyze what elements are present on each page (title, images, tables, text, headings, etc.) and combine them accurately.

Format EXACTLY as (use en dash – not colon):
Page 1 – Title page
Page 2 – Table
Page 3 – Image + text
Page 4 – Title + image
Page 5 – 100% text
Page 6-7 – Text with headings
Page 8 – Image only
Page 9 – Table + text
Page 10 – Title page + image

IMPORTANT RULES:
1. Use en dash (–) between page number and description, NOT colon (:)
2. Each page description should be on a NEW LINE
3. Detect and combine elements accurately:
   - If a page has both title and image: "Title + image"
   - If a page has image and text: "Image + text"
   - If a page has table and text: "Table + text"
   - If a page has title, image, and text: "Title + image + text"
   - If a page is mostly text: "100% text" or "Text with headings"
   - If a page has only images: "Image only" or "Images"
   - If a page is blank: "Blank"
4. Be specific about what you detect - don't just say "text", describe what kind (e.g., "Text with headings", "Text with bulleted list")
5. If the document has many similar consecutive pages, group them: "Page 5-7 – Text with headings"
6. Each page should be listed separately unless they are truly identical

Analyze the document text carefully to identify what elements appear on each page based on the content structure.]

SECTION C: FORMATTING_SUMMARY
[Provide a summary of formatting elements detected in the document. Format as:
Headings detected: [number]
Font styles: [number]
Paragraph blocks: [number]
Lists: [number] bulleted, [number] numbered
Tables: [number]
Images: [number]
Other elements: [description if any]

Example:
Headings detected: 14
Font styles: 4
Paragraph blocks: 112
Lists: 9 bulleted, 4 numbered
Tables: 2
Images: 7]

CRITICAL REQUIREMENTS:
1. You MUST include all three sections: SECTION A, SECTION B, and SECTION C
2. Start each section with "SECTION A:", "SECTION B:", or "SECTION C:" on its own line
3. ABSOLUTELY NO emojis, symbols, or special characters (NO ✅, ❌, ⚙️, 🔍, ⚠️, or any other emojis)
4. NO markdown symbols (**, |, bullets, etc.) - use plain text only
5. Structural Map should use tree characters (├─, └─, │) for hierarchy
6. Page Layout should be concise and descriptive
7. Formatting Summary should list counts for each element type
8. Keep all text clean, readable, and professional - plain text only
9. Do NOT skip any section - all three sections are required

"""
    elif analysis_type == 'content':
        content_instruction = """IMPORTANT: Format your response EXACTLY as follows. You MUST include all sections:

SECTION A: SECTION_BREAKDOWN
[Provide a detailed section-by-section breakdown of the document. For each major section, list it with a brief description of its key points and main themes. Format as:
Section Name: Brief description of key points, main themes, and important content in this section.
Section Name: Brief description...

Example:
Executive Summary: Key points include revenue growth of 15% YoY, Q4 performance highlights, and strategic recommendations. Main themes focus on financial stability and market expansion.
Financial Analysis: Revenue numbers show strong performance across all regions. Comparisons indicate 20% increase in international markets. Detailed breakdowns of quarterly results.
Conclusions: Final recommendations emphasize continued investment in R&D and expansion into Asian markets. Risk assessments highlight market volatility concerns.]

SECTION B: ENTITIES_AND_CONCEPTS
[Extract and categorize all important entities and concepts from the document. Format as:
People: [comma-separated list of person names, e.g., "John Doe, Sarah Li, Michael Chen"]
Organizations: [comma-separated list of organization names, e.g., "Acme Corp, Tech Industries, Global Solutions"]
Places: [comma-separated list of locations, e.g., "USA, Asia, Europe, New York"]
Topics: [comma-separated list of main topics/themes, e.g., "Revenue, Marketing, AI, Budgeting, Strategy"]

If a category has no items, use "None" or leave it empty.]

SECTION C: SENTIMENT_ANALYSIS
[Analyze the overall sentiment and tone of the document. Format as:
Overall Tone: [Professional/Analytical/Neutral/Positive/Negative/Formal/Casual]
Sentiment: [Positive/Negative/Neutral/Mixed]
Key Observations: [Brief description of tone characteristics, e.g., "Professional and analytical tone throughout. Positive sentiment in growth sections, neutral in data presentation."]

If sentiment analysis is not applicable, use "Neutral" and "Not applicable".]

CRITICAL REQUIREMENTS:
1. You MUST include all three sections: SECTION A, SECTION B, and SECTION C
2. Start each section with "SECTION A:", "SECTION B:", or "SECTION C:" on its own line
3. ABSOLUTELY NO emojis, symbols, or special characters (NO ✅, ❌, ⚙️, 🔍, ⚠️, or any other emojis)
4. NO markdown symbols (**, |, bullets, etc.) - use plain text only
5. Section Breakdown should list each major section with a colon and description (format: "Section Name: Description")
6. Entities should be comma-separated lists within each category (format: "People: Name1, Name2" or "People: None")
7. Keep all text clean, readable, and professional - plain text only
8. Do NOT skip any section - all three sections are required
9. Do NOT include any decorative elements, emojis, or visual symbols in your response

"""
    elif analysis_type == 'summary':
        summary_instruction = """IMPORTANT: Format your response EXACTLY as follows. You MUST include all three sections:

SECTION A: EXECUTIVE_SUMMARY
[Write a polished, human-like summary of the entire document in 3-7 sentences. This should be a comprehensive, flowing paragraph that captures the essence of the document. Use professional language and make it read naturally, as if written by a human executive assistant. Write complete sentences, not bullet points.]

SECTION B: KEY_HIGHLIGHTS
[Provide 4-8 bullet points with major findings, important points, or key takeaways from the document. Each bullet should be a complete sentence or phrase that highlights a significant aspect of the document. Format each as a simple bullet point starting with "- " on a new line. Example:
- Company revenue increased by 15% YoY
- Document focuses on Q4 performance
- Includes 2 risk assessments
- Introduces new product roadmap]

SECTION C: SECTION_HEADINGS
[List all major section headings detected in the document. Format as a numbered list (1., 2., 3., etc.) with each heading on a new line. Include only the main section/chapter titles, not sub-sections. If the document has a table of contents, use those headings. Otherwise, identify the main structural divisions of the document. Example:
1. Introduction
2. Financial Performance
3. Market Analysis
4. Future Outlook]

CRITICAL REQUIREMENTS:
1. You MUST include all three sections: SECTION A, SECTION B, and SECTION C
2. Start each section with "SECTION A:", "SECTION B:", or "SECTION C:" on its own line
3. NO markdown symbols (**, |, ✅, ❌, ⚙️) - use plain text only
4. Executive Summary (SECTION A) should be 3-7 complete sentences in paragraph form (no bullets, no numbering)
5. Key Highlights (SECTION B) should be bullet points with "- " prefix, each on a new line
6. Section Headings (SECTION C) should be numbered with "1. ", "2. ", etc., each on a new line
7. Keep all text clean, readable, and professional
8. Do NOT skip any section - all three sections are required

"""
    elif analysis_type == 'overview':
        category_instruction = """IMPORTANT: Start your response with a concise document category. Format it EXACTLY as:
"DOCUMENT_CATEGORY: [Category Name]"

The category should be a SHORT, SPECIFIC label (2-4 words maximum) such as:
- "User Guide Manual"
- "Financial Report"
- "Technical Specification"
- "Research Paper"
- "Product Catalog"
- "Legal Document"
- "Training Material"
- "Marketing Brochure"

Do NOT use long descriptions. Just provide the category name.

"""
        short_description_instruction = """After the category, provide a SHORT_DESCRIPTION section. Format it EXACTLY as:
"SHORT_DESCRIPTION: [4-5 sentence summary of the entire document]"

The short description should be:
- 4-5 complete sentences
- A comprehensive summary of what the document contains
- Written in plain, readable text
- NO markdown, NO structured data, NO tables, NO special formatting
- Just clean, flowing sentences that describe the document's purpose and content

Example format:
SHORT_DESCRIPTION: This user guide provides comprehensive instructions for setting up and using the Focusrite Scarlett 2i2 audio interface. It covers hardware connections, software installation, and basic operation procedures. The guide includes detailed explanations of all controls and features, troubleshooting tips, and technical specifications. It is designed for both beginners and experienced users who want to maximize their audio recording capabilities.

"""
    elif analysis_type == 'keywords':
        keywords_instruction = """IMPORTANT: Format your response EXACTLY as follows. You MUST include all three sections:

SECTION A: KEYWORD_FREQUENCY
[Extract the most important keywords and terms from the document, along with their frequency counts. Keywords are ALWAYS useful regardless of document type (user manuals, reports, guides, technical docs, etc.).

Format as:
Installation (32)
Settings (27)
Configuration (19)
Troubleshooting (16)
Safety (15)
...

For user manuals/guides, extract terms like: Installation, Settings, Configuration, Troubleshooting, Safety, Power, Battery, Wi-Fi, Factory Reset, etc.
For business documents, extract terms like: Revenue, Market, Performance, Growth, Sales, etc.
For technical docs, extract terms like: API, Endpoint, Authentication, Database, etc.

List keywords in descending order of frequency. Include at least 15-30 keywords. Only include significant terms (nouns, important concepts, technical terms, product names, not common words like "the", "and", "is", etc.).]

SECTION B: TOPIC_CLUSTERS
[Group related keywords into topic clusters based on the document type and content. Format as:

For user manuals/guides:
Cluster: Setup & Installation
- Installation
- Configuration
- Setup
- Initialization

Cluster: Operations
- Settings
- Controls
- Functions
- Features

Cluster: Troubleshooting
- Troubleshooting
- Errors
- Problems
- Solutions

For business documents:
Cluster: Finance
- Revenue
- Costs
- Profit margin
- Budget

Cluster: Operations
- Distribution
- Supply chain
- Logistics

Create 3-6 meaningful clusters based on the document content. Each cluster should have 3-8 related keywords. Adapt cluster names to match the document type (e.g., "Hardware Features" for user manuals, "Financial Performance" for reports).]

SECTION C: KEYWORDS_LIST
[Provide a comprehensive, searchable list of all important keywords and terms found in the document. Format as a simple list, one keyword per line:
Installation
Settings
Configuration
Troubleshooting
Safety
Power
Battery
Wi-Fi
Factory Reset
...

Include all significant terms from the document - technical terms, product names, concepts, procedures, features, etc. This should be a comprehensive list for search/filter functionality. Include at least 20-40 keywords.]

CRITICAL REQUIREMENTS:
1. You MUST include all three sections: SECTION A, SECTION B, and SECTION C
2. Start each section with "SECTION A:", "SECTION B:", or "SECTION C:" on its own line
3. ABSOLUTELY NO emojis, symbols, or special characters (NO ✅, ❌, ⚙️, 🔍, ⚠️, or any other emojis)
4. NO markdown symbols (**, |, bullets, etc.) - use plain text only
5. Keyword Frequency should show count in parentheses: "Keyword (count)"
6. Topic Clusters should use "Cluster: Name" format followed by bullet points with "- "
7. Keywords List should be a simple list, one per line
8. Keep all text clean, readable, and professional - plain text only
9. Do NOT skip any section - all three sections are required
10. Keywords are ALWAYS useful - extract them from ANY document type (manuals, reports, guides, technical docs, etc.)

"""
    
    if analysis_type == 'content':
        prompt = f"""Analyze this document in detail and provide comprehensive content analysis.

{content_instruction}Document Text:
{document_text[:10000]}

Generate the content analysis with all three sections (A, B, and C):"""
        return prompt
    elif analysis_type == 'summary':
        prompt = f"""Analyze this document and provide a comprehensive executive summary.

{summary_instruction}Document Text:
{document_text[:10000]}

Generate the summary with all three sections (A, B, and C):"""
        return prompt
    elif analysis_type == 'structure':
        prompt = f"""Analyze this document's structure, layout, and formatting.

{structure_instruction}Document Text:
{document_text[:10000]}

Metadata:
- Total Pages: {metadata.get('totalPages', 'N/A')}
- Word Count: {metadata.get('wordCount', 'N/A')}
- Tables: {len(tables) if tables else 0}
- Images: {metadata.get('imageCount', metadata.get('image_count', 0))}
- Sections Detected: {metadata.get('sectionCount', 'N/A')}

IMPORTANT INSTRUCTIONS FOR PAGE LAYOUT DETECTION:
1. Carefully analyze the document text to identify what appears on each page
2. Look for structural markers like:
   - Title pages (usually at the beginning, contain document title, author, etc.)
   - Table of contents (lists of sections with page numbers)
   - Headings and section breaks (indicate new sections)
   - Tables (structured data in rows and columns)
   - Images (visual content - may be mentioned in text or detected from structure)
3. For each page, identify ALL elements present:
   - If page 1 has a title AND mentions images or visual content: "Title + image"
   - If a page has both a table and explanatory text: "Table + text"
   - If a page has headings and body text: "Text with headings"
   - Be specific and accurate about combinations
4. Use the en dash (–) format: "Page X – Description"
5. Each page should be on a separate line

IMPORTANT: Use the exact image count from the metadata above ({metadata.get('imageCount', metadata.get('image_count', 0))}) in the Formatting Summary section. Do not guess or estimate.

Generate the structure analysis with all three sections (A, B, and C):"""
        return prompt
    elif analysis_type == 'keywords':
        prompt = f"""Extract and analyze keywords, key terms, and concepts from this document.

{keywords_instruction}Document Text:
{document_text[:10000]}

Generate the keywords extraction with all three sections (A, B, and C):"""
        return prompt
    
    prompt = f"""Analyze this document comprehensively and provide structured insights.

{category_instruction}{short_description_instruction}For non-CSV documents, provide structured insights organized in the following categories. For EACH category, provide key-value pairs in this format:

**Category Name:**
Key | Value | Description

Example:
**Document Overview:**
document_type | "Product Catalog" | Type inferred from structure/content
page_count | {metadata.get('totalPages', 'N/A')} | Total pages
word_count | {metadata.get('wordCount', 'N/A')} | Total words
table_count | {len(tables) if tables else 0} | Number of tables detected
language | "English" | Detected document language

Provide insights in these categories:

1. **Document Overview:**
   - document_type, page_count, word_count, table_count, language, read_time_minutes, author, title

2. **Structural Insights:**
   - has_tables, avg_table_rows, contains_images, page_layout_pattern, chapter_count, section_count

3. **Product-Level Insights** (if applicable):
   - total_skus_detected, common_prefixes, common_materials, common_sizes_mm, common_categories, price_range

4. **Statistical Insights:**
   - most_common_word, unique_terms_count, numeric_density, sku_density, average_words_per_page, data_completeness

5. **Semantic Insights:**
   - document_category (SHORT label like "User Guide Manual" or "Financial Report" - 2-4 words max)
   - document_purpose, tone, target_audience, writing_style, content_focus

6. **AI Summary:**
   - summary (2-3 sentence comprehensive summary), insight_quality_score (0-1), key_findings (list of 2-4 highlights)

7. **Recommendations** (optional):
   - recommended_actions (list of 2-3 practical suggestions)

For each key-value pair, use the format: key | value | description
Use "N/A" if a value cannot be determined. Be specific with numbers, percentages, and quantifiable data.

Document Text:
{document_text[:10000]}

Generate structured insights:"""
    
    return prompt

