import DocsButtonBar from './DocsButtonBar';
import CodeBlock from './CodeBlock';
import MethodSelector from './MethodSelector';
import CopyPageButton from './CopyPageButton';
import IconSelect from '../components/code/IconSelect';
import useScrollToTop from '../hooks/useScrollToTop';
import { useOptions } from '../components/context/OptionsContext/useOptions';
import { useInstallation } from '../hooks/useInstallation';
import { TbCopy, TbTerminal2 } from 'react-icons/tb';

import jsIcon from '../assets/icons/js.svg';
import tsIcon from '../assets/icons/ts.svg';
import cssIcon from '../assets/icons/css.svg';
import twIcon from '../assets/icons/tw.svg';

const METHOD_ICON = { fontSize: '18px' };

const METHODS = [
  { key: 'manual', icon: <TbCopy style={METHOD_ICON} />, label: 'Manual' },
  { key: 'cli', icon: <TbTerminal2 style={METHOD_ICON} />, label: 'CLI' }
];

const CLI_TOOLS = [
  { key: 'shadcn', label: 'shadcn' },
  { key: 'jsrepo', label: 'jsrepo' }
];

const LANG_ITEMS = ['JS', 'TS'];
const STYLE_ITEMS = ['CSS', 'TW'];
const ICON_MAP = { JS: jsIcon, TS: tsIcon, CSS: cssIcon, TW: twIcon };
const COLOR_MAP = { JS: '#F7DF1E', TS: '#3178C6', CSS: '#B497CF', TW: '#38BDF8' };
const LABEL_MAP = { JS: 'JavaScript', TS: 'TypeScript', CSS: 'CSS', TW: 'Tailwind' };

const StackPicker = () => {
  const { languagePreset, setLanguagePreset, stylePreset, setStylePreset } = useOptions();

  return (
    <div className="docs-code-options">
      <IconSelect
        collection={LANG_ITEMS}
        value={languagePreset || 'JS'}
        onChange={setLanguagePreset}
        iconMap={ICON_MAP}
        labelMap={LABEL_MAP}
        colorMap={COLOR_MAP}
        width="150px"
      />
      <IconSelect
        collection={STYLE_ITEMS}
        value={stylePreset || 'CSS'}
        onChange={setStylePreset}
        iconMap={ICON_MAP}
        labelMap={LABEL_MAP}
        colorMap={COLOR_MAP}
        width="140px"
      />
    </div>
  );
};

const ManualSteps = () => (
  <>
    <p className="docs-paragraph dim">Copy a component&apos;s source straight into your project.</p>

    <h3 className="docs-subtitle">1. Pick a component</h3>
    <p className="docs-paragraph">
      Browse the library, open a component you like, and switch to its <span className="docs-highlight">Code</span> tab.
    </p>

    <h3 className="docs-subtitle">2. Set your stack</h3>
    <p className="docs-paragraph short">
      Choose your language and styling below. Every <span className="docs-highlight">Code</span> tab across the site
      updates to match, and your choice is remembered on this device.
    </p>
    <StackPicker />

    <h3 className="docs-subtitle">3. Copy the code</h3>
    <p className="docs-paragraph">
      The <span className="docs-highlight">Code</span> tab now shows the full source for your selected stack — copy it
      into a new file in your project.
    </p>

    <h3 className="docs-subtitle">4. Install dependencies &amp; use it</h3>
    <p className="docs-paragraph short">
      If a component relies on external libraries, its <span className="docs-highlight">Code</span> tab lists them.
      Install what it needs:
    </p>
    <CodeBlock language="bash" showLineNumbers>
      npm install gsap
    </CodeBlock>
    <p className="docs-paragraph short">Then import and render it like any other component:</p>
    <CodeBlock language="jsx" showLineNumbers>
      {`import SplitText from "./SplitText";

<SplitText
  text="Hello, you!"
  delay={100}
  duration={0.6}
/>`}
    </CodeBlock>
  </>
);

const CliSteps = () => {
  const { languagePreset, stylePreset } = useOptions();
  const { cliTool, setCliTool } = useInstallation();

  const variant = `${languagePreset || 'JS'}-${stylePreset === 'TW' ? 'TW' : 'CSS'}`;
  const command =
    cliTool === 'shadcn'
      ? `npx shadcn@latest add @react-bits/SplitText-${variant}`
      : `npx jsrepo@latest add https://reactbits.dev/r/SplitText-${variant}`;

  return (
    <>
      <p className="docs-paragraph dim">Pull a component into your project with a single command.</p>

      <h3 className="docs-subtitle">1. Choose a CLI</h3>
      <p className="docs-paragraph short">
        React Bits works with two registries — both fetch the same source, so pick whichever you already use.
      </p>
      <MethodSelector methods={CLI_TOOLS} selected={cliTool} onSelect={setCliTool} ariaLabel="CLI tool" />

      <h3 className="docs-subtitle">2. Set your stack</h3>
      <p className="docs-paragraph short">
        The <span className="docs-highlight">{variant}</span> suffix in the command follows your language and styling
        choice:
      </p>
      <StackPicker />

      <h3 className="docs-subtitle">3. Run the command</h3>
      <p className="docs-paragraph short">
        This example installs <span className="docs-highlight">SplitText</span> — swap in any component name:
      </p>
      <CodeBlock language="bash">{command}</CodeBlock>

      <p className="docs-paragraph dim">
        Prefer pnpm, yarn or bun? Swap the <code>npx</code> prefix for <code>pnpm dlx</code>, <code>yarn</code>, or{' '}
        <code>bun x --bun</code>.
      </p>
    </>
  );
};

const Installation = () => {
  const { installMode, setInstallMode } = useInstallation();

  useScrollToTop();

  return (
    <section className="docs-section">
      <div className="docs-page-header">
        <h1 className="docs-title">Installation</h1>
        <CopyPageButton />
      </div>

      <p className="docs-lead">
        Add React Bits components two ways — copy the source by hand, or pull them in with a CLI. Your choice is saved
        and used across the site.
      </p>

      <h2 className="docs-section-title">Pick the method</h2>
      <MethodSelector
        methods={METHODS}
        selected={installMode}
        onSelect={setInstallMode}
        ariaLabel="Installation method"
      />

      <h2 className="docs-section-title">Steps</h2>
      {installMode === 'manual' ? <ManualSteps /> : <CliSteps />}

      <h2 className="docs-section-title">That&apos;s all!</h2>

      <p className="docs-paragraph">
        From here on, it&apos;s all about how you integrate the component into your project. The code is yours to play
        around with — modify styling, functionality, anything goes!
      </p>

      <DocsButtonBar
        next={{ label: 'MCP Server', route: '/get-started/mcp' }}
        previous={{ label: 'Introduction', route: '/get-started/introduction' }}
      />
    </section>
  );
};

export default Installation;
