// components/ui/feature-card.jsx
const FeatureCard = ({ icon, title, description, className = "" }) => {
  return (
    <div
      className={`text-center p-6 bg-black/40 backdrop-blur-sm rounded-xl shadow-lg border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300 hover:bg-black/50 ${className}`}
    >
      <div className="w-12 h-12 bg-gradient-to-br from-gray-800 to-gray-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-600 hover:border-gray-500 transition-colors">
        {icon}
      </div>
      <h3 className="font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
};

export default FeatureCard;
