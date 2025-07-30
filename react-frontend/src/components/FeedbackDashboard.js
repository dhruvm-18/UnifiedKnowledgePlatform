import React, { useState, useEffect } from 'react';
import { FaChartBar, FaStar, FaThumbsUp, FaThumbsDown, FaComments, FaCalendarAlt, FaFilter, FaUsers, FaChartLine, FaTrendingDown, FaExclamationTriangle, FaCheckCircle, FaClock, FaEye, FaUser, FaRobot, FaLightbulb } from 'react-icons/fa';
import '../styles/FeedbackDashboard.css';

const FeedbackDashboard = ({ messages = [] }) => {
  const [feedbackData, setFeedbackData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [dateRange, setDateRange] = useState('7d');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [error, setError] = useState(null);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [fixedFeedbackIds, setFixedFeedbackIds] = useState([]);

  // Fetch real feedback data from backend
  const fetchFeedbackData = async () => {
    try {
      setLoading(true);
      console.log('Fetching feedback data from backend...');
      const response = await fetch('http://localhost:5000/api/feedback', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Response status:', response.status);
      if (!response.ok) {
        throw new Error(`Failed to fetch feedback data: ${response.status}`);
      }

      const data = await response.json();
      console.log('Received feedback data:', data);
      
      // Transform the data to match our dashboard format
      console.log('Transforming feedback data...');
      const transformedData = data.map(item => {
        // Ensure all numeric values are valid
        const rating = Number(item.rating) || 0;
        const responseTime = Number(item.response_time) || 0;
        const sessionDuration = Number(item.session_duration) || 0;
        
                return {
        id: item.id || Math.random().toString(36).substr(2, 9),
        sessionId: item.session_id || `session_${item.id}`,
        agentId: item.agent_id || 'default_agent',
        agentName: item.agent_name || 'Unknown Agent',
          rating: rating,
        category: item.category || 'helpfulness',
        severity: item.severity || 'medium',
        feedback: item.feedback_text || item.comment || 'User feedback provided',
        timestamp: item.timestamp || item.created_at || new Date().toISOString(),
        userEmail: item.user_email || item.user_id || 'anonymous@user.com',
          responseTime: responseTime,
          sessionDuration: sessionDuration,
          feedbackType: item.feedback_type || 'rating',
        messageId: item.message_id,
        modelUsed: item.model_used || 'Gemini 2.5 Flash',
        modelIcon: item.model_icon || '🤖'
        };
      });

      console.log('Transformed data:', transformedData);
      setFeedbackData(transformedData);
      setError(null);
    } catch (err) {
      console.error('Error fetching feedback data:', err);
      setError('Failed to load feedback data. Please try again later.');
      setFeedbackData([]);
    } finally {
      setLoading(false);
    }
  };



  useEffect(() => {
    fetchFeedbackData();
  }, []);

  const getFilteredData = () => {
    let filtered = feedbackData;
    
    if (filter !== 'all') {
      filtered = filtered.filter(item => item.category === filter);
    }
    if (severityFilter !== 'all') {
      filtered = filtered.filter(item => (item.severity || 'medium') === severityFilter);
    }
    
    const now = new Date();
    const daysAgo = { '1d': 1, '7d': 7, '30d': 30, '90d': 90 };
    
    if (dateRange !== 'all') {
      const cutoffDate = new Date(now.getTime() - daysAgo[dateRange] * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(item => new Date(item.timestamp) >= cutoffDate);
    }
    
    return filtered;
  };

  const getAverageRating = () => {
    const filtered = getFilteredData();
    if (filtered.length === 0) return 0;
    return (filtered.reduce((sum, item) => sum + item.rating, 0) / filtered.length).toFixed(1);
  };

  const getFeedbackTypeStats = () => {
    const filtered = getFilteredData();
    const stats = { positive: 0, negative: 0, neutral: 0 };
    filtered.forEach(item => {
      stats[item.feedbackType] = (stats[item.feedbackType] || 0) + 1;
    });
    return stats;
  };

  const getRatingDistribution = () => {
    const filtered = getFilteredData();
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    filtered.forEach(item => {
      distribution[item.rating]++;
    });
    return distribution;
  };

  const getAgentPerformance = () => {
    const filtered = getFilteredData();
    const agentStats = {};
    filtered.forEach(item => {
      if (!agentStats[item.agentName]) {
        agentStats[item.agentName] = { ratings: [], count: 0, avgResponseTime: 0, models: new Set() };
      }
      agentStats[item.agentName].ratings.push(item.rating);
      agentStats[item.agentName].count++;
      agentStats[item.agentName].avgResponseTime += item.responseTime;
      agentStats[item.agentName].models.add(item.modelUsed);
    });
    
    Object.keys(agentStats).forEach(agent => {
      agentStats[agent].avgRating = (agentStats[agent].ratings.reduce((a, b) => a + b, 0) / agentStats[agent].ratings.length).toFixed(1);
      agentStats[agent].avgResponseTime = (agentStats[agent].avgResponseTime / agentStats[agent].count).toFixed(1);
      agentStats[agent].models = Array.from(agentStats[agent].models);
    });
    
    return agentStats;
  };

  const getModelPerformance = () => {
    const filtered = getFilteredData();
    const modelStats = {};
    filtered.forEach(item => {
      if (!modelStats[item.modelUsed]) {
        modelStats[item.modelUsed] = { ratings: [], count: 0, icon: item.modelIcon };
      }
      modelStats[item.modelUsed].ratings.push(item.rating);
      modelStats[item.modelUsed].count++;
    });
    
    Object.keys(modelStats).forEach(model => {
      modelStats[model].avgRating = (modelStats[model].ratings.reduce((a, b) => a + b, 0) / modelStats[model].ratings.length).toFixed(1);
    });
    
    return modelStats;
  };

  const getTrendData = () => {
    const filtered = getFilteredData();
    const trendData = {};
    filtered.forEach(item => {
      const date = new Date(item.timestamp).toLocaleDateString();
      if (!trendData[date]) {
        trendData[date] = { ratings: [], count: 0 };
      }
      trendData[date].ratings.push(item.rating);
      trendData[date].count++;
    });
    
    return Object.keys(trendData).map(date => ({
      date,
      avgRating: (trendData[date].ratings.reduce((a, b) => a + b, 0) / trendData[date].ratings.length).toFixed(1),
      count: trendData[date].count
    }));
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <FaStar
        key={i}
        style={{
          color: i < rating ? '#ffd700' : '#ddd',
          fontSize: '0.9rem'
        }}
      />
    ));
  };

  const getSeverityColor = (severity) => {
    const colors = {
      low: '#28a745',
      medium: '#ffc107',
      high: '#dc3545'
    };
    return colors[severity] || '#6c757d';
  };

  const getFeedbackTypeColor = (type) => {
    const colors = {
      positive: '#28a745',
      negative: '#dc3545',
      neutral: '#6c757d'
    };
    return colors[type] || '#6c757d';
  };

  const handleMarkAsFixed = (id) => {
    setFixedFeedbackIds(prev => [...prev, id]);
  };

  // Chart Components
  const LineChart = ({ data, width = 400, height = 200 }) => {
    if (!data || data.length === 0) return <div>No data available</div>;
    
    const margin = { top: 30, right: 20, bottom: 40, left: 40 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    // Find min and max values for proper scaling
    const ratings = data.map(d => Number(d.avgRating));
    const minRating = Math.min(...ratings);
    const maxRating = Math.max(...ratings);
    const ratingRange = maxRating - minRating || 4; // Default to 4 if all same value
    
    const xScale = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth;
    const yScale = chartHeight / ratingRange;
    
    const points = data.map((d, i) => ({
      x: margin.left + i * xScale,
      y: margin.top + chartHeight - (Number(d.avgRating) - minRating) * yScale
    }));
    
    const pathData = points.map((point, i) => 
      `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    ).join(' ');
    
    // Generate Y-axis labels based on actual data range
    const yLabels = [];
    const steps = Math.min(5, Math.ceil(ratingRange) + 1);
    for (let i = 0; i < steps; i++) {
      const value = minRating + (i * ratingRange / (steps - 1));
      yLabels.push(Number(value.toFixed(1)));
    }
    
    return (
      <svg width={width} height={height} className="chart-svg" style={{ display: 'block', maxWidth: '100%' }}>
        {/* Background */}
        <rect
          x={margin.left}
          y={margin.top}
          width={chartWidth}
          height={chartHeight}
          fill="var(--bg-tertiary)"
          opacity="0.3"
          rx="4"
        />
        
        {/* Grid lines */}
        {yLabels.map(rating => (
          <line
            key={rating}
            x1={margin.left}
            y1={margin.top + chartHeight - (rating - minRating) * yScale}
            x2={margin.left + chartWidth}
            y2={margin.top + chartHeight - (rating - minRating) * yScale}
            stroke="var(--border-color)"
            strokeWidth="1"
            opacity="0.3"
          />
        ))}
        
        {/* Y-axis labels */}
        {yLabels.map(rating => (
          <text
            key={rating}
            x={margin.left - 8}
            y={margin.top + chartHeight - (rating - minRating) * yScale + 4}
            textAnchor="end"
            fontSize="11"
            fill="var(--text-secondary)"
            fontWeight="500"
          >
            {rating}
          </text>
          ))}
        
        {/* X-axis labels */}
        {data.map((point, i) => (
          <text
            key={i}
            x={margin.left + i * xScale}
            y={margin.top + chartHeight + 15}
            textAnchor="middle"
            fontSize="10"
            fill="var(--text-secondary)"
            fontWeight="500"
          >
            {new Date(point.date).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric' 
            })}
          </text>
        ))}
        
        {/* Gradient for line */}
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--accent-color)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="var(--accent-color)" stopOpacity="1" />
          </linearGradient>
        </defs>
        
        {/* Line with gradient */}
        <path
          d={pathData}
          stroke="url(#lineGradient)"
          strokeWidth="3"
          fill="none"
          opacity="0.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Data points with hover effect */}
        {points.map((point, i) => (
          <g key={i}>
            {/* Hover area */}
            <circle
              cx={point.x}
              cy={point.y}
              r="8"
              fill="transparent"
              style={{ cursor: 'pointer' }}
            />
            {/* Data point */}
            <circle
              cx={point.x}
              cy={point.y}
              r="5"
              fill="var(--accent-color)"
              stroke="white"
              strokeWidth="2"
              opacity="0.9"
            />
            {/* Inner highlight */}
            <circle
              cx={point.x}
              cy={point.y}
              r="2"
              fill="white"
              opacity="0.8"
            />
          </g>
        ))}
        
        {/* Chart title */}
        <text
          x={margin.left}
          y={margin.top - 5}
          fontSize="14"
          fill="var(--text-primary)"
          fontWeight="600"
        >
          Rating Trend Over Time
        </text>
      </svg>
    );
  };

  const BarChart = ({ data, width = 400, height = 200 }) => {
    if (!data || data.length === 0) return <div>No data available</div>;
    
    const margin = { top: 20, right: 20, bottom: 40, left: 40 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    const maxValue = Math.max(...Object.values(data));
    const barWidth = Math.min(30, chartWidth / Object.keys(data).length);
    const barSpacing = (chartWidth - (barWidth * Object.keys(data).length)) / (Object.keys(data).length + 1);
    
    // Generate proper Y-axis labels
    const generateYAxisLabels = () => {
      if (maxValue === 0) return [0];
      if (maxValue <= 1) return [0, 1];
      if (maxValue <= 2) return [0, 1, 2];
      if (maxValue <= 3) return [0, 1, 2, 3];
      if (maxValue <= 5) return [0, 1, 2, 3, 4, 5];
      if (maxValue <= 10) return [0, 2, 4, 6, 8, 10];
      return [0, Math.ceil(maxValue * 0.25), Math.ceil(maxValue * 0.5), Math.ceil(maxValue * 0.75), maxValue];
    };
    
    const yAxisLabels = generateYAxisLabels();
    
    return (
      <svg width={width} height={height} className="chart-svg" style={{ display: 'block', maxWidth: '100%' }}>
        <defs>
          <linearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--accent-color)" stopOpacity="0.8"/>
            <stop offset="100%" stopColor="var(--accent-color)" stopOpacity="0.4"/>
          </linearGradient>
        </defs>
        
        {/* Grid lines */}
        {yAxisLabels.map((label, index) => {
          const y = margin.top + chartHeight - (label / maxValue) * chartHeight;
          return (
            <line
              key={label}
              x1={margin.left}
              y1={y}
              x2={margin.left + chartWidth}
              y2={y}
              stroke="var(--border-color)"
              strokeWidth="0.5"
              opacity="0.3"
            />
          );
        })}
        
        {/* Bars */}
        {Object.entries(data).map(([key, value], i) => {
          const barHeight = (value / maxValue) * chartHeight;
          const x = margin.left + barSpacing + i * (barWidth + barSpacing);
          const y = margin.top + chartHeight - barHeight;
          
          return (
            <g key={key}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill="url(#barGradient)"
                rx="2"
                stroke="var(--accent-color)"
                strokeWidth="1"
              />
              <text
                x={x + barWidth / 2}
                y={y - 5}
                textAnchor="middle"
                fontSize="12"
                fill="var(--text-primary)"
                fontWeight="600"
              >
                {value}
              </text>
              <text
                x={x + barWidth / 2}
                y={margin.top + chartHeight + 15}
                textAnchor="middle"
                fontSize="11"
                fill="var(--text-secondary)"
              >
                {key}
              </text>
            </g>
          );
        })}
        
        {/* Y-axis labels */}
        {yAxisLabels.map(label => {
          const y = margin.top + chartHeight - (label / maxValue) * chartHeight;
          return (
            <text
              key={label}
              x={margin.left - 10}
              y={y + 4}
              textAnchor="end"
              fontSize="12"
              fill="var(--text-secondary)"
            >
              {label}
            </text>
          );
        })}
      </svg>
    );
  };

  const PieChart = ({ data, width = 200, height = 200 }) => {
    if (!data || Object.keys(data).length === 0) return <div>No data available</div>;
    
    const radius = Math.min(width, height) / 2 - 60;
    const centerX = width / 2 - 60; // Move chart to the left to make room for legend
    const centerY = height / 2;
    
    const total = Object.values(data).reduce((sum, value) => sum + value, 0);
    let currentAngle = -Math.PI / 2; // Start from top
    
    // Bright, vibrant color palette
    const colors = {
      positive: '#10b981', // Bright Green
      negative: '#ef4444', // Bright Red
      neutral: '#f59e0b'   // Bright Orange
    };
    
    // Filter out zero values and create proper data
    const validData = Object.entries(data).filter(([key, value]) => value > 0);
    
    if (validData.length === 0) {
      return (
        <svg width={width} height={height} className="chart-svg" style={{ display: 'block', maxWidth: '100%' }}>
          <circle
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="var(--bg-tertiary)"
            stroke="var(--border-color)"
            strokeWidth="2"
          />
          <text
            x={centerX}
            y={centerY}
            textAnchor="middle"
            fontSize="14"
            fill="var(--text-secondary)"
            fontWeight="500"
          >
            No Data
          </text>
        </svg>
      );
    }
    
    return (
      <svg width={width} height={height} className="chart-svg" style={{ display: 'block', maxWidth: '100%' }}>
        {/* Background circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius + 2}
          fill="var(--bg-tertiary)"
          stroke="var(--border-color)"
          strokeWidth="1"
        />
        
        {validData.map(([key, value], i) => {
          const sliceAngle = (value / total) * 2 * Math.PI;
          const endAngle = currentAngle + sliceAngle;
          
          const x1 = centerX + radius * Math.cos(currentAngle);
          const y1 = centerY + radius * Math.sin(currentAngle);
          const x2 = centerX + radius * Math.cos(endAngle);
          const y2 = centerY + radius * Math.sin(endAngle);
          
          const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;
          
          const pathData = [
            `M ${centerX} ${centerY}`,
            `L ${x1} ${y1}`,
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
            'Z'
          ].join(' ');
          
          currentAngle = endAngle;
          
          return (
            <g key={key}>
              <path
                d={pathData}
                fill={colors[key] || '#6b7280'}
                stroke="white"
                strokeWidth="2"
                opacity="0.9"
              />
              {/* Percentage labels for larger slices */}
              {sliceAngle > 0.3 && (
                <text
                  x={centerX + (radius * 0.6) * Math.cos(currentAngle - sliceAngle / 2)}
                  y={centerY + (radius * 0.6) * Math.sin(currentAngle - sliceAngle / 2)}
                  textAnchor="middle"
                  fontSize="14"
                  fill="white"
                  fontWeight="700"
                  textShadow="1px 1px 2px rgba(0,0,0,0.5)"
                >
                  {Math.round((value / total) * 100)}%
                </text>
              )}
            </g>
          );
        })}
        
        {/* Center label */}
        <text
          x={centerX}
          y={centerY - 5}
          textAnchor="middle"
          fontSize="18"
          fill="var(--text-primary)"
          fontWeight="600"
        >
          {total}
        </text>
        <text
          x={centerX}
          y={centerY + 15}
          textAnchor="middle"
          fontSize="12"
          fill="var(--text-secondary)"
        >
          Total
        </text>
        
        {/* Legend - positioned on the right side */}
        <g transform={`translate(${width - 140}, 40)`}>
          {Object.entries(data).map(([key, value], i) => (
            <g key={key} transform={`translate(0, ${i * 28})`}>
              <rect
                x="0"
                y="0"
                width="16"
                height="16"
                fill={colors[key] || '#6b7280'}
                rx="3"
                stroke="var(--border-color)"
                strokeWidth="1"
              />
              <text
                x="24"
                y="12"
                fontSize="13"
                fill="var(--text-primary)"
                fontWeight="600"
              >
                {key.charAt(0).toUpperCase() + key.slice(1)}: {value}
              </text>
              <text
                x="24"
                y="28"
                fontSize="11"
                fill="var(--text-secondary)"
                fontWeight="400"
              >
                ({Math.round((value / total) * 100)}%)
              </text>
            </g>
          ))}
        </g>
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="feedback-dashboard">
        <div className="dashboard-header">
          <div className="header-content">
          <h1>Feedback Analytics Dashboard</h1>
          <p>Loading real-time feedback data...</p>
          </div>
        </div>
      </div>
    );
  }

  const filteredData = getFilteredData();
  const averageRating = getAverageRating();
  const feedbackTypeStats = getFeedbackTypeStats();
  const ratingDistribution = getRatingDistribution();
  const agentPerformance = getAgentPerformance();
  const modelPerformance = getModelPerformance();
  const trendData = getTrendData();

  const hasData = filteredData.length > 0;

  return (
    <div className="feedback-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Feedback Analytics Dashboard</h1>
          <p>Real-time user feedback from chat interactions</p>
        </div>
        <div className="header-actions">
          <div className="filter-controls">
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Categories</option>
              <option value="accuracy">Accuracy</option>
              <option value="helpfulness">Helpfulness</option>
              <option value="speed">Speed</option>
            </select>
            <select 
              value={severityFilter}
              onChange={e => setSeverityFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Severities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <select 
              value={dateRange} 
              onChange={(e) => setDateRange(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Time</option>
              <option value="1d">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>

          </div>
        </div>
      </div>

      {!hasData && (
        <div className="no-data-message">
          <div className="icon">
            <FaLightbulb />
          </div>
          <h3>No Feedback Data Available</h3>
          <p>Start collecting user feedback through chat interactions to see comprehensive analytics and insights here. The dashboard will display real-time feedback metrics once data is available.</p>
        </div>
      )}

      {hasData && (
        <>
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon">
            <FaStar />
          </div>
          <div className="stat-content">
            <h3>{averageRating}</h3>
            <p>Average Rating</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <FaComments />
          </div>
          <div className="stat-content">
            <h3>{filteredData.length}</h3>
            <p>Total Feedback</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <FaThumbsUp />
          </div>
          <div className="stat-content">
            <h3>{feedbackTypeStats.positive}</h3>
            <p>Positive Reviews</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <FaThumbsDown />
          </div>
          <div className="stat-content">
            <h3>{feedbackTypeStats.negative}</h3>
            <p>Negative Reviews</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <FaUsers />
          </div>
          <div className="stat-content">
            <h3>{new Set(filteredData.map(f => f.userEmail)).size}</h3>
            <p>Unique Users</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <FaChartLine />
          </div>
          <div className="stat-content">
            <h3>{(filteredData.reduce((sum, f) => sum + f.responseTime, 0) / filteredData.length).toFixed(1)}s</h3>
            <p>Avg Response Time</p>
          </div>
        </div>
      </div>

      <div className="dashboard-charts">
        <div className="chart-section">
          <h3>Rating Distribution</h3>
          <div className="chart-content">
                <BarChart data={ratingDistribution} width={450} height={300} />
                </div>
                </div>
            <div className="chart-section">
              <h3>Feedback Type Distribution</h3>
              <div className="chart-content">
                <PieChart data={feedbackTypeStats} width={400} height={280} />
              </div>
            </div>
            <div className="chart-section">
              <h3>Rating Trend Over Time</h3>
              <div className="chart-content">
                <LineChart data={trendData} width={550} height={300} />
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="grid-section">
          <h3>Agent Performance</h3>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Agent Name</th>
                      <th>Avg Rating</th>
                      <th>Feedback Count</th>
                      <th>Avg Response Time</th>
                      <th>Models Used</th>
                    </tr>
                  </thead>
                  <tbody>
            {Object.entries(agentPerformance).map(([agent, stats]) => (
                      <tr key={agent}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FaRobot style={{ color: 'var(--accent-color)' }} />
                            {agent}
                </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {renderStars(parseFloat(stats.avgRating))}
                            <span style={{ marginLeft: '4px' }}>{stats.avgRating}</span>
                  </div>
                        </td>
                        <td>{stats.count}</td>
                        <td>{stats.avgResponseTime}s</td>
                        <td>{stats.models.join(', ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
          </div>
        </div>

        <div className="grid-section">
          <h3>Model Performance</h3>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Model</th>
                      <th>Avg Rating</th>
                      <th>Usage Count</th>
                    </tr>
                  </thead>
                  <tbody>
            {Object.entries(modelPerformance).map(([model, stats]) => (
                      <tr key={model}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '1.2rem' }}>{stats.icon}</span>
                            {model}
                </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {renderStars(parseFloat(stats.avgRating))}
                            <span style={{ marginLeft: '4px' }}>{stats.avgRating}</span>
                  </div>
                        </td>
                        <td>{stats.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
          </div>
        </div>
      </div>

      <div className="feedback-list">
        <h3>Recent Feedback</h3>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Rating</th>
                    <th>Feedback</th>
                    <th>User</th>
                    <th>Model</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
          {filteredData.map(feedback => (
                    <tr key={feedback.id} className={fixedFeedbackIds.includes(feedback.id) ? 'fixed-issue' : ''}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FaRobot style={{ color: 'var(--accent-color)' }} />
                          {feedback.agentName}
                </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {renderStars(feedback.rating)}
                </div>
                      </td>
                      <td>
                        <div style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {feedback.feedback}
              </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FaUser style={{ color: 'var(--text-secondary)' }} />
                          {feedback.userEmail}
              </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '1.2rem' }}>{feedback.modelIcon}</span>
                          {feedback.modelUsed}
              </div>
                      </td>
                      <td>{new Date(feedback.timestamp).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => setSelectedFeedback(feedback)}
                            className="action-btn"
                            title="View Details"
                          >
                            <FaEye />
                          </button>
                          {feedback.rating <= 3 && !fixedFeedbackIds.includes(feedback.id) && (
                            <button
                              onClick={() => handleMarkAsFixed(feedback.id)}
                              className="action-btn"
                              title="Mark as Fixed"
                            >
                              <FaCheckCircle />
                            </button>
                          )}
              </div>
                      </td>
                    </tr>
          ))}
                </tbody>
              </table>
        </div>
      </div>
        </>
      )}

      {selectedFeedback && (
        <>
          <div 
            className="feedback-modal-overlay"
              onClick={() => setSelectedFeedback(null)}
          />
          <div className="feedback-modal-content">
            <h4 className="feedback-modal-title">Feedback Details</h4>
            <div className="feedback-debug-info">
              <strong>Session ID:</strong> {selectedFeedback.sessionId}<br/>
              <strong>Agent:</strong> {selectedFeedback.agentName}<br/>
              <strong>User:</strong> {selectedFeedback.userEmail}<br/>
              <strong>Model:</strong> {selectedFeedback.modelUsed}<br/>
              <strong>Rating:</strong> {selectedFeedback.rating}/5<br/>
              <strong>Category:</strong> {selectedFeedback.category}<br/>
              <strong>Severity:</strong> {selectedFeedback.severity}<br/>
              <strong>Response Time:</strong> {selectedFeedback.responseTime}s<br/>
              <strong>Date:</strong> {new Date(selectedFeedback.timestamp).toLocaleString()}
            </div>
            <div className="feedback-debug-info">
              <strong>Feedback Text:</strong><br/>
              <p style={{ margin: '8px 0', lineHeight: '1.5' }}>{selectedFeedback.feedback}</p>
            </div>
            {selectedFeedback.rating <= 3 && (
              <div className="feedback-fix-actions">
                <button
                  onClick={() => handleMarkAsFixed(selectedFeedback.id)}
                  disabled={fixedFeedbackIds.includes(selectedFeedback.id)}
                  className={`feedback-fix-btn ${fixedFeedbackIds.includes(selectedFeedback.id) ? 'fixed' : ''}`}
                >
                  {fixedFeedbackIds.includes(selectedFeedback.id) ? 'Issue Fixed' : 'Mark as Fixed'}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default FeedbackDashboard; 