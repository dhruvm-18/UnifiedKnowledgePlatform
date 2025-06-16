import { FaShieldAlt, FaGavel, FaFileAlt, FaRobot, FaBook, FaLightbulb, FaFlask, FaUserTie } from 'react-icons/fa';

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
    default:
      return <FaFileAlt {...props} />;
  }
}; 