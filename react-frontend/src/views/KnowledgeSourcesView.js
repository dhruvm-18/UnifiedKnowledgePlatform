import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faEdit, faTrashAlt, faShieldAlt, faGavel, faSearch } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AgentModal from '../components/AgentModal';
import ConfirmationModal from '../components/ConfirmationModal';
import '../styles/KnowledgeSourcesView.css'; // Import the CSS file

// ... existing code ... 