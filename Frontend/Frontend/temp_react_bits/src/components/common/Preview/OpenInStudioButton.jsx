import { Button, Icon } from '@chakra-ui/react';
import { Palette } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { colors } from '../../../constants/colors';

export function buildStudioUrl(backgroundId, currentProps = {}, defaultProps = {}) {
  const params = new URLSearchParams();
  params.set('bg', backgroundId);

  Object.keys(currentProps).forEach(key => {
    if (JSON.stringify(currentProps[key]) !== JSON.stringify(defaultProps[key])) {
      const value = currentProps[key];
      if (Array.isArray(value)) {
        params.set(key, value.map(v => (typeof v === 'string' ? v.replace(/^#/, '') : v)).join(','));
      } else if (typeof value === 'string' && value.startsWith('#')) {
        params.set(key, value.replace(/^#/, ''));
      } else {
        params.set(key, String(value));
      }
    }
  });

  return `/tools/background-studio?${params.toString()}`;
}

const OpenInStudioButton = ({ backgroundId, currentProps = {}, defaultProps = {} }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(buildStudioUrl(backgroundId, currentProps, defaultProps));
  };

  return (
    <Button
      size="sm"
      position="absolute"
      mt={3.5}
      color="#ffffff"
      bg={colors.primary}
      border="1px solid transparent"
      boxShadow="var(--surface-ghost-highlight)"
      fontWeight={500}
      borderRadius="10px"
      fontSize="14px"
      onClick={handleClick}
      transition="transform var(--dur-press) var(--ease-out), background-color var(--dur-menu) var(--ease-out)"
      _hover={{ color: '#fff', bg: `${colors.primary}aa` }}
      _active={{ transform: 'scale(0.97)' }}
      display={{ base: 'none', md: 'inline-flex' }}
    >
      <Icon as={Palette} boxSize={4} /> Open in BG Studio
    </Button>
  );
};

export default OpenInStudioButton;
