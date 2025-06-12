import { FaShieldAlt, FaGavel, FaFileAlt } from 'react-icons/fa';

export const getIconComponent = (iconType) => {
  switch (iconType) {
    case 'FaShieldAlt':
      return <FaShieldAlt />;
    case 'FaGavel':
      return <FaGavel />;
    case 'FaFileAlt':
      return <FaFileAlt />;
    default:
      return <FaFileAlt />;
  }
}; 