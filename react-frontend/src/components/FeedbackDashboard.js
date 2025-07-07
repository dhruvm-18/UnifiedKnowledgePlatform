import React, { useState, useEffect } from 'react';
import { FaChartBar, FaStar, FaThumbsUp, FaThumbsDown, FaComments, FaCalendarAlt, FaFilter, FaUsers, FaChartLine, FaTrendingDown, FaExclamationTriangle, FaCheckCircle, FaClock, FaEye } from 'react-icons/fa';
import '../styles/FeedbackDashboard.css';

const FeedbackDashboard = () => {
  const [feedbackData, setFeedbackData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [dateRange, setDateRange] = useState('7d');
  const [selectedTimeframe, setSelectedTimeframe] = useState('7d');
  const [error, setError] = useState(null);

  // Fetch real feedback data from backend
  const fetchFeedbackData = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/feedback', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch feedback data');
      }

      const data = await response.json();
      
      // Transform the data to match our dashboard format
      const transformedData = data.map(item => ({
        id: item.id || Math.random().toString(36).substr(2, 9),
        sessionId: item.session_id || `session_${item.id}`,
        agentId: item.agent_id || 'default_agent',
        agentName: item.agent_name || 'AI Assistant',
        rating: item.rating || (item.feedback_type === 'positive' ? 4 : 2),
        category: item.category || 'helpfulness',
        severity: item.severity || 'medium',
        feedback: item.feedback_text || item.comment || 'User feedback provided',
        timestamp: item.timestamp || item.created_at || new Date().toISOString(),
        userEmail: item.user_email || item.user_id || 'anonymous@user.com',
        responseTime: item.response_time || Math.random() * 5 + 1,
        sessionDuration: item.session_duration || Math.floor(Math.random() * 30) + 5,
        feedbackType: item.feedback_type || 'rating', // positive, negative, neutral
        messageId: item.message_id,
        modelUsed: item.model_used || 'Gemini 2.5 Flash',
        modelIcon: item.model_icon || '🤖'
      }));

      setFeedbackData(transformedData);
      setError(null);
    } catch (err) {
      console.error('Error fetching feedback data:', err);
      setError('Failed to load feedback data. Using demo data instead.');
      // Fallback to demo data if API fails
      setFeedbackData(getDemoData());
    } finally {
      setLoading(false);
    }
  };

  // Demo data as fallback
  const getDemoData = () => {
    const now = new Date();
    return [
      {
        id: 1,
        sessionId: 'session_001',
        agentId: 'agent_001',
        agentName: 'Legal Assistant',
        rating: 5,
        category: 'accuracy',
        severity: 'high',
        feedback: 'Very accurate responses to legal questions. The agent provided detailed citations.',
        timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        userEmail: 'user1@example.com',
        responseTime: 2.3,
        sessionDuration: 15,
        feedbackType: 'positive',
        messageId: 'msg_001',
        modelUsed: 'Gemini 2.5 Flash',
        modelIcon: '🤖'
      },
      {
        id: 2,
        sessionId: 'session_002',
        agentId: 'agent_002',
        agentName: 'Financial Analyst',
        rating: 4,
        category: 'helpfulness',
        severity: 'medium',
        feedback: 'Good analysis but could provide more detailed explanations for complex financial terms.',
        timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        userEmail: 'user2@example.com',
        responseTime: 3.1,
        sessionDuration: 22,
        feedbackType: 'positive',
        messageId: 'msg_002',
        modelUsed: 'Meta LlaMa 3',
        modelIcon: '🦙'
      },
      {
        id: 3,
        sessionId: 'session_003',
        agentId: 'agent_003',
        agentName: 'Research Assistant',
        rating: 3,
        category: 'speed',
        severity: 'low',
        feedback: 'Response was a bit slow but the information was relevant.',
        timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        userEmail: 'user3@example.com',
        responseTime: 5.2,
        sessionDuration: 8,
        feedbackType: 'neutral',
        messageId: 'msg_003',
        modelUsed: 'Mistral AI',
        modelIcon: '🌪️'
      },
      {
        id: 4,
        sessionId: 'session_004',
        agentId: 'agent_001',
        agentName: 'Legal Assistant',
        rating: 5,
        category: 'accuracy',
        severity: 'high',
        feedback: 'Excellent legal advice with proper references to relevant statutes.',
        timestamp: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        userEmail: 'user4@example.com',
        responseTime: 1.8,
        sessionDuration: 18,
        feedbackType: 'positive',
        messageId: 'msg_004',
        modelUsed: 'Gemini 2.5 Flash',
        modelIcon: '🤖'
      },
      {
        id: 5,
        sessionId: 'session_005',
        agentId: 'agent_002',
        agentName: 'Financial Analyst',
        rating: 2,
        category: 'helpfulness',
        severity: 'high',
        feedback: 'The response was not helpful and lacked specific financial calculations.',
        timestamp: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        userEmail: 'user5@example.com',
        responseTime: 4.5,
        sessionDuration: 12,
        feedbackType: 'negative',
        messageId: 'msg_005',
        modelUsed: 'Meta LlaMa 3',
        modelIcon: '🦙'
      },
      {
        id: 6,
        sessionId: 'session_006',
        agentId: 'agent_003',
        agentName: 'Research Assistant',
        rating: 4,
        category: 'accuracy',
        severity: 'medium',
        feedback: 'Good research capabilities but could improve citation accuracy.',
        timestamp: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        userEmail: 'user6@example.com',
        responseTime: 2.9,
        sessionDuration: 25,
        feedbackType: 'positive',
        messageId: 'msg_006',
        modelUsed: 'Mistral AI',
        modelIcon: '🌪️'
      },
      {
        id: 7,
        sessionId: 'session_007',
        agentId: 'agent_001',
        agentName: 'Legal Assistant',
        rating: 5,
        category: 'helpfulness',
        severity: 'high',
        feedback: 'Outstanding legal analysis with comprehensive case law references.',
        timestamp: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        userEmail: 'user7@example.com',
        responseTime: 2.1,
        sessionDuration: 30,
        feedbackType: 'positive',
        messageId: 'msg_007',
        modelUsed: 'Gemini 2.5 Flash',
        modelIcon: '🤖'
      },
      {
        id: 8,
        sessionId: 'session_008',
        agentId: 'agent_002',
        agentName: 'Financial Analyst',
        rating: 3,
        category: 'speed',
        severity: 'medium',
        feedback: 'Response time was acceptable but could be faster for simple queries.',
        timestamp: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        userEmail: 'user8@example.com',
        responseTime: 3.8,
        sessionDuration: 14,
        feedbackType: 'neutral',
        messageId: 'msg_008',
        modelUsed: 'Meta LlaMa 3',
        modelIcon: '🦙'
      }
    ];
  };

  useEffect(() => {
    fetchFeedbackData();
    
    // Set up polling to refresh data every 30 seconds
    const interval = setInterval(fetchFeedbackData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getFilteredData = () => {
    let filtered = feedbackData;
    
    if (filter !== 'all') {
      filtered = filtered.filter(item => item.category === filter);
    }
    
    // Filter by date range
    const now = new Date();
    const daysAgo = {
      '1d': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90
    };
    
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

  const getCategoryStats = () => {
    const filtered = getFilteredData();
    const stats = {};
    filtered.forEach(item => {
      stats[item.category] = (stats[item.category] || 0) + 1;
    });
    return stats;
  };

  const getSeverityStats = () => {
    const filtered = getFilteredData();
    const stats = {};
    filtered.forEach(item => {
      stats[item.severity] = (stats[item.severity] || 0) + 1;
    });
    return stats;
  };

  const getFeedbackTypeStats = () => {
    const filtered = getFilteredData();
    const stats = { positive: 0, negative: 0, neutral: 0 };
    filtered.forEach(item => {
      stats[item.feedbackType] = (stats[item.feedbackType] || 0) + 1;
    });
    return stats;
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

  const getRatingDistribution = () => {
    const filtered = getFilteredData();
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    filtered.forEach(item => {
      distribution[item.rating]++;
    });
    return distribution;
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

  const getCategoryIcon = (category) => {
    const icons = {
      accuracy: <FaCheckCircle />,
      helpfulness: <FaComments />,
      speed: <FaClock />
    };
    return icons[category] || <FaComments />;
  };

  const getFeedbackTypeIcon = (type) => {
    const icons = {
      positive: <FaThumbsUp />,
      negative: <FaThumbsDown />,
      neutral: <FaComments />
    };
    return icons[type] || <FaComments />;
  };

  if (loading) {
    return (
      <div className="feedback-dashboard">
        <div className="dashboard-header">
          <h1>Feedback Analytics Dashboard</h1>
          <p>Loading real-time feedback data...</p>
        </div>
      </div>
    );
  }

  const filteredData = getFilteredData();
  const averageRating = getAverageRating();
  const categoryStats = getCategoryStats();
  const severityStats = getSeverityStats();
  const feedbackTypeStats = getFeedbackTypeStats();
  const agentPerformance = getAgentPerformance();
  const ratingDistribution = getRatingDistribution();
  const modelPerformance = getModelPerformance();
  const trendData = getTrendData();

  return (
    <div className="feedback-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Feedback Analytics Dashboard</h1>
          <p>Real-time user feedback from chat interactions</p>
          {error && <p style={{ color: '#dc3545', fontSize: '0.9rem', marginTop: '0.5rem' }}>{error}</p>}
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
            {Object.entries(ratingDistribution).map(([rating, count]) => (
              <div key={rating} className="chart-item">
                <div className="chart-item-icon">
                  {renderStars(parseInt(rating))}
                </div>
                <div className="chart-item-content">
                  <span className="chart-item-label">{rating} Stars</span>
                  <span className="chart-item-value">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-section">
          <h3>Feedback by Category</h3>
          <div className="chart-content">
            {Object.entries(categoryStats).map(([category, count]) => (
              <div key={category} className="chart-item">
                <div className="chart-item-icon">
                  {getCategoryIcon(category)}
                </div>
                <div className="chart-item-content">
                  <span className="chart-item-label">{category}</span>
                  <span className="chart-item-value">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="grid-section">
          <h3>Agent Performance</h3>
          <div className="agent-performance-grid">
            {Object.entries(agentPerformance).map(([agent, stats]) => (
              <div key={agent} className="agent-card">
                <div className="agent-header">
                  <h4>{agent}</h4>
                  <div className="agent-rating">{renderStars(parseFloat(stats.avgRating))}</div>
                </div>
                <div className="agent-stats">
                  <div className="stat-row">
                    <span>Avg Rating:</span>
                    <span className="stat-value">{stats.avgRating}</span>
                  </div>
                  <div className="stat-row">
                    <span>Feedback Count:</span>
                    <span className="stat-value">{stats.count}</span>
                  </div>
                  <div className="stat-row">
                    <span>Avg Response Time:</span>
                    <span className="stat-value">{stats.avgResponseTime}s</span>
                  </div>
                  <div className="stat-row">
                    <span>Models Used:</span>
                    <span className="stat-value">{stats.models.join(', ')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid-section">
          <h3>Model Performance</h3>
          <div className="model-performance-grid">
            {Object.entries(modelPerformance).map(([model, stats]) => (
              <div key={model} className="model-card">
                <div className="model-header">
                  <h4><span style={{ marginRight: '8px' }}>{stats.icon}</span>{model}</h4>
                  <div className="model-rating">{renderStars(parseFloat(stats.avgRating))}</div>
                </div>
                <div className="model-stats">
                  <div className="stat-row">
                    <span>Avg Rating:</span>
                    <span className="stat-value">{stats.avgRating}</span>
                  </div>
                  <div className="stat-row">
                    <span>Usage Count:</span>
                    <span className="stat-value">{stats.count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="grid-section">
          <h3>Feedback Type Analysis</h3>
          <div className="feedback-type-chart">
            {Object.entries(feedbackTypeStats).map(([type, count]) => (
              <div key={type} className="feedback-type-item">
                <div 
                  className="feedback-type-indicator"
                  style={{ backgroundColor: getFeedbackTypeColor(type) }}
                />
                <div className="feedback-type-content">
                  <span className="feedback-type-label">
                    {getFeedbackTypeIcon(type)} {type}
                  </span>
                  <span className="feedback-type-count">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid-section">
          <h3>Severity Analysis</h3>
          <div className="severity-chart">
            {Object.entries(severityStats).map(([severity, count]) => (
              <div key={severity} className="severity-item">
                <div 
                  className="severity-indicator"
                  style={{ backgroundColor: getSeverityColor(severity) }}
                />
                <div className="severity-content">
                  <span className="severity-label">{severity}</span>
                  <span className="severity-count">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="feedback-list">
        <h3>Recent Feedback</h3>
        <div className="feedback-items">
          {filteredData.map(feedback => (
            <div key={feedback.id} className="feedback-item">
              <div className="feedback-header">
                <div className="feedback-agent">
                  <strong>{feedback.agentName}</strong>
                  <span className="feedback-session">Session: {feedback.sessionId}</span>
                </div>
                <div className="feedback-rating">
                  {renderStars(feedback.rating)}
                </div>
              </div>
              <div className="feedback-content">
                <p>{feedback.feedback}</p>
              </div>
              <div className="feedback-meta">
                <span className="feedback-category">
                  {getCategoryIcon(feedback.category)} {feedback.category}
                </span>
                <span 
                  className="feedback-severity"
                  style={{ color: getSeverityColor(feedback.severity) }}
                >
                  {feedback.severity}
                </span>
                <span 
                  className="feedback-type"
                  style={{ color: getFeedbackTypeColor(feedback.feedbackType) }}
                >
                  {getFeedbackTypeIcon(feedback.feedbackType)} {feedback.feedbackType}
                </span>
                <span className="feedback-date">
                  <FaCalendarAlt /> {new Date(feedback.timestamp).toLocaleDateString()}
                </span>
                <span className="feedback-user">
                  {feedback.userEmail}
                </span>
                <span className="feedback-time">
                  <FaClock /> {feedback.responseTime}s
                </span>
                <span className="feedback-model">
                  <span style={{ marginRight: '4px' }}>{feedback.modelIcon}</span>
                  {feedback.modelUsed}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeedbackDashboard; 