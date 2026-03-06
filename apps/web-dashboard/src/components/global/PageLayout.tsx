// components/layouts/page-layout.jsx
const PageLayout = ({ children, className = "" }) => {
  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-gray-800/80 via-gray-900 to-gray-800 ${className}`}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.05),transparent_50%)]" />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default PageLayout;
