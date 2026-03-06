import { UploadMovieInput } from "@/components/forms/types";
import { uploadMovieMetadataSchema } from "@/components/forms/upload-movie-form/schema";
import { uploadMovieMetadata } from "@/lib/api";
import { useAppDispatch } from "@/redux/store";
import { uploadService } from "@/services/uploadService";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMutationData } from "./react-query-hooks/useMutationData";
import useZodForm from "./useZodForm";

const handleMutation = async (data: UploadMovieInput) => {
  console.log("Uploading movie data:", data);

  const formData = new FormData();
  formData.append("title", data.title);
  formData.append("genre", data.genre);
  formData.append("platform", data.platform);

  // Handle file properly
  if (data.thumbnail instanceof File) {
    formData.append("thumbnail", data.thumbnail);
  }

  if (data.movieFile instanceof File) {
    formData.append("extension", data.movieFile.name.split(".").pop() || "");
    formData.append("contentType", data.movieFile.type);
  }

  try {
    const response = await uploadMovieMetadata(formData);

    const uploadId = await uploadService.startUpload(
      data.movieFile,
      response.data.uploadUrl,
    );

    return uploadId;
  } catch (error) {
    console.error("Error uploading movie metadata:", error);
    throw error; // Re-throw the error to be handled by the mutation hook
  }
};
type UploadMovieMetadataResponse = Awaited<
  ReturnType<typeof uploadMovieMetadata>
>;
export const useUploadMovieMetadata = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const { mutate, isPending } = useMutationData<{ uploadId: string }>(
    ["create-movie"],
    (data) => handleMutation(data),
    "movies",
    (data) => {
      toast.success("Movie is uploading with id: " + data?.uploadId);
      router.push("upload/movie");
    },
  );

  const { register, errors, onFormSubmit, watch, setValue } = useZodForm(
    uploadMovieMetadataSchema,
    (data) => {
      mutate(data);
    },
  );

  return {
    register,
    errors,
    onFormSubmit,
    isPending,
    watch,
    setValue,
  };
};
