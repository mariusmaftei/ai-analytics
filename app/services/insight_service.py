"""
Insight Generation Service
Handles AI prompt construction and insight generation for documents
All prompts are built server-side for security and consistency
"""

from config.gemini import generate_text_stream

def build_csv_insight_prompt(csv_data, columns, metadata, analysis_type='overview'):
    """
    Build the insight generation prompt for CSV files
    This is kept on the backend for security and consistency
    
    Args:
        csv_data: List of dictionaries representing CSV rows
        columns: List of column names
        metadata: Dictionary with metadata about the CSV
        analysis_type: Type of analysis to perform ('overview', 'statistical', 'patterns', 'quality', 'trends', 'correlation')
    """
    total_rows = metadata.get('totalRows', len(csv_data))
    total_columns = metadata.get('totalColumns', len(columns))
    has_headers = metadata.get('hasHeaders', True)
    
    # Format CSV data for analysis
    data_context = f"CSV Data Analysis:\n"
    data_context += f"Columns: {', '.join(columns)}\n"
    data_context += f"Total Rows: {total_rows}\n"
    data_context += f"Total Columns: {total_columns}\n"
    data_context += f"Has Headers: {'Yes' if has_headers else 'No'}\n\n"
    data_context += f"Complete Dataset:\n"
    
    for idx, row in enumerate(csv_data, 1):
        row_str = ', '.join([f"{key}: {value}" for key, value in row.items()])
        data_context += f"Row {idx}: {row_str}\n"
    
    # Build different prompts based on analysis type
    if analysis_type == 'overview':
        return _build_overview_prompt(data_context, total_rows, total_columns, columns, has_headers)
    elif analysis_type == 'statistical':
        return _build_statistical_prompt(data_context, total_rows, total_columns, columns)
    elif analysis_type == 'patterns':
        return _build_patterns_prompt(data_context, total_rows, total_columns, columns)
    elif analysis_type == 'quality':
        return _build_quality_prompt(data_context, total_rows, total_columns, columns, has_headers)
    elif analysis_type == 'trends':
        return _build_trends_prompt(data_context, total_rows, total_columns, columns)
    elif analysis_type == 'correlation':
        return _build_correlation_prompt(data_context, total_rows, total_columns, columns)
    else:
        # Default to overview
        return _build_overview_prompt(data_context, total_rows, total_columns, columns, has_headers)


def _build_overview_prompt(data_context, total_rows, total_columns, columns, has_headers):
    """Build overview analysis prompt"""
    prompt = f"""You are a data analyst analyzing a CSV file. Provide a COMPREHENSIVE overview analysis with detailed information.

IMPORTANT: Return clean, readable text WITHOUT markdown symbols (no **, no |, no ✅, no ❌, no ⚙️). Use plain text with clear section headers and simple formatting.

MANDATORY FORMAT - Use this EXACT structure and fill in ALL values from the actual data:

SECTION: Document Overview
File Type: CSV
Purpose: [Provide a detailed 1-2 sentence description of what this data represents - be specific about the business context]
Rows: [exact count of all rows]
Columns: [exact count of all columns]
Column Names: [list all column names separated by commas]
Contains Headers: Yes
Contains Missing Values: None
File Structure Quality: High
Data Completeness: 100%
Confidence Score: 0.95

SECTION: Key Insights
Transaction Summary:
- Total Transactions: [exact count - count all rows]
- Total Revenue: $[sum all Revenue values, format as X,XXX.XX with proper decimal places]
- Average Revenue per Transaction: $[calculate: total revenue / total transactions, format as X,XXX.XX]
- Most Frequent Region: [region name with highest count] ([exact count] transactions)
- Average Quantity Sold: [calculate average of all Quantity values, format with 2 decimals] units
- Date Range: [earliest date] to [latest date] (if Date column exists)

Product Analysis:
- Products Sold: [list ALL unique products from Product column, comma-separated]
- Total Unique Products: [count of unique products]
- Top Revenue Product: [product name] - $[sum of Revenue for this product] (approximately [percentage]% of total revenue)
- Lowest Revenue Product: [product name] - $[sum of Revenue for this product]
- Price Range: $[minimum Unit_Price] to $[maximum Unit_Price]
- Average Unit Price: $[calculate average of all Unit_Price values]

Customer Analysis (if Customer_ID column exists):
- Total Unique Customers: [count of unique customer IDs]
- Average Transactions per Customer: [calculate if applicable]

SECTION: Regional Insights
[Region 1]: Transactions: [count], Total Revenue: $[sum], Avg Revenue per Transaction: $[average]
[Region 2]: Transactions: [count], Total Revenue: $[sum], Avg Revenue per Transaction: $[average]
[Add one line for EVERY unique region found in the data]

SECTION: Data Quality
- No missing values detected
- Consistent headers and field types
- Correct numeric formatting (currency and quantity)
- All transactions have valid data
- Good candidate for visualization (revenue by region, category, or customer)
- Data is ready for business intelligence analysis

SECTION: Patterns and Trends
- [Write a detailed pattern observation based on the data - e.g., "North America region shows highest revenue concentration"]
- [Write another pattern - e.g., "Electronics category dominates product sales"]
- [Write another pattern - e.g., "Revenue distribution shows [specific insight]"]
- [Write another pattern - e.g., "Quantity patterns indicate [specific trend]"]

SECTION: AI Summary
This CSV contains [detailed 2-3 sentence description of the dataset]. Key findings include: [finding 1], [finding 2], and [finding 3]. The data reveals [important business insight].

CRITICAL REQUIREMENTS:
1. Start EVERY section with "SECTION: [Section Name]" on its own line
2. Use colons (:) for key-value pairs, not pipes
3. Use dashes (-) for ALL bullet points
4. NO markdown symbols (**, |, ✅, ❌, ⚙️) - use plain text only
5. Calculate ALL numbers from the ACTUAL data provided above - do NOT make up numbers
6. Include ALL 6 sections - missing any section is NOT acceptable
7. Each section must be clearly separated with blank lines
8. Be thorough and detailed - provide comprehensive analysis
9. For Regional Insights, include EVERY unique region found in the data
10. Keep text clean and readable for users

{data_context}

Now generate the complete structured insights with ALL 6 sections filled with actual calculated values:"""
    return prompt


def _build_statistical_prompt(data_context, total_rows, total_columns, columns):
    """Build statistical analysis prompt"""
    prompt = f"""You are a data analyst performing statistical analysis on a CSV file. Focus on statistical measures, distributions, and numerical summaries.

IMPORTANT: Return clean, readable text WITHOUT markdown symbols (no **, no |, no ✅, no ❌, no ⚙️). Use plain text with clear section headers and simple formatting.

MANDATORY FORMAT - Use this EXACT structure:

SECTION: Statistical Summary
Statistic: Quantity: [value], Unit_Price: [value], Revenue: [value]
Mean: Quantity: [value], Unit_Price: [value], Revenue: [value]
Median: Quantity: [value], Unit_Price: [value], Revenue: [value]
Mode: Quantity: [value], Unit_Price: [value], Revenue: [value]
Std Dev: Quantity: [value], Unit_Price: [value], Revenue: [value]
Variance: Quantity: [value], Unit_Price: [value], Revenue: [value]
Min: Quantity: [value], Unit_Price: [value], Revenue: [value]
Max: Quantity: [value], Unit_Price: [value], Revenue: [value]
Range: Quantity: [value], Unit_Price: [value], Revenue: [value]
Q1 (25th Percentile): Quantity: [value], Unit_Price: [value], Revenue: [value]
Q2 (50th Percentile): Quantity: [value], Unit_Price: [value], Revenue: [value]
Q3 (75th Percentile): Quantity: [value], Unit_Price: [value], Revenue: [value]
IQR: Quantity: [value], Unit_Price: [value], Revenue: [value]
Skewness: Quantity: [value], Unit_Price: [value], Revenue: [value]
Distribution Shape: Quantity: [description], Unit_Price: [description], Revenue: [description]

SECTION: Column Statistics
For each numeric column, provide detailed statistics:

[Column Name]:
- Count: [value]
- Mean: [value]
- Median: [value]
- Mode: [value]
- Standard Deviation: [value]
- Min: [value]
- Max: [value]
- Range: [value]
- 25th Percentile: [value]
- 50th Percentile: [value]
- 75th Percentile: [value]
- 90th Percentile: [value]
- 95th Percentile: [value]

SECTION: Distribution Analysis
Normal vs. Skewed Distributions:
- [Column Name]: [Description of distribution shape]
- [Column Name]: [Description of distribution shape]

Outlier Detection and Count:
- Using the IQR method (1.5 * IQR above Q3 or below Q1):
- [Column Name]: [Outlier analysis and count]
- [Column Name]: [Outlier analysis and count]

Data Spread Analysis:
- [Column Name]: [Description of data spread]
- [Column Name]: [Description of data spread]

Frequency Distributions for Categorical Columns:
- [Column Name]:
- [Value]: [Count]
- [Value]: [Count]

SECTION: Comparative Statistics
Comparing Statistics Across Columns:
- [Comparison insights]

Identifying Columns with Similar Distributions:
- [Similarity analysis]

Highlighting Statistical Anomalies:
- [Anomaly description]

CRITICAL REQUIREMENTS:
1. Start EVERY section with "SECTION: [Section Name]" on its own line
2. Use colons (:) for key-value pairs, not pipes
3. Use dashes (-) for ALL bullet points
4. NO markdown symbols (**, |, ✅, ❌, ⚙️) - use plain text only
5. Calculate ALL numbers from the ACTUAL data provided above
6. Include ALL sections
7. Each section must be clearly separated with blank lines
8. Keep text clean and readable for users

{data_context}

Now generate the complete statistical analysis with ALL sections filled with actual calculated values:"""
    return prompt


def _build_patterns_prompt(data_context, total_rows, total_columns, columns):
    """Build pattern detection prompt"""
    prompt = f"""You are a data analyst identifying patterns and trends in a CSV file. Focus on discovering meaningful patterns, relationships, and insights.

IMPORTANT: Return clean, readable text WITHOUT markdown symbols (no **, no |, no ✅, no ❌, no ⚙️). Use plain text with clear section headers and simple formatting.

MANDATORY FORMAT - Use this EXACT structure:

SECTION: Pattern Identification
- Recurring sequences or cycles: [Pattern description]
- Seasonal or temporal patterns (if date columns exist): [Temporal pattern description]
- Clustering patterns in the data: [Clustering description]
- Frequency patterns: [Frequency pattern description]

SECTION: Value Patterns
- Most common values and their frequencies:
- [Column Name]: [Value] ([Count] occurrences)
- [Column Name]: [Value] ([Count] occurrences)
- Rare or unusual values: [Unusual value description]
- Value ranges and distributions: [Range analysis]
- Patterns in categorical data: [Categorical pattern description]

SECTION: Relationship Patterns
- Correlations between columns: [Correlation description]
- Conditional patterns (if X then Y): [Conditional pattern description]
- Grouping patterns: [Grouping description]
- Hierarchical patterns: [Hierarchical description]

SECTION: Business Patterns
- Sales patterns (if applicable): [Sales pattern description]
- Customer behavior patterns: [Customer pattern description]
- Product patterns: [Product pattern description]
- Geographic patterns (if location data exists): [Geographic pattern description]

SECTION: Anomaly Patterns
- Unusual data points: [Anomaly description]
- Outliers and their characteristics: [Outlier description]
- Data inconsistencies: [Inconsistency description]
- Missing data patterns: [Missing data pattern description]

CRITICAL REQUIREMENTS:
1. Start EVERY section with "SECTION: [Section Name]" on its own line
2. Use dashes (-) for ALL bullet points
3. NO markdown symbols (**, |, ✅, ❌, ⚙️) - use plain text only
4. Include ALL sections
5. Each section must be clearly separated with blank lines
6. Keep text clean and readable for users
7. Base all patterns on ACTUAL data provided above

{data_context}

Now generate the complete pattern analysis with ALL sections filled with actual patterns from the data:"""
    return prompt


def _build_quality_prompt(data_context, total_rows, total_columns, columns, has_headers):
    """Build data quality analysis prompt"""
    prompt = f"""You are a data quality analyst assessing the quality of a CSV file. Focus on data completeness, consistency, accuracy, and validity.

IMPORTANT: Return clean, readable text WITHOUT markdown symbols (no **, no |, no ✅, no ❌, no ⚙️). Use plain text with clear section headers and simple formatting.

MANDATORY FORMAT - Use this EXACT structure:

SECTION: Data Completeness
- Missing values count per column:
- [Column Name]: [Count] missing values ([Percentage]%)
- [Column Name]: [Count] missing values ([Percentage]%)
- Rows with missing values: [Count] rows contain missing values
- Completeness score: Overall [Score]% complete

SECTION: Data Consistency
- Format consistency (dates, numbers, text):
- Dates: [Status description]
- Numbers: [Status description]
- Text: [Status description]
- Value consistency across columns: [Consistency description]
- Duplicate records: [Count] duplicate rows found
- Inconsistent naming conventions: [Naming issue description]

SECTION: Data Accuracy
- Invalid values (e.g., negative prices, future dates): [Invalid value description]
- Out-of-range values: [Out-of-range description]
- Type mismatches: [Type mismatch description]
- Format errors: [Format error description]

SECTION: Data Validity
- Business rule violations: [Violation description]
- Referential integrity issues: [Integrity issue description]
- Constraint violations: [Constraint violation description]
- Logical inconsistencies: [Logical inconsistency description]

SECTION: Quality Metrics
Metric | Score | Description
Overall Quality | [0-100] | [Description]
Column-Level Average | [0-100] | [Description]
Row-Level Average | [0-100] | [Description]

SECTION: Recommendations
- Specific data cleaning steps needed:
- [Step 1]
- [Step 2]
- [Step 3]
- Priority issues to address:
- [Priority 1]
- [Priority 2]
- Data quality improvement suggestions:
- [Suggestion 1]
- [Suggestion 2]

CRITICAL REQUIREMENTS:
1. Start EVERY section with "SECTION: [Section Name]" on its own line
2. Use dashes (-) for ALL bullet points
3. NO markdown symbols (**, |, ✅, ❌, ⚙️) - use plain text only
4. For Quality Metrics table, use pipe (|) separators ONLY for that table
5. Include ALL sections
6. Each section must be clearly separated with blank lines
7. Keep text clean and readable for users
8. Base all assessments on ACTUAL data provided above

{data_context}

Now generate the complete data quality assessment with ALL sections filled with actual quality metrics from the data:"""
    return prompt


def _build_trends_prompt(data_context, total_rows, total_columns, columns):
    """Build trends analysis prompt"""
    prompt = f"""You are a data analyst identifying trends in a CSV file. Focus on temporal trends, changes over time, and directional patterns.

IMPORTANT: Return clean, readable text WITHOUT markdown symbols (no **, no |, no ✅, no ❌, no ⚙️). Use plain text with clear section headers and simple formatting.

MANDATORY FORMAT - Use this EXACT structure:

SECTION: Temporal Trends
- Trends over time (if date columns exist): [Temporal trend description]
- Growth or decline patterns: [Growth/decline description]
- Seasonal variations: [Seasonal pattern description]
- Cyclical patterns: [Cyclical pattern description]

SECTION: Value Trends
- Increasing or decreasing values:
- [Column Name]: [Trend direction] ([Rate]% change)
- [Column Name]: [Trend direction] ([Rate]% change)
- Trend direction (upward, downward, stable): [Trend direction analysis]
- Rate of change: [Rate of change description]
- Acceleration or deceleration: [Acceleration/deceleration description]

SECTION: Comparative Trends
- Trends across different categories:
- [Category 1]: [Trend description]
- [Category 2]: [Trend description]
- Relative performance trends: [Performance trend description]
- Market share trends (if applicable): [Market share trend description]
- Comparative growth rates: [Growth rate comparison]

SECTION: Trend Analysis
- Short-term vs long-term trends:
- Short-term: [Description]
- Long-term: [Description]
- Trend strength and significance: [Strength analysis]
- Trend reversals or inflection points: [Reversal/inflection description]
- Projected trends (if data supports): [Projection description]

SECTION: Business Trends
- Sales trends: [Sales trend description]
- Customer trends: [Customer trend description]
- Product trends: [Product trend description]
- Regional trends (if applicable): [Regional trend description]

SECTION: Trends Summary
- [Overall trend summary - e.g., "Revenue fluctuates"]
- [Seasonal pattern summary - e.g., "No seasonal pattern (insufficient data)"]
- [Transaction pattern - e.g., "Stable number of transactions per day"]

CRITICAL REQUIREMENTS:
1. Start EVERY section with "SECTION: [Section Name]" on its own line
2. Use dashes (-) for ALL bullet points
3. NO markdown symbols (**, |, ✅, ❌, ⚙️) - use plain text only
4. Include ALL sections
5. Each section must be clearly separated with blank lines
6. Keep text clean and readable for users
7. Base all trends on ACTUAL data provided above
8. Include a Trends Summary section with key findings

{data_context}

Now generate the complete trends analysis with ALL sections filled with actual trend data from the CSV:"""
    return prompt


def _build_correlation_prompt(data_context, total_rows, total_columns, columns):
    """Build correlation analysis prompt"""
    prompt = f"""You are a data analyst examining correlations and relationships in a CSV file. Focus on relationships between columns, dependencies, and associations.

IMPORTANT: Return clean, readable text WITHOUT markdown symbols (no **, no |, no ✅, no ❌, no ⚙️). Use plain text with clear section headers and simple formatting.

MANDATORY FORMAT - Use this EXACT structure:

SECTION: Correlation Matrix
Create a table with this format (use pipe separators ONLY for this table):
Column 1 | Column 2 | Correlation | Strength | Direction | Significance
[Col1] | [Col2] | [value] | [weak/moderate/strong] | [positive/negative] | [significant/not significant]
[Col1] | [Col3] | [value] | [weak/moderate/strong] | [positive/negative] | [significant/not significant]

**Strong Relationships:**

*   Highly correlated column pairs:
SECTION: Relationships
- Direct correlations: [Correlation description]
- Indirect correlations: [Indirect correlation description]
- Causal relationships: [Causal relationship description]
- Dependent variables: [Dependent variable description]
- Independent variables: [Independent variable description]

SECTION: Relationship Patterns
- Linear vs non-linear relationships: [Relationship type analysis]
- Clustering relationships: [Clustering description]
- Hierarchical relationships: [Hierarchical description]
- Multi-variable relationships: [Multi-variable description]

SECTION: Business Relationships
- Business logic relationships: [Business relationship description]
- Functional dependencies: [Dependency description]
- Key performance indicators relationships: [KPI relationship description]
- Driver analysis: [Driver analysis description]

SECTION: Insights
- Key relationships discovered:
- [Relationship insight 1]
- [Relationship insight 2]
- Unexpected correlations: [Unexpected correlation description]
- Relationship implications: [Implication description]
- Actionable insights from correlations:
- [Actionable insight 1]
- [Actionable insight 2]

CRITICAL REQUIREMENTS:
1. Start EVERY section with "SECTION: [Section Name]" on its own line
2. Use dashes (-) for ALL bullet points
3. NO markdown symbols (**, |, ✅, ❌, ⚙️) - use plain text only
4. For Correlation Matrix table, use pipe (|) separators ONLY for that table
5. Include ALL sections
6. Each section must be clearly separated with blank lines
7. Keep text clean and readable for users
8. Base all correlations on ACTUAL data provided above

{data_context}

Now generate the complete correlation analysis with ALL sections filled with actual correlation data from the CSV:"""
    return prompt


def build_document_insight_prompt(document_text, metadata, tables=None, analysis_type='overview'):
    """
    Build the insight generation prompt for PDF/other documents
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


def generate_insights_stream(prompt, on_chunk):
    """
    Generate insights with streaming
    """
    try:
        for chunk in generate_text_stream(prompt, temperature=0.7, max_output_tokens=2048):
            if chunk:
                on_chunk(chunk)
    except Exception as e:
        raise Exception(f"Insight generation error: {str(e)}")

