import { useRef } from 'react';

const MethodSelector = ({ methods, selected, onSelect, ariaLabel = 'Options' }) => {
  const buttonRefs = useRef([]);
  const activeIndex = Math.max(
    0,
    methods.findIndex(m => m.key === selected)
  );

  const focusAt = index => {
    const next = (index + methods.length) % methods.length;
    onSelect(methods[next].key);
    buttonRefs.current[next]?.focus();
  };

  const handleKeyDown = event => {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        focusAt(activeIndex + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        focusAt(activeIndex - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusAt(0);
        break;
      case 'End':
        event.preventDefault();
        focusAt(methods.length - 1);
        break;
      default:
        break;
    }
  };

  return (
    <div
      className="docs-segmented"
      role="radiogroup"
      aria-label={ariaLabel}
      style={{ '--seg-count': methods.length, '--seg-index': activeIndex }}
      onKeyDown={handleKeyDown}
    >
      <span className="docs-segmented-indicator" aria-hidden="true" />
      {methods.map(({ key, icon, label }, index) => {
        const isActive = key === selected;
        return (
          <button
            key={key}
            ref={el => (buttonRefs.current[index] = el)}
            type="button"
            role="radio"
            aria-checked={isActive}
            tabIndex={isActive ? 0 : -1}
            className={`docs-segment ${isActive ? 'is-active' : ''}`}
            onClick={() => onSelect(key)}
          >
            {icon && (
              <span className="docs-segment-icon" aria-hidden="true">
                {icon}
              </span>
            )}
            <span className="docs-segment-label">{label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default MethodSelector;
