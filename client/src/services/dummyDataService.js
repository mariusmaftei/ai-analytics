// Dummy data service to simulate backend responses

// Simulated file analysis results
export const analyzeFile = (fileName, fileType) => {
  // Defensive checks
  if (!fileName || !fileType) {
    return null;
  }

  const lowerFileType = fileType.toLowerCase();
  const lowerFileName = fileName.toLowerCase();

  if (lowerFileType.includes('pdf') || lowerFileName.endsWith('.pdf')) {
    return analyzePDF(fileName);
  } else if (lowerFileType.includes('csv') || lowerFileName.endsWith('.csv')) {
    return analyzeCSV(fileName);
  } else if (lowerFileType.includes('json') || lowerFileName.endsWith('.json')) {
    return analyzeJSON(fileName);
  }
  return null;
};

// PDF Analysis
const analyzePDF = (fileName) => {
  return {
    fileType: 'PDF',
    hasChapters: true,
    metadata: {
      totalPages: 45,
      wordCount: 12450,
      author: 'Business Intelligence Team',
      createdDate: '2023-10-15',
    },
    insights: {
      summary: 'This document provides a comprehensive analysis of market trends and business strategies for 2023-2024. It covers revenue projections, customer acquisition strategies, and competitive analysis across multiple sectors.',
      patterns: [
        'Revenue increased by 34% year-over-year with strong Q3 performance',
        'Customer retention rate reached 89%, exceeding industry average by 12%',
        'Digital channels contributed 67% of total sales, up from 52% last year',
        'Projected growth of 42% for next fiscal year based on current trends',
      ],
    },
    keywords: [
      'Revenue Growth',
      'Market Analysis',
      'Customer Acquisition',
      'Digital Transformation',
      'Strategic Planning',
      'ROI Optimization',
      'Competitive Advantage',
      'Data Analytics',
    ],
    highlights: [
      { page: 5, text: 'Revenue increased by 34% year-over-year' },
      { page: 12, text: 'Customer retention rate reached 89%' },
      { page: 23, text: 'Digital channels contributed 67% of total sales' },
      { page: 31, text: 'Projected growth of 42% for next fiscal year' },
    ],
    chapters: [
      {
        number: 1,
        title: 'Executive Summary',
        pages: '1-3',
        summary: 'Overview of key findings and strategic recommendations.',
      },
      {
        number: 2,
        title: 'Market Analysis',
        pages: '4-12',
        summary: 'Detailed analysis of current market conditions and trends.',
      },
      {
        number: 3,
        title: 'Revenue Performance',
        pages: '13-22',
        summary: 'Financial performance breakdown and revenue streams.',
      },
      {
        number: 4,
        title: 'Customer Insights',
        pages: '23-32',
        summary: 'Customer behavior patterns and acquisition metrics.',
      },
      {
        number: 5,
        title: 'Strategic Recommendations',
        pages: '33-40',
        summary: 'Action items and strategic direction for next quarter.',
      },
      {
        number: 6,
        title: 'Appendix',
        pages: '41-45',
        summary: 'Supporting data tables and references.',
      },
    ],
    hasNumericData: false,
  };
};

// CSV Analysis
const analyzeCSV = (fileName) => {
  return {
    fileType: 'CSV',
    hasChapters: false,
    columns: [
      'Transaction_ID',
      'Date',
      'Customer_ID',
      'Product',
      'Quantity',
      'Unit_Price',
      'Revenue',
      'Region',
    ],
    data: [
      { Transaction_ID: 'TXN-001234', Date: '2023-05-15', Customer_ID: 'CUST-5678', Product: 'Electronics', Quantity: 3, Unit_Price: 299.99, Revenue: 899.97, Region: 'North America' },
      { Transaction_ID: 'TXN-001235', Date: '2023-05-16', Customer_ID: 'CUST-2341', Product: 'Clothing', Quantity: 2, Unit_Price: 49.99, Revenue: 99.98, Region: 'Europe' },
      { Transaction_ID: 'TXN-001236', Date: '2023-05-16', Customer_ID: 'CUST-8892', Product: 'Home & Garden', Quantity: 1, Unit_Price: 159.99, Revenue: 159.99, Region: 'Asia' },
      { Transaction_ID: 'TXN-001237', Date: '2023-05-17', Customer_ID: 'CUST-4423', Product: 'Electronics', Quantity: 5, Unit_Price: 89.99, Revenue: 449.95, Region: 'North America' },
      { Transaction_ID: 'TXN-001238', Date: '2023-05-17', Customer_ID: 'CUST-7654', Product: 'Books', Quantity: 8, Unit_Price: 12.99, Revenue: 103.92, Region: 'Europe' },
      { Transaction_ID: 'TXN-001239', Date: '2023-05-18', Customer_ID: 'CUST-1123', Product: 'Sports', Quantity: 2, Unit_Price: 129.99, Revenue: 259.98, Region: 'North America' },
      { Transaction_ID: 'TXN-001240', Date: '2023-05-19', Customer_ID: 'CUST-9987', Product: 'Electronics', Quantity: 1, Unit_Price: 899.99, Revenue: 899.99, Region: 'Asia' },
      { Transaction_ID: 'TXN-001241', Date: '2023-05-20', Customer_ID: 'CUST-3345', Product: 'Clothing', Quantity: 4, Unit_Price: 35.99, Revenue: 143.96, Region: 'Europe' },
    ],
    insights: {
      summary: 'This dataset contains sales and customer data spanning 12 months. It includes revenue figures, customer demographics, product categories, and transaction details across multiple regions.',
      patterns: [
        'Total revenue of $857,151.15 across 1,247 transactions',
        'Electronics is the top-performing category with 456 transactions',
        'North America leads with $385,432 in revenue (45% of total)',
        'Average transaction value is $687.45 with peak in July at $95,432',
      ],
    },
    keywords: [
      'Revenue',
      'Customer ID',
      'Product Category',
      'Transaction Date',
      'Region',
      'Quantity',
      'Unit Price',
      'Profit Margin',
    ],
    columnDetails: [
      { name: 'Transaction_ID', type: 'string', sample: 'TXN-001234' },
      { name: 'Date', type: 'date', sample: '2023-05-15' },
      { name: 'Customer_ID', type: 'string', sample: 'CUST-5678' },
      { name: 'Product', type: 'string', sample: 'Electronics' },
      { name: 'Quantity', type: 'numeric', sample: 3 },
      { name: 'Unit_Price', type: 'numeric', sample: 299.99 },
      { name: 'Revenue', type: 'numeric', sample: 899.97 },
      { name: 'Region', type: 'string', sample: 'North America' },
    ],
    statistics: {
      Revenue: { min: 10.50, max: 15000.00, avg: 687.45, total: 857151.15 },
      Quantity: { min: 1, max: 150, avg: 8.3 },
      Unit_Price: { min: 5.99, max: 2999.99, avg: 245.67 },
    },
    previewData: [
      ['TXN-001234', '2023-05-15', 'CUST-5678', 'Electronics', 3, 299.99, 899.97, 'North America'],
      ['TXN-001235', '2023-05-16', 'CUST-2341', 'Clothing', 2, 49.99, 99.98, 'Europe'],
      ['TXN-001236', '2023-05-16', 'CUST-8892', 'Home & Garden', 1, 159.99, 159.99, 'Asia'],
      ['TXN-001237', '2023-05-17', 'CUST-4423', 'Electronics', 5, 89.99, 449.95, 'North America'],
      ['TXN-001238', '2023-05-17', 'CUST-7654', 'Books', 8, 12.99, 103.92, 'Europe'],
      ['TXN-001239', '2023-05-18', 'CUST-1123', 'Sports', 2, 129.99, 259.98, 'North America'],
      ['TXN-001240', '2023-05-19', 'CUST-9987', 'Electronics', 1, 899.99, 899.99, 'Asia'],
      ['TXN-001241', '2023-05-20', 'CUST-3345', 'Clothing', 4, 35.99, 143.96, 'Europe'],
    ],
    hasNumericData: true,
    numericColumns: ['Quantity', 'Unit_Price', 'Revenue'],
    chartData: {
      revenueByMonth: [
        { month: 'Jan', revenue: 65234 },
        { month: 'Feb', revenue: 72145 },
        { month: 'Mar', revenue: 85678 },
        { month: 'Apr', revenue: 78234 },
        { month: 'May', revenue: 91234 },
        { month: 'Jun', revenue: 87654 },
        { month: 'Jul', revenue: 95432 },
        { month: 'Aug', revenue: 88765 },
        { month: 'Sep', revenue: 92345 },
        { month: 'Oct', revenue: 85432 },
        { month: 'Nov', revenue: 79876 },
        { month: 'Dec', revenue: 73456 },
      ],
      revenueByRegion: [
        { region: 'North America', revenue: 385432 },
        { region: 'Europe', revenue: 275678 },
        { region: 'Asia', revenue: 196041 },
      ],
      topProducts: [
        { product: 'Electronics', count: 456 },
        { product: 'Clothing', count: 389 },
        { product: 'Home & Garden', count: 234 },
        { product: 'Sports', count: 168 },
      ],
    },
  };
};

// JSON Analysis
const analyzeJSON = (fileName) => {
  return {
    fileType: 'JSON',
    hasChapters: false,
    columns: [
      'user_id',
      'email',
      'name',
      'total_spent',
      'transactions',
      'status',
      'created_at',
    ],
    data: [
      {
        user_id: 'USR-001',
        email: 'john.doe@example.com',
        name: 'John Doe',
        total_spent: 4567.89,
        transactions: 23,
        status: 'active',
        created_at: '2022-03-15T10:30:00Z',
      },
      {
        user_id: 'USR-002',
        email: 'jane.smith@example.com',
        name: 'Jane Smith',
        total_spent: 8934.56,
        transactions: 45,
        status: 'active',
        created_at: '2021-11-22T14:15:00Z',
      },
      {
        user_id: 'USR-003',
        email: 'bob.johnson@example.com',
        name: 'Bob Johnson',
        total_spent: 1234.50,
        transactions: 8,
        status: 'active',
        created_at: '2023-01-10T09:45:00Z',
      },
      {
        user_id: 'USR-004',
        email: 'alice.williams@example.com',
        name: 'Alice Williams',
        total_spent: 12450.00,
        transactions: 67,
        status: 'active',
        created_at: '2021-08-05T11:20:00Z',
      },
    ],
    insights: {
      summary: 'This JSON file contains API response data with user profiles, transaction histories, and metadata. It includes nested objects with customer information, purchase records, and system timestamps.',
      patterns: [
        '342 user records with an average spending of $2,456.78 per user',
        '289 active users (84.5%) with consistent engagement patterns',
        'Top spenders contribute $5000+ each, representing 9.4% of total users',
        'Average of 12 transactions per user with 67 being the highest',
      ],
    },
    keywords: [
      'user_id',
      'email',
      'transactions',
      'total_spent',
      'last_purchase',
      'status',
      'created_at',
      'metadata',
    ],
    structure: {
      users: {
        type: 'array',
        count: 342,
        schema: {
          user_id: 'string',
          email: 'string',
          name: 'string',
          total_spent: 'number',
          transactions: 'array',
          status: 'string',
          created_at: 'timestamp',
        },
      },
    },
    statistics: {
      total_spent: { min: 15.99, max: 45678.90, avg: 2456.78 },
      transactions_count: { min: 1, max: 87, avg: 12 },
    },
    hasNumericData: true,
    numericFields: ['total_spent', 'transactions'],
    chartData: {
      usersByStatus: [
        { status: 'Active', count: 289 },
        { status: 'Inactive', count: 42 },
        { status: 'Pending', count: 11 },
      ],
      spendingDistribution: [
        { range: '$0-$500', count: 87 },
        { range: '$500-$2000', count: 134 },
        { range: '$2000-$5000', count: 89 },
        { range: '$5000+', count: 32 },
      ],
    },
  };
};

// Simulate AI responses based on file type and question
export const getAIResponse = (question, analysisData) => {
  const lowerQuestion = question.toLowerCase();

  // General responses
  if (lowerQuestion.includes('summary') || lowerQuestion.includes('overview')) {
    return `📋 Summary:\n\n${analysisData.summary}`;
  }

  if (lowerQuestion.includes('keyword') || lowerQuestion.includes('important')) {
    return `🔑 Key Terms Identified:\n\n${analysisData.keywords.map((k, i) => `${i + 1}. ${k}`).join('\n')}`;
  }

  // PDF-specific responses
  if (analysisData.fileType === 'pdf') {
    if (lowerQuestion.includes('chapter') || lowerQuestion.includes('section')) {
      return `📚 This document has ${analysisData.chapters.length} chapters:\n\n${analysisData.chapters
        .map((ch) => `${ch.id}. ${ch.title} (Pages ${ch.pages})`)
        .join('\n')}\n\nWhich chapter would you like to explore?`;
    }

    if (lowerQuestion.includes('page')) {
      return `📄 Document Details:\n\n• Total Pages: ${analysisData.pageCount}\n• Word Count: ${analysisData.wordCount.toLocaleString()}\n• Estimated Reading Time: ${Math.ceil(analysisData.wordCount / 200)} minutes`;
    }

    if (lowerQuestion.includes('highlight')) {
      return `⭐ Key Highlights:\n\n${analysisData.highlights.map((h) => `• Page ${h.page}: ${h.text}`).join('\n')}`;
    }
  }

  // CSV/JSON-specific responses
  if (analysisData.fileType === 'csv' || analysisData.fileType === 'json') {
    if (lowerQuestion.includes('revenue') || lowerQuestion.includes('sales')) {
      const stats = analysisData.statistics.Revenue || analysisData.statistics.total_spent;
      return `💰 Revenue Analysis:\n\n• Total: $${stats.total.toLocaleString()}\n• Average: $${stats.avg.toLocaleString()}\n• Highest: $${stats.max.toLocaleString()}\n• Lowest: $${stats.min.toLocaleString()}\n\nWould you like me to generate a chart showing revenue trends?`;
    }

    if (lowerQuestion.includes('column') || lowerQuestion.includes('field')) {
      const cols = analysisData.columns || Object.keys(analysisData.structure);
      return `📊 Data Structure:\n\n${analysisData.fileType === 'csv' 
        ? `Columns (${analysisData.columnCount}):\n${analysisData.columns.map((c, i) => `${i + 1}. ${c.name} (${c.type})`).join('\n')}`
        : `Fields:\n${analysisData.keywords.slice(0, 8).map((k, i) => `${i + 1}. ${k}`).join('\n')}`
      }`;
    }

    if (lowerQuestion.includes('row') || lowerQuestion.includes('record')) {
      const count = analysisData.rowCount || analysisData.objectCount;
      return `📈 Data Size:\n\n• Total Records: ${count.toLocaleString()}\n• Sample Data: ${analysisData.previewData.length} rows shown\n\nUse the "View Table" button to see the full data preview!`;
    }

    if (lowerQuestion.includes('chart') || lowerQuestion.includes('graph') || lowerQuestion.includes('visual')) {
      return `📊 I can generate these visualizations:\n\n${analysisData.fileType === 'csv' 
        ? '1. Revenue by Month (Line Chart)\n2. Revenue by Region (Pie Chart)\n3. Top Products (Bar Chart)'
        : '1. Users by Status (Pie Chart)\n2. Spending Distribution (Bar Chart)'
      }\n\nClick "Generate Graphic" to create these charts!`;
    }
  }

  // Default response
  return `I've analyzed your ${analysisData.fileType.toUpperCase()} file. You can ask me:\n\n• About the summary and key insights\n• ${
    analysisData.hasChapters ? 'To show chapters and sections' : 'About data structure and statistics'
  }\n• ${analysisData.hasNumericData ? 'To generate charts and visualizations' : 'About keywords and highlights'}\n• To filter or preview the data\n\nWhat would you like to know?`;
};

