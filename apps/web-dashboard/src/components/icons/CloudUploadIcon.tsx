import React from "react";

interface IconProps {
  className?: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

// Cloud Upload Icon - Alternative upload icon
const CloudUploadIcon: React.FC<IconProps> = ({
  className = "w-6 h-6 text-gray-300",
  strokeWidth = 2,
}) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
    />
  </svg>
);

export default CloudUploadIcon;
