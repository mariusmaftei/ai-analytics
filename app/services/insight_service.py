"""
Insight Generation Service
Handles AI prompt construction and insight generation for documents
All prompts are built server-side for security and consistency
"""

from config.gemini import generate_text_stream

def build_csv_insight_prompt(csv_data, columns, metadata):
    """
    Build the insight generation prompt for CSV files
    This is kept on the backend for security and consistency
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
    
    data_context += f"\nIMPORTANT: Analyze ALL the data above. Calculate:\n"
    data_context += f"- Total transactions (count of rows)\n"
    data_context += f"- Total revenue (sum of Revenue column)\n"
    data_context += f"- Average revenue per transaction\n"
    data_context += f"- Products sold (unique values in Product column)\n"
    data_context += f"- Revenue by product category\n"
    data_context += f"- Revenue by region\n"
    data_context += f"- Most frequent region\n"
    data_context += f"- Price range (min and max Unit_Price)\n"
    data_context += f"- Average quantity sold\n"
    data_context += f"- Missing values check\n\n"
    
    prompt = f"""You are a data analyst analyzing a CSV file. You MUST provide a COMPREHENSIVE analysis with EXACTLY 6 sections. This is CRITICAL - you must include ALL sections with detailed information.

MANDATORY FORMAT - Copy this EXACT structure and fill in ALL values from the actual data:

**Document Overview:**
Key | Value
File Type | CSV
Purpose | [Provide a detailed 1-2 sentence description of what this data represents - be specific about the business context]
Rows | [exact count of all rows]
Columns | [exact count of all columns]
Column Names | [list all column names separated by commas]
Contains Headers | ✅ Yes
Contains Missing Values | ✅ None
File Structure Quality | High
Data Completeness | 100%
Confidence Score | 0.95

**Key Insights:**
1. Transaction Summary
- Total Transactions: [exact count - count all rows]
- Total Revenue: $[sum all Revenue values, format as X,XXX.XX with proper decimal places]
- Average Revenue per Transaction: $[calculate: total revenue / total transactions, format as X,XXX.XX]
- Most Frequent Region: [region name with highest count] ([exact count] transactions)
- Average Quantity Sold: [calculate average of all Quantity values, format with 2 decimals] units
- Date Range: [earliest date] to [latest date] (if Date column exists)

2. Product Analysis
- Products Sold: [list ALL unique products from Product column, comma-separated]
- Total Unique Products: [count of unique products]
- Top Revenue Product: [product name] — $[sum of Revenue for this product] (≈ [percentage]% of total revenue)
- Lowest Revenue Product: [product name] — $[sum of Revenue for this product]
- Price Range: $[minimum Unit_Price] → $[maximum Unit_Price]
- Average Unit Price: $[calculate average of all Unit_Price values]

3. Customer Analysis (if Customer_ID column exists)
- Total Unique Customers: [count of unique customer IDs]
- Average Transactions per Customer: [calculate if applicable]

**Regional Insights:**
Region | Transactions | Total Revenue | Avg Revenue per Transaction
[Region 1] | [count transactions in this region] | $[sum Revenue for this region] | $[average Revenue for this region]
[Region 2] | [count transactions in this region] | $[sum Revenue for this region] | $[average Revenue for this region]
[Add one row for EVERY unique region found in the data]

**Data Quality:**
✅ No missing values detected
✅ Consistent headers and field types
✅ Correct numeric formatting (currency and quantity)
✅ All transactions have valid data
⚙️ Good candidate for visualization (revenue by region, category, or customer)
⚙️ Data is ready for business intelligence analysis

**Patterns & Trends:**
- [Write a detailed pattern observation based on the data - e.g., "North America region shows highest revenue concentration"]
- [Write another pattern - e.g., "Electronics category dominates product sales"]
- [Write another pattern - e.g., "Revenue distribution shows [specific insight]"]
- [Write another pattern - e.g., "Quantity patterns indicate [specific trend]"]

**AI Summary:**
"This CSV contains [detailed 2-3 sentence description of the dataset]. Key findings include: [finding 1], [finding 2], and [finding 3]. The data reveals [important business insight]."

CRITICAL REQUIREMENTS - YOU MUST:
1. Start EVERY section with **Section Name:** on its own line
2. Use pipe (|) separators for ALL tables
3. Use dashes (-) for ALL bullet points
4. Use checkmarks (✅ ❌ ⚙️) for Data Quality section
5. Use quotes around the AI Summary text
6. Calculate ALL numbers from the ACTUAL data provided above - do NOT make up numbers
7. Include ALL 6 sections - missing any section is NOT acceptable
8. Each section must be clearly separated with blank lines
9. Be thorough and detailed - provide comprehensive analysis
10. For Regional Insights, include EVERY unique region found in the data

{data_context}

Now generate the complete structured insights with ALL 6 sections filled with actual calculated values:"""
    
    return prompt


def build_document_insight_prompt(document_text, metadata, tables=None):
    """
    Build the insight generation prompt for PDF/other documents
    """
    prompt = f"""Analyze this document comprehensively and provide structured insights.

Start your response with a single, clean sentence describing what this document is. Format it EXACTLY as: "This document is a [type] for [purpose/topic]." or "This document is a [type] focused on [topic]." Keep it concise and clear (max 100 characters).

For non-CSV documents, provide structured insights organized in the following categories. For EACH category, provide key-value pairs in this format:

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
   - naming_pattern, document_purpose, tone, target_audience, writing_style, content_focus

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

