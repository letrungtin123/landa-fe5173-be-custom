import { useQuery } from "@tanstack/react-query";
import { getLibraryCategories, getLibraryDocuments } from "@/api/library";

export const libraryKeys = {
  all: ["library"] as const,
  categories: () => [...libraryKeys.all, "categories"] as const,
  documents: (filters?: any) => [...libraryKeys.all, "documents", filters] as const,
};

export function useLibraryCategories() {
  return useQuery({
    queryKey: libraryKeys.categories(),
    queryFn: () => getLibraryCategories(),
  });
}

export function useLibraryDocuments(search?: string, type?: string) {
  return useQuery({
    queryKey: libraryKeys.documents({ search, type }),
    queryFn: () => getLibraryDocuments({ search, type }),
  });
}
