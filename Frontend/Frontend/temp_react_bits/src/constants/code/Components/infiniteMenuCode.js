import code from '@content/Components/InfiniteMenu/InfiniteMenu.jsx?raw';
import css from '@content/Components/InfiniteMenu/InfiniteMenu.css?raw';
import tailwind from '@tailwind/Components/InfiniteMenu/InfiniteMenu.jsx?raw';
import tsCode from '@ts-default/Components/InfiniteMenu/InfiniteMenu.tsx?raw';
import tsTailwind from '@ts-tailwind/Components/InfiniteMenu/InfiniteMenu.tsx?raw';

export const infiniteMenu = {
  dependencies: `gl-matrix`,
  usage: `import InfiniteMenu from './InfiniteMenu'

const items = [
  {
    image: 'https://images.unsplash.com/photo-1782977389500-dd7adad33ebe?q=80&w=600&h=600&fit=crop&sat=-100&auto=format',
    link: 'https://google.com/',
    title: 'Item 1',
    description: 'This is pretty cool, right?'
  },
  {
    image: 'https://images.unsplash.com/photo-1781499455083-6ccc3beb20cd?q=80&w=600&h=600&fit=crop&sat=-100&auto=format',
    link: 'https://google.com/',
    title: 'Item 2',
    description: 'This is pretty cool, right?'
  },
  {
    image: 'https://images.unsplash.com/photo-1776394254711-4a0d7345269a?q=80&w=600&h=600&fit=crop&sat=-100&auto=format',
    link: 'https://google.com/',
    title: 'Item 3',
    description: 'This is pretty cool, right?'
  },
  {
    image: 'https://images.unsplash.com/photo-1781242629922-6f39cc3671cd?q=80&w=600&h=600&fit=crop&sat=-100&auto=format',
    link: 'https://google.com/',
    title: 'Item 4',
    description: 'This is pretty cool, right?'
  }
];

<div style={{ height: '600px', position: 'relative' }}>
  <InfiniteMenu items={items}/>
</div>`,
  code,
  css,
  tailwind,
  tsCode,
  tsTailwind
};
