import React from 'react';

interface SelectProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  children: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
  disabled?: boolean;
}

interface SelectOptionProps {
  value: string;
  children: React.ReactNode;
}

export const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  placeholder,
  children,
  className = '',
  fullWidth = false,
  disabled = false
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  return (
    <select
      value={value}
      onChange={handleChange}
      disabled={disabled}
      className={`
        px-3 py-2 border border-gray-300 rounded-md shadow-sm
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
        bg-white text-gray-900 text-sm
        disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {children}
    </select>
  );
};

export const SelectOption: React.FC<SelectOptionProps> = ({ value, children }) => {
  return <option value={value}>{children}</option>;
};