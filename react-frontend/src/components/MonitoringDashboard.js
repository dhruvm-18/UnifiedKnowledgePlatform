import React, { useState, useEffect } from 'react';
import { FaChartBar, FaUsers, FaRobot, FaClock, FaCheckCircle, FaExclamationTriangle, FaFilter, FaCalendarAlt, FaChartLine, FaTrendingUp, FaTrendingDown, FaEye, FaTrash, FaDownload, FaTimes } from 'react-icons/fa';
import '../styles/MonitoringDashboard.css';

const MonitoringDashboard = () => {
  const [monitoringData, setMonitoringData] = useState({
    model_usage: [],
    user_activity: [],
    session_metrics: [],
    agent_usage: [],
    system_metrics: []
  });
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('7d');
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedModel, setSelectedModel] = useState('all');
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [selectedAgentDetails, setSelectedAgentDetails] = useState(null);
  const [selectedSessionDetails, setSelectedSessionDetails] = useState(null);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);

  // Model mapping for proper display names
  const modelMapping = {
    'gemini': 'Gemini 2.5 Flash',
    'llama3': 'Meta LlaMa 3',
    'mistral': 'Mistral AI',
    'qwen3_4': 'Qwen 3:4'
  };

  // Fetch monitoring data from backend
  const fetchMonitoringData = async () => {
    try {
      setLoading(true);
      const userEmail = localStorage.getItem('userEmail') || 'anonymous@user.com';
      const response = await fetch('http://localhost:5000/api/monitoring', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch monitoring data');
      }

      const data = await response.json();
      setMonitoringData(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching monitoring data:', err);
      setError('Failed to load monitoring data.');
      setMonitoringData(getEmptyData());
    } finally {
      setLoading(false);
    }
  };

  // Fetch summary statistics
  const fetchSummary = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/monitoring/summary', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSummary(data);
      }
    } catch (err) {
      console.error('Error fetching summary:', err);
    }
  };

  // Empty data as fallback
  const getEmptyData = () => {
    return {
      model_usage: [],
      user_activity: [],
      session_metrics: [],
      agent_usage: [],
      system_metrics: []
    };
  };

  useEffect(() => {
    fetchMonitoringData();
    fetchSummary();
  }, []);

  // Filter data based on selected filters
  const getFilteredData = () => {
    let filtered = { ...monitoringData };

    // Filter by date range
    const now = new Date();
    let cutoffDate;
    switch (dateRange) {
      case '1d':
        cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        cutoffDate = new Date(0);
    }

    Object.keys(filtered).forEach(key => {
      filtered[key] = filtered[key].filter(item => new Date(item.timestamp) >= cutoffDate);
    });

    // Filter by user
    if (selectedUser !== 'all') {
      Object.keys(filtered).forEach(key => {
        filtered[key] = filtered[key].filter(item => item.user_email === selectedUser);
      });
    }

    // Filter by model
    if (selectedModel !== 'all') {
      filtered.model_usage = filtered.model_usage.filter(item => item.model_name === selectedModel);
      filtered.session_metrics = filtered.session_metrics.filter(item => item.model_used === selectedModel);
    }

    // Filter by agent
    if (selectedAgent !== 'all') {
      Object.keys(filtered).forEach(key => {
        filtered[key] = filtered[key].filter(item => item.agent_id === selectedAgent);
      });
    }

    return filtered;
  };

  const filteredData = getFilteredData();

  // Get unique users, models, and agents for filters
  const uniqueUsers = [...new Set(monitoringData.user_activity.map(item => item.user_email))];
  const uniqueModels = [...new Set(monitoringData.model_usage.map(item => modelMapping[item.model_name] || item.model_name))];
  const uniqueAgents = [...new Set(monitoringData.agent_usage.map(item => item.agent_id))];

  // Calculate statistics
  const getModelUsageStats = () => {
    const modelCounts = {};
    filteredData.model_usage.forEach(item => {
      const displayName = modelMapping[item.model_name] || item.model_name;
      modelCounts[displayName] = (modelCounts[displayName] || 0) + 1;
    });
    return modelCounts;
  };

  const getUserActivityStats = () => {
    const activityCounts = {};
    filteredData.user_activity.forEach(item => {
      activityCounts[item.action] = (activityCounts[item.action] || 0) + 1;
    });
    return activityCounts;
  };

  const getAgentUsageStats = () => {
    const agentCounts = {};
    filteredData.agent_usage.forEach(item => {
      agentCounts[item.agent_name] = (agentCounts[item.agent_name] || 0) + 1;
    });
    return agentCounts;
  };

  const getAverageResponseTime = () => {
    const responseTimes = filteredData.model_usage
      .filter(item => item.response_time)
      .map(item => item.response_time);
    return responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;
  };

  const getSuccessRate = () => {
    const successful = filteredData.model_usage.filter(item => item.success).length;
    const total = filteredData.model_usage.length;
    return total > 0 ? (successful / total) * 100 : 0;
  };

  // Chart data preparation
  const getTimeSeriesData = () => {
    const timeData = {};
    const now = new Date();
    const days = dateRange === '1d' ? 24 : dateRange === '7d' ? 7 : 30;
    
    // Initialize time slots
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * (dateRange === '1d' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000));
      const key = dateRange === '1d' ? date.toLocaleTimeString('en-US', { hour: '2-digit', hour12: false }) : date.toLocaleDateString();
      timeData[key] = { messages: 0, users: new Set(), sessions: 0 };
    }

    // Populate data
    filteredData.model_usage.forEach(item => {
      const date = new Date(item.timestamp);
      const key = dateRange === '1d' ? date.toLocaleTimeString('en-US', { hour: '2-digit', hour12: false }) : date.toLocaleDateString();
      if (timeData[key]) {
        timeData[key].messages++;
        timeData[key].users.add(item.user_email);
      }
    });

    return Object.keys(timeData).map(key => ({
      time: key,
      messages: timeData[key].messages,
      users: timeData[key].users.size,
      sessions: timeData[key].sessions
    }));
  };

  const handleClearData = async () => {
    if (window.confirm('Are you sure you want to clear all monitoring data? This action cannot be undone.')) {
      try {
        const response = await fetch('http://localhost:5000/api/monitoring/clear', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          fetchMonitoringData();
          fetchSummary();
        } else {
          alert('Failed to clear monitoring data');
        }
      } catch (err) {
        console.error('Error clearing monitoring data:', err);
        alert('Error clearing monitoring data');
      }
    }
  };

  const exportData = () => {
    const dataStr = JSON.stringify(filteredData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `monitoring_data_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const fetchAgentDetails = async (agentId) => {
    try {
      console.log('Fetching agent details for:', agentId);
      const response = await fetch(`http://localhost:5000/api/monitoring/agent/${agentId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Agent details response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Agent details data:', data);
        setSelectedAgentDetails(data);
        setShowAgentModal(true);
      } else {
        console.error('Failed to fetch agent details:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (err) {
      console.error('Error fetching agent details:', err);
    }
  };

  const fetchSessionDetails = async (sessionId) => {
    try {
      console.log('Fetching session details for:', sessionId);
      const response = await fetch(`http://localhost:5000/api/monitoring/session/${sessionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Session details response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Session details data:', data);
        setSelectedSessionDetails(data);
        setShowSessionModal(true);
      } else {
        console.error('Failed to fetch session details:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (err) {
      console.error('Error fetching session details:', err);
    }
  };

  // Simple chart components
  const LineChart = ({ data, title, color = '#6c2eb7' }) => {
    if (!data || data.length === 0) return <div className="no-data-chart">No data available</div>;
    
    const maxValue = Math.max(...data.map(d => d.messages));
    const minValue = Math.min(...data.map(d => d.messages));
    const range = maxValue - minValue || 1;
    
    return (
      <div className="chart-container">
        <h3>{title}</h3>
        <div className="line-chart-wrapper">
          <div className="chart-y-axis">
            {[0, Math.ceil(maxValue * 0.25), Math.ceil(maxValue * 0.5), Math.ceil(maxValue * 0.75), Math.ceil(maxValue)].map((value, index) => (
              <div key={index} className="y-axis-label">
                {value}
              </div>
            ))}
          </div>
          <div className="line-chart-container">
            <svg className="chart-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Grid lines */}
              {[0, 25, 50, 75, 100].map((y, index) => (
                <line
                  key={index}
                  x1="0"
                  y1={y}
                  x2="100"
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="0.5"
                  strokeDasharray="2,2"
                />
              ))}
              
              {/* Line path */}
              <path
                d={data.map((point, index) => {
                  const x = (index / (data.length - 1)) * 100;
                  const y = 100 - ((point.messages - minValue) / range) * 100;
                  return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                }).join(' ')}
                stroke={color}
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              
              {/* Area fill */}
              <path
                d={`${data.map((point, index) => {
                  const x = (index / (data.length - 1)) * 100;
                  const y = 100 - ((point.messages - minValue) / range) * 100;
                  return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                }).join(' ')} L 100 100 L 0 100 Z`}
                fill={`url(#gradient-${color.replace('#', '')})`}
                opacity="0.2"
              />
              
              {/* Gradient definition */}
              <defs>
                <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={color} stopOpacity="0.6" />
                  <stop offset="100%" stopColor={color} stopOpacity="0.1" />
                </linearGradient>
              </defs>
            </svg>
            
            {/* Data points */}
            {data.map((point, index) => {
              const x = (index / (data.length - 1)) * 100;
              const y = 100 - ((point.messages - minValue) / range) * 100;
              return (
                <div
                  key={index}
                  className="chart-point"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  <div className="point-tooltip">
                    <div className="tooltip-time">{point.time}</div>
                    <div className="tooltip-value">{point.messages} messages</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="chart-x-axis">
            {data.map((point, index) => (
              <div key={index} className="x-axis-label">
                {point.time}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const BarChart = ({ data, title, color = '#6c2eb7' }) => {
    if (!data || Object.keys(data).length === 0) return <div className="no-data-chart">No data available</div>;
    
    const maxValue = Math.max(...Object.values(data));
    const entries = Object.entries(data);
    
    // Generate proper Y-axis labels without duplicates
    const yAxisLabels = [];
    if (maxValue <= 1) {
      yAxisLabels.push(0, 1);
    } else if (maxValue <= 2) {
      yAxisLabels.push(0, 1, 2);
    } else if (maxValue <= 5) {
      yAxisLabels.push(0, 1, 2, 3, 4, 5);
    } else {
      const step = Math.ceil(maxValue / 5);
      for (let i = 0; i <= maxValue; i += step) {
        yAxisLabels.push(i);
      }
      if (yAxisLabels[yAxisLabels.length - 1] !== maxValue) {
        yAxisLabels.push(maxValue);
      }
    }
    
    // Handle hover events
    const handleBarHover = (event, label, value) => {
      const container = event.currentTarget.closest('.bar-chart-container');
      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      container.setAttribute('data-tooltip', `${label}: ${value} usage${value !== 1 ? 's' : ''}`);
      container.setAttribute('data-show-tooltip', 'true');
      container.style.setProperty('--tooltip-x', `${x}px`);
      container.style.setProperty('--tooltip-y', `${y - 40}px`);
    };
    
    const handleBarLeave = (event) => {
      const container = event.currentTarget.closest('.bar-chart-container');
      container.removeAttribute('data-show-tooltip');
    };
    
    return (
      <div className="chart-container">
        <h3>{title}</h3>
        <div className="bar-chart-wrapper">
          <div className="bar-chart-y-axis">
            {yAxisLabels.map((value, index) => (
              <div key={index} className="bar-y-axis-label">
                {value}
              </div>
            ))}
          </div>
          <div className="bar-chart-container">
            <svg className="bar-chart-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Grid lines */}
              {yAxisLabels.map((value, index) => {
                const y = 100 - ((value / maxValue) * 80) - 10; // Align with Y-axis labels
                return (
                  <line
                    key={index}
                    x1="0"
                    y1={y}
                    x2="100"
                    y2={y}
                    stroke="#e5e7eb"
                    strokeWidth="0.5"
                    strokeDasharray="2,2"
                  />
                );
              })}
              
              {/* Bars */}
              {entries.map(([key, value], index) => {
                const barHeight = (value / maxValue) * 80; // 80% of chart height
                const barWidth = Math.min(15, 80 / entries.length); // Thinner bars, max 15% width
                const x = (index * (80 / entries.length)) + ((80 / entries.length - barWidth) / 2); // Center bars
                const y = 100 - barHeight - 10; // 10% margin from bottom
                
                return (
                  <g key={key} className="bar-group">
                    {/* Bar shadow */}
                    <rect
                      x={x + 0.5}
                      y={y + 0.5}
                      width={barWidth}
                      height={barHeight}
                      fill="rgba(0,0,0,0.15)"
                      rx="1"
                    />
                    {/* Main bar */}
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      fill={`url(#barGradient-${color.replace('#', '')})`}
                      rx="1"
                      stroke={color}
                      strokeWidth="0.3"
                      className="bar-rect"
                      data-label={key}
                      data-value={value}
                    />
                    {/* Hover tooltip */}
                    <rect
                      x={x - 2}
                      y={y - 2}
                      width={barWidth + 4}
                      height={barHeight + 4}
                      fill="transparent"
                      className="bar-hover-area"
                      data-label={key}
                      data-value={value}
                      onMouseEnter={(e) => handleBarHover(e, key, value)}
                      onMouseLeave={handleBarLeave}
                    />
                  </g>
                );
              })}
              
              {/* Gradient definition */}
              <defs>
                <linearGradient id={`barGradient-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={color} stopOpacity="0.9" />
                  <stop offset="100%" stopColor={color} stopOpacity="0.6" />
                </linearGradient>
              </defs>
            </svg>
            
            {/* Bar labels */}
            <div className="bar-labels">
              {entries.map(([key, value], index) => {
                const barWidth = Math.min(15, 80 / entries.length);
                const barX = (index * (80 / entries.length)) + ((80 / entries.length - barWidth) / 2);
                const labelWidth = 80 / entries.length;
                const labelX = (index * labelWidth) + (labelWidth / 2);
                
                return (
                  <div 
                    key={key} 
                    className="bar-label-item"
                    style={{
                      position: 'absolute',
                      left: `${labelX}%`,
                      transform: 'translateX(-50%)',
                      width: `${labelWidth}%`,
                      textAlign: 'center'
                    }}
                  >
                    <div className="bar-label-text">{key}</div>
                    <div className="bar-label-value">{value}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const PieChart = ({ data, title }) => {
    if (!data || Object.keys(data).length === 0) return <div className="no-data-chart">No data available</div>;
    
    const colors = ['#6c2eb7', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];
    const total = Object.values(data).reduce((sum, value) => sum + value, 0);
    const entries = Object.entries(data);
    
    // Calculate pie chart segments
    let currentAngle = 0;
    const segments = entries.map(([key, value], index) => {
      const percentage = (value / total) * 100;
      const angle = (percentage / 100) * 360;
      const startAngle = currentAngle;
      currentAngle += angle;
      
      return {
        key,
        value,
        percentage,
        startAngle,
        endAngle: currentAngle,
        color: colors[index % colors.length]
      };
    });
    
    return (
      <div className="chart-container">
        <h3>{title}</h3>
        <div className="pie-chart-wrapper">
          <div className="pie-chart-svg-container">
            <svg className="pie-chart-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
              <circle cx="50" cy="50" r="40" fill="#f3f4f6" stroke="#e5e7eb" strokeWidth="1" />
              
              {segments.map((segment, index) => {
                const startAngleRad = (segment.startAngle - 90) * (Math.PI / 180);
                const endAngleRad = (segment.endAngle - 90) * (Math.PI / 180);
                
                const x1 = 50 + 40 * Math.cos(startAngleRad);
                const y1 = 50 + 40 * Math.sin(startAngleRad);
                const x2 = 50 + 40 * Math.cos(endAngleRad);
                const y2 = 50 + 40 * Math.sin(endAngleRad);
                
                const largeArcFlag = segment.endAngle - segment.startAngle > 180 ? 1 : 0;
                
                const pathData = [
                  `M 50 50`,
                  `L ${x1} ${y1}`,
                  `A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                  'Z'
                ].join(' ');
                
                return (
                  <g key={segment.key}>
                    {/* Shadow */}
                    <path
                      d={pathData}
                      fill="rgba(0,0,0,0.1)"
                      transform="translate(1, 1)"
                    />
                    {/* Main segment */}
                    <path
                      d={pathData}
                      fill={segment.color}
                      stroke="#ffffff"
                      strokeWidth="0.5"
                    />
                  </g>
                );
              })}
              
              {/* Center circle for donut effect */}
              <circle cx="50" cy="50" r="15" fill="white" stroke="#e5e7eb" strokeWidth="1" />
            </svg>
          </div>
          
          <div className="pie-legend">
            {segments.map((segment) => (
              <div key={segment.key} className="pie-legend-item">
                <div className="legend-color" style={{ backgroundColor: segment.color }}></div>
                <div className="legend-content">
                  <div className="legend-label">{segment.key}</div>
                  <div className="legend-value">{segment.value} ({segment.percentage.toFixed(1)}%)</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="monitoring-dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading monitoring data...</p>
        </div>
      </div>
    );
  }

  // Check if there's any data
  const hasData = Object.values(monitoringData).some(array => array.length > 0);

  const timeSeriesData = getTimeSeriesData();

  return (
    <div className="monitoring-dashboard">
      <div className="dashboard-header">
        <h1><FaChartBar /> Monitoring Dashboard</h1>
        <div className="header-actions">
          <button onClick={exportData} className="export-btn">
            <FaDownload /> Export Data
          </button>
          <button onClick={handleClearData} className="clear-btn">
            <FaTrash /> Clear Data
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <FaExclamationTriangle /> {error}
        </div>
      )}

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Date Range:</label>
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
            <option value="1d">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>

        <div className="filter-group">
          <label>User:</label>
          <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
            <option value="all">All Users</option>
            {uniqueUsers.map(user => (
              <option key={user} value={user}>{user}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Model:</label>
          <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
            <option value="all">All Models</option>
            {uniqueModels.map(model => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Agent:</label>
          <select value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)}>
            <option value="all">All Agents</option>
            {uniqueAgents.map(agent => (
              <option key={agent} value={agent}>{agent}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="card-icon">
            <FaRobot />
          </div>
          <div className="card-content">
            <h3>Total Model Usage</h3>
            <p className="card-value">{filteredData.model_usage.length}</p>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon">
            <FaUsers />
          </div>
          <div className="card-content">
            <h3>Active Users</h3>
            <p className="card-value">{new Set(filteredData.user_activity.map(item => item.user_email)).size}</p>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon">
            <FaClock />
          </div>
          <div className="card-content">
            <h3>Avg Response Time</h3>
            <p className="card-value">{getAverageResponseTime().toFixed(2)}s</p>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon">
            <FaCheckCircle />
          </div>
          <div className="card-content">
            <h3>Success Rate</h3>
            <p className="card-value">{getSuccessRate().toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        <h2><FaChartLine /> Analytics & Trends</h2>
        <div className="charts-grid">
          <LineChart data={timeSeriesData} title="Message Activity Over Time" />
          <BarChart data={getModelUsageStats()} title="Model Usage Distribution" />
          <PieChart data={getUserActivityStats()} title="User Activity Types" />
          <BarChart data={getAgentUsageStats()} title="Agent Usage" color="#10b981" />
        </div>
      </div>

      {/* No Data Message (only shown when there's no data) */}
      {!hasData && (
        <div className="no-data-container">
          <div className="no-data-icon">
            <FaChartBar />
          </div>
          <h2>No Monitoring Data Available</h2>
          <p>Start using the application to see monitoring data here.</p>
          <p>Data will appear as users interact with the system.</p>
        </div>
      )}

      {/* Detailed Sections */}
      <div className="dashboard-sections">
        {/* Model Usage */}
        <div className="dashboard-section">
          <h2><FaRobot /> Model Usage</h2>
          <div className="section-content">
            <div className="table-container">
              <h3>Recent Model Usage</h3>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Model</th>
                      <th>Agent</th>
                      <th>Response Time</th>
                      <th>Success</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.model_usage && filteredData.model_usage.length > 0 ? (
                      filteredData.model_usage.slice(0, 10).map(item => (
                        <tr key={item.id || Math.random()}>
                          <td>{item.user_email || 'Unknown'}</td>
                          <td>{modelMapping[item.model_name] || item.model_name || 'Unknown'}</td>
                          <td>{item.agent_id || 'None'}</td>
                          <td>{item.response_time ? `${item.response_time}s` : 'N/A'}</td>
                          <td>
                            <span className={`status ${item.success ? 'success' : 'error'}`}>
                              {item.success ? '✓' : '✗'}
                            </span>
                          </td>
                          <td>{item.timestamp ? new Date(item.timestamp).toLocaleString() : 'N/A'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                          No model usage data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* User Activity */}
        <div className="dashboard-section">
          <h2><FaUsers /> User Activity</h2>
          <div className="section-content">
            <div className="table-container">
              <h3>Recent User Activity</h3>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Action</th>
                      <th>Session</th>
                      <th>Agent</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.user_activity && filteredData.user_activity.length > 0 ? (
                      filteredData.user_activity.slice(0, 10).map(item => (
                        <tr key={item.id || Math.random()}>
                          <td>{item.user_email || 'Unknown'}</td>
                          <td>{item.action || 'Unknown'}</td>
                          <td>
                            {item.session_id ? (
                              <button 
                                className="clickable-session"
                                onClick={() => {
                                  console.log('Session button clicked:', item.session_id);
                                  fetchSessionDetails(item.session_id);
                                }}
                                title="Click to view session details"
                              >
                                {item.session_id.substring(0, 8)}...
                              </button>
                            ) : (
                              'N/A'
                            )}
                          </td>
                          <td>{item.agent_id || 'None'}</td>
                          <td>{item.timestamp ? new Date(item.timestamp).toLocaleString() : 'N/A'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                          No user activity data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Agent Usage */}
        <div className="dashboard-section">
          <h2><FaRobot /> Agent Usage</h2>
          <div className="section-content">
            <div className="table-container">
              <h3>Recent Agent Usage</h3>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Agent</th>
                      <th>User</th>
                      <th>Session</th>
                      <th>Usage Type</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.agent_usage && filteredData.agent_usage.length > 0 ? (
                      filteredData.agent_usage.slice(0, 10).map(item => (
                        <tr key={item.id || Math.random()}>
                          <td>
                            {item.agent_id ? (
                              <button 
                                className="clickable-agent"
                                onClick={() => {
                                  console.log('Agent button clicked:', item.agent_id);
                                  fetchAgentDetails(item.agent_id);
                                }}
                                title="Click to view agent details"
                              >
                                {item.agent_name || item.agent_id}
                              </button>
                            ) : (
                              'Unknown'
                            )}
                          </td>
                          <td>{item.user_email || 'Unknown'}</td>
                          <td>
                            {item.session_id ? (
                              <button 
                                className="clickable-session"
                                onClick={() => {
                                  console.log('Session button clicked:', item.session_id);
                                  fetchSessionDetails(item.session_id);
                                }}
                                title="Click to view session details"
                              >
                                {item.session_id.substring(0, 8)}...
                              </button>
                            ) : (
                              'N/A'
                            )}
                          </td>
                          <td>{item.usage_type || 'Unknown'}</td>
                          <td>{item.timestamp ? new Date(item.timestamp).toLocaleString() : 'N/A'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                          No agent usage data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Session Details */}
        <div className="dashboard-section">
          <h2><FaClock /> Session Details</h2>
          <div className="section-content">
            <div className="table-container">
              <h3>All Sessions</h3>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Session ID</th>
                      <th>User</th>
                      <th>Title</th>
                      <th>Agent</th>
                      <th>Messages</th>
                      <th>Created</th>
                      <th>Last Activity</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.session_metrics && filteredData.session_metrics.length > 0 ? (
                      filteredData.session_metrics.slice(0, 15).map(item => (
                        <tr key={item.session_id || Math.random()}>
                          <td>
                            <button 
                              className="clickable-session"
                              onClick={() => {
                                console.log('Session button clicked:', item.session_id);
                                fetchSessionDetails(item.session_id);
                              }}
                              title="Click to view detailed session information"
                            >
                              {item.session_id ? item.session_id.substring(0, 12) + '...' : 'Unknown'}
                            </button>
                          </td>
                          <td>{item.user_email || 'Unknown'}</td>
                          <td>
                            <span className="session-title" title={item.title || 'Untitled Session'}>
                              {item.title ? (item.title.length > 30 ? item.title.substring(0, 30) + '...' : item.title) : 'Untitled Session'}
                            </span>
                          </td>
                          <td>
                            {item.agent_id ? (
                              <button 
                                className="clickable-agent"
                                onClick={() => {
                                  console.log('Agent button clicked:', item.agent_id);
                                  fetchAgentDetails(item.agent_id);
                                }}
                                title="Click to view agent details"
                              >
                                {item.agent_name || item.agent_id}
                              </button>
                            ) : (
                              'None'
                            )}
                          </td>
                          <td>
                            <span className="message-count">
                              {item.total_messages || 0} messages
                            </span>
                          </td>
                          <td>
                            <span className="timestamp">
                              {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'}
                            </span>
                          </td>
                          <td>
                            <span className="timestamp">
                              {item.last_activity ? new Date(item.last_activity).toLocaleString() : 'N/A'}
                            </span>
                          </td>
                          <td>
                            <span className={`status-badge ${item.status || 'active'}`}>
                              {item.status === 'deleted' ? 'Deleted' : 'Active'}
                            </span>
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button 
                                className="action-btn view-btn"
                                onClick={() => {
                                  console.log('Eye button clicked for session:', item.session_id);
                                  fetchSessionDetails(item.session_id);
                                }}
                                title="View Session Details"
                              >
                                <FaEye />
                              </button>
                              {item.agent_id && (
                                <button 
                                  className="action-btn agent-btn"
                                  onClick={() => {
                                    console.log('Robot button clicked for agent:', item.agent_id);
                                    fetchAgentDetails(item.agent_id);
                                  }}
                                  title="View Agent Details"
                                >
                                  <FaRobot />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="9" style={{ textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                          No session data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Agent Details Modal */}
      {showAgentModal && selectedAgentDetails && (
        <div className="modal-overlay" onClick={() => setShowAgentModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Agent Details</h2>
            </div>
            <div className="modal-body">
              <div className="agent-info">
                <h3>{selectedAgentDetails.agent_info.name}</h3>
                <p>{selectedAgentDetails.agent_info.description}</p>
                <div className="agent-stats">
                  <div className="stat-item">
                    <span className="stat-label">Total Interactions:</span>
                    <span className="stat-value">{selectedAgentDetails.statistics.total_interactions}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Unique Users:</span>
                    <span className="stat-value">{selectedAgentDetails.statistics.unique_users}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Total Sessions:</span>
                    <span className="stat-value">{selectedAgentDetails.statistics.total_sessions}</span>
                  </div>
                </div>
              </div>
              
              <div className="recent-sessions">
                <h4>Recent Sessions</h4>
                <div className="sessions-list">
                  {selectedAgentDetails.recent_sessions.map(session => (
                    <div key={session.session_id} className="session-item">
                      <div className="session-header">
                        <span className="session-title">{session.title}</span>
                        <span className="session-user">{session.user_email}</span>
                      </div>
                      <div className="session-details">
                        <span>Messages: {session.message_count}</span>
                        <span>Created: {new Date(session.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session Details Modal */}
      {showSessionModal && selectedSessionDetails && (
        <div className="modal-overlay" onClick={() => setShowSessionModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Session Details</h2>
            </div>
            <div className="modal-body">
              <div className="session-info">
                <h3>{selectedSessionDetails.session_info.title}</h3>
                <div className="session-stats">
                  <div className="stat-item">
                    <span className="stat-label">Total Messages:</span>
                    <span className="stat-value">{selectedSessionDetails.statistics.total_messages}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">User Messages:</span>
                    <span className="stat-value">{selectedSessionDetails.statistics.user_messages}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Assistant Messages:</span>
                    <span className="stat-value">{selectedSessionDetails.statistics.assistant_messages}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Duration:</span>
                    <span className="stat-value">{Math.round(selectedSessionDetails.statistics.session_duration_seconds / 60)}m</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Created:</span>
                    <span className="stat-value">{new Date(selectedSessionDetails.statistics.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="session-messages">
                <h4>Messages</h4>
                <div className="messages-list">
                  {selectedSessionDetails.session_info.messages.map((message, index) => (
                    <div key={index} className={`message-item ${message.role}`}>
                      <div className="message-header">
                        <span className="message-role">{message.role === 'user' ? 'User' : 'Assistant'}</span>
                        <span className="message-time">{new Date(message.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="message-content">
                        {message.content.substring(0, 200)}{message.content.length > 200 ? '...' : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonitoringDashboard; 