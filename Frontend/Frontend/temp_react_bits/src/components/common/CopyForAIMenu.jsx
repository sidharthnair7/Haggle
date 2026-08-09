import { Menu, Portal, Box } from '@chakra-ui/react';
import { Check, ChevronDown } from 'lucide-react';
import { colors } from '../../constants/colors';

const AI_MENU_ITEM_PROPS = {
  display: 'flex',
  alignItems: 'center',
  gap: 3,
  px: 3,
  py: 2,
  fontSize: '14px',
  color: '#fff',
  borderRadius: '8px',
  cursor: 'pointer',
  _hover: { bg: colors.bgHover }
};

export const AIMenuItem = ({ item, done }) => {
  const { key, label, icon: ItemIcon, run } = item;
  return (
    <Menu.Item value={key} onSelect={run} {...AI_MENU_ITEM_PROPS}>
      {done === key ? <Check size={16} color={colors.accent} /> : <ItemIcon size={16} color={colors.textMuted} />}
      {label}
    </Menu.Item>
  );
};

const CopyForAIMenu = ({ triggerProps, copyItems, openItems, done }) => {
  return (
    <Menu.Root positioning={{ placement: 'bottom-end', gutter: 8 }}>
      <Menu.Trigger asChild>
        <Box
          as="button"
          aria-label="Copy for AI"
          display="flex"
          cursor="pointer"
          alignItems="center"
          gap={2}
          {...triggerProps}
        >
          {done && <Check size={14} color={colors.accent} />}
          {done ? 'Copied!' : 'Copy for AI'}
          <ChevronDown size={14} color="#fff" />
        </Box>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content
            bg={colors.bgBody}
            border={`1px solid ${colors.borderPrimary}`}
            borderRadius="10px"
            p={1}
            minW="235px"
            boxShadow="0 10px 30px rgba(0, 0, 0, 0.5)"
            zIndex={1500}
            transformOrigin="top right"
          >
            {copyItems.map(item => (
              <AIMenuItem key={item.key} item={item} done={done} />
            ))}
            <Menu.Separator borderColor={colors.borderPrimary} my={1} />
            {openItems.map(item => (
              <AIMenuItem key={item.key} item={item} done={done} />
            ))}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
};

export default CopyForAIMenu;
