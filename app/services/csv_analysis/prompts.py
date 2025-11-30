"""
CSV Analysis Prompts
Contains all prompt building functions for CSV analysis types
"""


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

