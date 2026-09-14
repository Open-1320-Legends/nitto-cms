import { useQuery } from "@tanstack/react-query";
import { cmsApi, type CmsFile, type CmsFileMeta } from "./api";
import { useAuth } from "./useAuth";

/** List every catalog file in a category (for pickers). */
export function useCmsFileList(category: string) {
  const { status } = useAuth();
  return useQuery<CmsFileMeta[]>({
    queryKey: ["cms-files", category],
    queryFn: async () => (await cmsApi.list(category)).files,
    enabled: status === "authenticated",
  });
}

/** Fetch one catalog file's full content by numeric id (e.g. from a picker selection). */
export function useCmsFileById(id: number | null) {
  const { status } = useAuth();
  return useQuery<CmsFile>({
    queryKey: ["cms-file", id],
    queryFn: async () => (await cmsApi.get(id as number)).file,
    enabled: status === "authenticated" && id != null,
  });
}

/** Fetch one catalog file's full content by its stable seedKey (e.g. "showroom-100.xml") --
 *  looks up the id from the category list first since /cms/files/:id needs the numeric id. */
export function useCmsFileBySeedKey(category: string, seedKey: string) {
  const list = useCmsFileList(category);
  const meta = list.data?.find((f) => f.seedKey === seedKey) ?? null;
  const file = useCmsFileById(meta?.id ?? null);
  return {
    isLoading: list.isLoading || (!!meta && file.isLoading),
    isError: list.isError || file.isError,
    data: file.data,
  };
}
