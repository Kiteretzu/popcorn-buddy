// pages/upload-page.jsx
import SearchMovieForm from "@/components/forms/search-movie-library";
import UploadMovieForm from "@/components/forms/upload-movie-form";
import FeaturesSection from "@/components/global/features-section";
import PageLayout from "@/components/global/PageLayout";
import {
  StyledTabs,
  StyledTabsContent,
  StyledTabsList,
  StyledTabsTrigger,
} from "@/components/global/styled-tabs";

const UploadPage = () => {
  return (
    <div className="px-4 py-12 flex flex-col items-center">
      <StyledTabs defaultValue="mange">
        <StyledTabsList>
          <StyledTabsTrigger value="upload">Upload Movie</StyledTabsTrigger>
          <StyledTabsTrigger value="manage">
            Upload from Library
          </StyledTabsTrigger>
        </StyledTabsList>

        <StyledTabsContent value="upload">
          <div className="bg-black/20 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
            <UploadMovieForm />
          </div>
        </StyledTabsContent>

        <StyledTabsContent value="manage">
          <SearchMovieForm />
        </StyledTabsContent>
      </StyledTabs>
    </div>
  );
};

export default UploadPage;
