import { FaShieldAlt, FaGavel, FaFileAlt, FaRobot, FaBook, FaLightbulb, FaFlask, FaUserTie, FaDatabase, FaCloud, FaUser, FaLock, FaChartBar, FaCog, FaComments, FaStar, FaBell, FaCalendar, FaEnvelope, FaMap, FaHeart, FaCheck, FaTimes } from 'react-icons/fa';

export const getIconComponent = (iconType, props) => {
  switch (iconType) {
    case 'FaShieldAlt':
      return <FaShieldAlt {...props} />;
    case 'FaGavel':
      return <FaGavel {...props} />;
    case 'FaRobot':
      return <FaRobot {...props} />;
    case 'FaBook':
      return <FaBook {...props} />;
    case 'FaLightbulb':
      return <FaLightbulb {...props} />;
    case 'FaFlask':
      return <FaFlask {...props} />;
    case 'FaUserTie':
      return <FaUserTie {...props} />;
    case 'FaFileAlt':
      return <FaFileAlt {...props} />;
    case 'FaDatabase':
      return <FaDatabase {...props} />;
    case 'FaCloud':
      return <FaCloud {...props} />;
    case 'FaUser':
      return <FaUser {...props} />;
    case 'FaLock':
      return <FaLock {...props} />;
    case 'FaChartBar':
      return <FaChartBar {...props} />;
    case 'FaCog':
      return <FaCog {...props} />;
    case 'FaComments':
      return <FaComments {...props} />;
    case 'FaStar':
      return <FaStar {...props} />;
    case 'FaBell':
      return <FaBell {...props} />;
    case 'FaCalendar':
      return <FaCalendar {...props} />;
    case 'FaEnvelope':
      return <FaEnvelope {...props} />;
    case 'FaMap':
      return <FaMap {...props} />;
    case 'FaHeart':
      return <FaHeart {...props} />;
    case 'FaCheck':
      return <FaCheck {...props} />;
    case 'FaTimes':
      return <FaTimes {...props} />;
    case 'unified-mode':
      return (
        <img 
          src="/unified-knowledge-platform.png" 
          alt="Unified® Mode" 
          style={{ 
            width: props?.size || '16px', 
            height: props?.size || '16px', 
            borderRadius: '50%',
            filter: 'grayscale(100%) brightness(0.7)'
          }} 
        />
      );
    default:
      return <FaFileAlt {...props} />;
  }
}; 