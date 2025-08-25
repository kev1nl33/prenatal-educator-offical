/**
 * Toggle 开关组件
 * 用于功能开关的可视化控制
 */

import React from 'react';

interface ToggleProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const Toggle: React.FC<ToggleProps> = ({
  id,
  checked,
  onChange,
  disabled = false,
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'w-8 h-4',
    md: 'w-11 h-6',
    lg: 'w-14 h-7'
  };

  const thumbSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const translateClasses = {
    sm: checked ? 'translate-x-4' : 'translate-x-0.5',
    md: checked ? 'translate-x-5' : 'translate-x-0.5',
    lg: checked ? 'translate-x-7' : 'translate-x-0.5'
  };

  return (
    <button
      type="button"
      className={`
        ${sizeClasses[size]}
        relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent
        transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${checked ? 'bg-blue-600' : 'bg-gray-200'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      role="switch"
      aria-checked={checked}
      aria-labelledby={`${id}-label`}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
    >
      <span className="sr-only">Toggle setting</span>
      <span
        className={`
          ${thumbSizeClasses[size]}
          ${translateClasses[size]}
          pointer-events-none inline-block rounded-full bg-white shadow transform ring-0
          transition duration-200 ease-in-out
        `}
      />
    </button>
  );
};

export default Toggle;