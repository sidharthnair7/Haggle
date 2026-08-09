import { Button, Icon } from '@chakra-ui/react';
import { FiRefreshCw } from 'react-icons/fi';

const RefreshButton = ({ onClick }) => (
  <Button
    transition="transform var(--dur-press) var(--ease-out), background-color var(--dur-menu) var(--ease-out)"
    _active={{ bg: 'var(--surface-ghost-hover)', transform: 'scale(0.94)' }}
    _hover={{ bg: 'var(--surface-ghost-hover)' }}
    bg="var(--surface-ghost)"
    boxShadow="var(--surface-ghost-highlight)"
    backdropFilter="var(--surface-ghost-blur)"
    position="absolute"
    onClick={onClick}
    border="1px solid transparent"
    zIndex={2}
    color="white"
    rounded="10px"
    right={3}
    size="md"
    top={3}
    p={2}
  >
    <Icon as={FiRefreshCw} boxSize={4} />
  </Button>
);

export default RefreshButton;
