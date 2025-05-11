-- Add the reaction_video_storage_path column to the reactions table
alter table reactions
  add column reaction_video_storage_path text;