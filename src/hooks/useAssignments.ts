import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getLearnerAssignment,
  getLearnerCourseAssignments,
  submitLearnerAssignment,
} from "@/api/assignments";
import { refetchProgressWithRetry } from "@/lib/progressRefetch";

export function useCourseAssignments(courseId?: string) {
  return useQuery({
    queryKey: ["course-assignments", courseId],
    queryFn: () => getLearnerCourseAssignments(courseId!),
    enabled: !!courseId,
    staleTime: 60_000,
  });
}

export function useAssignment(assignmentId?: string) {
  return useQuery({
    queryKey: ["assignment", assignmentId],
    queryFn: () => getLearnerAssignment(assignmentId!),
    enabled: !!assignmentId,
    staleTime: 30_000,
  });
}

export function useSubmitAssignment(courseId?: string, assignmentId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { answer_text: string; files?: File[] }) =>
      submitLearnerAssignment(assignmentId!, input),
    onSuccess: (assignment) => {
      queryClient.setQueryData(["assignment", assignmentId], assignment);
      if (courseId) {
        queryClient.invalidateQueries({ queryKey: ["course-assignments", courseId] });
        refetchProgressWithRetry(queryClient, courseId);
      }
    },
  });
}
