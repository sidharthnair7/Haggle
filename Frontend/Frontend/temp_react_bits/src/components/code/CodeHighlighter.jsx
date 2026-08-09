import { TbCopy, TbCheck, TbMoodSad } from 'react-icons/tb';
import { Box, Flex, Icon, Text } from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { colors } from '../../constants/colors';
import codeTheme from '../../utils/codeTheme';

const routeExpansionState = {};

const hashSnippet = str => {
  if (!str) return 'empty';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
    if (i > 500) break;
  }
  return hash.toString(36);
};

const COPY_RESET_MS = 2000;

const CodeHighlighter = ({ language, codeString, showLineNumbers = true, maxLines = 25, snippetId }) => {
  const { pathname } = useLocation();
  const key = snippetId || hashSnippet(codeString + '|' + language);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(() => routeExpansionState[pathname]?.[key] ?? false);

  useEffect(() => {
    if (!routeExpansionState[pathname]) routeExpansionState[pathname] = {};
    routeExpansionState[pathname][key] = expanded;
  }, [expanded, pathname, key]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeString);
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_RESET_MS);
    } catch (error) {
      console.error('Failed to copy text: ', error);
    }
  };

  const codeLines = codeString?.split('\n').length;
  const shouldCollapse = codeLines > maxLines;

  return (
    <Box position="relative">
      <Box
        position="relative"
        overflow="hidden"
        maxHeight={shouldCollapse && !expanded ? `calc(1.2em * ${maxLines})` : 'none'}
      >
        {codeString ? (
          <SyntaxHighlighter
            language={language}
            style={codeTheme}
            showLineNumbers={showLineNumbers}
            className="code-highlighter"
          >
            {codeString}
          </SyntaxHighlighter>
        ) : (
          <Flex alignItems="center" gap={2} my={2} color={colors.textMuted}>
            <Text>Sorry, this combination is not supported</Text>
            <Icon as={TbMoodSad} />
          </Flex>
        )}

        {shouldCollapse && !expanded && (
          <Box
            position="absolute"
            bottom={0}
            left={0}
            right={0}
            height="60%"
            background={`linear-gradient(to bottom, transparent, ${colors.bgBody})`}
          />
        )}

        {shouldCollapse && (
          <button className="docs-expand-button" onClick={() => setExpanded(prev => !prev)}>
            {expanded ? 'Collapse Snippet' : 'Expand Snippet'}
          </button>
        )}
      </Box>

      {codeString && (
        <div className="docs-code-header">
          <button
            className={`docs-copy-button${copied ? ' docs-copy-button--done' : ''}`}
            onClick={handleCopy}
            title={copied ? 'Copied!' : 'Copy to clipboard'}
            aria-label={copied ? 'Code copied to clipboard' : 'Copy code to clipboard'}
          >
            {copied ? <TbCheck /> : <TbCopy />}
          </button>
        </div>
      )}
    </Box>
  );
};

export default CodeHighlighter;
