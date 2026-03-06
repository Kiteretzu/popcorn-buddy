"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUploadMovieMetadata } from "@/hooks/useUpload";
import { ErrorMessage } from "@hookform/error-message";
import { Film, Loader2, Upload } from "lucide-react";
import { GENRE_OPTIONS, PLATFORM_OPTIONS } from "./constant";
import { useDropzone } from "react-dropzone";
import Dropzone from "@/components/global/dropzone/Dropzone";

const UploadMovieForm = () => {
  const { errors, isPending, onFormSubmit, register, setValue, watch } =
    useUploadMovieMetadata();

  return (
    <Card className="w-full  shadow-2xl bg-black/50 backdrop-blur-sm border border-gray-700/50">
      <CardHeader className="space-y-4 text-center border-b border-gray-700/30">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-gray-800 to-black rounded-full flex items-center justify-center border border-gray-600">
          <Film className="w-8 h-8 text-gray-200" />
        </div>
        <div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-gray-200 to-white bg-clip-text text-transparent">
            Upload Movie
          </CardTitle>
          <CardDescription className="text-lg text-gray-400 mt-2">
            Add a new movie to your collection
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <form onSubmit={onFormSubmit} className="space-y-6">
          {/* Title Field */}
          <div className="space-y-2">
            <Label
              htmlFor="title"
              className="text-base font-medium text-gray-200"
            >
              Movie Title
            </Label>
            <Input
              id="title"
              type="text"
              {...register("title")}
              placeholder="Enter movie title"
              className="h-12 text-base bg-gray-900/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-gray-400 focus:ring-gray-400"
            />
            <ErrorMessage
              errors={errors}
              name="title"
              render={({ message }) => (
                <p className="text-sm text-red-400 font-medium">{message}</p>
              )}
            />
          </div>

          {/* Genre Field */}
          <div className="space-y-2">
            <Label
              htmlFor="genre"
              className="text-base font-medium text-gray-200"
            >
              Genre
            </Label>
            <Select
              value={watch("genre")}
              onValueChange={(value) => setValue("genre", value)}
            >
              <SelectTrigger className="h-12 text-base bg-gray-900/50 border-gray-600 text-white focus:border-gray-400 focus:ring-gray-400">
                <SelectValue
                  placeholder="Select a genre"
                  className="text-gray-400"
                />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                {GENRE_OPTIONS.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className="text-white hover:bg-gray-800 focus:bg-gray-800"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ErrorMessage
              errors={errors}
              name="genre"
              render={({ message }) => (
                <p className="text-sm text-red-400 font-medium">{message}</p>
              )}
            />
          </div>

          {/* Platform Field */}
          <div className="space-y-2">
            <Label
              htmlFor="platform"
              className="text-base font-medium text-gray-200"
            >
              Platform
            </Label>
            <Select
              value={watch("platform")}
              onValueChange={(value) => setValue("platform", value)}
            >
              <SelectTrigger className="h-12 text-base bg-gray-900/50 border-gray-600 text-white focus:border-gray-400 focus:ring-gray-400">
                <SelectValue
                  placeholder="Select a platform"
                  className="text-gray-400"
                />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                {PLATFORM_OPTIONS.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className="text-white hover:bg-gray-800 focus:bg-gray-800"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ErrorMessage
              errors={errors}
              name="platform"
              render={({ message }) => (
                <p className="text-sm text-red-400 font-medium">{message}</p>
              )}
            />
          </div>

          {/* Thumbnail Field */}
          <div className="space-y-2">
            <Label
              htmlFor="thumbnail"
              className="text-base font-medium text-gray-200"
            >
              Thumbnail
            </Label>
            <div className="relative">
              <Input
                id="thumbnail"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setValue("thumbnail", file);
                  }
                }}
                className="h-12 text-base bg-gray-900/50 border-gray-600 text-white file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-800 file:text-gray-200 hover:file:bg-gray-700 transition-colors focus:border-gray-400 focus:ring-gray-400"
              />
              <Upload className="absolute right-3 top-3 h-6 w-6 text-gray-400 pointer-events-none" />
            </div>
            <ErrorMessage
              errors={errors}
              name="thumbnail"
              render={({ message }) => (
                <p className="text-sm text-red-400 font-medium">{message}</p>
              )}
            />
          </div>

          <Dropzone
            accept={{ "video/*": [] }}
            multiple={false}
            onFilesSelected={(files) => {
              if (files[0]) setValue("movieFile", files[0]);
            }}
          />

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isPending}
            className="w-full h-12 cursor-pointer text-base font-semibold bg-gradient-to-r from-gray-800 to-black hover:from-gray-700 hover:to-gray-900 border border-gray-600 text-white transition-all duration-200 shadow-lg"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-5 w-5" />
                Upload Movie
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default UploadMovieForm;
