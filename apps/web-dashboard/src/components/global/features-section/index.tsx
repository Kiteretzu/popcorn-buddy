// components/sections/features-section.jsx
import Icons from "@/components/icons";
import FeatureCard from "./card";

const SecureIcon = () => (
  <svg
    className="w-6 h-6 text-gray-300"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const features = [
  {
    icon: <Icons.Upload />,
    title: "Easy Upload",
    description:
      "Upload your movie thumbnails and details with our simple form",
  },
  {
    icon: <Icons.Organize />,
    title: "Organize",
    description: "Categorize by genre and platform for easy browsing",
  },
  {
    icon: <Icons.Check />,
    title: "Secure",
    description: "Your movie collection is stored safely and securely",
  },
];

const FeaturesSection = () => {
  return (
    <div className="px-4 z-0 pb-12">
      <div className="max-w-4xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeaturesSection;
