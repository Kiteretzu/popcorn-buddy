import PageLayout from "@/components/global/PageLayout";

type Props = {
  children: React.ReactNode;
};

const layout = ({ children }: Props) => {
  return <PageLayout className="bg-black">{children}</PageLayout>;
};

export default layout;
