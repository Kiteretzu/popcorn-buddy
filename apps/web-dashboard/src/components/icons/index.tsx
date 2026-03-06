import React from "react";
import DocumentIcon from "./DocumentIcon";
import WarningIcon from "./WarningIcon";
import { UploadIcon } from "./UploadIcon";
import { VideoIcon } from "./VideoIcon";
import { XIcon } from "./XIcon";
import { SpinnerIcon } from "./SpinnerIcon";
import PlusIcon from "./PlusIcon";
import CheckIcon from "./CheckIcon";
import CloudUploadIcon from "./CloudUploadIcon";
import { ImageIcon } from "./ImageIcon";
import { FolderIcon } from "./FolderIcon";
import { FileIcon } from "./FileIcon";
import { OrganizeIcon } from "./OrganizeIcon"; // Importing the OrganizeIcon component

// Folder Icon - For folder/directory representation

// Helper function to get file type icon
export const getFileTypeIcon = (fileName: string, className?: string) => {
  const extension = fileName.split(".").pop()?.toLowerCase();
  const isVideo = [
    "mp4",
    "avi",
    "mov",
    "wmv",
    "flv",
    "webm",
    "mkv",
    "m4v",
  ].includes(extension || "");
  const isImage = [
    "jpg",
    "jpeg",
    "png",
    "gif",
    "bmp",
    "webp",
    "svg",
    "ico",
  ].includes(extension || "");

  if (isVideo) {
    return <VideoIcon className={className} />;
  } else if (isImage) {
    return <ImageIcon className={className} />;
  } else {
    return <DocumentIcon className={className} />;
  }
};

// Export all icons as a collection
export const Icons = {
  Upload: UploadIcon,
  Plus: PlusIcon,
  Video: VideoIcon,
  Image: ImageIcon,
  Document: DocumentIcon,
  Check: CheckIcon,
  X: XIcon,
  Warning: WarningIcon,
  Spinner: SpinnerIcon,
  File: FileIcon,
  CloudUpload: CloudUploadIcon,
  Folder: FolderIcon,
  Organize: OrganizeIcon, // Exporting the OrganizeIcon component
  getFileTypeIcon,
};

export default Icons;
